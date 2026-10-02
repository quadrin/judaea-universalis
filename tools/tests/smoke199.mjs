// Headless regression — SPEC §288: the game plays offline.
//
// sw.js runs here in a vm with an in-memory Cache Storage and a fetch() that
// reads the repository from disk, so the test needs no browser and no server.
//
//   - install caches the shell, the icons and every module reachable from
//     main.js; the module graph is read independently with V8's own parser
//     (vm.SourceTextModule), so a missed import form fails here;
//   - with the network gone, every module and a navigation (query string and
//     all) are answered from the cache with the bytes on disk;
//   - the page's top-up after an online boot fetches only what is missing;
//   - activate drops the caches of older versions.
import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import vm from 'vm';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const ORIGIN = 'http://127.0.0.1:8613';

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// --------------------------------------------- the true module graph (V8) --
const graphScript = `
const vm = require('vm'); const fs = require('fs'); const path = require('path');
const root = process.argv[1]; const seen = new Set(); const todo = [path.join(root, 'main.js')];
while (todo.length) {
  const f = todo.pop(); if (seen.has(f)) continue; seen.add(f);
  const m = new vm.SourceTextModule(fs.readFileSync(f, 'utf8'), { identifier: f });
  const specs = m.dependencySpecifiers || m.moduleRequests.map((r) => r.specifier);
  for (const s of specs) todo.push(path.resolve(path.dirname(f), s));
}
console.log(JSON.stringify([...seen].map((f) => path.relative(root, f))));
`;
const g = spawnSync(process.execPath, ['--experimental-vm-modules', '--no-warnings', '-e', graphScript, R], { encoding: 'utf8' });
const graph = g.status === 0 ? JSON.parse(g.stdout) : [];
ok(graph.length > 100 && graph.includes('js/sim/tick.js'), `V8 reads the module graph (${graph.length} files)` + (g.status ? ' — ' + g.stderr.slice(0, 200) : ''));

// ------------------------------------------------- a service-worker world --
const contentType = (p) => p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css'
  : p.endsWith('.png') ? 'image/png' : p.endsWith('.webmanifest') ? 'application/manifest+json' : 'text/html';
