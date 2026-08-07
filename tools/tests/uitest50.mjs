// UI verification §227: the mission panel overhauled — claimed, not banked;
// the road a sibling shut; the fork ledger.
//
// The headless half is smoke143. This is the half that only a browser can
// answer: that a satisfied medallion actually looks claimable and carries a
// hit target, that clicking it pays, that a shut road is drawn shut, that the
// tab strip wears what it owes, and that The Forks writes the either/or out
// underneath the tree.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/opt/node22/lib') + '/');
const { chromium } = require('playwright');
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 480000);

async function pickBookmark(page, nameFrag) {
  await page.waitForSelector('.bm-card', { timeout: BOOT_MS });
  for (let i = 0; i < 9; i++) {
    const cur = page.locator('.bm-card.current');
    const txt = (await cur.textContent()) || '';
    if (txt.includes(nameFrag)) { await cur.click(); return; }
    await page.locator('.ss-next').click();
    await page.waitForTimeout(450);
  }
  throw new Error('bookmark not found: ' + nameFrag);
}

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await pickBookmark(page, 'Great Revolt');
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(500);

// A world worth reading: the host over §227's harder ask, and the Temple
// burned so the second road of 66ce/how_the_revolt_ends has fired.
await page.evaluate(() => {
  const ctx = window._ctx;
  for (const a of Object.values(ctx.game.armies)) if (a && a.tag === 'JUD') a.men += 4000;
  ctx.helpers.setFlag(ctx, 'templeBurned', true);
});
await page.evaluate(async () => {
  const { checkMissions } = await import('/js/sim/realm.js');
  checkMissions(window._ctx);
});

await page.locator('.tb-flag').click();
await page.waitForSelector('#nation-panel:not(.hidden)');

console.log('== the tab says what it owes ==');
const badge = await page.locator('#nation-panel .np-tab-badge').first().textContent().catch(() => '');
ok(Number(badge) >= 1, 'the Missions tab wears the claim count: ' + badge);

await page.locator('#nation-panel .np-tab[data-tab-go="missions"]').click();
await page.waitForTimeout(400);

console.log('== a satisfied medallion is claimable, not claimed ==');
const ready = page.locator('#nation-panel .np-mn-ready');
ok(await ready.count() >= 1, 'at least one medallion is ready: ' + await ready.count());
ok(await page.locator('#nation-panel .np-mn-ready .np-mn-claim').count() >= 1, 'and says Claim under its name');
ok(await page.locator('#nation-panel .np-mn-ready[data-claim]').count() >= 1, 'and carries the hit target');
ok(await page.locator('#nation-panel .np-mn-done').count() === 0, 'nothing has been banked by the calendar');
const summary = (await page.locator('#nation-panel .np-mt-ready-sum').textContent()) || '';
ok(/ready to claim/.test(summary), 'the summary line counts them: ' + summary.trim());

console.log('== the road the campaign refused is drawn shut ==');
const shut = page.locator('#nation-panel .np-mn-shut');
ok(await shut.count() >= 3, 'the burnt Temple shuts the road and its branch: ' + await shut.count());
ok(await page.locator('#nation-panel .np-mn-shut .np-mn-cross').count() >= 3, 'each wearing an ✕');
const shutTip = (await shut.first().getAttribute('data-tt')) || '';
ok(/Shut\. This campaign took the other road/.test(shutTip), 'the tooltip says shut, and why');
ok(/Ninth of Av/.test(shutTip), 'and names the road actually taken: ' + (shutTip.match(/took the other road[^\n]*/) || [''])[0]);

console.log('== The Forks writes the either/or out ==');
ok(await page.locator('#nation-panel .np-fk').count() >= 5, 'one row per fork the tree stands in: ' + await page.locator('#nation-panel .np-fk').count());
ok(await page.locator('#nation-panel .np-fk-took').count() >= 1, 'the road taken is checked');
const refused = page.locator('#nation-panel .np-fk-refused');
ok(await refused.count() >= 1, 'the road refused is struck: ' + await refused.first().textContent());
ok(await page.locator('#nation-panel .np-fk-answered').count() >= 1, 'and the answered fork is marked as answered');

console.log('== the click is what pays ==');
const claimedName = (await ready.first().locator('.np-mn-name').textContent()) || '';
await ready.first().click();
await page.waitForTimeout(500);
ok(await page.locator('#nation-panel .np-mn-done').count() === 1, 'the clicked medallion is accomplished: ' + claimedName.trim());
const paid = await page.evaluate(() => (window._ctx.game.tags.JUD.modifiers || []).map((m) => m.id));
ok(paid.indexOf('levies_of_zion') >= 0, 'and the reward was paid at the click: ' + paid.join(','));
const perm = await page.evaluate(() => (window._ctx.game.tags.JUD.modifiers || []).find((m) => m.id === 'levies_of_zion'));
ok(perm && (perm.months | 0) === -1, 'permanently — §227 retired the expiry: months=' + (perm && perm.months));
ok(await page.evaluate(() => (window._ctx.game.tags.JUD.missionRest | 0)) >= 1, 'and the chain now rests from the claim');

ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
await browser.close();
console.log(failures ? `uitest50: ${failures} FAIL` : 'uitest50: ALL PASS');
process.exit(failures ? 1 : 0);
