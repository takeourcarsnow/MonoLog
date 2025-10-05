import type { MetadataRoute } from 'next';

// Basic sitemap with core static routes. Dynamic user / post routes could be
// appended by querying your data layer if desired.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const routes = ['', '/about', '/feed', '/explore', '/calendar', '/upload', '/favorites'].map(p => ({
    url: base + p,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: p === '' ? 1 : 0.6,
  }));
  return routes;
}
