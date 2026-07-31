// UI verification — SPEC §190: the quarrel of the two schools renders in the
// Faith tab of the realm panel, and its buttons rule.
//
// The assertion this suite exists for is the LAST one: clicking a side of a
// dispute has to move the live game — the reading, both houses, and the row
// itself — through the ordinary action path, not just paint. Everything above
// it is the block being where the SPEC says it is, in a chapter whose court
// has changed hands (§127) so the two houses are actually seated.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 240000);

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
await page.locator('.bm-card.current').click(); // 167 BCE
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click(); // HAS
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(400);

const BLOCK = '#nation-panel [data-ref="schoolsBlock"] ';
const openFaith = async () => {
  await page.locator('#nation-panel .np-tab[data-tab-go="faith"]').click();
  await page.waitForTimeout(180);
};

console.log('== 167 BCE opens with no quarrel to show ==');
await page.locator('.tb-flag').click();
await page.waitForSelector('#nation-panel:not(.hidden)');
await openFaith();
ok(await page.locator('#nation-panel [data-ref="sacredBlock"]:not(.hidden)').count() === 1,
  'the Hope and the Office is on the Faith tab');
ok(await page.locator('#nation-panel [data-ref="schoolsBlock"].hidden').count() === 1,
  'and the Law and Its Readers is hidden — the Hasideans still hold the pious seat');
{
  // REGRESSION (§190): the High Priesthood offered itself to every seat at
  // court, so the Brothers' Captains — hill commanders — were on the ballot.
  const seats = await page.locator('#nation-panel [data-ref="sacred"] .np-seat-btn').allTextContents();
  ok(!seats.some((s) => /Captains/.test(s)),
    'and no company of captains is a candidate for the altar: ' + seats.join(' · '));
}

console.log('== …and by 135 BCE the two houses are arguing ==');
// §127 hands this court over on 140. Move the clock rather than play 27 years.
await page.evaluate(() => { window._ctx.game.date.y = -135; });
await page.locator('.tb-flag').click(); // close
await page.locator('.tb-flag').click(); // …and reopen, which refreshes
await openFaith();
ok(await page.locator(BLOCK.trim() + ':not(.hidden)').count() === 1, 'the block appears');
const title = await page.locator(BLOCK + '.pp-build-title').textContent();
ok(title.trim() === 'The Law and Its Readers', 'under its own heading: ' + title.trim());
const names = await page.locator(BLOCK + '.np-fac-name').allTextContents();
ok(names.some((n) => /Pharisees/.test(n)) && names.some((n) => /Sadducees/.test(n)),
  'both houses are named: ' + names.slice(0, 3).join(' · '));
ok(await page.locator(BLOCK + '.np-dox-track').count() === 1, 'the reading carries a needle between two poles');
const poles = await page.locator(BLOCK + '.np-dox-pole').allTextContents();
ok(poles.length === 2 && /Sadducees/.test(poles[0]) && /Pharisees/.test(poles[1]),
  'the houses on the left and the schools on the right: ' + poles.join(' ←→ '));
const label = await page.locator(BLOCK + '.np-dox-label').textContent();
ok(/Unruled/i.test(label), 'and an unruled crown reads as unruled, not balanced: ' + label);
const disputes = await page.locator(BLOCK + '.np-seat-btns').count();
ok(disputes === 6, `all six disputes are open — the House stands in this chapter: ${disputes}`);
ok(await page.locator(BLOCK + '.np-rule-oral').count() === disputes
  && await page.locator(BLOCK + '.np-rule-written').count() === disputes,
  'each one offers both readings, and neither is the default');

console.log('== the buttons rule, and the game hears it ==');
// Points enough to convene, straight into the live game.
await page.evaluate(() => {
  const t = window._ctx.game.tags[window._ctx.game.playerTag];
  t.points.gov = 400; t.points.infl = 400; t.points.mar = 400;
});
await page.locator('.tb-flag').click();
await page.locator('.tb-flag').click();
await openFaith();
const before = await page.evaluate(() => {
  const t = window._ctx.game.tags[window._ctx.game.playerTag];
  return { pharisees: t.factions.pharisees, sadducees: t.factions.sadducees };
});
await page.locator(BLOCK + '.np-rule-oral').first().click();
await page.waitForTimeout(250);
const after = await page.evaluate(() => {
  const t = window._ctx.game.tags[window._ctx.game.playerTag];
  return {
    pharisees: t.factions.pharisees,
    sadducees: t.factions.sadducees,
    ruled: Object.keys((window._ctx.game.schools || {}).rulings || {}).length,
    mods: (t.modifiers || []).filter((m) => m && String(m.id).startsWith('ruling_')).length,
  };
});
ok(after.ruled === 1, 'one click puts one ruling on the record');
ok(after.pharisees > before.pharisees, 'the schools gain by it');
ok(after.sadducees < before.sadducees, 'and the houses pay for it — through the real action path');
ok(after.mods === 1, 'and the ruling is carrying its modifier in the live game');
const ruledRows = await page.locator(BLOCK + '.np-rule-done').count();
ok(ruledRows === 1, 'the row redraws as settled record rather than an open choice');
const label2 = await page.locator(BLOCK + '.np-dox-label').textContent();
ok(!/Unruled/i.test(label2), 'and the needle has moved off centre: ' + label2);

ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));

if (process.env.JU_SHOT) {
  await page.locator('#nation-panel').screenshot({ path: process.env.JU_SHOT });
}

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
