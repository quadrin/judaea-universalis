// UI verification — SPEC §291: the settings card on a short window, the gear,
// and the mission bell.
//
//   - In a short laptop window (940×500) the settings card hangs below the
//     topbar, ends inside the window, shows its Defaults and Close buttons,
//     and lays its four sections out in two columns.
//   - The settings button is a gear.
//   - When a mission is ready to claim, a red bell appears beside the court's
//     flag, rings, names the mission, and opens the realm panel on Missions;
//     a second ready mission rings it again; claimed or lost, it goes.
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
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => window._ctx && window._ctx.game && window._ctx.game.tags[window._ctx.game.playerTag]);
await page.evaluate(() => { window._ctx.game.paused = true; });

console.log('== the settings button is a gear ==');
const gear = await page.evaluate(() => {
  const b = document.querySelector('#topbar [data-ref="settings"] svg');
  return b ? { circle: !!b.querySelector('circle'), teeth: (b.querySelector('path') || {}).getAttribute('d').split('L').length } : null;
});
ok(gear && gear.circle && gear.teeth >= 30, 'a hub and a toothed rim: ' + JSON.stringify(gear));

console.log('== a short window: the card fits under the topbar ==');
await page.setViewportSize({ width: 940, height: 500 });
await page.waitForTimeout(400);
await page.keyboard.press('o');
await page.waitForTimeout(500);
const box = await page.evaluate(() => {
  const card = document.querySelector('#settings-modal .st-card').getBoundingClientRect();
  const bar = document.getElementById('topbar').getBoundingClientRect();
  const foot = document.querySelector('#settings-modal .st-foot').getBoundingClientRect();
  const secs = [...document.querySelectorAll('#settings-modal .st-sec')].map((s) => Math.round(s.getBoundingClientRect().left));
  return { top: card.top, bottom: card.bottom, barBottom: bar.bottom, footBottom: foot.bottom, vh: window.innerHeight, cols: new Set(secs).size };
});
ok(box.top >= box.barBottom, `the card starts below the topbar (${Math.round(box.top)} ≥ ${Math.round(box.barBottom)})`);
ok(box.bottom <= box.vh, `and ends inside the window (${Math.round(box.bottom)} ≤ ${box.vh})`);
ok(box.footBottom <= box.bottom && box.footBottom <= box.vh, 'Defaults and Close are on screen');
ok(box.cols === 2, 'the sections stand in two columns: ' + box.cols);
await page.screenshot({ path: OUT + 'v291-settings-short.png' });
await page.keyboard.press('Escape');
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(400);

console.log('== the mission bell ==');
const ms = await page.evaluate(() => (window._actions.getMissions() || []).slice(0, 2).map((m) => ({ id: m.id, name: m.name })));
ok(ms.length === 2, 'the chapter has missions: ' + ms.map((m) => m.name).join(', '));
const setReady = (ids) => page.evaluate((list) => {
  const g = window._ctx.game;
  g.tags[g.playerTag].missionReady = list;
  window._ctx.bus.emit('day', { date: { ...g.date } });
}, ids);
const bell = () => page.evaluate(() => {
  const b = document.querySelector('#topbar [data-ref="missionBell"]');
  return { shown: !!b && !b.classList.contains('hidden'), ring: !!b && b.classList.contains('ring'), tt: b ? b.dataset.tt || '' : '' };
});
await setReady([]);
await page.waitForTimeout(150);
ok(!(await bell()).shown, 'no mission ready: no bell');
await setReady([ms[0].id]);
await page.waitForTimeout(80);
let b = await bell();
ok(b.shown && b.ring, 'a mission ready: the bell shows and rings');
ok(b.tt.includes(ms[0].name), 'it names the mission: ' + b.tt.split('\n')[0]);
const pos = await page.evaluate(() => {
  const f = document.querySelector('#topbar .tb-flag').getBoundingClientRect();
  const m = document.querySelector('#topbar [data-ref="missionBell"]').getBoundingClientRect();
  return { gap: m.left - f.right, top: m.top };
});
ok(pos.gap >= -2 && pos.gap <= 16 && pos.top < 46, 'it sits right beside the flag: ' + JSON.stringify(pos));
await page.waitForTimeout(1100);
await page.screenshot({ path: OUT + 'v291-mission-bell.png', clip: { x: 0, y: 0, width: 520, height: 60 } });
ok(!(await bell()).ring, 'it rings once, then rests');
await setReady([ms[0].id, ms[1].id]);
await page.waitForTimeout(80);
b = await bell();
ok(b.ring && b.tt.startsWith('2 missions'), 'a second mission rings it again: ' + b.tt.split('\n')[0]);
await page.locator('#topbar [data-ref="missionBell"]').click();
await page.waitForSelector('#nation-panel:not(.hidden)');
ok((await page.locator('#nation-panel').getAttribute('data-tab')) === 'missions', 'a click opens the realm panel on Missions');
await page.keyboard.press('Escape');
await setReady([]);
await page.waitForTimeout(150);
ok(!(await bell()).shown, 'claimed: the bell goes');

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
