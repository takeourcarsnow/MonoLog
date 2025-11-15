import { memo } from "react";
import type { HydratedPost } from "@/lib/types";
import { Carousel } from "./Carousel";
import { SingleMedia } from "./SingleMedia";
import { usePostContext } from "./PostContext";

interface MediaSectionProps {
  isFavorite: boolean;
  toggleFavoriteWithAuth: () => void;
  showFavoriteFeedback: (action: 'adding' | 'removing') => void;
  favoriteOverlayState: 'adding' | 'removing' | null;
  pathname: string;
  allowCarouselTouch?: boolean;
  onImageIndexChange?: (index: number) => void;
  disableMediaNavigation?: boolean;
  index?: number;
}

export const MediaSection = memo(function MediaSection({
  isFavorite,
  toggleFavoriteWithAuth,
  showFavoriteFeedback,
  favoriteOverlayState,
  pathname,
  allowCarouselTouch,
  onImageIndexChange,
  disableMediaNavigation,
  index,
}: MediaSectionProps) {
  const { post } = usePostContext();
  const imageUrls: string[] = (post as any).imageUrls || ((post as any).imageUrl ? [(post as any).imageUrl] : []);
  const thumbnailUrls: string[] = (post as any).thumbnailUrls || ((post as any).thumbnailUrl ? [(post as any).thumbnailUrl] : []);
  
  // Use full-size images, but fall back to thumbnails if full-size is missing
  const effectiveImageUrls = imageUrls.length > 0 ? imageUrls : thumbnailUrls;
  
  const alts: string[] = Array.isArray(post.alt) ? post.alt : [post.alt || ""];

  const postHref = `/post/${post.user.username || post.userId}-${post.id.slice(0,8)}`;

  // Lazy load images for posts below the fold (index >= 3)
  const lazy = false; // Force load all images

  return (
    <div className="card-media" style={{ position: 'relative' }}>
      {favoriteOverlayState && (
        <div className={`favorite-overlay ${favoriteOverlayState}`} aria-hidden="true">
          ★
        </div>
      )}
      {effectiveImageUrls.length > 1 ? (
        <Carousel
          imageUrls={effectiveImageUrls}
          thumbnailUrls={thumbnailUrls}
          alts={alts}
          postHref={postHref}
          isFavorite={isFavorite}
          toggleFavoriteWithAuth={toggleFavoriteWithAuth}
          showFavoriteFeedback={showFavoriteFeedback}
          pathname={pathname}
          disableMediaNavigation={disableMediaNavigation}
          allowCarouselTouch={allowCarouselTouch}
          onImageIndexChange={onImageIndexChange}
          lazy={false}
        />
      ) : (
        <SingleMedia
          imageUrl={effectiveImageUrls[0]}
          thumbnailUrl={thumbnailUrls[0]}
          alt={alts[0] || "Photo"}
          postHref={postHref}
          isFavorite={isFavorite}
          toggleFavoriteWithAuth={toggleFavoriteWithAuth}
          showFavoriteFeedback={showFavoriteFeedback}
          pathname={pathname}
          disableMediaNavigation={disableMediaNavigation}
          lazy={lazy}
        />
      )}
    </div>
  );
});
