// UI verification — technology (SPEC §22): the realm panel's Technology block
// (three ladders + the unit-pattern line), buying a level, the ledger Tech
// column, and the outliner's Modernize button.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
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
for (let i = 0; i < 8; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(450);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click(); // JUD
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(600);

console.log('== the Technology block ==');
await page.locator('.tb-flag').click();
await page.waitForTimeout(400);
const techBtns = await page.locator('[data-tech]').count();
ok(techBtns === 3, 'three ladders shown: ' + techBtns);
const unitLine = (await page.locator('.np-tech-unit').textContent()) || '';
ok(unitLine.includes('Drilled Spearmen'), 'unit pattern line: ' + unitLine.trim());
const lvls = await page.locator('.np-tech-lvl').allTextContents();
ok(lvls.join(',') === '5,5,5', 'JUD levels 5/5/5: ' + lvls.join(','));

console.log('== buying a level through the panel ==');
await page.evaluate(() => { window._ctx.game.tags.JUD.points.gov = 999; });
await page.locator('.tb-flag').click(); await page.waitForTimeout(150);
await page.locator('.tb-flag').click(); await page.waitForTimeout(300); // reopen to re-render
const govBtn = page.locator('[data-tech="gov"]');
ok(!(await govBtn.getAttribute('class')).includes('disabled'), 'Advance button live with 999 points');
await govBtn.click();
await page.waitForTimeout(300);
const lvl = await page.evaluate(() => window._ctx.game.tags.JUD.tech.gov);
ok(lvl === 6, 'government tech now 6');
await page.screenshot({ path: OUT + 'v22-tech.png' });

console.log('== the ledger shows the ladders ==');
await page.keyboard.press('Escape');
await page.keyboard.press('l');
await page.waitForTimeout(300);
const headers = await page.locator('#ledger-modal th').allTextContents();
ok(headers.includes('Tech'), 'Tech column present: ' + headers.join('|'));
const judRow = (await page.locator('#ledger-modal tr.me').textContent()) || '';
ok(/6\/5\/5/.test(judRow), 'JUD row shows 6/5/5: ' + judRow.replace(/\s+/g, ' ').slice(0, 80));
await page.keyboard.press('Escape');

console.log('== the outliner modernize button ==');
const setup = await page.evaluate(() => {
  const g = window._ctx.game;
  const a = Object.values(g.armies).find((x) => x && x.tag === 'JUD');
  a.gen = 0; // an old-pattern host
  g.tags.JUD.treasury = 500;
  return { id: a.id };
});
await page.locator(`[data-army="${setup.id}"]`).first().click(); // select via the outliner row
await page.waitForTimeout(400);
const mzBtn = page.locator(`[data-modernize="${setup.id}"]`);
ok(await mzBtn.count() === 1, 'Modernize button rendered on the selected army');
ok(!(await mzBtn.getAttribute('class')).includes('disabled'), 'it is affordable and live');
await mzBtn.click();
await page.waitForTimeout(300);
const after = await page.evaluate((id) => ({
  gen: window._ctx.game.armies[id].gen,
  treasury: window._ctx.game.tags.JUD.treasury,
}), setup.id);
ok(after.gen === 1, 'the host re-equips to the current pattern (gen 1)');
ok(after.treasury < 500, 'the treasury paid: ' + (500 - after.treasury) + ' talents');
await page.screenshot({ path: OUT + 'v22-modernize.png' });

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
