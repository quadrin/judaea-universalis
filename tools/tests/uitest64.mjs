// UI verification — SPEC §299: the fleet buttons, and a group of squadrons.
//
//   - The selected squadron's row: the troop-boat button embarks, the shield
//     merges (as the army row's shield does); the fleet panel the same.
//   - Shift-click on a second squadron (outliner or map) adds it to the
//     group: both rows are marked, the panel shows the last one picked and
//     the group's size; a right-click sails them all; shift-click again
//     drops one; a plain click on one selects it alone.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
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
// three squadrons of ours in one harbor, an army beside them, and another
// harbor to sail to
const s = await page.evaluate(() => {
  const ctx = window._ctx;
  const g = ctx.game;
  g.paused = true;
  g.wars = [];
  for (const k of Object.keys(g.tags)) if (g.tags[k]) g.tags[k].atWarWith = [];
  document.getElementById('toast-container').innerHTML = '';
  const ports = g.provinces.filter((x) => x && x.owner === g.playerTag && x.controller === g.playerTag && ctx.geom.coastal[x.id]);
  const p = ports[0];
  const ids = [1, 2, 3].map((n) => ctx.helpers.spawnFleet(ctx, g.playerTag, p.canon || p.name, 2, { name: 'Squadron ' + n }).id);
  const a = Object.values(g.armies).find((x) => x && x.tag === g.playerTag);
  a.prov = p.id; a.path = []; a.inBattle = false;
  const dest = g.provinces.find((x) => x && x.id !== p.id && ctx.geom.coastal[x.id] && Math.hypot(x.x - p.x, x.y - p.y) < 400);
  window._ctx.bus.emit('day', { date: { ...g.date } });
  return { ids, port: p.id, dest: dest && dest.id };
});
await page.waitForTimeout(300);
const row = (id) => page.locator(`#outliner [data-fleet="${id}"]`);
const sel = () => page.evaluate(() => ({ one: window._ctx.game.ui.selectedFleet, all: (window._ctx.game.ui.selectedFleets || []).slice() }));

console.log('== the buttons: a troop boat embarks, the shield merges ==');
await row(s.ids[0]).click();
await page.waitForTimeout(400);
const emb = row(s.ids[0]).locator('[data-fleet-embark]');
const mer = row(s.ids[0]).locator('[data-fleet-merge]');
ok((await emb.count()) === 1 && /cx="8.6"/.test(await emb.innerHTML()), 'Embark is the boat with troops aboard');
ok((await mer.count()) === 1 && /circle cx="12" cy="10.8"/.test(await mer.innerHTML()), 'Merge is the shield, as on the army row');
const order = await row(s.ids[0]).locator('.ol-act').evaluateAll((bs) => bs.map((b) => Object.keys(b.dataset)[0]));
ok(order[0] === 'fleetMerge' && order[1] === 'fleetEmbark', 'the shield first, on the left, then the troop boat: ' + order.join(', '));
const fpEmb = page.locator('#fleet-panel [data-fp="embarkFleet"]');
const fpMer = page.locator('#fleet-panel [data-fp="mergeAllFleets"]');
ok((await fpEmb.count()) === 1 && /cx="8.6"/.test(await fpEmb.innerHTML()) && /circle cx="12" cy="10.8"/.test(await fpMer.innerHTML()),
  'and the fleet panel the same');
await row(s.ids[0]).screenshot({ path: OUT + 'v299-fleet-row.png' });

console.log('== shift-click builds a group ==');
await row(s.ids[1]).click({ modifiers: ['Shift'] });
await page.waitForTimeout(400);
let x = await sel();
ok(x.all.length === 2 && x.all.includes(s.ids[0]) && x.all.includes(s.ids[1]) && x.one === s.ids[1], 'two squadrons, the last one primary: ' + JSON.stringify(x));
ok((await row(s.ids[0]).getAttribute('class')).includes('sel') && (await row(s.ids[1]).getAttribute('class')).includes('sel')
  && !(await row(s.ids[2]).getAttribute('class')).includes('sel'), 'both rows are marked, the third is not');
const grp = (await page.locator('#fleet-panel').textContent()) || '';
ok(/2 squadrons · 4 ships/.test(grp), 'the fleet panel shows the group: ' + (grp.match(/Group[^A-Z]*/) || [''])[0]);
// on the map, too
await page.evaluate((id) => window._ctx.bus.emit('mapclick', { provId: 0, fleetId: id, shift: true }), s.ids[2]);
await page.waitForTimeout(300);
x = await sel();
ok(x.all.length === 3 && x.one === s.ids[2], 'a shift-click on the map adds the third: ' + JSON.stringify(x));
await page.screenshot({ path: OUT + 'v299-fleet-group.png', clip: { x: 1000, y: 0, width: 440, height: 900 } });

console.log('== a right-click sails them all ==');
if (s.dest) {
  await page.evaluate((d) => window._ctx.bus.emit('maprightclick', { provId: d }), s.dest);
  await page.waitForTimeout(300);
  const moving = await page.evaluate((ids) => ids.map((id) => {
    const f = window._ctx.game.fleets[id];
    return !!(f && ((f.path && f.path.length) || f.dest || f.moveDaysLeft > 0));
  }), s.ids);
  ok(moving.every(Boolean), 'all three are under sail: ' + JSON.stringify(moving));
} else {
  ok(false, 'no second harbor nearby to sail to');
}

console.log('== shift-click drops one; a plain click picks one alone ==');
await row(s.ids[2]).click({ modifiers: ['Shift'] });
await page.waitForTimeout(300);
x = await sel();
ok(x.all.length === 2 && !x.all.includes(s.ids[2]) && x.one === s.ids[1], 'the third is dropped, the second is primary again: ' + JSON.stringify(x));
await row(s.ids[0]).click();
await page.waitForTimeout(300);
x = await sel();
ok(x.all.length === 1 && x.one === s.ids[0], 'a plain click selects one alone: ' + JSON.stringify(x));
ok(!(await page.locator('#fleet-panel').textContent()).includes('squadrons ·'), 'and the panel drops the group line');

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));
await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
