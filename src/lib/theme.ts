const KEY = "monolog_theme";

function apply(mode: "light" | "dark" | "system") {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", mode);
}

export function initTheme() {
  if (typeof window === "undefined") return;
  const saved = (window.localStorage.getItem(KEY) as "light" | "dark" | "system") || "system";
  apply(saved);
  try {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener?.("change", () => {
      const cur = document.documentElement.getAttribute("data-theme") as "light" | "dark" | "system" | null || "system";
      if (cur === "system") apply("system");
    });
  } catch {}
}

export function toggleTheme() {
  if (typeof document === "undefined") return "system";
  const cur = (document.documentElement.getAttribute("data-theme") as "light" | "dark" | "system") || "system";
  const next = cur === "light" ? "dark" : cur === "dark" ? "system" : "light";
  apply(next);
  try {
    window.localStorage.setItem(KEY, next);
  } catch {}
  return next;
}

export function currentThemeIcon() {
  const v = (typeof document !== "undefined" ? document.documentElement.getAttribute("data-theme") : "system") || "system";
  return v === "light" ? "🌞" : v === "dark" ? "🌙" : "🌓";
}