// UI verification — SPEC §175: the realm panel's tab strip, the seat buttons
// that were clipped, and the dispersion mapmode.
//
// Three things a headless suite cannot check, because all three are about
// layout and hit-testing rather than about data:
//
//   1. A tab actually hides the other tabs' sections, the pinned header does
//      NOT move when you switch, and switching does not eat the click or
//      detach the panel's refs (which would silently stop it updating).
//   2. The High Priesthood's candidate buttons are wide enough for their
//      labels. This is the bug that started the section: they wore a 26px
//      icon-square class and 'The Priesthood' rendered as about three letters,
//      clipped at BOTH ends because the base class centres its content.
//      Measured here as scrollWidth vs clientWidth, which is the only honest
//      test of "is this text cut off".
//   3. The diaspora button is in the bar, switches the map, and paints the
//      communities rather than leaving the whole board one colour.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 480000);

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
// 66 CE — the chapter with a standing Temple, so the Faith tab and the High
// Priesthood's candidate buttons are on the board to be measured. The carousel
// is walked the way every other suite walks it: `data-bm` is a slide index,
// not a chapter id.
for (let i = 0; i < 10; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(500);

console.log('== the panel opens on a tab strip ==');
await page.locator('.tb-flag').click();
await page.waitForSelector('#nation-panel:not(.hidden)');
const tabs = await page.locator('#nation-panel .np-tab').allTextContents();
ok(tabs.length >= 5, 'the strip carries ' + tabs.length + ' tabs: ' + tabs.join(' · '));
ok(await page.getAttribute('#nation-panel', 'data-tab') === 'crown',
  'and opens on Crown');
ok(await page.locator('#nation-panel .np-tab.active').count() === 1,
  'exactly one tab is lit');

console.log('== a tab shows its own sections and hides the rest ==');
{
  // Crown owns Religion; Court owns the Estates; neither may be on screen at
  // the same time as the other, which is the whole point of the exercise.
  const religion = page.locator('#nation-panel [data-ref="religion"]');
  const estates = page.locator('#nation-panel [data-ref="factionsBlock"]');
  ok(await religion.isVisible(), 'Crown: the religion row is on screen');
  ok(!(await estates.isVisible()), '  and the Estates are not');

  await page.locator('#nation-panel .np-tab[data-tab-go="court"]').click();
  await page.waitForTimeout(150);
  ok(await page.getAttribute('#nation-panel', 'data-tab') === 'court', 'Court opens');
  ok(await estates.isVisible(), '  the Estates are on screen');
  ok(!(await religion.isVisible()), '  and the religion row is not');

  // The pinned header must NOT move — that is what makes tabs an improvement
  // rather than a shell game.
  const ruler = page.locator('#nation-panel .np-ruler-name');
  const vitals = page.locator('#nation-panel .np-vitals');
  const levers = page.locator('#nation-panel [data-ref="acts"]');
  ok(await ruler.isVisible() && await vitals.isVisible() && await levers.isVisible(),
    'the ruler, the four numbers and the levers stay put across a switch');
  const vitalCount = await page.locator('#nation-panel .np-vital').count();
  ok(vitalCount === 4, 'four pinned numbers: ' + vitalCount);
}

console.log('== the ideas are split by what unlocks them (SPEC §198) ==');
{
  // The reform trees are the realm's own constitution and live on Crown; the
  // Ideas of the Age are each locked behind a named rung and keep the
  // Technology screen, where the lock card and the ladder that answers it
  // share a window. A bounding box is the only honest answer to "which
  // screen".
  const reforms = page.locator('#nation-panel [data-ref="reforms"]');
  const eras = page.locator('#nation-panel [data-ref="eraIdeasBlock"]');
  const tech = page.locator('#nation-panel [data-ref="tech"]');
  await page.locator('#nation-panel .np-tab[data-tab-go="crown"]').click();
  await page.waitForTimeout(150);
  ok(await reforms.isVisible(), 'Crown shows the reform trees');
  ok(!(await eras.isVisible()), '  and not the Ideas of the Age');
  const buys = await page.locator('#nation-panel [data-idea]:visible').count();
  ok(buys === 3, '  the three trees keep their buy buttons here: ' + buys);

  await page.locator('#nation-panel .np-tab[data-tab-go="tech"]').click();
  await page.waitForTimeout(150);
  ok(await tech.isVisible() && await eras.isVisible(),
    'Technology shows the ladders and the Ideas of the Age together');
  ok(!(await reforms.isVisible()), '  and not the reform trees');
  const boxes = await page.evaluate(() => {
    const r = (s) => document.querySelector('#nation-panel [data-ref="' + s + '"]').getBoundingClientRect();
    return { tech: r('tech').top, eras: r('eraIdeas').top };
  });
  ok(boxes.eras > boxes.tech, 'and the era ideas are drawn BELOW the ladders that unlock them');
  ok(await page.locator('#nation-panel [data-ref="eraIdeas"] .np-reform, #nation-panel [data-ref="eraIdeas"] .np-era-locked').count() >= 1,
    'the chapter\'s curriculum is on the board (open groups or lock cards)');
}

console.log('== the last three sections are filed by what they are (SPEC §203) ==');
{
  // The tab strip says Technology, not Coin.
  const strip = await page.locator('#nation-panel .np-tab').allTextContents();
  ok(strip.some((s) => /technology/i.test(s)) && !strip.some((s) => /^coin$/i.test(s)),
    'the strip reads ' + strip.join(' · '));

  // The needles are a portrait of the realm, so they hang on Crown — with
  // the realm's own facts above them and the constitution below.
  const character = page.locator('#nation-panel [data-ref="doctrineBlock"]');
  await page.locator('#nation-panel .np-tab[data-tab-go="crown"]').click();
  await page.waitForTimeout(150);
  ok(await character.isVisible(), 'Crown shows The Character of the Realm');
  const axes = await page.locator('#nation-panel [data-ref="doctrine"] .np-dox').count();
  ok(axes >= 3, '  with its needles on the board: ' + axes);
  const crownOrder = await page.evaluate(() => {
    const r = (s) => document.querySelector('#nation-panel [data-ref="' + s + '"]').getBoundingClientRect();
    return { facts: r('religion').top, needles: r('doctrine').top, reforms: r('reforms').top };
  });
  ok(crownOrder.needles > crownOrder.facts && crownOrder.reforms > crownOrder.needles,
    '  drawn between the realm\'s facts and its reforms');

  await page.locator('#nation-panel .np-tab[data-tab-go="war"]').click();
  await page.waitForTimeout(150);
  ok(!(await character.isVisible()), 'the Host no longer carries it');
  ok(await page.locator('#nation-panel [data-ref="manpower"]').isVisible(),
    '  and still has its own numbers, so the tab did not go blank');

  // The world's way of doing things is a tax on the ladders, so it is filed
  // under them — inside the Ideas of the Age block, above the chapter's own.
  const inst = page.locator('#nation-panel [data-ref="instBlock"]');
  const ageBlock = page.locator('#nation-panel [data-ref="ageBlock"]');
  await page.locator('#nation-panel .np-tab[data-tab-go="world"]').click();
  await page.waitForTimeout(150);
  ok(!(await inst.isVisible()), 'The World no longer carries the institutions');
  ok(await page.locator('#nation-panel .pp-diplo').isVisible(),
    '  and keeps its treaties, so that tab did not go blank either');

  await page.locator('#nation-panel .np-tab[data-tab-go="tech"]').click();
  await page.waitForTimeout(150);
  ok(await ageBlock.isVisible(), 'Technology carries the age block');
  if (await inst.isVisible()) {
    const folded = await page.evaluate(() => {
      const r = (s) => document.querySelector('#nation-panel [data-ref="' + s + '"]').getBoundingClientRect();
      return {
        ladders: r('tech').bottom,
        inst: r('institutions').top,
        eras: r('eraIdeas').top,
        titles: document.querySelectorAll('#nation-panel [data-ref="ageBlock"] .pp-build-title').length,
        subs: document.querySelectorAll('#nation-panel [data-ref="ageBlock"] .np-age-sub').length,
      };
    });
    ok(folded.inst > folded.ladders, '  the institutions are drawn below the ladders they surcharge');
    ok(folded.eras > folded.inst, '  and the chapter\'s own ideas below them');
    ok(folded.titles === 1 && folded.subs === 2,
      '  one block title over two subheads: ' + folded.titles + '/' + folded.subs);
    ok(await page.locator('#nation-panel [data-ref="institutions"] .np-faction').count() >= 1,
      '  with the institutions themselves listed');
  } else {
    ok(true, '  (no institution has arisen in this chapter yet — nothing to fold)');
  }
}

console.log('== the chapter and the patterns follow the same rule (SPEC §204) ==');
{
  // A chapter is what history asks of this realm, so it sits with the tree
  // that asks the rest of it — not among the realm's own facts.
  const chapter = page.locator('#nation-panel [data-ref="chapterBlock"]');
  await page.locator('#nation-panel .np-tab[data-tab-go="crown"]').click();
  await page.waitForTimeout(150);
  ok(!(await chapter.isVisible()), 'Crown no longer carries The Chapters');
  ok(await page.locator('#nation-panel [data-ref="religion"]').isVisible()
    && await page.locator('#nation-panel [data-ref="reforms"]').isVisible(),
    '  and still has its facts and its reforms');

  await page.locator('#nation-panel .np-tab[data-tab-go="missions"]').click();
  await page.waitForTimeout(150);
  ok(await page.locator('#nation-panel [data-ref="missionsBlock"]').isVisible(),
    'Missions shows the tree');
  if (await chapter.isVisible()) {
    const order = await page.evaluate(() => {
      const r = (s) => document.querySelector('#nation-panel [data-ref="' + s + '"]').getBoundingClientRect();
      return { chapter: r('chapterBlock').top, tree: r('missionsBlock').top };
    });
    ok(order.tree > order.chapter, '  with the chapter above it — the century, then the era');
  } else {
    ok(true, '  (no chapter is running yet in this campaign)');
  }

  // The patterns, the milestones and the pipeline describe the army, so they
  // are drawn on the Host and no longer under the ladders that buy them.
  const patterns = page.locator('#nation-panel [data-ref="patternsBlock"]');
  await page.locator('#nation-panel .np-tab[data-tab-go="tech"]').click();
  await page.waitForTimeout(150);
  ok(!(await patterns.isVisible()), 'Technology no longer draws the patterns');
  ok(await page.locator('#nation-panel [data-ref="tech"] .np-ms').count() === 0,
    '  nor the milestone strip inside a ladder card');
  const marTip = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#nation-panel [data-ref="tech"] .np-techrow')];
    const mar = rows.find((r) => r.querySelector('[data-tech="mar"]'));
    return mar ? (mar.querySelector('.np-tech-head') || {}).dataset.tt || '' : '';
  });
  // The tab it points at is Defense in every chapter since §245; it was Host
  // here and Defence in 1948 when this line was written.
  ok(/musters/.test(marTip) && /Defense/.test(marTip),
    '  but the military card still says what the next rung musters, and where to look');

  await page.locator('#nation-panel .np-tab[data-tab-go="war"]').click();
  await page.waitForTimeout(150);
  ok(await patterns.isVisible(), 'the Host draws them');
  const line = (await page.locator('#nation-panel [data-ref="patterns"] .np-tech-unit').first().textContent()) || '';
  ok(/muster/i.test(line), '  the pattern line: ' + line.trim());
  ok(await page.locator('#nation-panel [data-ref="patterns"] .np-ms').count() >= 1,
    '  and the milestone strip');
  ok(await page.locator('#nation-panel [data-ref="manpower"]').isVisible(),
    '  above them, the host\'s own numbers');
}

