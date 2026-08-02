// UI verification v1.6: war overview, ledger, diplomatic mapmode, peace map
// highlight, merge-all, save tools, succession cards, and 67 BCE in-browser.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
const { chromium } = require('playwright');
// SPEC §160: the start screen is gated on the province raster — main.js awaits
// initRenderer() and computeGeometry() before showStartScreen() — and that pass
// is one fullscreen draw over every texel against every seed. At the frame that
// reaches Britain it is 25.0M x 307, about five times the pre-§160 work, and
// these suites run on SwiftShader. Measured: 74s to the carousel against 17s
// before. Every wait after it is unaffected (the nation cards land ~1s later),
// so this one constant is the whole of the change.
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 480000);

async function pickBookmark(page, nameFrag) {
  await page.waitForSelector('.bm-card', { timeout: BOOT_MS });
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
await page.waitForSelector('.bm-card', { timeout: BOOT_MS });

const cards = await page.locator('.bm-card').count();
ok(cards === 8, 'eight bookmark cards: ' + cards);
const c2 = (await page.locator('.bm-card').nth(1).textContent()) || '';
ok(/Civil War/.test(c2) && /67 BCE/.test(c2), 'second card is the 67 BCE civil war');
// SPEC §93 replaced the export/import file buttons with the shelf — "six
// characters to join, and a shelf instead of a downloads folder" — and this
// suite went on asking for buttons no longer in the codebase, which is why it
// has been red ever since. The shelf is the contract now.
ok(await page.locator('[data-ref="saves"]').isVisible(), 'the saved-campaign shelf is on the start screen');
ok(!(await page.locator('[data-ref="export"], [data-ref="import"]').count()),
  'and the downloads-folder buttons are gone, not merely hidden');

// The house rule this encodes: every chapter is played from an ISRAELITE side.
// It used to read "Jewish-only" and it meant the same thing until SPEC §136
// added the Keepers, whose player keeps a different Torah and is still not the
// empire — Byzantium has a court, factions and a victory branch in that chapter
// and is deliberately not on offer. SPEC §185 widened the rosters to every
// SEATED Jewish court: Adiabene in the four chapters where the house is on
// the map, and Agrippa's kingdom in 66. (529's Galilee stays off the roster —
// it is a landless community, deferred by design until the 556 rising.)
const expectedRosters = [
  ['HAS'],
  ['HYR', 'ARI', 'ADI'],
  ['HER', 'ATG', 'ADI'],
  ['JUD', 'AGR', 'ADI'],
  ['JUD', 'ADI'],
  ['SAM'],
  ['JUD'],
  ['ISR'],
];
for (let i = 0; i < expectedRosters.length; i++) {
  await page.locator(`.ss-dot[data-dot="${i}"]`).click();
  await page.locator('.bm-card.current').click();
  await page.waitForSelector('.nation-card');
  const tags = await page.locator('.nation-card').evaluateAll((els) => els.map((el) => el.dataset.tag));
  ok(JSON.stringify(tags) === JSON.stringify(expectedRosters[i]),
    `bookmark ${i + 1} has the Israelite-only roster: ${tags.join(',')}`);
  await page.locator('.ss-back').first().click();
  await page.waitForSelector('.bm-card.current');
}

// ---- boot 66 CE as JUD -----------------------------------------------------
await pickBookmark(page, 'Great Revolt');
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(400);

// The mapmode bar. This count has been stale since trade and estates landed —
// it asserted 8 while the bar shipped 9, and was failing on main before SPEC
// §175 added the tenth (the dispersion). Political, diplomatic, trade, terrain,
// religion, culture, development, unrest, estates, diaspora.
const mm = await page.locator('.mm-btn').count();
ok(mm === 10, 'ten mapmode buttons: ' + mm);
ok(await page.locator('.mm-btn[data-mode="diaspora"]').count() === 1,
  'the dispersion has a button of its own');
await page.locator('.mm-btn[data-mode="diplomatic"]').click();
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + 'v16-diplomatic.png' });
ok(true, 'diplomatic mapmode renders (screenshot)');

// ledger via hotkey
await page.keyboard.press('l');
await page.waitForSelector('#ledger-modal:not(.hidden)');
const ledgerRows = await page.locator('.ledger tbody tr').count();
ok(ledgerRows >= 6, 'ledger lists nations: ' + ledgerRows);
ok(await page.locator('.ledger tr.me').count() === 1, 'player row highlighted');
await page.locator('.ledger th[data-sort="troops"]').click();
await page.waitForTimeout(100);
const firstRow = (await page.locator('.ledger tbody tr').first().textContent()) || '';
ok(/Rome/.test(firstRow), 'sorting by troops puts Rome first: ' + firstRow.slice(0, 30));
await page.screenshot({ path: OUT + 'v16-ledger.png' });
await page.keyboard.press('Escape');
ok(!(await page.locator('#ledger-modal:not(.hidden)').count()), 'Escape closes ledger');

