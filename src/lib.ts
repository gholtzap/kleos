export type AuthPage = "sign-in" | "sign-up";
export type SignedInPage = "home" | "profile";

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
