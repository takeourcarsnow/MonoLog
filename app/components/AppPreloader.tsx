"use client";

import { useEffect, useState } from "react";
import Preloader from "./Preloader";

export default function AppPreloader() {
  const [hasShown, setHasShown] = useState(() => {
    try {
      // If this load is a user-triggered reload/hard-refresh, ignore the
      // sessionStorage flag so the preloader shows again. sessionStorage
      // persists across reloads in the same tab, but users expect the
      // full-page loader on an explicit reload.
      const stored = sessionStorage.getItem('monolog_preloader_shown') === 'true';
      try {
        // Use the Navigation Timing API when available to detect reloads
        const navEntries = (performance && (performance.getEntriesByType && performance.getEntriesByType('navigation'))) || [];
        const navType = navEntries && navEntries[0] && (navEntries[0] as any).type;
        const legacyNav = (performance as any).navigation && (performance as any).navigation.type;
        const isReload = navType === 'reload' || legacyNav === 1;
        if (isReload) return false;
      } catch (e) {
        // ignore detection failure and fall back to stored value
      }
      return stored;
    } catch (e) {
      return false;
    }
  });

  const [ready, setReady] = useState(() => {
    try {
      return Boolean((window as any).__MONOLOG_APP_READY__);
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    if (hasShown) {
      // Remove the blur class since preloader won't show
      try { document.documentElement.classList.remove('preloader-active'); } catch (e) {}
      try { document.body.classList.add('preloader-finished'); } catch (e) {}
      try { (window as any).__MONOLOG_PRELOADER_HAS_RUN__ = true; } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('preloader-finished')); } catch (e) {}
    }
  }, [hasShown]);

  useEffect(() => {
    if (ready) return;
    const handler = () => setReady(true);
    try {
      window.addEventListener('monolog-ready', handler);
    } catch (e) {}
    return () => {
      try { window.removeEventListener('monolog-ready', handler); } catch (e) {}
    };
  }, [ready]);

  if (hasShown) return null;

  return <Preloader ready={ready} onFinish={() => {
    setHasShown(true);
    try { sessionStorage.setItem('monolog_preloader_shown', 'true'); } catch (e) {}
  }} />;
}
