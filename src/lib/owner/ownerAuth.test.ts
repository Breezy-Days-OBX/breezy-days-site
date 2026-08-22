import { describe, expect, it, vi } from "vitest";

const modules = import.meta.glob("./ownerAuth.ts", { eager: true });

type OwnerAuthModule = {
  loadOwnerEntryState: (identity: {
    handleAuthCallback: () => Promise<unknown>;
    getUser: () => Promise<unknown>;
    refreshSession?: () => Promise<unknown>;
    callbackUrl?: {
      hash: string;
      pathname: string;
      search: string;
      replace: (url: string) => void;
    };
  }) => Promise<Record<string, unknown>>;
  readFreshOwnerSession: (identity: {
    getUser: () => Promise<unknown>;
    refreshSession: () => Promise<unknown>;
  }) => Promise<unknown>;
  completeOwnerInviteSession: (
    identity: {
      acceptInvite: (token: string, password: string) => Promise<unknown>;
      login: (email: string, password: string) => Promise<unknown>;
    },
    token: string,
    password: string,
  ) => Promise<
    { state: "authenticated"; user: unknown } | { state: "sign_in_required"; email: string }
  >;
  clearExpiredOwnerSession: (
    error: unknown,
    identity: { logout: () => Promise<unknown> },
  ) => Promise<boolean>;
  describeAuthError: (operation: "login" | "callback" | "password") => string;
};

