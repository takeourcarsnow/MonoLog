import { useState, useEffect, useMemo } from "react";
import type { HydratedPost } from "@/lib/types";
import { api } from "@/lib/api";

export function usePostState(initialPost: HydratedPost) {
  const [post, setPost] = useState<HydratedPost>(initialPost);

  // Memoize derived values to prevent recalculations
  const needsAvatarFetch = useMemo(
    () => !post.user?.avatarUrl,
    [post.user?.avatarUrl]
  );

  // If the hydrated post doesn't include an avatarUrl (possible for older rows),
  // fetch the user's profile and fill it in so the avatar renders consistently
  useEffect(() => {
    if (!needsAvatarFetch) return;
    
    let mounted = true;
    (async () => {
      try {
        const u = await api.getUser(post.user.id);
        if (mounted && u && u.avatarUrl) {
          setPost(p => ({ ...p, user: { ...p.user, avatarUrl: u.avatarUrl, displayName: u.displayName ?? p.user.displayName ?? p.user.username } }));
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [needsAvatarFetch, post.user?.id]);

  return { post, setPost };
}
