// UI verification — SPEC §286: a ready technology level rings.
//
// When a ladder's next level can be paid for, a red bell appears beside that
// pool's points in the topbar (G, I or M), and the Technology tab of the
// nation panel carries a red badge with the count — the same mark the
// Missions tab carries for a claim. Clicking a bell opens the panel on
// Technology.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
// The start screen waits on the province raster (SPEC §160); on SwiftShader
// that is minutes, not seconds. See uitest18.
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
for (let i = 0; i < 12; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Maccabean')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => window._ctx && window._ctx.game && window._ctx.game.tags[window._ctx.game.playerTag]);

// Empty pools: no bell rings.
const setPoints = (gov, infl, mar) => page.evaluate(([a, b, c]) => {
  const g = window._ctx.game;
  const t = g.tags[g.playerTag];
  t.points.gov = a; t.points.infl = b; t.points.mar = c;
  window._ctx.bus.emit('day', { date: { ...g.date } });
}, [gov, infl, mar]);
const bells = () => page.evaluate(() => ['gov', 'infl', 'mar'].map((k) => {
  const b = document.querySelector('.tb-bell[data-tech="' + k + '"]');
  return !!b && !b.classList.contains('hidden');
}));

console.log('== the bells ring for the ladders that are ready ==');
await setPoints(0, 0, 0);
await page.waitForTimeout(200);
ok(JSON.stringify(await bells()) === '[false,false,false]', 'empty pools: no bell');
await setPoints(999, 0, 999);
await page.waitForTimeout(200);
ok(JSON.stringify(await bells()) === '[true,false,true]', 'government and military ready: two bells, beside G and M');
const tt = await page.locator('.tb-bell[data-tech="gov"]').getAttribute('data-tt');
ok(/is ready/.test(tt || '') && /Technology/.test(tt || ''), 'the bell says what is ready: ' + (tt || '').split('\n')[0]);
await page.waitForTimeout(1000); // let the ring finish before the picture
await page.screenshot({ path: OUT + 'v286-tech-bells.png', clip: { x: 0, y: 0, width: 1440, height: 60 } });

console.log('== a bell opens Technology, and the tab carries the count ==');
await page.locator('.tb-bell[data-tech="gov"]').click();
await page.waitForSelector('#nation-panel:not(.hidden)');
ok((await page.locator('#nation-panel').getAttribute('data-tab')) === 'tech', 'the nation panel opens on Technology');
const badge = await page.locator('.np-tab[data-tab-go="tech"] .np-tab-badge').textContent().catch(() => '');
ok(badge === '2', 'the Technology tab carries a red badge: ' + badge);
await page.screenshot({ path: OUT + 'v286-tech-tab.png' });

console.log('== spend the points and the bell goes quiet ==');
await setPoints(0, 0, 0);
await page.waitForTimeout(200);
ok(JSON.stringify(await bells()) === '[false,false,false]', 'no points, no bell');

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
