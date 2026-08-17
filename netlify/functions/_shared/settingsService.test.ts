import { beforeEach, describe, expect, it } from "vitest";

import {
  createSettingsHandlers,
  type BlobStore,
  type SettingsServiceDependencies,
} from "./settingsService";
import {
  OWNER_SETTINGS_SCHEMA_VERSION,
  type OwnerSettings,
  ownerSettingsDefaults,
} from "../../../src/lib/ownerSettings";

const firstSavedAt = "2026-08-14T15:00:00.000Z";
const secondSavedAt = "2026-08-14T16:00:00.000Z";

const storedSettings: OwnerSettings = {
  schemaVersion: OWNER_SETTINGS_SCHEMA_VERSION,
  ...ownerSettingsDefaults,
  startingWeeklyRateUsd: 3_500,
  minimumStayNights: 7,
  updatedAt: firstSavedAt,
};

class MemoryBlobStore implements BlobStore {
  readonly values = new Map<string, string>();
  private readonly versions = new Map<string, number>();
  failReads = false;
  failWrites = false;
  afterRead?: (key: string) => Promise<void>;
  afterSet?: (key: string) => Promise<void>;

  private etag(key: string) {
    return `etag-${this.versions.get(key) ?? 0}`;
  }

  async get(key: string) {
    if (this.failReads) throw new Error("private storage failure");
    const value = this.values.get(key) ?? null;
    await this.afterRead?.(key);
    return value;
  }

  async getWithMetadata(key: string) {
    if (this.failReads) throw new Error("private storage failure");
    const value = this.values.get(key);
    const result = value === undefined ? null : { data: value, etag: this.etag(key) };
    await this.afterRead?.(key);
    return result;
  }

  async set(key: string, value: string, options?: { onlyIfNew?: boolean; onlyIfMatch?: string }) {
    if (this.failWrites) throw new Error("private storage failure");
    if (options?.onlyIfNew && this.values.has(key)) return { modified: false };
    if (options?.onlyIfMatch && options.onlyIfMatch !== this.etag(key)) {
      return { modified: false };
    }
    this.values.set(key, value);
    this.versions.set(key, (this.versions.get(key) ?? 0) + 1);
    const result = { modified: true, etag: this.etag(key) };
    await this.afterSet?.(key);
    return result;
  }

