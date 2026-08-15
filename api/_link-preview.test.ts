import { describe, expect, it } from "vitest";
import { linkPreviewNetworkRules } from "./_link-preview";

describe("link preview network boundary", () => {
  it("allows public addresses and rejects local or reserved addresses", () => {
    expect(linkPreviewNetworkRules.publicAddress("8.8.8.8")).toBe(true);
    expect(linkPreviewNetworkRules.publicAddress("2606:4700:4700::1111")).toBe(true);
    for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "fc00::1"] ) {
      expect(linkPreviewNetworkRules.publicAddress(address)).toBe(false);
    }
  });

  it("accepts only credential-free HTTP URLs", () => {
    expect(linkPreviewNetworkRules.normalizedPublicUrl("https://example.com/post")?.hostname)
      .toBe("example.com");
    expect(linkPreviewNetworkRules.normalizedPublicUrl("file:///etc/passwd")).toBeNull();
    expect(linkPreviewNetworkRules.normalizedPublicUrl("https://user:pass@example.com"))
      .toBeNull();
  });
});
