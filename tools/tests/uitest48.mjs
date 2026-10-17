// UI verification: peace demands and concessions exclude each other, and
// surrender and peacetime province gifts remain usable.
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
await page.addInitScript(() => localStorage.clear());
await page.goto(process.env.JU_BASE_URL || 'http://127.0.0.1:8613/', { waitUntil: 'domcontentloaded', timeout: BOOT_MS });
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
// A winning position with an occupied enemy province available to demand.
const warId = await page.evaluate(() => {
  const g = window._ctx.game;
  const w = g.wars.find((x) => x.attackers.includes('ROM') || x.defenders.includes('ROM'));
  if (!w) return 0;
  w.warscore[g.playerTag] = 60;
  for (const t of w.attackers.concat(w.defenders)) if (t !== g.playerTag) w.warscore[t] = -60;
  const p = window._ctx.prov('Caesarea Maritima');
  p.controller = g.playerTag;
  return w.id;
});
ok(!!warId, 'a war we are winning: id ' + warId);
// Open the peace dialog the way the player does: the war row in the realm
// panel's diplomacy, whose Negotiate button calls openPeaceDialog.
if (await page.locator('#nation-panel.hidden').count()) await page.locator('.tb-flag').click();
await page.waitForSelector('#nation-panel:not(.hidden)');
await page.locator('#nation-panel .np-tab[data-tab-go="world"]').click();
await page.waitForTimeout(300);
await page.locator(`#nation-panel [data-peace="${warId}"]`).click();
await page.waitForSelector('#peace-modal:not(.hidden)');
let has = await page.evaluate(() => !!document.querySelector('.peace-card'));
ok(has, 'the peace dialog opens');
if (has) {
  const take = page.locator('#peace-modal [data-prov]').first();
  const give = page.locator('#peace-modal [data-concede]').first();
  ok(await take.count() > 0, 'occupied enemy land is available to demand');
  await take.check();
  ok(await give.isDisabled(), 'demanding land disables province concessions');
  const demanded = await page.locator('#peace-modal [data-ref="total"]').textContent();
  ok(/Demands cost \d+ war score/.test(demanded), 'the total uses the actual demand cost');
  await take.uncheck();
  ok(await give.isEnabled(), 'clearing demands restores concessions');
  await give.check();
  const demandControls = page.locator('#peace-modal [data-prov], #peace-modal [data-prov-to], #peace-modal [data-release], #peace-modal [data-transfer-vassal], #peace-modal [data-gold], #peace-modal [data-ref="humiliate"], #peace-modal [data-ref="reparations"], #peace-modal [data-ref="subjugate"], #peace-modal [data-ref="unifyCrown"]');
  ok(await demandControls.evaluateAll(els => els.every(e => e.disabled)),
    'offering land disables every kind of demand and recipient picker');
  const pid = Number(await take.getAttribute('data-prov'));
  await page.evaluate(id => window._ctx.bus.emit('mapclick', { provId: id, armyId: null }), pid);
  ok(!(await take.isChecked()), 'map clicks cannot add demands while conceding');
  await give.uncheck();
  ok(await take.isEnabled(), 'clearing concessions restores demands');
  const gold = page.locator('#peace-modal [data-gold="1"]');
  await gold.click();
  ok(await give.isDisabled(), 'demanding payment also disables concessions');
  await page.locator('#peace-modal [data-gold="-1"]').click();
  ok(await give.isEnabled(), 'clearing payment restores concessions');
  await page.locator('#peace-modal .peace-cancel').click();
  await page.evaluate(id => {
    const g = window._ctx.game;
    const w = g.wars.find(x => x.id === id);
    w.warscore[g.playerTag] = -60;
    for (const t of w.attackers.concat(w.defenders)) if (t !== g.playerTag) w.warscore[t] = 60;
  }, warId);
  await page.locator('.tb-flag').click();
  await page.locator('#nation-panel .np-tab[data-tab-go="world"]').click();
  await page.locator(`#nation-panel [data-peace="${warId}"]`).click();
  await page.waitForSelector('#peace-modal:not(.hidden)');
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
