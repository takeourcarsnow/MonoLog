"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { useRouter } from "next/navigation";

export function AccountSwitcher() {
  const [me, setMe] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setMe(await api.getCurrentUser());
    })();
  }, []);

  const current = me;

  return (
    <div className="account-switcher" style={{ position: "relative" }}>
      <button
        className="btn"
        onClick={() => router.push("/profile")}
        aria-label="Open profile"
      >
        {current ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <img src={current.avatarUrl} alt="" className="avatar" style={{ width: 22, height: 22 }} />
            <span>{current.displayName}</span>
          </span>
        ) : "Account"}
      </button>
    </div>
  );
}