// UI verification — the Chronicle screen: topbar lamp + C key open a modal
// listing recorded history newest-first; news-from-abroad toasts arrive for
// AI-only events; Escape closes.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
const { chromium } = require('playwright');
const OUT = (process.env.JU_OUT || '/tmp') + '/';

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
for (let i = 0; i < 8; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(450);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click(); // JUD
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(600);

console.log('== the lamp button opens the chronicle ==');
await page.locator('[data-ref="chron"]').click();
await page.waitForTimeout(200);
ok(await page.locator('#chronicle-modal .peace-title').isVisible(), 'chronicle modal visible');
const openTexts = await page.locator('#chronicle-modal .chron-text').allTextContents();
ok(openTexts.some((t) => t.includes('The chronicle opens')), 'era entry listed: ' + JSON.stringify(openTexts.slice(-1)));
ok(openTexts.some((t) => t.includes('begins')), 'the scripted war is in the book: ' + JSON.stringify(openTexts.filter((t) => t.includes('begins'))));
const years = await page.locator('#chronicle-modal .chron-year').allTextContents();
ok(years.length >= 1 && /66 CE/.test(years[0]), 'year heading: ' + JSON.stringify(years));
await page.screenshot({ path: OUT + 'v21-chronicle.png' });

console.log('== Escape closes; C reopens ==');
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
ok(await page.locator('#chronicle-modal').isHidden(), 'Escape closes the chronicle');
await page.keyboard.press('c');
await page.waitForTimeout(150);
ok(await page.locator('#chronicle-modal .peace-title').isVisible(), 'C key reopens it');
await page.keyboard.press('c');
await page.waitForTimeout(150);

console.log('== an AI-only war lands as news from abroad + a fresh page in the book ==');
const newsSetup = await page.evaluate(() => {
  const ctx = window._ctx;
  ctx.game.truces = {};
  const before = ctx.game.chronicle.length;
  // declared straight through the sim, exactly as the AI would
  return { before };
});
await page.evaluate(async () => {
  const mil = await import('./js/sim/military.js');
  mil.declareWar(window._ctx, 'PAR', 'ARM', 'The Eastern Quarrel');
});
await page.waitForTimeout(300);
const toastTitles = await page.locator('.toast .toast-title span').allTextContents();
ok(toastTitles.some((t) => t === 'News from abroad'), 'news toast shown: ' + JSON.stringify(toastTitles));
await page.keyboard.press('c');
await page.waitForTimeout(200);
const texts2 = await page.locator('#chronicle-modal .chron-text').allTextContents();
ok(texts2.some((t) => t.includes('The Eastern Quarrel')), 'new war on the freshly opened page');
ok(texts2[0].includes('The Eastern Quarrel'), 'newest first: ' + JSON.stringify(texts2[0]));
await page.screenshot({ path: OUT + 'v21-chronicle-news.png' });

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
