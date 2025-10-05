import { useEffect, useRef } from "react";

interface UseMediaClickProps {
  isFavorite: boolean;
  toggleFavoriteWithAuth: () => void;
  showFavoriteFeedback: (action: 'adding' | 'removing') => void;
  pathname: string;
  postHref: string;
}

export function useMediaClick({
  isFavorite,
  toggleFavoriteWithAuth,
  showFavoriteFeedback,
  pathname,
  postHref,
}: UseMediaClickProps) {
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<any>(null);
  const dblClickDetectedRef = useRef(false);

  const handleMediaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dblClickDetectedRef.current) return;
    const onListing = pathname === '/' || (pathname || '').startsWith('/feed') || (pathname || '').startsWith('/explore');
    if (onListing) return;
    clickCountRef.current += 1;
    if (clickCountRef.current === 1) {
      clickTimerRef.current = setTimeout(() => {
        if (!dblClickDetectedRef.current) {
          try { window.history.pushState(null, '', postHref); } catch (_) {}
        }
        clickCountRef.current = 0;
        dblClickDetectedRef.current = false;
      }, 280);
    }
  };

  const handleMediaDblClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dblClickDetectedRef.current = true;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    clickCountRef.current = 0;
    const willAdd = !isFavorite;
    toggleFavoriteWithAuth();
    showFavoriteFeedback(willAdd ? 'adding' : 'removing');
    setTimeout(() => {
      dblClickDetectedRef.current = false;
    }, 400);
  };

  useEffect(() => () => {
    if (clickTimerRef.current) { try { clearTimeout(clickTimerRef.current); } catch (_) {} }
  }, []);

  return {
    handleMediaClick,
    handleMediaDblClick,
  };
}