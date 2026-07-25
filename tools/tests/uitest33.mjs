// UI verification — v1.9 (SPEC §93): saves with NOTHING set up. No cloud, no
// account, no endpoint, no downloads. The browser's own database is the shelf,
// and the whole loop — save, close the tab, come back, load — has to work on a
// bare `http://…/` with no query string at all.
//
// This is the suite that guards the default experience. uitest32 covers the
// optional cloud on top of it.
import { createRequire } from 'module';

const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const OUT = (process.env.JU_OUT || '/tmp') + '/';
const GAME = 'http://127.0.0.1:8613/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({
  executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

async function land() {
  await page.goto(GAME, { waitUntil: 'networkidle' });
  await page.waitForSelector('.bm-card', { timeout: 60000 });
}
async function startCampaign(dot) {
  await page.locator('.ss-dot').nth(dot).click();
  await page.waitForTimeout(450);
  await page.locator('.bm-card.current').click();
  await page.waitForSelector('.nation-card', { timeout: 60000 });
  await page.locator('.nation-card').first().click();
  await page.waitForSelector('#topbar .tb-flag', { timeout: 60000 });
}
async function saveNow() {
  const before = await page.locator('#toast-container').textContent();
  await page.locator('#topbar [data-ref="save"]').click();
  await page.waitForFunction((prev) => {
    const t = document.getElementById('toast-container').textContent;
    return t !== prev && /Chronicle written|would not take/.test(t);
  }, before, { timeout: 60000 });
  return page.locator('#toast-container').textContent();
}
// The same panel has two doors: the title screen's button and the topbar's
// amphora. Whichever is on screen is the one to use.
const openShelf = async () => {
  const inGame = await page.locator('#topbar .tb-flag').count() > 0
    && await page.locator('#start-screen.hidden').count() > 0;
  await page.locator(inGame ? '#topbar [data-ref="loadsave"]' : '[data-ref="saves"]').click();
  await page.waitForSelector('#saves-panel', { timeout: 60000 });
};

console.log('== nothing is configured ==');
await land();
await page.evaluate(async () => {
  localStorage.clear();
  await new Promise((res) => { const r = indexedDB.deleteDatabase('judaea-universalis'); r.onsuccess = res; r.onerror = res; r.onblocked = res; });
});
await land();
ok(await page.evaluate(() => location.search) === '', 'the game is opened at a bare URL');
await openShelf();
ok(await page.locator('.sv-row').count() === 0, 'the shelf starts empty');
ok(await page.locator('.sv-offer').count() === 0, 'nothing is asking to be configured');
const foot = await page.locator('.sv-cloudline').textContent();
ok(/Saved in this browser/.test(foot), 'and says plainly where campaigns will go: ' + foot.replace(/\s+/g, ' ').trim().slice(0, 80));
ok(/Nothing to set up, and nothing to download/.test(foot), 'and that there is nothing to set up');
ok(!/No cloud is configured/.test(foot), 'without framing the absence of a cloud as a problem');
await page.screenshot({ path: OUT + 'v19-local-empty.png' });
await page.locator('#saves-panel [data-ref="close"]').click();

console.log('== save, with no cloud anywhere ==');
await startCampaign(3); // the Great Revolt, 66 CE
const toast = await saveNow();
ok(/Kept on this device/.test(toast) && !/cloud/.test(toast),
  'the game confirms the save without mentioning a cloud: ' + toast.replace(/\s+/g, ' ').trim().slice(0, 80));

const stored = await page.evaluate(async () => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open('judaea-universalis'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const rows = await new Promise((res, rej) => { const r = db.transaction('saves').objectStore('saves').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return rows.map((r) => ({ id: r.id, bytes: r.json.length, tag: r.meta && r.meta.tag }));
});
ok(stored.length === 1, 'exactly one campaign is in the database');
ok(stored[0].bytes > 50000, 'the whole world went in, not a stub (' + stored[0].bytes + ' bytes)');
ok(stored[0].tag === 'JUD', 'with the metadata the list needs, beside it');
ok(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('ju_save')).length) === 0,
  'and localStorage is not being used for bodies any more');

console.log('== the tab closes and comes back ==');
await land();
ok(await page.locator('.ss-continue').count() === 1, 'Continue is offered on the title screen');
await openShelf();
ok(await page.locator('.sv-row').count() === 1, 'the shelf has the campaign');
ok(/here/.test(await page.locator('.sv-row .sv-where').textContent()), 'marked as living right here');
ok(/Judaea/.test(await page.locator('.sv-row .sv-name').textContent()), 'named by nation and date');
await page.screenshot({ path: OUT + 'v19-local-shelf.png' });

console.log('== and loads with a click, no file dialog ==');
await page.locator('.sv-row .sv-load').click();
await page.waitForSelector('#topbar .tb-flag', { timeout: 60000 });
const loaded = await page.evaluate(() => ({ tag: window._ctx.game.playerTag, y: window._ctx.game.date.y }));
ok(loaded.tag === 'JUD' && loaded.y === 66, 'straight into the world: ' + JSON.stringify(loaded));

