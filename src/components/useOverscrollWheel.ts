import { useRef } from 'react';
import { useOverscrollUtils, shouldProcessOverscroll } from './useOverscrollUtils';

export function useOverscrollWheel() {
  const { getScrollContainer, findFeedContainer } = useOverscrollUtils();

  const currentTransform = useRef(0);
  const isOverscrolling = useRef(false);
  const rafId = useRef<number | null>(null);
  const targetFeed = useRef<HTMLElement | null>(null);
  const bounceTimeout = useRef<number | null>(null);
  const wheelBounceRaf = useRef<number | null>(null);
  const wheelLastEvent = useRef(0);

  // Wheel/trackpad tuning - make trackpad/mousewheel more noticeable but still soft
  const WHEEL_MAX = 28; // px max transform for wheel overscroll (closer to touch)
  const WHEEL_FACTOR = 100; // smaller factor -> more sensitivity to delta (touchpad-friendly)
  const WHEEL_DELTA_IGNORE = 60; // ignore very large single-wheel deltas (likely mouse wheel)
  const WHEEL_STIFFNESS = 0.12; // spring stiffness for wheel bounce (gentle spring)
  const WHEEL_DAMPING = 0.9; // damping factor to reduce jitter

  const wheelState = useRef({
    vel: 0,
    picking: false,
  });

  const startWheelBounce = (feed: HTMLElement) => {
    if (wheelBounceRaf.current) cancelAnimationFrame(wheelBounceRaf.current);
    // If the pull is very small, prefer a simple CSS ease-out to settle
    // — this avoids micromovements caused by the spring.
    if (Math.abs(currentTransform.current) < 10) {
      try {
        feed.style.transition = 'transform 280ms cubic-bezier(0.2,0.8,0.2,1)';
        feed.style.transform = '';
      } catch (_) {}
      currentTransform.current = 0;
      wheelState.current.vel = 0;
      wheelBounceRaf.current = null;
      isOverscrolling.current = false;
      return;
    }

    const stiffness = WHEEL_STIFFNESS; // spring stiffness
    const damping = WHEEL_DAMPING; // damping factor

    const step = () => {
      // spring force toward 0
      const force = -currentTransform.current * stiffness;
      wheelState.current.vel = (wheelState.current.vel + force) * damping;
      currentTransform.current += wheelState.current.vel;

      // apply transform
      feed.style.transform = `translateY(${currentTransform.current}px)`;
      feed.style.transition = 'none';

      // stop when sufficiently small to avoid micro-jitter
      if (Math.abs(currentTransform.current) < 0.6 && Math.abs(wheelState.current.vel) < 0.6) {
        feed.style.transform = '';
        feed.style.transition = '';
        currentTransform.current = 0;
        wheelState.current.vel = 0;
        wheelBounceRaf.current = null;
        isOverscrolling.current = false;
        return;
      }

      wheelBounceRaf.current = requestAnimationFrame(step);
    };

    wheelBounceRaf.current = requestAnimationFrame(step);
  };

  const handleWheel = (e: WheelEvent) => {
    // ignore wheel events while we're inhibiting (during an active snap)
    const nowCheck = performance.now();
    const inhibitUntil = (handleWheel as any).inhibitUntil || 0;
    if (nowCheck < inhibitUntil) return;

    if (!shouldProcessOverscroll()) return;

    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;

    // Reset any lingering transform at the start of wheel interaction
    if (targetFeed.current && isOverscrolling.current) {
      targetFeed.current.style.transform = '';
      targetFeed.current.style.transition = '';
      currentTransform.current = 0;
      isOverscrolling.current = false;
      if (bounceTimeout.current) clearTimeout(bounceTimeout.current);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (wheelBounceRaf.current) cancelAnimationFrame(wheelBounceRaf.current);
    }

    // Find feed container
    let feed = findFeedContainer(e.target as EventTarget);
    if (!feed) {
      try {
        feed = document.querySelector<HTMLElement>('.swiper-slide-active .feed') || document.querySelector<HTMLElement>('.feed');
      } catch (err) { feed = null; }
    }
    if (!feed) return;
    targetFeed.current = feed;

    const scrollTop = scrollContainer.scrollTop;
    const scrollHeight = scrollContainer.scrollHeight;
    const clientHeight = scrollContainer.clientHeight;
    const isAtTop = scrollTop <= 1;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

    // Use deltaY directly (no sign flip). Small deltas from touchpad will
    // naturally produce smaller velocity.
    const delta = e.deltaY;

    // Only start overscroll if at an edge and movement pushes beyond it
    if ((isAtTop && delta < 0) || (isAtBottom && delta > 0)) {
      // mark overscrolling and cancel any CSS bounce
      isOverscrolling.current = true;
      if (wheelBounceRaf.current) { cancelAnimationFrame(wheelBounceRaf.current); wheelBounceRaf.current = null; }

      // Map delta to transform with progressive resistance
      const map = (d: number) => {
        const abs = Math.abs(d);
        const sign = d > 0 ? -1 : 1; // wheel delta positive means scroll down
        const max = WHEEL_MAX; // max stretch for wheel
        const factor = WHEEL_FACTOR; // factor -> sensitivity
        // For large discrete mouse-wheel deltas, return a small fixed step
        if (abs > WHEEL_DELTA_IGNORE) {
          const step = Math.min(12, Math.floor(max * 0.7));
          return sign * step;
        }
        // resistance curve for touchpad: transform = sign * (1 - exp(-|d|/factor)) * max
        const v = 1 - Math.exp(-abs / factor);
        return sign * v * max;
      };

      // momentum detection: count wheel events in short succession and
      // reduce contributions when deltas decay (typical of inertial scrolling)
      const now = performance.now();
      // Reset quick counter if gap between events is large
      if (!('wheelEventsCount' in handleWheel) || (now - (handleWheel as any).lastWheelTime > 120)) {
        (handleWheel as any).wheelEventsCount = 0;
        (handleWheel as any).lastWheelDelta = 0;
      }
      (handleWheel as any).wheelEventsCount = ((handleWheel as any).wheelEventsCount || 0) + 1;

      const mappedBase = map(delta);
      let mapped = mappedBase;

      // If this looks like a large discrete mouse-wheel event, treat it as
      // an immediate step so mousewheel users see a visible rubberband.
      const isMouseWheelLarge = Math.abs(delta) > WHEEL_DELTA_IGNORE;
      if (isMouseWheelLarge) {
        // immediate accumulation for discrete wheel steps
        currentTransform.current += mapped;
        // clamp
        if (currentTransform.current > WHEEL_MAX) currentTransform.current = WHEEL_MAX;
        if (currentTransform.current < -WHEEL_MAX) currentTransform.current = -WHEEL_MAX;

        // reset short-term wheel tracking to avoid treating this as momentum
        (handleWheel as any).shrinkStreak = 0;
        (handleWheel as any).wheelEventsCount = 0;
        (handleWheel as any).lastWheelDelta = delta;
        (handleWheel as any).lastWheelTime = now;

        wheelState.current.vel = 0; // reset velocity while actively moving
        if (rafId.current) cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(() => {
          feed.style.transform = `translateY(${currentTransform.current}px)`;
          feed.style.transition = 'none';
        });

        if (e.cancelable) e.preventDefault();

        if (bounceTimeout.current) clearTimeout(bounceTimeout.current);
        bounceTimeout.current = window.setTimeout(() => {
          wheelState.current.vel = -currentTransform.current * 0.12;
          startWheelBounce(feed);
        }, 80) as unknown as number;

        return;
      }

      // Track shrink streak: if deltas shrink repeatedly it's likely
      // inertial momentum rather than active user input.
      if (!(handleWheel as any).shrinkStreak) (handleWheel as any).shrinkStreak = 0;
      if ((handleWheel as any).lastWheelDelta && Math.abs(delta) < Math.abs((handleWheel as any).lastWheelDelta)) {
        (handleWheel as any).shrinkStreak++;
      } else {
        (handleWheel as any).shrinkStreak = 0;
      }

      // If we detect a shrinking streak, suppress further accumulation
      // to avoid the overscroll growing through momentum.
      if ((handleWheel as any).shrinkStreak >= 3) {
        // enter momentum phase
        (handleWheel as any).momentumPhase = true;
        mapped = 0;

        // Immediately trigger a decisive bounce so the overscroll doesn't
        // continue growing during inertial decay. Use a slightly larger
        // kick for a crisp snap.
        try {
          if (bounceTimeout.current) clearTimeout(bounceTimeout.current);
          // Use a short CSS transition to snap back quickly and crisply
          try {
            feed.style.transition = 'transform 220ms cubic-bezier(0.22,1,0.36,1)';
            feed.style.transform = '';
          } catch (_e) {}
          // clear values
          currentTransform.current = 0;
          wheelState.current.vel = 0;
          if (wheelBounceRaf.current) { cancelAnimationFrame(wheelBounceRaf.current); wheelBounceRaf.current = null; }
          // reset wheel tracking so future sequences start fresh
          (handleWheel as any).wheelEventsCount = 0;
          (handleWheel as any).lastWheelDelta = 0;
          (handleWheel as any).shrinkStreak = 0;
          (handleWheel as any).momentumPhase = false;
          // inhibit wheel processing for the duration of the CSS snap
          try { (handleWheel as any).inhibitUntil = performance.now() + 260; } catch (_) {}
        } catch (_) {}

        return;
      } else {
        // If deltas are shrinking compared to last, reduce contribution
        if ((handleWheel as any).lastWheelDelta && Math.abs(delta) < Math.abs((handleWheel as any).lastWheelDelta)) {
          mapped *= 0.5;
        }

        // After several events, treat remaining as momentum and heavily reduce
        if ((handleWheel as any).wheelEventsCount > 6) mapped *= 0.25;
      }

      // Accumulate with a smooth lerp so touchpad sequences build up naturally
      const target = (currentTransform.current + mapped);
      currentTransform.current = currentTransform.current + (target - currentTransform.current) * 0.5;

      // Clamp to max to avoid runaway growth during long inertia
      if (currentTransform.current > WHEEL_MAX) currentTransform.current = WHEEL_MAX;
      if (currentTransform.current < -WHEEL_MAX) currentTransform.current = -WHEEL_MAX;

      (handleWheel as any).lastWheelDelta = delta;
      (handleWheel as any).lastWheelTime = now;
      wheelState.current.vel = 0; // reset velocity while actively moving

      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        feed.style.transform = `translateY(${currentTransform.current}px)`;
        feed.style.transition = 'none';
      });

      if (e.cancelable) e.preventDefault();

      // schedule spring bounce after events stop
      if (bounceTimeout.current) clearTimeout(bounceTimeout.current);
      // If we detected many small events (momentum), start bounce sooner
      const cnt = (handleWheel as any).wheelEventsCount || 0;
      const momentumPhase = !!(handleWheel as any).momentumPhase;
      const delay = momentumPhase ? 20 : (cnt > 6 ? 40 : 80);
      bounceTimeout.current = window.setTimeout(() => {
        // start with a velocity based on last delta to feel natural
        wheelState.current.vel = -currentTransform.current * 0.12; // initial kick toward 0
        startWheelBounce(feed);
      }, delay) as unknown as number;
    } else {
      // If not overscrolling but we were, settle back
      if (isOverscrolling.current && targetFeed.current) {
        if (bounceTimeout.current) clearTimeout(bounceTimeout.current);
        startWheelBounce(targetFeed.current);
      }
    }
  };

  return {
    handleWheel,
    targetFeed: targetFeed.current,
    isOverscrolling: isOverscrolling.current
  };
}