import {
  ArrowRightIcon,
  CircleNotchIcon,
  FileArrowUpIcon,
  GithubLogoIcon,
  PencilSimpleIcon,
  PlusIcon,
  SealCheckIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useState, type FormEvent, type ReactNode } from "react";
import { experiencePeriod, validYear, yearRange } from "../profile-sections";
import type {
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  KleosRecord,
  OtherExperienceEntry,
  Person,
} from "../types";
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
  onPatchExperience: (id: string, updates: Partial<ExperienceEntry>) => void;
  onPatchEducation: (id: string, updates: Partial<EducationEntry>) => void;
  onPatchCertification: (
    id: string,
    updates: Partial<CertificationEntry>,
  ) => void;
  onPatchOther: (id: string, updates: Partial<OtherExperienceEntry>) => void;
  onRemoveEntry: (section: OnboardingEntrySection, id: string) => void;
  onRemoveSkill: (value: string) => void;
  onAddSkill: (value: string) => void;
  onRemoveProject: (id: string) => void;
  onSave: () => void;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

interface EntryRowProps {
  label: string;
  open: boolean;
  /** A row that needs attention stays open until it no longer does. */
  forcedOpen?: boolean;
  summary: ReactNode;
  editor: ReactNode;
  onToggle: () => void;
  onRemove: () => void;
}

/**
 * One imported entry: a readable summary, and a pencil that opens every field
 * of the entry for editing in place.
 */
function EntryRow({
  label,
  open,
  forcedOpen = false,
  summary,
  editor,
  onToggle,
  onRemove,
}: EntryRowProps) {
  const showEditor = open || forcedOpen;
  return (
    <li className={showEditor ? "onboarding__row--open" : undefined}>
      <div className="onboarding__row-line">
        <div className="onboarding__row-summary">{summary}</div>
        <button
          aria-expanded={showEditor}
          aria-label={`Edit ${label}`}
          disabled={forcedOpen}
          onClick={onToggle}
          type="button"
        >
          <PencilSimpleIcon aria-hidden="true" size={14} />
        </button>
        <button aria-label={`Remove ${label}`} onClick={onRemove} type="button">
          <XIcon aria-hidden="true" size={14} />
        </button>
      </div>
      {showEditor ? <div className="onboarding__editor">{editor}</div> : null}
    </li>
  );
}

