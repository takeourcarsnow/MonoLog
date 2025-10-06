import { useState, useRef, useEffect } from "react";
import { api } from "@/src/lib/api";
import { useToast } from "../../Toast";
import { useToggle } from "@/src/lib/hooks/useToggle";

export function useFollow(userId: string) {
  const [followAnim, setFollowAnim] = useState<'following-anim' | 'unfollow-anim' | null>(null);
  const [followExpanded, setFollowExpanded] = useState(false);
  const followExpandTimerRef = useRef<number | null>(null);
  const followAnimTimerRef = useRef<number | null>(null);
  const toast = useToast();

  const { state: isFollowing, setState: setIsFollowing, toggleWithAuth } = useToggle({
    id: userId,
    checkApi: api.isFollowing,
    toggleApi: async (id, current) => {
      if (!current) await api.follow(id);
      else await api.unfollow(id);
    },
    eventName: 'monolog:follow_changed',
    eventDetailKey: 'userId',
    onError: (e) => toast.show(e?.message || 'Failed to update follow')
  });

  // Listen for follow changes triggered elsewhere (ProfileView) so this
  // PostCard can animate when its user's follow state changes externally.
  useEffect(() => {
    const onFollowChanged = (e: any) => {
      try {
        const changedUserId = e?.detail?.userId;
        const following = !!e?.detail?.following;
        if (!changedUserId) return;
        if (changedUserId !== userId) return;
        if (followAnimTimerRef.current) return; // ignore if we initiated it

        setIsFollowing(prev => {
          if (prev === following) return prev;
          // expand the button briefly so label shows while we animate
          setFollowExpanded(true);
          if (followExpandTimerRef.current) { try { window.clearTimeout(followExpandTimerRef.current); } catch (_) {} followExpandTimerRef.current = null; }
          followExpandTimerRef.current = window.setTimeout(() => { setFollowExpanded(false); followExpandTimerRef.current = null; }, 2000);
          setFollowAnim(following ? 'following-anim' : 'unfollow-anim');
          if (followAnimTimerRef.current) { try { window.clearTimeout(followAnimTimerRef.current); } catch (_) {} followAnimTimerRef.current = null; }
          followAnimTimerRef.current = window.setTimeout(() => { setFollowAnim(null); followAnimTimerRef.current = null; }, 420);
          return following;
        });
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
    if (success) {
      // Animation is handled in the event listener above
    }
    return success;
  };

  return {
    isFollowing,
    setIsFollowing,
    followAnim,
    setFollowAnim,
    followExpanded,
    setFollowExpanded,
    followExpandTimerRef,
    followAnimTimerRef,
    followInFlightRef: { current: false }, // Not used anymore, but keeping for compatibility
    toggleFollow
  };
}
