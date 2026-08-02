// UI verification — recognition instead of alliance (SPEC §96), the pressure
// short of war (SPEC §100), the crisis panel (SPEC §98) and the modern
// Greek banner (SPEC §97): in a real 1948 browser the Offer Alliance button
// refuses an Arab capital in the bookmark's own words, the Recognize button
// appears beside it, waits for the coalition war to be settled, signs when it
// is, flips to Withdraw Recognition, and takes the Declare War button with it.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/opt/node22/lib') + '/');
const { chromium } = require('playwright');
// SPEC §160: the start screen is gated on the province raster — main.js awaits
// initRenderer() and computeGeometry() before showStartScreen() — and that pass
// is one fullscreen draw over every texel against every seed. At the frame that
// reaches Britain it is 25.0M x 307, about five times the pre-§160 work, and
// these suites run on SwiftShader. Measured: 74s to the carousel against 17s
// before. Every wait after it is unaffected (the nation cards land ~1s later),
// so this one constant is the whole of the change.
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 480000);

const OUT = (process.env.JU_OUT || '/tmp') + '/';

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
for (let i = 0; i < 10; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('War of Independence')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click(); // ISR
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(600);

// Open the province panel on an Egyptian province — the diplomacy block is
// addressed to that province's owner.
const opened = await page.evaluate(() => {
  const ctx = window._ctx;
  const p = ctx.game.provinces.find((q) => q && q.owner === 'EGY' && !q.impassable);
  if (!p) return null;
  ctx.bus.emit('mapclick', { provId: p.id, armyId: null });
  return p.name;
});
ok(!!opened, 'a province of Egypt is selected: ' + opened);
await page.waitForSelector('#province-panel:not(.hidden)');
await page.waitForSelector('#province-panel .pp-diplo-btns');
await page.waitForTimeout(300);

const read = () => page.evaluate(() => {
  const q = (sel) => document.querySelector('#province-panel ' + sel);
  const ally = q('[data-dip="ally"]'), rec = q('[data-dip="recognize"]'), war = q('[data-dip="war"]');
  const state = (b) => (b ? {
    hidden: b.classList.contains('hidden'),
    disabled: b.classList.contains('disabled'),
    on: b.classList.contains('pp-dip-on'),
    text: b.textContent.trim(),
    tt: b.dataset.tt || '',
  } : null);
  return { ally: state(ally), rec: state(rec), war: state(war) };
});

console.log('== the pact that is never signed ==');
{
  const s = await read();
  ok(s.ally && !s.ally.hidden && s.ally.disabled, 'Offer Alliance is present and refused');
  ok(/No Arab state/.test(s.ally.tt), 'and it says why in the bookmark\'s words');
  ok(s.rec && !s.rec.hidden, 'the Recognize button is offered in its place');
  ok(s.rec.disabled && /wider war/.test(s.rec.tt),
    'but waits while the opening coalition war runs');
}

console.log('== the letters, signed in a real browser ==');
{
  // Settle the invasion war and put the influence on the table, exactly as a
  // campaign that reached the armistice would have done.
  await page.evaluate(async () => {
    const ctx = window._ctx;
    const { endWarBySword } = await import('./js/sim/military.js');
    for (const w of (ctx.game.wars || []).slice()) endWarBySword(ctx, w, null);
    ctx.game.wars.length = 0;
    for (const t of Object.values(ctx.game.tags)) if (t) t.atWarWith = [];
    ctx.game.truces = {};
    ctx.game.tags.ISR.points.infl = 400;
    ctx.game.tags.EGY.opinion = { ISR: 40 };
    ctx.bus.emit('mapclick', { provId: ctx.game.ui.selectedProv, armyId: null });
  });
  await page.waitForTimeout(400);
  let s = await read();
  ok(s.rec && !s.rec.disabled && /letters of recognition/i.test(s.rec.tt),
    'with the war settled the letters are available');
  await page.locator('#province-panel [data-dip="recognize"]').click();
  await page.waitForTimeout(400);
  s = await read();
  ok(s.rec.on && /Withdraw Recognition/i.test(s.rec.text),
    'the button flips to the withdrawal');
  ok(s.war && s.war.disabled && /recogni/i.test(s.war.tt),
    'and Declare War is refused while the papers hold');
  const signed = await page.evaluate(() => {
    const r = window._ctx.game.recognitions || {};
    return Object.keys(r);
  });
  ok(signed.indexOf('EGY|ISR') >= 0, 'the campaign records the recognition: ' + signed.join(','));
  await page.screenshot({ path: OUT + 'recognition-panel.png' });
}

console.log('== the pressure short of war (SPEC §100) ==');
{
  // The panel is still addressed to Egypt; close the markets from the button.
  await page.evaluate(() => {
    const ctx = window._ctx;
    ctx.bus.emit('mapclick', { provId: ctx.game.ui.selectedProv, armyId: null });
  });
  await page.waitForTimeout(300);
  const before = await page.evaluate(async () => {
    const { incomeBreakdown } = await import('./js/sim/economy.js');
    return incomeBreakdown(window._ctx, 'EGY').trade;
  });
  let s = await page.evaluate(() => {
    const b = document.querySelector('#province-panel [data-dip="embargo"]');
    return b ? { hidden: b.classList.contains('hidden'), text: b.textContent.trim() } : null;
  });
  ok(s && !s.hidden && /Close Our Markets/i.test(s.text), 'the embargo button is offered in 1948');
  await page.locator('#province-panel [data-dip="embargo"]').click();
  await page.waitForTimeout(400);
  s = await page.evaluate(() => {
    const b = document.querySelector('#province-panel [data-dip="embargo"]');
    const u = document.querySelector('#province-panel [data-dip="unembargo"]');
    return {
      text: b.textContent.trim(),
      unhidden: u && !u.classList.contains('hidden'),
      book: Object.keys(window._ctx.game.embargoes || {}),
    };
  });
  ok(s.book.indexOf('ISR>EGY') >= 0, 'the campaign records the embargo: ' + s.book.join(','));
  ok(/Blockade Their Coast/i.test(s.text), 'the button escalates to the blockade');
  ok(s.unhidden, 'and the reopening button appears beside it');
  const after = await page.evaluate(async () => {
    const { incomeBreakdown } = await import('./js/sim/economy.js');
    return incomeBreakdown(window._ctx, 'EGY').trade;
  });
  ok(after < before, 'Egyptian trade income falls at once (' + before.toFixed(1) + ' → ' + after.toFixed(1) + ')');
  await page.locator('#province-panel [data-dip="unembargo"]').click();
  await page.waitForTimeout(300);
  const lifted = await page.evaluate(() => Object.keys(window._ctx.game.embargoes || {}));
  ok(lifted.indexOf('ISR>EGY') < 0, 'and lifting it takes it off the books');
}

console.log('== what is brewing (SPEC §98) ==');
{
  const shown = await page.evaluate(async () => {
    const ctx = window._ctx;
    const { stokeCrisis, monthlyCrises } = await import('./js/sim/crisis.js');
    // Israel's books go bad: the crisis clock does the rest.
    ctx.game.tags.ISR.treasury = -600;
    ctx.game.tags.ISR.loans = 5;
    for (let i = 0; i < 6; i++) monthlyCrises(ctx);
    document.querySelector('.tb-flag').click();
    return true;
  });
  ok(shown, 'the realm panel is opened after six months of debt');
  await page.waitForTimeout(500);
  const view = await page.evaluate(() => {
    const block = document.querySelector('#nation-panel [data-ref="crisesBlock"]');
    return {
      hidden: !block || block.classList.contains('hidden'),
      text: block ? block.textContent.replace(/\s+/g, ' ').trim() : '',
    };
  });
  ok(!view.hidden, 'the What Is Brewing block appears in the realm panel');
  ok(/Books|Pay Is Late|Creditors/i.test(view.text),
    'and names the crisis and its stage: ' + view.text.slice(0, 90));
}

console.log('== the banner over Athens ==');
{
  const grc = await page.evaluate(() => {
    const t = window._ctx.game.tags.GRC;
    return { name: t.name, flag: t.flag };
  });
  ok(grc.flag === 'GRC_MOD' && /Kingdom of Greece/.test(grc.name),
    '1948 Greece flies its modern flag: ' + grc.name + ' / ' + grc.flag);
  await page.keyboard.press('Escape'); // the realm panel is open from the crisis check
  await page.waitForTimeout(300);
  await page.keyboard.press('l');
  await page.waitForTimeout(600);
  // The chip is drawn from the same FLAGS entry wherever it appears; read it
  // where the panel is already open rather than fighting the ledger's timing.
  const chip = await page.evaluate(async () => {
    const { flagChip } = await import('./js/ui/icons.js');
    const { DEFINES } = await import('./js/data/defines.js');
    return flagChip('GRC', DEFINES, 20, false, window._ctx.game);
  });
  ok(/#1d4e9c/.test(chip), 'and its chip draws the blue-and-white, not the laurel wreath');
}

ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors[0] : ''));
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
await browser.close();
process.exit(failures ? 1 : 0);
