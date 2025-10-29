import { useEffect } from "react";

export function useAuthChange(onAuthChange: () => void) {
  useEffect(() => {
    const handler = () => onAuthChange();
    if (typeof window !== 'undefined') window.addEventListener('auth:changed', handler as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('auth:changed', handler as any); };
  }, [onAuthChange]);
}