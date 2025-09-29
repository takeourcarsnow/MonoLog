"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/api/supabase";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

export function AuthForm({ onClose }: { onClose?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const router = useRouter();
  const toast = useToast();

  async function submit(e?: any) {
    e?.preventDefault();
    setLoading(true);
    try {
      const sb = getSupabaseClient();
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        // when signing up, create a users profile row
        const userId = (data as any)?.user?.id;
        if (userId) {
          await sb.from("users").upsert({ id: userId, username: email.split("@")[0], displayName: email.split("@")[0], avatarUrl: "" });
        }
      }
      // close modal and refresh
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

      <div className="auth-actions">
        <button className="btn" disabled={loading} onClick={submit} type="button">{loading ? "…" : mode === "signin" ? "Sign in" : "Sign up"}</button>
        <button type="button" className="btn ghost" onClick={() => { onClose?.(); }}>{loading ? ".." : "Cancel"}</button>
      </div>
    </form>
  );
}

