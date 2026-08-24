import {
  compareReposByProminence,
  featuredProjectFromRepo,
  MAX_FEATURED_PROJECTS,
  type GithubRepo,
} from "./github.js";
import { initialsFromName } from "./profile-identity.js";
import { currentExperience } from "./profile-sections.js";
import type { ResumeImport } from "./resume-import.js";
import type { FeaturedProject, KleosRecord } from "./types.js";

const MAX_EXPERTISE_VALUES = 50;

function mergedList(
  existing: readonly string[],
  additions: readonly string[],
): string[] {
  const seen = new Set(existing.map((value) => value.toLowerCase()));
  const merged = [...existing];
  for (const addition of additions) {
    const key = addition.toLowerCase();
    if (seen.has(key) || merged.length >= MAX_EXPERTISE_VALUES) continue;
    seen.add(key);
    merged.push(addition);
  }
  return merged;
}

/**
 * Lays a parsed resume over a Kleos record. The resume replaces the sections
 * it states and leaves the rest alone, so importing again replaces the
 * previous import instead of doubling it, and an import that found nothing
 * for a section cannot erase existing work.
 */
export function recordWithResumeImport(
  base: KleosRecord,
  imported: ResumeImport,
): KleosRecord {
  const name = imported.name.trim() || base.person.name;
  const experience = imported.experience.length
    ? imported.experience
    : base.experience;
  const role =
    imported.role.trim() ||
    base.person.role ||
    currentExperience(experience)?.title ||
    "";
  return {
    ...base,
    person: {
      ...base.person,
      name,
      initials: initialsFromName(name),
      role,
      location: imported.location.trim() || base.person.location,
      summary: imported.summary.trim() || base.person.summary,
      website: imported.website ?? base.person.website,
      expertise: imported.expertise.length
        ? imported.expertise
        : base.person.expertise,
      interests: imported.interests.length
        ? imported.interests
        : base.person.interests,
    },
    experience,
    education: imported.education.length ? imported.education : base.education,
    certifications: imported.certifications.length
      ? imported.certifications
      : base.certifications,
    otherExperience: imported.otherExperience.length
      ? imported.otherExperience
      : base.otherExperience,
  };
}

/**
 * The repositories a GitHub import features: the member's most prominent
 * original work, never forks or archives.
 */
export function featuredReposForImport(
  repos: readonly GithubRepo[],
): GithubRepo[] {
  return repos
    .filter((repo) => !repo.isFork && !repo.isArchived)
    .sort(compareReposByProminence)
    .slice(0, MAX_FEATURED_PROJECTS);
}

/**
 * Writes a verified GitHub identity onto a record: the proven username, the
 * featured projects, and the languages of that work folded into expertise.
 * `username` must come from the member's verified connection — the profiles
 * API rejects anything else.
 */
export function recordWithGithubImport(
  base: KleosRecord,
  username: string,
  repos: readonly GithubRepo[],
  syncedAt: string,
): KleosRecord {
  const featured = featuredReposForImport(repos);
  const projects: FeaturedProject[] = featured.map((repo) =>
    featuredProjectFromRepo(repo, syncedAt),
  );
  const languages = [
    ...new Set(
      featured.flatMap((repo) => (repo.language ? [repo.language] : [])),
    ),
  ];
  return {
    ...base,
    person: {
      ...base.person,
      github: username,
      expertise: mergedList(base.person.expertise, languages),
    },
    projects,
  };
}
