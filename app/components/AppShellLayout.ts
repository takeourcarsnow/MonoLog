"use client";

import { useEffect } from "react";

// Generic hook to measure element height and set CSS variable
function useHeightMeasurement(
  selector: string,
  cssVar: string,
  deps: any[],
  options: { fudge?: number; retry?: boolean } = {}
) {
  const { fudge = 0, retry = false } = options;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateHeight = () => {
      try {
        const el = document.querySelector<HTMLElement>(selector);
        if (!el) return retry ? false : undefined;
        const rect = el.getBoundingClientRect();
        if (retry && (!rect || rect.height < 1)) return false;
        const measured = Math.ceil(rect.height) + fudge;
        document.documentElement.style.setProperty(cssVar, `${measured}px`);
        return true;
      } catch (e) {
        return retry ? false : undefined;
      }
    };

    // Run once immediately to set initial value
    let measured = updateHeight();
    if (retry && !measured) {
      let attempts = 0;
      const maxAttempts = 6;
      const tryMeasure = () => {
        attempts += 1;
        measured = updateHeight();
        if (!measured && attempts < maxAttempts) {
          setTimeout(tryMeasure, attempts * 200);
        }
      };
      setTimeout(tryMeasure, 120);
    }

    // Use ResizeObserver when available to react to dynamic size changes
    let ro: ResizeObserver | null = null;
    try {
      if ((window as any).ResizeObserver) {
        const element = document.querySelector<HTMLElement>(selector);
        if (element) {
          ro = new ResizeObserver(updateHeight);
          ro.observe(element);
        }
      }
    } catch (_) { ro = null; }

    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);

    return () => {
      try { ro && ro.disconnect(); } catch (_) {}
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, deps);
}

// Measure the actual header height at runtime and publish it as a CSS
// variable so layout padding can match the rendered header size exactly.
export function useHeaderHeightMeasurement(ready: boolean, pathname: string) {
  useHeightMeasurement('.header', '--header-height', [ready, pathname]);
}

// Measure the actual tabbar height at runtime and publish it as a CSS
// variable so layout padding can match the rendered tabbar size exactly.
export function useTabbarHeightMeasurement(ready: boolean) {
  useHeightMeasurement('.tabbar', '--tabbar-height', [ready], { fudge: 1, retry: true });
}
