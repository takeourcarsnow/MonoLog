import { useState, useEffect } from "react";
import { api } from "@/src/lib/api";
import { storage } from "@/src/lib/storage";

export function useAuth() {
  const initialCachedId = (typeof window !== 'undefined') ? storage.get<string | null>('currentUserId', null) : null;
  const [currentUserId, setCurrentUserId] = useState<string | null>(initialCachedId);
  // treat as not loading when we have a cached id so UI shows immediate owner controls
  const [isLoading, setIsLoading] = useState(initialCachedId ? false : true);

  useEffect(() => {
    (async () => {
      try {
        const cur = await api.getCurrentUser();
        setCurrentUserId(cur?.id || null);
        try { if (typeof window !== 'undefined') storage.set('currentUserId', cur?.id || null); } catch (_) {}
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { currentUserId, isLoading };
}

export function useIsMe(userId: string) {
  const { currentUserId, isLoading } = useAuth();
  return { isMe: currentUserId === userId, isLoading };
}
