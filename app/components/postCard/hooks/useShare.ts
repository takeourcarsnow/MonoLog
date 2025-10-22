import { useToast } from "../../Toast";

export function useShare(post: { id: string; user: { username?: string; id: string; displayName?: string }; caption?: string }) {
  const toast = useToast();

  const sharePost = async () => {
    const url = `${(typeof window !== 'undefined' ? window.location.origin : '')}/post/${post.user.username || post.user.id}-${post.id.slice(0,8)}`;
  const title = `${post.user.displayName ?? post.user.username ?? post.user.id}'s MonoLog`;
    const text = post.caption ? post.caption : 'Check out this MonoLog photo';
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title, text, url });
        return;
      }
    } catch (e) {
      // fallback to copy
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.show('Link copied');
      } else {
        // fallback: temporary input
        const tmp = document.createElement('input');
        tmp.value = url;
        document.body.appendChild(tmp);
        tmp.select();
        try { document.execCommand('copy'); toast.show('Link copied'); } catch (_) { /* ignore */ }
        document.body.removeChild(tmp);
      }
    } catch (e:any) {
      if (e?.message?.includes('document is not focused')) {
        toast.show('Link not copied - window lost focus');
      } else {
        toast.show(e?.message || 'Failed to share');
      }
    }
  };

  return { sharePost };
}
