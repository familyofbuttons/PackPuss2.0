/* service-worker.js
   Simple PWA service worker for PackPuss
   - Precache app shell
   - Serve cached assets first
   - Provide offline fallback for navigation
*/

const CACHE_VERSION = 'v2';
const CACHE_NAME = `packpuss-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `packpuss-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `packpuss-images-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '.',                // start_url
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './offline.html'
];

// Utility: limit cache size
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await trimCache(cacheName, maxItems);
  }
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Remove old caches
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => ![CACHE_NAME, RUNTIME_CACHE, IMAGE_CACHE].includes(k))
            .map(k => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // Navigation requests -> network first, fallback to cache/offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Put a copy in runtime cache
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('./offline.html')))
    );
    return;
  }

  // Static assets -> cache first
  const url = new URL(request.url);

  // Images -> runtime cache with size limit
  if (request.destination === 'image' || /\.(png|jpg|jpeg|svg|gif)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const resp = await fetch(request);
          if (resp && resp.status === 200) {
            cache.put(request, resp.clone());
            // keep images cache small
            trimCache(IMAGE_CACHE, 60);
          }
          return resp;
        } catch (err) {
          return caches.match('./icons/icon-192.png');
        }
      })
    );
    return;
  }

  // Other requests -> cache first then network
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        // Put in runtime cache for future
        return caches.open(RUNTIME_CACHE).then(cache => {
          // Only cache GET and successful responses
          if (request.method === 'GET' && response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        });
      }).catch(() => {
        // If request is for a CSS/JS and offline, try to return cached shell
        if (request.destination === 'style' || request.destination === 'script') {
          return caches.match('./index.html');
        }
        return null;
      });
    })
  );
});
