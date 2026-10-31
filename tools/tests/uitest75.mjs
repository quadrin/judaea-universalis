// National paths use the real panel and simulation, without rasterizing the map.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/usr/bin/chromium' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(30000);
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/favicon.ico', r => r.fulfill({ status: 204, body: '' }));
  await page.goto((process.env.JU_BASE_URL || 'http://127.0.0.1:8641/') + 'icons/');
  await page.setContent('<!doctype html><html><head><base href="/"></head><body><div id="app"><div id="ui-root"><aside id="nation-panel" class="hidden"></aside><aside id="province-panel" class="hidden"></aside></div></div></body></html>');
  await page.addStyleTag({ url: '/styles.css' });
  await page.evaluate(async () => {
    const [{ DEFINES }, { MAP_DATA }, { ERAS }, { buildProvinceMapping }, sim, { createNationPanel }, national, { createProvincePanel }] = await Promise.all([
      import('/js/data/defines.js'), import('/js/data/map_data.js'), import('/js/data/compendium.js'), import('/js/data/map_profile.js'), import('/js/sim/init.js'), import('/js/ui/nation_panel.js'), import('/js/sim/national_ideas.js'), import('/js/ui/province_panel.js'),
    ]);
    const snap = await fetch('/tools/geom-snapshot.json').then(r => r.json());
    const panel = createNationPanel(document.getElementById('nation-panel'), { DEFINES, onClose() {}, onPeaceClick() {}, onWarClick() {}, onProvinceClick() {} });
    const provincePanel = createProvincePanel(document.getElementById('province-panel'), { DEFINES, onClose() {}, onWar() {} });
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
      provincePanel.bind(ctx, actions);
      window.nationalTest = { ctx, actions, panel, national, provincePanel };
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
  assert.equal(await page.locator('#nation-panel > [data-tab="ideas"] [data-ni-act]').count(), 0, 'Ideas contains adoption only');
  await page.evaluate(() => window.nationalTest.panel.open(null, 'trade'));
  assert.equal(await page.locator('.national-operation:visible').count(), 0);
  const launcher = page.locator('[data-ref="nationalActions_trade"] [data-na-open]');
  await launcher.focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-ni-act="warehouse"]').count(), 1);
  assert(await page.locator('[data-ni-act="harbor"]').isDisabled(), 'future action remains visible and locked');
  assert.match(await page.locator('[data-national-operation="harbor"]').textContent(), /Harbor Concessions/);
  const action = page.locator('[data-national-operation="warehouse"]');
  const select = page.locator('[data-na-target="warehouse"]');
  const selected = await select.inputValue(); await select.selectOption(selected); await select.focus();
  await page.evaluate(() => { window.nationalControl = document.querySelector('[data-na-target="warehouse"]'); window.nationalTest.panel.refresh(); });
  assert.equal(await select.inputValue(), selected);
  assert(await page.evaluate(() => window.nationalControl === document.querySelector('[data-na-target="warehouse"]')), 'unchanged refresh preserves the actual control');
  assert.equal(await page.locator(':focus').getAttribute('data-na-target'), 'warehouse');
  assert(await page.locator('[data-ni-act="warehouse"]').isEnabled(), await action.textContent());
  await page.locator('[data-ni-act="warehouse"]').click();
  assert(await page.evaluate(id => !!window.nationalTest.ctx.game.tags.JUD.nationalStrategy.ports[id], selected));
  assert.equal(await page.locator('.ni-record').count(), 1);
  if (process.env.JU_OUT) await page.locator('#nation-panel').screenshot({ path: process.env.JU_OUT + '/national-paths-desktop.png' });
  console.log('PASS keyboard inspection, actual adoption and warehouse, gated actions and stable selectors');

  await page.evaluate(() => window.loadNational('66ce'));
  const settlement = await page.evaluate(() => {
    const { ctx, panel, provincePanel } = window.nationalTest;
    const p = ctx.prov('Jericho'); p.habitation = 'frontier';
    panel.close(); provincePanel.open(p.id);
    return p.id;
  });
  const invest = page.locator('#province-panel [data-invest]');
  assert(await invest.isVisible()); assert(await invest.isEnabled());
  assert.match(await invest.textContent(), /Invest in Province/);
  assert.equal(await page.locator('#province-panel [data-open-ideas="colonies"]:visible').count(), 0);
  assert.equal(await page.locator('#province-panel [data-ref="integBlock"] [data-invest]').count(), 0);
  const influence = await page.evaluate(() => window.nationalTest.ctx.game.tags.JUD.points.infl);
  await page.evaluate(() => {
    const { ctx, provincePanel } = window.nationalTest;
    ctx.game.tags.JUD.points.infl = 0; provincePanel.refresh();
  });
  assert(await invest.isDisabled());
  assert.match(await invest.getAttribute('data-tt'), /Needs 110 influence/);
  await page.evaluate(n => {
    const { ctx, provincePanel } = window.nationalTest;
    ctx.game.tags.JUD.points.infl = n; provincePanel.refresh();
  }, influence);
  assert(await invest.isEnabled());
  if (process.env.JU_OUT) await page.locator('#province-panel').screenshot({ path: process.env.JU_OUT + '/provincial-investment-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.locator('#province-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  if (process.env.JU_OUT) await page.locator('#province-panel').screenshot({ path: process.env.JU_OUT + '/provincial-investment-mobile.png' });
  await invest.click();
  assert(await page.evaluate(id => window.nationalTest.ctx.byId(id).settlement?.kind === 'investment', settlement));
  assert.equal(await page.evaluate(() => window.nationalTest.ctx.game.tags.JUD.points.infl), influence - 110);
  assert.match(await page.locator('[data-ref="investProgress"]').textContent(), /Investment under way.*6 months/);
  await page.evaluate(() => {
    const { ctx, panel, provincePanel } = window.nationalTest;
    if (ctx.game.tags.JUD.nationalIdeas?.colonies) throw Error('Civilian investment unlocked Military Colonies');
    provincePanel.close(); panel.open(null, 'ideas');
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await path('colonies').locator(':scope > summary').click();
  await path('colonies').locator('[data-ni-buy]').click();
  assert(!await page.evaluate(id => window.nationalTest.actions.getNationalStrategy().actions.find(a => a.key === 'settle').options.some(o => o.args.province === id), settlement));
  assert.equal(await path('colonies').locator('.ni-record progress').count(), 0);
  await page.evaluate(() => window.nationalTest.panel.open(null, 'war', 'colonies'));
  await page.evaluate(() => {
    const { ctx, provincePanel } = window.nationalTest;
    const p = ctx.game.provinces.find(p => p?.owner === 'WASTE');
    p.impassable = true; p.settleable = true;
    provincePanel.open(p.id);
  });
  assert.equal(await page.locator('#province-panel [data-ref="wasteBlock"] [data-open-ideas="colonies"]').count(), 1);
  assert.equal(await page.locator('#province-panel [data-waste]').count(), 0);
  await page.evaluate(() => window.nationalTest.provincePanel.close());
  if (process.env.JU_OUT) await page.locator('#nation-panel').screenshot({ path: process.env.JU_OUT + '/consolidated-paths-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.locator('#nation-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  if (process.env.JU_OUT) await page.locator('#nation-panel').screenshot({ path: process.env.JU_OUT + '/consolidated-paths-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.nationalTest.panel.open('ROM', 'court'));
  assert.equal(await page.locator('[data-intrigue="subvert"], [data-intrigue="pretender"]').count(), 0);
  assert.equal(await page.locator('#nation-panel [data-open-operations="subversion"]').count(), 1);
  assert.equal(await page.locator('#nation-panel [data-open-operations="dynasty"]').count(), 0);
  console.log('PASS civilian investment works without ideas, live costs, desktop/mobile layout, no duplicate owned target; frontier camps remain in Military Colonies');

  await page.evaluate(() => window.loadNational('66ce'));
  await path('federation').locator(':scope > summary').click();
  await path('federation').locator('[data-ni-buy]').click();
  await page.evaluate(() => window.nationalTest.panel.open(null, 'court'));
  assert.equal(await page.locator('#nation-panel > [data-tab="missions"] [data-cs-act], #nation-panel > [data-tab="ideas"] [data-ni-act]').count(), 0);
  assert.equal(await page.locator('.national-operation:visible').count(), 0, 'adoption never expands operation forms on the Court page');
  await page.locator('[data-ref="nationalActions_court"] [data-na-open]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.locator('dialog[open]').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  if (process.env.JU_OUT) await page.screenshot({ path: process.env.JU_OUT + '/operations-dialog-mobile.png' });
  assert(await page.locator('#nation-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  assert((await page.locator('.ni-tiers button:visible, .national-operation-controls button:visible, .national-operation-controls select:visible').evaluateAll(xs => xs.map(x => x.getBoundingClientRect().height))).every(h => h >= 44));
  await page.keyboard.press('Escape');
  assert(await page.locator('[data-ref="nationalActions_court"] [data-na-open]').evaluate(el => el === document.activeElement));
  if (process.env.JU_OUT) await page.locator('#nation-panel').screenshot({ path: process.env.JU_OUT + '/national-paths-mobile.png' });
  await page.evaluate(() => { const { panel, ctx } = window.nationalTest; const foreign = ctx.game.tags.ROM; foreign.nationalIdeas = { subversion: 3 }; panel.open('ROM', 'ideas'); });
  assert.equal(await page.locator('.ni-path').count(), 1);
  assert.equal(await page.locator('[data-ni-buy], [data-ni-act], .ni-record').count(), 0, 'foreign courts expose no actions or private records');
  assert.deepEqual(errors, []);
  console.log('PASS uncluttered Court after adoption, mobile layout, foreign privacy and no browser errors');
  console.log('uitest75: ALL PASS');
} finally { await browser.close(); }
