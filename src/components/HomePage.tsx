import { useEffect, useRef, useState } from "react";
import type { SessionTokenGetter } from "../api-client";
import {
  createPost,
  deleteUnattachedUpload,
  getPostFeed,
  uploadPostFile,
  type UploadedPostFile,
} from "../post-feed";
import type { AccountIdentity, FeedPost } from "../types";
import "../app-surface.css";
import { DiscoveryRail } from "./DiscoveryRail";
import { PostComposer, type ComposerPost } from "./PostComposer";
import { PostList } from "./PostList";
import { PostPlaceholderList } from "./PostPlaceholderList";
import { Sidebar } from "./Sidebar";
import { useAppSurface } from "../hooks/use-app-surface";
import "./app-layout.css";

interface HomePageProps {
  account: AccountIdentity;
  feedEnabled?: boolean;
  getToken: SessionTokenGetter;
  initialPosts?: readonly FeedPost[];
}

export function HomePage({
  account,
  feedEnabled = true,
  getToken,
  initialPosts = [],
}: HomePageProps) {
  const [posts, setPosts] = useState<FeedPost[]>([...initialPosts]);
  const [nextCursor, setNextCursor] = useState<string>();
  const [loading, setLoading] = useState(feedEnabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState("");
  const composerRegion = useRef<HTMLDivElement>(null);

  useAppSurface("Home / Kleos");

  function focusComposer() {
    composerRegion.current
      ?.querySelector<HTMLTextAreaElement>("textarea")
      ?.focus();
  }

  useEffect(() => {
    if (!feedEnabled) return;
    const controller = new AbortController();
    getPostFeed(getToken, undefined, controller.signal)
      .then((page) => {
        setPosts(page.items);
        setNextCursor(page.nextCursor);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFeedError(error instanceof Error ? error.message : "Could not load posts.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [feedEnabled, getToken]);

  async function publishPost(draft: ComposerPost) {
    if (!feedEnabled) throw new Error("Sign in to publish this post.");
    const results = await Promise.allSettled(
      draft.media.map(({ file }) => uploadPostFile(file, getToken)),
    );
    const uploaded: UploadedPostFile[] = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const failed = results.find((result) => result.status === "rejected");
    if (failed?.status === "rejected") {
      await Promise.allSettled(uploaded.map(deleteUnattachedUpload));
      throw failed.reason;
    }
    const ordered = uploaded.map((upload, index) => ({
      publicId: upload.publicId,
      kind: upload.kind,
      alt: draft.media[index]?.alt ?? "",
    }));
    // A failed response can follow a successful commit. Do not delete media
    // after the create request starts because it can already belong to a post.
    const created = await createPost({ body: draft.body, media: ordered }, getToken);
    setPosts((current) => [created, ...current]);
    setFeedError("");
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getPostFeed(getToken, nextCursor);
      setPosts((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : "Could not load more posts.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="app-surface">
      <div className="app-layout">
        <div className="app-layout__sidebar">
          <Sidebar account={account} activeItem="Home" onPost={focusComposer} />
        </div>

        <main className="app-layout__timeline">
          <section aria-label="Home feed">
            <div ref={composerRegion}>
              <PostComposer onPost={publishPost} />
            </div>
            {feedError ? <p className="app-layout__feed-error" role="alert">{feedError}</p> : null}
            {loading ? <PostPlaceholderList count={3} /> : (
              <>
                <PostList posts={posts} />
                {nextCursor ? (
                  <button
                    className="app-layout__load-more"
                    disabled={loadingMore}
                    onClick={() => void loadMore()}
                    type="button"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                ) : null}
              </>
            )}
          </section>
        </main>

        <div className="app-layout__discovery">
          <DiscoveryRail />
        </div>
      </div>
    </div>
  );
}
