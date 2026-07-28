import {
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  CompassIcon,
  FileTextIcon,
  FolderLockIcon,
  HandshakeIcon,
  HouseIcon,
  InfoIcon,
  LinkIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PlusIcon,
  SealCheckIcon,
  ShieldCheckIcon,
  SparkleIcon,
  SunIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { UserButton, useAuth, useClerk, useUser } from "@clerk/react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  currentPerson,
  discoveryClaims,
  initialClaims,
  initialEvidence,
  initialRequests,
  people,
} from "./data";
import { emptyProfile, initials, parseCommaSeparatedList } from "./lib";
import {
  getPublicProfile,
  publicProfileHash,
  publicProfileIdFromHash,
  savePublicProfile,
} from "./public-profile";
import type {
  Claim,
  Evidence,
  IntroductionDraft,
  Ownership,
  Person,
  Profession,
  ProfessionalRequest,
  Route,
} from "./types";
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  DividerLabel,
  Field,
  PulseButton,
  Skeleton,
} from "./ui";

const routes: { id: Route; label: string; icon: typeof HouseIcon }[] = [
  { id: "profile", label: "Profile", icon: HouseIcon },
  { id: "vault", label: "Evidence vault", icon: FolderLockIcon },
  { id: "discover", label: "Discover", icon: CompassIcon },
  { id: "requests", label: "Requests", icon: HandshakeIcon },
];

const professionPrompts: Record<Profession, string> = {
  Engineering: "Name the system, your technical ownership, production scale, and reliability, performance, cost, or security outcome.",
  Product: "Name the problem you owned, decisions you made, what shipped, and the adoption or business outcome.",
  Design: "Name the research and design ownership, what shipped, and the usability, accessibility, or customer outcome.",
  Sales: "Name the customer segment, your sales-cycle ownership, deal complexity, and verified commercial outcome.",
  Recruiting: "Name the roles, search difficulty, process ownership, time-to-hire, acceptance, or quality outcome.",
  Operations: "Name the process you owned, the operating problem, and the efficiency, cost, quality, or risk outcome.",
  Management: "Name the team context, organizational challenge, and delivery, hiring, retention, or development outcome.",
};

function routeFromHash(): Route {
  const value = window.location.hash.replace("#/", "");
  return routes.some((route) => route.id === value) ? (value as Route) : "landing";
}

