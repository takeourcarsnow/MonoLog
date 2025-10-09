"use client";

import { useEffect } from "react";

// Measure the actual header height at runtime and publish it as a CSS
// variable so layout padding can match the rendered header size exactly.
export function useHeaderHeightMeasurement(ready: boolean, pathname: string) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateHeaderHeight = () => {
      try {
        const el = document.querySelector<HTMLElement>('.header');
        if (!el) return;
        const rect = el.getBoundingClientRect();
        document.documentElement.style.setProperty('--header-height', `${Math.ceil(rect.height)}px`);
      } catch (e) {
        /* ignore */
      }
    };

    // Run once immediately to set initial value
    updateHeaderHeight();

    // Use ResizeObserver when available to react to dynamic header size changes
    let ro: ResizeObserver | null = null;
    try {
      if ((window as any).ResizeObserver) {
        const headerEl = document.querySelector<HTMLElement>('.header');
        if (headerEl) {
          ro = new ResizeObserver(updateHeaderHeight);
          ro.observe(headerEl);
        }
      }
    } catch (_) { ro = null; }

    window.addEventListener('resize', updateHeaderHeight);
    window.addEventListener('orientationchange', updateHeaderHeight);

    return () => {
      try { ro && ro.disconnect(); } catch (_) {}
      window.removeEventListener('resize', updateHeaderHeight);
      window.removeEventListener('orientationchange', updateHeaderHeight);
    };
  }, [ready, pathname]);
}

// Measure the actual tabbar height at runtime and publish it as a CSS
// variable so layout padding can match the rendered tabbar size exactly.
export function useTabbarHeightMeasurement(ready: boolean) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateTabbarHeight = () => {
      try {
        const el = document.querySelector<HTMLElement>('.tabbar');
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        if (!rect || rect.height < 1) return false;
        document.documentElement.style.setProperty('--tabbar-height', `${Math.ceil(rect.height)}px`);
        return true;
      } catch (e) {
        return false;
      }
    };

    // Run once immediately to set initial value. If the tabbar isn't
    // present or has zero height yet (some webviews render slightly later),
    // retry a few times with short backoff.
    let measured = updateTabbarHeight();
    if (!measured) {
      let attempts = 0;
      const maxAttempts = 6;
      const tryMeasure = () => {
        attempts += 1;
        measured = updateTabbarHeight();
        if (!measured && attempts < maxAttempts) {
          setTimeout(tryMeasure, attempts * 200);
        }
      };
      setTimeout(tryMeasure, 120);
    }

    // Use ResizeObserver when available to react to dynamic tabbar size changes
    let ro: ResizeObserver | null = null;
    try {
      if ((window as any).ResizeObserver) {
        const tabbarEl = document.querySelector<HTMLElement>('.tabbar');
        if (tabbarEl) {
          ro = new ResizeObserver(updateTabbarHeight);
          ro.observe(tabbarEl);
        }
      }
    } catch (_) { ro = null; }

    window.addEventListener('resize', updateTabbarHeight);
    window.addEventListener('orientationchange', updateTabbarHeight);

    return () => {
      try { ro && ro.disconnect(); } catch (_) {}
      window.removeEventListener('resize', updateTabbarHeight);
      window.removeEventListener('orientationchange', updateTabbarHeight);
    };
  }, [ready]);
}
