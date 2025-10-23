// Lightweight, self-contained service worker
// Replaces a Workbox-based SW to avoid external CDN imports and CSP issues.

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `monolog-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `monolog-images-${CACHE_VERSION}`;
const API_CACHE = `monolog-api-${CACHE_VERSION}`;
const OFFLINE_CACHE = `monolog-offline-${CACHE_VERSION}`;

const STATIC_PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/offline',
  '/logo.svg',
  '/icon-192.png',
];

const OFFLINE_FALLBACK = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (![STATIC_CACHE, IMAGE_CACHE, API_CACHE, OFFLINE_CACHE].includes(k)) {
            return caches.delete(k);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Helper: simple network-first for navigations
async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone()).catch(() => {});
      return response;
    }
  } catch (err) {
    // network failed
  }

  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const offlineCache = await caches.open(OFFLINE_CACHE);
  const offlineResp = await offlineCache.match(OFFLINE_FALLBACK);
  return offlineResp || new Response('Offline', { status: 503, statusText: 'Offline' });
}

// Helper: cache-first for images
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    return cached || new Response('', { status: 404 });
  }
}

// Helper: network-first for API calls
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests (leave external hosts to browser)
  if (url.origin !== self.origin && url.origin !== location.origin) return;

  // Navigation (SPA routes)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Images
  if (request.destination === 'image' || /\.(png|jpg|jpeg|gif|webp|svg|ico)$/.test(url.pathname)) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Scripts/styles/fonts: try cache then network
  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Default: passthrough
});

// Message support (skip waiting)
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notifications
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
    event.waitUntil(self.registration.showNotification(data.title || 'MonoLog', options));
  } catch (error) {
    console.error('Push notification error:', error);
  }
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = '/';
  if (data.url) url = data.url;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});