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
  const [isTouchDevice, setIsTouchDevice] = useState(false);
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

  const currentIndex = views.findIndex(v => v.path === pathname) || 0;

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
    // detect touch-capable devices so we can disable desktop swiping
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
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.slideTo(currentIndex);
    }
  }, [currentIndex]);

  // Listen for carousel drag events from inner components and temporarily
  // disable the outer Swiper's touch interactions so inner carousels can
  // handle horizontal swipes without the whole view changing.
  useEffect(() => {
    function onDragStart() {
      try {
        if (swiperRef.current && swiperRef.current.swiper) {
          swiperRef.current.swiper.allowTouchMove = false;
        }
      } catch (_) { /* ignore */ }
    }
    function onDragEnd() {
      try {
        if (swiperRef.current && swiperRef.current.swiper) {
          swiperRef.current.swiper.allowTouchMove = Boolean(isTouchDevice);
        }
      } catch (_) { /* ignore */ }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:carousel_drag_start', onDragStart as any);
      window.addEventListener('monolog:carousel_drag_end', onDragEnd as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('monolog:carousel_drag_start', onDragStart as any);
        window.removeEventListener('monolog:carousel_drag_end', onDragEnd as any);
      }
    };
  }, [isTouchDevice]);

  const handleSlideChange = (swiper: any) => {
    const newPath = views[swiper.activeIndex]?.path;
    if (newPath && newPath !== pathname) {
      router.push(newPath);
    }
  };


  const isMainView = views.some(v => v.path === pathname);

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
              modules={[]}
              spaceBetween={0}
              slidesPerView={1}
              initialSlide={currentIndex}
              onSlideChange={handleSlideChange}
              touchStartPreventDefault={false}
              // only allow touch/swipe interactions on touch-capable devices
              simulateTouch={isTouchDevice}
              allowTouchMove={isTouchDevice}
              resistance={false}
              // Allow both short (quick flick) and long swipes. The default
              // behavior was disabling them which made users have to drag a
              // large distance to change sections. Enable them and lower the
              // longSwipesRatio so a smaller horizontal drag (<25% of width)
              // will navigate to the next section.
              shortSwipes={true}
              longSwipes={true}
              longSwipesRatio={0.2}
              threshold={10}
              // Slightly increase touchRatio to make touch movements feel a bit
              // more responsive on devices with higher pixel density.
              touchRatio={1.1}
              speed={300}
              effect="slide"
              watchSlidesProgress={true}
            >
              {views.map((view, index) => (
                <SwiperSlide key={view.path} virtualIndex={index}>
                  <view.component />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : children}
        </main>
      </div>
      <NavBar />
      <NotificationListener />
      <ToastHost />
    </ToastProvider>
  );
}