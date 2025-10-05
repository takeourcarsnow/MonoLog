import { useState, useRef, useEffect } from "react";
import { api } from "@/src/lib/api";
import { useToast } from "../../Toast";

export function useFollow(userId: string) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followAnim, setFollowAnim] = useState<'following-anim' | 'unfollow-anim' | null>(null);
  const [followExpanded, setFollowExpanded] = useState(false);
  const followInFlightRef = useRef(false);
  const followExpandTimerRef = useRef<number | null>(null);
  const followAnimTimerRef = useRef<number | null>(null);
  const toast = useToast();

  // Check follow status on mount
  useEffect(() => {
    (async () => {
      const cur = await api.getCurrentUser();
      if (cur?.id !== userId) {
        setIsFollowing(await api.isFollowing(userId));
      }
    })();
  }, [userId]);

  // Listen for follow changes triggered elsewhere (ProfileView) so this
  // PostCard can animate when its user's follow state changes externally.
  useEffect(() => {
    const onFollowChanged = (e: any) => {
      try {
        const changedUserId = e?.detail?.userId;
        const following = !!e?.detail?.following;
        if (!changedUserId) return;
        if (changedUserId !== userId) return;
        if (followInFlightRef.current) return; // ignore if we initiated it

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
  }, [userId]);

  const toggleFollow = async () => {
    const cur = await api.getCurrentUser();
    if (!cur) {
      // This will be handled by the parent component
      return false;
    }
    // Defensive: prevent following yourself
    if (cur.id === userId) return false;

    // Prevent duplicate inflight requests
    if (followInFlightRef.current) return false;

    // Treat null/undefined as not-following
    const prev = !!isFollowing;
    // Optimistic update: flip state immediately so local UI responds fast
    setIsFollowing(!prev);

    followInFlightRef.current = true;
    try {
      if (!prev) {
        await api.follow(userId);
      } else {
        await api.unfollow(userId);
      }
      // Only dispatch the global follow_changed event after the server
      // operation succeeds. This ensures listeners (like FeedView) will
      // re-fetch from the server and see the updated follow list.
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:follow_changed', { detail: { userId, following: !prev } })); } catch (_) {}
      return true;
    } catch (e: any) {
      // Revert optimistic change on error and show toast
      setIsFollowing(prev);
      try { toast.show(e?.message || 'Failed to update follow'); } catch (_) {}
      return false;
    } finally {
      followInFlightRef.current = false;
    }
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
    followInFlightRef,
    toggleFollow
  };
}
