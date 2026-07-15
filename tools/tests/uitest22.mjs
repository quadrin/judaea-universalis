// UI verification — the peace table stands beside the map: the card docks
// left with no scrim, the map stays visible and clickable, demandable
// provinces toggle in and out of the deal from the map, the chosen demands
// burn solid gold, and everything else stays inert while the envoys talk.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
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
await page.locator('.bm-card.current').locator('..').locator('.bm-card.current').first().click().catch(() => {});
await page.locator('.bm-card.current').click().catch(() => {});
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click(); // 167 BCE as HAS
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(400);

// fabricate a negotiable war with two occupied provinces on the table
await page.evaluate(() => {
  const ctx = window._ctx;
  ctx.helpers.declareWar(ctx, 'HAS', 'NAB', 'Test War');
  const war = ctx.game.wars.find((w) => w.name === 'Test War');
  war.warscore.HAS = 40;
  war.warscore.NAB = -40;
  for (const name of ['Petra', 'Bostra']) ctx.prov(name).controller = 'HAS';
  ctx.bus.emit('war', {});
});
await page.keyboard.press('n');
await page.waitForSelector('#nation-panel:not(.hidden)');
await page.locator('#nation-panel .np-dip-row', { hasText: 'Test War' }).locator('.np-dove').click();
await page.waitForSelector('#peace-modal:not(.hidden)');

console.log('== the table stands beside the map ==');
const box = await page.locator('#peace-modal .peace-card').boundingBox();
ok(box && box.x < 100 && box.y > 40, 'the card docks left of the map: x=' + Math.round(box.x) + ', y=' + Math.round(box.y));
const scrimVisible = await page.evaluate(() => {
  const s = document.querySelector('#peace-modal .modal-scrim');
  return s ? getComputedStyle(s).display !== 'none' : false;
});
ok(!scrimVisible, 'no scrim — the map stays in view');
ok(/click a gold province/i.test(await page.locator('#peace-modal .peace-hint').textContent()),
  'the hint teaches the map interaction');

console.log('== the map negotiates ==');
const petraId = await page.evaluate(() => window._ctx.prov('Petra').id);
await page.evaluate((id) => window._ctx.bus.emit('mapclick', { provId: id }), petraId);
await page.waitForTimeout(150);
let checked = await page.locator(`#peace-modal [data-prov="${petraId}"]`).isChecked();
let sel = await page.evaluate(() => (window._ctx.game.ui.peaceSelected || []).slice());
ok(checked, 'clicking Petra on the map writes it into the terms (checkbox follows)');
ok(sel.length === 1 && sel[0] === petraId, 'the chosen demand burns solid gold: peaceSelected=' + JSON.stringify(sel));
const total = await page.locator('#peace-modal [data-ref="total"]').textContent();
ok(/Demands cost \d+ war score/.test(total), 'the cost line updates: ' + total.trim());

await page.evaluate((id) => window._ctx.bus.emit('mapclick', { provId: id }), petraId);
await page.waitForTimeout(150);
checked = await page.locator(`#peace-modal [data-prov="${petraId}"]`).isChecked();
sel = await page.evaluate(() => (window._ctx.game.ui.peaceSelected || []).slice());
ok(!checked && sel.length === 0, 'clicking again strikes it from the terms');

console.log('== everything else stays inert ==');
const jerId = await page.evaluate(() => window._ctx.prov('Jerusalem').id);
await page.evaluate((id) => window._ctx.bus.emit('mapclick', { provId: id }), jerId);
await page.waitForTimeout(150);
ok(!(await page.locator('#province-panel:not(.hidden)').count()),
  'clicking a province not on the table opens nothing — the envoys have the floor');
ok(await page.locator('#peace-modal:not(.hidden)').count() === 1, 'the table stays open through map clicks');

await page.waitForTimeout(300);
await page.screenshot({ path: OUT + 'uitest22-peace-map.png' });

console.log('== the war overview keeps its scrim (scoped override) ==');
await page.locator('#peace-modal .peace-cancel').click();
await page.locator('#nation-panel [data-war]').first().click();
await page.waitForSelector('#war-modal:not(.hidden)');
const woScrim = await page.evaluate(() => {
  const s = document.querySelector('#war-modal .modal-scrim');
  return s ? getComputedStyle(s).display !== 'none' : false;
});
ok(woScrim, 'the war overview still dims the world behind it');
await page.keyboard.press('Escape');

console.log('== no console errors ==');
ok(errors.length === 0, errors.length ? 'errors: ' + errors.slice(0, 3).join(' | ') : 'the console stays clean');

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
