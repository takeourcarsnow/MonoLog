import { useState, useEffect } from "react";
import type { HydratedPost } from "@/src/lib/types";
import { api } from "@/src/lib/api";

export function usePostState(initialPost: HydratedPost) {
  const [post, setPost] = useState<HydratedPost>(initialPost);

  // If the hydrated post doesn't include an avatarUrl (possible for older rows),
  // fetch the user's profile and fill it in so the avatar renders consistently
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!post.user?.avatarUrl) {
          const u = await api.getUser(post.user.id);
          if (mounted && u && u.avatarUrl) {
            setPost(p => ({ ...p, user: { ...p.user, avatarUrl: u.avatarUrl, displayName: u.displayName ?? p.user.displayName ?? p.user.username } }));
          }
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [post.user?.id, post.user?.avatarUrl]);

  return { post, setPost };
}
