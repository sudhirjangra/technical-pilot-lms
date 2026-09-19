const CACHE_NAME = 'technical-pilot-pwa-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/metadata/android-chrome-192x192.png',
  '/metadata/android-chrome-512x512.png',
  '/metadata/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.debug('Service Worker precache notice:', err);
        return self.skipWaiting();
      }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }
      return new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'Content-Type': 'text/plain' }),
      });
    }),
  );
});
