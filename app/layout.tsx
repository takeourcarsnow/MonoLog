import "./globals.css";
import type { Metadata } from "next";
// dynamic already imported above
import { Patrick_Hand } from "next/font/google";
import React from "react";
import dynamic from "next/dynamic";
import InertPolyfillClient from '@/components/InertPolyfillClient';
import { Navbar } from '@/components/NavBar';

// Self-host the previously imported Google Font for better performance & privacy.
const patrick = Patrick_Hand({ subsets: ['latin'], weight: ['400'], variable: '--font-hand' });

// AppShell is a client component that uses next/navigation hooks. Dynamically
// load it on the client only to avoid calling client-only hooks during server
// rendering which can cause `useContext` to be null in dev/hydration.
const AppShell = dynamic(() => import("@/components/AppShell").then(mod => mod.AppShell), { 
  ssr: false,
  // Avoid rendering an extra ad-hoc spinner while AppShell hydrates. The
  // app already provides a full-page Preloader inside AppShell, so render
  // nothing here to prevent duplicate loading UIs.
  loading: () => null,
});

// Inert polyfill is loaded via the client component `InertPolyfillClient`

export const metadata: Metadata = {
  title: "MonoLog — one post per day",
  description: "Daily photo journal. Attach multiple images to a single post.",
  // themeColor must be placed in the `viewport` export in Next.js 14+
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MonoLog',
  },
  other: {
    "color-scheme": "light dark",
    "mobile-web-app-capable": "yes"
  }
};

// Move themeColor into the viewport export to satisfy Next.js metadata rules
export const viewport = {
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
          dangerouslySetInnerHTML={{ __html: `(function(){try{var k='monolog_theme';var v=null;try{v=localStorage.getItem(k);}catch(e){} if(v==='light'||v==='dark'){document.documentElement.setAttribute('data-theme',v);}else{try{var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)');document.documentElement.setAttribute('data-theme',(m&&m.matches)?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}}var c='no-transitions';if(document.documentElement.classList.contains(c)){document.documentElement.classList.remove(c);} }catch(e){} })();` }}
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
      </head>
      <body>
        <a href="#view" className="skip-link">Skip to content</a>
        <div id="app-root">
          <AppShell>{children}</AppShell>
        </div>
        <Navbar />
        <InertPolyfillClient />
        <noscript>MonoLog requires JavaScript. Please enable it to continue.</noscript>
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
        const { initWebVitals } = await import('@/lib/performance');
        initWebVitals({ sampleRate: 1 });

        // Register service worker for caching
        if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
          navigator.serviceWorker.register('/sw.js').catch((error) => {
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