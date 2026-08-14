import { describe, expect, it, vi } from "vitest";

const modules = import.meta.glob("./ownerAuth.ts", { eager: true });

type OwnerAuthModule = {
  loadOwnerEntryState: (identity: {
    handleAuthCallback: () => Promise<unknown>;
    getUser: () => Promise<unknown>;
  }) => Promise<Record<string, unknown>>;
  describeAuthError: (operation: "login" | "callback" | "password") => string;
};

describe("owner authentication entry states", () => {
  it.each([
    [{ type: "invite", user: null, token: "invite-token" }, { state: "invite", token: "invite-token" }],
    [{ type: "recovery", user: { id: "owner" } }, { state: "recovery" }],
    [{ type: "confirmation", user: { id: "owner" } }, { state: "authenticated" }],
  ])("classifies supported public owner callbacks", async (callback, expected) => {
    const ownerAuth = modules["./ownerAuth.ts"] as OwnerAuthModule | undefined;
    expect(ownerAuth).toBeDefined();
    if (!ownerAuth) return;

    const result = await ownerAuth.loadOwnerEntryState({
      handleAuthCallback: vi.fn(async () => callback),
      getUser: vi.fn(async () => null),
    });
    expect(result).toMatchObject(expected);
  });

  it("shows login for an anonymous visit and dashboard access for an existing session", async () => {
    const ownerAuth = modules["./ownerAuth.ts"] as OwnerAuthModule | undefined;
    if (!ownerAuth) return;

    await expect(ownerAuth.loadOwnerEntryState({
      handleAuthCallback: vi.fn(async () => null),
      getUser: vi.fn(async () => null),
    })).resolves.toEqual({ state: "login" });
    await expect(ownerAuth.loadOwnerEntryState({
      handleAuthCallback: vi.fn(async () => null),
      getUser: vi.fn(async () => ({ id: "owner" })),
    })).resolves.toMatchObject({ state: "authenticated" });
  });

  it("fails closed for malformed callbacks and maps Identity failures without exposing internals", async () => {
    const ownerAuth = modules["./ownerAuth.ts"] as OwnerAuthModule | undefined;
    if (!ownerAuth) return;

    await expect(ownerAuth.loadOwnerEntryState({
      handleAuthCallback: vi.fn(async () => ({ type: "invite", user: null })),
      getUser: vi.fn(async () => ({ id: "owner" })),
    })).resolves.toEqual({ state: "callback_error" });
    await expect(ownerAuth.loadOwnerEntryState({
      handleAuthCallback: vi.fn(async () => { throw new Error("secret token detail"); }),
      getUser: vi.fn(async () => null),
    })).resolves.toEqual({ state: "callback_error" });
    expect(ownerAuth.describeAuthError("login")).not.toMatch(/token|stack|secret/i);
  });
});
