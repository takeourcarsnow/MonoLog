import { useState, useCallback, useRef, useEffect } from 'react';

interface PullToRefreshOptions {
  threshold?: number;
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
}

export function usePullToRefresh(options: PullToRefreshOptions) {
  const { threshold = 60, onRefresh, disabled = false } = options;

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const startY = useRef(0);
  const startX = useRef(0);
  const isDragging = useRef(false);
  const isHorizontalSwipe = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;

    // Don't start pull-to-refresh if the user is not at the top of the nearest scrollable container
    const getScrollableAncestor = (node: EventTarget | null): Element | null => {
      let el = node instanceof Element ? node : (node && (node as any).parentElement) || null;
      while (el && el !== document.documentElement && el !== document.body) {
        try {
          const style = getComputedStyle(el);
          const overflowY = style.overflowY;
          const isScrollable = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && el.scrollHeight > el.clientHeight;
          if (isScrollable) return el;
        } catch (err) {
          // ignore cross-origin or other errors
        }
        el = el.parentElement;
      }
      // fallback to the scrolling element (document) when no inner scrollable ancestor
      return document.scrollingElement || document.documentElement;
    };

    const startTarget = e.target;
    const scrollable = getScrollableAncestor(startTarget);
    if (scrollable) {
      // If the scrollable ancestor isn't at the very top, don't enable pull-to-refresh
      const ancestorScrollTop = (scrollable as Element & { scrollTop?: number }).scrollTop || 0;
      if (ancestorScrollTop > 0) return;
    }

    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
    isHorizontalSwipe.current = false;
    isDragging.current = true;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || !isDragging.current) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - startY.current;
    const deltaX = touch.clientX - startX.current;

    // If the user is swiping horizontally (e.g. to change sections), disable pull-to-refresh
    if (!isHorizontalSwipe.current) {
      const HORIZONTAL_SWIPE_THRESHOLD = 10; // px
      if (Math.abs(deltaX) > HORIZONTAL_SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
        isHorizontalSwipe.current = true;
        isDragging.current = false;
        setIsPulling(false);
        setPullDistance(0);
        return;
      }
    }

    if (deltaY > 0) {
      if (e.cancelable) e.preventDefault();
      setPullDistance(Math.min(deltaY, threshold * 2));
      setIsPulling(true);
    }
  }, [disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current && !isHorizontalSwipe.current) return;
    isDragging.current = false;
    isHorizontalSwipe.current = false;

    const shouldRefresh = pullDistance >= threshold;
    setIsPulling(false);

    if (shouldRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh]);

  useEffect(() => {
    if (disabled) return;

    const options = { passive: false };
    window.addEventListener('touchstart', handleTouchStart, options);
    window.addEventListener('touchmove', handleTouchMove, options);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const getPullStyles = useCallback(() => {
    if (!isPulling && !isRefreshing) return {};

    const translateY = isPulling ? pullDistance * 0.5 : 0;
    return {
      transform: `translateY(${translateY}px)`,
      transition: isRefreshing ? 'transform 0.3s ease-out' : 'none',
    };
  }, [isPulling, isRefreshing, pullDistance]);

  return {
    isRefreshing,
    pullDistance,
    isPulling,
    containerRef,
    getPullStyles,
  };
}

