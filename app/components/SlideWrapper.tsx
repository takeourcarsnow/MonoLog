"use client";

import { useEffect, useRef, useState } from "react";
import { disableFocusWithin, restoreFocusWithin } from '@/src/lib/focusUtils';

// Small wrapper used around each slide to ensure inactive slides are removed
// from the accessibility tree and tab order. This avoids focus leaking into
// offscreen sections which can cause layout/glitch issues when users tab.
export function SlideWrapper({ children, active }: { children: React.ReactNode; active: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [needsScroll, setNeedsScroll] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!active) {
      el.setAttribute('aria-hidden', 'true');
      try { (el as any).inert = true; } catch (_) {}
      disableFocusWithin(el);
    } else {
      el.removeAttribute('aria-hidden');
      try { (el as any).inert = false; } catch (_) {}
      restoreFocusWithin(el);
    }

    return () => {
      try { (el as any).inert = false; } catch (_) {}
      el.removeAttribute('aria-hidden');
      restoreFocusWithin(el);
    };
  }, [active]);

  // Measure content and decide whether this slide needs its own scrollbar.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;

    const getAvailableHeight = () => {
      try {
        const computed = getComputedStyle(document.documentElement);
        const header = parseInt(computed.getPropertyValue('--header-height') || '0', 10) || 0;
        const tabbar = parseInt(computed.getPropertyValue('--tabbar-height') || '0', 10) || 0;
        // Safe-area inset fallback
        const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom') || '0', 10) || 0;
        // available viewport for slide content
        return Math.max(0, window.innerHeight - header - tabbar - safeBottom);
      } catch (e) {
        return window.innerHeight;
      }
    };

    const check = () => {
      const available = getAvailableHeight();
      // Use scrollHeight to include overflowing content
      const contentHeight = el.scrollHeight;
      const needs = contentHeight > available + 2; // small tolerance
      setNeedsScroll(needs);
      if (needs) {
        el.style.maxHeight = available + 'px';
        el.style.overflowY = 'auto';
  try { el.style.setProperty('-webkit-overflow-scrolling', 'touch'); } catch (_) {}
      } else {
        el.style.maxHeight = '';
        el.style.overflowY = '';
  try { el.style.removeProperty('-webkit-overflow-scrolling'); } catch (_) {}
      }
    };

    check();

    let ro: ResizeObserver | null = null;
    try {
      if ((window as any).ResizeObserver) {
        ro = new ResizeObserver(check);
        ro.observe(el);
      }
    } catch (_) { ro = null; }

    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);

    return () => {
      try { ro && ro.disconnect(); } catch (_) {}
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
      // clear styles
      if (el) {
        el.style.maxHeight = '';
        el.style.overflowY = '';
  try { el.style.removeProperty('-webkit-overflow-scrolling'); } catch (_) {}
      }
    };
  }, []);

  return <div ref={ref} className={active ? 'slide-active' : 'slide-inactive'}>{children}</div>;
}
