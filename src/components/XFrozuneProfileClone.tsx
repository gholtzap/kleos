import { useRef, useState } from "react";
import {
  defaultProfileDetails,
  loadEditableProfile,
  saveEditableProfile,
} from "../x-profile-data";
import type {
  XAccountIdentity,
  XEditableProfile,
  XProfileRecord,
  XProfileTab,
} from "../types/x-profile";
import "../x-home.css";
import "./x-home-clone.css";
import { XProfileEditDialog } from "./XProfileEditDialog";
import { XProfileHero } from "./XProfileHero";
import { XProfileTabs } from "./XProfileTabs";
import { XProfileTopBar } from "./XProfileTopBar";
import { XSidebar } from "./XSidebar";
import { useXSurface } from "./use-x-surface";
import "./x-frozune-profile-clone.css";

function countForTab(tab: XProfileTab) {
  if (tab === "Media") return defaultProfileDetails.mediaCount;
  if (tab === "Likes") return defaultProfileDetails.likeCount;
  return defaultProfileDetails.postCount;
}

interface XFrozuneProfileCloneProps {
  account: XAccountIdentity;
}

export function XFrozuneProfileClone({ account }: XFrozuneProfileCloneProps) {
  const [selectedTab, setSelectedTab] = useState<XProfileTab>("Posts");
  const [editableProfile, setEditableProfile] = useState<XEditableProfile>(() =>
    loadEditableProfile(account.handle),
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const heroRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const profile: XProfileRecord = {
    ...defaultProfileDetails,
    ...editableProfile,
    ...account,
  };

  useXSurface(`${account.name} (${account.handle}) / Kleos`, "x-profile");

  function goBack() {
    if (window.history.length > 1) window.history.back();
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showProfileSummary() {
    heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function saveProfile(nextProfile: XEditableProfile) {
    setEditableProfile(nextProfile);
    saveEditableProfile(account.handle, nextProfile);
    setEditorOpen(false);
    setEditMessage("Profile updated.");
  }

  return (
    <div className="x-home-root">
      <div className="x-home-clone x-frozune-profile__layout">
        <div className="x-home-clone__sidebar">
          <XSidebar
            account={account}
            activeItem="Profile"
            collapsible
            onPost={() => feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
        </div>

        <main className="x-home-clone__timeline x-frozune-profile__timeline">
          <XProfileTopBar
            count={countForTab(selectedTab)}
            name={account.name}
            onBack={goBack}
            onProfileSummary={showProfileSummary}
          />
          <div ref={heroRef}>
            <XProfileHero profile={profile} onEdit={() => setEditorOpen(true)} />
          </div>
          <span className="x-frozune-profile__status" role="status">{editMessage}</span>
          <XProfileTabs selectedTab={selectedTab} onSelect={setSelectedTab} />
          <div
            id="x-profile-panel"
            ref={feedRef}
            role="tabpanel"
            aria-labelledby={`x-profile-tab-${selectedTab.toLowerCase()}`}
          >
            <section className="x-frozune-profile__empty-state">
              <h2>No {selectedTab.toLowerCase()} yet</h2>
              <p>This part of your profile is empty.</p>
            </section>
          </div>
        </main>
      </div>
      {editorOpen ? (
        <XProfileEditDialog
          account={account}
          profile={editableProfile}
          onCancel={() => setEditorOpen(false)}
          onSave={saveProfile}
        />
      ) : null}
    </div>
  );
}
