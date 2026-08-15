import { useRef, useState } from "react";
import { testPosts } from "../post-data";
import type { AccountIdentity, Post } from "../types/profile";
import "../app-surface.css";
import { PostComposer } from "./PostComposer";
import { DiscoveryRail } from "./DiscoveryRail";
import { PostList } from "./PostList";
import { Sidebar } from "./Sidebar";
import { useAppSurface } from "./use-app-surface";
import "./app-layout.css";

interface HomePageProps {
  account: AccountIdentity;
}

export function HomePage({ account }: HomePageProps) {
  const [posts, setPosts] = useState<readonly Post[]>(testPosts);
  const composerRegion = useRef<HTMLDivElement>(null);

  useAppSurface("Home / Kleos");

  function focusComposer() {
    composerRegion.current
      ?.querySelector<HTMLTextAreaElement>("textarea")
      ?.focus();
  }

  function addPost(text: string) {
    setPosts((currentPosts) => [
      {
        id: crypto.randomUUID(),
        author: account,
        text,
        postedAt: "Now",
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
      },
      ...currentPosts,
    ]);
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
            <PostList posts={posts} />
          </section>
        </main>

        <div className="app-layout__discovery">
          <DiscoveryRail />
        </div>
      </div>
    </div>
  );
}
