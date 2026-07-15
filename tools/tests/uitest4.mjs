// UI verification — graphics batch: shader boot, marching interpolation,
// banner chips, battle window (outliner row + live refresh + close).
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
const { chromium } = require('playwright');
async function pickBookmark(page, nameFrag) {
  await page.waitForSelector('.bm-card', { timeout: 20000 });
  for (let i = 0; i < 8; i++) {
    const cur = page.locator('.bm-card.current');
    const txt = (await cur.textContent()) || '';
    if (txt.includes(nameFrag)) { await cur.click(); return; }
    await page.locator('.ss-next').click();
    await page.waitForTimeout(450); // slide transition
  }
  throw new Error('bookmark not found: ' + nameFrag);
}
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
await pickBookmark(page, 'Great Revolt');
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click(); // JUD
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(800);

console.log('== renderer boots with the new shader ==');
ok(errors.length === 0, 'no console/page errors on boot: ' + JSON.stringify(errors.slice(0, 3)));
const hasErrDiv = await page.evaluate(() => !!document.querySelector('#map-container div')
  && [...document.querySelectorAll('div')].some((d) => (d.textContent || '').startsWith('[renderer]')));
ok(!hasErrDiv, 'no renderer error banner');

// zoomed-in screenshot: terrain grain + melted borders + banner chips
await page.screenshot({ path: OUT + 'v17-map.png' });

// Deterministic clock control: opening events pause the game and swallow the
// Space key while their modal is up, so drive game.paused directly and drain
// any event modal between runs.
async function drainEvents() {
  for (let i = 0; i < 8; i++) {
    const open = await page.locator('#event-modal:not(.hidden) .ev-opt').count();
    if (!open) break;
    await page.locator('#event-modal .ev-opt').first().click();
    await page.waitForTimeout(120);
  }
}
async function runFor(ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    await drainEvents();
    await page.evaluate(() => { window._ctx.game.speed = 5; window._ctx.game.paused = false; });
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => { window._ctx.game.paused = true; });
  await drainEvents();
}

console.log('== marching: hopTotal + interpolated chip ==');
const march = await page.evaluate(async () => {
  const mil = await import('/js/sim/military.js');
  const ctx = window._ctx;
  const g = ctx.game;
  const a = Object.values(g.armies).find((x) => x && x.tag === 'JUD');
  // march to a friendly neighbor via real adjacency
  let dest = 0;
  for (const nb of ctx.geom.neighbors[a.prov] || []) {
    const p = g.provinces[nb];
    if (p && !p.impassable && p.owner === 'JUD') { dest = nb; break; }
  }
  if (!dest) return { fail: 'no friendly neighbor' };
  mil.issueMove(ctx, a, dest);
  return { id: a.id, dest, pathLen: a.path.length };
});
ok(!march.fail && march.pathLen >= 1, 'move order issued: ' + JSON.stringify(march));
await page.keyboard.press('3');
await runFor(900); // a few days at speed 3
const mid = await page.evaluate((id) => {
  const a = window._ctx.game.armies[id];
  return a ? { hopTotal: a.hopTotal, left: a.moveDaysLeft, path: a.path.length } : null;
}, march.id);
ok(mid && mid.hopTotal > 0, 'hopTotal live in browser: ' + JSON.stringify(mid));

console.log('== battle window ==');
const bset = await page.evaluate(async () => {
  const mil = await import('/js/sim/military.js');
  const ctx = window._ctx;
  const g = ctx.game;
  const jud = Object.values(g.armies).find((x) => x && x.tag === 'JUD' && !x.inBattle);
  const rom = Object.values(g.armies).find((x) => x && x.tag === 'ROM' && !x.inBattle);
  if (!jud || !rom) return { fail: 'armies missing' };
  jud.path = []; jud.moveDaysLeft = 0;
  rom.prov = jud.prov; rom.path = []; rom.moveDaysLeft = 0;
  mil.engageIfNeeded(ctx, rom);
  return { prov: jud.prov, battles: g.battles.length, provName: g.provinces[jud.prov].name };
});
ok(!bset.fail && bset.battles > 0, 'battle manufactured at ' + bset.provName);

// Refresh the chrome while the manufactured battle is guaranteed to be live.
// Advancing at speed 5 here can legitimately resolve a lopsided battle before
// Playwright observes its row, which makes this UI assertion timing-dependent.
await page.evaluate(() => window._ctx.bus.emit('day'));
await page.waitForTimeout(100);
const battleRow = page.locator('.ol-row.ol-battle').first();
ok(await battleRow.count() === 1, 'outliner shows the battle row');
await battleRow.click();
await page.waitForSelector('#battle-modal:not(.hidden)', { timeout: 5000 });
const title = await page.locator('#battle-modal .peace-title').textContent();
ok(title.includes('Battle of ' + bset.provName), 'battle window title: ' + title.trim());
ok(await page.locator('#battle-modal .bw-side').count() === 2, 'two side blocks');
ok(await page.locator('#battle-modal .bw-side.bw-mine').count() === 1, 'our side is marked');
ok(await page.locator('#battle-modal .bw-die').count() === 2, 'two battle dice shown');
ok(await page.locator('#battle-modal .bw-army').count() >= 2, 'army rows on both sides');
const day1 = await page.evaluate(() => {
  const m = document.querySelector('#battle-modal .bw-meta');
  return m ? m.textContent : '';
});
ok(/Day \d+/.test(day1), 'meta shows the battle day: ' + day1.trim().slice(0, 60));

// live refresh: run a few days with the window open — it should stay open & advance
const dayBefore = await page.evaluate(() => window._ctx.game.battles[0] && window._ctx.game.battles[0].day);
await page.evaluate(() => { window._ctx.game.speed = 5; window._ctx.game.paused = false; });
await page.waitForTimeout(900);
await page.evaluate(() => { window._ctx.game.paused = true; });
const still = await page.evaluate(() => ({
  open: !document.getElementById('battle-modal').classList.contains('hidden'),
  battles: window._ctx.game.battles.length,
  day: window._ctx.game.battles[0] ? window._ctx.game.battles[0].day : -1,
}));
if (still.battles > 0) {
  ok(still.open, 'window stayed open across days');
  ok(still.day > dayBefore, `battle day advanced ${dayBefore} -> ${still.day}`);
  await page.screenshot({ path: OUT + 'v17-battle.png' });
  await page.locator('#battle-modal .peace-cancel').click();
  ok(await page.evaluate(() => document.getElementById('battle-modal').classList.contains('hidden')), 'Close closes it');
} else {
  ok(!still.open, 'battle resolved -> window closed itself');
  await page.screenshot({ path: OUT + 'v17-battle.png' });
}

console.log('== zoomed-in terrain/banner shot ==');
await page.evaluate(() => {
  const jer = window._ctx.prov('Jerusalem');
  // camera isn't exposed; zoom by wheel over Jerusalem's screen position instead
  return jer && true;
});
await page.mouse.move(720, 450);
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -240); await page.waitForTimeout(120); }
await page.waitForTimeout(500);
await page.screenshot({ path: OUT + 'v17-map-close.png' });

ok(errors.length === 0, 'no page errors at the end: ' + JSON.stringify(errors.slice(0, 3)));
await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