describe("owner authentication entry states", () => {
  it.each([
    [
      { type: "invite", user: null, token: "invite-token" },
      { state: "invite", token: "invite-token" },
    ],
    [{ type: "recovery", user: { id: "owner", roles: ["owner"] } }, { state: "recovery" }],
    [{ type: "confirmation", user: { id: "owner", roles: ["owner"] } }, { state: "authenticated" }],
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

    await expect(
      ownerAuth.loadOwnerEntryState({
        handleAuthCallback: vi.fn(async () => null),
        getUser: vi.fn(async () => null),
      }),
    ).resolves.toEqual({ state: "login" });
    await expect(
      ownerAuth.loadOwnerEntryState({
        handleAuthCallback: vi.fn(async () => null),
        getUser: vi.fn(async () => ({ id: "owner", roles: ["owner"] })),
      }),
    ).resolves.toMatchObject({ state: "authenticated" });
  });

  it("refreshes the browser session before trusting an existing owner or loading private data", async () => {
    const ownerAuth = modules["./ownerAuth.ts"] as OwnerAuthModule | undefined;
    if (!ownerAuth) return;
    const calls: string[] = [];
    const identity = {
      refreshSession: vi.fn(async () => {
        calls.push("refresh");
        return "fresh-token";
      }),
      getUser: vi.fn(async () => {
        calls.push("user");
        return { id: "owner", roles: ["owner"] };
      }),
    };

    await expect(ownerAuth.readFreshOwnerSession(identity)).resolves.toMatchObject({
      id: "owner",
    });
    expect(calls).toEqual(["refresh", "user"]);

    calls.length = 0;
    await expect(
      ownerAuth.loadOwnerEntryState({
        handleAuthCallback: vi.fn(async () => null),
        ...identity,
      }),
    ).resolves.toMatchObject({ state: "authenticated" });
    expect(calls).toEqual(["refresh", "user"]);
  });

  it("finishes an invitation with a password login that establishes the server session", async () => {
    const ownerAuth = modules["./ownerAuth.ts"] as OwnerAuthModule | undefined;
    if (!ownerAuth) return;
    const calls: string[] = [];
    const identity = {
      acceptInvite: vi.fn(async () => {
        calls.push("accept");
        return { id: "owner", email: "owner@example.com", roles: ["owner"] };
      }),
      login: vi.fn(async () => {
        calls.push("login");
        return { id: "owner", email: "owner@example.com", roles: ["owner"] };
      }),
    };

    await expect(
      ownerAuth.completeOwnerInviteSession(identity, "invite-token", "owner-password"),
    ).resolves.toMatchObject({
      state: "authenticated",
      user: { id: "owner", roles: ["owner"] },
    });
    expect(calls).toEqual(["accept", "login"]);
    expect(identity.acceptInvite).toHaveBeenCalledWith("invite-token", "owner-password");
    expect(identity.login).toHaveBeenCalledWith("owner@example.com", "owner-password");
  });

  it("preserves a saved invite password when the follow-up login needs to be retried", async () => {
    const ownerAuth = modules["./ownerAuth.ts"] as OwnerAuthModule | undefined;
    if (!ownerAuth) return;
    const identity = {
      acceptInvite: vi.fn(async () => ({
        id: "owner",
        email: "owner@example.com",
        roles: ["owner"],
      })),
      login: vi.fn(async () => {
        throw new Error("temporary login failure");
      }),
    };

    await expect(
      ownerAuth.completeOwnerInviteSession(identity, "invite-token", "saved-password"),
    ).resolves.toEqual({ state: "sign_in_required", email: "owner@example.com" });
    expect(identity.acceptInvite).toHaveBeenCalledOnce();
    expect(identity.login).toHaveBeenCalledOnce();
  });

  it("clears only an expired owner session before returning to sign in", async () => {
    const ownerAuth = modules["./ownerAuth.ts"] as OwnerAuthModule | undefined;
    if (!ownerAuth) return;
    const logout = vi.fn(async () => undefined);

    await expect(ownerAuth.clearExpiredOwnerSession({ kind: "auth" }, { logout })).resolves.toBe(
      true,
    );
    expect(logout).toHaveBeenCalledOnce();

    logout.mockClear();
    await expect(ownerAuth.clearExpiredOwnerSession({ kind: "service" }, { logout })).resolves.toBe(
      false,
    );
    expect(logout).not.toHaveBeenCalled();
  });

  it.each([
    [null, { id: "member", roles: ["guest"] }],
    [{ type: "confirmation", user: { id: "member", roles: [] } }, null],
    [{ type: "recovery", user: { id: "member", roles: ["guest"] } }, null],
  ])("keeps an authenticated non-owner in a stable no-access state", async (callback, session) => {
    const ownerAuth = modules["./ownerAuth.ts"] as OwnerAuthModule | undefined;
    if (!ownerAuth) return;

    await expect(
      ownerAuth.loadOwnerEntryState({
        handleAuthCallback: vi.fn(async () => callback),
        getUser: vi.fn(async () => session),
      }),
    ).resolves.toMatchObject({ state: "forbidden", user: { id: "member" } });
  });

  it("fails closed for malformed callbacks and maps Identity failures without exposing internals", async () => {
    const ownerAuth = modules["./ownerAuth.ts"] as OwnerAuthModule | undefined;
    if (!ownerAuth) return;

    await expect(
      ownerAuth.loadOwnerEntryState({
        handleAuthCallback: vi.fn(async () => ({ type: "invite", user: null })),
        getUser: vi.fn(async () => ({ id: "owner", roles: ["owner"] })),
      }),
    ).resolves.toEqual({ state: "callback_error" });
    await expect(
      ownerAuth.loadOwnerEntryState({
        handleAuthCallback: vi.fn(async () => {
          throw new Error("secret token detail");
        }),
        getUser: vi.fn(async () => null),
      }),
    ).resolves.toEqual({ state: "callback_error" });
    expect(ownerAuth.describeAuthError("login")).not.toMatch(/token|stack|secret/i);
  });

  it("scrubs an Identity callback hash after a resolved callback without exposing its token", async () => {
    const ownerAuth = modules["./ownerAuth.ts"] as OwnerAuthModule | undefined;
    if (!ownerAuth) return;
    const replace = vi.fn();

    await ownerAuth.loadOwnerEntryState({
      handleAuthCallback: vi.fn(async () => ({
        type: "invite",
        user: null,
        token: "secret",
      })),
      getUser: vi.fn(async () => null),
      callbackUrl: {
        hash: "#invite_token=secret",
        pathname: "/owner",
        search: "?from=email",
        replace,
      },
    });

    expect(replace).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith("/owner?from=email");
    expect(JSON.stringify(replace.mock.calls)).not.toContain("secret");
  });

  it("scrubs an Identity callback hash in the failure path", async () => {
    const ownerAuth = modules["./ownerAuth.ts"] as OwnerAuthModule | undefined;
    if (!ownerAuth) return;
    const replace = vi.fn();

    await expect(
      ownerAuth.loadOwnerEntryState({
        handleAuthCallback: vi.fn(async () => {
          throw new Error("expired");
        }),
        getUser: vi.fn(async () => null),
        callbackUrl: {
          hash: "#recovery_token=secret",
          pathname: "/owner",
          search: "",
          replace,
        },
      }),
    ).resolves.toEqual({ state: "callback_error" });

    expect(replace).toHaveBeenCalledWith("/owner");
  });

  it("preserves ordinary non-Identity hashes", async () => {
    const ownerAuth = modules["./ownerAuth.ts"] as OwnerAuthModule | undefined;
    if (!ownerAuth) return;
    const replace = vi.fn();

    await ownerAuth.loadOwnerEntryState({
      handleAuthCallback: vi.fn(async () => null),
      getUser: vi.fn(async () => null),
      callbackUrl: {
        hash: "#stay-details",
        pathname: "/owner",
        search: "",
        replace,
      },
    });

    expect(replace).not.toHaveBeenCalled();
  });
});
