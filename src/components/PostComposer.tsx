import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { scoreSlop, slopLabel } from "../slop-score";
import { SlopMeter } from "./SlopMeter";

import "./post-composer.css";

interface PostComposerProps {
  onPost: (text: string) => void;
}

export function PostComposer({ onPost }: PostComposerProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const postText = text.trim();
  const slopScore = useMemo(() => scoreSlop(postText), [postText]);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    function resize() {
      if (!input) return;
      input.style.height = "auto";
      input.style.height = `${input.scrollHeight}px`;
    }

    resize();
    let lastWidth = input.clientWidth;

    // Width changes (viewport resize, sidebar collapse) rewrap the text, so height has
    // to be remeasured — the inline height from the last run would otherwise stick.
    // Only width is acted on: reacting to height would loop against the height set here.
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width === undefined || width === lastWidth) return;
      lastWidth = width;
      resize();
    });
    observer.observe(input);
    return () => observer.disconnect();
  }, [text]);

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
            ref={inputRef}
            rows={1}
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
          />
        </div>

        <AnimatePresence>
          {postText ? (
            <motion.div
              animate={{ opacity: 1 }}
              className="post-composer__meter"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <SlopMeter score={slopScore} size={32} />
              <span className="post-composer__meter-label">{slopLabel(slopScore)}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>

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
