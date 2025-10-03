import { useEffect } from 'react';
import { useOverscrollTouch } from './useOverscrollTouch';
import { useOverscrollWheel } from './useOverscrollWheel';
import { useOverscrollPointer } from './useOverscrollPointer';

export function useOverscrollRubberband() {
  const touchHandlers = useOverscrollTouch();
  const wheelHandlers = useOverscrollWheel();
  const pointerHandlers = useOverscrollPointer();

  useEffect(() => {
    // Attach listeners to the scroll container
    const scrollContainer = document.getElementById('app-root') as HTMLElement | null;
    if (!scrollContainer) {
      console.warn('[OverscrollRubberband] #app-root not found');
      return;
    }

    scrollContainer.addEventListener('touchstart', touchHandlers.handleTouchStart, { passive: true });
    scrollContainer.addEventListener('touchmove', touchHandlers.handleTouchMove, { passive: false });
    scrollContainer.addEventListener('touchend', touchHandlers.handleTouchEnd, { passive: true });
    scrollContainer.addEventListener('touchcancel', touchHandlers.handleTouchEnd, { passive: true });
    // Desktop wheel/trackpad support
    scrollContainer.addEventListener('wheel', wheelHandlers.handleWheel as EventListener, { passive: false });
    // Pointer (mouse) drag support: pointerdown on container, move/up on window
    scrollContainer.addEventListener('pointerdown', pointerHandlers.handlePointerDown as EventListener, { passive: true });
    window.addEventListener('pointermove', pointerHandlers.handlePointerMove as EventListener);
    window.addEventListener('pointerup', pointerHandlers.handlePointerUp as EventListener);
    window.addEventListener('pointercancel', pointerHandlers.handlePointerUp as EventListener);
    window.addEventListener('wheel', wheelHandlers.handleWheel as EventListener, { passive: false });

    // Cleanup
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('touchstart', touchHandlers.handleTouchStart as EventListener);
        scrollContainer.removeEventListener('touchmove', touchHandlers.handleTouchMove as EventListener);
        scrollContainer.removeEventListener('touchend', touchHandlers.handleTouchEnd as EventListener);
        scrollContainer.removeEventListener('touchcancel', touchHandlers.handleTouchEnd as EventListener);
        scrollContainer.removeEventListener('wheel', wheelHandlers.handleWheel as EventListener);
        scrollContainer.removeEventListener('pointerdown', pointerHandlers.handlePointerDown as EventListener);
        window.removeEventListener('pointermove', pointerHandlers.handlePointerMove as EventListener);
        window.removeEventListener('pointerup', pointerHandlers.handlePointerUp as EventListener);
        window.removeEventListener('pointercancel', pointerHandlers.handlePointerUp as EventListener);
        window.removeEventListener('wheel', wheelHandlers.handleWheel as EventListener);
      }

      // Reset any lingering transforms
      const targetFeed = touchHandlers.targetFeed || wheelHandlers.targetFeed || pointerHandlers.targetFeed;
      if (targetFeed) {
        targetFeed.style.transform = '';
        targetFeed.style.transition = '';
      }
    };
  }, [touchHandlers, wheelHandlers, pointerHandlers]);
}