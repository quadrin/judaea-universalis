// UI verification — supply lines & sandbox chapters (SPEC §82, §83):
// the game boots with the new sim↔overlay import intact, a cut-off army wears
// its ✂ badge in the outliner and serves a broken trace with a named break,
// the selected army's supply route draws without errors, and a won campaign
// opens "The Chapters" in the realm panel and beside the campaign clocks.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/612d4587-70bb-5165-8c89-1b2c2471e416/scratchpad') + '/');
const { chromium } = require('playwright');
const OUT = (process.env.JU_OUT || '/tmp') + '/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

async function pickBookmark(page, nameFrag) {
  await page.waitForSelector('.bm-card', { timeout: 20000 });
  for (let i = 0; i < 8; i++) {
    const cur = page.locator('.bm-card.current');
    const txt = (await cur.textContent()) || '';
    if (txt.includes(nameFrag)) { await cur.click(); return; }
    await page.locator('.ss-next').click();
    await page.waitForTimeout(450);
  }
  throw new Error('bookmark not found: ' + nameFrag);
}
// The scripted era fires real cards while we drive the clock; read and clear
// them so they never intercept a panel click.
async function dismissEvents(page) {
  for (let i = 0; i < 20; i++) {
    const open = await page.locator('#event-modal .ev-opt').first().isVisible().catch(() => false);
    if (!open) break;
    await page.locator('#event-modal .ev-opt').first().click().catch(() => {});
    await page.waitForTimeout(250);
  }
}

const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await pickBookmark(page, 'Great Revolt'); // 66 CE
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click(); // JUD
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(600);
ok(errors.length === 0, 'game boots with no console errors (supply import graph intact)'
  + (errors.length ? ' — ' + errors[0] : ''));

// ---- supply: a cut-off army wears the badge and serves its broken trace ----
const supply = await page.evaluate(async () => {
  const ctx = window._ctx;
  const { tickDay } = await import('./js/sim/tick.js');
  // a Judaean host deep in Roman Syria: no chain, no port, no line
  const id = ctx.helpers.spawnArmy(ctx, 'JUD', 'Damascus', { inf: 2, name: 'The Lost Host' });
  ctx.game.paused = true;
  for (let i = 0; i < 31; i++) tickDay(ctx); // one monthly block marks it
  const st = window._actions.getSupplyStatus(id);
  const a = ctx.game.armies[id];
  return {
    id, oos: a ? a.oosMonths : -1,
    ok: st && st.ok, reason: st && st.reason, breakAt: st && st.breakAt,
    breakName: st && st.breakAt ? (ctx.byId(st.breakAt) || {}).name : '',
    penalty: (st && st.penaltyText) || '',
  };
});
await dismissEvents(page);
ok(supply.oos >= 1, 'a month in enemy country marks the host out of supply');
ok(supply.ok === false && supply.reason === 'corridor' && supply.breakAt > 0,
  'getSupplyStatus names the corridor break (' + supply.breakName + ')');
ok(/No reinforcements/.test(supply.penalty), 'the penalty text is served for the UI');

const badge = await page.evaluate((id) => {
  const row = document.querySelector('.ol-row[data-army="' + id + '"]');
  return {
    hasRow: !!row, oosClass: !!(row && row.classList.contains('ol-oos')),
    hasBadge: !!(row && row.querySelector('.ol-oos-badge')),
    tt: (row && row.getAttribute('data-tt')) || '',
  };
}, supply.id);
ok(badge.hasRow && badge.oosClass && badge.hasBadge, 'the outliner badges the cut-off army ✂');
ok(/OUT OF SUPPLY/.test(badge.tt), 'the outliner tooltip names the state and its cost');

// selecting the army draws its route (assert: no errors, and the trace cache runs)
const preErr = errors.length;
await page.evaluate((id) => {
  const g = window._ctx.game;
  g.ui.selectedArmy = id;
  g.ui.selectedArmies = [id];
}, supply.id);
await page.waitForTimeout(700); // several overlay frames
ok(errors.length === preErr, 'the supply route draws on the map without errors');
await page.screenshot({ path: OUT + 'supply-route.png' });

// ---- chapters: a won campaign opens the second act ----
const chapter = await page.evaluate(async () => {
  const ctx = window._ctx;
  const { tickDay } = await import('./js/sim/tick.js');
  ctx.game.result = 'win';
  for (let i = 0; i < 31 * (1 + (ctx.DEFINES.CHAPTERS.graceMonths + 1)); i++) tickDay(ctx);
  const ch = window._actions.getChapter();
  return ch && ch.active ? {
    n: ch.active.n, title: ch.active.title,
    slots: ch.active.objectives.map((o) => o.slot),
    reward: ch.active.reward.name,
  } : null;
});
ok(!!chapter && chapter.n === 1, 'a won campaign generates chapter 1 (' + (chapter && chapter.title) + ')');
ok(!!chapter && chapter.slots.join(',') === 'territorial,internal,diplomatic',
  'one territorial, one internal, one diplomatic objective');

await dismissEvents(page);
await page.locator('.tb-flag').click();
await page.waitForTimeout(300);
const panel = await page.evaluate(() => {
  const block = document.querySelector('[data-ref="chapterBlock"]');
  return {
    visible: !!block && !block.classList.contains('hidden'),
    head: (block && (block.querySelector('.np-ch-head') || {}).textContent) || '',
    rows: block ? block.querySelectorAll('.np-mission').length : 0,
    reward: (block && (block.querySelector('.np-ch-reward') || {}).textContent) || '',
  };
});
ok(panel.visible, 'the realm panel shows "The Chapters"');
ok(panel.rows === 3 && /Chapter 1/.test(panel.head), 'the three objectives are listed under the chapter head');
ok(/Seal:/.test(panel.reward), 'the seal (permanent reward) is printed');
await page.screenshot({ path: OUT + 'chapters-panel.png' });
await page.keyboard.press('Escape');

const olChapter = await page.evaluate(() => {
  const el = document.querySelector('.ol-chapter');
  return el ? el.textContent : '';
});
ok(/Chapter 1/.test(olChapter), 'the chapter rides the outliner beside the campaign clocks');

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
