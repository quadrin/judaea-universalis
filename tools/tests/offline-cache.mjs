// Exercise the real service worker against the repository, including reconnects.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = 'https://quadrin.github.io/judaea-universalis/';
const handlers = new Map(), stores = new Map();
let online = true;
const missing = new Set();
const key = (req) => typeof req === 'string' ? req : req.url;
const cache = (name) => {
  if (!stores.has(name)) stores.set(name, new Map());
  const data = stores.get(name);
  return {
    async match(req, options = {}) {
      let url = key(req);
      if (options.ignoreSearch) url = url.split('?')[0];
      return data.has(url) ? data.get(url).clone() : undefined;
    },
    async put(req, res) { data.set(key(req), res.clone()); },
  };
};
const caches = {
  async open(name) { return cache(name); },
  async keys() { return [...stores.keys()]; },
  async delete(name) { return stores.delete(name); },
  async match(req, options) {
    for (const name of stores.keys()) {
      const hit = await cache(name).match(req, options);
      if (hit) return hit;
    }
  },
};
const self = {
  location: { href: base + 'sw.js', origin: new URL(base).origin },
  addEventListener(type, handler) { handlers.set(type, handler); },
  async skipWaiting() {}, clients: { async claim() {} },
};
const context = vm.createContext({ self, caches, URL, Request, Response, console,
  async fetch(req) {
    if (!online) throw new Error('offline');
    const url = new URL(key(req));
    const relative = decodeURIComponent(url.pathname.slice(new URL(base).pathname.length)) || 'index.html';
    try { return new Response(await fs.readFile(path.join(root, relative)), { status: 200 }); }
    catch { missing.add(relative); return new Response('missing', { status: 404 }); }
  },
});
vm.runInContext(await fs.readFile(path.join(root, 'sw.js'), 'utf8'), context);
async function lifetime(type, extra = {}) {
  let promise;
  handlers.get(type)({ ...extra, waitUntil(p) { promise = p; } });
  await promise;
}
async function report() {
  let result;
  await lifetime('message', { data: { type: 'ju-precache' }, source: { postMessage(m) { result = m; } } });
  return result;
}
await lifetime('install');
assert.deepEqual([...missing], [], 'Every discovered module and shell asset must exist');
const current = [...stores.keys()].find(name => name.startsWith('ju-'));
assert(current);
assert(stores.get(current).size > 240, 'Cache must contain the complete game graph and icons');
online = false;
assert.equal((await report()).complete, true, 'A fully cached game must be ready with networking disabled');
const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const releaseMap = JSON.parse(html.match(/<script\b[^>]*id="ju-web-art-map"[^>]*>([\s\S]*?)<\/script>/)[1]).imports;
const releaseURLs = Object.values(releaseMap).map(spec => new URL(spec, base).href);
assert(releaseURLs.length >= 12);
for (const url of releaseURLs) assert(stores.get(current).has(url), 'Mapped release URL cached: ' + url);
stores.get(current).delete(new URL(releaseMap['./js/ui/icons.js'],base).href);
assert.equal((await report()).complete, false, 'A missing versioned artwork module must block offline readiness');
online = true;
assert.equal((await report()).complete, true, 'Reconnect repairs mapped module URLs');
online = false;
stores.get(current).delete(base + 'js/data/bookmark_1948.js');
const incomplete = await report();
assert.equal(incomplete.complete, false, 'A missing chapter must never be reported as ready');
assert.equal(incomplete.missingCount, 1);
online = true;
assert.equal((await report()).complete, true, 'Reconnection must repair a missing module');
online = false;
let navigation;
handlers.get('fetch')({ request: { method: 'GET', url: base + '?install=1', mode: 'navigate' }, respondWith(p) { navigation = p; } });
assert.equal((await navigation).status, 200, 'Installed-app navigation must work offline');
stores.set('ju-obsolete', new Map());
stores.set('another-app-cache', new Map());
await lifetime('activate');
assert.equal(stores.has('ju-obsolete'), false);
assert.equal(stores.has('another-app-cache'), true, 'Preserve caches belonging to other apps on this origin');
console.log('Complete offline graph, missing-file detection, reconnect repair, offline navigation and cache isolation passed.');
