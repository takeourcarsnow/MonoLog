"use client";

import { useEffect, useRef, useState } from "react";
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
  const mainRef = useRef<HTMLElement | null>(null);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const trackingRef = useRef(false);

  // we attach native handlers to control passive option on touchmove

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
    // kept for compatibility if ever used as React handler; no-op here
    if (!trackingRef.current || startXRef.current === null) { trackingRef.current = false; return; }
    const t = e.changedTouches[0];
    const dx = t.clientX - startXRef.current;
    handleSwipe(dx);
    trackingRef.current = false; startXRef.current = null; startYRef.current = null;
  }

  // mouse drag support for desktop (optional)
  const mouseDownRef = useRef(false);
  const mouseStartXRef = useRef<number | null>(null);
  function onMouseDown(e: React.MouseEvent) { mouseDownRef.current = true; mouseStartXRef.current = e.clientX; }
  function onMouseMove(e: React.MouseEvent) { if (!mouseDownRef.current) return; }
  function onMouseUp(e: React.MouseEvent) {
    if (!mouseDownRef.current || mouseStartXRef.current === null) { mouseDownRef.current = false; mouseStartXRef.current = null; return; }
    // ignore drags that started inside the image editor
    const target = e.target as HTMLElement | null;
    if (target && target.closest && target.closest('.image-editor')) { mouseDownRef.current = false; mouseStartXRef.current = null; return; }
    const dx = e.clientX - mouseStartXRef.current; handleSwipe(dx); mouseDownRef.current = false; mouseStartXRef.current = null;
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

  // Attach native touch listeners so we can call preventDefault from touchmove
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const touchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      const target = e.target as HTMLElement | null;
      // ignore swipes that begin inside inputs, editable content, image editor,
      // or inside any carousel/uploader UI so those controls can handle their
      // own touch gestures without the app-level swipe taking over.
      if (target) {
        const ignoreSelectors = [
          '.image-editor',
          '.carousel-wrapper',
          '.carousel-track',
          '.carousel-slide',
          '.uploader',
          '.drop',
          '.thumbs',
        ];
        for (const sel of ignoreSelectors) {
          if (target.closest && target.closest(sel)) return;
        }
      }
      if (target) {
        const tag = target.tagName?.toLowerCase();
        const editable = (target as HTMLElement).isContentEditable || tag === 'input' || tag === 'textarea' || (target.closest && !!target.closest('input, textarea, [contenteditable="true"]'));
        if (editable) return;
      }
      startXRef.current = t.clientX;
      startYRef.current = t.clientY;
      trackingRef.current = true;
    };

    const touchMove = (e: TouchEvent) => {
      if (!trackingRef.current || startXRef.current === null || startYRef.current === null) return;
      const t = e.touches[0];
      const dx = t.clientX - startXRef.current;
      const dy = t.clientY - startYRef.current;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        // we deliberately set passive: false for this listener so preventDefault is allowed
        e.preventDefault();
      }
    };

    const touchEnd = (e: TouchEvent) => {
      if (!trackingRef.current || startXRef.current === null) { trackingRef.current = false; startXRef.current = null; startYRef.current = null; return; }
      const t = e.changedTouches[0];
      const dx = t.clientX - startXRef.current;
      handleSwipe(dx);
      trackingRef.current = false; startXRef.current = null; startYRef.current = null;
    };

    el.addEventListener('touchstart', touchStart, { passive: true });
    el.addEventListener('touchmove', touchMove, { passive: false });
    el.addEventListener('touchend', touchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', touchStart);
      el.removeEventListener('touchmove', touchMove as EventListener);
      el.removeEventListener('touchend', touchEnd);
    };
  }, [pathname]);

  return (
    <ToastProvider>
      <Header />
      <main
        className="content"
        id="view"
        tabIndex={-1}
        ref={(el) => { mainRef.current = el; }}
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