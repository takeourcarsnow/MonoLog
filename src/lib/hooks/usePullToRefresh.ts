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
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || !isDragging.current) return;

    const deltaY = e.touches[0].clientY - startY.current;
    if (deltaY > 0) {
      if (e.cancelable) e.preventDefault();
      setPullDistance(Math.min(deltaY, threshold * 2));
      setIsPulling(true);
    }
  }, [disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;
    isDragging.current = false;

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

