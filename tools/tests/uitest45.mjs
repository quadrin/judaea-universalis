// UI verification — SPEC §216: two Jewish states at one table. The 67 BCE
// civil war hosted as Hyrcanus with the guest seated on Aristobulus, in two
// real browsers over real WebRTC: the lobby's seat picker, both chairs human
// and neither of them the other's, the guest ordering ITS OWN army through the
// host, and a card addressed to the guest's throne arriving with live buttons
// whose answer lands on the host's world.
//
// The hand-carried invite flow (no cloud), same as uitest5 — the seating is
// what is under test here, not the handshake.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
// SPEC §160/§205: the start screen is gated on the province raster — one
// fullscreen draw over every texel against every seed, on SwiftShader.
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

console.log('== the host takes Hyrcanus and mints an invite ==');
const ctxH = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const { page: host, errors: hostErrors } = await boot(ctxH);
await host.locator('[data-ref="mp"]').click();
await host.waitForSelector('#mp-lobby:not(.hidden)');
await host.locator('[data-ref="host"]').click();
await host.selectOption('[data-ref="bm"]', '1');       // The Judaean Civil War, 67 BCE
await host.selectOption('[data-ref="tag"]', 'HYR');    // Hyrcanus II
ok(await host.locator('.mp-seat').count() === 0, 'no seat picker before anybody has joined');
await host.locator('[data-ref="invite"]').click();
await host.waitForFunction(() => {
  const ta = document.querySelector('[data-ref="invcode"]');
  return ta && /^JU[12]\./.test(ta.value);
}, null, { timeout: 15000 });
const invite = await host.locator('[data-ref="invcode"]').inputValue();

console.log('== the guest joins ==');
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
const reply = await guest.locator('[data-ref="reply"]').inputValue();
await host.fill('[data-ref="reply"]', reply);
await host.locator('[data-ref="accept"]').click();
await host.waitForSelector('.mp-seat', { timeout: 20000 });
ok(true, 'the connected guest brings a seat picker with it');
await guest.waitForFunction(() => {
  const w = document.querySelector('[data-ref="pickwrap"]');
  return w && /your own throne/.test(w.textContent) && /Aristobulus/.test(w.textContent);
}, null, { timeout: 10000 });
ok(true, 'and lands on Aristobulus without anybody touching the picker — the default is a throne each');

console.log('== the picker moves them, both ways ==');
const seatOpts = await host.locator('.mp-seat option').allTextContents();
ok(seatOpts.length === 3 && /Beside you/.test(seatOpts[0]),
  "the chapter's other standards are on the menu: " + JSON.stringify(seatOpts));
await host.selectOption('.mp-seat', 'shared');
await guest.waitForFunction(() => {
  const w = document.querySelector('[data-ref="pickwrap"]');
  return w && /rule it together/.test(w.textContent);
}, null, { timeout: 10000 });
ok(true, 'seated beside the host, the guest is told the realm is shared');
await host.selectOption('.mp-seat', 'ARI');
await host.waitForFunction(() => {
  const rows = [...document.querySelectorAll('.mp-player')];
  return rows.length >= 2 && /Hyrcanus/.test(rows[0].textContent);
}, null, { timeout: 8000 });
ok(true, 'the host row still reads Hyrcanus');
await guest.waitForFunction(() => {
  const w = document.querySelector('[data-ref="pickwrap"]');
  return w && /your own throne/.test(w.textContent) && /Aristobulus/.test(w.textContent);
}, null, { timeout: 10000 });
ok(true, 'and the guest is told the throne is theirs, beside the host\'s');
await host.screenshot({ path: OUT + 'v215-lobby-host.png' });
await guest.screenshot({ path: OUT + 'v215-lobby-guest.png' });

console.log('== begin: two crowns, one world ==');
await host.locator('[data-ref="begin"]').click();
await host.waitForFunction(() => !!window._ctx, null, { timeout: 15000 });
await guest.waitForFunction(() => !!window._ctx, null, { timeout: 20000 });
const hostState = await host.evaluate(() => ({
  tag: window._ctx.game.playerTag,
  humans: window._ctx.game.humanTags,
  hyrAi: window._ctx.game.tags.HYR.ai,
  ariAi: window._ctx.game.tags.ARI.ai,
  romAi: window._ctx.game.tags.ROM.ai,
  role: window._mp.role,
  seats: window._mp.guests.map((g) => g.tag),
}));
ok(hostState.tag === 'HYR' && hostState.role === 'host' && hostState.seats.join(',') === 'ARI',
  'the host runs the world as Hyrcanus with the guest seated on Aristobulus: ' + JSON.stringify(hostState));
ok(hostState.humans.join(',') === 'HYR,ARI' && !hostState.hyrAi && !hostState.ariAi && hostState.romAi === true,
  'both thrones are human and the world around them is not');
