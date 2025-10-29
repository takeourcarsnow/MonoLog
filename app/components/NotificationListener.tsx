import { useEffect, useRef } from "react";
import { api } from "@/src/lib/api";
import { getClient, getAccessToken } from '@/src/lib/api/client';
import { useToast } from "./Toast";
import { getPost } from '@/src/lib/api/posts/post';
import { getThread } from '@/src/lib/api/communities/threads';
import { getUser } from '@/src/lib/api/users';

export function NotificationListener() {
  const toast = useToast();
  const seen = useRef<Record<string, true>>({});

  useEffect(() => {
    let mounted = true;

    function isHardReload() {
      try {
        // Preferred modern API: check the most recent navigation entry
        const navEntries = performance.getEntriesByType && performance.getEntriesByType('navigation');
        if (navEntries && navEntries.length) {
          const last = navEntries[navEntries.length - 1] as PerformanceNavigationTiming;
          return last.type === 'reload';
        }
        // Fallback to deprecated API (0=navigate, 1=reload, 2=back_forward)
        // @ts-ignore
        if (performance && (performance as any).navigation && typeof (performance as any).navigation.type === 'number') {
          // 1 => reload
          return (performance as any).navigation.type === 1;
        }
      } catch (e) {
        // ignore
      }
      return false;
    }

    // Run check if this is the first time this tab loaded the app OR if it's a hard reload.
    // This prevents running on client-side (SPA) navigation.
    try {
      const key = 'monolog:notifications_checked';
      const already = sessionStorage.getItem(key);
      const shouldRun = !already || isHardReload();
      if (!shouldRun) return;

      // Mark as checked for this tab/session (will persist across SPA navs). If
      // it's a hard reload, isHardReload() will be true and we'll still run.
      sessionStorage.setItem(key, String(Date.now()));
    } catch (e) {
      // ignore sessionStorage errors and fall through to run once
    }

  async function poll() {
      try {
        const cur = await api.getCurrentUser();
        if (!cur) return;
  // call server list endpoint (best-effort; server may return empty array)
  const sb = getClient();
  const token = await getAccessToken(sb);
  const res = await fetch('/api/notifications/list', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({}) });
        const json = await res.json();
        const notifs = json?.notifications || [];
        const newOnes: string[] = [];
        for (const n of notifs) {
          if (!n || !n.id) continue;
          // defensive: skip notifications already marked read
          if (n.read) continue;
          if (seen.current[n.id]) continue;
          // Only notify for comment, thread reply, follow, and favorite notifications
          if (n.type === 'comment') {
            // Try to fetch post metadata to build a friendly href and determine message
            let href: string | undefined = undefined;
            let isOnYourPost = false;
            try {
              if (n.post_id) {
                const p = await getPost(n.post_id as string);
                if (p && p.user && (p.user.username || p.user.id)) {
                  const userPiece = p.user.username || p.user.id;
                  href = `/post/${userPiece}-${p.id.slice(0,8)}`;
                  if (p.user.id === cur.id) {
                    isOnYourPost = true;
                  }
                } else {
                  // fallback to using id only (Post page can resolve by id)
                  href = `/post/${p?.id || (n.post_id as string)}`;
                }
              }
            } catch (e) {
              // ignore post fetch errors
            }
            // Fetch actor username
            let actorUsername = 'Someone';
            try {
              if (n.actor_id) {
                const actor = await getUser(n.actor_id as string);
                if (actor && actor.username) {
                  actorUsername = '@' + actor.username;
                }
              }
            } catch (e) {
              // ignore user fetch errors
            }
            const message = isOnYourPost ? `${actorUsername} commented on your post` : `${actorUsername} commented on a post you commented on`;
            toast.show({ message, href });
            newOnes.push(n.id as string);
          } else if (n.type === 'thread_reply') {
            let href: string | undefined = undefined;
            try {
              if (n.thread_id) {
                const t = await getThread(n.thread_id as string);
                if (t && t.community && t.slug) {
                  // community.slug may not be available from the client helper; use id as stable fallback.
                  const communityPiece = (t.community as any).slug || t.community.id || t.community.name || '';
                  href = `/communities/${communityPiece}/thread/${t.slug}`;
                } else if (t && t.id) {
                  // Fallback: thread view can fetch by id if slug lookup fails in client APIs
                  const communityPiece = (t.community as any)?.slug || (t.community as any)?.id || '';
                  href = `/communities/${communityPiece}/thread/${t.slug || t.id}`;
                }
              }
            } catch (e) {
              // ignore thread fetch errors
            }
            // Fetch actor username
            let actorUsername = 'Someone';
            try {
              if (n.actor_id) {
                const actor = await getUser(n.actor_id as string);
                if (actor && actor.username) {
                  actorUsername = '@' + actor.username;
                }
              }
            } catch (e) {
              // ignore user fetch errors
            }
            toast.show({ message: `${actorUsername} replied to your thread`, href });
            newOnes.push(n.id as string);
          } else if (n.type === 'follow') {
            // Fetch actor username
            let actorUsername = 'Someone';
            try {
              if (n.actor_id) {
                const actor = await getUser(n.actor_id as string);
                if (actor && actor.username) {
                  actorUsername = '@' + actor.username;
                }
              }
            } catch (e) {
              // ignore user fetch errors
            }
            toast.show(`${actorUsername} followed you`);
            newOnes.push(n.id as string);
          } else if (n.type === 'favorite') {
            let href: string | undefined = undefined;
            try {
              if (n.post_id) {
                const p2 = await getPost(n.post_id as string);
                if (p2 && p2.user) {
                  const userPiece = p2.user.username || p2.user.id;
                  href = `/post/${userPiece}-${p2.id.slice(0,8)}`;
                } else {
                  href = `/post/${p2?.id || (n.post_id as string)}`;
                }
              }
            } catch (e) {
              // ignore
            }
            // Fetch actor username
            let actorUsername = 'Someone';
            try {
              if (n.actor_id) {
                const actor = await getUser(n.actor_id as string);
                if (actor && actor.username) {
                  actorUsername = '@' + actor.username;
                }
              }
            } catch (e) {
              // ignore user fetch errors
            }
            toast.show({ message: `${actorUsername} favorited your post`, href });
            newOnes.push(n.id as string);
          }
          seen.current[n.id] = true;
        }
        if (newOnes.length) {
          // mark them read (best-effort)
          try {
            const sb2 = getClient();
            const token2 = await getAccessToken(sb2);
            const mres = await fetch('/api/notifications/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token2 ? { Authorization: `Bearer ${token2}` } : {}) }, body: JSON.stringify({ ids: newOnes }) });
            // if server didn't accept, clear seen to try again later
            if (!mres.ok) {
              for (const id of newOnes) delete seen.current[id];
            }
          } catch (e) {
            for (const id of newOnes) delete seen.current[id];
          }
        }
      } catch (e) {
        console.error('[NotificationListener] Poll error:', e);
        // ignore polling errors
      }
    }
    // Run a single check on mount (no polling)
    (async () => { await poll(); })();

    // Also listen for auth changes (login/logout). When the user logs in we
    // should run the notification check even if sessionStorage was previously
    // marked, because login may have happened after the first check.
    const handleAuth = () => {
      // Run poll once when auth changes; don't alter sessionStorage here so we
      // still avoid re-checks from SPA routes.
      (async () => { try { await poll(); } catch (_) {} })();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('auth:changed', handleAuth);
    }

    return () => { mounted = false; if (typeof window !== 'undefined') window.removeEventListener('auth:changed', handleAuth); };
  }, [toast]);

  return null;
}
