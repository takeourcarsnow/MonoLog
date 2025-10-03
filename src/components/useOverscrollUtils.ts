import { useEffect } from 'react';

export function useOverscrollUtils() {
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
    // first prefer .feed (post list) then the calendar page wrapper so
    // the calendar header/grid and the day feed move together.
    const direct = target.closest('.feed') || target.closest('.calendar-page');
    if (direct && direct instanceof HTMLElement) return direct;

    // Otherwise, find the nearest swiper slide and query a .feed inside it
    const slide = target.closest('.swiper-slide');
    if (slide && slide instanceof HTMLElement) {
      // prefer a .feed inside the slide, but also accept a .calendar-page wrapper
      const inner = slide.querySelector<HTMLElement>('.feed') || slide.querySelector<HTMLElement>('.calendar-page');
      if (inner) return inner;
      // in some cases the slide itself may be the feed
      if (slide.classList.contains('feed')) return slide;
    }

    // Fallback: if the event target is the scroll container (or something else),
    // try the currently active slide (Swiper adds .swiper-slide-active to it)
    try {
      const active = document.querySelector<HTMLElement>('.swiper-slide-active');
      if (active) {
        const innerActive = active.querySelector<HTMLElement>('.feed') || active.querySelector<HTMLElement>('.calendar-page');
        if (innerActive) return innerActive;
        if (active.classList.contains('feed')) return active;
      }
    } catch (e) { /* ignore */ }

    return null;
  };

  // Check if target should get the rubberband effect
  // Originally this was limited to feed/explore. We now also allow the About page
  // by checking for the .about-card wrapper so the About page can be pulled.
  const isInFeedOrExplore = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof Element)) return false;

    // About page wrapper (explicit opt-in for rubberband)
    if (target instanceof Element && target.closest('.about-card')) return true;

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

  return { getScrollContainer, findFeedContainer, isInFeedOrExplore };
}