"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import { Users } from "lucide-react";
import type { HydratedCommunity } from "@/src/lib/types";
import { Button } from "./Button";
import Link from "next/link";
import { OptimizedImage } from "./OptimizedImage";

export function CommunitiesView() {
  const [communities, setCommunities] = useState<HydratedCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCommunities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCommunities();
      setCommunities(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load communities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  // Debugging: log communities array when loaded
  useEffect(() => {
    if (communities && communities.length > 0) {
      try {
        console.debug('[CommunitiesView] loaded communities:', communities.map(c => ({ id: c.id, creator: c.creator })));
      } catch (e) {}
    }
  }, [communities]);

  const handleJoinLeave = async (communityId: string, isMember: boolean) => {
    try {
      if (isMember) {
        await api.leaveCommunity(communityId);
      } else {
        await api.joinCommunity(communityId);
      }
      // Reload communities to update membership status
      await loadCommunities();
    } catch (e: any) {
      setError(e?.message || 'Failed to update membership');
    }
  };

  if (loading) {
    return (
      <div className="content">
        <div className="content-header">
          <h1 className="content-title">
            <Users size={20} strokeWidth={2} />
            Communities
          </h1>
          <p className="content-subtitle">Join communities and discuss topics with others</p>
        </div>
        <div className="content-body">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: 120 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content">
        <div className="content-header">
          <h1 className="content-title">
            <Users size={20} strokeWidth={2} />
            Communities
          </h1>
          <p className="content-subtitle">Join communities and discuss topics with others</p>
        </div>
        <div className="content-body">
          <div className="card">
            <p className="text-red-500">{error}</p>
            <Button onClick={loadCommunities}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="content-header">
        <h1 className="content-title">
          <Users size={20} strokeWidth={2} />
          Communities
        </h1>
        <p className="content-subtitle">Join communities and discuss topics with others</p>
        <div className="content-actions">
          <Link href="/communities/create">
            <Button>Create Community</Button>
          </Link>
        </div>
      </div>
      <div className="content-body">
        {communities.length === 0 ? (
          <div className="card">
            <p>No communities yet. Be the first to create one!</p>
          </div>
        ) : (
          communities.map((community) => (
            <div key={community.id} className="card">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {/* Compute avatar src explicitly and log helpful identifiers for debugging */}
                  {(() => {
                    const creatorAny = (community.creator as any) || {};
                    const avatarSrc = ((creatorAny.avatarUrl || creatorAny.avatar_url || "") + "").trim() || "/logo.svg";
                    try {
                      console.debug('[CommunitiesView] avatar', { communityId: community.id, creatorId: creatorAny.id, avatarUrl: creatorAny.avatarUrl, avatar_url: creatorAny.avatar_url, chosenSrc: avatarSrc });
                    } catch (e) {}
                    return (
                      <OptimizedImage
                        src={avatarSrc}
                        alt={community.creator.displayName || community.creator.username}
                        width={40}
                        height={40}
                        className="rounded-full"
                        fallbackSrc="/logo.svg"
                      />
                    );
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/communities/${community.slug}`}>
                    <h3 className="font-semibold text-lg hover:underline">{community.name}</h3>
                  </Link>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {community.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>{community.memberCount || 0} members</span>
                    <span>{community.threadCount || 0} threads</span>
                    <span>by {community.creator.displayName || community.creator.username}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Button
                    variant={community.isMember ? "ghost" : "default"}
                    size="sm"
                    onClick={() => handleJoinLeave(community.id, community.isMember || false)}
                  >
                    {community.isMember ? 'Leave' : 'Join'}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}