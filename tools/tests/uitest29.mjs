// UI verification — SPEC §69/§70/§71: the Compendium (title screen + W in
// play), the foreign-decider notice card (one button, the decider named), and
// the release-nations section of the peace table driven end to end.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/pw') + '/');
const { chromium } = require('playwright');
const OUT = (process.env.JU_OUT || '/tmp') + '/';

async function pickBookmark(page, nameFrag) {
  await page.waitForSelector('.bm-card', { timeout: 20000 });
  for (let i = 0; i < 8; i++) {
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

const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
// The full battery loads this machine hard under software GL; generous
// action timeouts keep the sweep honest instead of flaky.
page.setDefaultTimeout(45000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });

console.log('== the Compendium opens from the title screen ==');
await page.waitForSelector('[data-ref="wiki"]', { timeout: 20000 });
await page.locator('[data-ref="wiki"]').click();
await page.waitForSelector('#wiki-modal:not(.hidden)');
ok(true, 'the title-screen Compendium button opens the codex');
const homeText = await page.locator('#wiki-modal .wiki-body').textContent();
ok(/The Maccabean Revolt/.test(homeText) && /The War of Independence/.test(homeText),
  'all seven chapters are on the front page');
ok(/The Nations/.test(homeText) && /The Formable Crowns/.test(homeText),
  'the nations and the formable crowns are linked');
await page.screenshot({ path: OUT + 'wiki-home.png' });

// chapter -> timeline -> event detail
await page.locator('#wiki-modal .wiki-card-row', { hasText: 'The Great Revolt' }).click();
await page.waitForTimeout(150);
const eraText = await page.locator('#wiki-modal').textContent();
ok(/The playable standards/.test(eraText) && /Judaea/.test(eraText) && /Rome/.test(eraText),
  'the chapter page lists its playable standards');
ok(/Signature system/.test(eraText) && /Win:/.test(eraText),
  'campaign guidance and the win/loss contract are printed');
await page.screenshot({ path: OUT + 'wiki-era.png' });
await page.locator('#wiki-modal .wiki-card-row', { hasText: 'The timeline' }).click();
await page.waitForTimeout(150);
const tlText = await page.locator('#wiki-modal .wiki-body').textContent();
ok(/66 CE/.test(tlText) && /The Sacrifices Cease/.test(tlText),
  'the timeline opens at the first year of the era');
await page.locator('#wiki-modal .wiki-card-row', { hasText: 'The Sacrifices Cease' }).click();
await page.waitForTimeout(150);
const evText = await page.locator('#wiki-modal .wiki-body').textContent();
ok(/The choices/.test(evText) && /Let the offering cease/.test(evText)
  && /\+10 legitimacy/.test(evText),
  'the event page prints every option and its consequences');
ok(/the historical course/.test(evText), 'the historical course is marked');
await page.screenshot({ path: OUT + 'wiki-event.png' });

// back / home navigation
await page.locator('#wiki-modal [data-ref="back"]').click();
await page.waitForTimeout(120);
ok(/The timeline —/.test(await page.locator('#wiki-modal .wiki-title').textContent()),
  'back returns to the timeline');
await page.locator('#wiki-modal [data-ref="home"]').click();
await page.waitForTimeout(120);
ok(/The Compendium/.test(await page.locator('#wiki-modal .wiki-title').textContent()),
  'home returns to the front page');

// nations & formables
await page.locator('#wiki-modal .wiki-card-row', { hasText: 'The Nations' }).click();
await page.waitForTimeout(150);
const natText = await page.locator('#wiki-modal .wiki-body').textContent();
ok(/Rome/.test(natText) && /Israel/.test(natText), 'the nations index spans the eras');
await page.locator('#wiki-modal .wiki-card-row', { hasText: 'Parthia' }).first().click();
await page.waitForTimeout(150);
const parText = await page.locator('#wiki-modal').textContent();
ok(/Temperament/.test(parText) && /Chapters/.test(parText),
  'a nation page shows temperament and its chapters');
await page.screenshot({ path: OUT + 'wiki-nation.png' });
await page.locator('#wiki-modal [data-ref="home"]').click();
await page.waitForTimeout(120);
await page.locator('#wiki-modal .wiki-card-row', { hasText: 'The Formable Crowns' }).click();
await page.waitForTimeout(150);
const formText = await page.locator('#wiki-modal .wiki-body').textContent();
ok(/Kingdom of Israel/.test(formText) && /Hold Jerusalem/.test(formText),
  'the formable crowns list their requirements');
await page.screenshot({ path: OUT + 'wiki-formables.png' });
console.log('== every page of the codex renders (no fallback to Home) ==');
// A page that throws falls back to the front page (warnOnce guard); walking
// the whole tree and checking titles proves every era, timeline, event shape
// and nation page renders.
// The ⌂/‹ buttons are disabled on the front page — guard every navigation
// click or the sweep hangs on a no-op.
const goHome = async () => {
  const b = page.locator('#wiki-modal [data-ref="home"]');
  if (await b.isEnabled()) { await b.click(); await page.waitForTimeout(80); }
};
const goBack = async () => {
  const b = page.locator('#wiki-modal [data-ref="back"]');
  if (await b.isEnabled()) { await b.click(); await page.waitForTimeout(60); }
};
await goHome();
const chapterCount = await page.evaluate(() => {
  const rows = document.querySelectorAll('#wiki-modal [data-go^="era:"]');
  return rows.length;
});
ok(chapterCount === 7, 'seven chapter rows on the front page');
let sweepFails = 0;
for (let i = 0; i < chapterCount; i++) {
  await goHome();
  await page.locator('#wiki-modal [data-go^="era:"]').nth(i).click();
  await page.waitForTimeout(80);
  const eraTitle = await page.locator('#wiki-modal .wiki-title').textContent();
  if (/The Compendium/.test(eraTitle)) { sweepFails++; console.error('    era page fell home at', i); continue; }
  // timeline + its first event
  await page.locator('#wiki-modal [data-go^="timeline:"]').click();
  await page.waitForTimeout(80);
  if (!/The timeline/.test(await page.locator('#wiki-modal .wiki-title').textContent())) {
    sweepFails++; console.error('    timeline fell home for', eraTitle);
  }
  const evRows = await page.locator('#wiki-modal [data-go^="event:"]').count();
  if (evRows > 0) {
    await page.locator('#wiki-modal [data-go^="event:"]').first().click();
    await page.waitForTimeout(80);
    if (/The Compendium/.test(await page.locator('#wiki-modal .wiki-title').textContent())) {
      sweepFails++; console.error('    first event fell home for', eraTitle);
    }
    await goBack();
  }
  // the full event list + its last event (different shapes live at the ends)
  await goBack();
  await page.locator('#wiki-modal [data-go^="events:"]').click();
  await page.waitForTimeout(80);
  const listRows = await page.locator('#wiki-modal [data-go^="event:"]').count();
  if (listRows > 2) {
    await page.locator('#wiki-modal [data-go^="event:"]').nth(listRows - 2).click();
    await page.waitForTimeout(80);
    if (/The Compendium/.test(await page.locator('#wiki-modal .wiki-title').textContent())) {
      sweepFails++; console.error('    last event fell home for', eraTitle);
    }
  }
}
ok(sweepFails === 0, 'all 7 chapters, timelines and event pages render (' + sweepFails + ' fell home)');
// every nation page
await goHome();
await page.locator('#wiki-modal .wiki-card-row', { hasText: 'The Nations' }).click();
await page.waitForTimeout(100);
const nationCount = await page.locator('#wiki-modal [data-go^="nation:"]').count();
let nationFails = 0;
for (let i = 0; i < nationCount; i++) {
  if (!/The Nations/.test(await page.locator('#wiki-modal .wiki-title').textContent())) {
    await goHome();
    await page.locator('#wiki-modal .wiki-card-row', { hasText: 'The Nations' }).click();
    await page.waitForTimeout(60);
  }
  await page.locator('#wiki-modal [data-go^="nation:"]').nth(i).click();
  await page.waitForTimeout(50);
  if (/The Compendium|The Nations/.test(await page.locator('#wiki-modal .wiki-title').textContent())) nationFails++;
  await goBack();
}
ok(nationFails === 0, 'all ' + nationCount + ' nation pages render (' + nationFails + ' fell back)');
await page.locator('#wiki-modal .peace-cancel').click();
ok(await page.evaluate(() => document.getElementById('wiki-modal').classList.contains('hidden')),
  'Close shuts the codex');

console.log('== into the game: the library stays on the title screen ==');
await pickBookmark(page, 'Great Revolt');
await page.waitForSelector('.nation-card');
await page.locator('.nation-card', { hasText: 'Judaea' }).first().click();
await page.waitForFunction(() => !!window._ctx, null, { timeout: 60000 });
await page.waitForTimeout(600);

ok(await page.locator('#topbar [data-ref="wiki"]').count() === 0,
  'the topbar carries no Compendium button');
await page.keyboard.press('w');
await page.waitForTimeout(250);
ok(await page.evaluate(() => {
  const el = document.getElementById('wiki-modal');
  return !el || el.classList.contains('hidden');
}), 'W does not open the codex in play');

// A foreign court's decision arrives as a notice: fire Vespasian's dispatch
// (decider ROM) through the live bus exactly as the engine would.
await page.evaluate(() => {
  const ctx = window._ctx;
  const g = ctx.game;
  const ev = ctx.events.find((e) => e && e.id === 'ev_vespasian_arrives');
  const instanceId = g.nextEventInstance++;
  const pe = { instanceId, eventId: ev.id, forTag: g.playerTag, notice: true, optIdx: 0, decider: 'ROM' };
  g.pendingEvents.push(pe);
  ctx.bus.emit('event', { instanceId, event: ev, forTag: g.playerTag, notice: true, optIdx: 0, decider: 'ROM' });
});
await page.waitForSelector('#event-modal:not(.hidden)');
const noticeOpts = await page.locator('#event-modal .ev-opt').count();
ok(noticeOpts === 1, 'the notice card offers exactly one option (' + noticeOpts + ')');
const deciderLine = await page.locator('#event-modal .ev-decider').textContent();
ok(/The decision belongs to Rome/.test(deciderLine), 'the card names the deciding court: ' + deciderLine.trim());
await page.screenshot({ path: OUT + 'notice-card.png' });
await page.locator('#event-modal .ev-opt').click();
await page.waitForTimeout(200);
ok(await page.evaluate(() => document.getElementById('event-modal').classList.contains('hidden')),
  'acknowledging closes the card');

// Before any nation has fallen, the release section still stands on the
// table with its empty-state explainer — the mechanic must be discoverable
// even when there is nothing to free (the reported "I don't see the release
// nation functionality").
await page.keyboard.press('n');
await page.waitForSelector('#nation-panel:not(.hidden)');
await page.locator('#nation-panel .np-dove').first().click();
await page.waitForSelector('#peace-modal:not(.hidden)');
const earlyPeaceText = await page.locator('#peace-modal').textContent();
ok(/Force them to release nations/.test(earlyPeaceText),
  'the release section is visible before any court has fallen');
const earlyReleaseRows = await page.locator('#peace-modal [data-release]').count();
ok(earlyReleaseRows > 0 || /no viable homeland can be separated/i.test(earlyPeaceText),
  'the table either offers a historical/cultural state or explains why none can be freed');
await page.locator('#peace-modal .peace-cancel').click();
await page.waitForTimeout(150);

// The release table: Nabataea has fallen to Rome; at +90 the treaty frees it.
await page.evaluate(() => {
  const ctx = window._ctx;
  const g = ctx.game;
  for (const p of g.provinces) {
    if (p && !p.impassable && p.owner === 'NAB') { p.owner = 'ROM'; p.controller = 'ROM'; }
  }
  for (const id of Object.keys(g.armies)) if (g.armies[id].tag === 'NAB') delete g.armies[id];
  g.tags.NAB.alive = false;
  const war = g.wars.find((w) => (w.attackers.includes('JUD') && w.defenders.includes('ROM'))
    || (w.attackers.includes('ROM') && w.defenders.includes('JUD')));
  war.warscore.JUD = 90;
  war.warscore.ROM = -90;
  ctx.bus.emit('war', {});
});
await page.keyboard.press('n');
await page.waitForSelector('#nation-panel:not(.hidden)');
await page.locator('#nation-panel .np-dove').first().click();
await page.waitForSelector('#peace-modal:not(.hidden)');
const peaceText = await page.locator('#peace-modal').textContent();
ok(/Force them to release nations/.test(peaceText), 'the release section stands on the table');
ok(/Restore Nabataea/.test(peaceText), 'fallen Nabataea is offered for restoration');
await page.locator('#peace-modal [data-release="NAB"]').check();
await page.waitForTimeout(150);
const verdict = await page.locator('#peace-modal [data-ref="verdict"]').textContent();
ok(/accept/i.test(verdict), 'at +90 the terms are acceptable: ' + verdict.trim());
await page.screenshot({ path: OUT + 'peace-release.png' });
await page.locator('#peace-modal [data-ref="send"]').click();
await page.waitForTimeout(400);
const after = await page.evaluate(() => {
  const g = window._ctx.game;
  const petra = g.provinces.find((p) => p && p.canon === 'Petra');
  return {
    alive: g.tags.NAB.alive, overlord: g.tags.NAB.overlord || null,
    petraOwner: petra && petra.owner,
    warGone: !g.wars.some((w) => w.attackers.includes('ROM') && w.defenders.includes('JUD')
      || w.attackers.includes('JUD') && w.defenders.includes('ROM')),
  };
});
ok(after.alive === true && !after.overlord, 'Nabataea lives again, independent');
ok(after.petraOwner === 'NAB', 'Petra flies the restored banner');
ok(after.warGone, 'the treaty ends the war');

const realErrors = errors.filter((e) => !/favicon/i.test(e));
ok(realErrors.length === 0, 'zero page errors' + (realErrors.length ? ' — ' + realErrors[0] : ''));

await browser.close();
if (failures) { console.error(failures + ' FAILURES'); process.exit(1); }
console.log('\nALL PASS');
