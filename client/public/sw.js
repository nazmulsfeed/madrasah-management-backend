const CACHE_NAME = 'annur-academy-cache-v2'; // Changed version to bust old cache
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Delete old caches when a new version of the service worker is activated
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tell the active service worker to take control of the page immediately
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy for all requests
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If we got a valid response, return it
        return response;
      })
      .catch(() => {
        // If the network fails (e.g. offline), fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match('/index.html');
        });
      })
  );
});
