"use client";
import { currentTheme, toggleTheme } from "@/lib/theme";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/app/components/ui/Button";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => setTheme(currentTheme()), []);
  return (
    <Button
      className="icon no-effects"
      title="Toggle theme"
      aria-label="Toggle theme"
      onClick={() => {
        const newTheme = toggleTheme();
        setTheme(newTheme);
      }}
    >
      <Sun
        size={20}
        strokeWidth={2}
        style={{
          opacity: theme === "light" ? 1 : 0,
          position: 'absolute'
        }}
      />
      <Moon
        size={20}
        strokeWidth={2}
        style={{
          opacity: theme === "dark" ? 1 : 0,
          position: 'absolute'
        }}
      />
    </Button>
  );
}
