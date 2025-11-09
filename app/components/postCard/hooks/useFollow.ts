import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { useToggle } from "@/lib/hooks/useToggle";

export function useFollow(userId: string) {
  const { state: isFollowing, setState: setIsFollowing, toggleWithAuth } = useToggle({
    id: userId,
    checkApi: api.isFollowing,
    toggleApi: async (id, current) => {
      if (!current) await api.follow(id);
      else await api.unfollow(id);
    },
    eventName: 'monolog:follow_changed',
    eventDetailKey: 'userId',
    onError: (e) => console.warn(e?.message || 'Failed to update follow'),
    onToggleStart: () => {
      // No animations - simplified
    },
    onToggleEnd: () => {
      // No animations - simplified
    },
  });

  // Listen for follow changes triggered elsewhere (ProfileView)
  useEffect(() => {
    const onFollowChanged = (e: any) => {
      try {
        const changedUserId = e?.detail?.userId;
        const following = !!e?.detail?.following;
        if (!changedUserId) return;
        if (changedUserId !== userId) return;

        setIsFollowing(following);
      } catch (_) { /* ignore */ }
    };
    if (typeof window !== 'undefined') window.addEventListener('monolog:follow_changed', onFollowChanged as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('monolog:follow_changed', onFollowChanged as any); };
  }, [userId, setIsFollowing]);

  const toggleFollow = async () => {
    const cur = await api.getCurrentUser();
    if (!cur) {
      // This will be handled by the parent component
      return false;
    }
    // Defensive: prevent following yourself
    if (cur.id === userId) return false;

    const success = await toggleWithAuth();
    return success;
  };

  return {
    isFollowing,
    setIsFollowing,
    followAnim: null, // No animations
    setFollowAnim: () => {}, // No-op
    followExpanded: false, // Always collapsed
    setFollowExpanded: () => {}, // No-op
    followExpandTimerRef: { current: null }, // Not used
    followAnimTimerRef: { current: null }, // Not used
    followInFlightRef: { current: false }, // Not used
    toggleFollow
  };
}
