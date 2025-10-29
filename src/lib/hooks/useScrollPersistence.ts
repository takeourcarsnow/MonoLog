import { useEffect } from "react";
import { getSlideState, setSlideState } from '@/src/lib/slideStateCache';

export function useScrollPersistence(scrollStateKey: string) {
  useEffect(() => {
    // restore scroll position if cached
    const cached = getSlideState<{ scrollY?: number }>(scrollStateKey);
    if (cached?.scrollY && typeof window !== 'undefined') {
      try {
        const scrollable = document.querySelector('.content') as HTMLElement;
        if (scrollable) scrollable.scrollTo(0, cached.scrollY);
      } catch (_) {}
    }
  }, [scrollStateKey]);

  // Persist scroll position when unmounting
  useEffect(() => {
    return () => {
      try {
        const scrollable = document.querySelector('.content') as HTMLElement;
        const scrollY = scrollable ? scrollable.scrollTop : 0;
        setSlideState(scrollStateKey, { scrollY });
      } catch (_) {}
    };
  }, [scrollStateKey]);
}