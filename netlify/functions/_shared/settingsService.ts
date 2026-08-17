import {
  OWNER_SETTINGS_SCHEMA_VERSION,
  type OwnerSettings,
  ownerSettingsDefaults,
  projectPublicOwnerSettings,
  validateOwnerSettings,
} from "../../../src/lib/ownerSettings";

const CURRENT_SETTINGS_KEY = "current.json";
const SNAPSHOT_PREFIX = "snapshots/";
const PUBLIC_CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";
const PROTECTED_CACHE_CONTROL = "no-store";
const PROTECTED_ROBOTS = "noindex, nofollow, noarchive";
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const SNAPSHOT_KEY_PATTERN =
  /^snapshots\/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)-([A-Za-z0-9_-]{1,64})\.json$/;

export interface BlobStore {
  get(key: string): Promise<string | null>;
  getWithMetadata(key: string): Promise<{ data: string; etag: string } | null>;
  set(
    key: string,
    value: string,
    options?: { onlyIfNew: true; onlyIfMatch?: never } | { onlyIfMatch: string; onlyIfNew?: never },
  ): Promise<{ modified: boolean; etag?: string }>;
  list(options: { prefix: string }): Promise<{ blobs: Array<{ key: string }> }>;
}

export interface AuthenticatedUser {
  id: string;
  roles?: readonly string[];
  email?: string;
}

export interface SettingsServiceDependencies {
  store: BlobStore;
  getUser(request: Request): Promise<AuthenticatedUser | null>;
  verifyOrigin(request: Request): void | Promise<void>;
  now(): Date;
  createId(): string;
}

export interface SettingsHandlers {
  publicSettings(request: Request): Promise<Response>;
  ownerSettings(request: Request): Promise<Response>;
  settingsSnapshots(request: Request): Promise<Response>;
  restoreSettings(request: Request): Promise<Response>;
}

interface SnapshotMetadata {
  key: string;
  createdAt: string;
}

class SettingsConflictError extends Error {}

const jsonResponse = (body: unknown, status: number, cacheControl: string) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": cacheControl },
  });

const protectedResponse = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": PROTECTED_CACHE_CONTROL,
      "X-Robots-Tag": PROTECTED_ROBOTS,
    },
  });

const protectedError = (error: string, status: number) => protectedResponse({ error }, status);

const publicError = (error: string, status: number) =>
  jsonResponse({ error }, status, PROTECTED_CACHE_CONTROL);

