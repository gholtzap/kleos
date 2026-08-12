import { useUser } from "@clerk/react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  GitForkIcon,
  SealCheckIcon,
  StarIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  compareReposByProminence,
  featuredProjectFromRepo,
  featuredProjectId,
  fetchGithubRepos,
  MAX_FEATURED_PROJECTS,
  normalizeGithubAccount,
  type GithubRepo,
} from "../github";
import type { FeaturedProject } from "../types";
import "./github-projects-dialog.css";

type RepoResource =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; repos: GithubRepo[] }
  | { status: "error"; message: string };

interface GithubProjectsDialogProps {
  github: string;
  verifiedGithub?: string;
  projects: readonly FeaturedProject[];
  saving: boolean;
  saveError: string;
  onCancel: () => void;
  onSave: (github: string, projects: FeaturedProject[]) => void;
}

export function GithubProjectsDialog({
  github,
  verifiedGithub,
  projects,
  saving,
  saveError,
  onCancel,
  onSave,
}: GithubProjectsDialogProps) {
  const { user } = useUser();
  const [account, setAccount] = useState(verifiedGithub ?? github);
  const [resource, setResource] = useState<RepoResource>({ status: "idle" });
  const [selected, setSelected] = useState<readonly FeaturedProject[]>(projects);
  const [formError, setFormError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function verifyWithGithub() {
    if (!user || verifying) return;
    setVerifying(true);
    setFormError("");
    try {
      const external = await user.createExternalAccount({
        strategy: "oauth_github",
        redirectUrl: window.location.href,
      });
      const redirect = external.verification?.externalVerificationRedirectURL;
      if (!redirect) throw new Error("Missing verification redirect.");
      window.location.href = redirect.toString();
    } catch {
      setFormError(
        "Could not start GitHub verification. The GitHub connection may not be enabled for this app yet.",
      );
      setVerifying(false);
    }
  }

  function loadRepos(value: string) {
    const normalized = normalizeGithubAccount(value);
    if (!normalized) {
      setResource({ status: "error", message: "Enter a valid GitHub username." });
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setResource({ status: "loading" });
    fetchGithubRepos(normalized, controller.signal)
      .then((repos) => {
        if (controller.signal.aborted) return;
        setResource({ status: "ready", repos: repos.sort(compareReposByProminence) });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResource({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not load repositories from GitHub.",
        });
      });
  }

  useEffect(() => {
    const initial = verifiedGithub ?? github;
    if (normalizeGithubAccount(initial)) loadRepos(initial);
    return () => abortRef.current?.abort();
    // Load once for the account the dialog opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleRepo(repo: GithubRepo) {
    setFormError("");
    const id = featuredProjectId(repo.owner, repo.name);
    setSelected((current) => {
      if (current.some((project) => project.id === id)) {
        return current.filter((project) => project.id !== id);
      }
      if (current.length >= MAX_FEATURED_PROJECTS) {
        setFormError(`You can feature up to ${MAX_FEATURED_PROJECTS} projects.`);
        return current;
      }
      return [
        ...current,
        featuredProjectFromRepo(repo, new Date().toISOString()),
      ];
    });
  }

  function removeProject(id: string) {
    setFormError("");
    setSelected((current) => current.filter((project) => project.id !== id));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = account.trim();
    const normalized = trimmed ? normalizeGithubAccount(trimmed) : null;
    if (trimmed && !normalized) {
      setFormError("Enter a valid GitHub username.");
      return;
    }
    onSave(normalized ?? "", [...selected]);
  }

  const error = formError || saveError;
  const selectedIds = new Set(selected.map((project) => project.id));

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="github-projects__overlay" />
        <Dialog.Content className="github-projects__dialog">
          <header className="github-projects__header">
            <Dialog.Close aria-label="Close featured projects" type="button">
              <XIcon aria-hidden="true" size={20} />
            </Dialog.Close>
            <Dialog.Title>Featured projects</Dialog.Title>
            <button disabled={saving} form="github-projects-form" type="submit">
              {saving ? "Saving…" : "Save"}
            </button>
          </header>

          <Dialog.Description className="github-projects__description">
            Plug in your GitHub and pick up to {MAX_FEATURED_PROJECTS} projects
            to feature on your profile.
          </Dialog.Description>

          <form
            className="github-projects__form"
            id="github-projects-form"
            onSubmit={submit}
          >
            <div className="github-projects__account">
              <label htmlFor="github-projects-account">
                <span>GitHub username</span>
                <input
                  autoComplete="off"
                  disabled={Boolean(verifiedGithub)}
                  id="github-projects-account"
                  maxLength={40}
                  onChange={(event) => setAccount(event.currentTarget.value)}
                  placeholder="octocat"
                  spellCheck={false}
                  type="text"
                  value={account}
                />
              </label>
              <button
                disabled={resource.status === "loading"}
                onClick={() => loadRepos(account)}
                type="button"
              >
                {resource.status === "loading" ? "Loading…" : "Load repositories"}
              </button>
            </div>
            {verifiedGithub ? (
              <p className="github-projects__verified">
                <SealCheckIcon aria-hidden="true" size={16} weight="fill" />
                Verified through your linked GitHub account.
              </p>
            ) : (
              <button
                className="github-projects__verify"
                disabled={verifying}
                onClick={() => void verifyWithGithub()}
                type="button"
              >
                <SealCheckIcon aria-hidden="true" size={16} />
                {verifying
                  ? "Opening GitHub…"
                  : "Verify ownership by connecting your GitHub account"}
              </button>
            )}

            {error ? (
              <p className="github-projects__error" role="alert">
                {error}
              </p>
            ) : null}

            {selected.length ? (
              <div className="github-projects__selected">
                <h3>
                  Featured · {selected.length}/{MAX_FEATURED_PROJECTS}
                </h3>
                <ul>
                  {selected.map((project) => (
                    <li key={project.id}>
                      {project.owner}/{project.name}
                      <button
                        aria-label={`Remove ${project.owner}/${project.name}`}
                        onClick={() => removeProject(project.id)}
                        type="button"
                      >
                        <XIcon aria-hidden="true" size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {resource.status === "error" ? (
              <p className="github-projects__error" role="alert">
                {resource.message}
              </p>
            ) : null}

            {resource.status === "ready" ? (
              <ul className="github-projects__repos">
                {resource.repos.length === 0 ? (
                  <li className="github-projects__empty">
                    No public repositories found for this account.
                  </li>
                ) : null}
                {resource.repos.map((repo) => {
                  const id = featuredProjectId(repo.owner, repo.name);
                  return (
                    <li key={id}>
                      <label className="github-projects__repo">
                        <input
                          checked={selectedIds.has(id)}
                          onChange={() => toggleRepo(repo)}
                          type="checkbox"
                        />
                        <span className="github-projects__repo-body">
                          <span className="github-projects__repo-name">
                            {repo.name}
                            {repo.isFork ? <em>fork</em> : null}
                            {repo.isArchived ? <em>archived</em> : null}
                          </span>
                          {repo.description ? (
                            <span className="github-projects__repo-description">
                              {repo.description}
                            </span>
                          ) : null}
                        </span>
                        <span className="github-projects__repo-meta">
                          <span aria-label={`${repo.stars} stars`}>
                            <StarIcon aria-hidden="true" size={13} weight="fill" />
                            {repo.stars}
                          </span>
                          <span aria-label={`${repo.forks} forks`}>
                            <GitForkIcon aria-hidden="true" size={13} />
                            {repo.forks}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
