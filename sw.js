// sw.js — stable, no forced skipWaiting to avoid refresh loops
const CACHE_VERSION = 'v2.3.4'; // Increment this for each new version of the service worker
const CACHE_NAME = `bva-cache-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/', '/index.html', '/styles.css', '/app.js',
  '/registration.js', '/manifest.json',
  '/icons/android/android-launchericon-192-192.png',
  '/icons/android/android-launchericon-512-512.png',
  '/icons/ios/180.png',
  '/icons/windows11/SplashScreen.scale-100.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // No skipWaiting here — let the browser upgrade when the page next reloads
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg === 'skipWaiting' || (msg && msg.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});