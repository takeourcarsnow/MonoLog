"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "./Header";
import { NavBar } from "./NavBar";
import Preloader from "./Preloader";
import { initTheme } from "@/lib/theme";
import { api } from "@/lib/api";
import { CONFIG } from "@/lib/config";
import { seedIfNeeded } from "@/lib/seed";
import { ToastHost, ToastProvider } from "./Toast";
import { NotificationListener } from "./NotificationListener";
import { InstallPrompt } from "./InstallPrompt";
import { FeedView } from "./FeedView";
import { ExploreView } from "./ExploreView";
import { Uploader } from "./Uploader";
import { CalendarView } from "./CalendarView";
import { ProfileView } from "./ProfileView";
import { Swiper, SwiperSlide } from "swiper/react";
import { Virtual } from "swiper/modules";
import "swiper/css";
import "swiper/css/virtual";
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
  }, []);

  useEffect(() => {
    // swiperRef will be set via onSwiper; support both shapes for safety
    const inst = swiperRef.current && (swiperRef.current.swiper ? swiperRef.current.swiper : swiperRef.current);
    if (inst && typeof inst.slideTo === 'function') {
      try {
        inst.slideTo(currentIndex);
      } catch (_) { /* ignore */ }
    }
  }, [currentIndex]);

  // Listen for carousel drag events from inner components and temporarily
  // disable the outer Swiper's touch interactions so inner carousels can
  // handle horizontal swipes without the whole view changing.
  useEffect(() => {
    function onDragStart() {
      try {
        const inst = swiperRef.current && (swiperRef.current.swiper ? swiperRef.current.swiper : swiperRef.current);
        if (inst) inst.allowTouchMove = false;
      } catch (_) { /* ignore */ }
    }
    function onDragEnd() {
      try {
        const inst = swiperRef.current && (swiperRef.current.swiper ? swiperRef.current.swiper : swiperRef.current);
        if (inst) inst.allowTouchMove = Boolean(isTouchDevice);
      } catch (_) { /* ignore */ }
    }
    function onZoomStart() {
      try {
        const inst = swiperRef.current && (swiperRef.current.swiper ? swiperRef.current.swiper : swiperRef.current);
        if (inst) inst.allowTouchMove = false;
      } catch (_) { /* ignore */ }
    }
    function onZoomEnd() {
      try {
        const inst = swiperRef.current && (swiperRef.current.swiper ? swiperRef.current.swiper : swiperRef.current);
        if (inst) inst.allowTouchMove = Boolean(isTouchDevice);
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

  const handleSlideChange = (swiper: any) => {
  const newPath = views[swiper.activeIndex]?.path;
    // Immediately dispatch event so NavBar can update active state before route changes
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
          // If we're already on a username route, don't navigate away from it
          if (!RESERVED_ROUTES.includes(segment.toLowerCase())) {
            console.debug('[AppShell] slideChange aborted: on username route', segment);
            return;
          }
        }
      }
      console.debug('[AppShell] navigating to', newPath);
      router.push(newPath);
    }
  };


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
          className="content"
          id="view"
        >
          {!ready ? <div className="card skeleton" style={{ height: 240 }} /> : isMainView ? (
            <Swiper
              className="swipe-views"
              ref={swiperRef}
              onSwiper={(s) => { swiperRef.current = s; }}
              modules={[]}
              spaceBetween={0}
              slidesPerView={1}
              initialSlide={currentIndex}
              onSlideChange={handleSlideChange}
              touchStartPreventDefault={false}
              passiveListeners={false}
              // only allow touch/swipe interactions on touch-capable devices
              simulateTouch={isTouchDevice}
              allowTouchMove={isTouchDevice}
              // Enable rubber-band effect at edges: allows some drag but prevents
              // slides from going completely off-screen. resistanceRatio controls
              // how much resistance (0.5 = moderate resistance, good balance between
              // visual feedback and preventing excessive drag)
              resistance={true}
              resistanceRatio={0.5}
              // Allow both short (quick flick) and long swipes. The default
              // behavior was disabling them which made users have to drag a
              // large distance to change sections. Enable them and lower the
              // longSwipesRatio so a smaller horizontal drag (<25% of width)
              // will navigate to the next section.
              shortSwipes={true}
              longSwipes={true}
              longSwipesRatio={0.2}
              threshold={10}
              autoHeight={true}
              // Slightly increase touchRatio to make touch movements feel a bit
              // more responsive on devices with higher pixel density.
              touchRatio={1.1}
              speed={300}
              effect="slide"
              watchSlidesProgress={true}
            >
              {views.map((view, index) => (
                <SwiperSlide key={view.path} virtualIndex={index} className={view.path === '/feed' ? 'slide-feed' : undefined}>
                  <view.component />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : children}
        </main>
      </div>
      <NavBar />
      <NotificationListener />
      <InstallPrompt />
      <ToastHost />
    </ToastProvider>
  );
}