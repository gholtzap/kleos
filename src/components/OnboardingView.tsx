import {
  ArrowRightIcon,
  CircleNotchIcon,
  FileArrowUpIcon,
  GithubLogoIcon,
  PlusIcon,
  SealCheckIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { experiencePeriod, yearRange } from "../profile-sections";
import type { EducationEntry, KleosRecord, Person } from "../types";
import "./onboarding.css";

export type OnboardingEntrySection =
  | "experience"
  | "education"
  | "certifications"
  | "otherExperience";

export interface OnboardingViewProps {
  firstName: string;
  /** Null before any import: the screen leads with the two import buttons. */
  draft: KleosRecord | null;
  resumeFileName: string;
  /** A GitHub handle the resume mentioned, shown as a prompt to verify it. */
  resumeGithub: string;
  ready: boolean;
  parsingResume: boolean;
  importingGithub: boolean;
  /** True while the GitHub OAuth hand-off is opening. */
  connectingGithub: boolean;
  saving: boolean;
  error: string;
  onImportResume: () => void;
  onImportGithub: () => void;
  onPatchPerson: (updates: Partial<Person>) => void;
  onPatchEducation: (id: string, updates: Partial<EducationEntry>) => void;
  onRemoveEntry: (section: OnboardingEntrySection, id: string) => void;
  onRemoveSkill: (value: string) => void;
  onAddSkill: (value: string) => void;
  onRemoveProject: (id: string) => void;
  onSave: () => void;
}

/**
 * The onboarding screen, rendered from plain props. The page owns Clerk, the
 * stored record, and the imports; this owns what the member sees: an
 * import-first start, then a review of everything the imports found.
 */
export function OnboardingView({
  firstName,
  draft,
  resumeFileName,
  resumeGithub,
  ready,
  parsingResume,
  importingGithub,
  connectingGithub,
  saving,
  error,
  onImportResume,
  onImportGithub,
  onPatchPerson,
  onPatchEducation,
  onRemoveEntry,
  onRemoveSkill,
  onAddSkill,
  onRemoveProject,
  onSave,
}: OnboardingViewProps) {
  const [newSkill, setNewSkill] = useState("");
  const busyImporting = parsingResume || importingGithub;
  const githubBusy = importingGithub || connectingGithub;

  function addSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = newSkill.trim().slice(0, 200);
    setNewSkill("");
    if (value) onAddSkill(value);
  }

  const errorMessage = error ? (
    <p className="onboarding__error" role="alert">
      {error}
    </p>
  ) : null;

  return (
    <div className="onboarding">
      <header className="onboarding__top">
        <a className="kleos-wordmark" href="/home">
          Kleos
        </a>
        <a className="onboarding__skip" href="/home">
          Skip for now
        </a>
      </header>

      {draft === null ? (
        <main className="onboarding__start">
          <h1>Welcome to Kleos{firstName ? `, ${firstName}` : ""}.</h1>
          <p className="onboarding__lede">
            Your profile is built from work you have already done. Import it —
            no retyping.
          </p>

          <div className="onboarding__imports">
            <button
              className="onboarding__import"
              disabled={!ready || busyImporting}
              onClick={onImportResume}
              type="button"
            >
              {parsingResume ? (
                <CircleNotchIcon
                  aria-hidden="true"
                  className="onboarding__spin"
                  size={28}
                />
              ) : (
                <FileArrowUpIcon aria-hidden="true" size={28} />
              )}
              <span>
                <strong>
                  {parsingResume
                    ? "Reading your resume…"
                    : "Import from resume"}
                </strong>
                <small>PDF · read on your device, never uploaded</small>
              </span>
              <ArrowRightIcon aria-hidden="true" size={18} />
            </button>

            <button
              className="onboarding__import"
              disabled={!ready || busyImporting || connectingGithub}
              onClick={onImportGithub}
              type="button"
            >
              {githubBusy ? (
                <CircleNotchIcon
                  aria-hidden="true"
                  className="onboarding__spin"
                  size={28}
                />
              ) : (
                <GithubLogoIcon aria-hidden="true" size={28} />
              )}
              <span>
                <strong>
                  {connectingGithub
                    ? "Opening GitHub…"
                    : importingGithub
                      ? "Importing from GitHub…"
                      : "Import from GitHub"}
                </strong>
                <small>
                  Verify your handle and feature your best repositories
                </small>
              </span>
              <ArrowRightIcon aria-hidden="true" size={18} />
            </button>
          </div>

          {errorMessage}

          <a className="onboarding__blank" href="/home">
            or start with a blank profile
          </a>
        </main>
      ) : (
        <main className="onboarding__review">
          <header className="onboarding__review-header">
            <h1>Here is what your imports found.</h1>
            <p className="onboarding__lede">
              Fix anything that reads wrong, remove what you do not want, and
              save. Nothing is published until you do.
            </p>
            <div className="onboarding__sources">
              {resumeFileName ? (
                <span className="onboarding__source">
                  <SealCheckIcon aria-hidden="true" size={14} weight="fill" />
                  Resume · {resumeFileName}
                </span>
              ) : null}
              {draft.person.github !== undefined ? (
                <span className="onboarding__source">
                  <SealCheckIcon aria-hidden="true" size={14} weight="fill" />
                  GitHub · @{draft.person.github}
                </span>
              ) : null}
            </div>
          </header>

          <section aria-label="Identity" className="onboarding__card">
            <h2>You</h2>
            <div className="onboarding__fields">
              <label>
                Name
                <input
                  maxLength={200}
                  onChange={(event) =>
                    onPatchPerson({ name: event.target.value })
                  }
                  value={draft.person.name}
                />
              </label>
              <label>
                Headline
                <input
                  maxLength={300}
                  onChange={(event) =>
                    onPatchPerson({ role: event.target.value })
                  }
                  placeholder="What you do, in one line"
                  value={draft.person.role}
                />
              </label>
              <label>
                Location
                <input
                  maxLength={300}
                  onChange={(event) =>
                    onPatchPerson({ location: event.target.value })
                  }
                  value={draft.person.location}
                />
              </label>
              <label>
                Website
                <input
                  maxLength={2000}
                  onChange={(event) =>
                    onPatchPerson({
                      website: event.target.value.trim() || undefined,
                    })
                  }
                  placeholder="https://"
                  value={draft.person.website ?? ""}
                />
              </label>
              <label className="onboarding__field-wide">
                Summary
                <textarea
                  maxLength={5000}
                  onChange={(event) =>
                    onPatchPerson({ summary: event.target.value })
                  }
                  placeholder="A few sentences about your work"
                  rows={3}
                  value={draft.person.summary}
                />
              </label>
            </div>
          </section>

          <section aria-label="Skills" className="onboarding__card">
            <h2>Skills</h2>
            {draft.person.expertise.length === 0 ? (
              <p className="onboarding__empty">
                No skills imported yet — add the ones that matter.
              </p>
            ) : null}
            <ul className="onboarding__chips">
              {draft.person.expertise.map((skill) => (
                <li key={skill}>
                  {skill}
                  <button
                    aria-label={`Remove ${skill}`}
                    onClick={() => onRemoveSkill(skill)}
                    type="button"
                  >
                    <XIcon aria-hidden="true" size={12} />
                  </button>
                </li>
              ))}
            </ul>
            <form className="onboarding__add-skill" onSubmit={addSkill}>
              <input
                aria-label="Add a skill"
                maxLength={200}
                onChange={(event) => setNewSkill(event.target.value)}
                placeholder="Add a skill"
                value={newSkill}
              />
              <button aria-label="Add skill" type="submit">
                <PlusIcon aria-hidden="true" size={16} />
              </button>
            </form>
          </section>

          <section aria-label="Experience" className="onboarding__card">
            <h2>Experience</h2>
            {draft.experience.length === 0 ? (
              <p className="onboarding__empty">
                Nothing imported. You can add positions on your profile.
              </p>
            ) : (
              <ul className="onboarding__rows">
                {draft.experience.map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <strong>{entry.title}</strong>
                      <span>
                        {entry.organization}
                        {entry.location ? ` · ${entry.location}` : ""}
                      </span>
                      <small>{experiencePeriod(entry, new Date())}</small>
                      {entry.highlights.length > 0 ? (
                        <small>
                          {entry.highlights.length}{" "}
                          {entry.highlights.length === 1
                            ? "highlight"
                            : "highlights"}{" "}
                          imported
                        </small>
                      ) : null}
                    </div>
                    <button
                      aria-label={`Remove ${entry.title}`}
                      onClick={() => onRemoveEntry("experience", entry.id)}
                      type="button"
                    >
                      <XIcon aria-hidden="true" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Education" className="onboarding__card">
            <h2>Education</h2>
            {draft.education.length === 0 ? (
              <p className="onboarding__empty">Nothing imported.</p>
            ) : (
              <ul className="onboarding__rows">
                {draft.education.map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <strong>{entry.school}</strong>
                      <span>{entry.degree}</span>
                      <span className="onboarding__years">
                        <label>
                          Start year
                          <input
                            inputMode="numeric"
                            maxLength={4}
                            onChange={(event) =>
                              onPatchEducation(entry.id, {
                                start: event.target.value.replace(/\D/g, ""),
                              })
                            }
                            value={entry.start}
                          />
                        </label>
                        <label>
                          End year
                          <input
                            inputMode="numeric"
                            maxLength={4}
                            onChange={(event) => {
                              const value = event.target.value.replace(
                                /\D/g,
                                "",
                              );
                              onPatchEducation(entry.id, {
                                end: value === "" ? undefined : value,
                              });
                            }}
                            placeholder="Present"
                            value={entry.end ?? ""}
                          />
                        </label>
                        <small>
                          {yearRange(entry.start || "?", entry.end)}
                        </small>
                      </span>
                    </div>
                    <button
                      aria-label={`Remove ${entry.school}`}
                      onClick={() => onRemoveEntry("education", entry.id)}
                      type="button"
                    >
                      <XIcon aria-hidden="true" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {draft.certifications.length > 0 ? (
            <section aria-label="Certifications" className="onboarding__card">
              <h2>Certifications</h2>
              <ul className="onboarding__rows">
                {draft.certifications.map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <strong>{entry.name}</strong>
                      <span>{entry.issuer}</span>
                      <small>
                        {entry.expires === undefined
                          ? `Issued ${entry.issued}`
                          : `Issued ${entry.issued} · Expires ${entry.expires}`}
                      </small>
                    </div>
                    <button
                      aria-label={`Remove ${entry.name}`}
                      onClick={() => onRemoveEntry("certifications", entry.id)}
                      type="button"
                    >
                      <XIcon aria-hidden="true" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {draft.otherExperience.length > 0 ? (
            <section
              aria-label="Projects and other experience"
              className="onboarding__card"
            >
              <h2>Projects & other experience</h2>
              <ul className="onboarding__rows">
                {draft.otherExperience.map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <strong>{entry.title}</strong>
                      {entry.detail ? <span>{entry.detail}</span> : null}
                      <small>{entry.period}</small>
                    </div>
                    <button
                      aria-label={`Remove ${entry.title}`}
                      onClick={() =>
                        onRemoveEntry("otherExperience", entry.id)
                      }
                      type="button"
                    >
                      <XIcon aria-hidden="true" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-label="GitHub" className="onboarding__card">
            <h2>GitHub</h2>
            {draft.person.github !== undefined ? (
              <>
                <p className="onboarding__verified">
                  <SealCheckIcon aria-hidden="true" size={16} weight="fill" />
                  @{draft.person.github} · verified through your linked GitHub
                  account.
                </p>
                {draft.projects.length > 0 ? (
                  <ul className="onboarding__chips">
                    {draft.projects.map((project) => (
                      <li key={project.id}>
                        {project.owner}/{project.name}
                        <button
                          aria-label={`Remove ${project.owner}/${project.name}`}
                          onClick={() => onRemoveProject(project.id)}
                          type="button"
                        >
                          <XIcon aria-hidden="true" size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="onboarding__empty">
                    No public repositories to feature yet.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="onboarding__empty">
                  {resumeGithub
                    ? `Your resume lists github.com/${resumeGithub} — connect to verify it and feature your best repositories.`
                    : "Connect your GitHub account to verify your handle and feature your best repositories."}
                </p>
                <button
                  className="onboarding__connect"
                  disabled={githubBusy}
                  onClick={onImportGithub}
                  type="button"
                >
                  <GithubLogoIcon aria-hidden="true" size={18} weight="bold" />
                  {connectingGithub
                    ? "Opening GitHub…"
                    : importingGithub
                      ? "Importing…"
                      : "Connect GitHub"}
                </button>
              </>
            )}
          </section>

          {errorMessage}

          <footer className="onboarding__actions">
            <button
              className="onboarding__import-more"
              disabled={busyImporting}
              onClick={onImportResume}
              type="button"
            >
              {parsingResume
                ? "Reading your resume…"
                : resumeFileName
                  ? "Re-import a resume"
                  : "Import a resume too"}
            </button>
            <button
              className="onboarding__save"
              disabled={saving || busyImporting}
              onClick={onSave}
              type="button"
            >
              {saving ? "Saving…" : "Save your profile"}
            </button>
          </footer>
        </main>
      )}
    </div>
  );
}
