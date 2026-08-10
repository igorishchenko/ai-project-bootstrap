export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

// Inlined into <head> via layout.tsx so the theme is set before first paint —
// avoids a light->dark flash on load. Runs before React hydrates.
export const themeBootstrapScript = `
(function () {
  try {
    var stored = localStorage.getItem("${STORAGE_KEY}");
    var theme = stored || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return (document.documentElement.getAttribute("data-theme") as Theme) || "light";
}

export function setStoredTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable (private mode, etc.) — theme still applies for this session
  }
}
