import { PostCard } from "./PostCard";
import { InfiniteScrollLoader } from "./LoadingIndicator";
import Link from "next/link";
import type { HydratedPost } from "@/src/lib/types";

interface FeedListViewProps {
  posts: HydratedPost[];
  hasMore: boolean;
  loadingMore: boolean;
  error: any;
  setSentinel: (el: HTMLDivElement | null) => void;
  isExploreUnauthed: boolean;
  showEndMessage: boolean;
  onRetry: () => void;
}

export function FeedListView({
  posts,
  hasMore,
  loadingMore,
  error,
  setSentinel,
  isExploreUnauthed,
  showEndMessage,
  onRetry,
}: FeedListViewProps) {
  return (
    <>
      {posts.map((p, index) => <PostCard key={p.id} post={p} disableCardNavigation={true} index={index} />)}
      {isExploreUnauthed && posts.length >= 8 && (
        <div className="feed-cta" style={{ textAlign: 'center', padding: '20px', margin: '20px 0' }}>
          <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>Want to keep scrolling?</p>
          <Link href="/profile" className="btn primary no-effects">Join the Community</Link>
        </div>
      )}
      <InfiniteScrollLoader
        loading={loadingMore}
        hasMore={hasMore}
        error={error}
        setSentinel={setSentinel}
        active={true}
        showEndMessage={showEndMessage}
        onRetry={onRetry}
      />
    </>
  );
}