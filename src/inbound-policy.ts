import { includesValue, isRecord } from "./guards.js";
import {
  currencies,
  employmentTypes,
  industries,
  outreachKinds,
  outreachLocations,
} from "./types.js";
import type {
  CompensationRange,
  Currency,
  EmploymentType,
  InboundPolicy,
  InboxLane,
  Industry,
  OutreachHeader,
  OutreachKind,
  OutreachLocation,
  RecruitingTerms,
} from "./types.js";

/** The kinds that carry a role and a pay band, so the recruiting terms apply. */
const recruitingKinds: readonly OutreachKind[] = ["Hiring", "Contract"];

export function isRecruitingKind(kind: OutreachKind): boolean {
  return recruitingKinds.includes(kind);
}

export const MAX_OUTREACH_ROLE_LENGTH = 120;
export const MAX_OUTREACH_ORGANIZATION_LENGTH = 120;
/** Nobody is paid this much. A wider ceiling only helps someone game the floor. */
export const MAX_COMPENSATION = 100_000_000;

/**
 * What a member is told about a sender before the terms are applied. Standing is
 * established from proven accounts and confirmed evidence, never from anything
 * the sender types.
 */
export interface SenderStanding {
  /** At least one verified Clerk provider is connected. */
  identityVerified: boolean;
  /** The organization below is backed by confirmed employment evidence. */
  employmentVerified: boolean;
  organization?: string;
  /** The recipient has replied at least once, so this is no longer cold contact. */
  hasRepliedHistory: boolean;
  blocked: boolean;
}

export type OutreachField =
  | "kind"
  | "role"
  | "organization"
  | "industry"
  | "location"
  | "employmentType"
  | "baseCompensation";

export type OutreachRefusal =
  | { code: "blocked" }
  | { code: "identity-unverified" }
  | { code: "closed-to-kind"; kind: OutreachKind }
  | { code: "recruiting-closed" }
  | { code: "employer-unverified"; organization: string }
  | { code: "industry-not-accepted"; accepted: readonly Industry[] }
  | { code: "location-not-accepted"; accepted: readonly OutreachLocation[] }
  | {
      code: "employment-type-not-accepted";
      accepted: readonly EmploymentType[];
    }
  | { code: "compensation-currency-mismatch"; expected: Currency }
  | { code: "below-pay-band"; minimum: number; currency: Currency };

export type OutreachDecision =
  | { kind: "allowed"; lane: InboxLane }
  | { kind: "header-required"; missing: readonly OutreachField[] }
  | { kind: "refused"; reasons: readonly OutreachRefusal[] };

export function defaultRecruitingTerms(): RecruitingTerms {
  return {
    accepting: true,
    industries: [],
    locations: [],
    employmentTypes: [],
    currency: "USD",
    requireCompensationDisclosed: true,
    // Almost nobody has confirmed employment evidence yet, so requiring it by
    // default would silently close every member's inbox to every recruiter.
    requireVerifiedEmployer: false,
  };
}

/**
 * Open, but never unstructured. The default already beats an unfiltered inbox:
 * every cold message declares itself, and hiring lands in its own lane.
 */
export function defaultInboundPolicy(): InboundPolicy {
  return {
    version: 1,
    openTo: [...outreachKinds],
    requireVerifiedIdentity: true,
    recruiting: defaultRecruitingTerms(),
  };
}

function uniqueMembers<T extends string>(
  allowed: readonly T[],
  value: unknown,
): T[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<T>();
  for (const item of value) {
    if (includesValue(allowed, item)) seen.add(item);
  }
  return [...seen];
}

function normalizeAmount(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  if (rounded <= 0 || rounded > MAX_COMPENSATION) return undefined;
  return rounded;
}

export function normalizeCompensationRange(
  value: unknown,
): CompensationRange | null {
  if (!isRecord(value)) return null;
  const min = normalizeAmount(value.min);
  const max = normalizeAmount(value.max);
  if (min === undefined || max === undefined || max < min) return null;
  return {
    min,
    max,
    currency: includesValue(currencies, value.currency) ? value.currency : "USD",
  };
}

export function normalizeRecruitingTerms(value: unknown): RecruitingTerms {
  const fallback = defaultRecruitingTerms();
  if (!isRecord(value)) return fallback;
  return {
    accepting:
      typeof value.accepting === "boolean"
        ? value.accepting
        : fallback.accepting,
    industries: uniqueMembers(industries, value.industries),
    locations: uniqueMembers(outreachLocations, value.locations),
    employmentTypes: uniqueMembers(employmentTypes, value.employmentTypes),
    minimumBaseCompensation: normalizeAmount(value.minimumBaseCompensation),
    currency: includesValue(currencies, value.currency)
      ? value.currency
      : fallback.currency,
    requireCompensationDisclosed:
      typeof value.requireCompensationDisclosed === "boolean"
        ? value.requireCompensationDisclosed
        : fallback.requireCompensationDisclosed,
    requireVerifiedEmployer:
      typeof value.requireVerifiedEmployer === "boolean"
        ? value.requireVerifiedEmployer
        : fallback.requireVerifiedEmployer,
  };
}

