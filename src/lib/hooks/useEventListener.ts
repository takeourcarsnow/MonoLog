import { useEffect } from "react";

export function useEventListener(eventName: string, handler: (event: any) => void, deps: any[] = []) {
  // Intentionally ignore exhaustive-deps for dynamic deps array passed by
  // callers. Callers should pass stable handlers or memoized deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener(eventName, handler as any);
    return () => {
      window.removeEventListener(eventName, handler as any);
    };
  }, [eventName, handler, ...deps]);
}