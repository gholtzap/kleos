import { ClerkProvider } from "@clerk/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/manrope";
import "@fontsource-variable/newsreader";
import App from "./App";
import { heapUsageIsUnsafe, type HeapSnapshot } from "./lib";
import "./styles.css";

type MemoryPerformance = Performance & {
  memory?: HeapSnapshot;
};

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing root element.");

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!clerkPublishableKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY.");

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
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
