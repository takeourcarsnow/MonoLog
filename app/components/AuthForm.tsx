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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const router = useRouter();
  const toast = useToast();

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
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;

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
      } else {
        // require username for signup
        const chosen = normalizeUsername(username || email.split("@")[0]);
        if (!validUsername(chosen)) {
          throw new Error("Username must be 3-32 characters and only contain letters, numbers, '-' or '_'.");
        }

        // check username availability
        const { data: existing, error: exErr } = await sb.from("users").select("id").eq("username", chosen).limit(1).single();
        if (exErr && (exErr as any).code !== "PGRST116") {
          // ignore not found (single returns error when no row), but propagate other errors
        }
        if (existing) {
          throw new Error("That username is already taken. Please choose another.");
        }

        const { data, error } = await sb.auth.signUp({ email, password });
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
        toast.show("Check your email to confirm your account. After confirming, sign in.");
        // Do not close/refresh for signup flow — let the user handle confirmation
        return;
      }
    } catch (err: any) {
      setLoading(false);
      setHasError(true);
      toast.show(err?.message || String(err));
    } finally {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_MS - elapsed);
      if (remaining > 0 && !hasError) {
        await new Promise((res) => setTimeout(res, remaining));
      }
      if (!hasError) {
        setLoading(false);
      }
      setTimeout(() => setHasError(false), 2000);

      if (shouldCloseAndRefresh) {
        try { window.dispatchEvent(new CustomEvent('auth:changed')); } catch (e) { /* ignore */ }
        if (onClose) {
          try { await onClose(); } catch (_) { /* ignore */ }
        }
        try { router.refresh(); } catch (_) { /* ignore */ }
        setHasSuccess(false);
      }
    }
  }

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
      {/* Dynamic message */}
      <div
        key={mode}
        className="auth-message"
        style={{
          marginBottom: '0.35rem',
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
            placeholder="Email"
            value={email}
            name="email"
            autoComplete="email"
            inputMode="email"
            onChange={e => setEmail(e.target.value)}
            aria-label="Email address"
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
              Lowercase letters, numbers, &apos;-&apos; and &apos;_&apos; (3-32 chars).
            </div>
          </div>
        </div>
      </div>

  <div className="auth-actions flex gap-1 justify-center w-full" style={{ maxWidth: 400 }}>
        <button
          className={`auth-confirm-btn ${loading ? 'loading' : ''} ${signupSent ? 'sent' : ''} ${hasError ? 'error' : ''} ${hasSuccess ? 'sent' : ''} ${mode === 'signup' ? 'mode-signup' : 'mode-signin'}`}
          disabled={loading}
          type="submit"
          aria-busy={loading}
          aria-live="polite"
          aria-label={mode === 'signup' ? (loading ? 'Creating account' : 'Create account') : (loading ? 'Signing in' : 'Sign in')}
        >
          <span className="btn-inner">
            {signupSent ? (
              <span className="btn-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
            ) : loading ? (
              <span className="btn-icon" aria-hidden>
                <span className="btn-spinner" aria-hidden>
                  <span />
                </span>
              </span>
            ) : null}
            <span className="btn-label">{mode === 'signin' ? 'Sign in' : 'Create account'}</span>
          </span>
          {/* visible hint for screen readers during loading */}
          {loading && <span className="sr-only">{mode === 'signup' ? 'Creating account' : 'Signing in'}</span>}
        </button>
      </div>

      <div className={`signup-hint transition-opacity duration-300 ${signupSent ? 'opacity-100' : 'opacity-0'}`} aria-live="polite">
        {signupSent && (
          <div className="card minimal" style={{ padding: 14, background: 'transparent', border: '1px dashed var(--border)', marginTop: 4 }}>
            <strong style={{ display: 'block', marginBottom: 4 }}>Check your email</strong>
            <div className="dim" style={{ fontSize: 12 }}>A confirmation link was sent to <em>{email}</em>. After confirming you can sign in.</div>
          </div>
        )}
      </div>
    </form>
  );
}

