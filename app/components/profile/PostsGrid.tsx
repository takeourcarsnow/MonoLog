import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
const ImageZoom = dynamic(() => import('../ImageZoom'), { ssr: false });
import type { HydratedPost } from "@/src/lib/types";

interface PostsGridProps {
  posts: HydratedPost[];
}

export function PostsGrid({ posts }: PostsGridProps) {
  const router = useRouter();

  const handleTileClick = (post: HydratedPost) => {
    const href = `/post/${post.user.username || post.userId}-${post.id.slice(0,8)}`;
    router.push(href);
  };

  return (
    <div className="grid" aria-label="User posts">
      {posts.map(p => {
        const urls = (p as any).imageUrls || ((p as any).imageUrl ? [(p as any).imageUrl] : []);
        const thumbUrls = (p as any).thumbnailUrls || ((p as any).thumbnailUrl ? [(p as any).thumbnailUrl] : []);
        // Use thumbnail if available, otherwise fall back to full image
        const src = thumbUrls[0] || urls[0] || (p as any).imageUrl || "";
        const alts = Array.isArray(p.alt) ? p.alt : [p.alt || ""];
        return (
          <div
            key={p.id}
            className="tile"
            onClick={() => handleTileClick(p)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') handleTileClick(p); }}
          >
            <Link aria-hidden href={`/post/${p.user.username || p.userId}-${p.id.slice(0,8)}`} prefetch={false} style={{ display:'contents' }} onClick={(e)=> e.preventDefault()}>
              <ImageZoom loading="lazy" src={src} alt={alts[0] || "Photo"} />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
