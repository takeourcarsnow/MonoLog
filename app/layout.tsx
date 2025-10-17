import "./globals.css";
import type { Metadata } from "next";
// dynamic already imported above
import { Patrick_Hand } from "next/font/google";
import React from "react";
import dynamic from "next/dynamic";
import { CONFIG } from '@/src/lib/config';
import ClientErrorBoundary from '@/app/components/ClientErrorBoundary';
import { isInAppBrowser } from '@/src/lib/detectWebview';

// Self-host the previously imported Google Font for better performance & privacy.
const patrick = Patrick_Hand({ subsets: ['latin'], weight: ['400'], variable: '--font-hand' });

// AppShell is a client component that uses next/navigation hooks. Dynamically
// load it on the client only to avoid calling client-only hooks during server
// rendering which can cause `useContext` to be null in dev/hydration.
const AppShell = dynamic(() => import("@/app/components/AppShell").then(mod => mod.AppShell), {
  ssr: false,
  // Avoid rendering an extra ad-hoc spinner while AppShell hydrates. The
  // the root layout will render the full-page preloader, so render
  // nothing here to prevent duplicate loading UIs.
  loading: () => null,
});

// Root-level preloader: dynamic client-only component so it mounts once
// and can listen for a global readiness event from the app init.
const AppPreloader = dynamic(() => import('@/app/components/AppPreloader'), { ssr: false, loading: () => null });

// Navbar is not critical for initial render, load it dynamically
const Navbar = dynamic(() => import('@/app/components/NavBar').then(mod => mod.Navbar), { ssr: false });

// Inert polyfill is loaded via the client component `InertPolyfillClient`
const InertPolyfillClient = dynamic(() => import('@/app/components/InertPolyfillClient'), { ssr: false });

// PWA Analytics for tracking installation and usage
const PWAAnalytics = dynamic(() => import('@/app/components/PWAAnalytics').then(mod => mod.PWAAnalytics), { ssr: false });
const PWAHealthCheck = dynamic(() => import('@/app/components/PWAAnalytics').then(mod => mod.PWAHealthCheck), { ssr: false });

// Render Header at root so fixed positioning is relative to the viewport.
const Header = dynamic(() => import('@/app/components/Header').then(mod => mod.Header), { ssr: false });

// Toast provider for the entire app
const ToastProvider = dynamic(() => import('@/app/components/Toast').then(mod => mod.ToastProvider), { ssr: false });
const ToastHost = dynamic(() => import('@/app/components/Toast').then(mod => mod.ToastHost), { ssr: false });

// Inert polyfill is loaded via the client component `InertPolyfillClient`

