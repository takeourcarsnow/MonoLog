'use client';

import { useEffect } from 'react';

export function PWAAnalytics() {
  useEffect(() => {
    // Track PWA installation
    const trackInstall = () => {
      if (typeof window !== 'undefined' && 'gtag' in window) {
        // @ts-ignore
        window.gtag('event', 'pwa_install', {
          event_category: 'pwa',
          event_label: 'install',
        });
      }
    };

    const trackAppOpen = () => {
      if (typeof window !== 'undefined' && 'gtag' in window) {
        // @ts-ignore
        window.gtag('event', 'pwa_app_open', {
          event_category: 'pwa',
          event_label: 'app_open',
        });
      }
    };

    // Track when app is launched from home screen
    if (window.matchMedia('(display-mode: standalone)').matches) {
      trackAppOpen();
    }

    // Listen for app installed event
    window.addEventListener('appinstalled', trackInstall);

    // Track service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          if (typeof window !== 'undefined' && 'gtag' in window) {
            // @ts-ignore
            window.gtag('event', 'pwa_update_available', {
              event_category: 'pwa',
              event_label: 'update_found',
            });
          }
        });
      });
    }

    // Track online/offline status
    const handleOnline = () => {
      if (typeof window !== 'undefined' && 'gtag' in window) {
        // @ts-ignore
        window.gtag('event', 'pwa_online', {
          event_category: 'pwa',
          event_label: 'connection_restored',
        });
      }
    };

    const handleOffline = () => {
      if (typeof window !== 'undefined' && 'gtag' in window) {
        // @ts-ignore
        window.gtag('event', 'pwa_offline', {
          event_category: 'pwa',
          event_label: 'connection_lost',
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('appinstalled', trackInstall);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null;
}

// PWA Health Check Component
export function PWAHealthCheck() {
  useEffect(() => {
    const checkPWAHealth = async () => {
      const checks = {
        serviceWorker: false,
        manifest: false,
        https: false,
        standalone: false,
        caching: false,
      };

      // Check Service Worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          checks.serviceWorker = !!registration.active;
        } catch (e) {
          // ignore
        }
      }

      // Check Manifest
      if ('manifest' in document.createElement('link')) {
        const manifestLink = document.querySelector('link[rel="manifest"]');
        checks.manifest = !!manifestLink;
      }

      // Check HTTPS
      checks.https = window.location.protocol === 'https:' ||
                    window.location.hostname === 'localhost';

      // Check if running in standalone mode
      checks.standalone = window.matchMedia('(display-mode: standalone)').matches;

      // Check caching capability
      try {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          checks.caching = cacheNames.some(name => name.includes('monolog'));
        }
      } catch (e) {
        // ignore
      }

      // Log health check results
      console.log('PWA Health Check:', checks);

      // Send to analytics if available
      if (typeof window !== 'undefined' && 'gtag' in window) {
        // @ts-ignore
        window.gtag('event', 'pwa_health_check', {
          event_category: 'pwa',
          event_label: 'health_check',
          custom_map: { metric1: 'service_worker', metric2: 'manifest', metric3: 'https', metric4: 'standalone', metric5: 'caching' },
          metric1: checks.serviceWorker ? 1 : 0,
          metric2: checks.manifest ? 1 : 0,
          metric3: checks.https ? 1 : 0,
          metric4: checks.standalone ? 1 : 0,
          metric5: checks.caching ? 1 : 0,
        });
      }
    };

    // Run health check after a delay to allow everything to initialize
    const timer = setTimeout(checkPWAHealth, 3000);

    return () => clearTimeout(timer);
  }, []);

  return null;
}