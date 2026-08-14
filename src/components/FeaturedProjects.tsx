import {
  GitForkIcon,
  GithubLogoIcon,
  PushPinIcon,
  StarIcon,
} from "@phosphor-icons/react";
import { githubRepoUrl } from "../github";
import type { FeaturedProject } from "../types";
import "./featured-projects.css";

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
    <article className="featured-projects__card">
      <header>
        <PushPinIcon aria-hidden="true" size={14} />
        <a href={url} rel="noreferrer" target="_blank">
          <span className="featured-projects__owner">{project.owner}/</span>
          {project.name}
        </a>
      </header>
      {project.description ? <p>{project.description}</p> : null}
      {project.topics.length ? (
        <ul className="featured-projects__topics" aria-label="Topics">
          {project.topics.slice(0, 5).map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
      ) : null}
      <footer>
        {project.language ? (
          <span className="featured-projects__language">
            <i aria-hidden="true" />
            {project.language}
          </span>
        ) : null}
        <span aria-label={`${project.stars} stars`}>
          <StarIcon aria-hidden="true" size={14} weight="fill" />
          {formatCount(project.stars)}
        </span>
        <span aria-label={`${project.forks} forks`}>
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
      className="featured-projects"
      aria-labelledby="featured-projects-heading"
    >
      <header className="featured-projects__header">
        <h2 id="featured-projects-heading">Pinned projects</h2>
        {onEdit ? (
          <button onClick={onEdit} type="button">
            <GithubLogoIcon aria-hidden="true" size={18} weight="bold" />
            {projects.length ? "Edit" : "Connect GitHub"}
          </button>
        ) : null}
      </header>

      {projects.length ? (
        <div className="featured-projects__grid">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <p className="featured-projects__empty">
          Show your best work. Connect your GitHub and pin the projects you are
          proud of.
        </p>
      )}
    </section>
  );
}
