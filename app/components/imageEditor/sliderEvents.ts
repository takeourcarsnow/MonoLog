import { useEffect } from 'react';

export function useSliderEvents(containerRef: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    const start = () => {
      try { window.dispatchEvent(new CustomEvent('monolog:carousel_drag_start')); } catch {}
      // ensure we always end when pointer/touch/mouse is released anywhere
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
      window.addEventListener('touchend', end);
      window.addEventListener('touchcancel', end);
      window.addEventListener('mouseup', end);
    };

    const end = () => {
      try { window.dispatchEvent(new CustomEvent('monolog:carousel_drag_end')); } catch {}
      window.removeEventListener('pointerup', end);
      window.removeEventListener('touchend', end);
      window.removeEventListener('mouseup', end);
    };

    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('.imgedit-range'));
    inputs.forEach(inp => {
      inp.addEventListener('pointerdown', start);
      inp.addEventListener('touchstart', start, { passive: true } as any);
      inp.addEventListener('mousedown', start);
    });

    return () => {
      inputs.forEach(inp => {
        inp.removeEventListener('pointerdown', start);
        inp.removeEventListener('touchstart', start as any);
        inp.removeEventListener('mousedown', start);
      });
      // ensure cleanup of window listeners
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', end);
      window.removeEventListener('mouseup', end);
    };
  }, []);
}
