// sw.js — Judaea Universalis service worker (registration is wired in main.js).
// NETWORK-FIRST for every same-origin GET: while online the game always runs
// the freshest files (fetches use cache:'reload', which skips the HTTP cache
// entirely — no conditional requests, so a dev server's mtime-based 304s can
// never pin a stale module), and every good response is copied into the cache
// so the whole shell keeps working offline.
//
// OFFLINE (SPEC §288): the worker registers only after the page has loaded, so
// on the first visit every module was fetched before it existed and none of
// them reached the cache — a second visit with no connection could not boot.
// Install therefore fetches the whole game itself: the static shell below,
// plus every module reachable from main.js, found by reading the import
// statements. There is no build step and no file list to keep in step with
// the code; a new module is found the day it is imported.
const CACHE = 'ju-v2';

// Files no import statement names.
const SHELL = [
  './', './index.html', './styles.css', './main.js', './manifest.webmanifest',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-192.png', './icons/icon-maskable-512.png',
];
const ENTRY = './main.js';

// Relative specifiers of static `import … from`, `export … from` and bare
// `import '…'`. Only ./ and ../ paths: the game has no other kind. A false
// match (the same words inside a string or a comment) costs one 404, which is
// skipped.
const IMPORT_RE = /(?:\bfrom|\bimport)\s*(['"])(\.{1,2}\/[^'"\n]+)\1/g;

function moduleSpecifiers(source) {
  const out = [];
  for (const m of source.matchAll(IMPORT_RE)) out.push(m[2]);
  return out;
}

// Puts `urls` and every module they import into `cache`, and returns the set
// of URLs it holds afterwards. `missingOnly` reads a file already in the cache
// from there instead of the network, so a top-up costs only what is missing.
// Never throws: a file that will not come now is cached by the network-first
// handler the next time the page asks for it.
async function precacheGame(cache, urls, missingOnly) {
  const seen = new Set();
  const held = new Set();
  let queue = urls.map((u) => new URL(u, self.location.href).href);
  while (queue.length) {
    const batch = [...new Set(queue)].filter((u) => !seen.has(u));
    queue = [];
    batch.forEach((u) => seen.add(u));
    await Promise.all(batch.map(async (href) => {
      try {
        let res = missingOnly ? await cache.match(href) : null;
        const hit = !!res;
        if (!res) res = await fetch(new Request(href, { cache: 'reload' }));
        if (!res || !res.ok) return;
        if (href.endsWith('.js')) {
          const text = await res.clone().text();
          for (const spec of moduleSpecifiers(text)) queue.push(new URL(spec, href).href);
        }
        if (!hit) await cache.put(href, res);
        held.add(href);
      } catch (e) { /* offline or refused: leave it to the fetch handler */ }
    }));
  }
  return held;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await precacheGame(cache, [...SHELL, ENTRY], false);
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

// The page asks after every online boot (main.js): fetch whatever the install
// could not (a dropped connection mid-install). Files already held are read
// from the cache, so when nothing is missing this costs no network at all.
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'ju-precache') return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const held = await precacheGame(cache, [...SHELL, ENTRY], true);
    if (event.source) event.source.postMessage({ type: 'ju-precached', count: held.size });
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
      const cached = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const shell = (await caches.match('./index.html')) || (await caches.match('./'));
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
