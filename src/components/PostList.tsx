import {
  ChatCircleIcon,
  HeartIcon,
  RepeatIcon,
  ShareNetworkIcon,
} from "@phosphor-icons/react";
import { profilePath } from "../lib";
import type { Post } from "../types/profile";
import "./post-list.css";

interface PostListProps {
  posts: readonly Post[];
}

export function PostList({ posts }: PostListProps) {
  return (
    <div className="post-list">
      {posts.map((post) => (
        <article className="feed-post" key={post.id}>
          <a
            aria-label={`Open ${post.author.name}'s profile`}
            className="feed-post__avatar"
            href={profilePath(post.author.handle)}
          >
            {post.author.name.charAt(0)}
          </a>
          <div className="feed-post__body">
            <header className="feed-post__header">
              <a href={profilePath(post.author.handle)}>
                <strong>{post.author.name}</strong>
                <span>{post.author.handle}</span>
              </a>
              <span aria-label={`Posted ${post.postedAt} ago`}>· {post.postedAt}</span>
            </header>
            <p>{post.text}</p>
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
      ))}
    </div>
  );
}
