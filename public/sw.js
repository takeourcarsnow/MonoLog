/*
  Basic service worker for MonoLog PWA.
  - Precaches a small shell (root + logo) to allow instant startup splash.
  - Runtime caches (stale-while-revalidate) for images.
  - Avoids caching authenticated API POST/PUT/DELETE traffic.
  NOTE: This is intentionally minimal; extend with Workbox if you need more.
*/

const PRECACHE = 'monolog-precache-v1';
const RUNTIME_IMAGES = 'monolog-img-v1';
const PRECACHE_URLS = ['/', '/logo.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE).then(cache => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('monolog-') && k !== PRECACHE && k !== RUNTIME_IMAGES)
          .map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

function isImageRequest(request) {
  try {
    const url = new URL(request.url);
    return (/\.(png|jpe?g|gif|webp|avif|svg)$/i).test(url.pathname);
  } catch (_) { return false; }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const method = request.method;

  // Only intercept GET requests.
  if (method !== 'GET') return;

  // Never cache API mutation endpoints; let them go straight to network.
  if (/\/api\//.test(new URL(request.url).pathname)) {
    return; // network only
  }

  // Stale-while-revalidate for images.
  if (isImageRequest(request)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_IMAGES);
        const match = await cache.match(request);
        const fetchPromise = fetch(request).then(resp => {
          // Only cache successful basic responses
          if (resp && resp.status === 200 && resp.type === 'basic') {
            cache.put(request, resp.clone());
          }
          return resp;
        }).catch(() => match); // fallback to cache if offline
        return match || fetchPromise;
      })()
    );
    return;
  }

  // Default: try network first, fall back to cache for precached shell.
  if (PRECACHE_URLS.includes(new URL(request.url).pathname)) {
    event.respondWith(
      fetch(request).then(resp => {
        // update precache copy in background
        caches.open(PRECACHE).then(c => c.put(request, resp.clone()));
        return resp;
      }).catch(() => caches.match(request))
    );
  }
});

// Listen for SKIP_WAITING message so new SW activates immediately.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
