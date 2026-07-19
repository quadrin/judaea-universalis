// Browser regression — 1948's modern cells are real rendered/clickable
// provinces, while the same raw pixels resolve to historical parents in 66 CE.
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
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

async function startBookmark(dot) {
  await page.waitForSelector('.bm-card');
  await page.locator(`.ss-dot[data-dot="${dot}"]`).click();
  await page.locator('.bm-card.current').click();
  await page.waitForSelector('.nation-card');
  await page.locator('.nation-card').first().click();
  await page.waitForFunction(() => !!window._ctx && !!window._renderer && !!window._camera);
  await page.waitForFunction(() => Math.abs(window._camera.zoom - 1.8) < 0.01);
}

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });

console.log('== 1948 modern profile ==');
await startBookmark(6);
const modern = await page.evaluate(() => {
  const names = [
    'Safed', 'Nahariya', 'Afula', 'Hadera', 'Netanya', 'Herzliya', 'Kfar Saba',
    'Rishon LeZion', 'Rehovot', 'Modi\'in Hills', 'Jenin', 'Tulkarm', 'Qalqilya',
    'Ramallah', 'Bethlehem', 'Beit Shemesh', 'Kiryat Gat', 'Beersheba', 'Arad',
    'Khan Yunis', 'Rafah',
    'Dimona', 'Mitzpe Ramon', 'Paran', 'Eilat',
    'Kiryat Shmona', 'Azraq', 'Rutba',
    'Kadesh Barnea', 'Dizahab', 'Zoara',
  ];
  const ctx = window._ctx;
  const renderer = window._renderer;
  const ids = new Map(ctx.MAP_DATA.provinces.map((p, i) => [p.name, i + 1]));
  const wanted = new Set(names.map((n) => ids.get(n)));
  const firstPixel = new Map();
  for (let i = 0; i < renderer.idArray.length && firstPixel.size < wanted.size; i++) {
    const id = renderer.idArray[i];
    if (wanted.has(id) && !firstPixel.has(id)) firstPixel.set(id, i);
  }
  const rows = names.map((name) => {
    const id = ids.get(name);
    const i = firstPixel.get(id);
    const hit = i === undefined ? 0 : renderer.provIdAt(i % ctx.MAP_DATA.MAP_W, Math.floor(i / ctx.MAP_DATA.MAP_W));
    const p = ctx.game.provinces[id];
    return { name, id, area: ctx.geom.areas[id], raw: i !== undefined, hit, owner: p && p.owner };
  });

  // Pick a safely interior Netanya pixel nearest its pixel-mass centroid, then
  // convert it through the same camera used by a real pointer click.
  const clickId = ids.get('Netanya');
  const c = ctx.geom.centroids[clickId];
  let best = -1, bestD = Infinity;
  for (let i = 0; i < renderer.idArray.length; i++) {
    if (renderer.idArray[i] !== clickId) continue;
    const x = i % ctx.MAP_DATA.MAP_W, y = Math.floor(i / ctx.MAP_DATA.MAP_W);
    const d = (x - c.x) ** 2 + (y - c.y) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  const [sx, sy] = window._camera.mapToScreen(best % ctx.MAP_DATA.MAP_W,
    Math.floor(best / ctx.MAP_DATA.MAP_W));
  const rect = document.getElementById('map-container').getBoundingClientRect();
  return {
    rows,
    jish: ctx.game.provinces[ids.get('Gischala')].name,
    safed: ctx.game.provinces[ids.get('Safed')].name,
    frontier: ['Modi\'in Hills', 'Beit Shemesh', 'Kiryat Gat', 'Arad']
      .every((n) => ctx.game.provinces[ids.get(n)].habitation === 'frontier'),
    click: { x: rect.left + sx, y: rect.top + sy },
  };
});
ok(modern.rows.length === 31 && modern.rows.every((r) => r.raw && r.area > 0 && r.hit === r.id),
  'all 31 modern cells own pixels, geometry, and their click IDs');
ok(modern.rows.find((r) => r.name === 'Safed').owner === 'ISR'
    && modern.rows.find((r) => r.name === 'Ramallah').owner === 'JOR'
    && modern.rows.find((r) => r.name === 'Rafah').owner === 'EGY',
  'modern political ownership reaches Israel, the West Bank, and Gaza');
ok(modern.jish === 'Jish' && modern.safed === 'Safed', 'Safed is no longer an alias for ancient Gischala');
ok(modern.frontier, 'later-founded cells remain frontier land in May 1948');
await page.mouse.click(modern.click.x, modern.click.y);
await page.waitForSelector('#province-panel:not(.hidden)');
ok((await page.locator('#province-panel h2').textContent()) === 'Netanya',
  'a real map click opens the Netanya province panel');

console.log('== ancient collapsed profile ==');
await page.reload({ waitUntil: 'networkidle' });
await startBookmark(3);
const ancient = await page.evaluate(() => {
  const ctx = window._ctx;
  const renderer = window._renderer;
  const childId = ctx.MAP_DATA.provinces.findIndex((p) => p.name === 'Safed') + 1;
  const parentId = ctx.MAP_DATA.provinces.findIndex((p) => p.name === 'Gischala') + 1;
  let raw = -1;
  for (let i = 0; i < renderer.idArray.length; i++) {
    if (renderer.idArray[i] === childId) { raw = i; break; }
  }
  const x = raw % ctx.MAP_DATA.MAP_W, y = Math.floor(raw / ctx.MAP_DATA.MAP_W);
  return {
    childNull: ctx.game.provinces[childId] === null,
    childArea: ctx.geom.areas[childId], parentArea: ctx.geom.areas[parentId],
    hit: renderer.provIdAt(x, y), parentId,
    parentName: ctx.game.provinces[parentId].name,
  };
});
ok(ancient.childNull && ancient.childArea === 0 && ancient.parentArea > 0,
  '66 CE has no hidden Safed economy, label, or movement node');
ok(ancient.hit === ancient.parentId, 'the same raw Safed pixel clicks through to Gischala in 66 CE');
ok(ancient.parentName === 'Gischala', 'the resolved ancient click target is the historical Gischala panel');

ok(errors.length === 0, 'no browser or WebGL errors: ' + JSON.stringify(errors.slice(0, 3)));
await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
