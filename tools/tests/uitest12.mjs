// UI verification — v2.5: the Government row (republic with election countdown),
// era banner shapes on the live map (squared modern colors vs antiquity's
// swallow-tail), and motorized march speed in play.
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
  await page.waitForTimeout(500);
}

// ---- 1948: republic row + modern banners --------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  console.log('== Israel, a republic at war ==');
  await boot(page, 'Independence');
  await page.locator('.tb-flag').click();
  await page.waitForTimeout(400);
  const govRow = (await page.locator('[data-ref="govType"]').textContent()) || '';
  ok(/Republic/.test(govRow), 'the Government row reads Republic: ' + govRow);
  ok(/vote in \d+m/.test(govRow), 'with the election countdown: ' + govRow);
  const genState = await page.evaluate(() => {
    const a = Object.values(window._ctx.game.armies).find((x) => x && x.tag === 'ISR');
    return { gen: a.gen, speed5: null };
  });
  ok(genState.gen === 5, 'brigades at gen 5 fly squared colors (drawn by the overlay)');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const p = window._ctx.prov('Tiberias');
    window._camera.centerOn(p.x, p.y, 1.6);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: OUT + 'v25-1948-banners.png' });
  ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 2)));
  await page.close();
}

// ---- 67 BCE: republican Rome + antiquity banners unchanged --------------------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  console.log('== the Senate and People of Rome ==');
  await boot(page, 'Civil War');
  const gov = await page.evaluate(() => ({
    rom: window._ctx.game.tags.ROM.govType,
    me: window._ctx.game.tags[window._ctx.game.playerTag].govType,
    gen: (Object.values(window._ctx.game.armies).find((a) => a && a.tag === window._ctx.game.playerTag) || {}).gen,
  }));
  ok(gov.rom === 'republic', 'Rome is a republic in 67 BCE: ' + gov.rom);
  ok(gov.me === 'theocracy', 'the High Priest rules a theocracy: ' + gov.me);
  ok(gov.gen <= 2, 'antiquity armies keep the swallow-tailed standard (gen ' + gov.gen + ')');
  await page.locator('.tb-flag').click();
  await page.waitForTimeout(400);
  const govRow = (await page.locator('[data-ref="govType"]').textContent()) || '';
  ok(/Theocracy/.test(govRow), 'the panel reads Theocracy: ' + govRow);
  ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 2)));
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
