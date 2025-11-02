import { useEffect } from "react";

export function NotificationListener() {
  // No-op: Toasts and active client notifications are removed.
  useEffect(() => {
    // Preserve and clean up previous event wiring if reintroduced later.
    const handleAuth = () => {};
    if (typeof window !== 'undefined') {
      window.addEventListener('auth:changed', handleAuth);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:changed', handleAuth);
      }
    };
  }, []);
  return null;
}
