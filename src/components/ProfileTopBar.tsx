import {
  ArrowLeftIcon,
  PlanetIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { appColors } from "../app-tokens.stylex";

interface ProfileTopBarProps {
  count: string;
  name: string;
  onBack: () => void;
  onProfileSummary: () => void;
}

export function ProfileTopBar({
  count,
  name,
  onBack,
  onProfileSummary,
}: ProfileTopBarProps) {
  return (
    <header {...stylex.props(styles.root)}>
      <button
        {...stylex.props(styles.button, styles.backButton)}
        aria-label="Back"
        onClick={onBack}
        type="button"
      >
        <ArrowLeftIcon {...stylex.props(styles.backIcon)} aria-hidden="true" size={20} />
      </button>

      <div {...stylex.props(styles.copy)}>
        <strong {...stylex.props(styles.name)}>{name}</strong>
        <span {...stylex.props(styles.count)}>{count}</span>
      </div>

      <div {...stylex.props(styles.actions)}>
        <button
          {...stylex.props(styles.button)}
          aria-label="Profile Summary"
          onClick={onProfileSummary}
          type="button"
        >
          <PlanetIcon aria-hidden="true" size={20} />
        </button>
      </div>
    </header>
  );
}

const styles = stylex.create({
  root: {
    position: "sticky",
    zIndex: 10,
    top: 0,
    display: "flex",
    alignItems: "center",
    width: "100%",
    height: 53,
    color: appColors.text,
    backgroundColor: "rgb(0 0 0 / 90%)",
    backdropFilter: "blur(12px)",
  },
  button: {
    appearance: "none",
    display: "grid",
    width: 36,
    height: 36,
    padding: 0,
    borderWidth: 0,
    borderRadius: "50%",
    color: "inherit",
    backgroundColor: { default: "transparent", ":hover": "rgba(239, 243, 244, 0.1)" },
    placeItems: "center",
    cursor: "pointer",
    transitionProperty: "background-color",
    transitionDuration: "0.2s",
    outlineColor: { default: null, ":focus-visible": appColors.blue },
    outlineStyle: { default: null, ":focus-visible": "solid" },
    outlineWidth: { default: null, ":focus-visible": 2 },
    outlineOffset: { default: null, ":focus-visible": 2 },
  },
  backButton: {
    width: 56,
    height: 53,
    borderRadius: 0,
    backgroundColor: "transparent",
    backgroundImage: {
      default: "none",
      ":hover":
        "radial-gradient(circle at center, rgba(239, 243, 244, 0.1) 0 18px, transparent 18px)",
    },
  },
  backIcon: {
    boxSizing: "content-box",
    padding: 8,
    overflow: "visible",
    borderRadius: "50%",
  },
  copy: {
    display: "flex",
    minWidth: 0,
    flex: 1,
    flexDirection: "column",
    paddingLeft: 16,
  },
  name: {
    overflow: "hidden",
    fontSize: 20,
    fontWeight: 700,
    lineHeight: "24px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  count: {
    overflow: "hidden",
    color: appColors.muted,
    fontSize: 13,
    lineHeight: "16px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    paddingRight: 16,
    gap: 4,
  },
});
