// Judaea Universalis — boot & frame loop. This file is the authoritative consumer of
// every cross-module API (see SPEC.md §10). Modules must load unmodified under it.
import { DEFINES } from './js/data/defines.js';
import { MAP_DATA, validateMapData } from './js/data/map_data.js';
import { buildProvinceMapping } from './js/data/map_profile.js';
import { ERAS } from './js/data/compendium.js';
import { bus } from './js/core/bus.js';
import { initRenderer } from './js/map/renderer.js';
import { createCamera } from './js/map/camera.js';
import { computeGeometry } from './js/map/geometry.js';
import { computeMapmodeColors } from './js/map/mapmodes.js';
import { createOverlay } from './js/map/overlay.js';
import { createLabels } from './js/map/labels.js';
import {
  initGame, makeCtx, gameActions, reviveGame, reconcileGameProvinces, SAVE_VERSION,
} from './js/sim/init.js';
import { tickDay } from './js/sim/tick.js';
import { initUI } from './js/ui/ui.js';
import { initSound } from './js/ui/sound.js';
import { createLobby } from './js/ui/lobby.js';
import { remapGuestChairs, resolveSnapshotChair, restoreHostChair } from './js/net/mp_state.js';
import {
  isCloudOn, cloudEndpoint, cloudHealth, untrustedEndpoint, trustLinkEndpoint,
  playerKey, setPlayerKey, prettyKey, normalizeKey,
  cloudListSaves, cloudGetSave, cloudPutSave, cloudDeleteSave,
} from './js/net/cloud.js';
import {
  shelfPut, shelfGet, shelfList, shelfDelete, shelfIsFallback,
  requestPersistence, storageEstimate,
} from './js/core/shelf.js';

