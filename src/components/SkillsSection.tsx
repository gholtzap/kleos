import { CaretUpDownIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useState } from "react";

const TABLET = "@media (max-width: 720px)";
const MOBILE = "@media (max-width: 420px)";

export interface SkillItem {
  name: string;
  logo: string;
  preserveLogoContrast?: boolean;
}

export interface SkillGroup {
  label: string;
  items: readonly SkillItem[];
}

export const defaultSkillGroups = [
  {
    label: "Language",
    items: [
      { name: "TypeScript", logo: "/skill-logos/typescript.svg" },
      { name: "JavaScript", logo: "/skill-logos/javascript.svg" },
    ],
  },
  {
    label: "Frontend",
    items: [
      { name: "React", logo: "/skill-logos/react.svg" },
      { name: "Next.js", logo: "/skill-logos/nextdotjs.svg" },
      { name: "Tailwind CSS", logo: "/skill-logos/tailwindcss.svg" },
      { name: "shadcn/ui", logo: "/skill-logos/shadcnui.svg" },
      { name: "Motion", logo: "/skill-logos/motion.svg" },
      { name: "Expo", logo: "/skill-logos/expo.svg" },
    ],
  },
  {
    label: "Backend",
    items: [
      { name: "Node.js", logo: "/skill-logos/nodedotjs.svg" },
      { name: "Bun", logo: "/skill-logos/bun.svg" },
      { name: "PostgreSQL", logo: "/skill-logos/postgresql.svg" },
      { name: "Redis", logo: "/skill-logos/redis.svg" },
      { name: "tRPC", logo: "/skill-logos/trpc.svg" },
      { name: "GraphQL", logo: "/skill-logos/graphql.svg" },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { name: "AWS", logo: "/skill-logos/aws.svg" },
      { name: "Vercel", logo: "/skill-logos/vercel.svg" },
      { name: "Cloudflare", logo: "/skill-logos/cloudflare.svg" },
      { name: "Linux", logo: "/skill-logos/linux.svg" },
      { name: "Docker", logo: "/skill-logos/docker.svg" },
    ],
  },
  {
    label: "Workflow",
    items: [
      { name: "Neovim", logo: "/skill-logos/neovim.svg" },
      { name: "Herdr", logo: "/skill-logos/herdr.svg", preserveLogoContrast: true },
      { name: "Codex", logo: "/skill-logos/codex.svg", preserveLogoContrast: true },
      { name: "GitHub", logo: "/skill-logos/github.svg" },
      { name: "Linear", logo: "/skill-logos/linear.svg" },
    ],
  },
  {
    label: "Design",
    items: [
      { name: "Figma", logo: "/skill-logos/figma.svg" },
      { name: "Paper", logo: "/skill-logos/paper.png", preserveLogoContrast: true },
      { name: "Photoshop", logo: "/skill-logos/photoshop.svg", preserveLogoContrast: true },
    ],
  },
] satisfies readonly SkillGroup[];

interface SkillsSectionProps {
  groups?: readonly SkillGroup[];
  initiallyExpanded?: boolean;
}

export function SkillsSection({
  groups = defaultSkillGroups,
  initiallyExpanded = true,
}: SkillsSectionProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  return (
    <section {...stylex.props(styles.root)} aria-label="Skills">
      <details
        open={expanded}
        onToggle={(event) => setExpanded(event.currentTarget.open)}
      >
        <summary {...stylex.props(styles.summary)}>
          <h2 {...stylex.props(styles.heading)}>Skills</h2>
          <span {...stylex.props(styles.control)}>
            <span>{expanded ? "See less" : "See more"}</span>
            <CaretUpDownIcon aria-hidden="true" size={21} weight="bold" />
          </span>
        </summary>

        <dl {...stylex.props(styles.groups)}>
          {groups.map((group) => (
            <div {...stylex.props(styles.group)} key={group.label}>
              <dt {...stylex.props(styles.term)}>{group.label}</dt>
              <dd {...stylex.props(styles.description)}>
                {group.items.map((item) => (
                  <span {...stylex.props(styles.skill)} key={item.name}>
                    <img
                      {...stylex.props(
                        styles.logo,
                        item.preserveLogoContrast && styles.nativeLogo,
                      )}
                      alt=""
                      src={item.logo}
                    />
                    {item.name}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}

const styles = stylex.create({
  root: {
    boxSizing: "border-box",
    width: "100%",
    paddingBlock: "clamp(28px, 4vw, 58px)",
    paddingInline: { default: "clamp(24px, 5vw, 74px)", [MOBILE]: 18 },
    color: "#909090",
    backgroundColor: "#080808",
    fontFamily: '"Manrope Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  summary: {
    boxSizing: "border-box",
    display: "flex",
    minHeight: 44,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    color: { default: "#b8b8b8", ":hover": "#e2e2e2", ":focus-visible": "#e2e2e2" },
    cursor: "pointer",
    listStyle: "none",
    outlineColor: { default: null, ":focus-visible": "#b8b8b8" },
    outlineStyle: { default: null, ":focus-visible": "solid" },
    outlineWidth: { default: null, ":focus-visible": 2 },
    outlineOffset: { default: null, ":focus-visible": 8 },
    "::-webkit-details-marker": { display: "none" },
  },
  heading: {
    boxSizing: "border-box",
    margin: 0,
    color: "#bdbdbd",
    fontSize: "clamp(25px, 2.1vw, 34px)",
    fontWeight: 450,
    letterSpacing: "-0.04em",
  },
  control: {
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: "clamp(16px, 1.45vw, 24px)",
    fontWeight: 600,
  },
  groups: {
    boxSizing: "border-box",
    display: "grid",
    gap: "clamp(30px, 3vw, 48px)",
    marginBlockStart: { default: "clamp(48px, 5vw, 78px)", [MOBILE]: 38 },
    marginBlockEnd: 0,
    marginInline: 0,
  },
  group: {
    boxSizing: "border-box",
    display: "grid",
    gridTemplateColumns: { default: "clamp(150px, 20vw, 270px) minmax(0, 1fr)", [TABLET]: "1fr" },
    alignItems: "start",
    gap: { default: 26, [TABLET]: 14 },
  },
  term: {
    boxSizing: "border-box",
    fontSize: "clamp(17px, 1.45vw, 24px)",
    lineHeight: 1.3,
  },
  description: {
    boxSizing: "border-box",
    display: "flex",
    margin: 0,
    flexWrap: "wrap",
    columnGap: { default: "clamp(24px, 2.8vw, 48px)", [TABLET]: 24 },
    rowGap: { default: 20, [TABLET]: 16 },
  },
  skill: {
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    gap: 11,
    fontSize: "clamp(17px, 1.45vw, 24px)",
    lineHeight: 1.3,
    whiteSpace: "nowrap",
  },
  logo: {
    boxSizing: "border-box",
    width: 27,
    height: 27,
    flex: "0 0 27px",
    filter: "grayscale(1) brightness(0) invert(0.58)",
    objectFit: "contain",
  },
  nativeLogo: { filter: "grayscale(1)", opacity: 0.7 },
});
