"use client";
import { useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import type { User } from "@/src/lib/types";
import Link from "next/link";
import { AuthForm } from "@/app/components/AuthForm";

export default function FollowingPage() {
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    async function load() {
      const user = await api.getCurrentUser();
      setCurrentUser(user);
      if (user) {
        const followingUsers = await api.getFollowingUsers();
        setFollowing(followingUsers);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="view-fade">
        <div className="card skeleton" style={{ height: 120, maxWidth: 800, margin: '24px auto' }} />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="view-fade auth-host" style={{ maxWidth: 520, margin: "28px auto 32px", textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <AuthForm onClose={async () => {
          // refresh authenticated user state after sign-in
          const me = await api.getCurrentUser();
          setCurrentUser(me);
          if (me) {
            const followingUsers = await api.getFollowingUsers();
            setFollowing(followingUsers);
          }
        }} />
      </div>
    );
  }

  return (
    <div className="view-fade">
      <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ marginBottom: 24, textAlign: 'center' }}>Following</h1>
        {following.length === 0 ? (
          <div className="empty" style={{ textAlign: 'center' }}>
            <p>You are not following anyone yet.</p>
            <p><Link href="/explore" className="btn">Explore users</Link></p>
          </div>
        ) : (
          <div className="grid" style={{ gap: 16 }}>
            {following.map(user => (
              <div key={user.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
                <img
                  src={user.avatarUrl || "/logo.svg"}
                  alt={user.displayName}
                  className="avatar large"
                />
                <div style={{ flex: 1 }}>
                  <Link href={`/${user.username}`} style={{ fontWeight: 'bold', textDecoration: 'none', color: 'inherit' }}>
                    {user.displayName}
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