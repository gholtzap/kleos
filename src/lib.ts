import { normalizeProfileHandle } from "./profile-identity";

export type AuthPage = "sign-in" | "sign-up";
export type SignedInPage = "home" | "profile";
export type SharedRoute =
  | { kind: "profile-id"; profileId: string; revision?: number }
  | { kind: "profile-handle"; profileHandle: string }
  | { kind: "review"; reviewToken: string };

export function sharedRouteFromHash(hash: string): SharedRoute | null {
  const profile = hash.match(/^#\/p\/([^/?]+)(?:\?v=([0-9]+))?$/);
  if (profile?.[1]) {
    try {
      const revision = Number(profile[2]);
      return {
        kind: "profile-id",
        profileId: decodeURIComponent(profile[1]),
        revision: Number.isSafeInteger(revision) ? revision : undefined,
      };
    } catch {
      return null;
    }
  }
  const reviewToken = hash.match(/^#\/r\/([^/]+)$/)?.[1];
  if (!reviewToken) return null;
  try {
    return { kind: "review", reviewToken: decodeURIComponent(reviewToken) };
  } catch {
    return null;
  }
}

export function sharedRouteFromPath(pathname: string): SharedRoute | null {
  const profileHandle = profileHandleFromPath(pathname);
  return profileHandle === null
    ? null
    : { kind: "profile-handle", profileHandle };
}

export function authPageFromPath(pathname: string): AuthPage | null {
  const path = pathname.replace(/\/+$/, "");
  if (path === "/sign-in" || path.startsWith("/sign-in/")) return "sign-in";
  if (path === "/sign-up" || path.startsWith("/sign-up/")) return "sign-up";
  return null;
}

export function signedInPageFromPath(pathname: string): SignedInPage {
  return /^\/p\/[^/]+\/?$/.test(pathname) ? "profile" : "home";
}

export function profileHandleFromPath(pathname: string): string | null {
  const encodedHandle = pathname.match(/^\/p\/([^/]+)\/?$/)?.[1];
  if (!encodedHandle) return null;
  try {
    return normalizeProfileHandle(decodeURIComponent(encodedHandle));
  } catch {
    return null;
  }
}

export function profilePathMatchesAccount(
  pathname: string,
  accountHandle: string,
): boolean {
  const profileHandle = profileHandleFromPath(pathname);
  const normalizedAccount = normalizeProfileHandle(accountHandle);
  return profileHandle !== null && profileHandle === normalizedAccount;
}

export function profilePath(handle: string): string {
  const normalized = normalizeProfileHandle(handle);
  return normalized ? `/p/${encodeURIComponent(normalized)}` : "/home";
}
