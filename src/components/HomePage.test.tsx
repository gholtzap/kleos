// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "./HomePage";

const feed = vi.hoisted(() => ({
  createPost: vi.fn(),
  deleteUnattachedUpload: vi.fn(),
  getPostFeed: vi.fn(),
  uploadPostFile: vi.fn(),
}));

vi.mock("../lib/post-feed", () => feed);

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

class TestResizeObserver {
  disconnect() {}
  observe() {}
}

describe("HomePage post publishing", () => {
  beforeEach(() => {
    feed.createPost.mockReset();
    feed.deleteUnattachedUpload.mockReset();
    feed.getPostFeed.mockReset().mockResolvedValue({ items: [] });
    feed.uploadPostFile.mockReset().mockResolvedValue({
      cloudName: "kleos-test",
      deleteToken: "delete-token",
      kind: "image",
      publicId: "owned-upload",
    });
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:preview"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it("does not delete media after the create request starts", async () => {
    feed.createPost.mockRejectedValue(new Error("The response was lost."));
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const getToken = vi.fn(async () => "token");
    await act(async () => root.render(
      <HomePage
        account={{ id: "owner-1", name: "Owner", handle: "@owner" }}
        getToken={getToken}
      />,
    ));

    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File([new Uint8Array([1, 2, 3])], "chart.png", {
      type: "image/png",
    });
    Object.defineProperty(fileInput, "files", { configurable: true, value: [file] });
    await act(async () => fileInput?.dispatchEvent(new Event("change", { bubbles: true })));
    const postButton = container.querySelector<HTMLButtonElement>(
      ".post-composer__post",
    );
    await act(async () => postButton?.click());
    await vi.waitFor(() => expect(feed.createPost).toHaveBeenCalledOnce());

    expect(feed.deleteUnattachedUpload).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });
});
