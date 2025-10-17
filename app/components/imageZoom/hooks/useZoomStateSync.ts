import { useEffect } from 'react';

interface UseZoomStateSyncParams {
  scale: number;
  tx: number;
  ty: number;
  scaleRef: React.MutableRefObject<number>;
  txRef: React.MutableRefObject<number>;
  tyRef: React.MutableRefObject<number>;
}

export const useZoomStateSync = ({
  scale,
  tx,
  ty,
  scaleRef,
  txRef,
  tyRef,
}: UseZoomStateSyncParams) => {
  // keep refs in sync with state
  // refs are stable objects; include only the changing values in deps
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  useEffect(() => { txRef.current = tx; }, [tx]);
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  useEffect(() => { tyRef.current = ty; }, [ty]);
};