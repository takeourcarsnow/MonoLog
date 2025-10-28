"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import { Users, UserMinus, UserPlus } from "lucide-react";
import type { HydratedCommunity } from "@/src/lib/types";
import { Button } from "./Button";
import Link from "next/link";
import { useAuth } from "@/src/lib/hooks/useAuth";
import { useCommunities } from "@/lib/hooks";
import CommunityCard from "./CommunityCard";
import LazyMount from "./LazyMount";
import SkeletonCard from "./SkeletonCard";
import { useErrorState } from "@/lib/hooks/useErrorState";

export function CommunitiesView() {
  const { me } = useAuth();
  const { data: communities, mutate: mutateCommunities, isLoading: loading, error: fetchError } = useCommunities();
  const [pendingJoin, setPendingJoin] = useState<Set<string>>(new Set());
  const { error, setError, handleError } = useErrorState();

  // Update last checked time when component mounts
  useEffect(() => {
    localStorage.setItem('communitiesLastChecked', new Date().toISOString());
  }, []);

  // Debugging: log communities array when loaded
  useEffect(() => {
    if (communities && communities.length > 0) {
      try {
        console.debug('[CommunitiesView] loaded communities:', communities.map(c => ({ id: c.id, creator: c.creator })));
      } catch (e) {}
    }
  }, [communities]);

  // Debugging: log communities array when loaded
  useEffect(() => {
    if (communities && communities.length > 0) {
      try {
        console.debug('[CommunitiesView] loaded communities:', communities.map(c => ({ id: c.id, creator: c.creator })));
      } catch (e) {}
    }
  }, [communities]);

  const handleJoinLeave = useCallback(async (communityId: string, isMember: boolean) => {
    if (pendingJoin.has(communityId)) return;
    // Optimistic update: flip isMember locally and adjust counts
    setPendingJoin((s) => new Set(s).add(communityId));
    mutateCommunities(
      (prev) => prev?.map(c => {
        if (c.id !== communityId) return c;
        return {
          ...c,
          isMember: !isMember,
          memberCount: isMember ? Math.max(0, (c.memberCount || 1) - 1) : (c.memberCount || 0) + 1
        };
      }),
      false // don't revalidate
    );

    try {
      if (isMember) {
        await api.leaveCommunity(communityId);
      } else {
        await api.joinCommunity(communityId);
      }
      // Success: revalidate to get fresh data
      mutateCommunities();
    } catch (e: any) {
      // Revert optimistic update on error
      mutateCommunities(
        (prev) => prev?.map(c => c.id === communityId ? { ...c, isMember, memberCount: isMember ? (c.memberCount || 0) + 1 : Math.max(0, (c.memberCount || 1) - 1) } : c),
        false
      );
      handleError(e);
    } finally {
      setPendingJoin((s) => {
        const next = new Set(s);
        next.delete(communityId);
        return next;
      });
    }
  }, [pendingJoin, mutateCommunities]);

  if (loading) {
    return (
      <div className="communities">
        <div className="content-header mt-8">
          <div className="text-center w-full">
            <h1 className="content-title inline-flex items-center justify-center gap-2">
              <strong><Users size={18} strokeWidth={2} /></strong>
              <span className="dim">Communities and threads with latest activity are displayed first</span>
            </h1>
          </div>
        </div>
        <div className="content-body space-y-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error || fetchError) {
    return (
      <div className="communities">
        <div className="content-header mt-8">
          <div className="text-center w-full">
            <h1 className="content-title inline-flex items-center justify-center gap-2">
              <strong><Users size={18} strokeWidth={2} /></strong>
              <span className="dim">Communities and threads with latest activity are displayed first</span>
            </h1>
          </div>
        </div>
        <div className="content-body">
          <div className="card">
            <p className="text-red-500">{error || fetchError}</p>
            <Button onClick={() => mutateCommunities()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="communities">
      <div className="content-header mt-8 mb-6">
        <div className="text-center w-full">
          <h1 className="content-title inline-flex items-center justify-center gap-2">
            <strong><Users size={18} strokeWidth={2} /></strong>
            <span className="dim">Communities and threads with latest activity are displayed first</span>
          </h1>
        </div>
        <div className="content-actions my-8 flex justify-center w-full">
          <Link href="/communities/create">
            <Button title="Create Community">Create Community</Button>
          </Link>
        </div>
      </div>
      <div className="content-body space-y-6">
        {(!communities || communities.length === 0) ? (
          <div className="card">
            <p>No communities yet. Be the first to create one!</p>
          </div>
        ) : (
          communities.map((community) => (
            <LazyMount key={community.id} rootMargin="300px">
              <CommunityCard
                community={community}
                meId={me?.id}
                pending={pendingJoin.has(community.id)}
                onJoinLeave={handleJoinLeave}
              />
            </LazyMount>
          ))
        )}
      </div>
    </div>
  );
}