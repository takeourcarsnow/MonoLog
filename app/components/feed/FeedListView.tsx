import { PostCard } from "@/app/components/PostCard";
import { InfiniteScrollLoader } from "@/app/components/ui/LoadingIndicator";
import Link from "next/link";
import type { HydratedPost } from "@/lib/types";
import { FeedUnauthCTA } from "@/app/components/feed/FeedUnauthCTA";

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
      {isExploreUnauthed && posts.length >= 8 && <FeedUnauthCTA />}
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