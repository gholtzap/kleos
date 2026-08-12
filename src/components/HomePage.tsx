import * as stylex from "@stylexjs/stylex";
import { useRef, useState } from "react";
import { appSurfaceStyles } from "../app-surface";
import type { AccountIdentity } from "../types/profile";
import { PostComposer } from "./PostComposer";
import { DiscoveryRail } from "./DiscoveryRail";
import { PostPlaceholderList } from "./PostPlaceholderList";
import { Sidebar } from "./Sidebar";
import { useAppSurface } from "./use-app-surface";
import { appLayoutStyles } from "./app-layout";

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
    <div {...stylex.props(appSurfaceStyles.root)}>
      <div {...stylex.props(appLayoutStyles.root)}>
        <div {...stylex.props(appLayoutStyles.sidebar)}>
          <Sidebar
            account={account}
            activeItem="Home"
            onPost={focusComposer}
          />
        </div>

        <main {...stylex.props(appLayoutStyles.timeline)}>
          <section aria-label="Home feed">
            <div ref={composerRegion}>
              <PostComposer onPost={addPost} />
            </div>
            {showNewPosts ? (
              <button
                {...stylex.props(appLayoutStyles.newPosts)}
                onClick={() => setShowNewPosts(false)}
                type="button"
              >
                <span {...stylex.props(appLayoutStyles.newPostsMark)} aria-hidden="true" />
              </button>
            ) : null}
            <PostPlaceholderList count={postCount} />
          </section>
        </main>

        <div {...stylex.props(appLayoutStyles.discovery)}>
          <DiscoveryRail />
        </div>
      </div>
    </div>
  );
}
