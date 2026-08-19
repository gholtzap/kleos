import { ClerkProvider, useAuth, useUser } from "@clerk/react";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/manrope";
import App from "./App";
import { HomePage } from "./components/HomePage";
import { OfflinePreview } from "./components/OfflinePreview";
import { ProfilePage } from "./components/ProfilePage";
import { SettingsPage } from "./components/SettingsPage";
import { forgetAppSurface } from "./hooks/use-app-surface";
import {
  isSettingsPath,
  profilePathMatchesAccount,
  sharedRouteFromHash,
  sharedRouteFromPath,
} from "./lib/lib";
import { interceptLinkClicks } from "./lib/navigation";
import { accountHandle } from "./lib/profile-identity";
import { useLocationHash } from "./hooks/use-location-hash";
import { usePathname } from "./hooks/use-pathname";
import "./styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing root element.");

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const root = createRoot(rootElement);

const CLERK_LOAD_TIMEOUT_MS = 6000;

function ClerkApplication() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const hash = useLocationHash();
  const pathname = usePathname();
  const [timedOut, setTimedOut] = useState(false);
  const sharedRoute = sharedRouteFromHash(hash);
  const clerkLoaded = isLoaded && userLoaded;

  useEffect(() => {
    if (clerkLoaded || !import.meta.env.DEV) return;
    const timer = window.setTimeout(() => setTimedOut(true), CLERK_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [clerkLoaded]);

  if (sharedRoute) return <App sharedRoute={sharedRoute} />;

  if (timedOut && !clerkLoaded) return <OfflinePreview />;

  if (!clerkLoaded) {
    return <p className="kleos-message">Loading Kleos…</p>;
  }


  const account = isSignedIn && user
    ? {
        id: user.id,
        name:
          user.fullName?.trim() ||
          user.username?.trim() ||
          user.primaryEmailAddress?.emailAddress ||
          user.id,
        handle: accountHandle(user.username, user.id),
        avatarUrl: user.imageUrl || undefined,
      }
    : null;
  // A signed-out browser must not paint the dark surface on its next load.
  if (!account) forgetAppSurface();
  const pathRoute = sharedRouteFromPath(pathname);

  if (pathRoute) {
    if (
      account &&
      profilePathMatchesAccount(pathname, account.handle)
    ) {
      return <ProfilePage account={account} />;
    }
    return <App sharedRoute={pathRoute} />;
  }

  if (account) {
    return isSettingsPath(pathname) ? (
      <SettingsPage account={account} />
    ) : (
      <HomePage account={account} getToken={getToken} />
    );
  }

  return <App />;
}

function RootApplication() {
  if (!clerkPublishableKey) {
    if (import.meta.env.DEV) return <OfflinePreview />;
    throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY.");
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
      <ClerkApplication />
    </ClerkProvider>
  );
}

// Same-origin links move between screens without reloading the page, which
// keeps Clerk warm and removes the interstitial that a reload forces.
interceptLinkClicks();

root.render(
  <StrictMode>
    <RootApplication />
  </StrictMode>,
);
