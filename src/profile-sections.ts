import type {
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  OtherExperienceEntry,
} from "./types.js";

export const MAX_EXPERIENCE_ENTRIES = 30;
export const MAX_EXPERIENCE_HIGHLIGHTS = 8;
export const MAX_EDUCATION_ENTRIES = 10;
export const MAX_CERTIFICATION_ENTRIES = 20;
export const MAX_OTHER_EXPERIENCE_ENTRIES = 20;

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const yearPattern = /^\d{4}$/;

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validEntryId(id: string): boolean {
  return id.trim().length > 0 && id.length <= 200;
}

function validRequiredText(value: string, maxLength: number): boolean {
  return value.trim().length > 0 && value.length <= maxLength;
}

function validOptionalText(
  value: string | undefined,
  maxLength: number,
): boolean {
  return (
    value === undefined || (value.trim().length > 0 && value.length <= maxLength)
  );
}

export function validMonth(value: string): boolean {
  return monthPattern.test(value);
}

export function validYear(value: string): boolean {
  return yearPattern.test(value);
}

export function newEntryId(): string {
  return crypto.randomUUID();
}

export function normalizeExperienceEntry(
  value: unknown,
): ExperienceEntry | null {
  if (
    !(
      isRecord(value) &&
      typeof value.id === "string" &&
      typeof value.title === "string" &&
      typeof value.organization === "string" &&
      isOptionalString(value.employmentType) &&
      isOptionalString(value.location) &&
      typeof value.start === "string" &&
      isOptionalString(value.end) &&
      isStringArray(value.highlights)
    )
  ) {
    return null;
  }
  return {
    id: value.id,
    title: value.title,
    organization: value.organization,
    employmentType: value.employmentType,
    location: value.location,
    start: value.start,
    end: value.end,
    highlights: value.highlights,
  };
}

export function experienceEntryIsValid(entry: ExperienceEntry): boolean {
  return (
    validEntryId(entry.id) &&
    validRequiredText(entry.title, 200) &&
    validRequiredText(entry.organization, 200) &&
    validOptionalText(entry.employmentType, 50) &&
    validOptionalText(entry.location, 200) &&
    validMonth(entry.start) &&
    (entry.end === undefined ||
      (validMonth(entry.end) && entry.end >= entry.start)) &&
    entry.highlights.length <= MAX_EXPERIENCE_HIGHLIGHTS &&
    entry.highlights.every((highlight) => validRequiredText(highlight, 500))
  );
}

export function normalizeEducationEntry(value: unknown): EducationEntry | null {
  if (
    !(
      isRecord(value) &&
      typeof value.id === "string" &&
      typeof value.school === "string" &&
      typeof value.degree === "string" &&
      typeof value.start === "string" &&
      isOptionalString(value.end)
    )
  ) {
    return null;
  }
  return {
    id: value.id,
    school: value.school,
    degree: value.degree,
    start: value.start,
    end: value.end,
  };
}

export function educationEntryIsValid(entry: EducationEntry): boolean {
  return (
    validEntryId(entry.id) &&
    validRequiredText(entry.school, 200) &&
    validRequiredText(entry.degree, 200) &&
    validYear(entry.start) &&
    (entry.end === undefined ||
      (validYear(entry.end) && entry.end >= entry.start))
  );
}

export function normalizeCertificationEntry(
  value: unknown,
): CertificationEntry | null {
  if (
    !(
      isRecord(value) &&
      typeof value.id === "string" &&
      typeof value.name === "string" &&
      typeof value.issuer === "string" &&
      typeof value.issued === "string" &&
      isOptionalString(value.expires)
    )
  ) {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    issuer: value.issuer,
    issued: value.issued,
    expires: value.expires,
  };
}

export function certificationEntryIsValid(entry: CertificationEntry): boolean {
  return (
    validEntryId(entry.id) &&
    validRequiredText(entry.name, 200) &&
    validRequiredText(entry.issuer, 200) &&
    validYear(entry.issued) &&
    (entry.expires === undefined ||
      (validYear(entry.expires) && entry.expires >= entry.issued))
  );
}

export function normalizeOtherExperienceEntry(
  value: unknown,
): OtherExperienceEntry | null {
  if (
    !(
      isRecord(value) &&
      typeof value.id === "string" &&
      typeof value.title === "string" &&
      isOptionalString(value.detail) &&
      typeof value.period === "string"
    )
  ) {
    return null;
  }
  return {
    id: value.id,
    title: value.title,
    detail: value.detail,
    period: value.period,
  };
}

export function otherExperienceEntryIsValid(
  entry: OtherExperienceEntry,
): boolean {
  return (
    validEntryId(entry.id) &&
    validRequiredText(entry.title, 200) &&
    validOptionalText(entry.detail, 500) &&
    validRequiredText(entry.period, 100)
  );
}

export function formatMonth(value: string): string {
  if (!validMonth(value)) return value;
  const [year, month] = value.split("-");
  return `${monthNames[Number(month) - 1]} ${year}`;
}

function monthIndex(value: string): number {
  const [year, month] = value.split("-");
  return Number(year) * 12 + (Number(month) - 1);
}

export function experienceDuration(
  entry: ExperienceEntry,
  now: Date,
): string | null {
  if (!validMonth(entry.start)) return null;
  if (entry.end !== undefined && !validMonth(entry.end)) return null;
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const months =
    monthIndex(entry.end ?? currentMonth) - monthIndex(entry.start) + 1;
  if (months <= 0) return null;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [
    years > 0 ? `${years} yr${years === 1 ? "" : "s"}` : "",
    rest > 0 ? `${rest} mo${rest === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : "1 mo";
}

export function experiencePeriod(entry: ExperienceEntry, now: Date): string {
  const range = `${formatMonth(entry.start)} – ${
    entry.end === undefined ? "Present" : formatMonth(entry.end)
  }`;
  const duration = experienceDuration(entry, now);
  return duration ? `${range} · ${duration}` : range;
}

export function yearRange(start: string, end: string | undefined): string {
  return end === undefined ? `${start} – Present` : `${start} – ${end}`;
}

export function compareExperience(
  left: ExperienceEntry,
  right: ExperienceEntry,
): number {
  const leftEnd = left.end === undefined;
  const rightEnd = right.end === undefined;
  if (leftEnd !== rightEnd) return leftEnd ? -1 : 1;
  if (left.start !== right.start) return left.start < right.start ? 1 : -1;
  return 0;
}

export function currentExperience(
  entries: readonly ExperienceEntry[],
): ExperienceEntry | undefined {
  return [...entries].sort(compareExperience).find((entry) => !entry.end);
}
