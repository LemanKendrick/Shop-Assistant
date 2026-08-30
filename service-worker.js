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
// Important: fetch() alone isn't enough to guarantee freshness. Without
// {cache:'no-store'}, the browser's own standard HTTP cache sits BELOW the
// service worker and can silently satisfy a "network" fetch from disk if
// GitHub Pages sends caching headers on index.html -- meaning an update
// could still fail to show up even though this code correctly tried the
// network first. {cache:'no-store'} forces a genuinely fresh request from
// the server every time there's a connection.
//
// Bump CACHE_NAME (e.g. 'shop-assistant-v3') any time the list of cached
// files changes, so old caches get cleaned up on the next activate.
const CACHE_NAME = 'shop-assistant-v2';
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
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        // Got a genuinely fresh copy from the network -- use it, and
        // update the offline-fallback cache so it stays as current as
        // possible.
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