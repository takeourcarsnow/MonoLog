import { GridView } from "./GridView";
import Link from "next/link";
import type { HydratedPost } from "@/src/lib/types";
import { FeedUnauthCTA } from "./FeedUnauthCTA";

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

      {isExploreUnauthed && posts.length >= 8 && <FeedUnauthCTA />}
    </>
  );
}