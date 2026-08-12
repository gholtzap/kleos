import * as stylex from "@stylexjs/stylex";
import { appColors } from "./app-tokens.stylex";

export const appSurfaceStyles = stylex.create({
  root: {
    minHeight: "100dvh",
    color: appColors.text,
    backgroundColor: appColors.background,
    fontFamily: '"Manrope Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 15,
    lineHeight: "20px",
  },
});
