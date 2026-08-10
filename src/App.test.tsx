// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("public landing page", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    document.body.replaceChildren();
  });

  it("keeps the original evidence-led account entry page", () => {
    document.body.innerHTML = renderToStaticMarkup(<App />);

    expect(document.querySelector(".kleos-landing")).not.toBeNull();
    expect(document.querySelector(".kleos-landing-visual")).not.toBeNull();
    expect(document.querySelector("h1")?.textContent).toBe(
      "Professional profiles built on evidence.",
    );
    expect(
      document.querySelector<HTMLAnchorElement>('a[href="/sign-up"]')
        ?.textContent,
    ).toContain("Create your account");
    expect(
      document.querySelector<HTMLAnchorElement>('a[href="/sign-in"]')
        ?.textContent,
    ).toContain("Sign in");
  });
});
