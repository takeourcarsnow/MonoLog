// Enhanced service worker for caching static assets, images, and API responses
// Bump this value when releasing a new service worker to force cache refreshes
const CACHE_NAME = 'monolog-v3';
const STATIC_CACHE_NAME = 'monolog-static-v3';
const IMAGE_CACHE_NAME = 'monolog-images-v3';
const API_CACHE_NAME = 'monolog-api-v3';

const STATIC_CACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/logo.svg',
];

// Cache images for longer periods
const IMAGE_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const API_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
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
          if (![CACHE_NAME, STATIC_CACHE_NAME, IMAGE_CACHE_NAME, API_CACHE_NAME].includes(cacheName)) {
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

// Fetch event - enhanced caching strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET and same-origin requests
  if (event.request.method !== 'GET') return;
  if (!isSameOrigin(event.request)) return;

  const acceptHeader = event.request.headers.get('accept') || '';
  const isNavigation = event.request.mode === 'navigate' || acceptHeader.includes('text/html');

  if (isNavigation) {
    // Network-first for navigation (HTML) requests so users get the freshest page
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Cache successful navigations for offline fallback
          if (shouldCache(networkResponse)) {
            const copy = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/')) // fallback to cached root
    );
    return;
  }

  if (isImageRequest(event.request)) {
    // Cache-first strategy for images with TTL
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Check if cached response is still fresh
          const cachedTime = new Date(cachedResponse.headers.get('sw-cache-time') || 0).getTime();
          const now = Date.now();
          if (now - cachedTime < IMAGE_CACHE_MAX_AGE) {
            return cachedResponse;
          }
        }

        // Fetch fresh image and cache it
        return fetch(event.request).then((networkResponse) => {
          if (shouldCache(networkResponse)) {
            const copy = networkResponse.clone();
            // Add cache timestamp header
            const headers = new Headers(copy.headers);
            headers.set('sw-cache-time', new Date().toISOString());
            const modifiedResponse = new Response(copy.body, {
              status: copy.status,
              statusText: copy.statusText,
              headers: headers
            });
            caches.open(IMAGE_CACHE_NAME).then((cache) => cache.put(event.request, modifiedResponse));
          }
          return networkResponse;
        }).catch(() => {
          // Return cached version even if expired when offline
          return cachedResponse || new Response('', { status: 404 });
        });
      })
    );
    return;
  }

  if (isApiRequest(event.request)) {
    // Stale-while-revalidate for API calls with short TTL
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Check if cached response is still fresh
          const cachedTime = new Date(cachedResponse.headers.get('sw-cache-time') || 0).getTime();
          const now = Date.now();
          if (now - cachedTime < API_CACHE_MAX_AGE) {
            // Return cached response and update in background
            fetch(event.request).then((networkResponse) => {
              if (shouldCache(networkResponse)) {
                const copy = networkResponse.clone();
                const headers = new Headers(copy.headers);
                headers.set('sw-cache-time', new Date().toISOString());
                const modifiedResponse = new Response(copy.body, {
                  status: copy.status,
                  statusText: copy.statusText,
                  headers: headers
                });
                caches.open(API_CACHE_NAME).then((cache) => cache.put(event.request, modifiedResponse));
              }
            }).catch(() => {}); // Ignore background fetch failures
            return cachedResponse;
          }
        }

        // Fetch fresh API response
        return fetch(event.request).then((networkResponse) => {
          if (shouldCache(networkResponse)) {
            const copy = networkResponse.clone();
            const headers = new Headers(copy.headers);
            headers.set('sw-cache-time', new Date().toISOString());
            const modifiedResponse = new Response(copy.body, {
              status: copy.status,
              statusText: copy.statusText,
              headers: headers
            });
            caches.open(API_CACHE_NAME).then((cache) => cache.put(event.request, modifiedResponse));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // For other requests use stale-while-revalidate: return cached if present, and update cache in background
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (shouldCache(networkResponse)) {
            const copy = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => undefined);

      // Prefer cached response if available, otherwise wait for network
      return cachedResponse || networkFetch;
    })
  );
});