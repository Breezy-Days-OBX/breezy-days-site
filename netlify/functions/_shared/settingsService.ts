import {
  OWNER_SETTINGS_SCHEMA_VERSION,
  type OwnerSettings,
  ownerSettingsDefaults,
  projectPublicOwnerSettings,
  validateOwnerSettings,
} from "../../../src/lib/ownerSettings";

const CURRENT_SETTINGS_KEY = "current.json";
const SNAPSHOT_PREFIX = "snapshots/";
const PUBLIC_CACHE_CONTROL =
  "public, max-age=60, s-maxage=300, stale-while-revalidate=600";
const PROTECTED_CACHE_CONTROL = "no-store";
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const SNAPSHOT_KEY_PATTERN =
  /^snapshots\/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)-([A-Za-z0-9_-]{1,64})\.json$/;

export interface BlobStore {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { onlyIfNew?: boolean },
  ): Promise<{ modified: boolean }>;
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

const jsonResponse = (
  body: unknown,
  status: number,
  cacheControl: string,
) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": cacheControl },
  });

const protectedResponse = (body: unknown, status = 200) =>
  jsonResponse(body, status, PROTECTED_CACHE_CONTROL);

const protectedError = (error: string, status: number) =>
  protectedResponse({ error }, status);

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

const writeSnapshot = async (
  store: BlobStore,
  key: string,
  settings: OwnerSettings,
) => {
  const result = await store.set(key, JSON.stringify(settings), { onlyIfNew: true });
  if (!result.modified) throw new Error("Snapshot key collision");
};

const readRequiredSettings = async (store: BlobStore, key: string) => {
  const settings = parseStoredSettings(await store.get(key));
  if (!settings) throw new Error("Settings unavailable");
  return settings;
};

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
        return jsonResponse(
          projectPublicOwnerSettings(settings),
          200,
          PUBLIC_CACHE_CONTROL,
        );
      }
    } catch {
      // Public reads intentionally degrade to approved repository defaults.
    }

    return jsonResponse(
      { ...ownerSettingsDefaults, source: "default" },
      200,
      PUBLIC_CACHE_CONTROL,
    );
  };

  const ownerSettings = async (request: Request) => {
    if (request.method !== "GET" && request.method !== "PUT") {
      return protectedError("method_not_allowed", 405);
    }

    try {
      const authFailure = await authenticateOwner(request, dependencies.getUser);
      if (authFailure) return authFailure;

      if (request.method === "GET") {
        return protectedResponse(
          await readRequiredSettings(dependencies.store, CURRENT_SETTINGS_KEY),
        );
      }

      const originFailure = await verifyMutationOrigin(request, dependencies.verifyOrigin);
      if (originFailure) return originFailure;

      const payload = await parseJsonBody(request);
      const validation = validateOwnerSettings(payload);
      if (!validation.success) return protectedError("invalid_settings", 400);

      const snapshot = safeSnapshotKey(dependencies);
      const savedValidation = validateOwnerSettings({
        ...validation.data,
        schemaVersion: OWNER_SETTINGS_SCHEMA_VERSION,
        updatedAt: snapshot.updatedAt,
      });
      if (!savedValidation.success) throw new Error("Clock produced invalid timestamp");

      const currentRaw = await dependencies.store.get(CURRENT_SETTINGS_KEY);
      if (currentRaw !== null) {
        const current = parseStoredSettings(currentRaw);
        if (!current) throw new Error("Current settings are invalid");
        await writeSnapshot(dependencies.store, snapshot.key, current);
      }

      await dependencies.store.set(
        CURRENT_SETTINGS_KEY,
        JSON.stringify(savedValidation.data),
      );
      const readback = await readRequiredSettings(dependencies.store, CURRENT_SETTINGS_KEY);
      return protectedResponse(readback);
    } catch {
      return protectedError("service_unavailable", 503);
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
      const currentRaw = await dependencies.store.get(CURRENT_SETTINGS_KEY);
      const current = currentRaw === null ? null : parseStoredSettings(currentRaw);
      if (currentRaw !== null && !current) throw new Error("Current settings are invalid");

      const snapshot = safeSnapshotKey(dependencies);
      const restoredValidation = validateOwnerSettings({
        ...selected,
        schemaVersion: OWNER_SETTINGS_SCHEMA_VERSION,
        updatedAt: snapshot.updatedAt,
      });
      if (!restoredValidation.success) throw new Error("Clock produced invalid timestamp");

      if (current) await writeSnapshot(dependencies.store, snapshot.key, current);
      await dependencies.store.set(
        CURRENT_SETTINGS_KEY,
        JSON.stringify(restoredValidation.data),
      );
      const readback = await readRequiredSettings(dependencies.store, CURRENT_SETTINGS_KEY);
      return protectedResponse(readback);
    } catch {
      return protectedError("service_unavailable", 503);
    }
  };

  return { publicSettings, ownerSettings, settingsSnapshots, restoreSettings };
}
