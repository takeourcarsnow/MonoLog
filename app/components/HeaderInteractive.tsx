"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { usePrevPathToggle } from "./usePrevPathToggle";
import { Info, Star } from "lucide-react";
import { Users } from "lucide-react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { useToast } from "./Toast";
import { useAuth } from "@/src/lib/hooks/useAuth";

// Non-critical header components loaded dynamically
const ThemeToggle = dynamic(() => import("./ThemeToggle").then(mod => mod.ThemeToggle), { ssr: false });
const AccountSwitcher = dynamic(() => import("./AccountSwitcher").then(mod => mod.AccountSwitcher), { ssr: false });

export function HeaderInteractive() {
  const router = useRouter();
  const [isLogoAnimating, setIsLogoAnimating] = useState(false);
  const pathname = usePathname();
  const [hasNewThreads, setHasNewThreads] = useState(false);
  const prevHasNewThreadsRef = useRef(false);
  const { show } = useToast();
  const { me } = useAuth();

  const { toggle: toggleFavorites, isActive: favIsActive } = usePrevPathToggle('/favorites', 'monolog:prev-path-before-favorites');

  // Define checkForNewThreads function outside useEffect so it can be exposed globally
  const checkForNewThreads = useCallback(async (forceToast = false) => {
    if (!me) {
      setHasNewThreads(false);
      return;
    }
    try {
      let lastChecked = localStorage.getItem('communitiesLastChecked');
      if (!lastChecked) {
        // Initialize lastChecked to now if not set
        lastChecked = new Date().toISOString();
        localStorage.setItem('communitiesLastChecked', lastChecked);
        setHasNewThreads(false);
        return;
      }

  const hasNew = await api.hasNewThreads(lastChecked);
      
      if (forceToast) {
        show("New posts in communities (forced)");
      } else {
        setHasNewThreads(hasNew);
      }
    } catch (e) {
      // Ignore errors - user might not be authenticated or API might be down
      setHasNewThreads(false);
    }
  }, [show, me]);

  // Expose for console testing
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).checkCommunities = (forceToast = false) => checkForNewThreads(forceToast);
      (window as any).setCommunitiesPulse = (pulse = true) => {
        setHasNewThreads(pulse);
      };
    }
  }, [checkForNewThreads]);

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

  // Reset hasNewThreads when authentication changes
  useEffect(() => {
    setHasNewThreads(false);
  }, [me]);

  // Check for new threads periodically when authenticated
  useEffect(() => {
    if (!me) return;

    // Check immediately
    checkForNewThreads();

    // Check every 30 seconds
    const interval = setInterval(checkForNewThreads, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [checkForNewThreads, me]);

  // Show toast when new threads are detected
  useEffect(() => {
    if (hasNewThreads && !prevHasNewThreadsRef.current) {
      show("New posts in communities");
    }
    prevHasNewThreadsRef.current = hasNewThreads;
  }, [hasNewThreads, show]);

  return (
    <>
      <button
        className="brand"
        role="button"
        aria-label="MonoLog home"
        onClick={handleLogoClick}
        disabled={isLogoAnimating}
      >
        <div ref={logoRef} className="logo" aria-hidden="true"></div>
        <h1>
          MonoLog
          <span className="sr-only"> 14 Your day in pictures.</span>
        </h1>
      </button>
      <div className="header-actions" id="header-actions">
        <button
          className={`btn icon about-btn no-tap-effects ${pathname === '/about' ? 'active' : ''}`}
          title="About MonoLog"
          aria-label="About MonoLog"
          aria-current={pathname === '/about' ? 'page' : undefined}
          onClick={usePrevPathToggle('/about', 'monolog:prev-path-before-about').toggle}
        >
          <Info size={20} strokeWidth={2} />
        </button>
        {/* Shell reserves space for ThemeToggle while the dynamic chunk loads */}
        <div className="theme-toggle-shell" aria-hidden>
          <ThemeToggle />
        </div>
        {/* Favorites button now sits to the right of ThemeToggle */}
        <button
          className={`btn icon favorites-btn no-tap-effects ${favIsActive ? 'active' : ''}`}
          title="Favorites"
          aria-label="Favorites"
          aria-current={favIsActive ? 'page' : undefined}
          onClick={toggleFavorites}
        >
          <Star size={20} strokeWidth={2} />
        </button>
        {/* Communities button (now to the right of Favorites) */}
        <Link href="/communities" className={`btn icon about-btn no-tap-effects ${pathname === '/communities' ? 'active' : ''} ${hasNewThreads ? 'communities-pulse' : ''}`} aria-label="Communities">
          <Users size={20} strokeWidth={2} />
        </Link>
        {/* Shell reserves space for the account switcher so the header doesn't
            reflow when the dynamic AccountSwitcher chunk loads or when the
            avatar appears. */}
        <div className="account-switcher-shell" aria-hidden>
          <AccountSwitcher />
        </div>
      </div>
    </>
  );
}