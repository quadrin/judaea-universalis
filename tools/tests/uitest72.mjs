// Full flag gallery and actual Court/start-screen consumers, desktop/mobile.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/usr/bin/chromium' });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  const errors = [], foreign = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:') && !r.url().startsWith('data:')) foreign.push(r.url()); });
  await page.route('**/favicon.ico', r => r.fulfill({ status: 204, body: '' }));
  await page.goto((process.env.JU_BASE_URL || 'http://127.0.0.1:8641/') + 'tools/flags.html');
  await page.waitForSelector('article[data-tag="HPA"]');
  assert.equal(await page.locator('article').count(), 210);
  assert.equal(await page.locator('article svg').count(), 840);
  assert.equal(await page.locator('article image,article filter,article linearGradient,article radialGradient,article .fchip-abbr').count(), 0);
  const malformed = await page.locator('article svg').evaluateAll(xs => xs.filter(x => new DOMParser().parseFromString(x.outerHTML, 'image/svg+xml').querySelector('parsererror')).length);
  assert.equal(malformed, 0, 'every flag is valid SVG');
  const invalidBounds = await page.locator('article svg').evaluateAll(xs => xs.filter(x => {
    const b = x.getBoundingClientRect(); return b.width <= 0 || b.height <= 0 || Math.abs(b.width - b.height) > 1;
  }).length);
  assert.equal(invalidBounds, 0);
  const styles = await page.locator('article[data-tag="HPA"] .fchip').first().evaluate(el => {
    const a = getComputedStyle(el), b = getComputedStyle(el.querySelector('svg'));
    return { background: a.backgroundImage, shadow: a.boxShadow, filter: b.filter };
  });
  assert.deepEqual(styles, { background: 'none', shadow: 'none', filter: 'none' });
  await page.locator('#search').fill('Phoenicia'); assert.equal(await page.locator('article').count(), 1);
  assert.equal(await page.locator('article svg').first().getAttribute('data-flag-key'), 'PHO');
  await page.locator('#search').fill('');
  await page.addStyleTag({ content: '.gallery{grid-template-columns:repeat(4,minmax(0,1fr))}article:nth-child(n+17){display:none}article p{display:none}main>p:first-of-type{font-size:13px}article{padding:10px 6px;gap:7px}article h2{min-height:20px}' });
  if (process.env.JU_OUT) await page.screenshot({ path: process.env.JU_OUT + '/flat-court-flags.png', fullPage: true });
  console.log('PASS all 210 courts, valid inline vectors, no textures/shading/remote assets, correct sizes and revival lookup');

  // Same UI and real game actions used by the game, without a WebGL renderer.
  await page.evaluate(async () => {
    const [{ DEFINES }, { MAP_DATA }, { ERAS }, { buildProvinceMapping }, sim, { createNationPanel }, { buildStartScreen }, historical] = await Promise.all([
      import('/js/data/defines.js'), import('/js/data/map_data.js'), import('/js/data/compendium.js'), import('/js/data/map_profile.js'), import('/js/sim/init.js'),
      import('/js/ui/nation_panel.js'), import('/js/ui/startscreen.js'), import('/js/sim/historical_crises.js'),
    ]);
    document.body.innerHTML = '<div id="app"><div id="ui-root"><aside id="nation-panel" class="hidden"></aside><div id="start-screen"></div></div></div>';
    const era = ERAS.find(e => e.bookmark.id === '67bce'), bookmark = era.bookmark;
    const provinceMap = buildProvinceMapping(MAP_DATA, bookmark), geom = { neighbors: [], centroids: [], coastal: [], areas: [] };
    const game = sim.initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag: 'HYR', rngSeed: 72, provinceMap });
    const ctx = sim.makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark, events: [], provinceMap, bus: { emit() {}, on() { return () => {}; } } });
    game.pendingEvents = []; game.wars = []; game.truces = {}; game.battles = [];
    for (const t of Object.values(game.tags)) t.atWarWith = [];
    ctx.helpers.setRuler(ctx, 'HYR', { name: 'Herod', age: 69 }); game.date = { y: -4, m: 4, d: 1 }; game.tags.HYR.overlord = 'ROM';
    for (const name of ['Jerusalem','Jericho','Sepphoris','Caesarea Philippi']) { ctx.helpers.changeOwner(ctx, name, 'HYR'); const p = ctx.prov(name); p.controller = 'HYR'; p.siege = null; }
    const result = historical.chooseHistoricalCrisis(ctx, 'herod', 'divide'); if (!result.ok) throw new Error(result.why);
    // Exercise the saved placeholder identity as well as a freshly divided court.
    game.tags.HPA.flag = 'HER'; game.tags.HPH.flag = 'HER';
    const panel = createNationPanel(document.getElementById('nation-panel'), { DEFINES, onClose() {}, onPeaceClick() {}, onWarClick() {}, onProvinceClick() {} });
    panel.bind(ctx, sim.gameActions(ctx)); panel.open('HPA','state');
    window.flagTest = { panel, ctx };
    const root = document.getElementById('start-screen');
    buildStartScreen(root, DEFINES, [ERAS.find(e => e.bookmark.id === '931bce').bookmark], () => {});
    root.querySelector('.bm-card').click();
    window.flagTest.ironFlags = [...root.querySelectorAll('.nc-shield svg')].map(x => x.dataset.flagKey);
    buildStartScreen(root, DEFINES, [ERAS.find(e => e.bookmark.id === '351ce').bookmark], () => {});
    root.querySelector('.bm-card').click();
    window.flagTest.galileeFlags = [...root.querySelectorAll('.nc-shield svg')].map(x => x.dataset.flagKey);
    root.remove();
  });
  assert.deepEqual(await page.evaluate(() => window.flagTest.ironFlags), ['ISL','JDH']);
  assert((await page.evaluate(() => window.flagTest.galileeFlags)).includes('GAL'));
  assert.equal(await page.locator('[data-ref="flag"] svg').getAttribute('data-flag-key'), 'HPA');
  assert.equal(await page.locator('[data-ref="flag"] .fchip').evaluate(el => el.getBoundingClientRect().width), 34);
  await page.evaluate(() => window.flagTest.panel.open('HPH','state'));
  assert.equal(await page.locator('[data-ref="flag"] svg').getAttribute('data-flag-key'), 'HPH');
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.locator('#nation-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  assert(await page.locator('[data-ref="flag"]').isVisible());
  if (process.env.JU_OUT) await page.screenshot({ path: process.env.JU_OUT + '/tetrarchy-flat-flag-mobile.png' });
  assert.deepEqual(errors, []); assert.deepEqual(foreign, []);
  console.log('PASS actual Herodian partition, saved borrowed flags, enlarged Court flags and mobile layout without browser errors');
  console.log('ALL PASS');
} finally { await browser.close(); }
