// UI verification — v1.9 (SPEC §93): hosting a SAVED campaign in multiplayer.
// A campaign is played and saved solo, then opened to a friend from the lobby:
// the guest joins the world as it stands — same date, same treasury, same
// armies — rather than a fresh start of that chapter.
//
// The cloud is server/worker.js over an in-memory KV (ju-cloud-mock), so the
// invite is a six-character code and the whole thing runs offline.
import { createRequire } from 'module';
import { startCloudMock } from './ju-cloud-mock.mjs';

const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
// SPEC §160: the start screen is gated on the province raster — main.js awaits
// initRenderer() and computeGeometry() before showStartScreen() — and that pass
// is one fullscreen draw over every texel against every seed. At the frame that
// reaches Britain it is 25.0M x 307, about five times the pre-§160 work, and
// these suites run on SwiftShader. Measured: 74s to the carousel against 17s
// before. Every wait after it is unaffected (the nation cards land ~1s later),
// so this one constant is the whole of the change.
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 240000);

const OUT = (process.env.JU_OUT || '/tmp') + '/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const cloud = await startCloudMock(8634);
const GAME = 'http://127.0.0.1:8613/?cloud=' + cloud.url;

const browser = await chromium.launch({
  executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader', '--disable-features=WebRtcHideLocalIpsWithMdns'],
});

