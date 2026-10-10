// UI verification — SPEC §297: split an army by unit type from the outliner.
//
//   - The selected army's row carries one small button at the end of its
//     unit line when the army has two arms or more; an army of one arm, and
//     a row not selected, carry none.
//   - Its tooltip names the arms; a click makes each arm its own army, and
//     the outliner lists them.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
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
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => window._ctx && window._ctx.game && window._ctx.game.tags[window._ctx.game.playerTag]);
// two of our armies, quiet: one of foot and horse, one of foot alone
const ids = await page.evaluate(() => {
  const g = window._ctx.game;
  g.paused = true;
  document.getElementById('toast-container').innerHTML = '';
  const mine = Object.values(g.armies).filter((a) => a && a.tag === g.playerTag && !a.inBattle && !a.retreating && !a.aboard);
  const [x, y] = mine;
  x.regiments = { inf: 3, cav: 4, art: 0 }; x.men = 7000; x.shatteredDays = 0;
  y.regiments = { inf: 2, cav: 0, art: 0 }; y.men = 2000; y.shatteredDays = 0;
  return { mixed: x.id, plain: y.id, name: x.name };
});
const refresh = () => page.evaluate(() => window._ctx.bus.emit('day', { date: { ...window._ctx.game.date } }));
await refresh();
await page.waitForTimeout(300);

console.log('== the button rides at the end of the selected row\'s unit line ==');
ok((await page.locator('#outliner [data-split-type]').count()) === 0, 'no row selected, no button');
await page.locator(`#outliner [data-army="${ids.mixed}"]`).click();
await page.waitForTimeout(400);
await refresh();
await page.waitForTimeout(300);
const btn = page.locator(`#outliner [data-army="${ids.mixed}"] .ol-comp [data-split-type="${ids.mixed}"]`);
ok((await btn.count()) === 1, 'the selected army of foot and horse has the button in its unit line');
ok((await page.locator('#outliner [data-split-type]').count()) === 1, 'and no other row has one');
const tt = (await btn.getAttribute('data-tt')) || '';
ok(/Split by unit type/.test(tt) && /3 ×/.test(tt) && /4 ×/.test(tt), 'its tooltip names the arms: ' + tt);
// the button sits after the last count, on the same line
const geo = await page.evaluate((id) => {
  const row = document.querySelector(`#outliner [data-army="${id}"]`);
  const arms = [...row.querySelectorAll('.ol-comp .ol-arm')].map((e) => e.getBoundingClientRect());
  const b = row.querySelector('[data-split-type]').getBoundingClientRect();
  return { lastRight: arms[arms.length - 1].right, bLeft: b.left, armTop: arms[0].top, armBottom: arms[0].bottom, bTop: b.top, bBottom: b.bottom };
}, ids.mixed);
ok(geo.bLeft >= geo.lastRight && Math.abs((geo.bTop + geo.bBottom) / 2 - (geo.armTop + geo.armBottom) / 2) < 6,
  'after the last count, on the same line: ' + JSON.stringify(geo));
await page.locator(`#outliner [data-army="${ids.mixed}"]`).screenshot({ path: OUT + 'v297-split-type-row.png' });

console.log('== a click: each arm its own army ==');
const before = await page.evaluate(() => Object.values(window._ctx.game.armies).filter((a) => a && a.tag === window._ctx.game.playerTag).length);
await btn.click();
await page.waitForTimeout(400);
const after = await page.evaluate((id) => {
  const g = window._ctx.game;
  const mine = Object.values(g.armies).filter((a) => a && a.tag === g.playerTag);
  return { n: mine.length, parent: g.armies[id].regiments, kids: mine.filter((a) => a.name.startsWith(g.armies[id].name + ' — ')).map((a) => ({ id: a.id, name: a.name, regs: a.regiments, men: a.men })) };
}, ids.mixed);
ok(after.n === before + 1 && after.parent.cav === 4 && after.parent.inf === 0, 'the horse keep the army: ' + JSON.stringify(after.parent));
ok(after.kids.length === 1 && after.kids[0].regs.inf === 3 && after.kids[0].men === 3000, 'the foot march on their own: ' + JSON.stringify(after.kids));
await refresh();
await page.waitForTimeout(300);
ok((await page.locator(`#outliner [data-army="${after.kids[0] && after.kids[0].id}"]`).count()) === 1, 'the outliner lists the new army');
ok((await page.locator(`#outliner [data-army="${ids.mixed}"] [data-split-type]`).count()) === 0, 'and the army, now one arm, has no button');
await page.screenshot({ path: OUT + 'v297-split-type-after.png', clip: { x: 1060, y: 60, width: 380, height: 600 } }).catch(() => {});

console.log('== one arm: no button ==');
await page.locator(`#outliner [data-army="${ids.plain}"]`).click();
await page.waitForTimeout(400);
await refresh();
await page.waitForTimeout(300);
ok((await page.locator(`#outliner [data-army="${ids.plain}"]`).getAttribute('class') || '').includes('sel')
  && (await page.locator('#outliner [data-split-type]').count()) === 0, 'an army of foot alone, selected, has none');

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));
await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
