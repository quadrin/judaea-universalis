// Main menu: a real campaign saves locally, returns to bookmarks and continues.
// Use the built-in no-WebGL fallback; map rasterization is unrelated to this
// settings/save flow and takes minutes under the software GPU.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/usr/bin/chromium',
  args: ['--disable-webgl', '--disable-dev-shm-usage'] });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/favicon.ico', r => r.fulfill({ status: 204, body: '' }));
  const bootMs = Number(process.env.JU_BOOT_TIMEOUT || 60000);
  page.setDefaultTimeout(bootMs);
  await page.goto(process.env.JU_BASE_URL || 'http://127.0.0.1:8641/', { waitUntil: 'domcontentloaded', timeout: bootMs });
  await page.waitForSelector('.bm-card.current', { timeout: bootMs });
  console.log('PASS the real game boots to the bookmark screen');
  await page.locator('.bm-card.current').click();
  await page.locator('.nation-card').first().click();
  await page.waitForFunction(() => !!window._ctx);
  await page.evaluate(() => {
    window._ctx.game.paused = true;
    document.getElementById('event-modal').classList.add('hidden');
  });
  await page.locator('#topbar [data-ref="settings"]').click();
  const menu = page.locator('#settings-modal [data-act="main-menu"]');
  assert(await menu.isVisible());
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await menu.isVisible());
  assert(await page.locator('.st-card').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  if (process.env.JU_OUT) await page.locator('.st-card').screenshot({ path: process.env.JU_OUT + '/settings-main-menu-mobile.png' });
  await page.setViewportSize({ width: 1280, height: 900 });
  console.log('PASS Main menu appears in campaign Settings and fits on mobile');

  // A refused local write must not abandon the campaign or freeze its clock.
  await page.evaluate(() => {
    window.__originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () { throw new DOMException('Test storage failure', 'QuotaExceededError'); };
    window._ctx.game.paused = false;
  });
  await menu.click();
  await page.waitForSelector('[data-ref="stMenuError"]:not(.hidden)');
  assert.equal(await page.evaluate(() => window._ctx.game.paused), false);
  assert(await menu.isEnabled());
  assert(await page.locator('#settings-modal').isVisible());
  console.log('PASS a failed save keeps the campaign open, restores its pause state and allows retry');

  const expected = await page.evaluate(() => {
    IDBObjectStore.prototype.put = window.__originalPut;
    const game = window._ctx.game; game.paused = true;
    game.tags[game.playerTag].treasury = 432.75;
    sessionStorage.setItem('ju_pending_load', 'a-stale-load-request');
    const url = new URL(location.href); url.searchParams.set('join', 'OLD-CODE'); history.replaceState(null, '', url);
    return { tag: game.playerTag, bookmark: game.bookmarkId, treasury: 432.75, date: { ...game.date } };
  });
  await Promise.all([page.waitForEvent('domcontentloaded', { timeout: bootMs }), menu.click()]);
  await page.waitForSelector('.ss-continue', { timeout: bootMs });
  assert(!new URL(page.url()).searchParams.has('join'));
  assert.equal(await page.evaluate(() => sessionStorage.getItem('ju_pending_load')), null);
  assert(await page.locator('#start-screen').isVisible());
  assert.equal(await page.evaluate(() => !!window._ctx), false);
  console.log('PASS a successful local save returns to bookmarks and clears stale load/invite state');
  await page.locator('.ss-continue').click();
  await page.waitForFunction(() => !!window._ctx);
  const resumed = await page.evaluate(() => {
    const game = window._ctx.game;
    return { tag: game.playerTag, bookmark: game.bookmarkId, treasury: game.tags[game.playerTag].treasury, date: { ...game.date } };
  });
  assert.deepEqual(resumed, expected);
  assert.deepEqual(errors, []);
  console.log('PASS Continue restores the exact campaign, treasury and date, with no browser errors');
  console.log('ALL PASS');
} finally { await browser.close(); }
