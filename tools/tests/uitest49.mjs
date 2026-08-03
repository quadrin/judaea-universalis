// UI verification — the report: "my friend as Agrippa can't take provinces in
// his independence war." 66 CE, host as Judaea, guest as Agrippa; the guest
// takes The Client's War, its army holds Roman ground, and the guest drives
// its OWN peace table through the DOM to demand it. Every layer below this one
// is already covered headlessly and answers identically for a guest and for a
// solo Agrippa, so this suite is about the panel and the wire.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 480000);
const OUT = (process.env.JU_OUT || '/tmp') + '/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({
  executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader', '--disable-features=WebRtcHideLocalIpsWithMdns'],
});

async function boot(ctxB) {
  const page = await ctxB.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.bm-card', { timeout: BOOT_MS });
  return { page, errors };
}

console.log('== 66 CE: Judaea hosts, Agrippa joins ==');
const ctxH = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const { page: host, errors: hostErrors } = await boot(ctxH);
await host.locator('[data-ref="mp"]').click();
await host.waitForSelector('#mp-lobby:not(.hidden)');
await host.locator('[data-ref="host"]').click();
await host.selectOption('[data-ref="bm"]', '3');       // The Great Revolt, 66 CE
await host.selectOption('[data-ref="tag"]', 'JUD');
await host.locator('[data-ref="invite"]').click();
await host.waitForFunction(() => {
  const ta = document.querySelector('[data-ref="invcode"]');
  return ta && /^JU[12]\./.test(ta.value);
}, null, { timeout: 15000 });
const invite = await host.locator('[data-ref="invcode"]').inputValue();

const ctxG = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const { page: guest, errors: guestErrors } = await boot(ctxG);
await guest.locator('[data-ref="mp"]').click();
await guest.waitForSelector('#mp-lobby:not(.hidden)');
await guest.locator('[data-ref="join"]').click();
await guest.fill('[data-ref="invite"]', invite);
await guest.locator('[data-ref="answer"]').click();
await guest.waitForFunction(() => {
  const ta = document.querySelector('[data-ref="reply"]');
  return ta && /^JU[12]\./.test(ta.value);
}, null, { timeout: 15000 });
await host.fill('[data-ref="reply"]', await guest.locator('[data-ref="reply"]').inputValue());
await host.locator('[data-ref="accept"]').click();
await host.waitForSelector('.mp-seat', { timeout: 20000 });
await host.selectOption('.mp-seat', 'AGR');            // the last Herodian
await host.locator('[data-ref="begin"]').click();
await host.waitForFunction(() => !!window._ctx, null, { timeout: 15000 });
await guest.waitForFunction(() => !!window._ctx, null, { timeout: 20000 });
ok(await guest.evaluate(() => window._ctx.game.playerTag) === 'AGR', 'the guest is Agrippa');

console.log('== the Client\'s War, taken by the guest ==');
await host.evaluate(() => {
  const g = window._ctx.game;
  g.paused = true;
  g.date.y = 70;
  // The card is the only road to independence for a client, and it is the
  // guest's own court's decision — so it is dealt to them and answered there.
  window._ctx.helpers.fireEvent(window._ctx, 'ev_ag_the_clients_war');
});
await guest.waitForFunction(() => {
  const el = document.getElementById('event-modal');
  return !el.classList.contains('hidden') && /Client/.test(el.textContent);
}, null, { timeout: 10000 });
ok(true, "the card reached Agrippa's own table");
ok(await guest.locator('#event-modal .ev-opt[disabled]').count() === 0,
  'and it is theirs to answer, not the host\'s');
await guest.locator('#event-modal .ev-opt').first().click();  // the crown into our own hands
await host.waitForFunction(() => (window._ctx.game.wars || []).some((w) => w && w.cb === 'independence'),
  null, { timeout: 10000 });
ok(true, 'the guest declared its war of independence from the host\'s world');

console.log('== the guest holds Roman ground ==');
const held = await host.evaluate(() => {
  const g = window._ctx.game;
  const war = (g.wars || []).find((w) => w && w.cb === 'independence');
  const land = Object.values(g.provinces).filter((p) => p && p.owner === 'ROM').slice(0, 2);
  for (const p of land) window._ctx.helpers.changeController(window._ctx, p.name, 'AGR');
  war.warscore = { ...(war.warscore || {}), AGR: 80 };
  window._mp.snapDirty = true;
  return { warId: war.id, names: land.map((p) => p.name), ids: land.map((p) => p.id) };
});
await guest.waitForFunction((ids) => ids.every((id) => window._ctx.game.provinces[id].controller === 'AGR'),
  held.ids, { timeout: 10000 });
ok(true, 'the guest\'s mirror shows them held: ' + held.names.join(', '));

console.log('== the guest\'s own peace table ==');
const table = await guest.evaluate((warId) => {
  const info = window._actions.getPeaceInfo(warId, 'ROM');
  return info ? {
    provinces: (info.provinces || []).map((p) => p.name || p),
    myWs: info.myWs, envoyMonthsLeft: info.envoyMonthsLeft, noNegotiation: info.noNegotiation,
  } : null;
}, held.warId);
ok(!!table, 'the guest gets a peace table at all');
ok(table && table.provinces.length >= 2,
  'and it offers the ground they hold: ' + JSON.stringify(table && table.provinces));
ok(table && !table.envoyMonthsLeft,
  'their envoys are not cooled by anything the host did — ' + JSON.stringify(table && table.envoyMonthsLeft));
const verdict = await guest.evaluate((h) => {
  const ev = window._actions.evaluatePeace(h.warId, { enemy: 'ROM', provinces: h.ids });
  return ev ? { acceptable: ev.acceptable, reason: ev.reason } : null;
}, held);
ok(verdict && verdict.acceptable, 'demanding both is acceptable to Rome: ' + JSON.stringify(verdict));

console.log('== and the demand goes through the wire ==');
await guest.evaluate((h) => {
  window._actions.offerPeaceDeal(h.warId, { enemy: 'ROM', provinces: h.ids });
}, held);
const taken = await host.waitForFunction((ids) => ids.every((id) => window._ctx.game.provinces[id].owner === 'AGR'),
  held.ids, { timeout: 10000 }).then(() => true).catch(() => false);
ok(taken, 'the host\'s world hands Agrippa the provinces he demanded');
const owner = await host.evaluate((ids) => ids.map((id) => window._ctx.game.provinces[id].owner), held.ids);
ok(owner.every((o) => o === 'AGR'), 'both are Agrippa\'s: ' + JSON.stringify(owner));
await guest.screenshot({ path: OUT + 'v216-agrippa-guest.png' });

const errs = hostErrors.concat(guestErrors).filter((e) => !/stun|ice|turn/i.test(e));
ok(errs.length === 0, 'no page errors across both browsers: ' + JSON.stringify(errs.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
