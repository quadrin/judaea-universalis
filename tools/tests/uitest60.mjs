// UI verification — SPEC §294: the fleets read at a glance.
//
//   - A warship flies an ensign above its hull in its court's colour, with
//     its hull count; a merchant ship flies none.
//   - An army that embarks leaves the shore: no banner where it stood, and
//     its men ride on the ensign of the ship that carries it.
//   - Two hostile squadrons at one anchor: a battle disc beside it, with
//     each side's hulls.
//   - A squadron of ours selected opens the fleet panel: its name, where it
//     is, troops aboard, upkeep, and labelled orders; Lay up and Recommission
//     work from it; Escape closes it with the selection.
//   - The outliner names the squadron, not only its harbor.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
// The start screen waits on the province raster (SPEC §160); on SwiftShader
// that is minutes, not seconds. See uitest18.
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 480000);
const OUT = (process.env.JU_OUT || '/tmp') + '/';
const URL0 = process.env.JU_URL || 'http://127.0.0.1:8613/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(URL0, { waitUntil: 'networkidle' });
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
  const ctx = window._ctx;
  const g = ctx.game;
  g.paused = true;
  document.getElementById('toast-container').innerHTML = '';
  const j = ctx.prov('Joppa');
  j.owner = g.playerTag; j.controller = g.playerTag;
  const f = ctx.helpers.spawnFleet(ctx, g.playerTag, 'Joppa', 5, { name: 'Squadron of Joppa' });
  const aid = ctx.helpers.spawnArmy(ctx, g.playerTag, 'Joppa', { inf: 3, name: 'Marines of Joppa' });
  for (const a of Object.values(g.armies)) if (a && a.prov === j.id && a.id !== aid) a.prov = ctx.prov('Lydda').id;
  // a merchant ship beside it, for the contrast
  g.merchants = [{ id: 1, tag: g.playerTag, kind: 'ship', home: j.id, at: j.id, state: 'home', node: null, order: null, steerTo: null }];
  g.nextMerchantId = 2;
  const a = j;
  window._camera.centerOn(a.x, a.y, 2.6);
  ctx.bus.emit('day', { date: { ...g.date } });
  return { J: j.id, fid: f.id, aid };
});
await page.waitForTimeout(900);

console.log('== a warship flies an ensign ==');
let ships = await page.evaluate(() => window._overlay.ships());
let fm = ships.find((s) => s.kind === 'fleet' && s.id === ids.fid);
ok(fm && fm.chip && fm.chip.w > 20 && fm.chip.y + fm.chip.h < fm.y, 'the squadron\'s ensign flies above its hull: ' + JSON.stringify(fm && fm.chip && { w: Math.round(fm.chip.w), y: Math.round(fm.chip.y) }));
ok(ships.some((s) => s.kind === 'harbor') && !ships.some((s) => s.kind === 'harbor' && s.chip), 'the merchant ship beside it flies none');
await page.screenshot({ path: OUT + 'v294-ensign.png', clip: { x: 520, y: 250, width: 400, height: 300 } });

console.log('== an army aboard rides the ship ==');
const shore = await page.evaluate((J) => {
  const c = window._ctx.geom.centroids[J];
  return window._camera.mapToScreen(c.x, c.y);
}, ids.J);
const before = await page.evaluate(({ x, y }) => window._overlay.hitTestArmy(x, y - 20, window._ctx.game, window._camera), { x: shore[0], y: shore[1] });
ok(before != null, 'the marines stand on the shore at Joppa: ' + before);
await page.evaluate((fid) => window._actions.embarkFleet(fid), ids.fid);
await page.evaluate(() => window._ctx.bus.emit('day', { date: { ...window._ctx.game.date } }));
await page.waitForTimeout(300);
const after = await page.evaluate(({ x, y }) => window._overlay.hitTestArmy(x, y - 20, window._ctx.game, window._camera), { x: shore[0], y: shore[1] });
ships = await page.evaluate(() => window._overlay.ships());
fm = ships.find((s) => s.kind === 'fleet' && s.id === ids.fid);
ok(after == null, 'embarked, they leave the shore');
ok(fm && fm.aboard >= 3000 && fm.chip.w > 50, 'and ride on the ensign: ' + (fm && fm.aboard) + ' men');
await page.screenshot({ path: OUT + 'v294-aboard.png', clip: { x: 520, y: 250, width: 400, height: 300 } });

