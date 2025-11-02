"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDebouncedValue } from '@/src/lib/hooks/useDebouncedValue';
import { Image as ImageIcon, User, Users as UsersIcon, Search, MapPin, Clock } from 'lucide-react';
import Image from 'next/image';
import { useCurrentUser } from '@/lib/hooks';
import { getAccessToken, getSupabaseClient } from '@/src/lib/api/client';
import { SpinningLogo } from './SpinningLogo';
import TimeDisplay from './TimeDisplay';

interface SearchResult {
  posts: any[];
  users: any[];
  communities: any[];
  locations: number;
}

export function SearchLive({ initialQuery = '', initialResults = null as any, showButton = false }: { initialQuery?: string; initialResults?: SearchResult | null; showButton?: boolean }) {
  const [value, setValue] = useState(initialQuery || '');
  const debounced = useDebouncedValue(value, 300);
  const [results, setResults] = useState<SearchResult | null>(initialResults || null);
  const [loading, setLoading] = useState(false);
  const { data: currentUser } = useCurrentUser();

  const doFetch = useCallback(async (q: string) => {
    if (!currentUser) {
      window.location.href = '/profile';
      return;
    }
    if (!q || q.trim().length < 2) {
      setResults(initialResults || { posts: [], users: [], communities: [], locations: 0 });
      return;
    }
    setLoading(true);
    try {
      const sb = getSupabaseClient();
      const token = await getAccessToken(sb);
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const resp = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { headers });
      if (!resp.ok) {
        setResults({ posts: [], users: [], communities: [], locations: 0 });
        return;
      }
      const json = await resp.json();
      setResults({ posts: json.posts || [], users: json.users || [], communities: json.communities || [], locations: json.locations || 0 });
    } catch (e) {
      setResults({ posts: [], users: [], communities: [], locations: 0 });
    } finally {
      setLoading(false);
    }
  }, [initialResults, currentUser]);

  // Do debounced fetch when the debounced value changes
  useEffect(() => {
    if (debounced === (initialQuery || '')) {
      // If debounced equals the initial query, show initial results (no fetch)
      setResults(initialResults || null);
      return;
    }
    doFetch(debounced);
  }, [debounced, doFetch, initialQuery, initialResults]);

  // Sync input with URL search param when present (handles client-side navigation
  // where the server-provided `initialQuery` may not update the mounted client
  // component's state). This ensures clicking a MapPin/Link to /search?q=... will
  // populate the input.
  const searchParams = useSearchParams();
  useEffect(() => {
    try {
      const qp = searchParams?.get?.('q') || '';
      if (qp && qp !== value) {
        setValue(qp);
      }
    } catch (e) {
      // noop
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Immediate search on Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void doFetch(value);
    }
  };

  const showTabs = !loading && results;
  const inputPaddingRight = showTabs ? '120px' : '16px';

  return (
    <div className="search-live" style={{ width: '100%', marginTop: '2rem' }}>
      <div className="search-input-wrap" style={{ position: 'relative', display: 'flex', width: '100%' }}>
        <Search size={16} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search posts, users, communities..."
          className="search-input"
          style={{ flex: 1, width: '100%', paddingLeft: '32px', paddingRight: inputPaddingRight }}
          aria-label="Search"
          autoComplete="off"
        />
        {showTabs && (
          <div
            className="search-tabs"
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 0, alignItems: 'center', color: 'var(--muted)', flexWrap: 'nowrap', flexDirection: 'row', whiteSpace: 'nowrap' }}
            role="tablist"
            aria-label="Search categories"
          >
            <div
              className="tab-item"
              role="button"
              aria-label={`Posts ${results.posts.length}`}
              style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 14, flexDirection: 'row' }}
            >
              <ImageIcon size={12} />
              <span style={{ opacity: 0.9 }}>{results.posts.length}</span>
            </div>

            <div
              className="tab-item"
              role="button"
              aria-label={`Users ${results.users.length}`}
              style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 14, flexDirection: 'row' }}
            >
              <User size={12} />
              <span style={{ opacity: 0.9 }}>{results.users.length}</span>
            </div>

            <div
              className="tab-item"
              role="button"
              aria-label={`Communities ${results.communities.length}`}
              style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 14, flexDirection: 'row' }}
            >
              <UsersIcon size={12} />
              <span style={{ opacity: 0.9 }}>{results.communities.length}</span>
            </div>

            <div
              className="tab-item"
              role="button"
              aria-label={`Locations ${results.locations}`}
              style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 14, flexDirection: 'row' }}
            >
              <MapPin size={12} />
              <span style={{ opacity: 0.9 }}>{results.locations}</span>
            </div>
          </div>
        )}
        {showButton ? (
          <button type="button" className="search-btn" onClick={() => void doFetch(value)} aria-label="Search">
            {/* optional button intentionally left blank for styling or icon injection */}
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="search-results" style={{ width: '100%', marginTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <SpinningLogo size={32} />
        </div>
      ) : results && (
        <div className="search-results" style={{ width: '100%', marginTop: '16px' }}>

          <div className="search-content">
            <div className="posts-list">
              {results.posts.slice(0, 10).map((post) => (
                <div key={post.id} className="post-item" style={{ marginBottom: '8px' }}>
                  <a href={`/post/${post.id}`}>
                    {post.thumbnailUrls?.[0] || post.thumbnailUrl ? (
                      <Image src={post.thumbnailUrls?.[0] || post.thumbnailUrl} alt={post.alt || ''} width={100} height={100} />
                    ) : null}
                    <div className="post-info">
                      <p className="post-caption">{post.caption?.trim() || '(no caption)'}</p>
                      <small style={{ color: 'var(--muted)' }}>@{post.user?.username} · <span className="inline-flex items-center gap-1"><Clock size={12} /> <TimeDisplay date={post.createdAt} className="dim" /></span></small>
                    </div>
                  </a>
                </div>
              ))}
            </div>

            <div className="users-list">
              {results.users.slice(0, 10).map((user) => (
                <div key={user.id} className="user-item" style={{ marginBottom: '8px' }}>
                  <a href={`/${user.username}`} style={{ display: 'flex', gap: 8, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                    {user.avatarUrl && <Image src={user.avatarUrl} alt={user.username} width={50} height={50} />}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{user.username}</h3>
                        {user.displayName ? <small style={{ color: 'var(--muted)', marginLeft: 6 }}>{user.displayName}</small> : null}
                      </div>
                      {user.bio ? <p className="user-bio" style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{user.bio}</p> : null}
                    </div>
                  </a>
                </div>
              ))}
            </div>

            <div className="communities-list">
              {results.communities.slice(0, 10).map((community) => (
                <div key={community.id} className="community-item" style={{ marginBottom: '8px' }}>
                  <a href={`/communities/${community.slug}`}>
                    {community.imageUrl && <Image src={community.imageUrl} alt={community.name} width={50} height={50} />}
                    <div>
                      <h3>{community.name}</h3>
                      <p>{community.description}</p>
                      <small>{community.memberCount} members</small>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
