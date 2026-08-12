import {
  featuredProjectId,
  MAX_PROJECT_DESCRIPTION_LENGTH,
  MAX_PROJECT_TOPICS,
  normalizeGithubAccount,
  validGithubRepoName,
} from "./github.js";
import { ownershipLevels } from "./types.js";
import type {
  Claim,
  ClaimState,
  Evidence,
  EvidenceAccess,
  EvidenceReviewStatus,
  EvidenceType,
  FeaturedProject,
  KleosRecord,
  Ownership,
  Person,
  Privacy,
  Profession,
} from "./types.js";

const professions: readonly Profession[] = [
  "Engineering",
  "Product",
  "Design",
  "Sales",
  "Recruiting",
  "Operations",
  "Management",
];
const privacyLevels: readonly Privacy[] = ["Public", "Restricted", "Private"];
const evidenceTypes: readonly EvidenceType[] = [
  "Artifact",
  "System record",
  "Organization",
  "Outcome",
];
const evidenceAccessLevels: readonly EvidenceAccess[] = ["Private", "Public"];
const evidenceReviewStatuses: readonly EvidenceReviewStatus[] = [
  "Not submitted",
  "Pending",
  "Confirmed",
  "Rejected",
];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

export function includesValue<T extends string>(
  values: readonly T[],
  value: unknown,
): value is T {
  return typeof value === "string" && values.some((item) => item === value);
}

export function isOwnership(value: unknown): value is Ownership {
  return includesValue(ownershipLevels, value);
}

export function normalizePerson(value: unknown): Person | null {
  if (
    !(
      isRecord(value) &&
      typeof value.id === "string" &&
      typeof value.name === "string" &&
      typeof value.initials === "string" &&
      typeof value.role === "string" &&
      typeof value.location === "string" &&
      typeof value.summary === "string" &&
      isOptionalString(value.github) &&
      isStringArray(value.expertise) &&
      isStringArray(value.interests) &&
      isStringArray(value.availability) &&
      isStringArray(value.notOpenTo) &&
      (value.preferredLocations === undefined ||
        isStringArray(value.preferredLocations)) &&
      isOptionalString(value.compensationPreference) &&
      typeof value.identityVerified === "boolean" &&
      typeof value.employmentVerified === "boolean" &&
      typeof value.relationship === "string" &&
      typeof value.accent === "string"
    )
  ) {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    initials: value.initials,
    role: value.role,
    location: value.location,
    summary: value.summary,
    github: value.github,
    expertise: value.expertise,
    interests: value.interests,
    availability: value.availability,
    notOpenTo: value.notOpenTo,
    preferredLocations: value.preferredLocations,
    compensationPreference: value.compensationPreference,
    identityVerified: value.identityVerified,
    employmentVerified: value.employmentVerified,
    relationship: value.relationship,
    accent: value.accent,
  };
}

function isEvidence(value: unknown): value is Evidence {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    includesValue(evidenceTypes, value.type) &&
    isOptionalString(value.sourceUrl) &&
    typeof value.detail === "string" &&
    includesValue(evidenceAccessLevels, value.access) &&
    includesValue(evidenceReviewStatuses, value.reviewStatus) &&
    isOptionalString(value.reviewedBy) &&
    isOptionalString(value.reviewedAt) &&
    isOptionalString(value.reviewNote) &&
    typeof value.updatedAt === "string" &&
    (value.redacted === undefined || typeof value.redacted === "boolean")
  );
}

export function normalizeEvidence(value: unknown): Evidence | null {
  if (!isEvidence(value)) return null;
  return {
    id: value.id,
    title: value.title,
    type: value.type,
    sourceUrl: value.sourceUrl,
    detail: value.detail,
    access: value.access,
    reviewStatus: value.reviewStatus,
    reviewedBy: value.reviewedBy,
    reviewedAt: value.reviewedAt,
    reviewNote: value.reviewNote,
    updatedAt: value.updatedAt,
    redacted: value.redacted,
  };
}

