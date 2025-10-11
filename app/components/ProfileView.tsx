/* eslint-disable @next/next/no-img-element */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./Button";
import { api } from "@/src/lib/api";
import type { HydratedPost, User } from "@/src/lib/types";
import Link from "next/link";
import ImageZoom from "./ImageZoom";
import { AuthForm } from "@/app/components/AuthForm";
import { useUserData } from "./profile/useUserData";
import { ProfileHeader } from "./profile/ProfileHeader";
import { PostsGrid } from "./profile/PostsGrid";
import { SkeletonAvatar, SkeletonText, SkeletonTile } from "./Skeleton";
import { AuthRequired } from "./AuthRequired";
import { ViewToggle } from "./ViewToggle";
import { PostCard } from "./PostCard";
import { User as UserIcon } from "lucide-react";

export function ProfileView({ userId }: { userId?: string }) {
  const { user, posts, loading, following, setFollowing, currentUserId, isOtherParam } = useUserData(userId);
  const router = useRouter();
  const [view, setView] = useState<"list" | "grid">((typeof window !== "undefined" && (localStorage.getItem("profileView") as any)) || "grid");

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
      <div className="empty" style={{ position: "relative" }}>
        <div>User not found. Pick an account from the Account menu to get started.</div>
        <div style={{ marginTop: 12 }}>
          <Button onClick={() => { try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch (_) {} handleAuthRequired(); }}>Sign in / Sign up</Button>
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
        onAvatarChange={() => {
          // The ProfileHeader handles avatar changes internally
        }}
        onAuthRequired={handleAuthRequired}
      />
      {posts.length > 0 && (
        <ViewToggle
          title={<UserIcon size={20} strokeWidth={2} />}
          subtitle={`${user?.username || 'User'}'s posts`}
          selected={view}
          onSelect={(v) => { setView(v); if (typeof window !== "undefined") localStorage.setItem("profileView", v); }}
        />
      )}
      <div className={`feed ${view === 'grid' ? 'grid-view' : ''}`}>
        {view === 'grid' ? (
          <PostsGrid posts={posts} />
        ) : (
          posts.map(p => <PostCard key={p.id} post={p} />)
        )}
      </div>
    </div>
  );
}
