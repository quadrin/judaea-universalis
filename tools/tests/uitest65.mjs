// UI verification — SPEC §301: one call to arms, in the panels.
//
//   - An ally at +30 (which §260 called "defensive only") reads "Allied" in
//     the province panel, and its tooltip says it would march in a war we
//     start and against an attack on us, with the one rule.
//   - An ally at +10 reads "Allied — will not march", with the reason.
//   - No panel on the screen says "defensive only".
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 480000);

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
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => window._ctx && window._ctx.game && window._ctx.game.tags[window._ctx.game.playerTag]);

// Nabataea becomes our ally, ready to march, at the regard each check sets.
const nabProv = await page.evaluate(() => {
  const g = window._ctx.game;
  g.paused = true;
  g.wars = [];
  for (const k of Object.keys(g.tags)) if (g.tags[k]) g.tags[k].atWarWith = [];
  const me = g.tags[g.playerTag];
  const nab = g.tags.NAB;
  me.allies = [...new Set([...(me.allies || []), 'NAB'])];
  nab.allies = [...new Set([...(nab.allies || []), g.playerTag])];
  nab.warExhaustion = 0; nab.treasury = 200; nab.manpower = 20000; nab.maxManpower = 20000;
  nab.opinion = nab.opinion || {};
  nab.opinion[g.playerTag] = 30;
  const p = g.provinces.find((x) => x && !x.impassable && x.owner === 'NAB');
  return p.id;
});
const openProv = async () => {
  await page.evaluate((id) => window._ctx.bus.emit('mapclick', { provId: id, armyId: null }), nabProv);
  await page.waitForSelector('#province-panel:not(.hidden)');
  await page.waitForTimeout(300);
};
const status = page.locator('#province-panel [data-ref="dipStatus"]');

console.log('== an ally at +30 marches ==');
await openProv();
let txt = (await status.textContent()) || '';
let tt = (await status.getAttribute('data-tt')) || '';
ok(txt.trim() === 'Allied', 'the status: ' + txt);
ok(/in a war we start, and against an attack on us/.test(tt) && /every call to arms, ours or in our defense, at 25 regard/.test(tt),
  'the tooltip: ' + tt.replace(/\n/g, ' / '));

console.log('== an ally at +10 will not march ==');
await page.evaluate(() => {
  const g = window._ctx.game;
  g.tags.NAB.opinion[g.playerTag] = 10;
  window._ctx.bus.emit('day', { date: { ...g.date } });
});
await openProv();
txt = (await status.textContent()) || '';
tt = (await status.getAttribute('data-tt')) || '';
ok(txt.trim() === 'Allied — will not march' && (await status.getAttribute('class')).includes('neg'), 'the status: ' + txt);
ok(/would not answer a call to arms — thinks too little of us/.test(tt), 'and why: ' + tt.split('\n')[0]);

console.log('== nothing says "defensive only" ==');
const body = await page.evaluate(() => document.body.innerText);
ok(!/defensive only/i.test(body), 'no panel on screen says "defensive only"');

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));
await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
