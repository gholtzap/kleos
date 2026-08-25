import { normalizeGithubAccount } from "./github.js";
import {
  MAX_CERTIFICATION_ENTRIES,
  MAX_EDUCATION_ENTRIES,
  MAX_EXPERIENCE_ENTRIES,
  MAX_EXPERIENCE_HIGHLIGHTS,
  MAX_OTHER_EXPERIENCE_ENTRIES,
  newEntryId,
} from "./profile-sections.js";
import type { ResumeLine } from "./resume-lines.js";
import type {
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  OtherExperienceEntry,
} from "./types.js";

/**
 * Everything one resume states, mapped onto Kleos profile shapes. Parsing is
 * deterministic: the same PDF always produces the same import, and every value
 * comes from the resume text — nothing is inferred or generated.
 *
 * `githubUsername` is a suggestion only. GitHub handles on Kleos profiles are
 * proven through a verified connection, never typed, so the import flow uses
 * it to prompt a GitHub connection rather than writing it to the record.
 */
export interface ResumeImport {
  name: string;
  role: string;
  location: string;
  summary: string;
  website?: string;
  githubUsername?: string;
  email?: string;
  expertise: string[];
  interests: string[];
  experience: ExperienceEntry[];
  /** Education whose dates the resume omits keeps empty year strings, for the
   * review step to fill before the record can be saved. */
  education: EducationEntry[];
  certifications: CertificationEntry[];
  otherExperience: OtherExperienceEntry[];
}

const MAX_LIST_VALUES = 50;

/**
 * True when parsing found none of a resume's substance — the text was not
 * there (a scanned image, an empty file) or not shaped like a resume. The
 * import screen reports that instead of opening an empty review.
 */
export function resumeImportIsEmpty(imported: ResumeImport): boolean {
  return (
    imported.experience.length === 0 &&
    imported.education.length === 0 &&
    imported.expertise.length === 0 &&
    imported.certifications.length === 0 &&
    imported.otherExperience.length === 0 &&
    imported.summary.length === 0 &&
    imported.role.length === 0
  );
}

type SectionKind =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "interests"
  | "contact"
  | "other"
  | "ignored";

const SECTION_KINDS: Record<string, SectionKind> = {
  SUMMARY: "summary",
  "PROFESSIONAL SUMMARY": "summary",
  "CAREER SUMMARY": "summary",
  "EXECUTIVE SUMMARY": "summary",
  OBJECTIVE: "summary",
  "CAREER OBJECTIVE": "summary",
  PROFILE: "summary",
  "PROFESSIONAL PROFILE": "summary",
  ABOUT: "summary",
  "ABOUT ME": "summary",
  EXPERIENCE: "experience",
  "WORK EXPERIENCE": "experience",
  "PROFESSIONAL EXPERIENCE": "experience",
  "RELEVANT EXPERIENCE": "experience",
  "INDUSTRY EXPERIENCE": "experience",
  "INTERNSHIP EXPERIENCE": "experience",
  EMPLOYMENT: "experience",
  "EMPLOYMENT HISTORY": "experience",
  "WORK HISTORY": "experience",
  EDUCATION: "education",
  SKILLS: "skills",
  "TECHNICAL SKILLS": "skills",
  "SKILLS & TOOLS": "skills",
  "CORE COMPETENCIES": "skills",
  TECHNOLOGIES: "skills",
  "TOOLS & TECHNOLOGIES": "skills",
  LANGUAGES: "skills",
  "PROGRAMMING LANGUAGES": "skills",
  FRAMEWORKS: "skills",
  "FRAMEWORKS & LIBRARIES": "skills",
  TOOLS: "skills",
  "TOOLS & PLATFORMS": "skills",
  DATABASES: "skills",
  PROJECTS: "projects",
  "PERSONAL PROJECTS": "projects",
  "SELECTED PROJECTS": "projects",
  "TECHNICAL PROJECTS": "projects",
  "NOTABLE PROJECTS": "projects",
  CERTIFICATIONS: "certifications",
  CERTIFICATES: "certifications",
  "LICENSES & CERTIFICATIONS": "certifications",
  "CERTIFICATIONS & LICENSES": "certifications",
  AWARDS: "other",
  HONORS: "other",
  "HONORS & AWARDS": "other",
  "AWARDS & HONORS": "other",
  LEADERSHIP: "other",
  "LEADERSHIP EXPERIENCE": "other",
  "VOLUNTEER EXPERIENCE": "other",
  VOLUNTEERING: "other",
  ACTIVITIES: "other",
  "EXTRACURRICULAR ACTIVITIES": "other",
  PUBLICATIONS: "other",
  RESEARCH: "other",
  INTERESTS: "interests",
  HOBBIES: "interests",
  CONTACT: "contact",
  "CONTACT ME": "contact",
  "CONTACT INFORMATION": "contact",
  "CONTACT DETAILS": "contact",
  REFERENCES: "ignored",
};

/**
 * A word the vocabulary misses but that still names a section, for resumes
 * with their own header phrasing ("Career History", "Technical Expertise").
 * Only header-shaped lines are matched against these.
 */
