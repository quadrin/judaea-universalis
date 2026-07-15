// UI verification — v2.8 foreign courts: clicking a flag chip anywhere opens
// that nation's panel read-only; the levers stay hidden; the topbar flag and
// the home chip bring you back to your own realm.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
const { chromium } = require('playwright');
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
await page.waitForSelector('.bm-card', { timeout: 20000 });
for (let i = 0; i < 10; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click(); // JUD — at war with Rome
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(400);

console.log('== a ledger flag opens the foreign court ==');
await page.keyboard.press('l');
await page.waitForSelector('#ledger-modal .fchip-link');
ok(await page.locator('#ledger-modal .fchip-link').count() >= 5, 'ledger chips are links');
await page.locator('#ledger-modal .fchip-link[data-open-tag="ROM"]').first().click();
await page.waitForTimeout(300);
ok(await page.evaluate(() => document.getElementById('ledger-modal').classList.contains('hidden')), 'the ledger closed');
ok(await page.evaluate(() => !document.getElementById('nation-panel').classList.contains('hidden')), 'the nation panel opened');
const romView = await page.evaluate(() => ({
  name: document.querySelector('#nation-panel [data-ref="name"]').textContent,
  noteHidden: document.querySelector('#nation-panel [data-ref="foreignNote"]').classList.contains('hidden'),
  actsHidden: document.querySelector('#nation-panel [data-ref="acts"]').classList.contains('hidden'),
  missionsHidden: document.querySelector('#nation-panel [data-ref="missionsBlock"]').classList.contains('hidden'),
  decisionsHidden: document.querySelector('#nation-panel [data-ref="decisionsBlock"]').classList.contains('hidden'),
  opinionShown: !document.querySelector('#nation-panel [data-ref="opinionRow"]').classList.contains('hidden'),
  standing: document.querySelector('#nation-panel [data-ref="standing"]').textContent,
  techButtons: document.querySelectorAll('#nation-panel [data-tech]').length,
  ideaButtons: document.querySelectorAll('#nation-panel [data-idea]').length,
  decButtons: document.querySelectorAll('#nation-panel [data-decision]').length,
  techLvls: document.querySelectorAll('#nation-panel .np-tech-lvl').length,
  reformPips: document.querySelectorAll('#nation-panel .np-pip').length,
}));
ok(/Rome/i.test(romView.name), 'it is Rome\'s court: ' + romView.name);
ok(!romView.noteHidden, 'the foreign-court note shows');
ok(romView.actsHidden && romView.missionsHidden && romView.decisionsHidden, 'levers hidden: acts/missions/decisions');
ok(romView.opinionShown, 'their opinion of us shows');
ok(/At war with us/i.test(romView.standing), 'standing reads the war: ' + romView.standing.trim());
ok(romView.techButtons === 0 && romView.ideaButtons === 0 && romView.decButtons === 0,
  'no buy buttons anywhere: ' + [romView.techButtons, romView.ideaButtons, romView.decButtons].join('/'));
ok(romView.techLvls === 3, 'tech levels are shown read-only: ' + romView.techLvls);
ok(romView.reformPips > 0, 'reform pips are shown read-only: ' + romView.reformPips);
await page.screenshot({ path: OUT + 'v28-foreign-rome.png' });

console.log('== the diplomacy rows walk from court to court ==');
// Rome's war row leads with its opponent's chip (us or a fellow rebel);
// clicking any diplomacy chip must swap the panel to that nation.
const firstDipTag = await page.evaluate(() => {
  const c = document.querySelector('#nation-panel .pp-diplo .fchip-link');
  return c ? c.dataset.openTag : null;
});
ok(!!firstDipTag, 'diplomacy rows carry linked chips: ' + firstDipTag);
if (firstDipTag) {
  await page.locator('#nation-panel .pp-diplo .fchip-link').first().click();
  await page.waitForTimeout(250);
  const now = await page.evaluate(() => window._ctx.game.tags[
    document.querySelector('#nation-panel [data-ref="name"]').textContent.replace(' †', '')
  ] ? document.querySelector('#nation-panel [data-ref="name"]').textContent : null);
  ok(await page.evaluate((t) => {
    const g = window._ctx.game;
    const nm = document.querySelector('#nation-panel [data-ref="name"]').textContent.replace(' †', '');
    return (g.tags[t] && (g.tags[t].name === nm)) || false;
  }, firstDipTag), 'the panel swapped to ' + firstDipTag + ' (' + now + ')');
}

console.log('== the home chip and the topbar flag bring you back ==');
// wherever we drifted, open Rome again, then come home via the home chip
await page.keyboard.press('l');
await page.waitForSelector('#ledger-modal .fchip-link[data-open-tag="ROM"]');
await page.locator('#ledger-modal .fchip-link[data-open-tag="ROM"]').first().click();
await page.waitForTimeout(250);
await page.locator('#nation-panel [data-ref="homeChip"] .fchip-link').click();
await page.waitForTimeout(250);
let home = await page.evaluate(() => ({
  name: document.querySelector('#nation-panel [data-ref="name"]').textContent,
  noteHidden: document.querySelector('#nation-panel [data-ref="foreignNote"]').classList.contains('hidden'),
  actsShown: !document.querySelector('#nation-panel [data-ref="acts"]').classList.contains('hidden'),
}));
ok(/Judaea/i.test(home.name) && home.noteHidden && home.actsShown, 'home again with the levers back: ' + home.name);
// foreign again → the topbar flag goes home rather than closing
await page.keyboard.press('l');
await page.waitForSelector('#ledger-modal .fchip-link[data-open-tag="ROM"]');
await page.locator('#ledger-modal .fchip-link[data-open-tag="ROM"]').first().click();
await page.waitForTimeout(250);
await page.locator('.tb-flag').click();
await page.waitForTimeout(250);
home = await page.evaluate(() => ({
  open: !document.getElementById('nation-panel').classList.contains('hidden'),
  name: document.querySelector('#nation-panel [data-ref="name"]').textContent,
}));
ok(home.open && /Judaea/i.test(home.name), 'the topbar flag came home: ' + home.name);
await page.locator('.tb-flag').click();
await page.waitForTimeout(250);
ok(await page.evaluate(() => document.getElementById('nation-panel').classList.contains('hidden')),
  'and a second click closes as before');

console.log('== the outliner war chip opens the enemy, not the war ==');
const olChip = await page.locator('#outliner .fchip-link').count();
if (olChip > 0) {
  await page.locator('#outliner .fchip-link').first().click();
  await page.waitForTimeout(250);
  const st = await page.evaluate(() => ({
    panelOpen: !document.getElementById('nation-panel').classList.contains('hidden'),
    warModal: document.getElementById('war-modal'),
  }));
  ok(st.panelOpen, 'the enemy\'s court opened');
  ok(!st.warModal || await page.evaluate(() => document.getElementById('war-modal').classList.contains('hidden')),
    'the war overview did not also open');
} else {
  ok(false, 'no linked chip in the outliner war row');
}

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
