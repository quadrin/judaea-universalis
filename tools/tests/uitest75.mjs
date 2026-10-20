// National paths use the real panel and simulation, without rasterizing the map.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/usr/bin/chromium' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/favicon.ico', r => r.fulfill({ status: 204, body: '' }));
  await page.goto((process.env.JU_BASE_URL || 'http://127.0.0.1:8641/') + 'icons/');
  await page.setContent('<!doctype html><html><head><base href="/"></head><body><div id="app"><div id="ui-root"><aside id="nation-panel" class="hidden"></aside></div></div></body></html>');
  await page.addStyleTag({ url: '/styles.css' });
  await page.evaluate(async () => {
    const [{ DEFINES }, { MAP_DATA }, { ERAS }, { buildProvinceMapping }, sim, { createNationPanel }, national] = await Promise.all([
      import('/js/data/defines.js'), import('/js/data/map_data.js'), import('/js/data/compendium.js'), import('/js/data/map_profile.js'), import('/js/sim/init.js'), import('/js/ui/nation_panel.js'), import('/js/sim/national_ideas.js'),
    ]);
    const snap = await fetch('/tools/geom-snapshot.json').then(r => r.json());
    const panel = createNationPanel(document.getElementById('nation-panel'), { DEFINES, onClose() {}, onPeaceClick() {}, onWarClick() {}, onProvinceClick() {} });
    window.loadNational = id => {
      const bookmark = ERAS.find(e => e.bookmark.id === id).bookmark;
      const provinceMap = buildProvinceMapping(MAP_DATA, bookmark), to = id => provinceMap?.[id] || id;
      const neighbors = snap.neighbors.map(() => new Set());
      for (let id = 1; id < neighbors.length; id++) for (const nb of snap.neighbors[id]) if (to(id) !== to(nb)) { neighbors[to(id)].add(to(nb)); neighbors[to(nb)].add(to(id)); }
      const geom = { neighbors, centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null), coastal: snap.coastal.map(Boolean), areas: Int32Array.from(snap.areas), bbox: [] };
      const tag = bookmark.playableTags[0].tag;
      const game = sim.initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag: tag, rngSeed: 7, provinceMap });
      const ctx = sim.makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark, events: [], provinceMap, bus: { emit() {}, on() { return () => {}; } } });
      for (const t of Object.values(game.tags)) { t.ai = false; t.overlord = null; t.atWarWith = []; }
      const t = game.tags[tag]; t.treasury = 5000; t.manpower = 30000; t.points = { gov: 999, infl: 999, mar: 999 };
      if (id === '66ce') for (const name of ['Jerusalem', 'Emmaus', 'Jericho', 'Joppa']) { const p = ctx.prov(name); p.owner = p.controller = tag; p.siege = null; p.unrest = 0; }
      const actions = sim.gameActions(ctx); panel.bind(ctx, actions); panel.open(null, 'ideas');
      window.nationalTest = { ctx, actions, panel, national };
    };
    window.loadNational('66ce');
  });
  for (const id of ['931bce', '732bce', '597bce', '167bce', '67bce', '66ce', '132ce', '351ce', '529ce', '614ce', '1948ce', '40bce']) {
    await page.evaluate(id => window.loadNational(id), id);
    assert.equal(await page.locator('.ni-path').count(), 5, id);
  }
  console.log('PASS all bookmarks show the five national paths');
  await page.evaluate(() => window.loadNational('66ce'));
  const path = key => page.locator(`[data-ni-open="path:${key}"]`);
  await path('maritime').locator(':scope > summary').focus(); await page.keyboard.press('Enter');
  assert(await path('maritime').evaluate(el => el.open));
  await path('maritime').locator('[data-ni-inspect][data-tier="2"]').click();
  assert.match(await path('maritime').locator('.ni-idea-detail').textContent(), /Maritime League/);
  const before = await page.evaluate(() => window.nationalTest.ctx.game.tags.JUD.points.infl);
  await path('maritime').locator('[data-ni-buy]').click();
  assert.equal(await page.evaluate(() => window.nationalTest.ctx.game.tags.JUD.points.infl), before - 60);
  assert.equal(await page.locator('[data-ni-act="warehouse"]').count(), 1);
  assert.equal(await page.locator('[data-ni-act="harbor"]').count(), 0, 'future actions are genuinely locked');
  const action = page.locator('[data-ni-open="action:warehouse"]');
  await action.locator(':scope > summary').click();
  const select = page.locator('[data-ni-target="warehouse"]');
  const selected = await select.inputValue(); await select.selectOption(selected); await select.focus();
  await page.evaluate(() => { window.nationalControl = document.querySelector('[data-ni-target="warehouse"]'); window.nationalTest.panel.refresh(); });
  assert.equal(await select.inputValue(), selected); assert(await action.evaluate(el => el.open));
  assert(await page.evaluate(() => window.nationalControl === document.querySelector('[data-ni-target="warehouse"]')), 'unchanged refresh preserves the actual control');
  assert.equal(await page.locator(':focus').getAttribute('data-ni-target'), 'warehouse');
  await page.locator('[data-ni-act="warehouse"]').click();
  assert(await page.evaluate(id => !!window.nationalTest.ctx.game.tags.JUD.nationalStrategy.ports[id], selected));
  assert.equal(await page.locator('.ni-record').count(), 1);
  if (process.env.JU_OUT) await page.locator('#nation-panel').screenshot({ path: process.env.JU_OUT + '/national-paths-desktop.png' });
  console.log('PASS keyboard inspection, actual adoption and warehouse, gated actions and stable selectors');

  await page.evaluate(() => window.loadNational('66ce'));
  await path('federation').locator(':scope > summary').click();
  await path('federation').locator('[data-ni-buy]').click();
  await page.locator('[data-ni-open="action:charter"] > summary').click();
  const city = await page.evaluate(() => String(window.nationalTest.ctx.prov('Emmaus').id));
  await page.locator('[data-ni-target="charter"]').selectOption(city);
  await page.locator('[data-ni-service="charter"]').selectOption('naval');
  assert(await page.locator('[data-ni-act="charter"]').isDisabled(), 'inland naval charters are refused');
  await page.locator('[data-ni-service="charter"]').selectOption('levy');
  assert(await page.locator('[data-ni-act="charter"]').isEnabled());
  await page.locator('[data-ni-act="charter"]').click();
  assert.equal(await page.evaluate(id => window.nationalTest.ctx.game.tags.JUD.nationalStrategy.cities[id].service, city), 'levy');
  await page.evaluate(() => { const { ctx, panel } = window.nationalTest; ctx.game.tags.JUD.treasury = 0; panel.refresh(); });
  assert(await page.locator('[data-ni-act="charter"]').isDisabled());
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.locator('#nation-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  assert((await page.locator('.ni-tiers button:visible, .ni-controls button:visible, .ni-controls select:visible').evaluateAll(xs => xs.map(x => x.getBoundingClientRect().height))).every(h => h >= 44));
  if (process.env.JU_OUT) await page.locator('#nation-panel').screenshot({ path: process.env.JU_OUT + '/national-paths-mobile.png' });
  await page.evaluate(() => { const { panel, ctx } = window.nationalTest; const foreign = ctx.game.tags.ROM; foreign.nationalIdeas = { subversion: 3 }; panel.open('ROM', 'ideas'); });
  assert.equal(await page.locator('.ni-path').count(), 1);
  assert.equal(await page.locator('[data-ni-buy], [data-ni-act], .ni-record').count(), 0, 'foreign courts expose no actions or private records');
  assert.deepEqual(errors, []);
  console.log('PASS actual charter service, live affordability, mobile touch targets, foreign privacy and no browser errors');
  console.log('uitest75: ALL PASS');
} finally { await browser.close(); }
