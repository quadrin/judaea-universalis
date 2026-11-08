// National paths on the EU4-style Ideas board, with the real panel and
// simulation and without rasterizing the map. The old Operations are gone.
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
    assert.equal(await page.locator('[data-idea-group^="path:"]').count(), 5, id);
    assert.equal(await page.locator('#nation-panel .ib-col').count(), 3, id);
  }
  console.log('PASS all bookmarks show the five national paths in the three idea columns');

  await page.evaluate(() => window.loadNational('66ce'));
  const card = key => page.locator(`[data-idea-group="path:${key}"]`);
  // Each path sits in the column of the point that pays for it.
  for (const [key, point] of [['maritime', 'infl'], ['dynasty', 'infl'], ['subversion', 'infl'], ['colonies', 'mar'], ['federation', 'gov']]) {
    assert.equal(await page.locator(`.ib-col[data-ib-point="${point}"] [data-idea-group="path:${key}"]`).count(), 1, key);
  }
  const third = card('maritime').locator('[data-idea-inspect][data-tier="2"]');
  await third.focus(); await page.keyboard.press('Enter');
  assert.match(await card('maritime').locator('.ib-detail').textContent(), /The Maritime League/);
  assert.match(await card('maritime').locator('.ib-detail').textContent(), /\+15% trade income/);
  assert.equal(await page.locator(':focus').getAttribute('data-tier'), '2', 'inspection keeps keyboard focus');
  await page.keyboard.press('Enter');
  assert.equal(await card('maritime').locator('.ib-detail').count(), 0, 'selecting the open idea again closes it');
  const before = await page.evaluate(() => window.nationalTest.ctx.game.tags.JUD.points.infl);
  await card('maritime').locator('[data-ni-buy]').click();
  assert.equal(await page.evaluate(() => window.nationalTest.ctx.game.tags.JUD.points.infl), before - 60);
  assert.equal(await card('maritime').locator('.ib-idea.owned').count(), 1);
  await card('colonies').locator('[data-ni-buy]').click();
  assert.equal(await page.locator('.ib-slot.filled').count(), 2, 'both slots show their paths');
  const blocked = card('federation').locator('[data-ni-buy]');
  assert(await blocked.isDisabled(), 'a third path waits for a slot');
  assert.match(await blocked.getAttribute('data-tt'), /slots are occupied/);
  const govBefore = await page.evaluate(() => window.nationalTest.ctx.game.tags.JUD.points.gov);
  await blocked.click({ force: true });
  assert.equal(await page.evaluate(() => window.nationalTest.ctx.game.tags.JUD.nationalIdeas?.federation || 0), 0, 'a disabled control buys nothing');
  assert.equal(await page.evaluate(() => window.nationalTest.ctx.game.tags.JUD.points.gov), govBefore);
  assert.equal(await blocked.locator('svg, .icon').count() > 0, true);
  if (process.env.JU_OUT) await page.locator('#nation-panel').screenshot({ path: process.env.JU_OUT + '/ideas-board-desktop.png' });
  console.log('PASS keyboard inspection, actual adoption, slot limit and columns by point');

  // No Operations remain anywhere in the realm panel.
  for (const tab of ['crown', 'missions', 'court', 'tech', 'ideas', 'trade', 'war', 'faith', 'world']) {
    await page.evaluate(tab => window.nationalTest.panel.open(null, tab), tab);
    assert.equal(await page.locator('[data-na-open], [data-ni-act], .national-operation, .national-operations-dialog, [data-open-operations]').count(), 0, tab);
    assert(!/\bOperations\b/.test(await page.locator('#nation-panel').textContent()), tab + ' mentions no Operations');
  }
  await page.evaluate(() => window.nationalTest.panel.open('ROM', 'court'));
  assert.equal(await page.locator('#nation-panel [data-open-operations]').count(), 0);
  console.log('PASS no Operations launchers, dialogs or links on any tab');

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
  assert.equal(await page.locator('#province-panel [data-open-ideas]').count(), 0);
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
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.locator('#province-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  await invest.click();
  assert(await page.evaluate(id => window.nationalTest.ctx.byId(id).settlement?.kind === 'investment', settlement));
  assert.equal(await page.evaluate(() => window.nationalTest.ctx.game.tags.JUD.points.infl), influence - 110);
  assert.match(await page.locator('[data-ref="investProgress"]').textContent(), /Investment under way.*6 months/);
  assert(!await page.evaluate(() => window.nationalTest.ctx.game.tags.JUD.nationalIdeas?.colonies), 'civilian investment needs no idea');
  await page.setViewportSize({ width: 1440, height: 1000 });
  console.log('PASS civilian investment works without ideas, with live costs, on desktop and mobile');

  // Frontier expeditions are ordered on the waste itself, gated by Veterans on the Land.
  const waste = await page.evaluate(async () => {
    const { ctx, provincePanel } = window.nationalTest;
    const { spawnArmy } = await import('/js/sim/military.js');
    const g = ctx.game;
    const p = g.provinces.find(p => p?.owner === 'WASTE' && p.settleable !== false
      && [...(ctx.geom.neighbors[p.id] || [])].some(id => ctx.byId(id) && !ctx.byId(id).impassable && ctx.byId(id).owner !== 'WASTE'));
    p.impassable = true;
    const border = [...ctx.geom.neighbors[p.id]].map(id => ctx.byId(id)).find(q => q && !q.impassable && q.owner !== 'WASTE');
    border.owner = border.controller = 'JUD'; border.siege = null;
    spawnArmy(ctx, 'JUD', border.name, { inf: 4, name: 'Frontier column' });
    provincePanel.open(p.id);
    return p.id;
  });
  const expedition = page.locator('#province-panel [data-waste="expedition"]');
  assert(await expedition.isVisible());
  assert(await expedition.evaluate(el => el.classList.contains('disabled')));
  assert.match(await expedition.getAttribute('data-tt'), /Veterans on the Land/);
  await page.evaluate(() => { const { actions, provincePanel } = window.nationalTest; actions.buyNationalIdea('colonies'); provincePanel.refresh(); });
  assert(!await expedition.evaluate(el => el.classList.contains('disabled')), await expedition.getAttribute('data-tt'));
  await expedition.click();
  assert.equal(await page.evaluate(id => window.nationalTest.ctx.byId(id).expedition?.by, waste), 'JUD');
  assert(await page.locator('#province-panel [data-waste="settle"]').isVisible(), 'the next step appears in place');
  await page.evaluate(() => window.nationalTest.provincePanel.close());
  console.log('PASS frontier expedition is gated by Military Colonies and ordered from the province panel');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.nationalTest.panel.open(null, 'ideas'));
  assert(await page.locator('#nation-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  assert((await page.locator('.ib-idea:visible, .ib-control:visible').evaluateAll(xs => xs.map(x => x.getBoundingClientRect().height))).every(h => h >= 40));
  if (process.env.JU_OUT) await page.locator('#nation-panel').screenshot({ path: process.env.JU_OUT + '/ideas-board-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { const { panel, ctx } = window.nationalTest; const foreign = ctx.game.tags.ROM; foreign.nationalIdeas = { subversion: 3 }; panel.open('ROM', 'ideas'); });
  assert.equal(await page.locator('[data-idea-group^="path:"]').count(), 1);
  assert.equal(await page.locator('[data-idea-group="path:subversion"] .ib-complete').count(), 1);
  assert.equal(await page.locator('#nation-panel [data-ni-buy], #nation-panel [data-idea], #nation-panel [data-eraidea], .ib-slots').count(), 0, 'foreign courts expose no adoption');
  assert.deepEqual(errors, []);
  console.log('PASS mobile layout, foreign read-only view and no browser errors');
  console.log('uitest75: ALL PASS');
} finally { await browser.close(); }
