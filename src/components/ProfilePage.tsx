import { CheckCircleIcon, CircleIcon, PlanetIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { profilePath } from "../lib";
import type { AccountIdentity, FeaturedProject, KleosRecord } from "../types";
import "../app-surface.css";
import "./app-layout.css";
import { AppTopBar } from "./AppTopBar";
import { FeaturedProjects } from "./FeaturedProjects";
import { GitHubActivity } from "./GithubGraph";
import { GithubProjectsDialog } from "./GithubProjectsDialog";
import { ProfileEditDialog, type PersonProfileUpdates } from "./ProfileEditDialog";
import { ProfileEntryDialog } from "./ProfileEntryDialog";
import {
  certificationRows,
  educationRows,
  experienceRows,
  otherExperienceRows,
  ProfileEntrySection,
} from "./ProfileEntrySection";
import { ProfileHeader } from "./ProfileHeader";
import { Sidebar } from "./Sidebar";
import { useAppSurface } from "./use-app-surface";
import { useProfileRecord } from "./use-profile-record";
import "./profile-page.css";

type EntryDialogKind = "experience" | "education" | "certification" | "other";

type OpenDialog =
  | { type: "github" }
  | { type: "profile" }
  | { type: EntryDialogKind; entryId: string | null }
  | null;

interface CompletenessItem {
  label: string;
  done: boolean;
}

function completenessItems(record: KleosRecord): CompletenessItem[] {
  return [
    { label: "Headline added", done: record.person.role.trim().length > 0 },
    { label: "GitHub connected", done: record.person.github !== undefined },
    { label: "Projects pinned", done: record.projects.length > 0 },
    { label: "Experience added", done: record.experience.length > 0 },
    { label: "Education added", done: record.education.length > 0 },
  ];
}

interface ProfilePageProps {
  account: AccountIdentity;
}

export function ProfilePage({ account }: ProfilePageProps) {
  const profile = useProfileRecord(account);
  const { base, saving, saveError } = profile;
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [statusMessage, setStatusMessage] = useState("");

  useAppSurface(`${account.name} (${account.handle}) / Kleos`);

  function openDialog(next: OpenDialog) {
    profile.clearSaveError();
    setDialog(next);
  }

  async function persist(
    next: KleosRecord,
    message: string,
    options: { close?: boolean } = {},
  ): Promise<boolean> {
    if (!(await profile.save(next))) return false;
    if (options.close ?? true) setDialog(null);
    setStatusMessage(message);
    return true;
  }

  function upsertEntry<Entry extends { id: string }>(
    entries: readonly Entry[],
    entry: Entry,
  ): Entry[] {
    const exists = entries.some((item) => item.id === entry.id);
    return exists
      ? entries.map((item) => (item.id === entry.id ? entry : item))
      : [...entries, entry];
  }

  function removeEntry<Entry extends { id: string }>(
    entries: readonly Entry[],
    id: string,
  ): Entry[] {
    return entries.filter((item) => item.id !== id);
  }

  function saveGithubProjects(
    github: string,
    projects: FeaturedProject[],
  ): Promise<boolean> {
    return persist(
      {
        ...base,
        person: { ...base.person, github: github || undefined },
        projects,
      },
      "Pinned projects updated.",
      { close: false },
    );
  }

  function saveProfileDetails(updates: PersonProfileUpdates) {
    void persist(
      { ...base, person: { ...base.person, ...updates } },
      "Profile updated.",
    );
  }

  function entryDialogFor(kind: EntryDialogKind, entryId: string | null) {
    const shared = {
      saving,
      saveError,
      onCancel: () => setDialog(null),
    };
    if (kind === "experience") {
      const entry = base.experience.find((item) => item.id === entryId) ?? null;
      return (
        <ProfileEntryDialog
          {...shared}
          entry={entry}
          kind="experience"
          onDelete={
            entry
              ? () =>
                  void persist(
                    {
                      ...base,
                      experience: removeEntry(base.experience, entry.id),
                    },
                    "Experience removed.",
                  )
              : undefined
          }
          onSave={(next) =>
            void persist(
              { ...base, experience: upsertEntry(base.experience, next) },
              "Experience saved.",
            )
          }
        />
      );
    }
    if (kind === "education") {
      const entry = base.education.find((item) => item.id === entryId) ?? null;
      return (
        <ProfileEntryDialog
          {...shared}
          entry={entry}
          kind="education"
          onDelete={
            entry
              ? () =>
                  void persist(
                    {
                      ...base,
                      education: removeEntry(base.education, entry.id),
                    },
                    "Education removed.",
                  )
              : undefined
          }
          onSave={(next) =>
            void persist(
              { ...base, education: upsertEntry(base.education, next) },
              "Education saved.",
            )
          }
        />
      );
    }
    if (kind === "certification") {
      const entry =
        base.certifications.find((item) => item.id === entryId) ?? null;
      return (
        <ProfileEntryDialog
          {...shared}
          entry={entry}
          kind="certification"
          onDelete={
            entry
              ? () =>
                  void persist(
                    {
                      ...base,
                      certifications: removeEntry(base.certifications, entry.id),
                    },
                    "Certification removed.",
                  )
              : undefined
          }
          onSave={(next) =>
            void persist(
              {
                ...base,
                certifications: upsertEntry(base.certifications, next),
              },
              "Certification saved.",
            )
          }
        />
      );
    }
    const entry =
      base.otherExperience.find((item) => item.id === entryId) ?? null;
    return (
      <ProfileEntryDialog
        {...shared}
        entry={entry}
        kind="other"
        onDelete={
          entry
            ? () =>
                void persist(
                  {
                    ...base,
                    otherExperience: removeEntry(base.otherExperience, entry.id),
                  },
                  "Entry removed.",
                )
            : undefined
        }
        onSave={(next) =>
          void persist(
            {
              ...base,
              otherExperience: upsertEntry(base.otherExperience, next),
            },
            "Entry saved.",
          )
        }
      />
    );
  }

  const github = base.person.github ?? "";
  const profileUrl = `${window.location.origin}${profilePath(account.handle)}`;
  const checklist = completenessItems(base);
  const completed = checklist.filter((item) => item.done).length;
  const now = new Date();

  return (
    <div className="app-surface">
      <div className="app-layout profile-page__layout">
        <div className="app-layout__sidebar">
          <Sidebar
            account={account}
            activeItem="Profile"
            collapsible
            onPost={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          />
        </div>

        <main className="app-layout__timeline profile-page__timeline">
          <AppTopBar
            actions={
              <button
                aria-label="Profile Summary"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                type="button"
              >
                <PlanetIcon aria-hidden="true" size={20} />
              </button>
            }
            subtitle={account.handle}
            title={account.name}
          />

          <div className="profile-page__shell">
            <div className="profile-page__main">
              <ProfileHeader
                record={base}
                onEdit={() => openDialog({ type: "profile" })}
              />

              <FeaturedProjects
                projects={base.projects}
                onEdit={() => openDialog({ type: "github" })}
              />

              <ProfileEntrySection
                addLabel="Add a position"
                emptyHint="Add the roles you have held."
                onAdd={() =>
                  openDialog({ type: "experience", entryId: null })
                }
                onEditRow={(entryId) =>
                  openDialog({ type: "experience", entryId })
                }
                rows={experienceRows(base.experience, now)}
                title="Experience"
              />

              <ProfileEntrySection
                addLabel="Add education"
                emptyHint="Add your schools and degrees."
                onAdd={() => openDialog({ type: "education", entryId: null })}
                onEditRow={(entryId) =>
                  openDialog({ type: "education", entryId })
                }
                rows={educationRows(base.education)}
                title="Education"
              />

              <ProfileEntrySection
                addLabel="Add a certification"
                compact
                emptyHint="Add licenses and certifications."
                onAdd={() =>
                  openDialog({ type: "certification", entryId: null })
                }
                onEditRow={(entryId) =>
                  openDialog({ type: "certification", entryId })
                }
                rows={certificationRows(base.certifications)}
                title="Certifications"
              />

              <ProfileEntrySection
                addLabel="Add other experience"
                compact
                emptyHint="Talks, open source roles, awards."
                onAdd={() => openDialog({ type: "other", entryId: null })}
                onEditRow={(entryId) => openDialog({ type: "other", entryId })}
                rows={otherExperienceRows(base.otherExperience)}
                title="Other experience"
              />

              {github ? <GitHubActivity account={github} /> : null}
            </div>

            <aside className="profile-page__aside">
              <section aria-label="Public profile">
                <h2>Public profile</h2>
                <div className="profile-page__share">
                  <a href={profileUrl}>Open public view</a>
                  <button
                    onClick={() => {
                      void navigator.clipboard
                        ?.writeText(profileUrl)
                        .catch(() => {});
                      setStatusMessage("Public profile link copied.");
                    }}
                    type="button"
                  >
                    Copy link
                  </button>
                </div>
              </section>

              <section aria-label="Profile completeness">
                <h2>
                  Profile completeness · {completed}/{checklist.length}
                </h2>
                <div aria-hidden="true" className="profile-page__meter">
                  <i
                    style={{
                      width: `${Math.round((completed / checklist.length) * 100)}%`,
                    }}
                  />
                </div>
                <ul>
                  {checklist.map((item) => (
                    <li
                      className={item.done ? "profile-page__check--done" : ""}
                      key={item.label}
                    >
                      {item.done ? (
                        <CheckCircleIcon
                          aria-hidden="true"
                          size={14}
                          weight="fill"
                        />
                      ) : (
                        <CircleIcon aria-hidden="true" size={14} />
                      )}
                      {item.label}
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>

          <span className="profile-page__status" role="status">
            {statusMessage}
          </span>
        </main>
      </div>

      {dialog?.type === "github" ? (
        <GithubProjectsDialog
          projects={base.projects}
          saving={saving}
          saveError={saveError}
          onCancel={() => setDialog(null)}
          onSave={saveGithubProjects}
        />
      ) : null}

      {dialog?.type === "profile" ? (
        <ProfileEditDialog
          account={account}
          person={base.person}
          saving={saving}
          saveError={saveError}
          onCancel={() => setDialog(null)}
          onSave={saveProfileDetails}
        />
      ) : null}

      {dialog &&
      dialog.type !== "github" &&
      dialog.type !== "profile"
        ? entryDialogFor(dialog.type, dialog.entryId)
        : null}
    </div>
  );
}
