"use client";

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import CommunityCardServer from "@/app/components/communities/CommunityCardServer";
import CommunityCardClient from "@/app/components/communities/CommunityCardClient";
import CommunitiesClient from './CommunitiesClient';
import type { HydratedCommunity } from '@/lib/types';
import Link from 'next/link';
import { Button } from "@/app/components/ui/Button";
import NextImage from 'next/image';
import { currentTheme } from '@/lib/theme';
import { CommunitiesSkeleton } from "@/app/components/communities/CommunitiesSkeleton";
import { Plus, Users } from 'lucide-react';
import ScrollingHint from "@/app/components/ui/ScrollingHint";
import { useAuth } from "@/lib/hooks/useAuth";

export const dynamic = 'force-dynamic';

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<HydratedCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMessage, setShowMessage] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(currentTheme());
  const { me } = useAuth();

  const loadCommunities = useCallback(async () => {
    if (!me) return; // Skip loading if not authenticated

    try {
      setLoading(true);
      setError(null);
      const result = await api.getCommunities();
      setCommunities(result || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load communities');
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]); // Depend on loadCommunities to reload when it changes, but since me is dep, it will reload when me changes

  useEffect(() => {
    const handleCommunityDeleted = () => loadCommunities();
    window.addEventListener('communityDeleted', handleCommunityDeleted);
    return () => window.removeEventListener('communityDeleted', handleCommunityDeleted);
  }, [loadCommunities]);

  useEffect(() => {
    const timer = setTimeout(() => setShowMessage(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleThemeChange = () => setTheme(currentTheme());
    window.addEventListener('theme:changed', handleThemeChange);
    return () => window.removeEventListener('theme:changed', handleThemeChange);
  }, []);

  // Show empty state for unauthenticated users
  if (me === undefined) {
    return (
      <CommunitiesClient>
        <div className="view-fade">
        </div>
      </CommunitiesClient>
    );
  }

  if (!me) {
    return (
      <CommunitiesClient>
        <div className="view-fade">
          <div className="empty feed-empty" style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', borderRadius: 16 }} aria-hidden>
                <Users size={56} strokeWidth={1.5} />
              </div>
              <h2 style={{ margin: '6px 0 0 0', fontSize: '1.15rem' }}>Join Communities</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 420 }}>Sign in to discover and join communities, follow conversations, and connect with people who share your interests.</p>
            </div>
          </div>
        </div>
      </CommunitiesClient>
    );
  }

  if (loading) {
    return (
      <CommunitiesClient>
        <div className="view-fade">
          <CommunitiesSkeleton />
        </div>
      </CommunitiesClient>
    );
  }

  if (error) {
    return (
      <CommunitiesClient>
        <div className="communities">
          <div className="content-header mt-8 mb-6">
            <div className="text-center w-full">
              <h1 className="content-title inline-flex items-center justify-center gap-2">
                <span className="sr-only">Communities</span>
                <span className="dim">Unable to load communities</span>
              </h1>
            </div>
          </div>
          <div className="content-body space-y-6">
            <div className="card">
              <p className="text-red-500">{error}</p>
            </div>
          </div>
        </div>
      </CommunitiesClient>
    );
  }

  return (
    <CommunitiesClient>
      <div className="communities">
        <div className="content-header mt-8 mb-6">
          <div className="text-center w-full">
            <h1 className="content-title inline-flex items-center justify-center gap-2 !font-normal">
              <span className="sr-only">Communities</span>
              <ScrollingHint
                messages={[
                  'Communities and threads with latest activity are displayed first',
                  'Join communities to follow conversations you care about',
                  'Create a community to start new discussions with others',
                ]}
                interval={5500}
                className={`dim !font-normal italic transition-opacity duration-300 ${showMessage ? 'opacity-100' : 'opacity-0'}`}
              />
            </h1>
          </div>
        </div>

        <div className="content-actions mt-6 mb-10 flex justify-center w-full">
          <Link href="/communities/create">
            <Button title="Create a Community" variant="ghost" className="btn-no-bg keep-border no-effects">Create a Community</Button>
          </Link>
        </div>

        <div className="content-body space-y-6">
          {communities.length === 0 ? (
            <div className="card">
              <p>No communities yet. Be the first to create one!</p>
            </div>
          ) : (
            communities.map((c: HydratedCommunity) => (
              <div key={c.id}>
                <CommunityCardServer
                  id={c.id}
                  name={c.name}
                  slug={c.slug}
                  description={c.description}
                  imageUrl={c.imageUrl}
                  memberCount={c.memberCount}
                  threadCount={c.threadCount}
                  creator={c.creator}
                  showCreator={false}
                  lastActivity={(c as any).lastActivity || (c as any).last_activity}
                >
                  <CommunityCardClient
                    communityId={c.id}
                    initialIsMember={c.isMember || false}
                    initialMemberCount={c.memberCount || 0}
                    creatorId={c.creator?.id}
                    hideInlineJoin={true}
                  />
                </CommunityCardServer>
              </div>
            ))
          )}
        </div>
      </div>
    </CommunitiesClient>
  );
}