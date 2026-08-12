import {
  GitForkIcon,
  GithubLogoIcon,
  PushPinIcon,
  StarIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { appBreakpoints, appColors } from "../app-tokens.stylex";
import { githubRepoUrl } from "../github";
import type { FeaturedProject } from "../types";

const MOBILE = "@media (max-width: 420px)";

interface FeaturedProjectsProps {
  projects: readonly FeaturedProject[];
  onEdit?: () => void;
}

function formatCount(value: number): string {
  return value >= 1_000
    ? `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`
    : String(value);
}

function ProjectCard({ project }: { project: FeaturedProject }) {
  const url = githubRepoUrl(project);
  return (
    <article {...stylex.props(styles.card)}>
      <header {...stylex.props(styles.cardHeader)}>
        <PushPinIcon aria-hidden="true" size={14} />
        <a {...stylex.props(styles.cardLink)} href={url} rel="noreferrer" target="_blank">
          <span {...stylex.props(styles.owner)}>{project.owner}/</span>
          {project.name}
        </a>
      </header>
      {project.description ? <p {...stylex.props(styles.description)}>{project.description}</p> : null}
      {project.topics.length ? (
        <ul {...stylex.props(styles.topics)} aria-label="Topics">
          {project.topics.slice(0, 5).map((topic) => (
            <li {...stylex.props(styles.topic)} key={topic}>{topic}</li>
          ))}
        </ul>
      ) : null}
      <footer {...stylex.props(styles.footer)}>
        {project.language ? (
          <span {...stylex.props(styles.footerItem)}>
            <i {...stylex.props(styles.languageDot)} aria-hidden="true" />
            {project.language}
          </span>
        ) : null}
        <span {...stylex.props(styles.footerItem)} aria-label={`${project.stars} stars`}>
          <StarIcon aria-hidden="true" size={14} weight="fill" />
          {formatCount(project.stars)}
        </span>
        <span {...stylex.props(styles.footerItem)} aria-label={`${project.forks} forks`}>
          <GitForkIcon aria-hidden="true" size={14} />
          {formatCount(project.forks)}
        </span>
      </footer>
    </article>
  );
}

export function FeaturedProjects({ projects, onEdit }: FeaturedProjectsProps) {
  if (!projects.length && !onEdit) return null;

  return (
    <section
      {...stylex.props(styles.root)}
      aria-labelledby="featured-projects-heading"
    >
      <header {...stylex.props(styles.header)}>
        <h2 {...stylex.props(styles.heading)} id="featured-projects-heading">Featured projects</h2>
        {onEdit ? (
          <button {...stylex.props(styles.edit)} onClick={onEdit} type="button">
            <GithubLogoIcon aria-hidden="true" size={18} weight="bold" />
            {projects.length ? "Edit" : "Connect GitHub"}
          </button>
        ) : null}
      </header>

      {projects.length ? (
        <div {...stylex.props(styles.grid)}>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <p {...stylex.props(styles.empty)}>
          Show your best work. Connect your GitHub and pin the projects you are
          proud of.
        </p>
      )}
    </section>
  );
}

const styles = stylex.create({
  root: {
    padding: 16,
    borderBottomColor: appColors.border,
    borderBottomStyle: "solid",
    borderBottomWidth: 1,
  },
  header: {
    display: "flex",
    alignItems: { default: "center", [MOBILE]: "flex-start" },
    justifyContent: "space-between",
    flexDirection: { default: "row", [MOBILE]: "column" },
    gap: { default: 16, [MOBILE]: 12 },
  },
  heading: { margin: 0, fontSize: 20, fontWeight: 800, lineHeight: "24px" },
  edit: {
    display: "inline-flex",
    minHeight: 44,
    paddingInline: 14,
    alignItems: "center",
    gap: 8,
    color: appColors.text,
    backgroundColor: { default: "transparent", ":hover": "rgb(239 243 244 / 10%)" },
    borderColor: "#536471",
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 9999,
    font: "inherit",
    fontWeight: 700,
    cursor: "pointer",
    transitionProperty: "background-color",
    transitionDuration: "160ms",
    transitionTimingFunction: "ease",
    outlineColor: { default: null, ":focus-visible": appColors.blue },
    outlineStyle: { default: null, ":focus-visible": "solid" },
    outlineWidth: { default: null, ":focus-visible": 2 },
    outlineOffset: { default: null, ":focus-visible": 2 },
  },
  empty: { marginBlockStart: 12, marginBlockEnd: 0, color: appColors.muted },
  grid: {
    display: "grid",
    marginTop: 16,
    gridTemplateColumns: { default: "repeat(auto-fill, minmax(255px, 1fr))", [appBreakpoints.mobile]: "1fr" },
    gap: 12,
  },
  card: {
    display: "flex",
    paddingBlock: 14,
    paddingInline: 16,
    flexDirection: "column",
    gap: 10,
    borderColor: appColors.border,
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: { default: "transparent", ":hover": "rgb(239 243 244 / 3%)" },
    transitionProperty: "background-color",
    transitionDuration: "160ms",
    transitionTimingFunction: "ease",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: appColors.muted,
    minWidth: 0,
  },
  cardLink: {
    overflow: "hidden",
    color: appColors.text,
    fontWeight: 700,
    textDecoration: { default: "none", ":hover": "underline" },
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    borderRadius: 4,
    outlineColor: { default: null, ":focus-visible": appColors.blue },
    outlineStyle: { default: null, ":focus-visible": "solid" },
    outlineWidth: { default: null, ":focus-visible": 2 },
    outlineOffset: { default: null, ":focus-visible": 2 },
  },
  owner: { color: appColors.muted, fontWeight: 500 },
  description: {
    display: "-webkit-box",
    overflow: "hidden",
    margin: 0,
    color: appColors.text,
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 3,
  },
  topics: {
    display: "flex",
    padding: 0,
    margin: 0,
    flexWrap: "wrap",
    gap: 6,
    listStyle: "none",
  },
  topic: {
    maxWidth: "100%",
    paddingBlock: 2,
    paddingInline: 10,
    color: appColors.blue,
    backgroundColor: "rgb(29 155 240 / 10%)",
    borderRadius: 9999,
    fontSize: 13,
    lineHeight: "18px",
    overflowWrap: "anywhere",
  },
  footer: {
    display: "flex",
    marginTop: "auto",
    alignItems: "center",
    gap: 16,
    color: appColors.muted,
    fontSize: 13,
    lineHeight: "16px",
  },
  footerItem: { display: "inline-flex", alignItems: "center", gap: 5 },
  languageDot: {
    width: 10,
    height: 10,
    backgroundColor: appColors.blue,
    borderRadius: "50%",
  },
});
