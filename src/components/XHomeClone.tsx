import { useRef, useState } from "react";
import type { XAccountIdentity } from "../types/x-profile";
import "../x-home.css";
import { XComposer } from "./XComposer";
import { XDiscoveryRail } from "./XDiscoveryRail";
import { XPostPlaceholderList } from "./XPostPlaceholderList";
import { XSidebar } from "./XSidebar";
import { useXSurface } from "./use-x-surface";
import "./x-home-clone.css";

interface XHomeCloneProps {
  account: XAccountIdentity;
}

export function XHomeClone({ account }: XHomeCloneProps) {
  const [showNewPosts, setShowNewPosts] = useState(true);
  const [postCount, setPostCount] = useState(5);
  const composerRegion = useRef<HTMLDivElement>(null);

  useXSurface("Home / Kleos", "x-home");

  function focusComposer() {
    composerRegion.current
      ?.querySelector<HTMLTextAreaElement>("textarea")
      ?.focus();
  }

  function addPost() {
    setPostCount((currentCount) => currentCount + 1);
  }

  return (
    <div className="x-home-root">
      <div className="x-home-clone">
        <div className="x-home-clone__sidebar">
          <XSidebar
            account={account}
            activeItem="Home"
            onPost={focusComposer}
          />
        </div>

        <main className="x-home-clone__timeline">
          <section aria-label="Home feed">
            <div ref={composerRegion}>
              <XComposer onPost={addPost} />
            </div>
            {showNewPosts ? (
              <button
                className="x-home-clone__new-posts"
                onClick={() => setShowNewPosts(false)}
                type="button"
              >
                <span aria-hidden="true" />
              </button>
            ) : null}
            <XPostPlaceholderList count={postCount} />
          </section>
        </main>

        <div className="x-home-clone__discovery">
          <XDiscoveryRail />
        </div>
      </div>
    </div>
  );
}
