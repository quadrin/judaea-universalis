// UI verification — SPEC §34: the Factions block sits in the realm panel with
// approval bars and a working appeasement lever, and stays hidden for foreign
// courts (their politics are offstage).
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
await page.locator('.bm-card.current').click(); // 167 BCE
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click(); // HAS
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(400);

console.log('== the court sits in the realm panel ==');
await page.locator('.tb-flag').click();
await page.waitForSelector('#nation-panel:not(.hidden)');
const facRows = await page.locator('.np-faction').count();
ok(facRows === 3, 'three factions at the Hasmonean court: ' + facRows);
const names = await page.locator('.np-fac-name').allTextContents();
ok(names.some((n) => /Hasideans/.test(n)) && names.some((n) => /Hellenizers/.test(n)),
  'the era\'s parties by name: ' + names.join(' · '));
const bars = await page.locator('.np-fac-fill').count();
ok(bars === 3, 'every faction carries its approval bar');
const state = await page.locator('.np-fac-state').first().textContent();
ok(/content · 50/.test(state), 'factions open content at 50: "' + state.trim() + '"');

console.log('== the appeasement lever works ==');
await page.evaluate(() => { window._ctx.game.tags.HAS.points.gov = 200; });
// re-open the panel so the lever re-renders against the fuller purse
await page.locator('#nation-panel .pp-close').click();
await page.locator('.tb-flag').click();
await page.waitForSelector('#nation-panel:not(.hidden)');
const hasBtn = await page.locator('.np-fac-btn[data-appease="hasideans"]').count();
ok(hasBtn === 1, 'the lever renders for the Hasideans');
await page.locator('.np-fac-btn[data-appease="hasideans"]').click();
await page.waitForTimeout(200);
const after = await page.locator('.np-fac-state').first().textContent();
ok(/content · 60/.test(after), 'courting the Hasideans: 50 → 60 ("' + after.trim() + '")');
const gov = await page.evaluate(() => window._ctx.game.tags.HAS.points.gov);
ok(gov === 160, 'the price was 40 governance points (200 → ' + gov + ')');
await page.locator('.np-fac-btn[data-appease="hasideans"]').click();
await page.waitForTimeout(200);
const again = await page.locator('.np-fac-state').first().textContent();
ok(/content · 60/.test(again), 'the lever cools down — no double-courting (' + again.trim() + ')');

console.log('== foreign courts keep their politics offstage ==');
// every flag is a door (SPEC §28): click the enemy's chip in our own
// diplomacy block and their court opens read-only — with no Factions block.
const foreignChip = page.locator('#nation-panel .fchip-link[data-open-tag="SEL"]').first();
ok(await foreignChip.count() >= 1, 'the Seleucid chip is a door');
await foreignChip.click();
await page.waitForTimeout(300);
const viewedName = await page.locator('#nation-panel .np-title').textContent();
ok(/Seleucid/.test(viewedName), 'the foreign court opens: ' + viewedName.trim());
const foreignHidden = await page.evaluate(() => {
  const block = document.querySelector('#nation-panel [data-ref="factionsBlock"]');
  return block ? block.classList.contains('hidden') : null;
});
ok(foreignHidden === true, 'the Factions block hides for a foreign court');

console.log('== no console errors ==');
ok(errors.length === 0, errors.length ? 'errors: ' + errors.slice(0, 3).join(' | ') : 'the console stays clean');

await page.screenshot({ path: OUT + 'uitest19-factions.png' });
await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
