import { describe, expect, it } from "vitest";
import { currentPerson, initialClaims } from "../data";
import {
  claimState,
  applyEvidenceReviewDecision,
  discoveryProjection,
  evidenceForClaims,
  includesValue,
  isOwnership,
  isStringArray,
  mergeOwnerKleosRecord,
  normalizeKleosRecord,
  normalizeSubmittedKleosRecord,
  publicKleosRecord,
  reviewKleosRecord,
} from "./kleos";
import { sharedRouteFromHash } from "./lib";
import { accountHandle } from "./profile-identity";
import { normalizeNewProfessionalRequest } from "./requests";

describe("Kleos domain fixtures", () => {
  it("keeps nested evidence and privacy context internally consistent", () => {
    const evidence = evidenceForClaims(initialClaims);
    expect(includesValue(["one", "two"] as const, "two")).toBe(true);
    expect(includesValue(["one", "two"] as const, "three")).toBe(false);
    expect(isOwnership("Accountable owner")).toBe(true);
    expect(isOwnership("Unknown")).toBe(false);
    expect(isStringArray(["one", "two"])).toBe(true);
    expect(isStringArray(["one", 2])).toBe(false);
    expect(accountHandle("ada", "user-1")).toBe("@ada");
    expect(accountHandle(null, "user-1")).toBe("@user-1");
    expect(sharedRouteFromHash("#/p/user%2F1")).toEqual({
      kind: "profile-id",
      profileId: "user/1",
      revision: undefined,
    });
    expect(sharedRouteFromHash("#/p/user%2F1?v=7")).toEqual({
      kind: "profile-id",
      profileId: "user/1",
      revision: 7,
    });
    expect(sharedRouteFromHash("#/r/token%2Fvalue")).toEqual({
      kind: "review",
      reviewToken: "token/value",
    });
    expect(new Set(evidence.map((item) => item.id)).size).toBe(evidence.length);
    expect(initialClaims.map(claimState)).toEqual([
      "Confirmed",
      "Confirmed",
      "Supported",
    ]);
    expect(
      initialClaims
        .filter((claim) => claim.organizationHidden)
        .every((claim) => claim.privacy !== "Public"),
    ).toBe(true);
  });

  it("derives safe public and selected review records from the private record", () => {
    const record = {
      version: 1 as const,
      revision: 0,
      person: currentPerson,
      claims: initialClaims,
      projects: [],
      experience: [],
      education: [],
      certifications: [],
      otherExperience: [],
    };
    const published = publicKleosRecord(record);
    const firstPublished = published.claims[0];
    expect(published.claims.every((claim) => claim.privacy === "Public")).toBe(true);
    expect(firstPublished).toBeDefined();
    expect(firstPublished?.evidence[0]).toMatchObject({
      title: "Private evidence",
      redacted: true,
      reviewStatus: "Confirmed",
    });
    expect(firstPublished?.evidence[0]?.detail).toBe("");
    expect(firstPublished ? claimState(firstPublished) : null).toBe("Confirmed");

    const privateClaim = initialClaims.find(
      (claim) => claim.id === "confidential-diligence",
    );
    expect(privateClaim).toBeDefined();
    const reviewed = reviewKleosRecord(
      record,
      ["confidential-diligence"],
      ["diligence-summary"],
    );
    expect(reviewed.claims).toHaveLength(1);
    expect(reviewed.claims[0]?.organization).toBe("Organization confidential");
    expect(reviewed.claims[0]?.evidence[0]?.detail).toContain("Redacted summary");
  });

  it("upgrades a legacy public profile to the nested record contract", () => {
    const legacyClaim = { ...initialClaims[0] };
    const { evidence: _evidence, ...claimWithoutEvidence } = legacyClaim;
    const normalized = normalizeKleosRecord({
      person: { ...currentPerson, secretLegacyField: "remove me" },
      claims: [{ ...claimWithoutEvidence, secretLegacyField: "remove me" }],
    });
    expect(normalized).toMatchObject({ version: 1 });
    expect(normalized?.claims[0]?.evidence).toEqual([]);
    expect(normalized?.person).not.toHaveProperty("secretLegacyField");
    expect(normalized?.claims[0]).not.toHaveProperty("secretLegacyField");
    expect(normalized?.claims[0] ? claimState(normalized.claims[0]) : null).toBe(
      "Draft",
    );
  });

  it("does not let an owner confirm evidence or keep confirmation after edits", () => {
    const record = {
      version: 1 as const,
      revision: 0,
      person: currentPerson,
      claims: initialClaims,
      projects: [],
      experience: [],
      education: [],
      certifications: [],
      otherExperience: [],
    };
    const confirmed = initialClaims[0]?.evidence[0];
    expect(confirmed).toBeDefined();
    if (!confirmed || !initialClaims[0]) return;

    const forged = {
      ...record,
      person: {
        ...record.person,
        id: "forged",
        identityVerified: true,
        employmentVerified: true,
      },
      claims: [
        {
          ...initialClaims[0],
          evidence: [
            {
              ...confirmed,
              id: "new-evidence",
              reviewStatus: "Confirmed" as const,
            },
          ],
        },
      ],
    };
    const safeNew = mergeOwnerKleosRecord(null, forged, "owner-1");
    expect(safeNew.person).toMatchObject({
      id: "owner-1",
      identityVerified: false,
      employmentVerified: false,
    });
    expect(safeNew.claims[0]?.evidence[0]?.reviewStatus).toBe("Not submitted");

    const edited = {
      ...record,
      claims: record.claims.map((claim) =>
        claim.id === initialClaims[0]?.id
          ? {
              ...claim,
              evidence: claim.evidence.map((item) =>
                item.id === confirmed.id
                  ? {
                      ...item,
                      detail: `${item.detail} Changed.`,
                      reviewStatus: "Confirmed" as const,
                    }
                  : item,
              ),
            }
          : claim,
      ),
    };
    const safeEdit = mergeOwnerKleosRecord(record, edited, record.person.id);
    expect(safeEdit.claims[0]?.evidence[0]?.reviewStatus).toBe(
      "Not submitted",
    );

    const changedClaim = {
      ...record,
      claims: record.claims.map((claim) =>
        claim.id === initialClaims[0]?.id
          ? { ...claim, outcome: `${claim.outcome} Doubled again.` }
          : claim,
      ),
    };
    const safeClaimEdit = mergeOwnerKleosRecord(
      record,
      changedClaim,
      record.person.id,
    );
    expect(safeClaimEdit.claims[0]?.evidence[0]?.reviewStatus).toBe(
      "Not submitted",
    );

    const visibilityOnly = {
      ...record,
      claims: record.claims.map((claim) =>
        claim.id === initialClaims[0]?.id
          ? {
              ...claim,
              privacy: "Private" as const,
              evidence: claim.evidence.map((item) => ({
                ...item,
                access: "Public" as const,
              })),
            }
          : claim,
      ),
    };
    const safeVisibilityEdit = mergeOwnerKleosRecord(
      record,
      visibilityOnly,
      record.person.id,
    );
    expect(safeVisibilityEdit.claims[0]?.evidence[0]?.reviewStatus).toBe(
      "Confirmed",
    );
  });

  it("moves a supported claim to Confirmed only after an in-house decision", () => {
    const pendingClaim = initialClaims.find(
      (claim) => claim.id === "confidential-diligence",
    );
    expect(pendingClaim ? claimState(pendingClaim) : null).toBe("Supported");
    if (!pendingClaim) return;
    const record = {
      version: 1 as const,
      revision: 0,
      person: currentPerson,
      claims: [pendingClaim],
      projects: [],
      experience: [],
      education: [],
      certifications: [],
      otherExperience: [],
    };
    const reviewed = applyEvidenceReviewDecision(
      record,
      pendingClaim.id,
      "diligence-summary",
      "Confirmed",
      "The source supports the stated outcome.",
      "reviewer-1",
      "2026-07-28T12:00:00.000Z",
    );
    expect(reviewed?.claims[0] ? claimState(reviewed.claims[0]) : null).toBe(
      "Confirmed",
    );
    expect(reviewed?.claims[0]?.evidence[0]).toMatchObject({
      reviewStatus: "Confirmed",
      reviewedBy: "reviewer-1",
    });
    const shared = reviewed
      ? reviewKleosRecord(
          reviewed,
          [pendingClaim.id],
          ["diligence-summary"],
        )
      : null;
    expect(shared?.claims[0]?.evidence[0]?.reviewedBy).toBe(
      "Kleos review team",
    );
  });

  it("rejects unknown record versions instead of rewriting them as version one", () => {
    expect(
      normalizeKleosRecord({
        version: 2,
        revision: 0,
        person: currentPerson,
        claims: initialClaims,
        projects: [],
        experience: [],
        education: [],
        certifications: [],
        otherExperience: [],
      }),
    ).toBeNull();
    expect(
      normalizeSubmittedKleosRecord({
        person: currentPerson,
        claims: initialClaims,
        projects: [],
        experience: [],
        education: [],
        certifications: [],
        otherExperience: [],
      }),
    ).toBeNull();
    expect(
      normalizeSubmittedKleosRecord({
        version: 1,
        revision: 0,
        person: currentPerson,
        claims: [null],
      }),
    ).toBeNull();
  });

  it("builds discovery data only from the safe public projection", () => {
    const record = {
      version: 1 as const,
      revision: 4,
      person: currentPerson,
      claims: initialClaims,
      projects: [],
      experience: [],
      education: [],
      certifications: [],
      otherExperience: [],
    };
    const projection = discoveryProjection(record);
    expect(projection.publicRecord.claims).toHaveLength(2);
    expect(projection.searchText).toContain("Claims infrastructure migration");
    expect(projection.searchText).not.toContain("pre-acquisition review");
    expect(projection.searchText).not.toContain(
      "Private technical plan showing authorship",
    );
    expect(projection.ownershipLevels).toEqual([
      "Accountable owner",
      "Lead",
    ]);
  });

  it("validates durable professional request contracts", () => {
    const input = {
      kind: "Advice",
      title: "Review a migration plan",
      need: "I need an experienced operator to review this migration plan.",
      experience: ["Platform migration"],
      commitment: "One hour",
      compensation: "$300",
      constraints: "Remote",
      preferredEvidence: "A confirmed migration claim",
    };
    expect(normalizeNewProfessionalRequest(input)).toEqual(input);
    expect(
      normalizeNewProfessionalRequest({
        ...input,
        need: "Too short",
      }),
    ).toBeNull();
  });

});
