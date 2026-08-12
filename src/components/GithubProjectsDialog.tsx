import { useUser } from "@clerk/react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  GitForkIcon,
  GithubLogoIcon,
  SealCheckIcon,
  StarIcon,
  XIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { appColors } from "../app-tokens.stylex";
import {
  compareReposByProminence,
  featuredProjectFromRepo,
  featuredProjectId,
  fetchGithubRepos,
  MAX_FEATURED_PROJECTS,
  type GithubRepo,
} from "../github";
import type { FeaturedProject } from "../types";
import { dialogStyles } from "./dialog-styles";

const MOBILE = "@media (max-width: 480px)";

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
  const [resource, setResource] = useState<RepoResource>({ status: "idle" });
  const [selected, setSelected] = useState<readonly FeaturedProject[]>(projects);
  const [formError, setFormError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function loadRepos(account: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setResource({ status: "loading" });
    fetchGithubRepos(account, controller.signal)
      .then((repos) => {
        if (controller.signal.aborted) return;
        setResource({
          status: "ready",
          repos: repos.sort(compareReposByProminence),
        });
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
    if (verifiedGithub) loadRepos(verifiedGithub);
    return () => abortRef.current?.abort();
    // Load once for the verified account the dialog opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!verifiedGithub) return;
    onSave(verifiedGithub, [...selected]);
  }

  function disconnect() {
    onSave("", []);
  }

  const error = formError || saveError;
  const selectedIds = new Set(selected.map((project) => project.id));

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay {...stylex.props(dialogStyles.overlay)} />
        <Dialog.Content {...stylex.props(dialogStyles.dialog, styles.dialog)}>
          <header {...stylex.props(dialogStyles.header, styles.header)}>
            <Dialog.Close
              {...stylex.props(dialogStyles.primaryButton, dialogStyles.closeButton, dialogStyles.focusRing)}
              aria-label="Close featured projects"
              type="button"
            >
              <XIcon aria-hidden="true" size={20} />
            </Dialog.Close>
            <Dialog.Title {...stylex.props(dialogStyles.title, styles.title)}>Featured projects</Dialog.Title>
            <button
              {...stylex.props(dialogStyles.primaryButton, dialogStyles.focusRing, styles.saveButton)}
              disabled={saving || !verifiedGithub}
              form="github-projects-form"
              type="submit"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </header>

          <Dialog.Description {...stylex.props(styles.description)}>
            {verifiedGithub
              ? `Pick up to ${MAX_FEATURED_PROJECTS} projects to feature on your profile.`
              : "Connect your GitHub account to feature your projects on your profile."}
          </Dialog.Description>

          <form
            {...stylex.props(styles.form)}
            id="github-projects-form"
            onSubmit={submit}
          >
            {verifiedGithub ? (
              <p {...stylex.props(styles.verified)}>
                <SealCheckIcon aria-hidden="true" size={16} weight="fill" />
                @{verifiedGithub} · verified through your linked GitHub
                account.
              </p>
            ) : (
              <button
                {...stylex.props(styles.connect, dialogStyles.focusRing)}
                disabled={verifying}
                onClick={() => void verifyWithGithub()}
                type="button"
              >
                <GithubLogoIcon aria-hidden="true" size={18} weight="bold" />
                {verifying ? "Opening GitHub…" : "Connect your GitHub account"}
              </button>
            )}

            {error ? (
              <p {...stylex.props(styles.error)} role="alert">
                {error}
              </p>
            ) : null}

            {verifiedGithub && selected.length ? (
              <div>
                <h3 {...stylex.props(styles.selectedHeading)}>
                  Featured · {selected.length}/{MAX_FEATURED_PROJECTS}
                </h3>
                <ul {...stylex.props(styles.selectedList)}>
                  {selected.map((project) => (
                    <li {...stylex.props(styles.selectedItem)} key={project.id}>
                      {project.owner}/{project.name}
                      <button
                        {...stylex.props(styles.removeButton)}
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

            {verifiedGithub && resource.status === "loading" ? (
              <p {...stylex.props(styles.empty)}>Loading repositories…</p>
            ) : null}

            {verifiedGithub && resource.status === "error" ? (
              <p {...stylex.props(styles.error)} role="alert">
                {resource.message}{" "}
                <button
                  {...stylex.props(styles.retry)}
                  onClick={() => loadRepos(verifiedGithub)}
                  type="button"
                >
                  Retry
                </button>
              </p>
            ) : null}

            {verifiedGithub && resource.status === "ready" ? (
              <ul {...stylex.props(styles.repos)}>
                {resource.repos.length === 0 ? (
                  <li {...stylex.props(styles.empty)}>
                    No public repositories found for this account.
                  </li>
                ) : null}
                {resource.repos.map((repo, index) => {
                  const id = featuredProjectId(repo.owner, repo.name);
                  return (
                    <li {...stylex.props(index > 0 && styles.repoItemBorder)} key={id}>
                      <label {...stylex.props(styles.repo)}>
                        <input
                          {...stylex.props(styles.checkbox)}
                          checked={selectedIds.has(id)}
                          onChange={() => toggleRepo(repo)}
                          type="checkbox"
                        />
                        <span {...stylex.props(styles.repoBody)}>
                          <span {...stylex.props(styles.repoName)}>
                            {repo.name}
                            {repo.isFork ? <em {...stylex.props(styles.repoBadge)}>fork</em> : null}
                            {repo.isArchived ? <em {...stylex.props(styles.repoBadge)}>archived</em> : null}
                          </span>
                          {repo.description ? (
                            <span {...stylex.props(styles.repoDescription)}>
                              {repo.description}
                            </span>
                          ) : null}
                        </span>
                        <span {...stylex.props(styles.repoMeta)}>
                          <span {...stylex.props(styles.repoMetaItem)} aria-label={`${repo.stars} stars`}>
                            <StarIcon aria-hidden="true" size={13} weight="fill" />
                            {repo.stars}
                          </span>
                          <span {...stylex.props(styles.repoMetaItem)} aria-label={`${repo.forks} forks`}>
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

            {github ? (
              <button
                {...stylex.props(styles.disconnect)}
                disabled={saving}
                onClick={disconnect}
                type="button"
              >
                Disconnect GitHub and remove featured projects
              </button>
            ) : null}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const styles = stylex.create({
  dialog: {
    display: "flex",
    width: { default: "min(600px, calc(100% - 32px))", [MOBILE]: "100%" },
    maxHeight: { default: "min(720px, calc(100dvh - 32px))", [MOBILE]: "100dvh" },
    height: { default: "auto", [MOBILE]: "100dvh" },
    flexDirection: "column",
    top: { default: "50%", [MOBILE]: 0 },
    left: { default: "50%", [MOBILE]: 0 },
    borderLeftWidth: { default: 1, [MOBILE]: 0 },
    borderRightWidth: { default: 1, [MOBILE]: 0 },
    borderRadius: { default: 16, [MOBILE]: 0 },
    transform: { default: "translate(-50%, -50%)", [MOBILE]: "none" },
  },
  header: {
    position: "sticky",
    zIndex: 1,
    top: 0,
    flexShrink: 0,
    gridTemplateColumns: { default: "36px 1fr auto", [MOBILE]: "36px minmax(0, 1fr) auto" },
    backgroundColor: "rgb(0 0 0 / 85%)",
    backdropFilter: "blur(12px)",
  },
  title: {
    overflow: { default: "visible", [MOBILE]: "hidden" },
    textOverflow: { default: "clip", [MOBILE]: "ellipsis" },
    whiteSpace: { default: "normal", [MOBILE]: "nowrap" },
  },
  saveButton: { paddingInline: { default: 16, [MOBILE]: 12 } },
  description: { paddingBlockStart: 16, paddingInline: 16, margin: 0, color: appColors.muted },
  form: { display: "flex", padding: 16, flexDirection: "column", gap: 14 },
  verified: {
    display: "flex",
    margin: 0,
    alignItems: "center",
    gap: 6,
    color: appColors.green,
    fontSize: 13,
  },
  connect: {
    display: "inline-flex",
    minHeight: 44,
    paddingInline: 20,
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 10,
    color: "#0f1419",
    backgroundColor: { default: "#eff3f4", ":hover": "#d7dbdc" },
    borderWidth: 0,
    borderRadius: 9999,
    font: "inherit",
    fontWeight: 700,
    cursor: { default: "pointer", ":disabled": "default" },
    opacity: { default: 1, ":disabled": 0.6 },
  },
  retry: {
    padding: 0,
    color: appColors.blue,
    backgroundColor: "transparent",
    borderWidth: 0,
    font: "inherit",
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: { default: "none", ":hover": "underline" },
  },
  disconnect: {
    padding: 0,
    alignSelf: "flex-start",
    color: "#f4212e",
    backgroundColor: "transparent",
    borderWidth: 0,
    font: "inherit",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: { default: "none", ":hover": "underline" },
    opacity: { default: 1, ":disabled": 0.6 },
  },
  error: { margin: 0, color: "#f4212e", fontSize: 14 },
  selectedHeading: {
    marginBlockStart: 0,
    marginBlockEnd: 8,
    color: appColors.muted,
    fontSize: 13,
    fontWeight: 600,
  },
  selectedList: { display: "flex", padding: 0, margin: 0, flexWrap: "wrap", gap: 8, listStyle: "none" },
  selectedItem: {
    display: "inline-flex",
    paddingBlock: 4,
    paddingLeft: 12,
    paddingRight: 6,
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgb(29 155 240 / 10%)",
    color: appColors.blue,
    borderRadius: 9999,
    fontSize: 13,
    fontWeight: 600,
    overflowWrap: "anywhere",
  },
  removeButton: {
    display: "grid",
    width: 28,
    height: 28,
    flex: "0 0 28px",
    padding: 0,
    color: "inherit",
    backgroundColor: { default: "transparent", ":hover": "rgb(29 155 240 / 20%)" },
    borderWidth: 0,
    borderRadius: "50%",
    cursor: "pointer",
    placeItems: "center",
  },
  repos: {
    display: "flex",
    padding: 0,
    margin: 0,
    flexDirection: "column",
    listStyle: "none",
    borderColor: appColors.border,
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 12,
  },
  repoItemBorder: { borderTopColor: appColors.border, borderTopStyle: "solid", borderTopWidth: 1 },
  empty: { padding: 16, color: appColors.muted },
  repo: {
    display: { default: "flex", [MOBILE]: "grid" },
    paddingBlock: 12,
    paddingInline: 14,
    alignItems: "flex-start",
    gap: 12,
    gridTemplateColumns: { default: "none", [MOBILE]: "18px minmax(0, 1fr)" },
    cursor: "pointer",
    backgroundColor: { default: "transparent", ":hover": "rgb(239 243 244 / 3%)" },
  },
  checkbox: {
    width: 18,
    height: 18,
    marginBlockStart: 2,
    marginBlockEnd: 0,
    marginInline: 0,
    accentColor: appColors.blue,
    cursor: "pointer",
  },
  repoBody: { display: "flex", flex: 1, minWidth: 0, flexDirection: "column", gap: 2 },
  repoName: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, fontWeight: 700 },
  repoBadge: {
    paddingBlock: 1,
    paddingInline: 8,
    color: appColors.muted,
    borderColor: appColors.border,
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 9999,
    fontSize: 12,
    fontStyle: "normal",
  },
  repoDescription: {
    display: "-webkit-box",
    overflow: "hidden",
    color: appColors.muted,
    fontSize: 13,
    lineHeight: "18px",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
  },
  repoMeta: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    gap: 12,
    color: appColors.muted,
    fontSize: 13,
    gridColumn: { default: "auto", [MOBILE]: 2 },
  },
  repoMetaItem: { display: "inline-flex", alignItems: "center", gap: 4 },
});
