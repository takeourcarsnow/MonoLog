"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import { CONFIG } from '@/src/lib/config';
import { isInAppBrowser } from '@/src/lib/detectWebview';

const AppShell = dynamic(() => import('@/app/components/AppShell').then(mod => mod.AppShell), { ssr: false, loading: () => null });
const AppPreloader = dynamic(() => import('@/app/components/AppPreloader'), { ssr: false, loading: () => null });
const Navbar = dynamic(() => import('@/app/components/NavBar').then(mod => mod.Navbar), { ssr: false });
const InertPolyfillClient = dynamic(() => import('@/app/components/InertPolyfillClient'), { ssr: false });
const PWAAnalytics = dynamic(() => import('@/app/components/PWAAnalytics').then(mod => mod.PWAAnalytics), { ssr: false });
const PWAHealthCheck = dynamic(() => import('@/app/components/PWAAnalytics').then(mod => mod.PWAHealthCheck), { ssr: false });
const RoutePrefetcher = dynamic(() => import('@/app/components/RoutePrefetcher'), { ssr: false });

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
