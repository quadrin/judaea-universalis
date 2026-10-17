// Macrobuilder interaction regression, using the real component, CSS and sim.
// No WebGL boot is needed to check animation, focus and nested scroll state.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/usr/bin/chromium' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/favicon.ico', r => r.fulfill({ status: 204, body: '' }));
  await page.goto((process.env.JU_BASE_URL || 'http://127.0.0.1:8613/') + 'icons/');
  await page.setContent('<!doctype html><html><body><div id="app"><div id="ui-root"></div></div></body></html>');
  await page.addStyleTag({ url: '/styles.css' });
  await page.evaluate(async () => {
    const [{ DEFINES }, { MAP_DATA }, { ERAS }, { buildProvinceMapping }, sim, { createCampaignTools }] = await Promise.all([
      import('/js/data/defines.js'), import('/js/data/map_data.js'), import('/js/data/compendium.js'),
      import('/js/data/map_profile.js'), import('/js/sim/init.js'), import('/js/ui/campaign_tools.js'),
    ]);
    const snap = await fetch('/tools/geom-snapshot.json').then(r => r.json());
    const bookmark = ERAS.find(e => e.bookmark.id === '66ce').bookmark;
    const provinceMap = buildProvinceMapping(MAP_DATA, bookmark), to = id => provinceMap?.[id] || id;
    const neighbors = snap.neighbors.map(() => new Set());
    for (let id = 1; id < neighbors.length; id++) for (const nb of snap.neighbors[id]) {
      if (to(id) !== to(nb)) { neighbors[to(id)].add(to(nb)); neighbors[to(nb)].add(to(id)); }
    }
    const geom = { neighbors, centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null),
      coastal: snap.coastal.map(Boolean), areas: Int32Array.from(snap.areas), bbox: [] };
    const game = sim.initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag: 'JUD', rngSeed: 7, provinceMap });
    const ctx = sim.makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark, events: [], provinceMap,
      bus: { emit() {}, on() { return () => {}; } } });
    game.tags.JUD.treasury = 10000;
    game.tags.JUD.manpower = 100000;
    for (const p of game.provinces) if (p?.owner === 'JUD') {
      p.controller = 'JUD'; p.siege = null; p.construction = null; p.buildings = [];
    }
    const actions = sim.gameActions(ctx);
    const tools = createCampaignTools({ getCtx: () => ctx, getActions: () => actions, onProvince() {} });
    window.testBuilder = { ctx, actions, tools };
    tools.open();
    window.cardBefore = document.querySelector('.campaign-card');
  });
  await page.waitForTimeout(250);
  // Scroll down the province list and use a real pointer click on a visible row.
  const selection = await page.evaluate(() => {
    const table = document.querySelector('.campaign-table');
    table.scrollTop = table.scrollHeight;
    const bounds = table.getBoundingClientRect();
    const box = [...table.querySelectorAll('[data-select]:not(:disabled)')].find(b => {
      const r = b.getBoundingClientRect(); return r.top > bounds.top + 40 && r.bottom < bounds.bottom;
    });
    if (!box) throw new Error('Fixture must have a scrollable province list');
    return { id: box.dataset.select, scroll: table.scrollTop };
  });
  await page.locator(`[data-select="${selection.id}"]`).check();
  assert(await page.evaluate(() => document.querySelector('.campaign-card') === window.cardBefore),
    'selecting a row must retain the card instead of restarting its entrance animation');
  assert.equal(await page.locator('.campaign-table').evaluate(e => e.scrollTop), selection.scroll);
  assert.equal(await page.locator(':focus').getAttribute('data-select'), selection.id);
  assert.match(await page.locator('[data-build]').textContent(), /Build selected \(1\)/);
  await page.keyboard.press('Space');
  assert(!(await page.locator(`[data-select="${selection.id}"]`).isChecked()), 'Space can untick the same focused row');
  assert.equal(await page.locator('.campaign-table').evaluate(e => e.scrollTop), selection.scroll);
  console.log('PASS row selection retains card, list position, keyboard focus and totals');

  // Repeated simulation refreshes without a data change must not replace nodes.
  await page.evaluate(() => {
    document.activeElement.blur();
    window.rowBefore = document.querySelector('[data-select]');
    for (let i = 0; i < 20; i++) window.testBuilder.tools.refresh();
  });
  assert(await page.evaluate(() => document.querySelector('[data-select]') === window.rowBefore));
  assert.equal(await page.locator('.campaign-table').evaluate(e => e.scrollTop), selection.scroll);
  // A real change still updates prices/availability and retains both scroll axes.
  await page.evaluate(() => {
    const { ctx, tools } = window.testBuilder;
    ctx.game.tags.JUD.treasury = 0; tools.refresh();
  });
  assert.equal(await page.locator('[data-select]:not(:disabled)').count(), 0);
  assert.equal(await page.locator('.campaign-table').evaluate(e => e.scrollTop), selection.scroll);
  await page.evaluate(() => { const { ctx, tools } = window.testBuilder; ctx.game.tags.JUD.treasury = 10000; tools.refresh(); });
  await page.locator(`[data-select="${selection.id}"]`).check();
  await page.locator('[data-build]').click();
  assert(await page.evaluate(id => window.testBuilder.ctx.byId(Number(id)).construction?.key === 'market', selection.id));
  assert.match(await page.locator('[data-build]').textContent(), /Build selected \(0\)/);
  console.log('PASS stable background refreshes, live affordability and real construction');

  await page.locator('[data-tab="armies"]').click();
  await page.locator('[data-arm="inf"]').fill('2');
  await page.locator('[data-arm="inf"]').dispatchEvent('change');
  assert.equal(await page.locator(':focus').getAttribute('data-arm'), 'inf');
  await page.locator('[data-template-name]').fill('Steady army');
  await page.evaluate(() => window.testBuilder.tools.refresh());
  assert.equal(await page.locator('[data-template-name]').inputValue(), 'Steady army');
  await page.locator('[data-save-template]').click();
  assert.match(await page.locator('[data-load-template]').textContent(), /Steady army/);
  console.log('PASS army fields retain focus and template edits survive refresh');

  await page.setViewportSize({ width: 390, height: 640 });
  await page.locator('[data-tab="buildings"]').click();
  await page.evaluate(() => {
    const card = document.querySelector('.campaign-card'), table = document.querySelector('.campaign-table');
    card.scrollTop = 170; table.scrollTop = 120; table.scrollLeft = 100;
    window.scrollBefore = [card.scrollTop, table.scrollTop, table.scrollLeft];
    document.activeElement.blur();
    window.testBuilder.ctx.game.tags.JUD.treasury = 0;
    window.testBuilder.tools.refresh();
  });
  assert.deepEqual(await page.evaluate(() => {
    const card = document.querySelector('.campaign-card'), table = document.querySelector('.campaign-table');
    return [card.scrollTop, table.scrollTop, table.scrollLeft];
  }), await page.evaluate(() => window.scrollBefore));
  console.log('PASS mobile dialog and both table scroll axes survive updates');
  await page.evaluate(() => {
    const { ctx, tools } = window.testBuilder, g = ctx.game;
    g.tags.JUD.allies = ['PAR']; g.tags.PAR.allies = ['JUD']; g.tags.PAR.overlord = null;
    g.tags.PAR.opinion.JUD = 10; g.tags.PAR.manpower = 20000; g.tags.PAR.maxManpower = 20000;
    g.tags.PAR.treasury = 200; g.tags.PAR.warExhaustion = 0;
    g.tags.PAR.diplomaticCredit = { JUD: { trust: 50, favors: 12 } };
    tools.close(); tools.open(); tools.openWar('NAB');
  });
  await page.waitForTimeout(250);
  await page.evaluate(() => { window.warCardBefore = document.querySelector('.campaign-card'); });
  await page.locator('[data-offer="PAR"]').focus();
  await page.locator('[data-offer="PAR"]').selectOption('favors');
  assert.match(await page.locator('.campaign-allies').textContent(), /Will join/);
  assert.equal(await page.locator(':focus').getAttribute('data-offer'), 'PAR');
  await page.evaluate(() => {
    document.activeElement.blur(); window.testBuilder.tools.refresh();
  });
  assert(await page.evaluate(() => document.querySelector('.campaign-card') === window.warCardBefore));
  assert.match(await page.locator('.campaign-card h2').textContent(), /Declare war/);
  await page.locator('[data-close]').click();
  assert(await page.locator('#campaign-tools').evaluate(e => e.classList.contains('hidden')));
  assert.deepEqual(errors, []);
  console.log('PASS reopening, shared war dialog and close; no browser errors');
  console.log('ALL PASS');
} finally { await browser.close(); }
