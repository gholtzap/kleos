import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteUnattachedUpload } from "./post-feed";

describe("post media cleanup", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the provider delete token as form data", async () => {
    const fetchMock = vi.fn(async (
      _input: RequestInfo | URL,
      _init?: RequestInit,
    ) => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await deleteUnattachedUpload({
      cloudName: "kleos-test",
      deleteToken: "delete-token",
      kind: "image",
      publicId: "upload-id",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://api.cloudinary.com/v1_1/kleos-test/delete_by_token",
    );
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(URLSearchParams);
    expect(String(init?.body)).toBe("token=delete-token");
  });
});
