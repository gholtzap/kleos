import { useRef, useState } from "react";
import type { AccountIdentity } from "../types/profile";
import "../app-surface.css";
import { PostComposer } from "./PostComposer";
import { DiscoveryRail } from "./DiscoveryRail";
import { PostPlaceholderList } from "./PostPlaceholderList";
import { Sidebar } from "./Sidebar";
import { useAppSurface } from "./use-app-surface";
import "./app-layout.css";

interface HomePageProps {
  account: AccountIdentity;
}

export function HomePage({ account }: HomePageProps) {
  const [showNewPosts, setShowNewPosts] = useState(true);
  const [postCount, setPostCount] = useState(5);
  const composerRegion = useRef<HTMLDivElement>(null);

  useAppSurface("Home / Kleos");

  function focusComposer() {
    composerRegion.current
      ?.querySelector<HTMLTextAreaElement>("textarea")
      ?.focus();
  }

  function addPost() {
    setPostCount((currentCount) => currentCount + 1);
  }

  return (
    <div className="app-surface">
      <div className="app-layout">
        <div className="app-layout__sidebar">
          <Sidebar
            account={account}
            activeItem="Home"
            onPost={focusComposer}
          />
        </div>

        <main className="app-layout__timeline">
          <section aria-label="Home feed">
            <div ref={composerRegion}>
              <PostComposer onPost={addPost} />
            </div>
            {showNewPosts ? (
              <button
                className="app-layout__new-posts"
                onClick={() => setShowNewPosts(false)}
                type="button"
              >
                <span aria-hidden="true" />
              </button>
            ) : null}
            <PostPlaceholderList count={postCount} />
          </section>
        </main>

        <div className="app-layout__discovery">
          <DiscoveryRail />
        </div>
      </div>
    </div>
  );
}
