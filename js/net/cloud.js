// js/net/cloud.js — the cloud shelf (SPEC §93). One tiny HTTP key-value
// service backs BOTH features that used to be awkward:
//
//   * invite codes — the host parks its WebRTC offer in a room and gets a
//     six-letter code back; the guest fetches the offer and posts its answer
//     to the same room. Nobody copies a three-kilobyte blob any more.
//   * saves — the campaign lives on the shelf, not in a downloads folder.
//     localStorage stays as an offline mirror, never as the only copy.
//
// The game is still a static site with zero dependencies: this module is
// plain fetch() against an endpoint you configure (see server/README.md for
// a hundred-line Cloudflare Worker that implements it). With NO endpoint
// configured every call here reports "off" and the callers fall back to the
// old behaviour — manual invite codes, device-local saves — so an
// unconfigured deploy still plays exactly as it did before.

const ENDPOINT_LS = 'ju_cloud_endpoint';
const LINK_SS = 'ju_cloud_link';
const KEY_LS = 'ju_player_key';
const TIMEOUT_MS = 12000;

// Edit this to point the game at your own deployment (server/README.md).
// Empty means "no cloud" and everything degrades locally. An endpoint baked in
// here is trusted for everything; see the trust note below for links.
export const DEFAULT_ENDPOINT = '';

// Unambiguous alphabet for anything a human retypes: no I, L, O, 0 or 1.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function ls(fn, fallback) {
  try { return fn(); } catch (e) { return fallback; } // private mode / blocked storage
}

function trimSlash(u) { return String(u || '').trim().replace(/\/+$/, ''); }

// ------------------------------------------------------------- endpoint --
//
// Trust is split by what an endpoint is asked to do, because the two uses
// carry very different things:
//
//   rooms  — an SDP offer and its answer. No player key, nothing personal,
//            gone in fifteen minutes. Safe to accept from a link.
//   saves  — the campaign, sent under the player key in a header. Whoever
//            receives it holds the key to that shelf.
//
// So an endpoint that arrived in a `?cloud=` link is used for ROOMS ONLY until
// the player accepts it in the saves panel. Otherwise a crafted invite link
// would silently redirect somebody's saves — and their key — to a stranger's
// server. An endpoint baked into DEFAULT_ENDPOINT, or accepted once and stored,
// is trusted for both. `?cloud=` with an empty value clears both.

function linkEndpoint() {
  return trimSlash(ls(() => sessionStorage.getItem(LINK_SS), ''));
}

(function readUrlEndpoint() {
  try {
    const q = new URLSearchParams(window.location.search);
    if (!q.has('cloud')) return;
    const v = trimSlash(q.get('cloud'));
    if (v) ls(() => sessionStorage.setItem(LINK_SS, v));
    else {
      ls(() => sessionStorage.removeItem(LINK_SS));
      ls(() => localStorage.removeItem(ENDPOINT_LS));
    }
  } catch (e) { /* no window/URL: headless import, nothing to read */ }
}());

// Where saves may go: accepted by this player, or shipped with the game.
export function cloudEndpoint() {
  const stored = trimSlash(ls(() => localStorage.getItem(ENDPOINT_LS), ''));
  return stored || trimSlash(DEFAULT_ENDPOINT);
}

// Where a lobby room may go: the above, or whatever a link offered.
export function roomEndpoint() {
  return cloudEndpoint() || linkEndpoint();
}

// An endpoint a link offered that the player has not accepted for saves. The
// saves panel surfaces this as a question rather than acting on it.
export function untrustedEndpoint() {
  const link = linkEndpoint();
  return link && link !== cloudEndpoint() ? link : '';
}

// Accepting is an explicit, player-initiated act — never a side effect of
// following a link.
export function trustLinkEndpoint() {
  const link = linkEndpoint();
  if (!link) return '';
  ls(() => localStorage.setItem(ENDPOINT_LS, link));
  return cloudEndpoint();
}

export function isCloudOn() { return !!cloudEndpoint(); }
export function isRoomCloudOn() { return !!roomEndpoint(); }

// --------------------------------------------------------- player identity --

function randomChars(n) {
  const out = [];
  const buf = new Uint8Array(n);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(buf);
  else for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256);
  // Rejection-free and close enough to uniform for a 20-character secret.
  for (let i = 0; i < n; i++) out.push(ALPHABET[buf[i] % ALPHABET.length]);
  return out.join('');
}

