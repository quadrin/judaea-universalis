// UI verification — v1.8: bookmark carousel + co-op multiplayer (host/join
// lobby, invite/reply codes, guests share the host's nation, guest commands).
// Two browser contexts connect over real WebRTC (host candidates; no STUN needed).
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
const { chromium } = require('playwright');
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
  await page.waitForSelector('.bm-card', { timeout: 20000 });
  return { page, errors };
}

console.log('== carousel ==');
const ctxH = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const { page: host, errors: hostErrors } = await boot(ctxH);
ok(await host.locator('.bm-card').count() === 8, 'all eight chapters in the track');
ok(await host.locator('.ss-arrow').count() === 2, 'prev/next arrows present');
ok(await host.locator('.ss-dot').count() === 8, 'eight dots');
const first = await host.locator('.bm-card.current').textContent();
ok(first.includes('Maccabean'), 'starts on 167 BCE: ' + first.slice(0, 40).trim());
await host.locator('.ss-next').click();
await host.waitForTimeout(450);
const second = await host.locator('.bm-card.current').textContent();
ok(second.includes('Civil War'), 'arrow slides to 67 BCE');
await host.keyboard.press('ArrowLeft');
await host.waitForTimeout(450);
ok(((await host.locator('.bm-card.current').textContent()) || '').includes('Maccabean'), 'keyboard arrow slides back');
await host.locator('.ss-dot').nth(3).click();
await host.waitForTimeout(450);
ok(((await host.locator('.bm-card.current').textContent()) || '').includes('Great Revolt'), 'dot jumps to 66 CE');

console.log('== multiplayer lobby: host mints an invite ==');
await host.locator('[data-ref="mp"]').click();
await host.waitForSelector('#mp-lobby:not(.hidden)');
await host.locator('[data-ref="host"]').click();
// chapter: Great Revolt (index 2), nation JUD (first option)
await host.selectOption('[data-ref="bm"]', '3');
await host.locator('[data-ref="invite"]').click();
await host.waitForFunction(() => {
  const ta = document.querySelector('[data-ref="invcode"]');
  return ta && ta.value.startsWith('JU1.');
}, null, { timeout: 15000 });
const invite = await host.locator('[data-ref="invcode"]').inputValue();
ok(invite.length > 100, 'invite code minted (' + invite.length + ' chars)');

console.log('== guest answers ==');
const ctxG = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const { page: guest, errors: guestErrors } = await boot(ctxG);
await guest.locator('[data-ref="mp"]').click();
await guest.waitForSelector('#mp-lobby:not(.hidden)');
await guest.locator('[data-ref="join"]').click();
await guest.fill('[data-ref="invite"]', invite);
await guest.locator('[data-ref="answer"]').click();
await guest.waitForFunction(() => {
  const ta = document.querySelector('[data-ref="reply"]');
  return ta && ta.value.startsWith('JU1.');
}, null, { timeout: 15000 });
const reply = await guest.locator('[data-ref="reply"]').inputValue();
ok(reply.length > 100, 'reply code produced (' + reply.length + ' chars)');

console.log('== host accepts; guest joins the shared throne ==');
await host.fill('[data-ref="reply"]', reply);
await host.locator('[data-ref="accept"]').click();
await host.waitForFunction(() => {
  const rows = [...document.querySelectorAll('.mp-player')];
  return rows.length >= 2 && rows.every((r) => /Judaea/.test(r.textContent));
}, null, { timeout: 20000 });
ok(true, 'host list shows both players on Judaea');
await guest.waitForFunction(() => {
  const w = document.querySelector('[data-ref="pickwrap"]');
  return w && /rule it together/.test(w.textContent);
}, null, { timeout: 10000 });
ok(await guest.locator('[data-pick]').count() === 0, 'guest has no nation pick — the realm is shared');
await host.screenshot({ path: OUT + 'v18-lobby-host.png' });

console.log('== begin the campaign ==');
await host.locator('[data-ref="begin"]').click();
await host.waitForFunction(() => !!window._ctx, null, { timeout: 15000 });
await guest.waitForFunction(() => !!window._ctx, null, { timeout: 20000 });
const hostState = await host.evaluate(() => ({
  tag: window._ctx.game.playerTag,
  humans: window._ctx.game.humanTags,
  judAi: window._ctx.game.tags.JUD.ai,
  romAi: window._ctx.game.tags.ROM.ai,
  role: window._mp.role,
  guests: window._mp.guests.length,
}));
ok(hostState.tag === 'JUD' && hostState.role === 'host' && hostState.guests === 1, 'host runs the world as JUD: ' + JSON.stringify(hostState));
ok(hostState.humans.join(',') === 'JUD' && !hostState.judAi && hostState.romAi === true,
  'one shared human realm; Rome stays AI');
const guestState = await guest.evaluate(() => ({
  tag: window._ctx.game.playerTag, role: window._mp.role, date: { ...window._ctx.game.date },
}));
ok(guestState.tag === 'JUD' && guestState.role === 'guest', 'guest shares the Judaean chair: ' + JSON.stringify(guestState));

