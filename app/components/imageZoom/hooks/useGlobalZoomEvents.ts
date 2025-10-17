import { useEffect } from 'react';

interface UseGlobalZoomEventsParams {
  scaleRef: React.MutableRefObject<number>;
  setScale: (scale: number) => void;
  setTx: (tx: number) => void;
  setTy: (ty: number) => void;
  wheelEnabledRef: React.MutableRefObject<boolean>;
  instanceIdRef: React.MutableRefObject<string>;
}

export const useGlobalZoomEvents = ({
  scaleRef,
  setScale,
  setTx,
  setTy,
  wheelEnabledRef,
  instanceIdRef,
}: UseGlobalZoomEventsParams) => {
  // When another ImageZoom instance starts zooming, reset this one if it's
  // currently zoomed in. The originating instance will include its id in
  // the event detail; ignore events that originate from this instance.
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  useEffect(() => {
    const onOtherZoom = (ev: Event) => {
      try {
        const e = ev as CustomEvent;
        const originId = e?.detail?.id as string | undefined;
        // If originId exists and it's from this instance, ignore. Otherwise
        // treat it as a request to close/reset this zoom instance.
        if (originId && originId === instanceIdRef.current) return; // ignore our own
        if (scaleRef.current > 1) {
          setScale(1);
          setTx(0);
          setTy(0);
          wheelEnabledRef.current = false;
          try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_end', { detail: { id: instanceIdRef.current } })); } catch(_) {}
        }
      } catch (_) {
        // ignore
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:zoom_start', onOtherZoom as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('monolog:zoom_start', onOtherZoom as any);
      }
    };
  }, [setScale, setTx, setTy, wheelEnabledRef]);
};