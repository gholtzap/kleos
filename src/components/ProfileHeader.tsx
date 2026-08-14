import {
  CameraIcon,
  GithubLogoIcon,
  GlobeSimpleIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import { currentExperience } from "../profile-sections";
import type { KleosRecord } from "../types";
import "./profile-header.css";

const bannerPresets = [
  "graphite",
  "harbor",
  "moss",
  "dusk",
  "ember",
] as const;

export type BannerPreset = (typeof bannerPresets)[number];

export function bannerPresetList(): readonly BannerPreset[] {
  return bannerPresets;
}

export function bannerPreset(accent: string): BannerPreset {
  return bannerPresets.find((preset) => preset === accent) ?? "graphite";
}

function initialsFor(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

interface ProfileHeaderProps {
  record: KleosRecord;
  onEdit?: () => void;
}

export function ProfileHeader({ record, onEdit }: ProfileHeaderProps) {
  const person = record.person;
  const currentRole = currentExperience(record.experience);
  const topEducation = record.education[0];

  return (
    <header className="profile-header">
      <div
        className={`profile-header__banner profile-header__banner--${bannerPreset(person.accent)}`}
      >
        {onEdit ? (
          <button
            aria-label="Edit banner"
            className="profile-header__banner-edit"
            onClick={onEdit}
            type="button"
          >
            <CameraIcon aria-hidden="true" size={15} />
          </button>
        ) : null}
      </div>
      <div aria-hidden="true" className="profile-header__avatar">
        {person.initials || initialsFor(person.name)}
      </div>

      <div className="profile-header__row">
        <div className="profile-header__identity">
          <h1>{person.name}</h1>
          {person.role ? (
            <p className="profile-header__headline">{person.role}</p>
          ) : null}
          {person.location ? (
            <p className="profile-header__location">{person.location}</p>
          ) : null}
          {person.github || person.x || person.website ? (
            <div className="profile-header__links">
              {person.github ? (
                <a
                  aria-label="GitHub"
                  href={`https://github.com/${person.github}`}
                  rel="noreferrer"
                  target="_blank"
                  title={`github.com/${person.github}`}
                >
                  <GithubLogoIcon aria-hidden="true" size={17} />
                </a>
              ) : null}
              {person.x ? (
                <a
                  aria-label="X"
                  href={`https://x.com/${person.x}`}
                  rel="noreferrer"
                  target="_blank"
                  title={`x.com/${person.x}`}
                >
                  <XLogoIcon aria-hidden="true" size={16} />
                </a>
              ) : null}
              {person.website ? (
                <a
                  aria-label="Personal website"
                  href={person.website}
                  rel="noreferrer"
                  target="_blank"
                  title={person.website}
                >
                  <GlobeSimpleIcon aria-hidden="true" size={17} />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="profile-header__side">
          {currentRole ? (
            <div className="profile-header__affiliation">
              <span aria-hidden="true">
                {initialsFor(currentRole.organization)}
              </span>
              <div>
                <strong>{currentRole.organization}</strong>
                <small>{currentRole.title}</small>
              </div>
            </div>
          ) : null}
          {topEducation ? (
            <div className="profile-header__affiliation">
              <span aria-hidden="true">{initialsFor(topEducation.school)}</span>
              <div>
                <strong>{topEducation.school}</strong>
                <small>{topEducation.degree}</small>
              </div>
            </div>
          ) : null}
          {onEdit ? (
            <button
              className="profile-header__edit"
              onClick={onEdit}
              type="button"
            >
              Edit profile
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
