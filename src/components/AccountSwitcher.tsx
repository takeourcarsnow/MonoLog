/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";

export function AccountSwitcher() {
  const [me, setMe] = useState<User | null>(null);
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    (async () => {
      setMe(await api.getCurrentUser());
    })();
    const onAuth = async () => {
      setShowAuth(false);
      setMe(await api.getCurrentUser());
    };
    window.addEventListener("auth:changed", onAuth);
    return () => { window.removeEventListener("auth:changed", onAuth); };
  }, []);

  const current = me;

  return (
    <div className="account-switcher" style={{ position: "relative" }}>
      <button
        className="btn"
        onClick={() => {
          if (current) return router.push("/profile");
          setShowAuth(true);
        }}
        aria-label="Open profile"
      >
        {current ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <img src={current.avatarUrl} alt="" className="avatar" style={{ width: 22, height: 22 }} />
            <span>{current.displayName}</span>
          </span>
        ) : "Account"}
      </button>

        {showAuth ? (
        <>
          <div
            className="auth-overlay"
            onClick={() => setShowAuth(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div
            className="auth-popover"
            style={{ position: "absolute", right: 0, marginTop: 8, zIndex: 50, background: "var(--bg)", padding: 12, borderRadius: 8, boxShadow: "0 6px 18px rgba(0,0,0,0.6)" }}
          >
            <AuthForm onClose={() => setShowAuth(false)} />
          </div>
        </>
      ) : null}
    </div>
  );
}