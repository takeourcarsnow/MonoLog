import { api } from '@/src/lib/api';
import { redirect } from 'next/navigation';
import { Search } from 'lucide-react';
import { SearchClient } from '@/app/components/SearchClient';

interface SearchResult {
  posts: any[];
  users: any[];
  communities: any[];
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q?.trim() || '';

  let results: SearchResult | null = null;

  if (query && query.length >= 2) {
    try {
      results = await api.search(query);
    } catch (error) {
      console.error('Search error:', error);
      results = { posts: [], users: [], communities: [] };
    }
  }

  async function performSearch(formData: FormData) {
    'use server';
    const q = formData.get('q')?.toString()?.trim();
    if (q) {
      redirect(`/search?q=${encodeURIComponent(q)}`);
    } else {
      redirect('/search');
    }
  }

  return (
    <SearchClient>
      <div className="search-page">
        <div className="search-header">
          <form action={performSearch} className="search-form">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search posts, users, communities..."
              className="search-input"
            />
            <button type="submit" className="search-btn" aria-label="Search">
              <Search size={20} strokeWidth={2} />
            </button>
          </form>
        </div>

        {results && (
          <div className="search-results">
            <div className="search-tabs">
              <div>Posts ({results.posts.length})</div>
              <div>Users ({results.users.length})</div>
              <div>Communities ({results.communities.length})</div>
            </div>

            <div className="search-content">
              <div className="posts-list">
                {results.posts.map((post) => (
                  <div key={post.id} className="post-item">
                    <a href={`/post/${post.id}`}>
                      {post.thumbnailUrls?.[0] || post.thumbnailUrl ? (
                        <img
                          src={post.thumbnailUrls?.[0] || post.thumbnailUrl}
                          alt={post.alt || ''}
                          width={100}
                          height={100}
                          className="post-thumbnail"
                        />
                      ) : null}
                      <div className="post-info">
                        <p className="post-caption">{post.caption?.trim() || '(no caption)'}</p>
                        <small>by {post.user.displayName || post.user.username}</small>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
              <div className="users-list">
                {results.users.map((user) => (
                  <div key={user.id} className="user-item">
                    <a href={`/${user.username}`}>
                      <img
                        src={user.avatarUrl}
                        alt={user.displayName || user.username}
                        width={50}
                        height={50}
                        className="user-avatar"
                      />
                      <div>
                        <h3>{user.displayName || user.username}</h3>
                        <p>@{user.username}</p>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
              <div className="communities-list">
                {results.communities.map((community) => (
                  <div key={community.id} className="community-item">
                    <a href={`/communities/${community.slug}`}>
                      {community.imageUrl && (
                        <img
                          src={community.imageUrl}
                          alt={community.name}
                          width={50}
                          height={50}
                          className="community-image"
                        />
                      )}
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
    </SearchClient>
  );
}