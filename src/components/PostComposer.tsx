import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { appColors } from "../app-tokens.stylex";

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
    <section {...stylex.props(styles.root)} aria-label="Create a post">
      <span {...stylex.props(styles.avatar)} aria-hidden="true" />

      <div {...stylex.props(styles.content)}>
        <div {...stylex.props(styles.inputShell)}>
          <textarea
            {...stylex.props(styles.input)}
            aria-label="Post text"
            placeholder="What’s happening?"
            rows={1}
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
          />
        </div>

        <div {...stylex.props(styles.toolbar)}>
          <button
            {...stylex.props(styles.post)}
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

const styles = stylex.create({
  root: {
    boxSizing: "border-box",
    display: "flex",
    width: "100%",
    maxWidth: 598,
    minHeight: 120,
    paddingBlockStart: 12,
    paddingBlockEnd: 8,
    paddingInline: 16,
    gap: 12,
    color: appColors.text,
    backgroundColor: appColors.background,
    borderBottomColor: appColors.border,
    borderBottomStyle: "solid",
    borderBottomWidth: 1,
  },
  avatar: {
    display: "block",
    width: 40,
    height: 40,
    marginTop: 4,
    flexBasis: 40,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: appColors.border,
    borderRadius: "50%",
  },
  content: { minWidth: 0, flex: 1 },
  inputShell: {
    display: "flex",
    height: 52,
    paddingTop: 10,
    alignItems: "flex-start",
  },
  input: {
    width: "100%",
    height: 28,
    paddingBlock: 2,
    paddingInline: 0,
    resize: "none",
    overflow: "hidden",
    color: appColors.text,
    backgroundColor: "transparent",
    borderWidth: 0,
    outline: 0,
    fontSize: 20,
    fontWeight: 400,
    lineHeight: "24px",
    "::placeholder": { color: appColors.muted, opacity: 1 },
  },
  toolbar: {
    display: "flex",
    width: "100%",
    height: 48,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  post: {
    minWidth: 66.734,
    height: 36,
    paddingInline: 16,
    flex: "0 0 auto",
    color: "#0f1419",
    backgroundColor: "#eff3f4",
    borderWidth: 0,
    borderRadius: 9999,
    fontSize: 15,
    fontWeight: 700,
    lineHeight: "20px",
    cursor: { default: "pointer", ":disabled": "default" },
    opacity: { default: 1, ":disabled": 0.5 },
    outline: { default: null, ":focus-visible": `2px solid ${appColors.blue}` },
    outlineOffset: { default: null, ":focus-visible": 2 },
  },
});
