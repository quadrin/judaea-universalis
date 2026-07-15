// Browser regression — the GPU province-ID pass carries IDs above 255 and
// exposes them through a Uint16Array, without relying on uniform seed arrays.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const browser = await chromium.launch({
  executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
const result = await page.evaluate(async () => {
  const { initRenderer } = await import('/js/map/renderer.js');
  const { computeGeometry } = await import('/js/map/geometry.js');
  const cols = 20;
  const rows = 13;
  const provinces = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      provinces.push({
        name: `Cell ${row * cols + col + 1}`,
        lon: col + 0.5, lat: row + 0.5, weight: 1,
        terrain: 'farmland', owner: 'TST',
      });
    }
  }
  const W = 200;
  const H = 130;
  const data = {
    MAP_W: W, MAP_H: H, LON0: 0, LON1: cols, LAT0: 0, LAT1: rows,
    project(lon, lat) { return [lon / cols * W, (rows - lat) / rows * H]; },
    provinces, coast: { land: [], lakes: [] }, rivers: [], heightPrimitives: [],
  };
  const defs = {
    TAGS: { TST: { name: 'Test', color: [50, 90, 140] } },
  };
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;width:200px;height:130px;left:-1000px;top:0';
  const canvas = document.createElement('canvas');
  host.appendChild(canvas);
  document.body.appendChild(host);
  const renderer = await initRenderer(canvas, data, defs);
  const geometry = computeGeometry(renderer.idArray, data);
  let max = 0;
  const seen = new Set();
  for (const id of renderer.idArray) {
    if (id > max) max = id;
    if (id) seen.add(id);
  }
  const highIndex = renderer.idArray.findIndex((id) => id > 255);
  const hit = highIndex >= 0
    ? renderer.provIdAt(highIndex % W, Math.floor(highIndex / W))
    : 0;
  host.remove();
  return {
    isUint16: renderer.idArray instanceof Uint16Array,
    length: renderer.idArray.length,
    max, unique: seen.size, highIndex, hit,
    highArea: geometry.areas[260],
    highNeighbors: geometry.neighbors[260].size,
  };
});

console.log('== scalable province IDs ==');
ok(result.isUint16 && result.length === 200 * 130,
  'the renderer exposes a correctly sized Uint16 province grid');
ok(result.max === 260 && result.unique === 260,
  `all 260 synthetic provinces survive the GPU pass (max ${result.max}, unique ${result.unique})`);
ok(result.highIndex >= 0 && result.hit > 255,
  `map hit-testing returns a high-byte province ID (${result.hit})`);
ok(result.highArea > 0 && result.highNeighbors > 0,
  `derived geometry retains province 260 (${result.highArea}px, ${result.highNeighbors} neighbors)`);
ok(errors.length === 0, 'no WebGL or page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
