export type AuthPage = "sign-in" | "sign-up";
export type SignedInPage = "home" | "profile";
export function sharedRouteFromHash(hash: string) {
  const profile = hash.match(/^#\/p\/([^/?]+)(?:\?v=([0-9]+))?$/);
  if (profile?.[1]) {
    const revision = Number(profile[2]);
    return {
      profileId: decodeURIComponent(profile[1]),
      revision: Number.isSafeInteger(revision) ? revision : undefined,
    };
  }
  const reviewToken = hash.match(/^#\/r\/([^/]+)$/)?.[1];
  return reviewToken
    ? { reviewToken: decodeURIComponent(reviewToken) }
    : null;
}

export type SharedRoute = NonNullable<ReturnType<typeof sharedRouteFromHash>>;

export function authPageFromPath(pathname: string): AuthPage | null {
  const path = pathname.replace(/\/+$/, "");
  if (path === "/sign-in" || path.startsWith("/sign-in/")) return "sign-in";
  if (path === "/sign-up" || path.startsWith("/sign-up/")) return "sign-up";
  return null;
}

export function signedInPageFromPath(pathname: string): SignedInPage {
  return /^\/p\/[^/]+\/?$/.test(pathname) ? "profile" : "home";
}

export function profilePath(handle: string): string {
  return `/p/${encodeURIComponent(handle.replace(/^@+/, ""))}`;
}

export function accountHandle(
  username: string | null | undefined,
  email: string | null | undefined,
  userId: string,
): string {
  const emailName = email?.split("@")[0];
  const identifier = username?.trim() || emailName?.trim() || userId;
  return `@${identifier.replace(/^@+/, "")}`;
}