console.log('== time flows from host to guest ==');
await host.evaluate(() => { window._ctx.game.speed = 5; window._ctx.game.paused = false; });
await host.waitForTimeout(1500);
await host.evaluate(() => { window._ctx.game.paused = true; });
await host.waitForTimeout(800); // heartbeat carries the pause
const dates = {
  host: await host.evaluate(() => ({ ...window._ctx.game.date })),
  guest: await guest.evaluate(() => ({ ...window._ctx.game.date, paused: window._ctx.game.paused })),
};
ok(dates.host.d === dates.guest.d && dates.host.m === dates.guest.m, `guest mirrors the host clock: ${JSON.stringify(dates)}`);
ok(dates.guest.paused === true, 'pause reached the guest');

console.log("== guest orders the shared realm's army ==");
const judArmy = await guest.evaluate(() => {
  const g = window._ctx.game;
  const a = Object.values(g.armies).find((x) => x && x.tag === 'JUD' && !x.inBattle);
  if (!a) return null;
  const dest = [...window._ctx.geom.neighbors[a.prov]][0];
  window._actions.moveArmy(a.id, dest); // proxied -> {t:'cmd'} to the host
  return { id: a.id, from: a.prov, dest };
});
ok(!!judArmy, 'guest ordered a Judaean march: ' + JSON.stringify(judArmy));
await host.waitForFunction(() => window._ctx.game.pendingCommands.some((cmd) => cmd && cmd.name === 'moveArmy'), null, { timeout: 10000 });
const heldPath = await host.evaluate((id) => window._ctx.game.armies[id].path.length, judArmy.id);
ok(heldPath === 0, 'the host holds the march while the shared clock is paused');
await guest.evaluate(() => { window._actions.togglePause(); });
await host.waitForFunction((id) => {
  const a = window._ctx.game.armies[id];
  return a && a.path && a.path.length > 0;
}, judArmy.id, { timeout: 10000 });
ok(true, 'host executed the order after the guest resumed time (path set)');
const echoed = await guest.waitForFunction((id) => {
  const a = window._ctx.game.armies[id];
  return a && a.path && a.path.length > 0;
}, judArmy.id, { timeout: 10000 }).then(() => true).catch(() => false);
ok(echoed, 'the marching column echoed back in a snapshot');

console.log('== guest steers the shared clock ==');
await guest.evaluate(() => { window._actions.setSpeed(4); });
await host.waitForFunction(() => window._ctx.game.speed === 4, null, { timeout: 8000 });
ok(true, "guest's setSpeed reached the host (2 -> 4)");
const guestPerspective = await guest.evaluate(() => {
  const g = window._ctx.game;
  return { player: g.playerTag, judHuman: g.tags.JUD.ai === false };
});
ok(guestPerspective.player === 'JUD' && guestPerspective.judHuman, 'snapshots keep the shared chair intact');
await guest.screenshot({ path: OUT + 'v18-guest.png' });

console.log('== guests see event cards read-only ==');
// The opening scripted events fired while the clock ran; the guest mirrors
// them. Drain them on the host — each resolution should close the guest copy.
for (let i = 0; i < 8; i++) {
  const n = await host.locator('#event-modal:not(.hidden) .ev-opt').count();
  if (!n) break;
  await host.locator('#event-modal .ev-opt').first().click();
  await host.waitForTimeout(200);
}
await guest.waitForFunction(() => document.getElementById('event-modal').classList.contains('hidden'), null, { timeout: 10000 });
ok(true, "resolving the real opening events on the host cleared the guest's mirrored cards");
await host.evaluate(() => {
  window._ctx.bus.emit('event', {
    instanceId: 9901, forTag: 'JUD',
    event: { id: 'test_omen', title: 'A Test Omen', desc: 'The auguries are checked by machine.',
      options: [{ label: 'Heed them' }, { label: 'Ignore them' }] },
  });
});
await guest.waitForSelector('#event-modal:not(.hidden) .ev-remote', { timeout: 10000 });
ok(true, "the host's event card appears on the guest");
ok(await guest.locator('#event-modal .ev-opt[disabled]').count() === 2, 'both options are disabled for the guest');
const note = await guest.locator('#event-modal .ev-host-note').textContent();
ok(/host speaks/.test(note), 'the card says the host decides');
await guest.screenshot({ path: OUT + 'v19-guest-event.png' });
await host.evaluate(() => { window._ctx.bus.emit('eventResolved', { instanceId: 9901 }); });
await guest.waitForFunction(() => document.getElementById('event-modal').classList.contains('hidden'), null, { timeout: 8000 });
ok(true, "the host's resolution closes the guest card");
await host.locator('#event-modal .ev-opt').first().click(); // clear the host's own copy

console.log('== host toasts mirror to the guest ==');
await host.evaluate(() => { window._ctx.bus.emit('notify', { title: 'Mirror Check', text: 'toast relay', type: 'info' }); });
await guest.waitForFunction(() => /Mirror Check/.test(document.getElementById('toast-container').textContent), null, { timeout: 8000 });
ok(true, 'a host toast reached the guest');

const errs = hostErrors.concat(guestErrors).filter((e) => !/stun|ice|turn/i.test(e));
ok(errs.length === 0, 'no page errors across both browsers: ' + JSON.stringify(errs.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
