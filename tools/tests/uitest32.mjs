// UI verification — v1.9 (SPEC §93): six-character invite codes and the cloud
// shelf. Two browser contexts join a lobby by typing a short code (no blob
// changes hands at all), then a solo campaign is saved to the cloud, found on
// the title screen after a reload, loaded back, and picked up on a "second
// device" that knows only the player code.
//
// The cloud is server/worker.js itself, over an in-memory KV (ju-cloud-mock).
import { createRequire } from 'module';
import { startCloudMock } from './ju-cloud-mock.mjs';

const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const OUT = (process.env.JU_OUT || '/tmp') + '/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const cloud = await startCloudMock(8630);
const GAME = 'http://127.0.0.1:8613/?cloud=' + cloud.url;

const browser = await chromium.launch({
  executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader', '--disable-features=WebRtcHideLocalIpsWithMdns'],
});

async function boot(ctxB, { playerKey, url } = {}) {
  const page = await ctxB.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url || GAME, { waitUntil: 'networkidle' });
  await page.evaluate((k) => {
    localStorage.clear();
    if (k) localStorage.setItem('ju_player_key', k);
  }, playerKey || null);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.bm-card', { timeout: 60000 });
  return { page, errors };
}

// The endpoint arrived in a link, so it is trusted for the lobby handshake and
// nothing else until the player says otherwise. Every context that wants a
// cloud SHELF has to answer that question first — which is the point.
async function acceptCloud(page) {
  await page.locator('[data-ref="saves"]').click();
  await page.waitForSelector('#saves-panel', { timeout: 60000 });
  const offered = await page.locator('.sv-offer').count();
  await page.locator('[data-ref="accept"]').click();
  await page.waitForSelector('#saves-panel .sv-cloudline', { timeout: 60000 });
  await page.locator('#saves-panel [data-ref="close"]').click();
  return offered === 1;
}

// --------------------------------------------------------- invite codes --
console.log('== the invite code is six characters ==');
const ctxH = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const { page: host, errors: hostErrors } = await boot(ctxH);

await host.locator('[data-ref="mp"]').click();
await host.waitForSelector('#mp-lobby:not(.hidden)');
ok(/six-letter invite code/.test(await host.locator('[data-ref="host"]').textContent()),
  'the menu promises a short code, not a blob');
await host.locator('[data-ref="host"]').click();
await host.selectOption('[data-ref="bm"]', '3'); // the Great Revolt, 66 CE
await host.locator('[data-ref="invite"]').click();
await host.waitForSelector('.mp-roomcode', { timeout: 60000 });
const shown = (await host.locator('.mp-roomcode').textContent()).trim();
ok(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(shown), 'the host is shown a readable code: ' + shown);
ok(await host.locator('[data-ref="invcode"]').count() === 0,
  'and no three-kilobyte blob is on screen at all');
ok(await host.locator('[data-ref="reply"]').count() === 0,
  'and there is nothing for the host to paste back');
await host.screenshot({ path: OUT + 'v19-host-roomcode.png' });

ok(await host.locator('[data-ref="copylink"]').count() === 1,
  'and a one-click link is offered beside the code');

const stored = [...cloud.kv._store.keys()].filter((k) => k.startsWith('room:'));
ok(stored.length === 1, 'the offer is parked in exactly one cloud room');

console.log('== the guest follows the link and is in ==');
// The link the host's "Copy a link instead" button produces: the endpoint
// rides along so a friend who has configured nothing can still reach the room.
const joinUrl = 'http://127.0.0.1:8613/?cloud=' + encodeURIComponent(cloud.url)
  + '&join=' + shown.replace('-', '');
const ctxG = await browser.newContext({ viewport: { width: 1440, height: 900 } });
// Clean storage first, then follow the link ONCE — an invite is good for one
// guest, and boot()'s reload would otherwise spend it before the real attempt.
const { page: guest, errors: guestErrors } = await boot(ctxG);
await guest.goto(joinUrl, { waitUntil: 'networkidle' });
await guest.waitForSelector('#mp-lobby:not(.hidden)', { timeout: 60000 });
ok(await guest.locator('[data-ref="room"]').count() === 1, 'the guest gets one short field, not a textarea');
ok((await guest.locator('[data-ref="room"]').inputValue()).replace('-', '') === shown.replace('-', ''),
  'the link filled the code in and started joining by itself');
await guest.waitForSelector('[data-ref="pickwrap"] .mp-player', { timeout: 60000 });
ok(/Judaea/.test(await guest.locator('[data-ref="pickwrap"]').textContent()),
  'the guest lands in the host\'s lobby, on the host\'s nation');
await guest.screenshot({ path: OUT + 'v19-guest-joined.png' });

