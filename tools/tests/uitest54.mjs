// UI verification — SPEC §288: the game plays offline.
//
// One online visit installs the service worker, which caches the whole game.
// Then the network goes away: a reload and a new tab both boot to the
// bookmark carousel, a campaign starts and its days run, with no page errors.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
// The start screen waits on the province raster (SPEC §160); on SwiftShader
// that is minutes, not seconds. See uitest18.
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 480000);
const URL_ = 'http://127.0.0.1:8613/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const errors = [];
const watch = (page) => {
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
};

// --- one visit online ------------------------------------------------------
const page = await context.newPage();
watch(page);
await page.goto(URL_, { waitUntil: 'networkidle', timeout: BOOT_MS });
await page.waitForSelector('.bm-card', { timeout: BOOT_MS });
// The first visit is the hard case: every module loaded before the worker
// existed. Wait for install to have cached them all the same.
const held = await page.waitForFunction(async () => {
  if (!navigator.serviceWorker.controller) return false;
  const names = await caches.keys();
  let n = 0;
  for (const name of names) n += (await (await caches.open(name)).keys()).length;
  return n >= 190 ? n : false;
}, null, { timeout: 120000, polling: 500 }).then((h) => h.jsonValue()).catch(() => 0);
ok(held >= 190, `after the first visit the worker controls the page and holds the game (${held} files)`);

// --- no network ------------------------------------------------------------
await context.setOffline(true);
const offlineNow = await page.evaluate(() => fetch('https://example.com/', { mode: 'no-cors' }).then(() => false, () => true));
ok(offlineNow, 'the network is really gone');

await page.reload({ waitUntil: 'load', timeout: BOOT_MS });
await page.waitForSelector('.bm-card', { timeout: BOOT_MS });
ok(await page.locator('.bm-card').count() > 0, 'offline, a reload boots to the bookmark carousel');

const tab = await context.newPage();
watch(tab);
await tab.goto(URL_ + '?from=homescreen', { waitUntil: 'load', timeout: BOOT_MS });
await tab.waitForSelector('.bm-card', { timeout: BOOT_MS });
ok(true, 'offline, a new tab (query string and all) boots too');
await tab.close();

await page.locator('.bm-card.current').click({ timeout: BOOT_MS });
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click({ timeout: BOOT_MS });
await page.waitForFunction(() => window._ctx && window._ctx.game && window._ctx.game.tags[window._ctx.game.playerTag], null, { timeout: BOOT_MS });
const before = await page.evaluate(() => JSON.stringify(window._ctx.game.date));
await page.evaluate(() => { window._ctx.game.paused = false; });
await page.keyboard.press('5');
await page.waitForFunction((b) => JSON.stringify(window._ctx.game.date) !== b, before, { timeout: BOOT_MS }).catch(() => {});
await page.evaluate(() => { window._ctx.game.paused = true; });
const after = await page.evaluate(() => JSON.stringify(window._ctx.game.date));
ok(!!before && after !== before, `offline, a campaign starts and its days run (${before} → ${after})`);

const real = errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to fetch|net::/.test(e));
ok(real.length === 0, 'no page errors' + (real.length ? ': ' + real.slice(0, 3).join(' | ') : ''));

await browser.close();
console.log(failures ? `${failures} FAILED` : 'ALL PASS');
process.exit(failures ? 1 : 0);
