// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { Experience } from "./Experience";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("Experience", () => {
  afterEach(() => document.body.replaceChildren());

  it("shows and hides experience details", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    act(() => root.render(<Experience />));
    const button = container.querySelector("button");
    expect(button?.textContent).toContain("See more");
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).not.toContain("Member of Technical Staff");
    expect(
      Array.from(container.querySelectorAll<HTMLImageElement>('img[src^="/company-logos/"]'))
        .map((image) => image.getAttribute("src")),
    ).toEqual([
      "/company-logos/vercel.png",
      "/company-logos/openai.svg",
      "/company-logos/stripe.svg",
      "/company-logos/google.png",
    ]);

    act(() => button?.click());
    expect(button?.textContent).toContain("See less");
    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain("Member of Technical Staff");
    expect(container.textContent).toContain("Built platform systems");

    act(() => button?.click());
    expect(button?.getAttribute("aria-expanded")).toBe("false");

    act(() => root.unmount());
  });
});
