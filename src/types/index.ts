export const ownershipLevels = [
  "Contributor",
  "Major contributor",
  "Lead",
  "Accountable owner",
] as const;

export type Ownership = (typeof ownershipLevels)[number];

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
  handle?: string;
  name: string;
  initials: string;
  role: string;
  location: string;
  summary: string;
  github?: string;
  website?: string;
  x?: string;
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

export interface ExperienceEntry {
  id: string;
  title: string;
  organization: string;
  employmentType?: string;
  location?: string;
  start: string;
  end?: string;
  highlights: string[];
}

export interface EducationEntry {
  id: string;
  school: string;
  degree: string;
  start: string;
  end?: string;
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuer: string;
  issued: string;
  expires?: string;
}

export interface OtherExperienceEntry {
  id: string;
  title: string;
  detail?: string;
  period: string;
}

export interface FeaturedProject {
  id: string;
  owner: string;
  name: string;
  description: string;
  homepage?: string;
  language?: string;
  topics: string[];
  stars: number;
  forks: number;
  syncedAt: string;
}

export interface KleosRecord {
  version: 1;
  revision: number;
  person: Person;
  claims: Claim[];
  projects: FeaturedProject[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
  otherExperience: OtherExperienceEntry[];
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
  record: KleosRecord;
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

export interface PostAuthor {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
}

export interface PostImage {
  id: string;
  kind: "image";
  url: string;
  width: number;
  height: number;
  alt: string;
  animated: boolean;
}

export interface PostVideo {
  id: string;
  kind: "video";
  url: string;
  posterUrl: string;
  width: number;
  height: number;
  durationSeconds: number;
}

export type PostMedia = PostImage | PostVideo;

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  imageUrl?: string;
  siteName?: string;
}

export interface FeedPost {
  id: string;
  author: PostAuthor;
  body: string;
  media: PostMedia[];
  linkPreview?: LinkPreview;
  postedAt: string;
  replyCount: number;
  repostCount: number;
  likeCount: number;
}

export interface NewPostMedia {
  publicId: string;
  kind: "image" | "video";
  alt: string;
}

export interface NewPost {
  body: string;
  media: NewPostMedia[];
}

export interface MediaUploadTicket {
  apiKey: string;
  cloudName: string;
  publicId: string;
  resourceType: "image" | "video";
  signature: string;
  signedParameters: Record<string, string>;
}

export interface AccountIdentity {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
}
