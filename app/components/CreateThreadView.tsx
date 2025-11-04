"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/src/lib/api";
import { Button } from "@/app/components/Button";
import Link from "next/link";
import type { HydratedCommunity } from "@/src/lib/types";
import { AuthRequired } from "./AuthRequired";
import { AuthForm } from "./AuthForm";
import { useCommunity } from "@/src/lib/hooks/useCommunity";
import { useAuthState } from "@/src/lib/hooks/useAuthState";

export function CreateThreadView() {
  const params = useParams();
  const communitySlug = params.slug as string;
  const navigate = useRouter();

  const { community, loading: communityLoading, error: communityError } = useCommunity(communitySlug);
  const { currentUser, authLoading, refreshAuth } = useAuthState();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || loading || !community) return;

    // If not authenticated, show auth UI instead of attempting create
    if (!currentUser) {
      setError('Please sign in to create a thread');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const thread = await api.createThread({
        communityId: community.id,
        title: title.trim(),
        content: content.trim()
      });
      navigate.push(`/communities/${communitySlug}/thread/${thread.slug}`);
    } catch (err: any) {
      const message = err?.message || String(err);
      setError(message || 'Failed to create thread');
    } finally {
      setLoading(false);
    }
  };

  // If auth check is still pending show skeleton
  if (authLoading) {
    return (
      <div className="content">
        <div className="content-body">
          <div className="card max-w-2xl communities">
            <div className="animate-pulse space-y-6">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If we were prompted to sign in (or user is not signed in) show auth UI
  if (!currentUser) {
    return (
      <AuthRequired>
        <AuthForm onClose={async () => {
          await refreshAuth();
        }} />
      </AuthRequired>
    );
  }

  if (communityLoading) {
    return (
      <div className="content create-thread">
        <div className="card skeleton" style={{ height: 100 }} />
      </div>
    );
  }

  if (communityError || !community) {
    return (
      <div className="content create-thread">
        <div className="content-body">
          <div className="card">
            <p className="text-red-500">{communityError || 'Community not found'}</p>
            <Link href="/communities">
              <Button>Back to Communities</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content create-thread">
      <div className="content-body">
        <div className="card max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input mb-4"
              style={{ marginBottom: '1rem' }}
              placeholder="Enter thread title"
              maxLength={200}
              required
            />

            <div className="input-wrapper">
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="input has-counter resize-none"
                placeholder="Write your thread content here..."
                rows={8}
                maxLength={10000}
                required
              />
              <div className="field-counter">{content.length}/10,000</div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <div className="flex gap-3 justify-center">
              <Button type="submit" disabled={!title.trim() || !content.trim() || loading} loading={loading}>
                Create Thread
              </Button>
              <Link href={`/communities/${communitySlug}`}>
                <Button variant="ghost">Cancel</Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}