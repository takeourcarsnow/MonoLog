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
import { SlideWrapper } from "./SlideWrapper";

const NotificationListener = dynamic(() => import("./NotificationListener").then(mod => mod.NotificationListener), { ssr: false });
const InstallPrompt = dynamic(() => import("./InstallPrompt").then(mod => mod.InstallPrompt), { ssr: false });

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  const { ready, isTouchDevice, forceTouch } = useAppShellInit();
  const { currentIndex, activeIndex, setActiveIndex, isMainView } = useAppShellViews();
  const { swiperRef, handleSlideChange } = useAppShellNavigation(currentIndex, activeIndex, setActiveIndex, isTouchDevice);

  useHeaderHeightMeasurement(ready, pathname);
  useTabbarHeightMeasurement(ready);

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
            initialSlide={currentIndex}
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
            style={{ height: '100%', touchAction: 'none' }}
          >
              {views.map((view, index) => (
                <SwiperSlide key={view.path} className={view.path === '/feed' ? 'slide-feed' : undefined}>
                  <div>
                    {/* Only mount the active slide and its immediate neighbours to avoid
                        mounting all views (which causes their images to load even when
                        off-screen). Mounting neighbors preserves swipe UX while reducing
                        unnecessary network requests. */}
                    <Suspense fallback={<div className="card skeleton" style={{ height: 240 }} />}>
                      {(() => {
                        const Comp: any = view.component as any;
                        // Special-case the calendar view: it can be expensive (many
                        // thumbnails), so only mount it when it's the active slide.
                        const shouldMount = view.path === '/calendar' ? (activeIndex === index) : (Math.abs(index - activeIndex) <= 1);
                        if (shouldMount) {
                          if (view.path === '/profile') {
                            const pathSegments = pathname.split('/').filter(Boolean);
                            if (pathSegments.length === 1) {
                              const segment = pathSegments[0];
                              if (!RESERVED_ROUTES.includes(segment.toLowerCase())) {
                                return <Comp userId={segment} isActive={activeIndex === index} />;
                              }
                            }
                            return <Comp isActive={activeIndex === index} />;
                          }
                          return <Comp isActive={activeIndex === index} />;
                        }
                        // lightweight placeholder for off-screen slides
                        return <div style={{ height: '100%' }} />;
                      })()}
                    </Suspense>
                  </div>
                </SwiperSlide>
              ))}
          </Swiper>
        ) : children}
      </main>
      <NotificationListener />
      <InstallPrompt />
    </div>
  );
}
