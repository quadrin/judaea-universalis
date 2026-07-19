// Headless regression — v6.6 (SPEC §64): settlement plants the settler's
// people, and the unclaimed waste can be occupied, planted, and annexed.
//  1. A completed settlement project makes the settler nation's community the
//     province's leading (and naming) community — settled land changes culture.
//  2. Wasteland nobody owns, on your border, takes an expedition of soldiers
//     from an adjacent army; a settlement project plants the frontier; then
//     annexation makes it an owned, passable province of the realm.
//  3. Camps live off the border that supplies them, sealed frontiers refuse
//     every column, and a rival cannot camp where another power already sits.
import { readFileSync } from 'node:fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const {
  settlementInfo, settlementStart, monthlySettlement,
  expeditionInfo, expeditionStart, monthlyExpeditions, annexInfo, annexCore,
} = await import(R + '/js/sim/economy.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const idOf = (name) => MAP_DATA.provinces.findIndex((p) => p.name === name) + 1;
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, (_, i) => new Set(snap.neighbors[i] || [])),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: snap.coastal || [], offshore: [],
};
const bus = { emit() {}, on() { return () => {}; } };

const modernMap = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);
const g = initGame({
  DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_1948, events: [],
  playerTag: 'UK', rngSeed: 41, provinceMap: modernMap,
});
const ctx = makeCtx({
  game: g, DEFINES, MAP_DATA, geom, bus,
  bookmark: BOOKMARK_1948, events: [], provinceMap: modernMap,
});
const prov = (name) => g.provinces[idOf(name)];
const runSettlementMonths = (n) => { for (let i = 0; i < n; i++) monthlySettlement(ctx); };

console.log('== settlement plants the settler\'s people ==');
{
  const p = prov('Kiryat Gat');
  ok(p.religion === 'islam' && p.culture === 'arab_modern' && p.habitation === 'frontier',
    'Kiryat Gat starts as Arab frontier land');
  p.owner = 'ISR'; p.controller = 'ISR'; // Yoav has come and gone
  g.tags.ISR.points.infl = 300;
  const res = settlementStart(ctx, 'ISR', idOf('Kiryat Gat'));
  ok(res.ok, 'the conquered frontier takes an Israeli settlement project');
  runSettlementMonths(7);
  ok(p.habitation === 'rural', 'the project raises the tier: frontier -> rural');
  ok(p.religion === 'judaism' && p.culture === 'israeli',
    'the settled land now speaks the settler\'s tongue: religion/culture flip to the settler nation');
  ok(Array.isArray(p.pop) && p.pop.length && p.pop[0].r === 'judaism' && p.pop[0].c === 'israeli',
    'the settlers are a real community leading the makeup, not repainted locals');
}

console.log('== the unclaimed waste: occupy, plant, annex ==');
const sahara = prov('Sahara');
const saharaId = idOf('Sahara');
{
  ok(sahara.owner === 'WASTE' && sahara.impassable && sahara.settleable !== false,
    'the Sahara is unclaimed, impassable waste in 1948');
  let info = expeditionInfo(ctx, 'UK', saharaId);
  ok(info.show && !info.can && /army/i.test(info.why),
    'Britain borders the waste (Tripolitania) but has no column beside it: ' + info.why);
  const armyId = ctx.helpers.spawnArmy(ctx, 'UK', 'Macomades', { inf: 2, name: 'Desert Column' });
  const army = g.armies[armyId];
  g.tags.UK.treasury = 200;
  info = expeditionInfo(ctx, 'UK', saharaId);
  ok(info.show && info.can, 'an army of 2,000 beside the border makes the expedition possible');

  // The camp folds without a supplying border.
  const started = expeditionStart(ctx, 'UK', saharaId);
  ok(started.ok && sahara.expedition && sahara.expedition.by === 'UK' && sahara.controller === 'UK',
    'the expedition marches: 1,000 men camp in the waste under our flag');
  ok(army.men === 1000 && g.tags.UK.treasury === 150,
    'the column and its supplies are paid for: army 2,000 -> 1,000 men, treasury -50');
  const rival = expeditionInfo(ctx, 'EGY', saharaId);
  ok(rival.show && !rival.can && /another power/i.test(rival.why),
    'a rival cannot camp where our expedition sits');
  const flipped = [];
  for (const nb of geom.neighbors[saharaId]) {
    const q = g.provinces[nb];
    if (q && q.controller === 'UK') { flipped.push([q, q.controller]); q.controller = 'ITA'; }
  }
  monthlyExpeditions(ctx);
  ok(!sahara.expedition && sahara.controller === 'WASTE',
    'cut off from every friendly border, the camp folds its tents');
  for (const [q, was] of flipped) q.controller = was;

  // The full flow: occupy again (the column reinforced meanwhile), plant, annex.
  army.men = 2000;
  expeditionStart(ctx, 'UK', saharaId);
  let annex = annexInfo(ctx, 'UK', saharaId);
  ok(annex.show && !annex.can && /settle/i.test(annex.why),
    'annexation waits on the plough: ' + annex.why);
  g.tags.UK.points.infl = 300;
  const sres = settlementStart(ctx, 'UK', saharaId);
  ok(sres.ok && sahara.settlement, 'the camp takes a settlement project though the waste is unowned');
  monthlyExpeditions(ctx);
  ok(!!sahara.expedition, 'the supplied camp stands through the monthly check');
  runSettlementMonths(7);
  ok(sahara.habitation === 'frontier', 'the settlement plants a frontier in the waste');
  ok(sahara.religion === 'christianity',
    'the planted waste is peopled by the settlers (Feature 1 reaches the camp)');
  g.tags.UK.points.gov = 100;
  annex = annexInfo(ctx, 'UK', saharaId);
  ok(annex.show && annex.can, 'with the frontier planted, annexation is on the table');
  const ares = annexCore(ctx, 'UK', saharaId);
  ok(ares.ok && sahara.owner === 'UK' && sahara.controller === 'UK' && !sahara.impassable,
    'the annexed waste is ours: owned, passable, and on the map in our color');
  ok(g.tags.UK.points.gov === 50, 'annexation costs its governance ink');
  ok(expeditionInfo(ctx, 'UK', saharaId).show === false,
    'owned land is no longer "unclaimed waste" — the control retires itself');
}

console.log('== sealed frontiers refuse every column ==');
{
  const phasis = prov('Phasis');
  ok(phasis.owner === 'WASTE' && phasis.impassable && phasis.settleable === false,
    'the Soviet Caucasus is sealed in 1948: closed, not colonizable');
  const info = expeditionInfo(ctx, 'UK', idOf('Phasis'));
  ok(!info.show && !info.can, 'no expedition control appears on a sealed border');
  const alb = prov('Dyrrhachium');
  ok(alb.settleable === false && !expeditionInfo(ctx, 'UK', idOf('Dyrrhachium')).show,
    'Hoxha\'s Albania is likewise sealed against the mechanic');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
