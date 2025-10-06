/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback } from "react";
import { api } from "@/src/lib/api";
import { Home } from "lucide-react";
import { FeedPage } from "./FeedPage";

export function FeedView() {
  const fetchFollowingFeed = useCallback((opts: { limit: number; before?: string }) => api.getFollowingFeedPage(opts), []);

  const onFollowChange = useCallback((posts: any[], loadInitialPosts: () => Promise<void>) => (e: any) => {
    try {
      const following = e?.detail?.following;
      const changedUserId = e?.detail?.userId;
      if (!following) return; // ignore unfollow events entirely

      // If the followed user's posts are already present (e.g. user unfollowed
      // then re-followed), skip refetch to avoid flicker.
      if (changedUserId && posts.some((p: any) => p.userId === changedUserId)) return;

      // Otherwise fetch the first page again so new followed users' posts appear.
      loadInitialPosts();
    } catch (err) { /* ignore */ }
  }, []);

  return (
    <FeedPage
      fetchFunction={fetchFollowingFeed}
      title={<Home size={20} strokeWidth={2} />}
      subtitle="MonoLogs from you & people that you follow"
      viewStorageKey="feedView"
      onFollowChange={onFollowChange}
      scrollStateKey="feed"
    />
  );
}
