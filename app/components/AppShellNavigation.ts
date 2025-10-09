"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { views } from "./AppShellViews";
import { RESERVED_ROUTES } from "@/src/lib/types";

export function useAppShellNavigation(
  currentIndex: number,
  activeIndex: number,
  setActiveIndex: (index: number) => void,
  isTouchDevice: boolean
) {
  const pathname = usePathname();
  const router = useRouter();
  const swiperRef = useRef<any>(null);

  // Sync swiper to current route
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
  // Also disable during zoom and pan to prevent accidental view changes.
  useEffect(() => {
    let touchDisabledTimeout: NodeJS.Timeout;

    function onDragStart() {
      try {
        const inst = swiperRef.current && (swiperRef.current.swiper ? swiperRef.current.swiper : swiperRef.current);
        if (inst) {
          inst.allowTouchMove = false;
          inst.enabled = false;
          // Failsafe: re-enable touch after 5 seconds if end event is missed
          if (touchDisabledTimeout) clearTimeout(touchDisabledTimeout);
          touchDisabledTimeout = setTimeout(() => {
            try {
              const inst = swiperRef.current && (swiperRef.current.swiper ? swiperRef.current.swiper : swiperRef.current);
              if (inst && !inst.allowTouchMove) {
                inst.allowTouchMove = true;
                inst.enabled = true;
              }
            } catch (_) { /* ignore */ }
          }, 5000);
        }
      } catch (_) { /* ignore */ }
    }
    function onDragEnd() {
      try {
        const inst = swiperRef.current && (swiperRef.current.swiper ? swiperRef.current.swiper : swiperRef.current);
        if (inst) {
          inst.allowTouchMove = true;
          inst.enabled = true;
          if (touchDisabledTimeout) {
            clearTimeout(touchDisabledTimeout);
          }
        }
      } catch (_) { /* ignore */ }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:carousel_drag_start', onDragStart as any);
      window.addEventListener('monolog:carousel_drag_end', onDragEnd as any);
      window.addEventListener('monolog:zoom_start', onDragStart as any);
      window.addEventListener('monolog:zoom_end', onDragEnd as any);
      window.addEventListener('monolog:pan_start', onDragStart as any);
      window.addEventListener('monolog:pan_end', onDragEnd as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('monolog:carousel_drag_start', onDragStart as any);
        window.removeEventListener('monolog:carousel_drag_end', onDragEnd as any);
        window.removeEventListener('monolog:zoom_start', onDragStart as any);
        window.removeEventListener('monolog:zoom_end', onDragEnd as any);
        window.removeEventListener('monolog:pan_start', onDragStart as any);
        window.removeEventListener('monolog:pan_end', onDragEnd as any);
      }
    };
  }, []);

    const handleSlideChange = (swiper: any) => {
    const newPath = views[swiper.activeIndex]?.path;
    // keep local state for which slide is active so we can mark others inert
    try { setActiveIndex(typeof swiper.activeIndex === 'number' ? swiper.activeIndex : currentIndex); } catch (_) {}
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
          if (!RESERVED_ROUTES.includes(segment.toLowerCase())) return;
        }
      }
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
  }, [router, pathname, setActiveIndex]);

  return { swiperRef, handleSlideChange };
}
