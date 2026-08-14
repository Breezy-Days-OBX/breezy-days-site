import { describe, expect, it, vi } from "vitest";

import { ownerSettingsDefaults, type OwnerSettings } from "../ownerSettings";

const modules = import.meta.glob("./ownerApi.ts", { eager: true });

type ApiError = Error & { kind: string };
type OwnerApiModule = {
  fetchOwnerSettings: (fetcher?: typeof fetch) => Promise<OwnerSettings>;
  saveOwnerSettings: (settings: OwnerSettings, fetcher?: typeof fetch) => Promise<OwnerSettings>;
  fetchOwnerSnapshots: (fetcher?: typeof fetch) => Promise<{ snapshots: Array<{ key: string; createdAt: string }> }>;
  restoreOwnerSettings: (key: string, fetcher?: typeof fetch) => Promise<OwnerSettings>;
};

const settings: OwnerSettings = {
  schemaVersion: 1,
  ...ownerSettingsDefaults,
  updatedAt: "2026-08-14T15:00:00.000Z",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const captureApiError = async (promise: Promise<unknown>) => {
  try {
    await promise;
    throw new Error("Expected owner API request to fail");
  } catch (error) {
    return error as ApiError;
  }
};

describe("owner endpoint client", () => {
  it.each([
    [400, "validation"],
    [401, "auth"],
    [403, "forbidden"],
    [409, "conflict"],
    [405, "method"],
    [503, "service"],
  ])("maps protected endpoint status %i to stable %s UI state", async (status, kind) => {
    const ownerApi = modules["./ownerApi.ts"] as OwnerApiModule | undefined;
    expect(ownerApi).toBeDefined();
    if (!ownerApi) return;
    const fetcher = vi.fn(async () => jsonResponse({ error: "private-server-detail" }, status));

    const error = await captureApiError(ownerApi.fetchOwnerSettings(fetcher as typeof fetch));

    expect(error.kind).toBe(kind);
    expect(error.message).not.toContain("private-server-detail");
  });

  it("uses the exact GET routes and accepts only validated settings and snapshot metadata", async () => {
    const ownerApi = modules["./ownerApi.ts"] as OwnerApiModule | undefined;
    if (!ownerApi) return;
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(settings))
      .mockResolvedValueOnce(jsonResponse({
        snapshots: [{
          key: "snapshots/2026-08-14T15:00:00.000Z-save-1.json",
          createdAt: "2026-08-14T15:00:00.000Z",
        }],
      }));

    await expect(ownerApi.fetchOwnerSettings(fetcher as typeof fetch)).resolves.toEqual(settings);
    await expect(ownerApi.fetchOwnerSnapshots(fetcher as typeof fetch)).resolves.toEqual({
      snapshots: [{
        key: "snapshots/2026-08-14T15:00:00.000Z-save-1.json",
        createdAt: "2026-08-14T15:00:00.000Z",
      }],
    });
    expect(fetcher.mock.calls).toEqual([
      ["/.netlify/functions/owner-settings", { credentials: "same-origin", method: "GET" }],
      ["/.netlify/functions/settings-snapshots", { credentials: "same-origin", method: "GET" }],
    ]);
  });

  it("sends exact complete save and restore payloads to the protected mutation routes", async () => {
    const ownerApi = modules["./ownerApi.ts"] as OwnerApiModule | undefined;
    if (!ownerApi) return;
    const fetcher = vi.fn(async () => jsonResponse(settings));
    const snapshotKey = "snapshots/2026-08-14T15:00:00.000Z-save-1.json";

    await ownerApi.saveOwnerSettings(settings, fetcher as typeof fetch);
    await ownerApi.restoreOwnerSettings(snapshotKey, fetcher as typeof fetch);

    expect(fetcher.mock.calls).toEqual([
      ["/.netlify/functions/owner-settings", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      }],
      ["/.netlify/functions/restore-settings", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: snapshotKey }),
      }],
    ]);
  });

  it("fails closed on malformed successful payloads", async () => {
    const ownerApi = modules["./ownerApi.ts"] as OwnerApiModule | undefined;
    if (!ownerApi) return;

    const settingsError = await captureApiError(ownerApi.fetchOwnerSettings(
      vi.fn(async () => jsonResponse({ ...settings, internalNote: "private" })) as unknown as typeof fetch,
    ));
    const snapshotsError = await captureApiError(ownerApi.fetchOwnerSnapshots(
      vi.fn(async () => jsonResponse({ snapshots: [{ key: "current.json", createdAt: "yesterday" }] })) as unknown as typeof fetch,
    ));

    expect(settingsError.kind).toBe("service");
    expect(snapshotsError.kind).toBe("service");
  });
});
