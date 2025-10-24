"use client";

import { useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { Suspense } from "react";
import { useAppShellInit } from "./AppShellInit";
import { useAppShellViews, views } from "./AppShellViews";
import { useHeaderHeightMeasurement, useTabbarHeightMeasurement } from "./AppShellLayout";
import { useAppShellNavigation } from "./AppShellNavigation";
import { RESERVED_ROUTES } from "@/src/lib/types";
import { getUsernameFromRoute } from "@/src/lib/routeUtils";
import { SlideWrapper } from "./SlideWrapper";
import { useAuth } from "@/src/lib/hooks/useAuth";

const NotificationListener = dynamic(() => import("./NotificationListener").then(mod => mod.NotificationListener), { ssr: false });
const InstallPrompt = dynamic(() => import("./InstallPrompt").then(mod => mod.InstallPrompt), { ssr: false });

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  const { ready, isTouchDevice, forceTouch } = useAppShellInit();
  const { currentIndex, activeIndex, setActiveIndex, isMainView } = useAppShellViews();
  const { swiperRef, handleSlideChange } = useAppShellNavigation(currentIndex, activeIndex, setActiveIndex, isTouchDevice);
  const { me } = useAuth();

  useEffect(() => {
    const handleViewportChanged = () => {
      if (swiperRef.current) {
        swiperRef.current.update();
      }
    };
    window.addEventListener('monolog-viewport-changed', handleViewportChanged);
    return () => window.removeEventListener('monolog-viewport-changed', handleViewportChanged);
  }, []);

  return (
    <div className="app-content">
      <main
        ref={mainRef}
        className="content"
        id="view"
      >
        {!ready ? <div className="card skeleton" style={{ height: 240 }} /> : isMainView ? (
            <Swiper
            className="swipe-views"
            ref={swiperRef}
            onSwiper={(s) => { 
              swiperRef.current = s; 
            }}
            spaceBetween={0}
            slidesPerView={1}
            initialSlide={pathname === "/" && !me ? 1 : currentIndex}
            onSlideChange={handleSlideChange}
            // Basic touch support
            simulateTouch={true}
            allowTouchMove={true}
            touchRatio={1.3}
            touchAngle={30}
            longSwipesRatio={0.22}
            shortSwipes={true}
            threshold={0}
            resistance={true}
            resistanceRatio={0.85}
            observer={true}
            observeParents={true}
            style={{ height: '100%', touchAction: 'none' }}
          >
              {views.map((view, index) => {
                const Comp: any = view.component as any;
                // Special-case the calendar view: it can be expensive (many thumbnails),
                // so only mount it when it's the active slide.
                const shouldMount = view.path === '/calendar' ? (activeIndex === index) : (Math.abs(index - activeIndex) <= 1);
                const isActive = activeIndex === index;

                let component = null;
                if (shouldMount) {
                  if (view.path === '/profile') {
                    const username = getUsernameFromRoute(pathname);
                    component = <Comp userId={username} isActive={isActive} />;
                  } else {
                    component = <Comp isActive={isActive} />;
                  }
                } else {
                  // lightweight placeholder for off-screen slides
                  component = <div style={{ height: '100%' }} />;
                }

                return (
                  <SwiperSlide key={view.path} className={view.path === '/feed' ? 'slide-feed' : undefined}>
                    <div>
                      <Suspense fallback={<div className="card skeleton" style={{ height: 240 }} />}>
                        {component}
                      </Suspense>
                    </div>
                  </SwiperSlide>
                );
              })}
          </Swiper>
        ) : children}
      </main>
      <NotificationListener />
      <InstallPrompt />
    </div>
  );
}
