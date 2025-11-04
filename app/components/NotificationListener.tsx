import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/api";

export function NotificationListener() {
  // No-op: Toasts and active client notifications are removed.
  useEffect(() => {
    // Preserve and clean up previous event wiring if reintroduced later.
    const handleAuth = () => {};
    if (typeof window !== 'undefined') {
      window.addEventListener('auth:changed', handleAuth);
      // Expose debug helpers for notifications to aid troubleshooting
      try {
        const sb = getSupabaseClient();
        (window as any).monologNotifDebug = {
          async token() {
            const { data } = await sb.auth.getSession();
            return data?.session?.access_token || null;
          },
          async checkUnread() {
            try {
              const t = await (this as any).token();
              const resp = await fetch('/api/notifications/unread-count', { headers: t ? { Authorization: `Bearer ${t}` } : {} });
              const json = await resp.json();
              console.log('[notifDebug] unread-count status', resp.status, json);
              return json;
            } catch (e) {
              console.error('[notifDebug] checkUnread error', e);
              return null;
            }
          },
          async markAll() {
            try {
              const t = await (this as any).token();
              const resp = await fetch('/api/notifications/mark-all-read', { method: 'POST', headers: t ? { Authorization: `Bearer ${t}` } : {} });
              const json = await resp.json().catch(() => ({}));
              console.log('[notifDebug] mark-all-read status', resp.status, json);
              return json;
            } catch (e) {
              console.error('[notifDebug] markAll error', e);
              return null;
            }
          },
          async list(limit = 20) {
            try {
              const t = await (this as any).token();
              const resp = await fetch('/api/notifications/list', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify({ limit }) });
              const json = await resp.json();
              if (Array.isArray(json?.notifications)) {
                const stats = json.notifications.reduce((acc: any, n: any) => { const r = n.read === true; acc.total++; acc[r ? 'read' : 'unread']++; return acc; }, { total: 0, read: 0, unread: 0 });
                console.log('[notifDebug] list stats', stats);
                console.table(json.notifications.map((n: any) => ({ id: n.id, read: n.read === true, created_at: n.created_at, type: n.type })));
              } else {
                console.log('[notifDebug] list raw', json);
              }
              return json;
            } catch (e) {
              console.error('[notifDebug] list error', e);
              return null;
            }
          }
        };
      } catch (e) { /* ignore debug hook errors */ }
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:changed', handleAuth);
        try { delete (window as any).monologNotifDebug; } catch (_) {}
      }
    };
  }, []);
  return null;
}
