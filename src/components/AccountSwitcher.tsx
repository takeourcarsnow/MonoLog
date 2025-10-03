/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { api, getSupabaseClient } from "@/lib/api";
import type { User } from "@/lib/types";
import { useRouter } from "next/navigation";

export function AccountSwitcher() {
  // use `undefined` as the initial state to represent "loading" so the
  // UI doesn't prematurely render the unauthenticated variant while we
  // probe the client-side auth state (fixes refresh/hydration flicker).
  const [me, setMe] = useState<User | null | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    // Helper: wait briefly for the runtime injection of SUPABASE keys if
    // present. Some race conditions on hard refresh (client code runs before
    // the injected script) can cause `getSupabaseClient()` to throw — mirror
    // the defensive wait logic used elsewhere in the codebase.
    const waitForRuntime = async (timeout = 1000, interval = 100) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if ((window as any).__MONOLOG_RUNTIME_SUPABASE__) return;
        // small delay
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, interval));
      }
    };

    (async () => {
      try {
        // If runtime keys are not present yet, wait a short while for the
        // injected script in `app/layout.tsx` to run. This avoids a false
        // negative (null) when the client-side Supabase client cannot be
        // created immediately on first paint.
        if (typeof window !== 'undefined' && !(window as any).__MONOLOG_RUNTIME_SUPABASE__) {
          await waitForRuntime(1000, 80);
        }
      } catch (e) {
        // ignore wait failures and continue to call the API
      }
      if (!mounted) return;
      try {
        // Try API once, then attempt a small fallback when null is returned to
        // handle races where the Supabase client/session hasn't fully hydrated.
        let u = await api.getCurrentUser();
        if (!mounted) return;
        // If api returned null but runtime keys exist, try a direct auth probe
        // on the Supabase client and retry once. This helps when session data
        // is present but the higher-level adapter hasn't finished initializing.
        if (!u && typeof window !== 'undefined' && (window as any).__MONOLOG_RUNTIME_SUPABASE__) {
          try {
            const sb = getSupabaseClient();
            // Prefer getSession if available; fall back to getUser.
            let authRes: any = null;
            try { authRes = await sb.auth.getSession(); } catch (_) { /* ignore */ }
            if (!authRes || !authRes.data || !authRes.data.session) {
              try { authRes = await sb.auth.getUser(); } catch (_) { /* ignore */ }
            }
            const maybeUser = authRes?.data?.user || authRes?.user || null;
            if (maybeUser) {
              // re-call through API (which may synthesize profile) once more
              u = await api.getCurrentUser();
            }
          } catch (e) {
            // ignore fallback errors and continue to set null/unauth view below
          }
        }
        setMe(u);
      } catch (e) {
        // On error, set to null so UI falls back to unauthenticated view.
        if (mounted) setMe(null);
      }
    })();
    const onAuth = async () => {
      setMe(await api.getCurrentUser());
    };
    window.addEventListener("auth:changed", onAuth);
    return () => { mounted = false; window.removeEventListener("auth:changed", onAuth); };
  }, []);

  const current = me;

  return (
    <div className="account-switcher" style={{ position: "relative" }}>
      <button
        className="btn"
        onClick={() => {
          // When still probing session state, do nothing on click to avoid
          // opening the auth modal while the client is initializing.
          if (me === undefined) return;
          if (current) {
            // Navigate to username route instead of /profile
            if (current.username) {
              return router.push(`/${current.username}`);
            } else if (current.id) {
              return router.push(`/${current.id}`);
            } else {
              return router.push("/profile");
            }
          }
          // Blur active element first to dismiss native suggestion/autocomplete
          try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {}
          // When not signed in, go to the profile page which hosts the auth form
          router.push('/profile');
        }}
        aria-label="Open profile"
      >
        {me === undefined ? (
          // small skeleton to avoid layout shift and to indicate loading
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }} aria-hidden>
            <span style={{ width: 22, height: 22, borderRadius: 999, background: 'rgba(255,255,255,0.06)', display: 'inline-block' }} />
            <span style={{ width: 64, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.04)', display: 'inline-block' }} />
          </span>
        ) : current ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <img src={current.avatarUrl} alt={current.displayName || 'Account avatar'} className="avatar" style={{ width: 22, height: 22 }} />
            <span>@{current.username || current.id}</span>
          </span>
        ) : (
          // show a user icon instead of the text "Account" when unauthenticated
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
        )}
      </button>

      
    </div>
  );
}