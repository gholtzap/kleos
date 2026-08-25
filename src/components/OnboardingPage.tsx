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
  normalizeOnboardingDraft,
  onboardingDraftProblem,
  recordWithGithubImport,
  recordWithResumeImport,
} from "../onboarding";
import { resumeImportFromFile } from "../resume-pdf";
import type { AccountIdentity } from "../types/profile";
import { OnboardingView } from "./OnboardingView";
import { useAccountConnections } from "./use-account-connections";
import { useOnboardingDraft } from "./use-onboarding-draft";
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
  const store = useOnboardingDraft(() => setSaveBlocker(""));

  const { base, loaded, saving, saveError } = profile;
  const { draft } = store;

  async function importResume(file: File) {
    setImportError("");
    setParsingResume(true);
    const result = await resumeImportFromFile(file);
    setParsingResume(false);
    if (result.problem !== undefined) {
      setImportError(result.problem);
      return;
    }
    store.applyImport((current) =>
      recordWithResumeImport(current ?? base, result.imported),
    );
    setResumeFileName(file.name);
    setResumeGithub(result.imported.githubUsername ?? "");
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
      store.applyImport((current) =>
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

  async function saveDraft() {
    if (draft === null) return;
    const normalized = normalizeOnboardingDraft(draft);
    const problem = onboardingDraftProblem(normalized);
    if (problem !== null) {
      setSaveBlocker(problem);
      return;
    }
    if (await profile.save(normalized)) {
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
        onAddSkill={store.addSkill}
        onImportGithub={() => void importFromGithub()}
        onImportResume={() => fileInputRef.current?.click()}
        onPatchCertification={store.patchCertification}
        onPatchEducation={store.patchEducation}
        onPatchExperience={store.patchExperience}
        onPatchOther={store.patchOther}
        onPatchPerson={store.patchPerson}
        onRemoveEntry={store.removeEntry}
        onRemoveProject={store.removeProject}
        onRemoveSkill={store.removeSkill}
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
