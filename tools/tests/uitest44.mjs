// UI verification — SPEC §213: the works of one's own, in a real browser.
//
// The headless suite (smoke140) proves the arithmetic. This one proves the
// four things only a browser can:
//
//   1. The Host tab carries a "The Works of Our Own" block, directly under
//      How We Muster — the two halves of one sentence, whose works feed this
//      host and which of them are ours.
//   2. A locked card names the rung that opens it; a court at the rung gets a
//      live Begin button with the price on it, and one press starts the line.
//   3. A line in the shops draws its months and a progress bar, and carries
//      the Abandon button that closes it.
//   4. A delivered work changes the summary line — "We build our own
//      aircraft" — and the block is absent for a chapter with no works.
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

// 1948, Israel — the one chapter with works to build.
for (let i = 0; i < 12; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('War of Independence')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(500);

const openHost = async () => {
  if (await page.locator('#nation-panel.hidden').count()) await page.locator('.tb-flag').click();
  await page.waitForSelector('#nation-panel:not(.hidden)');
  await page.locator('#nation-panel .np-tab[data-tab-go="war"]').click();
  await page.waitForTimeout(180);
};
const closePanel = () => page.locator('#nation-panel [data-ref="close"]').click();

// What the block says, as the player reads it.
const works = () => page.evaluate(() => {
  const block = document.querySelector('#nation-panel [data-ref="programsBlock"]');
  if (!block || block.classList.contains('hidden')) return null;
  const host = block.querySelector('[data-ref="programs"]');
  const cards = [...host.querySelectorAll('.np-prog')].map((c) => ({
    name: (c.querySelector('.np-prog-head b') || c.querySelector('.np-era-lock-name') || {}).textContent || '',
    state: (c.querySelector('.np-prog-state') || {}).textContent || '',
    lockedAt: (c.querySelector('.np-era-lock-at') || {}).textContent || '',
    locked: c.classList.contains('np-era-locked'),
    done: c.classList.contains('np-prog-done'),
    bar: !!c.querySelector('.np-prog-bar'),
    begin: (c.querySelector('[data-program]') || {}).dataset,
    disabled: !!(c.querySelector('[data-program]') || { classList: { contains: () => false } })
      .classList.contains('disabled'),
    stop: !!c.querySelector('[data-program-stop]'),
  }));
  return {
    title: (block.querySelector('.pp-build-title') || {}).textContent || '',
    summary: (host.querySelector('.np-tech-unit') || {}).textContent || '',
    lines: [...host.querySelectorAll('.np-tech-unit')].map((n) => n.textContent),
    cards,
    // The block's position: it must sit under How We Muster, not above it.
    afterMuster: (() => {
      const muster = document.querySelector('#nation-panel [data-ref="patternsBlock"]');
      return !!muster && !!(muster.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING);
    })(),
    tab: block.dataset.tab,
  };
});

console.log('== the Host carries the works, under How We Muster ==');
await openHost();
{
  const w = await works();
  ok(!!w, 'The Works of Our Own is drawn');
  ok(/Works of Our Own/i.test(w.title), 'under its own title: ' + w.title.trim());
  ok(w.tab === 'war' && w.afterMuster, 'on the Host tab, below the pattern block');
  ok(w.cards.length === 8, 'eight cards, one per work on the roster (' + w.cards.length + ')');
  ok(/still an import/i.test(w.summary), 'and the summary owns up: ' + w.summary.trim());
}

console.log('== a locked card names its rung; a reached one carries a price ==');
{
  let w = await works();
  ok(w.cards.every((c) => c.locked), 'at mar 19 every work is a dark slab');
  ok(/The General Staff \(20\)/.test(w.cards[0].lockedAt),
    'naming the rung in the chapter\'s vocabulary: ' + w.cards[0].lockedAt.trim());

  // Climb the ladder and fill the purse, the way a campaign would.
  await page.evaluate(() => {
    const t = window._ctx.game.tags[window._ctx.game.playerTag];
    t.tech.mar = 24; t.treasury = 3000; t.points.mar = 3000; t.atWarWith = [];
    window._ctx.bus.emit('day', { date: { ...window._ctx.game.date } });
  });
  await page.waitForTimeout(220);
  w = await works();
  const uzi = w.cards[0];
  ok(!uzi.locked && !!uzi.begin && uzi.begin.program === 'uzi', 'at mar 24 the Uzi offers a Begin button');
  ok(!uzi.disabled, 'live, because the purse and the points are there');
  const lavi = w.cards[7];
  ok(lavi.locked && /After The Kfir and The Merkava/.test(lavi.lockedAt),
    'while the Lavi still names what the shops owe it first: ' + lavi.lockedAt.trim());
}

console.log('== one press starts the line; the card grows a clock and a way out ==');
{
  await page.locator('#nation-panel [data-program="uzi"]').click();
  await page.waitForTimeout(260);
  const w = await works();
  const uzi = w.cards[0];
  ok(/months$/.test(uzi.state.trim()), 'the card counts down: ' + uzi.state.trim());
  ok(uzi.bar, 'draws a progress bar');
  ok(uzi.stop, 'and carries the Abandon button');
  ok(w.lines.some((l) => /In development/.test(l)),
    'and the block owns the monthly bill: ' + (w.lines.find((l) => /In development/.test(l)) || '').trim());

  await page.locator('#nation-panel [data-program-stop="uzi"]').click();
  await page.waitForTimeout(260);
  const after = await works();
  ok(!!after.cards[0].begin && !after.cards[0].bar, 'and one press closes it again');
  ok(!after.lines.some((l) => /In development/.test(l)), 'the development line goes with it');
}

console.log('== a delivered work changes what the realm says about itself ==');
{
  await page.evaluate(() => {
    const t = window._ctx.game.tags[window._ctx.game.playerTag];
    t.programs.uzi = 0; t.programs.nesher = 0;
    window._ctx.bus.emit('day', { date: { ...window._ctx.game.date } });
  });
  await page.waitForTimeout(240);
  let w = await works();
  ok(/We build our own/.test(w.summary) && /aircraft/.test(w.summary),
    'the summary flips: ' + w.summary.trim());
  ok(!/sell to others/.test(w.summary), 'but does not claim the export yet — the tanks are still an import');
  ok(w.cards.find((c) => /Uzi/.test(c.name)).done, 'and the delivered card reads as delivered');

  await page.evaluate(() => {
    window._ctx.game.tags[window._ctx.game.playerTag].programs.merkava = 0;
    window._ctx.bus.emit('day', { date: { ...window._ctx.game.date } });
  });
  await page.waitForTimeout(240);
  w = await works();
  ok(/sell to others/.test(w.summary), 'with the armor works too, the realm sells: ' + w.summary.trim());
}

console.log('== the block is absent where there are no works ==');
{
  await closePanel();
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.bm-card', { timeout: BOOT_MS });
  for (let i = 0; i < 12; i++) {
    const txt = (await page.locator('.bm-card.current').textContent()) || '';
    if (txt.includes('Maccabean')) { await page.locator('.bm-card.current').click(); break; }
    await page.locator('.ss-next').click();
    await page.waitForTimeout(420);
  }
  await page.waitForSelector('.nation-card');
  await page.locator('.nation-card').first().click();
  await page.waitForFunction(() => !!window._ctx);
  await page.waitForTimeout(500);
  await openHost();
  ok((await works()) === null, '167 BCE draws no works block at all');
  const muster = await page.locator('#nation-panel [data-ref="patternsBlock"]:not(.hidden)').count();
  ok(muster === 1, 'and How We Muster is still there, so the tab did not go blank');
}

ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));

await browser.close();
console.log(failures === 0 ? '\nuitest44 OK' : '\nuitest44 FAILED (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
