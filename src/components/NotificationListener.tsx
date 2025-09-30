"use client";

import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useToast } from "./Toast";

export function NotificationListener() {
  const toast = useToast();
  const seen = useRef<Record<string, true>>({});

  useEffect(() => {
    let mounted = true;
    let interval = 0 as any;

    async function poll() {
      try {
        const cur = await api.getCurrentUser();
        if (!cur) return;
        // call server list endpoint (best-effort; server may return empty array)
        const res = await fetch('/api/notifications/list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: cur.id }) });
        const json = await res.json();
        const notifs = json?.notifications || [];
        const newOnes: string[] = [];
        for (const n of notifs) {
          if (!n || !n.id) continue;
          // defensive: skip notifications already marked read
          if (n.read) continue;
          if (seen.current[n.id]) continue;
          // Only notify for comment notifications for now
          if (n.type === 'comment') {
            toast.show(`${n.actor_id ? '@' + (n.actor_id.slice(0,6)) : 'Someone'} commented on your post`);
            newOnes.push(n.id as string);
          }
          seen.current[n.id] = true;
        }
        if (newOnes.length) {
          // mark them read (best-effort)
          try {
            const mres = await fetch('/api/notifications/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: cur.id, ids: newOnes }) });
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

    // initial poll then interval
    (async () => { await poll(); if (!mounted) return; interval = setInterval(poll, 6000); })();
    return () => { mounted = false; clearInterval(interval); };
  }, [toast]);

  return null;
}