function isFeaturedProject(value: unknown): value is FeaturedProject {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.owner === "string" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    isOptionalString(value.homepage) &&
    isOptionalString(value.language) &&
    isStringArray(value.topics) &&
    typeof value.stars === "number" &&
    typeof value.forks === "number" &&
    typeof value.syncedAt === "string"
  );
}

export function normalizeFeaturedProject(
  value: unknown,
): FeaturedProject | null {
  if (!isFeaturedProject(value)) return null;
  return {
    id: value.id,
    owner: value.owner,
    name: value.name,
    description: value.description,
    homepage: value.homepage,
    language: value.language,
    topics: value.topics,
    stars: value.stars,
    forks: value.forks,
    syncedAt: value.syncedAt,
  };
}

function isClaimCore(value: unknown): value is Omit<Claim, "evidence"> {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.project === "string" &&
    typeof value.organization === "string" &&
    typeof value.organizationHidden === "boolean" &&
    includesValue(professions, value.profession) &&
    isOwnership(value.ownership) &&
    typeof value.contribution === "string" &&
    typeof value.outcome === "string" &&
    typeof value.outcomeContext === "string" &&
    typeof value.period === "string" &&
    includesValue(privacyLevels, value.privacy) &&
    typeof value.featured === "boolean"
  );
}

function normalizeClaim(value: unknown): Claim | null {
  if (!isClaimCore(value)) return null;
  const rawEvidence = (value as Record<string, unknown>).evidence;
  const normalizedEvidence = Array.isArray(rawEvidence)
    ? rawEvidence.map(normalizeEvidence)
    : [];
  if (normalizedEvidence.some((item) => item === null)) return null;
  return {
    id: value.id,
    title: value.title,
    project: value.project,
    organization: value.organization,
    organizationHidden: value.organizationHidden,
    profession: value.profession,
    ownership: value.ownership,
    contribution: value.contribution,
    outcome: value.outcome,
    outcomeContext: value.outcomeContext,
    period: value.period,
    privacy: value.privacy,
    evidence: normalizedEvidence.filter(
      (item): item is Evidence => item !== null,
    ),
    featured: value.featured,
  };
}

export function normalizeKleosRecord(value: unknown): KleosRecord | null {
  if (
    !isRecord(value) ||
    (value.version !== undefined && value.version !== 1) ||
    !Array.isArray(value.claims)
  ) {
    return null;
  }
  const person = normalizePerson(value.person);
  if (!person) return null;
  const claims = value.claims.map(normalizeClaim);
  if (claims.some((claim) => claim === null)) return null;
  const rawProjects = value.projects;
  if (rawProjects !== undefined && !Array.isArray(rawProjects)) return null;
  const projects = Array.isArray(rawProjects)
    ? rawProjects.map(normalizeFeaturedProject)
    : [];
  if (projects.some((project) => project === null)) return null;
  return {
    version: 1,
    revision:
      Number.isInteger(value.revision) &&
      typeof value.revision === "number" &&
      value.revision >= 0
        ? value.revision
        : 0,
    person,
    claims: claims.filter((claim): claim is Claim => claim !== null),
    projects: projects.filter(
      (project): project is FeaturedProject => project !== null,
    ),
  };
}

export function normalizeSubmittedKleosRecord(
  value: unknown,
): KleosRecord | null {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    typeof value.revision !== "number" ||
    !Number.isInteger(value.revision) ||
    value.revision < 0
  ) {
    return null;
  }
  return normalizeKleosRecord(value);
}

export function validEvidenceSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function stringListIsValid(
  values: readonly string[],
  maxItems: number,
  maxLength: number,
): boolean {
  return (
    values.length <= maxItems &&
    values.every(
      (value) => value.trim().length > 0 && value.length <= maxLength,
    )
  );
}

