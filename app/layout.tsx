import "./globals.css";
import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "MonoLog — one photo a day",
  description: "Local-first daily photo journal.",
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
    <html lang="en" data-theme="light">
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