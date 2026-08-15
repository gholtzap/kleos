import { useEffect } from "react";

/**
 * Records that this browser last stood on the dark app surface, so the next
 * cold load can paint it before React or Clerk have answered. index.html reads
 * it in a script that runs ahead of the bundle; without it the first paint is
 * the light landing background and the app arrives as a white flash.
 */
const surfaceHintKey = "kleos.surface";

export function rememberAppSurface(): void {
  try {
    window.localStorage.setItem(surfaceHintKey, "app");
  } catch {
    // Private browsing can refuse storage. The hint is an optimization.
  }
}

/** Drops the hint once a member is signed out, so the landing paints light. */
export function forgetAppSurface(): void {
  try {
    window.localStorage.removeItem(surfaceHintKey);
  } catch {
    // See rememberAppSurface.
  }
}

export function useAppSurface(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    const previousSurface = document.documentElement.dataset.surface;
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousThemeColor = themeMeta?.content;
    document.title = title;
    document.documentElement.dataset.surface = "app";
    if (themeMeta) themeMeta.content = "#000000";
    rememberAppSurface();

    return () => {
      document.title = previousTitle;
      if (previousSurface) document.documentElement.dataset.surface = previousSurface;
      else delete document.documentElement.dataset.surface;
      if (themeMeta && previousThemeColor) themeMeta.content = previousThemeColor;
    };
  }, [title]);
}
