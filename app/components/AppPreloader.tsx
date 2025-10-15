"use client";

import { useEffect, useState } from "react";
import Preloader from "./Preloader";

export default function AppPreloader() {
  const [hasShown, setHasShown] = useState(() => {
    try {
      return sessionStorage.getItem('monolog_preloader_shown') === 'true';
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
