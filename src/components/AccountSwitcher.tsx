"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { useRouter } from "next/navigation";
import { CONFIG } from "@/lib/config";
import dynamic from "next/dynamic";

const AuthForm = dynamic(() => import("./AuthForm").then(m => m.AuthForm), { ssr: false });

export function AccountSwitcher() {
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setUsers(await api.getUsers());
      setMe(await api.getCurrentUser());
    })();
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const current = me;

  return (
    <div className="account-switcher" style={{ position: "relative" }} ref={ref}>
      <button
        className="btn"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {current ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <img src={current.avatarUrl} alt="" className="avatar" style={{ width: 22, height: 22 }} />
            <span>{current.displayName}</span>
          </span>
        ) : "Account"}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute", right: 0, top: 44, background: "var(--bg-elev)",
            border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow)",
            padding: 8, display: "block", zIndex: 999, minWidth: 220
          }}
        >
          {CONFIG.mode === "supabase" && !current ? (
            <div style={{ padding: 8 }}>
              <AuthForm onClose={async () => {
                setOpen(false);
                const m = await api.getCurrentUser();
                setMe(m);
                router.refresh();
              }} />
            </div>
          ) : null}

          {users.map(u => (
            <div
              key={u.id}
              className="action"
              role="menuitem"
              tabIndex={0}
              style={{ display: "flex", gap: 8, alignItems: "center", padding: 6, borderRadius: 8 }}
              onClick={async () => {
                await api.loginAs(u.id);
                setMe(await api.getCurrentUser());
                setOpen(false);
                router.refresh();
              }}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  await api.loginAs(u.id);
                  setMe(await api.getCurrentUser());
                  setOpen(false);
                  router.refresh();
                }
              }}
            >
              <img src={u.avatarUrl} className="avatar" alt="" />
              <div>
                <div className="username">{u.displayName}</div>
                <div className="dim">@{u.username}{me?.id === u.id ? " • you" : ""}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}