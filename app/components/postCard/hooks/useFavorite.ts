import { useState, useEffect, useRef } from "react";
import { api } from "@/src/lib/api";
import { useToast } from "../../Toast";

export function useFavorite(postId: string) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteOverlayState, setFavoriteOverlayState] = useState<'adding' | 'removing' | null>(null);
  const overlayTimerRef = useRef<any>(null);
  const toast = useToast();

  // Check favorite status on mount
  useEffect(() => {
    (async () => {
      const cur = await api.getCurrentUser();
      if (cur) {
        setIsFavorite(await api.isFavorite(postId));
      }
    })();
  }, [postId]);

  const toggleFavoriteWithAuth = async () => {
    const cur = await api.getCurrentUser();
    if (!cur) {
      return false;
    }
    const prev = isFavorite;
    setIsFavorite(!prev);
    try {
      if (prev) await api.unfavoritePost(postId); else await api.favoritePost(postId);
      // Dispatch event for optimistic updates in other views
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:favorite_changed', { detail: { postId, favorited: !prev } })); } catch (_) {}
      return true;
    } catch (e: any) {
      setIsFavorite(prev);
      toast.show(e?.message || "Failed to toggle favorite");
      return false;
    }
  };

  const showFavoriteFeedback = (action: 'adding' | 'removing') => {
    // Clear any existing overlay timer
    if (overlayTimerRef.current) {
      try { clearTimeout(overlayTimerRef.current); } catch (_) {}
    }

    setFavoriteOverlayState(action);
    const duration = action === 'adding' ? 600 : 500;
    overlayTimerRef.current = setTimeout(() => {
      setFavoriteOverlayState(null);
    }, duration);
  };

  return {
    isFavorite,
    setIsFavorite,
    favoriteOverlayState,
    toggleFavoriteWithAuth,
    showFavoriteFeedback
  };
}
