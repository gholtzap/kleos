// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { useLocationHash } from "./use-location-hash";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function HashValue() {
  return <span>{useLocationHash()}</span>;
}

describe("useLocationHash", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
    document.body.replaceChildren();
  });

  it("updates when the active hash changes", () => {
    window.history.replaceState(null, "", "/#/p/first");
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    act(() => root.render(<HashValue />));
    expect(container.textContent).toBe("#/p/first");

    act(() => {
      window.history.replaceState(null, "", "/#/p/second");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(container.textContent).toBe("#/p/second");

    act(() => root.unmount());
  });
});
