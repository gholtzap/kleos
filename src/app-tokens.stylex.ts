import * as stylex from "@stylexjs/stylex";

export const appColors = stylex.defineVars({
  background: "#000",
  border: "#2f3336",
  blue: "#1d9bf0",
  green: "#00ba7c",
  pink: "#f91880",
  text: "#e7e9ea",
  muted: "#71767b",
});

export const appBreakpoints = stylex.defineConsts({
  compact: "@media (max-width: 1004px)",
  medium: "@media (min-width: 1005px) and (max-width: 1159px)",
  mobile: "@media (max-width: 699px)",
  reducedMotion: "@media (prefers-reduced-motion: reduce)",
  wide: "@media (min-width: 1160px) and (max-width: 1264px)",
});
