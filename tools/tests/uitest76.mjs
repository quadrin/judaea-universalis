// Actual personal-command controls backed by the real sim and Court panel.
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
    const [{ DEFINES }, { MAP_DATA }, { ERAS }, { buildProvinceMapping }, sim, { createNationPanel }, mil] = await Promise.all([
      import('/js/data/defines.js'), import('/js/data/map_data.js'), import('/js/data/compendium.js'), import('/js/data/map_profile.js'), import('/js/sim/init.js'), import('/js/ui/nation_panel.js'), import('/js/sim/military.js'),
    ]);
    const snap = await fetch('/tools/geom-snapshot.json').then(r => r.json());
    const panel = createNationPanel(document.getElementById('nation-panel'), { DEFINES, onClose() {}, onPeaceClick() {}, onWarClick() {}, onProvinceClick() {} });
    window.loadRoyal = id => {
      const bookmark = ERAS.find(e => e.bookmark.id === id).bookmark;
      const provinceMap = buildProvinceMapping(MAP_DATA, bookmark), to = id => provinceMap?.[id] || id;
      const neighbors = snap.neighbors.map(() => new Set());
      for (let id = 1; id < neighbors.length; id++) for (const nb of snap.neighbors[id]) if (to(id) !== to(nb)) { neighbors[to(id)].add(to(nb)); neighbors[to(nb)].add(to(id)); }
      const geom = { neighbors, centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null), coastal: snap.coastal.map(Boolean), areas: Int32Array.from(snap.areas), bbox: [] };
      const tag = bookmark.playableTags[0].tag;
      const game = sim.initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag: tag, rngSeed: 19, provinceMap });
      const ctx = sim.makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark, events: [], provinceMap, bus: { emit() {}, on() { return () => {}; } } });
      const actions = sim.gameActions(ctx); panel.bind(ctx, actions); panel.open(null, 'court');
      window.royalTest = { ctx, actions, panel, mil };
    };
  });
  for (const id of ['931bce', '732bce', '597bce', '167bce', '67bce', '66ce', '132ce', '351ce', '529ce', '614ce', '1948ce', '40bce']) {
    await page.evaluate(id => window.loadRoyal(id), id);
    assert.equal(await page.locator('.royal-command').count(), 2, id);
    assert(await page.locator('[data-ref="royalCommandBlock"]').isVisible());
  }
  await page.evaluate(() => window.loadRoyal('167bce'));
  const heir = page.locator('[data-royal-role="heir"]');
  assert.match(await heir.textContent(), /Judah Maccabee/);
  assert.equal(await heir.locator('.general-stars svg').count(), 3);
  assert.equal(await heir.locator('[data-royal-recall]').count(), 1);
  console.log('PASS all bookmarks expose personal command and the historical Maccabean heir starts with three stars');
  await page.evaluate(() => {
    window.loadRoyal('66ce'); const { ctx, panel, mil } = window.royalTest;
    ctx.game.armies = {}; ctx.game.battles = [];
    for (const t of Object.values(ctx.game.tags)) t.atWarWith = [];
    const ids = [];
    for (const name of ['Jerusalem', 'Jericho']) {
      const p = ctx.prov(name); p.owner = p.controller = ctx.game.playerTag; p.siege = null;
      ids.push(mil.spawnArmy(ctx, ctx.game.playerTag, name, { inf: 4, name: 'Guard of ' + name }));
    }
    ctx.game.tags.JUD.points.mar = 0; window.royalTest.ids = ids; panel.refresh();
  });
  const ruler = page.locator('[data-royal-role="ruler"]');
  const ids = await page.evaluate(() => window.royalTest.ids);
  await ruler.locator('select').selectOption(String(ids[0]));
  await ruler.locator('summary').focus(); await page.keyboard.press('Enter');
  assert.match(await ruler.locator('details p').textContent(), /20% death risk/);
  await ruler.locator('[data-royal-commission]').click();
  const assigned = await page.evaluate(() => ({ general: window.royalTest.ctx.game.armies[window.royalTest.ids[0]].general, rng: window.royalTest.ctx.rng.state() }));
  assert.equal(assigned.general.royalRole, 'ruler');
  assert.equal(await ruler.locator('.general-stars').count(), 1);
  assert.equal(await page.evaluate(() => window.royalTest.ctx.game.tags.JUD.points.mar), 0);
  await page.evaluate(() => { const { ctx, ids, panel } = window.royalTest; ctx.game.armies[ids[0]].inBattle = true; panel.refresh(); });
  assert(await ruler.locator('[data-royal-recall]').isDisabled());
  await page.evaluate(() => { const { ctx, ids, panel } = window.royalTest; ctx.game.armies[ids[0]].inBattle = false; panel.refresh(); });
  await ruler.locator('[data-royal-recall]').click();
  await ruler.locator('select').selectOption(String(ids[0])); await ruler.locator('[data-royal-commission]').click();
  assert.deepEqual(await page.evaluate(() => window.royalTest.ctx.game.armies[window.royalTest.ids[0]].general), assigned.general);
  assert.equal(await page.evaluate(() => window.royalTest.ctx.rng.state()), assigned.rng);
  if (process.env.JU_OUT) await page.locator('[data-ref="royalCommandBlock"]').screenshot({ path: process.env.JU_OUT + '/personal-command-desktop.png' });
  console.log('PASS keyboard risk disclosure, actual free commission, blocked battlefield recall and no reroll on recommission');
  await page.evaluate(() => { const { ctx, panel } = window.royalTest; ctx.game.tags.JUD.heir.age = 12; panel.refresh(); });
  assert(await heir.locator('[data-royal-commission]').isDisabled());
  assert.match(await heir.textContent(), /at least 16/);
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.locator('#nation-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  assert((await page.locator('.royal-command-controls button, .royal-command-controls select').evaluateAll(xs => xs.map(x => x.getBoundingClientRect().height))).every(h => h >= 44));
  if (process.env.JU_OUT) await page.locator('[data-ref="royalCommandBlock"]').screenshot({ path: process.env.JU_OUT + '/personal-command-mobile.png' });
  await page.evaluate(() => window.royalTest.panel.open('ROM', 'court'));
  assert(!(await page.locator('[data-ref="royalCommandBlock"]').isVisible()));
  assert.deepEqual(errors, []);
  console.log('PASS child-heir refusal, mobile layout/touch targets, foreign read-only view and no browser errors');
  console.log('uitest76: ALL PASS');
} finally { await browser.close(); }
