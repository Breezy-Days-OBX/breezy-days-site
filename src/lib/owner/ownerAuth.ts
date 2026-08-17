export interface OwnerIdentityUser {
  id: string;
  email?: string;
}

export type OwnerEntryState =
  | { state: "login" }
  | { state: "authenticated"; user: OwnerIdentityUser }
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
  callbackUrl?: OwnerCallbackUrl;
}

interface OwnerCallbackUrl {
  hash: string;
  pathname: string;
  search: string;
  replace: (url: string) => void;
}

const identityCallbackParameters = [
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

const isCallback = (value: unknown): value is OwnerCallbackResult => {
  if (typeof value !== "object" || value === null) return false;
  const type = (value as { type?: unknown }).type;
  return ["oauth", "confirmation", "recovery", "invite", "email_change"].includes(String(type));
};

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
        return isUser(callback.user)
          ? { state: "recovery", user: callback.user }
          : { state: "callback_error" };
      }
      return isUser(callback.user)
        ? { state: "authenticated", user: callback.user }
        : { state: "callback_error" };
    }

    const user = await identity.getUser();
    return isUser(user) ? { state: "authenticated", user } : { state: "login" };
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
