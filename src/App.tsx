import { SignIn, SignUp } from "@clerk/react";
import { useEffect, useState, type ComponentProps } from "react";
import { authPageFromPath } from "./lib";
import {
  getPublicProfile,
  publicProfileIdFromHash,
  publicProfileRevisionFromHash,
} from "./public-profile";
import { getReviewBundle, reviewTokenFromHash } from "./review-links";
import { claimState } from "./folio";
import type { FolioRecord } from "./types";
import { useLocationHash } from "./use-location-hash";

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
      <SharedFolioPage
        profileId={profileId}
        revision={publicProfileRevisionFromHash(hash)}
      />
    );
  }
  if (reviewToken) return <SharedFolioPage reviewToken={reviewToken} />;

  const authPage = authPageFromPath(window.location.pathname);
  if (authPage) {
    return (
      <main className="folio-auth-shell">
        <a className="folio-wordmark" href="/">Folio</a>
        {authPage === "sign-in" ? (
          <SignIn appearance={clerkAppearance} routing="path" path="/sign-in" />
        ) : (
          <SignUp appearance={clerkAppearance} routing="path" path="/sign-up" />
        )}
      </main>
    );
  }

  return (
    <main className="folio-landing">
      <a className="folio-wordmark" href="/">Folio</a>
      <div>
        <h1>Show the work behind your experience.</h1>
        <p>Build a clear professional profile from your work and results.</p>
        <nav aria-label="Account actions">
          <a className="folio-action folio-action-primary" href="/sign-up">
            Create your account
          </a>
          <a className="folio-action" href="/sign-in">Sign in</a>
        </nav>
      </div>
    </main>
  );
}

function SharedFolioPage({
  profileId,
  revision,
  reviewToken,
}: {
  profileId?: string;
  revision?: number;
  reviewToken?: string;
}) {
  const [record, setRecord] = useState<FolioRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setRecord(null);
    setError("");
    const request = reviewToken
      ? getReviewBundle(reviewToken, controller.signal).then((bundle) => bundle.record)
      : profileId
        ? getPublicProfile(profileId, revision, controller.signal)
        : Promise.reject(new Error("Missing shared Folio reference."));
    void request
      .then(setRecord)
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        setError("This shared Folio is unavailable.");
      });
    return () => controller.abort();
  }, [profileId, reviewToken, revision]);

  return (
    <main className="folio-shared-shell">
      <header>
        <a className="folio-wordmark" href="/">Folio</a>
        <a className="folio-action" href="/sign-up">Create your Folio</a>
      </header>
      {error ? <p className="folio-message" role="alert">{error}</p> : null}
      {!error && !record ? <p className="folio-message">Loading Folio…</p> : null}
      {record ? <FolioRecordView record={record} /> : null}
    </main>
  );
}

function FolioRecordView({ record }: { record: FolioRecord }) {
  return (
    <article className="folio-record">
      <header className="folio-profile-heading">
        <span className="folio-avatar" aria-hidden="true">{record.person.initials}</span>
        <div>
          <h1>{record.person.name}</h1>
          <p>{record.person.role}</p>
          {record.person.summary ? <p>{record.person.summary}</p> : null}
        </div>
      </header>
      <section aria-labelledby="shared-work-heading">
        <h2 id="shared-work-heading">Selected work</h2>
        <div className="folio-claims">
          {record.claims.map((claim) => (
            <article className="folio-claim" key={claim.id}>
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
    </article>
  );
}
