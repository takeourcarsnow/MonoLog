/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import { Compass } from "lucide-react";
import { FeedPage } from "./FeedPage";

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

    const emptyMessage =
      canPost === true
        ? "Be the first to create today's entry — add one post with as many photos as you like!"
        : "MonoLogs from people you aren't following yet";

    return (
      <FeedPage
        fetchFunction={fetchExploreFeed}
        title={<Compass size={20} strokeWidth={2} />}
        subtitle="MonoLogs from people you aren't following yet"
        viewStorageKey="exploreView"
        scrollStateKey="explore"
        emptyMessage={emptyMessage}
      />
    );
}
