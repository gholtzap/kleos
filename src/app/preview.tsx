import "@fontsource-variable/manrope";
import {
  ChatCircleIcon,
  GithubLogoIcon,
  HouseIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { createRoot } from "react-dom/client";
import "../styles/app-surface.css";
import { accountConnections } from "../lib/connections";
import { Experience } from "../components/Experience";
import { FeaturedProjects } from "../components/FeaturedProjects";
import { GitHubActivity } from "../components/GithubGraph";
import {
  certificationRows,
  educationRows,
  experienceRows,
  otherExperienceRows,
  ProfileEntrySection,
} from "../components/ProfileEntrySection";
import { ProfileHeader } from "../components/ProfileHeader";
import { SettingsView } from "../components/SettingsView";
import { SkillsSection } from "../components/SkillsSection";
import {
  SocialHoverCards,
  type SocialHoverCardItem,
} from "../components/SocialHoverCards";
import type { KleosRecord } from "../types";
import "../styles/component-preview.css";

const socialItems: readonly SocialHoverCardItem[] = [
  {
    value: "github",
    label: "GitHub",
    href: "https://github.com/gholtzap",
    icon: <GithubLogoIcon />,
    content: (
      <div className="social-cards-preview__card">
        <strong>@gholtzap</strong>
        <p>Public projects, experiments, and source code.</p>
        <span>Open GitHub ↗</span>
      </div>
    ),
  },
  {
    value: "message",
    label: "Message",
    icon: <ChatCircleIcon />,
    content: (
      <div className="social-cards-preview__card social-cards-preview__card--message">
        <strong>Send a quick message</strong>
        <p>This form is for the component preview.</p>
        <form onSubmit={(event) => event.preventDefault()}>
          <input aria-label="Message" placeholder="Write a message..." />
          <button type="submit">Send</button>
        </form>
      </div>
    ),
  },
  {
    value: "profile",
    label: "Profile",
    href: "/p/gavinholtzapple",
    target: "_self",
    icon: <UserIcon />,
    content: (
      <div className="social-cards-preview__card social-cards-preview__card--compact">
        <strong>Gavin Holtzapple</strong>
        <p>Open the Kleos profile.</p>
      </div>
    ),
  },
  {
    value: "home",
    label: "Home",
    href: "/home",
    target: "_self",
    icon: <HouseIcon />,
    content: (
      <div className="social-cards-preview__card social-cards-preview__card--small">
        <strong>Kleos home</strong>
      </div>
    ),
  },
];

const previewRecord: KleosRecord = {
  version: 1,
  revision: 0,
  person: {
    id: "fake-person",
    name: "Fake Person",
    initials: "FP",
    role: "Infrastructure engineer",
    location: "Brooklyn, New York",
    summary: "",
    github: "fakeperson",
    website: "https://example.com",
    x: "fakeperson",
    expertise: [],
    interests: [],
    availability: [],
    notOpenTo: [],
    identityVerified: false,
    employmentVerified: false,
    relationship: "You",
    accent: "harbor",
  },
  claims: [],
  projects: [
    {
      id: "github:fakeperson/pgqueue",
      owner: "fakeperson",
      name: "pgqueue",
      description: "Transactional job queue built on plain Postgres.",
      language: "Rust",
      topics: ["postgres", "queue"],
      stars: 284,
      forks: 19,
      syncedAt: "2026-08-14T00:00:00.000Z",
    },
    {
      id: "github:fakeperson/latency-lab",
      owner: "fakeperson",
      name: "latency-lab",
      description: "Reproducible latency benchmarks for queue systems.",
      language: "TypeScript",
      topics: ["benchmarks"],
      stars: 28,
      forks: 4,
      syncedAt: "2026-08-14T00:00:00.000Z",
    },
  ],
  experience: [
    {
      id: "exp-1",
      title: "Senior infrastructure engineer",
      organization: "Meridian",
      employmentType: "Full-time",
      location: "New York",
      start: "2023-03",
      highlights: [
        "Rewrote the settlement queue from polling to LISTEN/NOTIFY; checkout p99 fell from 2.1s to 800ms.",
        "Own reliability for the ledger tier — 99.99% uptime over the last 12 months.",
      ],
    },
    {
      id: "exp-2",
      title: "Software engineer",
      organization: "Northwind Labs",
      employmentType: "Full-time",
      location: "Remote",
      start: "2021-07",
      end: "2023-02",
      highlights: [
        "Built the internal payments reconciliation service (Go, Postgres).",
      ],
    },
  ],
  education: [
    {
      id: "edu-1",
      school: "Cornell University",
      degree: "BS, Computer Science",
      start: "2017",
      end: "2021",
    },
  ],
  certifications: [
    {
      id: "cert-1",
      name: "CKA: Certified Kubernetes Administrator",
      issuer: "Cloud Native Computing Foundation",
      issued: "2023",
      expires: "2026",
    },
  ],
  otherExperience: [
    {
      id: "other-1",
      title: "Speaker — PGConf NYC",
      detail: '"Queues on plain Postgres"',
      period: "2025",
    },
    {
      id: "other-2",
      title: "1st place, Hack the North",
      detail: "Realtime infrastructure track",
      period: "2020",
    },
  ],
};

function noop() {
  // Preview affordances render without page-level handlers.
}

const previewAccount = {
  id: "user-fakeperson",
  name: "Fake Person",
  handle: "@fakeperson",
};

// One connection of every state: proven by username, proven by email, started
// but unfinished, and absent.
const previewConnections = accountConnections([
  {
    provider: "github",
    username: "fakeperson",
    verification: { status: "verified" },
  },
  {
    provider: "google",
    emailAddress: "fake.person@example.com",
    verification: { status: "verified" },
  },
  {
    provider: "x",
    username: "fakeperson",
    verification: { status: "unverified" },
  },
]);

const previewNow = new Date();

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");

createRoot(root).render(
  <main className="component-preview">
    <section className="social-cards-preview" aria-label="Social hover cards">
      <div className="social-cards-preview__stage">
        <SocialHoverCards defaultValue="message" items={socialItems} />
      </div>
    </section>
    <Experience />
    <SkillsSection />
    <GitHubActivity account="gholtzap" showLegend />
    <section aria-label="Settings page" id="settings">
      <SettingsView
        account={previewAccount}
        canDisconnect={false}
        connections={previewConnections}
        email="fake.person@example.com"
        error=""
        onConnect={noop}
        onDisconnect={noop}
        onSignOut={noop}
        pending={null}
        saving={false}
        statusMessage="Google connected."
      />
    </section>
    <section
      aria-label="Profile page sections"
      className="app-surface component-preview__app"
      id="profile"
    >
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 24px 48px" }}>
        <ProfileHeader record={previewRecord} onEdit={noop} />
        <FeaturedProjects projects={previewRecord.projects} onEdit={noop} />
        <ProfileEntrySection
          addLabel="Add a position"
          onAdd={noop}
          onEditRow={noop}
          rows={experienceRows(previewRecord.experience, previewNow)}
          title="Experience"
        />
        <ProfileEntrySection
          addLabel="Add education"
          onAdd={noop}
          onEditRow={noop}
          rows={educationRows(previewRecord.education)}
          title="Education"
        />
        <ProfileEntrySection
          addLabel="Add a certification"
          compact
          onAdd={noop}
          onEditRow={noop}
          rows={certificationRows(previewRecord.certifications)}
          title="Certifications"
        />
        <ProfileEntrySection
          addLabel="Add other experience"
          compact
          onAdd={noop}
          onEditRow={noop}
          rows={otherExperienceRows(previewRecord.otherExperience)}
          title="Other experience"
        />
      </div>
    </section>
  </main>,
);
