import { useRef } from 'react';
import { useOverscrollUtils, shouldProcessOverscroll } from './useOverscrollUtils';

export function useOverscrollPointer() {
  const { getScrollContainer, findFeedContainer, isInFeedOrExplore } = useOverscrollUtils();

  const currentTransform = useRef(0);
  const isOverscrolling = useRef(false);
  const rafId = useRef<number | null>(null);
  const targetFeed = useRef<HTMLElement | null>(null);
  const bounceTimeout = useRef<number | null>(null);

  // Pointer drag state for mouse dragging
  const pointerActive = useRef(false);
  const pointerStartY = useRef(0);

  const POINTER_MOVE_THRESHOLD = 6; // px
  const TOUCH_MAX_STRETCH = 32; // px

  const handlePointerDown = (e: PointerEvent) => {
    if (!shouldProcessOverscroll()) return;
    // Only left button drags
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!isInFeedOrExplore(e.target)) return;

    // Reset any lingering transform
    if (targetFeed.current) {
      targetFeed.current.style.transform = '';
      targetFeed.current.style.transition = '';
      currentTransform.current = 0;
      isOverscrolling.current = false;
    }

    pointerActive.current = true;
    pointerStartY.current = e.clientY;
    // capture targetFeed for this pointer interaction
    if (!targetFeed.current) {
      let feed = findFeedContainer(e.target as EventTarget);
      if (!feed) {
        try { feed = document.querySelector<HTMLElement>('.swiper-slide-active .feed') || document.querySelector<HTMLElement>('.feed'); } catch (err) { feed = null; }
      }
      targetFeed.current = feed;
    }
    try { (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId); } catch (_) {}
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!pointerActive.current || !targetFeed.current) return;
    // Only respond to primary button or touch pen
    if (e.pointerType === 'mouse' && (e.buttons & 1) === 0) return;

    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;
    const deltaY = e.clientY - pointerStartY.current;
    if (Math.abs(deltaY) < POINTER_MOVE_THRESHOLD) return;

    const scrollTop = scrollContainer.scrollTop;
    const scrollHeight = scrollContainer.scrollHeight;
    const clientHeight = scrollContainer.clientHeight;
    const isAtTop = scrollTop <= 1;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

    const maxStretch = TOUCH_MAX_STRETCH;

    if (isAtTop && deltaY > 0) {
      isOverscrolling.current = true;
      const curveFactor = 0.03;
      const v = 1 - Math.exp(-deltaY * curveFactor);
      currentTransform.current = Math.min(v * maxStretch, maxStretch);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        targetFeed.current!.style.transform = `translateY(${currentTransform.current}px)`;
        targetFeed.current!.style.transition = 'none';
      });
      e.preventDefault?.();
    } else if (isAtBottom && deltaY < 0) {
      isOverscrolling.current = true;
      const curveFactor = 0.03;
      const v = 1 - Math.exp(-Math.abs(deltaY) * curveFactor);
      currentTransform.current = -Math.min(v * maxStretch, maxStretch);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        targetFeed.current!.style.transform = `translateY(${currentTransform.current}px)`;
        targetFeed.current!.style.transition = 'none';
      });
      e.preventDefault?.();
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!pointerActive.current) return;
    pointerActive.current = false;
    try { (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId); } catch (_) {}
    // bounce back if needed using the same spring as wheel
    if (isOverscrolling.current && targetFeed.current) {
      if (bounceTimeout.current) clearTimeout(bounceTimeout.current);
      try { targetFeed.current.style.transition = ''; } catch (_) {}
      // give a small initial velocity based on current transform
      const wheelState = { vel: -currentTransform.current * 0.12 };
      startWheelBounce(targetFeed.current, wheelState);
    }
  };

  // Helper function for bounce animation (shared with touch)
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
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    targetFeed: targetFeed.current,
    isOverscrolling: isOverscrolling.current
  };
}