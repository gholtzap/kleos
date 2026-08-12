import { ClerkProvider, useAuth, useUser } from "@clerk/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/manrope";
import App, { KleosMessage } from "./App";
import { HomePage } from "./components/HomePage";
import { ProfilePage } from "./components/ProfilePage";
import { accountHandle, signedInPageFromPath } from "./lib";
import { publicProfileIdFromHash } from "./public-profile";
import { reviewTokenFromHash } from "./review-links";
import { enableStylexDevelopmentStyles } from "./stylex-dev";
import { useLocationHash } from "./use-location-hash";
import "./global.css";

enableStylexDevelopmentStyles();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing root element.");

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const root = createRoot(rootElement);

function ClerkApplication() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const hash = useLocationHash();
  const sharedPage =
    publicProfileIdFromHash(hash) !== null ||
    reviewTokenFromHash(hash) !== null;

  if (sharedPage) return <App />;

  if (!isLoaded || !userLoaded) {
    return <KleosMessage>Loading Kleos…</KleosMessage>;
  }

  if (isSignedIn && user) {
    const email = user.primaryEmailAddress?.emailAddress;
    const account = {
      name:
        user.fullName?.trim() ||
        user.username?.trim() ||
        email ||
        user.id,
      handle: accountHandle(user.username, email, user.id),
    };

    return signedInPageFromPath(window.location.pathname) === "profile" ? (
      <ProfilePage account={account} />
    ) : (
      <HomePage account={account} />
    );
  }

  return <App />;
}

function RootApplication() {
  if (!clerkPublishableKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY.");

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
