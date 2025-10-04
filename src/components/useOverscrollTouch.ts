import { useRef } from 'react';
import { useOverscrollUtils } from './useOverscrollUtils';

export function useOverscrollTouch() {
  const { getScrollContainer, findFeedContainer, isInFeedOrExplore } = useOverscrollUtils();

  const startY = useRef(0);
  const startX = useRef(0);
  const currentTransform = useRef(0);
  const isOverscrolling = useRef(false);
  const isHorizontal = useRef(false);
  const hasMoved = useRef(false);
  const rafId = useRef<number | null>(null);
  const targetFeed = useRef<HTMLElement | null>(null);

  // Tunable constants to control feel and reduce jitter/intensity
  const TOUCH_MOVE_THRESHOLD = 8; // px - ignore tiny movements to avoid jitter
  const HORIZONTAL_MOVE_THRESHOLD = 8; // px - minimum horizontal movement to consider a horizontal swipe
  const TOUCH_MAX_STRETCH = 32; // px - reduced max stretch for a more natural limit

  const resetTransform = () => {
    if (targetFeed.current && rafId.current) {
      cancelAnimationFrame(rafId.current);
      targetFeed.current.style.transform = 'translateY(0)';
      targetFeed.current.style.transition = '';
    }
    isOverscrolling.current = false;
    currentTransform.current = 0;
  };

  const handleTouchStart = (e: TouchEvent) => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;

    // Only proceed if touch is in feed or explore
    if (!isInFeedOrExplore(e.target)) {
      targetFeed.current = null;
      return;
    }

    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
    isHorizontal.current = false;
    hasMoved.current = false;
    targetFeed.current = findFeedContainer(e.target);
    currentTransform.current = 0;
  };

  const handleTouchMove = (e: TouchEvent) => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer || !targetFeed.current) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - startY.current;
    const deltaX = touch.clientX - startX.current;

    // Determine gesture direction on first meaningful move
    if (!hasMoved.current) {
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > HORIZONTAL_MOVE_THRESHOLD) {
        isHorizontal.current = true;
      }
      hasMoved.current = true;
    }

    // If this gesture is primarily horizontal, don't trigger vertical overscroll
    if (isHorizontal.current) return;

    // Minimum movement threshold to prevent jitter
    if (Math.abs(deltaY) < TOUCH_MOVE_THRESHOLD) return;

    const scrollTop = scrollContainer.scrollTop;
    const scrollHeight = scrollContainer.scrollHeight;
    const clientHeight = scrollContainer.clientHeight;
    const isAtTop = scrollTop <= 1;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

    // Apply overscroll effect at top (pulling down)
    if (isAtTop && deltaY > 0) {
      isOverscrolling.current = true;

      // Exponential resistance curve: small pulls feel direct, larger pulls
      // increasingly resist and asymptote to a soft max.
      const maxStretch = TOUCH_MAX_STRETCH;
      const curveFactor = 0.03; // tuning factor for exponential curve
      const v = 1 - Math.exp(-deltaY * curveFactor);
      const transform = Math.min(v * maxStretch, maxStretch);
      currentTransform.current = transform;

      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        targetFeed.current!.style.transform = `translateY(${transform}px)`;
        targetFeed.current!.style.transition = 'none';
      });

      // Prevent default scroll behavior only when overscrolling
      if (e.cancelable && !isHorizontal.current) e.preventDefault();
    }
    // Apply overscroll effect at bottom (pulling up)
    else if (isAtBottom && deltaY < 0) {
      isOverscrolling.current = true;

      const maxStretch = TOUCH_MAX_STRETCH;
      const curveFactor = 0.03;
      const v = 1 - Math.exp(-Math.abs(deltaY) * curveFactor);
      const transform = -Math.min(v * maxStretch, maxStretch);
      currentTransform.current = transform;

      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        targetFeed.current!.style.transform = `translateY(${transform}px)`;
        targetFeed.current!.style.transition = 'none';
      });

      // Prevent default scroll behavior only when overscrolling
      if (e.cancelable && !isHorizontal.current) e.preventDefault();
    } else {
      // Not at edge, allow normal scrolling
      if (isOverscrolling.current) {
        resetTransform();
      }
    }
  };

  const handleTouchEnd = () => {
    if (isOverscrolling.current && targetFeed.current) {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (targetFeed.current.style.transition === '') {
        targetFeed.current.style.transition = '';
      }
      // give a small initial velocity based on current transform
      const wheelState = { vel: -currentTransform.current * 0.12 };
      startWheelBounce(targetFeed.current, wheelState);
    }

    // Reset state
    isOverscrolling.current = false; // preserved until spring completes
    targetFeed.current = null;
    startY.current = 0;
    startX.current = 0;
    isHorizontal.current = false;
    hasMoved.current = false;
  };

  // Helper function for bounce animation (shared with wheel)
  const startWheelBounce = (feed: HTMLElement, wheelState: { vel: number }) => {
    let bounceRaf: number | null = null;
    const stiffness = 0.12; // spring stiffness
    const damping = 0.9; // damping factor [0..1]

    const step = () => {
      // spring force toward 0
      const force = -currentTransform.current * stiffness;
      wheelState.vel = (wheelState.vel + force) * damping;
      currentTransform.current += wheelState.vel;

      // apply transform
      feed.style.transform = `translateY(${currentTransform.current}px)`;
      feed.style.transition = 'none';

      // stop when sufficiently small to avoid micro-jitter
      if (Math.abs(currentTransform.current) < 0.6 && Math.abs(wheelState.vel) < 0.6) {
        feed.style.transform = '';
        feed.style.transition = '';
        currentTransform.current = 0;
        wheelState.vel = 0;
        bounceRaf = null;
        isOverscrolling.current = false;
        return;
      }

      bounceRaf = requestAnimationFrame(step);
    };

    bounceRaf = requestAnimationFrame(step);
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetTransform,
    targetFeed: targetFeed.current,
    isOverscrolling: isOverscrolling.current
  };
}