import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export function useAuth() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const cur = await api.getCurrentUser();
      setCurrentUserId(cur?.id || null);
    })();
  }, []);

  return { currentUserId };
}

export function useIsMe(userId: string) {
  const { currentUserId } = useAuth();
  return currentUserId === userId;
}