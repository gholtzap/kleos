import { authPageFromPath } from "./lib";

/**
 * Fired after a navigation this module performs. `popstate` covers the back and
 * forward buttons, but the browser raises nothing for `pushState`, so screens
 * listening for a location change need this.
 */
export const navigationEvent = "kleos:navigation";

/**
 * Routes that must stay full page loads. Clerk's sign-in and sign-up components
 * own their own paths, and handing them a URL the browser never fetched leaves
 * them mounted against the wrong step.
 */
function ownedByBrowser(pathname: string): boolean {
  return authPageFromPath(pathname) !== null;
}

export function navigate(url: string): void {
  if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    return;
  }
  window.history.pushState(null, "", url);
  window.dispatchEvent(new Event(navigationEvent));
  // A new screen starts at its top, the way a real navigation would.
  window.scrollTo({ top: 0 });
}

/**
 * The URL a click should navigate to without a page load, or null when the
 * browser must handle it: another origin, a download, a new tab, a modified
 * click, an in-page hash, or a route Clerk owns.
 */
export function clientNavigationTarget(
  event: MouseEvent,
  origin = window.location.origin,
): string | null {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null;
  }
  const anchor = (event.target as Element | null)?.closest?.("a");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (
    anchor.target ||
    anchor.hasAttribute("download") ||
    anchor.getAttribute("rel")?.includes("external")
  ) {
    return null;
  }

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return null;

  let url: URL;
  try {
    url = new URL(anchor.href);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  // A hash on the current page is the browser's job, and the hash routes read
  // it through their own listener.
  if (url.hash && url.pathname === window.location.pathname) return null;
  if (ownedByBrowser(url.pathname)) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Turns same-origin link clicks into instant navigations. Returns the teardown.
 */
export function interceptLinkClicks(): () => void {
  const onClick = (event: MouseEvent) => {
    const target = clientNavigationTarget(event);
    if (!target) return;
    event.preventDefault();
    navigate(target);
  };
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}
