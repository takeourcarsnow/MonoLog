// Basic service worker for caching static assets
// Bump this value when releasing a new service worker to force cache refreshes
const CACHE_NAME = 'monolog-v2';
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/logo.svg',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
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

// Helper: same-origin check
function isSameOrigin(request) {
  try {
    const url = new URL(request.url);
    return url.origin === self.location.origin;
  } catch (e) {
    return false;
  }
}

// Fetch event - use network-first for navigations, stale-while-revalidate for other assets
self.addEventListener('fetch', (event) => {
  // Only handle GET and same-origin requests
  if (event.request.method !== 'GET') return;
  if (!isSameOrigin(event.request)) return;

  // Skip API calls
  if (event.request.url.includes('/api/')) return;

  const acceptHeader = event.request.headers.get('accept') || '';
  const isNavigation = event.request.mode === 'navigate' || acceptHeader.includes('text/html');

  if (isNavigation) {
    // Network-first for navigation (HTML) requests so users get the freshest page
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Cache successful navigations for offline fallback
          if (networkResponse && networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/')) // fallback to cached root
    );
    return;
  }

  // For other requests use stale-while-revalidate: return cached if present, and update cache in background
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => undefined);

      // Prefer cached response if available, otherwise wait for network
      return cachedResponse || networkFetch;
    })
  );
});