/**
 * The onboarding screen, rendered from plain props. The page owns Clerk, the
 * stored record, and the imports; this owns what the member sees: an
 * import-first start, then a review where everything an import found is
 * editable in place.
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
  onPatchExperience,
  onPatchEducation,
  onPatchCertification,
  onPatchOther,
  onRemoveEntry,
  onRemoveSkill,
  onAddSkill,
  onRemoveProject,
  onSave,
}: OnboardingViewProps) {
  const [newSkill, setNewSkill] = useState("");
  const [openEntries, setOpenEntries] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const busyImporting = parsingResume || importingGithub;
  const githubBusy = importingGithub || connectingGithub;

  function toggleEntry(key: string) {
    setOpenEntries((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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

  if (draft === null) {
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

        <main className="onboarding__start">
          <h1>Welcome to Kleos{firstName ? `, ${firstName}` : ""}.</h1>
          <p className="onboarding__lede">
            Import your resume or connect GitHub to fill in most of your
            profile automatically.
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
      </div>
    );
  }

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

      <main className="onboarding__review">
        <header className="onboarding__review-header">
          <h1>Here is what your imports found.</h1>
          <p className="onboarding__lede">
            Everything below is editable. Open an entry to change any field,
            remove what you do not want, and save. Nothing is published until
            you do.
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
                onChange={(event) => onPatchPerson({ name: event.target.value })}
                value={draft.person.name}
              />
            </label>
            <label>
              Headline
              <input
                maxLength={300}
                onChange={(event) => onPatchPerson({ role: event.target.value })}
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
              No skills imported yet. Add the ones that matter.
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
              {draft.experience.map((entry) => {
                const label = entry.title || entry.organization || "position";
                return (
                  <EntryRow
                    editor={
                      <div className="onboarding__fields">
                        <label>
                          Title
                          <input
                            maxLength={200}
                            onChange={(event) =>
                              onPatchExperience(entry.id, {
                                title: event.target.value,
                              })
                            }
                            value={entry.title}
                          />
                        </label>
                        <label>
                          Organization
                          <input
                            maxLength={200}
                            onChange={(event) =>
                              onPatchExperience(entry.id, {
                                organization: event.target.value,
                              })
                            }
                            value={entry.organization}
                          />
                        </label>
                        <label>
                          Location
                          <input
                            maxLength={200}
                            onChange={(event) =>
                              onPatchExperience(entry.id, {
                                location: event.target.value,
                              })
                            }
                            value={entry.location ?? ""}
                          />
                        </label>
                        <label>
                          Employment type
                          <input
                            maxLength={50}
                            onChange={(event) =>
                              onPatchExperience(entry.id, {
                                employmentType: event.target.value,
                              })
                            }
                            placeholder="Full-time, internship, contract…"
                            value={entry.employmentType ?? ""}
                          />
                        </label>
                        <label>
                          Start
                          <input
                            onChange={(event) =>
                              onPatchExperience(entry.id, {
                                start: event.target.value,
                              })
                            }
                            placeholder="2024-06"
                            type="month"
                            value={entry.start}
                          />
                        </label>
                        <label>
                          End
                          <input
                            onChange={(event) =>
                              onPatchExperience(entry.id, {
                                end: event.target.value || undefined,
                              })
                            }
                            placeholder="2025-01"
                            type="month"
                            value={entry.end ?? ""}
                          />
                        </label>
                        <span className="onboarding__hint">
                          Leave the end empty for a role you still hold.
                        </span>
                        <label className="onboarding__field-wide">
                          Highlights · one per line
                          <textarea
                            onChange={(event) =>
                              onPatchExperience(entry.id, {
                                highlights: event.target.value
                                  .split("\n")
                                  .map((line) => line.slice(0, 500)),
                              })
                            }
                            rows={4}
                            value={entry.highlights.join("\n")}
                          />
                        </label>
                      </div>
                    }
                    key={entry.id}
                    label={label}
                    onRemove={() => onRemoveEntry("experience", entry.id)}
                    onToggle={() => toggleEntry(`experience:${entry.id}`)}
                    open={openEntries.has(`experience:${entry.id}`)}
                    summary={
                      <>
                        <strong>{entry.title || "Untitled position"}</strong>
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
                              : "highlights"}
                          </small>
                        ) : null}
                      </>
                    }
                  />
                );
              })}
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
                <EntryRow
                  editor={
                    <div className="onboarding__fields">
                      <label>
                        School
                        <input
                          maxLength={200}
                          onChange={(event) =>
                            onPatchEducation(entry.id, {
                              school: event.target.value,
                            })
                          }
                          value={entry.school}
                        />
                      </label>
                      <label>
                        Degree
                        <input
                          maxLength={200}
                          onChange={(event) =>
                            onPatchEducation(entry.id, {
                              degree: event.target.value,
                            })
                          }
                          value={entry.degree}
                        />
                      </label>
                      <label>
                        Start year
                        <input
                          inputMode="numeric"
                          maxLength={4}
                          onChange={(event) =>
                            onPatchEducation(entry.id, {
                              start: digitsOnly(event.target.value),
                            })
                          }
                          placeholder="2023"
                          value={entry.start}
                        />
                      </label>
                      <label>
                        End year
                        <input
                          inputMode="numeric"
                          maxLength={4}
                          onChange={(event) => {
                            const value = digitsOnly(event.target.value);
                            onPatchEducation(entry.id, {
                              end: value === "" ? undefined : value,
                            });
                          }}
                          placeholder="Present"
                          value={entry.end ?? ""}
                        />
                      </label>
                      <span className="onboarding__hint">
                        {validYear(entry.start)
                          ? "Leave the end empty while you are still enrolled."
                          : "Your resume did not state the years. Add the start."}
                      </span>
                    </div>
                  }
                  forcedOpen={!validYear(entry.start)}
                  key={entry.id}
                  label={entry.school || "education"}
                  onRemove={() => onRemoveEntry("education", entry.id)}
                  onToggle={() => toggleEntry(`education:${entry.id}`)}
                  open={openEntries.has(`education:${entry.id}`)}
                  summary={
                    <>
                      <strong>{entry.school || "Unnamed school"}</strong>
                      <span>{entry.degree}</span>
                      <small>{yearRange(entry.start || "?", entry.end)}</small>
                    </>
                  }
                />
              ))}
            </ul>
          )}
        </section>

        {draft.certifications.length > 0 ? (
          <section aria-label="Certifications" className="onboarding__card">
            <h2>Certifications</h2>
            <ul className="onboarding__rows">
              {draft.certifications.map((entry) => (
                <EntryRow
                  editor={
                    <div className="onboarding__fields">
                      <label>
                        Name
                        <input
                          maxLength={200}
                          onChange={(event) =>
                            onPatchCertification(entry.id, {
                              name: event.target.value,
                            })
                          }
                          value={entry.name}
                        />
                      </label>
                      <label>
                        Issuer
                        <input
                          maxLength={200}
                          onChange={(event) =>
                            onPatchCertification(entry.id, {
                              issuer: event.target.value,
                            })
                          }
                          value={entry.issuer}
                        />
                      </label>
                      <label>
                        Issued
                        <input
                          inputMode="numeric"
                          maxLength={4}
                          onChange={(event) =>
                            onPatchCertification(entry.id, {
                              issued: digitsOnly(event.target.value),
                            })
                          }
                          placeholder="2024"
                          value={entry.issued}
                        />
                      </label>
                      <label>
                        Expires
                        <input
                          inputMode="numeric"
                          maxLength={4}
                          onChange={(event) => {
                            const value = digitsOnly(event.target.value);
                            onPatchCertification(entry.id, {
                              expires: value === "" ? undefined : value,
                            });
                          }}
                          placeholder="Never"
                          value={entry.expires ?? ""}
                        />
                      </label>
                    </div>
                  }
                  key={entry.id}
                  label={entry.name || "certification"}
                  onRemove={() => onRemoveEntry("certifications", entry.id)}
                  onToggle={() => toggleEntry(`certifications:${entry.id}`)}
                  open={openEntries.has(`certifications:${entry.id}`)}
                  summary={
                    <>
                      <strong>{entry.name || "Unnamed certification"}</strong>
                      <span>{entry.issuer}</span>
                      <small>
                        {entry.expires === undefined
                          ? `Issued ${entry.issued}`
                          : `Issued ${entry.issued} · Expires ${entry.expires}`}
                      </small>
                    </>
                  }
                />
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
                <EntryRow
                  editor={
                    <div className="onboarding__fields">
                      <label>
                        Title
                        <input
                          maxLength={200}
                          onChange={(event) =>
                            onPatchOther(entry.id, {
                              title: event.target.value,
                            })
                          }
                          value={entry.title}
                        />
                      </label>
                      <label>
                        When, or what with
                        <input
                          maxLength={100}
                          onChange={(event) =>
                            onPatchOther(entry.id, {
                              period: event.target.value,
                            })
                          }
                          placeholder="2024, or the stack it was built with"
                          value={entry.period}
                        />
                      </label>
                      <label className="onboarding__field-wide">
                        Detail
                        <textarea
                          maxLength={500}
                          onChange={(event) =>
                            onPatchOther(entry.id, {
                              detail: event.target.value,
                            })
                          }
                          rows={3}
                          value={entry.detail ?? ""}
                        />
                      </label>
                    </div>
                  }
                  key={entry.id}
                  label={entry.title || "entry"}
                  onRemove={() => onRemoveEntry("otherExperience", entry.id)}
                  onToggle={() => toggleEntry(`otherExperience:${entry.id}`)}
                  open={openEntries.has(`otherExperience:${entry.id}`)}
                  summary={
                    <>
                      <strong>{entry.title || "Untitled entry"}</strong>
                      {entry.detail ? <span>{entry.detail}</span> : null}
                      <small>{entry.period}</small>
                    </>
                  }
                />
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
                  ? `Your resume lists github.com/${resumeGithub}. Connect to verify it and feature your best repositories.`
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
    </div>
  );
}
