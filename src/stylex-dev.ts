const STYLEX_STYLESHEET_ID = "stylex-development-styles";

export function enableStylexDevelopmentStyles() {
  if (!import.meta.env.DEV || document.getElementById(STYLEX_STYLESHEET_ID)) return;

  const stylesheet = document.createElement("link");
  stylesheet.id = STYLEX_STYLESHEET_ID;
  stylesheet.rel = "stylesheet";
  stylesheet.href = "/virtual:stylex.css";
  document.head.append(stylesheet);

  void import("virtual:stylex:css-only");
}
