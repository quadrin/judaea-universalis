// Actual mission medallions obey the same hard prerequisites as direct claims.
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
  await page.goto((process.env.JU_BASE_URL || 'http://127.0.0.1:8641/') + 'icons/');
  await page.setContent('<!doctype html><html><head><base href="/"></head><body><div id="app"><div id="ui-root"><aside id="nation-panel" class="hidden"></aside></div></div></body></html>');
  await page.addStyleTag({ url: '/styles.css' });
  await page.evaluate(async () => {
    const [{ DEFINES }, { MAP_DATA }, { ERAS }, { buildProvinceMapping }, sim, realm, { missionGraph }, { createNationPanel }] = await Promise.all([
      import('/js/data/defines.js'), import('/js/data/map_data.js'), import('/js/data/compendium.js'), import('/js/data/map_profile.js'),
      import('/js/sim/init.js'), import('/js/sim/realm.js'), import('/js/sim/mission_graph.js'), import('/js/ui/nation_panel.js'),
    ]);
    const snap = await fetch('/tools/geom-snapshot.json').then(r => r.json());
    const panel = createNationPanel(document.getElementById('nation-panel'), { DEFINES, onClose() {}, onPeaceClick() {}, onWarClick() {}, onProvinceClick() {} });
    window.loadMission = () => {
      const bookmark = ERAS.find(e => e.bookmark.id === '167bce').bookmark, provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
      const geom = { neighbors: snap.neighbors.map(n => new Set(n)), coastal: snap.coastal.map(Boolean),
        centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null), areas: Int32Array.from(snap.areas), bbox: [] };
      const game = sim.initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag: 'HAS', rngSeed: 7, provinceMap });
      const ctx = sim.makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark, events: [], provinceMap, bus: { emit() {}, on() { return () => {}; } } });
      const t = game.tags.HAS;
      ctx.helpers = { ...ctx.helpers, factionAtLeast: () => true };
      t.embraced = ['one', 'two', 'three']; t.tech.mar = 7; t.stability = 3; t.legitimacy = 90;
      game.standing = { order: ['HAS'] };
      for (const name of ['Engaddi', 'Gadora']) { const p = ctx.prov(name); p.owner = p.controller = 'HAS'; }
      const actions = sim.gameActions(ctx), graph = missionGraph(realm.missionsFor(ctx, 'HAS'));
      realm.checkMissions(ctx); panel.bind(ctx, actions); panel.open(null, 'missions');
      window.missionTest = { ctx, t, game, actions, panel, graph, realm };
    };
    window.loadMission();
  });
  const pairs = { hm_chancery_of_simon: 'hm_desert_keys', hm_among_the_powers: 'hm_hired_ranks', hm_great_assembly: 'hm_queens_peace' };
  const node = id => page.locator(`[data-mission="${id}"]`);
  for (const [id, parent] of Object.entries(pairs)) {
    assert.match(await node(id).getAttribute('class'), /np-mn-locked/);
    assert.equal(await node(id).getAttribute('data-claim'), null);
    assert.equal(await node(id).locator('.np-mn-claim').count(), 0);
    const parentName = await page.evaluate(id => window.missionTest.actions.getMissions().find(m => m.id === id).name, parent);
    assert((await node(id).getAttribute('data-tt')).includes(parentName));
  }
  await node('hm_chancery_of_simon').evaluate(el => el.setAttribute('data-claim', 'hm_chancery_of_simon'));
  await node('hm_chancery_of_simon').click();
  assert(!(await page.evaluate(() => window.missionTest.t.missionsDone.includes('hm_chancery_of_simon'))));
  assert.match(await node('hm_chancery_of_simon').getAttribute('class'), /np-mn-locked/);
  if (process.env.JU_OUT) await page.locator('#nation-panel').screenshot({ path: process.env.JU_OUT + '/mission-prerequisites-desktop.png' });
  console.log('PASS all three Hasmonean continuations show locked predecessors; stale clickable markup cannot bypass the simulation');

  for (const [id, parent] of Object.entries(pairs)) {
    await page.evaluate(parent => {
      window.loadMission();
      const { ctx, t, graph, panel, realm } = window.missionTest;
      const ancestors = new Set();
      const collect = id => { for (const p of graph.nodes.find(n => n.id === id).requires) if (!ancestors.has(p)) { ancestors.add(p); collect(p); } };
      collect(parent); t.missionsDone = [...ancestors]; t.missionIdx = 0;
      realm.checkMissions(ctx); panel.refresh();
    }, parent);
    assert.equal(await node(id).getAttribute('data-claim'), null);
    assert.equal(await node(parent).getAttribute('data-claim'), parent);
    await node(parent).click();
    assert.equal(await node(id).getAttribute('data-claim'), id, 'parent claim unlocks the child without a calendar tick');
    await node(id).focus(); await page.keyboard.press('Enter');
    assert.match(await node(id).getAttribute('class'), /np-mn-done/);
    assert.equal(await node(id).getAttribute('data-claim'), null);
    assert(await page.evaluate(id => window.missionTest.t.missionsDone.includes(id), id));
  }
  console.log('PASS each actual parent claim unlocks its successor immediately and keyboard claims pay it once');
  await page.evaluate(() => window.loadMission());
  await page.setViewportSize({ width: 390, height: 844 });
  await node('hm_chancery_of_simon').scrollIntoViewIfNeeded();
  for (const id of Object.keys(pairs)) {
    assert.match(await node(id).getAttribute('class'), /np-mn-locked/);
    assert.equal(await node(id).getAttribute('data-claim'), null);
  }
  assert(await page.locator('#nation-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  if (process.env.JU_OUT) await page.locator('#nation-panel').screenshot({ path: process.env.JU_OUT + '/mission-prerequisites-mobile.png' });
  assert.deepEqual(errors, []);
  console.log('PASS mobile tree keeps the same hard gates without overflow or browser errors');
  console.log('uitest77: ALL PASS');
} finally { await browser.close(); }
