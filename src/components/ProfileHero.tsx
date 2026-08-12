import { CalendarBlankIcon, LinkIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { appColors } from "../app-tokens.stylex";
import type { ProfileRecord } from "../types/profile";

const MOBILE = "@media (max-width: 480px)";

interface ProfileHeroProps {
  profile: ProfileRecord;
  onEdit: () => void;
}

export function ProfileHero({ profile, onEdit }: ProfileHeroProps) {
  return (
    <section {...stylex.props(styles.root)} aria-label={`${profile.name} profile`}>
      <div
        {...stylex.props(styles.banner)}
        aria-label="Profile banner placeholder"
        role="img"
      />

      <div {...stylex.props(styles.body)}>
        <div {...stylex.props(styles.actions)}>
          <div {...stylex.props(styles.avatarFrame)}>
            <div
              {...stylex.props(styles.avatar)}
              aria-label="Profile picture placeholder"
              role="img"
            />
          </div>

          <button
            {...stylex.props(styles.edit)}
            type="button"
            onClick={onEdit}
          >
            Edit profile
          </button>
        </div>

        <div {...stylex.props(styles.identity)}>
          <h1 {...stylex.props(styles.name)}>{profile.name}</h1>
          <span {...stylex.props(styles.handle)}>{profile.handle}</span>
        </div>

        <p {...stylex.props(styles.bio)}>{profile.bio}</p>

        <div {...stylex.props(styles.details)}>
          {profile.website ? (
            <span {...stylex.props(styles.detail, styles.link)}>
              <LinkIcon aria-hidden="true" size={18} />
              {profile.website}
            </span>
          ) : null}
          {profile.joined ? (
            <span {...stylex.props(styles.detail)}>
              <CalendarBlankIcon aria-hidden="true" size={18} />
              {profile.joined}
            </span>
          ) : null}
        </div>

        <div {...stylex.props(styles.counts)} aria-label="Follow counts">
          <span>
            <strong {...stylex.props(styles.countStrong)}>{profile.following}</strong> Following
          </span>
          <span>
            <strong {...stylex.props(styles.countStrong)}>{profile.followers}</strong> Followers
          </span>
        </div>
      </div>
    </section>
  );
}

const styles = stylex.create({
  root: {
    boxSizing: "border-box",
    width: "100%",
    color: appColors.text,
    backgroundColor: appColors.background,
  },
  banner: {
    display: "block",
    width: "100%",
    aspectRatio: "3 / 1",
    backgroundColor: "#202327",
  },
  body: {
    boxSizing: "border-box",
    paddingBlockEnd: 3,
    paddingInline: 16,
  },
  actions: {
    position: "relative",
    display: "flex",
    height: { default: 76, [MOBILE]: 56 },
    justifyContent: "flex-end",
  },
  avatarFrame: {
    boxSizing: "border-box",
    position: "absolute",
    top: { default: -73, [MOBILE]: -29 },
    left: { default: 0, [MOBILE]: 3 },
    width: { default: 145.5, [MOBILE]: 72 },
    height: { default: 145.5, [MOBILE]: 72 },
    padding: { default: 6, [MOBILE]: 3 },
    backgroundColor: appColors.background,
    borderRadius: "50%",
  },
  avatar: {
    boxSizing: "border-box",
    display: "block",
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    backgroundColor: appColors.border,
  },
  edit: {
    boxSizing: "border-box",
    width: 113.172,
    height: 36,
    paddingInline: 16,
    marginTop: 12,
    color: appColors.text,
    backgroundColor: { default: "transparent", ":hover": "rgb(239 243 244 / 10%)" },
    borderColor: "#536471",
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 9999,
    font: "inherit",
    fontWeight: 700,
    cursor: "pointer",
    transitionProperty: "background-color",
    transitionDuration: "0.2s",
    outlineColor: { default: null, ":focus-visible": appColors.blue },
    outlineStyle: { default: null, ":focus-visible": "solid" },
    outlineWidth: { default: null, ":focus-visible": 2 },
    outlineOffset: { default: null, ":focus-visible": 2 },
  },
  identity: { boxSizing: "border-box", marginTop: 8 },
  name: {
    boxSizing: "border-box",
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    lineHeight: "24px",
  },
  handle: {
    boxSizing: "border-box",
    display: "block",
    color: appColors.muted,
    fontSize: 15,
    lineHeight: "20px",
  },
  bio: {
    boxSizing: "border-box",
    marginBlockStart: 12,
    marginBlockEnd: 0,
    fontSize: 15,
    lineHeight: "20px",
    whiteSpace: "pre-line",
  },
  details: {
    boxSizing: "border-box",
    display: "flex",
    marginTop: 10,
    flexWrap: "wrap",
    flexDirection: { default: "row", [MOBILE]: "column" },
    columnGap: 12,
    rowGap: { default: 4, [MOBILE]: 0 },
    color: appColors.muted,
    fontSize: 15,
    lineHeight: "20px",
  },
  detail: {
    boxSizing: "border-box",
    display: "inline-flex",
    minWidth: 0,
    maxWidth: "100%",
    alignItems: "center",
    gap: 4,
    whiteSpace: "nowrap",
  },
  link: {
    color: appColors.blue,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  counts: {
    boxSizing: "border-box",
    display: "flex",
    marginTop: 12,
    gap: 20,
    color: appColors.muted,
    fontSize: 14,
    lineHeight: "20px",
  },
  countStrong: { color: appColors.text, fontWeight: 700 },
});
