// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { PulseButton } from "./ui";

vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
Object.defineProperty(window, "matchMedia", {
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

test("activates the button glow on hover", async () => {
  const host = document.createElement("div");
  const root = createRoot(host);

  await act(async () => root.render(<PulseButton>Join Folio</PulseButton>));

  const button = host.querySelector("button");
  const beam = host.querySelector(".button-pulse");
  if (!(button instanceof HTMLButtonElement) || !(beam instanceof HTMLDivElement)) {
    throw new Error("Pulse button did not render.");
  }

  expect(beam.hasAttribute("data-active")).toBe(false);
  await act(async () => {
    button.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
  expect(beam.hasAttribute("data-active")).toBe(true);

  await act(async () => root.unmount());
});
