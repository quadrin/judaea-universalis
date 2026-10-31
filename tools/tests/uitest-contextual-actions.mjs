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
  // Every operation has a stable contextual home before its idea is adopted.
  const tabs = { maritime:'trade', dynasty:'world', colonies:'war', subversion:'world', federation:'court' };
  for (const [group,tab] of Object.entries(tabs)) {
    await page.evaluate(tab => window.nationalTest.panel.open(null, tab), tab);
    assert(await page.locator(`[data-national-group="${group}"]`).isVisible());
    assert((await page.locator(`[data-national-group="${group}"] [data-ni-act]`).count()) > 0);
    assert((await page.locator(`[data-national-group="${group}"] [data-ni-act]`).evaluateAll(xs => xs.every(x => x.disabled))));
    assert.match(await page.locator(`[data-national-group="${group}"]`).textContent(), /Requires .*tier 1/);
  }
  await page.evaluate(() => window.nationalTest.panel.open(null, 'missions'));
  assert.equal(await page.locator('#nation-panel > [data-tab="missions"] [data-cs-act], #nation-panel > [data-tab="missions"] [data-ni-act]').count(), 0);
  await page.evaluate(() => window.nationalTest.panel.open(null, 'war'));
  const reform = page.locator('[data-cs-act="regulars"]');
  assert(await reform.isVisible()); assert(await reform.isEnabled());
  const before = await page.evaluate(() => window.nationalTest.ctx.game.tags.JUD.treasury);
  await reform.click();
  assert.equal(await page.evaluate(() => window.nationalTest.ctx.game.tags.JUD.treasury), before - 220);
  assert(await page.evaluate(() => window.nationalTest.actions.getChapterStrategy().projects.some(p => p.key === 'regulars')));
  console.log('PASS all five paths expose locked operations in context; Missions has no operational controls; military reform executes in Defense');

  await page.evaluate(async () => {
    const { ctx, actions, panel } = window.nationalTest, g = ctx.game;
    const { spawnArmy } = await import('/js/sim/military.js');
    g.wars = [{ id:'ui-allied-war', attackers:['JUD','ROM'], defenders:['PAR'], started:{...g.date}, warscore:{JUD:0,ROM:0,PAR:0} }];
    g.armies = {};
    for (const t of Object.values(g.tags)) { t.atWarWith=[]; t.allies=[]; t.overlord=null; }
    g.tags.JUD.allies=['ROM']; g.tags.ROM.allies=['JUD'];
    g.tags.JUD.atWarWith=['PAR']; g.tags.ROM.atWarWith=['PAR']; g.tags.PAR.atWarWith=['JUD','ROM'];
    const ally=g.tags.ROM; ally.ai=true; ally.modifiers=[]; ally.warExhaustion=0; ally.treasury=1000; ally.opinion ||= {}; ally.opinion.JUD=100;
    ally.diplomaticCredit={JUD:{trust:80,favors:20}};
    const p=ctx.prov('Jerusalem'); p.owner=p.controller='JUD'; p.siege=null; p.fort=0;
    spawnArmy(ctx,'ROM',p.name,{inf:10,name:'Allied field army'});
    window.alliedTarget=p.id;
    panel.open(null,'world');
  });
  const request=page.locator('[data-allied-request="ROM"]');
  assert(await request.isVisible());
  const target=page.locator('[data-allied-target="ROM"]');
  const province=await page.evaluate(() => window.alliedTarget);
  await target.selectOption('defend|'+province);
  assert(await request.isEnabled());
  await request.click();
  const accepted=await page.evaluate(() => window.nationalTest.actions.getAlliedOrders().requests[0]);
  assert.equal(accepted.status,'accepted'); assert.equal(accepted.kind,'defend'); assert.equal(accepted.province,province);
  assert.equal(await page.evaluate(() => window.nationalTest.ctx.game.tags.ROM.diplomaticCredit.JUD.favors),15);
  await request.click();
  assert.match(await page.locator('[data-ref="alliedOrders"] [role="status"]').textContent(), /already has an active/);
  await page.locator('[data-allied-cancel]').click();
  assert.equal(await page.evaluate(() => window.nationalTest.actions.getAlliedOrders().requests[0].status),'cancelled');
  console.log('PASS real allied request reserves favors, refuses duplicate orders with feedback, and cancels through gameActions');
  await page.setViewportSize({width:390,height:844});
  assert(await page.locator('#nation-panel').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  assert.deepEqual(errors,[]);
  console.log('uitest-contextual-actions: ALL PASS');
} finally { await browser.close(); }
