import type { Claim, Evidence, Person, ProfessionalRequest } from "./types";

export const currentPerson: Person = {
  id: "mara-voss",
  name: "Mara Voss",
  initials: "MV",
  role: "Staff product engineer",
  location: "Brooklyn, New York",
  summary:
    "I build dependable product systems at the seam between engineering, design, and operations. Most of my work involves clarifying an ambiguous problem, shaping the technical approach, and staying accountable through production.",
  expertise: [
    "Product systems",
    "Platform migrations",
    "Developer experience",
    "Operational tooling",
  ],
  interests: ["Resilient organizations", "Public-interest technology", "Technical leadership"],
  availability: ["Advisory work", "Technical diligence", "Selective collaboration"],
  notOpenTo: ["Agency outreach", "Generic recruiting"],
  preferredLocations: ["New York City", "Remote within the United States"],
  compensationPreference: "$180k–$220k base salary",
  identityVerified: true,
  employmentVerified: true,
  relationship: "You",
  accent: "clay",
};

export const people: Person[] = [
  {
    id: "ineke-okafor",
    name: "Ineke Okafor",
    initials: "IO",
    role: "Design systems lead",
    location: "London, United Kingdom",
    summary:
      "Designs and operationalizes accessible systems for complex public-facing products.",
    expertise: ["Design systems", "Accessibility", "Public services"],
    interests: ["Inclusive infrastructure", "Design education"],
    availability: ["Advisory work", "Speaking"],
    notOpenTo: ["Full-time roles"],
    identityVerified: true,
    employmentVerified: true,
    relationship: "2 mutual collaborators",
    accent: "ochre",
  },
  {
    id: "devin-morales",
    name: "Devin Morales",
    initials: "DM",
    role: "Infrastructure engineering leader",
    location: "Austin, Texas",
    summary:
      "Builds teams and infrastructure for high-volume systems where reliability and cost both matter.",
    expertise: ["SRE", "Cloud cost", "Engineering management"],
    interests: ["Incident learning", "Sustainable on-call"],
    availability: ["Mentoring", "Introductions"],
    notOpenTo: ["Contract work"],
    identityVerified: true,
    employmentVerified: true,
    relationship: "Worked with Soren Vale",
    accent: "blue",
  },
  {
    id: "alina-petrescu",
    name: "Alina Petrescu",
    initials: "AP",
    role: "Enterprise product strategist",
    location: "Toronto, Canada",
    summary:
      "Leads ambiguous B2B product programs from customer research through adoption.",
    expertise: ["Enterprise product", "Research", "Go-to-market"],
    interests: ["Procurement systems", "Design partnerships"],
    availability: ["Advisory work", "Research participation"],
    notOpenTo: ["Unsolicited sales"],
    identityVerified: true,
    employmentVerified: true,
    relationship: "1 mutual collaborator",
    accent: "rose",
  },
  {
    id: "noah-kimura",
    name: "Noah Kimura",
    initials: "NK",
    role: "Revenue operations operator",
    location: "San Francisco, California",
    summary:
      "Repairs revenue systems, forecasting practices, and handoffs for scaling commercial teams.",
    expertise: ["Revenue operations", "Forecasting", "Process redesign"],
    interests: ["Operating cadence", "Commercial systems"],
    availability: ["Fractional roles", "Contract work"],
    notOpenTo: ["Speaking"],
    identityVerified: false,
    employmentVerified: false,
    relationship: "Outside your network",
    accent: "sage",
  },
];

