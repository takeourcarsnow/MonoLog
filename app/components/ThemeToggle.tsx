"use client";
import { currentTheme, toggleTheme } from "@/src/lib/theme";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "./Button";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => setTheme(currentTheme()), []);
  const Icon = theme === "light" ? Sun : Moon;
  return (
    <Button
      className="icon"
      title="Toggle theme"
      aria-label="Toggle theme"
      onClick={() => { const newTheme = toggleTheme(); setTheme(newTheme); }}
    >
      <Icon size={20} strokeWidth={2} />
    </Button>
  );
}
