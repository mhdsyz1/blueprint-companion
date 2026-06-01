// Blueprint Companion — Service Worker
// Caches the app shell for offline use.
// Uses network-first for Supabase + CDN calls so data is always fresh when online.

const CACHE = 'blueprint-v1';
const SHELL  = [
  '/blueprint-companion/',
  '/blueprint-companion/index.html'
];

// Install: cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

// Activate: remove old cache versions
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
//   External (Supabase, Google Fonts, CDN) → network first, fall back to cache
//   App shell → cache first, fall back to network
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isExternal = url.hostname !== self.location.hostname;

  if (isExternal) {
    // Network first for API + CDN — ensures live data when online
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  } else {
    // Cache first for app shell — instant load even offline
    e.respondWith(
      caches.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        });
        return cached || networkFetch;
      })
    );
  }
});
