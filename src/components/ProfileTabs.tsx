import * as stylex from "@stylexjs/stylex";
import { appColors } from "../app-tokens.stylex";
import type { ProfileTab } from "../types/profile";

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
    <nav {...stylex.props(styles.root)} aria-label="Profile timelines">
      <div {...stylex.props(styles.list)} role="tablist">
        {profileTabs.map((id) => {
          const selected = id === selectedTab;

          return (
            <button
              {...stylex.props(styles.tab, selected && styles.selectedTab)}
              id={`profile-tab-${id.toLowerCase()}`}
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(id)}
            >
              {id}
              {selected ? <span {...stylex.props(styles.underline)} /> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

const styles = stylex.create({
  root: {
    boxSizing: "border-box",
    width: "100%",
    height: 54,
    overflowX: "auto",
    overflowY: "hidden",
    borderBottomColor: appColors.border,
    borderBottomStyle: "solid",
    borderBottomWidth: 1,
    scrollbarWidth: "none",
    "::-webkit-scrollbar": { display: "none" },
  },
  list: {
    display: "flex",
    width: "max-content",
    minWidth: "100%",
    height: 53,
  },
  tab: {
    position: "relative",
    flex: "1 0 auto",
    height: 53,
    paddingInline: 16,
    color: appColors.muted,
    font: "inherit",
    fontWeight: 500,
    whiteSpace: "nowrap",
    backgroundColor: { default: "transparent", ":hover": "rgba(231, 233, 234, 0.1)" },
    borderWidth: 0,
    cursor: "pointer",
    transitionProperty: "background-color",
    transitionDuration: "0.2s",
    zIndex: { default: null, ":focus-visible": 1 },
    outline: { default: null, ":focus-visible": `2px solid ${appColors.blue}` },
    outlineOffset: { default: null, ":focus-visible": -2 },
  },
  selectedTab: { color: appColors.text, fontWeight: 700 },
  underline: {
    position: "absolute",
    bottom: 0,
    left: "50%",
    width: 56,
    maxWidth: "calc(100% - 16px)",
    height: 4,
    backgroundColor: appColors.blue,
    borderRadius: 9999,
    transform: "translateX(-50%)",
  },
});
