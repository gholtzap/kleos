import { ImageSquareIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  acceptedPostFile,
  MAX_POST_BODY_LENGTH,
  MAX_POST_IMAGES,
  postImageMimeTypes,
  postVideoMimeTypes,
} from "../posts";
import { scoreSlop, slopLabel } from "../slop-score";
import { SlopMeter } from "./SlopMeter";

import "./post-composer.css";

export interface ComposerMedia {
  alt: string;
  file: File;
  previewUrl: string;
}

export interface ComposerPost {
  body: string;
  media: ComposerMedia[];
}

interface PostComposerProps {
  onPost: (post: ComposerPost) => Promise<void>;
}

const acceptedTypes = [...postImageMimeTypes, ...postVideoMimeTypes].join(",");

export function PostComposer({ onPost }: PostComposerProps) {
  const [text, setText] = useState("");
  const [media, setMedia] = useState<ComposerMedia[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useRef(new Set<string>());
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
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width === undefined || width === lastWidth) return;
      lastWidth = width;
      resize();
    });
    observer.observe(input);
    return () => observer.disconnect();
  }, [text]);

  useLayoutEffect(() => () => {
    for (const url of previewUrls.current) URL.revokeObjectURL(url);
  }, []);

  function selectMedia(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    const containsVideo = selected.some((file) => file.type.startsWith("video/"));
    const alreadyHasVideo = media.some(({ file }) => file.type.startsWith("video/"));
    if (selected.some((file) => !acceptedPostFile(file))) {
      setError("Use JPEG, PNG, WebP, or GIF images up to 10 MB, or a video up to 100 MB.");
      return;
    }
    if (
      (containsVideo && (selected.length > 1 || media.length > 0)) ||
      (alreadyHasVideo && selected.length > 0)
    ) {
      setError("Add either one video or up to four images.");
      return;
    }
    if (!containsVideo && media.length + selected.length > MAX_POST_IMAGES) {
      setError("You can add up to four images.");
      return;
    }
    const additions = selected.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      return { alt: "", file, previewUrl };
    });
    setMedia((current) => [...current, ...additions]);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeMedia(previewUrl: string) {
    URL.revokeObjectURL(previewUrl);
    previewUrls.current.delete(previewUrl);
    setMedia((current) => current.filter((item) => item.previewUrl !== previewUrl));
  }

  function updateAlt(previewUrl: string, alt: string) {
    setMedia((current) =>
      current.map((item) => item.previewUrl === previewUrl ? { ...item, alt } : item),
    );
  }

  async function submitPost() {
    if ((!postText && !media.length) || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onPost({ body: postText, media });
      for (const item of media) {
        URL.revokeObjectURL(item.previewUrl);
        previewUrls.current.delete(item.previewUrl);
      }
      setText("");
      setMedia([]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not publish the post.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="post-composer" aria-label="Create a post">
      <span aria-hidden="true" className="post-composer__avatar-placeholder" />

      <div className="post-composer__content">
        <div className="post-composer__input-shell">
          <textarea
            aria-label="Post text"
            className="post-composer__input"
            disabled={submitting}
            maxLength={MAX_POST_BODY_LENGTH}
            onChange={(event) => setText(event.currentTarget.value)}
            placeholder="What’s happening?"
            ref={inputRef}
            rows={1}
            value={text}
          />
        </div>

        {media.length ? (
          <div className={`post-composer__media post-composer__media--${media.length}`}>
            {media.map((item) => {
              const image = item.file.type.startsWith("image/");
              return (
                <div className="post-composer__media-item" key={item.previewUrl}>
                  {image ? (
                    <img alt="" src={item.previewUrl} />
                  ) : (
                    <video controls preload="metadata" src={item.previewUrl} />
                  )}
                  <button
                    aria-label={`Remove ${item.file.name}`}
                    className="post-composer__remove-media"
                    disabled={submitting}
                    onClick={() => removeMedia(item.previewUrl)}
                    type="button"
                  >
                    <XIcon aria-hidden="true" size={18} weight="bold" />
                  </button>
                  {image ? (
                    <input
                      aria-label={`Description for ${item.file.name}`}
                      className="post-composer__alt"
                      disabled={submitting}
                      maxLength={1_000}
                      onChange={(event) => updateAlt(item.previewUrl, event.currentTarget.value)}
                      placeholder="Image description"
                      value={item.alt}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

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

        {error ? <p className="post-composer__error" role="alert">{error}</p> : null}

        <div className="post-composer__toolbar">
          <input
            accept={acceptedTypes}
            aria-label="Choose photos or a video"
            className="post-composer__file-input"
            disabled={submitting}
            multiple
            onChange={(event) => selectMedia(event.currentTarget.files)}
            ref={fileInputRef}
            type="file"
          />
          <button
            aria-label="Add photos or a video"
            className="post-composer__add-media"
            disabled={submitting || media.some(({ file }) => file.type.startsWith("video/"))}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <ImageSquareIcon aria-hidden="true" size={21} />
          </button>
          <span className="post-composer__remaining" aria-live="polite">
            {text.length > MAX_POST_BODY_LENGTH - 250 ? MAX_POST_BODY_LENGTH - text.length : ""}
          </span>
          <button
            className="post-composer__post"
            disabled={(!postText && !media.length) || submitting}
            onClick={() => void submitPost()}
            type="button"
          >
            {submitting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </section>
  );
}
