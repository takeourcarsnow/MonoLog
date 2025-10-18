import React, { useEffect } from 'react';

export const useImageSizing = (
  containerRef: React.RefObject<HTMLDivElement>,
  imgRef: React.RefObject<HTMLImageElement>,
  isFullscreen: boolean,
  src: string | undefined,
  isActive: boolean
) => {
  // Ensure image fits the visible viewport when rendered in the single-post view.
  // CSS alone didn't reliably prevent edge-overflow across browsers/viewport chrome
  // so measure and set inline max sizes for non-fullscreen post view instances.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    // Only apply this sizing when the ImageZoom lives inside the single-post view
    // (pages that render the full post use the .post-view-wrap container).
    const postViewAncestor = container.closest && (container.closest('.post-view-wrap') as Element | null);
    if (!postViewAncestor) {
      // Not in single-post view — nothing to do
      return;
    }
    if (isFullscreen) {
      return; // fullscreen viewer manages its own sizing
    }

    // Check if this image is inside a carousel
    const carouselWrapper = container.closest('.carousel-wrapper') as HTMLElement | null;
    const isInCarousel = !!carouselWrapper;

    // For carousel, only the active slide applies sizing to prevent conflicts
    if (isInCarousel && !isActive) {
      return;
    }

    const docEl = document.documentElement;
    const getCSSVar = (name: string, fallback = 0) => {
      try {
        const v = getComputedStyle(docEl).getPropertyValue(name);
        return v ? parseFloat(v) : fallback;
      } catch (_) {
        return fallback;
      }
    };

    // Track last-applied sizes and throttle frequent calls to avoid
    // reacting to tiny visualViewport fluctuations (which can be noisy
    // on mobile during scrolling/keyboard open/close).
    let lastAppliedMaxW = 0;
    let lastAppliedMaxH = 0;
    let lastAppliedDesiredHeight = 0;
    let lastUpdateTime = 0;
    const MIN_UPDATE_MS = 100; // minimum interval between full updates

    function updateSizing() {
      try {
        const vv = (window as any).visualViewport;
        const viewportW = vv ? vv.width : window.innerWidth;
        const viewportH = vv ? vv.height : window.innerHeight;

        // Measure header/tabbar if present to reserve their space
        const headerEl = document.querySelector('.header') as HTMLElement | null;
        const headerH = headerEl ? headerEl.getBoundingClientRect().height : getCSSVar('--header-height', 0);
        const tabbarEl = document.querySelector('.tabbar') as HTMLElement | null;
        const tabbarH = tabbarEl ? tabbarEl.getBoundingClientRect().height : getCSSVar('--tabbar-height', 0);

        // Respect horizontal page side padding so edges align with header content
        const sidePad = getCSSVar('--page-side-padding', 12);

        // Round measured values to integers to avoid tiny fractional
        // differences retriggering style writes/observers repeatedly.
        const maxW = Math.max(0, Math.round(viewportW - (sidePad * 2)));

        // Calculate height taken by other parts of the post card so the media
        // container can shrink to ensure the whole card fits in the viewport.
        let otherCardHeight = 0;
        try {
          if (container) {
            const cardEl = (container.closest('article.card') as HTMLElement | null) || (container.closest('.card') as HTMLElement | null);
            if (cardEl) {
              // Sum heights of all direct children except the .card-media element
              const cardChildren = Array.from(cardEl.children) as HTMLElement[];
              const cardMedia = cardEl.querySelector('.card-media') as HTMLElement | null;
              for (const child of cardChildren) {
                if (cardMedia && child.isSameNode(cardMedia)) continue;
                const r = child.getBoundingClientRect();
                otherCardHeight += Math.ceil(r.height);
              }
            }
          }
        } catch (_) {
          otherCardHeight = 0;
        }

        // reserve a little breathing room (12-20px) so content doesn't touch exact edges
        const breathing = 16;

        // Available height for the card so it fits in viewport
        let availH = Math.max(0, viewportH - headerH - tabbarH - breathing);

        // Adjust for post-view-wrap padding if present
        if (container) {
          const postViewWrap = container.closest('.post-view-wrap') as HTMLElement | null;
          if (postViewWrap) {
            const style = getComputedStyle(postViewWrap);
            const padTop = parseFloat(style.paddingTop) || 0;
            const padBottom = parseFloat(style.paddingBottom) || 0;
            availH = Math.max(0, availH - padTop - padBottom);
          }
        }

        // Adjust for card padding
        let cardPadTop = 0;
        let cardPadBottom = 0;
        if (container) {
          const cardEl = (container.closest('article.card') as HTMLElement | null) || (container.closest('.card') as HTMLElement | null);
          if (cardEl) {
            const cardStyle = getComputedStyle(cardEl);
            cardPadTop = parseFloat(cardStyle.paddingTop) || 0;
            cardPadBottom = parseFloat(cardStyle.paddingBottom) || 0;
          }
        }

        const maxH = Math.max(0, Math.round(availH - otherCardHeight - cardPadTop - cardPadBottom));

        let desiredHeight = maxH;

        // Throttle rapid changes: if we've updated recently and the
        // rounded sizes didn't change, skip the expensive layout writes.
        const now = Date.now();
        if (now - lastUpdateTime < MIN_UPDATE_MS && maxW === lastAppliedMaxW && maxH === lastAppliedMaxH && desiredHeight === lastAppliedDesiredHeight) {
          return;
        }

        // For carousel slides, apply sizing to the carousel wrapper to maintain consistent height
        const targetContainer = isInCarousel ? carouselWrapper : container;

        if (targetContainer) {
          // Constrain container to measured viewport area. Use explicit height
          // so the image's max-height can correctly scale it without expanding.
          // Only apply style mutations when values actually change so we don't
          // trigger MutationObservers / ResizeObservers unnecessarily.
          const desiredMaxWidth = `${maxW}px`;
          const desiredMaxHeight = `${maxH}px`;
          const desiredWidth = 'auto';
          const desiredHeightStr = `${desiredHeight}px`;
          const desiredMargin = '0 auto';

          const curMaxWidth = targetContainer.style.maxWidth || '';
          const curMaxHeight = targetContainer.style.maxHeight || '';
          const curWidth = targetContainer.style.width || '';
          const curHeight = targetContainer.style.height || '';
          const curMargin = targetContainer.style.margin || '';

          const containerChanged = (
            curMaxWidth !== desiredMaxWidth ||
            curMaxHeight !== desiredMaxHeight ||
            curWidth !== desiredWidth ||
            curHeight !== desiredHeightStr ||
            curMargin !== desiredMargin
          );

          if (containerChanged) {
            targetContainer.style.maxWidth = desiredMaxWidth;
            targetContainer.style.maxHeight = desiredMaxHeight;
            targetContainer.style.width = desiredWidth;
            targetContainer.style.height = desiredHeightStr;
            targetContainer.style.margin = desiredMargin;
          }
          lastAppliedMaxW = maxW;
          lastAppliedMaxH = maxH;
          lastAppliedDesiredHeight = desiredHeight;
          lastUpdateTime = now;
        }
        if (img) {
          const desiredImgMaxWidth = '100%';
          const desiredImgMaxHeight = '100%';
          const desiredImgObjectFit = 'contain';
          const desiredImgWidth = 'auto';
          const desiredImgHeight = '100%';

          const imgChanged = (
            img.style.maxWidth !== desiredImgMaxWidth ||
            img.style.maxHeight !== desiredImgMaxHeight ||
            img.style.objectFit !== desiredImgObjectFit ||
            img.style.width !== desiredImgWidth ||
            img.style.height !== desiredImgHeight
          );

          if (imgChanged) {
            img.style.maxWidth = desiredImgMaxWidth;
            img.style.maxHeight = desiredImgMaxHeight;
            img.style.objectFit = desiredImgObjectFit;
            img.style.width = desiredImgWidth;
            img.style.height = desiredImgHeight;
          }
        }

        // If the whole card still overflows the visible area (e.g. tabbar overlays
        // or other dynamic content changed after measurement), iteratively reduce
        // the container height until the card fits or a safety limit is reached.
        try {
          if (targetContainer) {
            const cardEl = (targetContainer.closest('article.card') as HTMLElement | null) || (targetContainer.closest('.card') as HTMLElement | null);
            if (cardEl) {
              const allowedBottom = (vv ? vv.height : window.innerHeight) - tabbarH - Math.ceil(breathing / 2);
              let attempts = 0;
              // current container height in px
              let curH = desiredHeight;
              while (attempts < 6) {
                const rect = cardEl.getBoundingClientRect();
                if (rect.bottom <= allowedBottom) break;
                const overflowPx = rect.bottom - allowedBottom;
                // shrink container by overflow amount plus small cushion
                curH = Math.max(64, curH - (overflowPx + 8));
                attempts += 1;
              }
              desiredHeight = curH;
            }
          }
        } catch (_) {
          // ignore measurement errors
        }
      } catch (_) {
        // ignore measurement errors
      }
    }

  // Run initially and on viewport changes
  updateSizing();
    let raf = 0 as number | null;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { updateSizing(); raf = null; });
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    if ((window as any).visualViewport) (window as any).visualViewport.addEventListener('resize', onResize);

    const onLayoutChange = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { updateSizing(); raf = null; });
    };
    try { window.addEventListener('monolog:card_layout_change', onLayoutChange as any); } catch(_) {}

    // Observe card/container changes (comments opening/closing, caption height changes)
    let ro: ResizeObserver | null = null;
    let mo: MutationObserver | null = null;
    let imgLoadListener: (() => void) | null = null;
    try {
        if (container && !isInCarousel) {
            const cardEl = (container.closest('article.card') as HTMLElement | null) || (container.closest('.card') as HTMLElement | null) || container;
            ro = new ResizeObserver(() => {
              if (raf) cancelAnimationFrame(raf);
              raf = requestAnimationFrame(() => { updateSizing(); raf = null; });
            });
            ro.observe(container);
            if (cardEl && cardEl !== container) ro.observe(cardEl);

            // MutationObserver to catch structural changes (children added/removed)
            // Avoid observing attribute changes (like inline style updates) which
            // can create a feedback loop when updateSizing writes styles.
            mo = new MutationObserver(() => {
              if (raf) cancelAnimationFrame(raf);
              raf = requestAnimationFrame(() => { updateSizing(); raf = null; });
            });
            mo.observe(cardEl, { childList: true, subtree: true });
          } else if (isInCarousel && isActive) {
            // For active carousel slide, observe the card for layout changes
            const cardEl = (container.closest('article.card') as HTMLElement | null) || (container.closest('.card') as HTMLElement | null);
            if (cardEl) {
              ro = new ResizeObserver(() => {
                if (raf) cancelAnimationFrame(raf);
                raf = requestAnimationFrame(() => { updateSizing(); raf = null; });
              });
              ro.observe(cardEl);

              mo = new MutationObserver(() => {
                if (raf) cancelAnimationFrame(raf);
                raf = requestAnimationFrame(() => { updateSizing(); raf = null; });
              });
              mo.observe(cardEl, { childList: true, subtree: true });
            }
          }
        if (img && !img.complete) {
          imgLoadListener = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => { updateSizing(); raf = null; });
          };
          img.addEventListener('load', imgLoadListener);
        }
    } catch (_) {
      // ignore observer failures
    }

    return () => {
  window.removeEventListener('resize', onResize);
  window.removeEventListener('orientationchange', onResize);
  if ((window as any).visualViewport) (window as any).visualViewport.removeEventListener('resize', onResize as any);
  if (ro) try { ro.disconnect(); } catch(_) {}
  if (mo) try { mo.disconnect(); } catch(_) {}
  if (imgLoadListener && img) try { img.removeEventListener('load', imgLoadListener); } catch(_) {}
  try { window.removeEventListener('monolog:card_layout_change', onLayoutChange as any); } catch(_) {}
      if (raf) cancelAnimationFrame(raf as number);
      // Clear inline sizing when unmounted so other layouts aren't affected
      try {
        const targetContainer = isInCarousel ? carouselWrapper : container;
        if (targetContainer) {
          targetContainer.style.maxWidth = '';
          targetContainer.style.maxHeight = '';
          targetContainer.style.width = '';
          targetContainer.style.height = '';
        }
        if (img) {
          img.style.maxWidth = '';
          img.style.maxHeight = '';
          img.style.objectFit = '';
          img.style.height = '';
          img.style.width = '';
        }
      } catch (_) {}
    };
  // Include ref.current in the dependency list so the effect re-runs when
  // the refs are populated by the ImageZoom render. Previously the effect
  // could run before refs were assigned and never re-run, leaving sizing
  // logic inactive on single-post views after the refactor.
  //
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen, src, isActive, containerRef.current, imgRef.current]);
};