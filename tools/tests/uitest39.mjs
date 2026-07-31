// UI verification — SPEC §184: a fork card wears its badge as it is dealt.
// Boots 66 CE as Judaea, deals a fork-entry card by id through the sim's own
// fireEvent, and reads the chip off the live modal; then deals a canonical
// non-fork card and checks it stays bare.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/pw') + '/');
const { chromium } = require('playwright');

const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 240000);
const OUT = (process.env.JU_OUT || '/tmp') + '/';

async function pickBookmark(page, nameFrag) {
  await page.waitForSelector('.bm-card', { timeout: BOOT_MS });
  for (let i = 0; i < 8; i++) {
    const cur = page.locator('.bm-card.current');
    const txt = (await cur.textContent()) || '';
    if (txt.includes(nameFrag)) { await cur.click(); return; }
    await page.locator('.ss-next').click();
    await page.waitForTimeout(450);
  }
  throw new Error('bookmark not found: ' + nameFrag);
}

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
await pickBookmark(page, 'Great Revolt');
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(400);

// Clear whatever the opening deals before dealing our own.
for (let i = 0; i < 8; i++) {
  const open = await page.locator('.ev-opt').count();
  if (!open) break;
  await page.locator('.ev-opt').first().click();
  await page.waitForTimeout(250);
}

console.log('== the fork card wears the badge ==');
await page.evaluate(() => window._ctx.helpers.fireEvent(window._ctx, 'ev_house_that_stood'));
await page.waitForSelector('.ev-card .ev-title', { timeout: 15000 });
{
  const title = (await page.locator('.ev-title').textContent()) || '';
  ok(/House That Stood/i.test(title), 'the fork card is on the table: ' + title.trim());
  const badges = await page.locator('.ev-fork').count();
  ok(badges === 1, 'it wears exactly one fork badge: ' + badges);
  const label = (await page.locator('.ev-fork').textContent()) || '';
  ok(/The road forks here/.test(label), 'the badge says so: ' + label.trim());
  const tt = (await page.locator('.ev-fork').getAttribute('data-tt')) || '';
  ok(/Second Kingdom/.test(tt), 'and its tooltip asks the fork\'s own question: ' + tt.slice(0, 60));
  await page.screenshot({ path: OUT + 'uitest39-fork-badge.png' });
  await page.locator('.ev-opt').first().click();
  await page.waitForTimeout(250);
}

console.log('== a canonical non-fork card stays bare ==');
await page.evaluate(() => window._ctx.helpers.fireEvent(window._ctx, 'ev_vespasian_arrives'));
await page.waitForSelector('.ev-card .ev-title', { timeout: 15000 });
{
  const title = (await page.locator('.ev-title').textContent()) || '';
  ok(title.trim().length > 0, 'the card is on the table: ' + title.trim());
  const badges = await page.locator('.ev-fork').count();
  ok(badges === 0, 'no fork badge on a card that opens no road: ' + badges);
  await page.locator('.ev-opt').first().click();
}

ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
