import { SignIn, SignUp } from "@clerk/react";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { githubRepoUrl } from "./github";
import { claimState } from "./kleos";
import { authPageFromPath } from "./lib";
import {
  getPublicProfile,
  publicProfileIdFromHash,
  publicProfileRevisionFromHash,
} from "./public-profile";
import { getReviewBundle, reviewTokenFromHash } from "./review-links";
import type { KleosRecord } from "./types";
import { useLocationHash } from "./use-location-hash";

const TABLET = "@media (max-width: 900px)";
const MOBILE = "@media (max-width: 600px)";

const clerkAppearance = {
  variables: {
    colorPrimary: "#111111",
    colorBackground: "#ffffff",
    colorForeground: "#111111",
    colorMutedForeground: "#666666",
    borderRadius: "8px",
    fontFamily: '"Manrope Variable", sans-serif',
  },
  elements: {
    rootBox: { width: "100%" },
    cardBox: { width: "100%", boxShadow: "none" },
    card: { width: "100%", maxWidth: "420px", boxShadow: "none" },
  },
} satisfies NonNullable<ComponentProps<typeof SignIn>["appearance"]>;

export default function App() {
  const hash = useLocationHash();

  const profileId = publicProfileIdFromHash(hash);
  const reviewToken = reviewTokenFromHash(hash);
  if (profileId) {
    return (
      <SharedKleosPage
        profileId={profileId}
        revision={publicProfileRevisionFromHash(hash)}
      />
    );
  }
  if (reviewToken) return <SharedKleosPage reviewToken={reviewToken} />;

  const authPage = authPageFromPath(window.location.pathname);
  if (authPage) {
    return (
      <main {...stylex.props(styles.shell, styles.authShell)}>
        <a {...stylex.props(styles.wordmark)} href="/">Kleos</a>
        {authPage === "sign-in" ? (
          <SignIn appearance={clerkAppearance} routing="path" path="/sign-in" />
        ) : (
          <SignUp appearance={clerkAppearance} routing="path" path="/sign-up" />
        )}
      </main>
    );
  }

  return <KleosLanding />;
}

export function KleosMessage({ children, role }: { children: ReactNode; role?: "alert" }) {
  return <p {...stylex.props(styles.message)} role={role}>{children}</p>;
}

function KleosLogo({ showOnMobile = false }: { showOnMobile?: boolean }) {
  return (
    <span
      {...stylex.props(styles.landingLogo, showOnMobile && styles.mobileLandingLogo)}
      aria-label="Kleos"
      role="img"
    >
      <span {...stylex.props(styles.landingLogoMark)} aria-hidden="true">
        <span {...stylex.props(styles.landingLogoBar, styles.landingLogoBarShort)} />
        <span {...stylex.props(styles.landingLogoBar, styles.landingLogoBarMedium)} />
        <span {...stylex.props(styles.landingLogoBar, styles.landingLogoBarTall)} />
      </span>
      <span>Kleos</span>
    </span>
  );
}

function KleosLanding() {
  return (
    <div {...stylex.props(styles.landing)}>
      <section
        {...stylex.props(styles.landingVisual)}
        aria-label="A professional profile being assembled"
      >
        <div {...stylex.props(styles.landingVisualHeader)}>
          <KleosLogo />
        </div>
        <footer {...stylex.props(styles.landingCopyright)}>© 2026 Kleos</footer>
      </section>

      <main {...stylex.props(styles.landingPanel)}>
        <header {...stylex.props(styles.landingPanelHeader)}>
          <KleosLogo showOnMobile />
        </header>

        <div {...stylex.props(styles.signupPrompt)}>
          <h1 {...stylex.props(styles.signupHeading)}>Professional profiles built on evidence.</h1>

          <div {...stylex.props(styles.signupCard)}>
            <h2 {...stylex.props(styles.signupCardHeading)}>Join Kleos today.</h2>
            <a
              {...stylex.props(styles.landingButton, styles.primaryLandingButton)}
              href="/sign-up"
            >
              Create your account
            </a>
          </div>

          <div {...stylex.props(styles.signinPrompt)}>
            <span {...stylex.props(styles.signinCopy)}>Already have an account?</span>
            <a
              {...stylex.props(styles.landingButton, styles.outlineLandingButton)}
              href="/sign-in"
            >
              Sign in
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

function SharedKleosPage({
  profileId,
  revision,
  reviewToken,
}: {
  profileId?: string;
  revision?: number;
  reviewToken?: string;
}) {
  const [record, setRecord] = useState<KleosRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setRecord(null);
    setError("");
    const request = reviewToken
      ? getReviewBundle(reviewToken, controller.signal).then((bundle) => bundle.record)
      : profileId
        ? getPublicProfile(profileId, revision, controller.signal)
        : Promise.reject(new Error("Missing shared Kleos reference."));
    void request
      .then(setRecord)
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError("This shared Kleos profile is unavailable.");
      });
    return () => controller.abort();
  }, [profileId, reviewToken, revision]);

  return (
    <main {...stylex.props(styles.shell)}>
      <header {...stylex.props(styles.sharedHeader)}>
        <a {...stylex.props(styles.wordmark)} href="/">Kleos</a>
        <a {...stylex.props(styles.action)} href="/sign-up">Create your Kleos profile</a>
      </header>
      {error ? <KleosMessage role="alert">{error}</KleosMessage> : null}
      {!error && !record ? <KleosMessage>Loading Kleos…</KleosMessage> : null}
      {record ? <KleosRecordView record={record} /> : null}
    </main>
  );
}

