import { GridView } from "./GridView";
import Link from "next/link";
import type { HydratedPost } from "@/src/lib/types";

interface FeedGridViewProps {
  posts: HydratedPost[];
  hasMore: boolean;
  loadingMore: boolean;
  error: any;
  setSentinel: (el: HTMLDivElement | null) => void;
  isExploreUnauthed: boolean;
  showEndMessage: boolean;
  onRetry: () => void;
}

export function FeedGridView({
  posts,
  hasMore,
  loadingMore,
  error,
  setSentinel,
  isExploreUnauthed,
  showEndMessage,
  onRetry,
}: FeedGridViewProps) {
  return (
    <>
      <GridView
        posts={posts}
        hasMore={hasMore}
        setSentinel={setSentinel}
        loadingMore={loadingMore}
        active={true}
        showEndMessage={showEndMessage}
        onRetry={onRetry}
        error={error}
      />

      {isExploreUnauthed && posts.length >= 8 && (
        <div className="feed-cta" style={{ textAlign: 'center', padding: '20px', margin: '20px 0' }}>
          <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>Want to keep scrolling?</p>
          <Link href="/profile" className="btn primary no-effects">Join the Community</Link>
        </div>
      )}
    </>
  );
}