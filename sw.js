/* jadie service worker
   Strategy:
   - Navigation (index.html): network-first, falling back to cache when offline.
     This means online visitors always get the latest deployed version, while
     offline/flaky-connection visitors still get *something* instead of a dino.
   - Same-origin static assets (icons, manifest): cache-first, since they rarely change.
   - Everything cross-origin (fonts, Firebase, GA, AdSense, CDN libs, camera/WebRTC
     traffic) is left completely untouched — we never intercept those requests.
   Bump CACHE_NAME whenever you change the precache list below. */

const CACHE_NAME = 'jadie-shell-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .catch(() => {}) // never fail install over a flaky precache fetch
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let all third-party requests pass through untouched

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  if (PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
  }
});
