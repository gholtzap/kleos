// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { currentPerson } from "../fixtures/data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

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

  it("renders a public handle route without an authenticated account", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            version: 1,
            revision: 0,
            person: {
              ...currentPerson,
              handle: "kabirdhillon",
              name: "Kabir Dhillon",
            },
            claims: [],
            projects: [],
            experience: [],
            education: [],
            certifications: [],
            otherExperience: [],
          }),
          { status: 200 },
        ),
      ),
    );
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <App
          sharedRoute={{
            kind: "profile-handle",
            profileHandle: "kabirdhillon",
          }}
        />,
      );
    });
    expect(container.querySelector("h1")?.textContent).toBe("Kabir Dhillon");
    expect(
      container.querySelector("button, input, select, textarea"),
    ).toBeNull();

    act(() => root.unmount());
    vi.unstubAllGlobals();
  });
});
