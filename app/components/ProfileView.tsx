/* eslint-disable @next/next/no-img-element */
"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "./Button";
import { api } from "@/lib/api";
import type { HydratedPost, User } from "@/lib/types";
import Link from "next/link";
import dynamic from 'next/dynamic';
const ImageZoom = dynamic(() => import('./ImageZoom'), { ssr: false });
import { AuthForm } from "@/app/components/AuthForm";
import { useUserData } from "./profile/useUserData";
import { ProfileHeader } from "./profile/ProfileHeader";
import { PostsGrid } from "./profile/PostsGrid";
import { SkeletonAvatar, SkeletonText, SkeletonTile } from "./Skeleton";
import { AuthRequired } from "./AuthRequired";
import { ViewToggle } from "./ViewToggle";
import { PostCard } from "./PostCard";
import { User as UserIcon } from "lucide-react";
import { InviteSection } from "./InviteSection";

export function ProfileView({ userId }: { userId?: string }) {
  const { user, posts, loading, following, setFollowing, currentUserId, isOtherParam, setUser } = useUserData(userId);
  const router = useRouter();
  const [view, setView] = useState<"list" | "grid">((typeof window !== "undefined" && (localStorage.getItem("profileView") as any)) || "grid");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingView, setPendingView] = useState<"list" | "grid" | null>(null);
  const fadeRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleViewChange = useCallback((v: "list" | "grid") => {
    if (v === view) return;
    setPendingView(v);
    const el = fadeRef.current;
    if (!el) {
      setView(v);
      setPendingView(null);
      if (typeof window !== "undefined") localStorage.setItem("profileView", v);
      return;
    }

    if (cleanupRef.current) {
      try { cleanupRef.current(); } catch {}
      cleanupRef.current = null;
    }

    setIsTransitioning(true);
    const onEnd = (e: TransitionEvent) => {
      if (e.target !== el || e.propertyName !== 'opacity') return;
      el.removeEventListener('transitionend', onEnd as any);
      setView(v);
      setPendingView(null);
      if (typeof window !== "undefined") localStorage.setItem("profileView", v);
      requestAnimationFrame(() => { setIsTransitioning(false); });
      cleanupRef.current = null;
    };
    el.addEventListener('transitionend', onEnd as any);
    cleanupRef.current = () => {
      try { el.removeEventListener('transitionend', onEnd as any); } catch {}
      setIsTransitioning(false);
    };
    requestAnimationFrame(() => {});
  }, [view]);

  useEffect(() => {
    return () => { if (cleanupRef.current) { try { cleanupRef.current(); } catch {} } };
  }, []);
  const [showInvites, setShowInvites] = useState(false);

  const handleAuthRequired = () => {
    router.push('/profile');
  };

  

  if (!user) {
    // while loading, show a proper skeleton with multiple placeholders
      if (loading) {
      return (
        <div className="view-fade">
          <div className="profile-header toolbar">
            <div className="profile-left" style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", width: "100%" }}>
              <SkeletonAvatar size={160} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', width: '100%' }}>
                <SkeletonText width={180} height={20} borderRadius={8} />
                <SkeletonText width={220} height={16} borderRadius={6} />
              </div>
            </div>
          </div>
          <div className="grid" aria-label="Loading posts">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonTile key={i} height={200} />
            ))}
          </div>
        </div>
      );
    }

    // while not loading, prefer the upload-style sign-in prompt when the
    // viewer is not signed in and they're looking at their own profile.
    if (!loading && !isOtherParam && !currentUserId) {
      return (
        <AuthRequired>
          <AuthForm onClose={async () => {
            // refresh authenticated user state after sign-in
            const me = await api.getCurrentUser();
            // The useUserData hook will handle the refresh via auth:changed event
          }} />
        </AuthRequired>
      );
    }

    return (
      <div className="empty feed-empty" style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', borderRadius: 16 }} aria-hidden>
            <UserIcon size={56} strokeWidth={2} />
          </div>

          <h2 style={{ margin: '6px 0 0 0', fontSize: '1.15rem' }}>User not found</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 420 }}>This user doesn&apos;t exist or may have been deleted.</p>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view-fade">
      <ProfileHeader
        user={user}
        currentUserId={currentUserId}
        isOtherParam={isOtherParam}
        following={following}
        setFollowing={setFollowing}
        setUser={setUser}
        postCount={posts.length}
        onAvatarChange={() => {
          // The ProfileHeader handles avatar changes internally
        }}
        onAuthRequired={handleAuthRequired}
        showInvites={showInvites}
        setShowInvites={setShowInvites}
      />
      {showInvites && currentUserId && user && currentUserId === user.id && <InviteSection />}
      {posts.length > 0 && (
        (() => {
          const subtitle = (currentUserId && user && currentUserId === user.id) ? 'Your posts' : `${user?.username || 'User'}'s posts`;
            return (
            <ViewToggle
              title={<UserIcon size={20} strokeWidth={2} />}
              subtitle={subtitle}
              selected={pendingView ?? view}
              onSelect={handleViewChange}
            />
          );
        })()
      )}
      {
        // Render both grid and list variants and toggle their visibility with
        // inline display styles. This mirrors the FeedPage pattern so the
        // existing CSS animations for .card and .grid .tile run when switching.
      }
      {(() => {
        const gridView = <PostsGrid posts={posts} />;
        const listView = (
          <>
            {posts.map(p => <PostCard key={p.id} post={p} disableCardNavigation={true} />)}
          </>
        );

        return (
          <div ref={fadeRef} className={`feed ${view === 'grid' ? 'grid-view' : ''} fade-anim ${isTransitioning ? 'fade-hidden' : 'fade-visible'}`}>
            <div style={{ display: view === 'grid' ? 'block' : 'none' }}>
              {gridView}
            </div>
            <div style={{ display: view === 'list' ? 'block' : 'none' }}>
              {listView}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
