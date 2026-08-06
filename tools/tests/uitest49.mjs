// UI verification — SPEC §226: the crown war's clause and the client's own way
// out, both in a real browser.
//
// smoke151 proves the arithmetic. This proves the two surfaces: the peace
// dialog growing a "Take the whole kingdom" row in the one war the chapter is
// about — enabled for a claimant, clearing the rest of the table when it is
// ticked, and actually ending Antigonus at 80 war score — and Throw Off the
// Yoke on the overlord's own panel, two taps like everything else in this game
// that cannot be undone.
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
  if (t.includes('Herod')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click(); await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click(); // HER is the chapter's first standard
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(700);

const start = await page.evaluate(() => {
  const g = window._ctx.game;
  return { me: g.playerTag, overlord: g.tags[g.playerTag] && g.tags[g.playerTag].overlord };
});
ok(start.me === 'HER', 'playing Herod: ' + start.me);
ok(start.overlord === 'ROM', 'and wearing Rome\'s collar from the first frame: ' + start.overlord);

// The crown war, won: 80 war score is what the clause costs, and Rome in the
// field beside us is what used to take the pen out of Herod's hand.
const warId = await page.evaluate(() => {
  const g = window._ctx.game;
  const w = g.wars.find((x) => x.name === 'The War for the Crown');
  if (!w) return 0;
  if (w.defenders.indexOf('ROM') < 0) {
    w.defenders.push('ROM');
    g.tags.ROM.atWarWith.push('ATG');
    g.tags.ATG.atWarWith.push('ROM');
  }
  w.noNegotiation = false;
  w.warscore[g.playerTag] = 85;
  w.warscore.ATG = -85;
  window._ctx.bus.emit('war', {});
  return w.id;
});
ok(!!warId, 'the War for the Crown is running: id ' + warId);

if (await page.locator('#nation-panel.hidden').count()) await page.locator('.tb-flag').click();
await page.waitForSelector('#nation-panel:not(.hidden)');
await page.locator('#nation-panel .np-tab[data-tab-go="world"]').click();
await page.waitForTimeout(300);
await page.locator(`#nation-panel [data-peace="${warId}"]`).click();
await page.waitForSelector('#peace-modal:not(.hidden)');
await page.waitForTimeout(200);

const row = await page.evaluate(() => {
  const box = document.querySelector('[data-ref="unifyCrown"]');
  if (!box) return null;
  const label = box.closest('.peace-prov');
  return {
    disabled: !!box.disabled,
    off: label.classList.contains('peace-off'),
    text: (label.textContent || '').replace(/\s+/g, ' ').trim(),
    tt: label.dataset.tt || '',
    hint: (document.querySelector('.peace-hint') || {}).textContent || '',
  };
});
ok(!!row, 'the crown war\'s table carries the clause');
ok(row && !row.disabled && !row.off, 'and offers it to the claimant, not greyed out');
ok(row && /Take the whole kingdom/.test(row.text) && /80/.test(row.text),
  'named and priced on the row: ' + (row && row.text));
ok(row && /renounces/.test(row.tt) && /passes into memory/.test(row.tt),
  'with the terms spelled out before it is ticked');

// It replaces the table rather than joining it.
await page.evaluate(() => {
  const first = document.querySelector('[data-prov]');
  if (first) { first.checked = true; first.dispatchEvent(new Event('change', { bubbles: true })); }
});
await page.waitForTimeout(200);
await page.evaluate(() => {
  const box = document.querySelector('[data-ref="unifyCrown"]');
  box.checked = true;
  box.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.waitForTimeout(300);
const swept = await page.evaluate(() => ({
  provs: [...document.querySelectorAll('[data-prov]')].every((b) => b.disabled && !b.checked),
  subjugate: (document.querySelector('[data-ref="subjugate"]') || {}).disabled,
  humiliate: (document.querySelector('[data-ref="humiliate"]') || {}).disabled,
  total: (document.querySelector('[data-ref="total"]') || {}).textContent || '',
  verdict: (document.querySelector('[data-ref="verdict"]') || {}).textContent || '',
}));
ok(swept.provs, 'ticking it disables and clears every province demand');
ok(swept.subjugate && swept.humiliate, 'and the collar and the humiliation with them');
ok(/80/.test(swept.total), 'the table costs one price: ' + swept.total.trim());
ok(/renounce|accept|settled/i.test(swept.verdict), 'and they will sign: ' + swept.verdict.trim());
await page.screenshot({ path: OUT + 'crown-peace.png' });

const before = await page.evaluate(() => {
  const g = window._ctx.game;
  let atg = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === 'ATG') atg++;
  }
  return atg;
});
await page.locator('[data-ref="send"]').click();
await page.waitForTimeout(600);
const after = await page.evaluate(() => {
  const g = window._ctx.game;
  let atg = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === 'ATG') atg++;
  }
  return { atg, alive: g.tags.ATG.alive, war: g.wars.some((w) => w.name === 'The War for the Crown') };
});
ok(before > 0 && after.atg === 0, `the treaty takes all ${before} of Antigonus' provinces`);
ok(after.alive === false, 'the last Hasmonean passes into memory at the table');
ok(after.war === false, 'and the crown war is over');

