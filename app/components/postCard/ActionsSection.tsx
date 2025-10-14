import { memo } from "react";
import { MessageCircle, Star as StarIcon, Link as LinkIcon, Maximize as FullscreenIcon, Info as InfoIcon, Camera } from "lucide-react";
import { ReportButton } from "../ReportButton";

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
  showSpotify?: boolean;
  setShowSpotify?: (value: boolean) => void;
  spotifyLink?: string;
  camera?: string;
  lens?: string;
  filmType?: string;
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
  showSpotify,
  setShowSpotify,
  spotifyLink,
  camera,
  lens,
  filmType,
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
        <span style={{ marginLeft: 2 }}>{count}</span>
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
        <button
          className={`action exif-info ${camera || lens || filmType ? 'exif-has-data' : ''}`}
          title={`Show EXIF info ${showExif ? "(active)" : ""}`}
          aria-label="Toggle EXIF information"
          aria-pressed={showExif}
          onClick={(e) => { 
            e.stopPropagation(); 
            e.preventDefault(); 
            console.log('EXIF button clicked, current state:', showExif);
            setShowExif(!showExif); 
          }}
        >
          <Camera size={16} />
        </button>
      )}
      {setShowSpotify && (
        <button
          className={`action spotify-info ${spotifyLink ? 'spotify-has-link' : ''}`}
          title={`Show Spotify info ${showSpotify ? "(active)" : ""}`}
          aria-label="Toggle Spotify information"
          aria-pressed={showSpotify}
          onClick={(e) => { 
            e.stopPropagation(); 
            e.preventDefault(); 
            console.log('Spotify button clicked, current state:', showSpotify);
            setShowSpotify(!showSpotify); 
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.6-.12-.421.18-.78.6-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.241 1.081zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.42-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.781-.18-.601.18-1.2.78-1.381 4.5-1.14 11.28-.86 15.72 1.621.479.3.599 1.02.3 1.5-.3.48-.84.599-1.32.3z"/>
          </svg>
        </button>
      )}
      <button
        className="action fullscreen"
        title="View photo"
        aria-label="View photo fullscreen"
        onClick={() => { openFullscreen?.(); }}
      >
        <FullscreenIcon size={16} />
      </button>
      <ReportButton postId={postId} />
    </div>
  );
}
