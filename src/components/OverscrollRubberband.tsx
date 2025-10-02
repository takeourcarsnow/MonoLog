'use client';

import { useEffect } from 'react';

/**
 * OverscrollRubberband component - Rebuilt from scratch
 * Adds iOS-style rubber band effect ONLY to feed and explore content areas
 * Does NOT affect navbar, header, or horizontal swiping between views
 */
export function OverscrollRubberband() {
  useEffect(() => {
    // State variables
    let startY = 0;
    let currentTransform = 0;
    let isOverscrolling = false;
    let rafId: number | null = null;
    let targetFeed: HTMLElement | null = null;

    // Get the scrollable root container
    const getScrollContainer = () => {
      if (typeof document === 'undefined') return null;
      return document.getElementById('app-root') as HTMLElement | null;
    };

    // Find the .feed container that should be transformed
    const findFeedContainer = (target: EventTarget | null): HTMLElement | null => {
      if (!target || !(target instanceof Element)) return null;
      
      // Walk up the DOM tree to find .feed element
      let el: Element | null = target;
      while (el && el !== document.body) {
        if (el.classList.contains('feed')) {
          return el as HTMLElement;
        }
        el = el.parentElement;
      }
      return null;
    };

    // Check if touch is inside feed or explore views
    const isInFeedOrExplore = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof Element)) return false;
      
      let el: Element | null = target;
      while (el && el !== document.body) {
        // Check for feed container
        if (el.classList.contains('feed')) return true;
        // Check for swiper slides with feed/explore classes
        if (el.classList.contains('slide-feed')) return true;
        // Check for explore by looking at parent structure
        const parent = el.parentElement;
        if (parent?.classList.contains('swiper-slide')) {
          // If we're in a swiper slide, check if it's the feed or explore view
          const swiperWrapper = parent.parentElement;
          if (swiperWrapper?.classList.contains('swiper-wrapper')) {
            const slides = Array.from(swiperWrapper.children);
            const slideIndex = slides.indexOf(parent);
            // Index 0 = feed, Index 1 = explore
            if (slideIndex === 0 || slideIndex === 1) return true;
          }
        }
        el = el.parentElement;
      }
      return false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      const scrollContainer = getScrollContainer();
      if (!scrollContainer) return;

      // Only proceed if touch is in feed or explore
      if (!isInFeedOrExplore(e.target)) {
        targetFeed = null;
        return;
      }

      startY = e.touches[0].clientY;
      targetFeed = findFeedContainer(e.target);
      currentTransform = 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const scrollContainer = getScrollContainer();
      if (!scrollContainer || !targetFeed) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - startY;
      
      // Minimum movement threshold to prevent jitter
      if (Math.abs(deltaY) < 8) return;

      const scrollTop = scrollContainer.scrollTop;
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = scrollContainer.clientHeight;
      const isAtTop = scrollTop <= 1;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      // Apply overscroll effect at top (pulling down)
      if (isAtTop && deltaY > 0) {
        isOverscrolling = true;
        
        // Progressive resistance - more stretch at the beginning, less at the end
        const resistance = 0.4;
        const maxStretch = 100;
        const transform = Math.min(deltaY * resistance, maxStretch);
        currentTransform = transform;

        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          targetFeed!.style.transform = `translateY(${transform}px)`;
          targetFeed!.style.transition = 'none';
        });

        // Prevent default scroll behavior only when overscrolling
        if (e.cancelable) e.preventDefault();
      }
      // Apply overscroll effect at bottom (pulling up)
      else if (isAtBottom && deltaY < 0) {
        isOverscrolling = true;
        
        const resistance = 0.4;
        const maxStretch = 100;
        const transform = Math.max(deltaY * resistance, -maxStretch);
        currentTransform = transform;

        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          targetFeed!.style.transform = `translateY(${transform}px)`;
          targetFeed!.style.transition = 'none';
        });

        // Prevent default scroll behavior only when overscrolling
        if (e.cancelable) e.preventDefault();
      } else {
        // Not at edge, allow normal scrolling
        if (isOverscrolling) {
          resetTransform();
        }
      }
    };

    const handleTouchEnd = () => {
      if (isOverscrolling && targetFeed) {
        // Smooth bounce-back animation
        if (rafId) cancelAnimationFrame(rafId);
        
        targetFeed.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        targetFeed.style.transform = 'translateY(0)';

        // Clean up after animation
        setTimeout(() => {
          if (targetFeed) {
            targetFeed.style.transition = '';
          }
        }, 500);
      }

      // Reset state
      isOverscrolling = false;
      currentTransform = 0;
      targetFeed = null;
      startY = 0;
    };

    const resetTransform = () => {
      if (targetFeed && rafId) {
        cancelAnimationFrame(rafId);
        targetFeed.style.transform = 'translateY(0)';
        targetFeed.style.transition = '';
      }
      isOverscrolling = false;
      currentTransform = 0;
    };

    // Attach listeners to the scroll container
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) {
      console.warn('[OverscrollRubberband] #app-root not found');
      return;
    }

    scrollContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    scrollContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
    scrollContainer.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    // Cleanup
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('touchstart', handleTouchStart as EventListener);
        scrollContainer.removeEventListener('touchmove', handleTouchMove as EventListener);
        scrollContainer.removeEventListener('touchend', handleTouchEnd as EventListener);
        scrollContainer.removeEventListener('touchcancel', handleTouchEnd as EventListener);
      }

      if (rafId) cancelAnimationFrame(rafId);
      
      // Reset any lingering transforms
      if (targetFeed) {
        targetFeed.style.transform = '';
        targetFeed.style.transition = '';
      }
    };
  }, []);
  
  return null;
}
