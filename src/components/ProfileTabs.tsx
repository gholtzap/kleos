import type { ProfileTab } from "../types/profile";
import "./profile-tabs.css";

const profileTabs: readonly ProfileTab[] = [
  "Posts",
  "Replies",
  "Highlights",
  "Media",
  "Likes",
];

export function ProfileTabs({
  selectedTab,
  onSelect,
}: {
  selectedTab: ProfileTab;
  onSelect: (tab: ProfileTab) => void;
}) {
  return (
    <nav className="profile-tabs" aria-label="Profile timelines">
      <div className="profile-tabs__list" role="tablist">
        {profileTabs.map((id) => {
          const selected = id === selectedTab;

          return (
            <button
              className="profile-tabs__tab"
              id={`profile-tab-${id.toLowerCase()}`}
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(id)}
            >
              {id}
              {selected ? <span className="profile-tabs__underline" /> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
