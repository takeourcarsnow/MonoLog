"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/app/components/ui/Button";
import Link from "next/link";
import type { HydratedCommunity } from "@/lib/types";
import { AuthRequired } from "@/app/components/auth/AuthRequired";
import { AuthForm } from "@/app/components/auth/AuthForm";
import { useCommunity } from "@/lib/hooks/useCommunity";
import { useAuthState } from "@/lib/hooks/useAuthState";

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

  // If auth check is still pending show nothing
  if (authLoading) {
    return null;
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
    return null;
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
    <div style={{ maxWidth: '42rem', margin: '1rem auto', borderRadius: '0.5rem', padding: '1.5rem', border: '1px solid var(--border)' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.25rem', backgroundColor: 'var(--bg)', color: 'var(--text)' }}
          placeholder="Enter thread title"
          maxLength={200}
          required
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.25rem', resize: 'none', backgroundColor: 'var(--bg)', color: 'var(--text)' }}
          placeholder="Write your thread content here..."
          rows={8}
          maxLength={10000}
          required
        />

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
          <Button type="submit" variant="ghost" disabled={!title.trim() || !content.trim() || loading} loading={loading}>
            Create Thread
          </Button>
          <Link href={`/communities/${communitySlug}`}>
            <Button variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}