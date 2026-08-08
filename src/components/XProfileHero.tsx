import { CalendarBlankIcon, LinkIcon } from "@phosphor-icons/react";
import type { XProfileRecord } from "../types/x-profile";
import "./x-profile-hero.css";

interface XProfileHeroProps {
  profile: XProfileRecord;
  onEdit: () => void;
}

export function XProfileHero({ profile, onEdit }: XProfileHeroProps) {
  return (
    <section className="x-profile-hero" aria-label={`${profile.name} profile`}>
      <div
        aria-label="Profile banner placeholder"
        className="x-profile-hero__banner"
        role="img"
      />

      <div className="x-profile-hero__body">
        <div className="x-profile-hero__actions">
          <div className="x-profile-hero__avatar-frame">
            <div
              aria-label="Profile picture placeholder"
              className="x-profile-hero__avatar"
              role="img"
            />
          </div>

          <button
            className="x-profile-hero__edit"
            type="button"
            onClick={onEdit}
          >
            Edit profile
          </button>
        </div>

        <div className="x-profile-hero__identity">
          <h1>{profile.name}</h1>
          <span>{profile.handle}</span>
        </div>

        <p className="x-profile-hero__bio">{profile.bio}</p>

        <div className="x-profile-hero__details">
          {profile.website ? (
            <span className="x-profile-hero__detail x-profile-hero__link">
              <LinkIcon aria-hidden="true" size={18} />
              {profile.website}
            </span>
          ) : null}
          <span className="x-profile-hero__detail">
            <CalendarBlankIcon aria-hidden="true" size={18} />
            {profile.joined}
          </span>
        </div>

        <div className="x-profile-hero__counts" aria-label="Follow counts">
          <span>
            <strong>{profile.following}</strong> Following
          </span>
          <span>
            <strong>{profile.followers}</strong> Followers
          </span>
        </div>
      </div>
    </section>
  );
}
