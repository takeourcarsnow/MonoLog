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
  const { threshold = 80, onRefresh, disabled = false } = options;

  const [state, setState] = useState<PullToRefreshState>({
    isRefreshing: false,
    pullDistance: 0,
    isPulling: false,
  });

  const startY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    const pullDistance = Math.max(0, currentY - startY.current);

    // Only allow pull-to-refresh when at the top of the scrollable area
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 10) return;

    if (pullDistance > 0) {
      e.preventDefault();
      setState(prev => ({
        ...prev,
        pullDistance,
        isPulling: true,
      }));
    }
  }, [disabled, state.isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || !isDragging.current) return;

    isDragging.current = false;

    if (state.pullDistance >= threshold) {
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
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const getPullStyles = useCallback(() => {
    if (!state.isPulling && !state.isRefreshing) return {};

    const progress = Math.min(state.pullDistance / threshold, 1);
    const translateY = state.isRefreshing ? threshold : state.pullDistance * 0.5;

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