// Court intelligence and offers: real panel, keyboard dispatch, stale terms, mobile.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/usr/bin/chromium' });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto((process.env.JU_BASE_URL || 'http://127.0.0.1:8613/') + 'icons/');
  await page.setContent('<!doctype html><html><head><base href="/"></head><body><div id="app"><div id="ui-root"><aside id="nation-panel" class="hidden"></aside></div></div></body></html>');
  await page.addStyleTag({ url: '/styles.css' });
  await page.evaluate(async () => {
    const [{ DEFINES }, { MAP_DATA }, { ERAS }, { buildProvinceMapping }, sim, { createNationPanel }] = await Promise.all([
      import('/js/data/defines.js'), import('/js/data/map_data.js'), import('/js/data/compendium.js'), import('/js/data/map_profile.js'),
      import('/js/sim/init.js'), import('/js/ui/nation_panel.js'),
    ]);
    const snap = await fetch('/tools/geom-snapshot.json').then(r => r.json());
    const bookmark = ERAS.find(e => e.bookmark.id === '167bce').bookmark;
    const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
    const geom = { neighbors: snap.neighbors.map(n => new Set(n)), coastal: snap.coastal.map(Boolean),
      centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null), areas: Int32Array.from(snap.areas), bbox: [] };
    const game = sim.initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag: 'HAS', rngSeed: 7, provinceMap });
    const ctx = sim.makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark, events: [], provinceMap, bus: { emit() {}, on() { return () => {}; } } });
    const actions = sim.gameActions(ctx);
    // Controlled terms exercise the view's boundary; offer legality is covered by court-diplomacy.mjs.
    const offers = [{ id: 'envoy-1', from: 'SEL', to: 'HAS', title: 'Access <proposal>', description: 'Pay 50 influence; gain a guarantee.', canAccept: true },
      { id: 'envoy-2', from: 'SEL', to: 'HAS', title: 'Changed terms', description: 'A second proposal.', canAccept: true }];
    const calls = [];
    const realActions = { getCourtOffers: actions.getCourtOffers, getCourtIntentions: actions.getCourtIntentions, resolveCourtOffer: actions.resolveCourtOffer };
    actions.getCourtOffers = () => offers;
    actions.getCourtIntentions = () => ({ visible: true, summary: 'Seeking a protector <not markup>', attitude: { kind: 'Wary', reasons: ['Disputed frontier'] }, goals: [{ label: 'Secure a guarantee', detail: 'Seeking partners.' }] });
    actions.resolveCourtOffer = (id, accept) => {
      calls.push({ id, accept });
      if (id === 'envoy-2' && accept) return { ok: false, why: 'Their treasury no longer supports these terms.' };
      offers.splice(offers.findIndex(o => o.id === id), 1); return { ok: true };
    };
    const panel = createNationPanel(document.getElementById('nation-panel'), { DEFINES });
    panel.bind(ctx, actions); panel.open('SEL', 'world');
    window.courtUiTest = { panel, ctx, offers, calls, actions, realActions };
  });
  assert.match(await page.locator('[data-ref="courtIntentions"]').textContent(), /Seeking a protector <not markup>/);
  assert.equal(await page.locator('[data-ref="courtIntentions"] not').count(), 0);
  assert.equal(await page.locator('[data-court-offer-card]').count(), 2);
  assert.equal(await page.locator('[data-tab-go="world"] .np-tab-badge').textContent(), '2');
  const accept = page.locator('[data-court-offer="envoy-1"][data-court-accept="true"]');
  await accept.focus(); await page.keyboard.press('Enter');
  assert.deepEqual(await page.evaluate(() => window.courtUiTest.calls), [{ id: 'envoy-1', accept: true }]);
  assert.equal(await page.locator('[data-court-offer-card]').count(), 1);
  await page.locator('[data-court-offer="envoy-2"][data-court-accept="true"]').click();
  assert.match(await page.locator('[data-ref="courtOfferFeedback"]').textContent(), /treasury no longer/);
  assert.equal(await page.locator('[data-court-offer-card]').count(), 1);
  console.log('PASS escaped foreign intelligence, actionable offers, keyboard response, badge and stale-term feedback');
  await page.evaluate(() => window.courtUiTest.panel.open(null, 'world'));
  assert(await page.locator('[data-ref="courtIntentionsBlock"]').evaluate(el => el.classList.contains('hidden')));
  await page.setViewportSize({ width: 390, height: 844 });
  const decline = page.locator('[data-court-offer="envoy-2"][data-court-accept="false"]');
  await decline.scrollIntoViewIfNeeded();
  assert((await decline.boundingBox()).height >= 44);
  assert(await page.locator('#nation-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  await decline.click();
  assert.match(await page.locator('[data-ref="courtOffers"]').textContent(), /No diplomatic offers/);
  assert.equal(await page.locator('[data-tab-go="world"] .np-tab-badge').count(), 0);
  await page.evaluate(() => {
    const test = window.courtUiTest;
    test.actions.getCourtIntentions = () => ({ visible: false, summary: 'Establish contact to learn this court’s intentions.', goals: [{ label: 'Hidden invasion target' }], preparation: { reserve: 123456 } });
    test.offers.push({ id: 'blocked', from: 'SEL', to: 'HAS', title: 'Protection requested', description: 'Requires 50 influence.', canAccept: false, why: 'You need 50 influence.' });
    test.panel.open('SEL', 'world');
  });
  assert.match(await page.locator('[data-ref="courtIntentions"]').textContent(), /Establish contact/);
  assert.doesNotMatch(await page.locator('[data-ref="courtIntentions"]').textContent(), /Hidden invasion|123456/);
  assert(await page.locator('[data-court-offer="blocked"][data-court-accept="true"]').isDisabled());
  assert(!(await page.locator('[data-court-offer="blocked"][data-court-accept="false"]').isDisabled()));
  assert.match(await page.locator('[data-ref="courtOffers"]').textContent(), /You need 50 influence/);
  // Exercise the real planner, saved offer ledger, and gameActions through the same panel.
  await page.evaluate(async () => {
    const { monthlyCourtPlans } = await import('/js/sim/court_plans.js');
    const test = window.courtUiTest, { ctx, actions, realActions } = test, game = ctx.game;
    Object.assign(actions, realActions);
    const from = game.tags.PTO, to = game.tags.HAS;
    from.ai = true; from.alive = true; from.overlord = null; to.overlord = null;
    from.atWarWith = (from.atWarWith || []).filter(k => k !== 'HAS');
    to.atWarWith = (to.atWarWith || []).filter(k => k !== 'PTO');
    from.allies = [...new Set([...(from.allies || []), 'HAS'])];
    to.allies = [...new Set([...(to.allies || []), 'PTO'])];
    from.treasury = 100;
    monthlyCourtPlans(ctx);
    const now = (game.date.y > 0 ? game.date.y - 1 : game.date.y) * 12 + game.date.m - 1;
    game.courtDiplomacy = { nextId: 2, cooldowns: {}, history: [], offers: [{ id: 'real-gift', from: 'PTO', to: 'HAS', kind: 'reconciliation', cost: 25, status: 'pending', expires: now + 6, created: now }] };
    test.realBefore = { treasury: to.treasury, proposer: from.treasury };
    test.panel.open('PTO', 'world');
    test.realIntentions = actions.getCourtIntentions('PTO');
  });
  const realIntentions = await page.evaluate(() => window.courtUiTest.realIntentions);
  assert.equal(realIntentions.visible, true);
  assert(realIntentions.goals.length > 0, 'real planner selected a persistent goal');
  assert.match(await page.locator('[data-ref="courtIntentions"]').textContent(), new RegExp(realIntentions.goals[0].label));
  assert.doesNotMatch(await page.locator('[data-ref="courtIntentions"]').textContent(), /undefined|\[object Object\]/);
  assert.match(await page.locator('[data-ref="courtOffers"]').textContent(), /25 talents|6 more months/);
  assert(!(await page.locator('[data-court-offer="real-gift"][data-court-accept="true"]').isDisabled()));
  await page.locator('[data-court-offer="real-gift"][data-court-accept="true"]').click();
  const result = await page.evaluate(() => {
    const { ctx, realBefore, actions } = window.courtUiTest;
    return { gain: ctx.game.tags.HAS.treasury - realBefore.treasury, cost: realBefore.proposer - ctx.game.tags.PTO.treasury,
      offers: actions.getCourtOffers().length, status: ctx.game.courtDiplomacy.offers[0].status };
  });
  assert.deepEqual(result, { gain: 25, cost: 25, offers: 0, status: 'accepted' });
  assert.match(await page.locator('[data-ref="courtOfferFeedback"]').textContent(), /Offer accepted/);
  console.log('PASS real court planner intentions and real diplomatic offer accepted through gameActions UI with conserved payment');
  assert.deepEqual(errors, []);
  console.log('PASS own-court inbox, mobile layout, accessible touch controls and empty state');
  console.log('uitest-court-intentions: ALL PASS');
} finally { await browser.close(); }
