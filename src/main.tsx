import { ClerkProvider, useAuth, useUser } from "@clerk/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/manrope";
import "@fontsource-variable/newsreader";
import App from "./App";
import { XHomeClone } from "./components/XHomeClone";
import { XFrozuneProfileClone } from "./components/XFrozuneProfileClone";
import {
  accountHandle,
  heapUsageIsUnsafe,
  signedInPageFromPath,
  type HeapSnapshot,
} from "./lib";
import { publicProfileIdFromHash } from "./public-profile";
import { reviewTokenFromHash } from "./review-links";
import "./styles.css";

type MemoryPerformance = Performance & {
  memory?: HeapSnapshot;
};

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing root element.");

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const root = createRoot(rootElement);

function ClerkApplication() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const sharedPage =
    publicProfileIdFromHash(window.location.hash) !== null ||
    reviewTokenFromHash(window.location.hash) !== null;

  if (isLoaded && userLoaded && isSignedIn && user && !sharedPage) {
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
      <XFrozuneProfileClone account={account} />
    ) : (
      <XHomeClone account={account} />
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

const memory = (performance as MemoryPerformance).memory;
if (memory) {
  const interval = window.setInterval(() => {
    if (!heapUsageIsUnsafe(memory)) return;
    window.clearInterval(interval);
    root.unmount();
    rootElement.textContent =
      "Folio stopped this tab because it used too much memory. Reload to start again.";
  }, 5_000);
}
