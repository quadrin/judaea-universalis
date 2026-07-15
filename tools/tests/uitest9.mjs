// UI verification — the three new eras (115 CE, 614 CE, 1948 CE): each boots
// from the carousel without page errors, with the right political map, era
// tech, and unit patterns.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
const { chromium } = require('playwright');
const OUT = (process.env.JU_OUT || '/tmp') + '/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });

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
  await page.waitForTimeout(500);
}

// ---- 115 CE -----------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  console.log('== The Kitos War, 115 CE ==');
  await boot(page, 'Kitos');
  const s = await page.evaluate(() => {
    const ctx = window._ctx;
    return {
      player: ctx.game.playerTag,
      salamis: ctx.prov('Salamis').owner,
      jerusalem: ctx.prov('Jerusalem').owner,
      petra: ctx.prov('Petra').owner,
      wars: ctx.game.wars.map((w) => w.name),
      tech: ctx.game.tags.ROM.tech,
    };
  });
  ok(s.salamis === 'JUD', 'Artemion holds Salamis: ' + s.salamis);
  ok(s.jerusalem === 'ROM' && s.petra === 'ROM', 'Judaea and Arabia are Roman provinces');
  ok(s.wars.length === 2, 'two wars at once: ' + s.wars.join(' | '));
  ok(s.tech.mar === 7, 'Trajan\'s army at mar 7: ' + JSON.stringify(s.tech));
  ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 2)));
  await page.close();
}

// ---- 614 CE -----------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  console.log('== The Persian Gambit, 614 CE ==');
  await boot(page, 'Persian Gambit');
  const s = await page.evaluate(() => {
    const ctx = window._ctx;
    return {
      antioch: ctx.prov('Antioch').owner,
      jerusalem: ctx.prov('Jerusalem').owner,
      jerusalemFaith: ctx.prov('Jerusalem').religion,
      tiberias: ctx.prov('Tiberias').owner,
      bostra: ctx.prov('Bostra').owner,
      gen: (Object.values(ctx.game.armies).find((a) => a && a.tag === 'SAS') || {}).gen,
      tags: Object.keys(ctx.game.tags),
    };
  });
  ok(s.antioch === 'SAS', 'Persia holds Antioch: ' + s.antioch);
  ok(s.jerusalem === 'BYZ' && s.jerusalemFaith === 'christianity', 'Byzantine, Christian Jerusalem at start');
  ok(s.tiberias === 'JUD', 'Benjamin holds Tiberias');
  ok(s.bostra === 'GHA', 'the phylarchs hold Bostra');
  ok(s.gen === 3, 'armies muster as Thematic Regulars (gen 3): ' + s.gen);
  // run five game months: Jerusalem should fall by event
  await page.evaluate(() => { window._ctx.game.paused = false; window._actions.setSpeed(5); });
  await page.waitForTimeout(400);
  for (let i = 0; i < 40; i++) {
    const done = await page.evaluate(() => {
      // click through any event card as the host
      const btn = document.querySelector('.ev-card .ev-opt:not([disabled])');
      if (btn) btn.click();
      const d = window._ctx.game.date;
      return d.y > 614 || d.m >= 10;
    });
    if (done) break;
    await page.waitForTimeout(300);
  }
  const after = await page.evaluate(() => ({
    jerusalem: window._ctx.prov('Jerusalem').owner,
    chronicle: window._ctx.game.chronicle.slice(-4).map((e) => e.text),
  }));
  ok(after.jerusalem === 'JUD', 'the Holy City falls to the Return by event: ' + after.jerusalem);
  await page.screenshot({ path: OUT + 'v22-614.png' });
  ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 2)));
  await page.close();
}

// ---- 1948 CE ----------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  console.log('== The War of Independence, 1948 ==');
  await boot(page, 'Independence');
  const s = await page.evaluate(() => {
    const ctx = window._ctx;
    const isrArmy = Object.values(ctx.game.armies).find((a) => a && a.tag === 'ISR');
    return {
      player: ctx.game.playerTag,
      joppa: ctx.prov('Joppa').owner,
      gaza: ctx.prov('Gaza').owner,
      amman: ctx.prov('Philadelphia').owner,
      damascus: ctx.prov('Damascus').owner,
      war: ctx.game.wars[0] && {
        name: ctx.game.wars[0].name,
        att: ctx.game.wars[0].attackers,
        def: ctx.game.wars[0].defenders,
      },
      gen: isrArmy && isrArmy.gen,
      genName: isrArmy && isrArmy.name,
      date: ctx.game.date,
    };
  });
  ok(s.joppa === 'ISR', 'Tel Aviv–Jaffa is Israeli: ' + s.joppa);
  ok(s.gaza === 'EGY' && s.amman === 'JOR' && s.damascus === 'SYR', 'the invaders at their start lines');
  ok(s.war && s.war.att.length >= 5, 'the coalition war: ' + (s.war && s.war.att.join('+')) + ' vs ' + (s.war && s.war.def.join('+')));
  ok(s.gen === 5, 'brigades muster as Rifle Brigades (gen 5): ' + s.genName + ' gen ' + s.gen);
  ok(s.date.y === 1948, 'the clock reads 1948: ' + JSON.stringify(s.date));
  await page.screenshot({ path: OUT + 'v22-1948.png' });
  ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 2)));
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
