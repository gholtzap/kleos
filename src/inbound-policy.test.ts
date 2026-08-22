import { describe, expect, it } from "vitest";
import {
  defaultInboundPolicy,
  defaultRecruitingTerms,
  formatCompensation,
  formatCompensationRange,
  laneForOutreach,
  missingFieldsMessage,
  missingOutreachFields,
  normalizeInboundPolicy,
  normalizeOutreachHeader,
  outreachDecision,
  recruitingTermsSummary,
  refusalMessage,
  type OutreachRefusal,
  type SenderStanding,
} from "./inbound-policy";
import type { InboundPolicy, OutreachHeader } from "./types";

const stranger: SenderStanding = {
  identityVerified: true,
  employmentVerified: false,
  hasRepliedHistory: false,
  blocked: false,
};

/** A complete, well-formed recruiting header. Cases below vary one field at a time. */
const hiring: OutreachHeader = {
  kind: "Hiring",
  role: "Staff infrastructure engineer",
  organization: "Northwind",
  industry: "Fintech",
  location: "Remote",
  employmentType: "Full-time",
  baseCompensation: { min: 190_000, max: 230_000, currency: "USD" },
};

function policyWith(terms: Partial<InboundPolicy["recruiting"]>): InboundPolicy {
  return {
    ...defaultInboundPolicy(),
    recruiting: { ...defaultRecruitingTerms(), ...terms },
  };
}

function codes(decision: ReturnType<typeof outreachDecision>): string[] {
  return decision.kind === "refused"
    ? decision.reasons.map((reason) => reason.code)
    : [];
}

