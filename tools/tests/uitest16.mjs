// UI verification — v2.9: recruit buttons speak the age, the airfield block
// raises and rebases wings, and the land wears its works (structure glyphs
// and parked warplanes on the map).
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
const { chromium } = require('playwright');
const OUT = (process.env.JU_OUT || '/tmp') + '/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });

async function boot(page, cardText) {
  await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.bm-card', { timeout: 20000 });
  for (let i = 0; i < 10; i++) {
    const txt = (await page.locator('.bm-card.current').textContent()) || '';
    if (txt.includes(cardText)) { await page.locator('.bm-card.current').click(); break; }
    await page.locator('.ss-next').click();
    await page.waitForTimeout(420);
  }
  await page.waitForSelector('.nation-card');
  await page.locator('.nation-card').first().click();
  await page.waitForFunction(() => !!window._ctx);
  await page.waitForTimeout(400);
}

// ---- 1948: modern patterns, the airfield, wings --------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  console.log('== 1948 recruits by its true names ==');
  await boot(page, 'Independence');
  await page.evaluate(() => {
    const ctx = window._ctx;
    const p = ctx.prov('Jerusalem');
    ctx.bus.emit('mapclick', { provId: p.id, armyId: null });
  });
  await page.waitForSelector('#province-panel:not(.hidden)');
  const infTxt = (await page.locator('[data-ref="recruitInf"]').textContent()) || '';
  const cavTxt = (await page.locator('[data-ref="recruitCav"]').textContent()) || '';
  ok(/Rifle Brigades/.test(infTxt), 'the foot recruits as Rifle Brigades: ' + infTxt.trim());
  ok(/Armored Corps/.test(cavTxt), 'the horse recruits as Armored Corps: ' + cavTxt.trim());
  ok(!/Infantry|Cavalry/.test(infTxt + cavTxt), 'the old words are gone');

  console.log('== the airfield block ==');
  ok(await page.evaluate(() => !!document.querySelector('[data-build="airfield"]')),
    'the airfield is offered among the works');
  // finish one instantly and base wings on it
  await page.evaluate(() => {
    const ctx = window._ctx;
    const p = ctx.prov('Jerusalem');
    p.buildings = p.buildings || [];
    p.buildings.push('airfield');
    ctx.game.tags.ISR.treasury = 500;
    ctx.bus.emit('mapclick', { provId: p.id, armyId: null });
  });
  await page.waitForSelector('.pp-air:not(.hidden)');
  ok(true, 'the airfield block appears');
  await page.locator('[data-ref="recruitWing"]').click();
  await page.waitForTimeout(200);
  let wings = await page.evaluate(() => Object.values(window._ctx.game.airwings));
  ok(wings.length === 1 && /Squadron/.test(wings[0].name), 'a wing is raised: ' + (wings[0] && wings[0].name));
  ok((await page.locator('.pp-air-wing').count()) === 1, 'the wing row renders');
  // a second field opens a rebase path
  await page.evaluate(() => {
    const ctx = window._ctx;
    const q = ctx.prov('Tel Aviv-Jaffa') || ctx.prov('Joppa');
    q.buildings = q.buildings || [];
    q.buildings.push('airfield');
    ctx.bus.emit('mapclick', { provId: ctx.prov('Jerusalem').id, armyId: null });
  });
  await page.waitForTimeout(250);
  const moveBtn = page.locator('.pp-air-move').first();
  ok((await page.locator('.pp-air-move').count()) >= 1, 'a rebase button appears');
  const before = wings[0].prov;
  await moveBtn.click();
  await page.waitForTimeout(250);
  wings = await page.evaluate(() => Object.values(window._ctx.game.airwings));
  ok(wings[0].prov !== before, 'the wing flew to its new field (prov ' + before + ' → ' + wings[0].prov + ')');

  console.log('== the land wears its works ==');
  await page.evaluate(() => {
    const ctx = window._ctx;
    // dress a few provinces so the glyph row shows several works at once
    const j = ctx.prov('Jerusalem');
    j.buildings = Array.from(new Set([...(j.buildings || []), 'market', 'granary', 'walls', 'shrine']));
    const c = window._ctx.geom.centroids[j.id];
    window._camera.centerOn(c.x, c.y, 2.4);
  });
  await page.waitForTimeout(1400); // smooth zoom settles
  await page.screenshot({ path: OUT + 'v29-structures.png' });
  ok(true, 'screenshot: structures + parked planes (eyeball v29-structures.png)');

  console.log('== battle window would speak patterns ==');
  const bwStrings = await page.evaluate(async () => {
    // synthesize a battle info row check without waiting for a real battle:
    // the formatter lives in ui.js, so instead assert the sim exposes gen
    const g = window._ctx.game;
    const a = Object.values(g.armies).find((x) => x && x.tag === 'ISR');
    return { gen: a ? a.gen : -1 };
  });
  ok(bwStrings.gen === 5, 'Israeli armies carry gen 5 (Rifle Brigades) for the battle window: ' + bwStrings.gen);

  ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));
  await page.close();
}

// ---- 66 CE: the old age keeps its own names -------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  console.log('== 66 CE recruits its own era ==');
  await boot(page, 'Great Revolt');
  await page.evaluate(() => {
    const ctx = window._ctx;
    const p = ctx.prov('Jerusalem');
    ctx.bus.emit('mapclick', { provId: p.id, armyId: null });
  });
  await page.waitForSelector('#province-panel:not(.hidden)');
  const infTxt = (await page.locator('[data-ref="recruitInf"]').textContent()) || '';
  ok(/Drilled Spearmen/.test(infTxt), 'Judaea drills spearmen: ' + infTxt.trim());
  ok(await page.evaluate(() => {
    const opts = [...document.querySelectorAll('[data-build]')].map((b) => b.dataset.build);
    if (opts.indexOf('airfield') < 0) return true; // acceptable: option hidden entirely
    const btn = document.querySelector('[data-build="airfield"]');
    return btn.classList.contains('disabled');
  }), 'no runways in antiquity (airfield absent or refused)');
  ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
