// UI verification — SPEC §218 and §219: a crown of its own, and the collar
// struck off again, in a real browser.
//
// The headless suites (smoke145, smoke146) prove the arithmetic and the gates.
// This one proves the five things only a browser can — the last of them on the
// very client the earlier sections make, which is why both sections live in
// one suite and one boot:
//
//   1. The block is ABSENT where the question does not arise — on a province
//      of our own people and on the capital — and present on foreign ground,
//      naming the state, its towns, its development and its price.
//   2. The refusal is carried in words on the button rather than by a control
//      that silently does nothing.
//   3. Two taps, not one: the first arms the button and says so, and the
//      second is what actually hands the province away.
//   4. After the grant the province answers to a court that answers to us —
//      and the block is gone from a province that is no longer ours.
//   5. That client's own panel then carries Release Them beside Incorporate,
//      arms on the first press and lets go on the second (SPEC §219).
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/opt/node22/lib') + '/');
const { chromium } = require('playwright');
// SPEC §160/§205: the start screen is gated on the province-raster pass, which
// runs on SwiftShader here. This one constant is the whole of that cost.
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

// 167 BCE, the Hasmoneans: the chapter that ends holding other people's towns.
for (let i = 0; i < 12; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Maccabean')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(600);

// The realm a century of campaigning leaves: everything of the faith, the
// Phoenician coast, and peace to think in.
const setup = await page.evaluate(() => {
  const ctx = window._ctx;
  const g = ctx.game;
  g.wars.length = 0;
  for (const k of Object.keys(g.tags)) if (g.tags[k]) g.tags[k].atWarWith = [];
  const take = (p) => { p.owner = 'HAS'; p.controller = 'HAS'; p.autonomy = 0.6; p.integration = 0; };
  const named = {};
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    if (p.religion === 'judaism') take(p);
    if (['Ptolemais', 'Tyre', 'Sidon', 'Dora'].indexOf(p.name) >= 0) take(p);
    if (['Ptolemais', 'Jerusalem', 'Jericho'].indexOf(p.name) >= 0) named[p.name] = p.id;
  }
  g.tags.HAS.points.infl = 900;
  return named;
});
ok(!!setup.Ptolemais && !!setup.Jerusalem && !!setup.Jericho, 'the realm is set: coast, capital and home country');

const select = async (id) => {
  await page.evaluate((provId) => window._ctx.bus.emit('mapclick', { provId, armyId: null }), id);
  await page.waitForSelector('#province-panel:not(.hidden)');
  await page.waitForTimeout(250);
};
const readBlock = () => page.evaluate(() => {
  const block = document.querySelector('#province-panel [data-ref="releaseBlock"]');
  if (!block || block.classList.contains('hidden')) return null;
  const btn = block.querySelector('[data-release]');
  return {
    title: (block.querySelector('.pp-build-title') || {}).textContent || '',
    row: (block.querySelector('[data-ref="releaseRow"]') || {}).textContent || '',
    label: (block.querySelector('[data-ref="releaseLabel"]') || {}).textContent || '',
    disabled: !!(btn && btn.classList.contains('disabled')),
    armed: !!(btn && btn.classList.contains('pp-build-sure')),
    tt: (btn && btn.dataset.tt) || '',
  };
});
const press = async () => {
  await page.locator('#province-panel [data-release]').click();
  await page.waitForTimeout(250);
};

console.log('== the block appears where the question arises, and nowhere else ==');
{
  await select(setup.Jericho);
  ok((await readBlock()) === null, 'no block on a province of our own people');
  await select(setup.Jerusalem);
  ok((await readBlock()) === null, 'and none on the capital — a realm does not behead itself');

  await select(setup.Ptolemais);
  const b = await readBlock();
  ok(!!b, 'the Phoenician coast carries one');
  ok(b && /Crown of Its Own/i.test(b.title), 'titled in the game\'s own words: ' + (b && b.title));
  ok(b && /Ptolemais/.test(b.row) && /dev/.test(b.row) && /infl/.test(b.row),
    'the row names the state, its towns and what it costs: ' + (b && b.row.replace(/\s+/g, ' ')));
  ok(b && !b.disabled && /Release as a Client Kingdom/i.test(b.label), 'and the verb is live');
  ok(b && /15% of its income/.test(b.tt) && /NO infamy/.test(b.tt) && /chancery seat/.test(b.tt),
    'the terms say what the bond is, and what it is not');
}

console.log('== a refusal is carried in words ==');
{
  await page.evaluate(() => { window._ctx.game.tags.HAS.points.infl = 0; });
  await select(setup.Ptolemais);
  const b = await readBlock();
  ok(b && b.disabled && /influence points/.test(b.tt),
    'a crown with no influence is refused on the button: ' + (b && b.tt.split('\n')[0]));
  await press();
  const stillOurs = await page.evaluate((id) => window._ctx.game.provinces[id].owner, setup.Ptolemais);
  ok(stillOurs === 'HAS', 'and pressing a refused button hands over nothing');
  await page.evaluate(() => { window._ctx.game.tags.HAS.points.infl = 900; });
}

