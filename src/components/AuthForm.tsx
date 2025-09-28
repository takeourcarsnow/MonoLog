"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/api/supabase";
import { useRouter } from "next/navigation";

export function AuthForm({ onClose }: { onClose?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const router = useRouter();

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
      alert(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 260 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className={`btn ${mode === "signin" ? "active" : ""}`} onClick={() => setMode("signin")}>Sign in</button>
        <button type="button" className={`btn ${mode === "signup" ? "active" : ""}`} onClick={() => setMode("signup")}>Sign up</button>
      </div>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" disabled={loading} onClick={submit}>{loading ? "..." : mode === "signin" ? "Sign in" : "Sign up"}</button>
        <button type="button" className="btn" onClick={() => { onClose?.(); }}>{loading ? ".." : "Cancel"}</button>
      </div>
    </form>
  );
}
