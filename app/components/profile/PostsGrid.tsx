import Link from "next/link";
import ImageZoom from "../ImageZoom";
import type { HydratedPost } from "@/src/lib/types";

interface PostsGridProps {
  posts: HydratedPost[];
}

export function PostsGrid({ posts }: PostsGridProps) {
  return (
    <div className="grid" aria-label="User posts">
      {posts.map(p => {
        const urls = (p as any).imageUrls || ((p as any).imageUrl ? [(p as any).imageUrl] : []);
        const thumbUrls = (p as any).thumbnailUrls || ((p as any).thumbnailUrl ? [(p as any).thumbnailUrl] : []);
        // Use thumbnail if available, otherwise fall back to full image
        const src = thumbUrls[0] || urls[0] || (p as any).imageUrl || "";
        const alts = Array.isArray(p.alt) ? p.alt : [p.alt || ""];
        return (
          <Link key={p.id} className="tile" href={`/post/${p.user.username || p.userId}-${p.id.slice(0,8)}`}>
            <ImageZoom loading="lazy" src={src} alt={alts[0] || "Photo"} />
          </Link>
        );
      })}
    </div>
  );
}
