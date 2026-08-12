import {
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  DotsThreeIcon,
  HouseIcon,
  UserIcon,
  type Icon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { appBreakpoints, appColors } from "../app-tokens.stylex";
import { profilePath } from "../lib";
import type { AccountIdentity } from "../types/profile";
import { ComposeIcon } from "./icons";

const NARROW = "@media (max-width: 1159px)";

interface SidebarBaseProps {
  account: AccountIdentity;
  activeItem: string;
  onPost: () => void;
}

type SidebarProps = SidebarBaseProps & (
  | {
      collapsible: true;
      collapsed: boolean;
      onCollapsedChange: (collapsed: boolean) => void;
    }
  | {
      collapsible?: false;
      collapsed?: never;
      onCollapsedChange?: never;
    }
);

interface NavigationItem {
  label: string;
  icon: Icon;
  href: string;
}

export function Sidebar(props: SidebarProps) {
  const { account, activeItem, onPost } = props;
  const collapsed = props.collapsible ? props.collapsed : false;
  const accountProfilePath = profilePath(account.handle);
  const navigationItems: readonly NavigationItem[] = [
    { label: "Home", icon: HouseIcon, href: "/home" },
    { label: "Profile", icon: UserIcon, href: accountProfilePath },
  ];

  return (
    <aside {...stylex.props(styles.root, collapsed && styles.collapsedRoot)} id="sidebar">
      <div {...stylex.props(styles.header, collapsed && styles.collapsedHeader)}>
        <a
          {...stylex.props(styles.link, styles.logo, styles.focusRing)}
          aria-label="Go to Kleos home"
          href="/home"
        >
          <span {...stylex.props(styles.wordmark, collapsed && styles.hidden)}>Kleos</span>
          <img
            {...stylex.props(styles.mark, collapsed && styles.visibleMark)}
            alt=""
            src="/kleos-icon.svg"
          />
        </a>
        {props.collapsible ? (
          <button
            {...stylex.props(styles.button, styles.toggle, collapsed && styles.collapsedToggle, styles.focusRing)}
            aria-controls="sidebar"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => props.onCollapsedChange(!collapsed)}
            type="button"
          >
            {collapsed ? (
              <CaretDoubleRightIcon aria-hidden="true" size={18} />
            ) : (
              <CaretDoubleLeftIcon aria-hidden="true" size={18} />
            )}
          </button>
        ) : null}
      </div>

      <nav {...stylex.props(styles.navigation)} aria-label="Primary navigation">
        <ul {...stylex.props(styles.navigationList)}>
          {navigationItems.map(({ label, icon: NavigationIcon, href }) => {
            const isActive = activeItem === label;
            return (
              <li {...stylex.props(styles.navigationItem)} key={label}>
                <a
                  {...stylex.props(
                    styles.link,
                    styles.navigationButton,
                    collapsed && styles.collapsedControl,
                    isActive && styles.activeNavigationButton,
                    styles.focusRing,
                  )}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={label}
                  href={href}
                >
                  <NavigationIcon
                    {...stylex.props(styles.navigationIcon)}
                    size={27}
                    weight={isActive ? "fill" : "regular"}
                  />
                  <span {...stylex.props(styles.controlLabel, collapsed && styles.hidden)}>{label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        {...stylex.props(styles.button, styles.post, collapsed && styles.collapsedControl, styles.focusRing)}
        aria-label="Create post"
        onClick={onPost}
        type="button"
      >
        <span {...stylex.props(styles.controlLabel, collapsed && styles.hidden)}>Post</span>
        <ComposeIcon {...stylex.props(styles.postIcon, collapsed && styles.visiblePostIcon)} />
      </button>

      <a
        {...stylex.props(styles.link, styles.account, collapsed && styles.collapsedAccount, styles.focusRing)}
        aria-label={`Go to the ${account.name} profile`}
        href={accountProfilePath}
      >
        <span {...stylex.props(styles.avatar)} aria-hidden="true" />
        <span {...stylex.props(styles.accountText, collapsed && styles.hidden)}>
          <strong {...stylex.props(styles.accountName)}>{account.name}</strong>
          <span {...stylex.props(styles.accountHandle)}>{account.handle}</span>
        </span>
        <DotsThreeIcon
          {...stylex.props(styles.accountMenu, collapsed && styles.hidden)}
          aria-hidden="true"
          size={20}
          weight="bold"
        />
      </a>
    </aside>
  );
}

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: { default: "column", [appBreakpoints.mobile]: "row" },
    alignItems: { default: "stretch", [NARROW]: "center" },
    width: { default: 259, [NARROW]: 68, [appBreakpoints.mobile]: "100%" },
    minHeight: { default: "100dvh", [appBreakpoints.mobile]: "calc(64px + env(safe-area-inset-bottom))" },
    height: { default: "auto", [appBreakpoints.mobile]: "calc(64px + env(safe-area-inset-bottom))" },
    padding: 0,
    paddingBottom: { default: 0, [appBreakpoints.mobile]: "env(safe-area-inset-bottom)" },
    color: appColors.text,
    backgroundColor: { default: "transparent", [appBreakpoints.mobile]: "rgb(0 0 0 / 94%)" },
    borderTopColor: { default: "transparent", [appBreakpoints.mobile]: appColors.border },
    borderTopStyle: { default: "none", [appBreakpoints.mobile]: "solid" },
    borderTopWidth: { default: 0, [appBreakpoints.mobile]: 1 },
    backdropFilter: { default: "none", [appBreakpoints.mobile]: "blur(12px)" },
  },
  collapsedRoot: {
    alignItems: "center",
    width: { default: 68, [appBreakpoints.mobile]: "100%" },
  },
  button: {
    appearance: "none",
    borderWidth: 0,
    color: "inherit",
    backgroundColor: "transparent",
    font: "inherit",
    textAlign: "left",
    cursor: "pointer",
  },
  link: { color: "inherit", textDecoration: "none" },
  focusRing: {
    outlineColor: { default: null, ":focus-visible": appColors.blue },
    outlineStyle: { default: null, ":focus-visible": "solid" },
    outlineWidth: { default: null, ":focus-visible": 2 },
    outlineOffset: { default: null, ":focus-visible": 2 },
  },
  header: {
    display: { default: "flex", [appBreakpoints.mobile]: "none" },
    width: { default: 259, [NARROW]: 68 },
    alignItems: "center",
    justifyContent: { default: "space-between", [NARROW]: "center" },
  },
  collapsedHeader: { width: 68, flexDirection: "column" },
  logo: {
    display: "flex",
    width: "fit-content",
    height: 52,
    padding: 12,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: { default: "transparent", ":hover": "rgba(231, 233, 234, 0.024)" },
    transitionProperty: "background-color, box-shadow",
    transitionDuration: "0.2s",
  },
  wordmark: {
    display: { default: "inline", [NARROW]: "none" },
    fontSize: 22,
    fontWeight: 750,
    letterSpacing: "-0.04em",
    lineHeight: "28px",
  },
  mark: {
    display: { default: "none", [NARROW]: "block" },
    width: 28,
    height: 28,
  },
  visibleMark: { display: "block" },
  hidden: { display: "none" },
  toggle: {
    display: { default: "grid", [NARROW]: "none" },
    width: 36,
    height: 36,
    marginRight: 8,
    borderRadius: "50%",
    placeItems: "center",
    backgroundColor: { default: "transparent", ":hover": "rgba(239, 243, 244, 0.1)" },
    transitionProperty: "background-color",
    transitionDuration: "0.2s",
  },
  collapsedToggle: { marginRight: 0 },
  navigation: {
    width: { default: "auto", [appBreakpoints.mobile]: "66.666%" },
    marginTop: { default: 6, [appBreakpoints.mobile]: 0 },
  },
  navigationList: {
    display: { default: "block", [appBreakpoints.mobile]: "flex" },
    height: { default: "auto", [appBreakpoints.mobile]: 64 },
    padding: 0,
    margin: 0,
    listStyle: "none",
  },
  navigationItem: {
    display: "flex",
    alignItems: "center",
    width: { default: "auto", [appBreakpoints.mobile]: "50%" },
    height: { default: 58.25, [appBreakpoints.mobile]: 64 },
    paddingBlock: { default: 4, [appBreakpoints.mobile]: 0 },
  },
  navigationButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: { default: "flex-start", [NARROW]: "center" },
    width: { default: "fit-content", [NARROW]: 52, [appBreakpoints.mobile]: "100%" },
    minHeight: 50.25,
    height: { default: "auto", [appBreakpoints.mobile]: 64 },
    paddingBlock: { default: 11, [NARROW]: 0 },
    paddingLeft: { default: 12, [NARROW]: 0 },
    paddingRight: { default: 14, [NARROW]: 0 },
    borderRadius: { default: 9999, [appBreakpoints.mobile]: 0 },
    gap: 20,
    fontSize: 20,
    lineHeight: "24px",
    backgroundColor: { default: "transparent", ":hover": "rgba(231, 233, 234, 0.024)" },
    transitionProperty: "background-color, box-shadow",
    transitionDuration: "0.2s",
  },
  collapsedControl: {
    width: { default: 52, [appBreakpoints.mobile]: "100%" },
    justifyContent: "center",
    padding: 0,
  },
  activeNavigationButton: { fontWeight: 700 },
  navigationIcon: { flex: "0 0 auto" },
  controlLabel: { display: { default: "inline", [NARROW]: "none" } },
  post: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: { default: 233.094, [NARROW]: 52, [appBreakpoints.mobile]: "33.334%" },
    height: { default: 52, [appBreakpoints.mobile]: 64 },
    paddingInline: { default: 32, [NARROW]: 0 },
    marginTop: { default: 20, [appBreakpoints.mobile]: 0 },
    borderRadius: { default: 9999, [appBreakpoints.mobile]: 0 },
    color: { default: "rgb(15, 20, 25)", [appBreakpoints.mobile]: appColors.text },
    backgroundColor: {
      default: "rgb(239, 243, 244)",
      ":hover": "rgb(215, 219, 220)",
      [appBreakpoints.mobile]: {
        default: "transparent",
        ":hover": "rgb(239 243 244 / 10%)",
      },
    },
    fontSize: 17,
    fontWeight: 700,
    lineHeight: "20px",
    textAlign: "center",
    transitionProperty: "background-color, box-shadow",
    transitionDuration: "0.2s",
  },
  postIcon: {
    display: { default: "none", [NARROW]: "block" },
    width: 24,
    height: 24,
  },
  visiblePostIcon: { display: "block" },
  account: {
    display: { default: "flex", [appBreakpoints.mobile]: "none" },
    alignItems: "center",
    justifyContent: { default: "flex-start", [NARROW]: "center" },
    width: { default: 259, [NARROW]: 52 },
    height: 65.555,
    padding: { default: 12, [NARROW]: 6 },
    marginTop: "auto",
    marginBottom: 12,
    borderRadius: 9999,
    gap: 10,
    backgroundColor: { default: "transparent", ":hover": "rgba(231, 233, 234, 0.024)" },
    transitionProperty: "background-color, box-shadow",
    transitionDuration: "0.2s",
  },
  collapsedAccount: { width: 52, justifyContent: "center", padding: 6 },
  avatar: {
    display: "block",
    width: 40,
    height: 40,
    flex: "0 0 auto",
    borderRadius: "50%",
    objectFit: "cover",
    backgroundColor: appColors.border,
  },
  accountText: {
    display: { default: "flex", [NARROW]: "none" },
    minWidth: 0,
    flex: 1,
    flexDirection: "column",
    lineHeight: "20px",
  },
  accountName: { fontWeight: 700 },
  accountHandle: {
    overflow: "hidden",
    color: appColors.muted,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  accountMenu: { display: { default: "block", [NARROW]: "none" } },
});
