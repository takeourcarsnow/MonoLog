"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/src/lib/api";
import { Button } from "@/app/components/Button";
import Link from "next/link";
import type { HydratedCommunity } from "@/src/lib/types";
import { AuthRequired } from "./AuthRequired";
import { AuthForm } from "./AuthForm";

export function CreateThreadView() {
  const params = useParams();
  const communitySlug = params.slug as string;
  const navigate = useRouter();

  const [community, setCommunity] = useState<HydratedCommunity | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // auth state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    const loadCommunity = async () => {
      if (!communitySlug) return;
      try {
        const data = await api.getCommunity(communitySlug);
        setCommunity(data);
      } catch (e) {
        setError('Community not found');
      }
    };
    loadCommunity();
  }, [communitySlug]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await api.getCurrentUser();
        setCurrentUser(user);
      } catch (e) {
        // not authenticated
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || loading || !community) return;

    // If not authenticated, show auth UI instead of attempting create
    if (!currentUser) {
      setShowAuthPrompt(true);
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
      // If the API reports unauthenticated, show the auth form so user can sign in
      if (message.includes('Not authenticated') || message.includes('Unauthorized')) {
        setShowAuthPrompt(true);
        setError(null);
        return;
      }
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
  if (showAuthPrompt || !currentUser) {
    return (
      <AuthRequired>
        <AuthForm onClose={async () => {
          const user = await api.getCurrentUser();
          setCurrentUser(user);
          setShowAuthPrompt(false);
        }} />
      </AuthRequired>
    );
  }

  if (!community && !error) {
    return (
      <div className="content create-thread">
        <div className="card skeleton" style={{ height: 100 }} />
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="content create-thread">
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
    <div className="content create-thread">
      <div className="content-body">
        <div className="card max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Enter thread title"
                maxLength={200}
                required
              />
              <p className="text-sm text-gray-500 mt-1">{title.length}/200 characters</p>
            </div>

            <div>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Write your thread content here..."
                rows={8}
                maxLength={10000}
                required
              />
              <p className="text-sm text-gray-500 mt-1">{content.length}/10,000 characters</p>
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div className="flex gap-3">
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