/**
 * Total on purpose. Every record stored before messaging existed reads back with
 * a usable policy, so no backfill is needed.
 */
export function normalizeInboundPolicy(value: unknown): InboundPolicy {
  if (!isRecord(value)) return defaultInboundPolicy();
  const openTo = uniqueMembers(outreachKinds, value.openTo);
  return {
    version: 1,
    openTo: Array.isArray(value.openTo) ? openTo : [...outreachKinds],
    requireVerifiedIdentity:
      typeof value.requireVerifiedIdentity === "boolean"
        ? value.requireVerifiedIdentity
        : true,
    recruiting: normalizeRecruitingTerms(value.recruiting),
  };
}

function trimmed(value: unknown, limit: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text ? text.slice(0, limit) : undefined;
}

export function normalizeOutreachHeader(value: unknown): OutreachHeader | null {
  if (!isRecord(value) || !includesValue(outreachKinds, value.kind)) return null;
  const baseCompensation = normalizeCompensationRange(value.baseCompensation);
  return {
    kind: value.kind,
    role: trimmed(value.role, MAX_OUTREACH_ROLE_LENGTH),
    organization: trimmed(
      value.organization,
      MAX_OUTREACH_ORGANIZATION_LENGTH,
    ),
    industry: includesValue(industries, value.industry)
      ? value.industry
      : undefined,
    location: includesValue(outreachLocations, value.location)
      ? value.location
      : undefined,
    employmentType: includesValue(employmentTypes, value.employmentType)
      ? value.employmentType
      : undefined,
    baseCompensation: baseCompensation ?? undefined,
  };
}

/** The lane a conversation opens into once its header has cleared the terms. */
export function laneForOutreach(header: OutreachHeader): InboxLane {
  return isRecruitingKind(header.kind) ? "opportunities" : "requests";
}

/**
 * Everything a sender still has to declare. Non-recruiting outreach only needs
 * its kind: a pay band on a request for advice would be noise.
 */
export function missingOutreachFields(
  header: OutreachHeader,
  policy: InboundPolicy,
): readonly OutreachField[] {
  if (!isRecruitingKind(header.kind)) return [];
  const terms = policy.recruiting;
  const missing: OutreachField[] = [];
  if (!header.role) missing.push("role");
  if (!header.organization) missing.push("organization");
  if (!header.industry) missing.push("industry");
  if (!header.location) missing.push("location");
  if (!header.employmentType) missing.push("employmentType");
  const compensationMatters =
    terms.requireCompensationDisclosed ||
    terms.minimumBaseCompensation !== undefined;
  if (compensationMatters && !header.baseCompensation) {
    missing.push("baseCompensation");
  }
  return missing;
}

/**
 * The gate. Pure, so the composer can run it as the sender types and the API can
 * run the identical check before anything is written.
 *
 * Refusals that no amount of typing could fix are reported on their own, rather
 * than asking someone to fill in six fields that were never going to be read.
 */
export function outreachDecision(
  sender: SenderStanding,
  header: OutreachHeader | null,
  policy: InboundPolicy,
): OutreachDecision {
  if (sender.blocked) return { kind: "refused", reasons: [{ code: "blocked" }] };
  // A reply is consent. Terms only ever apply to cold first contact.
  if (sender.hasRepliedHistory) return { kind: "allowed", lane: "primary" };
  if (!header) return { kind: "header-required", missing: ["kind"] };

  const terms = policy.recruiting;
  const recruiting = isRecruitingKind(header.kind);
  const hard: OutreachRefusal[] = [];

  if (policy.requireVerifiedIdentity && !sender.identityVerified) {
    hard.push({ code: "identity-unverified" });
  }
  if (!policy.openTo.includes(header.kind)) {
    hard.push({ code: "closed-to-kind", kind: header.kind });
  }
  if (recruiting && !terms.accepting) hard.push({ code: "recruiting-closed" });
  if (recruiting && terms.requireVerifiedEmployer) {
    const claimed = header.organization ?? "";
    const proven =
      sender.employmentVerified &&
      sender.organization !== undefined &&
      claimed !== "" &&
      sender.organization.toLowerCase() === claimed.toLowerCase();
    if (!proven) hard.push({ code: "employer-unverified", organization: claimed });
  }
  if (hard.length) return { kind: "refused", reasons: hard };

  const missing = missingOutreachFields(header, policy);
  if (missing.length) return { kind: "header-required", missing };

  const reasons: OutreachRefusal[] = [];
  if (recruiting) {
    // An empty list is not a closed door — it means the member set no term on
    // that dimension, so there is nothing to refuse against.
    if (
      terms.industries.length &&
      (!header.industry || !terms.industries.includes(header.industry))
    ) {
      reasons.push({ code: "industry-not-accepted", accepted: terms.industries });
    }
    if (
      terms.locations.length &&
      (!header.location || !terms.locations.includes(header.location))
    ) {
      reasons.push({ code: "location-not-accepted", accepted: terms.locations });
    }
    if (
      terms.employmentTypes.length &&
      (!header.employmentType ||
        !terms.employmentTypes.includes(header.employmentType))
    ) {
      reasons.push({
        code: "employment-type-not-accepted",
        accepted: terms.employmentTypes,
      });
    }
    // A missing pay band never reaches here: when it matters at all it is a
    // required field, and an absent required field is header-required.
    const floor = terms.minimumBaseCompensation;
    const offered = header.baseCompensation;
    if (floor !== undefined && offered) {
      if (offered.currency !== terms.currency) {
        reasons.push({
          code: "compensation-currency-mismatch",
          expected: terms.currency,
        });
        // The top of the band is what counts. Refusing "$150k–$220k" against a
        // $180k floor would turn a real conversation into a dead end.
      } else if (offered.max < floor) {
        reasons.push({
          code: "below-pay-band",
          minimum: floor,
          currency: terms.currency,
        });
      }
    }
  }

  if (reasons.length) return { kind: "refused", reasons };
  return { kind: "allowed", lane: laneForOutreach(header) };
}