const parseStoredSettings = (raw: string | null): OwnerSettings | null => {
  if (raw === null) return null;

  try {
    const result = validateOwnerSettings(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

const parseSnapshotKey = (key: string): SnapshotMetadata | null => {
  const match = SNAPSHOT_KEY_PATTERN.exec(key);
  if (!match) return null;

  const createdAt = match[1];
  try {
    if (new Date(createdAt).toISOString() !== createdAt) return null;
  } catch {
    return null;
  }

  return { key, createdAt };
};

const parseJsonBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const authenticateOwner = async (
  request: Request,
  getUser: SettingsServiceDependencies["getUser"],
): Promise<Response | null> => {
  const user = await getUser(request);
  if (!user) return protectedError("unauthorized", 401);
  if (!user.roles?.includes("owner")) return protectedError("forbidden", 403);
  return null;
};

const safeSnapshotKey = (
  dependencies: Pick<SettingsServiceDependencies, "now" | "createId">,
): { key: string; updatedAt: string } => {
  const updatedAt = dependencies.now().toISOString();
  const id = dependencies.createId();
  if (!SAFE_ID_PATTERN.test(id)) throw new Error("Unsafe generated snapshot ID");

  const key = `${SNAPSHOT_PREFIX}${updatedAt}-${id}.json`;
  if (!parseSnapshotKey(key)) throw new Error("Unsafe generated snapshot key");
  return { key, updatedAt };
};

const writeSnapshot = async (store: BlobStore, key: string, settings: OwnerSettings) => {
  const result = await store.set(key, JSON.stringify(settings), {
    onlyIfNew: true,
  });
  if (!result.modified) throw new Error("Snapshot key collision");
};

const readRequiredSettings = async (store: BlobStore, key: string) => {
  const settings = parseStoredSettings(await store.get(key));
  if (!settings) throw new Error("Settings unavailable");
  return settings;
};

const readOwnerSettings = async (store: BlobStore, now: SettingsServiceDependencies["now"]) => {
  const current = await readCurrentSettingsState(store);
  if (current.kind === "missing") {
    const defaults = validateOwnerSettings({
      schemaVersion: OWNER_SETTINGS_SCHEMA_VERSION,
      ...ownerSettingsDefaults,
      updatedAt: now().toISOString(),
    });
    if (!defaults.success) throw new Error("Clock produced invalid timestamp");
    return defaults.data;
  }
  if (current.kind === "malformed") throw new Error("Settings unavailable");
  return current.settings;
};

const readVersionedSettings = async (store: BlobStore, key: string) => {
  const entry = await store.getWithMetadata(key);
  if (!entry) return null;

  const settings = parseStoredSettings(entry.data);
  if (!settings) throw new Error("Settings unavailable");
  return { settings, etag: entry.etag };
};

type CurrentSettingsState =
  | { kind: "missing" }
  | { kind: "malformed"; etag: string }
  | { kind: "valid"; settings: OwnerSettings; etag: string };

const readCurrentSettingsState = async (store: BlobStore): Promise<CurrentSettingsState> => {
  const entry = await store.getWithMetadata(CURRENT_SETTINGS_KEY);
  if (!entry) return { kind: "missing" };

  const settings = parseStoredSettings(entry.data);
  return settings
    ? { kind: "valid", settings, etag: entry.etag }
    : { kind: "malformed", etag: entry.etag };
};

const replaceCurrentSettings = async (
  store: BlobStore,
  settings: OwnerSettings,
  priorEtag: string | null,
) => {
  const write = await store.set(
    CURRENT_SETTINGS_KEY,
    JSON.stringify(settings),
    priorEtag === null ? { onlyIfNew: true } : { onlyIfMatch: priorEtag },
  );
  if (!write.modified) throw new SettingsConflictError();
  if (!write.etag) throw new Error("Live write did not return an ETag");

  const readback = await readVersionedSettings(store, CURRENT_SETTINGS_KEY);
  if (!readback || readback.etag !== write.etag) throw new SettingsConflictError();
  return readback.settings;
};

const mutationFailure = (error: unknown) =>
  error instanceof SettingsConflictError
    ? protectedError("settings_conflict", 409)
    : protectedError("service_unavailable", 503);

const verifyMutationOrigin = async (
  request: Request,
  verifyOrigin: SettingsServiceDependencies["verifyOrigin"],
) => {
  try {
    await verifyOrigin(request);
    return null;
  } catch {
    return protectedError("forbidden", 403);
  }
};

export function createSettingsHandlers(
  dependencies: SettingsServiceDependencies,
): SettingsHandlers {
  const publicSettings = async (request: Request) => {
    if (request.method !== "GET") return publicError("method_not_allowed", 405);

    try {
      const settings = parseStoredSettings(await dependencies.store.get(CURRENT_SETTINGS_KEY));
      if (settings) {
        return jsonResponse(projectPublicOwnerSettings(settings), 200, PUBLIC_CACHE_CONTROL);
      }
    } catch {
      // Public reads intentionally degrade to approved repository defaults.
    }

    return jsonResponse({ ...ownerSettingsDefaults, source: "default" }, 200, PUBLIC_CACHE_CONTROL);
  };

  const ownerSettings = async (request: Request) => {
    if (request.method !== "GET" && request.method !== "PUT") {
      return protectedError("method_not_allowed", 405);
    }

    try {
      const authFailure = await authenticateOwner(request, dependencies.getUser);
      if (authFailure) return authFailure;

      if (request.method === "GET") {
        return protectedResponse(await readOwnerSettings(dependencies.store, dependencies.now));
      }

      const originFailure = await verifyMutationOrigin(request, dependencies.verifyOrigin);
      if (originFailure) return originFailure;

      const payload = await parseJsonBody(request);
      const validation = validateOwnerSettings(payload);
      if (!validation.success) return protectedError("invalid_settings", 400);

      const current = await readVersionedSettings(dependencies.store, CURRENT_SETTINGS_KEY);
      if (current && validation.data.updatedAt !== current.settings.updatedAt) {
        throw new SettingsConflictError();
      }

      const snapshot = safeSnapshotKey(dependencies);
      const savedValidation = validateOwnerSettings({
        ...validation.data,
        schemaVersion: OWNER_SETTINGS_SCHEMA_VERSION,
        updatedAt: snapshot.updatedAt,
      });
      if (!savedValidation.success) throw new Error("Clock produced invalid timestamp");

      if (current) {
        await writeSnapshot(dependencies.store, snapshot.key, current.settings);
      }

      const readback = await replaceCurrentSettings(
        dependencies.store,
        savedValidation.data,
        current?.etag ?? null,
      );
      return protectedResponse(readback);
    } catch (error) {
      return mutationFailure(error);
    }
  };

  const settingsSnapshots = async (request: Request) => {
    if (request.method !== "GET") return protectedError("method_not_allowed", 405);

    try {
      const authFailure = await authenticateOwner(request, dependencies.getUser);
      if (authFailure) return authFailure;

      const result = await dependencies.store.list({ prefix: SNAPSHOT_PREFIX });
      const snapshots = result.blobs
        .map(({ key }) => parseSnapshotKey(key))
        .filter((snapshot): snapshot is SnapshotMetadata => snapshot !== null)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      return protectedResponse({ snapshots });
    } catch {
      return protectedError("service_unavailable", 503);
    }
  };

  const restoreSettings = async (request: Request) => {
    if (request.method !== "POST") return protectedError("method_not_allowed", 405);

    try {
      const authFailure = await authenticateOwner(request, dependencies.getUser);
      if (authFailure) return authFailure;

      const originFailure = await verifyMutationOrigin(request, dependencies.verifyOrigin);
      if (originFailure) return originFailure;

      const payload = await parseJsonBody(request);
      if (
        !isRecord(payload) ||
        Object.keys(payload).length !== 1 ||
        typeof payload.key !== "string" ||
        !parseSnapshotKey(payload.key)
      ) {
        return protectedError("invalid_snapshot_key", 400);
      }

      const listed = await dependencies.store.list({ prefix: SNAPSHOT_PREFIX });
      if (!listed.blobs.some(({ key }) => key === payload.key && parseSnapshotKey(key))) {
        return protectedError("invalid_snapshot_key", 400);
      }

      const selected = await readRequiredSettings(dependencies.store, payload.key);
      const current = await readCurrentSettingsState(dependencies.store);

      const snapshot = safeSnapshotKey(dependencies);
      const restoredValidation = validateOwnerSettings({
        ...selected,
        schemaVersion: OWNER_SETTINGS_SCHEMA_VERSION,
        updatedAt: snapshot.updatedAt,
      });
      if (!restoredValidation.success) throw new Error("Clock produced invalid timestamp");

      if (current.kind === "valid") {
        await writeSnapshot(dependencies.store, snapshot.key, current.settings);
      }
      const readback = await replaceCurrentSettings(
        dependencies.store,
        restoredValidation.data,
        current.kind === "missing" ? null : current.etag,
      );
      return protectedResponse(readback);
    } catch (error) {
      return mutationFailure(error);
    }
  };

  return { publicSettings, ownerSettings, settingsSnapshots, restoreSettings };
}
