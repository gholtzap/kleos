import { HomePage } from "./HomePage";
import { previewBannerMessage, type PreviewReason } from "../lib";
import { previewPosts } from "../post-data";
import "./offline-preview.css";

const PREVIEW_ACCOUNT = {
  id: "preview",
  name: "Preview User",
  handle: "@preview",
};

export function OfflinePreview({ reason }: { reason: PreviewReason }) {
  return (
    <>
      <div className="offline-preview__banner" role="status">
        {previewBannerMessage(reason)}
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
