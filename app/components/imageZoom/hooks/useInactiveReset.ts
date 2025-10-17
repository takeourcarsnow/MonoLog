import { useEffect } from 'react';

interface UseInactiveResetParams {
  isActive: boolean;
  setScale: (scale: number) => void;
  setTx: (tx: number) => void;
  setTy: (ty: number) => void;
}

export const useInactiveReset = ({
  isActive,
  setScale,
  setTx,
  setTy,
}: UseInactiveResetParams) => {
  // Reset zoom when the image becomes inactive
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!isActive) {
      setScale(1);
      setTx(0);
      setTy(0);
      // Dispatch zoom end event
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('monolog:zoom_end'));
        } catch (_) {}
      }
    }
  }, [isActive, setScale, setTx, setTy]);
};