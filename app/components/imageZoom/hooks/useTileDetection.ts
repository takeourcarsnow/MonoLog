import { useEffect } from 'react';

interface UseTileDetectionParams {
  containerRef: React.RefObject<HTMLDivElement>;
  setIsTile: (tile: boolean) => void;
}

export const useTileDetection = ({
  containerRef,
  setIsTile,
}: UseTileDetectionParams) => {
  // Detect if this ImageZoom is rendered inside a grid tile
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  useEffect(() => {
    try {
      const el = containerRef.current;
      if (!el) return;
      const tile = el.closest && (el.closest('.tile') as Element | null);
      setIsTile(!!tile);
    } catch (e) {
      // ignore
    }
  }, [containerRef, setIsTile]);
};