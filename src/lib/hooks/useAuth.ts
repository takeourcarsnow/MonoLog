import { useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import type { User } from "@/src/lib/types";

export function useAuth() {
  const [me, setMe] = useState<User | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await api.getCurrentUser();
        if (mounted) setMe(u);
      } catch {
        if (mounted) setMe(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    const onAuth = async () => {
      try {
        const u = await api.getCurrentUser();
        if (mounted) setMe(u);
      } catch {
        if (mounted) setMe(null);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:changed', onAuth);
    }

    return () => {
      mounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:changed', onAuth);
      }
    };
  }, []);

  return { me, setMe, isLoading, currentUserId: me?.id || null };
}

export function useIsMe(userId: string) {
  const { currentUserId, isLoading } = useAuth();
  return { isMe: currentUserId === userId, isLoading };
}