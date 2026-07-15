// UI verification: desktop nation panel + peace dialog, portrait topbar rows.
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

async function boot(page) {
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
  return errors;
}

// ---------------------------------------------------------------- desktop --
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = await boot(page);
  await page.waitForTimeout(500);

  // Nation panel opens from the flag
  await page.locator('.tb-flag').click();
  ok(await page.locator('#nation-panel').isVisible(), 'nation panel opens on flag click');
  ok((await page.locator('.np-ruler-name').textContent()).includes('Ananus'), 'ruler shown');
  const decisions = await page.locator('.np-dec').count();
  ok(decisions >= 5, 'the base decisions listed (+ formable crowns): ' + decisions);
  const warRows = await page.locator('#nation-panel .np-dip-row').count();
  ok(warRows >= 1, 'diplomacy rows (allies/wars) present: ' + warRows);
  await page.screenshot({ path: OUT + 'desktop-nation.png' });

  // Escape closes it
  await page.keyboard.press('Escape');
  ok(!(await page.locator('#nation-panel').isVisible()), 'Escape closes nation panel');

  // Peace dialog: fabricate a negotiable war with occupation + warscore
  await page.evaluate(() => {
    const ctx = window._ctx;
    const g = ctx.game;
    ctx.helpers.declareWar(ctx, 'JUD', 'NAB', 'Test War with Nabataea');
    const war = g.wars.find((w) => w.name === 'Test War with Nabataea');
    war.warscore.JUD = 47; war.warscore.NAB = -47;
    for (const name of ['Petra', 'Bostra', 'Oboda']) {
      const p = ctx.prov(name);
      if (p) p.controller = 'JUD';
    }
    ctx.bus.emit('war', {});
    window._testWarId = war.id;
  });
  await page.locator('.tb-flag').click();
  const testWarId = await page.evaluate(() => window._testWarId);
  await page.locator(`#nation-panel [data-peace="${testWarId}"]`).click();
  await page.waitForSelector('#peace-modal:not(.hidden)');
  ok(await page.locator('.peace-card').isVisible(), 'peace dialog opens from nation panel dove');
  const provOpts = await page.locator('.peace-prov input[data-prov]').count();
  ok(provOpts === 3, 'three occupied provinces demandable: ' + provOpts);
  // demand Petra + 100 talents + humiliate, check verdict flips as costs mount
  await page.locator('.peace-prov input[data-prov]').first().check();
  await page.locator('[data-gold="1"]').click({ clickCount: 4 }); // +100
  await page.locator('[data-ref="humiliate"]').check();
  const verdict = (await page.locator('[data-ref="verdict"]').textContent()).trim();
  ok(/accept/.test(verdict), 'verdict shows acceptance: ' + verdict);
  await page.screenshot({ path: OUT + 'desktop-peace.png' });
  await page.evaluate(() => { window._ctx.game.paused = false; });
  await page.locator('[data-ref="send"]').click();
  await page.evaluate(() => { window._ctx.game.paused = true; });
  await page.waitForTimeout(300);
  const res = await page.evaluate(() => {
    const g = window._ctx.game;
    return {
      warGone: !g.wars.some((w) => w.name === 'Test War with Nabataea'),
      petra: window._ctx.prov('Petra').owner,
    };
  });
  ok(res.warGone && res.petra === 'JUD', 'deal executed: war ended, Petra is JUD');

  // Declare-war button visible in a foreign province's diplomacy block
  await page.evaluate(() => {
    const ctx = window._ctx;
    const p = ctx.prov('Tigranocerta'); // ARM, at peace with JUD
    ctx.bus.emit('mapclick', { provId: p.id, armyId: null });
  });
  await page.waitForSelector('#province-panel:not(.hidden)');
  ok(await page.locator('[data-ref="dipWar"]').isVisible(), 'Declare War button present for foreign owner');
  ok(errors.length === 0, 'no page errors (desktop): ' + JSON.stringify(errors.slice(0, 3)));
  await page.close();
}

// ---------------------------------------------------------------- portrait --
{
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true, isMobile: true,
  });
  const errors = await boot(page);
  await page.waitForTimeout(500);
  const vis = await page.evaluate(() => {
    const v = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width) };
    };
    return {
      points: v('.tb-points'),
      stability: v('[data-ref="stabilityWrap"]'),
      legitimacy: v('[data-ref="legitimacyWrap"]'),
      date: v('.tb-date'),
      topbar: v('#topbar'),
      pill: v('#outliner-pill'),
    };
  });
  ok(!!vis.points, 'G/I/M points visible in portrait: ' + JSON.stringify(vis.points));
  ok(!!vis.stability && !!vis.legitimacy, 'stability & legitimacy visible in portrait');
  ok(vis.points && vis.points.top >= 28, 'points sit on the second row (top ' + (vis.points && vis.points.top) + ')');
  ok(vis.topbar && vis.topbar.bottom >= 60, 'topbar grew to two rows (bottom ' + vis.topbar.bottom + ')');
  ok(vis.pill && vis.pill.top >= vis.topbar.bottom - 4, 'outliner pill cleared the taller topbar');
  await page.screenshot({ path: OUT + 'portrait-topbar.png' });

  // Nation panel as a bottom sheet
  await page.locator('.tb-flag').click();
  await page.waitForTimeout(200);
  const sheet = await page.evaluate(() => {
    const r = document.querySelector('#nation-panel').getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width) };
  });
  ok(sheet.w >= 388 && sheet.bottom >= 840, 'nation panel is a full-width bottom sheet: ' + JSON.stringify(sheet));
  await page.screenshot({ path: OUT + 'portrait-nation.png' });
  ok(errors.length === 0, 'no page errors (portrait): ' + JSON.stringify(errors.slice(0, 3)));
  await page.close();
}

// -------------------------------------------------- phone landscape sanity --
{
  const page = await browser.newPage({
    viewport: { width: 844, height: 390 },
    hasTouch: true, isMobile: true,
  });
  const errors = await boot(page);
  const bar = await page.evaluate(() => {
    const r = document.querySelector('#topbar').getBoundingClientRect();
    const pts = getComputedStyle(document.querySelector('.tb-points')).display;
    return { h: Math.round(r.height), pts };
  });
  ok(bar.h <= 50, 'landscape keeps the single-row topbar (h ' + bar.h + ')');
  ok(bar.pts === 'none', 'landscape sheds points as before');
  ok(errors.length === 0, 'no page errors (landscape): ' + JSON.stringify(errors.slice(0, 3)));
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
