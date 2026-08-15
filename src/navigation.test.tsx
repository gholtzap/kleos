// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { clientNavigationTarget, interceptLinkClicks, navigate } from "./navigation";
import { usePathname } from "./use-pathname";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

interface ClickOptions {
  button?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

/** Builds an anchor, clicks it, and reports what the interceptor decided. */
function targetForAnchor(
  attributes: Record<string, string>,
  options: ClickOptions = {},
): string | null {
  const anchor = document.createElement("a");
  for (const [name, value] of Object.entries(attributes)) {
    anchor.setAttribute(name, value);
  }
  anchor.textContent = "link";
  document.body.append(anchor);
  let decided: string | null = null;
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    button: options.button ?? 0,
    metaKey: options.metaKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    shiftKey: options.shiftKey ?? false,
    altKey: options.altKey ?? false,
  });
  const listener = (clickEvent: Event) => {
    decided = clientNavigationTarget(clickEvent as MouseEvent);
    // jsdom cannot perform a real navigation; stop it from trying to.
    clickEvent.preventDefault();
  };
  document.addEventListener("click", listener);
  anchor.dispatchEvent(event);
  document.removeEventListener("click", listener);
  return decided;
}

function PathnameValue() {
  return <span>{usePathname()}</span>;
}

describe("Client navigation targets", () => {
  afterEach(() => {
    document.body.replaceChildren();
    window.history.replaceState(null, "", "/");
  });

  it("takes over same-origin links between screens", () => {
    expect(targetForAnchor({ href: "/settings" })).toBe("/settings");
    expect(targetForAnchor({ href: "/p/ada" })).toBe("/p/ada");
    expect(targetForAnchor({ href: "/home?tab=posts" })).toBe("/home?tab=posts");
  });

  it("leaves the routes Clerk owns to the browser", () => {
    expect(targetForAnchor({ href: "/sign-in" })).toBeNull();
    expect(targetForAnchor({ href: "/sign-up" })).toBeNull();
    expect(targetForAnchor({ href: "/sign-up/verify-email-address" })).toBeNull();
  });

  it("leaves anything the browser handles differently", () => {
    expect(targetForAnchor({ href: "https://github.com/gholtzap" })).toBeNull();
    expect(targetForAnchor({ href: "/p/ada", target: "_blank" })).toBeNull();
    expect(targetForAnchor({ href: "/export.csv", download: "" })).toBeNull();
    expect(targetForAnchor({ href: "/p/ada", rel: "external" })).toBeNull();
    expect(targetForAnchor({ href: "#section" })).toBeNull();
  });

  it("leaves a modified or non-primary click alone", () => {
    expect(targetForAnchor({ href: "/settings" }, { metaKey: true })).toBeNull();
    expect(targetForAnchor({ href: "/settings" }, { ctrlKey: true })).toBeNull();
    expect(targetForAnchor({ href: "/settings" }, { shiftKey: true })).toBeNull();
    expect(targetForAnchor({ href: "/settings" }, { button: 1 })).toBeNull();
  });

  it("leaves a hash on the page the hash routes are already watching", () => {
    window.history.replaceState(null, "", "/home");
    expect(targetForAnchor({ href: "/home#/p/ada" })).toBeNull();
    expect(targetForAnchor({ href: "/p/ada#/r/token" })).toBe("/p/ada#/r/token");
  });
});

describe("Navigation", () => {
  afterEach(() => {
    document.body.replaceChildren();
    window.history.replaceState(null, "", "/");
  });

  it("moves the screen without reloading and reports the new path", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    act(() => root.render(<PathnameValue />));
    expect(container.textContent).toBe("/");

    act(() => navigate("/settings"));
    expect(window.location.pathname).toBe("/settings");
    expect(container.textContent).toBe("/settings");

    act(() => root.unmount());
  });

  it("follows the back button", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    act(() => root.render(<PathnameValue />));

    act(() => navigate("/settings"));
    act(() => {
      window.history.replaceState(null, "", "/home");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(container.textContent).toBe("/home");

    act(() => root.unmount());
  });

  it("stays put when the link points at the current URL", () => {
    window.history.replaceState(null, "", "/settings");
    const lengthBefore = window.history.length;

    navigate("/settings");

    expect(window.history.length).toBe(lengthBefore);
  });

  it("intercepts a click through the document listener", () => {
    const stop = interceptLinkClicks();
    const anchor = document.createElement("a");
    anchor.setAttribute("href", "/home");
    document.body.append(anchor);

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(window.location.pathname).toBe("/home");
    stop();
  });
});
