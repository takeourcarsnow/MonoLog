import { useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import type { User } from "@/src/lib/types";
import { storage } from "@/src/lib/storage";
import { useCurrentUser } from "@/lib/hooks";

export function useAuth() {
  // Try to pre-populate from synchronous client storage so ownership checks
  // (isMe) can be resolved instantly without waiting for the async API.
  // The stored value is just the user id (string) so we synthesize a small
  // partial User object containing only the id. The full user will be
  // fetched and replace this placeholder shortly after.
  const initialCachedId = (typeof window !== 'undefined') ? storage.get<string | null>('currentUserId', null) : null;
  const [me, setMe] = useState<User | null | undefined>(initialCachedId ? ({ id: initialCachedId } as User) : undefined);
  // If we have a cached id, treat as not loading so UI can render immediately
  const [isLoading, setIsLoading] = useState(initialCachedId ? false : true);

  const { data: currentUser, mutate } = useCurrentUser();

  useEffect(() => {
    if (currentUser !== undefined) {
      setMe(currentUser);
      setIsLoading(false);
      try { if (typeof window !== 'undefined') storage.set('currentUserId', currentUser?.id || null); } catch (_) {}
    }
  }, [currentUser]);

  useEffect(() => {
    const onAuth = () => {
      mutate();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:changed', onAuth);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:changed', onAuth);
      }
    };
  }, [mutate]);

  return { me, setMe, isLoading, currentUserId: me?.id || null };
}

export function useIsMe(userId: string) {
  const { currentUserId, isLoading } = useAuth();
  return { isMe: currentUserId === userId, isLoading };
}