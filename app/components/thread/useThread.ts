"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import type { HydratedThread } from "@/src/lib/types";

export function useThread(threadSlug: string, communitySlug: string) {
  const [thread, setThread] = useState<HydratedThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadThread = useCallback(async () => {
    if (!threadSlug || !communitySlug) return;

    try {
      setLoading(true);
      setError(null);
      const threadData = await api.getThreadBySlug(threadSlug);
      if (!threadData) {
        setError('Thread not found');
        return;
      }
      setThread(threadData);
    } catch (e: any) {
      setError(e?.message || 'Failed to load thread');
    } finally {
      setLoading(false);
    }
  }, [threadSlug, communitySlug]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  const updateReplyCount = (delta: number) => {
    setThread(prev => prev ? { ...prev, replyCount: Math.max(0, (prev.replyCount || 0) + delta) } : null);
  };

  return {
    thread,
    loading,
    error,
    loadThread,
    updateReplyCount,
  };
}