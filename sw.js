const CACHE_NAME = 'ssc-study-hub-v5';
const CORE_FILES = ['index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const coreUrl = (name) => new URL(name, self.registration.scope).toString();
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache the app shell first; optional icon/manifest failures must not abort installation.
    await cache.add(coreUrl('index.html'));
    await Promise.allSettled(CORE_FILES.slice(1).map(name => cache.add(coreUrl(name))));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('ssc-study-hub-') && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(req);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(coreUrl('index.html'), response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match(coreUrl('index.html'))) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const response = await fetch(req);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(req, response.clone());
      }
      return response;
    } catch (_) {
      return Response.error();
    }
  })());
});
