// Regenerate tools/geom-snapshot.json from a real browser raster.
//
//   JU_PW_DIR=/path/to/dir [JU_CHROMIUM=...] node tools/tests/dump-geometry.mjs
//
// Requires the game served at http://127.0.0.1:8613 (python3 -m http.server
// 8613 --directory .) and playwright resolvable from JU_PW_DIR.
//
// The dump is computed under an IDENTITY province mapping (SPEC §232), not
// under any bookmark's. It used to run on 1948 because 1948 was the one
// chapter with every latent cell active — until §232 made 1948 also the one
// chapter that CONSOLIDATES the established world, at which point "the
// full-resolution bookmark" and "the bookmark every cell is active in"
// stopped being the same thing. The identity mapping is what the snapshot
// always actually meant: every permanent cell's OWN geometry, which headless
// consumers then fold per bookmark through buildProvinceMapping
// (tools/README.md). No campaign is started; the raster is ready the moment
// the title screen is.
//
// Besides writing the snapshot it reports on Sinai — the cell the atlas
// envelope (MAP_DATA.provinceRasterRegions) exists to hold inside its
// peninsula — printing its measured lon/lat bounds and land neighbors, and
// leaving a cropped screenshot of the peninsula in JU_OUT (default /tmp).
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const require = createRequire((process.env.JU_PW_DIR || '.') + '/');
const { chromium } = require('playwright');
const OUT = (process.env.JU_OUT || '/tmp') + '/';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SNAPSHOT = resolve(ROOT, 'tools', 'geom-snapshot.json');

// v6.8: the waits are minutes, not seconds, and that is the frame's real cost
// rather than a flaky selector. The ID pass is one fullscreen draw over every
// texel against every seed — and this dump runs it on SwiftShader, a software
// rasteriser. Measured at v6.8: 74s to the start screen (25.0M × 307). The
// §205 frame is 46.0M texels × 415 seeds, about 2.2× that work again, so the
// timeout doubles with it. A real GPU does this in a fraction; the timeout
// has to survive the machine that does not.
const BOOT_TIMEOUT = 600000;

const browser = await chromium.launch({
  executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
// boot() exposes the renderer before the title screen goes up, and the ID
// raster is read back synchronously inside initRenderer — so a filled
// idArray is the whole readiness condition.
await page.waitForFunction(
  () => window._renderer && window._renderer.idArray && window._renderer.idArray.length > 0,
  null, { timeout: BOOT_TIMEOUT },
);

const snapshot = await page.evaluate(async () => {
  const { MAP_DATA } = await import('./js/data/map_data.js');
  const { computeGeometry } = await import('./js/map/geometry.js');
  const N = MAP_DATA.provinces.length;
  const identity = new Uint16Array(N + 1);
  for (let id = 0; id <= N; id++) identity[id] = id;
  const geom = computeGeometry(window._renderer.idArray, MAP_DATA, identity, window._renderer.landBytes);
  return {
    neighbors: geom.neighbors.map((s) => [...s]),
    centroids: geom.centroids.map((c) => (c ? [c.x, c.y] : null)),
    coastal: geom.coastal.map((b) => (b ? 1 : 0)),
    offshore: geom.offshore.map((c) => (c ? [c.x, c.y] : null)),
    areas: [...geom.areas],
  };
});
writeFileSync(SNAPSHOT, JSON.stringify(snapshot) + '\n');
console.log('wrote ' + SNAPSHOT + ' — ' + snapshot.centroids.length + ' cells');

// ---- Sinai: measured bounds, neighbors, and a picture of the peninsula -----
const sinai = await page.evaluate(async () => {
  const { MAP_DATA } = await import('./js/data/map_data.js');
  const rasterId = MAP_DATA.provinces.findIndex((q) => q && q.name === 'Sinai Interior') + 1;
  if (!rasterId) return null;
  const raster = window._renderer && window._renderer.idArray;
  const W = MAP_DATA.MAP_W, H = MAP_DATA.MAP_H;
  const unproject = (x, y) => [
    MAP_DATA.LON0 + (x / W) * (MAP_DATA.LON1 - MAP_DATA.LON0),
    MAP_DATA.LAT1 - (y / H) * (MAP_DATA.LAT1 - MAP_DATA.LAT0),
  ];
  let bounds = null;
  if (raster) {
    let x0 = W, x1 = 0, y0 = H, y1 = 0, n = 0;
    for (let at = 0; at < raster.length; at++) {
      if (raster[at] !== rasterId) continue;
      const x = at % W, y = (at / W) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      n++;
    }
    if (n) {
      const nw = unproject(x0, y0), se = unproject(x1, y1);
      bounds = { pixels: n, lon: [nw[0], se[0]], lat: [se[1], nw[1]] };
    }
  }
  // Neighbors from the raster directly, so the report needs no campaign.
  const { computeGeometry } = await import('./js/map/geometry.js');
  const N = MAP_DATA.provinces.length;
  const identity = new Uint16Array(N + 1);
  for (let id = 0; id <= N; id++) identity[id] = id;
  const geom = computeGeometry(raster, MAP_DATA, identity, window._renderer.landBytes);
  const seed = MAP_DATA.provinces[rasterId - 1];
  const [sx, sy] = MAP_DATA.project(seed.lon, seed.lat);
  return {
    x: sx, y: sy,
    bounds,
    neighbors: [...(geom.neighbors[rasterId] || [])]
      .map((n) => (MAP_DATA.provinces[n - 1] || {}).name || '#' + n).sort(),
  };
});
if (sinai) {
  console.log('Sinai Interior neighbors: ' + sinai.neighbors.join(', '));
  if (sinai.bounds) {
    console.log('Sinai Interior bounds: lon '
      + sinai.bounds.lon.map((v) => v.toFixed(2)).join('..') + ', lat '
      + sinai.bounds.lat.map((v) => v.toFixed(2)).join('..')
      + ' (' + sinai.bounds.pixels + ' px)');
  }
} else {
  console.log('Sinai Interior: not on this map');
}

await page.evaluate((at) => {
  if (at && window._camera && window._camera.centerOn) window._camera.centerOn(at.x, at.y, 3.2);
}, sinai ? { x: sinai.x, y: sinai.y } : null);
await page.waitForTimeout(900);
await page.screenshot({ path: OUT + 'geom-sinai.png' });
console.log('screenshot: ' + OUT + 'geom-sinai.png');
if (errors.length) console.error('console errors during the dump: ' + errors[0]);
await browser.close();
process.exit(errors.length ? 1 : 0);
