import { useEffect } from "react";

export function useXSurface(title: string, surface: string) {
  useEffect(() => {
    const previousTitle = document.title;
    const previousSurface = document.documentElement.dataset.surface;
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousThemeColor = themeMeta?.content;
    document.title = title;
    document.documentElement.dataset.surface = surface;
    if (themeMeta) themeMeta.content = "#000000";

    return () => {
      document.title = previousTitle;
      if (previousSurface) document.documentElement.dataset.surface = previousSurface;
      else delete document.documentElement.dataset.surface;
      if (themeMeta && previousThemeColor) themeMeta.content = previousThemeColor;
    };
  }, [surface, title]);
}
