import {
  ArrowLeftIcon,
  PlanetIcon,
} from "@phosphor-icons/react";
import "./x-profile-top-bar.css";

interface XProfileTopBarProps {
  count: string;
  name: string;
  onBack: () => void;
  onProfileSummary: () => void;
}

export function XProfileTopBar({
  count,
  name,
  onBack,
  onProfileSummary,
}: XProfileTopBarProps) {
  return (
    <header className="x-profile-top-bar">
      <button
        aria-label="Back"
        className="x-profile-top-bar__back"
        onClick={onBack}
        type="button"
      >
        <ArrowLeftIcon aria-hidden="true" size={20} />
      </button>

      <div className="x-profile-top-bar__copy">
        <strong>{name}</strong>
        <span>{count}</span>
      </div>

      <div className="x-profile-top-bar__actions">
        <button aria-label="Profile Summary" onClick={onProfileSummary} type="button">
          <PlanetIcon aria-hidden="true" size={20} />
        </button>
      </div>
    </header>
  );
}