const SECTION_KEYWORDS: readonly [RegExp, SectionKind][] = [
  [
    /AWARD|HONOR|VOLUNTEER|LEADERSHIP|ACTIVIT|PUBLICATION|INVOLVEMENT/,
    "other",
  ],
  [/EXPERIENCE|EMPLOYMENT|CAREER|WORK HISTORY/, "experience"],
  [/EDUCATION|ACADEMIC/, "education"],
  [/SKILL|COMPETENC|TECHNOLOG|EXPERTISE|TECH STACK/, "skills"],
  [/PROJECT/, "projects"],
  [/CERTIF|LICENS/, "certifications"],
  [/SUMMARY|OBJECTIVE|PROFILE/, "summary"],
  [/CONTACT/, "contact"],
  [/INTEREST|HOBB/, "interests"],
  [/REFERENCE/, "ignored"],
];

function sectionKindForHeader(
  line: ResumeLine,
  bodyHeight: number,
): SectionKind | null {
  const text = line.text.replace(/\t/g, " ").trim().replace(/:$/, "");
  if (text.length === 0 || text.length > 40) return null;
  const key = text
    .toUpperCase()
    .replace(/[^A-Z& ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const known = SECTION_KINDS[key];
  if (known) return known;

  const letters = key.replace(/[^A-Z]/g, "");
  const allCaps =
    letters.length >= 3 &&
    !line.text.includes("\t") &&
    text === text.toUpperCase();
  // A short line in a visibly larger type reads as a heading even in
  // lowercase — but only a section keyword confirms it, so an entry title
  // that happens to be set larger stays content.
  const headerShaped =
    allCaps ||
    (line.height >= bodyHeight * 1.15 &&
      !line.text.includes("\t") &&
      key.split(" ").length <= 4);
  if (!headerShaped) return null;
  const keyword = SECTION_KEYWORDS.find(([pattern]) => pattern.test(key));
  if (keyword) return keyword[1];
  // An unrecognized all-caps phrase still reads as a section heading, and its
  // content lands in "other" rather than corrupting a known section — but
  // only a multi-word one: a lone all-caps word is as likely a technology in
  // a skills list ("SQL", "AWS") as a heading.
  return allCaps && key.split(" ").length >= 2 ? "other" : null;
}

const BULLET_PATTERN = /^\s*[•●○◦▪▸‣∙·*]\s*|^\s*[–—-]\s+/;

function isBulletLine(text: string): boolean {
  return BULLET_PATTERN.test(text);
}

function stripBullet(text: string): string {
  return text.replace(BULLET_PATTERN, "").trim();
}

// --- Dates -----------------------------------------------------------------

const MONTH_NUMBERS: Record<string, number> = {
  JAN: 1, JANUARY: 1, FEB: 2, FEBRUARY: 2, MAR: 3, MARCH: 3,
  APR: 4, APRIL: 4, MAY: 5, JUN: 6, JUNE: 6, JUL: 7, JULY: 7,
  AUG: 8, AUGUST: 8, SEP: 9, SEPT: 9, SEPTEMBER: 9,
  OCT: 10, OCTOBER: 10, NOV: 11, NOVEMBER: 11, DEC: 12, DECEMBER: 12,
};

const MONTH_WORD =
  "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";

const monthYearPattern = new RegExp(
  `\\b(${MONTH_WORD})\\.?,?\\s+((?:19|20)\\d{2})\\b`,
  "gi",
);
/** "May '24" — the apostrophe year some designed resumes use. */
const monthShortYearPattern = new RegExp(
  `\\b(${MONTH_WORD})\\.?,?\\s+['’](\\d{2})\\b`,
  "gi",
);
/** Seasons anchor to a representative month, stated in SEASON_MONTHS. */
const SEASON_MONTHS: Record<string, number> = {
  SPRING: 3,
  SUMMER: 6,
  FALL: 9,
  AUTUMN: 9,
  WINTER: 12,
};
const seasonYearPattern =
  /\b(Spring|Summer|Fall|Autumn|Winter)\s+((?:19|20)\d{2})\b/gi;
const numericMonthPattern = /\b(0?[1-9]|1[0-2])\s*\/\s*((?:19|20)\d{2})\b/g;
const yearPattern = /\b(?:19|20)\d{2}\b/g;
const presentPattern = /\b(?:present|current|now|ongoing|today)\b/i;

interface ResumeDate {
  year: number;
  month?: number;
  index: number;
  length: number;
}

function datesInText(text: string): ResumeDate[] {
  const dates: ResumeDate[] = [];
  for (const match of text.matchAll(monthYearPattern)) {
    dates.push({
      year: Number(match[2]),
      month: MONTH_NUMBERS[(match[1] ?? "").toUpperCase().replace(/\./g, "")],
      index: match.index,
      length: match[0].length,
    });
  }
  for (const match of text.matchAll(monthShortYearPattern)) {
    dates.push({
      year: 2000 + Number(match[2]),
      month: MONTH_NUMBERS[(match[1] ?? "").toUpperCase().replace(/\./g, "")],
      index: match.index,
      length: match[0].length,
    });
  }
  for (const match of text.matchAll(seasonYearPattern)) {
    dates.push({
      year: Number(match[2]),
      month: SEASON_MONTHS[(match[1] ?? "").toUpperCase()],
      index: match.index,
      length: match[0].length,
    });
  }
  for (const match of text.matchAll(numericMonthPattern)) {
    const claimed = dates.some(
      (date) =>
        match.index >= date.index && match.index < date.index + date.length,
    );
    if (claimed) continue;
    dates.push({
      year: Number(match[2]),
      month: Number(match[1]),
      index: match.index,
      length: match[0].length,
    });
  }
  for (const match of text.matchAll(yearPattern)) {
    const claimed = dates.some(
      (date) =>
        match.index >= date.index && match.index < date.index + date.length,
    );
    if (!claimed) {
      dates.push({
        year: Number(match[0]),
        index: match.index,
        length: match[0].length,
      });
    }
  }
  return dates.sort((left, right) => left.index - right.index);
}

interface DateRange {
  start: ResumeDate;
  /** Undefined when the range runs to the present. */
  end?: ResumeDate;
  /** The span of text the range occupies, for stripping from headers. */
  index: number;
  length: number;
}

/**
 * The date range a header line states. A single date with no "Present" marker
 * still forms a range — a one-month engagement states itself that way.
 */
function dateRangeInText(text: string): DateRange | null {
  const [start, second] = datesInText(text);
  if (start === undefined) return null;
  const present = presentPattern.exec(text);
  const toPresent = present !== null && present.index > start.index;
  const end = toPresent ? undefined : second ?? start;
  const lastIndex = toPresent
    ? present.index + present[0].length
    : end !== undefined
      ? end.index + end.length
      : start.index + start.length;
  return { start, end, index: start.index, length: lastIndex - start.index };
}

/** True when the text states a full range: two dates, or a date to present. */
function statesFullRange(text: string): boolean {
  const [first, second] = datesInText(text);
  if (first === undefined) return false;
  if (second !== undefined) return true;
  const present = presentPattern.exec(text);
  return present !== null && present.index > first.index;
}

/**
 * Whether a right-column segment reads as an entry's dates: a full range, or
 * a single month and year — the way a one-month engagement is written. A bare
 * year alone is not enough; too much other text states years.
 */
function statesDateColumn(text: string): boolean {
  if (statesFullRange(text)) return true;
  const dates = datesInText(text);
  return dates.length === 1 && dates[0]?.month !== undefined;
}

function pad(month: number): string {
  return String(month).padStart(2, "0");
}

function monthValue(date: ResumeDate, fallbackMonth: number): string {
  return `${date.year}-${pad(date.month ?? fallbackMonth)}`;
}

function withoutRange(text: string, range: DateRange): string {
  return (
    text.slice(0, range.index) + text.slice(range.index + range.length)
  );
}

// --- Shared text helpers ---------------------------------------------------

/** Splits on commas that sit outside parentheses. */
function splitTopLevel(text: string, separators: RegExp): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const character of text) {
    if (character === "(") depth += 1;
    if (character === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && separators.test(character)) {
      parts.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

function cleanJoin(segments: readonly string[]): string {
  return segments
    .join(" ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;|·–—-]+|[\s,;|·–—-]+$/g, "")
    .trim();
}

function dedupeList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (trimmed.length === 0 || trimmed.length > 200 || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length === MAX_LIST_VALUES) break;
  }
  return result;
}

const locationPattern = /^(?:Remote|Hybrid)\b|^[A-Z][A-Za-z .'’-]*,\s*[A-Za-z]/;

function isLocationText(text: string): boolean {
  return (
    text.length > 0 &&
    text.length <= 40 &&
    !/\d/.test(text) &&
    locationPattern.test(text)
  );
}

// --- Contact block ---------------------------------------------------------

const emailPattern = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const phonePattern = /(?:\+?\d[\d ().-]{7,}\d)/;
const githubPattern = /github\.com\/([A-Za-z\d-]+)/i;
const linkedinPattern = /linkedin\.com/i;

/**
 * Recognized site suffixes for bare domains like `example.dev`. An allowlist
 * keeps abbreviations such as "U.S." or "D.C." from reading as websites.
 */
const WEBSITE_SUFFIXES = new Set([
  "com", "org", "net", "io", "dev", "app", "me", "ai", "co", "xyz",
  "sh", "tech", "site", "page", "info", "build", "bio", "gg", "fyi",
  "so", "us", "ca", "uk", "in", "de", "fr", "es", "nl", "au",
]);

const urlPattern =
  /\b(?:https?:\/\/)?(?:[A-Za-z\d-]+\.)+([A-Za-z]{2,})(?:\/[^\s|,;)]*)?/g;

/** Non-global twin of `urlPattern`: `test` on a global regex tracks state. */
const urlProbePattern =
  /\b(?:https?:\/\/)?(?:[A-Za-z\d-]+\.)+[A-Za-z]{2,}(?:\/[^\s|,;)]*)?/;

function websiteFromText(rawText: string): string | undefined {
  // An email's domain reads as a URL; take emails out before scanning.
  const text = rawText.replace(new RegExp(emailPattern, "g"), " ");
  for (const match of text.matchAll(urlPattern)) {
    const candidate = match[0].replace(/[.,;]$/, "");
    if (githubPattern.test(candidate) || linkedinPattern.test(candidate)) {
      continue;
    }
    if (emailPattern.test(candidate)) continue;
    const suffix = (match[1] ?? "").toLowerCase();
    if (!candidate.startsWith("http") && !WEBSITE_SUFFIXES.has(suffix)) {
      continue;
    }
    return candidate.startsWith("http") ? candidate : `https://${candidate}`;
  }
  return undefined;
}

interface ContactDetails {
  name: string;
  role: string;
  location: string;
  summary: string;
  website?: string;
  githubUsername?: string;
  email?: string;
}

function contactFromIntro(lines: readonly ResumeLine[]): ContactDetails {
  const details: ContactDetails = {
    name: "",
    role: "",
    location: "",
    summary: "",
  };
  if (lines.length === 0) return details;

  const tallest = lines.reduce((best, line) =>
    line.height > best.height ? line : best,
  );
  details.name = tallest.text.replace(/\t/g, " ").trim().slice(0, 200);

  const summaryParts: string[] = [];
  for (const line of lines) {
    if (line === tallest) continue;
    const text = line.text.replace(/\t/g, " | ").trim();

    details.email ??= emailPattern.exec(text)?.[0];
    const github = githubPattern.exec(text)?.[1];
    if (github !== undefined) {
      details.githubUsername ??= normalizeGithubAccount(github) ?? undefined;
    }
    details.website ??= websiteFromText(text);

    const segments = splitTopLevel(text, /[|•·]/);
    const contactish = segments.some(
      (segment) =>
        emailPattern.test(segment) ||
        phonePattern.test(segment) ||
        urlProbePattern.test(segment),
    );
    if (contactish || segments.length > 1) {
      const location = segments.find(
        (segment) =>
          !emailPattern.test(segment) &&
          !phonePattern.test(segment) &&
          segment.includes(",") &&
          !/[@\d]/.test(segment),
      );
      if (location !== undefined && details.location === "") {
        details.location = location.slice(0, 300);
      }
      continue;
    }
    // A lone line near the name: a headline when short, summary prose when long.
    if (text.length <= 80 && details.role === "") {
      details.role = text.slice(0, 300);
    } else if (text.length > 80) {
      summaryParts.push(text);
    }
  }
  details.summary = summaryParts.join(" ").slice(0, 5_000);
  return details;
}

/**
 * Reads a CONTACT section — usually a sidebar — for the identity signals the
 * intro would otherwise carry. Locations here often stand alone on a line.
 */
function contactSignalsFromLines(lines: readonly ResumeLine[]): {
  email?: string;
  githubUsername?: string;
  website?: string;
  location?: string;
} {
  const signals: {
    email?: string;
    githubUsername?: string;
    website?: string;
    location?: string;
  } = {};
  for (const line of lines) {
    const text = line.text.replace(/\t/g, " | ").trim();
    signals.email ??= emailPattern.exec(text)?.[0];
    const github = githubPattern.exec(text)?.[1];
    if (github !== undefined) {
      signals.githubUsername ??= normalizeGithubAccount(github) ?? undefined;
    }
    signals.website ??= websiteFromText(text);
    if (signals.location === undefined) {
      const location = splitTopLevel(text, /[|•·]/).find(
        (segment) =>
          !emailPattern.test(segment) &&
          !phonePattern.test(segment) &&
          isLocationText(segment),
      );
      if (location !== undefined) signals.location = location.slice(0, 300);
    }
  }
  return signals;
}

// --- Experience ------------------------------------------------------------

const titleSignal =
  /\b(?:engineer(?:ing)?|developer|intern(?:ship)?|manager|analyst|scientist|designer|consultant|director|founder|co-founder|researcher|architect|administrator|specialist|coordinator|president|officer|head|lead|chief|vp|cto|ceo|coo|assistant|associate|fellow|instructor|teacher|professor|tutor|advisor|strategist|recruiter|accountant|attorney|counsel|nurse|technician)\b/i;

const orgSignal =
  /\b(?:llc|inc|corp(?:oration)?|company|ltd|plc|gmbh|university|college|institute|school|academy|technologies|labs?|group|consulting|solutions|systems|studios?|agency|bank|capital|partners|ventures|foundation|hospital|clinic)\b|\.(?:com|io|ai|org|net|dev|co)\b/i;

/** Whether a line can serve as the second header line of an entry. */
function headerish(line: ResumeLine): boolean {
  return line.text.includes("\t") || line.text.length <= 80;
}

interface EntryHeader {
  title: string;
  organization: string;
  location?: string;
  /** Line indices the header consumed. */
  consumed: number[];
}

/**
 * Pulls a location out of a header line's column segments, returning the
 * remaining text and the location it found.
 */
function splitHeaderSegments(text: string): {
  body: string;
  location?: string;
} {
  const segments = text.split("\t");
  // "Company, Inc." fits the City-ST shape; the organization signal keeps it
  // in the body.
  const location = segments
    .filter(
      (segment) => isLocationText(segment) && !orgSignal.test(segment),
    )
    .at(-1);
  const body = cleanJoin(segments.filter((segment) => segment !== location));
  return { body, location };
}

function headerForAnchor(
  lines: readonly ResumeLine[],
  anchor: number,
  nextAnchor: number,
  previousEnd: number,
  isAnchor: (index: number) => boolean,
): EntryHeader {
  const anchorLine = lines[anchor];
  if (anchorLine === undefined) {
    return { title: "", organization: "", consumed: [anchor] };
  }
  const anchorSegments = anchorLine.text.split("\t");
  const range = dateRangeInText(anchorSegments.at(-1) ?? "");
  const anchorRest = range
    ? [
        ...anchorSegments.slice(0, -1),
        withoutRange(anchorSegments.at(-1) ?? "", range),
      ].join("\t")
    : anchorLine.text;
  const anchorParts = splitHeaderSegments(anchorRest);

  if (anchorParts.body.length === 0) {
    return headerAboveDateLine(
      lines,
      anchor,
      previousEnd,
      isAnchor,
      anchorParts.location,
    );
  }

  let partner: { index: number; line: ResumeLine } | null = null;
  const belowLine = lines[anchor + 1];
  if (
    anchor + 1 < nextAnchor &&
    belowLine !== undefined &&
    !isBulletLine(belowLine.text) &&
    !isAnchor(anchor + 1) &&
    headerish(belowLine)
  ) {
    partner = { index: anchor + 1, line: belowLine };
  } else {
    const aboveLine = lines[anchor - 1];
    if (
      anchor - 1 > previousEnd &&
      aboveLine !== undefined &&
      !isBulletLine(aboveLine.text) &&
      !isAnchor(anchor - 1) &&
      (aboveLine.text.includes("\t") ||
        (aboveLine.text.length <= 80 &&
          (orgSignal.test(aboveLine.text) ||
            titleSignal.test(aboveLine.text))))
    ) {
      partner = { index: anchor - 1, line: aboveLine };
    }
  }

  if (partner === null) {
    // Single-line header: "Title, Organization" or "Title at Organization".
    const body = anchorParts.body;
    const atSplit = /^(.+?)\s+(?:at|@)\s+(.+)$/.exec(body);
    const parts = atSplit
      ? [atSplit[1] ?? "", atSplit[2] ?? ""]
      : splitTopLevel(body, /[,|]/);
    return {
      title: (parts[0] ?? body).slice(0, 200),
      organization: cleanJoin(parts.slice(1)).slice(0, 200),
      location: anchorParts.location,
      consumed: [anchor],
    };
  }

  const partnerParts = splitHeaderSegments(partner.line.text);
  const anchorIsTitle =
    titleSignal.test(anchorParts.body) === titleSignal.test(partnerParts.body)
      ? // Neither or both read as a title: the dated line is the title, the
        // convention of the common single-column resume templates.
        true
      : titleSignal.test(anchorParts.body);
  const [title, organization] = anchorIsTitle
    ? [anchorParts.body, partnerParts.body]
    : [partnerParts.body, anchorParts.body];
  return {
    title: title.slice(0, 200),
    organization: organization.slice(0, 200),
    location: partnerParts.location ?? anchorParts.location,
    consumed: [anchor, partner.index],
  };
}

/**
 * The header for an entry whose anchor line is only a date — a layout that
 * stacks title and organization on their own lines above the dates. Reads up
 * to two such lines; wrapped bullet prose does not qualify, because it runs
 * long or starts mid-sentence in lowercase.
 */
function headerAboveDateLine(
  lines: readonly ResumeLine[],
  anchor: number,
  previousEnd: number,
  isAnchor: (index: number) => boolean,
  location: string | undefined,
): EntryHeader {
  const usable = (index: number): ResumeLine | null => {
    const line = lines[index];
    return line !== undefined &&
      index > previousEnd &&
      !isBulletLine(line.text) &&
      !isAnchor(index) &&
      line.text.replace(/\t/g, " ").length <= 80 &&
      !/^[a-z]/.test(line.text) &&
      !statesFullRange(line.text)
      ? line
      : null;
  };

  const nearer = usable(anchor - 1);
  if (nearer === null) {
    return { title: "", organization: "", location, consumed: [anchor] };
  }
  const nearerParts = splitHeaderSegments(nearer.text);
  const farther = usable(anchor - 2);

  if (farther === null) {
    // One header line: "Title, Organization", "Title at Organization", or an
    // organization with its location.
    const atSplit = /^(.+?)\s+(?:at|@)\s+(.+)$/.exec(nearerParts.body);
    const [first = nearerParts.body, tail = ""] = atSplit
      ? [atSplit[1], atSplit[2]]
      : nearerParts.body.split(/,\s*(.+)/, 2);
    let title = first.trim();
    let organization = tail.trim();
    let headerLocation = nearerParts.location ?? location;
    if (isLocationText(organization) && !orgSignal.test(organization)) {
      headerLocation ??= organization;
      organization = "";
      if (!titleSignal.test(title) && orgSignal.test(title)) {
        organization = title;
        title = "";
      }
    }
    return {
      title: title.slice(0, 200),
      organization: organization.slice(0, 200),
      location: headerLocation,
      consumed: [anchor, anchor - 1],
    };
  }

  const fartherParts = splitHeaderSegments(farther.text);
  // The upper line is the title unless the signals say otherwise — stacked
  // headers usually lead with it.
  const fartherIsTitle =
    titleSignal.test(fartherParts.body) === titleSignal.test(nearerParts.body)
      ? true
      : titleSignal.test(fartherParts.body);
  const [title, organization] = fartherIsTitle
    ? [fartherParts.body, nearerParts.body]
    : [nearerParts.body, fartherParts.body];
  return {
    title: title.slice(0, 200),
    organization: organization.slice(0, 200),
    location: nearerParts.location ?? fartherParts.location ?? location,
    consumed: [anchor, anchor - 1, anchor - 2],
  };
}

/**
 * Collects bullet lines into highlights. A non-bullet line continues the
 * previous highlight — it is a wrapped line of the same sentence — and prose
 * without any bullet becomes a single description highlight.
 */
function highlightsFromLines(lines: readonly ResumeLine[]): string[] {
  const highlights: string[] = [];
  for (const line of lines) {
    const text = line.text.replace(/\t/g, " ").trim();
    if (text.length === 0) continue;
    const open = highlights.length - 1;
    if (isBulletLine(line.text) || open < 0) {
      highlights.push(stripBullet(text));
    } else {
      highlights[open] += ` ${text}`;
    }
  }
  return highlights
    .map((highlight) => highlight.replace(/\s+/g, " ").trim().slice(0, 500))
    .filter((highlight) => highlight.length > 0)
    .slice(0, MAX_EXPERIENCE_HIGHLIGHTS);
}

function experienceFromLines(
  lines: readonly ResumeLine[],
): ExperienceEntry[] {
  const anchorFlags = lines.map((line) => {
    if (isBulletLine(line.text)) return false;
    const segments = line.text.split("\t");
    if (segments.length > 1) {
      return statesDateColumn(segments.at(-1) ?? "");
    }
    const range = dateRangeInText(line.text);
    if (range === null) return false;
    // A line that is nothing but its dates anchors an entry whose header
    // stands above it.
    const rest = withoutRange(line.text, range).trim();
    if (rest.length <= 2) {
      return statesFullRange(line.text) || range.start.month !== undefined;
    }
    // Otherwise only a range that closes the line reads as a header.
    return (
      statesFullRange(line.text) &&
      range.index + range.length >= line.text.trimEnd().length - 1
    );
  });
  const anchors = anchorFlags.flatMap((flag, index) => (flag ? [index] : []));

  // Headers first, content second: an entry's bullets run to the start of the
  // next entry's header, which may sit one line above its dated anchor.
  const headers: (EntryHeader & { range: DateRange })[] = [];
  let previousEnd = -1;
  for (const [position, anchor] of anchors.entries()) {
    const nextAnchor = anchors[position + 1] ?? lines.length;
    const header = headerForAnchor(
      lines,
      anchor,
      nextAnchor,
      previousEnd,
      (index) => anchorFlags[index] === true,
    );
    const range = dateRangeInText(
      lines[anchor]?.text.split("\t").at(-1) ?? "",
    );
    if (range !== null) headers.push({ ...header, range });
    previousEnd = Math.max(anchor, ...header.consumed);
  }

  const entries: ExperienceEntry[] = [];
  for (const [position, header] of headers.entries()) {
    const contentStart = Math.max(...header.consumed) + 1;
    const next = headers[position + 1];
    const contentEnd = next ? Math.min(...next.consumed) : lines.length;
    const title = header.title.trim();
    const organization = header.organization.trim();
    if (title.length === 0 && organization.length === 0) continue;
    entries.push({
      id: newEntryId(),
      title: title || organization,
      organization: title.length === 0 ? "—" : organization || "—",
      location: header.location,
      start: monthValue(header.range.start, 1),
      end:
        header.range.end === undefined
          ? undefined
          : monthValue(header.range.end, 12),
      highlights: highlightsFromLines(lines.slice(contentStart, contentEnd)),
    });
  }
  return entries.slice(0, MAX_EXPERIENCE_ENTRIES);
}

// --- Education -------------------------------------------------------------

const schoolSignal =
  /\b(?:university|college|institute|school|polytechnic|academy)\b/i;
const degreeSignal =
  /\b(?:b\.?\s?s\.?c?|b\.?\s?a\.?|b\.?\s?e\.?|b\.?\s?tech|m\.?\s?s\.?c?|m\.?\s?a\.?|m\.?\s?eng|m\.?\s?tech|mba|ph\.?\s?d|bachelor(?:'?s)?|master(?:'?s)?|doctor(?:ate)?|associate(?:'?s)?|a\.?\s?s\.?|a\.?\s?a\.?)\b/i;
const educationDetailPattern =
  /^(?:GPA|Grade|Relevant Coursework|Coursework|Honors|Dean|Thesis|Minor)\b/i;
const listPrefixPattern = /^(Activities|Interests|Hobbies)\s*[:：]\s*/i;

function educationFromLines(lines: readonly ResumeLine[]): {
  entries: EducationEntry[];
  interests: string[];
} {
  const interests: string[] = [];
  const blocks: ResumeLine[][] = [];
  for (const line of lines) {
    const text = line.text.replace(/\t/g, " ").trim();
    const listPrefix = listPrefixPattern.exec(text);
    if (listPrefix) {
      interests.push(
        ...splitTopLevel(text.slice(listPrefix[0].length), /[,;•|]/),
      );
      continue;
    }
    const startsEntry =
      !isBulletLine(line.text) &&
      !educationDetailPattern.test(text) &&
      (schoolSignal.test(text) || degreeSignal.test(text));
    if (startsEntry || blocks.length === 0) blocks.push([line]);
    else blocks.at(-1)?.push(line);
  }

  const entries: EducationEntry[] = [];
  for (const block of blocks) {
    const segments = block.flatMap((line) =>
      line.text
        .split("\t")
        .flatMap((segment) => splitTopLevel(segment, /[,|]/)),
    );
    const school = segments.find((segment) => schoolSignal.test(segment));
    const degreeSegments = segments.filter(
      (segment) =>
        segment !== school &&
        degreeSignal.test(segment) &&
        !educationDetailPattern.test(segment),
    );
    if (school === undefined && degreeSegments.length === 0) continue;

    const text = block.map((line) => line.text).join("\n");
    const dates = datesInText(text);
    const startYear = dates[0]?.year;
    const endYear =
      startYear === undefined
        ? undefined
        : Math.max(startYear, dates[1]?.year ?? startYear);
    entries.push({
      id: newEntryId(),
      school: (
        school ?? cleanJoin([block[0]?.text.split("\t")[0] ?? ""])
      ).slice(0, 200),
      degree: cleanJoin(degreeSegments).slice(0, 200) || "—",
      // A missing year stays empty for the review step to fill; the record
      // cannot be saved with it, and inventing an enrollment year would put
      // words in the member's mouth.
      start: startYear === undefined ? "" : String(startYear),
      end: endYear === undefined ? undefined : String(endYear),
    });
  }
  return {
    entries: entries.slice(0, MAX_EDUCATION_ENTRIES),
    interests,
  };
}

// --- Skills ----------------------------------------------------------------

/**
 * A category label some resumes set on its own line above the list it names.
 * Alone on a line it carries no skill, so it is dropped rather than imported
 * as one.
 */
const skillCategoryPattern =
  /^(?:programming |technical |computer |soft |core )?(?:languages?|frameworks?|libraries|tools?|technologies|databases?|cloud|platforms?|skills?|other|miscellaneous|devops|testing|design|frontend|backend|infrastructure)$/i;

function skillsFromLines(lines: readonly ResumeLine[]): string[] {
  const values: string[] = [];
  for (const line of lines) {
    const text = stripBullet(line.text);
    const tabSegments = text.split("\t");
    let content: string;
    if (tabSegments.length > 1) {
      content = tabSegments.slice(1).join(" ");
    } else {
      const colon = text.indexOf(":");
      content = colon > 0 && colon <= 30 ? text.slice(colon + 1) : text;
    }
    values.push(
      ...splitTopLevel(content, /[,;•|]/).filter(
        (value) => !skillCategoryPattern.test(value),
      ),
    );
  }
  return values;
}

// --- Projects and other entries --------------------------------------------

const linkMarkerPattern = /\[(?:GitHub|Site|Demo|Link|Live|Code|Paper|App)\]/gi;

interface LooseEntry {
  header: string;
  meta: string;
  periodText: string;
  content: ResumeLine[];
}

/**
 * Groups a loosely structured section — projects, awards, leadership — into
 * entries. A new entry starts at a non-bullet line that has column structure,
 * or at any non-bullet line that does not continue an open bullet.
 */
function looseEntriesFromLines(lines: readonly ResumeLine[]): LooseEntry[] {
  const entries: LooseEntry[] = [];
  let bulletOpen = false;
  for (const line of lines) {
    const bullet = isBulletLine(line.text);
    const startsEntry =
      !bullet && (line.text.includes("\t") || !bulletOpen);
    if (!startsEntry && entries.length === 0) continue;
    if (startsEntry) {
      const segments = line.text.split("\t");
      const range = dateRangeInText(line.text);
      const meta = segments.length > 1 ? segments.at(-1) ?? "" : "";
      const header = cleanJoin([
        (range && segments.length === 1
          ? withoutRange(line.text, range)
          : segments.slice(0, -1).join(" ") || segments[0] || ""
        ).replace(linkMarkerPattern, ""),
      ]);
      entries.push({
        header,
        meta: dateRangeInText(meta) ? "" : meta,
        periodText: range
          ? line.text.slice(range.index, range.index + range.length)
          : "",
        content: [],
      });
      bulletOpen = false;
    } else {
      entries.at(-1)?.content.push(line);
      bulletOpen = true;
    }
  }
  return entries;
}

function detailFromContent(content: readonly ResumeLine[]): string | undefined {
  const highlights = highlightsFromLines(content);
  let detail = "";
  for (const highlight of highlights) {
    const joined = detail.length === 0 ? highlight : `${detail} · ${highlight}`;
    if (joined.length > 500) break;
    detail = joined;
  }
  if (detail.length === 0) {
    detail = (highlights[0] ?? "").slice(0, 500);
  }
  return detail.length > 0 ? detail : undefined;
}

function otherExperienceFromLines(
  lines: readonly ResumeLine[],
): OtherExperienceEntry[] {
  return looseEntriesFromLines(lines)
    .filter((entry) => entry.header.length > 0)
    .map((entry) => ({
      id: newEntryId(),
      title: entry.header.slice(0, 200),
      detail: detailFromContent(entry.content),
      period: (entry.periodText || entry.meta || "—").slice(0, 100),
    }))
    .slice(0, MAX_OTHER_EXPERIENCE_ENTRIES);
}

// --- Certifications --------------------------------------------------------

function certificationsFromLines(
  lines: readonly ResumeLine[],
): CertificationEntry[] {
  const entries: CertificationEntry[] = [];
  for (const line of lines) {
    const text = stripBullet(line.text).replace(/\t/g, "  ");
    const dates = datesInText(text);
    const firstDate = dates[0];
    if (firstDate === undefined) continue;
    const issued = firstDate.year;
    const expires = /\b(?:expires?|valid (?:through|until))\b/i.test(text)
      ? dates.at(-1)?.year
      : dates[1]?.year;
    let remainder = text;
    for (const date of [...dates].reverse()) {
      remainder =
        remainder.slice(0, date.index) +
        remainder.slice(date.index + date.length);
    }
    remainder = remainder
      .replace(monthYearPattern, "")
      .replace(/\b(?:issued|expires?|valid (?:through|until))\b:?/gi, "");
    const parts = splitTopLevel(remainder, /[,|]/).flatMap((part) =>
      part.split(/\s+[–—-]\s+/),
    );
    const cleaned = parts
      .map((part) => cleanJoin([part]))
      .filter((part) => part.length > 0);
    const name = cleaned[0];
    if (name === undefined) continue;
    entries.push({
      id: newEntryId(),
      name: name.slice(0, 200),
      issuer: cleanJoin(cleaned.slice(1)).slice(0, 200) || "—",
      issued: String(issued),
      expires:
        expires !== undefined && expires > issued ? String(expires) : undefined,
    });
  }
  return entries.slice(0, MAX_CERTIFICATION_ENTRIES);
}

// --- Assembly --------------------------------------------------------------

interface Section {
  kind: SectionKind;
  lines: ResumeLine[];
}

function splitSections(lines: readonly ResumeLine[]): {
  intro: ResumeLine[];
  sections: Section[];
} {
  const heights = lines.map((line) => line.height).sort((a, b) => a - b);
  const bodyHeight = heights[Math.floor(heights.length / 2)] ?? 0;
  const intro: ResumeLine[] = [];
  const sections: Section[] = [];
  for (const line of lines) {
    const kind = sectionKindForHeader(line, bodyHeight);
    if (kind !== null) {
      sections.push({ kind, lines: [] });
    } else if (sections.length === 0) {
      intro.push(line);
    } else {
      sections.at(-1)?.lines.push(line);
    }
  }
  return { intro, sections };
}

/**
 * Parses the reconstructed lines of a resume into profile data. Built for the
 * single-column, clearly sectioned layouts that applicant tracking systems
 * read best; anything it cannot place is dropped rather than guessed at.
 */
export function parseResumeLines(lines: readonly ResumeLine[]): ResumeImport {
  const { intro, sections } = splitSections(lines);
  const contact = contactFromIntro(intro);

  const imported: ResumeImport = {
    name: contact.name,
    role: contact.role,
    location: contact.location,
    summary: contact.summary,
    website: contact.website,
    githubUsername: contact.githubUsername,
    email: contact.email,
    expertise: [],
    interests: [],
    experience: [],
    education: [],
    certifications: [],
    otherExperience: [],
  };

  const skills: string[] = [];
  const interests: string[] = [];
  const summaryParts = imported.summary.length > 0 ? [imported.summary] : [];

  for (const section of sections) {
    if (section.kind === "summary") {
      summaryParts.push(
        section.lines
          .map((line) => line.text.replace(/\t/g, " ").trim())
          .join(" "),
      );
    } else if (section.kind === "experience") {
      imported.experience.push(...experienceFromLines(section.lines));
    } else if (section.kind === "education") {
      const education = educationFromLines(section.lines);
      imported.education.push(...education.entries);
      interests.push(...education.interests);
    } else if (section.kind === "skills") {
      skills.push(...skillsFromLines(section.lines));
    } else if (section.kind === "projects" || section.kind === "other") {
      imported.otherExperience.push(
        ...otherExperienceFromLines(section.lines),
      );
    } else if (section.kind === "certifications") {
      imported.certifications.push(
        ...certificationsFromLines(section.lines),
      );
    } else if (section.kind === "interests") {
      interests.push(
        ...section.lines.flatMap((line) =>
          splitTopLevel(stripBullet(line.text).replace(/\t/g, " "), /[,;•|]/),
        ),
      );
    } else if (section.kind === "contact") {
      const signals = contactSignalsFromLines(section.lines);
      imported.email ??= signals.email;
      imported.githubUsername ??= signals.githubUsername;
      imported.website ??= signals.website;
      if (imported.location.length === 0 && signals.location !== undefined) {
        imported.location = signals.location;
      }
    }
  }

  imported.summary = summaryParts.join(" ").replace(/\s+/g, " ").trim().slice(0, 5_000);
  imported.expertise = dedupeList(skills);
  imported.interests = dedupeList(interests);
  imported.experience = imported.experience.slice(0, MAX_EXPERIENCE_ENTRIES);
  imported.education = imported.education.slice(0, MAX_EDUCATION_ENTRIES);
  imported.certifications = imported.certifications.slice(
    0,
    MAX_CERTIFICATION_ENTRIES,
  );
  imported.otherExperience = imported.otherExperience.slice(
    0,
    MAX_OTHER_EXPERIENCE_ENTRIES,
  );
  return imported;
}
