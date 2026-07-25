// js/core/shelf.js — where campaigns actually live (SPEC §93). No accounts, no
// server, no downloads, nothing to configure: the browser's own database.
//
// Why not localStorage, which the game used before? It caps at about 5MB per
// origin — and counts UTF-16, so a ~104KB save costs ~208KB of that budget.
// A dozen campaigns and the quota throws, which is the one failure that loses
// somebody's game. IndexedDB on the same browser reports ~1GB. So: bodies live
// in IndexedDB, and anything already in localStorage is migrated across the
// first time the shelf is read (and only deleted once the copy has landed).
//
// Everything here is promise-based and degrades: if IndexedDB cannot be opened
// at all — some private-browsing modes, some locked-down embeds — the same API
// falls back to localStorage, which is exactly what the game had before.

const DB_NAME = 'judaea-universalis';
const DB_VERSION = 1;
const STORE = 'saves';

// Legacy localStorage layout, still read (and drained) on first use.
const AUTO_PREFIX = 'ju_save_';
const MANUAL_PREFIX = 'ju_save_m_';
const INDEX_KEY = 'ju_save_index';

let dbPromise = null;
let usingFallback = false;
let migrated = null;   // the in-flight (or finished) migration promise

function ls(fn, fallback) {
  try { return fn(); } catch (e) { return fallback; }
}

// ------------------------------------------------------------ IndexedDB --

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no indexedDB')); return; }
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { reject(e); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('indexedDB open failed'));
    req.onblocked = () => reject(new Error('indexedDB blocked'));
  }).catch((e) => {
    usingFallback = true;
    console.warn('[shelf] IndexedDB unavailable, using localStorage', e);
    return null;
  });
  return dbPromise;
}

// Runs `fn(store)` and resolves with THE REQUEST'S RESULT once the transaction
// commits. Reading `req.result` inside `oncomplete` is deliberate: a version
// of this that fell back to the request object itself when the result was
// `undefined` made "no such record" indistinguishable from "found something",
// which silently turned the migration below into a delete.
function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    let req;
    try { req = fn(t.objectStore(STORE)); } catch (e) { reject(e); return; }
    t.oncomplete = () => resolve(req && 'result' in req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('transaction aborted'));
  });
}

// ------------------------------------------------- localStorage fallback --
// Also the source the migration drains. `json` is the serialized payload; the
// caller stringifies the world exactly once and hands the same string to both
// this and the cloud.

function legacyKey(id) {
  const s = String(id);
  return String(s).startsWith('manual-') ? MANUAL_PREFIX + s : AUTO_PREFIX + s.replace(/^auto-/, '');
}

function legacyIndex() {
  const raw = ls(() => localStorage.getItem(INDEX_KEY), null);
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (e) { return {}; }
}

function legacyIds() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k === INDEX_KEY || !k.startsWith(AUTO_PREFIX)) continue;
      out.push(k.startsWith(MANUAL_PREFIX) ? k.slice(MANUAL_PREFIX.length)
        : 'auto-' + k.slice(AUTO_PREFIX.length));
    }
  } catch (e) { /* no storage at all */ }
  return out;
}

function fallbackPut(id, meta, json) {
  localStorage.setItem(legacyKey(id), json);
  const idx = legacyIndex();
  idx[id] = meta;
  ls(() => localStorage.setItem(INDEX_KEY, JSON.stringify(idx)));
  return true;
}

function fallbackGet(id) {
  const raw = ls(() => localStorage.getItem(legacyKey(id)), null);
  return raw ? { id, json: raw, meta: legacyIndex()[id] || null } : null;
}

function fallbackList() {
  const idx = legacyIndex();
  return legacyIds().map((id) => ({ id, meta: idx[id] || null }));
}

function fallbackDelete(id) {
  ls(() => localStorage.removeItem(legacyKey(id)));
  const idx = legacyIndex();
  if (idx[id]) { delete idx[id]; ls(() => localStorage.setItem(INDEX_KEY, JSON.stringify(idx))); }
}

// ------------------------------------------------------------- migration --
// Move anything the old build left in localStorage into the database, then
// free the quota it was holding. A body is only removed once its copy is in.

function migrateLegacy(db) {
  // One migration per page load, shared by every concurrent caller — the boot
  // path and the saves panel can both reach the shelf before either finishes.
  if (!db) return Promise.resolve();
  if (!migrated) migrated = doMigrate(db);
  return migrated;
}

async function doMigrate(db) {
  const ids = legacyIds();
  if (!ids.length) return;
  const idx = legacyIndex();
  let moved = 0;
  for (const id of ids) {
    const json = ls(() => localStorage.getItem(legacyKey(id)), null);
    if (!json) continue;
    try {
      const existing = await tx(db, 'readonly', (s) => s.get(id));
      if (!existing) await tx(db, 'readwrite', (s) => s.put({ id, meta: idx[id] || null, json }));
      // Only now is it safe to give up the original: the copy is committed,
      // or one was already there. A failed write above throws past this line
      // and the localStorage copy stays exactly where it is.
      ls(() => localStorage.removeItem(legacyKey(id)));
      moved++;
    } catch (e) {
      console.warn('[shelf] could not migrate', id, '(left where it was)', e);
    }
  }
  if (moved) {
    ls(() => localStorage.removeItem(INDEX_KEY));
    console.info('[shelf] moved ' + moved + ' campaign(s) from localStorage into IndexedDB');
  }
}

// -------------------------------------------------------------- the API --

export async function shelfPut(id, meta, json) {
  const db = await openDb();
  if (!db) { try { return fallbackPut(id, meta, json); } catch (e) { return false; } }
  await migrateLegacy(db);
  try {
    await tx(db, 'readwrite', (s) => s.put({ id, meta, json }));
    return true;
  } catch (e) {
    console.warn('[shelf] write failed', e);
    return false;
  }
}

export async function shelfGet(id) {
  const db = await openDb();
  if (!db) return fallbackGet(id);
  await migrateLegacy(db);
  try {
    return (await tx(db, 'readonly', (s) => s.get(id))) || null;
  } catch (e) {
    console.warn('[shelf] read failed', e);
    return null;
  }
}

export async function shelfList() {
  const db = await openDb();
  if (!db) return fallbackList();
  await migrateLegacy(db);
  try {
    // getAll pulls the bodies too. The shelf holds a few dozen rows at most, so
    // this is cheaper than a cursor round trip per row — and only `meta` is
    // handed back, so no caller can accidentally hold a world it did not want.
    const all = await tx(db, 'readonly', (s) => s.getAll());
    return (all || []).map((r) => ({ id: r.id, meta: r.meta || null }));
  } catch (e) {
    console.warn('[shelf] list failed', e);
    return [];
  }
}

export async function shelfDelete(id) {
  const db = await openDb();
  if (!db) { fallbackDelete(id); return true; }
  try {
    await tx(db, 'readwrite', (s) => s.delete(id));
    return true;
  } catch (e) {
    console.warn('[shelf] delete failed', e);
    return false;
  }
}

export function shelfIsFallback() { return usingFallback; }

// Ask the browser to treat this data as worth keeping. Without it a browser
// under storage pressure may evict the whole origin — which for a save shelf
// is the difference between "on this device" and "on this device, probably".
// Chrome grants it silently for an installed/engaged site; Firefox prompts.
export async function requestPersistence() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch (e) { return null; }
}

export async function storageEstimate() {
  try {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    const est = await navigator.storage.estimate();
    return { usage: est.usage || 0, quota: est.quota || 0 };
  } catch (e) { return null; }
}