describe("outreachDecision", () => {
  it("lets a complete hiring message through the open default policy", () => {
    expect(outreachDecision(stranger, hiring, defaultInboundPolicy())).toEqual({
      kind: "allowed",
      lane: "opportunities",
    });
  });

  it("files non-recruiting first contact under requests, not opportunities", () => {
    const decision = outreachDecision(
      stranger,
      { kind: "Advice" },
      defaultInboundPolicy(),
    );
    expect(decision).toEqual({ kind: "allowed", lane: "requests" });
  });

  it("stops asking for a header once the recipient has replied", () => {
    // A reply is consent, so the terms never apply again — even to a message
    // that would otherwise be refused outright.
    const answered = { ...stranger, hasRepliedHistory: true };
    const closed = policyWith({ accepting: false });
    expect(outreachDecision(answered, null, closed)).toEqual({
      kind: "allowed",
      lane: "primary",
    });
    expect(outreachDecision(answered, hiring, closed)).toEqual({
      kind: "allowed",
      lane: "primary",
    });
  });

  it("refuses a blocked sender before anything else is considered", () => {
    const blocked = { ...stranger, blocked: true, hasRepliedHistory: true };
    expect(codes(outreachDecision(blocked, hiring, defaultInboundPolicy())))
      .toEqual(["blocked"]);
  });

  it("asks for the kind when no header has been collected yet", () => {
    expect(outreachDecision(stranger, null, defaultInboundPolicy())).toEqual({
      kind: "header-required",
      missing: ["kind"],
    });
  });

  it("names every field a recruiting header is still missing", () => {
    const decision = outreachDecision(
      stranger,
      { kind: "Hiring" },
      defaultInboundPolicy(),
    );
    expect(decision).toEqual({
      kind: "header-required",
      missing: [
        "role",
        "organization",
        "industry",
        "location",
        "employmentType",
        "baseCompensation",
      ],
    });
  });

  it("asks nothing extra of non-recruiting outreach", () => {
    expect(missingOutreachFields({ kind: "Advice" }, defaultInboundPolicy()))
      .toEqual([]);
  });

  it("only requires a pay band when the member has a term that reads it", () => {
    const relaxed = policyWith({ requireCompensationDisclosed: false });
    expect(missingOutreachFields({ ...hiring, baseCompensation: undefined }, relaxed))
      .toEqual([]);
    const withFloor = policyWith({
      requireCompensationDisclosed: false,
      minimumBaseCompensation: 180_000,
    });
    expect(missingOutreachFields({ ...hiring, baseCompensation: undefined }, withFloor))
      .toEqual(["baseCompensation"]);
  });

  it("does not ask for six fields when the answer would be no regardless", () => {
    // A closed door is stated once, rather than after a form is filled in.
    const closed = policyWith({ accepting: false });
    expect(codes(outreachDecision(stranger, { kind: "Hiring" }, closed)))
      .toEqual(["recruiting-closed"]);
  });

  it("refuses an unverified identity when the member requires proof", () => {
    const unverified = { ...stranger, identityVerified: false };
    expect(codes(outreachDecision(unverified, hiring, defaultInboundPolicy())))
      .toEqual(["identity-unverified"]);
    const relaxed = { ...defaultInboundPolicy(), requireVerifiedIdentity: false };
    expect(outreachDecision(unverified, hiring, relaxed).kind).toBe("allowed");
  });

  it("refuses a kind the member is not open to", () => {
    const narrow: InboundPolicy = { ...defaultInboundPolicy(), openTo: ["Advice"] };
    const decision = outreachDecision(stranger, hiring, narrow);
    expect(decision).toMatchObject({
      kind: "refused",
      reasons: [{ code: "closed-to-kind", kind: "Hiring" }],
    });
  });

  it("requires the claimed employer to match confirmed evidence when asked", () => {
    const strict = policyWith({ requireVerifiedEmployer: true });
    expect(codes(outreachDecision(stranger, hiring, strict)))
      .toEqual(["employer-unverified"]);

    const proven = {
      ...stranger,
      employmentVerified: true,
      organization: "northwind",
    };
    expect(outreachDecision(proven, hiring, strict).kind).toBe("allowed");

    // Confirmed employment somewhere else does not vouch for this claim.
    const elsewhere = {
      ...stranger,
      employmentVerified: true,
      organization: "Someone Else",
    };
    expect(codes(outreachDecision(elsewhere, hiring, strict)))
      .toEqual(["employer-unverified"]);
  });

  it("treats an empty list as no term rather than a closed door", () => {
    // This is the difference between a filter and an outage: a member who set
    // no industry term must still hear from every industry.
    const open = policyWith({ industries: [], locations: [], employmentTypes: [] });
    expect(outreachDecision(stranger, hiring, open).kind).toBe("allowed");
  });

  it("refuses an industry, location, or employment type outside the allowlist", () => {
    const narrow = policyWith({
      industries: ["Healthcare"],
      locations: ["New York"],
      employmentTypes: ["Contract"],
    });
    expect(codes(outreachDecision(stranger, hiring, narrow))).toEqual([
      "industry-not-accepted",
      "location-not-accepted",
      "employment-type-not-accepted",
    ]);
  });

  it("reports every unmet term at once instead of one per attempt", () => {
    const narrow = policyWith({
      industries: ["Healthcare"],
      minimumBaseCompensation: 400_000,
    });
    expect(codes(outreachDecision(stranger, hiring, narrow)))
      .toEqual(["industry-not-accepted", "below-pay-band"]);
  });

  it("compares the top of the offered band against the floor", () => {
    const floor = policyWith({ minimumBaseCompensation: 200_000 });
    // 190k–230k straddles a 200k floor, and is worth a conversation.
    expect(outreachDecision(stranger, hiring, floor).kind).toBe("allowed");

    const below = {
      ...hiring,
      baseCompensation: { min: 120_000, max: 150_000, currency: "USD" as const },
    };
    expect(codes(outreachDecision(stranger, below, floor))).toEqual(["below-pay-band"]);
  });

  it("treats a band topping out exactly at the floor as meeting it", () => {
    const floor = policyWith({ minimumBaseCompensation: 230_000 });
    expect(outreachDecision(stranger, hiring, floor).kind).toBe("allowed");

    const justUnder = policyWith({ minimumBaseCompensation: 230_001 });
    expect(codes(outreachDecision(stranger, hiring, justUnder))).toEqual(["below-pay-band"]);
  });

  it("refuses to guess across currencies", () => {
    const floor = policyWith({ minimumBaseCompensation: 180_000, currency: "USD" });
    const euros = {
      ...hiring,
      baseCompensation: { min: 190_000, max: 230_000, currency: "EUR" as const },
    };
    expect(codes(outreachDecision(stranger, euros, floor)))
      .toEqual(["compensation-currency-mismatch"]);
  });

  it("applies no recruiting term to non-recruiting outreach", () => {
    const strict = policyWith({
      accepting: false,
      industries: ["Healthcare"],
      minimumBaseCompensation: 500_000,
      requireVerifiedEmployer: true,
    });
    expect(outreachDecision(stranger, { kind: "Advice" }, strict).kind).toBe("allowed");
  });

  it("routes contract work through the recruiting terms too", () => {
    expect(laneForOutreach({ kind: "Contract" })).toBe("opportunities");
    const closed = policyWith({ accepting: false });
    expect(codes(outreachDecision(stranger, { kind: "Contract" }, closed)))
      .toEqual(["recruiting-closed"]);
  });
});

