import { useEffect, useState } from "react";
import { api } from "@/src/lib/api";

export function useAuth() {
  const [me, setMe] = useState<any | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await api.getCurrentUser();
        if (mounted) setMe(u);
      } catch { if (mounted) setMe(null); }
    })();
    const onAuth = async () => {
      try {
        const u = await api.getCurrentUser();
        if (mounted) setMe(u);
      } catch { if (mounted) setMe(null); }
    };
    if (typeof window !== 'undefined') window.addEventListener('auth:changed', onAuth);
    return () => { mounted = false; if (typeof window !== 'undefined') window.removeEventListener('auth:changed', onAuth); };
  }, []);

  return { me, setMe };
}
