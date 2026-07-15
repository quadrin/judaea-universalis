// UI verification — no sideways province-panel crawl, no ancient airfields,
// merchant shipyards, and the confirmed army stand-down action.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('dialog', (d) => d.accept());
let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };
async function pickBookmark(nameFrag) {
  await page.waitForSelector('.bm-card', { timeout: 20000 });
  for (let i = 0; i < 8; i++) {
    const current = page.locator('.bm-card.current');
    if (((await current.textContent()) || '').includes(nameFrag)) { await current.click(); return; }
    await page.locator('.ss-next').click();
    await page.waitForTimeout(450);
  }
  throw new Error('bookmark not found: ' + nameFrag);
}

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await pickBookmark('Great Revolt');
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);

await page.evaluate(() => {
  const ctx = window._ctx;
  const p = ctx.game.provinces.find((row) => row && row.owner === ctx.game.playerTag
    && row.controller === ctx.game.playerTag && ctx.geom.coastal[row.id]);
  ctx.bus.emit('mapclick', { provId: p.id, armyId: null });
});
await page.waitForSelector('#province-panel:not(.hidden)');

console.log('== the province panel never needs a sideways drag ==');
const sizing = await page.locator('#province-panel').evaluate((el) => {
  el.scrollLeft = 999;
  return { client: el.clientWidth, scroll: el.scrollWidth, left: el.scrollLeft };
});
ok(sizing.scroll === sizing.client && sizing.left === 0,
  'the panel and recruitment grid fit their width: ' + JSON.stringify(sizing));
ok((await page.locator('#province-panel .pp-recruit-btn').count()) >= 2, 'recruitment controls remain fully visible');

console.log('== future infrastructure stays out of the ancient UI ==');
const buildNames = await page.locator('#province-panel [data-build]').allTextContents();
ok(!buildNames.some((name) => /Airfield/i.test(name)), 'the ancient building grid contains no airfield control');
ok(buildNames.some((name) => /Shipyard/i.test(name)), 'the coastal building grid offers a shipyard');

console.log('== a shipyard opens the merchant marine ==');
await page.evaluate(() => {
  const ctx = window._ctx;
  const p = ctx.game.provinces.find((row) => row && row.owner === ctx.game.playerTag
    && row.controller === ctx.game.playerTag && ctx.geom.coastal[row.id]);
  if (!Array.isArray(p.buildings)) p.buildings = [];
  if (!p.buildings.includes('shipyard')) p.buildings.push('shipyard');
  ctx.game.tags[ctx.game.playerTag].treasury = 200;
  ctx.bus.emit('provinceOwner', { id: p.id });
});
await page.waitForSelector('#province-panel .pp-merchant:not(.hidden)');
await page.locator('#province-panel [data-ref="merchantShip"]').click();
ok(/1 \/ 5 merchant ships/.test(await page.locator('#province-panel [data-ref="merchantStatus"]').textContent()),
  'commissioning a merchantman updates the persistent port count');

console.log('== selected armies can stand down ==');
const before = await page.evaluate(() => Object.values(window._ctx.game.armies).filter((a) => a && a.tag === window._ctx.game.playerTag).length);
await page.locator('#outliner .ol-army').first().click();
await page.locator('#outliner .ol-disband:not(.disabled)').first().click();
const after = await page.evaluate(() => Object.values(window._ctx.game.armies).filter((a) => a && a.tag === window._ctx.game.playerTag).length);
ok(after === before - 1, 'the confirmed outliner action removes one army');

ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));
await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
