// sw.js — robust, network-first with safe caching
// -------------------------------------------------

// Bump when you change caching rules or precache entries
const CACHE_VERSION = 'v1.7';
const CACHE_NAME = `bva-cache-${CACHE_VERSION}`;

// Precache only same-origin, GET-accessible assets
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/registration.html',
  '/styles.css',
  '/app.js',
  '/registration.js',
  '/manifest.json',
  // Icons (ensure these paths exist and are public)
  '/icons/android/android-launchericon-192-192.png',
  '/icons/android/android-launchericon-512-512.png',
  '/icons/ios/180.png',
  '/icons/windows11/SplashScreen.scale-100.png'
];

// ----- Install: precache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        // Precaching should never reject on non-critical assets
        console.warn('[SW] precache error', err);
      })
  );
});

// ----- Activate: cleanup old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k)))
      );
      await self.clients.claim();
    })()
  );
});

// ----- Fetch: network-first for same-origin GET, with safe caching
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Only handle same-origin requests (avoid cross-origin caching headaches)
  if (url.origin !== self.location.origin) return;

  // Navigation requests: keep app usable offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Optionally cache successful navigations' HTML (not required)
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Everything else (same-origin, GET): network-first, then cache
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          // Only cache good, same-origin, basic responses
          if (networkRes && networkRes.ok && networkRes.type === 'basic') {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => cached); // network failed → fall back to cache if present

      return cached || fetchPromise;
    })
  );
});

// ----- Optional: listen for messages to skip waiting
self.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg === 'skipWaiting' || (msg && msg.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});
