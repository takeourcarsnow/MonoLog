"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CONFIG } from "@/lib/config";
import { ThemeToggle } from "./ThemeToggle";
import { AccountSwitcher } from "./AccountSwitcher";
import Link from "next/link";

export function Header() {
  const router = useRouter();
  return (
    <header className="header">
      <div className="header-inner">
        <button
          className="brand"
          role="button"
          aria-label={`${CONFIG.appName} home`}
          onClick={() => router.push("/explore")}
        >
          <div className="logo" aria-hidden="true"></div>
          <h1>{CONFIG.appName}</h1>
        </button>
        <div className="header-actions" id="header-actions">
          <Link href="/about" className="btn icon" title="About MonoLog" aria-label="About MonoLog">ℹ️</Link>
          <ThemeToggle />
          <Link href="/favorites" className="btn" title="Favorites" aria-label="Favorites">⭐</Link>
          <AccountSwitcher />
        </div>
      </div>
      {process.env.NODE_ENV !== 'production' ? (
        <DevEnvBanner />
      ) : null}
    </header>
  );
}

function DevEnvBanner() {
  const [server, setServer] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/debug/env');
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          setServer(json);
        } else {
          setServer({ error: `status:${res.status}` });
        }
      } catch (e) {
        if (!mounted) return;
        setServer({ error: String(e) });
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{padding: '6px 12px', fontSize: 12, color: '#555', display: 'flex', gap: 12, alignItems: 'center'}}>
      <div><strong>client:</strong> {CONFIG.mode} — <em>hasSupabaseUrl:</em> {Boolean((process as any)?.env?.NEXT_PUBLIC_SUPABASE_URL) ? 'yes' : 'no'}</div>
      <div style={{opacity: 0.85}}>
        <strong>server:</strong>{' '}
        {server === null ? 'loading...' : server.error ? `err:${server.error}` : `mode:${server.nextPublicMode ?? 'null'} supabaseUrl:${server.hasNextPublicSupabaseUrl ? 'yes' : 'no'} svcKey:${server.hasServiceRoleKey ? 'yes' : 'no'}`}
      </div>
    </div>
  );
}