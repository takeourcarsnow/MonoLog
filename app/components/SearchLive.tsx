"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useDebouncedValue } from '@/src/lib/hooks/useDebouncedValue';
import { Image as ImageIcon, User, Users as UsersIcon, Search } from 'lucide-react';
import Image from 'next/image';

interface SearchResult {
  posts: any[];
  users: any[];
  communities: any[];
}

export function SearchLive({ initialQuery = '', initialResults = null as any, showButton = false }: { initialQuery?: string; initialResults?: SearchResult | null; showButton?: boolean }) {
  const [value, setValue] = useState(initialQuery || '');
  const debounced = useDebouncedValue(value, 300);
  const [results, setResults] = useState<SearchResult | null>(initialResults || null);
  const [loading, setLoading] = useState(false);

  const doFetch = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) {
      setResults(initialResults || { posts: [], users: [], communities: [] });
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!resp.ok) {
        setResults({ posts: [], users: [], communities: [] });
        return;
      }
      const json = await resp.json();
      setResults({ posts: json.posts || [], users: json.users || [], communities: json.communities || [] });
    } catch (e) {
      setResults({ posts: [], users: [], communities: [] });
    } finally {
      setLoading(false);
    }
  }, [initialResults]);

  // Do debounced fetch when the debounced value changes
  useEffect(() => {
    if (debounced === (initialQuery || '')) {
      // If debounced equals the initial query, show initial results (no fetch)
      setResults(initialResults || null);
      return;
    }
    doFetch(debounced);
  }, [debounced, doFetch, initialQuery, initialResults]);

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
    <div className="search-live" style={{ width: '100%' }}>
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
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes subtleSpin {
              0% { transform: rotate(0deg) scale(1); }
              50% { transform: rotate(180deg) scale(1.1); }
              100% { transform: rotate(360deg) scale(1); }
            }
          `}</style>
          <Image src="/logo.svg" alt="loading" width={32} height={32} className="w-8 h-8" style={{ animation: 'fadeIn 50ms forwards, subtleSpin 1.5s infinite' }} />
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
                      <small>by {post.user?.displayName || post.user?.username}</small>
                    </div>
                  </a>
                </div>
              ))}
            </div>

            <div className="users-list">
              {results.users.slice(0, 10).map((user) => (
                <div key={user.id} className="user-item" style={{ marginBottom: '8px' }}>
                  <a href={`/${user.username}`}>
                    {user.avatarUrl && <Image src={user.avatarUrl} alt={user.displayName || user.username} width={50} height={50} />}
                    <div>
                      <h3>{user.displayName || user.username}</h3>
                      <p>@{user.username}</p>
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
