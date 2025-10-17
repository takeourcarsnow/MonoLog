import { useEffect } from 'react';

interface UseImageDimensionsParams {
  imgRef: React.RefObject<HTMLImageElement>;
  naturalRef: React.MutableRefObject<{ w: number; h: number }>;
  src: string | undefined;
  setScale: (scale: number) => void;
  setTx: (tx: number) => void;
  setTy: (ty: number) => void;
  instanceIdRef: React.MutableRefObject<string>;
}

export const useImageDimensions = ({
  imgRef,
  naturalRef,
  src,
  setScale,
  setTx,
  setTy,
  instanceIdRef,
}: UseImageDimensionsParams) => {
  // Set natural dimensions when image loads
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  useEffect(() => {
    const img = imgRef.current;
    if (img) {
      if (img.complete) {
        naturalRef.current.w = img.naturalWidth;
        naturalRef.current.h = img.naturalHeight;
      } else {
        const onLoad = () => {
          naturalRef.current.w = img.naturalWidth;
          naturalRef.current.h = img.naturalHeight;
        };
        img.addEventListener('load', onLoad);
        return () => img.removeEventListener('load', onLoad);
      }
    }
  }, [src]);

  // Reset zoom state when src changes
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  useEffect(() => {
    setScale(1);
    setTx(0);
    setTy(0);
    // Dispatch zoom end event
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monolog:zoom_end', { detail: { id: instanceIdRef.current } }));
      } catch (_) {}
    }
  }, [src, setScale, setTx, setTy]);
};