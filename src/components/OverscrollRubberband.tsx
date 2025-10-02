'use client';

import { useEffect } from 'react';

/**
 * OverscrollRubberband component - Rebuilt from scratch
 * Adds iOS-style rubber band effect ONLY to feed and explore content areas
 * Does NOT affect navbar, header, or horizontal swiping between views
 */
export function OverscrollRubberband() {
  useEffect(() => {
  // State variables
  let startY = 0;
  let currentTransform = 0;
  let isOverscrolling = false;
  let rafId: number | null = null;
  let targetFeed: HTMLElement | null = null;
  // Wheel accumulation for desktop trackpad/mouse wheel
  let bounceTimeout: number | null = null;
  // RAF id for wheel bounce animation
  let wheelBounceRaf: number | null = null;
  let wheelLastEvent = 0;
  // Pointer drag state for mouse dragging
  let pointerActive = false;
  let pointerStartY = 0;
  // Tunable constants to control feel and reduce jitter/intensity
  const TOUCH_MOVE_THRESHOLD = 8; // px - ignore tiny movements to avoid jitter
  const POINTER_MOVE_THRESHOLD = 6; // px
  // Reduced sensitivity and smaller max stretch for a subtler feel
  const TOUCH_RESISTANCE = 0.12; // smaller -> less stretch (kept for any fallback)
  const TOUCH_MAX_STRETCH = 32; // px - reduced max stretch for a more natural limit

  // Wheel/trackpad tuning - make trackpad/mousewheel more noticeable but still soft
  const WHEEL_MAX = 28; // px max transform for wheel overscroll (closer to touch)
  const WHEEL_FACTOR = 100; // smaller factor -> more sensitivity to delta (touchpad-friendly)
  const WHEEL_DELTA_IGNORE = 60; // ignore very large single-wheel deltas (likely mouse wheel)
  const WHEEL_STIFFNESS = 0.12; // spring stiffness for wheel bounce (gentle spring)
  const WHEEL_DAMPING = 0.9; // damping factor to reduce jitter

    // Get the scrollable root container
    const getScrollContainer = () => {
      if (typeof document === 'undefined') return null;
      return document.getElementById('app-root') as HTMLElement | null;
    };

    // Find the .feed container that should be transformed.
    // Look upward for a .feed ancestor; if not found, look for the enclosing
    // .swiper-slide and query a .feed inside it (covers Explore where the
    // .feed is a child of the slide rather than an ancestor of the event target).
    const findFeedContainer = (target: EventTarget | null): HTMLElement | null => {
      if (!target || !(target instanceof Element)) return null;

      // Prefer a closest ancestor that is itself the feed container
      const direct = target.closest('.feed');
      if (direct && direct instanceof HTMLElement) return direct;

      // Otherwise, find the nearest swiper slide and query a .feed inside it
      const slide = target.closest('.swiper-slide');
      if (slide && slide instanceof HTMLElement) {
        const inner = slide.querySelector<HTMLElement>('.feed');
        if (inner) return inner;
        // in some cases the slide itself may be the feed
        if (slide.classList.contains('feed')) return slide;
      }

      // Fallback: if the event target is the scroll container (or something else),
      // try the currently active slide (Swiper adds .swiper-slide-active to it)
      try {
        const active = document.querySelector<HTMLElement>('.swiper-slide-active');
        if (active) {
          const innerActive = active.querySelector<HTMLElement>('.feed');
          if (innerActive) return innerActive;
          if (active.classList.contains('feed')) return active;
        }
      } catch (e) { /* ignore */ }

      return null;
    };

    // Check if target should get the rubberband effect
    // Originally this was limited to feed/explore. We now also allow the About page
    // by checking for the .about-card wrapper so the About page can be pulled.
    const isInFeedOrExplore = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof Element)) return false;

      // About page wrapper (explicit opt-in for rubberband)
      if (target instanceof Element && target.closest('.about-card')) return true;

      // If we can find a feed container near the target, it's in feed/explore
      if (findFeedContainer(target)) return true;

      // Also allow detection if the target is inside the slide that corresponds
      // to feed or explore. Look for nearest swiper-slide and inspect its index
      const slide = target instanceof Element ? target.closest('.swiper-slide') : null;
      if (slide && slide.parentElement?.classList.contains('swiper-wrapper')) {
        const slides = Array.from(slide.parentElement.children);
        const idx = slides.indexOf(slide);
        // views order in AppShell: 0 = feed, 1 = explore
        if (idx === 0 || idx === 1) return true;
      }

      return false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      const scrollContainer = getScrollContainer();
      if (!scrollContainer) return;

      // Only proceed if touch is in feed or explore
      if (!isInFeedOrExplore(e.target)) {
        targetFeed = null;
        return;
      }

      startY = e.touches[0].clientY;
      targetFeed = findFeedContainer(e.target);
      currentTransform = 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const scrollContainer = getScrollContainer();
      if (!scrollContainer || !targetFeed) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - startY;
      
  // Minimum movement threshold to prevent jitter
  if (Math.abs(deltaY) < TOUCH_MOVE_THRESHOLD) return;

      const scrollTop = scrollContainer.scrollTop;
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = scrollContainer.clientHeight;
      const isAtTop = scrollTop <= 1;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      // Apply overscroll effect at top (pulling down)
      if (isAtTop && deltaY > 0) {
        isOverscrolling = true;

        // Exponential resistance curve: small pulls feel direct, larger pulls
        // increasingly resist and asymptote to a soft max.
        const maxStretch = TOUCH_MAX_STRETCH;
        const curveFactor = 0.03; // tuning factor for exponential curve
        const v = 1 - Math.exp(-deltaY * curveFactor);
        const transform = Math.min(v * maxStretch, maxStretch);
        currentTransform = transform;

        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          targetFeed!.style.transform = `translateY(${transform}px)`;
          targetFeed!.style.transition = 'none';
        });

        // Prevent default scroll behavior only when overscrolling
        if (e.cancelable) e.preventDefault();
      }
      // Apply overscroll effect at bottom (pulling up)
      else if (isAtBottom && deltaY < 0) {
        isOverscrolling = true;

        const maxStretch = TOUCH_MAX_STRETCH;
        const curveFactor = 0.03;
        const v = 1 - Math.exp(-Math.abs(deltaY) * curveFactor);
        const transform = -Math.min(v * maxStretch, maxStretch);
        currentTransform = transform;

        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          targetFeed!.style.transform = `translateY(${transform}px)`;
          targetFeed!.style.transition = 'none';
        });

        // Prevent default scroll behavior only when overscrolling
        if (e.cancelable) e.preventDefault();
      } else {
        // Not at edge, allow normal scrolling
        if (isOverscrolling) {
          resetTransform();
        }
      }
    };

  // Desktop: wheel/trackpad handler
    // A smoother wheel handler: accumulate a small velocity from deltaY and
    // drive transform with a spring (RAF) to emulate mobile momentum but
    // without the sticky momentum issues of native mouse wheel.
    const wheelState = {
      vel: 0,
      picking: false,
    };

    const startWheelBounce = (feed: HTMLElement) => {
      if (wheelBounceRaf) cancelAnimationFrame(wheelBounceRaf);
      // If the pull is very small, prefer a simple CSS ease-out to settle
      // — this avoids micromovements caused by the spring.
      if (Math.abs(currentTransform) < 10) {
        try {
          feed.style.transition = 'transform 280ms cubic-bezier(0.2,0.8,0.2,1)';
          feed.style.transform = '';
        } catch (_) {}
        currentTransform = 0;
        wheelState.vel = 0;
        wheelBounceRaf = null;
        isOverscrolling = false;
        return;
      }

      const stiffness = WHEEL_STIFFNESS; // spring stiffness
      const damping = WHEEL_DAMPING; // damping factor [0..1]

      const step = () => {
        // spring force toward 0
        const force = -currentTransform * stiffness;
        wheelState.vel = (wheelState.vel + force) * damping;
        currentTransform += wheelState.vel;

        // apply transform
        feed.style.transform = `translateY(${currentTransform}px)`;
        feed.style.transition = 'none';

        // stop when sufficiently small to avoid micro-jitter
        if (Math.abs(currentTransform) < 0.6 && Math.abs(wheelState.vel) < 0.6) {
          feed.style.transform = '';
          feed.style.transition = '';
          currentTransform = 0;
          wheelState.vel = 0;
          wheelBounceRaf = null;
          isOverscrolling = false;
          // clear momentum tracking so future wheel events behave normally
          try {
            (handleWheel as any).momentumPhase = false;
            (handleWheel as any).shrinkStreak = 0;
            (handleWheel as any).wheelEventsCount = 0;
            (handleWheel as any).lastWheelDelta = 0;
            (handleWheel as any).lastWheelTime = 0;
          } catch (_) {}
          return;
        }

        wheelBounceRaf = requestAnimationFrame(step);
      };

      wheelBounceRaf = requestAnimationFrame(step);
    };

    const handleWheel = (e: WheelEvent) => {
      // ignore wheel events while we're inhibiting (during an active snap)
      const nowCheck = performance.now();
      const inhibitUntil = (handleWheel as any).inhibitUntil || 0;
      if (nowCheck < inhibitUntil) return;

      const scrollContainer = getScrollContainer();
      if (!scrollContainer) return;

      // Find feed container
      let feed = findFeedContainer(e.target as EventTarget);
      if (!feed) {
        try {
          feed = document.querySelector<HTMLElement>('.swiper-slide-active .feed') || document.querySelector<HTMLElement>('.feed');
        } catch (err) { feed = null; }
      }
      if (!feed) return;
      targetFeed = feed;

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
        isOverscrolling = true;
        if (wheelBounceRaf) { cancelAnimationFrame(wheelBounceRaf); wheelBounceRaf = null; }

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
              currentTransform += mapped;
              // clamp
              if (currentTransform > WHEEL_MAX) currentTransform = WHEEL_MAX;
              if (currentTransform < -WHEEL_MAX) currentTransform = -WHEEL_MAX;

              // reset short-term wheel tracking to avoid treating this as momentum
              (handleWheel as any).shrinkStreak = 0;
              (handleWheel as any).wheelEventsCount = 0;
              (handleWheel as any).lastWheelDelta = delta;
              (handleWheel as any).lastWheelTime = now;

              wheelState.vel = 0; // reset velocity while actively moving
              if (rafId) cancelAnimationFrame(rafId);
              rafId = requestAnimationFrame(() => {
                feed.style.transform = `translateY(${currentTransform}px)`;
                feed.style.transition = 'none';
              });

              if (e.cancelable) e.preventDefault();

              if (bounceTimeout) clearTimeout(bounceTimeout);
              bounceTimeout = window.setTimeout(() => {
                wheelState.vel = -currentTransform * 0.12;
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
                if (bounceTimeout) clearTimeout(bounceTimeout);
                // Use a short CSS transition to snap back quickly and crisply
                try {
                  feed.style.transition = 'transform 220ms cubic-bezier(0.22,1,0.36,1)';
                  feed.style.transform = '';
                } catch (_e) {}
                // clear values
                currentTransform = 0;
                wheelState.vel = 0;
                if (wheelBounceRaf) { cancelAnimationFrame(wheelBounceRaf); wheelBounceRaf = null; }
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
            const target = (currentTransform + mapped);
            currentTransform = currentTransform + (target - currentTransform) * 0.5;

            // Clamp to max to avoid runaway growth during long inertia
            if (currentTransform > WHEEL_MAX) currentTransform = WHEEL_MAX;
            if (currentTransform < -WHEEL_MAX) currentTransform = -WHEEL_MAX;

            (handleWheel as any).lastWheelDelta = delta;
            (handleWheel as any).lastWheelTime = now;
        wheelState.vel = 0; // reset velocity while actively moving

        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          feed.style.transform = `translateY(${currentTransform}px)`;
          feed.style.transition = 'none';
        });

        if (e.cancelable) e.preventDefault();

        // schedule spring bounce after events stop
        if (bounceTimeout) clearTimeout(bounceTimeout);
        // If we detected many small events (momentum), start bounce sooner
        const cnt = (handleWheel as any).wheelEventsCount || 0;
        const momentumPhase = !!(handleWheel as any).momentumPhase;
        const delay = momentumPhase ? 20 : (cnt > 6 ? 40 : 80);
        bounceTimeout = window.setTimeout(() => {
          // start with a velocity based on last delta to feel natural
            wheelState.vel = -currentTransform * 0.12; // initial kick toward 0
          startWheelBounce(feed);
        }, delay) as unknown as number;
      } else {
        // If not overscrolling but we were, settle back
        if (isOverscrolling && targetFeed) {
          if (bounceTimeout) clearTimeout(bounceTimeout);
          startWheelBounce(targetFeed);
        }
      }
    };

        // Also listen on window to catch trackpad/wheel events that don't target the container
        window.addEventListener('wheel', handleWheel as EventListener, { passive: false });
    // Pointer (mouse) drag support to mimic touch dragging
    const handlePointerDown = (e: PointerEvent) => {
      // Only left button drags
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!isInFeedOrExplore(e.target)) return;
      pointerActive = true;
      pointerStartY = e.clientY;
      // capture targetFeed for this pointer interaction
      if (!targetFeed) {
        let feed = findFeedContainer(e.target as EventTarget);
        if (!feed) {
          try { feed = document.querySelector<HTMLElement>('.swiper-slide-active .feed') || document.querySelector<HTMLElement>('.feed'); } catch (err) { feed = null; }
        }
        targetFeed = feed;
      }
      try { (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId); } catch (_) {}
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!pointerActive || !targetFeed) return;
      // Only respond to primary button or touch pen
      if (e.pointerType === 'mouse' && (e.buttons & 1) === 0) return;

      const scrollContainer = getScrollContainer();
      if (!scrollContainer) return;
      const deltaY = e.clientY - pointerStartY;
  if (Math.abs(deltaY) < POINTER_MOVE_THRESHOLD) return;

      const scrollTop = scrollContainer.scrollTop;
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = scrollContainer.clientHeight;
      const isAtTop = scrollTop <= 1;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      const maxStretch = TOUCH_MAX_STRETCH;

      if (isAtTop && deltaY > 0) {
        isOverscrolling = true;
        const curveFactor = 0.03;
        const v = 1 - Math.exp(-deltaY * curveFactor);
        currentTransform = Math.min(v * maxStretch, maxStretch);
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          targetFeed!.style.transform = `translateY(${currentTransform}px)`;
          targetFeed!.style.transition = 'none';
        });
        e.preventDefault?.();
      } else if (isAtBottom && deltaY < 0) {
        isOverscrolling = true;
        const curveFactor = 0.03;
        const v = 1 - Math.exp(-Math.abs(deltaY) * curveFactor);
        currentTransform = -Math.min(v * maxStretch, maxStretch);
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          targetFeed!.style.transform = `translateY(${currentTransform}px)`;
          targetFeed!.style.transition = 'none';
        });
        e.preventDefault?.();
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!pointerActive) return;
      pointerActive = false;
      try { (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId); } catch (_) {}
      // bounce back if needed using the same spring as wheel
      if (isOverscrolling && targetFeed) {
        if (bounceTimeout) clearTimeout(bounceTimeout);
        try { targetFeed.style.transition = ''; } catch (_) {}
  // give a small initial velocity based on current transform
  wheelState.vel = -currentTransform * 0.12;
        startWheelBounce(targetFeed);
      }
    };

    const handleTouchEnd = () => {
      if (isOverscrolling && targetFeed) {
        if (rafId) cancelAnimationFrame(rafId);
        if (bounceTimeout) clearTimeout(bounceTimeout);
        try { targetFeed.style.transition = ''; } catch (_) {}
  wheelState.vel = -currentTransform * 0.12;
        startWheelBounce(targetFeed);
      }

      // Reset state
      isOverscrolling = false; // preserved until spring completes
      targetFeed = null;
      startY = 0;
    };

    const resetTransform = () => {
      if (targetFeed && rafId) {
        cancelAnimationFrame(rafId);
        targetFeed.style.transform = 'translateY(0)';
        targetFeed.style.transition = '';
      }
      isOverscrolling = false;
      currentTransform = 0;
    };

    // Attach listeners to the scroll container
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) {
      console.warn('[OverscrollRubberband] #app-root not found');
      return;
    }

    scrollContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    scrollContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
    scrollContainer.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    // Desktop wheel/trackpad support
    scrollContainer.addEventListener('wheel', handleWheel as EventListener, { passive: false });
    // Pointer (mouse) drag support: pointerdown on container, move/up on window
    scrollContainer.addEventListener('pointerdown', handlePointerDown as EventListener, { passive: true });
    window.addEventListener('pointermove', handlePointerMove as EventListener);
    window.addEventListener('pointerup', handlePointerUp as EventListener);
    window.addEventListener('pointercancel', handlePointerUp as EventListener);

    // Cleanup
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('touchstart', handleTouchStart as EventListener);
        scrollContainer.removeEventListener('touchmove', handleTouchMove as EventListener);
        scrollContainer.removeEventListener('touchend', handleTouchEnd as EventListener);
        scrollContainer.removeEventListener('touchcancel', handleTouchEnd as EventListener);
        scrollContainer.removeEventListener('wheel', handleWheel as EventListener);
        scrollContainer.removeEventListener('pointerdown', handlePointerDown as EventListener);
        window.removeEventListener('pointermove', handlePointerMove as EventListener);
        window.removeEventListener('pointerup', handlePointerUp as EventListener);
        window.removeEventListener('pointercancel', handlePointerUp as EventListener);
        window.removeEventListener('wheel', handleWheel as EventListener);
      }

      if (rafId) cancelAnimationFrame(rafId);
      
      // Reset any lingering transforms
      if (targetFeed) {
        targetFeed.style.transform = '';
        targetFeed.style.transition = '';
      }
      if (bounceTimeout) window.clearTimeout(bounceTimeout);
    };
  }, []);
  
  return null;
}
