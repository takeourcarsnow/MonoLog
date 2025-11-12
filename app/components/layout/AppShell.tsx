"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { Suspense } from "react";
import { useAppShellInit } from "@/app/components/layout/AppShellInit";
import { useAppShellViews, views } from "@/app/components/layout/AppShellViews";
import { useHeaderHeightMeasurement, useTabbarHeightMeasurement } from "@/app/components/layout/AppShellLayout";
import { useAppShellNavigation } from "@/app/components/layout/AppShellNavigation";
import { RESERVED_ROUTES } from "@/lib/types";
import { getUsernameFromRoute } from "@/lib/routeUtils";
import { SlideWrapper } from "@/app/components/ui/SlideWrapper";
import { useAuth } from "@/lib/hooks/useAuth";
import { useCameraContext } from "@/app/components/context/CameraContext";

const NotificationListener = dynamic(() => import("@/app/components/notifications/NotificationListener").then(mod => mod.NotificationListener), { ssr: false });
const InstallPrompt = dynamic(() => import("@/app/components/pwa/InstallPrompt").then(mod => mod.InstallPrompt), { ssr: false });
const AuthForm = dynamic(() => import("@/app/components/auth/AuthForm").then(mod => mod.AuthForm), { ssr: false });

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const [showAuth, setShowAuth] = useState(false);

  const { ready, isTouchDevice, forceTouch } = useAppShellInit();
  const isMouseDevice = useMemo(() => {
    try {
      return typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
    } catch {
      return false;
    }
  }, []);
  const isMobile = useMemo(() => {
    try {
      return typeof window !== 'undefined' && /Mobile|Android|iP(hone|od|ad)/.test(navigator.userAgent);
    } catch {
      return false;
    }
  }, []);
  const { currentIndex, activeIndex, setActiveIndex, isMainView } = useAppShellViews();
  const { swiperRef, handleSlideChange } = useAppShellNavigation(currentIndex, activeIndex, setActiveIndex, isTouchDevice);
  const { me } = useAuth();
  const { isCameraOpen } = useCameraContext();

  if (isCameraOpen) return null;

  useEffect(() => {
    const handleViewportChanged = () => {
      if (swiperRef.current) {
        swiperRef.current.update();
      }
    };
    window.addEventListener('monolog-viewport-changed', handleViewportChanged);
    return () => window.removeEventListener('monolog-viewport-changed', handleViewportChanged);
  }, []);

  useEffect(() => {
    if (swiperRef.current) {
      swiperRef.current.enabled = isMobile;
      swiperRef.current.update();
    }
  }, [isMobile]);

  useEffect(() => {
    const handleAuthOpen = () => setShowAuth(true);
    window.addEventListener('auth:open', handleAuthOpen);
    return () => window.removeEventListener('auth:open', handleAuthOpen);
  }, []);

  return (
    <div className="app-content">
      <main
        ref={mainRef}
        className="content"
        id="view"
      >
        {!ready ? null : isMainView ? (
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
            enabled={isMobile}
            // Basic touch support
            simulateTouch={false}
            allowTouchMove={isTouchDevice}
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
                      <Suspense fallback={null}>
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
      {showAuth && <AuthForm onClose={() => setShowAuth(false)} />}
    </div>
  );
}
