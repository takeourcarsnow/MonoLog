"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CONFIG } from "@/lib/config";
import { ThemeToggle } from "./ThemeToggle";
import { AccountSwitcher } from "./AccountSwitcher";
import Link from "next/link";
import { Info, Star } from "lucide-react";

export function Header() {
  const router = useRouter();
  const [isLogoAnimating, setIsLogoAnimating] = useState(false);
  const pathname = usePathname();

  const PREV_FAV_KEY = "monolog:prev-path-before-favorites";

  const handleFavoritesToggle = (e: any) => {
    e.preventDefault();
    const current = pathname || "/";

    // If we're not on /favorites, store the current path and go to /favorites
    if (current !== "/favorites") {
      try {
        sessionStorage.setItem(PREV_FAV_KEY, current);
      } catch (err) {
        // ignore storage errors
      }
      router.push("/favorites");
      return;
    }

    // If we're already on /favorites, try to return to the previous page.
    // Prefer using the browser history (router.back()) when it looks safe,
    // otherwise fall back to the stored previous path in sessionStorage.
    try {
      const histLen = typeof window !== 'undefined' ? window.history.length : 0;
      if (histLen > 1) {
        // navigate back in history — this preserves user's original navigation
        // context (e.g. scroll position). Remove stored key as it's no longer needed.
        try { sessionStorage.removeItem(PREV_FAV_KEY); } catch (_) {}
        router.back();
        return;
      }
    } catch (_) {
      // ignore
    }

    let prev = "/";
    try {
      const v = sessionStorage.getItem(PREV_FAV_KEY);
      if (v) prev = v;
    } catch (err) {
      // ignore
    }
    if (prev === "/favorites") prev = "/";
    try { sessionStorage.removeItem(PREV_FAV_KEY); } catch (_) {}
    router.push(prev);
  };

  const handleLogoClick = () => {
    // Use the Web Animations API so the animation is driven by the browser
    // compositor and we get a reliable `finished` promise. Keep a small
    // fallback timeout in case the animation doesn't finish for any reason.
    if (!logoRef.current) {
      router.push("/");
      return;
    }

    // cancel any running animation / fallback
    try { animationRef.current?.cancel?.(); } catch (_) {}
    try { if (navigateFallbackRef.current !== undefined) clearTimeout(navigateFallbackRef.current); } catch (_) {}

    setIsLogoAnimating(true);

    // subtler bounce: smaller scale/rotation and slightly longer duration
    const anim = logoRef.current.animate(
      [
        { transform: 'scale(1) rotate(0deg)' },
        // stronger spin on the down phase
        { transform: 'scale(0.96) rotate(-180deg)', offset: 0.28 },
        // stronger spin on the up phase
        { transform: 'scale(1.04) rotate(180deg)', offset: 0.62 },
        { transform: 'scale(1) rotate(0deg)' }
      ],
      { duration: 520, easing: 'cubic-bezier(0.34, 1.2, 0.64, 1)', fill: 'forwards' }
    );
    animationRef.current = anim;

    // fallback navigation in case the finished promise never resolves
    navigateFallbackRef.current = window.setTimeout(() => {
      try { animationRef.current?.cancel?.(); } catch (_) {}
      router.push("/");
      setIsLogoAnimating(false);
      navigateFallbackRef.current = undefined;
    }, 700);

    anim.finished.then(() => {
      if (navigateFallbackRef.current !== undefined) {
        try { clearTimeout(navigateFallbackRef.current); } catch (_) {}
        navigateFallbackRef.current = undefined;
      }
      router.push("/");
      setIsLogoAnimating(false);
    }).catch(() => {
      // aborted/cancelled - ensure navigation still occurs via fallback
    });
  };

  const navigateFallbackRef = useRef<number | undefined>(undefined);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<Animation | null>(null);

  useEffect(() => {
    return () => {
      if (navigateFallbackRef.current !== undefined) {
        try { clearTimeout(navigateFallbackRef.current); } catch (_) {}
      }
      try { animationRef.current?.cancel?.(); } catch (_) {}
    };
  }, []);

  return (
    <header className="header">
      <div className="header-inner">
        <button
          className="brand"
          role="button"
          aria-label={`${CONFIG.appName} home`}
          onClick={handleLogoClick}
          disabled={isLogoAnimating}
        >
          <div ref={logoRef} className={`logo`} aria-hidden="true"></div>
          <h1>{CONFIG.appName}</h1>
        </button>
        <div className="header-actions" id="header-actions">
          <Link href="/about" className={`btn icon about-btn ${pathname === '/about' ? 'active' : ''}`} title="About MonoLog" aria-label="About MonoLog" aria-current={pathname === '/about' ? 'page' : undefined}>
            <Info size={20} strokeWidth={2} />
          </Link>
          <ThemeToggle />
          <button
            className={`btn icon favorites-btn ${pathname === '/favorites' ? 'active' : ''}`}
            title="Favorites"
            aria-label="Favorites"
            aria-current={pathname === '/favorites' ? 'page' : undefined}
            onClick={handleFavoritesToggle}
          >
            <Star size={20} strokeWidth={2} />
          </button>
          <AccountSwitcher />
        </div>
      </div>
      {/* debug banner removed for cleaner UI */}
    </header>
  );
}
// Dev banner intentionally removed to prevent debug info from appearing in the UI