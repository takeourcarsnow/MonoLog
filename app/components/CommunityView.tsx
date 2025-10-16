"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import { Users, MessageSquare, Plus, Trash2, UserMinus, UserPlus } from "lucide-react";
import { useRef } from "react";
import type { HydratedCommunity, HydratedThread } from "@/src/lib/types";
import { Button } from "./Button";
import Link from "next/link";
import { OptimizedImage } from "./OptimizedImage";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/hooks/useAuth";

export function CommunityView() {
  const params = useParams();
  const router = useRouter();
  const { me: currentUser } = useAuth();
  const slug = params.slug as string;

  const [community, setCommunity] = useState<HydratedCommunity | null>(null);
  const [threads, setThreads] = useState<HydratedThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const deleteTimeoutRef = useRef<number | null>(null);
  const [threadDeleteArmedSet, setThreadDeleteArmedSet] = useState<Set<string>>(new Set());
  const threadDeleteTimeoutsRef = useRef<Map<string, number>>(new Map());

  const loadCommunity = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);
      setError(null);
      const communityData = await api.getCommunity(slug);
      if (!communityData) {
        setError('Community not found');
        setLoading(false);
        return;
      }
      const threadsData = await api.getCommunityThreads(communityData.id);
      setCommunity(communityData);
      setThreads(threadsData);
    } catch (e: any) {
      setError(e?.message || 'Failed to load community');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  useEffect(() => {
    if (currentUser && community) {
      console.log('CommunityView: currentUser.id:', currentUser.id, 'community.creator.id:', community.creator.id, 'equal:', currentUser.id === community.creator.id);
    }
  }, [currentUser, community]);

  // Debugging: help inspect the loaded community in browser console
  useEffect(() => {
    if (community) {
      try {
        console.debug('[CommunityView] loaded community:', community);
      } catch (e) {}
    }
  }, [community]);

  const handleJoinLeave = async () => {
    if (!community) return;

    try {
      if (community.isMember) {
        await api.leaveCommunity(community.id);
      } else {
        await api.joinCommunity(community.id);
      }
      // Reload community data
      await loadCommunity();
    } catch (e: any) {
      setError(e?.message || 'Failed to update membership');
    }
  };

  const handleDelete = async () => {
    if (!community) return;

    // Two-step confirm: first click arms the delete button (visual), second click performs delete
    if (!deleteArmed) {
      setDeleteArmed(true);
      // auto-disarm after 6 seconds
      if (deleteTimeoutRef.current) window.clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = window.setTimeout(() => setDeleteArmed(false), 6000);
      return;
    }

    try {
      if (deleteTimeoutRef.current) window.clearTimeout(deleteTimeoutRef.current);
      await api.deleteCommunity(community.slug);
      router.push('/communities');
    } catch (e: any) {
      setError(e?.message || 'Failed to delete community');
    } finally {
      setDeleteArmed(false);
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    if (!community) return;

    // If not armed, arm this thread's delete button
    if (!threadDeleteArmedSet.has(threadId)) {
      const next = new Set(threadDeleteArmedSet);
      next.add(threadId);
      setThreadDeleteArmedSet(next);
      // set/replace timeout
      const prev = threadDeleteTimeoutsRef.current.get(threadId);
      if (prev) window.clearTimeout(prev);
      const t = window.setTimeout(() => {
        const s = new Set(threadDeleteArmedSet);
        s.delete(threadId);
        setThreadDeleteArmedSet(s);
        threadDeleteTimeoutsRef.current.delete(threadId);
      }, 6000);
      threadDeleteTimeoutsRef.current.set(threadId, t);
      return;
    }

    // Confirmed: perform delete
    try {
      const prev = threadDeleteTimeoutsRef.current.get(threadId);
      if (prev) window.clearTimeout(prev);
      threadDeleteTimeoutsRef.current.delete(threadId);
      await api.deleteThread(threadId);
      setThreads(prev => prev.filter(t => t.id !== threadId));
      // Update thread count
      if (community) {
        setCommunity(prev => prev ? { ...prev, threadCount: Math.max(0, (prev.threadCount || 0) - 1) } : null);
      }
    } catch (error: any) {
      setError(error?.message || 'Failed to delete thread');
    } finally {
      const s = new Set(threadDeleteArmedSet);
      s.delete(threadId);
      setThreadDeleteArmedSet(s);
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) window.clearTimeout(deleteTimeoutRef.current);
      threadDeleteTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      threadDeleteTimeoutsRef.current.clear();
    };
  }, []);

  if (loading) {
    return (
      <div className="content">
        <div className="card skeleton" style={{ height: 200 }} />
        <div className="content-body">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: 120 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="content">
        <div className="content-body">
          <div className="card">
            <p className="text-red-500">{error || 'Community not found'}</p>
            <Link href="/communities">
              <Button>Back to Communities</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      {/* Community Header */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {/* Compute avatar src explicitly and log helpful identifiers for debugging */}
            {(() => {
              const creatorAny = (community.creator as any) || {};
              const avatarSrc = ((creatorAny.avatarUrl || creatorAny.avatar_url || "") + "").trim() || "/logo.svg";
              try {
                console.debug('[CommunityView] header avatar', { communityId: community.id, creatorId: creatorAny.id, avatarUrl: creatorAny.avatarUrl, avatar_url: creatorAny.avatar_url, chosenSrc: avatarSrc });
              } catch (e) {}
              return (
                <OptimizedImage
                  src={avatarSrc}
                  alt={community.creator.displayName || community.creator.username}
                  width={60}
                  height={60}
                  className="rounded-full"
                  fallbackSrc="/logo.svg"
                />
              );
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{community.name}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {community.description}
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Users size={16} />
                {community.memberCount || 0} members
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare size={16} />
                {community.threadCount || 0} threads
              </span>
              <span>Created by {community.creator.displayName || community.creator.username}</span>
            </div>
          </div>
          <div className="flex-shrink-0 flex gap-2">
            {currentUser && community.creator.id === currentUser.id && (
              <Button
                variant="danger"
                size="sm"
                className={`small-min ${deleteArmed ? 'confirm' : ''}`}
                onClick={handleDelete}
                aria-label={deleteArmed ? 'Confirm delete community' : 'Delete community'}
              >
                <Trash2 size={16} />
              </Button>
            )}
            {community.isMember && (
              <Link href={`/communities/${community.slug}/create-thread`}>
                <Button size="sm" className="small-min" aria-label="New thread">
                  <Plus size={16} />
                </Button>
              </Link>
            )}
            <Button
              variant={community.isMember ? "ghost" : "default"}
              size="sm"
              className="small-min"
              onClick={handleJoinLeave}
              aria-label={community.isMember ? 'Leave community' : 'Join community'}
            >
              {community.isMember ? <UserMinus size={16} /> : <UserPlus size={16} />}
            </Button>
          </div>
        </div>
      </div>

      {/* Threads List */}
      <div className="content-body">
        {threads.length === 0 ? (
          <div className="card">
            <p>No threads yet. {community.isMember ? 'Be the first to create one!' : 'Join the community to start discussing!'}</p>
          </div>
        ) : (
          threads.map((thread) => (
            <div key={thread.id} className="card">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {(() => {
                    const userAny = (thread.user as any) || {};
                    const avatarSrc = ((userAny.avatarUrl || userAny.avatar_url || "") + "").trim() || "/logo.svg";
                    try {
                      console.debug('[CommunityView] thread avatar', { threadId: thread.id, userId: userAny.id, avatarUrl: userAny.avatarUrl, avatar_url: userAny.avatar_url, chosenSrc: avatarSrc });
                    } catch (e) {}
                    return (
                      <OptimizedImage
                        src={avatarSrc}
                        alt={thread.user.displayName || thread.user.username}
                        width={40}
                        height={40}
                        className="rounded-full"
                        fallbackSrc="/logo.svg"
                      />
                    );
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <Link href={`/communities/${community.slug}/thread/${thread.slug}`}>
                      <h3 className="font-semibold text-lg hover:underline">{thread.title}</h3>
                    </Link>
                    {currentUser && thread.user.id === currentUser.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`small-min ${threadDeleteArmedSet.has(thread.id) ? 'confirm' : ''}`}
                        onClick={async (e) => {
                          e.preventDefault();
                          await handleDeleteThread(thread.id);
                        }}
                        aria-label={threadDeleteArmedSet.has(thread.id) ? 'Confirm delete thread' : 'Delete thread'}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {thread.content}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>by {thread.user.displayName || thread.user.username}</span>
                    <span>{thread.replyCount || 0} replies</span>
                    <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}