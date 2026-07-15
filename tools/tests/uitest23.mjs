// Browser regression — paused clicks are held until resume, and every land,
// naval, and air recruit is visible in one sequential province queue.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const browser = await chromium.launch({
  executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.bm-card');
await page.locator('.ss-dot[data-dot="7"]').click();
await page.locator('.bm-card.current').click();
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);

const initial = await page.evaluate(() => {
  const ctx = window._ctx;
  const g = ctx.game;
  const t = g.tags.ISR;
  t.treasury = 1000;
  t.points.gov = 500;
  t.manpower = Math.max(t.manpower, 10000);
  const p = g.provinces.find((row) => row && row.owner === 'ISR' && row.controller === 'ISR'
    && ctx.geom.coastal[row.id]);
  p.buildings = Array.from(new Set([...(p.buildings || []), 'shipyard', 'airfield']));
  ctx.bus.emit('mapclick', { provId: p.id, armyId: null });
  const regs = Object.values(g.armies).filter((a) => a && a.tag === 'ISR')
    .reduce((n, a) => n + (a.regiments.inf || 0) + (a.regiments.cav || 0), 0);
  const ships = Object.values(g.fleets).filter((f) => f && f.tag === 'ISR').reduce((n, f) => n + f.ships, 0);
  const wings = Object.values(g.airwings).filter((w) => w && w.tag === 'ISR').length;
  return { provId: p.id, tax: p.dev.tax, treasury: t.treasury, manpower: t.manpower, regs, ships, wings, paused: g.paused };
});
await page.waitForSelector('#province-panel:not(.hidden)');
ok(initial.paused, 'the campaign opens paused');

console.log('== paused clicks become held orders ==');
await page.locator('[data-dev="tax"]').click();
await page.locator('[data-ref="recruitInf"]').click();
await page.locator('[data-ref="buildShip"]').click();
await page.locator('[data-ref="recruitWing"]').click();
await page.waitForTimeout(150);
const held = await page.evaluate((s) => {
  const g = window._ctx.game;
  const p = g.provinces[s.provId];
  const t = g.tags.ISR;
  return {
    pending: g.pendingCommands.map((cmd) => cmd.name), unitQueue: p.unitQueue.length,
    tax: p.dev.tax, treasury: t.treasury, manpower: t.manpower,
    regs: Object.values(g.armies).filter((a) => a && a.tag === 'ISR')
      .reduce((n, a) => n + (a.regiments.inf || 0) + (a.regiments.cav || 0), 0),
    ships: Object.values(g.fleets).filter((f) => f && f.tag === 'ISR').reduce((n, f) => n + f.ships, 0),
    wings: Object.values(g.airwings).filter((w) => w && w.tag === 'ISR').length,
  };
}, initial);
ok(held.pending.join(',') === 'devProvince,recruit,buildShip,recruitAirWing', 'four commands keep their click order: ' + held.pending.join(','));
ok(held.unitQueue === 0 && held.tax === initial.tax && held.treasury === initial.treasury && held.manpower === initial.manpower,
  'held commands change and spend nothing');
ok(held.regs === initial.regs && held.ships === initial.ships && held.wings === initial.wings,
  'no paused recruitment creates a counter');
ok((await page.locator('.pp-recruit-order').count()) === 3, 'three held unit orders are visible in the province panel');
const heldText = (await page.locator('.pp-recruit-queue').textContent()) || '';
ok((heldText.match(/held until resume/g) || []).length === 3, 'each held unit says it waits for resume');
const pauseTip = await page.locator('[data-ref="pause"]').getAttribute('data-tt');
ok(/4 queued orders/.test(pauseTip || ''), 'the pause control reports all queued actions');

console.log('== resume commits work without instant units ==');
await page.keyboard.press('Space');
await page.waitForFunction(() => !window._ctx.game.paused && window._ctx.game.pendingCommands.length === 0);
await page.keyboard.press('Space');
await page.waitForFunction(() => window._ctx.game.paused);
const begun = await page.evaluate((s) => {
  const g = window._ctx.game;
  const p = g.provinces[s.provId];
  const t = g.tags.ISR;
  return {
    types: p.unitQueue.map((row) => row.type), months: p.unitQueue.map((row) => row.monthsLeft),
    tax: p.dev.tax, treasury: t.treasury, manpower: t.manpower,
    regs: Object.values(g.armies).filter((a) => a && a.tag === 'ISR')
      .reduce((n, a) => n + (a.regiments.inf || 0) + (a.regiments.cav || 0), 0),
    ships: Object.values(g.fleets).filter((f) => f && f.tag === 'ISR').reduce((n, f) => n + f.ships, 0),
    wings: Object.values(g.airwings).filter((w) => w && w.tag === 'ISR').length,
  };
}, initial);
ok(begun.types.join(',') === 'inf,ship,wing' && begun.months.join(',') === '2,6,4',
  'resume starts one 2m/6m/4m FIFO production line');
ok(begun.tax === initial.tax + 1 && begun.treasury === initial.treasury - 80 && begun.manpower === initial.manpower - 1000,
  'resources and development change only after resume');
ok(begun.regs === initial.regs && begun.ships === initial.ships && begun.wings === initial.wings,
  'committed orders still add no instant units');
await page.waitForTimeout(500);
const stillPaused = await page.evaluate((id) => window._ctx.game.provinces[id].unitQueue.map((row) => row.monthsLeft), initial.provId);
ok(stillPaused.join(',') === '2,6,4', 'the recruitment clocks do not move while paused');

console.log('== units finish on separate dates ==');
const advance = async (months) => page.evaluate(async ({ id, months: count }) => {
  const { monthlyRecruitment } = await import('/js/sim/recruitment.js');
  for (let i = 0; i < count; i++) monthlyRecruitment(window._ctx);
  window._ctx.bus.emit('day', { date: { ...window._ctx.game.date } });
  return window._ctx.game.provinces[id].unitQueue.map((row) => row.type);
}, { id: initial.provId, months });
await advance(1);
ok(await page.evaluate((n) => Object.values(window._ctx.game.armies).filter((a) => a && a.tag === 'ISR')
  .reduce((x, a) => x + (a.regiments.inf || 0) + (a.regiments.cav || 0), 0) === n, initial.regs),
  'the regiment is absent after one month');
let remaining = await advance(1);
ok(remaining.join(',') === 'ship,wing', 'the regiment finishes alone after month two');
remaining = await advance(6);
ok(remaining.join(',') === 'wing', 'the warship launches six months later');
remaining = await advance(4);
ok(!remaining.length, 'the air wing completes last, four months later');
const final = await page.evaluate(() => ({
  fleets: Object.values(window._ctx.game.fleets).filter((f) => f && f.tag === 'ISR').length,
  wings: Object.values(window._ctx.game.airwings).filter((w) => w && w.tag === 'ISR').length,
}));
ok(final.fleets >= 1 && final.wings >= 1, 'completed ship and air counters enter the map and outliner');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
