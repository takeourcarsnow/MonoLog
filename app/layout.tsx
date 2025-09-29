import "./globals.css";
import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "MonoLog — one photo a day",
  description: "Daily photo journal.",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f0f10" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" }
  ],
  other: {
    "color-scheme": "light dark"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Render with a temporary `no-transitions` class so styles/transitions are
    // suppressed on the server-rendered page. The inline script removes the
    // class immediately after applying the correct theme.
    <html lang="en" className="no-transitions">
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