"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import { Users, UserMinus, UserPlus } from "lucide-react";
import type { HydratedCommunity } from "@/src/lib/types";
import { Button } from "./Button";
import Link from "next/link";
import { OptimizedImage } from "./OptimizedImage";
import { useAuth } from "@/src/lib/hooks/useAuth";

export function CommunitiesView() {
  const { me } = useAuth();
  const [communities, setCommunities] = useState<HydratedCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingJoin, setPendingJoin] = useState<Set<string>>(new Set());

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
    // Prevent duplicate join/leave requests
    if (pendingJoin.has(communityId)) return;
    const next = new Set(pendingJoin);
    next.add(communityId);
    setPendingJoin(next);

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
    } finally {
      const updated = new Set(pendingJoin);
      updated.delete(communityId);
      setPendingJoin(updated);
    }
  };

  if (loading) {
    return (
      <div className="communities">
        <div className="content-header mt-8">
          <div className="text-center w-full">
            <h1 className="content-title inline-flex items-center justify-center gap-2">
              <strong><Users size={18} strokeWidth={2} /></strong>
              <span className="dim">Join communities and discuss topics with others</span>
            </h1>
          </div>
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
      <div className="communities">
        <div className="content-header mt-8">
          <div className="text-center w-full">
            <h1 className="content-title inline-flex items-center justify-center gap-2">
              <strong><Users size={18} strokeWidth={2} /></strong>
              <span className="dim">Join communities and discuss topics with others</span>
            </h1>
          </div>
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
    <div className="communities">
      <div className="content-header mt-8">
        <div className="text-center w-full">
          <h1 className="content-title inline-flex items-center justify-center gap-2">
            <strong><Users size={18} strokeWidth={2} /></strong>
            <span className="dim">Join communities and discuss topics with others</span>
          </h1>
        </div>
        <div className="content-actions my-8 flex justify-center w-full">
          <Link href="/communities/create">
            <Button title="Create Community">Create Community</Button>
          </Link>
        </div>
      </div>
      <div className="content-body space-y-6">
        {communities.length === 0 ? (
          <div className="card">
            <p>No communities yet. Be the first to create one!</p>
          </div>
        ) : (
          communities.map((community) => (
            <div key={community.id} className="card mb-8">
              <div className="flex flex-col items-center text-center gap-3 py-4">
                {/* Community image or default logo - moved to top and centered */}
                <OptimizedImage
                  src={community.imageUrl || "/logo.svg"}
                  alt={community.name}
                  width={80}
                  height={80}
                  className="rounded-full cursor-pointer hover:opacity-80 transition-opacity mx-auto"
                  fallbackSrc="/logo.svg"
                />

                <Link href={`/communities/${community.slug}`}>
                  <h3 className="font-semibold text-lg hover:underline">{community.name}</h3>
                </Link>

                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-[40ch]">
                  {community.description}
                </p>

                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 justify-center">
                  <span>{community.memberCount || 0} members</span>
                  <span>{community.threadCount || 0} threads</span>
                  <span>by @{community.creator.username}</span>
                </div>

                <div className="mt-3">
                  {/* Don't show join button for community creators */}
                  {me?.id !== community.creator.id && (
                    <Button
                      variant={community.isMember ? "ghost" : "default"}
                      size="sm"
                      className="small-min"
                      onClick={() => handleJoinLeave(community.id, community.isMember || false)}
                      aria-label={community.isMember ? 'Leave community' : 'Join community'}
                      title={community.isMember ? 'Leave community' : 'Join community'}
                      disabled={pendingJoin.has(community.id)}
                    >
                      {community.isMember ? <UserMinus size={16} /> : <UserPlus size={16} />}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}