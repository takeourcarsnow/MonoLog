/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  maxScale?: number;
  isActive?: boolean;
  isFullscreen?: boolean;
  instanceId?: string;
};

export function ImageZoom({ src, alt, className, style, maxScale = 2, isActive = true, isFullscreen = false, instanceId, ...rest }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [isTile, setIsTile] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const lastDoubleTapRef = useRef<number | null>(null);
  const lastTapTimeoutRef = useRef<number | null>(null);
  const lastEventTimeRef = useRef<number | null>(null);
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const naturalRef = useRef({ w: 0, h: 0 });
  // Track small movements so we can distinguish taps from scroll/drags
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef<boolean>(false);
  const TAP_MOVE_THRESHOLD = 10; // pixels
  // Refs to mirror state for use in passive event handlers
  const scaleRef = useRef<number>(scale);
  const txRef = useRef<number>(tx);
  const tyRef = useRef<number>(ty);
  const pinchRef = useRef<null | { initialDistance: number; initialScale: number; midX: number; midY: number; initialMidLocalX: number; initialMidLocalY: number }>(null);
  // Whether wheel-driven zoom is allowed. It becomes true when the user
  // explicitly starts a zoom (double-click or pinch). This prevents the
  // mouse wheel from initiating zoom on accidental scrolls.
  const wheelEnabledRef = useRef<boolean>(false);
  // Unique id for this instance so we can ignore our own global events
  const instanceIdRef = useRef<string>(instanceId ?? Math.random().toString(36).slice(2));

  // When another ImageZoom instance starts zooming, reset this one if it's
  // currently zoomed in. The originating instance will include its id in
  // the event detail; ignore events that originate from this instance.
  useEffect(() => {
    const onOtherZoom = (ev: Event) => {
      try {
        const e = ev as CustomEvent;
        const originId = e?.detail?.id as string | undefined;
        // If originId exists and it's from this instance, ignore. Otherwise
        // treat it as a request to close/reset this zoom instance.
        if (originId && originId === instanceIdRef.current) return; // ignore our own
        if (scaleRef.current > 1) {
          setScale(1);
          setTx(0);
          setTy(0);
          wheelEnabledRef.current = false;
          try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_end', { detail: { id: instanceIdRef.current } })); } catch(_) {}
        }
      } catch (_) {
        // ignore
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:zoom_start', onOtherZoom as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('monolog:zoom_start', onOtherZoom as any);
      }
    };
  }, []);

  // Detect if this ImageZoom is rendered inside a grid tile
  
  // Detect if this ImageZoom is rendered inside a grid tile
  useEffect(() => {
    try {
      const el = containerRef.current;
      if (!el) return;
      const tile = el.closest && (el.closest('.tile') as Element | null);
      setIsTile(!!tile);
    } catch (e) {
      // ignore
    }
  }, []);

  // Reset zoom state when src changes
  useEffect(() => {
    setScale(1);
    setTx(0);
    setTy(0);
    // Dispatch zoom end event
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monolog:zoom_end', { detail: { id: instanceIdRef.current } }));
      } catch (_) {}
    }
  }, [src]);

  // keep refs in sync with state
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { txRef.current = tx; }, [tx]);
  useEffect(() => { tyRef.current = ty; }, [ty]);

  // Reset zoom when the image becomes inactive
  useEffect(() => {
    if (!isActive) {
      setScale(1);
      setTx(0);
      setTy(0);
      // Dispatch zoom end event
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('monolog:zoom_end'));
        } catch (_) {}
      }
    }
  }, [isActive]);

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

        // Available height for the media container so the entire card fits in viewport
        const availH = Math.max(0, viewportH - headerH - tabbarH - otherCardHeight - breathing);

        const maxH = Math.max(0, Math.round(availH));

        // Throttle rapid changes: if we've updated recently and the
        // rounded sizes didn't change, skip the expensive layout writes.
        const now = Date.now();
        if (now - lastUpdateTime < MIN_UPDATE_MS && maxW === lastAppliedMaxW && maxH === lastAppliedMaxH) {
          return;
        }

        if (container) {
          // Constrain container to measured viewport area. Use explicit height
          // so the image's max-height can correctly scale it without expanding.
          // Only apply style mutations when values actually change so we don't
          // trigger MutationObservers / ResizeObservers unnecessarily.
          const desiredMaxWidth = `${maxW}px`;
          const desiredMaxHeight = `${maxH}px`;
          const desiredWidth = 'auto';
          const desiredHeight = `${maxH}px`;
          const desiredMargin = '0 auto';

          const curMaxWidth = container.style.maxWidth || '';
          const curMaxHeight = container.style.maxHeight || '';
          const curWidth = container.style.width || '';
          const curHeight = container.style.height || '';
          const curMargin = container.style.margin || '';

          const containerChanged = (
            curMaxWidth !== desiredMaxWidth ||
            curMaxHeight !== desiredMaxHeight ||
            curWidth !== desiredWidth ||
            curHeight !== desiredHeight ||
            curMargin !== desiredMargin
          );

          if (containerChanged) {
            container.style.maxWidth = desiredMaxWidth;
            container.style.maxHeight = desiredMaxHeight;
            container.style.width = desiredWidth;
            container.style.height = desiredHeight;
            container.style.margin = desiredMargin;
          }
          lastAppliedMaxW = maxW;
          lastAppliedMaxH = maxH;
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
          if (container) {
            const cardEl = (container.closest('article.card') as HTMLElement | null) || (container.closest('.card') as HTMLElement | null);
            if (cardEl) {
              const allowedBottom = (vv ? vv.height : window.innerHeight) - tabbarH - Math.ceil(breathing / 2);
              let attempts = 0;
              // current container height in px
              let curH = parseFloat(container.style.height || `${maxH}`) || maxH;
              while (attempts < 6) {
                const rect = cardEl.getBoundingClientRect();
                if (rect.bottom <= allowedBottom) break;
                const overflowPx = rect.bottom - allowedBottom;
                // shrink container by overflow amount plus small cushion
                curH = Math.max(64, curH - (overflowPx + 8));
                container.style.height = `${curH}px`;
                if (img) img.style.height = '100%';
                attempts += 1;
              }
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
    try {
        if (container) {
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
  try { window.removeEventListener('monolog:card_layout_change', onLayoutChange as any); } catch(_) {}
      if (raf) cancelAnimationFrame(raf as number);
      // Clear inline sizing when unmounted so other layouts aren't affected
      try {
        if (container) {
          container.style.maxWidth = '';
          container.style.maxHeight = '';
          container.style.width = '';
          container.style.height = '';
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
  }, [isFullscreen, src]);

  // Set natural dimensions when image loads
  useEffect(() => {
    const img = imgRef.current;
    if (img) {
      if (img.complete) {
        naturalRef.current.w = img.naturalWidth;
        naturalRef.current.h = img.naturalHeight;
      } else {
        const onLoad = () => {
          naturalRef.current.w = img.naturalWidth;
          naturalRef.current.h = img.naturalHeight;
        };
        img.addEventListener('load', onLoad);
        return () => img.removeEventListener('load', onLoad);
      }
    }
  }, [src]);

  const getBounds = useCallback((currentScale: number) => {
    const c = containerRef.current;
    const img = imgRef.current;
    if (!c || !img) return { maxTx: 0, maxTy: 0 };

    const rect = c.getBoundingClientRect();
    const containerW = rect.width;
    const containerH = rect.height;
    const natW = img.naturalWidth || naturalRef.current.w || containerW;
    const natH = img.naturalHeight || naturalRef.current.h || containerH;

    // Calculate the scale factor to fit the image within the container
    const fitScale = Math.min(containerW / natW, containerH / natH);
    const renderedW = natW * fitScale;
    const renderedH = natH * fitScale;

    // When zoomed with transform: scale(scale), the effective size
    const scaledW = renderedW * currentScale;
    const scaledH = renderedH * currentScale;

    const maxTx = Math.max(0, (scaledW - containerW) / 2);
    const maxTy = Math.max(0, (scaledH - containerH) / 2);

    return { maxTx, maxTy };
  }, []);

  const handleDoubleTap = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (scale > 1) {
      // Zoom out to center
      setScale(1);
      setTx(0);
      setTy(0);
      wheelEnabledRef.current = false;
      // Dispatch zoom end event
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('monolog:zoom_end', { detail: { id: instanceIdRef.current } }));
        } catch (_) {}
      }
    } else {
      // Zoom in to double tap location - use smaller scale for fullscreen
      const zoomScale = isFullscreen ? 1.5 : maxScale;
      setScale(zoomScale);

      // Calculate translation to center the tap point
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      const newTx = -(localX - containerWidth / 2) * zoomScale;
      const newTy = -(localY - containerHeight / 2) * zoomScale;

      // Clamp to bounds
      const bounds = getBounds(zoomScale);
      const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
      const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

      setTx(clampedTx);
      setTy(clampedTy);
      // Allow wheel zoom now that the user explicitly triggered zoom
      wheelEnabledRef.current = true;

      // Dispatch zoom start event
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('monolog:zoom_start', { detail: { id: instanceIdRef.current } }));
        } catch (_) {}
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    // record pointer start to distinguish tap vs drag
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;

    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      tx: tx,
      ty: ty
    };

    // Dispatch pan start event
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monolog:pan_start'));
      } catch (_) {}
    }

    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // mark moved if movement exceeds threshold
    if (pointerStartRef.current) {
      const dxStart = e.clientX - pointerStartRef.current.x;
      const dyStart = e.clientY - pointerStartRef.current.y;
      if (!movedRef.current && Math.hypot(dxStart, dyStart) > TAP_MOVE_THRESHOLD) movedRef.current = true;
    }

    if (!isPanning || !panStartRef.current) return;

    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;

    const newTx = panStartRef.current.tx + dx;
    const newTy = panStartRef.current.ty + dy;

  const bounds = getBounds(scale);
    const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
    const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

    setTx(clampedTx);
    setTy(clampedTy);

    // Prevent parent components from receiving swipe gestures when panning
    e.stopPropagation();
    e.preventDefault();
  };

  const handlePointerUp = (e?: React.PointerEvent) => {
    // Pointer-based double-tap detection for platforms that use Pointer Events
    // (modern browsers replace touch events with pointer events). Mirror the
    // touch double-tap behaviour so quick taps on touch devices also trigger
    // zoom.
    try {
      if (e && (e as any).pointerType === 'touch') {
        // Only consider it a tap (and potential double-tap) when not panning
        // and the pointer didn't move beyond the tap threshold
        if (!isPanning && !movedRef.current) {
          registerTap(e.clientX, e.clientY);
        }
      }
    } catch (_) {
      // ignore
    }

    setIsPanning(false);
    panStartRef.current = null;
  pointerStartRef.current = null;
  movedRef.current = false;

    // Dispatch pan end event
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monolog:pan_end'));
      } catch (_) {}
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // If two fingers, start a pinch gesture
    if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const dist = Math.hypot(dx, dy) || 1;
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const midLocalX = midX - rect.left;
      const midLocalY = midY - rect.top;
      pinchRef.current = { initialDistance: dist, initialScale: scaleRef.current, midX, midY, initialMidLocalX: midLocalX, initialMidLocalY: midLocalY };
      // Make sure we aren't in pan mode
      setIsPanning(false);
      panStartRef.current = null;
      // Dispatch zoom start if we're starting from unzoomed
      if (scaleRef.current <= 1) {
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_start')); } catch(_) {}
        // Pinch explicitly activated zoom — allow wheel zoom too
        wheelEnabledRef.current = true;
      }
      // Prevent parent components from receiving touch start when pinching
      e.stopPropagation();
      return;
    }

    // Single-finger pan start only when already zoomed in
    if (scaleRef.current <= 1) return;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      // record touch start to distinguish tap vs drag
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      movedRef.current = false;

      setIsPanning(true);
      panStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        tx: txRef.current,
        ty: tyRef.current
      };
      // Dispatch pan start event
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('monolog:pan_start'));
        } catch (_) {}
      }
      // Prevent parent components from receiving touch start when starting to pan.
      // We do not call preventDefault here because native listeners (attached
      // with passive: false) handle calling preventDefault when necessary.
      e.stopPropagation();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // If pinch in progress (two touches), handle pinch-to-zoom
    if (e.touches.length === 2 && pinchRef.current) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const dist = Math.hypot(dx, dy) || 1;
  const { initialDistance, initialScale, initialMidLocalX, initialMidLocalY } = pinchRef.current;
  const ratio = dist / initialDistance;
  let newScale = Math.max(1, Math.min(maxScale, initialScale * ratio));

  const scaleRatio = newScale / scaleRef.current;
  const newTx = initialMidLocalX - (initialMidLocalX - txRef.current) * scaleRatio;
  const newTy = initialMidLocalY - (initialMidLocalY - tyRef.current) * scaleRatio;

      const bounds = getBounds(newScale);
      const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
      const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

      setScale(newScale);
      setTx(clampedTx);
      setTy(clampedTy);

      // Prevent parent components from receiving swipe gestures when pinching
      e.stopPropagation();
      return;
    }

    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    // mark moved if movement exceeds threshold
    if (touchStartRef.current) {
      const dxStart = touch.clientX - touchStartRef.current.x;
      const dyStart = touch.clientY - touchStartRef.current.y;
      if (!movedRef.current && Math.hypot(dxStart, dyStart) > TAP_MOVE_THRESHOLD) movedRef.current = true;
    }

    if (!isPanning || !panStartRef.current) return;

    const dx = touch.clientX - panStartRef.current.x;
    const dy = touch.clientY - panStartRef.current.y;

    const newTx = panStartRef.current.tx + dx;
    const newTy = panStartRef.current.ty + dy;

    const bounds = getBounds(scaleRef.current);
    const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
    const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

    setTx(clampedTx);
    setTy(clampedTy);

    // Prevent parent components from receiving swipe gestures when panning
    e.stopPropagation();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // If pinch was active and now fewer than 2 touches remain, end pinch
    if (pinchRef.current && e.touches.length < 2) {
      pinchRef.current = null;
      // If we scaled back to 1, dispatch zoom end
      if (scaleRef.current <= 1) {
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_end')); } catch(_) {}
      }
      // fallthrough to clear panning/double-tap handlers when appropriate
    }

  setIsPanning(false);
    panStartRef.current = null;
    // Clear touch start/moved tracking and only register tap if movement small
    const t = (e.changedTouches && e.changedTouches[0]);
    if (t && !movedRef.current) {
      // This will be a tap; register it
      registerTap(t.clientX, t.clientY);
    }
    touchStartRef.current = null;
    movedRef.current = false;

    // Dispatch pan end event
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monolog:pan_end'));
      } catch (_) {}
    }
  };

  // Unified tap/double-tap registration helper to avoid races between
  // pointer and native touch handlers. Uses a timeout ref so we can
  // reliably clear pending timers on unmount and prevent duplicate
  // double-tap invocations.
  const registerTap = (clientX: number, clientY: number) => {
    const now = Date.now();
    // Ignore duplicate events from different event systems (pointer + touch)
    // fired almost simultaneously for a single physical tap.
    if (lastEventTimeRef.current && now - lastEventTimeRef.current < 40) return;
    lastEventTimeRef.current = now;

    if (lastDoubleTapRef.current && now - lastDoubleTapRef.current < 300) {
      // Detected double-tap
      lastDoubleTapRef.current = null;
      if (lastTapTimeoutRef.current) {
        clearTimeout(lastTapTimeoutRef.current as any);
        lastTapTimeoutRef.current = null;
      }
      try {
        handleDoubleTap(clientX, clientY);
      } catch (_) {}
    } else {
      lastDoubleTapRef.current = now;
      if (lastTapTimeoutRef.current) {
        clearTimeout(lastTapTimeoutRef.current as any);
      }
      lastTapTimeoutRef.current = window.setTimeout(() => {
        if (lastDoubleTapRef.current === now) lastDoubleTapRef.current = null;
        lastTapTimeoutRef.current = null;
      }, 310) as any;
    }
  };

  // Attach native touch listeners to allow preventDefault (passive: false)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (ev: TouchEvent) => {
      try {
        // If we're showing the image fullscreen, block the browser's native
        // double-tap-to-zoom by preventing the default on touchstart. Some
        // older mobile browsers ignore touch-action so this guard ensures our
        // double-tap handler runs. Also prevent when two-finger gestures begin.
        if (isFullscreen || (ev.touches && ev.touches.length === 2)) ev.preventDefault();
      } catch (_) {}
      try { handleTouchStart((ev as unknown) as React.TouchEvent); } catch (_) {}
    };

    const onTouchMove = (ev: TouchEvent) => {
      try {
        // Prevent browser scrolling only when pinch/panning/zoom is active.
        // Do NOT prevent simply because we've detected movement (movedRef) —
        // that would block normal page scrolls when the image is unzoomed.
        if (pinchRef.current || isPanning || scaleRef.current > 1) ev.preventDefault();
      } catch (_) {}
      try { handleTouchMove((ev as unknown) as React.TouchEvent); } catch (_) {}
    };

    const onTouchEnd = (ev: TouchEvent) => {
      try { handleTouchEnd((ev as unknown) as React.TouchEvent); } catch (_) {}
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart as any);
      el.removeEventListener('touchmove', onTouchMove as any);
      el.removeEventListener('touchend', onTouchEnd as any);
      // Clear any pending tap timeout to avoid stale timers after unmount
      if (lastTapTimeoutRef.current) {
        clearTimeout(lastTapTimeoutRef.current as any);
        lastTapTimeoutRef.current = null;
      }
    };
  }, [isPanning, isFullscreen]);

  // Add wheel event listener with passive: false to prevent default scrolling
  useEffect(() => {
    const imgElement = imgRef.current;
    if (!imgElement) return;

    const handleWheelEvent = (e: WheelEvent) => {
      // Only allow wheel to initiate zoom if the image is already zoomed or
      // the user explicitly activated zoom (double-click or pinch). This
      // prevents accidental zoom when simply scrolling the page over images.
      if (!wheelEnabledRef.current && scaleRef.current <= 1) return;

      // Allow wheel zoom (in/out) — if zooming out to scale 1 we reset to center
      e.preventDefault();
      e.stopPropagation();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Determine zoom direction and amount
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out on scroll down, zoom in on scroll up
  const newScale = Math.max(1, Math.min(maxScale, scaleRef.current * zoomFactor));

      // If scale didn't change, don't do anything
  if (newScale === scaleRef.current) return;

      // Calculate the point under the mouse cursor
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate new translation to keep the mouse point fixed
  const scaleRatio = newScale / scaleRef.current;
  const newTx = mouseX - (mouseX - txRef.current) * scaleRatio;
  const newTy = mouseY - (mouseY - tyRef.current) * scaleRatio;

      // If zooming out to scale 1, reset to center
      if (newScale === 1) {
        setScale(1);
        setTx(0);
        setTy(0);
        wheelEnabledRef.current = false;
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('monolog:zoom_end'));
          } catch (_) {}
        }
      } else {
        // Clamp to bounds
  const bounds = getBounds(newScale);
  const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
  const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

  setScale(newScale);
  setTx(clampedTx);
  setTy(clampedTy);

        // Dispatch zoom events
        if (scale === 1 && newScale > 1) {
          if (typeof window !== 'undefined') {
            try {
              window.dispatchEvent(new CustomEvent('monolog:zoom_start'));
            } catch (_) {}
          }
        }
      }
    };

    imgElement.addEventListener('wheel', handleWheelEvent, { passive: false });

    return () => {
      imgElement.removeEventListener('wheel', handleWheelEvent);
    };
  }, [scale, tx, ty, maxScale, getBounds]);

  return (
    <div
      ref={containerRef}
      className={`${className ? className + ' ' : ''}monolog-image-zoom`}
      style={{
        overflow: "hidden",
        // inherit parent's border radius so the outer wrapper controls clipping
        borderRadius: 'inherit',
          // When rendered fullscreen we must prevent the browser's native
          // double-tap-to-zoom behavior so our double-tap handler runs on
          // real mobile devices. Otherwise the browser may intercept the
          // second tap and zoom the page instead of sending events to us.
          // For non-fullscreen mode, allow pan-y when unzoomed so the page
          // can still scroll vertically.
          touchAction: "auto",
        display: "block",
        width: "100%",
        height: isFullscreen ? "100%" : (isTile ? "100%" : undefined),
        boxSizing: "border-box",
        ...style,
      }}
    onDragStart={(e) => e.preventDefault()}
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={handlePointerUp}
    /* Native touch listeners are attached in an effect with passive: false so
      we can call preventDefault only when needed (pinch or panning). */
    >
      <img
        {...rest}
        ref={imgRef}
        src={src}
        alt={alt}
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: isPanning ? "none" : "transform 0.2s ease-out",
          display: "block",
          width: isTile ? "100%" : "auto",
          maxWidth: isTile ? undefined : "100%",
          height: isFullscreen ? "100%" : (isTile ? "100%" : "auto"),
          margin: isTile ? undefined : "0 auto",
          objectFit: isFullscreen ? "contain" : (isTile ? "cover" : "contain"),
          objectPosition: "center center",
          userSelect: "none",
          pointerEvents: "auto",
          // remove image rounding so the outer container's border-radius clips the image
          borderRadius: 0,
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          handleDoubleTap(e.clientX, e.clientY);
        }}
        onDragStart={(e) => e.preventDefault()}
        draggable={false}
      />
    </div>
  );
}

export default ImageZoom;
