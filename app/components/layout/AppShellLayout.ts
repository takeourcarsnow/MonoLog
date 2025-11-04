"use client";

import { useEffect } from "react";

// Simplified measurement: set CSS variable based on element height once and
// update on resize. This is intentionally minimal to avoid flaky retries
// and complex timing logic.
function setElementHeightVar(selector: string, cssVar: string, fudge = 0) {
  try {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;
    const h = Math.ceil(el.getBoundingClientRect().height) + fudge;
    document.documentElement.style.setProperty(cssVar, `${h}px`);
  } catch (_) {}
}

export function useHeaderHeightMeasurement(ready: boolean, pathname: string) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setElementHeightVar('.header', '--header-height', 0);
    const onResize = () => setElementHeightVar('.header', '--header-height', 0);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [ready, pathname]);
}

export function useTabbarHeightMeasurement(ready: boolean) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Keep this minimal: measure once and update on resize. The CSS default
    // already provides a sensible fallback (56px + safe inset).
    setElementHeightVar('.tabbar', '--tabbar-height', 1);
    const onResize = () => setElementHeightVar('.tabbar', '--tabbar-height', 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [ready]);
}
