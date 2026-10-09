// UI verification — SPEC §290: ships are drawn moving across the water.
//
// A merchant ship (SPEC §292) bound from Joppa to Alexandria is drawn on open sea at every
// day of the voyage, a little further along each day, turned to its course.
// A long route (Alexandria to Byzantion) stays on water the whole way. A
// fleet under way is drawn on its route, not at its anchor, and a click on
// the ship where it is drawn selects it. Under reduce motion the swell stops;
// the voyage does not.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
// The start screen waits on the province raster (SPEC §160); on SwiftShader
// that is minutes, not seconds. See uitest18.
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 480000);
const OUT = (process.env.JU_OUT || '/tmp') + '/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.bm-card', { timeout: BOOT_MS });
for (let i = 0; i < 12; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => window._ctx && window._ctx.game && window._ctx.game.tags[window._ctx.game.playerTag]);

const ids = await page.evaluate(() => {
  const g = window._ctx.game;
  g.paused = true;
  const byName = (n) => g.provinces.findIndex((p) => p && p.name === n);
  return { J: byName('Joppa'), A: byName('Alexandria'), B: byName('Byzantion') };
});
ok(ids.J > 0 && ids.A > 0 && ids.B > 0, 'Joppa, Alexandria and Byzantion are on the map: ' + JSON.stringify(ids));
ok(await page.evaluate(() => !!(window._ctx.geom.seaGrid && window._ctx.geom.seaGrid.nav)), 'the geometry keeps a grid of open sea');

// Is a map point open sea on the real raster (id 0), or within two pixels of it?
const seaAt = (pts) => page.evaluate((list) => {
  const r = window._renderer;
  const W = window._ctx.MAP_DATA.MAP_W;
  return list.map(([x, y]) => {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (r.idArray[(Math.round(y) + dy) * W + Math.round(x) + dx] === 0) return true;
      }
    }
    return false;
  });
}, pts);

console.log('== a merchant ship sails from Joppa to Alexandria ==');
await page.evaluate(({ J, A }) => {
  const ctx = window._ctx;
  ctx.game.merchants = [{ id: 1, tag: ctx.game.playerTag, kind: 'ship', home: J, at: J, state: 'out', node: 'egypt', order: 'collect',
    steerTo: null, from: J, to: A, path: null, daysLeft: 16, daysTotal: 16 }];
  ctx.game.nextMerchantId = 2;
  const a = ctx.geom.offshore[J];
  const b = ctx.geom.offshore[A];
  window._camera.centerOn((a.x + b.x) / 2, (a.y + b.y) / 2, 1.0);
}, ids);
await page.waitForTimeout(900);
const track = [];
for (let left = 16; left >= 1; left--) {
  await page.evaluate((l) => { window._ctx.game.merchants[0].daysLeft = l; }, left);
  await page.waitForTimeout(120);
  const v = await page.evaluate(() => window._overlay.ships().find((x) => x.kind === 'voyage'));
  if (v) track.push(v);
  if (left === 8) await page.screenshot({ path: OUT + 'v290-merchant-midway.png' });
}
ok(track.length === 16, 'she is drawn every day of the voyage: ' + track.length);
ok(track.every((v, i) => i === 0 || v.s >= track[i - 1].s) && track[15].s > track[0].s,
  `a little further along each day (${Math.round(track[0].s)} → ${Math.round(track[15].s)} of ${Math.round(track[0].len)} px)`);
ok(track[0].s === 0, 'she waits in the harbor until the first day is out');
const wet = await seaAt(track.filter((v) => v.s > 0 && v.s < v.len).map((v) => [v.mx, v.my]));
ok(wet.length > 10 && wet.every(Boolean), `every day at sea she is on water (${wet.filter(Boolean).length}/${wet.length})`);
ok(track.slice(2, -2).every((v) => Math.cos(v.heading) < 0), 'she faces west, toward Alexandria');

