import type { XProfileTab } from "../types/x-profile";
import "./x-profile-tabs.css";

const profileTabs: readonly XProfileTab[] = [
  "Posts",
  "Replies",
  "Highlights",
  "Media",
  "Likes",
];

export function XProfileTabs({
  selectedTab,
  onSelect,
}: {
  selectedTab: XProfileTab;
  onSelect: (tab: XProfileTab) => void;
}) {
  return (
    <nav className="x-profile-tabs" aria-label="Profile timelines">
      <div className="x-profile-tabs__list" role="tablist">
        {profileTabs.map((id) => {
          const selected = id === selectedTab;

          return (
            <button
              className="x-profile-tabs__tab"
              id={`x-profile-tab-${id.toLowerCase()}`}
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(id)}
            >
              {id}
              {selected ? <span className="x-profile-tabs__underline" /> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
