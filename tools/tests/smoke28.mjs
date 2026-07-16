// Headless regression — settlement projects (SPEC §43). A settleable province
// climbs one habitation tier over months, spends influence, unlocks development
// on newly claimed land, and refuses cities, foreign land, and impassable waste.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const {
  settlementInfo, settlementCost, monthlySettlement, habLevel, developInfo,
} = await import(R + '/js/sim/economy.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const fakeGeom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
const idOf = (name) => MAP_DATA.provinces.findIndex((p) => p.name === name) + 1;
const modernMap = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);

// Egypt holds the frontier land of the Negev and Gaza in 1948, so it is the
// natural side for exercising settlement of real frontier provinces.
function freshGame(tag) {
  return initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_1948, events: [],
    playerTag: tag, rngSeed: 1948, provinceMap: modernMap,
  });
}
function freshCtx(game) {
  return makeCtx({
    game, DEFINES, MAP_DATA, geom: fakeGeom, bus,
    bookmark: BOOKMARK_1948, events: [], provinceMap: modernMap,
  });
}

console.log('== cost & eligibility ==');
const g = freshGame('EGY');
const ctx = freshCtx(g);
const actions = gameActions(ctx);
const kgId = idOf('Kiryat Gat'); // frontier Egyptian-held land in the Negev
const kg = g.provinces[kgId];
ok(kg.habitation === 'frontier' && kg.owner === 'EGY', 'Kiryat Gat begins as Egyptian frontier land');
g.tags.EGY.points.infl = 500; // fund the treasury of soft power
const info0 = settlementInfo(ctx, 'EGY', kgId);
ok(info0.can && info0.toTier === 'rural' && info0.cost === settlementCost(ctx, 2),
  'a frontier province can be settled up to rural at the tier-2 price');
ok(settlementCost(ctx, 2) === DEFINES.SETTLEMENT.baseCost + DEFINES.SETTLEMENT.perTier * 2,
  'settlement cost follows the SETTLEMENT define');

console.log('== a project runs and completes ==');
const beforeInfl = g.tags.EGY.points.infl;
actions.settleProvince(kgId);
ok(kg.settlement && kg.settlement.monthsLeft === DEFINES.SETTLEMENT.months,
  'settleProvince opens a project for the configured duration');
ok(g.tags.EGY.points.infl === beforeInfl - info0.cost, 'starting a project spends the influence cost');
ok(!settlementInfo(ctx, 'EGY', kgId).can, 'a second project cannot start while one runs');
const devBefore = kg.dev.tax + kg.dev.prod + kg.dev.mp;
for (let m = 0; m < DEFINES.SETTLEMENT.months - 1; m++) monthlySettlement(ctx);
ok(kg.settlement && kg.habitation === 'frontier', 'the tier does not rise until the project finishes');
monthlySettlement(ctx); // final month
ok(!kg.settlement && kg.habitation === 'rural', 'the completed project raises the habitation one tier');
const devAfter = kg.dev.tax + kg.dev.prod + kg.dev.mp;
ok(devAfter === devBefore + DEFINES.SETTLEMENT.devReward.tax + DEFINES.SETTLEMENT.devReward.prod,
  'completion grants the configured development reward');

console.log('== empty land becomes developable ==');
const rafahId = idOf('Rafah');
const rafah = g.provinces[rafahId];
rafah.habitation = 'uninhabited'; rafah.dev = { tax: 0, prod: 0, mp: 0 };
ok(!developInfo(ctx, 'EGY', rafahId, 'tax').can, 'uninhabited land cannot be developed directly');
g.tags.EGY.points.infl = 500;
actions.settleProvince(rafahId);
for (let m = 0; m < DEFINES.SETTLEMENT.months; m++) monthlySettlement(ctx);
ok(rafah.habitation === 'frontier', 'settling claims the empty land as frontier');
g.tags.EGY.points.gov = 999; g.tags.EGY.points.infl = 999; g.tags.EGY.points.mar = 999;
ok(developInfo(ctx, 'EGY', rafahId, 'tax').can, 'once settled, the land can be developed');

console.log('== the cap, foreign land, and waste ==');
const cairo = g.provinces[idOf('Memphis')]; // Cairo — an urban metropolis
ok(habLevel(ctx, cairo) === 4, 'Cairo reads as urban');
ok(!settlementInfo(ctx, 'EGY', idOf('Memphis')).can, 'a city cannot be founded higher — prosperity earns urban');
ok(!settlementInfo(ctx, 'EGY', idOf('Netanya')).can
    && /our province/i.test(settlementInfo(ctx, 'EGY', idOf('Netanya')).why),
  'foreign (Israeli) land is refused');
// v4.3 opened the 1948 deserts, so no live cell is impassable in this era;
// flip one synthetically to prove the gate still holds.
const pelusium = g.provinces[idOf('Pelusium')];
pelusium.impassable = true;
ok(!settlementInfo(ctx, 'EGY', idOf('Pelusium')).can
    && /impassable/i.test(settlementInfo(ctx, 'EGY', idOf('Pelusium')).why),
  'impassable land is refused');
pelusium.impassable = false;
// A defensively-handled unsettleable cell (no such content ships today).
const synthetic = g.provinces[idOf('Khan Yunis')];
synthetic.settleable = false;
ok(!settlementInfo(ctx, 'EGY', idOf('Khan Yunis')).can
    && /permanent settlement/i.test(settlementInfo(ctx, 'EGY', idOf('Khan Yunis')).why),
  'land flagged unsettleable is refused');

console.log('== occupation voids a project, revival keeps the field ==');
const g2 = freshGame('EGY');
const ctx2 = freshCtx(g2);
const actions2 = gameActions(ctx2);
g2.tags.EGY.points.infl = 500;
const negev = g2.provinces[idOf('Kiryat Gat')];
actions2.settleProvince(idOf('Kiryat Gat'));
ok(negev.settlement, 'a project is under way before occupation');
negev.controller = 'ISR'; // the enemy overruns the district
monthlySettlement(ctx2);
ok(!negev.settlement && negev.habitation === 'frontier', 'occupation voids the settlers and their gains');

const save = JSON.parse(JSON.stringify(g2));
for (const p of save.provinces) { if (p) delete p.settlement; } // pre-settlement schema
const revived = reviveGame(save);
ok(revived && revived.provinces[idOf('Kiryat Gat')].settlement === null,
  'a pre-settlement save revives with a null settlement field');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
