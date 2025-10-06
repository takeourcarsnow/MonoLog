import { useState } from "react";
import { useGridDoubleClick } from "@/src/lib/hooks/useGridDoubleClick";
import { useToast } from "./Toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ImageZoom from "./ImageZoom";
import type { HydratedPost } from "@/src/lib/types";
import { InfiniteScrollLoader } from "./LoadingIndicator";

interface GridViewProps {
  posts: HydratedPost[];
  hasMore: boolean;
  setSentinel: (el: HTMLDivElement | null) => void;
  loadingMore?: boolean;
  onRetry?: () => void;
  error?: Error | null;
}

export function GridView({ posts, hasMore, setSentinel, loadingMore = false, onRetry, error }: GridViewProps) {
  const toast = useToast();
  const router = useRouter();
  const [overlayStates, setOverlayStates] = useState<Record<string, 'adding' | 'removing' | null>>({});

  const { handleTileClick, handleTileDblClick, showOverlay } = useGridDoubleClick(toast, router, {
    onShowOverlay: (postId, action) => {
      setOverlayStates(prev => ({ ...prev, [postId]: action }));
      // Clear overlay after animation
      setTimeout(() => {
        setOverlayStates(prev => ({ ...prev, [postId]: null }));
      }, action === 'adding' ? 600 : 500);
    }
  });

  return (
    <div className="grid">
      {posts.map(p => (
        <div
          key={p.id}
          className="tile"
          onClick={(e) => handleTileClick(e, p)}
          onDoubleClick={(e) => handleTileDblClick(e, p)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key==='Enter') handleTileClick(e as any, p); }}
          style={{ position: 'relative' }}
        >
          {overlayStates[p.id] && (
            <div className={`favorite-overlay ${overlayStates[p.id]}`} aria-hidden="true">
              ★
            </div>
          )}
          <Link aria-hidden href={`/post/${p.user.username || p.userId}-${p.id.slice(0,8)}`} prefetch={false} style={{ display:'contents' }} onClick={(e)=> e.preventDefault()}>
            <ImageZoom
              loading="lazy"
              src={Array.isArray(p.imageUrls) ? p.imageUrls[0] : p.imageUrl}
              alt={Array.isArray(p.alt) ? p.alt[0] || "Photo" : p.alt || "Photo"}
            />
          </Link>
        </div>
      ))}
      <InfiniteScrollLoader
        loading={loadingMore}
        hasMore={hasMore}
        error={error}
        onRetry={onRetry}
        className="col-span-full"
      />
    </div>
  );
}