  async list({ prefix }: { prefix: string }) {
    return {
      blobs: [...this.values.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((key) => ({ key })),
    };
  }

  forceSet(key: string, value: string) {
    this.values.set(key, value);
    this.versions.set(key, (this.versions.get(key) ?? 0) + 1);
  }
}

const pauseCapturedReads = (store: MemoryBlobStore, key: string, count: number) => {
  let arrivals = 0;
  let release!: () => void;
  let allCaptured!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const captured = new Promise<void>((resolve) => {
    allCaptured = resolve;
  });

  store.afterRead = async (readKey) => {
    if (readKey !== key || arrivals >= count) return;
    arrivals += 1;
    if (arrivals === count) allCaptured();
    await released;
  };

  return { captured, release };
};

const request = (method: string, body?: unknown, origin = "https://breezydays.test") =>
  new Request("https://breezydays.test/.netlify/functions/settings", {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(origin ? { origin } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const responseJson = async (response: Response) => ({
  status: response.status,
  cacheControl: response.headers.get("cache-control"),
  body: await response.json(),
});

describe("settings Function handlers", () => {
  let store: MemoryBlobStore;
  let user: SettingsServiceDependencies["getUser"] extends (...args: never[]) => Promise<infer User>
    ? User
    : never;
  let originAllowed: boolean;
  let nextId: string;
  let dependencies: SettingsServiceDependencies;

  beforeEach(() => {
    store = new MemoryBlobStore();
    user = { id: "owner-user", roles: ["owner"], email: "owner@example.test" };
    originAllowed = true;
    nextId = "save-1";
    dependencies = {
      store,
      getUser: async () => user,
      verifyOrigin: () => {
        if (!originAllowed) throw new Error("private origin detail");
      },
      now: () => new Date(secondSavedAt),
      createId: () => nextId,
    };
  });

  it("serves only a sanitized public projection from valid storage", async () => {
    store.values.set("current.json", JSON.stringify({ ...storedSettings }));
    const { publicSettings } = createSettingsHandlers(dependencies);

    const response = await responseJson(await publicSettings(request("GET")));

    expect(response).toEqual({
      status: 200,
      cacheControl: "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      body: {
        ...ownerSettingsDefaults,
        startingWeeklyRateUsd: 3_500,
        minimumStayNights: 7,
        updatedAt: firstSavedAt,
      },
    });
    expect(response.body).not.toHaveProperty("schemaVersion");
  });

  it.each(["missing", "malformed", "unavailable"])(
    "falls back to repository defaults when public storage is %s",
    async (condition) => {
      if (condition === "malformed") store.values.set("current.json", "{not-json");
      if (condition === "unavailable") store.failReads = true;
      const { publicSettings } = createSettingsHandlers(dependencies);

      const response = await responseJson(await publicSettings(request("GET")));

      expect(response).toEqual({
        status: 200,
        cacheControl: "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
        body: { ...ownerSettingsDefaults, source: "default" },
      });
    },
  );

  it("rejects unknown public methods without touching storage", async () => {
    store.failReads = true;
    const { publicSettings } = createSettingsHandlers(dependencies);

    const response = await responseJson(await publicSettings(request("POST", {})));

    expect(response.status).toBe(405);
    expect(response.body).toEqual({ error: "method_not_allowed" });
  });

  it.each(["GET", "PUT", "POST"])(
    "rejects anonymous protected %s requests with no-store responses",
    async (method) => {
      user = null;
      const handlers = createSettingsHandlers(dependencies);
      const handler = method === "POST" ? handlers.restoreSettings : handlers.ownerSettings;

      const response = await responseJson(
        await handler(request(method, method === "GET" ? undefined : storedSettings)),
      );

      expect(response).toEqual({
        status: 401,
        cacheControl: "no-store",
        body: { error: "unauthorized" },
      });
      expect(store.values.size).toBe(0);
    },
  );

  it("marks anonymous protected responses as non-indexable", async () => {
    user = null;
    const { ownerSettings } = createSettingsHandlers(dependencies);

    const response = await ownerSettings(request("GET"));

    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
  });

  it("rejects authenticated users without the owner role", async () => {
    user = { id: "guest-user", roles: ["guest"], email: "guest@example.test" };
    const { ownerSettings } = createSettingsHandlers(dependencies);

    const response = await responseJson(await ownerSettings(request("PUT", storedSettings)));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "forbidden" });
    expect(store.values.size).toBe(0);
  });

  it("checks same origin before parsing or writing a protected mutation", async () => {
    originAllowed = false;
    const { ownerSettings } = createSettingsHandlers(dependencies);
    const malformedRequest = new Request(
      "https://breezydays.test/.netlify/functions/owner-settings",
      {
        method: "PUT",
        headers: { origin: "https://attacker.test" },
        body: "{",
      },
    );

    const response = await responseJson(await ownerSettings(malformedRequest));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "forbidden" });
    expect(store.values.size).toBe(0);
  });

