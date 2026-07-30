// Regenerate tools/geom-snapshot.json from a real browser raster.
//
//   JU_PW_DIR=/path/to/dir [JU_CHROMIUM=...] node tools/tests/dump-geometry.mjs
//
// Requires the game served at http://127.0.0.1:8613 (python3 -m http.server
// 8613 --directory .) and playwright resolvable from JU_PW_DIR. The dump runs
// on the 1948 bookmark, where every latent cell is active, so the snapshot
// carries every permanent cell's own geometry (tools/README.md). Headless
// consumers fold it per bookmark through buildProvinceMapping.
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
// texel against every seed — 25.0M × 307 at this frame against 8.9M × 174 at
// the last one, about five times the work — and this dump runs it on
// SwiftShader, a software rasteriser. Measured here: 74s to the start screen
// and 104s to a live campaign, against 17s and 47s on the pre-§160 tree in the
// same environment. A real GPU does this in a fraction of it; the timeout has
// to survive the machine that does not.
const BOOT_TIMEOUT = 300000;

async function pickBookmark(page, nameFrag) {
  await page.waitForSelector('.bm-card', { timeout: BOOT_TIMEOUT });
  for (let i = 0; i < 8; i++) {
    const cur = page.locator('.bm-card.current');
    const txt = (await cur.textContent()) || '';
    if (txt.includes(nameFrag)) { await cur.click(); return; }
    await page.locator('.ss-next').click();
    await page.waitForTimeout(450);
  }
  throw new Error('bookmark not found: ' + nameFrag);
}

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
await pickBookmark(page, 'War of Independence'); // 1948: every latent cell active
await page.waitForSelector('.nation-card', { timeout: BOOT_TIMEOUT });
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx, null, { timeout: BOOT_TIMEOUT });
await page.waitForTimeout(1200);

const snapshot = await page.evaluate(() => ({
  neighbors: window._ctx.geom.neighbors.map((s) => [...s]),
  centroids: window._ctx.geom.centroids.map((c) => (c ? [c.x, c.y] : null)),
  coastal: window._ctx.geom.coastal.map((b) => (b ? 1 : 0)),
  offshore: window._ctx.geom.offshore.map((c) => (c ? [c.x, c.y] : null)),
  areas: [...window._ctx.geom.areas],
}));
writeFileSync(SNAPSHOT, JSON.stringify(snapshot) + '\n');
console.log('wrote ' + SNAPSHOT + ' — ' + snapshot.centroids.length + ' cells');

// ---- Sinai: measured bounds, neighbors, and a picture of the peninsula -----
const sinai = await page.evaluate(async () => {
  const ctx = window._ctx;
  const { MAP_DATA } = await import('./js/data/map_data.js');
  const p = ctx.prov('Sinai Interior');
  if (!p) return null;
  // The raster is keyed by the ATLAS index (1-based over MAP_DATA.provinces);
  // geometry is keyed by the live province id.
  const rasterId = MAP_DATA.provinces.findIndex((q) => q && q.name === 'Sinai Interior') + 1;
  const raster = window._renderer && window._renderer.idArray;
  const W = MAP_DATA.MAP_W, H = MAP_DATA.MAP_H;
  const unproject = (x, y) => [
    MAP_DATA.LON0 + (x / W) * (MAP_DATA.LON1 - MAP_DATA.LON0),
    MAP_DATA.LAT1 - (y / H) * (MAP_DATA.LAT1 - MAP_DATA.LAT0),
  ];
  let bounds = null;
  if (raster && rasterId > 0) {
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
  return {
    x: p.x, y: p.y,
    bounds,
    neighbors: [...(ctx.geom.neighbors[p.id] || [])]
      .map((n) => (ctx.game.provinces[n] || {}).canon || '#' + n).sort(),
  };
});
if (sinai) {
  console.log('Sinai Interior neighbors: ' + sinai.neighbors.join(', '));
  if (sinai.bounds) {
    console.log('Sinai Interior bounds: lon '
      + sinai.bounds.lon.map((v) => v.toFixed(2)).join('..') + ', lat '
      + sinai.bounds.lat.map((v) => v.toFixed(2)).join('..')
      + ' (' + sinai.bounds.pixels + ' px)');
  } else {
    console.log('Sinai Interior bounds: no raster handle exposed on ctx.map');
  }
} else {
  console.log('Sinai Interior: not on this map');
}

await page.evaluate(() => {
  const p = window._ctx.prov('Sinai Interior');
  if (p && window._camera && window._camera.centerOn) window._camera.centerOn(p.x, p.y, 3.2);
});
await page.waitForTimeout(900);
await page.screenshot({ path: OUT + 'geom-sinai.png' });
console.log('screenshot: ' + OUT + 'geom-sinai.png');
if (errors.length) console.error('console errors during the dump: ' + errors[0]);
await browser.close();
process.exit(errors.length ? 1 : 0);
