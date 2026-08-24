import { useAuth } from "@clerk/react";
import {
  ArrowRightIcon,
  CircleNotchIcon,
  FileArrowUpIcon,
  GithubLogoIcon,
  PlusIcon,
  SealCheckIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { fetchGithubRepos } from "../github";
import {
  clearedConnectedSearch,
  connectedProviderFromSearch,
  profilePath,
  welcomePath,
} from "../lib";
import { navigate } from "../navigation";
import {
  recordWithGithubImport,
  recordWithResumeImport,
} from "../onboarding";
import {
  experiencePeriod,
  validYear,
  yearRange,
} from "../profile-sections";
import type { ResumeImport } from "../resume-import";
import { MAX_RESUME_BYTES, resumeImportFromPdf } from "../resume-pdf";
import type { EducationEntry, KleosRecord } from "../types";
import type { AccountIdentity } from "../types/profile";
import { useAccountConnections } from "./use-account-connections";
import { useProfileRecord } from "./use-profile-record";
import "./onboarding.css";

interface OnboardingPageProps {
  account: AccountIdentity;
}

/**
 * The screen a new member lands on after signing up. Its whole job is a fast
 * first profile: import from a resume or GitHub, review what arrived, save.
 * Both imports are deterministic — the review shows exactly what the source
 * states, and nothing persists until the member saves.
 */
export function OnboardingPage({ account }: OnboardingPageProps) {
  const { getToken } = useAuth();
  const profile = useProfileRecord(account);
  const connections = useAccountConnections();
  const github = connections.connectionFor("github");
  const verifiedGithub = github.verified ? github.username : undefined;

  const [draft, setDraft] = useState<KleosRecord | null>(null);
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeGithub, setResumeGithub] = useState("");
  const [parsingResume, setParsingResume] = useState(false);
  const [importingGithub, setImportingGithub] = useState(false);
  const [importError, setImportError] = useState("");
  const [saveBlocker, setSaveBlocker] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const [returnedProvider, setReturnedProvider] = useState(() =>
    connectedProviderFromSearch(window.location.search),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { base, loaded, saving, saveError } = profile;
  const githubImported = draft?.person.github !== undefined;

  function applyResumeImport(imported: ResumeImport, fileName: string) {
    setDraft((current) => recordWithResumeImport(current ?? base, imported));
    setResumeFileName(fileName);
    setResumeGithub(imported.githubUsername ?? "");
  }

  async function importResume(file: File) {
    setImportError("");
    if (file.size > MAX_RESUME_BYTES) {
      setImportError("That PDF is over 10 MB. Export a smaller copy.");
      return;
    }
    setParsingResume(true);
    try {
      const imported = resumeImportFromPdf(await file.arrayBuffer());
      applyResumeImport(await imported, file.name);
    } catch {
      setImportError(
        "Could not read that file. Export your resume as a PDF and try again.",
      );
    } finally {
      setParsingResume(false);
    }
  }

  function onResumeChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void importResume(file);
  }

  async function importGithubRepos(username: string) {
    setImportingGithub(true);
    setImportError("");
    try {
      const repos = await fetchGithubRepos(getToken);
      setDraft((current) =>
        recordWithGithubImport(
          current ?? base,
          username,
          repos,
          new Date().toISOString(),
        ),
      );
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Could not load repositories from GitHub.",
      );
    } finally {
      setImportingGithub(false);
    }
  }

  async function importFromGithub() {
    if (importingGithub || connections.pending) return;
    if (verifiedGithub) {
      await importGithubRepos(verifiedGithub);
      return;
    }
    setImportError("");
    try {
      await connections.connect(
        "github",
        `${window.location.origin}${welcomePath}?connected=github`,
      );
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Could not start GitHub verification.",
      );
    }
  }

  // A finished GitHub OAuth flow lands back here; continue the import the
  // member started, once the verified connection is visible.
  useEffect(() => {
    if (!loaded || returnedProvider !== "github" || !verifiedGithub) return;
    setReturnedProvider(null);
    window.history.replaceState(
      null,
      "",
      `${welcomePath}${clearedConnectedSearch(window.location.search)}`,
    );
    void importGithubRepos(verifiedGithub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, returnedProvider, verifiedGithub]);

  function patchDraft(patch: (current: KleosRecord) => KleosRecord) {
    setSaveBlocker("");
    setDraft((current) => (current === null ? current : patch(current)));
  }

  function patchPerson(updates: Partial<KleosRecord["person"]>) {
    patchDraft((current) => ({
      ...current,
      person: { ...current.person, ...updates },
    }));
  }

  function removeFrom<Key extends "experience" | "education" | "certifications" | "otherExperience">(
    key: Key,
    id: string,
  ) {
    patchDraft((current) => ({
      ...current,
      [key]: current[key].filter((entry) => entry.id !== id),
    }));
  }

  function patchEducation(id: string, updates: Partial<EducationEntry>) {
    patchDraft((current) => ({
      ...current,
      education: current.education.map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry,
      ),
    }));
  }

  function removeSkill(value: string) {
    patchDraft((current) => ({
      ...current,
      person: {
        ...current.person,
        expertise: current.person.expertise.filter((skill) => skill !== value),
      },
    }));
  }

  function addSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = newSkill.trim().slice(0, 200);
    setNewSkill("");
    if (!value) return;
    patchDraft((current) => ({
      ...current,
      person: {
        ...current.person,
        expertise: current.person.expertise.some(
          (skill) => skill.toLowerCase() === value.toLowerCase(),
        )
          ? current.person.expertise
          : [...current.person.expertise, value],
      },
    }));
  }

  function removeProject(id: string) {
    patchDraft((current) => ({
      ...current,
      projects: current.projects.filter((project) => project.id !== id),
    }));
  }

  function educationProblem(record: KleosRecord): string {
    for (const entry of record.education) {
      if (!validYear(entry.start)) {
        return `Add the starting year for ${entry.school}.`;
      }
      if (entry.end !== undefined && (!validYear(entry.end) || entry.end < entry.start)) {
        return `Check the years for ${entry.school}.`;
      }
    }
    return "";
  }

  async function saveDraft() {
    if (draft === null) return;
    if (draft.person.name.trim().length === 0) {
      setSaveBlocker("Add your name before saving.");
      return;
    }
    const problem = educationProblem(draft);
    if (problem) {
      setSaveBlocker(problem);
      return;
    }
    if (await profile.save(draft)) {
      navigate(profilePath(account.handle));
    }
  }

  const busyImporting = parsingResume || importingGithub;
  const firstName = account.name.trim().split(/\s+/)[0] ?? "";

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
              disabled={!loaded || busyImporting}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              {parsingResume ? (
                <CircleNotchIcon aria-hidden="true" className="onboarding__spin" size={28} />
              ) : (
                <FileArrowUpIcon aria-hidden="true" size={28} />
              )}
              <span>
                <strong>
                  {parsingResume ? "Reading your resume…" : "Import from resume"}
                </strong>
                <small>PDF · read on your device, never uploaded</small>
              </span>
              <ArrowRightIcon aria-hidden="true" size={18} />
            </button>

            <button
              className="onboarding__import"
              disabled={!loaded || busyImporting || connections.pending !== null}
              onClick={() => void importFromGithub()}
              type="button"
            >
              {importingGithub || connections.pending === "github" ? (
                <CircleNotchIcon aria-hidden="true" className="onboarding__spin" size={28} />
              ) : (
                <GithubLogoIcon aria-hidden="true" size={28} />
              )}
              <span>
                <strong>
                  {connections.pending === "github"
                    ? "Opening GitHub…"
                    : importingGithub
                      ? "Importing from GitHub…"
                      : "Import from GitHub"}
                </strong>
                <small>Verify your handle and feature your best repositories</small>
              </span>
              <ArrowRightIcon aria-hidden="true" size={18} />
            </button>
          </div>

          {importError ? (
            <p className="onboarding__error" role="alert">
              {importError}
            </p>
          ) : null}

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
              {githubImported && draft.person.github ? (
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
                  onChange={(event) => patchPerson({ name: event.target.value })}
                  value={draft.person.name}
                />
              </label>
              <label>
                Headline
                <input
                  maxLength={300}
                  onChange={(event) => patchPerson({ role: event.target.value })}
                  placeholder="What you do, in one line"
                  value={draft.person.role}
                />
              </label>
              <label>
                Location
                <input
                  maxLength={300}
                  onChange={(event) =>
                    patchPerson({ location: event.target.value })
                  }
                  value={draft.person.location}
                />
              </label>
              <label>
                Website
                <input
                  maxLength={2000}
                  onChange={(event) =>
                    patchPerson({
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
                    patchPerson({ summary: event.target.value })
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
                    onClick={() => removeSkill(skill)}
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
                      onClick={() => removeFrom("experience", entry.id)}
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
                              patchEducation(entry.id, {
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
                              const value = event.target.value.replace(/\D/g, "");
                              patchEducation(entry.id, {
                                end: value === "" ? undefined : value,
                              });
                            }}
                            placeholder="Present"
                            value={entry.end ?? ""}
                          />
                        </label>
                        <small>{yearRange(entry.start || "?", entry.end)}</small>
                      </span>
                    </div>
                    <button
                      aria-label={`Remove ${entry.school}`}
                      onClick={() => removeFrom("education", entry.id)}
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
                      onClick={() => removeFrom("certifications", entry.id)}
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
                      onClick={() => removeFrom("otherExperience", entry.id)}
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
            {githubImported && draft.person.github ? (
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
                          onClick={() => removeProject(project.id)}
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
                  disabled={importingGithub || connections.pending !== null}
                  onClick={() => void importFromGithub()}
                  type="button"
                >
                  <GithubLogoIcon aria-hidden="true" size={18} weight="bold" />
                  {connections.pending === "github"
                    ? "Opening GitHub…"
                    : importingGithub
                      ? "Importing…"
                      : "Connect GitHub"}
                </button>
              </>
            )}
          </section>

          {importError ? (
            <p className="onboarding__error" role="alert">
              {importError}
            </p>
          ) : null}
          {saveBlocker || saveError ? (
            <p className="onboarding__error" role="alert">
              {saveBlocker || saveError}
            </p>
          ) : null}

          <footer className="onboarding__actions">
            <button
              className="onboarding__import-more"
              disabled={busyImporting}
              onClick={() => fileInputRef.current?.click()}
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
              onClick={() => void saveDraft()}
              type="button"
            >
              {saving ? "Saving…" : "Save your profile"}
            </button>
          </footer>
        </main>
      )}

      <input
        accept="application/pdf,.pdf"
        hidden
        onChange={onResumeChosen}
        ref={fileInputRef}
        type="file"
      />
    </div>
  );
}
