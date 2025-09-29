"use client";

import { useState, useRef, useEffect } from "react";
import { getSupabaseClient } from "@/lib/api/supabase";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

export function AuthForm({ onClose }: { onClose?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [signupSent, setSignupSent] = useState(false);
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    try {
      const sb = getSupabaseClient();
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
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
          // PGRST116 is PostgREST "result contains no rows" error code sometimes surfaced; be defensive
        }
        if (existing) {
          throw new Error("That username is already taken. Please choose another.");
        }

        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        // when signing up, create a users profile row with chosen username
        const userId = (data as any)?.user?.id;
        if (userId) {
          // create a profile row (best-effort)
          try {
            await sb.from("users").upsert({ id: userId, username: chosen, display_name: chosen, avatar_url: "" });
          } catch (e) { /* ignore upsert errors for now */ }
        }
        // indicate that a confirmation email (or magic link) was sent
        setSignupSent(true);
        toast.show("Check your email to confirm your account. After confirming, sign in.");
        // switch to sign-in mode so the user can immediately try signing in after confirmation
        setMode("signin");
        // don't auto-close the modal or refresh the app here; wait for user to confirm via email
        return;
      }
      // close modal and refresh (only for sign-in flow)
      onClose?.();
      router.refresh();
      try { window.dispatchEvent(new CustomEvent('auth:changed')); } catch (e) { /* ignore */ }
    } catch (err: any) {
      toast.show(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="auth-form space-y-4" aria-label="Sign in or sign up">
      <div ref={containerRef} className="auth-toggle relative bg-transparent rounded-full p-2" role="tablist" aria-label="Auth mode">
        {/* sliding active indicator - positioned using measured left/width so it aligns with the buttons */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 4,
            height: 'calc(100% - 8px)',
            left: indicator.left,
            width: indicator.width,
            borderRadius: 999,
            transition: 'left 200ms ease, width 200ms ease',
            background: 'var(--auth-toggle-indicator)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'inline-flex', gap: 8 }}>
          <button
            ref={btnSigninRef}
            type="button"
            className={`btn relative z-10 ${mode === "signin" ? "active" : ""}`}
            onClick={() => setMode("signin")}
            aria-pressed={mode === "signin"}
          >
            Sign in
          </button>
          <button
            ref={btnSignupRef}
            type="button"
            className={`btn relative z-10 ${mode === "signup" ? "active" : ""}`}
            onClick={() => setMode("signup")}
            aria-pressed={mode === "signup"}
          >
            Sign up
          </button>
        </div>
      </div>

      <input
        className="input transition-shadow duration-150 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.06)]"
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
        className="input transition-shadow duration-150 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.06)]"
        placeholder="Password"
        type="password"
        value={password}
        name="password"
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        onChange={e => setPassword(e.target.value)}
        aria-label="Password"
      />

      {/* animated username field when signing up */}
      <div className={`transition-all duration-200 ${mode === "signup" ? "opacity-100 max-h-40" : "opacity-0 max-h-0"}`} aria-hidden={mode !== "signup"}>
        <div className="relative">
          <input
            className="input pr-10 transition-shadow duration-150 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.06)]"
            placeholder="Choose a username (3-32 chars)"
            value={username}
            name="username"
            autoComplete="username"
            onChange={e => setUsername(e.target.value)}
            aria-describedby="username-help"
            aria-invalid={username ? !isUsernameValid : undefined}
          />
          {/* live validity indicator */}
          <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
            <svg
              className={`w-5 h-5 transition-transform duration-150 ${isUsernameValid ? 'opacity-100 scale-100 text-green-400' : (username ? 'opacity-60 scale-95 text-rose-400' : 'opacity-0 scale-75')}`}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div id="username-help" className="dim mt-2 transition-opacity duration-200" aria-live="polite">
          Pick a short unique username. Lowercase letters, numbers, &apos;-&apos; and &apos;_&apos; only.
        </div>
      </div>

      <div className="auth-actions flex gap-3">
        <button className="btn primary" disabled={loading} type="submit">{loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}</button>
        <button type="button" className="btn ghost" onClick={() => { onClose?.(); }} aria-label="Cancel and close">{loading ? ".." : "Cancel"}</button>
      </div>

      <div className={`transition-opacity duration-200 ${signupSent ? 'opacity-100' : 'opacity-0'}`} aria-live="polite">
        {signupSent ? (
          <div className="card" style={{ padding: 10, background: "transparent", border: "1px dashed var(--border)", marginTop: 8 }}>
            <strong>Check your email</strong>
            <div className="dim">A confirmation message has been sent to <em>{email}</em>. Please confirm your address before signing in.</div>
          </div>
        ) : null}
      </div>
    </form>
  );
}