async function boot(ctxB) {
  const page = await ctxB.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(GAME, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise((res) => { const r = indexedDB.deleteDatabase('judaea-universalis'); r.onsuccess = res; r.onerror = res; r.onblocked = res; });
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.bm-card', { timeout: BOOT_MS });
  return { page, errors };
}

// -------------------------------------------------- a campaign worth saving --
console.log('== play a campaign, mark it, save it ==');
const ctxH = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const { page: host, errors: hostErrors } = await boot(ctxH);
await host.locator('.ss-dot').nth(3).click();          // the Great Revolt, 66 CE
await host.waitForTimeout(450);
await host.locator('.bm-card.current').click();
await host.waitForSelector('.nation-card', { timeout: 60000 });
await host.locator('.nation-card').first().click();
await host.waitForSelector('#topbar .tb-flag', { timeout: 60000 });

// A fingerprint the fresh start of this chapter cannot possibly have.
const MARK = 987654;
await host.evaluate((mark) => {
  const g = window._ctx.game;
  g.tags[g.playerTag].treasury = mark;
  g.date.d = 17;
}, MARK);
await host.locator('#topbar [data-ref="save"]').click();
await host.waitForFunction(() => /Chronicle written/.test(document.getElementById('toast-container').textContent),
  null, { timeout: 60000 });
const savedState = await host.evaluate(() => ({
  treasury: window._ctx.game.tags[window._ctx.game.playerTag].treasury,
  date: { ...window._ctx.game.date },
  armies: Object.keys(window._ctx.game.armies || {}).length,
}));
ok(savedState.treasury === MARK, 'the campaign carries a mark the chapter start cannot have');

// ------------------------------------------------- open it up to a friend --
console.log('== host that save, not a new campaign ==');
await host.goto(GAME, { waitUntil: 'networkidle' });
await host.waitForSelector('.bm-card', { timeout: BOOT_MS });
await host.locator('[data-ref="mp"]').click();
await host.waitForSelector('#mp-lobby:not(.hidden)', { timeout: 60000 });
await host.locator('[data-ref="host"]').click();
ok(await host.locator('[data-hostmode="save"]').count() === 1,
  'the lobby offers continuing a save, not only a new campaign');
ok(await host.locator('[data-ref="bm"]').count() === 1, 'a new campaign still picks a chapter');

await host.locator('[data-hostmode="save"]').click();
await host.waitForSelector('[data-ref="save"]', { timeout: 60000 });
ok(await host.locator('[data-ref="bm"]').count() === 0,
  'the chapter select steps aside — the save decides it');
ok(await host.locator('[data-ref="tag"]').count() === 0,
  'and so does the nation select');
const opt = await host.locator('[data-ref="save"] option').first().textContent();
ok(/Judaea/.test(opt) && /66 CE/.test(opt) && /Great Revolt/.test(opt),
  'the save is named by nation, date and chapter: ' + opt.trim());
await host.waitForFunction(() => /where it stands/.test(document.querySelector('#mp-lobby').textContent),
  null, { timeout: 60000 });
ok(true, 'and the lobby says the guests join it where it stands');
await host.screenshot({ path: OUT + 'v19-mp-from-save.png' });

console.log('== mint the invite ==');
await host.locator('[data-ref="invite"]').click();
await host.waitForSelector('.mp-roomcode', { timeout: 60000 });
const code = (await host.locator('.mp-roomcode').textContent()).trim().replace('-', '');

console.log('== the guest joins a campaign already under way ==');
const ctxG = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const { page: guest, errors: guestErrors } = await boot(ctxG);
await guest.locator('[data-ref="mp"]').click();
await guest.waitForSelector('#mp-lobby:not(.hidden)', { timeout: 60000 });
await guest.locator('[data-ref="join"]').click();
await guest.fill('[data-ref="room"]', code);
await guest.locator('[data-ref="joingo"]').click();
await guest.waitForSelector('[data-ref="pickwrap"] .mp-player', { timeout: 60000 });
const lobbyText = await guest.locator('[data-ref="pickwrap"]').textContent();
ok(/already under way/.test(lobbyText),
  'the guest is told they are joining a campaign in progress');
ok(/66 CE/.test(lobbyText), 'with the date it has reached: ' + lobbyText.replace(/\s+/g, ' ').trim().slice(0, 90));

console.log('== begin, and the saved world is what both play ==');
await host.waitForFunction(() => document.querySelectorAll('#mp-lobby .mp-player').length >= 2, null, { timeout: 60000 });
await host.locator('[data-ref="begin"]').click();
await host.waitForSelector('#topbar .tb-flag', { timeout: 60000 });
await guest.waitForSelector('#topbar .tb-flag', { timeout: 60000 });

const hostState = await host.evaluate(() => ({
  treasury: window._ctx.game.tags[window._ctx.game.playerTag].treasury,
  date: { ...window._ctx.game.date },
  humans: window._ctx.game.humanTags,
  tag: window._ctx.game.playerTag,
}));
ok(hostState.treasury === MARK, 'the host is playing the SAVED world, not a fresh chapter');
ok(hostState.date.d === savedState.date.d, 'on the saved date, not the chapter start');
ok(hostState.humans.length === 1 && hostState.humans[0] === 'JUD',
  'and the shared throne is re-seated after reviveGame collapsed it: ' + JSON.stringify(hostState.humans));

await guest.waitForFunction((m) => {
  const g = window._ctx && window._ctx.game;
  return g && g.tags[g.playerTag] && g.tags[g.playerTag].treasury === m;
}, MARK, { timeout: 60000 });
const guestState = await guest.evaluate(() => ({
  treasury: window._ctx.game.tags[window._ctx.game.playerTag].treasury,
  date: { ...window._ctx.game.date },
  armies: Object.keys(window._ctx.game.armies || {}).length,
  tag: window._ctx.game.playerTag,
}));
ok(guestState.treasury === MARK, 'the guest received the saved world, mark and all');
ok(guestState.date.d === savedState.date.d && guestState.date.y === savedState.date.y,
  'on the same day the host saved: ' + JSON.stringify(guestState.date));
ok(guestState.armies === savedState.armies, 'with the same armies on the map (' + guestState.armies + ')');
ok(guestState.tag === 'JUD', 'sharing the saved throne');
await guest.screenshot({ path: OUT + 'v19-mp-guest-resumed.png' });

console.log('== and it is a live shared game, not a snapshot ==');
await host.evaluate(() => { window._ctx.game.tags[window._ctx.game.playerTag].treasury = 4242; });
await guest.waitForFunction(() => {
  const g = window._ctx.game;
  return g.tags[g.playerTag].treasury === 4242;
}, null, { timeout: 60000 });
ok(true, 'host changes still flow to the guest over the link');
await guest.evaluate(() => window._actions.setSpeed(3));
await host.waitForFunction(() => window._ctx.game.speed === 3, null, { timeout: 60000 });
ok(true, 'and the guest can steer the resumed realm');

const errs = hostErrors.concat(guestErrors).filter((e) => !/stun|ice|turn|404/i.test(e));
ok(errs.length === 0, 'no page errors: ' + JSON.stringify(errs.slice(0, 3)));

await browser.close();
await cloud.stop();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
