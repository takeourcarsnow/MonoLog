/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Compass } from "lucide-react";
import { FeedPage } from "@/app/components/feed/FeedPage";
import { useAuthChange } from "@/lib/hooks/useAuthChange";
import { StoriesBar } from '@/app/components/stories/StoriesBar';

export function ExploreView() {
  const fetchExploreFeed = useCallback((opts: { limit: number; before?: string }) => api.getExploreFeedPage(opts), []);

    const [canPost, setCanPost] = useState<boolean | null>(null);

    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const resp = await api.canPostToday();
          if (!mounted) return;
          setCanPost(Boolean(resp?.allowed));
        } catch (e) {
          if (!mounted) return;
          setCanPost(null);
        }
      })();
      return () => { mounted = false; };
    }, []);

    // Refresh canPost when authentication state changes
    useAuthChange(async () => {
      try {
        const resp = await api.canPostToday();
        setCanPost(Boolean(resp?.allowed));
      } catch (e) {
        setCanPost(null);
      }
    });

    const emptyMessage = "You're already following everyone! This section shows posts from users you're not following yet.";

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="page-content-padding">
        <StoriesBar fetchStories={() => api.getExploreStories()} />
        <FeedPage
          fetchFunction={fetchExploreFeed}
          title={<Compass size={20} strokeWidth={2} />}
          subtitle="Posts from people you aren't following yet"
          viewStorageKey="exploreView"
          scrollStateKey="explore"
          // Keep explore posts visible even if the user follows/unfollows while here
          deferFollowChanges={true}
          emptyMessage={emptyMessage}
        />
      </div>
    );
}
