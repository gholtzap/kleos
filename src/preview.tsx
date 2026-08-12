import "@fontsource-variable/manrope";
import {
  ChatCircleIcon,
  GithubLogoIcon,
  HouseIcon,
  UserIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { createRoot } from "react-dom/client";
import { appSurfaceStyles } from "./app-surface";
import { enableStylexDevelopmentStyles } from "./stylex-dev";
import type { FeaturedProject } from "./types";
import "./global.css";
import { Experience } from "./components/Experience";
import { FeaturedProjects } from "./components/FeaturedProjects";
import { GitHubActivity } from "./components/GithubGraph";
import { SkillsSection } from "./components/SkillsSection";
import {
  SocialHoverCards,
  type SocialHoverCardItem,
} from "./components/SocialHoverCards";

const MOBILE = "@media (max-width: 390px)";

const styles = stylex.create({
  preview: {
    display: "grid",
    minWidth: 0,
    paddingBlock: 32,
    gap: "clamp(64px, 10vw, 144px)",
    gridTemplateColumns: "minmax(0, 1fr)",
  },
  app: { width: "100%" },
  socialPreview: {
    width: "100%",
    paddingBlock: "clamp(28px, 4vw, 58px)",
    paddingInline: "clamp(18px, 5vw, 74px)",
    color: "#e5e5e5",
    backgroundColor: "#080808",
    fontFamily: '"Manrope Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  stage: {
    display: "grid",
    minHeight: { default: 390, [MOBILE]: 300 },
    minWidth: 0,
    placeItems: "center",
  },
  card: { display: "grid", width: 288, padding: 16, gap: 7 },
  messageCard: { width: { default: 320, [MOBILE]: "calc(100vw - 32px)" } },
  compactCard: { width: 256 },
  smallCard: { width: 190 },
  cardHeading: { fontSize: 14, fontWeight: 650 },
  cardCopy: { color: "#a0a0a0", fontSize: 13, lineHeight: "18px" },
  form: {
    display: "flex",
    paddingBlock: 6,
    paddingLeft: 12,
    paddingRight: 6,
    marginTop: 6,
    borderColor: "#303030",
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 10,
  },
  input: {
    minWidth: 0,
    flex: 1,
    color: "#e5e5e5",
    backgroundColor: "transparent",
    borderWidth: 0,
    font: "inherit",
    outline: 0,
  },
  button: {
    paddingBlock: 6,
    paddingInline: 10,
    color: "#111",
    backgroundColor: "#e5e5e5",
    borderWidth: 0,
    borderRadius: 7,
    font: "inherit",
    cursor: "pointer",
    outlineColor: { default: null, ":focus-visible": "#fff" },
    outlineStyle: { default: null, ":focus-visible": "solid" },
    outlineWidth: { default: null, ":focus-visible": 2 },
    outlineOffset: { default: null, ":focus-visible": 2 },
  },
});

const socialItems: readonly SocialHoverCardItem[] = [
  {
    value: "github",
    label: "GitHub",
    href: "https://github.com/gholtzap",
    icon: <GithubLogoIcon />,
    content: (
      <div {...stylex.props(styles.card)}>
        <strong {...stylex.props(styles.cardHeading)}>@gholtzap</strong>
        <p {...stylex.props(styles.cardCopy)}>Public projects, experiments, and source code.</p>
        <span {...stylex.props(styles.cardCopy)}>Open GitHub ↗</span>
      </div>
    ),
  },
  {
    value: "message",
    label: "Message",
    icon: <ChatCircleIcon />,
    content: (
      <div {...stylex.props(styles.card, styles.messageCard)}>
        <strong {...stylex.props(styles.cardHeading)}>Send a quick message</strong>
        <p {...stylex.props(styles.cardCopy)}>This form is for the component preview.</p>
        <form {...stylex.props(styles.form)} onSubmit={(event) => event.preventDefault()}>
          <input {...stylex.props(styles.input)} aria-label="Message" placeholder="Write a message..." />
          <button {...stylex.props(styles.button)} type="submit">Send</button>
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
      <div {...stylex.props(styles.card, styles.compactCard)}>
        <strong {...stylex.props(styles.cardHeading)}>Gavin Holtzapple</strong>
        <p {...stylex.props(styles.cardCopy)}>Open the Kleos profile.</p>
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
      <div {...stylex.props(styles.card, styles.smallCard)}>
        <strong {...stylex.props(styles.cardHeading)}>Kleos home</strong>
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

enableStylexDevelopmentStyles();

createRoot(root).render(
  <main {...stylex.props(styles.preview)}>
    <section {...stylex.props(styles.socialPreview)} aria-label="Social hover cards">
      <div {...stylex.props(styles.stage)}>
        <SocialHoverCards defaultValue="message" items={socialItems} />
      </div>
    </section>
    <Experience />
    <SkillsSection />
    <GitHubActivity account="gholtzap" showLegend />
    <div {...stylex.props(appSurfaceStyles.root, styles.app)}>
      <FeaturedProjects projects={featuredProjects} />
    </div>
  </main>,
);
