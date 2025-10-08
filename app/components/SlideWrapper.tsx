"use client";

import { useEffect, useRef } from "react";
import { disableFocusWithin, restoreFocusWithin } from '@/src/lib/focusUtils';

// Small wrapper used around each slide to ensure inactive slides are removed
// from the accessibility tree and tab order. This avoids focus leaking into
// offscreen sections which can cause layout/glitch issues when users tab.
export function SlideWrapper({ children, active }: { children: React.ReactNode; active: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);

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

  return <div ref={ref} className={active ? 'slide-active' : 'slide-inactive'}>{children}</div>;
}
