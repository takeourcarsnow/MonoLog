import { useCallback } from 'react';

interface UseTapRegistrationParams {
  lastDoubleTapRef: React.MutableRefObject<number | null>;
  lastTapTimeoutRef: React.MutableRefObject<number | null>;
  lastEventTimeRef: React.MutableRefObject<number | null>;
  handleDoubleTap: (clientX: number, clientY: number) => void;
}

export const useTapRegistration = ({
  lastDoubleTapRef,
  lastTapTimeoutRef,
  lastEventTimeRef,
  handleDoubleTap,
}: UseTapRegistrationParams) => {
  // Unified tap/double-tap registration helper to avoid races between
  // pointer and native touch handlers. Uses a timeout ref so we can
  // reliably clear pending timers on unmount and prevent duplicate
  // double-tap invocations.
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const registerTap = useCallback((clientX: number, clientY: number) => {
    const now = Date.now();
    // Ignore duplicate events from different event systems (pointer + touch)
    // fired almost simultaneously for a single physical tap.
    if (lastEventTimeRef.current && now - lastEventTimeRef.current < 50) return;
    lastEventTimeRef.current = now;

    if (lastDoubleTapRef.current && now - lastDoubleTapRef.current < 300) {
      // Detected double-tap
      lastDoubleTapRef.current = null;
      if (lastTapTimeoutRef.current) {
        clearTimeout(lastTapTimeoutRef.current as any);
        lastTapTimeoutRef.current = null;
      }
      try {
        handleDoubleTap(clientX, clientY);
      } catch (_) {}
    } else {
      lastDoubleTapRef.current = now;
      if (lastTapTimeoutRef.current) {
        clearTimeout(lastTapTimeoutRef.current as any);
      }
      lastTapTimeoutRef.current = window.setTimeout(() => {
        if (lastDoubleTapRef.current === now) lastDoubleTapRef.current = null;
        lastTapTimeoutRef.current = null;
      }, 310) as any;
    }
  }, [handleDoubleTap]);

  return { registerTap };
};