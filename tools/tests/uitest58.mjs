// UI verification — SPEC §292: the Trade tab, the trade map, merchants on
// the map.
//
//   - The outliner's Merchants line opens the realm panel on Trade: what we
//     take a month, our home market, where the roads end, merchants n / cap,
//     and a row for every market where we have a stake.
//   - A caravan is made ready from the tab; Send… lists the markets it can
//     reach; Collect sends it on the road, and the tab says where it is bound.
//   - The caravan is drawn on its road, further along each day.
//   - A squadron is given a mission from the tab: Guard, then Stand down.
//   - The trade map mode colours the provinces by market, labels each market
//     with its worth (our home outlined), and draws the lanes as arrows.
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
await page.evaluate(() => {
  const g = window._ctx.game;
  g.paused = true;
  g.tags[g.playerTag].treasury = 400;
  document.getElementById('toast-container').innerHTML = '';
});

console.log('== the outliner opens the Trade tab ==');
await page.evaluate(() => window._ctx.bus.emit('day', { date: { ...window._ctx.game.date } }));
await page.waitForTimeout(300);
const olLine = page.locator('#outliner [data-trade-open]').first();
ok((await olLine.count()) === 1, 'the outliner has a Merchants line');
await olLine.click();
await page.waitForSelector('#nation-panel:not(.hidden)');
ok((await page.locator('#nation-panel').getAttribute('data-tab')) === 'trade', 'it opens the realm panel on Trade');
const sum = (await page.locator('#nation-panel .np-tr-sum').textContent()) || '';
ok(/a month/.test(sum) && /home/.test(sum) && /roads end at Rome/.test(sum) && /merchants 0 \/ \d/.test(sum), 'the summary: ' + sum.replace(/\s+/g, ' ').trim());
const rows = await page.locator('#nation-panel .np-tr-row:not(.np-tr-th)').count();
ok(rows >= 1, 'a row for every market where we have a stake: ' + rows);
await page.screenshot({ path: OUT + 'v292-trade-tab.png' });

console.log('== a caravan is made ready and sent ==');
const build = page.locator('#nation-panel [data-tr-build$="|caravan"]:not(.disabled)').first();
ok((await build.count()) === 1, 'the tab offers a caravan at a market town or the capital');
await build.click();
await page.waitForTimeout(300);
const m0 = await page.evaluate(() => (window._ctx.game.merchants || []).filter((m) => m.tag === window._ctx.game.playerTag));
ok(m0.length === 1 && m0[0].kind === 'caravan' && m0[0].state === 'home', 'a caravan waits at ' + (m0[0] && m0[0].home));
await page.locator(`#nation-panel [data-tr-pick="${m0[0].id}"]`).click();
await page.waitForTimeout(250);
const picks = await page.locator('#nation-panel .np-tr-pick .np-tr-t').count();
ok(picks >= 3, 'Send… lists the markets it can reach: ' + picks);
// a market that is not home, so the caravan takes the road
const target = await page.evaluate((id) => {
  const ts = window._actions.getMerchantTargets(id).filter((n) => n.reachable && n.days > 0);
  ts.sort((a, b) => a.days - b.days);
  return ts[0] ? ts[0].id : null;
}, m0[0].id);
ok(!!target, 'a market a few days away: ' + target);
const send = page.locator(`#nation-panel [data-tr-send="${m0[0].id}|${target}|collect|"]`);
if ((await send.count()) === 0) {
  // the list shows the ten best; send it by the action the button calls
  await page.evaluate(({ id, t }) => window._actions.sendMerchant(id, t, 'collect'), { id: m0[0].id, t: target });
} else {
  await send.click();
}
await page.waitForTimeout(300);
const m1 = await page.evaluate(() => (window._ctx.game.merchants || []).find((m) => m.tag === window._ctx.game.playerTag));
ok(m1.state === 'out' && m1.node === target && m1.order === 'collect' && m1.daysLeft > 0, 'it is on the road, ' + m1.daysLeft + ' days');
const mtxt = (await page.locator('#nation-panel .np-tr-m').first().textContent()) || '';
ok(/bound for/.test(mtxt), 'the tab says where it is bound: ' + mtxt.replace(/\s+/g, ' ').trim());
await page.screenshot({ path: OUT + 'v292-trade-sent.png' });