export default function App() {
  const { getToken, isLoaded: authLoaded, isSignedIn } = useAuth();
  const { openSignIn, openSignUp } = useClerk();
  const { isLoaded: userLoaded, user } = useUser();
  const sessionPending = !authLoaded || !userLoaded;
  const sessionUser =
    isSignedIn && user
      ? {
          id: user.id,
          name:
            user.fullName ??
            user.username ??
            user.primaryEmailAddress?.emailAddress ??
            user.primaryPhoneNumber?.phoneNumber ??
            "Folio member",
          contact:
            user.primaryEmailAddress?.emailAddress ??
            user.primaryPhoneNumber?.phoneNumber ??
            user.username ??
            "",
        }
      : null;
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [publicProfileId, setPublicProfileId] = useState(() =>
    publicProfileIdFromHash(window.location.hash),
  );
  const [profile, setProfile] = useState<Person>(currentPerson);
  const [dark, setDark] = useState(() => localStorage.getItem("folio-theme") !== "light");
  const [claims, setClaims] = useState<Claim[]>(initialClaims);
  const [evidence, setEvidence] = useState<Evidence[]>(initialEvidence);
  const [requests, setRequests] = useState<ProfessionalRequest[]>(initialRequests);
  const [claimOpen, setClaimOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [intro, setIntro] = useState<IntroductionDraft | null>(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timeout = 0;
    const onHashChange = () => {
      window.clearTimeout(timeout);
      setLoading(true);
      setRoute(routeFromHash());
      setPublicProfileId(publicProfileIdFromHash(window.location.hash));
      timeout = window.setTimeout(() => setLoading(false), 280);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("folio-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const surface = isSignedIn && route !== "landing" && !publicProfileId ? "workspace" : "public";
    document.documentElement.dataset.surface = surface;
    return () => {
      delete document.documentElement.dataset.surface;
    };
  }, [isSignedIn, publicProfileId, route]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!sessionUser) return;
    let active = true;
    const controller = new AbortController();
    getPublicProfile(sessionUser.id, controller.signal)
      .then((published) => {
        if (!active) return;
        setProfile(published.person);
        setClaims(published.claims);
        setEvidence([]);
      })
      .catch(() => {
        if (!active) return;
        setProfile(emptyProfile(sessionUser.id, sessionUser.name));
        setClaims([]);
        setEvidence([]);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [sessionUser?.id, sessionUser?.name]);

  useEffect(() => {
    if (sessionUser && route === "landing" && !publicProfileId) {
      window.location.hash = "/profile";
    }
  }, [publicProfileId, route, sessionUser]);

  const navigate = (next: Route) => {
    window.location.hash = next === "landing" ? "" : `/${next}`;
    if (next === route) setRoute(next);
  };

  const publishProfile = async (person: Person, nextClaims: Claim[]) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing Clerk session token.");
      await savePublicProfile(token, {
        person,
        claims: nextClaims.filter((claim) => claim.privacy === "Public"),
      });
    } catch {
      setToast("Profile saved here, but the public page could not be updated.");
    }
  };

  if (publicProfileId) {
    return (
      <PublicProfilePage
        id={publicProfileId}
        dark={dark}
        setDark={setDark}
        onCreateAccount={() => openSignUp()}
      />
    );
  }

  if (sessionPending) {
    return <AuthLoader />;
  }

  if (route === "landing" || !sessionUser) {
    return (
      <Landing
        onSignIn={() => openSignIn()}
        onCreateAccount={() => openSignUp()}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        person={profile}
        contact={sessionUser.contact}
        route={route}
        navigate={navigate}
        onNewClaim={() => setClaimOpen(true)}
      />
      <main className="app-main">
        <MobileBar
          route={route}
          navigate={navigate}
          onNewClaim={() => setClaimOpen(true)}
        />
        {loading ? (
          <PageLoader />
        ) : (
          <>
            {route === "profile" ? (
              <ProfilePage
                person={profile}
                claims={claims}
                evidence={evidence}
                onNewClaim={() => setClaimOpen(true)}
                onEdit={() => setProfileOpen(true)}
                onShare={async () => {
                  const url = `${window.location.origin}${window.location.pathname}${publicProfileHash(profile.id)}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    setToast("Public profile link copied.");
                  } catch {
                    setToast(url);
                  }
                }}
              />
            ) : null}
            {route === "vault" ? (
              <VaultPage
                claims={claims}
                evidence={evidence}
                setEvidence={setEvidence}
                onAdd={() => setEvidenceOpen(true)}
                onToast={setToast}
              />
            ) : null}
            {route === "discover" ? <DiscoverPage onIntro={setIntro} /> : null}
            {route === "requests" ? (
              <RequestsPage
                requests={requests}
                onCreate={() => setRequestOpen(true)}
                onRespond={(request) =>
                  setToast(`Response started for “${request.title}”.`)
                }
              />
            ) : null}
          </>
        )}
      </main>

      <ClaimDialog
        open={claimOpen}
        onOpenChange={setClaimOpen}
        onCreate={(claim) => {
          const nextClaims = [claim, ...claims];
          setClaims(nextClaims);
          void publishProfile(profile, nextClaims);
          setClaimOpen(false);
          setToast("Claim saved to your profile.");
        }}
      />
      <EvidenceDialog
        open={evidenceOpen}
        onOpenChange={setEvidenceOpen}
        claims={claims}
        onAdd={(item) => {
          setEvidence((items) => [item, ...items]);
          setEvidenceOpen(false);
          setToast("Evidence added privately.");
        }}
      />
      <RequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        author={profile}
        onCreate={(request) => {
          setRequests((items) => [request, ...items]);
          setRequestOpen(false);
          setToast("Professional request published.");
        }}
      />
      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={profile}
        onSave={(nextProfile) => {
          setProfile(nextProfile);
          void publishProfile(nextProfile, claims);
          setProfileOpen(false);
          setToast("Profile details updated.");
        }}
      />
      <IntroductionDialog
        draft={intro}
        onOpenChange={(open) => !open && setIntro(null)}
        onSend={() => {
          setIntro(null);
          setToast("Introduction request sent to your mutual contact.");
        }}
      />
      {toast ? (
        <div className="toast" role="status">
          <CheckCircleIcon size={20} weight="fill" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo" aria-label="Folio">
      <span className="logo-mark">
        <span />
        <span />
        <span />
      </span>
      {!compact ? <span>folio</span> : null}
    </div>
  );
}

function ThemeButton({
  dark,
  setDark,
}: {
  dark: boolean;
  setDark: (dark: boolean) => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setDark(!dark)}
      aria-label={dark ? "Use light theme" : "Use dark theme"}
    >
      {dark ? <SunIcon size={19} /> : <MoonIcon size={19} />}
    </Button>
  );
}

function WorkspaceUserButton() {
  return (
    <UserButton
      appearance={{
        elements: {
          userButtonAvatarBox: {
            border: "1px solid rgba(255, 255, 255, 0.24)",
            filter: "grayscale(1)",
          },
        },
      }}
    />
  );
}

function Landing({
  onSignIn,
  onCreateAccount,
}: {
  onSignIn: () => void;
  onCreateAccount: () => void;
}) {
  return (
    <div className="landing">
      <section className="landing-visual" aria-label="A project folio being assembled">
        <div className="landing-visual-header">
          <Logo />
        </div>
        <footer className="landing-copyright">© 2026 Folio</footer>
      </section>

      <main className="landing-panel">
        <header className="landing-panel-header">
          <Logo />
        </header>

        <div className="signup-prompt">
          <h1>Professional profiles built on evidence.</h1>

          <div className="signup-card">
            <h2>Join Folio today.</h2>
            <PulseButton onClick={onCreateAccount}>Create your account</PulseButton>
          </div>

          <div className="signin-prompt">
            <span>Already have an account?</span>
            <PulseButton variant="outline" onClick={onSignIn}>
              Sign in
            </PulseButton>
          </div>
        </div>
      </main>
    </div>
  );
}

function Sidebar({
  person,
  contact,
  route,
  navigate,
  onNewClaim,
}: {
  person: Person;
  contact: string;
  route: Route;
  navigate: (route: Route) => void;
  onNewClaim: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <Logo />
        </div>
        <Button onClick={onNewClaim} className="sidebar-create">
          <PlusIcon size={16} weight="bold" />
          Add claim
        </Button>
        <p className="sidebar-nav-label">Workspace</p>
        <nav aria-label="Primary">
          {routes.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={route === item.id ? "active" : ""}
                onClick={() => navigate(item.id)}
                aria-current={route === item.id ? "page" : undefined}
              >
                <span className="sidebar-nav-icon">
                  <Icon size={17} weight={route === item.id ? "fill" : "regular"} />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-account">
          <WorkspaceUserButton />
          <div className="sidebar-account-copy">
            <strong>{person.name}</strong>
            <span>{contact}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MobileBar({
  route,
  navigate,
  onNewClaim,
}: {
  route: Route;
  navigate: (route: Route) => void;
  onNewClaim: () => void;
}) {
  return (
    <>
      <header className="mobile-topbar">
        <Logo />
        <div>
          <WorkspaceUserButton />
          <Button size="sm" onClick={onNewClaim}>
            <PlusIcon size={15} />
            Claim
          </Button>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Mobile primary">
        {routes.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={route === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
            >
              <Icon size={20} weight={route === item.id ? "fill" : "regular"} />
              <span>{item.label.replace("Evidence ", "")}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

function ProfilePage({
  person,
  claims,
  evidence,
  onNewClaim,
  onEdit,
  onShare,
}: {
  person: Person;
  claims: Claim[];
  evidence: Evidence[];
  onNewClaim?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
}) {
  const [selected, setSelected] = useState<Claim | null>(null);
  const featured = claims.filter((claim) => claim.featured);
  const evidenceCount = evidence.filter((item) => item.status === "Current").length;
  const hasProfileAside = Boolean(
    person.summary ||
      person.notOpenTo.length ||
      person.preferredLocations?.length ||
      person.compensationPreference,
  );

  return (
    <div className="page profile-page">
      <div className="profile-cover">
        <div className="profile-heading">
          <Avatar initials={person.initials} accent={person.accent} size="xl" />
          <div className="profile-identity">
            <div className="profile-name-row">
              <h1>{person.name}</h1>
              {person.identityVerified ? (
                <Badge tone="positive">
                  <SealCheckIcon size={13} weight="fill" />
                  Identity verified
                </Badge>
              ) : null}
              {person.employmentVerified ? (
                <Badge tone="positive">Employment confirmed</Badge>
              ) : null}
            </div>
            <p>{person.role}</p>
            <span>{person.location}</span>
          </div>
          {onEdit || onNewClaim || onShare ? (
            <div className="profile-actions">
              {onShare ? (
                <Button variant="outline" onClick={onShare}>
                  <LinkIcon size={16} />
                  Share
                </Button>
              ) : null}
              {onEdit ? <Button variant="outline" onClick={onEdit}>Edit profile</Button> : null}
              {onNewClaim ? (
                <Button onClick={onNewClaim}>
                  <PlusIcon size={16} />
                  Add claim
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className={`profile-layout${hasProfileAside ? "" : " profile-layout-wide"}`}>
        {hasProfileAside ? (
          <aside className="profile-aside">
            {person.summary ? (
              <section>
                <p className="aside-label">About</p>
                <p className="profile-summary">{person.summary}</p>
              </section>
            ) : null}
            {person.notOpenTo.length ? (
              <section>
                <p className="aside-label">Boundaries</p>
                <p className="muted-copy">
                  Not open to {person.notOpenTo.join(" or ").toLowerCase()}.
                </p>
              </section>
            ) : null}
            {person.preferredLocations?.length || person.compensationPreference ? (
              <section className="work-preferences">
                <div>
                  <p className="aside-label">Working preferences</p>
                  <span>Standing preferences, not an availability signal.</span>
                </div>
                {person.preferredLocations?.length ? (
                  <div className="preference-row">
                    <span>Location fit</span>
                    <strong>{person.preferredLocations.join(" · ")}</strong>
                  </div>
                ) : null}
                {person.compensationPreference ? (
                  <div className="preference-row">
                    <span>Compensation context</span>
                    <strong>{person.compensationPreference}</strong>
                  </div>
                ) : null}
              </section>
            ) : null}
          </aside>
        ) : null}

        <div className="profile-content">
          <div className="profile-stats">
            <div>
              <strong>{claims.length}</strong>
              <span>structured claims</span>
            </div>
            <div>
              <strong>{evidenceCount}</strong>
              <span>current evidence items</span>
            </div>
            <div>
              <strong>{claims.reduce((sum, claim) => sum + claim.attestations.length, 0)}</strong>
              <span>collaborator confirmations</span>
            </div>
          </div>

          <section className="content-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Selected work</p>
                <h2>Featured claims</h2>
              </div>
              <span>{featured.length} selected</span>
            </div>
            <div className="claims-list">
              {featured.map((claim, index) => (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  index={index}
                  onOpen={() => setSelected(claim)}
                />
              ))}
            </div>
          </section>

          <section className="content-section project-history">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Body of work</p>
                <h2>Project history</h2>
              </div>
            </div>
            {claims.map((claim) => (
              <button key={claim.id} className="history-row" onClick={() => setSelected(claim)}>
                <span className="history-period">{claim.period}</span>
                <span>
                  <strong>{claim.project}</strong>
                  <small>
                    {claim.organizationHidden ? "Organization confidential" : claim.organization}
                  </small>
                </span>
                <Badge tone={claim.privacy === "Public" ? "positive" : "private"}>
                  {claim.privacy === "Restricted" ? <LockKeyIcon size={12} /> : null}
                  {claim.privacy}
                </Badge>
                <ArrowRightIcon size={16} />
              </button>
            ))}
          </section>
        </div>
      </div>
      <ClaimDetail claim={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}

function PublicProfilePage({
  id,
  dark,
  setDark,
  onCreateAccount,
}: {
  id: string;
  dark: boolean;
  setDark: (dark: boolean) => void;
  onCreateAccount: () => void;
}) {
  const [published, setPublished] = useState<Awaited<ReturnType<typeof getPublicProfile>> | null>(
    null,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setPublished(null);
    setError("");
    getPublicProfile(id, controller.signal)
      .then((profile) => active && setPublished(profile))
      .catch(() => active && setError("This public profile could not be found."));
    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  return (
    <div className="public-profile-shell">
      <header className="public-profile-nav">
        <Logo />
        <div>
          <ThemeButton dark={dark} setDark={setDark} />
          <Button onClick={onCreateAccount}>Create your Folio</Button>
        </div>
      </header>
      {error ? (
        <EmptyState
          icon={<InfoIcon size={28} />}
          title="Profile unavailable"
          copy={error}
          action={<Button onClick={onCreateAccount}>Go to Folio</Button>}
        />
      ) : published ? (
        <ProfilePage person={published.person} claims={published.claims} evidence={[]} />
      ) : (
        <PageLoader />
      )}
    </div>
  );
}

function ClaimCard({
  claim,
  index,
  onOpen,
}: {
  claim: Claim;
  index: number;
  onOpen: () => void;
}) {
  return (
    <article className="claim-card" style={{ "--item-index": index } as React.CSSProperties}>
      <div className="claim-card-index">{String(index + 1).padStart(2, "0")}</div>
      <div className="claim-card-body">
        <div className="claim-card-meta">
          <span>{claim.profession}</span>
          <span>·</span>
          <span>{claim.period}</span>
          {claim.privacy !== "Public" ? (
            <Badge tone="private">
              <LockKeyIcon size={12} />
              {claim.privacy}
            </Badge>
          ) : null}
        </div>
        <h3>{claim.title}</h3>
        <div className="claim-contribution">
          <span>My contribution</span>
          <p>{claim.contribution}</p>
        </div>
        <div className="claim-outcome">
          <span>Outcome</span>
          <p>{claim.outcome}</p>
        </div>
        <div className="claim-footer">
          <div className="verification-row">
            {claim.verification.slice(0, 2).map((status) => (
              <Badge key={status} tone="positive">
                <SealCheckIcon size={12} weight="fill" />
                {status}
              </Badge>
            ))}
            {claim.verification.length > 2 ? (
              <span>+{claim.verification.length - 2} more</span>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onOpen}>
            View claim
            <ArrowRightIcon size={15} />
          </Button>
        </div>
      </div>
    </article>
  );
}

function ClaimDetail({
  claim,
  onOpenChange,
}: {
  claim: Claim | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={Boolean(claim)}
      onOpenChange={onOpenChange}
      title="Structured claim"
      description="Contribution, outcome, and contextual verification."
      wide
    >
      {claim ? (
        <div className="claim-detail">
          <div className="claim-detail-title">
            <div>
              <p className="eyebrow">
                {claim.profession} · {claim.ownership}
              </p>
              <h2>{claim.title}</h2>
              <span>
                {claim.organizationHidden ? "Organization not publicly named" : claim.organization}
                {" · "}
                {claim.period}
              </span>
            </div>
            <Badge tone={claim.privacy === "Public" ? "positive" : "private"}>
              {claim.privacy !== "Public" ? <LockKeyIcon size={12} /> : null}
              {claim.privacy}
            </Badge>
          </div>
          <div className="claim-detail-grid">
            <section>
              <span className="detail-label">Personal contribution</span>
              <p>{claim.contribution}</p>
            </section>
            <section>
              <span className="detail-label">Outcome</span>
              <p className="detail-outcome">{claim.outcome}</p>
              <small>{claim.outcomeContext}</small>
            </section>
          </div>
          <DividerLabel>Trust context</DividerLabel>
          <div className="trust-detail-grid">
            {claim.verification.map((status) => (
              <div key={status} className="trust-item">
                <SealCheckIcon size={21} weight="fill" />
                <div>
                  <strong>{status}</strong>
                  <span>
                    {status === "System verified"
                      ? "Selected participation and ownership facts confirmed through a connected system."
                      : status === "Organization verified"
                        ? "The organization confirmed selected facts without exposing internal material."
                        : status === "Confirmed by collaborator"
                          ? "A direct collaborator confirmed the part of the work they observed."
                          : "Supporting material exists; visibility remains controlled by the profile owner."}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {claim.collaborators.length ? (
            <>
              <DividerLabel>Shared credit</DividerLabel>
              <div className="collaborator-row">
                <UsersThreeIcon size={21} />
                <div>
                  <strong>Collaborators connected to this work</strong>
                  <span>{claim.collaborators.join(" · ")}</span>
                </div>
              </div>
            </>
          ) : null}
          {claim.attestations.length ? (
            <>
              <DividerLabel>Collaborator attestations</DividerLabel>
              <div className="attestation-list">
                {claim.attestations.map((attestation) => (
                  <blockquote key={attestation.id}>
                    <p>“{attestation.quote}”</p>
                    <footer>
                      <Avatar initials={attestation.initials} size="sm" accent="sage" />
                      <span>
                        <strong>{attestation.name}</strong>
                        <small>{attestation.relationship}</small>
                      </span>
                      {attestation.confirmsOutcome ? (
                        <Badge tone="positive">Outcome confirmed</Badge>
                      ) : null}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </>
          ) : null}
          <div className="privacy-explainer">
            <LockKeyIcon size={20} />
            <div>
              <strong>
                {claim.privacy === "Public"
                  ? "The claim is public; source evidence may not be."
                  : "This claim has restricted visibility."}
              </strong>
              <span>
                Verification language confirms limited facts and does not imply absolute
                certainty.
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

function VaultPage({
  claims,
  evidence,
  setEvidence,
  onAdd,
  onToast,
}: {
  claims: Claim[];
  evidence: Evidence[];
  setEvidence: React.Dispatch<React.SetStateAction<Evidence[]>>;
  onAdd: () => void;
  onToast: (message: string) => void;
}) {
  const [filter, setFilter] = useState<"All" | Evidence["access"]>("All");
  const [selected, setSelected] = useState<Evidence | null>(null);
  const visible = evidence.filter((item) => filter === "All" || item.access === filter);

  const updateItem = (id: string, patch: Partial<Evidence>) => {
    setEvidence((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
    setSelected((item) => (item?.id === id ? { ...item, ...patch } : item));
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Private workspace"
        title="Evidence vault"
        description="Manage what supports your claims, who can access it, and whether its verification is current."
        actions={
          <Button onClick={onAdd}>
            <PlusIcon size={16} />
            Add evidence
          </Button>
        }
      />

      <div className="privacy-banner">
        <FolderLockIcon size={24} />
        <div>
          <strong>Your vault is private by default.</strong>
          <span>
            Public claims can be supported by evidence that remains visible only to
            approved reviewers.
          </span>
        </div>
        <Badge tone="private">Encrypted at rest</Badge>
      </div>

      <div className="vault-summary">
        <div>
          <span>Evidence items</span>
          <strong>{evidence.length}</strong>
        </div>
        <div>
          <span>Reviewer access</span>
          <strong>{evidence.filter((item) => item.access === "Reviewers").length}</strong>
        </div>
        <div>
          <span>Pending review</span>
          <strong>{evidence.filter((item) => item.status === "Review pending").length}</strong>
        </div>
        <div>
          <span>Claims supported</span>
          <strong>{new Set(evidence.flatMap((item) => item.claimIds)).size}</strong>
        </div>
      </div>

      <div className="toolbar">
        <div className="segmented" aria-label="Filter evidence">
          {(["All", "Only me", "Reviewers", "Public"] as const).map((item) => (
            <button
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <span>{visible.length} items</span>
      </div>

      {visible.length ? (
        <div className="evidence-table-wrap">
          <table className="evidence-table">
            <thead>
              <tr>
                <th>Evidence</th>
                <th>Supports</th>
                <th>Access</th>
                <th>Status</th>
                <th>Updated</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td>
                    <button className="evidence-name" onClick={() => setSelected(item)}>
                      <span className="evidence-icon">
                        {item.type === "System record" ? (
                          <LinkIcon size={18} />
                        ) : (
                          <FileTextIcon size={18} />
                        )}
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.type}</small>
                      </span>
                    </button>
                  </td>
                  <td>
                    {item.claimIds
                      .map((id) => claims.find((claim) => claim.id === id)?.project)
                      .filter(Boolean)
                      .join(", ")}
                  </td>
                  <td>
                    <Badge tone={item.access === "Public" ? "positive" : "private"}>
                      {item.access !== "Public" ? <LockKeyIcon size={12} /> : null}
                      {item.access}
                    </Badge>
                  </td>
                  <td>
                    <Badge
                      tone={
                        item.status === "Current"
                          ? "positive"
                          : item.status === "Withdrawn"
                            ? "neutral"
                            : "warning"
                      }
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td>{item.updated}</td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => setSelected(item)}>
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={<FolderLockIcon size={28} />}
          title="No evidence matches this access level"
          copy="Choose another filter or add a new item to your private vault."
          action={<Button onClick={() => setFilter("All")}>Show all evidence</Button>}
        />
      )}

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        title="Manage evidence"
        description="Evidence access is separate from claim visibility."
      >
        {selected ? (
          <div className="manage-evidence">
            <div className="evidence-detail-head">
              <span className="evidence-icon">
                <FileTextIcon size={20} />
              </span>
              <div>
                <strong>{selected.title}</strong>
                <span>{selected.detail}</span>
              </div>
            </div>
            <div className="meta-grid">
              <div>
                <span>Type</span>
                <strong>{selected.type}</strong>
              </div>
              <div>
                <span>Reviewed by</span>
                <strong>{selected.reviewedBy}</strong>
              </div>
            </div>
            <Field
              label="Who can access this evidence?"
              htmlFor="evidence-access"
              helper="Changing this does not change the public visibility of linked claims."
            >
              <select
                id="evidence-access"
                value={selected.access}
                onChange={(event) =>
                  updateItem(selected.id, {
                    access: event.target.value as Evidence["access"],
                  })
                }
              >
                <option>Only me</option>
                <option>Reviewers</option>
                <option>Public</option>
              </select>
            </Field>
            <div className="dialog-actions split-actions">
              <Button
                variant="danger"
                onClick={() => {
                  updateItem(selected.id, { status: "Withdrawn" });
                  onToast("Evidence withdrawn. Linked claims now show updated support.");
                }}
                disabled={selected.status === "Withdrawn"}
              >
                Withdraw evidence
              </Button>
              <Button onClick={() => setSelected(null)}>Save access</Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function DiscoverPage({ onIntro }: { onIntro: (draft: IntroductionDraft) => void }) {
  const [query, setQuery] = useState("");
  const [expertise, setExpertise] = useState("All expertise");
  const [ownership, setOwnership] = useState("Any ownership");
  const [selected, setSelected] = useState<Person | null>(null);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return people.filter((person) => {
      const claim = discoveryClaims[person.id];
      const matchesText =
        !normalized ||
        [person.name, person.role, person.summary, ...person.expertise, claim?.title ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      const matchesExpertise =
        expertise === "All expertise" ||
        person.expertise.some((item) => item.includes(expertise));
      const matchesOwnership =
        ownership === "Any ownership" || claim?.ownership === ownership;
      return matchesText && matchesExpertise && matchesOwnership;
    });
  }, [query, expertise, ownership]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Relevant work, explained"
        title="Discover professionals"
        description="Find people by supported experience, ownership, outcomes, availability, and relationship proximity."
      />
      <div className="discovery-search">
        <div className="search-input">
          <MagnifyingGlassIcon size={20} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search skills, outcomes, projects, or people"
            aria-label="Search professionals"
          />
        </div>
        <select
          value={expertise}
          onChange={(event) => setExpertise(event.target.value)}
          aria-label="Filter by expertise"
        >
          <option>All expertise</option>
          <option>Accessibility</option>
          <option>Cloud cost</option>
          <option>Enterprise product</option>
          <option>Revenue operations</option>
        </select>
        <select
          value={ownership}
          onChange={(event) => setOwnership(event.target.value)}
          aria-label="Filter by ownership"
        >
          <option>Any ownership</option>
          <option>Accountable owner</option>
          <option>Lead</option>
          <option>Major contributor</option>
        </select>
      </div>

      <div className="results-heading">
        <span>{results.length} relevant professionals</span>
        <span>Ordered by claim relevance and evidence context</span>
      </div>
      {results.length ? (
        <div className="discovery-list">
          {results.map((person, index) => {
            const claim = discoveryClaims[person.id]!;
            return (
              <article key={person.id} className="person-result">
                <div className="person-rank">{String(index + 1).padStart(2, "0")}</div>
                <div className="person-profile">
                  <Avatar initials={person.initials} accent={person.accent} size="lg" />
                  <div>
                    <div className="person-name">
                      <h2>{person.name}</h2>
                      {person.identityVerified ? (
                        <SealCheckIcon size={17} weight="fill" aria-label="Identity verified" />
                      ) : null}
                    </div>
                    <p>{person.role}</p>
                    <span>{person.location}</span>
                    <div className="tag-list">
                      {person.expertise.slice(0, 3).map((item) => (
                        <Badge key={item}>{item}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="person-match">
                  <p className="eyebrow">Why this person appears</p>
                  <h3>{claim.title}</h3>
                  <p>{claim.outcome}</p>
                  <div className="verification-row">
                    <Badge tone="positive">
                      <SealCheckIcon size={12} weight="fill" />
                      {claim.verification[0]}
                    </Badge>
                    <Badge>{claim.ownership}</Badge>
                  </div>
                </div>
                <div className="person-connect">
                  <span>{person.relationship}</span>
                  <span className="availability-dot">
                    <i />
                    Open to {person.availability[0]?.toLowerCase()}
                  </span>
                  <Button variant="outline" onClick={() => setSelected(person)}>
                    View profile
                  </Button>
                  <Button onClick={() => onIntro({ person, reason: "", outcome: "" })}>
                    Request intro
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<MagnifyingGlassIcon size={28} />}
          title="No professionals match these filters"
          copy="Try a broader skill, ownership level, or search phrase."
          action={
            <Button
              onClick={() => {
                setQuery("");
                setExpertise("All expertise");
                setOwnership("Any ownership");
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.name ?? "Professional profile"}
        description={selected?.role}
        wide
      >
        {selected ? (
          <div className="discovery-profile">
            <div className="discovery-profile-head">
              <Avatar initials={selected.initials} accent={selected.accent} size="xl" />
              <div>
                <h2>{selected.name}</h2>
                <p>{selected.summary}</p>
                <div className="tag-list">
                  {selected.expertise.map((item) => (
                    <Badge key={item}>{item}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <DividerLabel>Relevant supported claim</DividerLabel>
            <ClaimCard claim={discoveryClaims[selected.id]!} index={0} onOpen={() => {}} />
            <div className="dialog-actions">
              <Button
                onClick={() => {
                  onIntro({ person: selected, reason: "", outcome: "" });
                  setSelected(null);
                }}
              >
                Request consent-based introduction
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function RequestsPage({
  requests,
  onCreate,
  onRespond,
}: {
  requests: ProfessionalRequest[];
  onCreate: () => void;
  onRespond: (request: ProfessionalRequest) => void;
}) {
  const [kind, setKind] = useState("All");
  const visible = requests.filter((request) => kind === "All" || request.kind === kind);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Clear needs, credible context"
        title="Professional requests"
        description="Ask for specific help, experience, or collaboration without posting into a general content feed."
        actions={
          <Button onClick={onCreate}>
            <PlusIcon size={16} />
            Publish request
          </Button>
        }
      />
      <div className="request-layout">
        <aside className="request-filter">
          <p className="aside-label">Request type</p>
          {["All", "Hiring", "Advice", "Contract", "Collaboration", "Research"].map(
            (item) => (
              <button
                key={item}
                className={kind === item ? "active" : ""}
                onClick={() => setKind(item)}
              >
                {item}
                <span>
                  {item === "All"
                    ? requests.length
                    : requests.filter((request) => request.kind === item).length}
                </span>
              </button>
            ),
          )}
          <div className="request-note">
            <InfoIcon size={18} />
            Requests must include intent, commitment, constraints, and compensation when
            applicable.
          </div>
        </aside>
        <div className="request-list">
          {visible.length ? (
            visible.map((request) => (
              <article key={request.id} className="request-card">
                <div className="request-card-top">
                  <Badge tone="accent">{request.kind}</Badge>
                  <span>{request.posted}</span>
                </div>
                <h2>{request.title}</h2>
                <p>{request.need}</p>
                <div className="request-experience">
                  <span>Relevant experience</span>
                  <div className="tag-list">
                    {request.experience.map((item) => (
                      <Badge key={item}>{item}</Badge>
                    ))}
                  </div>
                </div>
                <div className="request-details">
                  <div>
                    <span>Commitment</span>
                    <strong>{request.commitment}</strong>
                  </div>
                  <div>
                    <span>Compensation</span>
                    <strong>{request.compensation}</strong>
                  </div>
                  <div>
                    <span>Constraints</span>
                    <strong>{request.constraints}</strong>
                  </div>
                  <div>
                    <span>Preferred evidence</span>
                    <strong>{request.preferredEvidence}</strong>
                  </div>
                </div>
                <footer>
                  <div className="request-author">
                    <Avatar
                      initials={request.author.initials}
                      accent={request.author.accent}
                      size="sm"
                    />
                    <span>
                      <strong>{request.author.name}</strong>
                      <small>{request.author.role}</small>
                    </span>
                    {request.author.identityVerified ? (
                      <SealCheckIcon size={16} weight="fill" />
                    ) : null}
                  </div>
                  <Button onClick={() => onRespond(request)}>Respond with context</Button>
                </footer>
              </article>
            ))
          ) : (
            <EmptyState
              icon={<HandshakeIcon size={28} />}
              title={`No ${kind.toLowerCase()} requests right now`}
              copy="Choose another request type or publish a clear professional need."
              action={<Button onClick={onCreate}>Publish request</Button>}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AuthLoader() {
  return (
    <div className="auth-loader" aria-label="Checking your session">
      <Logo />
      <div>
        <Skeleton className="skeleton-kicker" />
        <Skeleton className="skeleton-title" />
      </div>
    </div>
  );
}

function ProfileDialog({
  open,
  onOpenChange,
  profile,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Person;
  onSave: (profile: Person) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [location, setLocation] = useState(profile.location);
  const [summary, setSummary] = useState(profile.summary);
  const [expertise, setExpertise] = useState(profile.expertise.join(", "));
  const [interests, setInterests] = useState(profile.interests.join(", "));
  const [availability, setAvailability] = useState(profile.availability.join(", "));
  const [boundaries, setBoundaries] = useState(profile.notOpenTo.join(", "));
  const [preferredLocations, setPreferredLocations] = useState(
    profile.preferredLocations?.join(", ") ?? "",
  );
  const [compensationPreference, setCompensationPreference] = useState(
    profile.compensationPreference ?? "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setName(profile.name);
    setRole(profile.role);
    setLocation(profile.location);
    setSummary(profile.summary);
    setExpertise(profile.expertise.join(", "));
    setInterests(profile.interests.join(", "));
    setAvailability(profile.availability.join(", "));
    setBoundaries(profile.notOpenTo.join(", "));
    setPreferredLocations(profile.preferredLocations?.join(", ") ?? "");
    setCompensationPreference(profile.compensationPreference ?? "");
    setErrors({});
  }, [open, profile]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Add your professional name.";
    if (!role.trim()) nextErrors.role = "Add your current professional role.";
    if (summary.trim().length < 40)
      nextErrors.summary = "Write at least 40 characters about the work you do.";
    if (!parseCommaSeparatedList(expertise).length)
      nextErrors.expertise = "Add at least one area of expertise.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSave({
      ...profile,
      name: name.trim(),
      initials: initials(name),
      role: role.trim(),
      location: location.trim(),
      summary: summary.trim(),
      expertise: parseCommaSeparatedList(expertise),
      interests: parseCommaSeparatedList(interests),
      availability: parseCommaSeparatedList(availability),
      notOpenTo: parseCommaSeparatedList(boundaries),
      preferredLocations: parseCommaSeparatedList(preferredLocations),
      compensationPreference: compensationPreference.trim(),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit professional profile"
      description="Describe the work you want to be known for and the boundaries people should respect."
      wide
    >
      <form onSubmit={submit} className="form-section">
        <div className="form-grid">
          <Field label="Professional name" htmlFor="profile-name" error={errors.name}>
            <input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Current role" htmlFor="profile-role" error={errors.role}>
            <input
              id="profile-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            />
          </Field>
        </div>
        <Field label="Location" htmlFor="profile-location">
          <input
            id="profile-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </Field>
        <Field label="Professional summary" htmlFor="profile-summary" error={errors.summary}>
          <textarea
            id="profile-summary"
            rows={5}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field
            label="Areas of expertise"
            htmlFor="profile-expertise"
            helper="Separate areas with commas."
            error={errors.expertise}
          >
            <input
              id="profile-expertise"
              value={expertise}
              onChange={(event) => setExpertise(event.target.value)}
            />
          </Field>
          <Field
            label="Professional interests"
            htmlFor="profile-interests"
            helper="Topics or kinds of work you want to explore."
          >
            <input
              id="profile-interests"
              value={interests}
              onChange={(event) => setInterests(event.target.value)}
            />
          </Field>
        </div>
        <div className="form-grid">
          <Field
            label="Preferred work locations"
            htmlFor="profile-work-locations"
            helper="Cities, regions, or remote arrangements. Separate with commas."
          >
            <input
              id="profile-work-locations"
              value={preferredLocations}
              onChange={(event) => setPreferredLocations(event.target.value)}
              placeholder="New York City, Remote within the United States"
            />
          </Field>
          <Field
            label="Typical annual salary range"
            htmlFor="profile-compensation"
            helper="A standing preference—not a signal that you are looking for work."
          >
            <input
              id="profile-compensation"
              value={compensationPreference}
              onChange={(event) => setCompensationPreference(event.target.value)}
              placeholder="$180k–$220k base salary"
            />
          </Field>
        </div>
        <div className="form-grid">
          <Field
            label="Open to"
            htmlFor="profile-availability"
            helper="Advisory, full-time, contract, mentoring, speaking..."
          >
            <input
              id="profile-availability"
              value={availability}
              onChange={(event) => setAvailability(event.target.value)}
            />
          </Field>
          <Field
            label="Not open to"
            htmlFor="profile-boundaries"
            helper="Set expectations before someone contacts you."
          >
            <input
              id="profile-boundaries"
              value={boundaries}
              onChange={(event) => setBoundaries(event.target.value)}
            />
          </Field>
        </div>
        <div className="privacy-preview compact">
          <ShieldCheckIcon size={20} />
          <span>
            Identity and employment indicators confirm selected facts; they do not
            endorse every profile claim.
          </span>
        </div>
        <div className="dialog-actions">
          <span />
          <Button type="submit">Save profile</Button>
        </div>
      </form>
    </Dialog>
  );
}

function ClaimDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (claim: Claim) => void;
}) {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profession, setProfession] = useState<Profession>("Engineering");
  const [ownership, setOwnership] = useState<Ownership>("Lead");
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [organization, setOrganization] = useState("");
  const [contribution, setContribution] = useState("");
  const [outcome, setOutcome] = useState("");
  const [context, setContext] = useState("");
  const [privacy, setPrivacy] = useState<Claim["privacy"]>("Public");
  const [hideOrganization, setHideOrganization] = useState(false);

  useEffect(() => {
    if (open) return;
    setStep(1);
    setErrors({});
  }, [open]);

  const next = () => {
    const nextErrors: Record<string, string> = {};
    if (step === 1) {
      if (!title.trim()) nextErrors.title = "Name the specific contribution.";
      if (!project.trim()) nextErrors.project = "Add the project or body of work.";
    }
    if (step === 2) {
      if (contribution.trim().length < 30)
        nextErrors.contribution = "Describe your personal contribution in at least 30 characters.";
      if (outcome.trim().length < 15)
        nextErrors.outcome = "Add a concrete outcome with enough context to understand it.";
    }
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) setStep((value) => Math.min(3, value + 1));
  };

  const save = () => {
    onCreate({
      id: `claim-${Date.now()}`,
      title: title.trim(),
      project: project.trim(),
      organization: organization.trim() || "Independent work",
      organizationHidden: hideOrganization,
      profession,
      ownership,
      contribution: contribution.trim(),
      outcome: outcome.trim(),
      outcomeContext:
        context.trim() ||
        "Self-declared outcome; add supporting evidence to strengthen this claim.",
      period: "2026",
      verification: ["Self-declared"],
      privacy,
      evidenceIds: [],
      collaborators: [],
      attestations: [],
      featured: true,
    });
    setTitle("");
    setProject("");
    setOrganization("");
    setContribution("");
    setOutcome("");
    setContext("");
    setHideOrganization(false);
    setPrivacy("Public");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a professional claim"
      description="Make your contribution distinct from the project’s overall result."
      wide
    >
      <form onSubmit={(event) => event.preventDefault()}>
        <div className="stepper" aria-label={`Step ${step} of 3`}>
          {["Context", "Contribution", "Privacy"].map((label, index) => (
            <div key={label} className={step >= index + 1 ? "active" : ""}>
              <span>{step > index + 1 ? <CheckIcon size={13} /> : index + 1}</span>
              {label}
            </div>
          ))}
        </div>

        {step === 1 ? (
          <div className="form-section">
            <Field label="Professional lens" htmlFor="claim-profession" helper={professionPrompts[profession]}>
              <select
                id="claim-profession"
                value={profession}
                onChange={(event) => setProfession(event.target.value as Profession)}
              >
                {Object.keys(professionPrompts).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Claim title" htmlFor="claim-title" error={errors.title}>
              <input
                id="claim-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Led the migration of a critical production system"
              />
            </Field>
            <div className="form-grid">
              <Field label="Project or body of work" htmlFor="claim-project" error={errors.project}>
                <input
                  id="claim-project"
                  value={project}
                  onChange={(event) => setProject(event.target.value)}
                  placeholder="Payments platform migration"
                />
              </Field>
              <Field label="Organization" htmlFor="claim-organization" helper="You can hide this publicly in step 3.">
                <input
                  id="claim-organization"
                  value={organization}
                  onChange={(event) => setOrganization(event.target.value)}
                  placeholder="Organization name"
                />
              </Field>
            </div>
            <Field label="Ownership level" htmlFor="claim-ownership">
              <select
                id="claim-ownership"
                value={ownership}
                onChange={(event) => setOwnership(event.target.value as Ownership)}
              >
                <option>Contributor</option>
                <option>Major contributor</option>
                <option>Lead</option>
                <option>Accountable owner</option>
              </select>
            </Field>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="form-section">
            <div className="form-guidance">
              <SparkleIcon size={20} />
              <div>
                <strong>Separate your work from the team’s work.</strong>
                <span>{professionPrompts[profession]}</span>
              </div>
            </div>
            <Field
              label="What did you personally contribute?"
              htmlFor="claim-contribution"
              helper="Use first-person ownership: decisions, systems, processes, research, or coordination you directly handled."
              error={errors.contribution}
            >
              <textarea
                id="claim-contribution"
                rows={5}
                value={contribution}
                onChange={(event) => setContribution(event.target.value)}
                placeholder="I defined the migration path, built the compatibility layer, and coordinated..."
              />
            </Field>
            <Field
              label="What outcome followed?"
              htmlFor="claim-outcome"
              error={errors.outcome}
            >
              <textarea
                id="claim-outcome"
                rows={3}
                value={outcome}
                onChange={(event) => setOutcome(event.target.value)}
                placeholder="Reduced median processing time by 38–44%..."
              />
            </Field>
            <Field
              label="Measurement context"
              htmlFor="claim-context"
              helper="Include scale, time period, method, and whether the result is exact or shown as a range."
            >
              <textarea
                id="claim-context"
                rows={3}
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="Measured across 1.7M annual transactions during the first 90 days..."
              />
            </Field>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="form-section">
            <div className="privacy-choice-group">
              <span className="field-label">Claim visibility</span>
              {(["Public", "Restricted", "Private"] as const).map((option) => (
                <label key={option} className={privacy === option ? "selected" : ""}>
                  <input
                    type="radio"
                    name="privacy"
                    value={option}
                    checked={privacy === option}
                    onChange={() => setPrivacy(option)}
                  />
                  <span>
                    <strong>{option}</strong>
                    <small>
                      {option === "Public"
                        ? "Anyone can view the claim. Evidence can remain private."
                        : option === "Restricted"
                          ? "Only approved people can view full claim details."
                          : "Visible only to you until you choose to publish."}
                    </small>
                  </span>
                </label>
              ))}
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={hideOrganization}
                onChange={(event) => setHideOrganization(event.target.checked)}
              />
              <span>
                <strong>Hide the organization name</strong>
                <small>Show “Organization confidential” on the claim.</small>
              </span>
            </label>
            <div className="privacy-preview">
              <LockKeyIcon size={22} />
              <div>
                <strong>Your evidence is not made public with this claim.</strong>
                <span>
                  After saving, add private artifacts, system records, or request a
                  collaborator attestation from the evidence vault.
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="dialog-actions">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep((value) => value - 1)}>
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < 3 ? (
            <Button key="continue" onClick={next}>
              Continue
              <ArrowRightIcon size={16} />
            </Button>
          ) : (
            <Button key="save" onClick={save}>Save claim</Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}

function EvidenceDialog({
  open,
  onOpenChange,
  claims,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claims: Claim[];
  onAdd: (evidence: Evidence) => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<Evidence["type"]>("Artifact");
  const [claimId, setClaimId] = useState(claims[0]?.id ?? "");
  const [access, setAccess] = useState<Evidence["access"]>("Only me");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Give this evidence a recognizable title.");
      return;
    }
    onAdd({
      id: `evidence-${Date.now()}`,
      title: title.trim(),
      type,
      claimIds: claimId ? [claimId] : [],
      access,
      status: type === "Attestation" ? "Review pending" : "Current",
      reviewedBy: type === "Attestation" ? "Awaiting collaborator" : "Not reviewed",
      updated: "Just now",
      detail: detail.trim() || "Private supporting material.",
    });
    setTitle("");
    setDetail("");
    setError("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add evidence"
      description="Sources are private unless you explicitly make them public."
    >
      <form onSubmit={submit} className="form-section">
        <Field label="Evidence type" htmlFor="evidence-type">
          <select
            id="evidence-type"
            value={type}
            onChange={(event) => setType(event.target.value as Evidence["type"])}
          >
            <option>Artifact</option>
            <option>System record</option>
            <option>Attestation</option>
            <option>Organization</option>
            <option>Outcome</option>
          </select>
        </Field>
        <Field label="Title" htmlFor="evidence-title" error={error}>
          <input
            id="evidence-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Architecture decision record"
          />
        </Field>
        <Field label="Supports claim" htmlFor="evidence-claim">
          <select
            id="evidence-claim"
            value={claimId}
            onChange={(event) => setClaimId(event.target.value)}
          >
            {claims.map((claim) => (
              <option key={claim.id} value={claim.id}>
                {claim.project}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Access" htmlFor="new-evidence-access">
          <select
            id="new-evidence-access"
            value={access}
            onChange={(event) => setAccess(event.target.value as Evidence["access"])}
          >
            <option>Only me</option>
            <option>Reviewers</option>
            <option>Public</option>
          </select>
        </Field>
        <Field
          label={type === "Attestation" ? "What should they confirm?" : "Private note"}
          htmlFor="evidence-detail"
        >
          <textarea
            id="evidence-detail"
            rows={3}
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
          />
        </Field>
        <div className="privacy-preview compact">
          <LockKeyIcon size={20} />
          <span>
            {access === "Public"
              ? "This source will be publicly visible."
              : `${access} can access the source; public viewers only see its verification state.`}
          </span>
        </div>
        <div className="dialog-actions">
          <span />
          <Button type="submit">
            {type === "Attestation" ? "Request attestation" : "Add to vault"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function RequestDialog({
  open,
  onOpenChange,
  author,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  author: Person;
  onCreate: (request: ProfessionalRequest) => void;
}) {
  const [kind, setKind] = useState<ProfessionalRequest["kind"]>("Advice");
  const [title, setTitle] = useState("");
  const [need, setNeed] = useState("");
  const [experience, setExperience] = useState("");
  const [commitment, setCommitment] = useState("");
  const [compensation, setCompensation] = useState("");
  const [constraints, setConstraints] = useState("");
  const [preferredEvidence, setPreferredEvidence] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = "State the request clearly.";
    if (need.trim().length < 25) nextErrors.need = "Explain the need in at least 25 characters.";
    if (!commitment.trim()) nextErrors.commitment = "State the expected commitment.";
    if (!compensation.trim()) nextErrors.compensation = "State compensation or say that it is unpaid.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onCreate({
      id: `request-${Date.now()}`,
      author,
      kind,
      title: title.trim(),
      need: need.trim(),
      experience: parseCommaSeparatedList(experience),
      commitment: commitment.trim(),
      compensation: compensation.trim(),
      constraints: constraints.trim() || "No additional constraints",
      preferredEvidence:
        preferredEvidence.trim() || "A relevant structured claim is helpful",
      posted: "Just now",
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Publish a professional request"
      description="Clear intent helps relevant people decide whether to respond."
      wide
    >
      <form onSubmit={submit} className="form-section">
        <div className="form-grid">
          <Field label="Request type" htmlFor="request-kind">
            <select
              id="request-kind"
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as ProfessionalRequest["kind"])
              }
            >
              <option>Hiring</option>
              <option>Advice</option>
              <option>Contract</option>
              <option>Collaboration</option>
              <option>Research</option>
            </select>
          </Field>
          <Field label="Title" htmlFor="request-title" error={errors.title}>
            <input
              id="request-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Seeking an operator who..."
            />
          </Field>
        </div>
        <Field label="What do you need?" htmlFor="request-need" error={errors.need}>
          <textarea
            id="request-need"
            rows={4}
            value={need}
            onChange={(event) => setNeed(event.target.value)}
          />
        </Field>
        <Field
          label="Required experience"
          htmlFor="request-experience"
          helper="Separate areas with commas."
        >
          <input
            id="request-experience"
            value={experience}
            onChange={(event) => setExperience(event.target.value)}
            placeholder="Platform migration, regulated workflows, change management"
          />
        </Field>
        <div className="form-grid">
          <Field
            label="Time commitment"
            htmlFor="request-commitment"
            error={errors.commitment}
          >
            <input
              id="request-commitment"
              value={commitment}
              onChange={(event) => setCommitment(event.target.value)}
              placeholder="Two 45-minute calls"
            />
          </Field>
          <Field
            label="Compensation"
            htmlFor="request-compensation"
            error={errors.compensation}
          >
            <input
              id="request-compensation"
              value={compensation}
              onChange={(event) => setCompensation(event.target.value)}
              placeholder="$350 fixed fee"
            />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Constraints" htmlFor="request-constraints">
            <input
              id="request-constraints"
              value={constraints}
              onChange={(event) => setConstraints(event.target.value)}
              placeholder="Time zone, location, confidentiality..."
            />
          </Field>
          <Field label="Preferred evidence" htmlFor="request-evidence">
            <input
              id="request-evidence"
              value={preferredEvidence}
              onChange={(event) => setPreferredEvidence(event.target.value)}
              placeholder="System-verified migration claim"
            />
          </Field>
        </div>
        <div className="dialog-actions">
          <span />
          <Button type="submit">Publish request</Button>
        </div>
      </form>
    </Dialog>
  );
}

function IntroductionDialog({
  draft,
  onOpenChange,
  onSend,
}: {
  draft: IntroductionDraft | null;
  onOpenChange: (open: boolean) => void;
  onSend: () => void;
}) {
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!draft) {
      setReason("");
      setOutcome("");
      setError("");
    }
  }, [draft]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 20 || outcome.trim().length < 10) {
      setError("Give your mutual contact enough context to evaluate the introduction.");
      return;
    }
    onSend();
  };

  return (
    <Dialog
      open={Boolean(draft)}
      onOpenChange={onOpenChange}
      title={`Request an introduction to ${draft?.person.name ?? ""}`}
      description="Your mutual contact will review the context first. Contact details stay private until both people consent."
    >
      {draft ? (
        <form onSubmit={submit} className="form-section">
          <div className="intro-person">
            <Avatar initials={draft.person.initials} accent={draft.person.accent} />
            <span>
              <strong>{draft.person.name}</strong>
              <small>{draft.person.relationship}</small>
            </span>
          </div>
          <Field
            label="Why is this connection relevant?"
            htmlFor="intro-reason"
            error={error}
          >
            <textarea
              id="intro-reason"
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={`Reference ${draft.person.name}’s work and explain your professional context.`}
            />
          </Field>
          <Field label="What outcome are you hoping for?" htmlFor="intro-outcome">
            <textarea
              id="intro-outcome"
              rows={3}
              value={outcome}
              onChange={(event) => setOutcome(event.target.value)}
              placeholder="A 30-minute conversation about..."
            />
          </Field>
          <div className="privacy-preview compact">
            <ShieldCheckIcon size={20} />
            <span>
              No email address or contact details are revealed before both parties
              agree.
            </span>
          </div>
          <div className="dialog-actions">
            <span />
            <Button type="submit">Send to mutual contact</Button>
          </div>
        </form>
      ) : null}
    </Dialog>
  );
}

function EmptyState({
  icon,
  title,
  copy,
  action,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
  action: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
      {action}
    </div>
  );
}

function PageLoader() {
  return (
    <div className="page" aria-label="Loading page">
      <div className="loader-heading">
        <Skeleton className="skeleton-kicker" />
        <Skeleton className="skeleton-title" />
        <Skeleton className="skeleton-copy" />
      </div>
      <div className="loader-grid">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    </div>
  );
}