console.log('== the panel keeps updating after a switch ==');
{
  // A tab implementation that re-templated the panel would detach every node
  // in `refs`, and the panel would freeze without saying so. Run the clock and
  // watch a pinned number move.
  await page.locator('#nation-panel .np-tab[data-tab-go="tech"]').click();
  await page.waitForTimeout(120);
  const before = await page.locator('#nation-panel [data-ref="treasury"]').textContent();
  await page.evaluate(() => {
    window._ctx.game.tags[window._ctx.game.playerTag].treasury = 4242;
    window._ctx.bus.emit('actionTaken');
  });
  await page.waitForTimeout(300);
  const after = await page.locator('#nation-panel [data-ref="treasury"]').textContent();
  ok(after !== before && /4,?242/.test(after),
    'the treasury row still refreshes after two tab switches: ' + after.trim());
}

console.log('== the High Priesthood buttons fit their labels ==');
{
  await page.locator('#nation-panel .np-tab[data-tab-go="faith"]').click();
  await page.waitForTimeout(150);
  const seats = page.locator('#nation-panel .np-seat-btn');
  const n = await seats.count();
  ok(n >= 2, 'the office offers ' + n + ' candidates');
  if (n) {
    const m = await seats.evaluateAll((els) => els.map((e) => ({
      text: e.textContent.trim(),
      w: Math.round(e.getBoundingClientRect().width),
      clipped: e.scrollWidth > e.clientWidth + 1,
    })));
    for (const b of m) {
      ok(b.w > 40, `"${b.text}" is ${b.w}px wide, not a 26px square`);
      ok(!b.clipped, `  and its label is not cut off`);
    }
    // The four genuine icon buttons must still be squares — widening the
    // shared class instead of adding a new one would have reflowed them.
    await page.locator('#nation-panel .np-tab[data-tab-go="court"]').click();
    await page.waitForTimeout(150);
    const icons = page.locator('#nation-panel .np-fac-btn');
    if (await icons.count()) {
      const iw = await icons.first().evaluate((e) => Math.round(e.getBoundingClientRect().width));
      ok(iw <= 34, 'the estates\' icon buttons are still ' + iw + 'px squares');
    } else {
      ok(true, 'no icon buttons on the board in this chapter to compare against');
    }
  }
}

