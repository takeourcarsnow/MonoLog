import { memo, useState } from "react";
import { MessageCircle, Star as StarIcon, Link as LinkIcon, Maximize as FullscreenIcon, Camera, Check } from "lucide-react";
import { ReportButton } from "../ReportButton";

interface ActionsSectionProps {
  postId: string;
  count: number;
  commentsOpen: boolean;
  setCommentsOpen: (value: boolean) => void;
  commentsMounted: boolean;
  setCommentsMounted: (value: boolean) => void;
  commentsRef: React.RefObject<HTMLDivElement | null>;
  isFavorite: boolean;
  setIsFavorite: (value: boolean) => void;
  toggleFavoriteWithAuth: () => Promise<boolean>;
  showAuth: boolean;
  setShowAuth: (value: boolean) => void;
  sharePost: () => Promise<boolean>;
  api: any;
  toast: any;
  showFavoriteFeedback: (action: 'adding' | 'removing') => void;
  openFullscreen?: () => void;
  showExif?: boolean;
  setShowExif?: (value: boolean) => void;
  showSpotify?: boolean;
  setShowSpotify?: (value: boolean) => void;
  showWeather?: boolean;
  setShowWeather?: (value: boolean) => void;
  showLocation?: boolean;
  setShowLocation?: (value: boolean) => void;
  spotifyLink?: string;
  camera?: string;
  lens?: string;
  filmType?: string;
  weatherCondition?: string;
  weatherTemperature?: number;
  weatherLocation?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  locationAddress?: string;
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
  toggleFavoriteWithAuth,
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
  showWeather,
  setShowWeather,
  showLocation,
  setShowLocation,
  spotifyLink,
  camera,
  lens,
  filmType,
  weatherCondition,
  weatherTemperature,
  weatherLocation,
  locationLatitude,
  locationLongitude,
  locationAddress,
}: ActionsSectionProps) {
  const [copied, setCopied] = useState(false);
  const [favoriteAnimating, setFavoriteAnimating] = useState(false);
  const [spotifyAnimating, setSpotifyAnimating] = useState(false);
  const [exifAnimating, setExifAnimating] = useState(false);
  const [commentsAnimating, setCommentsAnimating] = useState(false);
  const [fullscreenAnimating, setFullscreenAnimating] = useState(false);
  const [shareAnimating, setShareAnimating] = useState(false);

  return (
    <div className="actions">
      <button
        className={`action share ${shareAnimating ? 'animating' : ''}`}
        title="Share link"
        aria-label="Share post"
        onClick={async () => {
          setShareAnimating(true);
          setTimeout(() => setShareAnimating(false), 500);
          const success = await sharePost();
          if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        }}
      >
        <LinkIcon 
          size={16} 
          style={{ 
            opacity: copied ? 0 : 1, 
            transform: copied ? 'scale(0.5) rotate(-90deg)' : 'scale(1) rotate(0deg)',
            transition: 'all 0.4s ease-in-out',
            position: 'absolute'
          }} 
        />
        <Check 
          size={16} 
          style={{ 
            opacity: copied ? 1 : 0, 
            transform: copied ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(90deg)',
            transition: 'all 0.4s ease-in-out',
            position: 'absolute'
          }} 
        />
      </button>
      {setShowExif && (
        <button
          className={`action exif-info ${camera || lens || filmType ? 'exif-has-data' : ''} ${exifAnimating ? 'animating' : ''}`}
          title={`Show EXIF info ${showExif ? "(active)" : ""}`}
          aria-label="Toggle EXIF information"
          aria-pressed={showExif}
          onClick={(e) => { 
            e.stopPropagation(); 
            e.preventDefault(); 
            setExifAnimating(true);
            setTimeout(() => setExifAnimating(false), 500);
            console.log('EXIF button clicked, current state:', showExif);
            setShowExif(!showExif); 
          }}
        >
          <Camera size={16} />
        </button>
      )}
      <button
        className={`action comments-toggle ${commentsAnimating ? 'animating' : ''}`}
        aria-expanded={commentsOpen}
        aria-controls={`comments-${postId}`}
        onClick={() => {
          setCommentsAnimating(true);
          setTimeout(() => setCommentsAnimating(false), 500);
          if (!commentsMounted) {
            setCommentsMounted(true);
            setCommentsOpen(true);
          } else {
            const willOpen = !commentsOpen;
            if (!willOpen) {
              setCommentsOpen(false);
              // Unmount after a delay to allow animation to complete
              setTimeout(() => {
                setCommentsMounted(false);
              }, 320);
            } else {
              setCommentsOpen(true);
            }
          }
        }}
        title="Toggle comments"
      >
        <MessageCircle size={16} />
        {count > 0 && <span style={{ marginLeft: 2 }}>{count}</span>}
      </button>
      {setShowExif && (
        <button
          className={`action fullscreen ${fullscreenAnimating ? 'animating' : ''}`}
          title="View photo"
          aria-label="View photo fullscreen"
          onClick={() => { 
            setFullscreenAnimating(true);
            setTimeout(() => setFullscreenAnimating(false), 500);
            openFullscreen?.(); 
          }}
        >
          <FullscreenIcon size={16} />
        </button>
      )}
      <button
        className={`action favorite ${isFavorite ? "active" : ""} ${favoriteAnimating ? "animating" : ""}`}
        aria-pressed={isFavorite}
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        onClick={async () => {
          setFavoriteAnimating(true);
          setTimeout(() => setFavoriteAnimating(false), 500);
          showFavoriteFeedback(isFavorite ? 'removing' : 'adding');
          const success = await toggleFavoriteWithAuth();
          if (!success) {
            setShowAuth(true);
          }
        }}
      >
        <StarIcon className="star" size={16} aria-hidden="true" />
      </button>
      {/* Weather & Location buttons intentionally removed — info is shown in header */}
      {setShowSpotify && (
        <button
          className={`action spotify-info ${spotifyLink ? 'spotify-has-link' : ''} ${spotifyAnimating ? 'animating' : ''}`}
          title={`Show Spotify info ${showSpotify ? "(active)" : ""}`}
          aria-label="Toggle Spotify information"
          aria-pressed={showSpotify}
          onClick={(e) => { 
            e.stopPropagation(); 
            e.preventDefault(); 
            setSpotifyAnimating(true);
            setTimeout(() => setSpotifyAnimating(false), 500);
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
      <ReportButton postId={postId} />
    </div>
  );
}
