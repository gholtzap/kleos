import {
  ArrowRightIcon,
  CheckCircleIcon,
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
  SunIcon,
} from "@phosphor-icons/react";
import { SignIn, SignUp, UserButton, useAuth, useUser } from "@clerk/react";
import {
  lazy,
  Suspense,
  useEffect,
  useDeferredValue,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import { discoverProfessionals } from "./discovery";
import {
  claimState,
  evidenceForClaims,
} from "./folio";
import {
  authPageFromPath,
  emptyProfile,
  initials,
  parseCommaSeparatedList,
  type AuthPage,
} from "./lib";
import {
  getFolioRecord,
  getPublicProfile,
  publicProfileIdFromHash,
  publicProfileRevisionFromHash,
  saveFolioRecord,
} from "./public-profile";
import {
  getReviewBundle,
  reviewTokenFromHash,
} from "./review-links";
import { decideEvidenceReview, getEvidenceReviews } from "./reviews";
import {
  closeProfessionalRequest,
  createProfessionalRequest,
  formatRequestDate,
  getProfessionalRequests,
  requestKinds,
} from "./requests";
import type {
  Claim,
  DiscoveryResult,
  Evidence,
  EvidenceReviewItem,
  IntroductionDraft,
  NewProfessionalRequest,
  Person,
  ProfessionalRequest,
  RequestKind,
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

const ProveClaimDialog = lazy(() =>
  import("./prove-claim-dialog").then((module) => ({
    default: module.ProveClaimDialog,
  })),
);
const ShareReviewDialog = lazy(() =>
  import("./share-review-dialog").then((module) => ({
    default: module.ShareReviewDialog,
  })),
);

const routes: { id: Route; label: string; icon: typeof HouseIcon }[] = [
  { id: "profile", label: "Profile", icon: HouseIcon },
  { id: "vault", label: "Evidence vault", icon: FolderLockIcon },
  { id: "discover", label: "Discover", icon: CompassIcon },
  { id: "requests", label: "Requests", icon: HandshakeIcon },
];
const reviewRoute = {
  id: "reviews",
  label: "Evidence reviews",
  icon: SealCheckIcon,
} satisfies { id: Route; label: string; icon: typeof HouseIcon };

const clerkAuthAppearance = {
  theme: "simple",
  options: {
    logoPlacement: "none",
    socialButtonsPlacement: "bottom",
    socialButtonsVariant: "blockButton",
  },
  variables: {
    colorPrimary: "#f2f2ee",
    colorNeutral: "#f2f2ee",
    colorForeground: "#f2f2ee",
    colorMuted: "#151615",
    colorMutedForeground: "#9a9c97",
    colorBackground: "transparent",
    colorInput: "#111211",
    colorInputForeground: "#f2f2ee",
    colorRing: "#f2f2ee",
    colorBorder: "#383a38",
    colorDanger: "#f2f2ee",
    colorSuccess: "#f2f2ee",
    colorWarning: "#f2f2ee",
    fontFamily: '"Manrope Variable", sans-serif',
    fontFamilyButtons: '"Manrope Variable", sans-serif',
    borderRadius: "12px",
    fontSize: "0.8125rem",
    spacing: "1rem",
  },
  elements: {
    rootBox: {
      width: "100%",
    },
    cardBox: {
      width: "100%",
      boxShadow: "none",
    },
    card: {
      width: "100%",
      maxWidth: "420px",
      padding: "0",
      backgroundColor: "transparent",
      boxShadow: "none",
    },
    header: {
      alignItems: "flex-start",
      textAlign: "left",
    },
    headerTitle: {
      fontSize: "1.5rem",
      fontWeight: 680,
      letterSpacing: "-0.04em",
    },
    headerSubtitle: {
      color: "#9a9c97",
      fontSize: "0.8125rem",
    },
    formFieldLabel: {
      color: "#c8cac5",
      fontSize: "0.75rem",
      fontWeight: 650,
    },
    formFieldInput: {
      minHeight: "46px",
      border: "1px solid #383a38",
      backgroundColor: "#111211",
      boxShadow: "none",
    },
    formButtonPrimary: {
      minHeight: "48px",
      borderRadius: "999px",
      color: "#0b0c0b",
      backgroundColor: "#f2f2ee",
      boxShadow: "none",
      fontSize: "0.8125rem",
      fontWeight: 750,
      "&:hover": {
        backgroundColor: "#ffffff",
        boxShadow: "0 0 24px rgba(255, 255, 255, 0.18)",
      },
    },
    socialButtonsBlockButton: {
      minHeight: "46px",
      border: "1px solid #383a38",
      borderRadius: "999px",
      color: "#f2f2ee",
      backgroundColor: "transparent",
      boxShadow: "none",
      "&:hover": {
        borderColor: "#686a66",
        backgroundColor: "#181918",
      },
    },
    dividerLine: {
      backgroundColor: "#303230",
    },
    dividerText: {
      color: "#777a75",
      fontSize: "0.6875rem",
    },
    footerActionText: {
      color: "#9a9c97",
    },
    footerActionLink: {
      color: "#f2f2ee",
      fontWeight: 700,
    },
    formFieldAction: {
      color: "#f2f2ee",
    },
    identityPreview: {
      border: "1px solid #383a38",
      backgroundColor: "#111211",
      boxShadow: "none",
    },
  },
} satisfies NonNullable<ComponentProps<typeof SignIn>["appearance"]>;

function routeFromHash(): Route {
  const value = window.location.hash.replace("#/", "");
  return [...routes, reviewRoute].some((route) => route.id === value)
    ? (value as Route)
    : "landing";
}

export default function App() {
  const { getToken, isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const authPage = authPageFromPath(window.location.pathname);
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
  const [publicProfileRevision, setPublicProfileRevision] = useState(() =>
    publicProfileRevisionFromHash(window.location.hash),
  );
  const [reviewToken, setReviewToken] = useState(() =>
    reviewTokenFromHash(window.location.hash),
  );
  const [profile, setProfile] = useState<Person>(() =>
    emptyProfile("", "Folio member"),
  );
  const [dark, setDark] = useState(() => localStorage.getItem("folio-theme") !== "light");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimToEdit, setClaimToEdit] = useState<Claim | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [intro, setIntro] = useState<IntroductionDraft | null>(null);
  const [reviewQueue, setReviewQueue] = useState<EvidenceReviewItem[] | null>(null);
  const [recordRevision, setRecordRevision] = useState(0);
  const [recordLoaded, setRecordLoaded] = useState(false);
  const [recordError, setRecordError] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timeout = 0;
    const onHashChange = () => {
      window.clearTimeout(timeout);
      setLoading(true);
      setRoute(routeFromHash());
      setPublicProfileId(publicProfileIdFromHash(window.location.hash));
      setPublicProfileRevision(
        publicProfileRevisionFromHash(window.location.hash),
      );
      setReviewToken(reviewTokenFromHash(window.location.hash));
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
    const surface =
      isSignedIn && route !== "landing" && !publicProfileId && !reviewToken
        ? "workspace"
        : "public";
    document.documentElement.dataset.surface = surface;
    return () => {
      delete document.documentElement.dataset.surface;
    };
  }, [isSignedIn, publicProfileId, reviewToken, route]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!sessionUser) {
      setRecordLoaded(false);
      return;
    }
    setRecordLoaded(false);
    setRecordError("");
    let active = true;
    const controller = new AbortController();
    getToken()
      .then((token) => {
        if (!token) throw new Error("Missing Clerk session token.");
        const recordPromise = getFolioRecord(token, controller.signal).then(
          async (record) => {
            if (record) return record;
            const empty = {
              version: 1 as const,
              revision: 0,
              person: emptyProfile(sessionUser.id, sessionUser.name),
              claims: [],
            };
            try {
              return await saveFolioRecord(token, empty);
            } catch {
              const created = await getFolioRecord(token, controller.signal);
              if (!created) throw new Error("Folio could not be created.");
              return created;
            }
          },
        );
        return Promise.all([
          recordPromise,
          getEvidenceReviews(token).catch(() => null),
        ]);
      })
      .then(([record, reviews]) => {
        if (!active) return;
        setProfile(record?.person ?? emptyProfile(sessionUser.id, sessionUser.name));
        setClaims(record?.claims ?? []);
        setRecordRevision(record?.revision ?? 0);
        setReviewQueue(reviews);
        setRecordLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setRecordError(
          "Your Folio could not be loaded. Reload before you make changes.",
        );
        setRecordLoaded(true);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [getToken, sessionUser?.id, sessionUser?.name]);

  useEffect(() => {
    if (sessionUser && route === "landing" && !publicProfileId && !reviewToken) {
      window.location.hash = "/profile";
    }
  }, [publicProfileId, reviewToken, route, sessionUser]);

  const navigate = (next: Route) => {
    window.location.hash = next === "landing" ? "" : `/${next}`;
    if (next === route) setRoute(next);
  };

  const persistFolio = async (person: Person, nextClaims: Claim[]) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing Clerk session token.");
      const saved = await saveFolioRecord(token, {
        version: 1,
        revision: recordRevision,
        person,
        claims: nextClaims,
      });
      setProfile(saved.person);
      setClaims(saved.claims);
      setRecordRevision(saved.revision);
      return saved;
    } catch {
      setToast("Folio could not save these changes. Reload before you try again.");
      return null;
    }
  };

  if (reviewToken) {
    return (
      <ReviewLinkPage
        token={reviewToken}
        dark={dark}
        setDark={setDark}
      />
    );
  }

  if (publicProfileId) {
    return (
      <PublicProfilePage
        id={publicProfileId}
        revision={publicProfileRevision}
        dark={dark}
        setDark={setDark}
        onCreateAccount={() => window.location.assign("/sign-up")}
      />
    );
  }

  if (sessionPending || (sessionUser && !recordLoaded)) {
    return <AuthLoader />;
  }

  if (authPage) {
    return <AuthenticationPage page={authPage} />;
  }

  if (sessionUser && recordError) {
    return (
      <div className="public-profile-shell">
        <header className="public-profile-nav">
          <Logo />
          <WorkspaceUserButton />
        </header>
        <EmptyState
          icon={<InfoIcon size={28} />}
          title="Folio unavailable"
          copy={recordError}
          action={<Button onClick={() => window.location.reload()}>Reload</Button>}
        />
      </div>
    );
  }
  if (route === "landing" || !sessionUser) {
    return (
      <Landing
        onSignIn={() => window.location.assign("/sign-in")}
        onCreateAccount={() => window.location.assign("/sign-up")}
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
        showReviews={reviewQueue !== null}
      />
      <main className="app-main">
        <MobileBar
          route={route}
          navigate={navigate}
          onNewClaim={() => setClaimOpen(true)}
          showReviews={reviewQueue !== null}
        />
        {loading ? (
          <PageLoader />
        ) : (
          <>
            {route === "profile" ? (
              <ProfilePage
                person={profile}
                claims={claims}
                onNewClaim={() => setClaimOpen(true)}
                onEditClaim={setClaimToEdit}
                onEdit={() => setProfileOpen(true)}
                onShare={() => setShareOpen(true)}
              />
            ) : null}
            {route === "vault" ? (
              <VaultPage
                claims={claims}
                onEditClaim={setClaimToEdit}
                onUpdateClaim={async (claim) => {
                  const nextClaims = claims.map((item) =>
                    item.id === claim.id ? claim : item,
                  );
                  return Boolean(await persistFolio(profile, nextClaims));
                }}
                onToast={setToast}
              />
            ) : null}
            {route === "discover" ? <DiscoverPage onIntro={setIntro} /> : null}
            {route === "requests" ? (
              <RequestsPage
                getToken={getToken}
                ownerId={profile.id}
                onRespond={(request) =>
                  setToast(`Response started for “${request.title}”.`)
                }
                onToast={setToast}
              />
            ) : null}
            {route === "reviews" && reviewQueue !== null ? (
              <ReviewQueuePage
                items={reviewQueue}
                onDecision={async (item, decision, note) => {
                  const token = await getToken();
                  if (!token) {
                    setToast("Your session expired. Sign in again.");
                    return false;
                  }
                  try {
                    await decideEvidenceReview(token, {
                      ownerId: item.ownerId,
                      claimId: item.claimId,
                      evidenceId: item.evidence.id,
                      decision,
                      note,
                    });
                    setReviewQueue((queue) =>
                      queue?.filter(
                        (queued) =>
                          !(
                            queued.ownerId === item.ownerId &&
                            queued.claimId === item.claimId &&
                            queued.evidence.id === item.evidence.id
                          ),
                      ) ?? null,
                    );
                    setToast(`Evidence ${decision.toLowerCase()}.`);
                    return true;
                  } catch {
                    setToast("The review decision could not be saved.");
                    return false;
                  }
                }}
              />
            ) : null}
            {route === "reviews" && reviewQueue === null ? (
              <EmptyState
                icon={<FolderLockIcon size={28} />}
                title="Reviewer access required"
                copy="This queue is available only to allowlisted in-house reviewers."
                action={
                  <Button onClick={() => navigate("profile")}>
                    Return to profile
                  </Button>
                }
              />
            ) : null}
          </>
        )}
      </main>

      {claimOpen || claimToEdit ? (
        <Suspense fallback={null}>
          <ProveClaimDialog
            open={claimOpen || Boolean(claimToEdit)}
            claim={claimToEdit}
            onOpenChange={(open) => {
              if (open) return;
              setClaimOpen(false);
              setClaimToEdit(null);
            }}
            onSave={async (claim) => {
              const nextClaims = claimToEdit
                ? claims.map((item) => (item.id === claim.id ? claim : item))
                : [claim, ...claims];
              const saved = await persistFolio(profile, nextClaims);
              if (!saved) return false;
              setClaimOpen(false);
              setClaimToEdit(null);
              const savedClaim = saved.claims.find(
                (item) => item.id === claim.id,
              );
              setToast(
                `Claim saved as ${savedClaim ? claimState(savedClaim).toLowerCase() : "draft"}.`,
              );
              return true;
            }}
          />
        </Suspense>
      ) : null}
      {shareOpen ? (
        <Suspense fallback={null}>
          <ShareReviewDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            person={profile}
            claims={claims}
            revision={recordRevision}
            getToken={getToken}
            onToast={setToast}
          />
        </Suspense>
      ) : null}
      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={profile}
        onSave={async (nextProfile) => {
          const saved = await persistFolio(nextProfile, claims);
          if (!saved) return;
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

function AuthenticationPage({ page }: { page: AuthPage }) {
  const signingIn = page === "sign-in";

  return (
    <main className="auth-page">
      <section className="auth-page-context">
        <a className="auth-page-logo" href="/" aria-label="Folio home">
          <Logo />
        </a>
        <div className="auth-page-message">
          <h1>Professional profiles built on evidence.</h1>
          <p>
            {signingIn
              ? "Sign in to continue to your Folio."
              : "Create your account to start your Folio."}
          </p>
        </div>
        <footer>© 2026 Folio</footer>
      </section>

      <section
        className="auth-page-form-panel"
        aria-label={signingIn ? "Sign in" : "Create an account"}
      >
        <a className="auth-page-back" href="/">
          Back to Folio
        </a>
        <div className="auth-page-form">
          {signingIn ? (
            <SignIn
              appearance={clerkAuthAppearance}
              routing="hash"
              signUpUrl="/sign-up"
              fallbackRedirectUrl="/home"
            />
          ) : (
            <SignUp
              appearance={clerkAuthAppearance}
              routing="hash"
              signInUrl="/sign-in"
              fallbackRedirectUrl="/home"
            />
          )}
        </div>
      </section>
    </main>
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
  showReviews,
}: {
  person: Person;
  contact: string;
  route: Route;
  navigate: (route: Route) => void;
  onNewClaim: () => void;
  showReviews: boolean;
}) {
  const visibleRoutes = showReviews ? [...routes, reviewRoute] : routes;
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <Logo />
        </div>
        <Button onClick={onNewClaim} className="sidebar-create">
          <PlusIcon size={16} weight="bold" />
          Prove a claim
        </Button>
        <p className="sidebar-nav-label">Workspace</p>
        <nav aria-label="Primary">
          {visibleRoutes.map((item) => {
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
  showReviews,
}: {
  route: Route;
  navigate: (route: Route) => void;
  onNewClaim: () => void;
  showReviews: boolean;
}) {
  const visibleRoutes = showReviews ? [...routes, reviewRoute] : routes;
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
        {visibleRoutes.map((item) => {
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
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
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
  onNewClaim,
  onEditClaim,
  onEdit,
  onShare,
}: {
  person: Person;
  claims: Claim[];
  onNewClaim?: () => void;
  onEditClaim?: (claim: Claim) => void;
  onEdit?: () => void;
  onShare?: () => void;
}) {
  const [selected, setSelected] = useState<Claim | null>(null);
  const featured = claims.filter((claim) => claim.featured);
  const evidenceCount = evidenceForClaims(claims).length;
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
                  Prove a claim
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
              <strong>
                {claims.filter((claim) => claimState(claim) === "Confirmed").length}
              </strong>
              <span>confirmed claims</span>
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
      <ClaimDetail
        claim={selected}
        onEdit={
          selected && onEditClaim
            ? () => {
                onEditClaim(selected);
                setSelected(null);
              }
            : undefined
        }
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}

function PublicProfilePage({
  id,
  revision,
  dark,
  setDark,
  onCreateAccount,
}: {
  id: string;
  revision?: number;
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
    getPublicProfile(id, revision, controller.signal)
      .then((profile) => active && setPublished(profile))
      .catch(() => active && setError("This public profile could not be found."));
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, revision]);

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
        <ProfilePage person={published.person} claims={published.claims} />
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
  const state = claimState(claim);
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
            <Badge
              tone={
                state === "Confirmed"
                  ? "positive"
                  : state === "Supported"
                    ? "warning"
                    : "neutral"
              }
            >
              {state === "Confirmed" ? (
                <SealCheckIcon size={12} weight="fill" />
              ) : null}
              {state}
            </Badge>
            <span>
              {claim.evidence.length} evidence{" "}
              {claim.evidence.length === 1 ? "item" : "items"}
            </span>
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
  onEdit,
  onOpenChange,
}: {
  claim: Claim | null;
  onEdit?: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const state = claim ? claimState(claim) : "Draft";
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
          <div className="trust-item">
            <SealCheckIcon size={21} weight={state === "Confirmed" ? "fill" : "regular"} />
            <div>
              <strong>{state}</strong>
              <span>
                {state === "Confirmed"
                  ? "The Folio review team confirmed at least one supporting evidence item."
                  : state === "Supported"
                    ? "Supporting evidence is attached. It is not yet confirmed."
                    : "No usable supporting evidence is attached."}
              </span>
            </div>
          </div>
          <DividerLabel>Evidence</DividerLabel>
          {claim.evidence.length ? (
            <div className="claim-evidence-list">
              {claim.evidence.map((evidence) => (
                <article key={evidence.id} className="claim-evidence-item">
                  <div className="claim-evidence-heading">
                    <span className="evidence-icon">
                      {evidence.type === "System record" ? (
                        <LinkIcon size={18} />
                      ) : (
                        <FileTextIcon size={18} />
                      )}
                    </span>
                    <div>
                      <strong>{evidence.title}</strong>
                      <span>{evidence.type}</span>
                    </div>
                    <Badge
                      tone={
                        evidence.reviewStatus === "Confirmed"
                          ? "positive"
                          : evidence.reviewStatus === "Pending"
                            ? "warning"
                            : evidence.reviewStatus === "Rejected"
                              ? "private"
                              : "neutral"
                      }
                    >
                      {evidence.reviewStatus}
                    </Badge>
                  </div>
                  {evidence.detail ? <p>{evidence.detail}</p> : null}
                  {evidence.sourceUrl ? (
                    <a
                      href={evidence.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open source
                      <ArrowRightIcon size={14} />
                    </a>
                  ) : null}
                  {evidence.reviewNote ? (
                    <small>Review note: {evidence.reviewNote}</small>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="muted-copy">
              Add evidence to move this claim from Draft to Supported.
            </p>
          )}
          <div className="privacy-explainer">
            <LockKeyIcon size={20} />
            <div>
              <strong>
                {claim.privacy === "Public"
                  ? "The claim is public; private evidence remains hidden."
                  : "This claim has restricted visibility."}
              </strong>
              <span>
                A controlled review link can disclose only the evidence that its
                owner selects.
              </span>
            </div>
          </div>
          {onEdit ? (
            <div className="dialog-actions">
              <span />
              <Button onClick={onEdit}>Edit claim and evidence</Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}

function VaultPage({
  claims,
  onEditClaim,
  onUpdateClaim,
  onToast,
}: {
  claims: Claim[];
  onEditClaim: (claim: Claim) => void;
  onUpdateClaim: (claim: Claim) => Promise<boolean>;
  onToast: (message: string) => void;
}) {
  const [filter, setFilter] = useState<"All" | Evidence["access"]>("All");
  const [selected, setSelected] = useState<{
    claim: Claim;
    evidence: Evidence;
  } | null>(null);
  const evidence = claims.flatMap((claim) =>
    claim.evidence.map((item) => ({ claim, evidence: item })),
  );
  const visible = evidence.filter(
    (item) => filter === "All" || item.evidence.access === filter,
  );

  const updateAccess = async (access: Evidence["access"]) => {
    if (!selected) return;
    const updatedEvidence = { ...selected.evidence, access };
    const updatedClaim = {
      ...selected.claim,
      evidence: selected.claim.evidence.map((item) =>
        item.id === updatedEvidence.id ? updatedEvidence : item,
      ),
    };
    if (!(await onUpdateClaim(updatedClaim))) return;
    setSelected({ claim: updatedClaim, evidence: updatedEvidence });
    onToast("Evidence access updated.");
  };

  return (
    <div className="page">
      <PageHeader
        title="Evidence vault"
        description="Review evidence across your claims. Add or change evidence through its claim."
      />

      <div className="privacy-banner">
        <FolderLockIcon size={24} />
        <div>
          <strong>Your vault is private by default.</strong>
          <span>
            Evidence appears in a public profile only when you mark it Public. A
            review link includes only the items you select.
          </span>
        </div>
        <Badge tone="private">Controlled access</Badge>
      </div>

      <div className="vault-summary">
        <div>
          <span>Evidence items</span>
          <strong>{evidence.length}</strong>
        </div>
        <div>
          <span>Public items</span>
          <strong>
            {evidence.filter((item) => item.evidence.access === "Public").length}
          </strong>
        </div>
        <div>
          <span>Pending review</span>
          <strong>
            {
              evidence.filter(
                (item) => item.evidence.reviewStatus === "Pending",
              ).length
            }
          </strong>
        </div>
        <div>
          <span>Claims supported</span>
          <strong>
            {claims.filter((claim) => claimState(claim) !== "Draft").length}
          </strong>
        </div>
      </div>

      <div className="toolbar">
        <div className="segmented" aria-label="Filter evidence">
          {(["All", "Private", "Public"] as const).map((item) => (
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
              {visible.map(({ claim, evidence: item }) => (
                <tr key={item.id}>
                  <td>
                    <button
                      className="evidence-name"
                      onClick={() => setSelected({ claim, evidence: item })}
                    >
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
                  <td>{claim.project}</td>
                  <td>
                    <Badge tone={item.access === "Public" ? "positive" : "private"}>
                      {item.access !== "Public" ? <LockKeyIcon size={12} /> : null}
                      {item.access}
                    </Badge>
                  </td>
                  <td>
                    <Badge
                      tone={
                        item.reviewStatus === "Confirmed"
                          ? "positive"
                          : item.reviewStatus === "Pending"
                            ? "warning"
                            : item.reviewStatus === "Rejected"
                              ? "private"
                              : "neutral"
                      }
                    >
                      {item.reviewStatus}
                    </Badge>
                  </td>
                  <td>{new Date(item.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelected({ claim, evidence: item })}
                    >
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
          copy={
            claims.length
              ? "Choose another filter or add evidence through a claim."
              : "Prove your first claim to add evidence."
          }
          action={
            visible.length === 0 && filter !== "All" ? (
              <Button onClick={() => setFilter("All")}>Show all evidence</Button>
            ) : claims[0] ? (
              <Button onClick={() => onEditClaim(claims[0]!)}>
                Edit first claim
              </Button>
            ) : (
              <Button onClick={() => window.location.assign("/#/profile")}>
                Go to profile
              </Button>
            )
          }
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
                <strong>{selected.evidence.title}</strong>
                <span>{selected.evidence.detail}</span>
              </div>
            </div>
            <div className="meta-grid">
              <div>
                <span>Type</span>
                <strong>{selected.evidence.type}</strong>
              </div>
              <div>
                <span>Review state</span>
                <strong>{selected.evidence.reviewStatus}</strong>
              </div>
            </div>
            {selected.evidence.sourceUrl ? (
              <a
                className="evidence-source-link"
                href={selected.evidence.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open source
                <ArrowRightIcon size={14} />
              </a>
            ) : null}
            <Field
              label="Who can access this evidence?"
              htmlFor="evidence-access"
              helper="Private evidence can still be selected for a controlled review link."
            >
              <select
                id="evidence-access"
                value={selected.evidence.access}
                onChange={(event) => {
                  void updateAccess(event.target.value as Evidence["access"]);
                }}
              >
                <option>Private</option>
                <option>Public</option>
              </select>
            </Field>
            <div className="dialog-actions">
              <Button
                variant="ghost"
                onClick={() => {
                  onEditClaim(selected.claim);
                  setSelected(null);
                }}
              >
                Edit claim and evidence
              </Button>
              <Button onClick={() => setSelected(null)}>Done</Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function DiscoverPage({
  onIntro,
}: {
  onIntro: (draft: IntroductionDraft) => void;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [expertise, setExpertise] = useState("");
  const [ownership, setOwnership] = useState("Any ownership");
  const [results, setResults] = useState<DiscoveryResult[]>([]);
  const [nextCursor, setNextCursor] = useState<string>();
  const [selected, setSelected] = useState<DiscoveryResult | null>(null);
  const [loadingResults, setLoadingResults] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoadingResults(true);
      setError("");
      void discoverProfessionals(
        {
          query: deferredQuery.trim(),
          expertise: expertise.trim(),
          ownership: ownership === "Any ownership" ? "" : ownership,
        },
        controller.signal,
      )
        .then((page) => {
          setResults(page.items);
          setNextCursor(page.nextCursor);
        })
        .catch((requestError: unknown) => {
          if (
            requestError instanceof DOMException &&
            requestError.name === "AbortError"
          ) {
            return;
          }
          setResults([]);
          setNextCursor(undefined);
          setError("Professional discovery could not be loaded.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoadingResults(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [deferredQuery, expertise, ownership]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const page = await discoverProfessionals({
        query: deferredQuery.trim(),
        expertise: expertise.trim(),
        ownership: ownership === "Any ownership" ? "" : ownership,
        cursor: nextCursor,
      });
      setResults((items) => [...items, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch {
      setError("More professionals could not be loaded.");
    } finally {
      setLoadingMore(false);
    }
  };

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
        <input
          value={expertise}
          onChange={(event) => setExpertise(event.target.value)}
          aria-label="Filter by expertise"
          placeholder="Filter by expertise"
        />
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
        <span>
          {results.length}
          {nextCursor ? "+" : ""} relevant professionals
        </span>
        <span>Public profiles with matching claims</span>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      {loadingResults ? (
        <PageLoader />
      ) : results.length ? (
        <div className="discovery-list">
          {results.map((result, index) => {
            const { person, claim } = result;
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
                      {claimState(claim)}
                    </Badge>
                    <Badge>{claim.ownership}</Badge>
                  </div>
                </div>
                <div className="person-connect">
                  <span>{person.relationship}</span>
                  {person.availability[0] ? (
                    <span className="availability-dot">
                      <i />
                      Open to {person.availability[0].toLowerCase()}
                    </span>
                  ) : null}
                  <Button variant="outline" onClick={() => setSelected(result)}>
                    View profile
                  </Button>
                  <Button onClick={() => onIntro({ person, reason: "", outcome: "" })}>
                    Request intro
                  </Button>
                </div>
              </article>
            );
          })}
          {nextCursor ? (
            <Button
              variant="outline"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          ) : null}
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
                setExpertise("");
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
        title={selected?.person.name ?? "Professional profile"}
        description={selected?.person.role}
        wide
      >
        {selected ? (
          <div className="discovery-profile">
            <div className="discovery-profile-head">
              <Avatar
                initials={selected.person.initials}
                accent={selected.person.accent}
                size="xl"
              />
              <div>
                <h2>{selected.person.name}</h2>
                <p>{selected.person.summary}</p>
                <div className="tag-list">
                  {selected.person.expertise.map((item) => (
                    <Badge key={item}>{item}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <DividerLabel>Relevant supported claim</DividerLabel>
            <ClaimCard claim={selected.claim} index={0} onOpen={() => {}} />
            <div className="dialog-actions">
              <Button
                onClick={() => {
                  onIntro({
                    person: selected.person,
                    reason: "",
                    outcome: "",
                  });
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
  getToken,
  ownerId,
  onRespond,
  onToast,
}: {
  getToken: () => Promise<string | null>;
  ownerId: string;
  onRespond: (request: ProfessionalRequest) => void;
  onToast: (message: string) => void;
}) {
  const [kind, setKind] = useState<"All" | RequestKind>("All");
  const [requests, setRequests] = useState<ProfessionalRequest[]>([]);
  const [nextCursor, setNextCursor] = useState<string>();
  const [requestOpen, setRequestOpen] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoadingRequests(true);
    setError("");
    void getToken()
      .then((token) => {
        if (!token) throw new Error("Missing session.");
        return getProfessionalRequests(
          token,
          kind === "All" ? null : kind,
          undefined,
          controller.signal,
        );
      })
      .then((page) => {
        if (!active) return;
        setRequests(page.items);
        setNextCursor(page.nextCursor);
      })
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        if (!active) return;
        setRequests([]);
        setNextCursor(undefined);
        setError("Professional requests could not be loaded.");
      })
      .finally(() => {
        if (active) setLoadingRequests(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [getToken, kind]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing session.");
      const page = await getProfessionalRequests(
        token,
        kind === "All" ? null : kind,
        nextCursor,
      );
      setRequests((items) => [...items, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch {
      setError("More professional requests could not be loaded.");
    } finally {
      setLoadingMore(false);
    }
  };

  const create = async (input: NewProfessionalRequest): Promise<boolean> => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing session.");
      const created = await createProfessionalRequest(token, input);
      if (kind === "All" || created.kind === kind) {
        setRequests((items) => [created, ...items]);
      }
      onToast("Professional request published.");
      return true;
    } catch {
      setError("The professional request could not be published.");
      return false;
    }
  };

  const close = async (request: ProfessionalRequest) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing session.");
      await closeProfessionalRequest(token, request.id);
      setRequests((items) => items.filter((item) => item.id !== request.id));
      onToast("Professional request closed.");
    } catch {
      setError("The professional request could not be closed.");
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Clear needs, credible context"
        title="Professional requests"
        description="Ask for specific help, experience, or collaboration without posting into a general content feed."
        actions={
          <Button onClick={() => setRequestOpen(true)}>
            <PlusIcon size={16} />
            Publish request
          </Button>
        }
      />
      <div className="request-layout">
        <aside className="request-filter">
          <p className="aside-label">Request type</p>
          {(["All", ...requestKinds] as const).map((item) => (
            <button
              key={item}
              className={kind === item ? "active" : ""}
              onClick={() => setKind(item)}
            >
              {item}
            </button>
          ))}
          <div className="request-note">
            <InfoIcon size={18} />
            Requests must include intent, commitment, constraints, and compensation when
            applicable.
          </div>
        </aside>
        <div className="request-list">
          {error ? <p className="field-error">{error}</p> : null}
          {loadingRequests ? (
            <PageLoader />
          ) : requests.length ? (
            <>
              {requests.map((request) => (
                <article key={request.id} className="request-card">
                <div className="request-card-top">
                  <Badge tone="accent">{request.kind}</Badge>
                  <span>{formatRequestDate(request.postedAt)}</span>
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
                  {request.author.id === ownerId ? (
                    <Button
                      variant="ghost"
                      onClick={() => void close(request)}
                    >
                      Close request
                    </Button>
                  ) : (
                    <Button onClick={() => onRespond(request)}>
                      Respond with context
                    </Button>
                  )}
                </footer>
                </article>
              ))}
              {nextCursor ? (
                <Button
                  variant="outline"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
              ) : null}
            </>
          ) : (
            <EmptyState
              icon={<HandshakeIcon size={28} />}
              title={`No ${kind.toLowerCase()} requests right now`}
              copy="Choose another request type or publish a clear professional need."
              action={
                <Button onClick={() => setRequestOpen(true)}>
                  Publish request
                </Button>
              }
            />
          )}
        </div>
      </div>
      <RequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        onCreate={create}
      />
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

function ReviewLinkPage({
  token,
  dark,
  setDark,
}: {
  token: string;
  dark: boolean;
  setDark: (dark: boolean) => void;
}) {
  const [bundle, setBundle] = useState<Awaited<
    ReturnType<typeof getReviewBundle>
  > | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setBundle(null);
    setError("");
    getReviewBundle(token, controller.signal)
      .then((value) => active && setBundle(value))
      .catch(
        () =>
          active &&
          setError("This review link is invalid, expired, or revoked."),
      );
    return () => {
      active = false;
      controller.abort();
    };
  }, [token]);

  return (
    <div className="public-profile-shell">
      <header className="public-profile-nav">
        <Logo />
        <div>
          <ThemeButton dark={dark} setDark={setDark} />
          <Button onClick={() => window.location.assign("/")}>Go to Folio</Button>
        </div>
      </header>
      {error ? (
        <EmptyState
          icon={<InfoIcon size={28} />}
          title="Review unavailable"
          copy={error}
          action={<Button onClick={() => window.location.assign("/")}>Go to Folio</Button>}
        />
      ) : bundle ? (
        <>
          <div className="review-link-banner">
            <ShieldCheckIcon size={20} />
            <span>
              This controlled view expires{" "}
              {new Date(bundle.expiresAt).toLocaleString()}.
            </span>
          </div>
          <ProfilePage
            person={bundle.record.person}
            claims={bundle.record.claims}
          />
        </>
      ) : (
        <PageLoader />
      )}
    </div>
  );
}

function ReviewQueuePage({
  items,
  onDecision,
}: {
  items: EvidenceReviewItem[];
  onDecision: (
    item: EvidenceReviewItem,
    decision: "Confirmed" | "Rejected",
    note: string,
  ) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState<EvidenceReviewItem | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const decide = async (decision: "Confirmed" | "Rejected") => {
    if (!selected) return;
    if (decision === "Rejected" && note.trim().length < 10) {
      setError("Explain the rejection in at least 10 characters.");
      return;
    }
    setSaving(true);
    const saved = await onDecision(selected, decision, note.trim());
    setSaving(false);
    if (!saved) return;
    setSelected(null);
    setNote("");
    setError("");
  };

  return (
    <div className="page">
      <PageHeader
        title="Evidence reviews"
        description="Confirm only the evidence that supports the stated claim and outcome."
      />
      {items.length ? (
        <div className="review-queue">
          {items.map((item) => (
            <article
              key={`${item.ownerId}-${item.claimId}-${item.evidence.id}`}
            >
              <div>
                <span>{item.ownerName}</span>
                <h2>{item.claimTitle}</h2>
                <p>{item.evidence.title}</p>
              </div>
              <Badge tone="warning">Pending</Badge>
              <Button variant="outline" onClick={() => setSelected(item)}>
                Review evidence
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<SealCheckIcon size={28} />}
          title="No evidence needs review"
          copy="New evidence requests will appear here."
          action={<Button onClick={() => window.location.reload()}>Refresh</Button>}
        />
      )}
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (open) return;
          setSelected(null);
          setNote("");
          setError("");
        }}
        title="Review evidence"
        description="Compare the source with the contribution and measured outcome."
        wide
      >
        {selected ? (
          <div className="review-decision">
            <div className="review-decision-context">
              <span>{selected.ownerName}</span>
              <h2>{selected.claimTitle}</h2>
              <div className="review-claim-context">
                <span>Personal contribution</span>
                <p>{selected.contribution}</p>
                <span>Measured outcome</span>
                <p>{selected.outcome}</p>
                <small>{selected.outcomeContext}</small>
              </div>
              <strong>{selected.evidence.title}</strong>
              <p>{selected.evidence.detail}</p>
              {selected.evidence.sourceUrl ? (
                <a
                  href={selected.evidence.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open source
                  <ArrowRightIcon size={14} />
                </a>
              ) : null}
            </div>
            <Field
              label="Review note"
              htmlFor="review-note"
              helper="A rejection requires a clear reason. A confirmation note is optional."
              error={error}
            >
              <textarea
                id="review-note"
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
            <div className="dialog-actions split-actions">
              <Button
                variant="danger"
                disabled={saving}
                onClick={() => void decide("Rejected")}
              >
                Reject evidence
              </Button>
              <Button
                disabled={saving}
                onClick={() => void decide("Confirmed")}
              >
                Confirm evidence
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function RequestDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (request: NewProfessionalRequest) => Promise<boolean>;
}) {
  const [kind, setKind] = useState<RequestKind>("Advice");
  const [title, setTitle] = useState("");
  const [need, setNeed] = useState("");
  const [experience, setExperience] = useState("");
  const [commitment, setCommitment] = useState("");
  const [compensation, setCompensation] = useState("");
  const [constraints, setConstraints] = useState("");
  const [preferredEvidence, setPreferredEvidence] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = "State the request clearly.";
    if (need.trim().length < 25) nextErrors.need = "Explain the need in at least 25 characters.";
    if (!commitment.trim()) nextErrors.commitment = "State the expected commitment.";
    if (!compensation.trim()) nextErrors.compensation = "State compensation or say that it is unpaid.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    const created = await onCreate({
      kind,
      title: title.trim(),
      need: need.trim(),
      experience: parseCommaSeparatedList(experience),
      commitment: commitment.trim(),
      compensation: compensation.trim(),
      constraints: constraints.trim() || "No additional constraints",
      preferredEvidence:
        preferredEvidence.trim() || "A relevant structured claim is helpful",
    });
    setSaving(false);
    if (!created) return;
    setTitle("");
    setNeed("");
    setExperience("");
    setCommitment("");
    setCompensation("");
    setConstraints("");
    setPreferredEvidence("");
    setErrors({});
    onOpenChange(false);
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
                setKind(event.target.value as RequestKind)
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
          <Button type="submit" disabled={saving}>
            {saving ? "Publishing…" : "Publish request"}
          </Button>
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
