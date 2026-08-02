// UI verification — the peace table stands beside the map: the card docks
// left with no scrim, the map stays visible and clickable, demandable
// provinces toggle in and out of the deal from the map, the chosen demands
// burn solid gold, and everything else stays inert while the envoys talk.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
// SPEC §160: the start screen is gated on the province raster — main.js awaits
// initRenderer() and computeGeometry() before showStartScreen() — and that pass
// is one fullscreen draw over every texel against every seed. At the frame that
// reaches Britain it is 25.0M x 307, about five times the pre-§160 work, and
// these suites run on SwiftShader. Measured: 74s to the carousel against 17s
// before. Every wait after it is unaffected (the nation cards land ~1s later),
// so this one constant is the whole of the change.
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
await page.locator('.bm-card.current').locator('..').locator('.bm-card.current').first().click().catch(() => {});
await page.locator('.bm-card.current').click().catch(() => {});
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click(); // 167 BCE as HAS
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(400);

// Fabricate a negotiable war with two occupied provinces on the table.
//
// The provinces have to be REACHABLE. This used to occupy Petra and Bostra in
// a war with Nabataea, and SPEC §116 — a demand has to be somewhere — quietly
// emptied the table: in 167 BCE the Hasmoneans hold three cells in the Judaean
// hills and their only neighbour on the whole map is the Seleucid king, so
// nothing Nabataean is land-reachable and the panel correctly offered no rows.
// The revolt's own war, with two Seleucid towns next door, is the fixture the
// rule allows.
await page.evaluate(() => {
  const ctx = window._ctx;
  const war = ctx.game.wars.find((w) => {
    const all = (w.attackers || []).concat(w.defenders || []);
    return all.indexOf('HAS') >= 0 && all.indexOf('SEL') >= 0;
  });
  war.name = 'Test War';
  war.noNegotiation = false; // the revolt is a fight to the death; this test is not
  war.warscore.HAS = 40;
  war.warscore.SEL = -40;
  for (const name of ['Jamnia', 'Azotus']) ctx.prov(name).controller = 'HAS';
  ctx.bus.emit('war', {});
});
await page.keyboard.press('n');
await page.waitForSelector('#nation-panel:not(.hidden)');
// SPEC §175: the realm panel is six tabs behind a pinned header and opens on
// Crown. The Diplomacy block — its war rows and their envoy doves — is on
// World, and a section whose tab is closed is display:none: readable by
// textContent, but not clickable.
await page.locator('#nation-panel .np-tab[data-tab-go="world"]').click();
await page.waitForTimeout(150);
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
ok(!(await page.locator('#province-panel:not(.hidden), #nation-panel:not(.hidden)').count()),
  'the peace table clears the ordinary panel berth');

console.log('== the map negotiates ==');
const petraId = await page.evaluate(() => window._ctx.prov('Jamnia').id);
const petraPoint = await page.evaluate(() => {
  const p = window._ctx.prov('Jamnia');
  const [x, y] = window._camera.mapToScreen(p.x, p.y);
  return { x, y };
});
const hit = await page.evaluate(({ x, y }) => {
  const el = document.elementFromPoint(x, y);
  return el && el.id;
}, petraPoint);
ok(hit === 'map-canvas', 'the real pointer target is the map canvas, not the peace overlay: ' + hit);
await page.mouse.click(petraPoint.x, petraPoint.y);
await page.waitForTimeout(150);
let checked = await page.locator(`#peace-modal [data-prov="${petraId}"]`).isChecked();
let sel = await page.evaluate(() => (window._ctx.game.ui.peaceSelected || []).slice());
ok(checked, 'clicking the occupied town on the map writes it into the terms (checkbox follows)');
ok(sel.length === 1 && sel[0] === petraId, 'the chosen demand burns solid gold: peaceSelected=' + JSON.stringify(sel));
const total = await page.locator('#peace-modal [data-ref="total"]').textContent();
ok(/Demands cost \d+ war score/.test(total), 'the cost line updates: ' + total.trim());

await page.mouse.click(petraPoint.x, petraPoint.y);
await page.waitForTimeout(150);
checked = await page.locator(`#peace-modal [data-prov="${petraId}"]`).isChecked();
sel = await page.evaluate(() => (window._ctx.game.ui.peaceSelected || []).slice());
ok(!checked && sel.length === 0, 'clicking again strikes it from the terms');

console.log('== everything else stays inert ==');
const jerPoint = await page.evaluate(() => {
  const p = window._ctx.prov('Jerusalem');
  const [x, y] = window._camera.mapToScreen(p.x, p.y);
  return { x, y };
});
await page.mouse.click(jerPoint.x, jerPoint.y);
await page.waitForTimeout(150);
ok(!(await page.locator('#province-panel:not(.hidden)').count()),
  'clicking a province not on the table opens nothing — the envoys have the floor');
ok(await page.locator('#peace-modal:not(.hidden)').count() === 1, 'the table stays open through map clicks');

console.log('== handhelds keep a live map above the terms ==');
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(150);
const mobileBox = await page.locator('#peace-modal .peace-card').boundingBox();
ok(mobileBox && mobileBox.y >= 400 && mobileBox.x >= 0 && mobileBox.x + mobileBox.width <= 390,
  'the terms become a bounded bottom sheet: ' + JSON.stringify(mobileBox));
const mobileHit = await page.evaluate(() => {
  const el = document.elementFromPoint(195, 150);
  return el && el.id;
});
ok(mobileHit === 'map-canvas', 'the upper handheld map remains a real pointer target: ' + mobileHit);
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(100);

await page.waitForTimeout(300);
await page.screenshot({ path: OUT + 'uitest22-peace-map.png' });

console.log('== the war overview keeps its scrim (scoped override) ==');
await page.locator('#peace-modal .peace-cancel').click();
await page.keyboard.press('n');
await page.waitForSelector('#nation-panel:not(.hidden)');
// SPEC §175: the realm panel is six tabs behind a pinned header and opens on
// Crown. The Diplomacy block — its war rows and their envoy doves — is on
// World, and a section whose tab is closed is display:none: readable by
// textContent, but not clickable.
await page.locator('#nation-panel .np-tab[data-tab-go="world"]').click();
await page.waitForTimeout(150);
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