// nation panel via N hotkey
await page.keyboard.press('n');
await page.waitForSelector('#nation-panel:not(.hidden)');
ok(true, 'N opens the realm panel');

// war overview from the war row (The Great Revolt, noNegotiation)
// SPEC §175: the realm panel is six tabs behind a pinned header and opens on
// Crown. The war rows are in the Diplomacy block, on World, and a section
// whose tab is closed is display:none — readable, but not clickable.
await page.locator('#nation-panel .np-tab[data-tab-go="world"]').click();
await page.waitForTimeout(150);
await page.locator('#nation-panel [data-war]').first().click();
await page.waitForSelector('#war-modal:not(.hidden)');
const woText = (await page.locator('.wo-card').textContent()) || '';
ok(/The Great Revolt/.test(woText), 'war overview shows the war');
ok(/From battles/.test(woText) && /From occupation/.test(woText), 'score breakdown rows present');
// SPEC §31: even a fight-to-the-death war hears envoys now
ok((await page.locator('[data-ref="negotiate"]').count()) === 1, 'negotiate button present even on a scripted war (SPEC §31)');
ok(/envoys may still be sent/.test(woText), 'the meta line says the envoys may fly');
await page.screenshot({ path: OUT + 'v16-waroverview.png' });
await page.keyboard.press('Escape');

// fabricate a negotiable war; check overview -> negotiate -> map highlight
await page.evaluate(() => {
  const ctx = window._ctx;
  ctx.helpers.declareWar(ctx, 'JUD', 'NAB', 'Test War');
  const war = ctx.game.wars.find((w) => w.name === 'Test War');
  war.warscore.JUD = 40; war.warscore.NAB = -40;
  war._bs.att = 5;
  for (const name of ['Petra', 'Bostra']) ctx.prov(name).controller = 'JUD';
  ctx.bus.emit('war', {});
});
await page.keyboard.press('n');
await page.keyboard.press('n');
await page.waitForSelector('#nation-panel:not(.hidden)');
// The open tab is a closure variable and survives close/open, but the panel
// was toggled twice above; select World again rather than assume.
await page.locator('#nation-panel .np-tab[data-tab-go="world"]').click();
await page.waitForTimeout(150);
await page.locator('#nation-panel [data-war]').nth(1).click();
await page.waitForSelector('#war-modal:not(.hidden)');
const wo2 = (await page.locator('.wo-card').textContent()) || '';
ok(/Petra/.test(wo2), 'occupied province listed in overview');
await page.locator('[data-ref="negotiate"]').click();
await page.waitForSelector('#peace-modal:not(.hidden)');
const hl = await page.evaluate(() => (window._ctx.game.ui.peaceHighlight || []).length);
ok(hl === 2, 'peace highlight set for demandable provinces: ' + hl);
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + 'v16-peace-highlight.png' });
await page.locator('#peace-modal .peace-cancel').click();
const hl2 = await page.evaluate(() => (window._ctx.game.ui.peaceHighlight || []).length);
ok(hl2 === 0, 'highlight cleared on close');

// merge-all button in the outliner
await page.evaluate(() => {
  const ctx = window._ctx;
  ctx.helpers.spawnArmy(ctx, 'JUD', 'Jerusalem', { inf: 2, name: 'Extra Band' });
  ctx.bus.emit('selectArmy', null);
});
const hostId = await page.evaluate(() => {
  const g = window._ctx.game;
  return Object.values(g.armies).find((a) => a.tag === 'JUD' && /Host/.test(a.name)).id;
});
await page.locator('.ol-row.ol-army', { hasText: 'Host of Jerusalem' }).click(); // real selection path
await page.waitForTimeout(200);
ok(await page.locator(`[data-mergeall="${hostId}"]`).isVisible(), 'merge-all button on selected army');
await page.locator(`[data-mergeall="${hostId}"]`).click();
await page.waitForTimeout(200);
const merged = await page.evaluate((id) => {
  const g = window._ctx.game;
  const host = g.armies[id];
  const here = Object.values(g.armies).filter((a) => a.tag === 'JUD' && a.prov === host.prov);
  return { count: here.length, men: host.men };
}, hostId);
ok(merged.count === 1 && merged.men === 17000, 'merge-all merged the stack: ' + JSON.stringify(merged));

