"use client";

import { useEffect, useRef } from "react";
import { api } from "@/src/lib/api";
import { getClient, getAccessToken } from '@/src/lib/api/client';
import { useToast } from "./Toast";

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
          // Only notify for comment and thread reply notifications
          if (n.type === 'comment') {
            toast.show(`${n.actor_id ? '@' + (n.actor_id.slice(0,6)) : 'Someone'} commented on your post`);
            newOnes.push(n.id as string);
          } else if (n.type === 'thread_reply') {
            toast.show(`${n.actor_id ? '@' + (n.actor_id.slice(0,6)) : 'Someone'} replied to your thread`);
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
