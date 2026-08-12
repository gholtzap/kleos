import "@fontsource-variable/manrope";
import {
  ChatCircleIcon,
  GithubLogoIcon,
  HouseIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { createRoot } from "react-dom/client";
import { Experience } from "./components/Experience";
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

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");

createRoot(root).render(
  <main style={{ display: "grid", gap: "clamp(64px, 10vw, 144px)", paddingBlock: "32px" }}>
    <section className="social-cards-preview" aria-label="Social hover cards">
      <div className="social-cards-preview__stage">
        <SocialHoverCards defaultValue="message" items={socialItems} />
      </div>
    </section>
    <Experience />
    <SkillsSection />
    <GitHubActivity account="gholtzap" showLegend />
  </main>,
);
