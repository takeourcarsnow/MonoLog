"use client";
import { currentThemeIcon, toggleTheme } from "@/lib/theme";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [icon, setIcon] = useState("🌓");
  useEffect(() => setIcon(currentThemeIcon()), []);
  return (
    <button
      className="btn icon"
      title="Toggle theme"
      aria-label="Toggle theme"
      onClick={() => { toggleTheme(); setIcon(currentThemeIcon()); }}
    >
      {icon}
    </button>
  );
}