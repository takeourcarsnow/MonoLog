/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { api, getSupabaseClient } from "@/src/lib/api";
import { OptimizedImage } from "@/app/components/OptimizedImage";
import type { User } from "@/src/lib/types";
import { useRouter } from "next/navigation";

export function AccountSwitcher() {
  // use `undefined` as the initial state to represent "loading" so the
  // UI doesn't prematurely render the unauthenticated variant while we
  // probe the client-side auth state (fixes refresh/hydration flicker).
  const [me, setMe] = useState<User | null | undefined>(undefined);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
  // Timer ref for auto-closing the focused reveal (used for touch/click reveal)
  const revealTimeoutRef = useRef<number | null>(null);

  // Ref to the account button so we can blur it programmatically when auto-closing
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Auto-close delay in milliseconds. Tweak as desired (2.5s chosen as a small delay).
  const AUTO_CLOSE_DELAY = 2500;

  // Sync avatar preload + root class for shell reservation. When signed in
  // we persist the avatar URL so the layout preload helper can use it; when
  // signed out we clear it and remove the class so the shell doesn't reserve
  // visible space.
  useEffect(() => {
    try {
      if (current && (current as User).avatarUrl) {
        try { localStorage.setItem('monolog_avatar_preload', (current as User).avatarUrl); } catch (e) {}
        try { (window as any).__MONOLOG_AVATAR_PRELOAD__ = (current as User).avatarUrl; } catch (e) {}
        try { document.documentElement.classList.add('has-account-switcher'); } catch (e) {}
      } else if (current === null) {
        // signed out
        try { localStorage.removeItem('monolog_avatar_preload'); } catch (e) {}
        try { delete (window as any).__MONOLOG_AVATAR_PRELOAD__; } catch (e) {}
        try { document.documentElement.classList.remove('has-account-switcher'); } catch (e) {}
      }
    } catch (e) {
      // ignore
    }
  }, [current]);

  return (
    <div className={`account-switcher ${isMounted ? 'mounted' : ''}`} style={{ position: "relative" }}>
      <button
        ref={btnRef}
        className="btn"
        onFocus={() => {
          // Start/refresh auto-close timer when button receives focus (click/tap on some devices).
          try { if (revealTimeoutRef.current) window.clearTimeout(revealTimeoutRef.current); } catch (_) {}
          try {
            // Prefer blurring the account button directly to ensure the reveal closes
            // even if the focused element isn't exactly document.activeElement.
            revealTimeoutRef.current = window.setTimeout(() => {
              try { btnRef.current?.blur(); } catch (_) {}
            }, AUTO_CLOSE_DELAY) as unknown as number;
          } catch (_) {}
        }}
        onBlur={() => {
          // Clear timer when focus leaves so we don't accidentally blur elsewhere.
          try { if (revealTimeoutRef.current) { window.clearTimeout(revealTimeoutRef.current); revealTimeoutRef.current = null; } } catch (_) {}
        }}
        onClick={() => {
          // When still probing session state, do nothing on click to avoid
          // opening the auth modal while the client is initializing.
          if (me === undefined) return;
          if (current) {
            // Prefer username, fall back to id, otherwise go to /profile
            const dest = current.username ? `/${current.username}` : (current.id ? `/${current.id}` : '/profile');
            return router.push(dest);
          }
          // Blur active element first to dismiss native suggestion/autocomplete
          try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {}
          // When not signed in, go to the profile page which hosts the auth form
          router.push('/profile');
        }}
        aria-label="Open profile"
      >
        {me === undefined ? (
          // small skeleton while loading to avoid layout shift until the
          // client auth check finishes. Once we determine signed-out (null)
          // the component will render nothing.
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }} aria-hidden>
            <span style={{ width: 32, height: 32, borderRadius: 999, background: 'rgba(255,255,255,0.06)', display: 'inline-block' }} />
          </span>
        ) : current ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {/* Avatar first in the DOM; CSS will use row-reverse so the avatar stays at the far right
                and the account name expands to the left pushing other header items. */}
            <OptimizedImage src={(current as User).avatarUrl} alt={(current as User).displayName || 'Account avatar'} className="avatar" width={32} height={32} />
            <span className="account-name" aria-hidden style={{ opacity: isMounted ? undefined : 0, maxWidth: isMounted ? undefined : 0 }}>
              {(current as User).username || (current as User).displayName || (current as User).id}
            </span>
          </span>
        ) : (
          // signed-out: render nothing so header shows no avatar placeholder
          null
        )}
      </button>

      
    </div>
  );
}

// Ensure any remaining timers are cleared when module is hot-reloaded or unmounted implicitly
(function cleanupGlobalRevealTimer() {
  // No-op placeholder; timers are component-scoped. This keeps the file explicit about cleanup.
})();
