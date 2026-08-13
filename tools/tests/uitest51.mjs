// UI verification §242: the structures mapmode, in a browser.
//
// The headless half is smoke163, which owns the arithmetic — the palette, the
// ranking, the stripes. This is the half only a browser can answer:
//
//   1. The button is in the bar, carries a glyph, lights when clicked, and
//      actually repaints the map. A mode missing from MODE_PARAMS falls
//      through to political silently, and the only symptom is a map that
//      looks fine and is the wrong map.
//   2. The province panel answers on SOMEBODY ELSE'S ground. This is the
//      change that makes the mode readable: before it, the Buildings block
//      refused for every province the player did not own and control, so a
//      colour on the map had nowhere to be looked up. It has to appear with
//      the chips and WITHOUT the build grid — an "offer" to build on Egypt's
//      airfield would be a worse bug than the one being fixed.
//   3. And it still hides itself on bare ground, or every empty province on
//      the map sprouts a "Nothing yet built" row.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/opt/node22/lib') + '/');
const { chromium } = require('playwright');
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 480000);
const OUT = (process.env.JU_OUT || '/tmp') + '/';

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
// 1948 — the one chapter that opens with both ports and runways seeded, and
// with most of them in somebody else's hands, which is what §2 below needs.
await pickBookmark(page, 'Independence');
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(600);

console.log('== the button is in the bar and repaints the map ==');
{
  const btn = page.locator('.mm-btn[data-mode="structures"]');
  ok(await btn.count() === 1, 'the mapmode bar has a button for the works');
  ok(await btn.locator('svg').count() === 1, 'and the button carries a real glyph');
  ok(await page.locator('.mm-btn').count() === 11, 'eleven buttons in the bar now');
  await btn.click();
  await page.waitForTimeout(600);
  ok(await btn.evaluate((e) => e.classList.contains('active')), 'clicking it lights the button');

  // Ask the sim for the mode's own colours rather than screen-scraping the
  // canvas: a map identical to the political one would mean the mode fell
  // through, which is the silent failure MODE_PARAMS registration prevents.
  const spread = await page.evaluate(async () => {
    const mm = await import('/js/map/mapmodes.js');
    const ctx = window._ctx;
    const r = mm.computeMapmodeColors(ctx, 'structures');
    const pol = mm.computeMapmodeColors(ctx, 'political');
    const key = (a, i) => a[i * 4] + ',' + a[i * 4 + 1] + ',' + a[i * 4 + 2];
    const n = ctx.game.provinces.length - 1;
    const uniq = new Set();
    let differs = 0;
    for (let i = 1; i <= n; i++) {
      uniq.add(key(r.primary, i));
      if (key(r.primary, i) !== key(pol.primary, i)) differs++;
    }
    const byName = {};
    ctx.game.provinces.forEach((p, i) => { if (p) byName[p.canon] = i; });
    return {
      uniq: uniq.size, differs,
      haifa: key(r.primary, byName.Dora),      // a shipyard
      cairo: key(r.primary, byName.Memphis),   // an airfield, and not ours
      empty: key(r.primary, byName.Neapolis),  // ground with nothing on it
    };
  });
  ok(spread.uniq >= 6, 'it paints ' + spread.uniq + ' distinct shades, not one flat colour');
  ok(spread.differs > 200, 'and differs from the political map on ' + spread.differs + ' provinces');
  ok(spread.haifa !== spread.empty, 'Haifa\'s harbor does not read like bare ground');
  ok(spread.cairo !== spread.haifa, 'and a runway does not read like a harbor');
  await page.screenshot({ path: OUT + 'v242-structures.png' });
  ok(true, 'the structures map renders (screenshot)');
}

console.log('== the panel answers on somebody else\'s ground ==');
{
  // Click Cairo through the sim rather than hunting for its pixels: the test
  // is about what the panel does with a foreign province, not about hit-testing.
  const foreign = await page.evaluate(() => {
    const ctx = window._ctx;
    const g = ctx.game;
    let id = 0;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.owner === g.playerTag || p.impassable) continue;
      if (Array.isArray(p.buildings) && p.buildings.length) { id = i; break; }
    }
    if (id) ctx.bus.emit('mapclick', { provId: id, armyId: null });
    return id ? { id, name: g.provinces[id].name, owner: g.provinces[id].owner,
      works: g.provinces[id].buildings.slice() } : null;
  });
  ok(foreign && foreign.id > 0, 'a foreign province with works exists: '
    + (foreign ? foreign.name + ' (' + foreign.owner + ', ' + foreign.works.join('+') + ')' : 'none'));
  await page.waitForTimeout(500);
  await page.waitForSelector('#province-panel:not(.hidden)');
  const block = page.locator('#province-panel [data-ref="buildBlock"]');
  ok(await block.isVisible(), 'the Buildings block opens on it — before §242 it refused');
  ok(await block.locator('.pp-bchip').count() >= 1,
    'and shows a chip for what stands there');
  ok(await page.locator('#province-panel [data-ref="buildBtns"] .pp-build-btn').count() === 0,
    'with no build buttons — raising something on Egypt\'s ground is not on offer');
  await page.screenshot({ path: OUT + 'v242-foreign-works.png' });
}

console.log('== and stays out of the way where there is nothing to say ==');
{
  const bare = await page.evaluate(() => {
    const ctx = window._ctx;
    const g = ctx.game;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.owner === g.playerTag || p.impassable || p.owner === 'WASTE') continue;
      if ((!p.buildings || !p.buildings.length) && !p.construction) {
        ctx.bus.emit('mapclick', { provId: i, armyId: null });
        return { id: i, name: p.name };
      }
    }
    return null;
  });
  ok(bare && bare.id > 0, 'a foreign province with nothing built exists: ' + (bare ? bare.name : 'none'));
  await page.waitForTimeout(500);
  ok(!(await page.locator('#province-panel [data-ref="buildBlock"]').isVisible()),
    'the block hides itself there rather than printing "Nothing yet built" across the map');
}

ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));

await browser.close();
console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
