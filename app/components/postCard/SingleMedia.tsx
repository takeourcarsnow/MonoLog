import { memo } from "react";
import ImageZoom from "../ImageZoom";
import { useMediaClick } from "./hooks/useMediaClick";

interface SingleMediaProps {
  imageUrl: string;
  alt: string;
  postHref: string;
  isFavorite: boolean;
  toggleFavoriteWithAuth: () => void;
  showFavoriteFeedback: (action: 'adding' | 'removing') => void;
  pathname: string;
}

export const SingleMedia = memo(function SingleMedia({
  imageUrl,
  alt,
  postHref,
  isFavorite,
  toggleFavoriteWithAuth,
  showFavoriteFeedback,
  pathname,
}: SingleMediaProps) {
  const { handleMediaClick, handleMediaDblClick } = useMediaClick({
    isFavorite,
    toggleFavoriteWithAuth,
    showFavoriteFeedback,
    pathname,
    postHref,
  });

  return (
    <a
      href={postHref}
      className="media-link"
      draggable={false}
      onClick={handleMediaClick}
      onDoubleClick={handleMediaDblClick}
      onDragStart={(e: React.DragEvent) => e.preventDefault()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleMediaClick(e as any); }}
    >
      <ImageZoom
        loading="lazy"
        src={imageUrl}
        onDoubleTap={(x: number, y: number) => {
          const willAdd = !isFavorite;
          toggleFavoriteWithAuth();
          showFavoriteFeedback(willAdd ? 'adding' : 'removing');
        }}
        alt={alt || "Photo"}
        onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => (e.currentTarget.classList.add("loaded"))}
      />
    </a>
  );
});
