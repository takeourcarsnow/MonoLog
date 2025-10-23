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

    // Use a unique key per CSS variable to track initialization
    const initKey = `height-measured-${cssVar}`;
    const alreadyInitialized = (window as any)[initKey];

    const updateHeight = () => {
      try {
        const el = document.querySelector<HTMLElement>(selector);
        if (!el) return retry ? false : undefined;
        const rect = el.getBoundingClientRect();
        if (retry && (!rect || rect.height < 1)) return false;
        const measured = Math.ceil(rect.height) + fudge;
        document.documentElement.style.setProperty(cssVar, `${measured}px`);
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEBUG] ${cssVar} updated:`, `${measured}px`, 'from element:', selector, 'rect.height:', rect.height);
        }
        return true;
      } catch (e) {
        return retry ? false : undefined;
      }
    };

    // Run initial measurement only once per CSS variable
    if (!alreadyInitialized) {
      let measured = updateHeight();
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] Initial measurement for ${cssVar}:`, measured);
      }
      if (retry && !measured) {
        // Shorter, bounded retry/backoff: fewer attempts and lower delays to
        // avoid long waits on orientation changes while still catching
        // transient layout timing issues.
        let attempts = 0;
        const maxAttempts = 3; // reduced from 6
        const tryMeasure = () => {
          attempts += 1;
          if (process.env.NODE_ENV === 'development') {
            console.log(`[DEBUG] Retry attempt ${attempts}/${maxAttempts} for ${cssVar}`);
          }
          measured = updateHeight();
          if (!measured && attempts < maxAttempts) {
            // smaller incremental delay: 60ms, 120ms, ...
            setTimeout(tryMeasure, attempts * 60);
          }
        };
        setTimeout(tryMeasure, 40);
      }
      (window as any)[initKey] = true;
    }

    // Always set up event listeners for dynamic updates
    let ro: ResizeObserver | null = null;
    try {
      if ((window as any).ResizeObserver) {
        const element = document.querySelector<HTMLElement>(selector);
        if (element) {
          ro = new ResizeObserver(() => {
            if (process.env.NODE_ENV === 'development') {
              console.log(`[DEBUG] ResizeObserver fired for ${cssVar}`);
            }
            updateHeight();
          });
          ro.observe(element);
        }
      }
    } catch (_) { ro = null; }

    const handleResize = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] Resize event fired for ${cssVar}`);
      }
      updateHeight();
    };
    const handleOrientationChange = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] Orientation change event fired for ${cssVar}`);
      }
      // Use double rAF to schedule measurement after the browser has applied
      // layout changes. This is typically faster and more reliable than a
      // fixed 150ms timeout and improves perceived responsiveness.
      try {
        requestAnimationFrame(() => requestAnimationFrame(updateHeight));
      } catch (e) {
        // Fallback to a short timeout
        setTimeout(updateHeight, 80);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      try { ro && ro.disconnect(); } catch (_) {}
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, deps);
}

// Measure the actual header height at runtime and publish it as a CSS
// variable so layout padding can match the rendered header size exactly.
export function useHeaderHeightMeasurement(ready: boolean, pathname: string) {
  useHeightMeasurement('.header', '--header-height', [ready]);
}

// Measure the actual tabbar height at runtime and publish it as a CSS
// variable so layout padding can match the rendered tabbar size exactly.
export function useTabbarHeightMeasurement(ready: boolean) {
  useHeightMeasurement('.tabbar', '--tabbar-height', [ready], { fudge: 1, retry: true });
}
