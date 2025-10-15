"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { User as UserIcon } from "lucide-react";
import { api } from "@/src/lib/api";
import type { User } from "@/src/lib/types";
import Link from "next/link";
import { AuthForm } from "@/app/components/AuthForm";
import { SkeletonCard } from "@/app/components/Skeleton";
import { AuthRequired } from "@/app/components/AuthRequired";

export default function FollowingPage() {
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const loadData = async () => {
    const user = await api.getCurrentUser();
    setCurrentUser(user);
    if (user) {
      const followingUsers = await api.getFollowingUsers();
      setFollowing(followingUsers);
    }
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="view-fade">
        <SkeletonCard height={120} maxWidth={800} margin="24px auto" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthRequired>
        <AuthForm onClose={async () => {
          // refresh authenticated user state after sign-in
          await loadData();
        }} />
      </AuthRequired>
    );
  }

  return (
    <div className="view-fade">
      <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
        {/* header removed per user request */}
        {following.length === 0 ? (
          <div className="empty following-empty" style={{ textAlign: 'center' }}>
            <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              {/* friendly illustration */}
              <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', borderRadius: 16 }} aria-hidden>
                <UserIcon size={56} strokeWidth={1.5} />
              </div>

              <h2 style={{ margin: '6px 0 0 0', fontSize: '1.15rem' }}>You haven&apos;t followed anyone yet</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 420 }}>
                Follow people to see their posts in your feed. Start by exploring creators, friends, and topics you like.
              </p>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Link href="/explore" className="btn" aria-label="Explore users to follow">Explore users</Link>
                <Link href="/profile" className="btn" style={{ background: 'transparent', border: '1px solid var(--muted-border)', color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: 8 }}>Back to profile</Link>
              </div>

              <div style={{ marginTop: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Tip: try the <Link href="/explore">Explore</Link> page to discover interesting accounts.
              </div>
            </div>
          </div>
        ) : (
          <div className="grid" style={{ gap: 16 }}>
            {following.map(user => (
              <div key={user.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
                <Image
                  src={user.avatarUrl || "/logo.svg"}
                  alt={user.displayName ?? user.username}
                  className="avatar large"
                  width={48}
                  height={48}
                />
                <div style={{ flex: 1 }}>
                  <Link href={`/${user.username}`} style={{ fontWeight: 'bold', textDecoration: 'none', color: 'inherit' }}>
                    {user.displayName ?? user.username}
                  </Link>
                  <div style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                    @{user.username}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}