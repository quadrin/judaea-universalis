// Real event modal and commands: icon stakes, source disclosure, save rescan,
// filtered choices, mobile scrolling, and relayed multiplayer cards.
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
  await page.setContent('<!doctype html><html><head><base href="/"></head><body><div id="app"><div id="ui-root"><div id="event-modal" class="hidden"></div></div></div></body></html>');
  await page.addStyleTag({ url: '/styles.css' });
  await page.evaluate(async () => {
    const [{ DEFINES }, { MAP_DATA }, { ERAS }, { buildProvinceMapping }, sim, events, { createEventModal }] = await Promise.all([
      import('/js/data/defines.js'), import('/js/data/map_data.js'), import('/js/data/compendium.js'), import('/js/data/map_profile.js'), import('/js/sim/init.js'), import('/js/sim/events.js'), import('/js/ui/modals.js'),
    ]);
    const snap = await fetch('/tools/geom-snapshot.json').then(r => r.json());
    window.loadCrisis = (chapter, eventId, poor = false) => {
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
      for (const t of Object.values(game.tags)) { t.atWarWith = []; t.ai = false; t.treasury = 3000; t.manpower = 10000; }
      for (const p of game.provinces) if (p) { p.controller = p.owner; p.siege = null; }
      if (chapter === '167bce') {
        game.date = { y: -152, m: 6, d: 1 }; ctx.helpers.setRuler(ctx, 'SEL', { name: 'Demetrius I Soter', age: 35 });
        ctx.helpers.changeOwner(ctx, 'Ptolemais', 'SEL'); ctx.helpers.changeOwner(ctx, 'Antioch', 'SEL');
      } else {
        game.date = { y: -4, m: 4, d: 1 }; ctx.helpers.setRuler(ctx, tag, { name: 'Herod', age: 69 });
        for (const name of ['Jerusalem', 'Jericho', 'Sepphoris', 'Caesarea Philippi']) ctx.helpers.changeOwner(ctx, name, tag);
        game.tags[tag].overlord = 'ROM';
      }
      if (poor) { game.tags[tag].treasury = 0; game.tags[tag].manpower = 0; }
      const ev = era.events.find(e => e.id === eventId); events.fireEvent(ctx, ev);
      const modal = createEventModal(document.getElementById('event-modal')), actions = sim.gameActions(ctx);
      // Binding after fire is the actual load/rescan path, rather than a mock card.
      modal.bind(ctx, actions); bus.on('event', p => modal.onBusEvent(p));
      window.crisisTest = { game, ctx, modal, actions, ev };
    };
  });
  await page.evaluate(() => window.loadCrisis('167bce', 'ev_balas_vs_demetrius'));
  assert.equal(await page.locator('.ev-opt').count(), 3);
  assert.equal(await page.locator('.ev-stake svg').count(), 6);
  assert.match(await page.locator('.ev-opt[data-idx="0"]').getAttribute('data-tt'), /100 talents and 1,000 manpower/);
  assert(!(await page.locator('.ev-history').evaluate(e => e.open)));
  await page.locator('.ev-history summary').click();
  assert.match(await page.locator('.ev-history').textContent(), /claimed parentage was disputed/);
  assert.match(await page.locator('.ev-history a').getAttribute('href'), /^https:/);
  assert.equal(await page.locator('.ev-history a').getAttribute('rel'), 'noopener noreferrer');
  await page.locator('.ev-opt[data-idx="0"]').click();
  assert(await page.evaluate(() => !!window.crisisTest.game.tags.BAL));
  assert.equal(await page.evaluate(() => window.crisisTest.game.tags.HAS.treasury), 2900);
  assert(!(await page.locator('#event-modal').isVisible()));
  console.log('PASS actual saved-event rescan, icon stakes, primary-text background and exact real command');
  await page.evaluate(() => window.loadCrisis('167bce', 'ev_balas_vs_demetrius', true));
  assert.equal(await page.locator('.ev-opt[data-idx="0"]').count(), 0);
  assert.equal(await page.locator('.ev-opt').count(), 2);
  await page.locator('.ev-opt[data-idx="2"]').click();
  assert.equal(await page.evaluate(() => window.crisisTest.game.flags.historicalCrises.balas.support), 'neutral');
  assert.equal(await page.evaluate(() => window.crisisTest.game.tags.HAS.treasury), 0);
  console.log('PASS affordability filter preserves original option indices and free neutral course');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.loadCrisis('67bce', 'ev5_herod_dies'));
  assert.equal(await page.locator('.ev-opt').count(), 3);
  assert(await page.locator('.ev-card').evaluate(e => e.scrollWidth <= e.clientWidth + 1));
  assert((await page.locator('.ev-opt').evaluateAll(xs => xs.map(x => x.getBoundingClientRect().height))).every(h => h >= 44));
  await page.locator('.ev-history summary').click();
  assert.match(await page.locator('.ev-history').textContent(), /playable alternative/);
  assert(await page.locator('.ev-card').evaluate(e => e.scrollWidth <= e.clientWidth + 1));
  if (process.env.JU_OUT) await page.screenshot({ path: process.env.JU_OUT + '/historical-succession-mobile.png' });
  await page.locator('.ev-opt[data-idx="0"]').click();
  assert.equal(await page.evaluate(() => window.crisisTest.game.tags.HPA.ruler.name), 'Herod Antipas');
  assert.equal(await page.evaluate(() => window.crisisTest.game.tags.HPH.ruler.name), 'Philip');
  console.log('PASS mobile touch targets, wrapped costs and history, working province partition');
  await page.evaluate(() => {
    const { modal, ev } = window.crisisTest;
    modal.showRemote({ instanceId: 991, mine: true, title: ev.title, desc: ev.desc, historical: ev.historical,
      sources: ev.sources, options: ev.options.map((o, idx) => ({ label: o.label, tooltip: o.tooltip, stakes: o.stakes, idx })) });
  });
  assert.equal(await page.locator('.ev-stake svg').count(), 8);
  assert.equal(await page.locator('.ev-history a').count(), 1);
  assert.equal(await page.locator('.ev-opt[data-idx="2"]').count(), 1);
  await page.setViewportSize({ width: 1440, height: 1000 });
  if (process.env.JU_OUT) await page.screenshot({ path: process.env.JU_OUT + '/historical-succession-desktop.png' });
  assert.deepEqual(errors, []);
  console.log('PASS relayed multiplayer stakes and sources, no browser errors');
  console.log('ALL PASS');
} finally { await browser.close(); }
