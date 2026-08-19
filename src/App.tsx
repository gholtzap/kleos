import { SignIn, SignUp } from "@clerk/react";
import { useEffect, useState, type ComponentProps } from "react";
import { authPageFromPath, type SharedRoute } from "./lib/lib";
import { getPublicProfile, getPublicProfileByHandle } from "./lib/public-profile";
import { getReviewBundle } from "./lib/review-links";
import { githubRepoUrl } from "./lib/github";
import {
  compareExperience,
  experiencePeriod,
  yearRange,
} from "./lib/profile-sections";
import { claimState } from "./lib/kleos";
import type { KleosRecord } from "./types";

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

export default function App({ sharedRoute }: { sharedRoute?: SharedRoute }) {
  if (sharedRoute) return <SharedKleosPage route={sharedRoute} />;

  const authPage = authPageFromPath(window.location.pathname);
  if (authPage) {
    return (
      <main className="kleos-auth-shell">
        <a className="kleos-wordmark" href="/">Kleos</a>
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

function KleosLogo() {
  return (
    <span aria-label="Kleos" className="kleos-landing-logo" role="img">
      <span aria-hidden="true" className="kleos-landing-logo-mark">
        <span />
        <span />
        <span />
      </span>
      <span>Kleos</span>
    </span>
  );
}

function KleosLanding() {
  return (
    <div className="kleos-landing">
      <section
        aria-label="A professional profile being assembled"
        className="kleos-landing-visual"
      >
        <div className="kleos-landing-visual-header">
          <KleosLogo />
        </div>
        <footer className="kleos-landing-copyright">© 2026 Kleos</footer>
      </section>

      <main className="kleos-landing-panel">
        <header className="kleos-landing-panel-header">
          <KleosLogo />
        </header>

        <div className="kleos-signup-prompt">
          <h1>Professional profiles built on evidence.</h1>

          <div className="kleos-signup-card">
            <h2>Join Kleos today.</h2>
            <a
              className="kleos-landing-button kleos-landing-button-primary"
              href="/sign-up"
            >
              Create your account
            </a>
          </div>

          <div className="kleos-signin-prompt">
            <span>Already have an account?</span>
            <a
              className="kleos-landing-button kleos-landing-button-outline"
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

function SharedKleosPage({ route }: { route: SharedRoute }) {
  const [record, setRecord] = useState<KleosRecord | null>(null);
  const [error, setError] = useState("");
  const profileId = route.kind === "profile-id" ? route.profileId : undefined;
  const profileHandle =
    route.kind === "profile-handle" ? route.profileHandle : undefined;
  const revision = route.kind === "profile-id" ? route.revision : undefined;
  const reviewToken = route.kind === "review" ? route.reviewToken : undefined;

  useEffect(() => {
    const controller = new AbortController();
    setRecord(null);
    setError("");
    const request = reviewToken
      ? getReviewBundle(reviewToken, controller.signal).then((bundle) => bundle.record)
      : profileHandle
        ? getPublicProfileByHandle(profileHandle, controller.signal)
      : profileId
        ? getPublicProfile(profileId, revision, controller.signal)
        : Promise.reject(new Error("Missing shared Kleos reference."));
    void request
      .then(setRecord)
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        setError("This shared Kleos profile is unavailable.");
      });
    return () => controller.abort();
  }, [profileHandle, profileId, reviewToken, revision]);

  return (
    <main className="kleos-shared-shell">
      <header>
        <a className="kleos-wordmark" href="/">Kleos</a>
        <a className="kleos-action" href="/sign-up">Create your Kleos profile</a>
      </header>
      {error ? <p className="kleos-message" role="alert">{error}</p> : null}
      {!error && !record ? <p className="kleos-message">Loading Kleos…</p> : null}
      {record ? <KleosRecordView record={record} /> : null}
    </main>
  );
}

function KleosRecordView({ record }: { record: KleosRecord }) {
  return (
    <article className="kleos-record">
      <header className="kleos-profile-heading">
        <span className="kleos-avatar" aria-hidden="true">{record.person.initials}</span>
        <div>
          <h1>{record.person.name}</h1>
          <p>{record.person.role}</p>
          {record.person.summary ? <p>{record.person.summary}</p> : null}
        </div>
      </header>
      <section aria-labelledby="shared-work-heading">
        <h2 id="shared-work-heading">Selected work</h2>
        <div className="kleos-claims">
          {record.claims.map((claim) => (
            <article className="kleos-claim" key={claim.id}>
              <header>
                <h3>{claim.title}</h3>
                <span>{claimState(claim)}</span>
              </header>
              <p>{claim.contribution}</p>
              <p><strong>Outcome:</strong> {claim.outcome}</p>
              {claim.evidence.length ? (
                <ul>
                  {claim.evidence.map((evidence) => (
                    <li key={evidence.id}>
                      <strong>{evidence.title}</strong>
                      {evidence.detail ? <p>{evidence.detail}</p> : null}
                      {evidence.sourceUrl ? (
                        <a href={evidence.sourceUrl} rel="noreferrer" target="_blank">
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
        <section aria-labelledby="shared-projects-heading">
          <h2 id="shared-projects-heading">Pinned projects</h2>
          <div className="kleos-claims">
            {record.projects.map((project) => (
              <article className="kleos-claim" key={project.id}>
                <header>
                  <h3>
                    <a
                      href={githubRepoUrl(project)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {project.owner}/{project.name}
                    </a>
                  </h3>
                  <span>
                    {project.language ? `${project.language} · ` : ""}
                    ★ {project.stars}
                  </span>
                </header>
                {project.description ? <p>{project.description}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {record.experience.length ? (
        <section aria-labelledby="shared-experience-heading">
          <h2 id="shared-experience-heading">Experience</h2>
          <div className="kleos-claims">
            {[...record.experience].sort(compareExperience).map((entry) => (
              <article className="kleos-claim" key={entry.id}>
                <header>
                  <h3>{entry.title}</h3>
                  <span>{experiencePeriod(entry, new Date())}</span>
                </header>
                <p>
                  <strong>{entry.organization}</strong>
                  {entry.location ? ` · ${entry.location}` : ""}
                </p>
                {entry.highlights.length ? (
                  <ul>
                    {entry.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {record.education.length ? (
        <section aria-labelledby="shared-education-heading">
          <h2 id="shared-education-heading">Education</h2>
          <div className="kleos-claims">
            {record.education.map((entry) => (
              <article className="kleos-claim" key={entry.id}>
                <header>
                  <h3>{entry.school}</h3>
                  <span>{yearRange(entry.start, entry.end)}</span>
                </header>
                <p>{entry.degree}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {record.certifications.length ? (
        <section aria-labelledby="shared-certifications-heading">
          <h2 id="shared-certifications-heading">Certifications</h2>
          <div className="kleos-claims">
            {record.certifications.map((entry) => (
              <article className="kleos-claim" key={entry.id}>
                <header>
                  <h3>{entry.name}</h3>
                  <span>
                    {entry.expires === undefined
                      ? `Issued ${entry.issued}`
                      : `Issued ${entry.issued} · Expires ${entry.expires}`}
                  </span>
                </header>
                <p>{entry.issuer}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {record.otherExperience.length ? (
        <section aria-labelledby="shared-other-heading">
          <h2 id="shared-other-heading">Other experience</h2>
          <div className="kleos-claims">
            {record.otherExperience.map((entry) => (
              <article className="kleos-claim" key={entry.id}>
                <header>
                  <h3>{entry.title}</h3>
                  <span>{entry.period}</span>
                </header>
                {entry.detail ? <p>{entry.detail}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