export const initialClaims: Claim[] = [
  {
    id: "claims-platform",
    title: "Rebuilt the claims platform without interrupting customer operations",
    project: "Claims infrastructure migration",
    organization: "Northstar Mutual",
    organizationHidden: false,
    profession: "Engineering",
    ownership: "Accountable owner",
    contribution:
      "Defined the migration path, built the compatibility layer, coordinated the cutover with operations, and owned production readiness across three engineering teams.",
    outcome:
      "Reduced median claim-processing time by 38–44% while retiring the highest-risk legacy service.",
    outcomeContext:
      "Measured across 1.7M annual claims during the first 90 days after full cutover. A range is shown under the organization’s disclosure policy.",
    period: "Jan 2023 — Nov 2023",
    verification: [
      "Supported by evidence",
      "Confirmed by collaborator",
      "System verified",
    ],
    privacy: "Public",
    evidenceIds: ["migration-plan", "deploy-record", "ops-attestation"],
    collaborators: ["Soren Vale", "Priya Nwosu", "Elio March"],
    attestations: [
      {
        id: "attest-soren",
        name: "Soren Vale",
        initials: "SV",
        relationship: "Engineering director; directly managed the program",
        observed: "Technical direction, cross-team coordination, and production cutover",
        confirmsOutcome: true,
        quote:
          "Mara owned the hard middle of this program: translating the target architecture into a migration the business could actually absorb.",
      },
      {
        id: "attest-priya",
        name: "Priya Nwosu",
        initials: "PN",
        relationship: "Operations lead; cross-functional collaborator",
        observed: "Operational planning and the staged rollout",
        confirmsOutcome: true,
        quote:
          "The migration landed without the service interruption our operations teams had expected.",
      },
    ],
    featured: true,
  },
  {
    id: "incident-console",
    title: "Designed and shipped a unified incident operations console",
    project: "Incident response workspace",
    organization: "Northstar Mutual",
    organizationHidden: false,
    profession: "Product",
    ownership: "Lead",
    contribution:
      "Interviewed incident commanders, narrowed the first release to the critical coordination loop, and built the workflow with a product designer and two platform engineers.",
    outcome:
      "Cut time-to-assign during high-severity incidents from 11 minutes to 4.6 minutes.",
    outcomeContext:
      "Median across 47 severity-one and severity-two incidents over two quarters. Exact operational logs are privately verified.",
    period: "Feb 2022 — Oct 2022",
    verification: ["Supported by evidence", "Organization verified"],
    privacy: "Public",
    evidenceIds: ["research-synthesis", "incident-metrics"],
    collaborators: ["Ames Rourke", "Jo Bae"],
    attestations: [],
    featured: true,
  },
  {
    id: "confidential-diligence",
    title: "Identified the principal integration risk in a pre-acquisition review",
    project: "Technical diligence",
    organization: "Confidential fintech client",
    organizationHidden: true,
    profession: "Engineering",
    ownership: "Major contributor",
    contribution:
      "Reviewed the platform boundary, deployment history, and operating model; documented the integration dependency that materially changed the buyer’s transition plan.",
    outcome:
      "The client revised the first-year integration budget and phased the migration.",
    outcomeContext:
      "Outcome verified privately by the engagement partner. Commercial terms and exact figures remain confidential.",
    period: "May 2024",
    verification: ["Confirmed by collaborator", "Independently reviewed"],
    privacy: "Restricted",
    evidenceIds: ["diligence-summary"],
    collaborators: ["Verifier identity not public"],
    attestations: [],
    featured: false,
  },
];

export const initialEvidence: Evidence[] = [
  {
    id: "migration-plan",
    title: "Migration architecture and staged cutover plan",
    type: "Artifact",
    claimIds: ["claims-platform"],
    access: "Reviewers",
    status: "Current",
    reviewedBy: "Folio independent review",
    updated: "Jun 18, 2026",
    detail:
      "Private technical plan showing authorship, decision log, migration stages, and production acceptance criteria.",
  },
  {
    id: "deploy-record",
    title: "Deployment and service ownership records",
    type: "System record",
    claimIds: ["claims-platform"],
    access: "Reviewers",
    status: "Current",
    reviewedBy: "Connected workplace system",
    updated: "Jun 14, 2026",
    detail:
      "Selected metadata confirms sustained participation and ownership during the migration period. Source content is not copied into Folio.",
  },
  {
    id: "ops-attestation",
    title: "Operations cutover confirmation",
    type: "Attestation",
    claimIds: ["claims-platform"],
    access: "Public",
    status: "Current",
    reviewedBy: "Priya Nwosu",
    updated: "Jun 12, 2026",
    detail:
      "Direct collaborator confirms the rollout approach and lack of customer-facing interruption.",
  },
  {
    id: "research-synthesis",
    title: "Incident commander research synthesis",
    type: "Artifact",
    claimIds: ["incident-console"],
    access: "Only me",
    status: "Current",
    reviewedBy: "Not reviewed",
    updated: "May 27, 2026",
    detail:
      "Interview themes, workflow maps, and scope decisions from discovery. Contains internal operational details.",
  },
  {
    id: "incident-metrics",
    title: "Incident assignment metrics",
    type: "Outcome",
    claimIds: ["incident-console"],
    access: "Reviewers",
    status: "Current",
    reviewedBy: "Northstar Mutual",
    updated: "Apr 04, 2026",
    detail:
      "Private metric export confirms the before-and-after assignment time and measurement period.",
  },
  {
    id: "diligence-summary",
    title: "Redacted diligence finding",
    type: "Organization",
    claimIds: ["confidential-diligence"],
    access: "Reviewers",
    status: "Review pending",
    reviewedBy: "Engagement partner",
    updated: "Jul 02, 2026",
    detail:
      "Redacted summary and client-side confirmation. Exact company, architecture, and financial impact remain hidden.",
  },
];

