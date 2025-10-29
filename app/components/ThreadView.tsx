"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { api } from "@/src/lib/api";
import { MessageSquare, ArrowLeft, Trash2, Edit3, Check, X } from "lucide-react";
import type { HydratedThread, HydratedThreadReply } from "@/src/lib/types";
import { Button } from "./Button";
import TimeDisplay from "./TimeDisplay";
import Link from "next/link";
import { OptimizedImage } from "./OptimizedImage";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/hooks/useAuth";
import { renderCaption } from "@/src/lib/hashtags";

export function ThreadView() {
  const params = useParams();
  const router = useRouter();
  const { me: currentUser } = useAuth();
  const communitySlug = params.slug as string;
  const threadSlug = params.threadSlug as string;

  const [thread, setThread] = useState<HydratedThread | null>(null);
  const [replies, setReplies] = useState<HydratedThreadReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newReply, setNewReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [threadDeleteArmed, setThreadDeleteArmed] = useState(false);
  const threadDeleteTimeoutRef = useRef<number | null>(null);
  const [replyArmedSet, setReplyArmedSet] = useState<Set<string>>(new Set());
  const replyDeleteTimeoutsRef = useRef<Map<string, number>>(new Map());
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Redirect unauthenticated users to auth
  useEffect(() => {
    if (!currentUser) { // undefined or null means not authenticated
      router.replace('/profile');
    }
  }, [currentUser, router]);

  const loadThread = useCallback(async () => {
    if (!threadSlug || !communitySlug) return;

    try {
      setLoading(true);
      setError(null);
      const threadData = await api.getThreadBySlug(threadSlug);
      if (!threadData) {
        setError('Thread not found');
        return;
      }
      setThread(threadData);

      // Load replies
      const repliesData = await api.getThreadReplies(threadData.id);
      setReplies(repliesData);
    } catch (e: any) {
      setError(e?.message || 'Failed to load thread');
    } finally {
      setLoading(false);
    }
  }, [threadSlug, communitySlug]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  // Show loading while determining auth status
  if (currentUser === undefined) {
    return (
      <div className="content">
        <div className="card skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  // Don't render anything if not authenticated (redirecting)
  if (!currentUser) {
    return null;
  }

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || submitting || !thread) return;

    try {
      setSubmitting(true);
      const reply = await api.addThreadReply(thread.id, newReply.trim());
      setReplies(prev => [...prev, reply]);
      setNewReply("");
      // Update reply count in thread
      if (thread) {
        setThread(prev => prev ? { ...prev, replyCount: (prev.replyCount || 0) + 1 } : null);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteThread = async () => {
    if (!thread) return;
    // Two-step confirm: arm on first click, delete on second
    if (!threadDeleteArmed) {
      setThreadDeleteArmed(true);
      if (threadDeleteTimeoutRef.current) window.clearTimeout(threadDeleteTimeoutRef.current);
      threadDeleteTimeoutRef.current = window.setTimeout(() => setThreadDeleteArmed(false), 6000);
      return;
    }

    try {
      if (threadDeleteTimeoutRef.current) window.clearTimeout(threadDeleteTimeoutRef.current);
      await api.deleteThread(thread.id);
      router.push(`/communities/${communitySlug}`);
    } catch (e: any) {
      setError(e?.message || 'Failed to delete thread');
    } finally {
      setThreadDeleteArmed(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!thread) return;

    // If not armed, arm the reply delete and set timeout
    if (!replyArmedSet.has(replyId)) {
      const next = new Set(replyArmedSet);
      next.add(replyId);
      setReplyArmedSet(next);
      // set/replace timeout
      const prev = replyDeleteTimeoutsRef.current.get(replyId);
      if (prev) window.clearTimeout(prev);
      const t = window.setTimeout(() => {
        const s = new Set(replyArmedSet);
        s.delete(replyId);
        setReplyArmedSet(s);
        replyDeleteTimeoutsRef.current.delete(replyId);
      }, 6000);
      replyDeleteTimeoutsRef.current.set(replyId, t);
      return;
    }

    // Confirmed: perform delete
    try {
      const prev = replyDeleteTimeoutsRef.current.get(replyId);
      if (prev) window.clearTimeout(prev);
      replyDeleteTimeoutsRef.current.delete(replyId);
      await api.deleteThreadReply(replyId);
      setReplies(prev => prev.filter(r => r.id !== replyId));
      // Update reply count
      if (thread) {
        setThread(prev => prev ? { ...prev, replyCount: Math.max(0, (prev.replyCount || 0) - 1) } : null);
      }
      // remove armed state
      const s = new Set(replyArmedSet);
      s.delete(replyId);
      setReplyArmedSet(s);
    } catch (e: any) {
      setError(e?.message || 'Failed to delete reply');
    }
  };

  const handleEditReply = (replyId: string, currentContent: string) => {
    setEditingReplyId(replyId);
    setEditingContent(currentContent);
  };

  const handleSaveEdit = async () => {
    if (!editingReplyId || !editingContent.trim()) return;

    try {
      setSavingEdit(true);
      const updatedReply = await api.editThreadReply(editingReplyId, editingContent.trim());
      setReplies(prev => prev.map(r => r.id === editingReplyId ? updatedReply : r));
      setEditingReplyId(null);
      setEditingContent("");
    } catch (e: any) {
      setError(e?.message || 'Failed to edit reply');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingReplyId(null);
    setEditingContent("");
  };

  if (loading) {
    return (
      <div className="content thread space-y-8">
        <div className="card skeleton" style={{ height: 200 }} />
        <div className="card skeleton" style={{ height: 100 }} />
        <div className="card skeleton" style={{ height: 100 }} />
        <div className="card skeleton" style={{ height: 100 }} />
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="content thread">
        <div className="content-body">
          <div className="card">
            <p className="text-red-500">{error || 'Thread not found'}</p>
            <Link href={`/communities/${communitySlug}`}>
              <Button>Back to Community</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content thread">
      {/* Back Navigation */}
      <div className="mb-4">
        <Link href={`/communities/${communitySlug}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
          <ArrowLeft size={16} />
          Back to {thread.community.name}
        </Link>
      </div>

      {/* Thread Header - centered stacked layout */}
      <div className="card relative">

        {/* Delete button in corner for thread owner */}
        {currentUser && thread.user.id === currentUser.id && (
          <div className="absolute right-3 top-3">
            <Button
              variant="danger"
              size="sm"
              className={`small-min ${threadDeleteArmed ? 'confirm' : ''}`}
              onClick={handleDeleteThread}
              aria-label={threadDeleteArmed ? 'Confirm delete thread' : 'Delete thread'}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )}

        <div className="flex flex-col items-center text-center gap-4 py-4">
          <h1 className="text-2xl font-bold">{thread.title}</h1>

          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 justify-center">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0">
                <Link href={`/${thread.user.username}`}>
                  <OptimizedImage
                    src={(thread.user.avatarUrl || "").trim() || "/logo.svg"}
                    alt={thread.user.username}
                    width={24}
                    height={24}
                    className="avatar rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                  />
                </Link>
              </div>
              <span>by @{thread.user.username}</span>
            </div>
            <span>•</span>
            <TimeDisplay date={thread.createdAt} />
            <span>•</span>
            <span className="flex items-center gap-1">
              <MessageSquare size={14} />
              {thread.replyCount || 0} replies
            </span>
          </div>

          {/* action buttons (if any) can be added here; delete is shown in corner */}

        </div>

        <div className="mt-4 prose dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap text-center">{renderCaption(thread.content)}</p>
        </div>
      </div>

      {/* Replies Section */}
      <div className="content-body mt-8">
        {/* Reply Form */}
        <div className="card mb-6">
          <form onSubmit={handleSubmitReply}>
            <div className="space-y-3">
              <textarea
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                placeholder="Write a reply..."
                className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                rows={3}
                maxLength={5000}
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {newReply.length}/5000 characters
                </span>
                <Button
                  type="submit"
                  disabled={!newReply.trim() || submitting}
                  loading={submitting}
                >
                  Post Reply
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Replies List */}
        {replies.length === 0 ? (
          <div className="card">
            <p className="text-gray-500 text-center">No replies yet. Be the first to reply!</p>
          </div>
        ) : (
          replies.map((reply) => (
            <div key={reply.id} className="card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="flex-shrink-0 mr-2">
                      <Link href={`/${reply.user.username}`}>
                        <OptimizedImage
                          src={(reply.user.avatarUrl || "").trim() || "/logo.svg"}
                          alt={reply.user.username}
                          width={24}
                          height={24}
                          className="avatar rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      </Link>
                    </div>
                    <span className="font-medium">@{reply.user.username}</span>
                    <span>•</span>
                    <TimeDisplay date={reply.createdAt} />
                  </div>
                  {currentUser && reply.user.id === currentUser.id && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="small-min"
                        onClick={() => handleEditReply(reply.id, reply.content)}
                        disabled={editingReplyId === reply.id}
                        aria-label="Edit reply"
                      >
                        <Edit3 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`small-min ${replyArmedSet.has(reply.id) ? 'confirm' : ''}`}
                        onClick={async () => {
                          await handleDeleteReply(reply.id);
                        }}
                        aria-label={replyArmedSet.has(reply.id) ? 'Confirm delete reply' : 'Delete reply'}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>
                {editingReplyId === reply.id ? (
                  <div className="mt-3 space-y-3">
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      rows={3}
                      maxLength={5000}
                      disabled={savingEdit}
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {editingContent.length}/5000 characters
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={savingEdit}
                        >
                          <X size={14} className="mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={!editingContent.trim() || savingEdit}
                          loading={savingEdit}
                        >
                          <Check size={14} className="mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{renderCaption(reply.content)}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}