async function boot() {
  const issues = validateMapData();
  if (issues.length) console.warn('[map-data] validation issues:', issues);

  const canvas = document.getElementById('map-canvas');
  const overlayCanvas = document.getElementById('overlay-canvas');
  const labelsEl = document.getElementById('labels-layer');
  const container = document.getElementById('map-container');

  const renderer = await initRenderer(canvas, MAP_DATA, DEFINES);
  let provinceMap = buildProvinceMapping(MAP_DATA, null);
  renderer.setProvinceMapping(provinceMap);
  // geom starts EMPTY and is filled by the first applyMapProfile, which every
  // path into a campaign runs before anything reads it (startGame calls it on
  // its first line). It used to be computed here as well, and that pass was
  // dead on arrival: mapProfileKey starts '' while any bookmark keys to at
  // least '||', so the early-return below cannot hit on the first call and the
  // result was always recomputed and thrown away. Two full W×H passes plus an
  // open-sea flood fill — 25.0M texels at the §160 frame — on every boot, for
  // a value nothing had yet looked at.
  //
  // Safe because the object identity is what the readers captured, not its
  // contents: overlay and labels take `geom` at construction and both bail
  // before touching it until a game exists (overlay.js `if (!game) return`,
  // labels.js `if (ctx && ctx.game && camera)`), and applyMapProfile fills
  // this same object with Object.assign rather than replacing it.
  const geom = {};
  let mapProfileKey = '';
  function applyMapProfile(bookmark) {
    const active = (bookmark && bookmark.activeProvinces) || [];
    const merges = (bookmark && bookmark.mergeProvinces) || {};
    // The key must cover BOTH profile levers: two eras with the same active
    // list can still merge different base cells (SPEC §47).
    const nextKey = active.slice().sort().join('|') + '||'
      + Object.keys(merges).sort().map((k) => k + '>' + merges[k]).join('|');
    if (nextKey === mapProfileKey) return provinceMap;
    provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
    renderer.setProvinceMapping(provinceMap);
    Object.assign(geom, computeGeometry(renderer.idArray, MAP_DATA, provinceMap));
    mapProfileKey = nextKey;
    return provinceMap;
  }
  const camera = createCamera(container, MAP_DATA);
  const overlay = createOverlay(overlayCanvas, geom, MAP_DATA, DEFINES);
  const labels = createLabels(labelsEl, MAP_DATA, geom);

  const staticCtx = { DEFINES, MAP_DATA, geom, bus, renderer, camera, overlay, labels };
  window._camera = camera; // debug/test handle
  window._renderer = renderer;
  const ui = initUI(staticCtx);

  let ctx = null;
  let actions = null;
  initSound(bus, () => (ctx ? ctx.game : null));
  let mapmode = 'political';
  let colorsDirty = true;

  bus.on('mapmode', (m) => { mapmode = m; colorsDirty = true; });
  // Bombing raids play out on the overlay (SPEC §30), in the raider's color.
  bus.on('airRaid', (p) => {
    if (!p || !ctx) return;
    try {
      const t = ctx.game.tags[p.tag];
      overlay.addRaidFx(p.from, p.prov, t && t.color);
    } catch (e) { /* the theater is optional */ }
  });
  ['month', 'provinceOwner', 'provinceController', 'siegeEnd', 'war', 'eventResolved', 'provinceDev', 'peaceHighlight']
    .forEach((ev) => bus.on(ev, () => { colorsDirty = true; }));

  // ------------------------------------------------------------- save/load --
  // The era registry lives in js/data/compendium.js (SPEC §71) so the wiki
  // reads the exact chains the engine plays. Chronological order — this is
  // also the title-screen card order.
  const BOOKMARKS = ERAS;
  const byId = (id) => BOOKMARKS.find((e) => e.bookmark.id === id) || BOOKMARKS[0];
  const hasBookmark = (id) => BOOKMARKS.some((e) => e.bookmark.id === id);
  const fmtYr = (y) => (y < 0 ? (-y) + ' BCE' : y + ' CE');

  // Saves are a shelf, not a downloads folder (SPEC §93). Every campaign has
  // an id: `auto-<chapter>` (the January autosave, overwritten each year) or
  // `manual-<chapter>-<stamp>` (the quill, one row per press). The shelf is the
  // browser's own database (js/core/shelf.js) — free, nothing to configure, and
  // roomy enough that a save is never refused. A cloud, if one is configured,
  // is an EXTRA copy on top that follows the player between devices; it is not
  // required, and nothing here waits on it.
  const MAX_LOCAL_MANUAL = 30;           // ~100KB each against a ~1GB budget
  const CLOUD_LIST_BUDGET_MS = 5000;     // the title screen never waits longer

  const autoId = (bookmarkId) => 'auto-' + bookmarkId;
  const isManualId = (id) => String(id).startsWith('manual-');

  function saveMeta(game, id, savedAt) {
    const tag = game.playerTag;
    const live = (game.tags && game.tags[tag]) || {};
    const def = (DEFINES.TAGS && DEFINES.TAGS[tag]) || {};
    const entry = byId(game.bookmarkId);
    const d = game.date || { m: 1, y: 0 };
    return {
      id,
      v: SAVE_VERSION,
      savedAt: savedAt || Date.now(),
      bookmarkId: game.bookmarkId,
      chapterName: entry.bookmark.name,
      tag,
      nationName: live.name || def.name || tag,
      dateLabel: (DEFINES.MONTH_NAMES[d.m - 1] || d.m) + ' ' + fmtYr(d.y),
      kind: isManualId(id) ? 'manual' : 'auto',
    };
  }

  // ------------------------------------------------------------ local shelf --
  // js/core/shelf.js owns the storage itself (IndexedDB, with a localStorage
  // fallback and a one-time migration of saves the old build left there).
  // These wrappers add only what the game knows: what a valid payload is, and
  // how to describe one.
  async function localRead(id) {
    const rec = await shelfGet(id);
    if (!rec || !rec.json) return null;
    try {
      const parsed = JSON.parse(rec.json);
      if (!parsed || parsed.v !== SAVE_VERSION || !parsed.game) return null;
      if (!hasBookmark(parsed.game.bookmarkId)) return null;
      return parsed;
    } catch (e) { return null; } // corrupt save: it simply is not there
  }

  // `json` is the already-serialized payload: the caller stringifies the world
  // exactly once and hands the same string to every shelf that wants it.
  async function localWrite(id, json, meta) {
    const ok = await shelfPut(id, meta, json);
    if (!ok) console.warn('[save] the local shelf refused the write');
    return ok;
  }

  // Rows carry their metadata beside the body, so listing never parses a
  // world. A row written by a build that predates the metadata (or migrated
  // from the old layout without an index entry) is parsed once and repaired.
  async function localList() {
    const rows = [];
    for (const rec of await shelfList()) {
      let meta = rec.meta;
      if (!meta || !meta.savedAt) {
        const parsed = await localRead(rec.id);
        if (!parsed) continue;
        meta = saveMeta(parsed.game, rec.id, parsed.savedAt);
        await shelfPut(rec.id, meta, JSON.stringify(parsed));
      }
      rows.push({ ...meta, id: rec.id, source: 'local' });
    }
    return rows;
  }

  async function pruneLocalManual() {
    const manual = (await localList()).filter((r) => r.kind === 'manual')
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    if (manual.length <= MAX_LOCAL_MANUAL) return;
    for (const row of manual.slice(MAX_LOCAL_MANUAL)) await shelfDelete(row.id);
  }

  let activeEntry = BOOKMARKS[0];
  function startGame(game, entry, wrapActions) {
    activeEntry = entry;
    const activeProvinceMap = applyMapProfile(entry.bookmark);
    reconcileGameProvinces({
      game, DEFINES, MAP_DATA, geom, bookmark: entry.bookmark, provinceMap: activeProvinceMap,
    });
    ctx = makeCtx({
      game, DEFINES, MAP_DATA, geom, bus, bookmark: entry.bookmark,
      events: entry.events, provinceMap: activeProvinceMap,
    });
    renderer.setProvinceTerrains(game.provinces);
    actions = gameActions(ctx);
    if (wrapActions) actions = wrapActions(actions);
    ui.bindGame(ctx, actions);
    const jer = ctx.prov('Jerusalem');
    if (jer) camera.centerOn(jer.x, jer.y, 1.8);
    colorsDirty = true;
    window._ctx = ctx; // debug handles
    window._actions = actions;
  }

  // ------------------------------------------------------------ multiplayer --
  // No lobby server (the game is a static site): the host's browser IS the
  // server. Host runs the sim and broadcasts snapshots; guests mirror the
  // world, run read-only queries locally, and send their orders as commands
  // that the host executes under the guest's chair (playerTag swap).
  const mp = { role: null, guests: [], peer: null, myTag: null, lastSnapAt: 0, snapDirty: false };
  const MP_QUERY_RE = /^(get|explain|can|evaluate)/;
  window._mp = mp; // debug/test handle

  function hostRunGuestCommand(guest, m) {
    if (!ctx || !actions || !m || typeof m.name !== 'string') return;
    if (MP_QUERY_RE.test(m.name) || typeof actions[m.name] !== 'function') return;
    const g = ctx.game;
    if (!guest || !g.tags[guest.tag]) return;
    const prevTag = g.playerTag;
    const captured = [];
    const origEmit = bus.emit.bind(bus);
    // While a guest's order runs, its toasts belong to the guest, not our screen.
    bus.emit = (ev, payload) => {
      if (ev === 'notify') { captured.push(payload || {}); return; }
      return origEmit(ev, payload);
    };
    g.playerTag = guest.tag;
    try {
      actions[m.name](...(Array.isArray(m.args) ? m.args : []));
    } catch (e) {
      console.warn('[mp] guest command failed:', m.name, e);
    } finally {
      // A formable may replace the commanded tag while the action runs. Restore
      // the old host chair only if it still exists; tagSwitched remaps guest.tag.
      const restoreTag = restoreHostChair(g, prevTag, guest.tag);
      if (restoreTag) g.playerTag = restoreTag;
      bus.emit = origEmit;
    }
    if (captured.length) guest.peer.send({ t: 'toast', items: captured });
    mp.snapDirty = true;
    colorsDirty = true;
  }

  function mpBindHost(guests) {
    mp.role = 'host';
    mp.guests = guests;
    for (const guest of guests) {
      guest.peer.setHandlers({
        onMessage: (m) => { if (m && m.t === 'cmd') hostRunGuestCommand(guest, m); },
        onClose: () => {
          const i = mp.guests.indexOf(guest);
          if (i >= 0) mp.guests.splice(i, 1);
          // hand the nation back to the AI unless another guest shares it
          const stillHuman = (t) => t === ctx.game.playerTag || mp.guests.some((o) => o.tag === t);
          if (ctx && ctx.game.tags[guest.tag] && !stillHuman(guest.tag)) {
            ctx.game.tags[guest.tag].ai = true;
            ctx.game.humanTags = [ctx.game.playerTag].concat(mp.guests.map((o) => o.tag));
          }
          bus.emit('notify', { title: 'A player has left', text: 'Their nation reverts to the AI.', type: 'bad' });
          if (!mp.guests.length) mp.role = null; // the campaign carries on solo
        },
      });
    }
    // One realm, shared eyes: everything the host's chair sees goes to the
    // guests too. Toasts raised by a guest's own command are captured before
    // they reach the bus, so this never double-sends. Registered once.
    if (!mp._relaysBound) {
      mp._relaysBound = true;
      const toGuests = (msg) => { if (mp.role === 'host') for (const guest of mp.guests) guest.peer.send(msg); };
      bus.on('gameover', (p) => toGuests({ t: 'over', p: p || {} }));
      bus.on('notify', (p) => toGuests({ t: 'toast', items: [p || {}] }));
      bus.on('tagSwitched', (p) => {
        if (!p || typeof p.from !== 'string' || typeof p.to !== 'string') return;
        remapGuestChairs(mp.guests, p.from, p.to);
      });
      // Event cards: guests see the card read-only; effects are functions and
      // never cross the wire — only the display fields do. A foreign-decider
      // notice (SPEC §70) is collapsed to its fixed course before it travels,
      // so guests see exactly the single-button card the host sees.
      bus.on('event', (p) => {
        if (!p || !p.event) return;
        const ev = p.event;
        let options = (Array.isArray(ev.options) ? ev.options : [])
          .map((o) => ({ label: o && o.label, tooltip: o && o.tooltip }));
        let deciderName = null;
        // The guest mirrors the host's card, so it mirrors the host's mask
        // too (SPEC §128) — a spectator watching an accession should see the
        // three roads that were open, not the four that exist.
        if (Array.isArray(p.allowed) && p.allowed.length && !p.notice) {
          const mask = p.allowed.filter((i) => options[i]);
          if (mask.length) options = mask.map((i) => options[i]);
        }
        if (p.notice && options.length) {
          const idx = Math.max(0, Math.min(options.length - 1, p.optIdx | 0));
          options = [options[idx]];
          const t = ctx && ctx.game.tags[p.decider];
          deciderName = (t && t.name) || p.decider || null;
        }
        toGuests({
          t: 'event',
          p: {
            instanceId: p.instanceId,
            title: ev.title,
            desc: ev.desc,
            world: ev.world === true,
            deciderName,
            options,
          },
        });
      });
      bus.on('eventResolved', (p) => toGuests({ t: 'eventDone', instanceId: p && p.instanceId }));
    }
  }

  function mpApplySnapshot(snapGame) {
    if (!ctx || !snapGame || typeof snapGame !== 'object') return;
    const g = ctx.game;
    const prev = { d: g.date.d, m: g.date.m, y: g.date.y };
    const prevTag = g.playerTag;
    const prevSeat = g.tags && g.tags[prevTag]
      ? { name: g.tags[prevTag].name, flag: g.tags[prevTag].flag, color: String(g.tags[prevTag].color) }
      : null;
    const keepUi = g.ui;
    for (const k of Object.keys(g)) delete g[k];
    Object.assign(g, snapGame);
    g.ui = keepUi;               // selections are ours, not the host's
    // Keep our assigned chair when it still exists. If a formable replaced it,
    // the authoritative snapshot's chair is the safe fallback.
    const snapTag = g.playerTag;
    g.playerTag = resolveSnapshotChair(g.tags, mp.myTag, snapTag) || snapTag;
    mp.myTag = g.playerTag;
    colorsDirty = true;
    if (prevTag !== g.playerTag) bus.emit('tagSwitched', { from: prevTag, to: g.playerTag });
    else if (prevSeat) {
      // An in-place rebrand of our own seat (SPEC §68) arrives only via
      // snapshot — the topbar rebuilds its banner solely on tagSwitched, so
      // re-emit when the identity changed under the same three letters.
      const now = g.tags && g.tags[g.playerTag];
      if (now && (now.name !== prevSeat.name || now.flag !== prevSeat.flag || String(now.color) !== prevSeat.color)) {
        bus.emit('tagSwitched', { from: g.playerTag, to: g.playerTag });
      }
    }
    if (prev.d !== g.date.d || prev.m !== g.date.m || prev.y !== g.date.y) {
      bus.emit('day', { date: { ...g.date } });
      if (prev.m !== g.date.m || prev.y !== g.date.y) bus.emit('month', { date: { ...g.date } });
    }
  }

  // `resumed` is a campaign lifted off the shelf ({game, entry}): the guests
  // receive that world instead of a fresh one and join it mid-flight. Note
  // that reviveGame deliberately collapses a save back to a solo campaign, so
  // the human seats below are re-established after it, not before.
  function startMultiplayerHost(entry, hostTag, guests, resumed) {
    const activeProvinceMap = applyMapProfile(entry.bookmark);
    const game = resumed ? resumed.game : initGame({
      DEFINES, MAP_DATA, geom, bookmark: entry.bookmark, events: entry.events,
      playerTag: hostTag, rngSeed: (Date.now() % 2147483647) || 1,
      provinceMap: activeProvinceMap,
    });
    if (resumed) game.playerTag = hostTag;
    game.humanTags = [hostTag].concat(guests.map((g) => g.tag))
      .filter((t, i, a) => a.indexOf(t) === i);
    for (const t of game.humanTags) if (game.tags[t]) game.tags[t].ai = false;
    document.getElementById('start-screen').classList.add('hidden');
    startGame(game, entry);
    mpBindHost(guests);
    const json = JSON.stringify(game);
    for (const g of guests) {
      g.peer.send({ t: 'start', bookmarkId: entry.bookmark.id, yourTag: g.tag, game: json });
    }
    bus.emit('notify', {
      title: resumed ? 'The campaign continues' : 'The campaign begins',
      text: guests.length + (guests.length === 1 ? ' player has' : ' players have')
        + ' joined your world' + (resumed ? ', as it stands' : '') + '.',
      type: 'good',
    });
  }

  function startMultiplayerGuest(entry, myTag, gameJson, peer) {
    let game = null;
    try { game = JSON.parse(gameJson); } catch (e) { console.warn('[mp] bad start payload', e); return; }
    game.playerTag = myTag;
    mp.role = 'guest';
    mp.peer = peer;
    mp.myTag = myTag;
    document.getElementById('start-screen').classList.add('hidden');
    // Orders leave for the host; questions are answered from the local mirror.
    startGame(game, entry, (local) => {
      const out = {};
      for (const k of Object.keys(local)) {
        out[k] = MP_QUERY_RE.test(k)
          ? local[k]
          : (...args) => { mp.peer.send({ t: 'cmd', name: k, args }); };
      }
      return out;
    });
    peer.setHandlers({
      onMessage: (m) => {
        if (!m) return;
        if (m.t === 'snap') mpApplySnapshot(m.game);
        else if (m.t === 'chair' && typeof m.tag === 'string') mp.myTag = m.tag;
        else if (m.t === 'toast') for (const p of m.items || []) bus.emit('notify', p || {});
        else if (m.t === 'event') ui.showRemoteEvent(m.p || {});
        else if (m.t === 'eventDone') ui.closeRemoteEvent(m.instanceId);
        else if (m.t === 'over') { ctx.game.over = true; bus.emit('gameover', m.p || {}); }
      },
      onClose: () => {
        if (ctx) ctx.game.paused = true;
        bus.emit('notify', { title: 'Connection lost', text: 'The host is gone. The world stands frozen where it was.', type: 'bad' });
      },
    });
  }

  const lobby = createLobby({
    DEFINES,
    bookmarks: BOOKMARKS,
    onHostStart: startMultiplayerHost,
    onGuestStart: startMultiplayerGuest,
    // Hosting from a save (SPEC §93). These close over hoisted declarations
    // below rather than the `saveTools` object, which is not built until the
    // title screen goes up — long after the lobby is constructed.
    saveTools: {
      list: () => listSaves(),
      async resolve(id) {
        const r = await resolveSave(id);
        return r ? { game: r.game, entry: r.entry, meta: saveMeta(r.game, id, r.savedAt) } : null;
      },
    },
  });
  // ------------------------------------------------------------- writing --
  // The local shelf is the campaign's home and always gets the write. A cloud,
  // if one is configured, gets an extra copy so the campaign follows the
  // player between devices — but it is never what the save depends on. A
  // manual save (the quill) opens a new row; the yearly autosave overwrites
  // the chapter's single auto row.
  let askedToPersist = false;
  async function doSave(silent) {
    if (!ctx) return null;
    const now = Date.now();
    const id = silent ? autoId(ctx.game.bookmarkId)
      : 'manual-' + ctx.game.bookmarkId + '-' + now;
    const meta = saveMeta(ctx.game, id, now);
    // One serialization for every shelf: the world is stringified once, so the
    // copies are byte-identical and a big save is not paid for twice.
    const json = JSON.stringify({ v: SAVE_VERSION, savedAt: now, game: ctx.game });
    const localOk = await localWrite(id, json, meta);
    if (!silent) await pruneLocalManual();
    // The first save is the honest moment to ask the browser not to evict us.
    if (!askedToPersist) { askedToPersist = true; requestPersistence(); }
    let cloudOk = false;
    if (isCloudOn()) {
      try {
        await cloudPutSave(id, meta, json);
        cloudOk = true;
      } catch (e) {
        console.warn('[save] the cloud refused the extra copy', e);
      }
    }
    if (!silent) {
      let where;
      if (!localOk) where = 'This browser would not store it';
      else if (cloudOk) where = 'Kept on this device and in the cloud';
      else if (isCloudOn()) where = 'Kept on this device — the cloud copy did not go through';
      else where = 'Kept on this device';
      bus.emit('notify', {
        title: localOk ? 'Chronicle written' : 'The chronicle would not take',
        text: 'Campaign saved — ' + meta.dateLabel + '. ' + where + '.',
        type: localOk ? 'info' : 'bad',
      });
    }
    return meta;
  }
  bus.on('saveRequest', () => { doSave(false).catch((e) => console.warn('[save]', e)); });
  // Yearly autosave. Fire-and-forget: a slow shelf must never stall the tick.
  bus.on('month', ({ date }) => {
    if (date && date.m === 1) doSave(true).catch((e) => console.warn('[autosave]', e));
  });

  // ------------------------------------------------------------- reading --
  // The saves list is this device's shelf, plus anything a configured cloud
  // knows about that is not here yet. When an id is on both, the newer of the
  // two dates wins the row — the bodies are the same save either way.
  async function listSaves() {
    const rows = new Map();
    for (const row of await localList()) rows.set(row.id, row);
    if (isCloudOn()) {
      let cloud = [];
      try {
        cloud = await cloudListSaves();
      } catch (e) {
        console.warn('[saves] could not read the cloud shelf', e);
      }
      for (const meta of cloud) {
        if (!meta || !meta.id) continue;
        const here = rows.get(meta.id);
        // A campaign that is on this device stays labelled as being on this
        // device — the cloud copy is an extra, not a relocation. Only a save
        // this browser has never seen is listed as living elsewhere.
        if (here) { here.alsoCloud = true; continue; }
        rows.set(meta.id, { ...meta, source: 'cloud' });
      }
    }
    return [...rows.values()].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  }

  // Resolve one id to a revived game. This device first — it is the same bytes
  // and needs no network. The cloud is the fallback for a save made elsewhere.
  async function resolveSave(id) {
    let parsed = await localRead(id);
    if (!parsed && isCloudOn()) {
      const remote = await cloudGetSave(id);
      if (remote && remote.v === SAVE_VERSION && remote.game && hasBookmark(remote.game.bookmarkId)) {
        parsed = remote;
        // Bring it home, so the next load needs nothing but this browser.
        await localWrite(id, JSON.stringify(remote), saveMeta(remote.game, id, remote.savedAt));
      }
    }
    if (!parsed) return null;
    const game = reviveGame(parsed.game);
    if (!game || !hasBookmark(game.bookmarkId)) return null;
    return { game, entry: byId(game.bookmarkId), savedAt: parsed.savedAt || 0 };
  }

  // The title screen's Continue button. This device's shelf answers on its
  // own; a configured cloud is raced against a short budget, so a dead network
  // costs a moment rather than the title screen, and a newer campaign left on
  // another device wins when it arrives in time.
  const cloudListPromise = isCloudOn()
    ? cloudListSaves().catch((e) => { console.warn('[saves] cloud list failed', e); return []; })
    : Promise.resolve([]);

  async function newestSave() {
    let localBest = null;
    for (const row of await localList()) {
      if (!localBest || (row.savedAt || 0) > (localBest.savedAt || 0)) localBest = row;
    }
    let best = localBest;
    if (isCloudOn()) {
      const cloud = await Promise.race([
        cloudListPromise,
        new Promise((res) => setTimeout(() => res([]), CLOUD_LIST_BUDGET_MS)),
      ]);
      for (const meta of cloud || []) {
        if (!meta || !meta.id || meta.v !== SAVE_VERSION) continue;
        if (!best || (meta.savedAt || 0) > (best.savedAt || 0)) best = { ...meta, source: 'cloud' };
      }
    }
    if (!best) return null;
    // Reading a cloud-only body is a second round trip and can be megabytes.
    // It gets the same budget as the list: past it, Continue offers the newest
    // campaign this device already holds rather than making the player wait.
    // The shelf still lists the newer one, and loading it there has no clock.
    try {
      const bounded = best.source === 'cloud' && !(await localRead(best.id))
        ? await Promise.race([
          resolveSave(best.id),
          new Promise((res) => setTimeout(() => res(null), CLOUD_LIST_BUDGET_MS)),
        ])
        : await resolveSave(best.id);
      if (bounded) return bounded;
    } catch (e) {
      console.warn('[saves] could not open the newest save', e);
    }
    if (localBest && localBest.id !== best.id) {
      try { return await resolveSave(localBest.id); } catch (e) { /* nothing to continue */ }
    }
    return null;
  }

  // ------------------------------------------------------------- loading --
  const PENDING_LOAD = 'ju_pending_load';
  function loadIntoGame(loaded) {
    document.getElementById('start-screen').classList.add('hidden');
    startGame(loaded.game, loaded.entry);
  }

  async function loadSave(id) {
    const loaded = await resolveSave(id);
    if (!loaded) return false;
    if (ctx) {
      // A campaign is already bound to the UI (and possibly to a live
      // multiplayer peer). Rebinding in place is not a thing this chrome
      // supports, so the load goes through a reload — the save is already
      // on the shelf, so nothing is lost crossing it.
      try { sessionStorage.setItem(PENDING_LOAD, id); } catch (e) { /* fall through */ }
      window.location.reload();
      return true;
    }
    loadIntoGame(loaded);
    return true;
  }

  async function removeSave(id) {
    await shelfDelete(id);
    if (isCloudOn()) {
      try { await cloudDeleteSave(id); } catch (e) { console.warn('[saves] cloud delete failed', e); }
    }
    return true;
  }

  const saveTools = {
    cloudOn: () => isCloudOn(),
    endpoint: () => cloudEndpoint(),
    status: () => cloudHealth(),
    // Where the campaigns actually are, for the line at the foot of the panel.
    async storage() {
      const est = await storageEstimate();
      let persisted = null;
      try {
        persisted = navigator.storage && navigator.storage.persisted
          ? await navigator.storage.persisted() : null;
      } catch (e) { persisted = null; }
      return { persisted, fallback: shelfIsFallback(), usage: est && est.usage, quota: est && est.quota };
    },
    // An endpoint a link offered but this player has not accepted for saves.
    offered: () => untrustedEndpoint(),
    acceptOffered: () => trustLinkEndpoint(),
    playerCode: () => prettyKey(playerKey()),
    setPlayerCode: (code) => (normalizeKey(code) ? !!setPlayerKey(code) : false),
    list: listSaves,
    load: loadSave,
    remove: removeSave,
  };

  // A load requested from inside a running campaign comes back around here.
  let pendingLoad = null;
  try {
    pendingLoad = sessionStorage.getItem(PENDING_LOAD);
    if (pendingLoad) sessionStorage.removeItem(PENDING_LOAD);
  } catch (e) { pendingLoad = null; }
  let resumed = null;
  if (pendingLoad) {
    try { resumed = await resolveSave(pendingLoad); } catch (e) { console.warn('[load]', e); }
  }

  // The saves panel is built by initUI from these tools, so it must be handed
  // over even when a pending load means the title screen is never seen.
  const saved = resumed ? null : await newestSave();
  const savedTag = saved && DEFINES.TAGS[saved.game.playerTag];
  ui.showStartScreen(BOOKMARKS.map((e) => e.bookmark), (bookmark, playerTag, opts) => {
    const entry = byId(bookmark.id);
    const activeProvinceMap = applyMapProfile(entry.bookmark);
    const game = initGame({
      DEFINES, MAP_DATA, geom, bookmark: entry.bookmark, events: entry.events,
      playerTag, rngSeed: 20260711, provinceMap: activeProvinceMap,
      difficulty: opts && opts.difficulty,
    });
    startGame(game, entry);
  }, saved ? {
    label: (savedTag ? savedTag.name : saved.game.playerTag) + ', '
      + (DEFINES.MONTH_NAMES[saved.game.date.m - 1] || saved.game.date.m) + ' ' + fmtYr(saved.game.date.y),
    onContinue: () => startGame(saved.game, saved.entry),
  } : null, saveTools, () => lobby.open());
  // A load asked for from inside a running campaign: the reload lands here and
  // goes straight into the world, past the title screen it just drew.
  if (resumed) loadIntoGame(resumed);
  else {
    // …or the player followed a `?join=CODE` invite link (SPEC §93): open the
    // lobby already joining, so the whole handshake is one click for them.
    try {
      const joinCode = new URLSearchParams(window.location.search).get('join');
      if (joinCode) lobby.openJoin(joinCode);
    } catch (e) { /* no URL to read */ }
  }

  camera.onClick((mapX, mapY, sx, sy, mods) => {
    if (!ctx) return;
    const stack = overlay.hitTestStack ? overlay.hitTestStack(sx, sy, ctx.game, camera) : null;
    const armyId = stack ? stack.id : overlay.hitTestArmy(sx, sy, ctx.game, camera);
    const armyIds = stack ? stack.ids : (armyId != null ? [armyId] : null);
    const fleetId = overlay.hitTestFleet ? overlay.hitTestFleet(sx, sy, ctx.game, camera) : null;
    const wingId = overlay.hitTestWing ? overlay.hitTestWing(sx, sy, ctx.game, camera) : null;
    const battleProv = overlay.hitTestBattle ? overlay.hitTestBattle(sx, sy, ctx.game, camera) : 0;
    const provId = renderer.provIdAt(mapX, mapY);
    bus.emit('mapclick', {
      mapX, mapY, sx, sy, provId, armyId, armyIds, fleetId, wingId, battleProv,
      shift: !!(mods && mods.shift),
    });
  });
  camera.onRightClick((mapX, mapY, sx, sy) => {
    if (!ctx) return;
    const provId = renderer.provIdAt(mapX, mapY);
    bus.emit('maprightclick', { mapX, mapY, sx, sy, provId });
  });
  bus.on('select', (provId) => renderer.setSelected(provId || 0));

  let last = performance.now();
  let acc = 0;
  let frameWarned = false;
  function frame(now) {
    // Re-schedule FIRST: one bad frame must cost a frame, not the whole game.
    requestAnimationFrame(frame);
    try {
      const dt = Math.min(100, now - last);
      last = now;
      camera.update(dt);
      // Guests never tick: the host's snapshots are the only source of time.
      if (ctx && mp.role !== 'guest' && !ctx.game.paused && !ctx.game.over) {
        acc += dt;
        const msPerDay = DEFINES.SPEED_MS[ctx.game.speed] || 450;
        let guard = 0;
        while (acc >= msPerDay && guard++ < 30) {
          acc -= msPerDay;
          tickDay(ctx);
          colorsDirty = true;
          mp.snapDirty = true;
          if (ctx.game.paused || ctx.game.over) { acc = 0; break; }
        }
      } else {
        acc = 0;
      }
      // Host: broadcast the world — promptly when dirty, and as a slow
      // heartbeat so pause/speed changes reach guests even between ticks.
      if (mp.role === 'host' && ctx && mp.guests.length
          && (mp.snapDirty ? now - mp.lastSnapAt > 250 : now - mp.lastSnapAt > 1200)) {
        mp.lastSnapAt = now;
        mp.snapDirty = false;
        const snap = { t: 'snap', game: ctx.game };
        for (const g of mp.guests) g.peer.send(snap);
      }
      if (colorsDirty && ctx) {
        const res = computeMapmodeColors(ctx, mapmode);
        renderer.setProvinceColors(res.primary, res.secondary, res.flags);
        if (res.params) renderer.setMapmodeParams(res.params);
        colorsDirty = false;
      }
      renderer.render(camera, now);
      // sub-day fraction: overlay slides marching armies between the daily sim steps
      const running = ctx && !ctx.game.paused && !ctx.game.over;
      const dayFrac = running ? Math.min(1, acc / (DEFINES.SPEED_MS[ctx.game.speed] || 450)) : 0;
      overlay.draw(ctx ? ctx.game : null, camera, now, dayFrac);
      labels.update(ctx, camera, mapmode);
    } catch (e) {
      if (!frameWarned) { frameWarned = true; console.error('[frame]', e); }
    }
  }
  requestAnimationFrame(frame);

  window.addEventListener('resize', () => {
    renderer.resize();
    if (camera.handleResize) camera.handleResize();
  });
}

boot().catch((e) => {
  console.error(e);
  const el = document.createElement('pre');
  el.style.cssText = 'position:fixed;inset:10px;background:#2a0f0f;color:#f5c9c9;padding:14px;z-index:9999;overflow:auto;white-space:pre-wrap;font:12px monospace;border:1px solid #a33';
  el.textContent = 'Boot failed:\n' + (e.stack || e);
  document.body.appendChild(el);
});

// PWA: network-first service worker (offline shell + no stale modules when online).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('[sw]', e));
  });
}
