// Enhanced service worker for caching static assets, images, and API responses
// Using Workbox for advanced features
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// Workbox configuration
workbox.setConfig({
  debug: false,
});

// Cache names
const CACHE_NAME = 'monolog-v4';
const STATIC_CACHE_NAME = 'monolog-static-v4';
const IMAGE_CACHE_NAME = 'monolog-images-v4';
const API_CACHE_NAME = 'monolog-api-v4';
const OFFLINE_CACHE_NAME = 'monolog-offline-v4';

// Background sync queues
const bgSyncPlugin = new workbox.backgroundSync.BackgroundSyncPlugin('posts-queue', {
  maxRetentionTime: 24 * 60, // Retry for max of 24 Hours (specified in minutes)
});

const commentsBgSyncPlugin = new workbox.backgroundSync.BackgroundSyncPlugin('comments-queue', {
  maxRetentionTime: 24 * 60,
});

const STATIC_CACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/offline',
  '/logo.svg',
];

// Cache images for longer periods
const IMAGE_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const API_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes
const OFFLINE_FALLBACK_URL = '/offline';

// Background sync tags
const BG_SYNC_POSTS = 'background-sync-posts';
const BG_SYNC_COMMENTS = 'background-sync-comments';

// Precache static assets
workbox.precaching.precacheAndRoute(STATIC_CACHE_URLS);

// Install event - additional setup
self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![CACHE_NAME, STATIC_CACHE_NAME, IMAGE_CACHE_NAME, API_CACHE_NAME, OFFLINE_CACHE_NAME].includes(cacheName)) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Allow the page to trigger skipWaiting (so the new SW can take control immediately)
self.addEventListener('message', (event) => {
  try {
    if (!event.data) return;
    if (event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  } catch (e) {
    // ignore
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === BG_SYNC_POSTS) {
    event.waitUntil(syncPosts());
  } else if (event.tag === BG_SYNC_COMMENTS) {
    event.waitUntil(syncComments());
  }
});

// Periodic background sync for content refresh
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(periodicContentSync());
  }
});

// Push notification support
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      tag: data.tag || 'default',
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'MonoLog', options)
    );
  } catch (error) {
    console.error('Push notification error:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  let url = '/';

  if (action === 'view-post' && data.postId) {
    url = `/post/${data.postId}`;
  } else if (action === 'view-profile' && data.userId) {
    url = `/profile/${data.userId}`;
  } else if (action === 'view-comments' && data.postId) {
    url = `/post/${data.postId}#comments`;
  } else if (data.url) {
    url = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Background sync functions
async function syncPosts() {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    // Get pending posts from IndexedDB or similar storage
    // This would need to be implemented based on your app's storage mechanism
    const pendingPosts = await getPendingPosts();

    for (const post of pendingPosts) {
      try {
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(post),
        });

        if (response.ok) {
          // Remove from pending storage
          await removePendingPost(post.id);
        }
      } catch (error) {
        console.error('Failed to sync post:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function syncComments() {
  try {
    const pendingComments = await getPendingComments();

    for (const comment of pendingComments) {
      try {
        const response = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(comment),
        });

        if (response.ok) {
          await removePendingComment(comment.id);
        }
      } catch (error) {
        console.error('Failed to sync comment:', error);
      }
    }
  } catch (error) {
    console.error('Comment sync failed:', error);
  }
}

async function periodicContentSync() {
  try {
    // Refresh cached API data
    const cache = await caches.open(API_CACHE_NAME);
    const keys = await cache.keys();

    for (const request of keys) {
      if (request.url.includes('/api/')) {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            await cache.put(request, networkResponse);
          }
        } catch (error) {
          // Ignore fetch errors during periodic sync
        }
      }
    }
  } catch (error) {
    console.error('Periodic sync failed:', error);
  }
}

// Placeholder functions for pending data storage (implement based on your storage solution)
async function getPendingPosts() { return []; }
async function removePendingPost(id) { }
async function getPendingComments() { return []; }
async function removePendingComment(id) { }

// Helper: check if request is for an image
function isImageRequest(request) {
  const acceptHeader = request.headers.get('accept') || '';
  return request.destination === 'image' ||
         acceptHeader.includes('image/') ||
         /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(request.url);
}

// Helper: check if request is for API
function isApiRequest(request) {
  return request.url.includes('/api/');
}

// Helper: check if response should be cached
function shouldCache(response) {
  return response && response.ok && response.status === 200;
}

// Workbox routing for different request types

// Images - Cache first with expiration
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: IMAGE_CACHE_NAME,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        maxEntries: 100,
      }),
    ],
  })
);

// API routes - Network first with background sync
workbox.routing.registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new workbox.strategies.NetworkFirst({
    cacheName: API_CACHE_NAME,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
      bgSyncPlugin,
    ],
  })
);

// Navigation routes - Network first with offline fallback
workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new workbox.strategies.NetworkFirst({
    cacheName: STATIC_CACHE_NAME,
    plugins: [
      {
        handlerDidError: async () => {
          const cache = await caches.open(OFFLINE_CACHE_NAME);
          return await cache.match('/offline') || new Response('', { status: 404 });
        },
      },
    ],
  })
);

// Static assets - Cache first
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'script' ||
                   request.destination === 'style' ||
                   request.destination === 'font',
  new workbox.strategies.CacheFirst({
    cacheName: STATIC_CACHE_NAME,
  })
);

// Background sync for offline actions (fallback for non-Workbox requests)
self.addEventListener('sync', (event) => {
  if (event.tag === BG_SYNC_POSTS) {
    event.waitUntil(syncPosts());
  } else if (event.tag === BG_SYNC_COMMENTS) {
    event.waitUntil(syncComments());
  }
});

// Periodic background sync for content refresh
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(periodicContentSync());
  }
});

// Push notification support
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      tag: data.tag || 'default',
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'MonoLog', options)
    );
  } catch (error) {
    console.error('Push notification error:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  let url = '/';

  if (action === 'view-post' && data.postId) {
    url = `/post/${data.postId}`;
  } else if (action === 'view-profile' && data.userId) {
    url = `/profile/${data.userId}`;
  } else if (action === 'view-comments' && data.postId) {
    url = `/post/${data.postId}#comments`;
  } else if (data.url) {
    url = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});