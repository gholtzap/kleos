import { useRef, useState } from "react";
import {
  defaultProfileDetails,
  loadEditableProfile,
  saveEditableProfile,
} from "../profile-data";
import type {
  AccountIdentity,
  EditableProfile,
  ProfileRecord,
  ProfileTab,
} from "../types/profile";
import "../app-surface.css";
import { Experience } from "./Experience";
import "./app-layout.css";
import { ProfileEditDialog } from "./ProfileEditDialog";
import { ProfileHero } from "./ProfileHero";
import { ProfileTabs } from "./ProfileTabs";
import { ProfileTopBar } from "./ProfileTopBar";
import { Sidebar } from "./Sidebar";
import { useAppSurface } from "./use-app-surface";
import "./profile-page.css";

function countForTab(tab: ProfileTab) {
  if (tab === "Media") return defaultProfileDetails.mediaCount;
  if (tab === "Likes") return defaultProfileDetails.likeCount;
  return defaultProfileDetails.postCount;
}

interface ProfilePageProps {
  account: AccountIdentity;
}

export function ProfilePage({ account }: ProfilePageProps) {
  const [selectedTab, setSelectedTab] = useState<ProfileTab>("Posts");
  const [editableProfile, setEditableProfile] = useState<EditableProfile>(() =>
    loadEditableProfile(account.handle),
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const heroRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const profile: ProfileRecord = {
    ...defaultProfileDetails,
    ...editableProfile,
    ...account,
  };

  useAppSurface(`${account.name} (${account.handle}) / Kleos`);

  function goBack() {
    if (window.history.length > 1) window.history.back();
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showProfileSummary() {
    heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function saveProfile(nextProfile: EditableProfile) {
    setEditableProfile(nextProfile);
    saveEditableProfile(account.handle, nextProfile);
    setEditorOpen(false);
    setEditMessage("Profile updated.");
  }

  return (
    <div className="app-surface">
      <div className="app-layout profile-page__layout">
        <div className="app-layout__sidebar">
          <Sidebar
            account={account}
            activeItem="Profile"
            collapsible
            onPost={() => feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
        </div>

        <main className="app-layout__timeline profile-page__timeline">
          <ProfileTopBar
            count={countForTab(selectedTab)}
            name={account.name}
            onBack={goBack}
            onProfileSummary={showProfileSummary}
          />
          <div ref={heroRef}>
            <ProfileHero profile={profile} onEdit={() => setEditorOpen(true)} />
          </div>
          <Experience />
          <span className="profile-page__status" role="status">{editMessage}</span>
          <ProfileTabs selectedTab={selectedTab} onSelect={setSelectedTab} />
          <div
            id="profile-panel"
            ref={feedRef}
            role="tabpanel"
            aria-labelledby={`profile-tab-${selectedTab.toLowerCase()}`}
          >
            <section className="profile-page__empty-state">
              <h2>No {selectedTab.toLowerCase()} yet</h2>
              <p>This part of your profile is empty.</p>
            </section>
          </div>
        </main>
      </div>
      {editorOpen ? (
        <ProfileEditDialog
          account={account}
          profile={editableProfile}
          onCancel={() => setEditorOpen(false)}
          onSave={saveProfile}
        />
      ) : null}
    </div>
  );
}
