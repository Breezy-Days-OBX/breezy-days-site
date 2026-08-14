import { validateOwnerSettings, type OwnerSettings } from "../ownerSettings";

export type OwnerApiErrorKind =
  | "validation"
  | "auth"
  | "forbidden"
  | "conflict"
  | "method"
  | "service";

const statusKinds: Partial<Record<number, OwnerApiErrorKind>> = {
  400: "validation",
  401: "auth",
  403: "forbidden",
  405: "method",
  409: "conflict",
  503: "service",
};

const messages: Record<OwnerApiErrorKind, string> = {
  validation: "The server could not accept these settings. Review the fields and try again.",
  auth: "Your owner session has expired. Sign in again to continue.",
  forbidden: "This account does not have owner access.",
  conflict: "The settings changed in another session. Reload the latest values before saving again.",
  method: "That owner action is not available.",
  service: "The owner settings service is temporarily unavailable. Try again shortly.",
};

export class OwnerApiError extends Error {
  readonly kind: OwnerApiErrorKind;

  constructor(kind: OwnerApiErrorKind) {
    super(messages[kind]);
    this.name = "OwnerApiError";
    this.kind = kind;
  }
}

const snapshotPattern = /^snapshots\/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)-[A-Za-z0-9_-]{1,64}\.json$/;

export interface OwnerSnapshot {
  key: string;
  createdAt: string;
}

export interface OwnerSnapshotsResponse {
  snapshots: OwnerSnapshot[];
}

async function requestJson(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(url, init);
  } catch {
    throw new OwnerApiError("service");
  }
  if (!response.ok) throw new OwnerApiError(statusKinds[response.status] ?? "service");
  try {
    return await response.json();
  } catch {
    throw new OwnerApiError("service");
  }
}

function parseOwnerSettings(input: unknown): OwnerSettings {
  const validation = validateOwnerSettings(input);
  if (!validation.success) throw new OwnerApiError("service");
  return validation.data;
}

function parseSnapshots(input: unknown): OwnerSnapshotsResponse {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new OwnerApiError("service");
  }
  const record = input as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !Array.isArray(record.snapshots)) {
    throw new OwnerApiError("service");
  }
  const snapshots = record.snapshots.map((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new OwnerApiError("service");
    }
    const metadata = item as Record<string, unknown>;
    if (
      Object.keys(metadata).length !== 2 ||
      typeof metadata.key !== "string" ||
      typeof metadata.createdAt !== "string"
    ) {
      throw new OwnerApiError("service");
    }
    const match = snapshotPattern.exec(metadata.key);
    if (!match || match[1] !== metadata.createdAt || Number.isNaN(Date.parse(metadata.createdAt))) {
      throw new OwnerApiError("service");
    }
    return { key: metadata.key, createdAt: metadata.createdAt };
  });
  return { snapshots };
}

export async function fetchOwnerSettings(fetcher: typeof fetch = fetch): Promise<OwnerSettings> {
  return parseOwnerSettings(await requestJson(fetcher, "/.netlify/functions/owner-settings", {
    credentials: "same-origin",
    method: "GET",
  }));
}

export async function saveOwnerSettings(
  settings: OwnerSettings,
  fetcher: typeof fetch = fetch,
): Promise<OwnerSettings> {
  const validated = validateOwnerSettings(settings);
  if (!validated.success) throw new OwnerApiError("validation");
  return parseOwnerSettings(await requestJson(fetcher, "/.netlify/functions/owner-settings", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validated.data),
  }));
}

export async function fetchOwnerSnapshots(fetcher: typeof fetch = fetch): Promise<OwnerSnapshotsResponse> {
  return parseSnapshots(await requestJson(fetcher, "/.netlify/functions/settings-snapshots", {
    credentials: "same-origin",
    method: "GET",
  }));
}

export async function restoreOwnerSettings(
  key: string,
  fetcher: typeof fetch = fetch,
): Promise<OwnerSettings> {
  if (!snapshotPattern.test(key)) throw new OwnerApiError("validation");
  return parseOwnerSettings(await requestJson(fetcher, "/.netlify/functions/restore-settings", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key }),
  }));
}
