// Headless smoke test — v2.4: development growth & develop-with-points,
// subsidies/guarantees/reparations, era place-names + 1948 dev overlay,
// and the new formables (MLI / UAR / ROM).
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { EVENTS_1948 } = await import(R + '/js/data/events_1948.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const eco = await import(R + '/js/sim/economy.js');
const mil = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const makeGeom = () => ({
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [],
});

// ---- 66 CE rig: growth, develop, diplomacy ------------------------------------
const geom = makeGeom();
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66, playerTag: 'JUD', rngSeed: 24 });
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
const actions = gameActions(ctx);
const jud = game.tags.JUD;

console.log('== the towns grow ==');
const jer = ctx.prov('Jerusalem');
jud.atWarWith = []; // peace for the test
jer.autonomy = 0; jer.unrest = 0;
const before = jer.dev.tax + jer.dev.prod + jer.dev.mp;
const realRng = ctx.rng;
ctx.rng = { next: () => 0.001, int: (n) => 0, pick: (a) => a[0], chance: () => true };
eco.yearlyGrowth(ctx);
const after = jer.dev.tax + jer.dev.prod + jer.dev.mp;
ok(after === before + 1, 'Jerusalem grows +1 dev: ' + before + ' → ' + after);
ctx.rng = realRng;

console.log('== deliberate development ==');
const di = actions.getDevelopInfo(ctx.provId('Jerusalem'));
const expectCost = 50 + 5 * (jer.dev.tax + jer.dev.prod + jer.dev.mp);
ok(di.tax.cost === expectCost, 'cost scales with size: ' + di.tax.cost);
jud.points.gov = 999;
const taxBefore = jer.dev.tax;
actions.devProvince(ctx.provId('Jerusalem'), 'tax');
ok(jer.dev.tax === taxBefore + 1, 'develop bought: tax ' + jer.dev.tax);
ok(jud.points.gov === 999 - expectCost, 'points spent: ' + (999 - jud.points.gov));
const foreign = ctx.provId('Antioch');
const diF = actions.getDevelopInfo(foreign);
ok(!diF.tax.can && /Not our province/.test(diF.tax.why), 'foreign land refuses: ' + diF.tax.why);

console.log('== subsidies flow ==');
jud.treasury = 200;
actions.sendSubsidy('PAR');
ok(game.subsidies.length === 1 && game.subsidies[0].to === 'PAR', 'the silver is promised');
const bdJud = eco.incomeBreakdown(ctx, 'JUD');
const bdPar = eco.incomeBreakdown(ctx, 'PAR');
ok(bdJud.subsOut === 10 && bdPar.subsIn === 10, 'both ledgers carry the flow: −10 / +10');
for (let i = 0; i < 12; i++) eco.monthlySubsidies(ctx);
ok(game.subsidies.length === 0, 'twelve months later the subsidy completes');
actions.sendSubsidy('PAR');
actions.cancelSubsidy('PAR');
ok(game.subsidies.length === 0, 'a subsidy can be ended early');

console.log('== a guarantee is honored ==');
jud.points.infl = 200;
actions.guaranteeNation('ARM');
ok((jud.guarantees || []).indexOf('ARM') >= 0, 'our word protects Armenia');
game.truces = {};
const w = mil.declareWar(ctx, 'NAB', 'ARM', 'A Desert Raid');
ok(w && w.defenders.indexOf('JUD') >= 0, 'the guarantor marches: defenders ' + w.defenders.join('+'));
mil.endWarBySword(ctx, w, null);

console.log('== reparations at the peace table ==');
game.truces = {};
const w2 = mil.declareWar(ctx, 'JUD', 'NAB', 'The Test War');
w2._bs = { att: 60, def: 0 };
for (let i = 1; i < game.provinces.length; i++) {
  const p = game.provinces[i];
  if (p && !p.impassable && p.owner === 'NAB') p.controller = 'JUD';
}
mil.updateWarscores(ctx);
const evDeal = mil.evaluatePeaceDeal(ctx, w2, 'JUD', { provinces: [], gold: 0, reparations: true });
ok(evDeal.cost === 15 && evDeal.reparations, 'reparations cost 15 war score');
mil.executePeaceDeal(ctx, w2, 'JUD', { provinces: [], gold: 0, reparations: true });
const rep = game.subsidies.find((s) => s.reparation);
ok(rep && rep.from === 'NAB' && rep.to === 'JUD' && rep.amount === 8, 'the defeated pay: ' + JSON.stringify(rep));

console.log('== the new crowns are offered ==');
jud.atWarWith = [];
const decs = actions.getDecisions();
const mli = decs.find((d) => d.key === 'form_mli_jud');
ok(!!mli, 'Proclaim the Kingdom of Israel appears for Judaea');
ok(!mli.canEnact, 'and is properly gated: ' + mli.whyNot);

// ---- 1948 rig: era names, dev overlay, UAR ------------------------------------
console.log('== the map speaks 1948 ==');
const geom2 = makeGeom();
const g48 = initGame({ DEFINES, MAP_DATA, geom: geom2, bookmark: BOOKMARK_1948, events: EVENTS_1948, playerTag: 'JOR', rngSeed: 25 });
const ctx48 = makeCtx({ game: g48, DEFINES, MAP_DATA, geom: geom2, bus, bookmark: BOOKMARK_1948, events: EVENTS_1948 });
const actions48 = gameActions(ctx48);
const telAviv = ctx48.prov('Joppa'); // the canonical key still answers
ok(!!telAviv && telAviv.name === 'Tel Aviv-Jaffa', 'Joppa wears its 1948 name: ' + telAviv.name);
ok(ctx48.prov('Tel Aviv-Jaffa') === telAviv, 'the era name answers too');
ok(telAviv.dev.tax === 12, 'Tel Aviv is a modern city: tax dev ' + telAviv.dev.tax);
const cairo = ctx48.prov('Memphis');
ok(cairo.name === 'Cairo' && cairo.dev.tax === 14, 'Cairo dwarfs Memphis: ' + cairo.name + ' ' + cairo.dev.tax);
ok(ctx48.prov('Damascus').name === 'Damascus', 'unchanged names stay themselves');

console.log('== the united Arab crown ==');
const decs48 = actions48.getDecisions();
const uar = decs48.find((d) => d.key === 'form_uar_jor');
ok(!!uar && !uar.canEnact, 'the UAR is offered to the Legion, gated: ' + !!uar);
// sweep: JOR takes everything Israeli but a rump
for (let i = 1; i < g48.provinces.length; i++) {
  const p = g48.provinces[i];
  if (!p || p.impassable) continue;
  if (p.owner === 'ISR' && p.canon !== 'Masada' && p.canon !== 'Engaddi') { p.owner = 'JOR'; p.controller = 'JOR'; }
  if (p.owner === 'JOR') p.controller = 'JOR';
}
const uar2 = actions48.getDecisions().find((d) => d.key === 'form_uar_jor');
ok(uar2.canEnact, 'crushing Israel unlocks it');
actions48.enactDecision('form_uar_jor');
ok(!g48.tags.JOR && !!g48.tags.UAR && g48.playerTag === 'UAR', 'Transjordan proclaims the UAR');
ok(g48.tags.UAR.name === 'United Arab Republic', 'the new name: ' + g48.tags.UAR.name);

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
