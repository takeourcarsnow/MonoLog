"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import type { HydratedThreadReply } from "@/src/lib/types";

export function useReplies(threadId: string | undefined) {
  const [replies, setReplies] = useState<HydratedThreadReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReplies = useCallback(async () => {
    if (!threadId) return;

    try {
      setLoading(true);
      setError(null);
      const repliesData = await api.getThreadReplies(threadId);
      setReplies(repliesData);
    } catch (e: any) {
      setError(e?.message || 'Failed to load replies');
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    loadReplies();
  }, [loadReplies]);

  const addReply = (reply: HydratedThreadReply) => {
    setReplies(prev => [...prev, reply]);
  };

  const updateReply = (replyId: string, updatedReply: HydratedThreadReply) => {
    setReplies(prev => prev.map(r => r.id === replyId ? updatedReply : r));
  };

  const deleteReply = (replyId: string) => {
    setReplies(prev => prev.filter(r => r.id !== replyId));
  };

  return {
    replies,
    loading,
    error,
    loadReplies,
    addReply,
    updateReply,
    deleteReply,
  };
}