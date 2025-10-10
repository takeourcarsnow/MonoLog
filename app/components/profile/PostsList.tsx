import Link from "next/link";
import ImageZoom from "../ImageZoom";
import type { HydratedPost } from "@/src/lib/types";

interface PostsListProps {
  posts: HydratedPost[];
}

export function PostsList({ posts }: PostsListProps) {
  return (
    <div className="list" aria-label="User posts">
      {posts.map(p => {
        const urls = (p as any).imageUrls || ((p as any).imageUrl ? [(p as any).imageUrl] : []);
        const thumbUrls = (p as any).thumbnailUrls || ((p as any).thumbnailUrl ? [(p as any).thumbnailUrl] : []);
        // Use thumbnail if available, otherwise fall back to full image
        const src = thumbUrls[0] || urls[0] || (p as any).imageUrl || "";
        const alts = Array.isArray(p.alt) ? p.alt : [p.alt || ""];
        return (
          <Link key={p.id} className="list-item" href={`/post/${p.user.username || p.userId}-${p.id.slice(0,8)}`}>
            <div className="list-thumb">
              <ImageZoom loading="lazy" src={src} alt={alts[0] || "Photo"} />
            </div>
            <div className="list-body">
              <div className="dim">{p.user.displayName || p.user.username}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
