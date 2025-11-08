import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { useToggle } from "@/lib/hooks/useToggle";

export function useFavorite(postId: string) {
  const [favoriteOverlayState, setFavoriteOverlayState] = useState<'adding' | 'removing' | null>(null);
  const overlayTimerRef = useRef<any>(null);

  const { state: isFavorite, setState: setIsFavorite, toggleWithAuth } = useToggle({
    id: postId,
    checkApi: api.isFavorite,
    toggleApi: async (id, current) => {
      if (current) await api.unfavoritePost(id);
      else await api.favoritePost(id);
    },
    eventName: 'monolog:favorite_changed',
    eventDetailKey: 'postId',
    onError: (e) => console.warn(e?.message || "Failed to toggle favorite"),
    onToggleStart: (newState) => {
      showFavoriteFeedback(newState ? 'adding' : 'removing');
    },
  });

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
    toggleFavoriteWithAuth: toggleWithAuth,
    showFavoriteFeedback
  };
}
