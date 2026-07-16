// Judaea Universalis — boot & frame loop. This file is the authoritative consumer of
// every cross-module API (see SPEC.md §10). Modules must load unmodified under it.
import { DEFINES } from './js/data/defines.js';
import { MAP_DATA, validateMapData } from './js/data/map_data.js';
import { buildProvinceMapping } from './js/data/map_profile.js';
import { EVENTS_66 } from './js/data/events_66ce.js';
import { BOOKMARK_66 } from './js/data/bookmark_66ce.js';
import { EVENTS_167 } from './js/data/events_167bce.js';
import { BOOKMARK_167 } from './js/data/bookmark_167bce.js';
import { EVENTS_132 } from './js/data/events_132ce.js';
import { BOOKMARK_132 } from './js/data/bookmark_132ce.js';
import { EVENTS_67 } from './js/data/events_67bce.js';
import { BOOKMARK_67 } from './js/data/bookmark_67bce.js';
import { EVENTS_40 } from './js/data/events_40bce.js';
import { BOOKMARK_40 } from './js/data/bookmark_40bce.js';
import { EVENTS_115 } from './js/data/events_115ce.js';
import { BOOKMARK_115 } from './js/data/bookmark_115ce.js';
import { EVENTS_614 } from './js/data/events_614ce.js';
import { BOOKMARK_614 } from './js/data/bookmark_614ce.js';
import { EVENTS_1948 } from './js/data/events_1948.js';
import { BOOKMARK_1948 } from './js/data/bookmark_1948.js';
import { GENERIC_EVENTS } from './js/data/events_generic.js';
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
  const geom = computeGeometry(renderer.idArray, MAP_DATA, provinceMap);
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
  const BOOKMARKS = [
    // Chronological order — this is also the title-screen card order. Every
    // bookmark gets the shared generic pool appended to its scripted chain.
    { bookmark: BOOKMARK_167, events: EVENTS_167.concat(GENERIC_EVENTS) },
    { bookmark: BOOKMARK_67, events: EVENTS_67.concat(GENERIC_EVENTS) },
    { bookmark: BOOKMARK_40, events: EVENTS_40.concat(GENERIC_EVENTS) },
    { bookmark: BOOKMARK_66, events: EVENTS_66.concat(GENERIC_EVENTS) },
    { bookmark: BOOKMARK_115, events: EVENTS_115.concat(GENERIC_EVENTS) },
    { bookmark: BOOKMARK_132, events: EVENTS_132.concat(GENERIC_EVENTS) },
    { bookmark: BOOKMARK_614, events: EVENTS_614.concat(GENERIC_EVENTS) },
    { bookmark: BOOKMARK_1948, events: EVENTS_1948.concat(GENERIC_EVENTS) },
  ];
  const byId = (id) => BOOKMARKS.find((e) => e.bookmark.id === id) || BOOKMARKS[0];
  const saveKey = (id) => 'ju_save_' + id;
  const fmtYr = (y) => (y < 0 ? (-y) + ' BCE' : y + ' CE');

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
      // never cross the wire — only the display fields do.
      bus.on('event', (p) => {
        if (!p || !p.event) return;
        const ev = p.event;
        toGuests({
          t: 'event',
          p: {
            instanceId: p.instanceId,
            title: ev.title,
            desc: ev.desc,
            world: ev.world === true,
            options: (Array.isArray(ev.options) ? ev.options : [])
              .map((o) => ({ label: o && o.label, tooltip: o && o.tooltip })),
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
    if (prev.d !== g.date.d || prev.m !== g.date.m || prev.y !== g.date.y) {
      bus.emit('day', { date: { ...g.date } });
      if (prev.m !== g.date.m || prev.y !== g.date.y) bus.emit('month', { date: { ...g.date } });
    }
  }

  function startMultiplayerHost(entry, hostTag, guests) {
    const activeProvinceMap = applyMapProfile(entry.bookmark);
    const game = initGame({
      DEFINES, MAP_DATA, geom, bookmark: entry.bookmark, events: entry.events,
      playerTag: hostTag, rngSeed: (Date.now() % 2147483647) || 1,
      provinceMap: activeProvinceMap,
    });
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
      title: 'The campaign begins',
      text: guests.length + (guests.length === 1 ? ' player has' : ' players have') + ' joined your world.',
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
  });
  function doSave(silent) {
    if (!ctx) return;
    try {
      localStorage.setItem(saveKey(ctx.game.bookmarkId),
        JSON.stringify({ v: SAVE_VERSION, savedAt: Date.now(), game: ctx.game }));
      if (!silent) {
        const d = ctx.game.date;
        bus.emit('notify', { title: 'Chronicle written', text: 'Campaign saved — ' + (DEFINES.MONTH_NAMES[d.m - 1] || d.m) + ' ' + fmtYr(d.y) + '.', type: 'info' });
      }
    } catch (e) { console.warn('[save]', e); }
  }
  function readNewestSave() {
    let best = null;
    for (const entry of BOOKMARKS) {
      try {
        const raw = localStorage.getItem(saveKey(entry.bookmark.id));
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.v !== SAVE_VERSION) continue;
        const game = reviveGame(parsed.game);
        if (!game) continue;
        if (!best || (parsed.savedAt || 0) > best.savedAt) best = { savedAt: parsed.savedAt || 0, game, entry };
      } catch (e) { /* corrupt save: ignore */ }
    }
    return best;
  }
  bus.on('saveRequest', () => doSave(false));
  bus.on('month', ({ date }) => { if (date && date.m === 1) doSave(true); }); // yearly autosave

  const saved = readNewestSave();
  const savedTag = saved && DEFINES.TAGS[saved.game.playerTag];
  // Save tools (start screen): localStorage is fragile — especially on
  // phones — so the newest save can leave as a file and come back as one.
  const saveTools = {
    onExport() {
      // export the newest save verbatim
      const best = readNewestSave();
      if (!best) return null;
      const raw = localStorage.getItem(saveKey(best.game.bookmarkId));
      if (!raw) return null;
      const d = best.game.date;
      return {
        filename: 'judaea-save-' + best.game.bookmarkId + '-' + best.game.playerTag + '-y' + Math.abs(d.y) + (d.y < 0 ? 'bce' : 'ce') + '.json',
        json: raw,
      };
    },
    onImport(text) {
      try {
        const parsed = JSON.parse(text);
        if (!parsed || parsed.v !== SAVE_VERSION || !parsed.game) return false;
        const game = reviveGame(parsed.game);
        if (!game || !byId(game.bookmarkId)) return false;
        localStorage.setItem(saveKey(game.bookmarkId),
          JSON.stringify({ v: SAVE_VERSION, savedAt: Date.now(), game: parsed.game }));
        return true; // the start screen reloads the page to pick it up
      } catch (e) { console.warn('[import]', e); return false; }
    },
  };
  ui.showStartScreen(BOOKMARKS.map((e) => e.bookmark), (bookmark, playerTag) => {
    const entry = byId(bookmark.id);
    const activeProvinceMap = applyMapProfile(entry.bookmark);
    const game = initGame({
      DEFINES, MAP_DATA, geom, bookmark: entry.bookmark, events: entry.events,
      playerTag, rngSeed: 20260711, provinceMap: activeProvinceMap,
    });
    startGame(game, entry);
  }, saved ? {
    label: (savedTag ? savedTag.name : saved.game.playerTag) + ', '
      + (DEFINES.MONTH_NAMES[saved.game.date.m - 1] || saved.game.date.m) + ' ' + fmtYr(saved.game.date.y),
    onContinue: () => startGame(saved.game, saved.entry),
  } : null, saveTools, () => lobby.open());

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
