"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import { MessageSquare, ArrowLeft, Trash2 } from "lucide-react";
import type { HydratedThread, HydratedThreadReply } from "@/src/lib/types";
import { Button } from "./Button";
import Link from "next/link";
import { OptimizedImage } from "./OptimizedImage";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/hooks/useAuth";

export function ThreadView() {
  const params = useParams();
  const router = useRouter();
  const { me: currentUser } = useAuth();
  const communitySlug = params.slug as string;
  const threadId = params.threadId as string;

  const [thread, setThread] = useState<HydratedThread | null>(null);
  const [replies, setReplies] = useState<HydratedThreadReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newReply, setNewReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadThread = useCallback(async () => {
    if (!threadId) return;

    try {
      setLoading(true);
      setError(null);
      const [threadData, repliesData] = await Promise.all([
        api.getThread(threadId),
        api.getThreadReplies(threadId)
      ]);
      setThread(threadData);
      setReplies(repliesData);
    } catch (e: any) {
      setError(e?.message || 'Failed to load thread');
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || submitting) return;

    try {
      setSubmitting(true);
      const reply = await api.addThreadReply(threadId, newReply.trim());
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

    if (!confirm('Are you sure you want to delete this thread? This action cannot be undone.')) return;

    try {
      await api.deleteThread(thread.id);
      router.push(`/communities/${communitySlug}`);
    } catch (e: any) {
      setError(e?.message || 'Failed to delete thread');
    }
  };

  if (loading) {
    return (
      <div className="content">
        <div className="card skeleton" style={{ height: 200 }} />
        <div className="content-body">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: 100 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="content">
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
    <div className="content">
      {/* Back Navigation */}
      <div className="mb-4">
        <Link href={`/communities/${communitySlug}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
          <ArrowLeft size={16} />
          Back to {thread.community.name}
        </Link>
      </div>

      {/* Thread Header */}
      <div className="card">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <OptimizedImage
              src={(thread.user.avatarUrl || "").trim() || "/logo.svg"}
              alt={thread.user.displayName || thread.user.username}
              width={48}
              height={48}
              className="rounded-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">{thread.title}</h1>
              {currentUser && thread.user.id === currentUser.id && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteThread}
                >
                  <Trash2 size={16} />
                  Delete Thread
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <span>by {thread.user.displayName || thread.user.username}</span>
              <span>•</span>
              <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MessageSquare size={14} />
                {thread.replyCount || 0} replies
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 prose dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap">{thread.content}</p>
        </div>
      </div>

      {/* Replies Section */}
      <div className="content-body">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Replies ({replies.length})</h2>
        </div>

        {/* Reply Form */}
        <div className="card mb-6">
          <form onSubmit={handleSubmitReply}>
            <div className="space-y-3">
              <textarea
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                placeholder="Write a reply..."
                className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
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
            <p className="text-gray-500">No replies yet. Be the first to reply!</p>
          </div>
        ) : (
          replies.map((reply) => (
            <div key={reply.id} className="card">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <OptimizedImage
                    src={(reply.user.avatarUrl || "").trim() || "/logo.svg"}
                    alt={reply.user.displayName || reply.user.username}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="font-medium">{reply.user.displayName || reply.user.username}</span>
                      <span>•</span>
                      <span>{new Date(reply.createdAt).toLocaleDateString()}</span>
                    </div>
                    {currentUser && reply.user.id === currentUser.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!confirm('Are you sure you want to delete this reply?')) return;
                          try {
                            await api.deleteThreadReply(reply.id);
                            setReplies(prev => prev.filter(r => r.id !== reply.id));
                            // Update reply count
                            if (thread) {
                              setThread(prev => prev ? { ...prev, replyCount: Math.max(0, (prev.replyCount || 0) - 1) } : null);
                            }
                          } catch (e: any) {
                            setError(e?.message || 'Failed to delete reply');
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                  <div className="mt-2 prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{reply.content}</p>
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