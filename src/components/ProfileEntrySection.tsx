import { PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import {
  compareExperience,
  experiencePeriod,
  yearRange,
} from "../profile-sections";
import type {
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  OtherExperienceEntry,
} from "../types";
import "./profile-entry-section.css";

export interface EntryRow {
  id: string;
  logo: string;
  title: string;
  subtitle?: string;
  meta?: string;
  bullets?: readonly string[];
}

function logoInitials(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function experienceRows(
  entries: readonly ExperienceEntry[],
  now: Date,
): EntryRow[] {
  return [...entries].sort(compareExperience).map((entry) => ({
    id: entry.id,
    logo: logoInitials(entry.organization),
    title: entry.title,
    subtitle: entry.employmentType
      ? `${entry.organization} · ${entry.employmentType}`
      : entry.organization,
    meta: entry.location
      ? `${experiencePeriod(entry, now)} · ${entry.location}`
      : experiencePeriod(entry, now),
    bullets: entry.highlights,
  }));
}

export function educationRows(entries: readonly EducationEntry[]): EntryRow[] {
  return entries.map((entry) => ({
    id: entry.id,
    logo: logoInitials(entry.school),
    title: entry.school,
    subtitle: entry.degree,
    meta: yearRange(entry.start, entry.end),
  }));
}

export function certificationRows(
  entries: readonly CertificationEntry[],
): EntryRow[] {
  return entries.map((entry) => ({
    id: entry.id,
    logo: logoInitials(entry.issuer),
    title: entry.name,
    subtitle: entry.issuer,
    meta:
      entry.expires === undefined
        ? `Issued ${entry.issued}`
        : `Issued ${entry.issued} · Expires ${entry.expires}`,
  }));
}

export function otherExperienceRows(
  entries: readonly OtherExperienceEntry[],
): EntryRow[] {
  return entries.map((entry) => ({
    id: entry.id,
    logo: logoInitials(entry.title),
    title: entry.title,
    subtitle: entry.detail,
    meta: entry.period,
  }));
}

interface ProfileEntrySectionProps {
  title: string;
  addLabel: string;
  rows: readonly EntryRow[];
  compact?: boolean;
  emptyHint?: string;
  onAdd?: () => void;
  onEditRow?: (id: string) => void;
}

export function ProfileEntrySection({
  title,
  addLabel,
  rows,
  compact,
  emptyHint,
  onAdd,
  onEditRow,
}: ProfileEntrySectionProps) {
  if (!rows.length && !onAdd) return null;

  return (
    <section className="profile-entries" aria-label={title}>
      <div className="profile-entries__head">
        <h2>{title}</h2>
        {onAdd ? (
          <button aria-label={addLabel} onClick={onAdd} type="button">
            <PlusIcon aria-hidden="true" size={16} />
          </button>
        ) : null}
      </div>

      {rows.length ? (
        <div
          className={`profile-entries__list${compact ? " profile-entries__list--compact" : ""}`}
        >
          {rows.map((row) => (
            <article className="profile-entries__entry" key={row.id}>
              <span aria-hidden="true" className="profile-entries__logo">
                {row.logo}
              </span>
              <div className="profile-entries__body">
                <h3>{row.title}</h3>
                {row.subtitle ? (
                  <p className="profile-entries__subtitle">{row.subtitle}</p>
                ) : null}
                {row.meta ? (
                  <p className="profile-entries__meta">{row.meta}</p>
                ) : null}
                {row.bullets?.length ? (
                  <ul className="profile-entries__bullets">
                    {row.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {onEditRow ? (
                <button
                  aria-label={`Edit ${row.title}`}
                  className="profile-entries__edit"
                  onClick={() => onEditRow(row.id)}
                  type="button"
                >
                  <PencilSimpleIcon aria-hidden="true" size={15} />
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="profile-entries__empty">{emptyHint}</p>
      )}
    </section>
  );
}
