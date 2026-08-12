import * as stylex from "@stylexjs/stylex";
import { appBreakpoints, appColors } from "../app-tokens.stylex";

const NARROW = "@media (max-width: 1159px)";

export const appLayoutStyles = stylex.create({
  root: {
    display: "grid",
    width: {
      default: "min(100%, 1249px)",
      [appBreakpoints.wide]: "100%",
      [appBreakpoints.medium]: "min(100%, 978px)",
      [appBreakpoints.compact]: 668,
      [appBreakpoints.mobile]: "100%",
    },
    maxWidth: { default: "none", [appBreakpoints.wide]: 1200 },
    minHeight: "100dvh",
    marginInline: "auto",
    paddingBottom: { default: 0, [appBreakpoints.mobile]: "calc(64px + env(safe-area-inset-bottom))" },
    gridTemplateColumns: {
      default: "267px 600px 30px minmax(290px, 350px)",
      [appBreakpoints.wide]: "minmax(250px, 1fr) 600px 20px 290px",
      [appBreakpoints.medium]: "68px 600px 20px 290px",
      [appBreakpoints.compact]: "68px 600px",
      [appBreakpoints.mobile]: "minmax(0, 1fr)",
    },
  },
  profileRoot: {
    width: "min(100%, 1249px)",
    gridTemplateColumns: {
      default: "267px minmax(0, 1fr)",
      [NARROW]: "68px minmax(0, 1fr)",
      [appBreakpoints.mobile]: "minmax(0, 1fr)",
    },
  },
  profileRootCollapsed: {
    gridTemplateColumns: {
      default: "68px minmax(0, 1fr)",
      [appBreakpoints.mobile]: "minmax(0, 1fr)",
    },
  },
  sidebar: {
    position: { default: "sticky", [appBreakpoints.mobile]: "fixed" },
    zIndex: { default: "auto", [appBreakpoints.mobile]: 30 },
    top: { default: 0, [appBreakpoints.mobile]: "auto" },
    right: { default: "auto", [appBreakpoints.mobile]: 0 },
    bottom: { default: "auto", [appBreakpoints.mobile]: 0 },
    left: { default: "auto", [appBreakpoints.mobile]: 0 },
    width: { default: "auto", [appBreakpoints.mobile]: "100%" },
    height: { default: "100dvh", [appBreakpoints.mobile]: "calc(64px + env(safe-area-inset-bottom))" },
    gridColumn: 1,
  },
  timeline: {
    width: { default: 600, [appBreakpoints.mobile]: "100%" },
    minWidth: 0,
    gridColumn: { default: 2, [appBreakpoints.mobile]: 1 },
    borderLeftColor: appColors.border,
    borderLeftStyle: "solid",
    borderLeftWidth: 1,
    borderRightColor: appColors.border,
    borderRightStyle: "solid",
    borderRightWidth: 1,
  },
  profileTimeline: { width: "100%", minHeight: "100dvh" },
  newPosts: {
    width: "100%",
    height: 49,
    padding: 0,
    color: appColors.blue,
    backgroundColor: { default: "transparent", ":hover": "rgb(231 233 234 / 2.4%)" },
    borderWidth: 0,
    borderBottomColor: appColors.border,
    borderBottomStyle: "solid",
    borderBottomWidth: 1,
    cursor: "pointer",
    transitionProperty: "background-color, box-shadow",
    transitionDuration: "0.2s",
    outlineColor: { default: null, ":focus-visible": appColors.blue },
    outlineStyle: { default: null, ":focus-visible": "solid" },
    outlineWidth: { default: null, ":focus-visible": 2 },
    outlineOffset: { default: null, ":focus-visible": -2 },
  },
  newPostsMark: {
    display: "block",
    width: 96,
    height: 10,
    marginInline: "auto",
    backgroundColor: "#202327",
    borderRadius: 9999,
  },
  discovery: {
    display: { default: "block", [appBreakpoints.compact]: "none" },
    width: "100%",
    gridColumn: 4,
  },
});
