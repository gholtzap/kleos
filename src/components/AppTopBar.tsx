import { ArrowLeftIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import "./app-top-bar.css";

interface AppTopBarProps {
  title: string;
  subtitle?: string;
  /** Defaults to the browser's own back step. */
  onBack?: () => void;
  actions?: ReactNode;
}

function goBack() {
  if (window.history.length > 1) window.history.back();
  else window.scrollTo({ top: 0, behavior: "smooth" });
}

/** The sticky header every signed-in screen sits under. */
export function AppTopBar({
  title,
  subtitle,
  onBack = goBack,
  actions,
}: AppTopBarProps) {
  return (
    <header className="app-top-bar">
      <button
        aria-label="Back"
        className="app-top-bar__back"
        onClick={onBack}
        type="button"
      >
        <ArrowLeftIcon aria-hidden="true" size={20} />
      </button>

      <div className="app-top-bar__copy">
        <strong>{title}</strong>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>

      {actions ? <div className="app-top-bar__actions">{actions}</div> : null}
    </header>
  );
}
