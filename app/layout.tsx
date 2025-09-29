import "./globals.css";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

// AppShell is a client component that uses next/navigation hooks. Dynamically
// load it on the client only to avoid calling client-only hooks during server
// rendering which can cause `useContext` to be null in dev/hydration.
const AppShell = dynamic(() => import("@/components/AppShell").then(mod => mod.AppShell), { ssr: false });

export const metadata: Metadata = {
  title: "MonoLog — one photo a day",
  description: "Daily photo journal.",
  // themeColor must be placed in the `viewport` export in Next.js 14+
  other: {
    "color-scheme": "light dark"
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
    <html lang="en" className="no-transitions" suppressHydrationWarning>
      <head>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{ __html: `(function(){try{var k='monolog_theme';var v=null;try{v=localStorage.getItem(k);}catch(e){} if(v==='light'||v==='dark'){document.documentElement.setAttribute('data-theme',v);}else{try{var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)');document.documentElement.setAttribute('data-theme',(m&&m.matches)?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}}var c='no-transitions';if(document.documentElement.classList.contains(c)){document.documentElement.classList.remove(c);} }catch(e){} })();` }}
        />
      </head>
      <body>
        <a href="#view" className="skip-link">Skip to content</a>
        <div id="app-root">
          <AppShell>{children}</AppShell>
        </div>
        <noscript>MonoLog requires JavaScript. Please enable it to continue.</noscript>
      </body>
    </html>
  );
}