import { useAuth } from "@clerk/react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
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
import { validYear } from "../profile-sections";
import type { ResumeImport } from "../resume-import";
import { MAX_RESUME_BYTES, resumeImportFromPdf } from "../resume-pdf";
import type { EducationEntry, KleosRecord, Person } from "../types";
import type { AccountIdentity } from "../types/profile";
import {
  OnboardingView,
  type OnboardingEntrySection,
} from "./OnboardingView";
import { useAccountConnections } from "./use-account-connections";
import { useProfileRecord } from "./use-profile-record";

interface OnboardingPageProps {
  account: AccountIdentity;
}

/**
 * The screen a new member lands on after signing up. Its whole job is a fast
 * first profile: import from a resume or GitHub, review what arrived, save.
 * Both imports are deterministic — the review shows exactly what the source
 * states — and nothing persists until the member saves.
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
  const [returnedProvider, setReturnedProvider] = useState(() =>
    connectedProviderFromSearch(window.location.search),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { base, loaded, saving, saveError } = profile;

  function applyResumeImport(imported: ResumeImport, fileName: string) {
    setDraft((current) => recordWithResumeImport(current ?? base, imported));
    setResumeFileName(fileName);
    setResumeGithub(imported.githubUsername ?? "");
  }

  async function importResume(file: File) {
    setImportError("");
    setSaveBlocker("");
    if (file.size > MAX_RESUME_BYTES) {
      setImportError("That PDF is over 10 MB. Export a smaller copy.");
      return;
    }
    setParsingResume(true);
    try {
      const imported = await resumeImportFromPdf(await file.arrayBuffer());
      applyResumeImport(imported, file.name);
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
    setSaveBlocker("");
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

  function patchPerson(updates: Partial<Person>) {
    patchDraft((current) => ({
      ...current,
      person: { ...current.person, ...updates },
    }));
  }

  function removeEntry(section: OnboardingEntrySection, id: string) {
    patchDraft((current) => ({
      ...current,
      [section]: current[section].filter((entry) => entry.id !== id),
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

  function addSkill(value: string) {
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
      if (
        entry.end !== undefined &&
        (!validYear(entry.end) || entry.end < entry.start)
      ) {
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

  return (
    <>
      <OnboardingView
        connectingGithub={connections.pending === "github"}
        draft={draft}
        error={importError || saveBlocker || saveError}
        firstName={account.name.trim().split(/\s+/)[0] ?? ""}
        importingGithub={importingGithub}
        onAddSkill={addSkill}
        onImportGithub={() => void importFromGithub()}
        onImportResume={() => fileInputRef.current?.click()}
        onPatchEducation={patchEducation}
        onPatchPerson={patchPerson}
        onRemoveEntry={removeEntry}
        onRemoveProject={removeProject}
        onRemoveSkill={removeSkill}
        onSave={() => void saveDraft()}
        parsingResume={parsingResume}
        ready={loaded}
        resumeFileName={resumeFileName}
        resumeGithub={resumeGithub}
        saving={saving}
      />
      <input
        accept="application/pdf,.pdf"
        hidden
        onChange={onResumeChosen}
        ref={fileInputRef}
        type="file"
      />
    </>
  );
}
