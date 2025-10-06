"use client";

import { useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import Preloader from "./Preloader";
import { ToastHost, ToastProvider } from "./Toast";
import { NotificationListener } from "./NotificationListener";
import { InstallPrompt } from "./InstallPrompt";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { Suspense } from "react";
import { useAppShellInit } from "./AppShellInit";
import { useAppShellViews, views } from "./AppShellViews";
import { useHeaderHeightMeasurement, useTabbarHeightMeasurement } from "./AppShellLayout";
import { useAppShellNavigation } from "./AppShellNavigation";
import { RESERVED_ROUTES } from "@/src/lib/types";
import { SlideWrapper } from "./SlideWrapper";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  const { ready, isTouchDevice, forceTouch } = useAppShellInit();
  const { currentIndex, activeIndex, setActiveIndex, isMainView } = useAppShellViews();
  const { swiperRef, handleSlideChange } = useAppShellNavigation(currentIndex, activeIndex, setActiveIndex, isTouchDevice);

  useHeaderHeightMeasurement(ready, pathname);
  useTabbarHeightMeasurement(ready);

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
              onSwiper={(s) => { 
                swiperRef.current = s; 
                console.log('Swiper initialized:', s);
              }}
              spaceBetween={0}
              slidesPerView={1}
              initialSlide={currentIndex}
              onSlideChange={handleSlideChange}
              // Basic touch support
              simulateTouch={true}
              allowTouchMove={true}
              touchRatio={0.5}
              touchAngle={30}
              longSwipesRatio={0.3}
              shortSwipes={false}
            >
              {views.map((view, index) => (
                <SwiperSlide key={view.path} className={view.path === '/feed' ? 'slide-feed' : undefined}>
                  <div>
                    <Suspense fallback={<div className="card skeleton" style={{ height: 240 }} />}>
                      {view.path === '/profile' ? (
                        (() => {
                          const pathSegments = pathname.split('/').filter(Boolean);
                          if (pathSegments.length === 1) {
                            const segment = pathSegments[0];
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
                  </div>
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
