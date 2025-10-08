import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MonoLog — Your day in pictures.',
    short_name: 'MonoLog',
  description: 'MonoLog — Your day in pictures. A focused daily photo journal: create one post each day and attach multiple images to tell a fuller story.',
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