console.log('== the fleet panel ==');
await page.locator(`#outliner [data-fleet="${ids.fid}"]`).click();
await page.waitForSelector('#fleet-panel:not(.hidden)');
const fp = (await page.locator('#fleet-panel').textContent()) || '';
ok(/Squadron of Joppa/.test(fp) && /at anchor off Joppa/.test(fp), 'it names the squadron and where it is');
ok(/Marines of Joppa/.test(fp) && /Upkeep/.test(fp) && /2\.5 a month/.test(fp), 'the troops aboard and the upkeep (2.5)');
const labels = await page.locator('#fleet-panel .fp-acts .btn').allTextContents();
ok(labels.length >= 7 && labels.some((l) => /Land troops/.test(l)) && labels.some((l) => /Lay up/.test(l)), 'labelled orders: ' + labels.join(' | '));
const olName = (await page.locator(`#outliner [data-fleet="${ids.fid}"] .ol-name`).textContent()) || '';
ok(/Squadron of Joppa/.test(olName), 'the outliner names it: ' + olName.trim());
await page.locator('#fleet-panel [data-fp="disembarkFleet"]').click();
await page.waitForTimeout(200);
await page.locator('#fleet-panel [data-fp="layup"]').click();
await page.waitForTimeout(250);
ok(await page.evaluate((fid) => !!window._ctx.game.fleets[fid].laidUp, ids.fid), 'Land troops, then Lay up: the squadron is laid up');
ok(/laid up in ordinary/.test(await page.locator('#fleet-panel').textContent()), 'and the panel says so');
await page.screenshot({ path: OUT + 'v294-fleet-panel.png' });
await page.locator('#fleet-panel [data-fp="recommission"]').click();
await page.waitForTimeout(250);
ok(await page.evaluate((fid) => !window._ctx.game.fleets[fid].laidUp && window._ctx.game.fleets[fid].recommission === 30, ids.fid), 'Recommission signs on crews');
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
ok(await page.locator('#fleet-panel.hidden').count() === 1 && await page.evaluate(() => window._ctx.game.ui.selectedFleet == null), 'Escape closes it with the selection');

console.log('== a sea fight on the map ==');
await page.evaluate(async (J) => {
  const ctx = window._ctx;
  const g = ctx.game;
  const navy = await import('/js/sim/navy.js');
  const mil = await import('/js/sim/military.js');
  const foe = Object.keys(g.tags).find((t) => t !== g.playerTag && g.tags[t].alive && g.tags[t].atWarWith && g.tags[t].atWarWith.includes(g.playerTag)) || 'ROM';
  if (!(g.tags[g.playerTag].atWarWith || []).includes(foe)) mil.declareWar(ctx, g.playerTag, foe, 'Test War');
  const f = Object.values(g.fleets).find((x) => x && x.tag === g.playerTag && x.name === 'Squadron of Joppa');
  f.recommission = 0; delete f.recommission;
  ctx.helpers.spawnFleet(ctx, foe, 'Joppa', 4, { name: 'Test raiders' });
  navy.fleetsDaily(ctx);
}, ids.J);
await page.waitForTimeout(500);
ships = await page.evaluate(() => window._overlay.ships());
const sf = ships.find((s) => s.kind === 'seafight' && s.prov === ids.J);
ok(!!sf && sf.shipsA > 0 && sf.shipsB > 0, 'a battle disc beside Joppa: ' + (sf ? sf.shipsA + ' : ' + sf.shipsB : 'none'));
await page.screenshot({ path: OUT + 'v294-sea-fight.png', clip: { x: 480, y: 230, width: 480, height: 340 } });

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
