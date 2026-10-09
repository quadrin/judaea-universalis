// UI verification — SPEC §293: the walls and the fleet cost money, and both
// can be put away.
//
//   - The ledger (Technology tab) has Fortresses and Naval maintenance lines.
//   - The province panel's fort row has a Mothball button; a click mothballs
//     the fort, the label says so, and the button turns to Man the walls.
//   - The Defense tab lists the Walls, border forts first, with the month's
//     upkeep; Man brings the mothballed fort back.
//   - The outliner's anchor button lays a selected squadron up; the row says
//     "laid up"; a second click recommissions it ("crews 30d").
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
await page.evaluate(() => {
  const g = window._ctx.game;
  g.paused = true;
  document.getElementById('toast-container').innerHTML = '';
  // a squadron of ours at Joppa for the outliner
  const ctx = window._ctx;
  const j = ctx.prov('Joppa');
  j.owner = g.playerTag; j.controller = g.playerTag;
  ctx.helpers.spawnFleet(ctx, g.playerTag, 'Joppa', 4, { name: 'Test squadron' });
  ctx.bus.emit('day', { date: { ...g.date } });
});

console.log('== the ledger ==');
const rows = await page.evaluate(() => window._actions.explainIncome(window._ctx.game.playerTag));
const forts = rows.find((r) => r.label === 'Fortresses');
const naval = rows.find((r) => r.label === 'Naval maintenance');
ok(forts && forts.value < 0, 'a Fortresses line: ' + (forts && forts.value));
ok(naval && Math.abs(naval.value + 2) < 0.01, 'a Naval maintenance line for four ships: ' + (naval && naval.value));
await page.locator('.tb-flag').click();
await page.waitForSelector('#nation-panel:not(.hidden)');
await page.locator('#nation-panel .np-tab[data-tab-go="tech"]').click();
await page.waitForTimeout(300);
const led = (await page.locator('#nation-panel [data-ref="ledger"]').textContent()) || '';
ok(/Fortresses/.test(led) && /Naval maintenance/.test(led), 'the realm panel\'s ledger shows both');
await page.keyboard.press('Escape');

console.log('== the province panel mothballs a fort ==');
const mach = await page.evaluate(() => {
  const p = window._ctx.prov('Machaerus');
  return { id: p.id, fort: p.fort, owner: p.owner };
});
ok(mach.fort > 0 && mach.owner === 'JUD', 'Machaerus is a Judaean fort ' + mach.fort);
await page.evaluate((id) => window._ctx.bus.emit('mapclick', { provId: id, armyId: null }), mach.id);
await page.waitForSelector('#province-panel:not(.hidden)');
await page.waitForTimeout(200);
const sel = await page.evaluate(() => window._ctx.game.ui.selectedProv);
ok(sel === mach.id, 'the province panel is on Machaerus: ' + sel);
const mb = page.locator('#province-panel [data-ref="mothball"]:not(.hidden)');
ok((await mb.count()) === 1 && /Mothball/.test(await mb.textContent()), 'its fort row offers Mothball: ' + (await mb.textContent().catch(() => '')));
await mb.click();
await page.waitForTimeout(300);
ok(await page.evaluate((id) => !!window._ctx.byId(id).mothballed, mach.id), 'a click mothballs it');
ok(/mothballed/.test(await page.locator('#province-panel [data-ref="fortLabel"]').textContent()), 'the fort row says so');
ok(/Man the walls/.test(await mb.textContent()), 'and the button now mans the walls');
await page.screenshot({ path: OUT + 'v293-mothballed.png' });

console.log('== the Defense tab lists the walls ==');
await page.keyboard.press('Escape');
await page.locator('.tb-flag').click();
await page.waitForSelector('#nation-panel:not(.hidden)');
await page.locator('#nation-panel .np-tab[data-tab-go="war"]').click();
await page.waitForTimeout(300);
const walls = page.locator('#nation-panel [data-ref="fortsBlock"]:not(.hidden)');
ok((await walls.count()) === 1, 'the Defense tab has the Walls');
const wtxt = (await walls.textContent()) || '';
ok(/upkeep/.test(wtxt) && /Machaerus/.test(wtxt) && /mothballed/.test(wtxt), 'listing the forts, their upkeep, and Machaerus mothballed');
await page.screenshot({ path: OUT + 'v293-walls.png' });
await page.locator(`#nation-panel [data-fort-mb="${mach.id}|0"]`).click();
await page.waitForTimeout(300);
ok(await page.evaluate((id) => !window._ctx.byId(id).mothballed, mach.id), 'Man brings it back');
await page.keyboard.press('Escape');

console.log('== the outliner lays a squadron up ==');
const fid = await page.evaluate(() => {
  const g = window._ctx.game;
  const f = Object.values(g.fleets).find((x) => x && x.tag === g.playerTag && x.name === 'Test squadron');
  g.ui.selectedFleet = f.id;
  window._ctx.bus.emit('day', { date: { ...g.date } });
  return f.id;
});
await page.waitForTimeout(300);
const anchor = page.locator(`#outliner [data-fleet-layup="${fid}"]`);
ok((await anchor.count()) === 1, 'the selected squadron has an anchor button');
await anchor.click();
await page.waitForTimeout(300);
ok(await page.evaluate((id) => !!window._ctx.game.fleets[id].laidUp, fid), 'a click lays it up');
await page.evaluate(() => { window._ctx.game.ui.selectedFleet = null; window._ctx.bus.emit('day', { date: { ...window._ctx.game.date } }); });
await page.waitForTimeout(300);
const frow = (await page.locator(`#outliner [data-fleet="${fid}"]`).textContent()) || '';
ok(/laid up/.test(frow), 'the row says laid up: ' + frow.replace(/\s+/g, ' ').trim());
const naval2 = await page.evaluate(() => window._actions.explainIncome(window._ctx.game.playerTag).find((r) => r.label === 'Naval maintenance'));
ok(naval2 && Math.abs(naval2.value + 0.5) < 0.01, 'a quarter of the upkeep: ' + (naval2 && naval2.value));
await page.screenshot({ path: OUT + 'v293-laid-up.png', clip: { x: 1100, y: 40, width: 340, height: 600 } });
await page.evaluate((id) => { window._ctx.game.ui.selectedFleet = id; window._ctx.bus.emit('day', { date: { ...window._ctx.game.date } }); }, fid);
await page.waitForTimeout(300);
await page.locator(`#outliner [data-fleet-layup="${fid}"]`).click();
await page.waitForTimeout(300);
const rec = await page.evaluate((id) => ({ laid: !!window._ctx.game.fleets[id].laidUp, days: window._ctx.game.fleets[id].recommission }), fid);
ok(!rec.laid && rec.days === 30, 'a second click recommissions it: ' + JSON.stringify(rec));

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
