/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, memo } from "react";
import { api } from "@/lib/api";
import { Home } from "lucide-react";
import { FeedPage } from "@/app/components/feed/FeedPage";
import { StoriesBar } from '@/app/components/stories/StoriesBar';

export const FeedView = memo(function FeedView() {
  const fetchFollowingFeed = useCallback((opts: { limit: number; before?: string }) => api.getFollowingFeedPage(opts), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="page-content-padding">
      <StoriesBar />
      <FeedPage
        fetchFunction={fetchFollowingFeed}
        title={<Home size={20} strokeWidth={2} />}
        subtitle="Posts from you & people that you follow"
        viewStorageKey="feedView"
        scrollStateKey="feed"
        deferFollowChanges={true}
      />
    </div>
  );
});
