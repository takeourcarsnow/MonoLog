/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback } from "react";
import { api } from "@/src/lib/api";
import { Compass } from "lucide-react";
import { FeedPage } from "./FeedPage";

export function ExploreView() {
  const fetchExploreFeed = useCallback((opts: { limit: number; before?: string }) => api.getExploreFeedPage(opts), []);

  return (
    <FeedPage
      fetchFunction={fetchExploreFeed}
      title={<Compass size={20} strokeWidth={2} />}
      subtitle="MonoLogs from people you aren't following yet"
      viewStorageKey="exploreView"
      scrollStateKey="explore"
      emptyMessage="No posts yet. Be the first to post your daily photo!"
    />
  );
}
