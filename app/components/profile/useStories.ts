import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { dedupe } from "@/lib/requestDeduplication";
import type { Story } from "@/lib/types";

export function useStories(userId: string) {
  const [hasActiveStories, setHasActiveStories] = useState(false);
  const [ownStories, setOwnStories] = useState<Story[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stories = await dedupe(`getActiveStoriesForUser:${userId}`, () => api.getActiveStoriesForUser(userId));
        if (mounted) {
          setHasActiveStories(stories.length > 0);
          setOwnStories(stories);
        }
      } catch (_) {
        if (mounted) {
          setHasActiveStories(false);
          setOwnStories([]);
        }
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  // Listen for global story updates so this hook stays in sync when stories
  // are created/deleted from other parts of the app.
  useEffect(() => {
    async function onStoriesUpdated(e: any) {
      try {
        const updatedUserId = e?.detail?.userId;
        if (!updatedUserId || updatedUserId !== userId) return;
        const stories = await dedupe(`getActiveStoriesForUser:${userId}`, () => api.getActiveStoriesForUser(userId));
        setHasActiveStories(stories.length > 0);
        setOwnStories(stories);
      } catch (err) {
        // ignore
      }
    }

    if (typeof window !== 'undefined' && (window as any).addEventListener) {
      (window as any).addEventListener('stories:updated', onStoriesUpdated);
    }
    return () => {
      if (typeof window !== 'undefined' && (window as any).removeEventListener) {
        (window as any).removeEventListener('stories:updated', onStoriesUpdated);
      }
    };
  }, [userId]);

  // Update hasActiveStories when ownStories changes
  useEffect(() => {
    setHasActiveStories(ownStories.length > 0);
  }, [ownStories]);

  return { hasActiveStories, setHasActiveStories, ownStories, setOwnStories };
}