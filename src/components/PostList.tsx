import {
  ChatCircleIcon,
  HeartIcon,
  RepeatIcon,
  ShareNetworkIcon,
} from "@phosphor-icons/react";
import { profilePath } from "../lib";
import type { FeedPost, PostMedia } from "../types";
import type { AccountIdentity } from "../types/profile";
import "./post-list.css";

interface PostListProps {
  account: AccountIdentity;
  posts: readonly FeedPost[];
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function MediaGrid({ media }: { media: PostMedia[] }) {
  if (!media.length) return null;
  return (
    <div className={`feed-post__media feed-post__media--${media.length}`}>
      {media.map((item) =>
        item.kind === "image" ? (
          <img
            alt={item.alt}
            decoding="async"
            height={item.height}
            key={item.id}
            loading="lazy"
            src={item.url}
            width={item.width}
          />
        ) : (
          <video
            controls
            key={item.id}
            playsInline
            poster={item.posterUrl}
            preload="metadata"
            src={item.url}
          />
        ),
      )}
    </div>
  );
}

export function PostList({ account, posts }: PostListProps) {
  if (!posts.length) {
    return (
      <div className="post-list__empty">
        <h2>No posts yet</h2>
        <p>Publish the first post in this feed.</p>
      </div>
    );
  }

  return (
    <div className="post-list">
      {posts.map((post) => {
        const authorUrl = post.author.id === account.id
          ? profilePath(account.handle)
          : `/#/p/${encodeURIComponent(post.author.id)}`;
        return (
          <article className="feed-post" key={post.id}>
            <a
              aria-label={`Open ${post.author.name}'s profile`}
              className="feed-post__avatar"
              href={authorUrl}
            >
              {post.author.avatarUrl ? (
                <img alt="" height={42} src={post.author.avatarUrl} width={42} />
              ) : post.author.name.charAt(0).toUpperCase()}
            </a>
            <div className="feed-post__body">
              <header className="feed-post__header">
                <a href={authorUrl}>
                  <strong>{post.author.name}</strong>
                  <span>{post.author.handle}</span>
                </a>
                <time dateTime={post.postedAt} title={new Date(post.postedAt).toLocaleString()}>
                  · {dateFormatter.format(new Date(post.postedAt))}
                </time>
              </header>
              {post.body ? <p>{post.body}</p> : null}
              <MediaGrid media={post.media} />
              {post.linkPreview ? (
                <a
                  className="feed-post__link-preview"
                  href={post.linkPreview.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {post.linkPreview.imageUrl ? (
                    <img alt="" loading="lazy" src={post.linkPreview.imageUrl} />
                  ) : null}
                  <span className="feed-post__link-copy">
                    <span>{post.linkPreview.siteName || new URL(post.linkPreview.url).hostname}</span>
                    <strong>{post.linkPreview.title}</strong>
                    {post.linkPreview.description ? <span>{post.linkPreview.description}</span> : null}
                  </span>
                </a>
              ) : null}
              <footer aria-label="Post activity" className="feed-post__activity">
                <span aria-label={`${post.replyCount} replies`}>
                  <ChatCircleIcon aria-hidden="true" />
                  {post.replyCount}
                </span>
                <span aria-label={`${post.repostCount} reposts`}>
                  <RepeatIcon aria-hidden="true" />
                  {post.repostCount}
                </span>
                <span aria-label={`${post.likeCount} likes`}>
                  <HeartIcon aria-hidden="true" />
                  {post.likeCount}
                </span>
                <span aria-label="Share">
                  <ShareNetworkIcon aria-hidden="true" />
                </span>
              </footer>
            </div>
          </article>
        );
      })}
    </div>
  );
}
