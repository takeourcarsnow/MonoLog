"use client";

import { useRouter } from "next/navigation";
import { CONFIG } from "@/lib/config";
import { ThemeToggle } from "./ThemeToggle";
import { AccountSwitcher } from "./AccountSwitcher";
import Link from "next/link";

export function Header() {
  const router = useRouter();
  return (
    <header className="header">
      <div className="header-inner">
        <button
          className="brand"
          role="button"
          aria-label={`${CONFIG.appName} home`}
          onClick={() => router.push("/explore")}
        >
          <div className="logo" aria-hidden="true"></div>
          <h1>{CONFIG.appName}</h1>
        </button>
        <div className="header-actions" id="header-actions">
          <Link href="/about" className="btn icon" title="About MonoLog" aria-label="About MonoLog">ℹ️</Link>
          <ThemeToggle />
          <Link href="/favorites" className="btn" title="Favorites" aria-label="Favorites">⭐</Link>
          <AccountSwitcher />
        </div>
      </div>
    </header>
  );
}