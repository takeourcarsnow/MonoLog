import { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export default function robots(): MetadataRoute.Robots {
  const host = headers().get('host');
  const base = process.env.NEXT_PUBLIC_SITE_URL || `https://${host}`;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: `${base}/sitemap.xml`,
  };
}