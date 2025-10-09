"use client";

import { useEffect, useState } from "react";
import { initTheme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { CONFIG } from "@/src/lib/config";
import { seedIfNeeded } from "@/src/lib/seed";

export function useAppShellInit() {
  const [ready, setReady] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(() => {
    try {
      if (typeof window === 'undefined') return false;
      return (
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
        (window.matchMedia && window.matchMedia('(pointer:coarse)').matches)
      );
    } catch (e) {
      return false;
    }
  });
  const [forceTouch, setForceTouch] = useState(false);

  useEffect(() => {
    initTheme();
    (async () => {
      try {
        await api.init();
        if (CONFIG.mode === "local" && CONFIG.seedDemoData) {
          await seedIfNeeded(api);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setReady(true);
        try {
          if (typeof window !== 'undefined') {
            (window as any).__MONOLOG_APP_READY__ = true;
            try { window.dispatchEvent(new Event('monolog-ready')); } catch (e) {}
          }
        } catch (e) {}
      }
    })();

    // Re-check touch capability on mount in case environment changes
    // (keeps the value up-to-date but the initial synchronous detection
    // ensures Swiper mounts with the correct behavior).
    try {
      const touch = typeof window !== 'undefined' && (
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
        (window.matchMedia && window.matchMedia('(pointer:coarse)').matches)
      );
      setIsTouchDevice(Boolean(touch));
    } catch (e) {
      setIsTouchDevice(false);
    }

    // support a quick runtime override for testing: ?forceTouch=1 or localStorage monolog.forceTouch=1
    try {
      if (typeof window !== 'undefined') {
        const params = new URL(window.location.href).searchParams;
        const q = params.get('forceTouch');
        const ls = window.localStorage?.getItem('monolog.forceTouch');
        const val = q === '1' || ls === '1';
        if (val) setForceTouch(true);
      }
    } catch (_) {}

      // Keep a CSS variable in sync with the actual visual viewport height.
      // Many mobile browsers calculate 1vh including browser chrome which
      // causes layouts using 100vh to leave gaps when the chrome hides/shows.
      // We set --viewport-height to 1% of window.innerHeight (px) so
      // layout rules using calc(var(--viewport-height, 1vh) * 100) match
      // the visible area. This is intentionally minimal and runs only
      // on the client.
      try {
        if (typeof window !== 'undefined') {
          const setViewportVar = () => {
            try {
              const vh = window.innerHeight * 0.01;
              document.documentElement.style.setProperty(
                '--viewport-height',
                `${vh}px`
              );
            } catch (e) {
              // swallow - non-critical
            }
          };

          setViewportVar();
          window.addEventListener('resize', setViewportVar, { passive: true });
          window.addEventListener('orientationchange', setViewportVar);
          if ((window as any).visualViewport && (window as any).visualViewport.addEventListener) {
            (window as any).visualViewport.addEventListener('resize', setViewportVar);
          }

          // keep cleanup minimal - listeners removed when the page unloads
          // (we don't return a cleanup here because this effect is in a
          // module-level init that shouldn't unmount during the app lifecycle)
        }
      } catch (e) {}
  }, []);

  return { ready, isTouchDevice, forceTouch };
}
