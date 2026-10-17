// Fort routes in the real game: map, order feedback, capture and mobile UI.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/usr/bin/chromium',
  args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const out = process.env.JU_OUT || '/tmp';
try {
  await page.goto(process.env.JU_BASE_URL || 'http://127.0.0.1:8613/', { waitUntil: 'domcontentloaded', timeout: 480000 });
  await page.waitForSelector('.bm-card', { timeout: Number(process.env.JU_BOOT_TIMEOUT || 480000) });
  await page.locator('.ss-dot[aria-label="The Great Revolt"]').click();
  await page.waitForTimeout(450);
  await page.locator('.bm-card.current').click();
  await page.waitForSelector('.nation-card'); await page.locator('.nation-card').first().click();
  await page.waitForFunction(() => !!window._ctx?.game.tags.JUD, null, { timeout: 480000 });
  const ids = await page.evaluate(async () => {
    const ctx = window._ctx, g = ctx.game;
    g.paused = true; g.armies = {}; g.battles = []; g.pendingEvents = [];
    for (const t of Object.values(g.tags)) { t.atWarWith = []; t.allies = []; t.overlord = null; }
    g.tags.JUD.atWarWith = ['ROM']; g.tags.ROM.atWarWith = ['JUD'];
    g.wars = [{ id: 'browser-fort', attackers: ['JUD'], defenders: ['ROM'], cb: 'conquest',
      started: { ...g.date }, warscore: { JUD: 0, ROM: 0 } }];
    g.ceasefire = null;
    for (const p of g.provinces) if (p) { p.fort = 0; p.garrison = 0; p.maxGarrison = 0; p.siege = null; }
    const [home, approach, fort, interior] = ['Jerusalem', 'Emmaus', 'Lydda', 'Joppa'].map(n => ctx.prov(n));
    if (![home, approach, fort, interior].every(Boolean)) throw new Error('Fixture provinces missing');
    for (const p of [approach, fort, interior]) p.owner = p.controller = 'ROM';
    home.owner = home.controller = 'JUD';
    fort.fort = 1; fort.garrison = fort.maxGarrison = 1000; fort.mothballed = false;
    ctx.geom.neighbors = ctx.geom.neighbors.map(() => new Set());
    for (const [a, b] of [[home, approach], [approach, fort], [approach, interior], [fort, interior]]) {
      ctx.geom.neighbors[a.id].add(b.id); ctx.geom.neighbors[b.id].add(a.id);
    }
    const { spawnArmy } = await import('/js/sim/military.js');
    const army = spawnArmy(ctx, 'JUD', home.name, { inf: 10, name: 'Fort expedition' });
    ctx.bus.emit('actionTaken', {});
    ctx.bus.emit('mapclick', { armyId: army, provId: home.id });
    const c = ctx.geom.centroids[fort.id]; window._camera.centerOn(c.x, c.y, 3);
    return { home: home.id, approach: approach.id, fort: fort.id, interior: interior.id, army, fortName: fort.name };
  });
  await page.waitForFunction(id => window._overlay.fortRoutes().some(r => r.id === id), ids.fort);
  await page.evaluate(id => window._ctx.bus.emit('maphover', id), ids.interior);
  assert((await page.locator('#march-preview').textContent()).includes(ids.fortName));
  assert(await page.locator('#march-preview').evaluate(el => el.classList.contains('blocked')));
  await page.evaluate(id => window._ctx.bus.emit('maprightclick', { provId: id }), ids.interior);
  assert.deepEqual(await page.evaluate(id => window._ctx.game.armies[id].path, ids.army), []);
  console.log('PASS selected-army overlay, named pre-order feedback and refused bypass');

  assert.equal(await page.locator('.mm-btn').count(), 12);
  await page.keyboard.press('f');
  assert.equal(await page.locator('[data-mode="forts"]').getAttribute('aria-pressed'), 'true');
  assert(await page.locator('#fort-route-legend').isVisible());
  await page.screenshot({ path: out + '/fort-routes-desktop.png' });
  await page.evaluate(id => window._ctx.bus.emit('mapclick', { provId: id, armyId: null }), ids.approach);
  assert((await page.locator('[data-ref="fortRoutes"]').textContent()).includes(ids.fortName));
  console.log('PASS keyboard mapmode, legend and guarded province inspection');

  await page.evaluate(ids => {
    window._ctx.bus.emit('mapclick', { armyId: ids.army, provId: ids.home });
    window._ctx.bus.emit('maphover', ids.interior);
  }, ids);
  await page.setViewportSize({ width: 390, height: 844 });
  // Resizing can legitimately clear hover when the pointer leaves the map.
  await page.mouse.move(0, 0);
  await page.evaluate(id => window._ctx.bus.emit('maphover', id), ids.interior);
  await page.screenshot({ path: out + '/fort-routes-mobile.png' });
  for (const selector of ['#fort-route-legend', '#march-preview', '#mapmode-bar']) {
    const box = await page.locator(selector).boundingBox();
    assert(box && box.x >= 0 && box.x + box.width <= 391 && box.y >= 0 && box.y + box.height <= 844, selector + ' fits mobile');
  }
  await page.getByRole('button', { name: 'Political mapmode', exact: true }).click();
  await page.getByRole('button', { name: /Fort routes.*mapmode/ }).click();
  assert.equal(await page.locator('[data-mode="forts"]').getAttribute('aria-pressed'), 'true');
  console.log('PASS mobile layout and touch-accessible mapmode controls');

  await page.evaluate(async ids => {
    const ctx = window._ctx, army = ctx.game.armies[ids.army];
    const { moveArmiesDaily, siegeFall } = await import('/js/sim/military.js');
    window._actions.moveArmy(ids.army, ids.fort);
    for (let d = 0; d < 100 && army.prov !== ids.fort; d++) moveArmiesDaily(ctx);
    if (army.prov !== ids.fort) throw new Error('Army could not approach the fort');
    siegeFall(ctx, ctx.byId(ids.fort)); ctx.bus.emit('actionTaken', {});
    ctx.bus.emit('maphover', ids.interior);
  }, ids);
  assert(!(await page.locator('#march-preview').evaluate(el => el.classList.contains('blocked'))));
  assert((await page.locator('#march-preview').textContent()).includes('route open'));
  await page.waitForFunction(id => window._overlay.fortRoutes().find(r => r.id === id)?.hostile === false, ids.fort);
  assert.deepEqual(errors, []);
  console.log('PASS capturing the fortress opens orders and updates the live map');
  console.log('ALL PASS: fort routes UI');
} finally { await browser.close(); }