let online = true;
let fetches = [];
function diskFetch(input) {
  const href = typeof input === 'string' ? input : input.url;
  fetches.push(href);
  if (!online) return Promise.reject(new TypeError('Failed to fetch'));
  const url = new URL(href);
  let p = decodeURIComponent(url.pathname).replace(/^\//, '');
  if (p === '' || p.endsWith('/')) p += 'index.html';
  const file = R + '/' + p;
  if (url.origin !== ORIGIN || !existsSync(file)) return Promise.resolve(new Response('not found', { status: 404 }));
  return Promise.resolve(new Response(readFileSync(file), { status: 200, headers: { 'Content-Type': contentType(p) } }));
}

const stores = new Map();
const keyOf = (req, ignoreSearch) => {
  const u = new URL(typeof req === 'string' ? req : req.url, ORIGIN + '/');
  if (ignoreSearch) u.search = '';
  return u.href;
};
function makeCache() {
  const m = new Map();
  return {
    _m: m,
    async put(req, res) { m.set(keyOf(req), res.clone()); },
    async match(req, opts = {}) {
      const k = keyOf(req, opts.ignoreSearch);
      for (const [key, res] of m) if ((opts.ignoreSearch ? keyOf(key, true) : key) === k) return res.clone();
      return undefined;
    },
    async delete(req) { return m.delete(keyOf(req)); },
  };
}
const caches = {
  async open(n) { if (!stores.has(n)) stores.set(n, makeCache()); return stores.get(n); },
  async keys() { return [...stores.keys()]; },
  async delete(n) { return stores.delete(n); },
  async match(req, opts) {
    for (const c of stores.values()) { const r = await c.match(req, opts); if (r) return r; }
    return undefined;
  },
};

const handlers = {};
const sandbox = {
  self: {
    location: new URL(ORIGIN + '/sw.js'),
    addEventListener: (t, fn) => { handlers[t] = fn; },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  },
  caches, fetch: diskFetch, Request, Response, URL, Set, Map, Promise, console,
};
vm.createContext(sandbox);
vm.runInContext(readFileSync(R + '/sw.js', 'utf8'), sandbox, { filename: 'sw.js' });
ok(['install', 'activate', 'fetch', 'message'].every((t) => typeof handlers[t] === 'function'), 'sw.js listens for install, activate, fetch and message');

async function fire(type, extra = {}) {
  const waits = [];
  let responded = null;
  const ev = { ...extra, waitUntil: (p) => waits.push(p), respondWith: (p) => { responded = p; } };
  handlers[type](ev);
  await Promise.all(waits);
  return responded;
}

// An older version's cache, to be cleared on activate.
(await caches.open('ju-v1')).put(ORIGIN + '/main.js', new Response('stale'));

// ---------------------------------------------------------------- install --
await fire('install');
const live = [...stores.keys()].filter((n) => n !== 'ju-v1');
ok(live.length === 1, `install opens one cache (${live.join(', ')})`);
const cache = stores.get(live[0]);
const held = new Set([...cache._m.keys()].map((k) => k.slice(ORIGIN.length + 1)));
const missing = graph.filter((f) => !held.has(f));
ok(missing.length === 0, `install caches every module main.js reaches` + (missing.length ? ' — missing ' + missing.slice(0, 5).join(', ') : ''));
const shell = ['', 'index.html', 'styles.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];
ok(shell.every((f) => held.has(f)), 'install caches the page, the stylesheet, the manifest and its icons');
ok(fetches.every((f) => f.startsWith(ORIGIN + '/')), 'install fetches nothing from another origin');

await fire('activate');
ok(!stores.has('ju-v1') && stores.has(live[0]), 'activate drops the old version\'s cache and keeps its own');

// ---------------------------------------------------------------- offline --
online = false;
const ask = async (path, mode = 'no-cors') => {
  const req = { method: 'GET', url: ORIGIN + '/' + path, mode };
  try { return await fire('fetch', { request: req }); } catch (e) { return null; }
};
let same = 0;
for (const f of graph) {
  const res = await ask(f);
  if (res && res.ok && (await res.text()) === readFileSync(R + '/' + f, 'utf8')) same++;
}
ok(same === graph.length, `offline, all ${graph.length} modules come from the cache with the bytes on disk (${same})`);
for (const path of ['', 'index.html', '?bookmark=66ce']) {
  const res = await ask(path, 'navigate');
  const body = res ? await res.text() : '';
  ok(res && res.ok && body.includes('<script type="module" src="main.js">'), `offline, navigating to /${path} gives the game page`);
}
const css = await ask('styles.css');
ok(css && css.ok && (await css.text()).length > 1000, 'offline, the stylesheet comes from the cache');
ok((await ask('js/no_such_module.js')) === null, 'offline, a file never cached still fails rather than answering wrongly');

// ----------------------------------------------------------------- top-up --
online = true;
fetches = [];
await fire('message', { data: { type: 'ju-precache' }, source: null });
ok(fetches.length === 0, `top-up with nothing missing touches no network (${fetches.length} fetches)`);
await cache.delete(ORIGIN + '/js/sim/tick.js');
fetches = [];
await fire('message', { data: { type: 'ju-precache' }, source: null });
ok(fetches.length === 1 && fetches[0] === ORIGIN + '/js/sim/tick.js', 'top-up fetches exactly the one file that went missing');
ok(!!(await cache.match(ORIGIN + '/js/sim/tick.js')), 'and caches it again');
fetches = [];
await fire('message', { data: { type: 'something-else' }, source: null });
ok(fetches.length === 0, 'other messages are ignored');

// ------------------------------------------------- online stays fresh first --
const res = await ask('main.js');
ok(res && res.ok && fetches.includes(ORIGIN + '/main.js'), 'online, a request still goes to the network first');

console.log(failures ? `${failures} FAILED` : 'ALL PASS');
process.exit(failures ? 1 : 0);
