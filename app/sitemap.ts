import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { api } from '@/src/lib/api';
import { CONFIG } from '@/src/lib/config';

// Generate a sitemap containing static pages plus dynamic user profiles and
// recent public posts. This runs on the server and uses the server-side API
// adapter to query the database (Supabase) when available.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = headers().get('host');
  const base = process.env.NEXT_PUBLIC_SITE_URL || `https://${host}`;

  const now = new Date();
  // Static routes
  const routes: MetadataRoute.Sitemap = [
    { url: base + '/', lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: base + '/about', lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: base + '/feed', lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: base + '/explore', lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: base + '/calendar', lastModified: now, changeFrequency: 'weekly', priority: 0.4 },
    { url: base + '/upload', lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: base + '/favorites', lastModified: now, changeFrequency: 'weekly', priority: 0.3 },
  ];

  try {
    // Fetch users and add profile URLs
    if (api && typeof api.getUsers === 'function') {
      const users = await api.getUsers();
      if (Array.isArray(users)) {
        for (const u of users) {
          if (u && u.username) {
            const url = `${base}/${encodeURIComponent(u.username)}`;
            routes.push({ url, lastModified: new Date(u.joinedAt || now.toISOString()), changeFrequency: 'weekly', priority: 0.6 });
          }
        }
      }
    }

    // Fetch recent public posts. Use explore feed which returns public posts,
    // then create post URLs matching the client-side routing pattern.
    if (api && typeof api.getExploreFeed === 'function') {
      const posts = await api.getExploreFeed();
      if (Array.isArray(posts)) {
        // limit to first 1000 posts to keep sitemap reasonably sized
        const limit = Math.min(posts.length, 1000);
        for (let i = 0; i < limit; i++) {
          const p = posts[i];
          if (!p) continue;
          const username = p.user?.username || p.userId;
          const shortId = (p.id || '').slice(0, 8);
          const url = `${base}/post/${encodeURIComponent(username)}-${shortId}`;
          routes.push({ url, lastModified: new Date(p.createdAt || now.toISOString()), changeFrequency: 'monthly', priority: 0.6 });
        }
      }
    }
  } catch (e) {
    // On any error, return at least the static routes. Avoid failing the whole
    // sitemap generation when Supabase isn't configured.
    // eslint-disable-next-line no-console
    console.warn('sitemap generation: dynamic entries failed', e);
  }

  return routes;
}
