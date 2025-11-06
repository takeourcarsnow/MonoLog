"use client";

import { useEffect, useState } from "react";
import { initTheme } from "@/lib/theme";
import { api } from "@/lib/api";

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

      // Simplified viewport handling: rely on CSS dynamic viewport units (dvh)
      // for modern browsers. As a very small safeguard, set the CSS custom
      // property to 1dvh so existing styles using var(--viewport-height)
      // continue to work without JS listeners.
      try {
        if (typeof window !== 'undefined') {
          document.documentElement.style.setProperty('--viewport-height', '1dvh');
        }
      } catch (_) {}
    return () => {};
  }, []);

  return { ready, isTouchDevice, forceTouch };
}
