"use client";

import { useRef } from "react";
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
import { SlideWrapper } from "./SlideWrapper";

export function AppShell({ children }: { children: React.ReactNode }) {
  "use client";
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
              onSwiper={(s) => { swiperRef.current = s; }}
              spaceBetween={0}
              slidesPerView={1}
              initialSlide={currentIndex}
              onSlideChange={handleSlideChange}
              touchStartPreventDefault={false}
              passiveListeners={false}
              // only allow touch/swipe interactions on touch-capable devices
              simulateTouch={true}
              allowTouchMove={true}
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
                <SwiperSlide key={view.path} className={view.path === '/feed' ? 'slide-feed' : undefined}>
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