  it.each([
    ["malformed JSON", "{"],
    ["unknown fields", JSON.stringify({ ...storedSettings, guestEmail: "guest@example.test" })],
    ["invalid fields", JSON.stringify({ ...storedSettings, maxPets: 99 })],
  ])("rejects %s without changing live storage", async (_label, body) => {
    store.values.set("current.json", JSON.stringify(storedSettings));
    const { ownerSettings } = createSettingsHandlers(dependencies);
    const invalidRequest = new Request(
      "https://breezydays.test/.netlify/functions/owner-settings",
      {
        method: "PUT",
        headers: {
          origin: "https://breezydays.test",
          "content-type": "application/json",
        },
        body,
      },
    );

    const response = await responseJson(await ownerSettings(invalidRequest));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "invalid_settings" });
    expect(store.values.get("current.json")).toBe(JSON.stringify(storedSettings));
    expect([...store.values.keys()]).toEqual(["current.json"]);
  });

  it("persists a valid save, snapshots the prior value immutably, and reads it back", async () => {
    store.values.set("current.json", JSON.stringify(storedSettings));
    const { ownerSettings } = createSettingsHandlers(dependencies);
    const changed = {
      ...storedSettings,
      pricingNote: "Owner-approved August pricing note.",
    };

    const response = await responseJson(await ownerSettings(request("PUT", changed)));

    const expectedSaved = { ...changed, updatedAt: secondSavedAt };
    expect(response).toEqual({
      status: 200,
      cacheControl: "no-store",
      body: expectedSaved,
    });
    expect(JSON.parse(store.values.get("current.json")!)).toEqual(expectedSaved);
    expect(JSON.parse(store.values.get(`snapshots/${secondSavedAt}-save-1.json`)!)).toEqual(
      storedSettings,
    );
    expect([...store.values.values()].join(" ")).not.toContain("owner@example.test");
    expect([...store.values.values()].join(" ")).not.toContain("owner-user");
  });

  it("allows only one of two saves captured from the same live version to succeed", async () => {
    store.values.set("current.json", JSON.stringify(storedSettings));
    let id = 0;
    dependencies.createId = () => `overlap-${++id}`;
    const { ownerSettings } = createSettingsHandlers(dependencies);
    const first = { ...storedSettings, pricingNote: "First concurrent save." };
    const second = {
      ...storedSettings,
      pricingNote: "Second concurrent save.",
    };
    const barrier = pauseCapturedReads(store, "current.json", 2);

    const firstResponsePromise = ownerSettings(request("PUT", first));
    const secondResponsePromise = ownerSettings(request("PUT", second));
    await barrier.captured;
    barrier.release();
    const responses = await Promise.all([
      firstResponsePromise.then(responseJson),
      secondResponsePromise.then(responseJson),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    const success = responses.find(({ status }) => status === 200)!;
    const conflict = responses.find(({ status }) => status === 409)!;
    expect(conflict.body).toEqual({ error: "settings_conflict" });
    expect(success.body).toEqual(JSON.parse(store.values.get("current.json")!));
    expect([first.pricingNote, second.pricingNote]).toContain(success.body.pricingNote);

    const capturedPriorValues = [...store.values.entries()]
      .filter(([key]) => key.startsWith("snapshots/"))
      .map(([, value]) => JSON.parse(value));
    expect(capturedPriorValues.length).toBeGreaterThanOrEqual(1);
    expect(capturedPriorValues).toEqual(capturedPriorValues.map(() => storedSettings));
  });

  it("rejects a sequential save submitted from an older dashboard before snapshotting or writing", async () => {
    store.values.set("current.json", JSON.stringify(storedSettings));
    const { ownerSettings } = createSettingsHandlers(dependencies);
    const firstSave = { ...storedSettings, pricingNote: "First dashboard committed this note." };
    const staleSave = { ...storedSettings, pricingNote: "Stale dashboard overwrote the note." };

    const firstResponse = await responseJson(await ownerSettings(request("PUT", firstSave)));
    const staleResponse = await responseJson(await ownerSettings(request("PUT", staleSave)));

    expect(firstResponse.status).toBe(200);
    expect(staleResponse).toEqual({
      status: 409,
      cacheControl: "no-store",
      body: { error: "settings_conflict" },
    });
    expect(JSON.parse(store.values.get("current.json")!)).toEqual(firstResponse.body);
    expect([...store.values.keys()].filter((key) => key.startsWith("snapshots/"))).toEqual([
      `snapshots/${secondSavedAt}-save-1.json`,
    ]);
  });

  it("never returns another writer's value when live storage changes before readback", async () => {
    store.values.set("current.json", JSON.stringify(storedSettings));
    const concurrentValue = {
      ...storedSettings,
      pricingNote: "A later writer's committed value.",
      updatedAt: "2026-08-14T17:00:00.000Z",
    };
    let replaced = false;
    store.afterSet = async (key) => {
      if (key === "current.json" && !replaced) {
        replaced = true;
        store.forceSet(key, JSON.stringify(concurrentValue));
      }
    };
    const { ownerSettings } = createSettingsHandlers(dependencies);

    const response = await responseJson(
      await ownerSettings(
        request("PUT", {
          ...storedSettings,
          pricingNote: "This request's value.",
        }),
      ),
    );

    expect(response).toEqual({
      status: 409,
      cacheControl: "no-store",
      body: { error: "settings_conflict" },
    });
    expect(response.body).not.toEqual(concurrentValue);
    expect(JSON.parse(store.values.get("current.json")!)).toEqual(concurrentValue);
  });

  it("fails closed if a generated snapshot key would not be safe", async () => {
    store.values.set("current.json", JSON.stringify(storedSettings));
    nextId = "../current";
    const { ownerSettings } = createSettingsHandlers(dependencies);

    const response = await responseJson(await ownerSettings(request("PUT", storedSettings)));

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: "service_unavailable" });
    expect([...store.values.keys()]).toEqual(["current.json"]);
  });

  it("returns owner settings only to an authenticated owner", async () => {
    store.values.set("current.json", JSON.stringify(storedSettings));
    const { ownerSettings } = createSettingsHandlers(dependencies);

    const response = await responseJson(await ownerSettings(request("GET")));

    expect(response).toEqual({
      status: 200,
      cacheControl: "no-store",
      body: storedSettings,
    });
  });

  it("returns server-stamped repository defaults to an owner when live settings are absent", async () => {
    const { ownerSettings } = createSettingsHandlers(dependencies);

    const response = await responseJson(await ownerSettings(request("GET")));

    expect(response).toEqual({
      status: 200,
      cacheControl: "no-store",
      body: {
        schemaVersion: OWNER_SETTINGS_SCHEMA_VERSION,
        ...ownerSettingsDefaults,
        updatedAt: secondSavedAt,
      },
    });
    expect(store.values.size).toBe(0);
  });

  it("lists only generated snapshot metadata newest first without blob contents", async () => {
    store.values.set(`snapshots/${firstSavedAt}-first.json`, JSON.stringify(storedSettings));
    store.values.set(`snapshots/${secondSavedAt}-second.json`, JSON.stringify(storedSettings));
    store.values.set("snapshots/../../current.json", "private arbitrary content");
    const { settingsSnapshots } = createSettingsHandlers(dependencies);

    const response = await responseJson(await settingsSnapshots(request("GET")));

    expect(response).toEqual({
      status: 200,
      cacheControl: "no-store",
      body: {
        snapshots: [
          {
            key: `snapshots/${secondSavedAt}-second.json`,
            createdAt: secondSavedAt,
          },
          {
            key: `snapshots/${firstSavedAt}-first.json`,
            createdAt: firstSavedAt,
          },
        ],
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("private arbitrary content");
  });

  it.each([
    "current.json",
    "snapshots/../current.json",
    "snapshots/not-a-generated-key.json",
    `snapshots/${firstSavedAt}-missing.json`,
  ])("rejects an invalid or unreturned snapshot key: %s", async (key) => {
    const { restoreSettings } = createSettingsHandlers(dependencies);

    const response = await responseJson(await restoreSettings(request("POST", { key })));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "invalid_snapshot_key" });
    expect(store.values.size).toBe(0);
  });

  it("restores a returned valid snapshot after snapshotting the current value", async () => {
    const restoredSettings = {
      ...storedSettings,
      pricingNote: "Earlier approved note.",
    };
    const snapshotKey = `snapshots/${firstSavedAt}-restore-me.json`;
    store.values.set("current.json", JSON.stringify(storedSettings));
    store.values.set(snapshotKey, JSON.stringify(restoredSettings));
    nextId = "restore-1";
    const { restoreSettings } = createSettingsHandlers(dependencies);

    const response = await responseJson(
      await restoreSettings(request("POST", { key: snapshotKey })),
    );

    const expectedRestored = { ...restoredSettings, updatedAt: secondSavedAt };
    expect(response).toEqual({
      status: 200,
      cacheControl: "no-store",
      body: expectedRestored,
    });
    expect(JSON.parse(store.values.get("current.json")!)).toEqual(expectedRestored);
    expect(JSON.parse(store.values.get(`snapshots/${secondSavedAt}-restore-1.json`)!)).toEqual(
      storedSettings,
    );
  });

  it("restores a valid snapshot over malformed live settings using the captured live version", async () => {
    const restoredSettings = {
      ...storedSettings,
      pricingNote: "Last known valid owner settings.",
    };
    const snapshotKey = `snapshots/${firstSavedAt}-recover-corrupt.json`;
    store.forceSet("current.json", "{not-json");
    store.values.set(snapshotKey, JSON.stringify(restoredSettings));
    nextId = "recover-corrupt";
    const { restoreSettings } = createSettingsHandlers(dependencies);

    const response = await responseJson(
      await restoreSettings(request("POST", { key: snapshotKey })),
    );

    const expectedRestored = { ...restoredSettings, updatedAt: secondSavedAt };
    expect(response).toEqual({
      status: 200,
      cacheControl: "no-store",
      body: expectedRestored,
    });
    expect(JSON.parse(store.values.get("current.json")!)).toEqual(expectedRestored);
    expect([...store.values.keys()].sort()).toEqual(["current.json", snapshotKey].sort());
  });

  it("protects restore from a save captured from the same live version", async () => {
    const restoreTarget = { ...storedSettings, pricingNote: "Restore target." };
    const snapshotKey = `snapshots/${firstSavedAt}-restore-target.json`;
    store.values.set("current.json", JSON.stringify(storedSettings));
    store.values.set(snapshotKey, JSON.stringify(restoreTarget));
    let id = 0;
    dependencies.createId = () => `mixed-${++id}`;
    const handlers = createSettingsHandlers(dependencies);
    const saveValue = {
      ...storedSettings,
      pricingNote: "Concurrent new save.",
    };
    const barrier = pauseCapturedReads(store, "current.json", 2);

    const saveResponsePromise = handlers.ownerSettings(request("PUT", saveValue));
    const restoreResponsePromise = handlers.restoreSettings(request("POST", { key: snapshotKey }));
    await barrier.captured;
    barrier.release();
    const responses = await Promise.all([
      saveResponsePromise.then(responseJson),
      restoreResponsePromise.then(responseJson),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    const success = responses.find(({ status }) => status === 200)!;
    const conflict = responses.find(({ status }) => status === 409)!;
    expect(conflict.body).toEqual({ error: "settings_conflict" });
    expect(success.body).toEqual(JSON.parse(store.values.get("current.json")!));
    expect([saveValue.pricingNote, restoreTarget.pricingNote]).toContain(success.body.pricingNote);
  });

  it("maps protected storage failures to a stable non-sensitive response", async () => {
    store.failReads = true;
    const { ownerSettings } = createSettingsHandlers(dependencies);

    const response = await responseJson(await ownerSettings(request("GET")));

    expect(response).toEqual({
      status: 503,
      cacheControl: "no-store",
      body: { error: "service_unavailable" },
    });
    expect(JSON.stringify(response.body)).not.toContain("private storage failure");
  });

  it("returns no-store 405 responses for unknown protected methods", async () => {
    const { ownerSettings, settingsSnapshots, restoreSettings } =
      createSettingsHandlers(dependencies);

    for (const [handler, method] of [
      [ownerSettings, "DELETE"],
      [settingsSnapshots, "POST"],
      [restoreSettings, "GET"],
    ] as const) {
      const response = await responseJson(await handler(request(method)));
      expect(response).toEqual({
        status: 405,
        cacheControl: "no-store",
        body: { error: "method_not_allowed" },
      });
    }
  });
});
