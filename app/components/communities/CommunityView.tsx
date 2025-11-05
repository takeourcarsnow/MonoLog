"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Users, MessageSquare, Trash2, UserMinus, UserPlus, ArrowLeft, User as UserIcon, Clock, Pencil } from "lucide-react";
import { useRef } from "react";
import type { HydratedCommunity, HydratedThread } from "@/lib/types";
import { Button } from "@/app/components/ui/Button";
import ToggleActionButton from "@/app/components/ui/ToggleActionButton";
import TimeDisplay from "@/app/components/ui/TimeDisplay";
import Link from "next/link";
import { OptimizedImage } from "@/app/components/media/OptimizedImage";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useErrorState } from "@/lib/hooks/useErrorState";
import { CommunityHeaderSkeleton, ThreadCardSkeleton } from "@/app/components/ui/SkeletonCard";

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
      <div className="community pt-0 md:pt-20 space-y-8">
        {/* Back Navigation Skeleton */}
        <div className="mt-8 mb-4 animate-pulse">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        
        {/* Community Header Skeleton */}
        <CommunityHeaderSkeleton />
        
        {/* Thread Skeletons */}
        <div className="content-body space-y-6 pt-6">
          <ThreadCardSkeleton />
          <ThreadCardSkeleton />
          <ThreadCardSkeleton />
        </div>
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
      <div className="community pt-0 md:pt-20 space-y-8">
        {/* Back Navigation Skeleton */}
        <div className="mt-8 mb-4 animate-pulse">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        
        {/* Community Header Skeleton */}
        <CommunityHeaderSkeleton />
        
        {/* Thread Skeletons */}
        <div className="content-body space-y-6 pt-6">
          <ThreadCardSkeleton />
          <ThreadCardSkeleton />
          <ThreadCardSkeleton />
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
      {/* Create Thread Button */}
      {community?.isMember && (
        <div style={{ marginTop: '1.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <Link href={`/communities/${community.slug}/create-thread`}>
            <Button title="Create a Thread" variant="ghost" className="btn-no-bg keep-border">Create a Thread</Button>
          </Link>
        </div>
      )}

      {/* Back Navigation */}
      <div style={{ marginTop: '2rem', marginBottom: '1rem', textAlign: 'center' }}>
        <Link href="/communities" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
          <ArrowLeft size={16} />
          Back
        </Link>
      </div>

      {/* Community Header - centered stacked layout */}
      <div className="card relative">
        {/* Edit and delete buttons in top left for community owner */}
        {currentUser && community.creator.id === currentUser.id && (
          <div className="absolute left-3 top-3 flex gap-2">
            <Link href={`/communities/${community.slug}/edit`}>
              <Button variant="ghost" size="sm" className="small-min" aria-label="Edit community">
                <Pencil size={16} />
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
          </div>
        )}

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

          <div className="flex flex-col items-center gap-2 mt-2 text-sm text-gray-500">
            <div className="flex items-center gap-4 justify-center">
              <span className="inline-flex items-center gap-2" title={`${community.memberCount || 0} members`} aria-label={`${community.memberCount || 0} members`}>
                <Users size={14} />
                {"\u00A0"}
                <span>{community.memberCount || 0}</span>{"\u00A0"}
              </span>

              <span className="inline-flex items-center gap-2" title={`${community.threadCount || 0} threads`} aria-label={`${community.threadCount || 0} threads`}>
                <MessageSquare size={14} />
                {"\u00A0"}
                <span>{community.threadCount || 0}</span>{"\u00A0"}
              </span>
            </div>

            <span
              role="link"
              tabIndex={0}
              className="inline-flex items-center justify-center cursor-pointer"
              title={`@${community.creator.username}`}
              aria-label={`${community.creator.username}`}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/${community.creator.username}`);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/${community.creator.username}`);
                }
              }}
            >
              <span>@{community.creator.username}</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mt-3">
            {/* Don't show join button for community creators */}
            {currentUser?.id !== community.creator.id && (
              <ToggleActionButton
                active={!!community.isMember}
                pending={pendingJoin}
                onClick={handleJoinLeave}
                className="small-min"
                activeIcon={<UserMinus size={16} />}
                inactiveIcon={<UserPlus size={16} />}
                ariaActiveLabel="Leave community"
                ariaInactiveLabel="Join community"
                titleActive="Leave community"
                titleInactive="Join community"
              />
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
            <Link key={thread.id} href={`/communities/${community.slug}/thread/${thread.slug}`} className="card block thread-card relative" style={{ animationDelay: `${index * 0.15}s` }}>
              {/* Put delete button in the top-left corner of the thread card for owners */}
              {currentUser && thread.user.id === currentUser.id && (
                <div className="absolute left-3 top-3">
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
                </div>
              )}

              <div className="flex items-center justify-center">
                  <div className="flex-1 min-w-0 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="font-semibold text-lg hover:underline">{thread.title}</h3>
                    </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {thread.content}
                  </p>
                  <div className="flex flex-col items-center gap-2 mt-2 text-sm text-gray-500">
                    <div className="flex items-center gap-4 justify-center">
                      <span className="inline-flex items-center gap-2" title={`${thread.replyCount || 0}`} aria-label={`${thread.replyCount || 0}`}>
                        <MessageSquare size={14} />{"\u00A0"}
                        <span>{thread.replyCount || 0}</span>{"\u00A0"}
                      </span>

                      <span className="inline-flex items-center gap-2" title={`${thread.createdAt}`} aria-label={`${thread.createdAt}`}>
                        <Clock size={14} />{"\u00A0"}
                        <TimeDisplay date={thread.createdAt} />
                      </span>
                    </div>

                    <span
                      role="link"
                      tabIndex={0}
                      className="inline-flex items-center justify-center cursor-pointer"
                      title={`@${thread.user.username}`}
                      aria-label={`${thread.user.username}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/${thread.user.username}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push(`/${thread.user.username}`);
                        }
                      }}
                    >
                      <span>@{thread.user.username}</span>
                    </span>
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