await host.waitForFunction(() => document.querySelectorAll('#mp-lobby .mp-player').length >= 2, null, { timeout: 60000 });
ok(await host.locator('#mp-lobby .mp-player').count() === 2, 'the host sees both players');
ok(await host.locator('.mp-roomcode').count() === 0, 'the spent code leaves the screen once they are in');

console.log('== the campaign begins over that link ==');
await host.locator('[data-ref="begin"]').click();
await host.waitForSelector('#topbar .tb-flag', { timeout: 60000 });
await guest.waitForSelector('#topbar .tb-flag', { timeout: 60000 });
const roles = await host.evaluate(() => ({ role: window._mp.role, guests: window._mp.guests.length }));
ok(roles.role === 'host' && roles.guests === 1, 'the host runs the world for one guest: ' + JSON.stringify(roles));
ok(await guest.evaluate(() => window._mp.role) === 'guest', 'the guest mirrors it');
await host.evaluate(() => window._actions.setSpeed(4));
await guest.waitForFunction(() => window._ctx.game.speed === 4, null, { timeout: 60000 });
ok(true, 'orders and state cross the link the short code opened');

await ctxH.close();
await ctxG.close();

// ------------------------------------------------------------ the shelf --
console.log('== a typed code is normalized the way people type it ==');
{
  const ctxT = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const { page: typer } = await boot(ctxT);
  await typer.locator('[data-ref="mp"]').click();
  await typer.locator('[data-ref="join"]').click();
  await typer.fill('[data-ref="room"]', ' kfr-2m9 ');   // lower case, dashed, padded
  await typer.locator('[data-ref="joingo"]').click();
  await typer.waitForFunction(() => (document.querySelector('[data-ref="status"]') || {}).textContent,
    null, { timeout: 60000 });
  const msg = await typer.locator('#mp-lobby [data-ref="status"]').textContent();
  ok(/expired|could not be found/i.test(msg) && !/six letters/i.test(msg),
    'it was cleaned up and looked up, not rejected as malformed: ' + msg.trim());
  await typer.fill('[data-ref="room"]', 'nope');
  await typer.locator('[data-ref="joingo"]').click();
  await typer.waitForFunction(() => /six letters/.test(
    (document.querySelector('#mp-lobby [data-ref="status"]') || {}).textContent || ''), null, { timeout: 60000 });
  ok(true, 'something that is not a code at all is named as such');
  await ctxT.close();
}

console.log('== a link-provided cloud is NOT trusted with saves ==');
const ctxS = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const { page: solo, errors: soloErrors } = await boot(ctxS);
await solo.locator('[data-ref="saves"]').click();
await solo.waitForSelector('#saves-panel', { timeout: 60000 });
ok(await solo.locator('.sv-offer').count() === 1,
  'the shelf asks about the endpoint the link brought, instead of adopting it');
ok(await solo.locator('.sv-row').count() === 0, 'and shows no cloud shelf until it is answered');
await solo.screenshot({ path: OUT + 'v19-offer.png' });
await solo.locator('#saves-panel [data-ref="close"]').click();

console.log('== a campaign is written to the cloud once it is ==');
ok(await acceptCloud(solo), 'the player accepts the endpoint for saves');
await solo.locator('.ss-dot').nth(3).click();   // the Great Revolt
await solo.waitForTimeout(500);
await solo.locator('.bm-card.current').click();
await solo.waitForSelector('.nation-card', { timeout: 60000 });
await solo.locator('.nation-card').first().click();
await solo.waitForSelector('#topbar .tb-flag', { timeout: 60000 });

const playerKey = await solo.evaluate(() => localStorage.getItem('ju_player_key'));
ok(/^[A-Z0-9]{20}$/.test(playerKey), 'the game minted a twenty-character player code');

await solo.locator('#topbar [data-ref="save"]').click();
await solo.waitForFunction(() => /Chronicle written/.test(document.getElementById('toast-container').textContent),
  null, { timeout: 60000 });
const toast = await solo.locator('#toast-container').textContent();
ok(/Kept on this device and in the cloud/.test(toast), 'the game says where it put the campaign: ' + toast.replace(/\s+/g, ' ').trim().slice(0, 90));

const shelf = [...cloud.kv._store.keys()].filter((k) => k.startsWith('save:'));
ok(shelf.length === 1, 'exactly one campaign reached the cloud');
ok(/^save:[0-9a-f]{32}:manual-66ce-\d+$/.test(shelf[0]), 'under a hashed shelf and a manual id: ' + shelf[0]);
ok(!shelf[0].includes(playerKey), 'the player code itself never left the browser');

console.log('== and is loadable from the title screen after a reload ==');
await solo.goto(GAME, { waitUntil: 'networkidle' });
await solo.waitForSelector('.bm-card', { timeout: 60000 });
await solo.locator('[data-ref="saves"]').click();
await solo.waitForSelector('#saves-panel .sv-row', { timeout: 60000 });
ok(await solo.locator('.sv-row').count() === 1, 'the shelf shows the campaign');
ok(/Judaea/.test(await solo.locator('.sv-row .sv-name').textContent()), 'named by nation and date');
ok(await solo.locator('.sv-row .sv-local').count() === 1,
  'the row is marked as living on this device, where it actually is');
