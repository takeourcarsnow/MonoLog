"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback, Dispatch, SetStateAction } from "react";
import dynamic from "next/dynamic";
import { usePrevPathToggle } from "@/app/components/layout/usePrevPathToggle";
import { Info, Star, Search } from "lucide-react";
import { Users } from "lucide-react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/hooks/useAuth";
import { NotificationsPopup } from "@/app/components/notifications/NotificationsPopup";

// Non-critical header components loaded dynamically
const ThemeToggle = dynamic(() => import("@/app/components/ui/ThemeToggle").then(mod => mod.ThemeToggle), { ssr: false });
const ProfileButton = dynamic(() => import("@/app/components/profile/ProfileButton").then(mod => mod.ProfileButton), { ssr: false });

export function HeaderInteractive() {
  const router = useRouter();
  const [isLogoAnimating, setIsLogoAnimating] = useState(false);
  const pathname = usePathname();
  const [hasNewThreads, setHasNewThreads] = useState(false);
  const prevHasNewThreadsRef = useRef(false);
  const { me } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showNotificationsPopup, setShowNotificationsPopup] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

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
      
      // We no longer use toast notifications; optionally log in dev
      if (forceToast && process.env.NODE_ENV === 'development') {
        console.debug('[communities] New posts detected (forced)');
      }
      setHasNewThreads(hasNew);
    } catch (e) {
      // Ignore errors - user might not be authenticated or API might be down
      setHasNewThreads(false);
    }
  }, [me]);

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
    const logoTextRef = useRef<HTMLHeadingElement | null>(null);
  const animationRef = useRef<Animation | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [hideLogoText, setHideLogoText] = useState(false);
  const suppressUnreadUntilRef = useRef<number>(0);
  const lastMarkAllAtRef = useRef<number>(0);

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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for global event when notifications are marked as read
  useEffect(() => {
    function onMarkedAllRead() {
      setHasUnreadNotifications(false);
      // Suppress unread polling updates for a short window to avoid races
      suppressUnreadUntilRef.current = Date.now() + 10000; // 10s
      lastMarkAllAtRef.current = Date.now();
      try { localStorage.setItem('notificationsLastMarkAllAt', String(lastMarkAllAtRef.current)); } catch (_) {}
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:notifications_marked_all_read', onMarkedAllRead);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('monolog:notifications_marked_all_read', onMarkedAllRead);
      }
    };
  }, []);

  // Restore last mark-all timestamp across refreshes
  useEffect(() => {
    try {
      const v = localStorage.getItem('notificationsLastMarkAllAt');
      if (v) {
        const ts = parseInt(v, 10);
        if (!Number.isNaN(ts)) lastMarkAllAtRef.current = ts;
      }
    } catch (_) {}
  }, []);

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

  // Check for unread notifications when authenticated
  useEffect(() => {
    let interval: any;
    let aborted = false;
    async function checkUnread() {
      // Skip polling while the popup is open to avoid races while marking read
      if (showNotificationsPopup) return;
      // Also skip if within suppression window after marking all read
      if (Date.now() < suppressUnreadUntilRef.current) return;
      try {
        const anyApi: any = api as any;
        let count: number = (await anyApi.getUnreadNotificationsCount?.()) ?? 0;
        // If shortly after a mark-all we still see unread, attempt a forced mark-all and recheck once
        if ((count || 0) > 0 && lastMarkAllAtRef.current && (Date.now() - lastMarkAllAtRef.current) < 20000) {
          try {
            await anyApi.markAllNotificationsRead?.();
            // small delay to allow persistence
            await new Promise(r => setTimeout(r, 300));
            count = (await anyApi.getUnreadNotificationsCount?.()) ?? count;
          } catch (_) { /* ignore */ }
        }
        if (!aborted) setHasUnreadNotifications((count || 0) > 0);
      } catch (_) {
        if (!aborted) setHasUnreadNotifications(false);
      }
    }
    if (me) {
      checkUnread();
      interval = setInterval(checkUnread, 30000);
    } else {
      setHasUnreadNotifications(false);
    }
    return () => { aborted = true; if (interval) clearInterval(interval); };
  }, [me, showNotificationsPopup]);

  // Optional console hint when new threads are detected
  useEffect(() => {
    if (hasNewThreads && !prevHasNewThreadsRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.info('[communities] New posts detected');
      }
    }
    prevHasNewThreadsRef.current = hasNewThreads;
  }, [hasNewThreads]);

  // Detect overlap between logo text and header actions and hide the text
  // when they approach each other to avoid visual overlap. Uses the logo
  // icon's position + the measured text width so hiding the text doesn't
  // change the measurement and cause a feedback loop (flicker).
  useLogoOverlapDetection(logoRef, logoTextRef, actionsRef, setHideLogoText);

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
        <h1 ref={logoTextRef} className={hideLogoText ? 'logo-text-hidden' : ''}>
          MonoLog
          <span className="sr-only">  14 Your day in pictures</span>
        </h1>
      </button>
      <div className="header-actions" id="header-actions" ref={actionsRef}>
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
        <div className="theme-toggle-shell">
          <ThemeToggle />
        </div>
        {/* Communities button */}
        <Link href="/communities" className={`btn icon about-btn no-tap-effects ${pathname === '/communities' ? 'active' : ''} ${hasNewThreads ? 'communities-pulse' : ''}`} aria-label="Communities">
          <Users size={20} strokeWidth={2} />
        </Link>
        {/* Notifications button */}
        {mounted && me ? (
          <button
            className={`btn icon notifications-btn no-tap-effects ${hasUnreadNotifications ? 'unread' : ''}`}
            title="Notifications"
            aria-label="Notifications"
            onClick={() => { setShowNotificationsPopup(true); setHasUnreadNotifications(false); }}
          >
            <Bell size={20} strokeWidth={2} />
          </button>
        ) : (
          <Link href="/profile" className="btn icon notifications-btn no-tap-effects" aria-label="Notifications">
            <Bell size={20} strokeWidth={2} />
          </Link>
        )}
        {/* Search button */}
        <Link href={mounted && me ? "/search" : "/profile"} className={`btn icon search-btn no-tap-effects ${pathname === '/search' ? 'active' : ''}`} aria-label="Search">
          <Search size={20} strokeWidth={2} />
        </Link>
        {/* Shell reserves space for the profile button so the header doesn't
            reflow when the dynamic ProfileButton chunk loads or when the
            avatar appears. */}
        <div className="profile-button-shell">
          <ProfileButton />
        </div>
      </div>
      <NotificationsPopup
        open={showNotificationsPopup}
        onClose={() => {
          setShowNotificationsPopup(false);
          // After closing, keep suppression for a short while; next interval poll will refresh
          suppressUnreadUntilRef.current = Math.max(suppressUnreadUntilRef.current, Date.now() + 4000);
        }}
      />
    </>
  );
}

