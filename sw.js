const CACHE_VERSION = 'v3.3.9n';
const CACHE_NAME = `bva-cache-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/', '/index.html', '/manifest.json',
  '/styles.css', '/app.js',
  '/registration.html', '/registration.js',
  '/icons/android/android-launchericon-192-192.png',
  '/icons/android/android-launchericon-512-512.png',
  '/icons/ios/180.png',
  '/icons/windows11/SplashScreen.scale-100.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// sw.js – safe fetch handler
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (!/^https?:$/.test(url.protocol)) return;          // skip chrome-extension:, data:, etc.
  if (url.origin !== self.location.origin) return;      // only same-origin

  event.respondWith((async () => {
    const cache = await caches.open('app-v1');
    const cached = await cache.match(req);
    try {
      const net = await fetch(req);
      if (net.ok && (net.type === 'basic' || net.type === 'cors')) {
        cache.put(req, net.clone());
      }
      return net;
    } catch {
      return cached || Response.error();
    }
  })());
});


self.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg === 'skipWaiting' || (msg && msg.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});