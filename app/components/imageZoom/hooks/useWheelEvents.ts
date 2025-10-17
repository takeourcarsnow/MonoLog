import { useEffect } from 'react';
import { getBounds } from '../utils/zoomUtils';

interface UseWheelEventsParams {
  imgRef: React.RefObject<HTMLImageElement>;
  isFullscreen: boolean;
  wheelEnabledRef: React.MutableRefObject<boolean>;
  scaleRef: React.MutableRefObject<number>;
  maxScale: number;
  setIsTransitioning: (transitioning: boolean) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  txRef: React.MutableRefObject<number>;
  tyRef: React.MutableRefObject<number>;
  naturalRef: React.MutableRefObject<{ w: number; h: number }>;
  setScale: (scale: number) => void;
  setTx: (tx: number) => void;
  setTy: (ty: number) => void;
  scale: number;
  instanceIdRef: React.MutableRefObject<string>;
}

export const useWheelEvents = ({
  imgRef,
  isFullscreen,
  wheelEnabledRef,
  scaleRef,
  maxScale,
  setIsTransitioning,
  containerRef,
  txRef,
  tyRef,
  naturalRef,
  setScale,
  setTx,
  setTy,
  scale,
  instanceIdRef,
}: UseWheelEventsParams) => {
  // Add wheel event listener with passive: false to prevent default scrolling
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  useEffect(() => {
    const imgElement = imgRef.current;
    if (!imgElement) return;

    const handleWheelEvent = (e: WheelEvent) => {
      // Only allow wheel to initiate zoom if the image is already zoomed or
      // the user explicitly activated zoom (double-click or pinch),
      // except when rendered fullscreen — in fullscreen we allow immediate
      // wheel zoom to give desktop users direct control without needing a
      // prior double-tap.
      if (!isFullscreen && !wheelEnabledRef.current && scaleRef.current <= 1) return;

      // Allow wheel zoom (in/out) — if zooming out to scale 1 we reset to center
      e.preventDefault();
      e.stopPropagation();

      // Enable smooth transitions for wheel zoom
      setIsTransitioning(true);

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Determine zoom direction and amount
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out on scroll down, zoom in on scroll up
      const newScale = Math.max(1, Math.min(maxScale, scaleRef.current * zoomFactor));

      // If scale didn't change, don't do anything
      if (newScale === scaleRef.current) return;

      // Calculate the point under the mouse cursor (relative to container)
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      // Calculate new translation to keep the mouse point fixed, using
      // coordinates relative to container center so translations align with
      // the implementation's centered coordinate system.
      const scaleRatio = newScale / scaleRef.current;
      const dx = mouseX - cx;
      const dy = mouseY - cy;
      const newTx = txRef.current * scaleRatio + dx * (1 - scaleRatio);
      const newTy = tyRef.current * scaleRatio + dy * (1 - scaleRatio);

      // If zooming out to scale 1, reset to center
      if (newScale === 1) {
        setScale(1);
        setTx(0);
        setTy(0);
        wheelEnabledRef.current = false;
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('monolog:zoom_end'));
          } catch (_) {}
        }
        // Disable transitions after animation
        setTimeout(() => setIsTransitioning(false), 300);
      } else {
        // Clamp to bounds
        const bounds = getBounds(containerRef, imgRef, naturalRef, newScale);
        const clampedTx = Math.max(-bounds.maxTx, Math.min(bounds.maxTx, newTx));
        const clampedTy = Math.max(-bounds.maxTy, Math.min(bounds.maxTy, newTy));

        setScale(newScale);
        setTx(clampedTx);
        setTy(clampedTy);

        // Dispatch zoom events
        // If we're transitioning from unzoomed -> zoomed, announce zoom start
        if (scaleRef.current <= 1 && newScale > 1) {
          // mark wheel as enabled so subsequent wheel/pan interactions behave
          // like an explicit activation (double-tap/pinch)
          wheelEnabledRef.current = true;
          if (typeof window !== 'undefined') {
            try {
              window.dispatchEvent(new CustomEvent('monolog:zoom_start', { detail: { id: instanceIdRef.current } }));
          } catch (_) {}
          }
        }
        // Disable transitions after animation
        setTimeout(() => setIsTransitioning(false), 300);
      }
    };

    imgElement.addEventListener('wheel', handleWheelEvent, { passive: false });

    return () => {
      imgElement.removeEventListener('wheel', handleWheelEvent);
    };
  }, [wheelEnabledRef, maxScale, setScale, setTx, setTy, scale, setIsTransitioning]);
};