function featuredProjectIsValid(project: FeaturedProject): boolean {
  return (
    project.id === featuredProjectId(project.owner, project.name) &&
    normalizeGithubAccount(project.owner) === project.owner &&
    validGithubRepoName(project.name) &&
    project.description.length <= MAX_PROJECT_DESCRIPTION_LENGTH &&
    (project.homepage === undefined ||
      (project.homepage.length <= 2_000 &&
        validEvidenceSourceUrl(project.homepage))) &&
    (project.language === undefined ||
      (project.language.trim().length > 0 && project.language.length <= 100)) &&
    stringListIsValid(project.topics, MAX_PROJECT_TOPICS, 100) &&
    Number.isSafeInteger(project.stars) &&
    project.stars >= 0 &&
    Number.isSafeInteger(project.forks) &&
    project.forks >= 0 &&
    project.syncedAt.length <= 50 &&
    !Number.isNaN(Date.parse(project.syncedAt))
  );
}

export function kleosRecordContentIsValid(record: KleosRecord): boolean {
  if (record.claims.length > 50) return false;
  if (record.projects.length > 12) return false;
  const github = record.person.github;
  const projectIds = record.projects.map((project) => project.id);
  if (
    new Set(projectIds).size !== projectIds.length ||
    !record.projects.every(
      (project) =>
        featuredProjectIsValid(project) &&
        github !== undefined &&
        project.owner.toLowerCase() === github.toLowerCase(),
    )
  ) {
    return false;
  }
  const person = record.person;
  if (
    person.id.length > 200 ||
    person.name.trim().length === 0 ||
    person.name.length > 200 ||
    person.initials.length > 20 ||
    person.role.length > 300 ||
    person.location.length > 300 ||
    person.summary.length > 5_000 ||
    (person.github !== undefined &&
      normalizeGithubAccount(person.github) !== person.github) ||
    person.relationship.length > 300 ||
    person.accent.length > 100 ||
    !stringListIsValid(person.expertise, 50, 200) ||
    !stringListIsValid(person.interests, 50, 200) ||
    !stringListIsValid(person.availability, 50, 200) ||
    !stringListIsValid(person.notOpenTo, 50, 200) ||
    !stringListIsValid(person.preferredLocations ?? [], 50, 200) ||
    (person.compensationPreference?.length ?? 0) > 500
  ) {
    return false;
  }
  const claimIds = record.claims.map((claim) => claim.id);
  const evidence = evidenceForClaims(record.claims);
  if (
    new Set(claimIds).size !== claimIds.length ||
    new Set(evidence.map((item) => item.id)).size !== evidence.length
  ) {
    return false;
  }
  return record.claims.every(
    (claim) =>
      claim.id.length > 0 &&
      claim.id.length <= 200 &&
      claim.title.trim().length > 0 &&
      claim.title.length <= 300 &&
      claim.project.trim().length > 0 &&
      claim.project.length <= 300 &&
      claim.organization.length <= 300 &&
      claim.contribution.trim().length >= 30 &&
      claim.contribution.length <= 10_000 &&
      claim.outcome.trim().length >= 15 &&
      claim.outcome.length <= 5_000 &&
      claim.outcomeContext.trim().length >= 15 &&
      claim.outcomeContext.length <= 5_000 &&
      claim.period.length <= 200 &&
      claim.evidence.length <= 20 &&
      claim.evidence.every(
        (item) =>
          item.id.length > 0 &&
          item.id.length <= 200 &&
          item.title.trim().length > 0 &&
          item.title.length <= 300 &&
          item.detail.length <= 10_000 &&
          item.updatedAt.length <= 50 &&
          !Number.isNaN(Date.parse(item.updatedAt)) &&
          (item.reviewedAt === undefined ||
            (item.reviewedAt.length <= 50 &&
              !Number.isNaN(Date.parse(item.reviewedAt)))) &&
          (item.reviewedBy?.length ?? 0) <= 300 &&
          (item.reviewNote?.length ?? 0) <= 5_000 &&
          item.reviewNote?.length !== 0 &&
          (item.sourceUrl?.length ?? 0) <= 2_000 &&
          (!item.sourceUrl || validEvidenceSourceUrl(item.sourceUrl)) &&
          Boolean(item.detail.trim() || item.sourceUrl),
      ),
  );
}

