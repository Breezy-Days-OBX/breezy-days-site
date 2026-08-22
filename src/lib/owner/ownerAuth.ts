export interface OwnerIdentityUser {
  id: string;
  email?: string;
  roles?: readonly string[];
}

export type OwnerEntryState =
  | { state: "login" }
  | { state: "authenticated"; user: OwnerIdentityUser }
  | { state: "forbidden"; user: OwnerIdentityUser }
  | { state: "invite"; token: string }
  | { state: "recovery"; user: OwnerIdentityUser }
  | { state: "callback_error" };

interface OwnerCallbackResult {
  type: "oauth" | "confirmation" | "recovery" | "invite" | "email_change";
  user: OwnerIdentityUser | null;
  token?: string;
}

interface OwnerIdentityReader {
  handleAuthCallback: () => Promise<unknown>;
  getUser: () => Promise<unknown>;
  refreshSession?: () => Promise<unknown>;
  callbackUrl?: OwnerCallbackUrl;
}

interface OwnerSessionReader {
  getUser: () => Promise<unknown>;
  refreshSession: () => Promise<unknown>;
}

interface OwnerInviteSessionWriter {
  acceptInvite: (token: string, password: string) => Promise<unknown>;
  login: (email: string, password: string) => Promise<unknown>;
}

interface OwnerSessionLogout {
  logout: () => Promise<unknown>;
}

export type OwnerInviteCompletion =
  { state: "authenticated"; user: unknown } | { state: "sign_in_required"; email: string };

interface OwnerCallbackUrl {
  hash: string;
  pathname: string;
  search: string;
  replace: (url: string) => void;
}

export const identityCallbackParameters = [
  "access_token",
  "confirmation_token",
  "recovery_token",
  "invite_token",
  "email_change_token",
] as const;

export function scrubOwnerCallbackHash(callbackUrl: OwnerCallbackUrl | undefined): void {
  if (!callbackUrl?.hash) return;
  const parameters = new URLSearchParams(callbackUrl.hash.replace(/^#/, ""));
  if (!identityCallbackParameters.some((parameter) => parameters.has(parameter))) return;
  try {
    callbackUrl.replace(`${callbackUrl.pathname}${callbackUrl.search}`);
  } catch {
    // URL cleanup must not replace a safe owner-facing authentication state.
  }
}

const isUser = (value: unknown): value is OwnerIdentityUser =>
  typeof value === "object" && value !== null && typeof (value as { id?: unknown }).id === "string";

export const hasOwnerRole = (value: unknown): value is OwnerIdentityUser =>
  isUser(value) && Array.isArray(value.roles) && value.roles.includes("owner");

const isCallback = (value: unknown): value is OwnerCallbackResult => {
  if (typeof value !== "object" || value === null) return false;
  const type = (value as { type?: unknown }).type;
  return ["oauth", "confirmation", "recovery", "invite", "email_change"].includes(String(type));
};

export async function readFreshOwnerSession(identity: OwnerSessionReader): Promise<unknown> {
  await identity.refreshSession();
  return identity.getUser();
}

export async function completeOwnerInviteSession(
  identity: OwnerInviteSessionWriter,
  token: string,
  password: string,
): Promise<OwnerInviteCompletion> {
  const invitedUser = await identity.acceptInvite(token, password);
  if (!isUser(invitedUser) || typeof invitedUser.email !== "string" || !invitedUser.email.trim()) {
    throw new Error("The invited owner account is missing an email address.");
  }
  try {
    return { state: "authenticated", user: await identity.login(invitedUser.email, password) };
  } catch {
    return { state: "sign_in_required", email: invitedUser.email };
  }
}

export async function clearExpiredOwnerSession(
  error: unknown,
  identity: OwnerSessionLogout,
): Promise<boolean> {
  if (typeof error !== "object" || error === null || !("kind" in error) || error.kind !== "auth") {
    return false;
  }
  await identity.logout();
  return true;
}

export async function loadOwnerEntryState(identity: OwnerIdentityReader): Promise<OwnerEntryState> {
  try {
    const callback = await identity.handleAuthCallback();
    if (callback !== null) {
      if (!isCallback(callback)) return { state: "callback_error" };
      if (callback.type === "invite") {
        return typeof callback.token === "string" && callback.token.length > 0
          ? { state: "invite", token: callback.token }
          : { state: "callback_error" };
      }
      if (callback.type === "recovery") {
        if (!isUser(callback.user)) return { state: "callback_error" };
        return hasOwnerRole(callback.user)
          ? { state: "recovery", user: callback.user }
          : { state: "forbidden", user: callback.user };
      }
      if (!isUser(callback.user)) return { state: "callback_error" };
      return hasOwnerRole(callback.user)
        ? { state: "authenticated", user: callback.user }
        : { state: "forbidden", user: callback.user };
    }

    const user = identity.refreshSession
      ? await readFreshOwnerSession({
          refreshSession: identity.refreshSession,
          getUser: identity.getUser,
        })
      : await identity.getUser();
    if (!isUser(user)) return { state: "login" };
    return hasOwnerRole(user) ? { state: "authenticated", user } : { state: "forbidden", user };
  } catch {
    return { state: "callback_error" };
  } finally {
    scrubOwnerCallbackHash(identity.callbackUrl);
  }
}

export function describeAuthError(operation: "login" | "callback" | "password"): string {
  if (operation === "login")
    return "We could not sign you in. Check your email and password, then try again.";
  if (operation === "password")
    return "We could not save that password. The link may have expired; request a new owner invitation or recovery email.";
  return "We could not complete that owner access link. It may be invalid or expired.";
}
