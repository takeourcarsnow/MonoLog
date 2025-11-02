export function useShare(post: { id: string; user: { username?: string; id: string; displayName?: string }; caption?: string }) {
  const sharePost = async () => {
    const url = `${(typeof window !== 'undefined' ? window.location.origin : '')}/post/${post.user.username || post.user.id}-${post.id.slice(0,8)}`;
    try {
      await navigator.clipboard.writeText(url);
      console.info('Link copied');
      return true;
    } catch (e) {
      console.warn('Failed to copy link', e);
      return false;
    }
  };

  return { sharePost };
}
