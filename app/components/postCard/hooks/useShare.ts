import { useToast } from "../../Toast";

export function useShare(post: { id: string; user: { username?: string; id: string; displayName?: string }; caption?: string }) {
  const toast = useToast();

  const sharePost = async () => {
    const url = `${(typeof window !== 'undefined' ? window.location.origin : '')}/post/${post.user.username || post.user.id}-${post.id.slice(0,8)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.show('Link copied');
    } catch (e) {
      toast.show('Failed to copy link');
    }
  };

  return { sharePost };
}
