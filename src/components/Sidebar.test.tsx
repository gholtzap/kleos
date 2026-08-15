// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("Sidebar", () => {
  afterEach(() => document.body.replaceChildren());

  it("collapses and expands from its toggle", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    act(() => root.render(
      <Sidebar
        account={{
          id: "user-gavin",
          name: "Gavin Holtzapple",
          handle: "@gavinholtzapple",
        }}
        activeItem="Profile"
        collapsible
        onPost={vi.fn()}
      />,
    ));

    const sidebar = container.querySelector("aside");
    const collapseButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Collapse sidebar"]',
    );

    expect(sidebar?.classList.contains("sidebar--collapsed")).toBe(false);
    expect(container.querySelector('a[aria-label="Home"]')).not.toBeNull();
    expect(container.querySelector('a[aria-label="Profile"]')).not.toBeNull();
    expect(
      container.querySelector<HTMLAnchorElement>('a[aria-label="Settings"]')
        ?.pathname,
    ).toBe("/settings");
    expect(container.querySelector('button[aria-label="Create post"]')).not.toBeNull();
    act(() => collapseButton?.click());
    expect(sidebar?.classList.contains("sidebar--collapsed")).toBe(true);
    expect(container.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();

    act(() => container.querySelector<HTMLButtonElement>(
      'button[aria-label="Expand sidebar"]',
    )?.click());
    expect(sidebar?.classList.contains("sidebar--collapsed")).toBe(false);

    act(() => root.unmount());
  });
});
