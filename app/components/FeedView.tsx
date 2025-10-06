/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback } from "react";
import { api } from "@/src/lib/api";
import { Home } from "lucide-react";
import { FeedPage } from "./FeedPage";

export function FeedView() {
  const fetchFollowingFeed = useCallback((opts: { limit: number; before?: string }) => api.getFollowingFeedPage(opts), []);

  return (
    <FeedPage
      fetchFunction={fetchFollowingFeed}
      title={<Home size={20} strokeWidth={2} />}
      subtitle="MonoLogs from you & people that you follow"
      viewStorageKey="feedView"
      scrollStateKey="feed"
    />
  );
}
