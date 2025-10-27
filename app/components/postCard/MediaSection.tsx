import { memo } from "react";
import type { HydratedPost } from "@/src/lib/types";
import { Carousel } from "./Carousel";
import { SingleMedia } from "./SingleMedia";

interface MediaSectionProps {
  post: HydratedPost;
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
  post,
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
  const imageUrls: string[] = (post as any).imageUrls || ((post as any).imageUrl ? [(post as any).imageUrl] : []);
  const alts: string[] = Array.isArray(post.alt) ? post.alt : [post.alt || ""];

  const postHref = `/post/${post.user.username || post.userId}-${post.id.slice(0,8)}`;

  // Lazy load images for posts below the fold (index >= 3)
  const lazy = (index ?? 0) >= 3;

  return (
    <div className="card-media" style={{ position: 'relative' }}>
      {favoriteOverlayState && (
        <div className={`favorite-overlay ${favoriteOverlayState}`} aria-hidden="true">
          ★
        </div>
      )}
      {imageUrls.length > 1 ? (
        <Carousel
          imageUrls={imageUrls}
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
          imageUrl={imageUrls[0]}
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
