import { useState } from "react";

import "./x-composer.css";

interface XComposerProps {
  onPost: (text: string) => void;
}

export function XComposer({ onPost }: XComposerProps) {
  const [text, setText] = useState("");
  const postText = text.trim();

  function submitPost() {
    if (!postText) return;

    onPost(postText);
    setText("");
  }

  return (
    <section className="x-composer" aria-label="Create a post">
      <span aria-hidden="true" className="x-composer__avatar-placeholder" />

      <div className="x-composer__content">
        <div className="x-composer__input-shell">
          <textarea
            className="x-composer__input"
            aria-label="Post text"
            placeholder="What’s happening?"
            rows={1}
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
          />
        </div>

        <div className="x-composer__toolbar">
          <button
            className="x-composer__post"
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
