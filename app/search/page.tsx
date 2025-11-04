import { redirect } from 'next/navigation';
import { Search, Clock } from 'lucide-react';
import { SearchClient } from "@/app/components/search/SearchClient";
import { SearchLive } from "@/app/components/search/SearchLive";
import Image from 'next/image';
import TimeDisplay from "@/app/components/ui/TimeDisplay";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';

interface SearchResult {
  posts: any[];
  users: any[];
  communities: any[];
  locations: number;
}

export default async function SearchPage({ searchParams }: { searchParams: any }) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <SearchClient>
        <div className="view-fade">
          <div className="empty feed-empty" style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', borderRadius: 16 }} aria-hidden>
                <Search size={56} strokeWidth={1.5} />
              </div>
              <h2 style={{ margin: '6px 0 0 0', fontSize: '1.15rem' }}>Discover Content</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 420 }}>Sign in to search for posts, users, and communities. Find people with similar interests and explore trending content.</p>
              <Link href="/explore" className="btn" style={{ marginTop: 8 }}>Explore posts</Link>
            </div>
          </div>
        </div>
      </SearchClient>
    );
  }

  // In some Next.js versions `searchParams` may be a Promise that must be awaited
  // before accessing properties. Await to ensure compatibility.
  const params = await searchParams;
  const query = params?.q?.trim() || '';

  let results: SearchResult | null = null;

  if (query && query.length >= 2) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const resp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/api/search?q=${encodeURIComponent(query)}`, {
        headers,
      });
      if (resp.ok) {
        const json = await resp.json();
        results = json;
      } else {
        results = { posts: [], users: [], communities: [], locations: 0 };
      }
    } catch (error) {
      console.error('Search error:', error);
      results = { posts: [], users: [], communities: [], locations: 0 };
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
          {/* Client-side live search — replaces server form for interactive searches. */}
          <SearchLive initialQuery={query} initialResults={results} />
        </div>

        {results && (
          <div className="search-results">
            <div className="search-content">
              <div className="posts-list">
                {results.posts.map((post) => (
                  <div key={post.id} className="post-item">
                    <a href={`/post/${post.id}`}>
                      {post.thumbnailUrls?.[0] || post.thumbnailUrl ? (
                        <Image
                          src={post.thumbnailUrls?.[0] || post.thumbnailUrl}
                          alt={post.alt || ''}
                          width={100}
                          height={100}
                          className="post-thumbnail"
                        />
                      ) : null}
                      <div className="post-info">
                        <p className="post-caption">{post.caption?.trim() || '(no caption)'}</p>
                        <small style={{ color: 'var(--muted)' }}>@{post.user.username} · <span className="inline-flex items-center gap-2"><Clock size={12} className="mr-1" />{"\u00A0"}<TimeDisplay date={post.createdAt} className="dim" /></span></small>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
              <div className="users-list">
                {results.users.map((user) => (
                  <div key={user.id} className="user-item">
                    <a href={`/${user.username}`}>
                      <Image
                        src={user.avatarUrl}
                        alt={user.username}
                        width={50}
                        height={50}
                        className="user-avatar"
                      />
                      <div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>@{user.username}</h3>
                          {user.displayName ? <small style={{ color: 'var(--muted)', marginLeft: 6 }}>{user.displayName}</small> : null}
                        </div>
                        {user.bio ? <p className="user-bio" style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>{user.bio}</p> : null}
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
                        <Image
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