// The player key IS the account: no email, no password, no server-side user
// record. Copy it to a second device and your shelf follows you there.
export function playerKey() {
  let k = ls(() => localStorage.getItem(KEY_LS), '');
  if (k && normalizeKey(k)) return normalizeKey(k);
  k = randomChars(20);
  ls(() => localStorage.setItem(KEY_LS, k));
  return k;
}

export function normalizeKey(code) {
  const s = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === 20 ? s : '';
}

export function setPlayerKey(code) {
  const k = normalizeKey(code);
  if (!k) return '';
  ls(() => localStorage.setItem(KEY_LS, k));
  return k;
}

// Humans read four groups of five far better than one run of twenty.
export function prettyKey(code) {
  const k = normalizeKey(code) || String(code || '');
  return k.replace(/(.{5})(?=.)/g, '$1-');
}

export function normalizeRoom(code) {
  const s = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === 6 ? s : '';
}

export function prettyRoom(code) {
  const c = normalizeRoom(code) || String(code || '');
  return c.length === 6 ? c.slice(0, 3) + '-' + c.slice(3) : c;
}

// ------------------------------------------------------------- transport --

// `rawBody` is an already-serialized JSON string: a campaign save is megabytes,
// and the caller has stringified the world once already for the local mirror.
async function call(path, { method = 'GET', body = null, rawBody = null, auth = false, room = false, timeout = TIMEOUT_MS } = {}) {
  // Rooms may use a link-provided endpoint; anything key-bearing may not.
  const base = room ? roomEndpoint() : cloudEndpoint();
  if (!base) throw new Error('No cloud is configured for this copy of the game.');
  const headers = {};
  if (body != null || rawBody != null) headers['Content-Type'] = 'application/json';
  if (auth) headers['X-JU-Key'] = playerKey();
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeout) : null;
  let res;
  try {
    res = await fetch(base + path, {
      method,
      headers,
      body: rawBody != null ? rawBody : (body == null ? undefined : JSON.stringify(body)),
      signal: ctrl ? ctrl.signal : undefined,
      // The shelf is a different origin from the game; never send cookies.
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch (e) {
    throw new Error('The cloud did not answer. Check your connection and try again.');
  } finally {
    if (timer) clearTimeout(timer);
  }
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  if (!res.ok) {
    const msg = (data && data.error) || ('The cloud refused that (' + res.status + ').');
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data || {};
}

export async function cloudHealth() {
  if (!isCloudOn()) return { ok: false, off: true };
  try {
    const r = await call('/health', { timeout: 6000 });
    return { ok: r.ok !== false };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ----------------------------------------------------------------- rooms --
// A room holds one offer and (once the guest has been) one answer. It expires
// on its own; nothing here is worth keeping past the handshake.

export async function roomCreate(offer) {
  const r = await call('/room', { method: 'POST', body: { offer }, room: true });
  const code = normalizeRoom(r.code);
  if (!code) throw new Error('The cloud handed back a room code the game cannot read.');
  return code;
}

export async function roomFetch(code) {
  const c = normalizeRoom(code);
  if (!c) throw new Error('An invite code is six letters and numbers, like KFR-2M9.');
  return call('/room/' + c, { room: true });
}

export async function roomAnswer(code, answer) {
  const c = normalizeRoom(code);
  if (!c) throw new Error('An invite code is six letters and numbers, like KFR-2M9.');
  return call('/room/' + c + '/answer', { method: 'POST', body: { answer }, room: true });
}

// ----------------------------------------------------------------- saves --
// Metadata travels separately from the (large) game body so the saves list is
// one small request. `meta` is whatever the caller wants to show in the list;
// the shelf treats it as opaque except for `savedAt`, which orders it.

export async function cloudListSaves() {
  const r = await call('/saves', { auth: true });
  return Array.isArray(r.saves) ? r.saves : [];
}

export async function cloudGetSave(id) {
  const r = await call('/saves/' + encodeURIComponent(id), { auth: true });
  return r && r.save ? r.save : null;
}

// `saveJson` is the serialized `{v, savedAt, game}` payload — the same string
// the local mirror stored, spliced into the envelope rather than re-encoded.
export async function cloudPutSave(id, meta, saveJson) {
  const r = await call('/saves/' + encodeURIComponent(id), {
    method: 'PUT',
    auth: true,
    rawBody: '{"meta":' + JSON.stringify(meta) + ',"save":' + saveJson + '}',
    timeout: 30000, // a late-campaign world is a big body on a slow phone
  });
  return Array.isArray(r.saves) ? r.saves : [];
}

export async function cloudDeleteSave(id) {
  await call('/saves/' + encodeURIComponent(id), { method: 'DELETE', auth: true });
  return true;
}
