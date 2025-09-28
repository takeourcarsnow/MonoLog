"use client";

import { useEffect, useState } from "react";
import { Header } from "./Header";
import { NavBar } from "./NavBar";
import { initTheme } from "@/lib/theme";
import { api } from "@/lib/api";
import { CONFIG } from "@/lib/config";
import { seedIfNeeded } from "@/lib/seed";
import { ToastHost, ToastProvider } from "./Toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initTheme();
    (async () => {
      try {
        await api.init();
        if (CONFIG.mode === "local" && CONFIG.seedDemoData) {
          await seedIfNeeded(api);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  return (
    <ToastProvider>
      <Header />
      <main className="content" id="view" tabIndex={-1}>
        {!ready ? <div className="card skeleton" style={{ height: 240 }} /> : children}
      </main>
      <NavBar />
      <ToastHost />
    </ToastProvider>
  );
}