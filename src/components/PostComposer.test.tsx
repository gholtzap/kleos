// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PostComposer } from "./PostComposer";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

class TestResizeObserver {
  disconnect() {}
  observe() {}
}

describe("PostComposer", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it("accepts an image-only post and includes its description", async () => {
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:preview"),
      revokeObjectURL: vi.fn(),
    });
    const onPost = vi.fn(async () => undefined);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<PostComposer onPost={onPost} />));

    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    const file = new File([new Uint8Array([1, 2, 3])], "chart.png", {
      type: "image/png",
    });
    Object.defineProperty(fileInput, "files", { configurable: true, value: [file] });
    await act(async () => fileInput?.dispatchEvent(new Event("change", { bubbles: true })));

    const description = container.querySelector<HTMLInputElement>(
      'input[aria-label="Description for chart.png"]',
    );
    expect(description).not.toBeNull();
    await act(async () => {
      if (!description) return;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(description, "Quarterly revenue chart");
      description.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const postButton = container.querySelector<HTMLButtonElement>(
      '.post-composer__post',
    );
    expect(postButton?.disabled).toBe(false);
    await act(async () => postButton?.click());
    expect(onPost).toHaveBeenCalledWith({
      body: "",
      media: [expect.objectContaining({ alt: "Quarterly revenue chart", file })],
    });
    await act(async () => root.unmount());
  });
});
