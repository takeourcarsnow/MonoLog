"use client";

import { useEffect } from 'react';

export default function InertPolyfillClient() {
  useEffect(() => {
    (async () => {
      try {
        // @ts-ignore - wicg-inert has no bundled types
        await import('wicg-inert');
      } catch (e) {
        // ignore - browsers with native inert will continue to work
      }
    })();
  }, []);
  return null;
}