describe("normalizeInboundPolicy", () => {
  it("returns a usable policy for anything, so no record needs a backfill", () => {
    for (const value of [undefined, null, 0, "policy", [], {}]) {
      expect(normalizeInboundPolicy(value)).toEqual(defaultInboundPolicy());
    }
  });

  it("drops values outside the closed vocabularies", () => {
    const policy = normalizeInboundPolicy({
      version: 1,
      openTo: ["Hiring", "Telepathy", 7],
      requireVerifiedIdentity: false,
      recruiting: {
        accepting: true,
        industries: ["Fintech", "Astrology", "Fintech"],
        locations: ["Remote", "Atlantis"],
        employmentTypes: ["Full-time", "Indentured"],
        currency: "DOGE",
        minimumBaseCompensation: 180_000,
      },
    });
    expect(policy.openTo).toEqual(["Hiring"]);
    expect(policy.requireVerifiedIdentity).toBe(false);
    expect(policy.recruiting.industries).toEqual(["Fintech"]);
    expect(policy.recruiting.locations).toEqual(["Remote"]);
    expect(policy.recruiting.employmentTypes).toEqual(["Full-time"]);
    expect(policy.recruiting.currency).toBe("USD");
    expect(policy.recruiting.minimumBaseCompensation).toBe(180_000);
  });

  it("rejects compensation that is negative, absurd, or not a number", () => {
    for (const amount of [-1, 0, Number.NaN, Number.POSITIVE_INFINITY, 1e12, "180000"]) {
      const policy = normalizeInboundPolicy({
        recruiting: { minimumBaseCompensation: amount },
      });
      expect(policy.recruiting.minimumBaseCompensation).toBeUndefined();
    }
  });

  it("survives a JSON round trip unchanged", () => {
    const policy = policyWith({
      industries: ["Fintech", "Developer tools"],
      minimumBaseCompensation: 180_000,
      locations: ["Remote", "New York"],
    });
    expect(normalizeInboundPolicy(JSON.parse(JSON.stringify(policy)))).toEqual(policy);
  });

  it("keeps an explicitly empty openTo, which is how a member closes the door", () => {
    expect(normalizeInboundPolicy({ openTo: [] }).openTo).toEqual([]);
    // An absent list is not the same statement as an empty one.
    expect(normalizeInboundPolicy({}).openTo.length).toBeGreaterThan(0);
  });
});

