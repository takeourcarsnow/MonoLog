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

  // Update hasActiveStories when ownStories changes
  useEffect(() => {
    setHasActiveStories(ownStories.length > 0);
  }, [ownStories]);

  return { hasActiveStories, setHasActiveStories, ownStories, setOwnStories };
}