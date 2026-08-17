import { describe, expect, it, vi } from "vitest";

const modules = import.meta.glob("./ownerDashboard.ts", { eager: true });

type OwnerDashboardModule = {
  runOwnerSave: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  runOwnerRestore: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

describe("owner dashboard transitions", () => {
  it("moves through pending and success while refreshing live settings and snapshots after save", async () => {
    const dashboard = modules["./ownerDashboard.ts"] as OwnerDashboardModule | undefined;
    expect(dashboard).toBeDefined();
    if (!dashboard) return;
    const transitions: string[] = [];
    const refreshed = {
      settings: { updatedAt: "2026-08-14T16:00:00.000Z" },
      snapshots: [],
    };
    const refresh = vi.fn(async () => refreshed);

    const result = await dashboard.runOwnerSave({
      serialize: () => ({ success: true, data: { schemaVersion: 1 } }),
      save: vi.fn(async () => ({})),
      refresh,
      transition: (state: string) => transitions.push(state),
    });

    expect(transitions).toEqual(["saving", "success"]);
    expect(refresh).toHaveBeenCalledOnce();
    expect(result).toEqual({ state: "success", data: refreshed });
  });

  it("stays local for validation errors and maps save conflicts without a refresh", async () => {
    const dashboard = modules["./ownerDashboard.ts"] as OwnerDashboardModule | undefined;
    if (!dashboard) return;
    const refresh = vi.fn();
    const save = vi.fn(async () => {
      throw Object.assign(new Error("safe"), { kind: "conflict" });
    });

    await expect(
      dashboard.runOwnerSave({
        serialize: () => ({
          success: false,
          errors: ["maxPets.invalid"],
          fieldErrors: { maxPets: "range" },
        }),
        save,
        refresh,
        transition: vi.fn(),
      }),
    ).resolves.toMatchObject({
      state: "validation",
      fieldErrors: { maxPets: "range" },
    });
    expect(save).not.toHaveBeenCalled();

    await expect(
      dashboard.runOwnerSave({
        serialize: () => ({ success: true, data: {} }),
        save,
        refresh,
        transition: vi.fn(),
      }),
    ).resolves.toEqual({ state: "conflict" });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation before restore and refreshes after a confirmed restore", async () => {
    const dashboard = modules["./ownerDashboard.ts"] as OwnerDashboardModule | undefined;
    if (!dashboard) return;
    const restore = vi.fn(async () => ({}));
    const refresh = vi.fn(async () => ({ settings: {}, snapshots: [] }));
    const transition = vi.fn();

    await expect(
      dashboard.runOwnerRestore({
        key: "snapshot-key",
        confirm: () => false,
        restore,
        refresh,
        transition,
      }),
    ).resolves.toEqual({ state: "cancelled" });
    expect(restore).not.toHaveBeenCalled();

    await expect(
      dashboard.runOwnerRestore({
        key: "snapshot-key",
        confirm: () => true,
        restore,
        refresh,
        transition,
      }),
    ).resolves.toMatchObject({ state: "success" });
    expect(restore).toHaveBeenCalledWith("snapshot-key");
    expect(refresh).toHaveBeenCalledOnce();
    expect(transition.mock.calls.map(([state]) => state)).toEqual(["restoring", "success"]);
  });

  it.each(["auth", "forbidden", "service", "method"])(
    "preserves the %s failure state during restore",
    async (kind) => {
      const dashboard = modules["./ownerDashboard.ts"] as OwnerDashboardModule | undefined;
      if (!dashboard) return;
      const restore = vi.fn(async () => {
        throw Object.assign(new Error("safe"), { kind });
      });

      await expect(
        dashboard.runOwnerRestore({
          key: "snapshot-key",
          confirm: () => true,
          restore,
          refresh: vi.fn(),
          transition: vi.fn(),
        }),
      ).resolves.toEqual({ state: kind });
    },
  );
});
