"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CONFIG } from "@/lib/config";
import { ThemeToggle } from "./ThemeToggle";
import { AccountSwitcher } from "./AccountSwitcher";
import Link from "next/link";
import { Info, Star } from "lucide-react";

export function Header() {
  const router = useRouter();
  const [isLogoAnimating, setIsLogoAnimating] = useState(false);
  const pathname = usePathname();

  const handleLogoClick = () => {
    setIsLogoAnimating(true);
    router.push("/");
    // Reset animation after it completes
    setTimeout(() => setIsLogoAnimating(false), 400);
  };

  return (
    <header className="header">
      <div className="header-inner">
        <button
          className="brand"
          role="button"
          aria-label={`${CONFIG.appName} home`}
          onClick={handleLogoClick}
        >
          <div className={`logo ${isLogoAnimating ? 'animate-bounce' : ''}`} aria-hidden="true"></div>
          <h1>{CONFIG.appName}</h1>
        </button>
        <div className="header-actions" id="header-actions">
          <Link href="/about" className={`btn icon about-btn ${pathname === '/about' ? 'active' : ''}`} title="About MonoLog" aria-label="About MonoLog" aria-current={pathname === '/about' ? 'page' : undefined}>
            <Info size={20} strokeWidth={2} />
          </Link>
          <ThemeToggle />
          <Link href="/favorites" className={`btn icon favorites-btn ${pathname === '/favorites' ? 'active' : ''}`} title="Favorites" aria-label="Favorites" aria-current={pathname === '/favorites' ? 'page' : undefined}>
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