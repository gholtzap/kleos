import { isConnectionProvider, type ConnectionProvider } from "./connections";
import { normalizeProfileHandle } from "./profile-identity";

export type AuthPage = "sign-in" | "sign-up";
export type SignedInPage = "home" | "profile";
export type SharedRoute =
  | { kind: "profile-id"; profileId: string; revision?: number }
  | { kind: "profile-handle"; profileHandle: string }
  | { kind: "review"; reviewToken: string };

export const settingsPath = "/settings";

/** Names the provider an OAuth flow just returned from. */
const connectedParameter = "connected";

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

/** Settings belongs to the signed-in member, so it is never a shared route. */
export function isSettingsPath(pathname: string): boolean {
  return pathname.replace(/\/+$/, "") === settingsPath;
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

/**
 * The provider named by a settings URL an OAuth flow redirected back to. Only
 * providers Kleos offers are accepted, so a hand-edited URL cannot steer the
 * page.
 */
export function connectedProviderFromSearch(
  search: string,
): ConnectionProvider | null {
  const value = new URLSearchParams(search).get(connectedParameter);
  return value && isConnectionProvider(value) ? value : null;
}

/** The same query string with the OAuth return marker taken back out. */
export function clearedConnectedSearch(search: string): string {
  const parameters = new URLSearchParams(search);
  parameters.delete(connectedParameter);
  const remaining = parameters.toString();
  return remaining ? `?${remaining}` : "";
}

/** Why dev fell back to the offline preview instead of real Clerk auth. */
export type PreviewReason =
  | "missing-key"
  | "live-key-on-localhost"
  | "clerk-unreachable";

const localHostnames = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return localHostnames.has(host) || host.endsWith(".localhost");
}

/**
 * A Clerk production instance only answers for its own domain, so a pk_live_
 * key on localhost never loads. That reads as a missing key unless we say so.
 */
export function previewReason(
  publishableKey: string | undefined,
  hostname: string,
): PreviewReason {
  if (!publishableKey?.trim()) return "missing-key";
  return publishableKey.startsWith("pk_live_") && isLocalHostname(hostname)
    ? "live-key-on-localhost"
    : "clerk-unreachable";
}

export function previewBannerMessage(reason: PreviewReason): string {
  switch (reason) {
    case "missing-key":
      return "Auth disabled locally — no VITE_CLERK_PUBLISHABLE_KEY is set. Add one to .env.local to sign in. Showing a static preview.";
    case "live-key-on-localhost":
      return "Auth disabled locally — VITE_CLERK_PUBLISHABLE_KEY holds a pk_live_ key, and Clerk production instances only answer for the production domain. Put a Development pk_test_ key in .env.local and restart the dev server. Showing a static preview.";
    case "clerk-unreachable":
      return "Auth disabled locally — VITE_CLERK_PUBLISHABLE_KEY is set, but Clerk did not load in time. Check your network and the Clerk dashboard. Showing a static preview.";
  }
}
