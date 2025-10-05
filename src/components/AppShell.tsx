"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "./Header";
import Preloader from "./Preloader";
import { initTheme } from "@/lib/theme";
import { api } from "@/lib/api";
import { CONFIG } from "@/lib/config";
import { seedIfNeeded } from "@/lib/seed";
import { ToastHost, ToastProvider } from "./Toast";
import { NotificationListener } from "./NotificationListener";
import { InstallPrompt } from "./InstallPrompt";
import { Swiper, SwiperSlide } from "swiper/react";
import { Virtual } from "swiper/modules";
import "swiper/css";
import "swiper/css/virtual";
import { lazy, Suspense } from "react";

// Lazy load view components to reduce initial bundle size
const FeedView = lazy(() => import("./FeedView").then(mod => ({ default: mod.FeedView })));
const ExploreView = lazy(() => import("./ExploreView").then(mod => ({ default: mod.ExploreView })));
const Uploader = lazy(() => import("./Uploader").then(mod => ({ default: mod.Uploader })));
const CalendarView = lazy(() => import("./CalendarView").then(mod => ({ default: mod.CalendarView })));
const ProfileView = lazy(() => import("./ProfileView").then(mod => ({ default: mod.ProfileView })));

// Small wrapper used around each slide to ensure inactive slides are removed
// from the accessibility tree and tab order. This avoids focus leaking into
// offscreen sections which can cause layout/glitch issues when users tab.
import { disableFocusWithin, restoreFocusWithin } from '@/lib/focusUtils';

