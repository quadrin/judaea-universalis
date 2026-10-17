// Historical turning points in the actual event modal and Court controls.
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
  await page.setContent('<!doctype html><html><head><base href="/"></head><body><div id="app"><div id="ui-root"><aside id="nation-panel" class="hidden"></aside><div id="event-modal" class="hidden"></div></div></div></body></html>');
  await page.addStyleTag({ url: '/styles.css' });
  await page.evaluate(async () => {
    const [{ DEFINES }, { MAP_DATA }, { ERAS }, { buildProvinceMapping }, sim, events, crises, { createEventModal }, { createNationPanel }] = await Promise.all([
      import('/js/data/defines.js'), import('/js/data/map_data.js'), import('/js/data/compendium.js'), import('/js/data/map_profile.js'), import('/js/sim/init.js'),
      import('/js/sim/events.js'), import('/js/sim/political_turning_points.js'), import('/js/ui/modals.js'), import('/js/ui/nation_panel.js'),
    ]);
    const snap = await fetch('/tools/geom-snapshot.json').then(r => r.json());
    const panel = createNationPanel(document.getElementById('nation-panel'), { DEFINES, onClose() {}, onPeaceClick() {}, onWarClick() {}, onProvinceClick() {} });
    const modal = createEventModal(document.getElementById('event-modal'));
    window.loadTurningPoint = (chapter, eventId, poor = false) => {
      const era = ERAS.find(e => e.bookmark.id === chapter), bookmark = era.bookmark;
      const provinceMap = buildProvinceMapping(MAP_DATA, bookmark), to = id => provinceMap?.[id] || id;
      const neighbors = snap.neighbors.map(() => new Set());
      for (let id = 1; id < neighbors.length; id++) for (const nb of snap.neighbors[id]) if (to(id) !== to(nb)) { neighbors[to(id)].add(to(nb)); neighbors[to(nb)].add(to(id)); }
      const geom = { neighbors, centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null), coastal: snap.coastal.map(Boolean), areas: Int32Array.from(snap.areas), bbox: [] };
      const tag = bookmark.playableTags[0].tag;
      const game = sim.initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag: tag, rngSeed: 7, provinceMap });
      const listeners = new Map(), bus = { emit(k, p) { for (const fn of listeners.get(k) || []) fn(p); }, on(k, fn) { listeners.set(k, [...(listeners.get(k) || []), fn]); } };
      const ctx = sim.makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark, events: era.events, provinceMap, bus });
      game.pendingEvents = []; game.wars = []; game.truces = {}; game.recognitions = {};
      for (const t of Object.values(game.tags)) { t.atWarWith = []; t.ai = false; t.treasury = 3000; t.manpower = 10000; t.points = { gov: 999, infl: 999, mar: 999 }; }
      for (const p of game.provinces) if (p) { p.controller = p.owner; p.siege = null; }
      if (chapter === '1948ce') {
        game.date = { y: 1952, m: 9, d: 1 }; game.tags.GER.overlord = null;
        for (const name of ['Joppa', 'Jerusalem', 'Caesarea Maritima']) ctx.helpers.changeOwner(ctx, name, tag);
      } else {
        game.date = { y: -143, m: 9, d: 1 }; ctx.helpers.setRuler(ctx, tag, { name: 'Jonathan Apphus', age: 45 });
        ctx.helpers.changeOwner(ctx, 'Ptolemais', 'SEL');
      }
      if (poor) { game.tags[tag].treasury = 0; game.tags[tag].manpower = 0; }
      const actions = sim.gameActions(ctx); panel.close(); panel.bind(ctx, actions);
      modal.bind(ctx, actions); bus.on('event', p => modal.onBusEvent(p));
      events.fireEvent(ctx, era.events.find(e => e.id === eventId));
      window.turningTest = { game, ctx, panel, modal, events, crises, actions };
    };
    window.deliverMonths = n => {
      const { game, ctx, crises, panel } = window.turningTest;
      for (let k = 0; k < n; k++) {
        if (++game.date.m > 12) { game.date.m = 1; game.date.y++; } game.date.d = 1;
        crises.monthlyPoliticalCrises(ctx);
      }
      panel.refresh();
    };
  });
  await page.evaluate(() => window.loadTurningPoint('167bce', 'ev_tryphon'));
  assert.equal(await page.locator('.ev-opt').count(), 3);
  assert(await page.locator('.ev-stake svg').count() >= 5);
  await page.locator('.ev-history summary').click();
  assert.match(await page.locator('.ev-history').textContent(), /1 Maccabees/);
  await page.locator('.ev-opt[data-idx="1"]').click();
  assert.equal(await page.evaluate(() => window.turningTest.game.flags.historicalCrises.tryphon.escort), 3000);
  assert.equal(await page.evaluate(() => window.turningTest.game.tags.HAS.treasury), 2960);
  await page.evaluate(() => window.loadTurningPoint('167bce', 'ev_tryphon', true));
  assert.equal(await page.locator('.ev-opt').count(), 1);
  await page.locator('.ev-opt[data-idx="2"]').click();
  assert.equal(await page.evaluate(() => window.turningTest.game.flags.historicalCrises.tryphon.status), 'refused');
  console.log('PASS actual invitation, icon stakes, primary-text source, escort reservation and affordable refusal');
  await page.evaluate(() => window.loadTurningPoint('1948ce', 'ev_ab_the_reparations'));
  assert.equal(await page.locator('.ev-opt').count(), 4);
  await page.locator('.ev-history summary').click();
  assert.match(await page.locator('.ev-history').textContent(), /March 1953/);
  assert.match(await page.locator('.ev-history a').getAttribute('href'), /treaties.un.org/);
  await page.locator('.ev-opt[data-idx="0"]').click();
  await page.evaluate(() => {
    const { ctx, game, events, panel } = window.turningTest;
    events.fireEvent(ctx, ctx.events.find(e => e.id === 'ev1952_german_signature')); game.date = { y: 1953, m: 2, d: 1 }; panel.open(null, 'missions');
  });
  assert.equal(await page.locator('.political-investments').count(), 1);
  assert(await page.locator('[data-cs-invest]').isDisabled());
  assert.match(await page.locator('.political-investments').textContent(), /0 goods available/);
  await page.evaluate(() => window.deliverMonths(12));
  assert.match(await page.locator('.political-investments').textContent(), /96 goods available/);
  const site = await page.evaluate(() => String(window.turningTest.ctx.prov('Joppa').id));
  await page.locator('[data-cs-invest-site]').focus();
  await page.locator('[data-cs-invest-site]').selectOption(site);
  assert(await page.locator('[data-cs-invest-site]').evaluate(e => e === document.activeElement));
  await page.locator('[data-cs-invest]').click();
  assert(await page.evaluate(() => window.turningTest.ctx.prov('Joppa').buildings.includes('shipyard')));
  assert.match(await page.locator('.political-investments').textContent(), /1 completed projects/);
  assert(await page.locator('[data-cs-invest]').isDisabled());
  await page.evaluate(() => window.deliverMonths(6));
  await page.locator('[data-cs-compromise]').click();
  assert(await page.evaluate(() => window.turningTest.game.flags.historicalCrises.reparations.compromise));
  assert(await page.locator('[data-cs-compromise]').isDisabled());
  console.log('PASS real signature, persistent goods, selected province shipyard, exact investment costs and domestic compromise');
  await page.evaluate(() => window.turningTest.panel.open('JOR', 'missions'));
  assert(!(await page.locator('[data-ref="chapterStrategyBlock"]').isVisible()));
  await page.evaluate(() => window.turningTest.panel.open(null, 'missions'));
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.locator('#nation-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  assert((await page.locator('.political-investments button').evaluateAll(xs => xs.map(x => x.getBoundingClientRect().height))).every(h => h >= 44));
  if (process.env.JU_OUT) await page.screenshot({ path: process.env.JU_OUT + '/historical-investments-mobile.png' });
  assert.deepEqual(errors, []);
  console.log('PASS foreign court read-only view, mobile layout, touch targets and no browser errors');
  console.log('ALL PASS');
} finally { await browser.close(); }
