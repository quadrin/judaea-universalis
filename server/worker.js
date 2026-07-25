// server/worker.js — the cloud shelf (SPEC §93). A Cloudflare Worker over one
// KV namespace, and the only server this game has ever had. It stores two
// things and understands neither of them:
//
//   room:<CODE>      a WebRTC offer and (once posted) its answer. TTL 15 min.
//   save:<who>:<id>  one campaign body, with its display metadata in KV's
//                    metadata slot so the saves list is a single list() call.
//
// `who` is SHA-256 of the player's key, so the key itself is never written
// down here — losing the KV namespace cannot leak it, and possession of the
// key is the whole authorization model. There are no accounts to administer.
//
// Deploy: see server/README.md (one `wrangler deploy`, no build step).

const ROOM_TTL_S = 900;          // long enough for a slow copy-paste, no longer
const MAX_SAVES = 24;            // per player; the oldest is pruned past this
const MAX_BODY = 12 * 1024 * 1024;
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I, L, O, 0, 1

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-JU-Key',
  'Access-Control-Max-Age': '86400',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
  });
}

function fail(status, error) { return json({ error }, status); }

function roomCode() {
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < 6; i++) out += ALPHABET[buf[i] % ALPHABET.length];
  return out;
}

async function whoFor(request) {
  const key = String(request.headers.get('X-JU-Key') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (key.length < 16) return null; // a truncated key must not collide into someone's shelf
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function readJson(request) {
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > MAX_BODY) throw new Error('That save is too large for the shelf.');
  const text = await request.text();
  if (text.length > MAX_BODY) throw new Error('That save is too large for the shelf.');
  try { return JSON.parse(text); } catch (e) { throw new Error('That was not valid JSON.'); }
}

async function listSaves(env, who) {
  const out = [];
  let cursor;
  do {
    const page = await env.JU.list({ prefix: 'save:' + who + ':', cursor, limit: 1000 });
    for (const k of page.keys) {
      const meta = k.metadata || {};
      out.push({ ...meta, id: k.name.slice(('save:' + who + ':').length) });
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  out.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  return out;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (!env || !env.JU) return fail(500, 'This worker has no KV namespace bound as JU.');

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const parts = path.split('/').filter(Boolean);

    try {
      if (path === '/' || path === '/health') {
        return json({ ok: true, service: 'ju-cloud', rooms: ROOM_TTL_S, maxSaves: MAX_SAVES });
      }

      // --------------------------------------------------------- rooms --
      // Open by design: a room holds an SDP offer for fifteen minutes and the
      // code is the only thing guarding it. Nothing personal lives here.
      if (parts[0] === 'room') {
        if (parts.length === 1 && request.method === 'POST') {
          const body = await readJson(request);
          if (!body || typeof body.offer !== 'string' || !body.offer) return fail(400, 'Missing offer.');
          // Collisions are vanishingly rare (31^6) but a silent one would
          // hijack a live lobby, so look before writing.
          let code = '';
          for (let attempt = 0; attempt < 5 && !code; attempt++) {
            const candidate = roomCode();
            if (await env.JU.get('room:' + candidate) === null) code = candidate;
          }
          if (!code) return fail(503, 'The cloud is busy — try again in a moment.');
          await env.JU.put('room:' + code, JSON.stringify({ offer: body.offer, answer: null, at: Date.now() }),
            { expirationTtl: ROOM_TTL_S });
          return json({ code, ttl: ROOM_TTL_S });
        }
        const code = String(parts[1] || '').toUpperCase();
        if (!/^[A-Z0-9]{6}$/.test(code)) return fail(400, 'That is not an invite code.');

        if (parts.length === 2 && request.method === 'GET') {
          const raw = await env.JU.get('room:' + code);
          if (!raw) return fail(404, 'That invite has expired or never existed.');
          return json(JSON.parse(raw));
        }
        if (parts.length === 3 && parts[2] === 'answer' && request.method === 'POST') {
          const body = await readJson(request);
          if (!body || typeof body.answer !== 'string' || !body.answer) return fail(400, 'Missing answer.');
          const raw = await env.JU.get('room:' + code);
          if (!raw) return fail(404, 'That invite has expired or never existed.');
          const room = JSON.parse(raw);
          if (room.answer) return fail(409, 'Someone has already taken that invite.');
          room.answer = body.answer;
          await env.JU.put('room:' + code, JSON.stringify(room), { expirationTtl: ROOM_TTL_S });
          return json({ ok: true });
        }
        return fail(405, 'Not a room route.');
      }

      // --------------------------------------------------------- saves --
      if (parts[0] === 'saves') {
        const who = await whoFor(request);
        if (!who) return fail(401, 'Send your player code in the X-JU-Key header.');

        if (parts.length === 1 && request.method === 'GET') {
          return json({ saves: await listSaves(env, who) });
        }

        const id = decodeURIComponent(parts[1] || '');
        if (!id || id.length > 96 || /[\s/]/.test(id)) return fail(400, 'Bad save id.');
        const key = 'save:' + who + ':' + id;

        if (request.method === 'GET') {
          const save = await env.JU.get(key, 'json');
          if (save === null) return fail(404, 'No such save on your shelf.');
          return json({ save });
        }
        if (request.method === 'PUT') {
          const body = await readJson(request);
          if (!body || !body.save) return fail(400, 'Missing save body.');
          const meta = (body.meta && typeof body.meta === 'object') ? body.meta : {};
          meta.savedAt = Number(meta.savedAt) || Date.now();
          // KV caps metadata at 1KB; a runaway label must not fail the write.
          for (const k of Object.keys(meta)) {
            if (typeof meta[k] === 'string' && meta[k].length > 120) meta[k] = meta[k].slice(0, 120);
          }
          await env.JU.put(key, JSON.stringify(body.save), { metadata: meta });
          let saves = await listSaves(env, who);
          // Prune oldest-first, and never prune the write that just landed —
          // list() is eventually consistent and may not show it yet.
          if (saves.length > MAX_SAVES) {
            const doomed = saves.slice(MAX_SAVES).filter((s) => s.id !== id);
            await Promise.all(doomed.map((s) => env.JU.delete('save:' + who + ':' + s.id)));
            const gone = new Set(doomed.map((s) => s.id));
            saves = saves.filter((s) => !gone.has(s.id));
          }
          return json({ ok: true, saves });
        }
        if (request.method === 'DELETE') {
          await env.JU.delete(key);
          return json({ ok: true, saves: await listSaves(env, who) });
        }
        return fail(405, 'Not a saves route.');
      }

      return fail(404, 'No such route.');
    } catch (e) {
      return fail(400, e && e.message ? e.message : 'The shelf could not do that.');
    }
  },
};
