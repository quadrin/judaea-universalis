// Judaea Universalis — boot & frame loop. This file is the authoritative consumer of
// every cross-module API (see SPEC.md §10). Modules must load unmodified under it.
import { DEFINES } from './js/data/defines.js';
import { MAP_DATA, validateMapData } from './js/data/map_data.js';
import { EVENTS_66 } from './js/data/events_66ce.js';
import { BOOKMARK_66 } from './js/data/bookmark_66ce.js';
import { bus } from './js/core/bus.js';
import { initRenderer } from './js/map/renderer.js';
import { createCamera } from './js/map/camera.js';
import { computeGeometry } from './js/map/geometry.js';
import { computeMapmodeColors } from './js/map/mapmodes.js';
import { createOverlay } from './js/map/overlay.js';
import { createLabels } from './js/map/labels.js';
import { initGame, makeCtx, gameActions } from './js/sim/init.js';
import { tickDay } from './js/sim/tick.js';
import { initUI } from './js/ui/ui.js';

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
  let mapmode = 'political';
  let colorsDirty = true;

  bus.on('mapmode', (m) => { mapmode = m; colorsDirty = true; });
  ['month', 'provinceOwner', 'provinceController', 'siegeEnd', 'war', 'eventResolved']
    .forEach((ev) => bus.on(ev, () => { colorsDirty = true; }));

  ui.showStartScreen(BOOKMARK_66, (playerTag) => {
    const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66, playerTag, rngSeed: 20260711 });
    ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
    actions = gameActions(ctx);
    ui.bindGame(ctx, actions);
    const jer = ctx.prov('Jerusalem');
    if (jer) camera.centerOn(jer.x, jer.y, 1.8);
    colorsDirty = true;
    window._ctx = ctx; // debug handle
  });

  camera.onClick((mapX, mapY, sx, sy) => {
    if (!ctx) return;
    const armyId = overlay.hitTestArmy(sx, sy, ctx.game, camera);
    const provId = renderer.provIdAt(mapX, mapY);
    bus.emit('mapclick', { mapX, mapY, sx, sy, provId, armyId });
  });
  camera.onRightClick((mapX, mapY, sx, sy) => {
    if (!ctx) return;
    const provId = renderer.provIdAt(mapX, mapY);
    bus.emit('maprightclick', { mapX, mapY, sx, sy, provId });
  });
  bus.on('select', (provId) => renderer.setSelected(provId || 0));

  let last = performance.now();
  let acc = 0;
  function frame(now) {
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
    requestAnimationFrame(frame);
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
