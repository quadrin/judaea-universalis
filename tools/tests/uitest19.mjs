// UI verification — campaign guidance on the standard and outliner, plus
// always-visible consequences on event choices.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
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
await page.locator('.bm-card.current').click();
await page.waitForSelector('.nation-card');

console.log('== the standard explains the campaign ==');
const card = page.locator('.nation-card').first();
ok((await card.locator('.nc-plan li').count()) === 3, 'three concrete first moves stand on the nation card');
const contract = (await card.locator('.nc-contract').textContent()) || '';
ok(/Win:/.test(contract) && /Lose:/.test(contract), 'the campaign contract names victory and defeat');
const pressure = (await card.locator('.nc-pressure').textContent()) || '';
ok(/First pressure:/.test(pressure) && /month/.test(pressure), 'the first historical pressure is dated');
await page.screenshot({ path: OUT + 'v34-campaign-standard.png' });

await card.click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(500);

console.log('== the contract stays pinned during play ==');
ok((await page.locator('#outliner .ol-campaign').count()) === 1, 'the outliner pins the campaign contract');
ok((await page.locator('#outliner .ol-clock:not(.ol-world-clock)').count()) === 1, 'the next local danger clock remains visible');
ok((await page.locator('#outliner .ol-world-clock').count()) === 1, 'the next independent world development has its own clock');
ok((await page.locator('#outliner .ol-goal').count()) >= 3, 'the win and loss conditions remain visible');

console.log('== event consequences are readable without hovering ==');
await page.evaluate(() => {
  const ctx = window._ctx;
  const ev = (ctx.events || []).find((row) => row && row.options
    && row.options.some((opt) => opt && opt.tooltip)
    && (row.forTag === 'both' || row.forTag === 'player' || row.forTag === ctx.game.playerTag));
  if (ev) ctx.helpers.fireEvent(ctx, ev.id);
});
await page.waitForSelector('#event-modal:not(.hidden)', { timeout: 5000 });
const effects = await page.locator('#event-modal .ev-effect').count();
ok(effects >= 1, 'choice effects are printed directly beneath their labels');
await page.screenshot({ path: OUT + 'v34-event-effects.png' });

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
