"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Users } from "lucide-react";
import type { HydratedCommunity } from "@/lib/types";
import { Button } from "@/app/components/ui/Button";
import Link from "next/link";
// ScrollingHint removed — use plain text
import ScrollingHint from "@/app/components/ui/ScrollingHint";
import { useAuth } from "@/lib/hooks/useAuth";
import { useCommunities } from "@/lib/hooks";
import CommunityCard from "@/app/components/communities/CommunityCard";
import LazyMount from "@/app/components/LazyMount";
import { useErrorState } from "@/lib/hooks/useErrorState";
import { useCommunityMembership } from "@/lib/hooks/useCommunityMembership";

export function CommunitiesView() {
  const { me } = useAuth();
  const { data: communities, mutate: mutateCommunities, isLoading: loading, error: fetchError } = useCommunities();
  const { joinLeave, pending } = useCommunityMembership();
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

  const handleJoinLeave = useCallback(async (communityId: string, isMember: boolean) => {
    await joinLeave(communityId, isMember, mutateCommunities, handleError);
  }, [joinLeave, mutateCommunities, handleError]);

  if (loading) {
    return null;
  }

  if (error || fetchError) {
    return (
      <div className="communities">
        <div className="content-header mt-8">
          <div className="text-center w-full">
            <h1 className="content-title inline-flex items-center justify-center gap-2">
              <strong><Users size={18} strokeWidth={2} /></strong>
              <ScrollingHint
                messages={[
                  'Communities and threads with latest activity are displayed first',
                  'Join communities to follow conversations you care about',
                ]}
                interval={5500}
                className="dim"
              />
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
            <ScrollingHint
              messages={[
                'Communities and threads with latest activity are displayed first',
                'Join communities to follow conversations you care about',
              ]}
              interval={5500}
              className="dim"
            />
          </h1>
        </div>
      </div>
        <div className="content-actions mt-6 mb-10 flex justify-center w-full">
          <Link href="/communities/create">
            <Button title="Create a Community" variant="ghost" className="btn-no-bg keep-border">Create a Community</Button>
          </Link>
        </div>
      <div className="content-body space-y-10">
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
                pending={pending.has(community.id)}
                onJoinLeave={handleJoinLeave}
              />
            </LazyMount>
          ))
        )}
      </div>
    </div>
  );
}