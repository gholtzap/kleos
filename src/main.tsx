import { ClerkProvider, useAuth, useUser } from "@clerk/react";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/manrope";
import App from "./App";
import { HomePage } from "./components/HomePage";
import { OfflinePreview } from "./components/OfflinePreview";
import { ProfilePage } from "./components/ProfilePage";
import {
  profilePathMatchesAccount,
  sharedRouteFromHash,
  sharedRouteFromPath,
} from "./lib";
import { accountHandle } from "./profile-identity";
import { useLocationHash } from "./use-location-hash";
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
  const pathRoute = sharedRouteFromPath(window.location.pathname);

  if (pathRoute) {
    if (
      account &&
      profilePathMatchesAccount(window.location.pathname, account.handle)
    ) {
      return <ProfilePage account={account} />;
    }
    return <App sharedRoute={pathRoute} />;
  }

  if (account) {
    return <HomePage account={account} getToken={getToken} />;
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

root.render(
  <StrictMode>
    <RootApplication />
  </StrictMode>,
);