export const metadata: Metadata = {
  title: "MonoLog — Your day in pictures.",
  description: "MonoLog — Your day in pictures. A focused daily photo journal: create one post each day and attach multiple images to tell a fuller story.",
  // themeColor must be placed in the `viewport` export in Next.js 14+
  manifest: '/manifest.webmanifest',
  icons: '/logo.svg',
  // SEO helpers
  keywords: ['photo journal', 'daily photos', 'photo diary', 'MonoLog', 'photo sharing', 'visual diary'],
  openGraph: {
    title: 'MonoLog — Your day in pictures.',
    description: 'A focused daily photo journal: create one post each day and attach multiple images to tell a fuller story.',
    siteName: 'MonoLog',
    type: 'website',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://monolog.lol',
    images: [
      {
        url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://monolog.lol') + '/logo.svg',
        width: 1200,
        height: 630,
        alt: 'MonoLog',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MonoLog — Your day in pictures.',
    description: 'A focused daily photo journal: create one post each day and attach multiple images to tell a fuller story.',
    site: '@MonoLog',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MonoLog — Your day in pictures.',
  }
};

// Move themeColor into the viewport export to satisfy Next.js metadata rules
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // themeColor supports an array with media queries
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f0f10" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Render with a temporary `no-transitions` class so styles/transitions are
    // suppressed on the server-rendered page. The inline script removes the
    // class immediately after applying the correct theme.
    /*
      suppressHydrationWarning: The server intentionally renders the
      `no-transitions` class on <html> to prevent transition flashes while
      the inline script applies the user's theme. The client then removes
      that class immediately which would otherwise trigger a React
      hydration mismatch warning — using suppressHydrationWarning here
      documents and silences that expected mismatch.
    */
  <html lang="en" className={`no-transitions ${patrick.variable}`} suppressHydrationWarning>
      <head>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{ __html: `(function(){try{var k='monolog_theme';var v=null;try{v=localStorage.getItem(k);}catch(e){} if(v==='light'||v==='dark'){document.documentElement.setAttribute('data-theme',v);}else{try{var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)');document.documentElement.setAttribute('data-theme',(m&&m.matches)?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}}var c='no-transitions';if(document.documentElement.classList.contains(c)){document.documentElement.classList.remove(c);} document.documentElement.classList.add('preloader-active');}catch(e){} })();` }}
        />
        <script
          id="set-vh"
          dangerouslySetInnerHTML={{ __html: `(function(){try{function setVh(){const vh = window.innerHeight; document.documentElement.style.setProperty('--viewport-height', (vh/100) + 'px');} setVh(); window.addEventListener('resize', setVh); window.addEventListener('orientationchange', setVh);}catch(e){} })();` }}
        />
        <script
          id="runtime-supabase-init"
          dangerouslySetInnerHTML={{ __html: (function(){
            try {
              // Server-rendered injection of public Supabase values. These are
              // safe to expose to the browser (anon key + url). Avoids fetch
              // race on first load.
              const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
              const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
              const s = JSON.stringify({ url: url || null, anonKey: anon || null });
              return "(function(){try{(window).__MONOLOG_RUNTIME_SUPABASE__=" + s + "; }catch(e){} })();";
            } catch (e) {
              return '';
            }
          })() }}
        />
        <script
          id="pwa-install-prevent"
          dangerouslySetInnerHTML={{ __html: `(function(){try{window.addEventListener('beforeinstallprompt', function(e) { e.preventDefault(); window.deferredPrompt = e; });}catch(e){} })();` }}
        />
        {/* JSON-LD Organization structured data for better search results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: process.env.NEXT_PUBLIC_SITE_NAME || 'MonoLog',
            url: process.env.NEXT_PUBLIC_SITE_URL || 'https://monolog.lol',
            logo: (process.env.NEXT_PUBLIC_SITE_URL || 'https://monolog.lol') + '/logo.svg',
            sameAs: [],
            description: 'MonoLog — Your day in pictures. A focused daily photo journal.'
          }) }}
        />
      </head>
      <body>
        <ToastProvider>
          <a href="#view" className="skip-link">Skip to content</a>
          <AppPreloader />
          <Header />
          <div id="app-root">
            <ClientErrorBoundary>
              <AppShell>{children}</AppShell>
            </ClientErrorBoundary>
          </div>
          <Navbar />
          <InertPolyfillClient />
          <PWAAnalytics />
          <PWAHealthCheck />
          <ToastHost />
        </ToastProvider>
  <noscript>MonoLog — Your day in pictures. Requires JavaScript. Please enable it to continue.</noscript>
        {/* Defer web vitals collection until after hydration */}
        {process.env.NODE_ENV === 'production' ? <WebVitalsScript /> : null}
      </body>
    </html>
  );
}

// Inline component to lazily import and init web vitals with minimal bundle impact.
function WebVitalsScript() {
  React.useEffect(() => {
    (async () => {
      try {
        const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');

        getCLS(console.log);
        getFID(console.log);
        getFCP(console.log);
        getLCP(console.log);
        getTTFB(console.log);

        // Register service worker for caching
  if ('serviceWorker' in navigator && CONFIG.enableServiceWorker && process.env.NODE_ENV === 'production' && !isInAppBrowser()) {
          navigator.serviceWorker.register('/sw.js').then((registration) => {
            // Check for updates when the page becomes visible
            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible') {
                registration.update();
              }
            });

            // When an update is found, ask the new worker to skipWaiting and then reload
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    try {
                      // Tell the worker to activate immediately
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                    } catch (e) {
                      // fallback: reload which should pick up the new content
                      window.location.reload();
                    }
                  }
                });
              }
            });

            // When the active controller changes (new SW has taken control), reload the page
            // so the user sees the fresh content immediately.
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              try {
                window.location.reload();
              } catch (e) {
                // ignore
              }
            });
          }).catch((error) => {
            console.warn('Service worker registration failed:', error);
          });
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);
  return null;
}
