// sw.js — Judaea Universalis service worker (registration is wired in main.js).
// NETWORK-FIRST for every same-origin GET: while online the game always runs
// the freshest files (fetches use cache:'reload', which skips the HTTP cache
// entirely — no conditional requests, so a dev server's mtime-based 304s can
// never pin a stale module), and every good response is copied into the cache
// so the whole shell keeps working offline.
const CACHE = 'ju-v1';

// Seed for first offline use; everything else is cached as it is fetched.
const SHELL = ['./', './index.html', './styles.css', './main.js', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL);
    } catch (e) { /* installing while offline: seed from live fetches instead */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      // Plain GET by URL (mode-safe for navigations); 'reload' bypasses the
      // HTTP cache so the server must answer with real, current bytes.
      const fresh = await fetch(new Request(url.href, { cache: 'reload' }));
      if (fresh && fresh.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const shell = (await caches.match('./index.html')) || (await caches.match('./'));
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
