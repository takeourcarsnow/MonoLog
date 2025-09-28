const KEY = "monolog_theme";

function apply(mode: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", mode);
}

export function initTheme() {
  if (typeof window === "undefined") return;
  const saved = (window.localStorage.getItem(KEY) as "light" | "dark" | null) || null;
  if (saved) {
    apply(saved);
    return;
  }

  // No saved preference: use OS preference and keep listening for changes.
  try {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const preferDark = mq.matches;
    apply(preferDark ? "dark" : "light");
    mq.addEventListener?.("change", (e) => {
      apply(e.matches ? "dark" : "light");
    });
  } catch {
    // fallback to light
    apply("light");
  }
}

export function toggleTheme() {
  if (typeof document === "undefined") return "light";
  const cur = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
  const next = cur === "light" ? "dark" : "light";
  apply(next);
  try {
    window.localStorage.setItem(KEY, next);
  } catch {}
  return next;
}

export function currentThemeIcon() {
  const v = (typeof document !== "undefined" ? document.documentElement.getAttribute("data-theme") : "light") || "light";
  return v === "light" ? "🌞" : "🌙";
}