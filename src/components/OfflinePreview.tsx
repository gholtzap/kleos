import { HomePage } from "./HomePage";
import { previewPosts } from "../fixtures/post-data";
import "./offline-preview.css";

const PREVIEW_ACCOUNT = {
  id: "preview",
  name: "Preview User",
  handle: "@preview",
};

export function OfflinePreview() {
  return (
    <>
      <div className="offline-preview__banner" role="status">
        Auth disabled locally — set VITE_CLERK_PUBLISHABLE_KEY in .env.local to sign in. Showing a
        static preview.
      </div>
      <HomePage
        account={PREVIEW_ACCOUNT}
        feedEnabled={false}
        getToken={async () => null}
        initialPosts={previewPosts}
      />
    </>
  );
}