describe("normalizeOutreachHeader", () => {
  it("requires a known kind and drops unknown vocabulary", () => {
    expect(normalizeOutreachHeader(null)).toBeNull();
    expect(normalizeOutreachHeader({ kind: "Telepathy" })).toBeNull();
    expect(
      normalizeOutreachHeader({
        kind: "Hiring",
        role: "  Staff engineer  ",
        industry: "Astrology",
        location: "Atlantis",
        employmentType: "Indentured",
        baseCompensation: { min: 200_000, max: 100_000, currency: "USD" },
      }),
    ).toEqual({
      kind: "Hiring",
      role: "Staff engineer",
      organization: undefined,
      industry: undefined,
      location: undefined,
      employmentType: undefined,
      baseCompensation: undefined,
    });
  });

  it("treats a blank string as absent rather than as an answer", () => {
    const header = normalizeOutreachHeader({ kind: "Hiring", role: "   " });
    expect(header?.role).toBeUndefined();
  });
});

describe("member-facing copy", () => {
  it("gives every refusal a specific sentence naming the recipient", () => {
    const refusals: OutreachRefusal[] = [
      { code: "blocked" },
      { code: "identity-unverified" },
      { code: "closed-to-kind", kind: "Hiring" },
      { code: "recruiting-closed" },
      { code: "employer-unverified", organization: "Northwind" },
      { code: "industry-not-accepted", accepted: ["Fintech"] },
      { code: "location-not-accepted", accepted: ["Remote"] },
      { code: "employment-type-not-accepted", accepted: ["Full-time"] },
      { code: "compensation-currency-mismatch", expected: "GBP" },
      { code: "below-pay-band", minimum: 180_000, currency: "USD" },
    ];
    for (const refusal of refusals) {
      const message = refusalMessage(refusal, "Maya");
      expect(message.length).toBeGreaterThan(10);
      expect(message).toContain("Maya");
    }
  });

  it("says what the bar actually is, so it can be met", () => {
    expect(refusalMessage({ code: "below-pay-band", minimum: 180_000, currency: "USD" }, "Maya"))
      .toBe("Maya accepts roles from $180k base.");
    expect(
      refusalMessage(
        { code: "industry-not-accepted", accepted: ["Fintech", "Developer tools"] },
        "Maya",
      ),
    ).toBe("Maya accepts recruiting outreach about Fintech and Developer tools.");
  });

  it("formats pay the way it is spoken", () => {
    expect(formatCompensation(180_000, "USD")).toBe("$180k");
    // Only round thousands shorten. An exact figure stays exact rather than
    // being rounded into something the recruiter did not say.
    expect(formatCompensation(185_500, "GBP")).toBe("£185,500");
    expect(formatCompensation(1_500, "EUR")).toBe("€1,500");
    expect(formatCompensation(1_000, "EUR")).toBe("€1k");
    expect(formatCompensationRange({ min: 190_000, max: 230_000, currency: "USD" }))
      .toBe("$190k–$230k");
    expect(formatCompensationRange({ min: 200_000, max: 200_000, currency: "CAD" }))
      .toBe("CA$200k");
  });

  it("lists the missing fields in one readable sentence", () => {
    expect(missingFieldsMessage(["role", "baseCompensation"]))
      .toBe("Add the role and the base pay band before sending.");
    expect(missingFieldsMessage(["role", "location", "baseCompensation"]))
      .toBe("Add the role, the location, and the base pay band before sending.");
  });

  it("summarises the terms a member is publishing", () => {
    expect(
      recruitingTermsSummary(
        {
          ...defaultRecruitingTerms(),
          industries: ["Fintech", "Developer tools"],
          minimumBaseCompensation: 180_000,
          locations: ["Remote", "San Francisco Bay Area"],
        },
        "Maya",
      ),
    ).toBe(
      "Recruiters may reach Maya about Fintech and Developer tools, from $180k base, in Remote and San Francisco Bay Area.",
    );
    expect(recruitingTermsSummary({ ...defaultRecruitingTerms(), accepting: false }, "Maya"))
      .toBe("Maya does not accept recruiting outreach.");
    expect(recruitingTermsSummary(defaultRecruitingTerms(), "Maya"))
      .toBe("Recruiters may reach Maya about any industry.");
  });
});
