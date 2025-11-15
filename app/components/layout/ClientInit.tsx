"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { CONFIG } from '@/lib/config';
import { isInAppBrowser } from '@/lib/detectWebview';
import performanceMonitor from '@/lib/performance-monitor';
import { initTheme } from '@/lib/theme';
import { api } from '@/lib/api';
import { useHeaderHeightMeasurement, useTabbarHeightMeasurement } from '@/app/components/layout/AppShellLayout';
import { CameraProvider, useCameraContext } from '@/app/components/context/CameraContext';

const AppShell = dynamic(() => import("@/app/components/layout/AppShell").then(mod => mod.AppShell), { ssr: false, loading: () => null });
const Header = dynamic(() => import('@/app/components/layout/Header').then(mod => mod.Header), { ssr: false, loading: () => null });

const AppPreloader = dynamic(() => import('@/app/components/AppPreloader'), { ssr: false, loading: () => null });
const Navbar = dynamic(() => import('@/app/components/NavBar').then(mod => mod.Navbar), { ssr: false });
const InertPolyfillClient = dynamic(() => import('@/app/components/InertPolyfillClient').then(mod => mod.default), { ssr: false });
const PWAAnalytics = dynamic(() => import('@/app/components/pwa/PWAAnalytics').then(mod => mod.PWAAnalytics), { ssr: false });
const PWAHealthCheck = dynamic(() => import('@/app/components/pwa/PWAAnalytics').then(mod => mod.PWAHealthCheck), { ssr: false });
const RoutePrefetcher = dynamic(() => import('@/app/components/layout/RoutePrefetcher').then(mod => mod.default), { ssr: false });

function GlobalCamera() {
  const { isCameraOpen, captureCallback, setIsCameraOpen, setCaptureCallback, initialDataUrl, setInitialDataUrl, editCallback, setEditCallback } = useCameraContext();
  const LiveCameraView = dynamic(() => import('@/app/components/uploader/LiveCameraView').then(mod => mod.LiveCameraView), { ssr: false });

  if (!isCameraOpen) return null;

  return (
    <LiveCameraView
      isOpen={true}
      onClose={() => {
        setIsCameraOpen(false);
        setCaptureCallback(null);
        try { setInitialDataUrl(null); setEditCallback(null); } catch (_) {}
      }}
      onCapture={(blob) => {
        if (!blob) return;
        try { console.debug('[GlobalCamera] onCapture - editCallback?', Boolean(editCallback), 'captureCallback?', Boolean(captureCallback)); } catch (_) {}
        try {
          if (editCallback && typeof editCallback === 'function') {
            if (!blob) return;
            try { editCallback(blob); } catch (e) { console.error('Edit callback failed', e); }
            setIsCameraOpen(false);
            setEditCallback(null);
            setInitialDataUrl(null);
            return;
          }
        } catch (e) {}

        // If there is a captureCallback set (e.g., for story upload), invoke it directly
        try {
          if (captureCallback && typeof captureCallback === 'function') {
            console.log('[GlobalCamera] calling captureCallback with blob size:', blob.size, 'type:', blob.type);
            if (!blob) return;
            try { captureCallback(blob); } catch (e) { console.error('Capture callback failed', e); }
            // Close the camera after capture for single-shot captures like stories
            setIsCameraOpen(false);
            setCaptureCallback(null);
            return;
          }
        } catch (e) {}

        // If a pending-edit marker exists (set by uploader when opening an
        // edit session) annotate the queued blob with the target index so
        // the uploader can process it as an edit when it remounts. Do not
        // attempt to call any handler here because the uploader may be
        // unmounted (calling its closure would be unsafe).
        let pendingTarget: number | null = null;
        try {
          const pending = (window as any).__MONOLOG_PENDING_EDIT__;
          if (pending && typeof pending.target === 'number') {
            pendingTarget = pending.target;
          }
        } catch (_) {}

        try {
          (window as any).__MONOLOG_CAPTURE_QUEUE__ = (window as any).__MONOLOG_CAPTURE_QUEUE__ || [];
          try { console.debug('[GlobalCamera] queuing captured blob', pendingTarget); } catch (_) {}
          (window as any).__MONOLOG_CAPTURE_QUEUE__.push({ blob, pendingTarget });
        } catch (e) {
          console.error('Failed to queue captured blob', e);
        }

        setIsCameraOpen(false);
        setCaptureCallback(null);
      }}
      processing={false}
      isModal={false}
      initialDataUrl={initialDataUrl ?? undefined}
      closeAfterCapture={!captureCallback} // Close after capture only if not adding photos
    />
  );
}

export default function ClientInit({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useHeaderHeightMeasurement(true, pathname);
  useTabbarHeightMeasurement(true);
  React.useEffect(() => {
    (async () => {
      try {
        // Initialize theme
        initTheme();
        // Initialize API
        await api.init();
        // Mark app as ready
        try {
          if (typeof window !== 'undefined') {
            (window as any).__MONOLOG_APP_READY__ = true;
            try { window.dispatchEvent(new Event('monolog-ready')); } catch (e) {}
          }
        } catch (e) {}
        // Initialize performance monitoring
        // Just importing it initializes the singleton
        console.log('Performance monitoring initialized');

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

  // Simplified viewport handling: rely on CSS dynamic viewport units (dvh)
  // for modern browsers. As a very small safeguard, set the CSS custom
  // property to 1dvh so existing styles using var(--viewport-height)
  // continue to work without JS listeners.
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        document.documentElement.style.setProperty('--viewport-height', '1dvh');
      }
    } catch (_) {}
  }, []);

  return (
    <CameraProvider>
      <AppContent>{children}</AppContent>
    </CameraProvider>
  );
}

function HeaderShell() {
  const { isCameraOpen } = useCameraContext();
  // Only render Header when camera is not open — this removes it from the DOM
  // while the camera UI is active (user requested DOM removal, not merely hiding).
  if (isCameraOpen) return null;
  return <Header />;
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { isCameraOpen } = useCameraContext();

  // When camera is open, remove everything from DOM except the global camera
  // component. This ensures the camera UI is the only visible/mounted part
  // of the page (user requested DOM removal, not just hiding).
  if (isCameraOpen) {
    return (
      <>
        <GlobalCamera />
      </>
    );
  }

  // Normal rendering when camera is not open
  return (
    <>
      <AppPreloader />
      {/* Header rendered client-side so it can be unmounted when camera opens */}
      <HeaderShell />
      <AppShell>{children}</AppShell>
      <Navbar />
      <GlobalCamera />
      <InertPolyfillClient />
      <PWAAnalytics />
      <PWAHealthCheck />
      <RoutePrefetcher />
    </>
  );
}
