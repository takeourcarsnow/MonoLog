import { useEffect } from 'react';

export function useImageEditorHighlights(
  selectedCategory: 'basic' | 'color' | 'effects' | 'crop' | 'frame',
  selectedFilter: string,
  categoriesContainerRef: React.RefObject<HTMLDivElement>,
  filtersContainerRef: React.RefObject<HTMLDivElement>,
  setCategoryHighlight: (highlight: { left: number; top: number; width: number; height: number } | null) => void,
  setFilterHighlight: (highlight: { left: number; top: number; width: number; height: number } | null) => void,
  suppressFilterTransitionRef: React.MutableRefObject<boolean>
) {
  // Compute category highlight position
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

  // Compute filter highlight position
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

  // Suppress filter transition when opening color category
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