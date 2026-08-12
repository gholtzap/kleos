import {
  ArrowLeftIcon,
  PlanetIcon,
} from "@phosphor-icons/react";
import "./profile-top-bar.css";

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
    <header className="profile-top-bar">
      <button
        aria-label="Back"
        className="profile-top-bar__back"
        onClick={onBack}
        type="button"
      >
        <ArrowLeftIcon aria-hidden="true" size={20} />
      </button>

      <div className="profile-top-bar__copy">
        <strong>{name}</strong>
        <span>{count}</span>
      </div>

      <div className="profile-top-bar__actions">
        <button aria-label="Profile Summary" onClick={onProfileSummary} type="button">
          <PlanetIcon aria-hidden="true" size={20} />
        </button>
      </div>
    </header>
  );
}
