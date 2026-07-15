// UI verification — v3.1: fleets and wings live in the outliner like armies,
// with admirals, commanders and refits; the shipyard speaks the age; the
// scripted war's dove is present.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
const { chromium } = require('playwright');

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.bm-card', { timeout: 20000 });
for (let i = 0; i < 10; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Independence')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(400);

console.log('== the shipyard speaks the age ==');
const port = await page.evaluate(() => {
  const ctx = window._ctx;
  const g = ctx.game;
  g.tags.ISR.treasury = 500;
  g.tags.ISR.points.mar = 200;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && p.owner === 'ISR' && p.controller === 'ISR' && ctx.geom.coastal[i]) {
      ctx.bus.emit('mapclick', { provId: i, armyId: null });
      return p.name;
    }
  }
  return null;
});
await page.waitForSelector('#province-panel:not(.hidden)');
const shipTxt = (await page.locator('[data-ref="buildShip"]').textContent()) || '';
ok(/Destroyer Flotillas/.test(shipTxt), '1948 lays down Destroyer Flotillas at ' + port + ': ' + shipTxt.trim());
await page.locator('[data-ref="buildShip"]').click();
await page.waitForTimeout(250);

console.log('== fleets and wings in the outliner ==');
await page.evaluate(() => {
  const ctx = window._ctx;
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && p.owner === 'ISR' && p.controller === 'ISR') {
      p.buildings = p.buildings || [];
      if (p.buildings.indexOf('airfield') < 0) p.buildings.push('airfield');
      window._actions.recruitAirWing(i);
      break;
    }
  }
  ctx.bus.emit('war', {}); // nudge the outliner to re-render
});
await page.waitForTimeout(500);
const olText = (await page.locator('#outliner').textContent()) || '';
ok(/Fleets/.test(olText), 'the outliner lists Fleets');
ok(/Air Wings/.test(olText), 'the outliner lists Air Wings');
ok(/Squadron/.test(olText), 'the squadron appears by name');

const wingBtn = page.locator('#outliner [data-wing-leader]').first();
ok((await wingBtn.count()) === 1, 'the wing row offers a commander');
await wingBtn.click();
await page.waitForTimeout(250);
const wingState = await page.evaluate(() => Object.values(window._ctx.game.airwings)[0]);
ok(!!wingState.leader, 'a commander leads the squadron: ' + (wingState.leader && wingState.leader.name));

await page.locator('#outliner [data-fleet]').first().click();
await page.waitForTimeout(200);
const admBtn = page.locator('#outliner [data-fleet-admiral]').first();
ok((await admBtn.count()) === 1, 'the selected fleet offers an admiral');
await admBtn.click();
await page.waitForTimeout(250);
const fleetState = await page.evaluate(() => Object.values(window._ctx.game.fleets)[0]);
ok(!!fleetState.admiral, 'an admiral takes the deck: ' + (fleetState.admiral && fleetState.admiral.name));
ok(fleetState.gen === 5, 'the hull was laid down modern: gen ' + fleetState.gen);

console.log('== the scripted war hears envoys ==');
const dove = await page.evaluate(() => {
  const g = window._ctx.game;
  const war = g.wars.find((w) => w.noNegotiation);
  return { hasWar: !!war, id: war && war.id };
});
if (dove.hasWar) {
  ok((await page.locator(`#outliner [data-peace="${dove.id}"]`).count()) === 1,
    'the fight-to-the-death war shows a dove in the outliner');
} else {
  ok((await page.locator('#outliner .ol-peace').count()) >= 1, 'war rows show doves');
}

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
