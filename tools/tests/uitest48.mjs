// UI verification — SPEC §222: a treaty that runs both ways, and a deed that
// needs no treaty, both in a real browser.
//
// smoke147 proves the arithmetic. This proves the two surfaces: the peace
// dialog growing an "Offer provinces of our own" section that a LOSING crown
// can actually fill in and send, and the Give It Away block on a province's
// own panel handing it to a neighbour at peace — two taps, like every other
// control in the game that gives something away for good.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/opt/node22/lib') + '/');
const { chromium } = require('playwright');
const OUT = (process.env.JU_OUT || '/tmp') + '/';
let failures = 0;
const ok = (c, m) => { if (c) console.log('  PASS', m); else { failures++; console.error('  FAIL', m); } };
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 480000);
const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.bm-card', { timeout: BOOT_MS });
for (let i = 0; i < 12; i++) {
  const t = (await page.locator('.bm-card.current').textContent()) || '';
  if (t.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click(); await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(700);
// Losing the revolt badly.
const warId = await page.evaluate(() => {
  const g = window._ctx.game;
  const w = g.wars.find((x) => x.attackers.includes('ROM') || x.defenders.includes('ROM'));
  if (!w) return 0;
  w.warscore[g.playerTag] = -60;
  for (const t of w.attackers.concat(w.defenders)) if (t !== g.playerTag) w.warscore[t] = 60;
  return w.id;
});
ok(!!warId, 'a war we are losing: id ' + warId);
// Open the peace dialog the way the player does: the war row in the realm
// panel's diplomacy, whose Negotiate button calls openPeaceDialog.
if (await page.locator('#nation-panel.hidden').count()) await page.locator('.tb-flag').click();
await page.waitForSelector('#nation-panel:not(.hidden)');
await page.locator('#nation-panel .np-tab[data-tab-go="world"]').click();
await page.waitForTimeout(300);
const warRow = page.locator('#nation-panel [data-war]').first();
if (await warRow.count()) { await warRow.click(); await page.waitForTimeout(500); }
const neg = page.locator('[data-ref="negotiate"], .wo-negotiate, button:has-text("Negotiate")').first();
if (await neg.count()) { await neg.click(); await page.waitForTimeout(600); }
let has = await page.evaluate(() => !!document.querySelector('.peace-card'));
ok(has, 'the peace dialog opens');
if (has) {
  const read = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-concede]')];
    const secs = [...document.querySelectorAll('.peace-sec')].map((n) => n.textContent.trim());
    return { rows: rows.length, secs, total: (document.querySelector('[data-ref="total"]') || {}).textContent || '' };
  });
  ok(read.rows > 0, 'it lists ' + read.rows + ' provinces of ours to offer');
  ok(read.secs.some((s) => /Offer provinces of our own/.test(s)), 'under its own heading: ' + read.secs.join(' | '));
  await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('[data-concede]')];
    for (const b of boxes.slice(0, 6)) { b.checked = true; b.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({
    total: (document.querySelector('[data-ref="total"]') || {}).textContent || '',
    verdict: (document.querySelector('[data-ref="verdict"]') || {}).textContent || '',
    send: (document.querySelector('[data-ref="send"]') || {}).textContent || '',
    disabled: !!(document.querySelector('[data-ref="send"]') || {}).classList?.contains('disabled'),
  }));
  ok(/We offer \d+ war score of our own land/.test(after.total), 'the total reads the offer: ' + after.total);
  ok(after.verdict.length > 0, 'and the verdict answers: ' + after.verdict);
  await page.screenshot({ path: OUT + 'cede-peace.png' });
}
// ---- and the peacetime deed, in the same browser ----
{
  await page.evaluate(() => {
    const el = document.querySelector('#peace-modal');
    if (el) el.classList.add('hidden');
    const g = window._ctx.game;
    g.wars.length = 0;
    for (const k of Object.keys(g.tags)) if (g.tags[k]) g.tags[k].atWarWith = [];
    g.tags[g.playerTag].allies = ['PAR'];
    if (g.tags.PAR) g.tags.PAR.allies = [g.playerTag];
  });
  const pid = await page.evaluate(() => {
    const g = window._ctx.game;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (p && !p.impassable && p.owner === g.playerTag && p.controller === g.playerTag
          && (p.canon || p.name) !== 'Jerusalem') return p.id;
    }
    return 0;
  });
  await page.evaluate((id) => window._ctx.bus.emit('mapclick', { provId: id, armyId: null }), pid);
  await page.waitForSelector('#province-panel:not(.hidden)');
  await page.waitForTimeout(400);
  const blk = await page.evaluate(() => {
    const b = document.querySelector('#province-panel [data-ref="cedeBlock"]');
    if (!b || b.classList.contains('hidden')) return null;
    const sel = b.querySelector('[data-ref="cedeTo"]');
    return {
      title: (b.querySelector('.pp-build-title') || {}).textContent || '',
      row: (b.querySelector('[data-ref="cedeRow"]') || {}).textContent || '',
      options: [...(sel ? sel.options : [])].map((o) => o.textContent),
      label: (b.querySelector('[data-ref="cedeLabel"]') || {}).textContent || '',
      tt: (b.querySelector('[data-cede]') || {}).dataset?.tt || '',
    };
  });
  ok(!!blk, 'the province panel carries a Give It Away block at peace');
  ok(blk && /Give It Away/.test(blk.title) && blk.options.length > 0,
    'with somebody to give it to: ' + (blk && blk.options.join(', ')));
  ok(blk && /no war, no treaty, no price/.test(blk.tt), 'and the terms say what it is');
  const owner0 = await page.evaluate((id) => window._ctx.game.provinces[id].owner, pid);
  await page.locator('#province-panel [data-cede]').click();
  await page.waitForTimeout(300);
  const armed = await page.evaluate(() => (document.querySelector('[data-ref="cedeLabel"]') || {}).textContent || '');
  ok(/Give it away for good\?/.test(armed), 'the first press arms it: ' + armed);
  const mid = await page.evaluate((id) => window._ctx.game.provinces[id].owner, pid);
  ok(mid === owner0, 'and nothing has moved yet');
  await page.locator('#province-panel [data-cede]').click();
  await page.waitForTimeout(400);
  const out = await page.evaluate((id) => {
    const g = window._ctx.game;
    return { owner: g.provinces[id].owner,
      toast: [...document.querySelectorAll('.toast .toast-title')].map((n) => n.textContent).join(' | ') };
  }, pid);
  ok(out.owner !== owner0, 'the second press signs the deed: the province is now ' + out.owner + '\'s');
  ok(/province given away/i.test(out.toast), 'and the toast says so: ' + out.toast);
  await page.screenshot({ path: OUT + 'cede-peacetime.png' });
}

ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 2).join(' / ') : ''));
await browser.close();
console.log(failures ? '\n' + failures + ' FAIL' : '\nALL PASS');
process.exit(failures ? 1 : 0);