export const discoveryClaims: Record<string, Claim> = {
  "ineke-okafor": {
    id: "civic-system",
    title: "Established an accessible design system used across 14 public services",
    project: "Civic services design system",
    organization: "Civic Form",
    organizationHidden: false,
    profession: "Design",
    ownership: "Accountable owner",
    contribution:
      "Built the accessibility practice, component contribution model, and adoption program across distributed service teams.",
    outcome:
      "Raised audited WCAG conformance and reduced repeated design and front-end work across 14 services.",
    outcomeContext:
      "Adoption confirmed through repository and service records; accessibility audits are public.",
    period: "2023 — 2025",
    verification: ["System verified", "Organization verified"],
    privacy: "Public",
    evidenceIds: [],
    collaborators: ["5 confirmed collaborators"],
    attestations: [],
    featured: true,
  },
  "devin-morales": {
    id: "infra-cost",
    title: "Re-architected event processing while traffic grew 2.8×",
    project: "Event platform reliability",
    organization: "Broadcast Layer",
    organizationHidden: false,
    profession: "Engineering",
    ownership: "Accountable owner",
    contribution:
      "Set the technical strategy, staffed the reliability stream, and led the staged replacement of the costliest processing path.",
    outcome:
      "Held infrastructure spend within 9% while traffic grew 2.8× and availability improved.",
    outcomeContext:
      "Cloud billing and reliability data verified privately for a 12-month period.",
    period: "2022 — 2024",
    verification: ["Supported by evidence", "Confirmed by collaborator"],
    privacy: "Public",
    evidenceIds: [],
    collaborators: ["3 confirmed collaborators"],
    attestations: [],
    featured: true,
  },
  "alina-petrescu": {
    id: "procurement-product",
    title: "Turned procurement research into a new enterprise product line",
    project: "Enterprise controls",
    organization: "Ledger Harbor",
    organizationHidden: false,
    profession: "Product",
    ownership: "Lead",
    contribution:
      "Ran buyer research, shaped the product thesis, aligned legal and engineering constraints, and led the first six design-partner deployments.",
    outcome:
      "The product reached 31% adoption in the target account segment within two quarters.",
    outcomeContext:
      "Cohort and account definition confirmed by product operations.",
    period: "2024 — 2025",
    verification: ["Organization verified", "Confirmed by collaborator"],
    privacy: "Public",
    evidenceIds: [],
    collaborators: ["6 design partners"],
    attestations: [],
    featured: true,
  },
  "noah-kimura": {
    id: "forecast-rebuild",
    title: "Rebuilt forecasting around verifiable stage criteria",
    project: "Commercial operating model",
    organization: "Confidential logistics software company",
    organizationHidden: true,
    profession: "Operations",
    ownership: "Lead",
    contribution:
      "Mapped stage leakage, replaced subjective forecast categories with observable criteria, and retrained sales leadership.",
    outcome:
      "Quarter-end forecast variance narrowed from a 22–29% range to 8–12%.",
    outcomeContext:
      "Privately supported by CRM snapshots across three quarters.",
    period: "2025",
    verification: ["Supported by evidence"],
    privacy: "Restricted",
    evidenceIds: [],
    collaborators: ["Verifier identity private"],
    attestations: [],
    featured: true,
  },
};

export const initialRequests: ProfessionalRequest[] = [
  {
    id: "req-1",
    author: people[2]!,
    kind: "Research",
    title: "Seeking operators who replaced a complex internal approval workflow",
    need:
      "I’m researching how teams move high-stakes approvals out of email without creating a rigid process nobody follows.",
    experience: ["Internal tools", "Regulated workflows", "Change management"],
    commitment: "45-minute conversation during the next three weeks",
    compensation: "$175 research honorarium",
    constraints: "No confidential company details required",
    preferredEvidence:
      "A supported claim showing direct ownership of a workflow redesign",
    posted: "2 days ago",
  },
  {
    id: "req-2",
    author: people[1]!,
    kind: "Hiring",
    title: "Staff engineer for a high-volume reliability program",
    need:
      "Looking for someone who has personally led a staged infrastructure migration while the system remained in production.",
    experience: ["Distributed systems", "Migration ownership", "Incident response"],
    commitment: "Full-time, staff-level individual contributor",
    compensation: "$212k–$246k plus equity",
    constraints: "United States; four hours overlap with Central Time",
    preferredEvidence:
      "System or organization-verified migration and reliability outcomes",
    posted: "5 days ago",
  },
  {
    id: "req-3",
    author: people[0]!,
    kind: "Advice",
    title: "Accessibility review for a public data visualization standard",
    need:
      "I need a practitioner who can pressure-test keyboard, screen-reader, and low-vision guidance before publication.",
    experience: ["Data visualization", "Accessibility standards"],
    commitment: "Two 60-minute review sessions",
    compensation: "£900 fixed fee",
    constraints: "Work can be completed asynchronously across time zones",
    preferredEvidence:
      "Public artifact or confirmed contribution to an accessible data product",
    posted: "1 week ago",
  },
];