console.log('== the caravan on its road ==');
await page.keyboard.press('Escape');
await page.evaluate((m) => {
  const ctx = window._ctx;
  const a = ctx.geom.centroids[m.from];
  const b = ctx.geom.centroids[m.to];
  window._camera.centerOn((a.x + b.x) / 2, (a.y + b.y) / 2, 2.2);
}, m1);
await page.waitForTimeout(900);
const track = [];
for (let left = m1.daysTotal; left >= 1; left -= Math.max(1, Math.floor(m1.daysTotal / 4))) {
  await page.evaluate((l) => { window._ctx.game.merchants.find((m) => m.tag === window._ctx.game.playerTag).daysLeft = l; }, left);
  await page.waitForTimeout(150);
  const c = await page.evaluate(() => window._overlay.ships().find((x) => x.kind === 'caravan'));
  if (c) track.push(c);
}
ok(track.length >= 3, 'the caravan is drawn on the road: ' + track.length + ' looks');
ok(track.every((c, i) => i === 0 || c.f >= track[i - 1].f) && track[track.length - 1].f > track[0].f, 'further along each day: '
  + track.map((c) => c.f.toFixed(2)).join(' → '));
await page.screenshot({ path: OUT + 'v292-caravan.png' });

console.log('== a squadron guards a market ==');
const fid = await page.evaluate(() => {
  const ctx = window._ctx;
  const g = ctx.game;
  const p = g.provinces.find((x) => x && x.owner === g.playerTag && x.controller === g.playerTag && ctx.geom.coastal[x.id]);
  const f = ctx.helpers.spawnFleet(ctx, g.playerTag, p.canon || p.name, 3, { name: 'Test squadron' });
  return f.id;
});
await page.evaluate(() => window._ctx.bus.emit('day', { date: { ...window._ctx.game.date } }));
await page.locator('#outliner [data-trade-open]').first().click();
await page.waitForSelector('#nation-panel:not(.hidden)');
await page.waitForTimeout(250);
const guard = page.locator(`#nation-panel [data-tr-mission="${fid}|protect"]`);
ok((await guard.count()) === 1, 'the tab lists the squadron with Guard and Raid');
await guard.click();
await page.waitForTimeout(300);
const mis = await page.evaluate((id) => window._ctx.game.fleets[id].mission, fid);
ok(mis && mis.kind === 'protect' && !!mis.node, 'Guard gives it a mission: ' + JSON.stringify(mis));
const ftxt = await page.locator('#nation-panel .np-tr-m', { hasText: 'Test squadron' }).textContent();
ok(/guarding/.test(ftxt), 'the tab says so: ' + ftxt.replace(/\s+/g, ' ').trim());
await page.locator(`#nation-panel [data-tr-mission="${fid}|"]`).click();
await page.waitForTimeout(250);
ok(await page.evaluate((id) => !window._ctx.game.fleets[id].mission, fid), 'Stand down ends it');
await page.keyboard.press('Escape');

console.log('== the trade map ==');
await page.locator('#mapmode-bar [data-mode="trade"], .mm-btn[data-mode="trade"]').first().click();
await page.evaluate(() => {
  const ctx = window._ctx;
  const j = ctx.prov('Joppa');
  window._camera.centerOn(j.x, j.y, 0.9);
});
await page.waitForTimeout(1200);
const tl = await page.evaluate(() => window._overlay.trade());
const labels = tl.filter((x) => x.kind === 'label');
const lanes = tl.filter((x) => x.kind === 'lane');
ok(labels.length >= 6, 'markets are labelled with their worth: ' + labels.slice(0, 6).map((l) => l.text).join(', '));
ok(labels.some((l) => l.home), 'our home market is marked');
ok(lanes.length >= 4 && lanes.every((l) => l.w > 0), 'the lanes are drawn: ' + lanes.slice(0, 5).map((l) => l.from + '→' + l.to).join(', '));
const colours = await page.evaluate(() => {
  const ctx = window._ctx;
  const a = ctx.prov('Jerusalem');
  const b = ctx.prov('Alexandria');
  return window._renderer && window._renderer.colorOf ? [window._renderer.colorOf(a.id), window._renderer.colorOf(b.id)] : null;
});
if (colours) ok(colours[0] !== colours[1], 'Judaea and Alexandria are different markets on the map');
await page.screenshot({ path: OUT + 'v292-trade-map.png' });
await page.locator('.mm-btn[data-mode="political"]').first().click();
await page.waitForTimeout(400);
ok((await page.evaluate(() => window._overlay.trade())).length === 0, 'and the political map draws no markets');

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
