import type { AccountIdentity } from "./types/profile.js";

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
  /** The terms a stranger has to meet to reach this member. Published, not private. */
  inbound: InboundPolicy;
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

/**
 * A post's author and a conversation's participant are the same thing: the
 * signed-in identity. Kept as an alias so the feed reads in its own vocabulary
 * without a second declaration drifting from the first.
 */
export type PostAuthor = AccountIdentity;

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

/* ----------------------------------------------------------------------------
 * Messaging
 *
 * Inbound is not free: a member publishes terms, and a stranger has to meet
 * them before a conversation can be opened. Every value a term is matched on is
 * a closed set, because refusing a real message over "SF" not equalling "San
 * Francisco" would be worse than the spam the terms exist to stop.
 * ------------------------------------------------------------------------- */

export const outreachKinds = [
  "Hiring",
  "Contract",
  "Advice",
  "Collaboration",
  "Research",
  "Other",
] as const;

export type OutreachKind = (typeof outreachKinds)[number];

export const employmentTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
] as const;

export type EmploymentType = (typeof employmentTypes)[number];

export const currencies = ["USD", "EUR", "GBP", "CAD"] as const;

export type Currency = (typeof currencies)[number];

export const industries = [
  "AI and machine learning",
  "Developer tools",
  "Fintech",
  "Healthcare",
  "Security",
  "Consumer",
  "Enterprise software",
  "E-commerce",
  "Gaming",
  "Climate",
  "Education",
  "Robotics and hardware",
  "Media",
  "Government and defense",
  "Biotech",
] as const;

export type Industry = (typeof industries)[number];

/**
 * "Elsewhere" is deliberate: a recruiter hiring somewhere unlisted can still say
 * so honestly, and it only passes a member who has set no location terms.
 */
export const outreachLocations = [
  "Remote",
  "San Francisco Bay Area",
  "New York",
  "Seattle",
  "Los Angeles",
  "Austin",
  "Boston",
  "Chicago",
  "Denver",
  "Toronto",
  "London",
  "Berlin",
  "Amsterdam",
  "Paris",
  "Tel Aviv",
  "Bangalore",
  "Singapore",
  "Sydney",
  "Elsewhere",
] as const;

export type OutreachLocation = (typeof outreachLocations)[number];

export interface CompensationRange {
  min: number;
  max: number;
  currency: Currency;
}

/**
 * What a recruiter has to clear. Every list is a filter, and an empty list means
 * that dimension is unconstrained — so the terms only ever refuse on something
 * the member actually asked for.
 */
export interface RecruitingTerms {
  accepting: boolean;
  industries: Industry[];
  locations: OutreachLocation[];
  employmentTypes: EmploymentType[];
  minimumBaseCompensation?: number;
  currency: Currency;
  requireCompensationDisclosed: boolean;
  requireVerifiedEmployer: boolean;
}

export interface InboundPolicy {
  version: 1;
  openTo: OutreachKind[];
  requireVerifiedIdentity: boolean;
  recruiting: RecruitingTerms;
}

/** The structured declaration a cold first message has to carry. */
export interface OutreachHeader {
  kind: OutreachKind;
  role?: string;
  organization?: string;
  industry?: Industry;
  location?: OutreachLocation;
  employmentType?: EmploymentType;
  baseCompensation?: CompensationRange;
}

export type InboxLane = "primary" | "requests" | "opportunities" | "archived";

export type MessageDeliveryState = "pending" | "sent" | "failed";

export type MessageKind = "text" | "outreach" | "notice";

export type ConversationNotice = "accepted" | "declined" | "blocked" | "archived";

/**
 * `sequence` is gapless and monotonic within one conversation, and it carries
 * more weight than an id: unread is `sequence > lastReadSequence`, the read
 * receipt is the counterpart's own watermark, and a poll asks for everything
 * after a plain integer. Ordering on it rather than on a clock also means two
 * messages a millisecond apart can never race or tie.
 */
export interface Message {
  id: string;
  conversationId: string;
  sequence: number;
  kind: MessageKind;
  /** Absent only on a notice, which the system writes rather than a member. */
  author?: PostAuthor;
  body: string;
  outreach?: OutreachHeader;
  notice?: ConversationNotice;
  linkPreview?: LinkPreview;
  createdAt: string;
  editedAt?: string;
  /** Local only. Anything the server handed back is already delivered. */
  deliveryState?: MessageDeliveryState;
}

export interface NewMessage {
  /** Minted by the browser, so a retried send cannot post twice. */
  id: string;
  conversationId: string;
  body: string;
}

export interface ConversationSummary {
  id: string;
  counterpart: PostAuthor;
  lane: InboxLane;
  state: ConversationState;
  outreach?: OutreachHeader;
  lastMessage?: Message;
  lastMessageAt: string;
  lastSequence: number;
  lastReadSequence: number;
  unreadCount: number;
  muted: boolean;
}

export type ConversationState = "pending" | "accepted" | "declined" | "blocked";

export interface ConversationDetail {
  summary: ConversationSummary;
  /** How far the other member has read. The read receipt, for free. */
  counterpartReadSequence: number;
}

export interface NewConversation {
  /** Minted by the browser, like NewMessage.id, for the same reason. */
  messageId: string;
  recipientHandle: string;
  outreach: OutreachHeader;
  body: string;
}

export interface InboxUnreadCounts {
  primary: number;
  requests: number;
  opportunities: number;
}

export interface InboxSnapshot {
  conversations: ConversationSummary[];
  unread: InboxUnreadCounts;
}

/** One thread's worth of catch-up, whatever transport fetched it. */
export interface MessageDelta {
  conversationId: string;
  messages: Message[];
  latestSequence: number;
  counterpartReadSequence: number;
}
