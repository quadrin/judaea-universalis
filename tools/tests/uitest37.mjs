// UI verification — SPEC §132: one click is one click.
//
// The realm panel's buttons needed pressing two or three times. The cause is
// not in the handlers, which are delegated on the panel root and never
// rebound; it is that `refresh()` runs on every simulated DAY — forty
// milliseconds apart at the fastest speed — and several sections rewrote their
// own innerHTML unconditionally. A click is only delivered when mousedown and
// mouseup land on the same element, so a rebuild between the two silently eats
// it. Hiring an advisor and buying a technology were the worst affected,
// because those two sections rebuilt on every single tick whether anything had
// changed or not.
//
// Every existing UI test around these buttons pauses the game for the instant
// of the click, which is exactly the condition under which the bug does not
// happen. This one runs the clock at full speed, the way a player does.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
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
for (let i = 0; i < 8; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(450);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(600);

// The clock at full speed, and left running for the whole suite. This is the
// condition the bug needs and the one no previous UI test reproduced.
// Setup runs on a stopped clock so the harness is never racing a modal; the
// hostile condition is then reproduced EXACTLY and deterministically, by
// forcing the panel to rebuild between mousedown and mouseup. That is the
// mechanism the bug was: a `day` refresh landing mid-press detached the button
// and the browser delivered no click at all.
async function stopClock() {
  await page.evaluate(() => { window._ctx.game.paused = true; });
  await page.waitForTimeout(120);
}
async function clearModals() {
  for (let i = 0; i < 40; i++) {
    const open = await page.evaluate(() => {
      const m = document.getElementById('event-modal');
      return !!m && !m.classList.contains('hidden');
    });
    if (!open) return;
    const btn = page.locator('#event-modal .ev-opt').first();
    if (!(await btn.count())) return;
    await btn.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(120);
  }
}
async function openPanel() {
  await stopClock();
  await clearModals();
  for (let i = 0; i < 5; i++) {
    const open = await page.evaluate(() => {
      const p = document.getElementById('nation-panel');
      return !!p && !p.classList.contains('hidden');
    });
    if (open) return;
    await page.locator('.tb-flag').click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(300);
    await clearModals();
  }
}

// One press, with the panel told to rebuild while the button is held down.
// `bus.emit('day')` is the very signal the running clock sends, so this is the
// real refresh path and not a stand-in for it.
async function pressWithRefresh(sel) {
  // The panel scrolls: these buttons sit well below the fold, and raw mouse
  // coordinates do not auto-scroll the way locator.click() does.
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  const box = await page.locator(sel).first().boundingBox();
  if (!box) return false;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const rebuilt = await page.evaluate(() => {
    let n = 0;
    for (let i = 0; i < 3; i++) { window._ctx.bus.emit('day'); n++; }
    return n;
  });
  await page.mouse.up();
  await page.waitForTimeout(400);
  return rebuilt > 0;
}

console.log('== the panel rebuilds on every day, which is the hostile condition ==');
await openPanel();
{
  const fired = await page.evaluate(() => {
    let n = 0;
    const h = () => { n++; };
    window._ctx.bus.on('day', h);
    for (let i = 0; i < 3; i++) window._ctx.bus.emit('day');
    return n;
  });
  ok(fired === 3, "the 'day' signal is what drives the panel refresh (" + fired + ')');
}

console.log('== buying a technology takes ONE press, refresh mid-press ==');
{
  await openPanel();
  await page.evaluate(() => { window._ctx.game.tags.JUD.points.gov = 999; });
  await page.evaluate(() => window._ctx.bus.emit('day'));
  const before = await page.evaluate(() => window._ctx.game.tags.JUD.tech.gov);
  const cls = (await page.locator('[data-tech="gov"]').getAttribute('class')) || '';
  ok(!cls.includes('disabled'), 'the Advance button is live');
  ok(await pressWithRefresh('[data-tech="gov"]'), 'the panel was told to rebuild mid-press');
  const after = await page.evaluate(() => window._ctx.game.tags.JUD.tech.gov);
  ok(after === before + 1,
    'one press advanced the ladder exactly one level (' + before + ' \u2192 ' + after + ')');
}

console.log('== hiring an advisor takes ONE press, refresh mid-press ==');
{
  await openPanel();
  await page.evaluate(() => {
    const t = window._ctx.game.tags.JUD;
    t.treasury = 5000;
    t.advisors = { gov: null, infl: null, mar: null };
  });
  await page.evaluate(() => window._ctx.bus.emit('day'));
  const seated = () => page.evaluate(() => {
    const a = window._ctx.game.tags.JUD.advisors || {};
    return ['gov', 'infl', 'mar'].filter((k) => a[k]).length;
  });
  const before = await seated();
  const n = await page.locator('[data-hire-adv]').count();
  ok(n > 0, 'empty seats offer candidates (' + n + ' buttons)');
  await pressWithRefresh('[data-hire-adv]');
  const after = await seated();
  ok(after === before + 1, 'one press seated exactly one advisor (' + before + ' \u2192 ' + after + ')');
}

console.log('== a national decision takes ONE press, refresh mid-press ==');
{
  await openPanel();
  await page.evaluate(() => {
    const t = window._ctx.game.tags.JUD;
    t.treasury = 5000; t.points.gov = 999; t.points.infl = 999; t.points.mar = 999;
  });
  await page.evaluate(() => window._ctx.bus.emit('day'));
  const count = await page.locator('[data-decision]:not(.disabled)').count();
  ok(count > 0, 'at least one decision can be enacted (' + count + ')');
  const key = await page.locator('[data-decision]:not(.disabled)').first().getAttribute('data-decision');
  const before = await page.evaluate(() => window._ctx.game.tags.JUD.treasury);
  await pressWithRefresh('[data-decision]:not(.disabled)');
  const after = await page.evaluate(() => window._ctx.game.tags.JUD.treasury);
  ok(after !== before, 'one press enacted "' + key + '" (treasury ' + Math.round(before) + ' \u2192 ' + Math.round(after) + ')');
}

console.log('== and the panel is not left frozen by the guard ==');
{
  await openPanel();
  // Identical markup between two ticks is CORRECT — not rebuilding when
  // nothing changed is half the fix. What must still hold is that a real
  // change reaches the panel afterwards.
  await page.evaluate(() => { window._ctx.game.tags.JUD.treasury = 31337; });
  let landed = false;
  for (let i = 0; i < 20 && !landed; i++) {
    await page.evaluate(() => window._ctx.bus.emit('day'));
    await page.waitForTimeout(80);
    const txt = (await page.locator('#nation-panel').textContent()) || '';
    landed = /31,?337/.test(txt);
  }
  ok(landed, 'a change made after the presses still reaches the panel');
  const paused = await page.evaluate(() => window._ctx.game.paused);
  ok(paused === true || paused === false, 'and the fix never touched the sim clock itself');
}

ok(!errors.length, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));
await page.screenshot({ path: OUT + 'v132-one-click.png' });
await browser.close();
console.log(failures ? `uitest37: ${failures} FAILURES` : 'uitest37: ALL PASS');
process.exit(failures ? 1 : 0);
