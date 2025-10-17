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
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-1024.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['social', 'photo', 'lifestyle'],
    prefer_related_applications: false,
    // PWA shortcuts for quick actions
    shortcuts: [
      {
        name: 'New Post',
        short_name: 'New Post',
        description: 'Create a new daily post',
        url: '/?action=new-post',
        icons: [{ src: '/logo.svg', sizes: '96x96' }],
      },
      {
        name: 'Calendar View',
        short_name: 'Calendar',
        description: 'View your posts in calendar format',
        url: '/calendar',
        icons: [{ src: '/logo.svg', sizes: '96x96' }],
      },
      {
        name: 'Explore',
        short_name: 'Explore',
        description: 'Discover other users\' posts',
        url: '/explore',
        icons: [{ src: '/logo.svg', sizes: '96x96' }],
      },
    ],
    // Enhanced PWA features
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    // edge_side_panel: {
    //   preferred_width: 400,
    // },
    launch_handler: {
      // client_mode: 'focus-existing',
    },
    // handle_links: 'preferred',
    file_handlers: [
      {
        action: '/upload',
        accept: [
          {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
          },
        ],
      },
    ],
    share_target: {
      action: '/?share=true',
      method: 'post',
      enctype: 'multipart/form-data',
      params: [
        {
          name: 'title',
          value: 'title',
        },
        {
          name: 'text',
          value: 'text',
        },
        {
          name: 'url',
          value: 'url',
        },
      ],
    },
  };
}
