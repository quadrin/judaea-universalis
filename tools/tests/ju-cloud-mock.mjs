// tools/tests/ju-cloud-mock.mjs — the cloud shelf, on localhost.
//
// This does NOT reimplement the shelf: it imports server/worker.js verbatim and
// gives it an in-memory stand-in for Cloudflare KV, so the browser suites drive
// the same routing, hashing, pruning and collision handling that gets deployed.
// Node 22 already has Request/Response/crypto.subtle globally, which is the
// whole of the Workers runtime that worker.js touches.
//
//   node tools/tests/ju-cloud-mock.mjs [port]     # standalone, for poking at
//   import { startCloudMock } from './ju-cloud-mock.mjs'   # from a suite
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const worker = (await import(join(HERE, '../../server/worker.js'))).default;

// The slice of the KV API worker.js uses. Expiry is honoured on read so a
// suite can prove a room dies; nothing here sweeps in the background.
function makeKV() {
  const store = new Map(); // key -> {value, metadata, expiresAt}
  const live = (k) => {
    const rec = store.get(k);
    if (!rec) return null;
    if (rec.expiresAt && Date.now() > rec.expiresAt) { store.delete(k); return null; }
    return rec;
  };
  return {
    async get(key, type) {
      const rec = live(key);
      if (!rec) return null;
      return type === 'json' ? JSON.parse(rec.value) : rec.value;
    },
    async put(key, value, opts = {}) {
      store.set(key, {
        value: String(value),
        metadata: opts.metadata || null,
        expiresAt: opts.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : 0,
      });
    },
    async delete(key) { store.delete(key); },
    async list({ prefix = '', cursor, limit = 1000 } = {}) {
      const names = [...store.keys()].filter((k) => k.startsWith(prefix) && live(k)).sort();
      const start = cursor ? Number(cursor) : 0;
      const page = names.slice(start, start + limit);
      const end = start + page.length;
      return {
        keys: page.map((name) => ({ name, metadata: store.get(name).metadata })),
        list_complete: end >= names.length,
        cursor: String(end),
      };
    },
    _store: store,
  };
}

export function startCloudMock(port = 8614) {
  const kv = makeKV();
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    const request = new Request('http://127.0.0.1:' + port + req.url, {
      method: req.method,
      headers: req.headers,
      body: (req.method === 'GET' || req.method === 'HEAD') ? undefined : body,
    });
    let out;
    try {
      out = await worker.fetch(request, { JU: kv });
    } catch (e) {
      out = new Response(JSON.stringify({ error: String(e && e.stack || e) }), { status: 500 });
    }
    const headers = {};
    out.headers.forEach((v, k) => { headers[k] = v; });
    res.writeHead(out.status, headers);
    res.end(Buffer.from(await out.arrayBuffer()));
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({
      url: 'http://127.0.0.1:' + port,
      kv,
      stop: () => new Promise((done) => server.close(done)),
    }));
  });
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const { url } = await startCloudMock(Number(process.argv[2]) || 8614);
  console.log('ju-cloud mock listening on ' + url);
}
