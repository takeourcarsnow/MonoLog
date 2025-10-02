"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CONFIG } from "@/lib/config";
import { ThemeToggle } from "./ThemeToggle";
import { AccountSwitcher } from "./AccountSwitcher";
import Link from "next/link";
import { Info, Star } from "lucide-react";

export function Header() {
  const router = useRouter();
  return (
    <header className="header">
      <div className="header-inner">
        <button
          className="brand"
          role="button"
          aria-label={`${CONFIG.appName} home`}
          onClick={() => router.push("/")}
        >
          <div className="logo" aria-hidden="true"></div>
          <h1>{CONFIG.appName}</h1>
        </button>
        <div className="header-actions" id="header-actions">
          <Link href="/about" className="btn icon" title="About MonoLog" aria-label="About MonoLog">
            <Info size={20} strokeWidth={2} />
          </Link>
          <ThemeToggle />
          <Link href="/favorites" className="btn" title="Favorites" aria-label="Favorites">
            <Star size={20} strokeWidth={2} />
          </Link>
          <AccountSwitcher />
        </div>
      </div>
      {/* debug banner removed for cleaner UI */}
    </header>
  );
}
// Dev banner intentionally removed to prevent debug info from appearing in the UI