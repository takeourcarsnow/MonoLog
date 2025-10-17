/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, memo } from "react";
import { api } from "@/src/lib/api";
import { Home } from "lucide-react";
import { FeedPage } from "./FeedPage";

export const FeedView = memo(function FeedView() {
  const fetchFollowingFeed = useCallback((opts: { limit: number; before?: string }) => api.getFollowingFeedPage(opts), []);

  return (
    <FeedPage
      fetchFunction={fetchFollowingFeed}
      title={<Home size={20} strokeWidth={2} />}
      subtitle="MonoLogs from you & people that you follow"
      viewStorageKey="feedView"
      scrollStateKey="feed"
      deferFollowChanges={true}
    />
  );
});