// succession event card
await page.evaluate(() => {
  window._ctx.helpers.rulerDies(window._ctx, 'JUD', 'was thrown from a horse');
});
await page.waitForSelector('#event-modal:not(.hidden)', { timeout: 5000 });
const evTitle = (await page.locator('.ev-title').textContent()) || '';
ok(/Death of/.test(evTitle), 'succession shows as an event card: ' + evTitle);
await page.locator('.ev-opt').first().click();
await page.waitForTimeout(200);

// Save, then check the campaign is on the shelf after a reload. The old
// version of this block clicked an Export button and waited for a browser
// download; §93 retired both, so it waited thirty seconds for an event that
// could never fire.
await page.evaluate(() => window._ctx.bus.emit('saveRequest', {}));
// Wait for the write to LAND before reloading. `doSave` is async — the shelf
// opens IndexedDB and may migrate a legacy row on the way — so a reload issued
// straight after the request can abort it, which is a race the old fixed
// `waitForTimeout(300)` lost quietly and intermittently.
await page.waitForFunction(async () => {
  const m = await import('/js/core/shelf.js');
  return (await m.shelfList()).length > 0;
}, null, { timeout: 15000 });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.bm-card', { timeout: BOOT_MS });
ok(await page.locator('.ss-continue').isVisible(),
  'a saved campaign offers Continue on the start screen');
// The shelf itself, asked directly. The saves MODAL merges the local shelf
// with the cloud and reports a read error when there is no cloud to reach, so
// asserting on its rows would be asserting that this machine can talk to a
// deployed worker. The storage contract is the thing under test.
const shelved = await page.evaluate(async () => {
  const m = await import('/js/core/shelf.js');
  return (await m.shelfList()).map((r) => r.id);
});
ok(shelved.length > 0, 'the campaign is on the shelf: ' + JSON.stringify(shelved));
await page.locator('[data-ref="saves"]').click();
await page.waitForSelector('.sv-list', { timeout: 8000 });
ok(true, 'and the shelf opens');

ok(errors.length === 0, 'no page errors (66 CE): ' + JSON.stringify(errors.slice(0, 3)));
await page.close();

// ---- 67 BCE boots in-browser -------------------------------------------------
{
  const p2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs2 = [];
  p2.on('pageerror', (e) => errs2.push(String(e)));
  p2.on('console', (m) => { if (m.type() === 'error') errs2.push(m.text()); });
  await p2.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
  await p2.evaluate(() => localStorage.clear());
  await p2.reload({ waitUntil: 'networkidle' });
  await pickBookmark(p2, 'Judaean Civil War'); // 67 BCE
  await p2.waitForSelector('.nation-card');
  const nCards = await p2.locator('.nation-card').count();
  ok(nCards === 3, '67 BCE offers three playable courts: ' + nCards);
  const bannerTags = await p2.locator('.nc-shield-tag').allTextContents();
  ok(bannerTags.join(',') === 'HYR,ARI,ADI', 'HYR, ARI and ADI cards: ' + bannerTags.join(','));
  await p2.locator('.nation-card').first().click(); // HYR
  await p2.waitForFunction(() => !!window._ctx);
  await p2.waitForTimeout(600);
  const state = await p2.evaluate(() => ({
    bookmark: window._ctx.game.bookmarkId,
    ruler: window._ctx.game.tags.HYR.ruler.name,
    jerusalem: window._ctx.prov('Jerusalem').owner,
    antioch: window._ctx.prov('Antioch').owner,
    tarsus: window._ctx.prov('Tarsus').owner,
  }));
  ok(state.bookmark === '67bce' && state.ruler === 'Hyrcanus II', '67 BCE boots as Hyrcanus: ' + JSON.stringify(state));
  ok(state.jerusalem === 'ARI' && state.antioch === 'SEL' && state.tarsus === 'ROM', 'the 67 BCE map is right');
  // run a few weeks at speed; the opening events will pause it — drain via clicks
  await p2.keyboard.press('Space');
  await p2.keyboard.press('5');
  for (let i = 0; i < 8; i++) {
    await p2.waitForTimeout(700);
    const open = await p2.locator('#event-modal:not(.hidden) .ev-opt').count();
    if (open) { await p2.locator('#event-modal .ev-opt').first().click(); await p2.keyboard.press('Space'); }
  }
  await p2.screenshot({ path: OUT + 'v16-civilwar.png' });
  ok(errs2.length === 0, 'no page errors (67 BCE): ' + JSON.stringify(errs2.slice(0, 3)));
  await p2.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
