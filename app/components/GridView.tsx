import { useRouter } from "next/navigation";
import Link from "next/link";
import { OptimizedImage } from "./OptimizedImage";
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
  const router = useRouter();

  const handleTileClick = (e: React.MouseEvent, post: HydratedPost) => {
    e.preventDefault();
    e.stopPropagation();
    const href = `/post/${post.user.username || post.userId}-${post.id.slice(0,8)}`;
    router.push(href);
  };

  return (
    <div className="grid">
      {posts.map(p => (
        <div
          key={p.id}
          className="tile"
          onClick={(e) => handleTileClick(e, p)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key==='Enter') handleTileClick(e as any, p); }}
          style={{ position: 'relative' }}
        >
          <Link aria-hidden href={`/post/${p.user.username || p.userId}-${p.id.slice(0,8)}`} prefetch={false} style={{ display:'contents' }} onClick={(e)=> e.preventDefault()}>
            <OptimizedImage
              fill
              src={Array.isArray(p.thumbnailUrls) && p.thumbnailUrls[0] ? p.thumbnailUrls[0] : Array.isArray(p.imageUrls) && p.imageUrls[0] ? p.imageUrls[0] : p.thumbnailUrl || p.imageUrl || ''}
              alt={Array.isArray(p.alt) ? p.alt[0] || "Photo" : p.alt || "Photo"}
              loading="eager"
              style={{
                objectFit: 'cover',
                objectPosition: 'center center',
                borderRadius: 'inherit'
              }}
            />
          </Link>
        </div>
      ))}
      <InfiniteScrollLoader
        loading={loadingMore}
        hasMore={hasMore}
        error={error}
        setSentinel={setSentinel}
        onRetry={onRetry}
        className="col-span-full"
      />
    </div>
  );
}