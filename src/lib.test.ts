import { describe, expect, it } from "vitest";
import { initialClaims, initialEvidence } from "./data";
import { initials } from "./lib";

describe("Folio domain fixtures", () => {
  it("keeps evidence links and privacy context internally consistent", () => {
    const claimIds = new Set(initialClaims.map((claim) => claim.id));

    expect(initials("Mara Voss")).toBe("MV");
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
});
