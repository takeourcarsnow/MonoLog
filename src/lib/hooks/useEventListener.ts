import { useEffect } from "react";

export function useEventListener(eventName: string, handler: (event: any) => void, deps: any[] = []) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener(eventName, handler as any);
    return () => {
      window.removeEventListener(eventName, handler as any);
    };
  }, [eventName, handler, ...deps]);
}