console.log('== the dispersion is on the map ==');
{
  await page.locator('#nation-panel .pp-close').click();
  const btn = page.locator('.mm-btn[data-mode="diaspora"]');
  ok(await btn.count() === 1, 'the mapmode bar has a button for it');
  ok(await btn.locator('svg').count() === 1, 'and the button carries a real glyph');
  await btn.click();
  await page.waitForTimeout(600);
  ok(await btn.evaluate((e) => e.classList.contains('active')), 'clicking it lights the button');

  // The map must actually be repainted differently. Ask the sim for the mode's
  // own colours rather than screen-scraping the canvas: a flat map would mean
  // the mode fell through to political, which is the silent failure the
  // MODE_PARAMS registration exists to prevent.
  const spread = await page.evaluate(async () => {
    const mm = await import('/js/map/mapmodes.js');
    const ctx = window._ctx;
    const r = mm.computeMapmodeColors(ctx, 'diaspora');
    const pol = mm.computeMapmodeColors(ctx, 'political');
    const key = (a, i) => a[i * 4] + ',' + a[i * 4 + 1] + ',' + a[i * 4 + 2];
    const n = ctx.game.provinces.length - 1;
    const uniq = new Set();
    let differs = 0;
    for (let i = 1; i <= n; i++) {
      uniq.add(key(r.primary, i));
      if (key(r.primary, i) !== key(pol.primary, i)) differs++;
    }
    // Alexandria is the largest community on the board; Jerusalem holds none.
    const byName = {};
    ctx.game.provinces.forEach((p, i) => { if (p) byName[p.canon] = i; });
    return {
      uniq: uniq.size,
      differs,
      alex: key(r.primary, byName.Alexandria),
      jeru: key(r.primary, byName.Jerusalem),
      leon: key(r.primary, byName.Leontopolis),
    };
  });
  ok(spread.uniq > 6, 'it paints ' + spread.uniq + ' distinct shades, not one flat colour');
  ok(spread.differs > 200, 'and differs from the political map on ' + spread.differs + ' provinces');
  ok(spread.alex !== spread.jeru, 'Alexandria does not read like a province with no community');
  ok(spread.leon !== spread.jeru, 'and neither does Leontopolis — the House of Onias is on the map');
}

ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));

await browser.close();
console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
