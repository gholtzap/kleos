import {
  compareReposByProminence,
  featuredProjectFromRepo,
  MAX_FEATURED_PROJECTS,
  type GithubRepo,
} from "./github.js";
import { initialsFromName } from "./profile-identity.js";
import {
  certificationEntryIsValid,
  currentExperience,
  educationEntryIsValid,
  experienceEntryIsValid,
  MAX_EXPERIENCE_HIGHLIGHTS,
  otherExperienceEntryIsValid,
  validMonth,
  validYear,
} from "./profile-sections.js";
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
function trimmedOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Tidies a review draft for saving: whitespace goes, blank highlight lines and
 * emptied optional fields fall away, and a schemeless website becomes https.
 * Nothing here can reject — what a member must fix is
 * `onboardingDraftProblem`'s job, run after this.
 */
export function normalizeOnboardingDraft(record: KleosRecord): KleosRecord {
  const website = trimmedOptional(record.person.website);
  return {
    ...record,
    person: {
      ...record.person,
      name: record.person.name.trim(),
      initials: initialsFromName(record.person.name),
      role: record.person.role.trim(),
      location: record.person.location.trim(),
      summary: record.person.summary.trim(),
      website:
        website === undefined || /^https?:\/\//i.test(website)
          ? website
          : `https://${website}`,
    },
    experience: record.experience.map((entry) => ({
      ...entry,
      title: entry.title.trim(),
      organization: entry.organization.trim(),
      employmentType: trimmedOptional(entry.employmentType),
      location: trimmedOptional(entry.location),
      highlights: entry.highlights
        .map((highlight) => highlight.trim())
        .filter((highlight) => highlight.length > 0),
    })),
    education: record.education.map((entry) => ({
      ...entry,
      school: entry.school.trim(),
      degree: entry.degree.trim(),
    })),
    certifications: record.certifications.map((entry) => ({
      ...entry,
      name: entry.name.trim(),
      issuer: entry.issuer.trim(),
    })),
    otherExperience: record.otherExperience.map((entry) => ({
      ...entry,
      title: entry.title.trim(),
      detail: trimmedOptional(entry.detail),
      period: entry.period.trim(),
    })),
  };
}

/**
 * The first thing a member must fix before their draft can be saved, or null
 * when nothing blocks it. Messages name the entry, so the member knows where
 * to look. Run on a normalized draft.
 */
export function onboardingDraftProblem(record: KleosRecord): string | null {
  if (record.person.name.length === 0) return "Add your name before saving.";
  if (record.person.website !== undefined) {
    try {
      new URL(record.person.website);
    } catch {
      return "Give your website as a full link, like https://example.com.";
    }
  }
  for (const entry of record.experience) {
    const label = entry.title || entry.organization || "your experience";
    if (entry.title.length === 0) {
      return `Add a title for the position at ${entry.organization || "your experience"}.`;
    }
    if (entry.organization.length === 0) {
      return `Add the organization for ${label}.`;
    }
    if (!validMonth(entry.start)) {
      return `Give ${label} a start like 2024-06.`;
    }
    if (entry.end !== undefined && (!validMonth(entry.end) || entry.end < entry.start)) {
      return `Check the dates for ${label}.`;
    }
    if (entry.highlights.length > MAX_EXPERIENCE_HIGHLIGHTS) {
      return `Keep up to ${MAX_EXPERIENCE_HIGHLIGHTS} highlights for ${label}.`;
    }
    if (!experienceEntryIsValid(entry)) {
      return `Check the details for ${label}.`;
    }
  }
  for (const entry of record.education) {
    const label = entry.school || "your education";
    if (entry.school.length === 0) return "Name the school for your education.";
    if (entry.degree.length === 0) return `Add the degree for ${label}.`;
    if (!validYear(entry.start)) {
      return `Add the starting year for ${label}.`;
    }
    if (entry.end !== undefined && (!validYear(entry.end) || entry.end < entry.start)) {
      return `Check the years for ${label}.`;
    }
    if (!educationEntryIsValid(entry)) return `Check the details for ${label}.`;
  }
  for (const entry of record.certifications) {
    const label = entry.name || "your certification";
    if (entry.name.length === 0) return "Name your certification.";
    if (entry.issuer.length === 0) return `Add the issuer for ${label}.`;
    if (!validYear(entry.issued)) {
      return `Add the year ${label} was issued, like 2024.`;
    }
    if (
      entry.expires !== undefined &&
      (!validYear(entry.expires) || entry.expires < entry.issued)
    ) {
      return `Check the years for ${label}.`;
    }
    if (!certificationEntryIsValid(entry)) {
      return `Check the details for ${label}.`;
    }
  }
  for (const entry of record.otherExperience) {
    const label = entry.title || "your other experience";
    if (entry.title.length === 0) return "Give each other-experience entry a title.";
    if (entry.period.length === 0) {
      return `Add when ${label} happened — a year is enough.`;
    }
    if (!otherExperienceEntryIsValid(entry)) {
      return `Check the details for ${label}.`;
    }
  }
  return null;
}

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
