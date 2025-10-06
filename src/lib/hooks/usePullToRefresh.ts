import { useState, useCallback, useRef, useEffect } from 'react';

interface PullToRefreshOptions {
  threshold?: number;
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
}

interface PullToRefreshState {
  isRefreshing: boolean;
  pullDistance: number;
  isPulling: boolean;
}

export function usePullToRefresh(options: PullToRefreshOptions) {
  const { threshold = 60, onRefresh, disabled = false } = options;

  const [state, setState] = useState<PullToRefreshState>({
    isRefreshing: false,
    pullDistance: 0,
    isPulling: false,
  });

  const startY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastWheelTime = useRef<number>(0);
  const isTriggeringRefresh = useRef<boolean>(false);
  const lastWheelProcessTime = useRef<number>(0);
  const lastRefreshEndTime = useRef<number>(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing) return;

    const touch = e.touches[0];
    startY.current = touch.clientY;
    isDragging.current = true;
  }, [disabled, state.isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing || !isDragging.current) return;

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const pullDistance = Math.max(0, Math.min(currentY - startY.current, threshold * 1.5));

    // Only allow pull-to-refresh when at the top of the scrollable area
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 0) return;

    if (pullDistance > 0) {
      e.preventDefault();
      setState(prev => ({
        ...prev,
        pullDistance,
        isPulling: true,
      }));
    }
  }, [disabled, state.isRefreshing]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (disabled || state.isRefreshing) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 0) return;

    const now = Date.now();
    if (now - lastWheelProcessTime.current < 12) return; // Throttle to prevent too frequent updates
    if (now - lastRefreshEndTime.current < 2000) return; // Cooldown after refresh
    lastWheelProcessTime.current = now;

    lastWheelTime.current = now;

    if (e.deltaY < 0) {  // Scrolling up (pull down gesture)
      e.preventDefault();

      if (isTriggeringRefresh.current) return;

      setState(prev => {
        const increment = Math.min(Math.abs(e.deltaY), 12); // Cap the increment
        const newDistance = Math.min(prev.pullDistance + increment, threshold * 1.5);
        if (newDistance >= threshold && !prev.isRefreshing) {
          isTriggeringRefresh.current = true;
          Promise.resolve(onRefresh()).then(() => {
            setState(prev => ({ ...prev, isRefreshing: false, pullDistance: 0, isPulling: false }));
            isTriggeringRefresh.current = false;
            lastRefreshEndTime.current = Date.now();
          });
          return { ...prev, isRefreshing: true, isPulling: false };
        }
        return { ...prev, pullDistance: newDistance, isPulling: true };
      });
    } else if (e.deltaY > 0 && state.pullDistance > 0) {  // Scrolling down, reset pull distance
      setState(prev => ({ ...prev, pullDistance: 0, isPulling: false }));
    }
  }, [disabled, state.isRefreshing, threshold, onRefresh]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || !isDragging.current) return;

    isDragging.current = false;

    if (state.pullDistance >= threshold && !isTriggeringRefresh.current) {
      isTriggeringRefresh.current = true;
      setState(prev => ({
        ...prev,
        isRefreshing: true,
        isPulling: false,
      }));

      try {
        await onRefresh();
      } finally {
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          pullDistance: 0,
        }));
        isTriggeringRefresh.current = false;
        lastRefreshEndTime.current = Date.now();
      }
    } else {
      setState(prev => ({
        ...prev,
        pullDistance: 0,
        isPulling: false,
      }));
    }
  }, [disabled, state.pullDistance, threshold, onRefresh]);

  useEffect(() => {
    if (disabled) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setState(prev => {
        if (now - lastWheelTime.current > 150 && prev.pullDistance > 0 && !prev.isRefreshing && prev.pullDistance < threshold) {
          return { ...prev, pullDistance: 0, isPulling: false };
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [disabled, threshold]);

  useEffect(() => {
    if (disabled) return;

    const container = containerRef.current;
    if (!container) return;

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('wheel', handleWheel);
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleWheel]);

  const getPullStyles = useCallback(() => {
    if (!state.isPulling && !state.isRefreshing) return {};

    const progress = Math.min(state.pullDistance / threshold, 1);
    const translateY = state.isRefreshing ? threshold : state.pullDistance * 0.4;

    return {
      transform: `translateY(${translateY}px)`,
      transition: state.isRefreshing ? 'transform 0.2s ease-out' : 'none',
    };
  }, [state, threshold]);

  return {
    ...state,
    containerRef,
    getPullStyles,
  };
}