// Small client-side hook like behavior lives in this file: detect when the
// header actions overlap the logo text and collapse the text to avoid visual
// overlap. Uses ResizeObserver and window resize for robustness.
function useLogoOverlapDetection(
  logoRef: React.RefObject<HTMLElement | null>,
  logoTextRef: React.RefObject<HTMLElement | null>,
  actionsRef: React.RefObject<HTMLElement | null>,
  setHidden: Dispatch<SetStateAction<boolean>>
) {
  useEffect(() => {
    if (!logoRef.current || !actionsRef.current) return;

    let raf = 0;
    let mounted = true;

    // Measure the full text width once (or whenever the text changes).
    let textWidth = 0;
    if (logoTextRef.current) {
      // scrollWidth gives the full measured width even if overflow/clip is set
      textWidth = logoTextRef.current.scrollWidth || logoTextRef.current.offsetWidth || 0;
    }

    const threshold = 6; // start hiding slightly before actual collision
    const hysteresis = 10; // px - require extra space before un-hiding

    function check() {
      if (!mounted) return;
      if (!logoRef.current || !actionsRef.current) return;
      const logoRect = logoRef.current.getBoundingClientRect();
      const actionsRect = actionsRef.current.getBoundingClientRect();

      // Compute where the right edge of the visible text would be based on
      // the logo icon right edge plus the measured text width. This prevents
      // the measured element changing size from flipping the decision.
      const textRightIfVisible = logoRect.right + (textWidth || 0);

      const collideNow = textRightIfVisible + threshold >= actionsRect.left;

      // Hysteresis: when currently hidden, require extra space to unhide.
      setHidden((prev: boolean) => {
        if (prev) {
          // currently hidden -> only unhide if we're well clear
          if (textRightIfVisible + threshold + hysteresis < actionsRect.left) {
            return false;
          }
          return true;
        } else {
          // currently visible -> hide if collision
          return collideNow;
        }
      });
    }

    const ro = new ResizeObserver(() => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(check);
    });

    // Observe things that affect layout: the icon and the actions group
    ro.observe(logoRef.current);
    ro.observe(actionsRef.current);

    // Also observe text resize so we can re-measure width if it changes
    // Note: We don't observe logoTextRef to avoid loops when hiding/showing the text

    window.addEventListener('resize', () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(check);
    }, { passive: true });

    // Initial check (measure text width before checking)
    if (logoTextRef.current) textWidth = logoTextRef.current.scrollWidth || textWidth;
    check();

    return () => {
      mounted = false;
      try { ro.disconnect(); } catch (_) {}
      window.removeEventListener('resize', check);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [logoRef, logoTextRef, actionsRef, setHidden]);
}

// Hook invocation (kept at bottom to keep main component tidy)
// Note: this is placed outside component scope intentionally and wired up
// below after the component declaration to keep top-level component logic
// focused. We need to call the hook inside the module so React rules are
// satisfied (it's invoked in the same render pass as component creation via
// direct call in the module). To keep it simple, call it via a small wrapper
// when the module loads in client.
// However, React hooks must be called from React components; instead we call
// the helper inside the component using the refs/state above. To avoid
// duplicating logic we export nothing here.