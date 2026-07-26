// UI verification — recognition instead of alliance (SPEC §96) and the modern
// Greek banner (SPEC §97): in a real 1948 browser the Offer Alliance button
// refuses an Arab capital in the bookmark's own words, the Recognize button
// appears beside it, waits for the coalition war to be settled, signs when it
// is, flips to Withdraw Recognition, and takes the Declare War button with it.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/opt/node22/lib') + '/');
const { chromium } = require('playwright');
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
await page.waitForSelector('.bm-card', { timeout: 20000 });
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

console.log('== the banner over Athens ==');
{
  const grc = await page.evaluate(() => {
    const t = window._ctx.game.tags.GRC;
    return { name: t.name, flag: t.flag };
  });
  ok(grc.flag === 'GRC_MOD' && /Kingdom of Greece/.test(grc.name),
    '1948 Greece flies its modern flag: ' + grc.name + ' / ' + grc.flag);
  await page.keyboard.press('l');
  await page.waitForSelector('#ledger-modal');
  await page.waitForTimeout(300);
  const chip = await page.evaluate(() => {
    const el = document.querySelector('#ledger-modal [data-open-tag="GRC"]');
    return el ? el.innerHTML : '';
  });
  ok(/#1d4e9c/.test(chip), 'and the ledger chip draws the blue-and-white, not the laurel wreath');
}

ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors[0] : ''));
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
await browser.close();
process.exit(failures ? 1 : 0);
