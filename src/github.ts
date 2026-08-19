import type { FeaturedProject } from "./types/index.js";
import {
  sessionAuthorizationHeader,
  type SessionTokenGetter,
} from "./api-client.js";

export const MAX_FEATURED_PROJECTS = 6;
export const MAX_PROJECT_DESCRIPTION_LENGTH = 1_000;
export const MAX_PROJECT_TOPICS = 20;

export function normalizeGithubAccount(account: string): string | null {
  const normalized = account.trim().replace(/^@+/, "");
  return /^(?!-)[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(normalized)
    ? normalized
    : null;
}

export function validGithubRepoName(name: string): boolean {
  return /^[A-Za-z\d_.-]{1,100}$/.test(name) && name !== "." && name !== "..";
}

export function featuredProjectId(owner: string, name: string): string {
  return `github:${owner.toLowerCase()}/${name.toLowerCase()}`;
}

export function githubRepoUrl(
  project: Pick<FeaturedProject, "owner" | "name">,
): string {
  return `https://github.com/${project.owner}/${project.name}`;
}

export interface GithubRepo {
  owner: string;
  name: string;
  description: string;
  homepage?: string;
  language?: string;
  topics: string[];
  stars: number;
  forks: number;
  isFork: boolean;
  isArchived: boolean;
  pushedAt?: string;
}

function countFromValue(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

function trimmedStringFromValue(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function homepageFromValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const homepage = value.trim().slice(0, 2_000);
  try {
    const url = new URL(homepage);
    return url.protocol === "http:" || url.protocol === "https:"
      ? homepage
      : undefined;
  } catch {
    return undefined;
  }
}

function topicsFromValue(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((topic): topic is string => typeof topic === "string")
    .map((topic) => topic.trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, MAX_PROJECT_TOPICS);
}

export function githubRepoFromValue(value: unknown): GithubRepo | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const ownerValue = record.owner;
  if (typeof ownerValue !== "object" || ownerValue === null) return null;
  const owner = (ownerValue as Record<string, unknown>).login;
  const name = record.name;
  if (typeof owner !== "string" || typeof name !== "string") return null;
  if (normalizeGithubAccount(owner) !== owner || !validGithubRepoName(name)) {
    return null;
  }
  const language = trimmedStringFromValue(record.language, 100);
  const pushedAt = trimmedStringFromValue(record.pushed_at, 50);
  return {
    owner,
    name,
    description: trimmedStringFromValue(
      record.description,
      MAX_PROJECT_DESCRIPTION_LENGTH,
    ),
    homepage: homepageFromValue(record.homepage),
    language: language || undefined,
    topics: topicsFromValue(record.topics),
    stars: countFromValue(record.stargazers_count),
    forks: countFromValue(record.forks_count),
    isFork: record.fork === true,
    isArchived: record.archived === true,
    pushedAt: pushedAt && !Number.isNaN(Date.parse(pushedAt)) ? pushedAt : undefined,
  };
}

export async function fetchGithubRepos(
  getToken: SessionTokenGetter,
  signal?: AbortSignal,
): Promise<GithubRepo[]> {
  const response = await fetch("/api/github-repositories", {
    headers: await sessionAuthorizationHeader(getToken),
    signal,
  });
  if (response.status === 409) {
    throw new Error("Reconnect your GitHub account and try again.");
  }
  if (response.status === 429) {
    throw new Error("GitHub rate limit reached. Try again in a few minutes.");
  }
  if (!response.ok) throw new Error("Could not load repositories from GitHub.");
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("GitHub returned an unexpected response.");
  }
  return payload
    .map(githubRepoFromValue)
    .filter((repo): repo is GithubRepo => repo !== null);
}

export function compareReposByProminence(
  left: GithubRepo,
  right: GithubRepo,
): number {
  if (left.stars !== right.stars) return right.stars - left.stars;
  return (right.pushedAt ?? "").localeCompare(left.pushedAt ?? "");
}

/**
 * Restamps pinned projects with current repository data. A pin whose repository
 * is missing from `repos` — deleted, renamed, or made private since it was
 * pinned — keeps its last known values rather than disappearing from the
 * profile.
 */
export function refreshedProjects(
  projects: readonly FeaturedProject[],
  repos: readonly GithubRepo[],
  syncedAt: string,
): FeaturedProject[] {
  const reposById = new Map(
    repos.map((repo) => [featuredProjectId(repo.owner, repo.name), repo]),
  );
  return projects.map((project) => {
    const repo = reposById.get(project.id);
    return repo ? featuredProjectFromRepo(repo, syncedAt) : project;
  });
}

export function featuredProjectFromRepo(
  repo: GithubRepo,
  syncedAt: string,
): FeaturedProject {
  return {
    id: featuredProjectId(repo.owner, repo.name),
    owner: repo.owner,
    name: repo.name,
    description: repo.description,
    homepage: repo.homepage,
    language: repo.language,
    topics: repo.topics,
    stars: repo.stars,
    forks: repo.forks,
    syncedAt,
  };
}
