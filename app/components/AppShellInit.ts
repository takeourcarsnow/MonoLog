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
    let removeListeners: (() => void) | null = null;
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
      // Prefer visualViewport when available (reports the visible area on
      // many mobile browsers). Also run a short delayed re-check after
      // initial load to catch cases where the browser chrome changes size
      // shortly after render.
      try {
        if (typeof window !== 'undefined') {
          const getVisualHeight = () => {
            try {
              // visualViewport may be undefined in some browsers.
              // Use the best available measurement.
              const vv = (window as any).visualViewport;
              return (vv && vv.height) ? vv.height : window.innerHeight;
            } catch (e) {
              return window.innerHeight;
            }
          };

          const setViewportVar = () => {
            try {
              const height = getVisualHeight();
              const vh = height * 0.01;
              const vhValue = `${vh}px`;
              document.documentElement.style.setProperty('--viewport-height', vhValue);
              if (process.env.NODE_ENV === 'development') {
                console.log('[DEBUG] AppShellInit viewport height updated:', vhValue, 'from height:', height, 'using visualViewport:', !!(window as any).visualViewport);
              }
            } catch (e) {
              // non-critical
            }
          };

          // Debug logging (enabled by ?debugViewport=1 or localStorage 'monolog.debugViewport')
          const debugEnabled = (() => {
            try {
              const params = new URL(window.location.href).searchParams;
              if (params.get('debugViewport') === '1') return true;
              if (window.localStorage && window.localStorage.getItem('monolog.debugViewport') === '1') return true;
            } catch (e) {}
            return false;
          })();

          let debugTimer: any = null;
          const debugLog = () => {
            if (!debugEnabled) return;
            try {
              const style = getComputedStyle(document.documentElement);
              const viewportVar = style.getPropertyValue('--viewport-height');
              const tabbarVar = style.getPropertyValue('--tabbar-height');
              const innerH = window.innerHeight;
              const clientH = document.documentElement.clientHeight;
              const vv = (window as any).visualViewport;
              const vvH = vv ? vv.height : undefined;
              const tabbarEl = document.querySelector<HTMLElement>('.tabbar');
              const contentEl = document.querySelector<HTMLElement>('.content');
              const tabRect = tabbarEl ? tabbarEl.getBoundingClientRect() : null;
              const contentRect = contentEl ? contentEl.getBoundingClientRect() : null;
              console.info('[monolog-debug] viewport innerHeight=', innerH, 'clientHeight=', clientH, 'visualViewport=', vvH);
              console.info('[monolog-debug] css --viewport-height=', viewportVar.trim(), ' --tabbar-height=', tabbarVar.trim());
              console.info('[monolog-debug] .tabbar rect=', tabRect, '.content rect=', contentRect);
              if (tabbarEl) {
                const cs = getComputedStyle(tabbarEl);
                console.info('[monolog-debug] .tabbar padding-bottom=', cs.paddingBottom, 'height=', tabbarEl.offsetHeight);
              }
            } catch (e) { console.warn('[monolog-debug] log failed', e); }
          };

          setViewportVar();
          // run again after short delay to catch late chrome transitions
          setTimeout(setViewportVar, 600);
          // and a slightly longer retry for flaky webviews
          setTimeout(setViewportVar, 1500);

          const onResize = () => { setViewportVar(); if (debugEnabled) { clearTimeout(debugTimer); debugTimer = setTimeout(debugLog, 80); } };
          const onOrientation = () => { setViewportVar(); if (debugEnabled) { setTimeout(debugLog, 160); } };
          window.addEventListener('resize', onResize, { passive: true });
          window.addEventListener('orientationchange', onOrientation);
          if ((window as any).visualViewport && (window as any).visualViewport.addEventListener) {
            (window as any).visualViewport.addEventListener('resize', onResize);
          }

          // Remove listeners on unmount to prevent leaks or duplicate handlers during HMR
          removeListeners = () => {
            try { window.removeEventListener('resize', onResize); } catch(_) {}
            try { window.removeEventListener('orientationchange', onOrientation); } catch(_) {}
            try { if ((window as any).visualViewport && (window as any).visualViewport.removeEventListener) (window as any).visualViewport.removeEventListener('resize', onResize); } catch(_) {}
          };

          // Ensure we remove listeners when the module is unloaded/reloaded
          // using beforeunload as a best-effort cleanup. Register the
          // listener after `removeListeners` is defined so we don't pass
          // a null reference.
          window.addEventListener('beforeunload', removeListeners as any);
          // Also call removeListeners inside the effect cleanup by returning it
          // from the outer try block below.

          if (debugEnabled) {
            // initial log after styling applied
            setTimeout(debugLog, 120);
          }
        }
      } catch (e) {}
    return () => {
      try { if (removeListeners) removeListeners(); } catch (_) {}
    };
  }, []);

  return { ready, isTouchDevice, forceTouch };
}
