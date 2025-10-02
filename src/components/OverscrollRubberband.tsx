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
  // Wheel accumulation for desktop trackpad/mouse wheel
  let wheelAccum = 0;
  let wheelTimeout: number | null = null;
  // Pointer drag state for mouse dragging
  let pointerActive = false;
  let pointerStartY = 0;

    // Get the scrollable root container
    const getScrollContainer = () => {
      if (typeof document === 'undefined') return null;
      return document.getElementById('app-root') as HTMLElement | null;
    };

    // Find the .feed container that should be transformed.
    // Look upward for a .feed ancestor; if not found, look for the enclosing
    // .swiper-slide and query a .feed inside it (covers Explore where the
    // .feed is a child of the slide rather than an ancestor of the event target).
    const findFeedContainer = (target: EventTarget | null): HTMLElement | null => {
      if (!target || !(target instanceof Element)) return null;

      // Prefer a closest ancestor that is itself the feed container
      const direct = target.closest('.feed');
      if (direct && direct instanceof HTMLElement) return direct;

      // Otherwise, find the nearest swiper slide and query a .feed inside it
      const slide = target.closest('.swiper-slide');
      if (slide && slide instanceof HTMLElement) {
        const inner = slide.querySelector<HTMLElement>('.feed');
        if (inner) return inner;
        // in some cases the slide itself may be the feed
        if (slide.classList.contains('feed')) return slide;
      }

      // Fallback: if the event target is the scroll container (or something else),
      // try the currently active slide (Swiper adds .swiper-slide-active to it)
      try {
        const active = document.querySelector<HTMLElement>('.swiper-slide-active');
        if (active) {
          const innerActive = active.querySelector<HTMLElement>('.feed');
          if (innerActive) return innerActive;
          if (active.classList.contains('feed')) return active;
        }
      } catch (e) { /* ignore */ }

      return null;
    };

    // Check if touch is inside feed or explore views
    const isInFeedOrExplore = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof Element)) return false;

      // If we can find a feed container near the target, it's in feed/explore
      if (findFeedContainer(target)) return true;

      // Also allow detection if the target is inside the slide that corresponds
      // to feed or explore. Look for nearest swiper-slide and inspect its index
      const slide = target instanceof Element ? target.closest('.swiper-slide') : null;
      if (slide && slide.parentElement?.classList.contains('swiper-wrapper')) {
        const slides = Array.from(slide.parentElement.children);
        const idx = slides.indexOf(slide);
        // views order in AppShell: 0 = feed, 1 = explore
        if (idx === 0 || idx === 1) return true;
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

    // Desktop: wheel/trackpad handler
    const handleWheel = (e: WheelEvent) => {
      const scrollContainer = getScrollContainer();
      if (!scrollContainer) return;

      // Try to find the feed container. Wheel events sometimes target the
      // scroll container or document, so fall back to the active slide or any
      // .feed in the document.
      let feed = findFeedContainer(e.target as EventTarget);
      if (!feed) {
        try {
          feed = document.querySelector<HTMLElement>('.swiper-slide-active .feed') || document.querySelector<HTMLElement>('.feed');
        } catch (err) { feed = null; }
      }
      if (!feed) return;
      targetFeed = feed;

      const scrollTop = scrollContainer.scrollTop;
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = scrollContainer.clientHeight;
      const isAtTop = scrollTop <= 1;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      // Normalize sign: positive means pulling down, negative means pulling up
      const delta = -e.deltaY;
      const resistance = 0.45;
      const maxStretch = 100;

      // Top overscroll (scrolling up when already at top)
      if (isAtTop && delta > 0) {
        wheelAccum = Math.min(wheelAccum + delta * resistance, maxStretch);
        currentTransform = wheelAccum;
        isOverscrolling = true;

        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          targetFeed!.style.transform = `translateY(${currentTransform}px)`;
          targetFeed!.style.transition = 'none';
        });

        if (e.cancelable) e.preventDefault();
      }
      // Bottom overscroll (scrolling down when already at bottom)
      else if (isAtBottom && delta < 0) {
        wheelAccum = Math.max(wheelAccum + delta * resistance, -maxStretch);
        currentTransform = wheelAccum;
        isOverscrolling = true;

        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          targetFeed!.style.transform = `translateY(${currentTransform}px)`;
          targetFeed!.style.transition = 'none';
        });

        if (e.cancelable) e.preventDefault();
      } else {
        // if not overscrolling, reset any accumulated wheel state
        if (isOverscrolling) {
          // continue to bounce back
        } else {
          wheelAccum = 0;
        }
      }

      // Reset/bounce after short pause in wheel events
      if (wheelTimeout) window.clearTimeout(wheelTimeout);
      wheelTimeout = window.setTimeout(() => {
        if (isOverscrolling) {
          // trigger bounce
          if (rafId) cancelAnimationFrame(rafId);
          if (targetFeed) targetFeed.style.transition = 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          if (targetFeed) targetFeed.style.transform = 'translateY(0)';
          // cleanup after animation
          window.setTimeout(() => {
            if (targetFeed) targetFeed.style.transition = '';
            wheelAccum = 0;
            isOverscrolling = false;
            currentTransform = 0;
          }, 480);
        }
      }, 80) as unknown as number;
    };

    // Pointer (mouse) drag support to mimic touch dragging
    const handlePointerDown = (e: PointerEvent) => {
      // Only left button drags
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!isInFeedOrExplore(e.target)) return;
      pointerActive = true;
      pointerStartY = e.clientY;
      // capture targetFeed for this pointer interaction
      if (!targetFeed) {
        let feed = findFeedContainer(e.target as EventTarget);
        if (!feed) {
          try { feed = document.querySelector<HTMLElement>('.swiper-slide-active .feed') || document.querySelector<HTMLElement>('.feed'); } catch (err) { feed = null; }
        }
        targetFeed = feed;
      }
      try { (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId); } catch (_) {}
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!pointerActive || !targetFeed) return;
      // Only respond to primary button or touch pen
      if (e.pointerType === 'mouse' && (e.buttons & 1) === 0) return;

      const scrollContainer = getScrollContainer();
      if (!scrollContainer) return;
      const deltaY = e.clientY - pointerStartY;
      if (Math.abs(deltaY) < 6) return;

      const scrollTop = scrollContainer.scrollTop;
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = scrollContainer.clientHeight;
      const isAtTop = scrollTop <= 1;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      const resistance = 0.4;
      const maxStretch = 100;

      if (isAtTop && deltaY > 0) {
        isOverscrolling = true;
        currentTransform = Math.min(deltaY * resistance, maxStretch);
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          targetFeed!.style.transform = `translateY(${currentTransform}px)`;
          targetFeed!.style.transition = 'none';
        });
        e.preventDefault?.();
      } else if (isAtBottom && deltaY < 0) {
        isOverscrolling = true;
        currentTransform = Math.max(deltaY * resistance, -maxStretch);
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          targetFeed!.style.transform = `translateY(${currentTransform}px)`;
          targetFeed!.style.transition = 'none';
        });
        e.preventDefault?.();
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!pointerActive) return;
      pointerActive = false;
      try { (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId); } catch (_) {}
      // bounce back if needed
      if (isOverscrolling && targetFeed) {
        targetFeed.style.transition = 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        targetFeed.style.transform = 'translateY(0)';
        window.setTimeout(() => { if (targetFeed) targetFeed.style.transition = ''; }, 480);
        isOverscrolling = false;
        currentTransform = 0;
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
    // Desktop wheel/trackpad support
    scrollContainer.addEventListener('wheel', handleWheel as EventListener, { passive: false });
    // Pointer (mouse) drag support: pointerdown on container, move/up on window
    scrollContainer.addEventListener('pointerdown', handlePointerDown as EventListener, { passive: true });
    window.addEventListener('pointermove', handlePointerMove as EventListener);
    window.addEventListener('pointerup', handlePointerUp as EventListener);
    window.addEventListener('pointercancel', handlePointerUp as EventListener);

    // Cleanup
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('touchstart', handleTouchStart as EventListener);
        scrollContainer.removeEventListener('touchmove', handleTouchMove as EventListener);
        scrollContainer.removeEventListener('touchend', handleTouchEnd as EventListener);
        scrollContainer.removeEventListener('touchcancel', handleTouchEnd as EventListener);
        scrollContainer.removeEventListener('wheel', handleWheel as EventListener);
        scrollContainer.removeEventListener('pointerdown', handlePointerDown as EventListener);
        window.removeEventListener('pointermove', handlePointerMove as EventListener);
        window.removeEventListener('pointerup', handlePointerUp as EventListener);
        window.removeEventListener('pointercancel', handlePointerUp as EventListener);
      }

      if (rafId) cancelAnimationFrame(rafId);
      
      // Reset any lingering transforms
      if (targetFeed) {
        targetFeed.style.transform = '';
        targetFeed.style.transition = '';
      }
      if (wheelTimeout) window.clearTimeout(wheelTimeout);
    };
  }, []);
  
  return null;
}
