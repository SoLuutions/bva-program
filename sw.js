const CACHE_VERSION = 'v3.3.10';
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;


  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(event.request);
        return cached || caches.match('/index.html');
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    const fetchPromise = fetch(event.request).then(async (res) => {
      try {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, res.clone());
      } catch {}
      return res;
    }).catch(() => cached);
    return cached || fetchPromise;
  })());
});

self.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg === 'skipWaiting' || (msg && msg.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});