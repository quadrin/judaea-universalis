// UI verification — SPEC §33: the Objectives block tops the realm panel,
// H opens the help primer, and the battle window offers Withdraw.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
const { chromium } = require('playwright');
const OUT = (process.env.JU_OUT || '/tmp') + '/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.bm-card', { timeout: 20000 });
await page.locator('.bm-card.current').click(); // 167 BCE as HAS
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(400);

console.log('== the era states its objectives ==');
await page.locator('.tb-flag').click();
await page.waitForSelector('#nation-panel:not(.hidden)');
const objRows = await page.locator('.np-objective').count();
ok(objRows >= 3, 'objectives listed in the realm panel: ' + objRows + ' lines');
const objTxt = (await page.locator('[data-ref="objectivesBlock"]').textContent()) || '';
ok(/Win:/.test(objTxt) && /Lose:/.test(objTxt), 'wins and losses named');
await page.screenshot({ path: OUT + 'v33-objectives.png', clip: { x: 0, y: 40, width: 400, height: 560 } });
await page.keyboard.press('Escape');

console.log('== H is for help ==');
await page.keyboard.press('h');
await page.waitForSelector('#help-modal:not(.hidden)');
const helpTxt = (await page.locator('#help-modal').textContent()) || '';
ok(/How to Play/.test(helpTxt) && /realm panel/.test(helpTxt), 'the primer opens on H');
await page.screenshot({ path: OUT + 'v33-help.png' });
await page.keyboard.press('Escape');
ok(await page.evaluate(() => document.getElementById('help-modal').classList.contains('hidden')), 'Escape closes it');

console.log('== the battle window offers withdrawal ==');
await page.evaluate(() => {
  const ctx = window._ctx;
  const g = ctx.game;
  ctx.helpers.spawnArmy(ctx, 'HAS', 'Emmaus', { inf: 2, name: 'Doomed Band' });
  ctx.helpers.spawnArmy(ctx, 'SEL', 'Emmaus', { inf: 8, name: 'Iron Phalanx' });
  const mine = Object.values(g.armies).find((a) => a.name === 'Doomed Band');
  const theirs = Object.values(g.armies).find((a) => a.name === 'Iron Phalanx');
  const war = g.wars.find((w) => (w.attackers.concat(w.defenders)).indexOf('HAS') >= 0);
  g.battles.push({ prov: mine.prov, atk: [theirs.id], def: [mine.id], day: 2, warId: war && war.id });
  mine.inBattle = true;
  theirs.inBattle = true;
  window._doomedId = mine.id;
});
await page.evaluate(() => {
  const ctx = window._ctx;
  const mine = ctx.game.armies[window._doomedId];
  ctx.bus.emit('mapclick', { provId: mine.prov, armyId: null });
});
// open the battle window through the sim-facing path used by the outliner
await page.evaluate(() => window._ctx.bus.emit('war', {}));
await page.waitForTimeout(300);
await page.locator('#outliner [data-battle]').first().click();
await page.waitForSelector('#battle-modal:not(.hidden)');
ok((await page.locator('[data-ref="withdraw"]').count()) === 1, 'the Withdraw button stands');
await page.locator('[data-ref="withdraw"]').click();
await page.waitForTimeout(300);
const after = await page.evaluate(() => {
  const a = window._ctx.game.armies[window._doomedId];
  return { retreating: !!(a && a.retreating), inBattle: !!(a && a.inBattle) };
});
ok(after.retreating && !after.inBattle, 'the band quits the field shattered');

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