ok(await solo.locator('.sv-row .sv-cloud').count() === 1, 'with the cloud copy noted beside it');
ok(/Also copied to/.test(await solo.locator('.sv-cloudline').textContent()),
  'and the panel reports the cloud copy is reachable');
ok(await solo.locator('[data-ref="key"]').count() === 1, 'the player code is on offer for a second device');
await solo.screenshot({ path: OUT + 'v19-shelf.png' });

await solo.locator('.sv-row .sv-load').click();
await solo.waitForSelector('#topbar .tb-flag', { timeout: 60000 });
const loaded = await solo.evaluate(() => ({ tag: window._ctx.game.playerTag, y: window._ctx.game.date.y }));
ok(loaded.tag === 'JUD' && loaded.y === 66, 'the campaign loaded straight into the world: ' + JSON.stringify(loaded));

console.log('== loading again from inside a running campaign ==');
await solo.locator('#topbar [data-ref="loadsave"]').click();
await solo.waitForSelector('#saves-panel .sv-row', { timeout: 60000 });
ok(true, 'the shelf opens from the topbar mid-campaign');
await solo.locator('.sv-row .sv-load').click();
await solo.waitForSelector('#topbar .tb-flag', { timeout: 60000 });
ok(await solo.evaluate(() => window._ctx.game.playerTag) === 'JUD',
  'and lands back in a bound, running world');
await ctxS.close();

console.log('== a second device, knowing only the player code ==');
const ctxD = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const { page: other, errors: otherErrors } = await boot(ctxD);
ok(await acceptCloud(other), 'the second device is asked about the endpoint too');
await other.locator('[data-ref="saves"]').click();
await other.waitForSelector('#saves-panel', { timeout: 60000 });
ok(await other.locator('.sv-row').count() === 0, 'a fresh device starts with an empty shelf');
await other.locator('[data-ref="usekey"]').click();
await other.fill('[data-ref="keyin"]', playerKey.replace(/(.{5})(?=.)/g, '$1-'));
await other.locator('[data-ref="keygo"]').click();
await other.waitForSelector('#saves-panel .sv-row', { timeout: 60000 });
ok(await other.locator('.sv-row').count() === 1, 'typing the code brings the campaign across');
await other.locator('.sv-row .sv-load').click();
await other.waitForSelector('#topbar .tb-flag', { timeout: 60000 });
ok(await other.evaluate(() => window._ctx.game.playerTag) === 'JUD',
  'and it plays on the second device');
await ctxD.close();

console.log('== with no cloud at all, nothing breaks ==');
const ctxO = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const offline = await ctxO.newPage();
const offErrors = [];
offline.on('pageerror', (e) => offErrors.push(String(e)));
await offline.goto('http://127.0.0.1:8613/?cloud=', { waitUntil: 'networkidle' });
await offline.evaluate(() => localStorage.clear());
await offline.reload({ waitUntil: 'networkidle' });
await offline.waitForSelector('.bm-card', { timeout: 60000 });
await offline.locator('[data-ref="saves"]').click();
await offline.waitForSelector('#saves-panel', { timeout: 60000 });
const offFoot = await offline.locator('.sv-cloudline').textContent();
ok(/Saved in this browser/.test(offFoot) && /Nothing to set up/.test(offFoot),
  'the shelf presents local storage as complete, not as a missing cloud');
ok(await offline.locator('[data-ref="key"]').count() === 0, 'and offers no player code to carry');
await offline.locator('#saves-panel [data-ref="close"]').click();
await offline.locator('[data-ref="mp"]').click();
await offline.locator('[data-ref="host"]').click();
await offline.locator('[data-ref="invite"]').click();
await offline.waitForFunction(() => {
  const ta = document.querySelector('[data-ref="invcode"]');
  return ta && /^JU2\./.test(ta.value);
}, null, { timeout: 60000 });
const offCode = await offline.locator('[data-ref="invcode"]').inputValue();
ok(true, 'multiplayer falls back to the hand-carried code');
ok(offCode.length < 260, 'which is packed, not the old wall of base64 (' + offCode.length + ' chars)');
ok(offErrors.length === 0, 'and no page errors: ' + JSON.stringify(offErrors.slice(0, 2)));
await ctxO.close();

const errs = hostErrors.concat(guestErrors, soloErrors, otherErrors)
  .filter((e) => !/stun|ice|turn/i.test(e));
ok(errs.length === 0, 'no page errors anywhere: ' + JSON.stringify(errs.slice(0, 3)));

await browser.close();
await cloud.stop();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
