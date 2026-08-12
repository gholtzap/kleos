import { useState } from "react";

import "./post-composer.css";

interface PostComposerProps {
  onPost: (text: string) => void;
}

export function PostComposer({ onPost }: PostComposerProps) {
  const [text, setText] = useState("");
  const postText = text.trim();

  function submitPost() {
    if (!postText) return;

    onPost(postText);
    setText("");
  }

  return (
    <section className="post-composer" aria-label="Create a post">
      <span aria-hidden="true" className="post-composer__avatar-placeholder" />

      <div className="post-composer__content">
        <div className="post-composer__input-shell">
          <textarea
            className="post-composer__input"
            aria-label="Post text"
            placeholder="What’s happening?"
            rows={1}
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
          />
        </div>

        <div className="post-composer__toolbar">
          <button
            className="post-composer__post"
            type="button"
            disabled={!postText}
            onClick={submitPost}
          >
            Post
          </button>
        </div>
      </div>
    </section>
  );
}
