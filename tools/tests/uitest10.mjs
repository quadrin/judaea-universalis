// UI verification — formable nations + the accurate Israeli flag: the decision
// appears with a checklist, forming re-brands the topbar/map/panel live, and
// the ISR chip renders the real flag (white field, blue stripes, blue star).
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
const { chromium } = require('playwright');
const OUT = (process.env.JU_OUT || '/tmp') + '/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });

async function boot(page, cardText, nationIdx = 0) {
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
  await page.locator('.nation-card').nth(nationIdx).click();
  await page.waitForFunction(() => !!window._ctx);
  await page.waitForTimeout(500);
}

// ---- the Israeli flag chip ----------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  console.log('== the flag of Israel ==');
  await boot(page, 'Independence');
  const flagSvg = await page.evaluate(() => {
    const chip = document.querySelector('.tb-flag .fchip svg');
    return chip ? chip.innerHTML : '';
  });
  ok(/#0038b8/.test(flagSvg), 'the blue is the flag blue (#0038b8)');
  ok((flagSvg.match(/rect/g) || []).length >= 3, 'white field + two stripes rendered');
  ok((flagSvg.match(/<path/g) || []).length >= 2, 'the two triangles of the star');
  const shot = await page.locator('.tb-flag').screenshot({ path: OUT + 'v23-isr-flag.png' });
  ok(!!shot, 'flag chip captured');
  ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 2)));
  await page.close();
}

// ---- forming Hasmonean Judaea in the browser ----------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  console.log('== the brothers\' war ends in a restoration ==');
  await boot(page, 'Civil War'); // 67 BCE; first playable is HYR or ARI
  const who = await page.evaluate(() => window._ctx.game.playerTag);
  ok(who === 'HYR' || who === 'ARI', 'playing a brother: ' + who);

  await page.locator('.tb-flag').click();
  await page.waitForTimeout(400);
  let dec = await page.locator('[data-decision^="form_"]').count();
  ok(dec === 1, 'the restoration decision is offered');
  ok((await page.locator('[data-decision^="form_"]').getAttribute('class')).includes('disabled'), 'gated while unearned');

  // sweep the requirements by hand
  await page.evaluate(() => {
    const g = window._ctx.game;
    const me = g.playerTag;
    const rival = me === 'HYR' ? 'ARI' : 'HYR';
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable) continue;
      if (p.owner === rival) {
        if (p.name === 'Masada' || p.name === 'Machaerus') continue; // the rump on the rocks
        p.owner = me; p.controller = me;
      }
      if (p.owner === me) p.controller = me;
    }
    g.tags[me].legitimacy = 70;
  });
  // reopen the panel to re-render
  await page.locator('.tb-flag').click(); await page.waitForTimeout(200);
  await page.locator('.tb-flag').click(); await page.waitForTimeout(400);
  const formBtn = page.locator('[data-decision^="form_"]');
  ok(!(await formBtn.getAttribute('class')).includes('disabled'), 'the crown is within reach');
  await page.evaluate(() => { window._ctx.game.paused = false; });
  await formBtn.click();
  await page.evaluate(() => { window._ctx.game.paused = true; });
  await page.waitForTimeout(500);

  const after = await page.evaluate(() => ({
    player: window._ctx.game.playerTag,
    name: window._ctx.game.tags[window._ctx.game.playerTag].name,
    topbarTag: (document.querySelector('.tb-flag-tag') || {}).textContent,
    chronicle: window._ctx.game.chronicle.filter((e) => e.kind === 'era').slice(-1).map((e) => e.text),
  }));
  ok(after.player === 'HAS', 'the tag switched in play: ' + after.player);
  ok(after.name === 'Hasmonean Judaea', 'the realm is renamed: ' + after.name);
  ok(after.topbarTag === 'HAS', 'the topbar wears the new banner: ' + after.topbarTag);
  ok(/is no more/.test(String(after.chronicle)), 'chronicled: ' + after.chronicle);
  await page.screenshot({ path: OUT + 'v23-formed.png' });
  ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 2)));
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
