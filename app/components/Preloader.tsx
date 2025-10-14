"use client";

import { useEffect, useState, useRef } from "react";

export function Preloader({ ready, onFinish }: { ready: boolean; onFinish?: () => void }) {
  const [exiting, setExiting] = useState(false);
  const [initial, setInitial] = useState(true);
  const [mounted, setMounted] = useState(true);
  const mountTime = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (ready && mounted) {
      // Ensure the preloader is visible for at least `minVisible` ms so the
      // spinner animation feels complete even if initialization resolves
      // very quickly during hydration. This avoids a janky flash where the
      // overlay appears and immediately disappears without a full rotation.
  const minVisible = 1200; // ms - keep spinner visible longer for a subtle effect
      const now = Date.now();
      const mountedAt = mountTime.current || now;
      const elapsed = Math.max(0, now - mountedAt);
      const startDelay = Math.max(0, minVisible - elapsed);

  let startTimerId: number | null = null;
  startTimerId = window.setTimeout(() => {
        // start exit animation for the overlay
        setExiting(true);
        setInitial(false);

  // overlay exit duration (ms) — matches CSS transition (longer, softer)
  const overlayExit = 640;
  // additional time to keep the page blurred after the overlay fades
  const blurHold = 900;

        const overlayTimer = setTimeout(() => {
          // overlay has finished its exit animation visually (opacity 0)
          // keep component mounted so we can preserve the blur for blurHold
          try {
            if (typeof window !== 'undefined') (window as any).__MONOLOG_PRELOADER_HAS_RUN__ = true;
            window.dispatchEvent(new CustomEvent('preloader-finished'));
          } catch (e) {}
          onFinish?.();
          try { document.body.classList.add('preloader-finished'); } catch (e) {}
        }, overlayExit);

        // schedule blur removal after overlay exit + hold, then unmount
        const blurTimer = setTimeout(() => {
          try { document.documentElement.classList.remove('preloader-active'); } catch (e) {}
          setMounted(false);
        }, overlayExit + blurHold);

        // cleanup timers started within startTimer
        cleanupRef.current = () => {
          try { window.clearTimeout(overlayTimer); } catch (e) {}
          try { window.clearTimeout(blurTimer); } catch (e) {}
        };
      }, startDelay);

      return () => {
        try { if (startTimerId) window.clearTimeout(startTimerId); } catch (e) {}
        try { if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; } } catch (e) {}
      };
    }
  }, [ready, mounted, onFinish]);

  useEffect(() => {
    // If the preloader already completed earlier in this page lifetime
    // (for example: initial load already ran), avoid showing it again
    // when AppShell or this component remounts during client-side
    // navigations (common on mobile when layouts get reattached).
    try {
      const ran = typeof window !== 'undefined' && (window as any).__MONOLOG_PRELOADER_HAS_RUN__;
      if (ran) {
        // don't show the overlay again
        setMounted(false);
        return;
      }
    } catch (e) {
      // ignore
    }

    // mark page as having an active preloader so underlying content can be
    // blurred. This will be removed when the component unmounts.
    try {
      document.documentElement.classList.add('preloader-active');
    } catch (e) {}
    mountTime.current = Date.now();
    return () => {
      // only remove class on unmount if it's still present
      try { document.documentElement.classList.remove('preloader-active'); } catch (e) {}
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden={exiting}
      className={`preloader-overlay ${initial ? 'preloader-initial' : ''} ${exiting ? 'preloader-exit' : ''}`}
    >
      <div className="preloader-inner" role="img" aria-label="Loading MonoLog">
        <img src="/newlogo.svg" alt="MonoLog Logo" width="86" height="86" className="preloader-logo" />
        <div className="preloader-wordmark">MonoLog</div>
      </div>
    </div>
  );
}

export default Preloader;
