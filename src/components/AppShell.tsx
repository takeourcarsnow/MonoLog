"use client";

import { useEffect, useState } from "react";
import { Header } from "./Header";
import { NavBar } from "./NavBar";
import { initTheme } from "@/lib/theme";
import { api } from "@/lib/api";
import { CONFIG } from "@/lib/config";
import { seedIfNeeded } from "@/lib/seed";
import { ToastHost, ToastProvider } from "./Toast";
import { usePathname, useRouter } from "next/navigation";

const swipeTabs = ["/feed", "/explore", "/upload", "/calendar", "/profile"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // swipe tracking state (refs not to trigger rerenders)
  let startX: number | null = null;
  let startY: number | null = null;
  let tracking = false;

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    // ignore swipes that begin on inputs or editable content
    const target = e.target as HTMLElement | null;
    // If the interaction started inside an image editor, ignore to avoid
    // interfering with crop gestures.
    if (target && target.closest && target.closest('.image-editor')) return;
    if (target) {
      const tag = target.tagName?.toLowerCase();
      const editable = target.isContentEditable || tag === 'input' || tag === 'textarea' || target.closest && !!target.closest('input, textarea, [contenteditable="true"]');
      if (editable) return;
    }
    startX = t.clientX; startY = t.clientY; tracking = true;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!tracking || startX === null || startY === null) return;
    // prevent vertical scroll interference only when horizontal movement dominates
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      e.preventDefault();
    }
  }

  async function animateAndNavigate(to: string, dir: 'left' | 'right') {
    const el = document.getElementById('view');
    if (!el) { router.push(to); return; }
    // add a class for animation
    el.classList.add(dir === 'left' ? 'slide-left' : 'slide-right');
    // force reflow
    void el.offsetWidth;
    // add enter class to children to animate incoming page if needed
    // wait for animation to settle then navigate
    const dur = 260;
    await new Promise(r => setTimeout(r, dur));
    router.push(to);
    // cleanup classes after navigation (navigation will re-render but be defensive)
    try { el.classList.remove('slide-left', 'slide-right'); } catch (e) { /* ignore */ }
  }

  function handleSwipe(dx: number) {
    const idx = swipeTabs.indexOf(pathname || "");
    if (idx === -1) return;
    // swipe left (negative dx) -> next tab; swipe right -> previous tab
    const threshold = 60; // px
    if (dx < -threshold && idx < swipeTabs.length - 1) {
      animateAndNavigate(swipeTabs[idx + 1], 'left');
    } else if (dx > threshold && idx > 0) {
      animateAndNavigate(swipeTabs[idx - 1], 'right');
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!tracking || startX === null) { tracking = false; return; }
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    handleSwipe(dx);
    tracking = false; startX = null; startY = null;
  }

  // mouse drag support for desktop (optional)
  let mouseDown = false; let mouseStartX: number | null = null;
  function onMouseDown(e: React.MouseEvent) { mouseDown = true; mouseStartX = e.clientX; }
  function onMouseMove(e: React.MouseEvent) { if (!mouseDown) return; }
  function onMouseUp(e: React.MouseEvent) {
    if (!mouseDown || mouseStartX === null) { mouseDown = false; mouseStartX = null; return; }
    // ignore drags that started inside the image editor
    const target = e.target as HTMLElement | null;
    if (target && target.closest && target.closest('.image-editor')) { mouseDown = false; mouseStartX = null; return; }
    const dx = e.clientX - mouseStartX; handleSwipe(dx); mouseDown = false; mouseStartX = null;
  }

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
      <main
        className="content"
        id="view"
        tabIndex={-1}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        {!ready ? <div className="card skeleton" style={{ height: 240 }} /> : <div className="page-slide">{children}</div>}
      </main>
      <NavBar />
      <ToastHost />
    </ToastProvider>
  );
}