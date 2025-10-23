import { useCallback } from 'react';
import { getBounds } from '../utils/zoomUtils';

interface UseDoubleTapParams {
  containerRef: React.RefObject<HTMLDivElement>;
  imgRef: React.RefObject<HTMLImageElement>;
  naturalRef: React.MutableRefObject<{ w: number; h: number }>;
  containerRectRef: React.MutableRefObject<{ width: number; height: number } | null>;
  scaleRef: React.MutableRefObject<number>;
  txRef: React.MutableRefObject<number>;
  tyRef: React.MutableRefObject<number>;
  setScale: (scale: number) => void;
  setTx: (tx: number) => void;
  setTy: (ty: number) => void;
  isFullscreen: boolean;
  maxScale: number;
  setIsTransitioning: (transitioning: boolean) => void;
  wheelEnabledRef: React.MutableRefObject<boolean>;
  instanceIdRef: React.MutableRefObject<string>;
}

export const useDoubleTap = ({
  containerRef,
  imgRef,
  naturalRef,
  containerRectRef,
  scaleRef,
  txRef,
  tyRef,
  setScale,
  setTx,
  setTy,
  isFullscreen,
  maxScale,
  setIsTransitioning,
  wheelEnabledRef,
  instanceIdRef,
}: UseDoubleTapParams) => {
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const handleDoubleTap = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Enable smooth transition for zoom operations
    setIsTransitioning(true);

    // Use the ref to ensure we always read the latest scale (avoid stale
    // closure values). This makes double-tap reliably toggle zoom out when
    // the image is currently zoomed in.
    if (scaleRef.current > 1) {
      // Zoom out to center
      setScale(1);
      setTx(0);
      setTy(0);
      wheelEnabledRef.current = false;
      // Dispatch zoom end event
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('monolog:zoom_end', { detail: { id: instanceIdRef.current } }));
        } catch (_) {}
      }
      // Disable transition after animation completes
      setTimeout(() => setIsTransitioning(false), 300);
    } else {
      // Zoom in to double tap location - use smaller scale for fullscreen
      const zoomScale = isFullscreen ? 1.5 : maxScale;
      setScale(zoomScale);

      // Calculate translation to center the tap point using center-relative coordinates
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = localX - cx;
      const dy = localY - cy;

      const newTx = txRef.current * zoomScale + dx * (1 - zoomScale);
      const newTy = tyRef.current * zoomScale + dy * (1 - zoomScale);

      // Clamp to bounds
      const bounds = getBounds(containerRef, imgRef, naturalRef, zoomScale, containerRectRef);
      const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
      const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

      setTx(clampedTx);
      setTy(clampedTy);
      // Allow wheel zoom now that the user explicitly triggered zoom
      wheelEnabledRef.current = true;

      // Dispatch zoom start event
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('monolog:zoom_start', { detail: { id: instanceIdRef.current } }));
        } catch (_) {}
      }
      // Disable transition after animation completes
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [setScale, setTx, setTy, isFullscreen, maxScale, setIsTransitioning]);

  return { handleDoubleTap };
};