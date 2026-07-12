// Judaea Universalis — boot & frame loop. This file is the authoritative consumer of
// every cross-module API (see SPEC.md §10). Modules must load unmodified under it.
import { DEFINES } from './js/data/defines.js';
import { MAP_DATA, validateMapData } from './js/data/map_data.js';
import { EVENTS_66 } from './js/data/events_66ce.js';
import { BOOKMARK_66 } from './js/data/bookmark_66ce.js';
import { EVENTS_167 } from './js/data/events_167bce.js';
import { BOOKMARK_167 } from './js/data/bookmark_167bce.js';
import { bus } from './js/core/bus.js';
import { initRenderer } from './js/map/renderer.js';
import { createCamera } from './js/map/camera.js';
import { computeGeometry } from './js/map/geometry.js';
import { computeMapmodeColors } from './js/map/mapmodes.js';
import { createOverlay } from './js/map/overlay.js';
import { createLabels } from './js/map/labels.js';
import { initGame, makeCtx, gameActions, reviveGame, SAVE_VERSION } from './js/sim/init.js';
import { tickDay } from './js/sim/tick.js';
import { initUI } from './js/ui/ui.js';
import { initSound } from './js/ui/sound.js';

async function boot() {
  const issues = validateMapData();
  if (issues.length) console.warn('[map-data] validation issues:', issues);

  const canvas = document.getElementById('map-canvas');
  const overlayCanvas = document.getElementById('overlay-canvas');
  const labelsEl = document.getElementById('labels-layer');
  const container = document.getElementById('map-container');

  const renderer = await initRenderer(canvas, MAP_DATA, DEFINES);
  const geom = computeGeometry(renderer.idArray, MAP_DATA);
  const camera = createCamera(container, MAP_DATA);
  const overlay = createOverlay(overlayCanvas, geom, MAP_DATA, DEFINES);
  const labels = createLabels(labelsEl, MAP_DATA, geom);

  const staticCtx = { DEFINES, MAP_DATA, geom, bus, renderer, camera, overlay, labels };
  const ui = initUI(staticCtx);

  let ctx = null;
  let actions = null;
  initSound(bus, () => (ctx ? ctx.game : null));
  let mapmode = 'political';
  let colorsDirty = true;

  bus.on('mapmode', (m) => { mapmode = m; colorsDirty = true; });
  ['month', 'provinceOwner', 'provinceController', 'siegeEnd', 'war', 'eventResolved', 'provinceDev']
    .forEach((ev) => bus.on(ev, () => { colorsDirty = true; }));

  // ------------------------------------------------------------- save/load --
  const BOOKMARKS = [
    // Chronological order — this is also the title-screen card order.
    { bookmark: BOOKMARK_167, events: EVENTS_167 },
    { bookmark: BOOKMARK_66, events: EVENTS_66 },
  ];
  const byId = (id) => BOOKMARKS.find((e) => e.bookmark.id === id) || BOOKMARKS[0];
  const saveKey = (id) => 'ju_save_' + id;
  const fmtYr = (y) => (y < 0 ? (-y) + ' BCE' : y + ' CE');

  let activeEntry = BOOKMARKS[0];
  function startGame(game, entry) {
    activeEntry = entry;
    ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: entry.bookmark, events: entry.events });
    actions = gameActions(ctx);
    ui.bindGame(ctx, actions);
    const jer = ctx.prov('Jerusalem');
    if (jer) camera.centerOn(jer.x, jer.y, 1.8);
    colorsDirty = true;
    window._ctx = ctx; // debug handle
  }
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
  ui.showStartScreen(BOOKMARKS.map((e) => e.bookmark), (bookmark, playerTag) => {
    const entry = byId(bookmark.id);
    const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: entry.bookmark, events: entry.events, playerTag, rngSeed: 20260711 });
    startGame(game, entry);
  }, saved ? {
    label: (savedTag ? savedTag.name : saved.game.playerTag) + ', '
      + (DEFINES.MONTH_NAMES[saved.game.date.m - 1] || saved.game.date.m) + ' ' + fmtYr(saved.game.date.y),
    onContinue: () => startGame(saved.game, saved.entry),
  } : null);

  camera.onClick((mapX, mapY, sx, sy, mods) => {
    if (!ctx) return;
    const armyId = overlay.hitTestArmy(sx, sy, ctx.game, camera);
    const provId = renderer.provIdAt(mapX, mapY);
    bus.emit('mapclick', { mapX, mapY, sx, sy, provId, armyId, shift: !!(mods && mods.shift) });
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
      if (ctx && !ctx.game.paused && !ctx.game.over) {
        acc += dt;
        const msPerDay = DEFINES.SPEED_MS[ctx.game.speed] || 450;
        let guard = 0;
        while (acc >= msPerDay && guard++ < 30) {
          acc -= msPerDay;
          tickDay(ctx);
          colorsDirty = true;
          if (ctx.game.paused || ctx.game.over) { acc = 0; break; }
        }
      } else {
        acc = 0;
      }
      if (colorsDirty && ctx) {
        const res = computeMapmodeColors(ctx, mapmode);
        renderer.setProvinceColors(res.primary, res.secondary, res.flags);
        if (res.params) renderer.setMapmodeParams(res.params);
        colorsDirty = false;
      }
      renderer.render(camera, now);
      overlay.draw(ctx ? ctx.game : null, camera, now);
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
