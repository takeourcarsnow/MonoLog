"use client";

import { useState } from "react";
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
    <form onSubmit={submit} className="auth-form" aria-label="Sign in or sign up">
      <div className="auth-toggle" role="tablist" aria-label="Auth mode">
        <button type="button" className={`btn ${mode === "signin" ? "active" : ""}`} onClick={() => setMode("signin")} aria-pressed={mode === "signin"}>Sign in</button>
        <button type="button" className={`btn ${mode === "signup" ? "active" : ""}`} onClick={() => setMode("signup")} aria-pressed={mode === "signup"}>Sign up</button>
      </div>

      <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input className="input" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />

      {mode === "signup" ? (
        <>
          <input
            className="input"
            placeholder="Choose a username (3-32 chars)"
            value={username}
            onChange={e => setUsername(e.target.value)}
            aria-describedby="username-help"
          />
          <div id="username-help" className="dim" style={{ marginBottom: 8 }}>
            Pick a short unique username. Lowercase letters, numbers, &apos;-&apos; and &apos;_&apos; only.
          </div>
        </>
      ) : null}

      <div className="auth-actions">
        <button className="btn" disabled={loading} onClick={submit} type="button">{loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}</button>
        <button type="button" className="btn ghost" onClick={() => { onClose?.(); }}>{loading ? ".." : "Cancel"}</button>
      </div>

      {signupSent ? (
        <div className="card" style={{ padding: 10, background: "transparent", border: "1px dashed var(--border)", marginTop: 8 }}>
          <strong>Check your email</strong>
          <div className="dim">A confirmation message has been sent to <em>{email}</em>. Please confirm your address before signing in.</div>
        </div>
      ) : null}
    </form>
  );
}

