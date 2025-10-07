"use client";

import { useEffect, useState } from "react";
import Preloader from "./Preloader";

export default function AppPreloader() {
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

  return <Preloader ready={ready} />;
}
