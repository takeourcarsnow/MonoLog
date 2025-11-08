"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import { CONFIG } from '@/lib/config';
import { isInAppBrowser } from '@/lib/detectWebview';

const AppShell = dynamic(() => import("@/app/components/layout/AppShell").then(mod => mod.AppShell), { ssr: false, loading: () => null });
const AppPreloader = dynamic(() => import('@/app/components/AppPreloader'), { ssr: false, loading: () => null });
const Navbar = dynamic(() => import('@/app/components/NavBar').then(mod => mod.Navbar), { ssr: false });
const InertPolyfillClient = dynamic(() => import('@/app/components/InertPolyfillClient'), { ssr: false });
const PWAAnalytics = dynamic(() => import("@/app/components/pwa/PWAAnalytics").then(mod => mod.PWAAnalytics), { ssr: false });
const PWAHealthCheck = dynamic(() => import("@/app/components/pwa/PWAAnalytics").then(mod => mod.PWAHealthCheck), { ssr: false });
const RoutePrefetcher = dynamic(() => import("@/app/components/layout/RoutePrefetcher"), { ssr: false });

export default function ClientInit({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    (async () => {
      try {
        const { onCLS, onINP, onFCP, onLCP, onTTFB } = await import('web-vitals');
        onCLS(console.log);
        onINP(console.log);
        onFCP(console.log);
        onLCP(console.log);
        onTTFB(console.log);

        if ('serviceWorker' in navigator && CONFIG.enableServiceWorker && process.env.NODE_ENV === 'production' && !isInAppBrowser()) {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible') {
                registration.update();
              }
            });

            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    try {
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                    } catch (e) {
                      window.location.reload();
                    }
                  }
                });
              }
            });

            navigator.serviceWorker.addEventListener('controllerchange', () => {
              try {
                window.location.reload();
              } catch (e) {
                // ignore
              }
            });
          } catch (error) {
            console.warn('Service worker registration failed:', error);
          }
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Lock screen orientation to portrait on mobile devices
  React.useEffect(() => {
    try {
      if ('orientation' in screen && 'lock' in screen.orientation && typeof screen.orientation.lock === 'function') {
        screen.orientation.lock('portrait').catch((err: any) => console.log('Orientation lock failed:', err));
      }
    } catch (e) {
      console.log('Orientation lock not supported:', e);
    }
  }, []);

  // Prevent/restore iOS viewport zoom behavior: when focusing inputs iOS
  // Safari may zoom in; toggling the viewport meta on focus/blur forces
  // the browser to keep or return to the default scale. This is a targeted
  // workaround only for iOS-ish platforms to avoid affecting desktop browsers.
  React.useEffect(() => {
    try {
      const ua = navigator.userAgent || '';
      const isIOS = /iP(hone|od|ad)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (!isIOS) return;

      const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
      if (!meta) return;
      const original = meta.getAttribute('content') || '';

      function makePreventZoom(content: string) {
        let c = content;
        if (!/maximum-scale\s*=/.test(c)) c = c + (c ? ', ' : '') + 'maximum-scale=1';
        if (!/user-scalable\s*=/.test(c)) c = c + (c ? ', ' : '') + 'user-scalable=0';
        return c;
      }

      const onFocusIn = (e: FocusEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        if (target.matches && target.matches('input, textarea, select')) {
          try {
            meta.setAttribute('content', makePreventZoom(meta.getAttribute('content') || original));
          } catch (e) {
            // ignore
          }
        }
      };

      const onFocusOut = (e: FocusEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        if (target.matches && target.matches('input, textarea, select')) {
          // restore the original viewport after a short delay so Safari has
          // time to complete any focus/blur transitions and then will zoom out
          // back to the intended scale.
          setTimeout(() => {
            try {
              meta.setAttribute('content', original);
            } catch (e) {
              // ignore
            }
          }, 120);
        }
      };

      document.addEventListener('focusin', onFocusIn);
      document.addEventListener('focusout', onFocusOut);

      return () => {
        document.removeEventListener('focusin', onFocusIn);
        document.removeEventListener('focusout', onFocusOut);
        try { meta.setAttribute('content', original); } catch (e) { /* ignore */ }
      };
    } catch (e) {
      // ignore any unexpected errors
    }
  }, []);

  return (
    <>
      <AppPreloader />
      <div id="app-root">
        <AppShell>{children}</AppShell>
      </div>
      <Navbar />
      <InertPolyfillClient />
      <PWAAnalytics />
      <PWAHealthCheck />
      <RoutePrefetcher />
    </>
  );
}