const currencySymbols: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
};

/** 180000 USD reads as "$180k" — the way a pay band is actually spoken. */
export function formatCompensation(amount: number, currency: Currency): string {
  const symbol = currencySymbols[currency];
  if (amount >= 1000 && amount % 1000 === 0) {
    return `${symbol}${amount / 1000}k`;
  }
  return `${symbol}${amount.toLocaleString("en-US")}`;
}

export function formatCompensationRange(range: CompensationRange): string {
  return range.min === range.max
    ? formatCompensation(range.min, range.currency)
    : `${formatCompensation(range.min, range.currency)}–${formatCompensation(range.max, range.currency)}`;
}

function sentenceList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

const fieldLabels: Record<OutreachField, string> = {
  kind: "what you are reaching out about",
  role: "the role",
  organization: "your company",
  industry: "the industry",
  location: "the location",
  employmentType: "the employment type",
  baseCompensation: "the base pay band",
};

export function outreachFieldLabel(field: OutreachField): string {
  return fieldLabels[field];
}

export function missingFieldsMessage(
  missing: readonly OutreachField[],
): string {
  return `Add ${sentenceList(missing.map(outreachFieldLabel))} before sending.`;
}

/**
 * The sentence a refused sender reads. Said plainly and specifically, because a
 * vague refusal just gets retried — the point is that the bar is knowable.
 */
export function refusalMessage(
  refusal: OutreachRefusal,
  recipientName: string,
): string {
  switch (refusal.code) {
    case "blocked":
      return `You cannot message ${recipientName}.`;
    case "identity-unverified":
      return `${recipientName} only accepts messages from members with a verified account. Connect GitHub, Google, X, or Apple in settings.`;
    case "closed-to-kind":
      return `${recipientName} is not open to ${refusal.kind.toLowerCase()} messages.`;
    case "recruiting-closed":
      return `${recipientName} does not accept recruiting outreach.`;
    case "employer-unverified":
      return refusal.organization
        ? `${recipientName} only accepts recruiting outreach from a verified employer, and ${refusal.organization} is not confirmed on your profile yet.`
        : `${recipientName} only accepts recruiting outreach from a verified employer.`;
    case "industry-not-accepted":
      return `${recipientName} accepts recruiting outreach about ${sentenceList(refusal.accepted)}.`;
    case "location-not-accepted":
      return `${recipientName} accepts roles in ${sentenceList(refusal.accepted)}.`;
    case "employment-type-not-accepted":
      return `${recipientName} accepts ${sentenceList(refusal.accepted.map((type) => type.toLowerCase()))} roles.`;
    case "compensation-currency-mismatch":
      return `${recipientName} states their pay band in ${refusal.expected}. Give the base pay band in ${refusal.expected}.`;
    case "below-pay-band":
      return `${recipientName} accepts roles from ${formatCompensation(refusal.minimum, refusal.currency)} base.`;
  }
}

/**
 * The terms in one sentence, for the member setting them and the stranger
 * reading them. Publishing the bar is what makes meeting it possible.
 */
export function recruitingTermsSummary(
  terms: RecruitingTerms,
  name: string,
): string {
  if (!terms.accepting) return `${name} does not accept recruiting outreach.`;
  const clauses: string[] = [];
  clauses.push(
    terms.industries.length
      ? `about ${sentenceList(terms.industries)}`
      : "about any industry",
  );
  if (terms.employmentTypes.length) {
    clauses.push(
      `for ${sentenceList(terms.employmentTypes.map((type) => type.toLowerCase()))} roles`,
    );
  }
  if (terms.minimumBaseCompensation !== undefined) {
    clauses.push(
      `from ${formatCompensation(terms.minimumBaseCompensation, terms.currency)} base`,
    );
  }
  if (terms.locations.length) {
    clauses.push(`in ${sentenceList(terms.locations)}`);
  }
  return `Recruiters may reach ${name} ${clauses.join(", ")}.`;
}
