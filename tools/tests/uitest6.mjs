// UI verification — stack banners: same-tag armies in a province share one
// banner with a count badge; clicking it selects the whole stack.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
const { chromium } = require('playwright');
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
await page.waitForSelector('.bm-card', { timeout: 20000 });
for (let i = 0; i < 8; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(450);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click(); // JUD
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(600);

console.log('== split the Host of Jerusalem into three armies ==');
const setup = await page.evaluate(() => {
  const g = window._ctx.game;
  g.paused = false;
  const host = Object.values(g.armies).find((a) => a && a.tag === 'JUD' && g.provinces[a.prov].name === 'Jerusalem');
  window._actions.splitArmy(host.id);
  window._actions.splitArmy(host.id);
  const inProv = Object.values(g.armies).filter((a) => a && a.prov === host.prov && a.tag === 'JUD');
  g.paused = true;
  return { prov: host.prov, count: inProv.length, ids: inProv.map((a) => a.id) };
});
ok(setup.count === 3, 'three JUD armies in Jerusalem: ' + JSON.stringify(setup.ids));

console.log('== one banner; clicking it selects the whole stack ==');
const pt = await page.evaluate((prov) => {
  const c = window._ctx.geom.centroids[prov];
  const [sx, sy] = window._camera.mapToScreen(c.x, c.y);
  return { sx, sy };
}, setup.prov);
await page.mouse.click(pt.sx, pt.sy - 22); // inside the banner box above the anchor
await page.waitForTimeout(200);
const sel = await page.evaluate(() => ({
  armies: (window._ctx.game.ui.selectedArmies || []).slice(),
  primary: window._ctx.game.ui.selectedArmy,
}));
ok(sel.armies.length === 3, 'banner click selected all three: ' + JSON.stringify(sel.armies));
ok(setup.ids.includes(sel.primary), 'primary is one of the stack');
await page.screenshot({ path: OUT + 'v19-stack.png' });

console.log('== stack marches as one group ==');
const marched = await page.evaluate((prov) => {
  const ctx = window._ctx;
  const dest = [...ctx.geom.neighbors[prov]].find((n) => {
    const p = ctx.game.provinces[n];
    return p && !p.impassable;
  });
  const c = ctx.geom.centroids[dest];
  return { dest, ...(() => { const [x, y] = window._camera.mapToScreen(c.x, c.y); return { x, y }; })() };
}, setup.prov);
await page.evaluate(() => { window._ctx.game.paused = false; });
await page.mouse.click(marched.x, marched.y, { button: 'right' });
await page.evaluate(() => { window._ctx.game.paused = true; });
await page.waitForTimeout(300);
const paths = await page.evaluate((ids) => ids.map((id) => {
  const a = window._ctx.game.armies[id];
  return a && a.path && a.path.length ? a.path[0] : null;
}), setup.ids);
ok(paths.every((p) => p === marched.dest), 'right-click marched the whole stack to #' + marched.dest + ': ' + JSON.stringify(paths));

console.log('== merge-all consolidates the stack into one army ==');
await page.evaluate(() => { window._ctx.game.paused = false; });
await page.locator('.ol-row.ol-army.sel [data-mergeall]').first().click();
await page.evaluate(() => { window._ctx.game.paused = true; });
await page.waitForTimeout(200);
const afterMerge = await page.evaluate((prov) =>
  Object.values(window._ctx.game.armies).filter((a) => a && a.prov === prov && a.tag === 'JUD').length, setup.prov);
ok(afterMerge === 1, 'merge-all left one army: ' + afterMerge);

console.log('== the sea is a wall without ships ==');
const cyprus = await page.evaluate(() => {
  const ctx = window._ctx;
  ctx.game.paused = false;
  const sal = ctx.provId('Salamis');
  const nbrs = [...ctx.geom.neighbors[sal]].map((n) => ctx.game.provinces[n].name);
  const a = Object.values(ctx.game.armies).find((x) => x && x.tag === 'JUD');
  a.path = []; a.moveDaysLeft = 0; // clear the earlier march so a refusal is visible
  window._actions.moveArmy(a.id, sal);
  const path = ctx.game.armies[a.id].path.length;
  ctx.game.paused = true;
  return { neighbors: nbrs, path };
});
ok(!cyprus.neighbors.includes('Seleucia Pieria') && !cyprus.neighbors.includes('Ptolemais'),
  'Salamis has no land bridge to the mainland: [' + cyprus.neighbors.join(', ') + ']');
ok(cyprus.path === 0, 'the march order found no route');
await page.waitForTimeout(300);
const toast = await page.evaluate(() => document.getElementById('toast-container').textContent);
ok(/sea is in the way/.test(toast), 'the refusal tells the player to build ships');

ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));
await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