export function mergeOwnerKleosRecord(
  existing: KleosRecord | null,
  submitted: KleosRecord,
  ownerId: string,
): KleosRecord {
  const existingClaims = new Map(
    existing?.claims.map((claim) => [claim.id, claim]) ?? [],
  );
  return {
    version: 1,
    revision: existing?.revision ?? submitted.revision,
    person: {
      ...submitted.person,
      id: ownerId,
      identityVerified: existing?.person.identityVerified ?? false,
      employmentVerified: existing?.person.employmentVerified ?? false,
    },
    projects: submitted.projects,
    claims: submitted.claims.map((claim) => {
      const existingClaim = existingClaims.get(claim.id);
      const reviewContextUnchanged =
        existingClaim &&
        claimReviewFingerprint(existingClaim) === claimReviewFingerprint(claim);
      const existingEvidence = new Map(
        existingClaim?.evidence.map((item) => [item.id, item]) ?? [],
      );
      return {
        ...claim,
        evidence: claim.evidence.map((item) => {
          const previous = reviewContextUnchanged
            ? existingEvidence.get(item.id)
            : undefined;
          return mergeOwnerEvidence(previous, item);
        }),
      };
    }),
  };
}

export function mergeOwnerEvidence(
  previous: Evidence | undefined,
  submitted: Evidence,
): Evidence {
  const requested =
    submitted.reviewStatus === "Pending" ? "Pending" : "Not submitted";
  const unchanged =
    previous &&
    evidenceReviewFingerprint(previous) ===
      evidenceReviewFingerprint(submitted);
  if (!unchanged || !previous) {
    return {
      ...submitted,
      reviewStatus: requested,
      reviewedBy: undefined,
      reviewedAt: undefined,
      reviewNote: undefined,
    };
  }
  if (previous.reviewStatus === "Confirmed") {
    return {
      ...submitted,
      reviewStatus: "Confirmed",
      reviewedBy: previous.reviewedBy,
      reviewedAt: previous.reviewedAt,
      reviewNote: previous.reviewNote,
    };
  }
  if (previous.reviewStatus === "Rejected" && requested !== "Pending") {
    return {
      ...submitted,
      reviewStatus: "Rejected",
      reviewedBy: previous.reviewedBy,
      reviewedAt: previous.reviewedAt,
      reviewNote: previous.reviewNote,
    };
  }
  return {
    ...submitted,
    reviewStatus: requested,
    reviewedBy: undefined,
    reviewedAt: undefined,
    reviewNote: undefined,
  };
}

export function claimState(claim: Claim): ClaimState {
  if (claim.evidence.some((item) => item.reviewStatus === "Confirmed")) {
    return "Confirmed";
  }
  if (
    claim.evidence.some(
      (item) =>
        item.reviewStatus === "Not submitted" ||
        item.reviewStatus === "Pending",
    )
  ) {
    return "Supported";
  }
  return "Draft";
}

export function evidenceForClaims(claims: Claim[]): Evidence[] {
  return claims.flatMap((claim) => claim.evidence);
}

function redactOrganization(claim: Claim): Claim {
  return claim.organizationHidden
    ? { ...claim, organization: "Organization confidential" }
    : claim;
}

function publicEvidence(evidence: Evidence): Evidence {
  if (evidence.access === "Public") {
    return {
      ...evidence,
      reviewedBy: evidence.reviewedBy ? "Kleos review team" : undefined,
      reviewNote: undefined,
    };
  }
  return {
    id: evidence.id,
    title: "Private evidence",
    type: "Artifact",
    detail: "",
    access: "Private",
    reviewStatus: evidence.reviewStatus,
    reviewedBy:
      evidence.reviewStatus === "Confirmed" ? "Kleos review team" : undefined,
    reviewedAt: evidence.reviewedAt,
    updatedAt: evidence.updatedAt,
    redacted: true,
  };
}

export function publicKleosRecord(record: KleosRecord): KleosRecord {
  return {
    ...record,
    claims: record.claims
      .filter((claim) => claim.privacy === "Public")
      .map((claim) => {
        const visible = redactOrganization(claim);
        return {
          ...visible,
          evidence: visible.evidence.map(publicEvidence),
        };
      }),
  };
}