console.log('== two taps, not one ==');
{
  await select(setup.Ptolemais);
  await press();
  const armed = await readBlock();
  ok(armed && armed.armed && /Let it go for good\?/i.test(armed.label),
    'the first tap arms it and says so: ' + (armed && armed.label));
  ok(armed && /Tap again/.test(armed.tt), 'with the second tap explained');
  const untouched = await page.evaluate((id) => window._ctx.game.provinces[id].owner, setup.Ptolemais);
  ok(untouched === 'HAS', 'and nothing has moved yet');

  await press();
  const after = await page.evaluate((id) => {
    const g = window._ctx.game;
    const p = g.provinces[id];
    const t = g.tags[p.owner] || {};
    return {
      owner: p.owner, autonomy: p.autonomy, overlord: t.overlord,
      name: t.name, ruler: t.ruler && t.ruler.name, title: t.ruler && t.ruler.title,
      infl: g.tags.HAS.points.infl,
      toast: [...document.querySelectorAll('.toast .toast-title')].map((n) => n.textContent).join(' | '),
    };
  }, setup.Ptolemais);
  ok(after.owner !== 'HAS' && after.overlord === 'HAS',
    'the second tap seats the crown: ' + after.name + ' under ' + after.title + ' ' + after.ruler);
  ok(after.autonomy <= 0.25, 'the town governs itself now (autonomy ' + after.autonomy + ')');
  ok(after.infl < 900, 'the influence is spent (' + after.infl + ' left)');
  ok(/crown of its own/i.test(after.toast), 'and the toast says so: ' + after.toast);
  await page.screenshot({ path: OUT + 'release-client.png' });
}

console.log('== and it is gone from ground that is no longer ours ==');
{
  await select(setup.Ptolemais);
  ok((await readBlock()) === null, 'no block on a province we have given away');
  const diplo = await page.evaluate(() => {
    const d = document.querySelector('#province-panel [data-ref="diploBlock"]');
    return d && !d.classList.contains('hidden')
      ? (document.querySelector('#province-panel [data-ref="dipStatus"]') || {}).textContent || '' : '';
  });
  ok(/client kingdom/i.test(diplo), 'the diplomacy block calls it what it is: ' + diplo);
}

// SPEC §219 — and the way back out, on the same client this suite just made.
console.log('== the collar comes off from the same block it was fastened in ==');
{
  const readFree = () => page.evaluate(() => {
    const b = document.querySelector('#province-panel [data-dip="free"]');
    if (!b || b.classList.contains('hidden')) return null;
    return {
      text: b.textContent.trim(),
      disabled: b.classList.contains('disabled'),
      armed: b.classList.contains('pp-dip-sure'),
      tt: b.dataset.tt || '',
      // it must sit beside Incorporate, not somewhere else in the panel
      afterIncorporate: !!(document.querySelector('#province-panel [data-dip="incorporate"]')
        && (document.querySelector('#province-panel [data-dip="incorporate"]')
          .compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)),
    };
  });
  await select(setup.Ptolemais);
  let f = await readFree();
  ok(!!f && !f.disabled, 'the client\'s own panel carries Release Them');
  ok(f && f.afterIncorporate, 'beside Incorporate, which is the verb it mirrors');
  ok(f && /costs nothing, because the price is the client/.test(f.tt)
    && /answers to nobody/.test(f.tt) && /seat back/.test(f.tt),
    'and the terms say what goes, what it costs and what comes back');

  await page.locator('#province-panel [data-dip="free"]').click();
  await page.waitForTimeout(250);
  f = await readFree();
  ok(f && f.armed && /Let them go for good\?/i.test(f.text), 'the first press arms it: ' + (f && f.text));
  const held = await page.evaluate((id) => {
    const g = window._ctx.game;
    return (g.tags[g.provinces[id].owner] || {}).overlord;
  }, setup.Ptolemais);
  ok(held === 'HAS', 'and the collar is still on');

  await page.locator('#province-panel [data-dip="free"]').click();
  await page.waitForTimeout(350);
  const out = await page.evaluate((id) => {
    const g = window._ctx.game;
    const p = g.provinces[id];
    const t = g.tags[p.owner] || {};
    return {
      overlord: t.overlord, owner: p.owner, name: t.name,
      freedBy: t.freedBy && t.freedBy.by,
      clients: Object.keys(g.tags).filter((k) => g.tags[k] && g.tags[k].alive && g.tags[k].overlord === 'HAS'),
      status: (document.querySelector('#province-panel [data-ref="dipStatus"]') || {}).textContent || '',
      toast: [...document.querySelectorAll('.toast .toast-title')].map((n) => n.textContent).join(' | '),
    };
  }, setup.Ptolemais);
  ok(out.overlord === null || out.overlord === undefined,
    'the second press strikes it: ' + out.name + ' answers to nobody');
  ok(out.owner !== 'HAS' && out.clients.length === 0, 'they keep their land and we keep no client');
  ok(out.freedBy === 'HAS', 'and the campaign remembers whose hand did it');
  ok(/crown released/i.test(out.toast), 'the toast says so: ' + out.toast);
  ok(!/client kingdom/i.test(out.status), 'the status line stops calling them ours: ' + out.status);
  ok((await readFree()) === null, 'and the verb is gone — there is no collar to strike twice');
  await page.screenshot({ path: OUT + 'free-client.png' });
}

ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 2).join(' / ') : ''));

await browser.close();
console.log(failures ? '\n' + failures + ' FAIL' : '\nALL PASS');
process.exit(failures ? 1 : 0);
