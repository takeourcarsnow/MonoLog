"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import { Users, MessageSquare, Plus, Trash2, UserMinus, UserPlus, ArrowLeft } from "lucide-react";
import { useRef } from "react";
import type { HydratedCommunity, HydratedThread } from "@/src/lib/types";
import { Button } from "./Button";
import TimeDisplay from "./TimeDisplay";
import Link from "next/link";
import { OptimizedImage } from "./OptimizedImage";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/hooks/useAuth";
import { useErrorState } from "@/lib/hooks/useErrorState";

export function CommunityView() {
  const params = useParams();
  const router = useRouter();
  const { me: currentUser } = useAuth();
  const slug = params.slug as string;

  const [community, setCommunity] = useState<HydratedCommunity | null>(null);
  const [threads, setThreads] = useState<HydratedThread[]>([]);
  const [loading, setLoading] = useState(true);
  const { error, setError, handleError } = useErrorState();
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [pendingJoin, setPendingJoin] = useState(false);
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
      handleError(e);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  // Update last checked time when component mounts
  useEffect(() => {
    localStorage.setItem('communitiesLastChecked', new Date().toISOString());
  }, []);

  useEffect(() => {
    if (currentUser && community) {
      console.log('CommunityView: currentUser.id:', currentUser.id, 'community.creator.id:', community.creator.id, 'equal:', currentUser.id === community.creator.id);
    }
  }, [currentUser, community]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) window.clearTimeout(deleteTimeoutRef.current);
      threadDeleteTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      threadDeleteTimeoutsRef.current.clear();
    };
  }, []);

  // Redirect unauthenticated users to auth
  useEffect(() => {
    if (!currentUser) { // undefined or null means not authenticated
      router.replace('/profile');
    }
  }, [currentUser, router]);

  // Show loading while determining auth status
  if (currentUser === undefined) {
    return (
      <div className="community pt-0 md:pt-20">
        <div className="card skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  // Don't render anything if not authenticated (redirecting)
  if (!currentUser) {
    return null;
  }

  const handleJoinLeave = async () => {
    if (!community) return;

    // Prevent duplicate requests
    if (pendingJoin) return;
    // If user is not authenticated, redirect to auth (profile page shows AuthForm)
    if (!currentUser) {
      router.push('/profile');
      return;
    }
    setPendingJoin(true);
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
    } finally {
      setPendingJoin(false);
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

  if (loading) {
    return (
      // add top padding on md+ to avoid header overlap on desktop
      <div className="community pt-0 md:pt-20">
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
      // add top padding on md+ to avoid header overlap on desktop
      <div className="community pt-0 md:pt-20">
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

  // Small helpers to keep JSX markup simple and readable
  const getCommunityImageSrc = () => (((community?.imageUrl || "") + "").trim() || "/logo.svg");
  const getAvatarSrc = (thread: HydratedThread) => {
    const userAny = (thread.user as any) || {};
    return ((userAny.avatarUrl || userAny.avatar_url || "") + "").trim() || "/logo.svg";
  };

  return (
    // add top padding on md+ to avoid header overlap on desktop
    <div className="community pt-0 md:pt-20">
  {/* Back Navigation */}
  <div className="mt-8 mb-4">
        <Link href="/communities" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
          <ArrowLeft size={16} />
          Back to Communities
        </Link>
      </div>

      {/* Community Header - centered stacked layout */}
      <div className="card">
        <div className="flex flex-col items-center text-center gap-4 py-4">
          {/* Community image */}
          <OptimizedImage
            src={getCommunityImageSrc()}
            alt={community.name}
            width={80}
            height={80}
            className="rounded-full cursor-pointer hover:opacity-80 transition-opacity mx-auto"
            fallbackSrc="/logo.svg"
          />

          <h1 className="text-2xl font-bold break-words">{community.name}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 break-words max-w-[60ch]">
            {community.description}
          </p>

          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 justify-center">
            <span>{community.memberCount || 0} members</span>
            <span>{community.threadCount || 0} threads</span>
            <span>by @{community.creator.username}</span>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mt-3">
            {currentUser && community.creator.id === currentUser.id && (
              <>
                <Link href={`/communities/${community.slug}/edit`}>
                  <Button variant="ghost" size="sm" className="small-min" aria-label="Edit community">
                    {/* tooltip */}
                    {""}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </Button>
                </Link>
                <Button
                  variant="danger"
                  size="sm"
                  className={`small-min ${deleteArmed ? 'confirm' : ''}`}
                  onClick={handleDelete}
                  aria-label={deleteArmed ? 'Confirm delete community' : 'Delete community'}
                >
                  <Trash2 size={16} />
                </Button>
              </>
            )}
            {community.isMember && (
              <Link href={`/communities/${community.slug}/create-thread`}>
                <Button size="sm" className="small-min" aria-label="New thread" title="Create a new thread in this community">
                  <Plus size={16} />
                </Button>
              </Link>
            )}

            {/* Don't show join button for community creators */}
            {currentUser?.id !== community.creator.id && (
              <Button
                variant={community.isMember ? "ghost" : "default"}
                size="sm"
                className="small-min"
                onClick={handleJoinLeave}
                aria-label={community.isMember ? 'Leave community' : 'Join community'}
                title={community.isMember ? 'Leave community' : 'Join community'}
                disabled={pendingJoin}
              >
                {community.isMember ? <UserMinus size={16} /> : <UserPlus size={16} />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Threads List */}
      <div className="content-body space-y-6 pt-6">
        {threads.length === 0 ? (
          <div className="card">
            <p className="text-center">No threads yet. {community.isMember ? 'Be the first to create one!' : 'Join the community to start discussing!'}</p>
          </div>
        ) : (
          threads.map((thread, index) => (
            <Link key={thread.id} href={`/communities/${community.slug}/thread/${thread.slug}`} className="card block thread-card" style={{ animationDelay: `${index * 0.15}s` }}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <OptimizedImage
                    src={getAvatarSrc(thread)}
                    alt={thread.user.username}
                    width={40}
                    height={40}
                    className="avatar rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                    fallbackSrc="/logo.svg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg hover:underline">{thread.title}</h3>
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
                    <span>by @{thread.user.username}</span>
                    <span>{thread.replyCount || 0} replies</span>
                    <TimeDisplay date={thread.createdAt} />
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}