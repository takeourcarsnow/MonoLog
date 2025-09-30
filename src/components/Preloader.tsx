"use client";

import { useEffect, useState } from "react";

export function Preloader({ ready, onFinish }: { ready: boolean; onFinish?: () => void }) {
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (ready && mounted) {
      // start exit animation for the overlay
      setExiting(true);

      // overlay exit duration (ms) — matches CSS transition
      const overlayExit = 420;
      // additional time to keep the page blurred after the overlay fades
      const blurHold = 700;

      const overlayTimer = setTimeout(() => {
        // overlay has finished its exit animation visually (opacity 0)
        // keep component mounted so we can preserve the blur for blurHold
        onFinish?.();
      }, overlayExit);

      // schedule blur removal after overlay exit + hold, then unmount
      const blurTimer = setTimeout(() => {
        try { document.documentElement.classList.remove('preloader-active'); } catch (e) {}
        setMounted(false);
      }, overlayExit + blurHold);

      return () => {
        try { clearTimeout(overlayTimer); } catch (e) {}
        try { clearTimeout(blurTimer); } catch (e) {}
      };
    }
  }, [ready, mounted, onFinish]);

  useEffect(() => {
    // mark page as having an active preloader so underlying content can be
    // blurred. This will be removed when the component unmounts.
    try {
      document.documentElement.classList.add('preloader-active');
    } catch (e) {}
    return () => {
      // only remove class on unmount if it's still present
      try { document.documentElement.classList.remove('preloader-active'); } catch (e) {}
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden={exiting}
      className={`preloader-overlay ${exiting ? 'preloader-exit' : ''}`}
    >
      <div className="preloader-inner" role="img" aria-label="Loading MonoLog">
        <img className="preloader-logo" src="/logo.svg" width={86} height={86} alt="MonoLog logo" />
        <div className="preloader-wordmark">MonoLog</div>
      </div>
    </div>
  );
}

export default Preloader;
