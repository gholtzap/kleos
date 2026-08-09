export type Ownership =
  | "Contributor"
  | "Major contributor"
  | "Lead"
  | "Accountable owner";

export type Privacy = "Public" | "Restricted" | "Private";

export type Profession =
  | "Engineering"
  | "Product"
  | "Design"
  | "Sales"
  | "Recruiting"
  | "Operations"
  | "Management";

export type ClaimState = "Draft" | "Supported" | "Confirmed";

export type EvidenceType =
  | "Artifact"
  | "System record"
  | "Organization"
  | "Outcome";

export type EvidenceAccess = "Private" | "Public";

export type EvidenceReviewStatus =
  | "Not submitted"
  | "Pending"
  | "Confirmed"
  | "Rejected";

export interface Person {
  id: string;
  name: string;
  initials: string;
  role: string;
  location: string;
  summary: string;
  expertise: string[];
  interests: string[];
  availability: string[];
  notOpenTo: string[];
  preferredLocations?: string[];
  compensationPreference?: string;
  identityVerified: boolean;
  employmentVerified: boolean;
  relationship: string;
  accent: string;
}

export interface Evidence {
  id: string;
  title: string;
  type: EvidenceType;
  sourceUrl?: string;
  detail: string;
  access: EvidenceAccess;
  reviewStatus: EvidenceReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  updatedAt: string;
  redacted?: boolean;
}

export interface Claim {
  id: string;
  title: string;
  project: string;
  organization: string;
  organizationHidden: boolean;
  profession: Profession;
  ownership: Ownership;
  contribution: string;
  outcome: string;
  outcomeContext: string;
  period: string;
  privacy: Privacy;
  evidence: Evidence[];
  featured: boolean;
}

export interface FolioRecord {
  version: 1;
  revision: number;
  person: Person;
  claims: Claim[];
}

export interface ReviewLinkSummary {
  id: string;
  claimIds: string[];
  evidenceIds: string[];
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface CreatedReviewLink extends ReviewLinkSummary {
  token: string;
}

export interface ReviewBundle {
  record: FolioRecord;
  expiresAt: string;
}

export interface EvidenceReviewItem {
  ownerId: string;
  ownerName: string;
  claimId: string;
  claimTitle: string;
  contribution: string;
  outcome: string;
  outcomeContext: string;
  evidence: Evidence;
}

export type RequestKind =
  | "Hiring"
  | "Advice"
  | "Contract"
  | "Collaboration"
  | "Research";

export interface ProfessionalRequest {
  id: string;
  author: Person;
  kind: RequestKind;
  title: string;
  need: string;
  experience: string[];
  commitment: string;
  compensation: string;
  constraints: string;
  preferredEvidence: string;
  postedAt: string;
}

export interface NewProfessionalRequest {
  kind: RequestKind;
  title: string;
  need: string;
  experience: string[];
  commitment: string;
  compensation: string;
  constraints: string;
  preferredEvidence: string;
}

export interface DiscoveryResult {
  person: Person;
  claim: Claim;
}

export interface ResultPage<Item> {
  items: Item[];
  nextCursor?: string;
}
