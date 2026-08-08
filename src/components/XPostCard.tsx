import { ArrowsClockwise, ChartBar, Share } from "@phosphor-icons/react";
import { useState } from "react";
import type { XPost } from "../types/x-home";
import {
  BookmarkIcon,
  LikeIcon,
  ReplyIcon,
  RepostIcon,
} from "./x-icons";
import "./x-post-card.css";

export function XPostCard({ post }: { post: XPost }) {
  const [replied, setReplied] = useState(false);
  const [reposted, setReposted] = useState(post.initiallyReposted ?? false);
  const [liked, setLiked] = useState(post.initiallyLiked ?? false);
  const [bookmarked, setBookmarked] = useState(post.initiallyBookmarked ?? false);
  const repostCount = post.metrics.reposts + Number(reposted) - Number(post.initiallyReposted ?? false);
  const likeCount = post.metrics.likes + Number(liked) - Number(post.initiallyLiked ?? false);

  return (
    <article className="x-post-card">
      {post.context ? (
        <div className="x-post-card__context">
          <ArrowsClockwise aria-hidden size={14} weight="bold" />
          <span>{post.context}</span>
        </div>
      ) : null}

      <div className="x-post-card__body">
        <img className="x-post-card__avatar" src={post.avatar} alt="" />

        <div className="x-post-card__content">
        <header className="x-post-card__header">
          <div className="x-post-card__identity">
            <span className="x-post-card__author">{post.author}</span>
            {post.verified ? (
              <svg
                className="x-post-card__verified"
                viewBox="0 0 22 22"
                aria-label="Verified account"
              >
                <path d="M20.4 11c0 1.2-1.5 2-1.8 3-.4 1.1.4 2.6-.3 3.4-.8.8-2.3-.1-3.4.3-1 .4-1.8 1.8-3 1.8s-2-1.5-3-1.8c-1.1-.4-2.6.4-3.4-.3-.8-.8.1-2.3-.3-3.4-.4-1-1.8-1.8-1.8-3s1.5-2 1.8-3c.4-1.1-.4-2.6.3-3.4.8-.8 2.3.1 3.4-.3 1-.4 1.8-1.8 3-1.8s2 1.5 3 1.8c1.1.4 2.6-.4 3.4.3.8.8-.1 2.3.3 3.4.3 1 1.8 1.8 1.8 3Z" />
                <path className="x-post-card__verified-check" d="m8.7 14.6-2.8-2.8 1.2-1.2 1.6 1.6 4.1-4.1L14 9.3l-5.3 5.3Z" />
              </svg>
            ) : null}
            <span className="x-post-card__handle">{post.handle}</span>
            <span className="x-post-card__separator">·</span>
            <time className="x-post-card__time">{post.time}</time>
          </div>
          <button className="x-post-card__more" type="button" aria-label="More actions">
            ···
          </button>
        </header>

          {post.replyTo ? (
            <p className="x-post-card__reply-target">
              Replying to <span>{post.replyTo}</span>
            </p>
          ) : null}

          <p className="x-post-card__text">{post.text}</p>

        {post.media ? (
          <img
            className="x-post-card__media"
            src={post.media}
            alt={post.mediaAlt ?? "Post media"}
          />
        ) : null}

        {post.quote ? (
          <div className={`x-post-card__quote${post.quote.media ? " x-post-card__quote--media" : ""}`}>
            {post.quote.media ? (
              <img className="x-post-card__quote-media" src={post.quote.media} alt="" />
            ) : null}
            <div className="x-post-card__quote-content">
              <div className="x-post-card__quote-header">
                {post.quote.avatar ? (
                  <img className="x-post-card__quote-avatar" src={post.quote.avatar} alt="" />
                ) : null}
                <strong>{post.quote.author}</strong>
                <span>{post.quote.handle}</span>
                <span>·</span>
                <span>{post.quote.time}</span>
              </div>
              <p>{post.quote.text}</p>
            </div>
          </div>
        ) : null}

        <div className="x-post-card__actions">
          <button
            className={`x-post-card__action x-post-card__action--reply${replied ? " is-active" : ""}`}
            type="button"
            aria-label="Reply"
            aria-pressed={replied}
            onClick={() => setReplied((value) => !value)}
          >
            <span className="x-post-card__action-icon"><ReplyIcon /></span>
            <span>{post.metrics.replies + Number(replied)}</span>
          </button>
          <button
            className={`x-post-card__action x-post-card__action--repost${reposted ? " is-active" : ""}`}
            type="button"
            aria-label="Repost"
            aria-pressed={reposted}
            onClick={() => setReposted((value) => !value)}
          >
            <span className="x-post-card__action-icon"><RepostIcon /></span>
            <span>{repostCount}</span>
          </button>
          <button
            className={`x-post-card__action x-post-card__action--like${liked ? " is-active" : ""}`}
            type="button"
            aria-label="Like"
            aria-pressed={liked}
            onClick={() => setLiked((value) => !value)}
          >
            <span className="x-post-card__action-icon"><LikeIcon /></span>
            <span>{likeCount}</span>
          </button>
          <button className="x-post-card__action x-post-card__action--views" type="button" aria-label={`${post.metrics.views} views`}>
            <span className="x-post-card__action-icon"><ChartBar aria-hidden size={18} /></span>
            <span>{post.metrics.views}</span>
          </button>
          <div className="x-post-card__utilities">
            <button
              className={`x-post-card__action x-post-card__action--bookmark${bookmarked ? " is-active" : ""}`}
              type="button"
              aria-label="Bookmark"
              aria-pressed={bookmarked}
              onClick={() => setBookmarked((value) => !value)}
            >
              <span className="x-post-card__action-icon"><BookmarkIcon /></span>
            </button>
            <button className="x-post-card__action x-post-card__action--share" type="button" aria-label="Share">
              <span className="x-post-card__action-icon"><Share aria-hidden size={18} /></span>
            </button>
          </div>
          </div>
        </div>
      </div>
    </article>
  );
}
