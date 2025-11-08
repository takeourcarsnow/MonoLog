import "./globals.css";
import type { Metadata } from "next";
// dynamic already imported above
// Patrick Hand font removed per request
import React from "react";
import dynamic from "next/dynamic";
import { Header } from "@/app/components/layout/Header";
import { CONFIG } from '@/lib/config';
import ClientErrorBoundary from "@/app/components/layout/ClientErrorBoundary";
import { isInAppBrowser } from '@/lib/detectWebview';
import { SWRConfig } from 'swr';
import ClientInit from "@/app/components/layout/ClientInit";

// No custom Google fonts are loaded here to keep the bundle minimal.

// ClientInit is a client-only wrapper that hosts dynamic client components
// and client-side effects (web-vitals, SW registration). Keeping the root
// layout as a Server Component improves performance and allows streaming.

// Render Header at root. Header is a server component that itself will
// dynamically load the interactive portion (`HeaderInteractive`) on the
// client. Importing it statically here keeps static markup server-rendered
// and reduces client-side bundle and parse/compile time.

// Toast system removed

// Inert polyfill is loaded via the client component `InertPolyfillClient`

export const metadata: Metadata = {
  title: "MonoLog — Your day in pictures",
  description: "MonoLog — Your day in pictures. A focused daily photo journal: create one post each day and attach multiple images to tell a fuller story.",
  // themeColor must be placed in the `viewport` export in Next.js 14+
  manifest: '/manifest.webmanifest',
  icons: '/logo.svg',
  // SEO helpers
  keywords: ['photo journal', 'daily photos', 'photo diary', 'MonoLog', 'photo sharing', 'visual diary'],
  openGraph: {
    title: 'MonoLog — Your day in pictures',
    description: 'A focused daily photo journal: create one post each day and attach multiple images to tell a fuller story.',
    siteName: 'MonoLog',
    type: 'website',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://monolog.ink',
    images: [
      {
        url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://monolog.ink') + '/logo.svg',
        width: 1200,
        height: 630,
        alt: 'MonoLog',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MonoLog — Your day in pictures',
    description: 'A focused daily photo journal: create one post each day and attach multiple images to tell a fuller story.',
    site: '@MonoLog',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
  },
};

// Move themeColor into the viewport export to satisfy Next.js metadata rules
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
  // Use full-bleed layout on modern mobile browsers (avoids letterboxing)
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
  <html lang="en" className={`no-transitions`} suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0f0f10" />
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{ __html: `(function(){try{var k='monolog_theme';var v=null;try{v=localStorage.getItem(k);}catch(e){} if(v==='light'||v==='dark'){document.documentElement.setAttribute('data-theme',v);if(v==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}else{document.documentElement.setAttribute('data-theme','light');document.documentElement.classList.remove('dark');}var c='no-transitions';if(document.documentElement.classList.contains(c)){document.documentElement.classList.remove(c);} document.documentElement.classList.add('preloader-active');}catch(e){} })();` }}
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
          dangerouslySetInnerHTML={{ __html: `(function(){try{window.addEventListener('beforeinstallprompt', function(e) { /* removed preventDefault to allow default banner */ window.deferredPrompt = e; });}catch(e){} })();` }}
        />
        {/* JSON-LD Organization structured data for better search results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: process.env.NEXT_PUBLIC_SITE_NAME || 'MonoLog',
            url: process.env.NEXT_PUBLIC_SITE_URL || 'https://monolog.ink',
            logo: (process.env.NEXT_PUBLIC_SITE_URL || 'https://monolog.ink') + '/logo.svg',
            sameAs: [],
            description: 'MonoLog — Your day in pictures. A focused daily photo journal.'
          }) }}
        />
      </head>
      <body>
        <SWRConfig value={{
          revalidateOnFocus: false,
          revalidateOnReconnect: true,
          revalidateOnMount: true,
          dedupingInterval: 5000,
          focusThrottleInterval: 10000,
          errorRetryInterval: 5000,
        }}>
            <a href="#view" className="skip-link">Skip to content</a>
            <Header />
            <ClientErrorBoundary>
              <ClientInit>
                {children}
              </ClientInit>
            </ClientErrorBoundary>
        </SWRConfig>
  <noscript>MonoLog — Your day in pictures. Requires JavaScript. Please enable it to continue.</noscript>
        {/* Defer web vitals collection until after hydration */}
      </body>
    </html>
  );
}


