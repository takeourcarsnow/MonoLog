"use client";

import { useState, useEffect } from 'react';
import { api } from '@/src/lib/api';
import CommunityCardServer from '@/app/components/CommunityCardServer';
import CommunityCardClient from '@/app/components/CommunityCardClient';
import CommunitiesClient from './CommunitiesClient';
import type { HydratedCommunity } from '@/src/lib/types';

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<HydratedCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCommunities = async () => {
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
  };

  useEffect(() => {
    loadCommunities();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      loadCommunities();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  if (loading) {
    return (
      <CommunitiesClient>
        <div className="communities">
          <div className="content-header mt-8 mb-6">
            <div className="text-center w-full">
              <h1 className="content-title inline-flex items-center justify-center gap-2">
                <span className="sr-only">Communities</span>
                <span className="dim">Loading communities...</span>
              </h1>
            </div>
          </div>
          <div className="content-body space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card skeleton" style={{ height: 200 }} />
            ))}
          </div>
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
            <h1 className="content-title inline-flex items-center justify-center gap-2">
              <span className="sr-only">Communities</span>
              <span className="dim">Communities and threads with latest activity are displayed first</span>
            </h1>
          </div>
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
                >
                  <CommunityCardClient
                    communityId={c.id}
                    initialIsMember={c.isMember || false}
                    initialMemberCount={c.memberCount || 0}
                    creatorId={c.creator?.id}
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