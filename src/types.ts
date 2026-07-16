export type Route = "landing" | "profile" | "vault" | "discover" | "requests";

export type AuthMode = "sign-in" | "sign-up";

export type Ownership =
  | "Contributor"
  | "Major contributor"
  | "Lead"
  | "Accountable owner";

export type Verification =
  | "Self-declared"
  | "Supported by evidence"
  | "Confirmed by collaborator"
  | "System verified"
  | "Organization verified"
  | "Independently reviewed";

export type Privacy = "Public" | "Restricted" | "Private";

export type Profession =
  | "Engineering"
  | "Product"
  | "Design"
  | "Sales"
  | "Recruiting"
  | "Operations"
  | "Management";

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

export interface Attestation {
  id: string;
  name: string;
  initials: string;
  relationship: string;
  observed: string;
  confirmsOutcome: boolean;
  quote: string;
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
  verification: Verification[];
  privacy: Privacy;
  evidenceIds: string[];
  collaborators: string[];
  attestations: Attestation[];
  featured: boolean;
}

export interface Evidence {
  id: string;
  title: string;
  type: "Artifact" | "System record" | "Attestation" | "Organization" | "Outcome";
  claimIds: string[];
  access: "Only me" | "Reviewers" | "Public";
  status: "Current" | "Review pending" | "Withdrawn";
  reviewedBy: string;
  updated: string;
  detail: string;
}

export interface ProfessionalRequest {
  id: string;
  author: Person;
  kind: "Hiring" | "Advice" | "Contract" | "Collaboration" | "Research";
  title: string;
  need: string;
  experience: string[];
  commitment: string;
  compensation: string;
  constraints: string;
  preferredEvidence: string;
  posted: string;
}

export interface IntroductionDraft {
  person: Person;
  reason: string;
  outcome: string;
}
