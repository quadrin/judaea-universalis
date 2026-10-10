// UI verification — SPEC §298: a strong client chafes, in the panels.
//
//   - The realm panel's Client kingdoms rows carry each client's weight
//     against ours (its lands as a share of ours) and its loyalty: loyal,
//     chafes −X/mo, will not march, may rise; the tooltip says why.
//   - A lord who is a player hears it: "… outgrows its collar".
//   - The province panel's diplomacy status reads "Our client — …" and its
//     tooltip gives the share and where the regard settles.
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

// Agrippa's kingdom becomes Judaea's client, at 90% of Judaea's lands, and
// the month's chafe runs.
const setup = await page.evaluate(async () => {
  const ctx = window._ctx;
  const g = ctx.game;
  g.paused = true;
  document.getElementById('toast-container').innerHTML = '';
  const mil = await import('/js/sim/military.js');
  // the chapter opens at war: a client cannot be at war with its lord
  g.wars = [];
  for (const k of Object.keys(g.tags)) if (g.tags[k]) g.tags[k].atWarWith = [];
  const agr = g.tags.AGR;
  agr.overlord = 'JUD';
  agr.opinion = agr.opinion || {};
  agr.opinion.JUD = 50;
  const lordDev = mil.devOfTag(ctx, 'JUD');
  const mine = g.provinces.filter((p) => p && !p.impassable && p.owner === 'AGR');
  mine.forEach((p, i) => { p.dev = i === 0 ? { tax: Math.round(lordDev * 0.9), prod: 0, mp: 0 } : { tax: 0, prod: 0, mp: 0 }; });
  mil.monthlyStrongClients(ctx);
  ctx.bus.emit('day', { date: { ...g.date } });
  return { prov: mine[0].id, opinion: agr.opinion.JUD, chafe: agr.chafe };
});
await page.waitForTimeout(400);

console.log('== the lord hears it ==');
const toasts = await page.locator('#toast-container .toast').allTextContents();
ok(toasts.some((t) => /outgrows its collar/.test(t) && /90%/.test(t)), 'a notice: ' + (toasts.find((t) => /collar/.test(t)) || toasts.join(' | ')));

console.log('== the realm panel: weight and loyalty ==');
await page.locator('.tb-flag').click();
await page.waitForSelector('#nation-panel:not(.hidden)');
await page.locator('#nation-panel .np-tab[data-tab-go="world"]').click();
await page.waitForTimeout(300);
const row = page.locator('#nation-panel .np-client[data-client="AGR"]');
ok((await row.count()) === 1, 'Agrippa\'s kingdom has a client row');
const pct = (await row.locator('.np-client-pct').textContent()) || '';
const badge = (await row.locator('[data-ref="loyalty"]').textContent()) || '';
ok(pct.trim() === '90%', 'its lands as a share of ours: ' + pct);
ok(/chafes −[\d.]+\/mo/.test(badge) && (await row.locator('[data-ref="loyalty"]').getAttribute('class')).includes('warn'), 'and it chafes: ' + badge);
const tt = (await row.getAttribute('data-tt')) || '';
ok(/90% of ours/.test(tt) && /content up to 50%/.test(tt) && /falls [\d.]+ a month toward -50/.test(tt) && /Envoys and gifts/.test(tt),
  'the tooltip says why: ' + tt.replace(/\n/g, ' / '));
await row.screenshot({ path: OUT + 'v298-client-row.png' });
// further down: it will not march, then it may rise
await page.evaluate(() => {
  const g = window._ctx.game;
  g.tags.AGR.opinion.JUD = -40;
  window._ctx.bus.emit('day', { date: { ...g.date } });
});
await page.locator('#nation-panel .np-tab[data-tab-go="world"]').click();
await page.waitForTimeout(300);
ok(/will not march/.test(await row.locator('[data-ref="loyalty"]').textContent()), 'at −40 it will not march');
await page.evaluate(() => {
  const g = window._ctx.game;
  g.tags.AGR.opinion.JUD = -90;
  g.tags.AGR.manpower = 90000;
  window._ctx.bus.emit('day', { date: { ...g.date } });
});
await page.locator('#nation-panel .np-tab[data-tab-go="world"]').click();
await page.waitForTimeout(300);
const rising = (await row.locator('[data-ref="loyalty"]').textContent()) || '';
ok(/may rise/.test(rising) && (await row.locator('[data-ref="loyalty"]').getAttribute('class')).includes('neg'), 'at −90, with the strength, it may rise: ' + rising);
await page.locator('#nation-panel [data-ref="close"]').click();

console.log('== the province panel ==');
await page.evaluate((id) => window._ctx.bus.emit('mapclick', { provId: id, armyId: null }), setup.prov);
await page.waitForSelector('#province-panel:not(.hidden)');
await page.waitForTimeout(300);
const st = page.locator('#province-panel [data-ref="dipStatus"]');
const stTxt = (await st.textContent()) || '';
ok(/Our client — may rise/.test(stTxt), 'the status: ' + stTxt);
const stTT = (await st.getAttribute('data-tt')) || '';
ok(/Their lands are 90% of ours/.test(stTT) && /may rise for its independence/.test(stTT), 'and its tooltip: ' + stTT.replace(/\n/g, ' / '));

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));
await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
