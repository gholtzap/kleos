import { CalendarBlankIcon, LinkIcon } from "@phosphor-icons/react";
import type { ProfileRecord } from "../types/profile";
import "./profile-hero.css";

interface ProfileHeroProps {
  profile: ProfileRecord;
  onEdit: () => void;
}

export function ProfileHero({ profile, onEdit }: ProfileHeroProps) {
  return (
    <section className="profile-hero" aria-label={`${profile.name} profile`}>
      <div
        aria-label="Profile banner placeholder"
        className="profile-hero__banner"
        role="img"
      />

      <div className="profile-hero__body">
        <div className="profile-hero__actions">
          <div className="profile-hero__avatar-frame">
            <div
              aria-label="Profile picture placeholder"
              className="profile-hero__avatar"
              role="img"
            />
          </div>

          <button
            className="profile-hero__edit"
            type="button"
            onClick={onEdit}
          >
            Edit profile
          </button>
        </div>

        <div className="profile-hero__identity">
          <h1>{profile.name}</h1>
          <span>{profile.handle}</span>
        </div>

        <p className="profile-hero__bio">{profile.bio}</p>

        <div className="profile-hero__details">
          {profile.website ? (
            <span className="profile-hero__detail profile-hero__link">
              <LinkIcon aria-hidden="true" size={18} />
              {profile.website}
            </span>
          ) : null}
          {profile.joined ? (
            <span className="profile-hero__detail">
              <CalendarBlankIcon aria-hidden="true" size={18} />
              {profile.joined}
            </span>
          ) : null}
        </div>

        <div className="profile-hero__counts" aria-label="Follow counts">
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
