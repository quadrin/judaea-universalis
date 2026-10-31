// Actual chapter controls, merged bookmark carousel and compact peace details.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/usr/bin/chromium' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/favicon.ico', r => r.fulfill({ status: 204, body: '' }));
  await page.goto((process.env.JU_BASE_URL || 'http://127.0.0.1:8613/') + 'icons/');
  await page.setContent('<!doctype html><html><head><base href="/"></head><body><div id="app"><div id="ui-root"><aside id="nation-panel" class="hidden"></aside><div id="start-screen"></div></div></div></body></html>');
  await page.addStyleTag({ url: '/styles.css' });
  await page.evaluate(async () => {
    const [{ DEFINES }, { MAP_DATA }, { ERAS, PLAYABLE_ERAS }, { buildProvinceMapping }, sim, { createNationPanel }, strategy, { buildStartScreen }, { renderPeaceStrategy }] = await Promise.all([
      import('/js/data/defines.js'), import('/js/data/map_data.js'), import('/js/data/compendium.js'), import('/js/data/map_profile.js'), import('/js/sim/init.js'),
      import('/js/ui/nation_panel.js'), import('/js/sim/chapter_strategy.js'), import('/js/ui/startscreen.js'), import('/js/ui/peace_strategy.js'),
    ]);
    const snap = await fetch('/tools/geom-snapshot.json').then(r => r.json());
    const panel = createNationPanel(document.getElementById('nation-panel'), { DEFINES, onClose() {}, onPeaceClick() {}, onWarClick() {}, onProvinceClick() {} });
    window.loadChapter = id => {
      const bookmark = ERAS.find(e => e.bookmark.id === id).bookmark;
      const provinceMap = buildProvinceMapping(MAP_DATA, bookmark), to = id => provinceMap?.[id] || id;
      const neighbors = snap.neighbors.map(() => new Set());
      for (let id = 1; id < neighbors.length; id++) for (const nb of snap.neighbors[id]) if (to(id) !== to(nb)) { neighbors[to(id)].add(to(nb)); neighbors[to(nb)].add(to(id)); }
      const geom = { neighbors, centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null), coastal: snap.coastal.map(Boolean), areas: Int32Array.from(snap.areas), bbox: [] };
      const tag = bookmark.playableTags[0].tag;
      const game = sim.initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag: tag, rngSeed: 7, provinceMap });
      const ctx = sim.makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark, events: [], provinceMap, bus: { emit() {}, on() { return () => {}; } } });
      const t = game.tags[tag]; t.treasury = 3000; t.manpower = 30000; t.points = { gov: 999, infl: 999, mar: 999 };
      for (const p of game.provinces) if (p?.owner === tag) { p.controller = tag; p.siege = null; }
      const actions = sim.gameActions(ctx); panel.bind(ctx, actions); panel.open(null, ({ '732bce':'world', '167bce':'war', '132ce':'war', '351ce':'war', '1948ce':'war' }[id] || 'court'));
      window.chapterTest = { ctx, actions, panel, strategy, renderPeaceStrategy };
    };
    buildStartScreen(document.getElementById('start-screen'), DEFINES, PLAYABLE_ERAS.map(e => e.bookmark), () => {});
  });
  assert.equal(await page.locator('.ss-dot').count(), 11);
  assert.equal(await page.locator('.ss-dot[aria-label="Herod\'s Rise"]').count(), 0);
  assert.equal(await page.locator('.ss-dot[aria-label="The Struggle for Judaea"]').count(), 1);
  await page.evaluate(() => document.getElementById('start-screen').remove());
  for (const id of ['931bce', '732bce', '597bce', '167bce', '67bce', '66ce', '132ce', '351ce', '529ce', '614ce', '1948ce', '40bce']) {
    await page.evaluate(id => window.loadChapter(id), id);
    assert((await page.locator('[data-ref^="chapterStrategyBlock_"]:visible').count()) > 0, id);
    assert.equal(await page.locator('[data-cs-act]').count(), await page.evaluate(() => window.chapterTest.actions.getChapterStrategy().actions.length), id + ': every action has exactly one contextual home');
  }
  console.log('PASS eleven visible bookmarks, merged succession card and all chapter menus including legacy saves');
  await page.evaluate(() => window.loadChapter('931bce'));
  assert.equal(await page.locator('#nation-panel > [data-tab="missions"] [data-cs-act]').count(), 0, 'Missions contains no executable chapter actions');
  const info = page.locator('details[data-cs-info="direct_rule"]');
  assert(!(await info.evaluate(el => el.open)), 'action explanations start collapsed');
  await info.locator('summary').focus(); await page.keyboard.press('Enter');
  assert(await info.evaluate(el => el.open), 'keyboard users can inspect the complete action');
  assert(await info.locator('.chapter-action-description').isVisible());
  await page.evaluate(() => window.chapterTest.panel.refresh());
  assert(await info.evaluate(el => el.open), 'refresh preserves the expanded explanation');
  await page.evaluate(() => {
    window.chapterControl = document.querySelector('[data-cs-target="direct_rule"]');
    window.chapterTest.panel.refresh();
  });
  assert(await page.evaluate(() => window.chapterControl === document.querySelector('[data-cs-target="direct_rule"]')),
    'an unchanged refresh preserves the live target control');
  await info.locator('summary').click();
  const select = page.locator('[data-cs-target="direct_rule"]');
  await select.focus();
  const province = await select.inputValue();
  await page.evaluate(id => { window.chapterTest.ctx.byId(Number(id)).autonomy = .15; window.chapterTest.panel.refresh(); }, province);
  await select.selectOption(province);
  assert.equal(await page.locator(':focus').getAttribute('data-cs-target'), 'direct_rule');
  await page.locator('[data-cs-act="direct_rule"]').click();
  assert.equal(await page.evaluate(() => window.chapterTest.ctx.game.tags[window.chapterTest.ctx.game.playerTag].points.gov), 959);
  assert.equal(await page.evaluate(id => window.chapterTest.ctx.byId(Number(id)).autonomy, province), 0);
  assert.equal(await page.evaluate(() => window.chapterTest.ctx.game.tags[window.chapterTest.ctx.game.playerTag].treasury), 2940);
  assert(await page.locator('[data-cs-act="direct_rule"]').isDisabled());
  await page.evaluate(() => { const { panel, ctx } = window.chapterTest; panel.open(ctx.game.playerTag === 'ISL' ? 'JDH' : 'ISL', 'missions'); });
  assert.equal(await page.locator('[data-ref^="chapterStrategyBlock_"]:visible').count(), 0);
  await page.evaluate(() => window.chapterTest.panel.open(null, 'court'));
  console.log('PASS contextual layout, keyboard action details, stable controls, real governor enactment, exact cost, repeat refusal and foreign read-only view');
  await page.evaluate(() => window.loadChapter('597bce'));
  await page.locator('[data-cs-act="restore_farms"]').click();
  assert.equal(await page.locator('.chapter-progress progress').count(), 1);
  await page.evaluate(() => {
    const { ctx, panel } = window.chapterTest; ctx.game.tags[ctx.game.playerTag].treasury = 0; panel.refresh();
  });
  assert(await page.locator('[data-cs-act="restore_towns"]').isDisabled());
  assert.match(await page.locator('.chapter-strategy:visible').textContent(), /Requires 100 talents/);
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.locator('#nation-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  assert((await page.locator('[data-cs-act]:visible').evaluateAll(xs => xs.map(x => x.getBoundingClientRect().height))).every(h => h >= 44));
  if (process.env.JU_OUT) await page.screenshot({ path: process.env.JU_OUT + '/chapter-strategy-mobile.png' });
  console.log('PASS construction progress, live affordability, mobile layout and touch targets');
  await page.evaluate(() => {
    const { ctx, panel, renderPeaceStrategy } = window.chapterTest; panel.close();
    const host = document.createElement('div'); host.id = 'peace-strategy-test'; host.className = 'peace-strategy';
    host.style.cssText = 'position:fixed;left:12px;top:12px;width:calc(100vw - 24px);max-width:700px;max-height:calc(100vh - 24px);overflow:auto;padding:16px;background:#e4d3af;color:#3d3020';
    host.innerHTML = renderPeaceStrategy({ enthusiasm: { level: 'Low', willingness: 20, factors: [
      { label: 'War exhaustion', value: 12 }, { label: 'Occupied provinces', value: 7.6 }, { label: 'Manpower depleted', value: .1 },
      { label: 'Capital occupied', value: 6 }, { label: 'Length of war', value: 1.5 }, { label: 'Forces still in the field', value: 4.7 },
    ] }, acceptanceBudget: 71, acceptanceAdjustment: 14.3, expansion: [
      { tag: 'ROM', name: 'The Eastern Empire', gain: 27.3, after: 27.3, coalition: false, newlyAlarmed: false },
      { tag: 'ARM', name: 'Armenia', gain: 8.4, after: 58.4, coalition: true, newlyAlarmed: true },
      { tag: 'NAB', name: 'Nabataea', gain: 8.4, after: 60, coalition: true, newlyAlarmed: false },
    ] }, ctx);
    document.getElementById('ui-root').append(host);
  });
  assert.equal(await page.locator('.peace-factor svg').count(), 6);
  assert.equal(await page.locator('.peace-risk svg').count(), 3);
  assert.equal(await page.getByText('Below threshold / relations permit', { exact: true }).count(), 0);
  assert.equal(await page.getByText(/after base reluctance/).count(), 0);
  assert.match(await page.locator('.peace-stats').getAttribute('title'), /25%/);
  assert.match(await page.locator('.peace-risk').first().getAttribute('title'), /Below the concern threshold/);
  assert(await page.locator('#peace-strategy-test').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  if (process.env.JU_OUT) await page.screenshot({ path: process.env.JU_OUT + '/peace-icons-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 900 });
  if (process.env.JU_OUT) await page.screenshot({ path: process.env.JU_OUT + '/peace-icons-desktop.png' });
  assert.deepEqual(errors, []);
  console.log('PASS icon-led peace factors, compact coalition indicators, explanatory tooltips and no browser errors');
  console.log('ALL PASS');
} finally { await browser.close(); }