console.log('== many campaigns, several chapters ==');
for (let i = 0; i < 3; i++) await saveNow();
await land();
await startCampaign(0); // the Maccabean Revolt, 167 BCE
await saveNow();
await openShelf();
const rows = await page.locator('.sv-row').count();
ok(rows >= 5, 'every save is its own row, across chapters (' + rows + ')');
const names = await page.locator('.sv-list').textContent();
ok(/Maccabean/.test(names) && /Great Revolt/.test(names), 'both chapters are on the shelf together');
const order = await page.locator('.sv-row .sv-name').allTextContents();
ok(/Hasmonean|Judaea|Seleucid/.test(order[0]), 'newest first: ' + order[0]);

console.log('== loading the other chapter from mid-campaign ==');
const greatRevolt = page.locator('.sv-row').filter({ hasText: 'Great Revolt' }).first();
await greatRevolt.locator('.sv-load').click();
await page.waitForSelector('#topbar .tb-flag', { timeout: 60000 });
ok(await page.evaluate(() => window._ctx.game.bookmarkId) === '66ce',
  'the shelf crossed chapters mid-campaign and landed in 66 CE');

console.log('== deleting ==');
await page.locator('#topbar [data-ref="loadsave"]').click();
await page.waitForSelector('#saves-panel .sv-row', { timeout: 60000 });
const was = await page.locator('.sv-row').count();
const doomedId = await page.locator('.sv-row').first().getAttribute('data-id');
const delBtn = page.locator('.sv-row .sv-del').first();
ok((await delBtn.textContent()).trim() === 'Delete',
  'the delete control says what it is, not just an ✕ with a tooltip');

// One tap only arms it — a mis-tap on a phone must not cost a campaign.
await delBtn.click();
ok(/Delete for good/.test(await delBtn.textContent()), 'the first tap asks rather than deletes');
ok(await page.locator('.sv-row').count() === was, 'and nothing is gone yet');

await delBtn.click();
await page.waitForFunction((n) => document.querySelectorAll('.sv-row').length === n - 1, was, { timeout: 60000 });
ok(true, 'the second tap strikes it from the shelf (' + was + ' -> ' + (was - 1) + ')');

const left = await page.evaluate(async () => {
  const db = await new Promise((res) => { const r = indexedDB.open('judaea-universalis'); r.onsuccess = () => res(r.result); });
  const rows = await new Promise((res) => { const r = db.transaction('saves').objectStore('saves').getAll(); r.onsuccess = () => res(r.result); });
  return rows.map((r) => r.id);
});
ok(!left.includes(doomedId), 'the body is really gone from the database, not just the row');
ok(left.length === was - 1, 'and nothing else was taken with it (' + left.length + ' left)');

// Arming and then walking away must disarm rather than stay hot.
const nextBtn = page.locator('.sv-row .sv-del').first();
await nextBtn.click();
await page.waitForFunction(() => {
  const b = document.querySelector('.sv-row .sv-del');
  return b && b.textContent.trim() === 'Delete';
}, null, { timeout: 60000 });
ok(await page.locator('.sv-row').count() === was - 1, 'an armed delete disarms itself if left alone');

console.log('== a save written by the old localStorage build still loads ==');
await land();
await page.evaluate(async () => {
  // Exactly the shape main.js wrote before §93: ju_save_<chapter>, no index.
  const db = await new Promise((res) => { const r = indexedDB.open('judaea-universalis'); r.onsuccess = () => res(r.result); });
  const rows = await new Promise((res) => { const r = db.transaction('saves').objectStore('saves').getAll(); r.onsuccess = () => res(r.result); });
  const body = rows.find((x) => x.meta && x.meta.bookmarkId === '66ce');
  await new Promise((res) => { const t = db.transaction('saves', 'readwrite'); t.objectStore('saves').clear(); t.oncomplete = res; });
  localStorage.setItem('ju_save_66ce', body.json);
});
await land();
await openShelf();
await page.waitForSelector('#saves-panel .sv-row', { timeout: 60000 });
ok(await page.locator('.sv-row').count() === 1, 'the legacy save is listed');
const migrated = await page.evaluate(async () => {
  const db = await new Promise((res) => { const r = indexedDB.open('judaea-universalis'); r.onsuccess = () => res(r.result); });
  const rows = await new Promise((res) => { const r = db.transaction('saves').objectStore('saves').getAll(); r.onsuccess = () => res(r.result); });
  return { inDb: rows.map((r) => r.id), stillInLs: Object.keys(localStorage).filter((k) => k.startsWith('ju_save')) };
});
ok(migrated.inDb.includes('auto-66ce'), 'and was moved into the database: ' + JSON.stringify(migrated.inDb));
ok(migrated.stillInLs.length === 0, 'freeing the localStorage quota it was holding');
await page.locator('.sv-row .sv-load').click();
await page.waitForSelector('#topbar .tb-flag', { timeout: 60000 });
ok(await page.evaluate(() => window._ctx.game.bookmarkId) === '66ce', 'and it still plays');

ok(errors.filter((e) => !/stun|ice|turn|404/i.test(e)).length === 0,
  'no page errors throughout: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
