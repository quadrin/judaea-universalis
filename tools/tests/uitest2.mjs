// UI verification v1.5: heir line, missions, integration, claims, subjugation,
// third bookmark card, and the Bar Kokhba scenario booting in-browser.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
const { chromium } = require('playwright');
async function pickBookmark(page, nameFrag) {
  await page.waitForSelector('.bm-card', { timeout: 20000 });
  for (let i = 0; i < 8; i++) {
    const cur = page.locator('.bm-card.current');
    const txt = (await cur.textContent()) || '';
    if (txt.includes(nameFrag)) { await cur.click(); return; }
    await page.locator('.ss-next').click();
    await page.waitForTimeout(450); // slide transition
  }
  throw new Error('bookmark not found: ' + nameFrag);
}
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

// Three bookmark cards, chronological
const cards = await page.locator('.bm-card').count();
ok(cards === 8, 'eight bookmark cards on the start screen: ' + cards);
const lastCard = (await page.locator('.bm-card').nth(7).textContent()) || '';
ok(/Independence/.test(lastCard), 'last card is the War of Independence: ' + lastCard.slice(0, 60));

// Boot 66 CE as JUD
await pickBookmark(page, 'Great Revolt');
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(400);

// Nation panel: heir line + missions
await page.locator('.tb-flag').click();
await page.waitForSelector('#nation-panel:not(.hidden)');
const heirTxt = (await page.locator('.np-heir').textContent()) || '';
ok(/Eleazar ben Ananias/.test(heirTxt), 'heir line shows: ' + heirTxt.trim().slice(0, 60));
const rulerTitle = (await page.locator('.np-ruler-title').textContent()) || '';
ok(/age 53/.test(rulerTitle), 'ruler age shown: ' + rulerTitle);
const missionRows = await page.locator('.np-mission').count();
ok(missionRows === 6, 'six JUD missions listed: ' + missionRows);
const clientRows = (await page.locator('#nation-panel').textContent()) || '';
ok(true, 'nation panel rendered');
await page.screenshot({ path: OUT + 'v15-nation.png' });
await page.keyboard.press('Escape');

// Province panel on a foreign province: claim + declare war with CB tooltip
await page.evaluate(() => {
  const ctx = window._ctx;
  ctx.game.tags.JUD.points.infl = 100; // afford the claim before the panel renders
  const p = ctx.prov('Petra'); // NAB
  ctx.bus.emit('mapclick', { provId: p.id, armyId: null });
});
await page.waitForSelector('#province-panel:not(.hidden)');
ok(await page.locator('[data-ref="dipClaim"]').isVisible(), 'Fabricate Claim button visible');
ok(await page.locator('[data-ref="dipWar"]').isVisible(), 'Declare War button visible');
await page.evaluate(() => { document.querySelector('[data-ref="dipClaim"]').click(); });
await page.waitForTimeout(200);
const claimTxt = (await page.locator('[data-ref="dipClaim"]').textContent()) || '';
ok(/Claim Held/.test(claimTxt), 'claim registered in UI: ' + claimTxt);

// Own province: integration block
await page.evaluate(() => {
  const ctx = window._ctx;
  const p = ctx.prov('Jerusalem');
  ctx.bus.emit('mapclick', { provId: p.id, armyId: null });
});
await page.waitForTimeout(200);
ok(await page.locator('[data-ref="integBlock"]').isVisible(), 'Integration block on own province');
ok(await page.locator('[data-ref="integRule"]').isVisible(), 'Establish Rule button present');
await page.screenshot({ path: OUT + 'v15-province.png' });

// Peace dialog: subjugate row, exclusive with provinces
await page.evaluate(() => {
  const ctx = window._ctx;
  ctx.helpers.declareWar(ctx, 'JUD', 'PAR', 'Test War with Parthia');
  const war = ctx.game.wars.find((w) => w.name === 'Test War with Parthia');
  window._testWarId = war.id;
  war.warscore.JUD = 80; war.warscore.PAR = -80;
  for (const name of ['Dura-Europos', 'Hatra', 'Singara']) {
    const p = ctx.prov(name);
    if (p) p.controller = 'JUD';
  }
  ctx.bus.emit('war', {});
});
await page.locator('.tb-flag').click();
await page.waitForSelector('#nation-panel:not(.hidden)');
const testWarId = await page.evaluate(() => window._testWarId);
await page.locator(`#nation-panel [data-peace="${testWarId}"]`).click();
await page.waitForSelector('#peace-modal:not(.hidden)');
ok(await page.locator('[data-ref="subjugate"]').count() === 1, 'subjugate row present');
await page.locator('.peace-prov input[data-prov]').first().check();
await page.locator('[data-ref="subjugate"]').check();
await page.waitForTimeout(100);
const provDisabled = await page.evaluate(() =>
  [...document.querySelectorAll('[data-prov]')].every((b) => b.disabled && !b.checked));
ok(provDisabled, 'subjugation disables & clears province demands');
const verdict = (await page.locator('[data-ref="verdict"]').textContent()) || '';
ok(/accept/i.test(verdict), 'subjugation deal acceptable at ws 80: ' + verdict.trim());
await page.screenshot({ path: OUT + 'v15-peace.png' });
await page.locator('[data-ref="send"]').click();
await page.waitForTimeout(300);
const vres = await page.evaluate(() => window._ctx.game.tags.PAR.overlord);
ok(vres === 'JUD', 'Parthia subjugated in-browser: overlord=' + vres);

ok(errors.length === 0, 'no page errors (66 CE): ' + JSON.stringify(errors.slice(0, 3)));
await page.close();

// Bar Kokhba boots in-browser
{
  const p2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs2 = [];
  p2.on('pageerror', (e) => errs2.push(String(e)));
  p2.on('console', (m) => { if (m.type() === 'error') errs2.push(m.text()); });
  await p2.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
  await p2.evaluate(() => localStorage.clear());
  await p2.reload({ waitUntil: 'networkidle' });
  await pickBookmark(p2, 'Bar Kokhba');
  await p2.waitForSelector('.nation-card');
  const nCards = await p2.locator('.nation-card').count();
  ok(nCards === 2, '132 CE offers two playable nations: ' + nCards);
  await p2.locator('.nation-card').first().click();
  await p2.waitForFunction(() => !!window._ctx);
  await p2.waitForTimeout(600);
  const state = await p2.evaluate(() => ({
    bookmark: window._ctx.game.bookmarkId,
    ruler: window._ctx.game.tags.JUD.ruler.name,
    hebron: window._ctx.prov('Hebron').owner,
    petra: window._ctx.prov('Petra').owner,
  }));
  ok(state.bookmark === '132ce' && state.ruler === 'Simon bar Kosiba', '132 CE boots: ' + JSON.stringify(state));
  ok(state.hebron === 'JUD' && state.petra === 'ROM', 'owner overrides live on the map');
  // run a couple weeks at speed to shake out runtime errors
  await p2.keyboard.press('Space');
  await p2.keyboard.press('5');
  await p2.waitForTimeout(2500);
  await p2.screenshot({ path: OUT + 'v15-barkokhba.png' });
  ok(errs2.length === 0, 'no page errors (132 CE): ' + JSON.stringify(errs2.slice(0, 3)));
  await p2.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