const guestState = await guest.evaluate(() => ({
  tag: window._ctx.game.playerTag, role: window._mp.role,
  name: window._ctx.game.tags[window._ctx.game.playerTag].name,
}));
ok(guestState.tag === 'ARI' && guestState.role === 'guest',
  'the guest sits in its own chair: ' + JSON.stringify(guestState));

console.log('== the guest\'s court is the guest\'s ==');
const courts = {
  guest: await guest.evaluate(() => (window._actions.getFactions() || []).map((f) => f.id)),
  host: await host.evaluate(() => (window._actions.getFactions() || []).map((f) => f.id)),
};
ok(courts.guest.length > 0 && courts.host.length > 0
  && courts.guest.join(',') !== courts.host.join(','),
'each chair convenes its own estates: ' + JSON.stringify(courts));

console.log('== the guest marches its own army ==');
const ariArmy = await guest.evaluate(() => {
  const g = window._ctx.game;
  const a = Object.values(g.armies).find((x) => x && x.tag === 'ARI' && !x.inBattle);
  if (!a) return null;
  const dest = [...window._ctx.geom.neighbors[a.prov]][0];
  window._actions.moveArmy(a.id, dest); // proxied -> {t:'cmd'} -> host, under ARI
  return { id: a.id, from: a.prov, dest };
});
ok(!!ariArmy, 'the guest ordered an Aristobulan march: ' + JSON.stringify(ariArmy));
const marched = await host.waitForFunction((id) => {
  const a = window._ctx.game.armies[id];
  return a && a.path && a.path.length > 0;
}, ariArmy.id, { timeout: 10000 }).then(() => true).catch(() => false);
ok(marched, "the host accepted an order for a realm that is not its own");
const chairKept = await host.evaluate(() => window._ctx.game.playerTag);
ok(chairKept === 'HYR', 'and sat back down in its own chair afterwards');

console.log('== a card for the guest\'s throne is the guest\'s to answer ==');
await host.evaluate(() => { window._ctx.game.paused = true; });
const before = await host.evaluate(() => window._ctx.game.tags.ARI.legitimacy);
await host.evaluate(() => {
  window._ctx.helpers.fireEvent(window._ctx, 'ev4_embassy_ari');
});
await guest.waitForFunction(() => {
  const el = document.getElementById('event-modal');
  if (el.classList.contains('hidden')) return false;
  const t = el.querySelector('.ev-title');
  return !!t && /Embassy/.test(t.textContent);
}, null, { timeout: 10000 });
ok(true, "the card addressed to Aristobulus arrived at Aristobulus' table");
ok(await guest.locator('#event-modal .ev-opt[disabled]').count() === 0,
  'its buttons are live — nobody else is in that chair to answer for them');
ok(await host.locator('#event-modal:not(.hidden) .ev-title').count() === 0,
  'and the host was not dealt a card for a court it does not hold');
await guest.screenshot({ path: OUT + 'v215-guest-card.png' });
await guest.locator('#event-modal .ev-opt').nth(1).click(); // 'A king does not plead' — +5 legitimacy
await host.waitForFunction((was) => window._ctx.game.tags.ARI.legitimacy > was, before, { timeout: 10000 });
ok(true, "the guest's answer ran on the host, under the guest's crown");
const hostChairAfter = await host.evaluate(() => ({
  tag: window._ctx.game.playerTag,
  pending: window._ctx.game.pendingEvents.length,
}));
ok(hostChairAfter.tag === 'HYR' && hostChairAfter.pending === 0,
  'the card left the table and the host kept its chair: ' + JSON.stringify(hostChairAfter));
await guest.waitForFunction(() => document.getElementById('event-modal').classList.contains('hidden'),
  null, { timeout: 8000 });
ok(true, 'and the card closed on the guest');

console.log('== the host\'s own news stays the host\'s ==');
await host.evaluate(() => { window._ctx.bus.emit('notify', { title: 'Hyrcanus Only', text: 'not for the rival court', type: 'info' }); });
await host.waitForFunction(() => /Hyrcanus Only/.test(document.getElementById('toast-container').textContent),
  null, { timeout: 8000 });
await guest.waitForTimeout(1200);
const leaked = await guest.evaluate(() => /Hyrcanus Only/.test(document.getElementById('toast-container').textContent));
ok(!leaked, "a rival court does not read the host realm's dispatches");

console.log('== time still flows from the one clock ==');
await host.evaluate(() => { window._ctx.game.speed = 5; window._ctx.game.paused = false; });
await host.waitForTimeout(1500);
await host.evaluate(() => { window._ctx.game.paused = true; });
await host.waitForTimeout(900);
const dates = {
  host: await host.evaluate(() => ({ ...window._ctx.game.date })),
  guest: await guest.evaluate(() => ({ ...window._ctx.game.date, paused: window._ctx.game.paused })),
};
ok(dates.host.d === dates.guest.d && dates.host.m === dates.guest.m,
  `the guest mirrors the host clock: ${JSON.stringify(dates)}`);