function SlideWrapper({ children, active }: { children: React.ReactNode; active: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!active) {
      el.setAttribute('aria-hidden', 'true');
      try { (el as any).inert = true; } catch (_) {}
      disableFocusWithin(el);
    } else {
      el.removeAttribute('aria-hidden');
      try { (el as any).inert = false; } catch (_) {}
      restoreFocusWithin(el);
    }

    return () => {
      try { (el as any).inert = false; } catch (_) {}
      el.removeAttribute('aria-hidden');
      restoreFocusWithin(el);
    };
  }, [active]);

  return <div ref={ref} className={active ? 'slide-active' : 'slide-inactive'}>{children}</div>;
}
export function AppShell({ children }: { children: React.ReactNode }) {
  "use client";
  const [ready, setReady] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(() => {
    try {
      if (typeof window === 'undefined') return false;
      return (
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
        (window.matchMedia && window.matchMedia('(pointer:coarse)').matches)
      );
    } catch (e) {
      return false;
    }
  });
  const pathname = usePathname();
  const router = useRouter();
  const swiperRef = useRef<any>(null);
  const [forceTouch, setForceTouch] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef(false);

  const views = [
    { path: "/feed", component: FeedView },
    { path: "/explore", component: ExploreView },
    { path: "/upload", component: Uploader },
    { path: "/calendar", component: CalendarView },
    { path: "/profile", component: ProfileView },
  ];

  // Calculate current index, treating username routes as profile view (index 4)
  const getCurrentIndex = () => {
    const idx = views.findIndex(v => v.path === pathname);
    if (idx !== -1) return idx;
    
    // Check if we're on a username route - if so, treat it as profile view
    const pathSegments = pathname.split('/').filter(Boolean);
    if (pathSegments.length === 1) {
      const segment = pathSegments[0];
      const RESERVED_ROUTES = [
        'about', 'api', 'calendar', 'explore', 'favorites', 
        'feed', 'post', 'profile', 'upload', 'admin', 
        'settings', 'help', 'terms', 'privacy', 'login', 
        'register', 'signup', 'signin', 'logout', 'auth'
      ];
      if (!RESERVED_ROUTES.includes(segment.toLowerCase())) {
        return 4; // profile view index
      }
    }
    
    return 0; // default to feed
  };
  
  const currentIndex = getCurrentIndex();
  const [activeIndex, setActiveIndex] = useState<number>(currentIndex);

  // Keep activeIndex in sync when currentIndex (route) changes externally
  useEffect(() => {
    setActiveIndex(currentIndex);
  }, [currentIndex]);

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

    // Re-check touch capability on mount in case environment changes
    // (keeps the value up-to-date but the initial synchronous detection
    // ensures Swiper mounts with the correct behavior).
    try {
      const touch = typeof window !== 'undefined' && (
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
        (window.matchMedia && window.matchMedia('(pointer:coarse)').matches)
      );
      setIsTouchDevice(Boolean(touch));
    } catch (e) {
      setIsTouchDevice(false);
    }
    // Debug logging removed per user request.

    // support a quick runtime override for testing: ?forceTouch=1 or localStorage monolog.forceTouch=1
    try {
      if (typeof window !== 'undefined') {
        const params = new URL(window.location.href).searchParams;
        const q = params.get('forceTouch');
        const ls = window.localStorage?.getItem('monolog.forceTouch');
        const val = q === '1' || ls === '1';
        if (val) setForceTouch(true);
      }
    } catch (_) {}
  }, []);

  // Measure the actual header height at runtime and publish it as a CSS
  // variable so layout padding can match the rendered header size exactly.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateHeaderHeight = () => {
      try {
        const el = document.querySelector<HTMLElement>('.header');
        if (!el) return;
        const rect = el.getBoundingClientRect();
        document.documentElement.style.setProperty('--header-height', `${Math.ceil(rect.height)}px`);
      } catch (e) {
        /* ignore */
      }
    };

    // Run once immediately to set initial value
    updateHeaderHeight();

    // Use ResizeObserver when available to react to dynamic header size changes
    let ro: ResizeObserver | null = null;
    try {
      if ((window as any).ResizeObserver) {
        const headerEl = document.querySelector<HTMLElement>('.header');
        if (headerEl) {
          ro = new ResizeObserver(updateHeaderHeight);
          ro.observe(headerEl);
        }
      }
    } catch (_) { ro = null; }

    window.addEventListener('resize', updateHeaderHeight);
    window.addEventListener('orientationchange', updateHeaderHeight);

    return () => {
      try { ro && ro.disconnect(); } catch (_) {}
      window.removeEventListener('resize', updateHeaderHeight);
      window.removeEventListener('orientationchange', updateHeaderHeight);
    };
  }, [ready, pathname]);

  // Measure the actual tabbar height at runtime and publish it as a CSS
  // variable so layout padding can match the rendered tabbar size exactly.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateTabbarHeight = () => {
      try {
        const el = document.querySelector<HTMLElement>('.tabbar');
        if (!el) return;
        const rect = el.getBoundingClientRect();
        document.documentElement.style.setProperty('--tabbar-height', `${Math.ceil(rect.height)}px`);
      } catch (e) {
        /* ignore */
      }
    };

    // Run once immediately to set initial value
    updateTabbarHeight();

    // Use ResizeObserver when available to react to dynamic tabbar size changes
    let ro: ResizeObserver | null = null;
    try {
      if ((window as any).ResizeObserver) {
        const tabbarEl = document.querySelector<HTMLElement>('.tabbar');
        if (tabbarEl) {
          ro = new ResizeObserver(updateTabbarHeight);
          ro.observe(tabbarEl);
        }
      }
    } catch (_) { ro = null; }

    window.addEventListener('resize', updateTabbarHeight);
    window.addEventListener('orientationchange', updateTabbarHeight);

    return () => {
      try { ro && ro.disconnect(); } catch (_) {}
      window.removeEventListener('resize', updateTabbarHeight);
      window.removeEventListener('orientationchange', updateTabbarHeight);
    };
  }, [ready]);

  // Optional visual debug overlay to inspect measured values. Enable by
  // adding ?layoutDebug=1 to the URL or setting localStorage.monolog.debugLayout = '1'.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URL(window.location.href).searchParams;
      const enabled = params.get('layoutDebug') === '1' || window.localStorage?.getItem('monolog.debugLayout') === '1';
      if (!enabled) return;

      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.right = '12px';
      overlay.style.top = '12px';
      overlay.style.zIndex = '99999';
      overlay.style.background = 'rgba(0,0,0,0.7)';
      overlay.style.color = 'white';
      overlay.style.padding = '10px 12px';
      overlay.style.borderRadius = '8px';
      overlay.style.fontSize = '12px';
      overlay.style.maxWidth = '280px';
      overlay.style.lineHeight = '1.3';
      overlay.id = 'monolog-layout-debug';

      const close = document.createElement('button');
      close.textContent = '×';
      close.style.position = 'absolute';
      close.style.left = '6px';
      close.style.top = '6px';
      close.style.background = 'transparent';
      close.style.border = 'none';
      close.style.color = 'white';
      close.style.fontSize = '14px';
      close.style.cursor = 'pointer';
      overlay.appendChild(close);

      const content = document.createElement('div');
      content.style.marginTop = '6px';
      overlay.appendChild(content);

      function update() {
        const header = document.querySelector<HTMLElement>('.header');
        const rootStyles = getComputedStyle(document.documentElement);
        const headerRaw = rootStyles.getPropertyValue('--header-height') || 'unset';
        const contentEl = document.querySelector<HTMLElement>('.content');
        const contentPad = contentEl ? getComputedStyle(contentEl).paddingBottom : 'unset';
        const slideChild = document.querySelector<HTMLElement>('.swipe-views .swiper-slide > *');
        const slidePad = slideChild ? getComputedStyle(slideChild).paddingBottom : 'unset';

        content.innerHTML = `header: ${header ? Math.ceil(header.getBoundingClientRect().height) + 'px' : headerRaw}<br/>` +
                            `--header-height: ${headerRaw.trim()}<br/>` +
                            `content padding-bottom: ${contentPad}<br/>` +
                            `slide child padding-bottom: ${slidePad}`;
      }

      close.addEventListener('click', () => { try { overlay.remove(); } catch(_) {} });
      document.body.appendChild(overlay);
      update();
      const id = window.setInterval(update, 700);

      return () => {
        try { clearInterval(id); } catch (_) {}
        try { overlay.remove(); } catch (_) {}
      };
    } catch (_) { /* ignore */ }
  }, [ready]);

  useEffect(() => {
    // swiperRef will be set via onSwiper; support both shapes for safety
    const inst = swiperRef.current && (swiperRef.current.swiper ? swiperRef.current.swiper : swiperRef.current);
    if (inst && typeof inst.slideTo === 'function') {
      try {
        inst.slideTo(currentIndex);
      } catch (_) { /* ignore */ }
    }
    // SlideTo debug logging removed per user request.
  }, [currentIndex]);

  // Listen for carousel drag events from inner components and temporarily
  // disable the outer Swiper's touch interactions so inner carousels can
  // handle horizontal swipes without the whole view changing.
  useEffect(() => {
    function onDragStart() {
      try {
        const inst = swiperRef.current && (swiperRef.current.swiper ? swiperRef.current.swiper : swiperRef.current);
        if (inst) inst.allowTouchMove = false;
  // debug removed
      } catch (_) { /* ignore */ }
    }
    function onDragEnd() {
      try {
        const inst = swiperRef.current && (swiperRef.current.swiper ? swiperRef.current.swiper : swiperRef.current);
        if (inst) inst.allowTouchMove = Boolean(isTouchDevice);
  // debug removed
      } catch (_) { /* ignore */ }
    }
    function onZoomStart() {
      try {
        const inst = swiperRef.current && (swiperRef.current.swiper ? swiperRef.current.swiper : swiperRef.current);
        if (inst) inst.allowTouchMove = false;
  // debug removed
      } catch (_) { /* ignore */ }
    }
    function onZoomEnd() {
      try {
        const inst = swiperRef.current && (swiperRef.current.swiper ? swiperRef.current.swiper : swiperRef.current);
        if (inst) inst.allowTouchMove = Boolean(isTouchDevice);
  // debug removed
      } catch (_) { /* ignore */ }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:carousel_drag_start', onDragStart as any);
      window.addEventListener('monolog:carousel_drag_end', onDragEnd as any);
      window.addEventListener('monolog:zoom_start', onZoomStart as any);
      window.addEventListener('monolog:zoom_end', onZoomEnd as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('monolog:carousel_drag_start', onDragStart as any);
        window.removeEventListener('monolog:carousel_drag_end', onDragEnd as any);
        window.removeEventListener('monolog:zoom_start', onZoomStart as any);
        window.removeEventListener('monolog:zoom_end', onZoomEnd as any);
      }
    };
  }, [isTouchDevice]);

  // Prevent vertical scrolling when swiping horizontally to change sections
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isHorizontalSwipe.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current);
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);

      // If horizontal movement is greater than vertical and exceeds threshold, consider it horizontal swipe
      if (deltaX > deltaY && deltaX > 10) {
        isHorizontalSwipe.current = true;
        if (e.cancelable) e.preventDefault(); // Prevent vertical scrolling
      }
    };

    const handleTouchEnd = () => {
      isHorizontalSwipe.current = false;
    };

    main.addEventListener('touchstart', handleTouchStart, { passive: true });
    main.addEventListener('touchmove', handleTouchMove, { passive: false });
    main.addEventListener('touchend', handleTouchEnd, { passive: true });
    main.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      main.removeEventListener('touchstart', handleTouchStart);
      main.removeEventListener('touchmove', handleTouchMove);
      main.removeEventListener('touchend', handleTouchEnd);
      main.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  const handleSlideChange = (swiper: any) => {
  const newPath = views[swiper.activeIndex]?.path;
    // keep local state for which slide is active so we can mark others inert
    try { setActiveIndex(typeof swiper.activeIndex === 'number' ? swiper.activeIndex : currentIndex); } catch (_) {}
    // Ensure Swiper recalculates height immediately when active slide changes
    // Removed: no longer using autoHeight
    // Immediately dispatch event so active state can update before route changes
    if (typeof window !== 'undefined' && newPath) {
      window.dispatchEvent(new CustomEvent('monolog:slide_change', { 
        detail: { path: newPath, index: swiper.activeIndex } 
      }));
    }
    
    if (newPath && newPath !== pathname) {
      // Special handling for profile - maintain username route if we're already on one
      if (newPath === "/profile") {
        const pathSegments = pathname.split('/').filter(Boolean);
          if (pathSegments.length === 1) {
          const segment = pathSegments[0];
          const RESERVED_ROUTES = [
            'about', 'api', 'calendar', 'explore', 'favorites', 
            'feed', 'post', 'profile', 'upload', 'admin', 
            'settings', 'help', 'terms', 'privacy', 'login', 
            'register', 'signup', 'signin', 'logout', 'auth'
          ];
          if (!RESERVED_ROUTES.includes(segment.toLowerCase())) return;
        }
      }
  // navigation debug removed
      router.push(newPath);
    }
  };

  // Listen for navbar clicks to change slides
  useEffect(() => {
    function onNavbarClick(e: any) {
      const { path, index } = e.detail;
      // Update swiper to the clicked index
      const inst = swiperRef.current && (swiperRef.current.swiper ? swiperRef.current.swiper : swiperRef.current);
      if (inst && typeof inst.slideTo === 'function') {
        try {
          inst.slideTo(index);
        } catch (_) { /* ignore */ }
      }
      // Update active index state
      setActiveIndex(index);
      // Only navigate if path is different
      if (path !== pathname) {
        router.push(path);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:navbar_click', onNavbarClick);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('monolog:navbar_click', onNavbarClick);
      }
    };
  }, [router, pathname]);
  // Observe the active slide's content and call updateAutoHeight so the
  // container height matches that slide only.
  useEffect(() => {
    // Simplified: no longer using autoHeight, so no need for complex observers
  }, [activeIndex, ready]);


  // Treat the root path as a main swipe-view so the homepage renders
  // the same Swiper layout (feed/explore/upload/calendar/profile)
  // as the explicit /feed route. This keeps the caption, view toggle and
  // other layout elements positioned identically between / and /feed.
  // Also treat username routes (e.g., /${username}) as profile view for swipe support.
  const isMainView = pathname === "/" || views.some(v => v.path === pathname) || (() => {
    // Check if we're on a username route (not one of the reserved routes)
    const pathSegments = pathname.split('/').filter(Boolean);
    if (pathSegments.length === 1) {
      const segment = pathSegments[0];
      const RESERVED_ROUTES = [
        'about', 'api', 'calendar', 'explore', 'favorites', 
        'feed', 'post', 'profile', 'upload', 'admin', 
        'settings', 'help', 'terms', 'privacy', 'login', 
        'register', 'signup', 'signin', 'logout', 'auth'
      ];
      return !RESERVED_ROUTES.includes(segment.toLowerCase());
    }
    return false;
  })();

  return (
    <ToastProvider>
      <Preloader ready={ready} />
      <div className="app-content">
        <Header />
        <main
          ref={mainRef}
          className="content"
          id="view"
        >
          {!ready ? <div className="card skeleton" style={{ height: 240 }} /> : isMainView ? (
            <Swiper
              className="swipe-views"
              ref={swiperRef}
              onSwiper={(s) => { swiperRef.current = s; }}
              modules={[Virtual]}
              spaceBetween={0}
              slidesPerView={1}
              initialSlide={currentIndex}
              onSlideChange={handleSlideChange}
              touchStartPreventDefault={false}
              passiveListeners={false}
              // only allow touch/swipe interactions on touch-capable devices
              simulateTouch={isTouchDevice || forceTouch}
              allowTouchMove={isTouchDevice || forceTouch}
              // Enable rubber-band effect at edges: allows some drag but prevents
              // slides from going completely off-screen. resistanceRatio controls
              // how much resistance (0.6 = moderate resistance, good balance between
              // visual feedback and preventing excessive drag)
              resistance={true}
              resistanceRatio={0.6}
              // Allow both short (quick flick) and long swipes. The default
              // behavior was disabling them which made users have to drag a
              // large distance to change sections. Enable them and lower the
              // longSwipesRatio so a smaller horizontal drag (<25% of width)
              // will navigate to the next section.
              shortSwipes={true}
              longSwipes={true}
              longSwipesRatio={0.25}
              threshold={15}
              // Let the Swiper container adjust its height to the active slide
              // so each section sizes itself to its own content instead of the
              // tallest slide. We also call updateAutoHeight when slides or
              // content resize so measurements stay accurate.
              autoHeight={false}
              // Slightly increase touchRatio to make touch movements feel a bit
              // more responsive on devices with higher pixel density.
              touchRatio={1.1}
              speed={250}
              effect="slide"
              watchSlidesProgress={true}
            >
              {views.map((view, index) => (
                <SwiperSlide key={view.path} virtualIndex={index} className={view.path === '/feed' ? 'slide-feed' : undefined}>
                  <SlideWrapper active={index === activeIndex}>
                    <Suspense fallback={<div className="card skeleton" style={{ height: 240 }} />}>
                      {view.path === '/profile' ? (
                        (() => {
                          const pathSegments = pathname.split('/').filter(Boolean);
                          if (pathSegments.length === 1) {
                            const segment = pathSegments[0];
                            const RESERVED_ROUTES = [
                              'about', 'api', 'calendar', 'explore', 'favorites', 
                              'feed', 'post', 'profile', 'upload', 'admin', 
                              'settings', 'help', 'terms', 'privacy', 'login', 
                              'register', 'signup', 'signin', 'logout', 'auth'
                            ];
                            if (!RESERVED_ROUTES.includes(segment.toLowerCase())) {
                              return <view.component userId={segment} />;
                            }
                          }
                          return <view.component />;
                        })()
                      ) : (
                        <view.component />
                      )}
                    </Suspense>
                  </SlideWrapper>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : children}
        </main>
      </div>
      <NotificationListener />
      <InstallPrompt />
      <ToastHost />
    </ToastProvider>
  );
}