// ---- and the collar, from underneath ----
{
  await page.evaluate(() => {
    const g = window._ctx.game;
    g.wars.length = 0;
    for (const k of Object.keys(g.tags)) if (g.tags[k]) g.tags[k].atWarWith = [];
    window._ctx.bus.emit('war', {});
  });
  // Rome's own panel: reached the way the player reaches it, by clicking a
  // province Rome owns.
  const romeProv = await page.evaluate(() => {
    const g = window._ctx.game;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (p && !p.impassable && p.owner === 'ROM') return p.id;
    }
    return 0;
  });
  await page.evaluate((id) => window._ctx.bus.emit('mapclick', { provId: id, armyId: null }), romeProv);
  await page.waitForSelector('#province-panel:not(.hidden)');
  await page.waitForTimeout(400);
  const btn = await page.evaluate(() => {
    const b = document.querySelector('#province-panel [data-ref="dipIndependence"]');
    if (!b || b.classList.contains('hidden')) return null;
    return { text: (b.textContent || '').trim(), disabled: b.classList.contains('disabled'), tt: b.dataset.tt || '' };
  });
  ok(!!btn, 'our overlord\'s panel carries the way out');
  ok(btn && /Throw Off the Yoke/.test(btn.text) && !btn.disabled, 'live, and named: ' + (btn && btn.text));
  ok(btn && /bond breaks first/i.test(btn.tt), 'and says what it does: ' + (btn && btn.tt.split('\n')[1]));
  await page.locator('#province-panel [data-ref="dipIndependence"]').click();
  await page.waitForTimeout(300);
  const armed = await page.evaluate(() => ({
    text: (document.querySelector('[data-ref="dipIndependence"]') || {}).textContent || '',
    overlord: window._ctx.game.tags.HER.overlord,
  }));
  ok(/Renounce the fealty for good\?/.test(armed.text), 'the first press arms it: ' + armed.text.trim());
  ok(armed.overlord === 'ROM', 'and the collar is still on');
  await page.locator('#province-panel [data-ref="dipIndependence"]').click();
  await page.waitForTimeout(500);
  const out = await page.evaluate(() => {
    const g = window._ctx.game;
    return {
      overlord: g.tags.HER.overlord,
      war: g.wars.some((w) => w.cb === 'independence' && w.attackers.indexOf('HER') >= 0),
      toast: [...document.querySelectorAll('.toast .toast-title')].map((n) => n.textContent).join(' | '),
    };
  });
  ok(out.overlord === null, 'the second press strikes the bond');
  ok(out.war, 'and opens the war of independence that decides it');
  ok(/fealty renounced/i.test(out.toast), 'the toast says so: ' + out.toast);
  await page.screenshot({ path: OUT + 'crown-yoke.png' });
}

ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 2).join(' / ') : ''));
await browser.close();
console.log(failures ? '\n' + failures + ' FAIL' : '\nALL PASS');
process.exit(failures ? 1 : 0);
