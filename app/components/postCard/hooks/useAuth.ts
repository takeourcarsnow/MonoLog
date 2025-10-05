import { useState, useEffect } from "react";
import { api } from "@/src/lib/api";

export function useAuth() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const cur = await api.getCurrentUser();
        setCurrentUserId(cur?.id || null);
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
