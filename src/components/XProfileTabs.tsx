import type { XProfileTab } from "../types/x-profile";
import "./x-profile-tabs.css";

const profileTabs: readonly { id: XProfileTab; label: string }[] = [
  { id: "Posts", label: "Posts" },
  { id: "Replies", label: "Sample one" },
  { id: "Highlights", label: "Sample two" },
  { id: "Media", label: "Sample three" },
  { id: "Likes", label: "Sample four" },
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
        {profileTabs.map(({ id, label }) => {
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
              {label}
              {selected ? <span className="x-profile-tabs__underline" /> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
