// Shop Assistant service worker.
//
// Strategy: network-first, falling back to cache only when offline. This
// app gets updated frequently, so a cache-first strategy would risk
// silently showing an old, stale version indefinitely after an update --
// exactly the kind of "my changes didn't take effect" confusion this app
// has already run into with GitHub Pages' own caching delay. Network-first
// means: whenever there's a connection, the browser always fetches (and
// re-caches) the latest published version; the cache is only used as a
// fallback when there's genuinely no network available.
//
// Bump CACHE_NAME (e.g. 'shop-assistant-v2') any time the list of cached
// files changes, so old caches get cleaned up on the next activate.
const CACHE_NAME = 'shop-assistant-v1';
const CACHED_URLS = ['./', './index.html', './help.pdf'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHED_URLS)).catch(()=>{ /* first install with no network yet -- nothing to cache, will populate on first successful fetch */ })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Only handle simple GET requests for this app's own files -- let
  // everything else (if anything) pass straight through untouched.
  if(event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Got a fresh copy from the network -- use it, and update the
        // cache so the offline fallback stays as current as possible.
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => {
        // No network -- fall back to whatever was last cached.
        return caches.match(event.request);
      })
  );
});
