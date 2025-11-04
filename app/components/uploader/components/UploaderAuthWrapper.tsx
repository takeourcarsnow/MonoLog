"use client";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/hooks/useAuth";
import { AuthForm } from "@/app/components/auth/AuthForm";
import { AuthRequired } from "@/app/components/auth/AuthRequired";
import { UploaderCore } from "./UploaderCore";
import { Plus } from "lucide-react";
import Link from "next/link";

export function UploaderAuthWrapper() {
  const { me, setMe } = useAuth();

  if (me === undefined) {
    return (
      <div className="view-fade">
        <div className="card skeleton" style={{ height: 200, maxWidth: 600, margin: '24px auto' }} />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="view-fade">
        <div className="empty feed-empty" style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', borderRadius: 16 }} aria-hidden>
              <Plus size={56} strokeWidth={1.5} />
            </div>
            <h2 style={{ margin: '6px 0 0 0', fontSize: '1.15rem' }}>Create Your Log</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 420 }}>Sign in to capture and share your day through photos, build streaks, and connect with others.</p>
            <Link href="/explore" className="btn" style={{ marginTop: 8 }}>Explore posts</Link>
          </div>
        </div>
      </div>
    );
  }

  return <UploaderCore />;
}