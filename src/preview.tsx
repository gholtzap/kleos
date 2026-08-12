import "@fontsource-variable/manrope";
import {
  ChatCircleIcon,
  GithubLogoIcon,
  HouseIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { createRoot } from "react-dom/client";
import type { FeaturedProject } from "./types";
import "./app-surface.css";
import { Experience } from "./components/Experience";
import { FeaturedProjects } from "./components/FeaturedProjects";
import { GitHubActivity } from "./components/GithubGraph";
import { SkillsSection } from "./components/SkillsSection";
import {
  SocialHoverCards,
  type SocialHoverCardItem,
} from "./components/SocialHoverCards";
import "./component-preview.css";

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

const featuredProjects: readonly FeaturedProject[] = [
  {
    id: "gholtzap/kleos",
    owner: "gholtzap",
    name: "kleos",
    description: "Professional profiles built on evidence.",
    language: "TypeScript",
    stars: 18,
    forks: 3,
    topics: ["profiles", "evidence", "react"],
    syncedAt: "2026-08-12T00:00:00.000Z",
  },
];

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
    <div className="app-surface component-preview__app">
      <FeaturedProjects projects={featuredProjects} />
    </div>
  </main>,
);
