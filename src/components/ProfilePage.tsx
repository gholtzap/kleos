import { useAuth, useUser } from "@clerk/react";
import { useEffect, useRef, useState } from "react";
import {
  defaultProfileDetails,
  loadEditableProfile,
  saveEditableProfile,
} from "../profile-data";
import {
  emptyProfileRecord,
  getOwnProfileRecord,
  ProfileConflictError,
  saveOwnProfileRecord,
} from "../profile-record";
import type { FeaturedProject, KleosRecord } from "../types";
import type {
  AccountIdentity,
  EditableProfile,
  ProfileRecord,
  ProfileTab,
} from "../types/profile";
import "../app-surface.css";
import { Experience } from "./Experience";
import "./app-layout.css";
import { FeaturedProjects } from "./FeaturedProjects";
import { GitHubActivity } from "./GithubGraph";
import { GithubProjectsDialog } from "./GithubProjectsDialog";
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
  const { getToken } = useAuth();
  const { user } = useUser();
  const [selectedTab, setSelectedTab] = useState<ProfileTab>("Posts");
  const [editableProfile, setEditableProfile] = useState<EditableProfile>(() =>
    loadEditableProfile(account.handle),
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [record, setRecord] = useState<KleosRecord | null>(null);
  const [githubEditorOpen, setGithubEditorOpen] = useState(false);
  const [githubSaving, setGithubSaving] = useState(false);
  const [githubSaveError, setGithubSaveError] = useState("");
  const heroRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const profile: ProfileRecord = {
    ...defaultProfileDetails,
    ...editableProfile,
    ...account,
  };

  const verifiedGithub =
    user?.externalAccounts.find(
      (external) =>
        external.provider === "github" &&
        external.verification?.status === "verified" &&
        external.username,
    )?.username ?? undefined;

  useAppSurface(`${account.name} (${account.handle}) / Kleos`);

  useEffect(() => {
    const controller = new AbortController();
    getOwnProfileRecord(getToken, controller.signal)
      .then((loaded) => {
        if (!controller.signal.aborted && loaded) setRecord(loaded);
      })
      .catch(() => {
        // The page still renders without the stored record; saving retries the load.
      });
    return () => controller.abort();
  }, [getToken]);

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

  function openGithubEditor() {
    setGithubSaveError("");
    setGithubEditorOpen(true);
  }

  async function saveGithubProjects(
    github: string,
    projects: FeaturedProject[],
  ) {
    setGithubSaving(true);
    setGithubSaveError("");
    const base = record ?? emptyProfileRecord(account);
    const next: KleosRecord = {
      ...base,
      person: { ...base.person, github: github || undefined },
      projects,
    };
    try {
      const saved = await saveOwnProfileRecord(next, getToken);
      setRecord(saved);
      setGithubEditorOpen(false);
      setEditMessage("Featured projects updated.");
    } catch (error) {
      if (error instanceof ProfileConflictError) {
        try {
          setRecord(await getOwnProfileRecord(getToken));
        } catch {
          // Keep the stale record when the reload fails; the next save retries.
        }
      }
      setGithubSaveError(
        error instanceof Error
          ? error.message
          : "Could not save your featured projects.",
      );
    } finally {
      setGithubSaving(false);
    }
  }

  const github = record?.person.github ?? "";
  const projects = record?.projects ?? [];

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
          <FeaturedProjects projects={projects} onEdit={openGithubEditor} />
          {github ? <GitHubActivity account={github} /> : null}
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
      {githubEditorOpen ? (
        <GithubProjectsDialog
          github={github}
          verifiedGithub={verifiedGithub}
          projects={projects}
          saving={githubSaving}
          saveError={githubSaveError}
          onCancel={() => setGithubEditorOpen(false)}
          onSave={(nextGithub, nextProjects) => {
            void saveGithubProjects(nextGithub, nextProjects);
          }}
        />
      ) : null}
    </div>
  );
}
