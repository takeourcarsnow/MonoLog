/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, memo } from "react";
import { api } from "@/src/lib/api";
import { Hash } from "lucide-react";
import { FeedPage } from "./FeedPage";

interface HashtagViewProps {
  tag: string;
}

export const HashtagView = memo(function HashtagView({ tag }: HashtagViewProps) {
  const fetchHashtagFeed = useCallback((opts: { limit: number; before?: string }) => api.getHashtagFeedPage(tag, opts), [tag]);

  return (
    <FeedPage
      fetchFunction={fetchHashtagFeed}
      title={<Hash size={20} strokeWidth={2} />}
      subtitle={`Posts tagged with #${tag}`}
      viewStorageKey="hashtagView"
      scrollStateKey="hashtag"
      showToggle={true}
      deferFollowChanges={false}
    />
  );
});