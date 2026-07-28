import { describe, expect, it } from "vitest";
import { initialClaims, initialEvidence } from "./data";
import {
  emptyProfile,
  heapUsageIsUnsafe,
  initials,
  parseCommaSeparatedList,
} from "./lib";
import { publicProfileHash, publicProfileIdFromHash } from "./public-profile";

describe("Folio domain fixtures", () => {
  it("keeps evidence links and privacy context internally consistent", () => {
    const claimIds = new Set(initialClaims.map((claim) => claim.id));

    expect(initials("Mara Voss")).toBe("MV");
    expect(emptyProfile("user-1", "Ada Lovelace")).toMatchObject({
      id: "user-1",
      initials: "AL",
      name: "Ada Lovelace",
      preferredLocations: [],
      compensationPreference: "",
    });
    expect(publicProfileHash("user/1")).toBe("#/p/user%2F1");
    expect(publicProfileIdFromHash("#/p/user%2F1")).toBe("user/1");
    expect(initialEvidence.every((item) => item.claimIds.every((id) => claimIds.has(id)))).toBe(
      true,
    );
    expect(initialClaims.every((claim) => claim.verification.length > 0)).toBe(true);
    expect(
      initialClaims
        .filter((claim) => claim.organizationHidden)
        .every((claim) => claim.privacy !== "Public"),
    ).toBe(true);
  });

  it("trips the heap guard before tab memory gets unbounded", () => {
    expect(heapUsageIsUnsafe({ usedJSHeapSize: 536_870_912 })).toBe(true);
    expect(
      heapUsageIsUnsafe({
        usedJSHeapSize: 86,
        jsHeapSizeLimit: 100,
      }),
    ).toBe(true);
    expect(heapUsageIsUnsafe({ usedJSHeapSize: 100 })).toBe(false);
  });

  it("parses comma-separated form values", () => {
    expect(parseCommaSeparatedList("Accessibility, , Cloud cost,")).toEqual([
      "Accessibility",
      "Cloud cost",
    ]);
    expect(parseCommaSeparatedList("")).toEqual([]);
  });
});
