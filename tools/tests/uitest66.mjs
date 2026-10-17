// Functional campaign planning checks. Run serially against the server on 8613.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/usr/bin/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const out = process.env.JU_OUT || '/tmp';
try {
  await page.goto(process.env.JU_BASE_URL || 'http://127.0.0.1:8613/', { waitUntil: 'domcontentloaded', timeout: Number(process.env.JU_BOOT_TIMEOUT || 480000) });
  await page.waitForSelector('.bm-card', { timeout: Number(process.env.JU_BOOT_TIMEOUT || 480000) });
  await page.locator('.ss-dot[aria-label="The Great Revolt"]').click();
  await page.waitForTimeout(450);
  await page.locator('.bm-card.current').click();
  await page.waitForSelector('.nation-card'); await page.locator('.nation-card').first().click();
  await page.waitForFunction(() => !!window._ctx?.game.tags.JUD);
  await page.evaluate(() => {
    const g = window._ctx.game; g.paused = true;
    g.tags.JUD.treasury = 2000; g.tags.JUD.manpower = 50000;
    for (const p of g.provinces) if (p?.owner === 'JUD') { p.controller = 'JUD'; p.siege = null; p.construction = null; p.buildings = []; }
    window._ctx.bus.emit('actionTaken', {});
  });
  await page.getByRole('button', { name: 'Open macrobuilder', exact: true }).click();
  await page.waitForSelector('#campaign-tools:not(.hidden)');
  assert(await page.locator('[data-select]:not(:disabled)').count() > 0);
  await page.locator('[data-select]:not(:disabled)').first().check();
  await page.locator('[data-build]').click();
  assert(await page.evaluate(() => window._ctx.game.provinces.some(p => p?.owner === 'JUD' && p.construction?.key === 'market')));
  console.log('PASS building comparison and construction command');

  await page.locator('[data-tab="armies"]').click();
  for (const [type, count] of Object.entries({ inf: 2, cav: 0, art: 0 })) {
    await page.locator(`#campaign-tools input[data-arm="${type}"]`).fill(String(count));
    await page.locator(`#campaign-tools input[data-arm="${type}"]`).dispatchEvent('change');
  }
  await page.locator('[data-template-name]').fill('Browser muster');
  await page.locator('[data-save-template]').click();
  assert(await page.locator('[data-load-template]').textContent().then(s => s.includes('Browser muster')));
  await page.locator('[data-muster]').click();
  assert.equal(await page.evaluate(() => window._ctx.game.provinces.reduce((n, p) => n + (p?.unitQueue || []).filter(q => q.templateId).length, 0)), 2);
  await page.screenshot({ path: out + '/campaign-muster-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  const box = await page.locator('.campaign-card').boundingBox();
  assert(box.x >= 0 && box.x + box.width <= 391);
  await page.screenshot({ path: out + '/campaign-muster-mobile.png' });
  await page.keyboard.press('Escape'); await page.setViewportSize({ width: 1440, height: 900 });
  console.log('PASS saved templates, distributed orders, desktop and mobile layout');

  const target = await page.evaluate(() => {
    const g = window._ctx.game;
    g.tags.JUD.allies = ['PAR']; g.tags.PAR.allies = ['JUD']; g.tags.PAR.overlord = null;
    g.tags.PAR.opinion.JUD = 10; g.tags.PAR.manpower = 20000; g.tags.PAR.maxManpower = 20000; g.tags.PAR.treasury = 200;
    g.tags.PAR.warExhaustion = 0; g.tags.PAR.diplomaticCredit = { JUD: { trust: 50, favors: 12 } };
    const p = g.provinces.find(p => p?.owner === 'NAB' && !p.impassable);
    window._ctx.bus.emit('mapclick', { provId: p.id, armyId: null }); return p.id;
  });
  await page.locator('#province-panel [data-dip="war"]').click();
  await page.waitForSelector('[data-offer="PAR"]');
  assert((await page.locator('.campaign-allies').textContent()).includes('Will stay home'));
  await page.locator('[data-offer="PAR"]').selectOption('favors');
  assert((await page.locator('.campaign-allies').textContent()).includes('Will join'));
  const provinceOption = await page.locator('[data-offer="PAR"] option[value^="province:"]').first().getAttribute('value');
  await page.locator('[data-offer="PAR"]').selectOption(provinceOption);
  await page.locator('[data-declare]').click();
  const warId = await page.evaluate(() => window._ctx.game.wars.find(w => w.promises?.some(p => p.ally === 'PAR'))?.id);
  assert(warId);
  await page.evaluate(warId => {
    const g = window._ctx.game, w = g.wars.find(w => w.id === warId);
    for (const p of g.provinces) if (p && w.defenders.includes(p.owner)) p.controller = 'JUD';
    w.warscore.JUD = 100; w.warscore.NAB = -100;
    window._ctx.bus.emit('actionTaken', {});
  }, warId);
  await page.locator(`#outliner [data-peace="${warId}"]`).click();
  await page.waitForSelector('#peace-modal:not(.hidden)');
  assert((await page.locator('[data-ref="strategy"]').textContent()).includes('Enemy war enthusiasm'));
  await page.locator('#peace-modal [data-prov]').first().check();
  assert((await page.locator('[data-ref="strategy"]').textContent()).includes('Regional concern'));
  assert(await page.locator('#peace-modal [data-prov-to] option[value="PAR"]').count() > 0);
  await page.screenshot({ path: out + '/campaign-peace-preview.png' });
  await page.keyboard.press('Escape');
  console.log('PASS call-to-arms choices, land promises, peace factors, and regional concern preview');

  await page.keyboard.press('o');
  await page.waitForSelector('#settings-modal:not(.hidden)');
  await page.locator('[data-message="recruitment"]').selectOption('pause');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    window._ctx.game.paused = false;
    window._ctx.bus.emit('notify', { category: 'recruitment', title: 'Browser alert', text: 'A regiment has completed training.', type: 'good' });
  });
  assert(await page.evaluate(() => window._ctx.game.paused));
  assert(await page.locator('.toast-persistent').filter({ hasText: 'Browser alert' }).count() === 1);
  await page.keyboard.press('o');
  await page.locator('[data-message="recruitment"]').selectOption('popup');
  await page.keyboard.press('Escape');
  await page.evaluate(() => window._ctx.bus.emit('notify', { category: 'recruitment', title: 'Browser popup', text: 'The muster is ready.' }));
  await page.waitForSelector('#message-modal');
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  assert.equal(await page.locator('#message-modal').count(), 0);
  await page.keyboard.press('o');
  await page.locator('[data-message="recruitment"]').selectOption('off');
  await page.keyboard.press('Escape');
  await page.evaluate(() => window._ctx.bus.emit('notify', { category: 'recruitment', title: 'Suppressed notice' }));
  assert.equal(await page.getByText('Suppressed notice', { exact: true }).count(), 0);
  console.log('PASS persistent alerts, automatic pause, popup dismissal, and notice filtering');
  assert.deepEqual(errors, []);
  console.log('ALL PASS');
} finally { await browser.close(); }
