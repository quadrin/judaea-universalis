// UI verification — SPEC §197: the estates can be asked, in a real browser.
//
// The headless suite (smoke127) proves the arithmetic; this one proves the
// three things only a browser can:
//
//   1. The court renders the new anatomy — every estate row carries its
//      ground line (the map's arithmetic in words), its favor figure, and
//      its two ask buttons, priced in favor.
//   2. An ask is one press: with the bank filled the button is live, the
//      press spends the favor, the row re-renders with the new figure, and
//      the toast says what was granted.
//   3. "Their ground" flips the whole map to the estates mode — and the
//      mapmode bar's lit button FOLLOWS, because the bar listens to the bus
//      rather than to its own clicks (a bar that only watched itself would
//      keep the old button lit and lie about what the map is showing).
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 480000);

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({
  executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.bm-card', { timeout: BOOT_MS });
// 66 CE, Judaea — the court every estates suite convenes.
for (let i = 0; i < 10; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(500);

console.log('== the court renders ground, favor and asks ==');
await page.locator('.tb-flag').click();
await page.waitForSelector('#nation-panel:not(.hidden)');
await page.locator('#nation-panel .np-tab[data-tab-go="court"]').click();
await page.waitForTimeout(150);
{
  // Scoped to the Estates host: the sacred offices, the schools and the
  // institutions all borrow the np-faction row anatomy on other tabs.
  const HOST = '#nation-panel [data-ref="factions"]';
  const rows = await page.locator(HOST + ' .np-faction').count();
  ok(rows === 3, 'three estates at the JUD court: ' + rows);
  const grounds = await page.locator(HOST + ' .np-fac-ground').count();
  const favors = await page.locator(HOST + ' .np-fac-favor').count();
  const asks = await page.locator(HOST + ' .np-ask').count();
  ok(grounds === rows, 'every row carries its ground line: ' + grounds);
  ok(favors === rows, 'every row carries its favor figure: ' + favors);
  ok(asks === rows * 2, 'and its two asks: ' + asks);
  const groundText = (await page.locator(HOST + ' .np-fac-ground').first().textContent()) || '';
  ok(/% of the realm/.test(groundText) && /strongest in|nearest it in/.test(groundText),
    'the ground line phrases the map: ' + groundText.trim());
  const askText = (await page.locator(HOST + ' .np-ask').first().textContent()) || '';
  ok(/\d/.test(askText), 'an ask button wears its favor price: ' + askText.trim());
  // At the opening bank of 10 no ask is affordable — the buttons say so.
  ok(await page.locator(HOST + ' .np-ask:not(.disabled)').count() === 0,
    'at the opening bank every ask is priced out');
}

console.log('== an ask is one press ==');
{
  // Bank the favor and warm the court from the sim side, then press.
  await page.evaluate(() => {
    const g = window._ctx.game;
    const t = g.tags[g.playerTag];
    t.factions.notables = 85;
    t.estateFavor.notables = 100;
    t.income = 40;
    window._ctx.bus.emit('actionTaken');
  });
  await page.waitForTimeout(300);
  const btn = page.locator('#nation-panel .np-ask[data-ask-fid="notables"][data-ask="coin"]');
  ok(await btn.count() === 1, 'the Peace Party offers its subscription');
  ok(!(await btn.evaluate((e) => e.classList.contains('disabled'))), 'and with 100 banked it is live');
  const purse = await page.evaluate(() => window._ctx.game.tags.JUD.treasury);
  await btn.click();
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    treasury: window._ctx.game.tags.JUD.treasury,
    favor: window._ctx.game.tags.JUD.estateFavor.notables,
  }));
  ok(after.treasury > purse, 'one press fills the treasury: ' + Math.round(purse) + ' → ' + Math.round(after.treasury));
  ok(after.favor === 60, 'and spends exactly 40 favor: 100 → ' + after.favor);
  const favorText = (await page.locator('#nation-panel [data-ref="factions"] .np-fac-favor-n').nth(1).textContent()) || '';
  ok(/60/.test(favorText), 'the row re-rendered with the new bank: ' + favorText.trim());
  const toast = (await page.locator('#toast-container .toast').last().textContent().catch(() => '')) || '';
  ok(/grant it|talents/i.test(toast), 'the toast says what was granted: ' + toast.trim().slice(0, 80));
}

console.log('== "Their ground" flips the map, and the bar follows ==');
{
  const before = await page.evaluate(() => {
    const b = document.querySelector('.mm-btn.active');
    return b ? b.dataset.mode : null;
  });
  ok(before !== 'estates', 'the map opens on another mode: ' + before);
  await page.locator('#nation-panel .np-est-map').click();
  await page.waitForTimeout(600);
  const lit = await page.evaluate(() => {
    const b = document.querySelector('.mm-btn.active');
    return b ? b.dataset.mode : null;
  });
  ok(lit === 'estates', 'one press lights the estates button on the bar: ' + lit);
  // And the mode genuinely paints parties, not one flat colour (the same
  // honesty check uitest38 runs for the dispersion).
  const spread = await page.evaluate(async () => {
    const mm = await import('/js/map/mapmodes.js');
    const r = mm.computeMapmodeColors(window._ctx, 'estates');
    const key = (a, i) => a[i * 4] + ',' + a[i * 4 + 1] + ',' + a[i * 4 + 2];
    const uniq = new Set();
    const n = window._ctx.game.provinces.length - 1;
    for (let i = 1; i <= n; i++) uniq.add(key(r.primary, i));
    return uniq.size;
  });
  ok(spread > 6, 'the estates mode paints ' + spread + ' distinct shades');
  ok(!(await page.locator('#nation-panel').evaluate((e) => e.classList.contains('hidden'))),
    'and the panel stays open beside the map it explains');
}

ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));

await browser.close();
console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
