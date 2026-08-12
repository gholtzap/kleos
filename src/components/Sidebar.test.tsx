// @vitest-environment jsdom

import { act, useState } from "react";
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

    function ControlledSidebar() {
      const [collapsed, setCollapsed] = useState(false);
      return (
        <Sidebar
          account={{ name: "Gavin Holtzapple", handle: "@gavinholtzapple" }}
          activeItem="Profile"
          collapsed={collapsed}
          collapsible
          onCollapsedChange={setCollapsed}
          onPost={vi.fn()}
        />
      );
    }

    act(() => root.render(<ControlledSidebar />));

    const sidebar = container.querySelector("aside");
    const collapseButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Collapse sidebar"]',
    );

    expect(sidebar?.getAttribute("id")).toBe("sidebar");
    expect(container.querySelector('a[aria-label="Home"]')).not.toBeNull();
    expect(container.querySelector('a[aria-label="Profile"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Create post"]')).not.toBeNull();
    act(() => collapseButton?.click());
    expect(collapseButton?.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();

    act(() => container.querySelector<HTMLButtonElement>(
      'button[aria-label="Expand sidebar"]',
    )?.click());
    expect(container.querySelector('button[aria-label="Collapse sidebar"]')?.getAttribute("aria-expanded"))
      .toBe("true");

    act(() => root.unmount());
  });
});
