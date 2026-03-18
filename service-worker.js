/* service-worker.js
   Simple PWA service worker for PackPuss
   - Precache app shell
   - Serve cached assets first
   - Provide offline fallback for navigation
*/

const CACHE_VERSION = 'v4';
const CACHE_NAME = `packpuss-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `packpuss-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `packpuss-images-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/PackPuss2.0/',
  '/PackPuss2.0/index.html',
  '/PackPuss2.0/style.css',
  '/PackPuss2.0/app.js',
  '/PackPuss2.0/manifest.json',
  '/PackPuss2.0/icons/icon-192.png',
  '/PackPuss2.0/icons/icon-512.png',
  '/PackPuss2.0/offline.html'
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
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(k => ![CACHE_NAME, RUNTIME_CACHE, IMAGE_CACHE].includes(k))
          .map(k => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // Navigation requests → network first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then(r => r || caches.match('/PackPuss2.0/offline.html'))
        )
    );
    return;
  }

  const url = new URL(request.url);

  // Images → cache-first with runtime fill
  if (request.destination === 'image' || /\.(png|jpg|jpeg|svg|gif)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const resp = await fetch(request);
          if (resp && resp.status === 200) {
            cache.put(request, resp.clone());
            trimCache(IMAGE_CACHE, 60);
          }
          return resp;
        } catch (err) {
          return caches.match('/PackPuss2.0/icons/icon-192.png');
        }
      })
    );
    return;
  }

  // Other GET requests → cache-first, then network
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request)
        .then(response =>
          caches.open(RUNTIME_CACHE).then(cache => {
            if (request.method === 'GET' && response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
        )
        .catch(() => {
          if (request.destination === 'style' || request.destination === 'script') {
            return caches.match('/PackPuss2.0/index.html');
          }
          return null;
        });
    })
  );
});
