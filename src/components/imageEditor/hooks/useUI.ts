import { useEffect } from "react";

interface UseHighlightsParams {
  selectedCategory: 'basic' | 'color' | 'effects' | 'crop' | 'frame';
  selectedFilter: string;
  selectedCategoryRef: React.MutableRefObject<'basic' | 'color' | 'effects' | 'crop' | 'frame'>;
  filtersContainerRef: React.RefObject<HTMLDivElement>;
  categoriesContainerRef: React.RefObject<HTMLDivElement>;
  setFilterHighlight: (highlight: { left: number; top: number; width: number; height: number } | null) => void;
  setCategoryHighlight: (highlight: { left: number; top: number; width: number; height: number } | null) => void;
  suppressFilterTransitionRef: React.MutableRefObject<boolean>;
}

export function useHighlights({
  selectedCategory,
  selectedFilter,
  selectedCategoryRef,
  filtersContainerRef,
  categoriesContainerRef,
  setFilterHighlight,
  setCategoryHighlight,
  suppressFilterTransitionRef,
}: UseHighlightsParams) {
  // compute highlight pill position whenever selectedFilter, category, or layout changes
  useEffect(() => {
    let mountedFlag = true;
    const compute = () => {
      const cont = filtersContainerRef.current;
      if (!cont) { if (mountedFlag) setFilterHighlight(null); return; }
      const btn = cont.querySelector<HTMLButtonElement>(`button[data-filter="${selectedFilter}"]`);
      if (!btn) { if (mountedFlag) setFilterHighlight(null); return; }
      // prefer offset measurements (position relative to container) for stable alignment
      const left = Math.round((btn as HTMLElement).offsetLeft - 3);
      const top = Math.round((btn as HTMLElement).offsetTop - 4);
      const width = Math.round((btn as HTMLElement).offsetWidth + 6);
      const height = Math.round((btn as HTMLElement).offsetHeight + 8);
      if (mountedFlag) setFilterHighlight({ left, top, width, height });
      // also update the CSS height via style on the pill element by toggling a CSS custom property (we keep inline styles simple)
    };
    // measure on next frame to ensure layout has settled (useful when panel animates open)
    const raf = requestAnimationFrame(() => setTimeout(() => compute(), 20));
    const ro = new ResizeObserver(() => compute());
    if (filtersContainerRef.current) ro.observe(filtersContainerRef.current);
    window.addEventListener('resize', compute);
    return () => {
      mountedFlag = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [selectedFilter, selectedCategory]);

  useEffect(() => {
    let alive = true;
    const compute = () => {
      const cont = categoriesContainerRef.current;
      if (!cont) { if (alive) setCategoryHighlight(null); return; }
      const selKey = selectedCategory === 'basic' ? 'basic' : selectedCategory === 'color' ? 'color' : selectedCategory === 'effects' ? 'effects' : selectedCategory === 'crop' ? 'crop' : 'frame';
      const btn = cont.querySelector<HTMLButtonElement>(`button[data-cat="${selKey}"]`);
      if (!btn) { if (alive) setCategoryHighlight(null); return; }
      const left = Math.round((btn as HTMLElement).offsetLeft - 4);
      const top = Math.round((btn as HTMLElement).offsetTop - 4);
      const width = Math.round((btn as HTMLElement).offsetWidth + 8);
      const height = Math.round((btn as HTMLElement).offsetHeight + 8);
      if (alive) setCategoryHighlight({ left, top, width, height });
    };
    const raf = requestAnimationFrame(() => setTimeout(() => compute(), 16));
    const ro = new ResizeObserver(() => compute());
    if (categoriesContainerRef.current) {
      ro.observe(categoriesContainerRef.current);
      // Also observe all category buttons for size changes (hover effects)
      const buttons = categoriesContainerRef.current.querySelectorAll('.cat-btn');
      buttons.forEach(btn => ro.observe(btn as Element));
    }
    window.addEventListener('resize', compute);
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('resize', compute); };
  }, [selectedCategory]);

  // when opening the Filters category, suppress the highlight transition for the initial placement
  useEffect(() => {
    if (selectedCategory === 'color') {
      suppressFilterTransitionRef.current = true;
      // re-enable transitions after the initial layout settles
      const t = window.setTimeout(() => { suppressFilterTransitionRef.current = false; }, 220);
      return () => window.clearTimeout(t);
    }
    // ensure flag is off when leaving
    suppressFilterTransitionRef.current = false;
  }, [selectedCategory]);
}

interface UseAnimationsParams {
  sel: { x: number; y: number; w: number; h: number } | null;
  dashOffsetRef: React.MutableRefObject<number>;
  dashAnimRef: React.MutableRefObject<number | null>;
  draw: () => void;
}

export function useAnimations({
  sel,
  dashOffsetRef,
  dashAnimRef,
  draw,
}: UseAnimationsParams) {
  // animate dashed selection while a selection exists
  useEffect(() => {
    function step() {
      dashOffsetRef.current = (dashOffsetRef.current - 0.8) % 1000;
      // redraw only to update stroke offset (lightweight)
      draw();
      dashAnimRef.current = requestAnimationFrame(step);
    }
    if (sel) {
      if (dashAnimRef.current == null) dashAnimRef.current = requestAnimationFrame(step);
    } else {
      if (dashAnimRef.current != null) {
        cancelAnimationFrame(dashAnimRef.current);
        dashAnimRef.current = null;
        dashOffsetRef.current = 0;
        draw();
      }
    }
    return () => {
      if (dashAnimRef.current != null) cancelAnimationFrame(dashAnimRef.current);
      dashAnimRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);
}

interface UseSliderEventsParams {
  containerRef: React.RefObject<HTMLDivElement>;
}

export function useSliderEvents({ containerRef }: UseSliderEventsParams) {
  // Ensure slider interactions don't cause the outer app swiper to change slides.
  // Dispatch global events that AppShell listens to so it can temporarily disable
  // outer swipe handling while the user is moving a slider.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    const start = () => {
      try { window.dispatchEvent(new CustomEvent('monolog:carousel_drag_start')); } catch (_) {}
      // ensure we always end when pointer/touch/mouse is released anywhere
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
      window.addEventListener('touchend', end);
      window.addEventListener('touchcancel', end);
      window.addEventListener('mouseup', end);
    };

    const end = () => {
      try { window.dispatchEvent(new CustomEvent('monolog:carousel_drag_end')); } catch (_) {}
      window.removeEventListener('pointerup', end);
      window.removeEventListener('touchend', end);
      window.removeEventListener('mouseup', end);
    };

    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('.imgedit-range'));
    inputs.forEach(inp => {
      inp.addEventListener('pointerdown', start);
      inp.addEventListener('touchstart', start, { passive: true } as any);
      inp.addEventListener('mousedown', start);
    });

    return () => {
      inputs.forEach(inp => {
        inp.removeEventListener('pointerdown', start);
        inp.removeEventListener('touchstart', start as any);
        inp.removeEventListener('mousedown', start);
      });
      // ensure cleanup of window listeners
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', end);
      window.removeEventListener('mouseup', end);
    };
  }, []);
}