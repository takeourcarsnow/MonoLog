import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MonoLog — one post per day',
    short_name: 'MonoLog',
    description: 'Daily photo journal. Attach multiple images to a single post.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f0f10',
    theme_color: '#0f0f10',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/logo.svg',
        sizes: '96x96',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    categories: ['social', 'photo', 'lifestyle'],
    prefer_related_applications: false,
  };
}
