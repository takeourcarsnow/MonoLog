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
  }, []);

  useEffect(() => {
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.slideTo(currentIndex);
    }
  }, [currentIndex]);

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
              simulateTouch={true}
              resistance={false}
              shortSwipes={false}
              longSwipes={false}
              threshold={10}
              touchRatio={1}
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