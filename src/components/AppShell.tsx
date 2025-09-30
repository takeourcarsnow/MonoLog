"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Header } from "./Header";
import { NavBar } from "./NavBar";
import Preloader from "./Preloader";
import { initTheme } from "@/lib/theme";
import { api } from "@/lib/api";
import { CONFIG } from "@/lib/config";
import { seedIfNeeded } from "@/lib/seed";
import { ToastHost, ToastProvider } from "./Toast";
import { NotificationListener } from "./NotificationListener";
import { usePathname, useRouter } from "next/navigation";

const swipeTabs = ["/feed", "/explore", "/upload", "/calendar", "/profile"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // swipe tracking state (refs not to trigger rerenders)
  const mainRef = useRef<HTMLElement | null>(null);
  const pageSlideRef = useRef<HTMLDivElement | null>(null);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const trackingRef = useRef(false);
  const lastMoveTimeRef = useRef<number | null>(null);
  const lastMoveXRef = useRef<number | null>(null);
  const currentDxRef = useRef<number>(0);

  // we attach native handlers to control passive option on touchmove

  const animateAndNavigate = useCallback(async (to: string, dir: 'left' | 'right') => {
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
  }, [router]);

  const handleSwipe = useCallback((dx: number) => {
    const idx = swipeTabs.indexOf(pathname || "");
    if (idx === -1) return;
    // swipe left (negative dx) -> next tab; swipe right -> previous tab
    const threshold = 40; // px
    if (dx < -threshold && idx < swipeTabs.length - 1) {
      animateAndNavigate(swipeTabs[idx + 1], 'left');
    } else if (dx > threshold && idx > 0) {
      animateAndNavigate(swipeTabs[idx - 1], 'right');
    }
  }, [pathname, animateAndNavigate]);

  function onTouchEnd(e: React.TouchEvent) {
    // kept for compatibility if ever used as React handler; no-op here
    if (!trackingRef.current || startXRef.current === null) { trackingRef.current = false; return; }
    const t = e.changedTouches[0];
    const dx = t.clientX - startXRef.current;
    handleSwipe(dx);
    trackingRef.current = false; startXRef.current = null; startYRef.current = null;
  }

  // Helper: reset inline transforms and dragging state
  const resetDrag = useCallback((animateBack = true) => {
    const ps = pageSlideRef.current;
    if (!ps) return;
    currentDxRef.current = 0;
    if (animateBack) {
      // animate back to center
      ps.style.transition = 'transform 260ms var(--transition-mid)';
      ps.style.transform = 'translateX(0)';
      const onEnd = () => {
        ps.style.transition = '';
        ps.style.transform = '';
        ps.removeEventListener('transitionend', onEnd);
      };
      ps.addEventListener('transitionend', onEnd);
    } else {
      ps.style.transition = '';
      ps.style.transform = '';
    }
  }, []);

  // mouse drag support for desktop (optional)
  const mouseDownRef = useRef(false);
  const mouseStartXRef = useRef<number | null>(null);
  function onMouseDown(e: React.MouseEvent) {
    mouseDownRef.current = true; mouseStartXRef.current = e.clientX; startXRef.current = e.clientX; startYRef.current = e.clientY; trackingRef.current = true; lastMoveTimeRef.current = performance.now(); lastMoveXRef.current = e.clientX;
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!mouseDownRef.current || !trackingRef.current || startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current!;
    // only treat mostly-horizontal drags as swipes
    if (Math.abs(dx) > Math.abs(dy)) {
      // apply transform to page slide for direct follow
      const ps = pageSlideRef.current;
      if (ps) {
        ps.style.transition = 'none';
        const damp = Math.sign(dx) * Math.min(Math.abs(dx), window.innerWidth * 0.9);
        currentDxRef.current = damp;
        ps.style.transform = `translateX(${damp}px)`;
      }
      // velocity tracking
      const now = performance.now();
      lastMoveTimeRef.current = now; lastMoveXRef.current = e.clientX;
    }
  }
  function onMouseUp(e: React.MouseEvent) {
    if (!mouseDownRef.current || mouseStartXRef.current === null) { mouseDownRef.current = false; mouseStartXRef.current = null; trackingRef.current = false; resetDrag(); return; }
    const target = e.target as HTMLElement | null;
    if (target && target.closest && target.closest('.image-editor')) { mouseDownRef.current = false; mouseStartXRef.current = null; trackingRef.current = false; resetDrag(); return; }
    const dx = e.clientX - mouseStartXRef.current;
    // compute velocity
    const now = performance.now();
    const lastT = lastMoveTimeRef.current ?? now;
    const lastX = lastMoveXRef.current ?? e.clientX;
    const dt = Math.max(1, now - lastT);
    const velocity = (e.clientX - lastX) / dt; // px per ms
    // determine navigation by distance or velocity
    const width = window.innerWidth || 360;
    const shouldNavigate = Math.abs(dx) > Math.min(120, width * 0.2) || Math.abs(velocity) > 0.5;
    if (shouldNavigate) {
      handleSwipe(dx);
      // allow the CSS based animateAndNavigate to run (it will add classes and push)
      // clear inline transform so class transition takes over
      const ps = pageSlideRef.current;
      if (ps) { ps.style.transform = ''; ps.style.transition = ''; }
    } else {
      // snap back
      resetDrag(true);
    }
    mouseDownRef.current = false; mouseStartXRef.current = null; trackingRef.current = false;
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

  // Ensure the browser doesn't treat horizontal gestures as a default
  // scroll on this element so our touchmove listener can call
  // preventDefault() reliably. Store and restore the previous value.
  const prevTouchAction = (el.style && el.style.touchAction) || '';
  try { el.style.touchAction = 'pan-y'; } catch (e) { /* ignore */ }

    const touchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      const target = e.target as HTMLElement | null;
        // ignore swipes that begin inside inputs, editable content, image editor,
        // or inside any carousel/uploader UI so those controls can handle their
        // own touch gestures without the app-level swipe taking over.
        // However, when viewing a single post page (/post/:id) we allow swipes
        // to originate inside these controls so the user can swipe out of the
        // post view to go back to the feed/explore.
        if (target) {
          // Always ignore swipes that begin on common interactive elements so
          // tapping/sliding on buttons, links, inputs, or carousel controls
          // doesn't trigger app-level navigation. This makes swipe-out on
          // single-post pages more reliable by avoiding accidental starts.
          const interactiveSel = 'a, button, input, textarea, select, [role="button"], .btn, .carousel-arrow, .carousel-dots, .dot, .confirm-popover, .thumbs';
          if (target.closest && target.closest(interactiveSel)) return;

          const ignoreSelectors = [
            '.image-editor',
            '.carousel-wrapper',
            '.carousel-track',
            '.carousel-slide',
            '.uploader',
            '.drop',
            '.thumbs',
          ];
          // If not on a post page, preserve the original ignore behavior for
          // larger interactive controls (uploader/carousel) so their gestures
          // remain local to the control.
          if (!(pathname && pathname.startsWith('/post/'))) {
            for (const sel of ignoreSelectors) {
              if (target.closest && target.closest(sel)) return;
            }
          }
        }
      if (!(pathname && pathname.startsWith('/post/'))) {
        if (target) {
          const tag = target.tagName?.toLowerCase();
          const editable = (target as HTMLElement).isContentEditable || tag === 'input' || tag === 'textarea' || (target.closest && !!target.closest('input, textarea, [contenteditable="true"]'));
          if (editable) return;
        }
      }
      startXRef.current = t.clientX;
      startYRef.current = t.clientY;
      trackingRef.current = true;
      lastMoveTimeRef.current = performance.now();
      lastMoveXRef.current = t.clientX;
      currentDxRef.current = 0;
      // add dragging state to disable CSS transitions while following finger
      try { el.classList.add('dragging'); pageSlideRef.current?.classList.add('dragging'); } catch (e) { /* ignore */ }
    };

    const touchMove = (e: TouchEvent) => {
      if (!trackingRef.current || startXRef.current === null || startYRef.current === null) return;
      const t = e.touches[0];
      const dx = t.clientX - startXRef.current;
      const dy = t.clientY - startYRef.current;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) {
        // we deliberately set passive: false for this listener so preventDefault is allowed
        e.preventDefault();
        // apply transform for direct-follow UX
        const ps = pageSlideRef.current;
        if (ps) {
          ps.style.transition = 'none';
          const damp = Math.sign(dx) * Math.min(Math.abs(dx), window.innerWidth * 0.9);
          currentDxRef.current = damp;
          ps.style.transform = `translateX(${damp}px)`;
        }
        // velocity tracking
        const now = performance.now();
        lastMoveTimeRef.current = now; lastMoveXRef.current = t.clientX;
      }
    };

    const touchEnd = (e: TouchEvent) => {
      if (!trackingRef.current || startXRef.current === null) { trackingRef.current = false; startXRef.current = null; startYRef.current = null; return; }
      const t = e.changedTouches[0];
      const dx = t.clientX - startXRef.current;
      // compute velocity
      const now = performance.now();
      const lastT = lastMoveTimeRef.current ?? now;
      const lastX = lastMoveXRef.current ?? t.clientX;
      const dt = Math.max(1, now - lastT);
      const velocity = (t.clientX - lastX) / dt; // px per ms
      // remove dragging classes
      try { el.classList.remove('dragging'); pageSlideRef.current?.classList.remove('dragging'); } catch (e) { /* ignore */ }
        // If viewing a post, interpret swipe as a request to go back.
        if (pathname && pathname.startsWith('/post/')) {
          const threshold = 30;
          if (dx > threshold || velocity > 0.5) {
            // animate right (back)
            const viewEl = document.getElementById('view');
            if (viewEl) viewEl.classList.add('slide-right');
            setTimeout(() => {
              try { router.back(); } catch (e) { /* ignore */ }
              try { viewEl?.classList.remove('slide-right'); } catch (e) { /* ignore */ }
            }, 260);
          } else {
            // snap back
            resetDrag(true);
          }
        } else {
          const width = window.innerWidth || 360;
          const shouldNavigate = Math.abs(dx) > Math.min(120, width * 0.2) || Math.abs(velocity) > 0.5;
          if (shouldNavigate) {
            handleSwipe(dx);
            // clear inline transform so class transition takes over
            const ps = pageSlideRef.current;
            if (ps) { ps.style.transform = ''; ps.style.transition = ''; }
          } else {
            resetDrag(true);
          }
        }
      trackingRef.current = false; startXRef.current = null; startYRef.current = null;
    };

  // Use capture so the app-level swipe handlers run before inner element handlers
  // (this ensures swipes that start inside controls like the post carousel can
  //  still be interpreted as navigation gestures on single-post pages).
  el.addEventListener('touchstart', touchStart, { passive: true, capture: true });
  el.addEventListener('touchmove', touchMove, { passive: false, capture: true });
  el.addEventListener('touchend', touchEnd, { passive: true, capture: true });

    return () => {
      // remove with the same options used when attaching (capture flag)
      el.removeEventListener('touchstart', touchStart, { capture: true } as EventListenerOptions);
      el.removeEventListener('touchmove', touchMove as EventListener, { capture: true } as any);
      el.removeEventListener('touchend', touchEnd, { capture: true } as EventListenerOptions);
      // restore previous touch-action
      try { el.style.touchAction = prevTouchAction || ''; } catch (e) { /* ignore */ }
    };
  }, [pathname, handleSwipe, resetDrag, router]);

  return (
    <ToastProvider>
      <Preloader ready={ready} />
      <div className="app-content">
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
          {!ready ? <div className="card skeleton" style={{ height: 240 }} /> : <div className="page-slide" ref={(el) => { pageSlideRef.current = el; }}>{children}</div>}
        </main>
      </div>
      <NavBar />
      <NotificationListener />
      <ToastHost />
    </ToastProvider>
  );
}