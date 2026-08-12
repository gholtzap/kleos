import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import type { FormEvent } from "react";
import { appBreakpoints, appColors } from "../app-tokens.stylex";

export function DiscoveryRail() {
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <aside {...stylex.props(styles.rail)} aria-label="Discover">
      <form {...stylex.props(styles.search)} onSubmit={submitSearch} role="search">
        <label {...stylex.props(styles.hiddenLabel)} htmlFor="discovery-search">
          Search
        </label>
        <MagnifyingGlassIcon aria-hidden="true" size={18} />
        <input
          {...stylex.props(styles.input)}
          id="discovery-search"
          placeholder="Search"
          type="search"
        />
      </form>
    </aside>
  );
}

const styles = stylex.create({
  rail: {
    display: { default: "flex", [appBreakpoints.compact]: "none" },
    width: {
      default: 350,
      [appBreakpoints.medium]: 290,
      [appBreakpoints.wide]: 290,
    },
    flexBasis: {
      default: 350,
      [appBreakpoints.medium]: 290,
      [appBreakpoints.wide]: 290,
    },
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: "column",
    paddingBlockStart: 9,
    paddingBlockEnd: 64,
    color: appColors.text,
  },
  hiddenLabel: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
  },
  search: {
    display: "flex",
    alignItems: "center",
    width: {
      default: 350,
      [appBreakpoints.medium]: 290,
      [appBreakpoints.wide]: 290,
    },
    height: 44,
    paddingInline: { default: 16, ":focus-within": 15 },
    borderColor: { default: appColors.border, ":focus-within": appColors.blue },
    borderStyle: "solid",
    borderWidth: { default: 1, ":focus-within": 2 },
    borderRadius: 9999,
    backgroundColor: appColors.background,
    gap: 10,
    color: { default: appColors.muted, ":focus-within": appColors.blue },
    marginBottom: -4,
  },
  input: {
    appearance: "none",
    minWidth: 0,
    height: "100%",
    flex: 1,
    borderWidth: 0,
    outline: 0,
    color: appColors.text,
    backgroundColor: "transparent",
    font: "inherit",
    fontSize: 15,
    "::placeholder": { color: appColors.muted },
    "::-webkit-search-cancel-button": { display: "none" },
  },
});
