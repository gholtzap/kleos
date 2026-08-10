import { useRef, useState } from "react";
import {
  dummyProfileDetails,
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
import { XDiscoveryRail } from "./XDiscoveryRail";
import "./x-home-clone.css";
import { XPostPlaceholderList } from "./XPostPlaceholderList";
import { XProfileEditDialog } from "./XProfileEditDialog";
import { XProfileHero } from "./XProfileHero";
import { XProfileTabs } from "./XProfileTabs";
import { XProfileTopBar } from "./XProfileTopBar";
import { XSidebar } from "./XSidebar";
import { useXSurface } from "./use-x-surface";
import "./x-frozune-profile-clone.css";

function countForTab(tab: XProfileTab) {
  if (tab === "Media") return dummyProfileDetails.mediaCount;
  if (tab === "Likes") return dummyProfileDetails.likeCount;
  return dummyProfileDetails.postCount;
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
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const profile: XProfileRecord = {
    ...dummyProfileDetails,
    ...editableProfile,
    ...account,
  };

  useXSurface(`${account.name} (${account.handle}) / Kleos`, "x-profile");

  function goBack() {
    if (window.history.length > 1) window.history.back();
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function focusSearch() {
    rootRef.current?.querySelector<HTMLInputElement>('.x-discovery-search input')?.focus();
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

  function renderPanel() {
    if (selectedTab === "Highlights") {
      return (
        <section className="x-frozune-profile__empty-state">
          <h2>Highlight on your profile</h2>
          <p>You must be subscribed to Premium to highlight posts on your profile.</p>
          <button type="button">Subscribe to Premium</button>
        </section>
      );
    }

    if (selectedTab === "Media") {
      return (
        <section className="x-frozune-profile__media" aria-label="Media placeholders">
          {Array.from({ length: 6 }, (_, index) => (
            <div aria-label={`Media placeholder ${index + 1}`} key={index} role="img" />
          ))}
        </section>
      );
    }

    const placeholderCount = selectedTab === "Posts" ? 5 : 3;

    return (
      <>
        {selectedTab === "Likes" ? (
          <p className="x-frozune-profile__private-note">Your likes are private. Only you can see them.</p>
        ) : null}
        <XPostPlaceholderList count={placeholderCount} />
      </>
    );
  }

  return (
    <div className="x-home-root" ref={rootRef}>
      <div className="x-home-clone">
        <div className="x-home-clone__sidebar">
          <XSidebar
            account={account}
            activeItem="Profile"
            onPost={() => feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
        </div>

        <main className="x-home-clone__timeline x-frozune-profile__timeline">
          <XProfileTopBar
            count={countForTab(selectedTab)}
            name={account.name}
            onBack={goBack}
            onProfileSummary={showProfileSummary}
            onSearch={focusSearch}
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
            {renderPanel()}
          </div>
        </main>

        <div className="x-home-clone__discovery">
          <XDiscoveryRail />
        </div>
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
