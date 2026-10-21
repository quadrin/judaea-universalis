// Actual war overview, outliner and peace builder show the score they evaluate.
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
  const base = process.env.JU_BASE_URL || 'http://127.0.0.1:8641/';
  await page.goto(base + 'icons/');
  const markup = await (await page.request.get(base)).text();
  await page.setContent(markup.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace('<head>', '<head><base href="/">'));
  await page.evaluate(async () => {
    const [{ DEFINES }, { MAP_DATA }, { ERAS }, { buildProvinceMapping }, sim, { spawnArmy }, { bus }, { initUI }] = await Promise.all([
      import('/js/data/defines.js'), import('/js/data/map_data.js'), import('/js/data/compendium.js'), import('/js/data/map_profile.js'),
      import('/js/sim/init.js'), import('/js/sim/military.js'), import('/js/core/bus.js'), import('/js/ui/ui.js'),
    ]);
    const bookmark = ERAS.find(e => e.bookmark.id === '66ce').bookmark;
    const provinceMap = buildProvinceMapping(MAP_DATA, bookmark), to = id => provinceMap?.[id] || id;
    const snap = await fetch('/tools/geom-snapshot.json').then(r => r.json());
    const neighbors = snap.neighbors.map(() => new Set());
    for (let id = 1; id < neighbors.length; id++) for (const nb of snap.neighbors[id]) if (to(id) !== to(nb)) { neighbors[to(id)].add(to(nb)); neighbors[to(nb)].add(to(id)); }
    const geom = { neighbors, coastal: snap.coastal.map(Boolean), centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null), areas: Int32Array.from(snap.areas), bbox: [] };
    const game = sim.initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag: 'JUD', rngSeed: 7, provinceMap });
    const ctx = sim.makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark, events: [], provinceMap, bus });
    game.armies = {}; game.battles = []; game.paused = true;
    for (const t of Object.values(game.tags)) { t.ai = false; t.atWarWith = []; }
    const war = { id: 'score-test', name: 'The score test', attackers: ['JUD'], defenders: ['ROM'],
      started: { ...game.date }, warscore: { JUD: 37, ROM: -37 }, cb: 'conquest' };
    game.wars = [war]; game.tags.JUD.atWarWith = ['ROM']; game.tags.ROM.atWarWith = ['JUD'];
    game.tags.ROM.warExhaustion = 20; game.tags.ROM.manpower = 0; game.tags.ROM.treasury = 5000;
    spawnArmy(ctx, 'JUD', 'Jerusalem', { inf: 20 });
    const actions = sim.gameActions(ctx), ui = initUI({ DEFINES, bus, camera: { centerOn() {} } });
    document.getElementById('start-screen').classList.add('hidden'); ui.bindGame(ctx, actions);
    window.scoreTest = { ctx, actions, ui, bus, war };
  });
  const row = page.locator('#outliner [data-war="score-test"]');
  assert.match(await row.locator('.ol-sub').textContent(), /46\.3/);
  await page.locator('#topbar [data-ref="flagBtn"]').click();
  await page.locator('#nation-panel [data-tab-go="world"]').click();
  assert.match(await page.locator('#nation-panel [data-war="score-test"] .np-dip-ws').textContent(), /46\.3/);
  await page.locator('#topbar [data-ref="flagBtn"]').click();
  await row.click();
  assert.equal(await page.locator('#war-modal [data-peace-score]').getAttribute('data-peace-score'), '46.3');
  assert.match(await page.locator('#war-modal').textContent(), /From war enthusiasm/);
  await page.locator('#war-modal [data-ref="negotiate"]').click();
  const modal = page.locator('#peace-modal');
  assert.equal(await modal.locator('[data-peace-score]').getAttribute('data-peace-score'), '46.3');
  assert.match(await modal.locator('.peace-stats').textContent(), /Military\s*37/);
  assert.match(await modal.locator('.peace-stats').textContent(), /Enthusiasm\s*\+9\.3/);
  assert(!await modal.locator('.peace-factors > summary').textContent().then(s => s.includes('Limit')));
  console.log('PASS outliner, war overview and peace headline all include the enthusiasm adjustment in war score');
  for (let n = 0; n < 18; n++) await modal.locator('[data-gold="1"]').click();
  assert.match(await modal.locator('[data-ref="total"]').textContent(), /Demands cost 45 war score.*we have 46\.3/);
  assert.match(await modal.locator('[data-ref="verdict"]').textContent(), /will accept/);
  assert(!(await modal.locator('[data-ref="send"]').getAttribute('class')).includes('disabled'));
  if (process.env.JU_OUT) await modal.screenshot({ path: process.env.JU_OUT + '/calculated-war-score-desktop.png' });
  await modal.locator('[data-gold="1"]').click();
  assert.match(await modal.locator('[data-ref="total"]').textContent(), /Demands cost 48 war score.*we have 46\.3/);
  assert((await modal.locator('[data-ref="send"]').getAttribute('class')).includes('disabled'));
  console.log('PASS demands use the same displayed 46.3 score: 45-point terms accepted, 48-point terms refused');
  await modal.locator('[data-gold="-1"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await modal.locator('[data-peace-score]').getAttribute('data-peace-score'), '46.3');
  assert(await modal.locator('.peace-card').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  if (process.env.JU_OUT) await modal.screenshot({ path: process.env.JU_OUT + '/calculated-war-score-mobile.png' });
  await page.evaluate(() => {
    const { ctx } = window.scoreTest;
    ctx.game.armies = {}; ctx.game.tags.ROM.warExhaustion = 0;
    ctx.game.tags.ROM.manpower = ctx.game.tags.ROM.maxManpower = 10000;
  });
  await modal.locator('[data-gold="-1"]').click();
  assert.equal(await modal.locator('[data-peace-score]').getAttribute('data-peace-score'), '33');
  assert.match(await modal.locator('[data-ref="total"]').textContent(), /we have 33/);
  assert((await modal.locator('[data-ref="send"]').getAttribute('class')).includes('disabled'));
  assert.equal(await page.evaluate(() => window.scoreTest.war.warscore.JUD), 37);
  assert.deepEqual(errors, []);
  console.log('PASS mobile layout, live reluctance adjustment and no repeated bonus or browser errors');
  console.log('uitest78: ALL PASS');
} finally { await browser.close(); }
