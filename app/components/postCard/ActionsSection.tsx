import { memo } from "react";
import { MessageCircle, Star as StarIcon, Link as LinkIcon, Maximize as FullscreenIcon, Info as InfoIcon } from "lucide-react";

interface ActionsSectionProps {
  postId: string;
  count: number;
  commentsOpen: boolean;
  setCommentsOpen: (value: boolean) => void;
  commentsMounted: boolean;
  setCommentsMounted: (value: boolean) => void;
  commentsRef: React.RefObject<HTMLDivElement>;
  isFavorite: boolean;
  setIsFavorite: (value: boolean) => void;
  showAuth: boolean;
  setShowAuth: (value: boolean) => void;
  sharePost: () => void;
  api: any;
  toast: any;
  showFavoriteFeedback: (action: 'adding' | 'removing') => void;
  openFullscreen?: () => void;
  showExif?: boolean;
  setShowExif?: (value: boolean) => void;
}

export const ActionsSection = function ActionsSection({
  postId,
  count,
  commentsOpen,
  setCommentsOpen,
  commentsMounted,
  setCommentsMounted,
  commentsRef,
  isFavorite,
  setIsFavorite,
  showAuth,
  setShowAuth,
  sharePost,
  api,
  toast,
  showFavoriteFeedback,
  openFullscreen,
  showExif,
  setShowExif,
}: ActionsSectionProps) {
  return (
    <div className="actions">
      <button
        className="action comments-toggle"
        aria-expanded={commentsOpen}
        aria-controls={`comments-${postId}`}
        onClick={() => {
          if (!commentsMounted) {
            setCommentsMounted(true);
            requestAnimationFrame(() => {
              setCommentsOpen(true);
              const onOpenEnd = () => {
                if (!commentsRef.current) return;
                try { commentsRef.current.removeEventListener('transitionend', onOpenEnd); } catch (_) {}
                try { commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) {}
              };
              commentsRef.current?.addEventListener('transitionend', onOpenEnd);
            });
          } else {
            const willOpen = !commentsOpen;
            if (!willOpen) {
              setCommentsOpen(false);
              const el = commentsRef.current;
              if (el) {
                const onClose = (ev: TransitionEvent) => {
                  if (ev.propertyName !== 'max-height') return;
                  try { el.removeEventListener('transitionend', onClose as any); } catch (_) {}
                  setCommentsMounted(false);
                };
                el.addEventListener('transitionend', onClose as any);
                setTimeout(() => {
                  try { el.removeEventListener('transitionend', onClose as any); } catch (_) {}
                  setCommentsMounted(false);
                }, 520);
              } else {
                setCommentsMounted(false);
              }
            } else {
              setCommentsOpen(true);
              const el = commentsRef.current;
              if (el) {
                const onOpen = (ev?: TransitionEvent) => {
                  if (ev && ev.propertyName !== 'max-height') return;
                  try { el.removeEventListener('transitionend', onOpen as any); } catch (_) {}
                  try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) {}
                };
                el.addEventListener('transitionend', onOpen as any);
              }
            }
          }
        }}
        title="Toggle comments"
      >
        <MessageCircle size={16} />
        <span style={{ marginLeft: 8 }}>{count}</span>
      </button>
      <button
        className={`action favorite ${isFavorite ? "active" : ""}`}
        aria-pressed={isFavorite}
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        onClick={async () => {
          const cur = await api.getCurrentUser();
          if (!cur) {
            try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {}
            setShowAuth(true);
            return;
          }
          const prev = isFavorite;
          setIsFavorite(!prev);
          showFavoriteFeedback(prev ? 'removing' : 'adding');
          try {
            if (prev) {
              await api.unfavoritePost(postId);
            } else {
              await api.favoritePost(postId);
            }
          } catch (e: any) {
            setIsFavorite(prev);
            toast.show(e?.message || "Failed to toggle favorite");
          }
        }}
      >
        <StarIcon size={16} aria-hidden="true" />
      </button>
      <button
        className="action share"
        title="Share link"
        aria-label="Share post"
        onClick={() => { sharePost(); }}
      >
        <LinkIcon size={16} />
      </button>
      {setShowExif && (
        <div
          key={showExif ? 'active' : 'inactive'}
          className="action exif-info"
          title={`Show EXIF info ${showExif ? "(active)" : ""}`}
          aria-label="Toggle EXIF information"
          aria-pressed={showExif}
          onClick={(e) => { 
            e.stopPropagation(); 
            e.preventDefault(); 
            console.log('EXIF button clicked, current state:', showExif);
            setShowExif(!showExif); 
          }}
          role="button"
          tabIndex={0}
        >
          <InfoIcon size={16} />
        </div>
      )}
      <button
        className="action fullscreen"
        title="View photo"
        aria-label="View photo fullscreen"
        onClick={() => { openFullscreen?.(); }}
      >
        <FullscreenIcon size={16} />
      </button>
    </div>
  );
}