const stillSeated = await guest.evaluate(() => window._ctx.game.playerTag);
ok(stillSeated === 'ARI', 'and snapshots leave the guest in its own chair');

console.log('== the clock, from both sides ==');
// Pause and speed answer under the finger on the guest, then the host's own
// world agrees. A guest never ticks, so its clock is display until the
// snapshot lands — but the display must not lag the press.
await host.evaluate(() => { window._ctx.game.paused = false; window._mp.snapDirty = true; });
await guest.waitForFunction(() => window._ctx.game.paused === false, null, { timeout: 8000 });
await guest.evaluate(() => { window._actions.togglePause(); });
const feltAtOnce = await guest.evaluate(() => window._ctx.game.paused);
ok(feltAtOnce === true, 'the guest\'s pause answers on the guest at once, without waiting for the host');
await host.waitForFunction(() => window._ctx.game.paused === true, null, { timeout: 8000 });
ok(true, 'and the host\'s world stops with it');
await guest.evaluate(() => { window._actions.setSpeed(4); });
ok(await guest.evaluate(() => window._ctx.game.speed) === 4, 'so does a speed change');
await host.waitForFunction(() => window._ctx.game.speed === 4, null, { timeout: 8000 });
ok(true, 'and the host runs at the speed the guest asked for');
await guest.evaluate(() => { window._actions.togglePause(); });
await host.waitForFunction(() => window._ctx.game.paused === false, null, { timeout: 8000 });
ok(true, 'the guest starts the clock again too');

console.log('== a card at one chair holds the clock at both ==');
await host.evaluate(() => {
  window._ctx.helpers.fireEvent(window._ctx, 'ev4_embassy_ari'); // addressed to ARI
});
await guest.waitForFunction(() => {
  const el = document.getElementById('event-modal');
  return !el.classList.contains('hidden') && /Embassy/.test(el.textContent);
}, null, { timeout: 10000 });
ok(await host.evaluate(() => window._ctx.game.paused) === true, 'the guest\'s card stopped the world');
await host.evaluate(() => { window._actions.togglePause(); });
await host.waitForTimeout(400);
ok(await host.evaluate(() => window._ctx.game.paused) === true,
  'and the host cannot start it while the guest still holds the card');
const held = await host.evaluate(() => document.getElementById('toast-container').textContent);
ok(/world waits|still on the table/i.test(held), 'the host is told why: ' + JSON.stringify(held.slice(-90)));
await guest.locator('#event-modal .ev-opt').first().click();
await host.waitForFunction(() => window._ctx.game.pendingEvents.length === 0, null, { timeout: 10000 });
await host.evaluate(() => { window._actions.togglePause(); });
await host.waitForFunction(() => window._ctx.game.paused === false, null, { timeout: 8000 });
ok(true, 'once answered, the host may start the clock again');

console.log('== world history is anybody\'s to answer ==');
await host.evaluate(() => {
  const g = window._ctx.game;
  g.paused = true;
  window._ctx.dynEvents.set('ev_test_world_mp', {
    id: 'ev_test_world_mp', title: 'A World Dispatch', desc: 'It happened elsewhere.',
    forTag: 'both', world: true, aiOption: 0,
    options: [{ label: 'So be it', effects: (c) => c.helpers.setFlag(c, 'mpWorldDone', true) }],
  });
  window._ctx.bus.emit('event', {
    instanceId: 9911, event: window._ctx.dynEvents.get('ev_test_world_mp'), forTag: g.playerTag,
  });
  g.pendingEvents.push({ instanceId: 9911, eventId: 'ev_test_world_mp', forTag: g.playerTag });
});
await guest.waitForFunction(() => {
  const el = document.getElementById('event-modal');
  return !el.classList.contains('hidden') && /A World Dispatch/.test(el.textContent);
}, null, { timeout: 10000 });
ok(true, 'a world card reaches the guest as well as the host');
ok(await guest.locator('#event-modal .ev-opt[disabled]').count() === 0,
  'and its button is live for them — either player may answer it');
await guest.locator('#event-modal .ev-opt').first().click();
await host.waitForFunction(() => window._ctx.game.flags.mpWorldDone === true, null, { timeout: 10000 });
ok(true, 'the guest answered world history for the table, and it ran on the world');
await host.waitForFunction(() => {
  const el = document.getElementById('event-modal');
  return el.classList.contains('hidden') || !/A World Dispatch/.test(el.textContent);
}, null, { timeout: 8000 });
ok(true, 'and the host\'s own copy came off the table with it');

const errs = hostErrors.concat(guestErrors).filter((e) => !/stun|ice|turn/i.test(e));
ok(errs.length === 0, 'no page errors across both browsers: ' + JSON.stringify(errs.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
