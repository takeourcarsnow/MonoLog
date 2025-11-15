import { memo } from "react";
import ImageZoom from "@/app/components/media/ImageZoom";
import { useMediaClick } from "./hooks/useMediaClick";

interface SingleMediaProps {
  imageUrl: string;
  thumbnailUrl?: string;
  alt: string;
  postHref: string;
  isFavorite: boolean;
  toggleFavoriteWithAuth: () => void;
  showFavoriteFeedback: (action: 'adding' | 'removing') => void;
  pathname: string;
  openFullscreen?: (src: string) => void;
  disableMediaNavigation?: boolean;
  lazy?: boolean;
}

export const SingleMedia = memo(function SingleMedia({
  imageUrl,
  thumbnailUrl,
  alt,
  postHref,
  isFavorite,
  toggleFavoriteWithAuth,
  showFavoriteFeedback,
  pathname,
  openFullscreen,
  disableMediaNavigation,
  lazy = false,
}: SingleMediaProps) {
  const { handleMediaClick, handleMediaDblClick } = useMediaClick({
    isFavorite,
    toggleFavoriteWithAuth,
    showFavoriteFeedback,
    pathname,
    postHref,
    disableMediaNavigation: true,
  });

  return (
    <div
      className="media-link"
      draggable={false}
      onDragStart={(e: React.DragEvent) => e.preventDefault()}
      onClick={handleMediaClick}
      onDoubleClick={handleMediaDblClick}
      role="button"
      tabIndex={0}
    >
      <ImageZoom
        src={imageUrl}
        fallbackSrc={thumbnailUrl}
        alt={alt || "Photo"}
        lazy={lazy}
        onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => (e.currentTarget.classList.add("loaded"))}
      />
    </div>
  );
});