function KleosRecordView({ record }: { record: KleosRecord }) {
  return (
    <article {...stylex.props(styles.record)}>
      <header {...stylex.props(styles.profileHeading)}>
        <span {...stylex.props(styles.avatar)} aria-hidden="true">{record.person.initials}</span>
        <div>
          <h1 {...stylex.props(styles.profileName)}>{record.person.name}</h1>
          <p {...stylex.props(styles.profileCopy)}>{record.person.role}</p>
          {record.person.summary ? (
            <p {...stylex.props(styles.profileCopy)}>{record.person.summary}</p>
          ) : null}
        </div>
      </header>
      <section {...stylex.props(styles.recordSection)} aria-labelledby="shared-work-heading">
        <h2 id="shared-work-heading">Selected work</h2>
        <div {...stylex.props(styles.claims)}>
          {record.claims.map((claim) => (
            <article {...stylex.props(styles.claim)} key={claim.id}>
              <header {...stylex.props(styles.claimHeader)}>
                <h3 {...stylex.props(styles.claimCopy)}>{claim.title}</h3>
                <span {...stylex.props(styles.claimState)}>{claimState(claim)}</span>
              </header>
              <p {...stylex.props(styles.claimCopy)}>{claim.contribution}</p>
              <p {...stylex.props(styles.claimCopy)}><strong>Outcome:</strong> {claim.outcome}</p>
              {claim.evidence.length ? (
                <ul {...stylex.props(styles.evidenceList)}>
                  {claim.evidence.map((evidence, index) => (
                    <li {...stylex.props(index > 0 && styles.evidenceItemSpacing)} key={evidence.id}>
                      <strong>{evidence.title}</strong>
                      {evidence.detail ? <p {...stylex.props(styles.claimCopy)}>{evidence.detail}</p> : null}
                      {evidence.sourceUrl ? (
                        <a
                          {...stylex.props(styles.evidenceLink)}
                          href={evidence.sourceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          View evidence
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>
      {record.projects.length ? (
        <section {...stylex.props(styles.recordSection)} aria-labelledby="shared-projects-heading">
          <h2 id="shared-projects-heading">Featured projects</h2>
          <div {...stylex.props(styles.claims)}>
            {record.projects.map((project) => (
              <article {...stylex.props(styles.claim)} key={project.id}>
                <header {...stylex.props(styles.claimHeader)}>
                  <h3 {...stylex.props(styles.claimCopy)}>
                    <a href={githubRepoUrl(project)} rel="noreferrer" target="_blank">
                      {project.owner}/{project.name}
                    </a>
                  </h3>
                  <span {...stylex.props(styles.claimState)}>
                    {project.language ? `${project.language} · ` : ""}
                    ★ {project.stars}
                  </span>
                </header>
                {project.description ? <p {...stylex.props(styles.claimCopy)}>{project.description}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

const riseIn = stylex.keyframes({
  from: { opacity: 0, transform: "translateY(18px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

const styles = stylex.create({
  wordmark: { width: "fit-content", fontSize: "1.25rem", fontWeight: 750, letterSpacing: "-0.04em" },
  shell: {
    width: "min(100% - 32px, 1040px)",
    minHeight: "100dvh",
    marginInline: "auto",
    paddingBlock: 32,
  },
  authShell: { display: "grid", maxWidth: 460, alignContent: "start", gap: 48 },
  sharedHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 28,
    borderBottomColor: "#ddddda",
    borderBottomStyle: "solid",
    borderBottomWidth: 1,
  },
  landing: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: { default: "minmax(0, 1.14fr) minmax(480px, 0.86fr)", [TABLET]: "1fr" },
    gridTemplateRows: { default: "none", [TABLET]: "minmax(300px, 38dvh) auto", [MOBILE]: "32dvh auto" },
    height: { default: "100dvh", [TABLET]: "auto" },
    minHeight: { default: 0, [TABLET]: "100dvh" },
    overflow: { default: "hidden", [TABLET]: "visible" },
    color: "#f7f7f2",
    backgroundImage: 'url("/kleos-bg-dithered.png")',
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundAttachment: { default: "fixed", [TABLET]: "scroll" },
    "::selection": { color: "#111", backgroundColor: "#f7f7f2" },
  },
  landingVisual: {
    position: "relative",
    display: "flex",
    height: { default: "100dvh", [TABLET]: "auto" },
    minHeight: { default: 0, [MOBILE]: 250 },
    padding: { default: "34px 42px", [TABLET]: 24 },
    color: "#fffefa",
    backgroundPosition: { default: "center", [TABLET]: "center 56%" },
  },
  landingVisualHeader: { position: "relative", zIndex: 1, display: { default: "block", [TABLET]: "none" } },
  landingLogo: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    color: "inherit",
    fontSize: 20,
    fontWeight: 760,
    letterSpacing: "-0.06em",
  },
  mobileLandingLogo: { display: { default: "none", [TABLET]: "inline-flex" } },
  landingLogoMark: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 6px)",
    alignItems: "end",
    gap: 2,
    height: 21,
  },
  landingLogoBar: {
    display: "block",
    width: 6,
    borderRadius: 1,
    backgroundColor: "currentColor",
    transform: "skewY(-12deg)",
  },
  landingLogoBarShort: { height: 10 },
  landingLogoBarMedium: { height: 16 },
  landingLogoBarTall: { height: 21 },
  landingCopyright: {
    position: "absolute",
    bottom: 20,
    left: { default: 42, [TABLET]: 24, [MOBILE]: 16 },
    color: "rgba(247, 247, 242, 0.5)",
    fontSize: 10,
  },
  landingPanel: {
    position: "relative",
    display: "grid",
    gridTemplateRows: { default: "auto minmax(0, 1fr)", [TABLET]: "auto auto" },
    height: { default: "100dvh", [TABLET]: "auto" },
    minHeight: { default: 0, [TABLET]: "62dvh", [MOBILE]: "68dvh" },
    color: "#f7f7f2",
    backgroundColor: "rgba(6, 8, 7, 0.68)",
    "::before": {
      position: "absolute",
      top: { default: 0, [TABLET]: -140 },
      right: { default: "auto", [TABLET]: 0 },
      bottom: { default: 0, [TABLET]: "auto" },
      left: { default: -220, [TABLET]: 0 },
      width: { default: 220, [TABLET]: "auto" },
      height: { default: "auto", [TABLET]: 140 },
      backgroundImage: {
        default: "linear-gradient(to right, transparent, rgba(6, 8, 7, 0.68))",
        [TABLET]: "linear-gradient(to bottom, transparent, rgba(6, 8, 7, 0.68))",
      },
      content: "",
      pointerEvents: "none",
    },
  },
  landingPanelHeader: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: { default: "flex-end", [TABLET]: "space-between" },
    minHeight: { default: 82, [TABLET]: 72 },
    paddingInline: { default: "clamp(28px, 4vw, 64px)", [TABLET]: 24, [MOBILE]: 16 },
  },
  signupPrompt: {
    position: "relative",
    zIndex: 1,
    width: {
      default: "min(520px, calc(100% - 80px))",
      [TABLET]: "min(560px, calc(100% - 48px))",
      [MOBILE]: "calc(100% - 32px)",
    },
    maxHeight: { default: "100%", [TABLET]: "none" },
    margin: "auto",
    paddingBlockStart: { default: 50, [TABLET]: 54, [MOBILE]: 40 },
    paddingBlockEnd: { default: 70, [TABLET]: 70, [MOBILE]: 58 },
    overflowY: { default: "auto", [TABLET]: "visible" },
    animationName: riseIn,
    animationDuration: "650ms",
    animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
    animationFillMode: "both",
  },
  signupHeading: {
    maxWidth: { default: 520, [MOBILE]: 400 },
    margin: 0,
    fontSize: { default: "clamp(39px, 3.87vw, 61px)", [TABLET]: "clamp(36px, 8vw, 52px)", [MOBILE]: 33 },
    fontWeight: 650,
    letterSpacing: "-0.07em",
    lineHeight: { default: 0.9, [MOBILE]: 0.94 },
  },
  signupCard: { marginTop: { default: "clamp(42px, 6vh, 72px)", [MOBILE]: 40 } },
  signupCardHeading: { marginBlockStart: 0, marginBlockEnd: 18, fontSize: 23, fontWeight: 680, letterSpacing: "-0.035em" },
  landingButton: {
    display: "inline-flex",
    width: { default: "min(100%, 380px)", [MOBILE]: "100%" },
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "transparent",
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 700,
    transitionProperty: "background-color, border-color, color, transform",
    transitionDuration: "180ms",
    transform: { default: "none", ":active": "translateY(1px) scale(0.985)" },
    outlineColor: { default: null, ":focus-visible": "rgba(255, 255, 255, 0.72)" },
  },
  primaryLandingButton: {
    minHeight: 52,
    color: "#111",
    backgroundColor: { default: "#f2f2ee", ":hover": "#fff" },
    boxShadow: { default: "none", ":hover": "inset 0 1px 0 rgba(255, 255, 255, 0.35)" },
  },
  signinPrompt: {
    display: "grid",
    gap: 12,
    width: { default: "min(100%, 380px)", [MOBILE]: "100%" },
    marginTop: 38,
    paddingTop: 28,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    borderTopStyle: "solid",
    borderTopWidth: 1,
  },
  signinCopy: { color: "rgba(247, 247, 242, 0.72)", fontSize: 13, fontWeight: 650 },
  outlineLandingButton: {
    color: { default: "#f7f7f2", ":hover": "#fff" },
    borderColor: { default: "rgba(255, 255, 255, 0.35)", ":hover": "rgba(255, 255, 255, 0.55)" },
    backgroundColor: { default: "rgba(6, 8, 7, 0.88)", ":hover": "rgba(255, 255, 255, 0.08)" },
  },
  action: {
    display: "inline-flex",
    minHeight: 42,
    paddingInline: 18,
    alignItems: "center",
    justifyContent: "center",
    borderColor: { default: "#c9c9c4", ":hover": "#777772", ":focus-visible": "#777772" },
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 999,
    backgroundColor: "#fff",
    fontSize: "0.875rem",
    fontWeight: 700,
  },
  message: { width: "min(100% - 32px, 1040px)", marginBlock: "20vh", marginInline: "auto", color: "#666662", textAlign: "center" },
  record: { paddingBlock: 64 },
  profileHeading: {
    display: "grid",
    gridTemplateColumns: { default: "auto 1fr", [MOBILE]: "1fr" },
    gap: 24,
    alignItems: "start",
  },
  profileName: { margin: 0, fontSize: "clamp(2.25rem, 6vw, 4.5rem)", lineHeight: 0.98, letterSpacing: "-0.06em" },
  profileCopy: { maxWidth: 680, color: "#60605c", lineHeight: 1.6 },
  avatar: { display: "grid", width: 64, height: 64, borderRadius: "50%", color: "#fff", backgroundColor: "#315f4c", fontWeight: 750, placeItems: "center" },
  recordSection: { marginTop: 72 },
  claims: { display: "grid", gap: 16 },
  claim: { padding: 24, borderColor: "#ddddda", borderStyle: "solid", borderWidth: 1, borderRadius: 12, backgroundColor: "#fff" },
  claimHeader: {
    display: "flex",
    alignItems: { default: "baseline", [MOBILE]: "flex-start" },
    justifyContent: "space-between",
    flexDirection: { default: "row", [MOBILE]: "column" },
    gap: 16,
  },
  claimCopy: { marginBlockStart: 0, marginBlockEnd: 12 },
  claimState: { color: "#315f4c", fontSize: "0.8125rem", fontWeight: 700 },
  evidenceList: { paddingBlockStart: 16, paddingInline: 0, paddingBlockEnd: 0, marginBlockStart: 16, marginBlockEnd: 0, borderTopColor: "#eeeeeb", borderTopStyle: "solid", borderTopWidth: 1, listStyle: "none" },
  evidenceItemSpacing: { marginTop: 16 },
  evidenceLink: { color: "#315f4c", textDecoration: "underline" },
});