export interface DiscoveryProjection {
  publicRecord: KleosRecord;
  searchText: string;
  expertise: string[];
  ownershipLevels: Ownership[];
}

export function discoveryProjection(record: KleosRecord): DiscoveryProjection {
  const publicRecord = publicKleosRecord(record);
  const person = publicRecord.person;
  const claims = publicRecord.claims;
  const searchText = [
    person.name,
    person.role,
    person.location,
    person.summary,
    person.github ?? "",
    ...publicRecord.projects.flatMap((project) => [
      `${project.owner}/${project.name}`,
      project.description,
      project.language ?? "",
      ...project.topics,
    ]),
    ...person.expertise,
    ...person.interests,
    ...person.availability,
    ...claims.flatMap((claim) => [
      claim.title,
      claim.project,
      claim.organization,
      claim.profession,
      claim.ownership,
      claim.contribution,
      claim.outcome,
      claim.outcomeContext,
      claim.period,
      ...claim.evidence.flatMap((evidence) => [
        evidence.title,
        evidence.detail,
      ]),
    ]),
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
  return {
    publicRecord,
    searchText,
    expertise: [
      ...new Set(person.expertise.map((value) => value.toLowerCase())),
    ],
    ownershipLevels: [...new Set(claims.map((claim) => claim.ownership))],
  };
}

export function reviewKleosRecord(
  record: KleosRecord,
  claimIds: readonly string[],
  evidenceIds: readonly string[],
): KleosRecord {
  const selectedClaims = new Set(claimIds);
  const selectedEvidence = new Set(evidenceIds);
  return {
    ...record,
    projects: [],
    person: {
      ...record.person,
      expertise: [],
      interests: [],
      availability: [],
      notOpenTo: [],
      preferredLocations: [],
      compensationPreference: "",
    },
    claims: record.claims
      .filter((claim) => selectedClaims.has(claim.id))
      .map((claim) => {
        const visible = redactOrganization(claim);
        return {
          ...visible,
          evidence: visible.evidence
            .filter((item) => selectedEvidence.has(item.id))
            .map((item) => ({
              ...item,
              reviewedBy: item.reviewedBy ? "Kleos review team" : undefined,
              reviewNote: undefined,
            })),
        };
      }),
  };
}

export function claimReviewFingerprint(claim: Claim): string {
  return JSON.stringify({
    title: claim.title.trim(),
    project: claim.project.trim(),
    organization: claim.organization.trim(),
    ownership: claim.ownership,
    contribution: claim.contribution.trim(),
    outcome: claim.outcome.trim(),
    outcomeContext: claim.outcomeContext.trim(),
    period: claim.period.trim(),
  });
}

export function evidenceReviewFingerprint(evidence: Evidence): string {
  return JSON.stringify({
    title: evidence.title.trim(),
    type: evidence.type,
    sourceUrl: evidence.sourceUrl?.trim() ?? "",
    detail: evidence.detail.trim(),
  });
}

export function applyEvidenceReviewDecision(
  record: KleosRecord,
  claimId: string,
  evidenceId: string,
  decision: "Confirmed" | "Rejected",
  note: string,
  reviewedBy: string,
  reviewedAt: string,
): KleosRecord | null {
  const claim = record.claims.find((item) => item.id === claimId);
  const evidence = claim?.evidence.find((item) => item.id === evidenceId);
  if (!claim || !evidence || evidence.reviewStatus !== "Pending") return null;
  return {
    ...record,
    claims: record.claims.map((item) =>
      item.id !== claimId
        ? item
        : {
            ...item,
            evidence: item.evidence.map((proof) =>
              proof.id !== evidenceId
                ? proof
                : {
                    ...proof,
                    reviewStatus: decision,
                    reviewedBy,
                    reviewedAt,
                    reviewNote: note || undefined,
                    updatedAt: reviewedAt,
                  },
            ),
          },
    ),
  };
}
