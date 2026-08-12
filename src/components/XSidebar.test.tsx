// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { XSidebar } from "./XSidebar";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("XSidebar", () => {
  afterEach(() => document.body.replaceChildren());

  it("collapses and expands from its toggle", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    act(() => root.render(
      <XSidebar
        account={{ name: "Gavin Holtzapple", handle: "@gavinholtzapple" }}
        activeItem="Profile"
        collapsible
        onPost={vi.fn()}
      />,
    ));

    const sidebar = container.querySelector("aside");
    const collapseButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Collapse sidebar"]',
    );

    expect(sidebar?.classList.contains("x-sidebar--collapsed")).toBe(false);
    act(() => collapseButton?.click());
    expect(sidebar?.classList.contains("x-sidebar--collapsed")).toBe(true);
    expect(container.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();

    act(() => container.querySelector<HTMLButtonElement>(
      'button[aria-label="Expand sidebar"]',
    )?.click());
    expect(sidebar?.classList.contains("x-sidebar--collapsed")).toBe(false);

    act(() => root.unmount());
  });
});
