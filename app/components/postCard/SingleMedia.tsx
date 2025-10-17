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
  openFullscreen?: (src: string) => void;
  disableMediaNavigation?: boolean;
}

export const SingleMedia = memo(function SingleMedia({
  imageUrl,
  alt,
  postHref,
  isFavorite,
  toggleFavoriteWithAuth,
  showFavoriteFeedback,
  pathname,
  openFullscreen,
  disableMediaNavigation,
}: SingleMediaProps) {
  const { handleMediaClick } = useMediaClick({
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
      role="button"
      tabIndex={0}
    >
      <ImageZoom
        src={imageUrl}
        alt={alt || "Photo"}
        lazy={true}
        onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => (e.currentTarget.classList.add("loaded"))}
      />
    </div>
  );
});
