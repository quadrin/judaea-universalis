// UI verification v1.6: war overview, ledger, diplomatic mapmode, peace map
// highlight, merge-all, save tools, succession cards, and 67 BCE in-browser.
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

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.bm-card', { timeout: 20000 });

const cards = await page.locator('.bm-card').count();
ok(cards === 8, 'eight bookmark cards: ' + cards);
const c2 = (await page.locator('.bm-card').nth(1).textContent()) || '';
ok(/Civil War/.test(c2) && /67 BCE/.test(c2), 'second card is the 67 BCE civil war');
ok(await page.locator('[data-ref="import"]').isVisible(), 'Import save button on start screen');
ok(!(await page.locator('[data-ref="export"]').count()), 'no Export button without a save');

// ---- boot 66 CE as JUD -----------------------------------------------------
await pickBookmark(page, 'Great Revolt');
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(400);

// mapmode bar has 7 buttons incl. diplomatic
const mm = await page.locator('.mm-btn').count();
ok(mm === 8, 'eight mapmode buttons: ' + mm);
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

// save, then check export button appears on a fresh start screen
await page.evaluate(() => window._ctx.bus.emit('saveRequest', {}));
await page.waitForTimeout(300);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.bm-card', { timeout: 20000 });
ok(await page.locator('[data-ref="export"]').isVisible(), 'Export button appears once a save exists');
const dl = page.waitForEvent('download');
await page.locator('[data-ref="export"]').click();
const download = await dl;
ok(/judaea-save-66ce-JUD/.test(download.suggestedFilename()), 'export downloads: ' + download.suggestedFilename());

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
  ok(nCards === 2, '67 BCE offers two playable factions: ' + nCards);
  const bannerTags = await p2.locator('.nc-shield-tag').allTextContents();
  ok(bannerTags.join(',') === 'HYR,ARI', 'HYR and ARI cards: ' + bannerTags.join(','));
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