console.log('== a long route stays on water ==');
// The raster closes the Dardanelles, and some anchors (Byzantion's, between
// the Golden Horn and the Bosphorus) fall on land. So the contract is: away
// from the two anchors (25 px) and outside the Dardanelles (25.8–26.9°E,
// 39.4–40.6°N), every point of the route is open water.
const longRoute = await page.evaluate(async ({ A, B }) => {
  const sr = await import('/js/map/searoutes.js');
  const M = window._ctx.MAP_DATA;
  const r = sr.createSeaRoutes(window._ctx.geom).route(A, B);
  const a = r.pts[0];
  const b = r.pts[r.pts.length - 1];
  const lon = (x) => M.LON0 + (x / M.MAP_W) * (M.LON1 - M.LON0);
  const lat = (y) => M.LAT1 - (y / M.MAP_H) * (M.LAT1 - M.LAT0);
  return {
    len: r.len,
    straight: Math.hypot(a.x - b.x, a.y - b.y),
    pts: sr.slice(r, 0, r.len, 4).map((p) => {
      const nearEnd = Math.hypot(p.x - a.x, p.y - a.y) < 25 || Math.hypot(p.x - b.x, p.y - b.y) < 25;
      const strait = lon(p.x) >= 25.8 && lon(p.x) <= 26.9 && lat(p.y) >= 39.4 && lat(p.y) <= 40.6;
      return [p.x, p.y, nearEnd || strait];
    }),
  };
}, ids);
const longWet = await seaAt(longRoute.pts);
const share = longWet.filter(Boolean).length / longWet.length;
ok(share >= 0.95, `Alexandria to Byzantion is ${(share * 100).toFixed(1)}% open water (${longWet.length} points)`);
const stray = longRoute.pts.filter((p, i) => !longWet[i] && !p[2]);
ok(stray.length === 0, 'away from the anchors and the Dardanelles it is all water: ' + stray.length + ' points on land'
  + (stray.length ? ' ' + JSON.stringify(stray.map((p) => [Math.round(p[0]), Math.round(p[1])])) : ''));
ok(longRoute.len > longRoute.straight * 1.05, `it bends with the coasts: ${Math.round(longRoute.len)} px against ${Math.round(longRoute.straight)} straight`);

console.log('== a fleet under way is where it is drawn ==');
const fleet = await page.evaluate(({ J, A }) => {
  const g = window._ctx.game;
  const base = Object.values(g.fleets).find((f) => f && f.ships > 0);
  const id = Math.max(...Object.keys(g.fleets).map(Number)) + 1;
  g.fleets[id] = { ...JSON.parse(JSON.stringify(base)), id, tag: g.playerTag, prov: J, ships: 4, gen: 1,
    admiral: null, path: [A], hopTotal: 16, moveDaysLeft: 9, name: 'Test squadron' };
  g.ui.selectedFleet = null;
  g.merchants = [];
  return id;
}, ids);
await page.waitForTimeout(300);
const fm = await page.evaluate((id) => window._overlay.ships().find((x) => x.kind === 'fleet' && x.id === id), fleet);
const anchor = await page.evaluate((J) => {
  const a = window._ctx.geom.offshore[J];
  return window._camera.mapToScreen(a.x, a.y);
}, ids.J);
ok(fm && fm.moving && Math.hypot(fm.x - anchor[0], fm.y - anchor[1]) > 40,
  'the fleet is drawn out at sea, not at its anchor: ' + (fm ? Math.round(Math.hypot(fm.x - anchor[0], fm.y - anchor[1])) + ' px out' : 'not drawn'));
const box = await page.evaluate(() => document.getElementById('map-container').getBoundingClientRect().toJSON());
await page.mouse.click(box.x + fm.x, box.y + fm.y);
await page.waitForTimeout(250);
ok(await page.evaluate((id) => window._ctx.game.ui.selectedFleet === id, fleet), 'a click on the ship where it sails selects it');
await page.screenshot({ path: OUT + 'v290-fleet-under-way.png' });

console.log('== reduce motion stills the swell, not the voyage ==');
// The spread of a ship's height over four looks, half a second apart.
const bobs = async () => {
  const ys = [];
  for (let k = 0; k < 4; k++) {
    if (k) await page.waitForTimeout(500);
    const h = await page.evaluate(() => window._overlay.ships().find((x) => x.kind === 'harbor'));
    if (!h) return -1;
    ys.push(h.y);
  }
  return Math.max(...ys) - Math.min(...ys);
};
await page.evaluate((J) => {
  const g = window._ctx.game;
  for (let k = 0; k < 2; k++) g.merchants.push({ id: g.nextMerchantId++, tag: g.playerTag, kind: 'ship', home: J, at: J, state: 'home', node: null, order: null, steerTo: null });
  const a = window._ctx.geom.offshore[J];
  window._camera.centerOn(a.x, a.y, 3);
}, ids.J);
await page.waitForTimeout(2500); // let the camera settle: only the swell may move the ship
const moving = await bobs();
await page.evaluate(() => document.documentElement.classList.add('ju-reduce-motion'));
const still = await bobs();
ok(moving > 0.02 && moving < 2.5, 'a ship at anchor rides the swell: ' + moving.toFixed(2) + ' px');
ok(still === 0, 'under reduce motion it does not: ' + still);
const fm2 = await page.evaluate((id) => window._overlay.ships().find((x) => x.kind === 'fleet' && x.id === id), fleet);
ok(fm2 && fm2.moving, 'and the fleet is still under way');
await page.evaluate(() => document.documentElement.classList.remove('ju-reduce-motion'));

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
