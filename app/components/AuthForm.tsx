"use client";

import { useState, useRef, useEffect } from "react";
import { getSupabaseClient } from "@/src/lib/api/supabase";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import './AuthConfirmButton.css';

export function AuthForm({ onClose }: { onClose?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [signupSent, setSignupSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasSuccess, setHasSuccess] = useState(false);
  const [justSignedIn, setJustSignedIn] = useState(false);
  // Inline rate-limit notice removed; use toasts only for rate-limit feedback
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const router = useRouter();
  const toast = useToast();
  const [headerNotice, setHeaderNotice] = useState<{ title: string; subtitle?: string; variant?: 'info'|'warn'|'error'|'success' } | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const [headerNoticePhase, setHeaderNoticePhase] = useState<'enter'|'exit'>('enter');

  function showHeaderNotice(payload: { title: string; subtitle?: string; variant?: 'info'|'warn'|'error'|'success' }, ttl = 4000) {
    // clear existing timers
    try { if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current); } catch (_) {}
    try { if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current); } catch (_) {}

    const exitDuration = 420; // match CSS exit animation duration

    if (headerNotice) {
      // If a notice is already visible, play its exit animation first,
      // then set the new payload and play enter. This avoids instant swap.
      setHeaderNoticePhase('exit');
      exitTimerRef.current = window.setTimeout(() => {
        // replace the notice and restart the lifecycle
        setHeaderNotice(payload);
        setHeaderNoticePhase('enter');
        // schedule removal after ttl
        noticeTimerRef.current = window.setTimeout(() => {
          setHeaderNoticePhase('exit');
          exitTimerRef.current = window.setTimeout(() => {
            setHeaderNotice(null);
            exitTimerRef.current = null;
          }, exitDuration) as unknown as number;
          noticeTimerRef.current = null;
        }, ttl) as unknown as number;
        exitTimerRef.current = null;
      }, exitDuration) as unknown as number;
      return;
    }

    // No existing notice: show immediately and schedule exit
    setHeaderNotice(payload);
    setHeaderNoticePhase('enter');
    // schedule exit -> removal so we get the exit animation to run
    noticeTimerRef.current = window.setTimeout(() => {
      // trigger exit phase
      setHeaderNoticePhase('exit');
      exitTimerRef.current = window.setTimeout(() => {
        setHeaderNotice(null);
        exitTimerRef.current = null;
      }, exitDuration) as unknown as number;
      noticeTimerRef.current = null;
    }, ttl) as unknown as number;
  }

  const isUsernameValid = validUsername(username || "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const btnSigninRef = useRef<HTMLButtonElement | null>(null);
  const btnSignupRef = useRef<HTMLButtonElement | null>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    function measure() {
      const c = containerRef.current;
      const a = btnSigninRef.current;
      const b = btnSignupRef.current;
      if (!c || !a || !b) return;
      const crect = c.getBoundingClientRect();
      const arect = a.getBoundingClientRect();
      const brect = b.getBoundingClientRect();
      const leftA = Math.round(arect.left - crect.left);
      const leftB = Math.round(brect.left - crect.left);
      const widthA = Math.round(arect.width);
      const widthB = Math.round(brect.width);
      setIndicator(mode === 'signin' ? { left: leftA, width: widthA } : { left: leftB, width: widthB });
    }
    measure();
    window.addEventListener('resize', measure);
    // watch for font/load/layout changes
    const ro = new ResizeObserver(() => measure());
    if (containerRef.current) ro.observe(containerRef.current);
    if (btnSigninRef.current) ro.observe(btnSigninRef.current);
    if (btnSignupRef.current) ro.observe(btnSignupRef.current);
    // also ensure we re-measure when DOM subtree mutates
    const mo = new MutationObserver(measure);
    if (containerRef.current) mo.observe(containerRef.current, { childList: true, subtree: true, attributes: true });
    return () => { window.removeEventListener('resize', measure); ro.disconnect(); mo.disconnect(); };
  }, [mode]);

  // basic client-side username validation
  function normalizeUsername(v: string) {
    return v.trim().toLowerCase();
  }

  function validUsername(v: string) {
    const s = normalizeUsername(v);
    return /^[a-z0-9_-]{3,32}$/.test(s);
  }

  async function submit(e?: any) {
    e?.preventDefault();
    const start = Date.now();
    const MIN_MS = 2000; /* minimum time to show loading animation (ms) */
    setLoading(true);

    let shouldCloseAndRefresh = false;
    try {
      const sb = getSupabaseClient();
      if (mode === "signin") {
        // Use server-side sign-in proxy which accepts identifier (username or email)
        // and password, resolves the email server-side, and returns a session
        // object. This keeps emails private and avoids client-side lookups.
        try {
          const resp = await fetch('/api/auth/signin-proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: email, password }) });
          if (!resp.ok) {
            const body = await resp.json().catch(() => ({}));
            throw new Error(body?.error || `Sign-in failed (${resp.status})`);
          }
          const body = await resp.json();
          const session = body?.data?.session ?? body?.data ?? null;
          if (!session || !session.access_token) {
            throw new Error('Sign-in failed: no session returned');
          }
          // Set the supabase client session on the browser so SB client knows user is signed in
          try {
            await sb.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
          } catch (e) {
            // If setting session fails, still treat as auth failure
            throw new Error('Failed to establish client session after sign-in');
          }
        } catch (e) {
          throw e;
        }

        // Ensure the user's profile row exists in the users table (fire-and-forget)
        (async () => {
          try {
            const get = await sb.auth.getUser();
            const u = (get as any)?.data?.user;
            if (u) {
              const { data: existing } = await sb.from('users').select('id').eq('id', u.id).limit(1).maybeSingle();
              if (!existing) {
                const synthUsername = u.user_metadata?.username || (u.email ? u.email.split('@')[0] : u.id);
                const synthDisplay = u.user_metadata?.name || synthUsername;
                try {
                  await sb.from('users').insert({ id: u.id, username: synthUsername, display_name: synthDisplay, avatar_url: '/logo.svg' });
                } catch (e) { /* ignore */ }
              }
            }
          } catch (e) { /* ignore background errors */ }
        })();

  // mark that we should close/refresh after ensuring the minimum animation time
  shouldCloseAndRefresh = true;
  setHasSuccess(true);
  // briefly show a 'Signed in' state before closing/refreshing
  setJustSignedIn(true);
      } else {
        // Client-side validation before contacting server
        const emailOk = typeof email === 'string' && /\S+@\S+\.\S+/.test(email);
        if (!emailOk) {
          // keep message generic but actionable for user-correctable problems
          setLoading(false);
          showHeaderNotice({ title: 'Invalid email', subtitle: 'Please enter a valid email address.', variant: 'warn' }, 4000);
          return;
        }
        if (!password || password.length < 8) {
          setLoading(false);
          showHeaderNotice({ title: 'Password too short', subtitle: 'Password must be at least 8 characters.', variant: 'warn' }, 4500);
          return;
        }

        // require explicit username for signup (do NOT auto-derive from email)
        if (!username || !username.trim()) {
          setLoading(false);
          showHeaderNotice({ title: 'Enter a username', subtitle: 'Please choose a username to continue.', variant: 'warn' }, 4500);
          return;
        }
        const chosen = normalizeUsername(username);
        if (!validUsername(chosen)) {
          setLoading(false);
          showHeaderNotice({ title: 'Username too short', subtitle: "3–32 chars; letters, numbers, '-' or '_'.", variant: 'warn' }, 4500);
          return;
        }

        // check username availability
        const { data: existing, error: exErr } = await sb.from("users").select("id").eq("username", chosen).limit(1).maybeSingle();
        if (exErr) {
          // If checking availability failed for other reasons, surface a generic inability message
          setLoading(false);
          showHeaderNotice({ title: 'Unable to check username', subtitle: 'Try again in a moment.', variant: 'warn' }, 4000);
          return;
        }
        if (existing) {
          setLoading(false);
          showHeaderNotice({ title: 'That username is taken', subtitle: 'Please choose another username.', variant: 'warn' }, 4500);
          return;
        }

        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username: chosen, name: chosen } } });
        if (error) throw error;
        // when signing up, only create a users profile row client-side if the
        // signup returned an active session (some flows require email
        // confirmation and don't provide a session; in that case the client
        // is still anon and RLS will block INSERTs). If no session is present
        // skip creation here and rely on the sign-in flow to create the row.
        const userId = (data as any)?.user?.id;
        const sessionPresent = (data as any)?.session ?? false;
        if (userId && sessionPresent) {
          try {
            await sb.from('users').upsert({ id: userId, username: chosen, display_name: chosen, avatar_url: "/logo.svg" });
          } catch (e) { /* ignore upsert errors for now */ }
        }
        // indicate that a confirmation email (or magic link) was sent
        setSignupSent(true);
        // switch to sign-in mode so the user can immediately try signing in after confirmation
        setMode("signin");
        // Delay the visible toast until the minimum loader time has elapsed so
        // the animation is not cut off. Compute remaining time from the same
        // `start` / `MIN_MS` used for the sign-in loading minimum.
        try {
          const elapsedSignup = Date.now() - start;
          const remainingSignup = Math.max(0, MIN_MS - elapsedSignup);
          if (remainingSignup > 0) await new Promise((res) => setTimeout(res, remainingSignup));
        } catch (_) {
          /* ignore timing errors */
        }
  // show an abstract confirmation in the auth header (do NOT mention the email address
  // or specific workflow so we avoid leaking account state). Keep message generic
  // to cover both new signups and cases where details were already registered.
  showHeaderNotice({ title: 'Next steps', subtitle: 'If the chosen details were accepted, we will email instructions to complete account setup.', variant: 'info' }, 4500);
        // Do not close/refresh for signup flow — let the user handle confirmation
        return;
      }
    } catch (err: any) {
      // Do NOT clear loading here; ensure the loader is visible for a
      // minimum time so the UI doesn't flash. The finally block will
      // wait the remaining MIN_MS then clear loading.
      setHasError(true);
      const raw = err?.message || String(err || 'An error occurred');
      const lower = String(raw).toLowerCase();

      // Preserve explicit server rate-limit messages: show in header as an error
      if (lower.includes('too many attempts') || lower.includes('rate limit') || lower.includes('temporarily blocked')) {
        showHeaderNotice({ title: 'Too many attempts', subtitle: raw, variant: 'error' }, 6000);
      } else if (mode === 'signin') {
        // Avoid leaking whether an account exists. Map common verbose
        // auth errors to a generic message for signin attempts.
        const signinLeakPatterns = [/user not found/i, /no user/i, /not found/i, /invalid login/i, /invalid credentials/i, /wrong password/i, /password.*incorrect/i, /cannot find user/i, /email not found/i];
        const matchesLeak = signinLeakPatterns.some((rx) => rx.test(raw));
        if (matchesLeak) {
          showHeaderNotice({ title: 'Invalid login credentials', variant: 'error' }, 3500);
        } else {
          // For other signin errors, show a generic invalid message in header
          showHeaderNotice({ title: 'Invalid login credentials', variant: 'error' }, 3500);
        }
    } else {
  // For signup or other flows, DO NOT surface raw server errors that may
  // reveal account state (for example "Email address ... is invalid").
  // Instead show a generic, abstract next-steps message so the UX is
  // consistent whether the details were accepted or already registered.
  // Also switch the UI to the sign-in mode so the user can attempt to sign in.
  try { setMode('signin'); } catch (_) {}
  showHeaderNotice({ title: 'Next steps', subtitle: 'If the chosen details were accepted, we will email instructions to complete account setup.', variant: 'info' }, 4000);
    }
    } finally {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_MS - elapsed);
      if (remaining > 0) {
        await new Promise((res) => setTimeout(res, remaining));
      }
      // Clear loading after the minimum display time has elapsed (regardless of success/failure)
      setLoading(false);
      setTimeout(() => setHasError(false), 2000);

      if (shouldCloseAndRefresh) {
        try {
          // Give the user a brief confirmation that they're signed in
          // before the app refreshes / modal closes.
          if (justSignedIn) {
            // Slightly longer linger so the flipped success message is perceived
            await new Promise((r) => setTimeout(r, 900));
          }
        } catch (_) { /* ignore timing errors */ }
        try { window.dispatchEvent(new CustomEvent('auth:changed')); } catch (e) { /* ignore */ }
        if (onClose) {
          try { await onClose(); } catch (_) { /* ignore */ }
        }
        try { router.refresh(); } catch (_) { /* ignore */ }
        setHasSuccess(false);
        setJustSignedIn(false);
      }
    }
  }

  // (No inline rate-limit notice; toasts handle feedback)

  // Clear header notice when user edits inputs
  useEffect(() => {
    if (headerNotice) setHeaderNotice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  // cleanup timers on unmount to avoid setState after unmount
  useEffect(() => {
    return () => {
      try { if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current); } catch (_) {}
      try { if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current); } catch (_) {}
    };
  }, []);

  const getMessage = () => {
    if (mode === "signin") {
      return {
        title: "Welcome back",
        subtitle: "Your memories are waiting"
      };
    } else {
      return {
        title: "Start your journey",
        subtitle: "One photo. One day. One story."
      };
    }
  };

  const message = getMessage();

  // Derive a single button state to simplify rendering and avoid mixed flags
  const buttonState: 'idle' | 'loading' | 'success' | 'error' | 'signup-sent' = (
    signupSent ? 'signup-sent' : (justSignedIn ? 'success' : (loading ? 'loading' : (hasError ? 'error' : 'idle')))
  );
  // Do not add a visual "error" class to the button on failure; keep error
  // state for inline messages/toasts but avoid turning the button red.
  const btnClass = `auth-confirm-btn ${loading ? 'loading' : ''} ${buttonState === 'signup-sent' || buttonState === 'success' ? 'sent' : ''} ${mode === 'signup' ? 'mode-signup' : 'mode-signin'}`;

  return (
    <form
      onSubmit={submit}
  className={`auth-form enhanced auth-form-tight mode-${mode}`}
      aria-label="Sign in or sign up"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center'
      }}
    >
      {/* Dynamic message or header notice (auth related) */}
      <div className="auth-header-area" aria-hidden={false}>
        {headerNotice ? (
          <div className={`auth-header-notice ${headerNoticePhase} ${headerNotice.variant || 'info'}`} role="status" aria-live="polite">
            <span className="notice-inner">
              <strong className="notice-title" style={{ fontSize: 20, display: 'block', marginBottom: 4, lineHeight: 1.15 }}>{headerNotice.title}</strong>
              {headerNotice.subtitle && <div className="notice-sub dim" style={{ fontSize: 13, lineHeight: 1.2 }}>{headerNotice.subtitle}</div>}
            </span>
          </div>
        ) : (
          <div
            key={mode}
            className="auth-message"
            style={{
              animation: 'fadeInSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <strong
              style={{
                fontSize: 20,
                display: 'block',
                marginBottom: 4,
                lineHeight: 1.15
              }}
            >
              {message.title}
            </strong>
            <div
              className="dim"
              style={{
                fontSize: 13,
                lineHeight: 1.2
              }}
            >
              {message.subtitle}
            </div>
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className="auth-toggle relative glow-wrap"
        role="tablist"
        aria-label="Auth mode"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {/* sliding active indicator */}
        <div
          aria-hidden
          className="auth-toggle-indicator"
          style={{ left: indicator.left, width: indicator.width }}
        />

        <div style={{ display: 'inline-flex', gap: 8, position: 'relative', zIndex: 5 }}>
          <button
            ref={btnSigninRef}
            type="button"
            className={`btn pill-switch ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => setMode('signin')}
            aria-pressed={mode === 'signin'}
          >
            <span className="btn-label">Sign in</span>
          </button>
          <button
            ref={btnSignupRef}
            type="button"
            className={`btn pill-switch ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => setMode('signup')}
            aria-pressed={mode === 'signup'}
          >
            <span className="btn-label">Sign up</span>
          </button>
        </div>
      </div>

      <div className="w-full flex flex-col gap-2 inputs-wrap" style={{ maxWidth: 400 }}>
        <div className="field-group flex flex-col gap-2 w-full">
          <input
            className="input fancy-input"
            placeholder="Email or username"
            value={email}
            name="email"
            autoComplete="email"
            inputMode="email"
            onChange={e => setEmail(e.target.value)}
            aria-label="Email or username"
            autoCorrect="off"
            autoCapitalize="none"
          />
          <input
            className="input fancy-input"
            placeholder="Password"
            type="password"
            value={password}
            name="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            onChange={e => setPassword(e.target.value)}
            aria-label="Password"
          />
          <div
            className={`username-wrap transition-all duration-300 ease-out ${mode === 'signup' ? 'open' : 'closed'}`}
            aria-hidden={mode !== 'signup'}
          >
            <div className="relative">
              <input
                className="input fancy-input pr-12"
                placeholder="Choose a username"
                value={username}
                name="username"
                autoComplete="username"
                onChange={e => setUsername(e.target.value)}
                aria-describedby="username-help"
                aria-invalid={username ? !isUsernameValid : undefined}
              />
              <div className="validity-indicator" aria-hidden>
                <svg
                  className={`check ${isUsernameValid ? 'ok' : (username ? 'pending' : '')}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div id="username-help" className="dim help" aria-live="polite">
              3–32 chars: lowercase letters, numbers, &apos;-&apos; or &apos;_&apos;.
            </div>
          </div>
        </div>
      </div>

        {/* Rate-limit inline notice removed — toasts are used instead */}

    <div className="auth-actions flex gap-1 justify-center w-full" style={{ maxWidth: 400 }}>
        <button
          className={btnClass}
          disabled={loading}
          type="submit"
          aria-busy={loading}
          aria-live="polite"
          aria-label={mode === 'signup' ? (loading ? 'Creating account' : 'Create account') : (loading ? 'Signing in' : 'Sign in')}
        >
          <span className="btn-inner">
            {buttonState === 'signup-sent' && (
              <span className="btn-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
            )}

            {buttonState === 'success' && (
              <span className="btn-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
            )}

              {/* absolute-centered loader so button width doesn't change */}
              <span className="btn-loader-wrapper" aria-hidden>
                {buttonState === 'loading' && (
                  <span className="btn-loading-dots" aria-hidden>
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </span>
                )}
              </span>

            <span
              className="btn-label"
              data-text={buttonState === 'success' ? 'Signed in' : (mode === 'signup' ? 'Create account' : 'Sign in')}
            >
              {buttonState === 'success' ? 'Signed in' : (mode === 'signup' ? 'Create account' : 'Sign in')}
            </span>
          </span>
          {/* visible hint for screen readers during loading */}
          {loading && <span className="sr-only">{mode === 'signup' ? 'Creating account' : 'Signing in'}</span>}
        </button>
      </div>

      {/* signup hint removed: headerNotice displays signup/confirmation messages to avoid duplication */}
    </form>
  );
}

