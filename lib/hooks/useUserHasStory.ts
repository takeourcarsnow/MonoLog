"use client";

import { useState, useEffect, useCallback } from 'react';
import { getActiveStoriesForUser } from '@/lib/api/stories';

// Cache for story status per user: userId -> { hasStory, timestamp }
const storyStatusCache = new Map<string, { hasStory: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useUserHasStory(userId: string | undefined) {
  const [hasStory, setHasStory] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const checkStoryStatus = useCallback(async () => {
    if (!userId) {
      setHasStory(false);
      return;
    }

    const now = Date.now();
    const cached = storyStatusCache.get(userId);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      setHasStory(cached.hasStory);
      return;
    }

    setLoading(true);
    try {
      const stories = await getActiveStoriesForUser(userId);
      const userHasStory = stories.length > 0;
      setHasStory(userHasStory);
      storyStatusCache.set(userId, { hasStory: userHasStory, timestamp: now });
    } catch (error) {
      console.error('Failed to check story status:', error);
      setHasStory(false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkStoryStatus();
  }, [checkStoryStatus]);

  return { hasStory, loading, refetch: checkStoryStatus };
}