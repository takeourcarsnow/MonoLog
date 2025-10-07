import { useEffect } from 'react';

export function useSliderEvents(containerRef: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    // window-level cleanup helpers (added when a drag starts)
    const end = () => {
      try { window.dispatchEvent(new CustomEvent('monolog:carousel_drag_end')); } catch {}
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', end);
      window.removeEventListener('mouseup', end);
    };

    const start = (e?: Event) => {
      // stop propagation from the originating event so parent swipers don't start
      try { if (e && typeof (e as any).stopPropagation === 'function') (e as any).stopPropagation(); } catch {}
      try { window.dispatchEvent(new CustomEvent('monolog:carousel_drag_start')); } catch {}
      // ensure we always end when pointer/touch/mouse is released anywhere
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
      window.addEventListener('touchend', end);
      window.addEventListener('touchcancel', end);
      window.addEventListener('mouseup', end);
    };

    // Per-input handlers so we can stop propagation on move as well
    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('.imgedit-range'));
    const handlers: Array<{
      el: HTMLInputElement;
      onPointerDown: (e: PointerEvent) => void;
      onPointerMove: (e: PointerEvent) => void;
      onPointerUp: (e: PointerEvent) => void;
      onTouchStart: (e: TouchEvent) => void;
      onTouchMove: (e: TouchEvent) => void;
    }> = [];

    inputs.forEach(inp => {
      const onPointerDown = (ev: PointerEvent) => { ev.stopPropagation(); start(ev); };
      const onPointerMove = (ev: PointerEvent) => { ev.stopPropagation(); };
      const onPointerUp = (ev: PointerEvent) => { ev.stopPropagation(); };
      const onTouchStart = (ev: TouchEvent) => { ev.stopPropagation(); start(ev); };
      const onTouchMove = (ev: TouchEvent) => { ev.stopPropagation(); };

      inp.addEventListener('pointerdown', onPointerDown);
      inp.addEventListener('pointermove', onPointerMove);
      inp.addEventListener('pointerup', onPointerUp);
      inp.addEventListener('mousedown', onPointerDown as any);
      // Use non-passive touch listeners so we can stop propagation if needed
      inp.addEventListener('touchstart', onTouchStart, { passive: false } as any);
      inp.addEventListener('touchmove', onTouchMove, { passive: false } as any);

      handlers.push({ el: inp, onPointerDown, onPointerMove, onPointerUp, onTouchStart, onTouchMove });
    });

    return () => {
      handlers.forEach(h => {
        h.el.removeEventListener('pointerdown', h.onPointerDown);
        h.el.removeEventListener('pointermove', h.onPointerMove);
        h.el.removeEventListener('pointerup', h.onPointerUp);
        h.el.removeEventListener('mousedown', h.onPointerDown as any);
        h.el.removeEventListener('touchstart', h.onTouchStart as any);
        h.el.removeEventListener('touchmove', h.onTouchMove as any);
      });
      // ensure cleanup of window listeners
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', end);
      window.removeEventListener('mouseup', end);
    };
  }, [containerRef]);
}
