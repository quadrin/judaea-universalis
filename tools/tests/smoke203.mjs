// Headless regression — SPEC §293: the walls and the fleet cost money, and
// both can be put away.
//
//   1. The ledger: every fort level costs 0.3 a month (Fortresses), every
//      ship 0.5 (Naval maintenance), both in the month's balance and in
//      t.expenses; the treasury moves by the balance and nothing else (the
//      navy's upkeep is no longer taken out of sight).
//   2. A mothballed fort costs nothing, does not hold (a siege takes it like
//      an open town), and its garrison goes home; manned again it costs its
//      upkeep and the garrison grows back month by month. Not under siege,
//      not someone else's.
//   3. A squadron laid up in ordinary costs a quarter, cannot sail, carry
//      troops or take a trade mission, fights at half strength, and is lost
//      if its harbor falls; recommissioned it signs on crews for 30 days.
//      Only in a harbor of ours, with nobody aboard.
//   4. The AI: at peace an interior fort is mothballed (the capital's
//      excepted), a border fort kept; in the red, the border forts too and
//      the idle squadrons laid up; at war everything is manned and
//      recommissioned; back in surplus the squadrons are recommissioned.
//   5. A save keeps it.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions, reviveGame, simHelpers } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');
const navy = await import(R + '/js/sim/navy.js');
const trade = await import(R + '/js/sim/trade.js');
const { aiUpkeep } = await import(R + '/js/sim/ai.js');
const { incomeBreakdown, explainIncome, runMonthlyEconomy, hoardBleed } = await import(R + '/js/sim/economy.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};
const num = (v) => Number(v) || 0;
const near = (a, b, eps = 0.011) => Math.abs(a - b) <= eps;

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
function geomFor(provinceMap) {
  const N = snap.neighbors.length - 1;
  const to = (id) => (provinceMap && provinceMap[id]) || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  const coastal = new Array(N + 1).fill(false);
  for (let id = 1; id <= N; id++) {
    const t = to(id);
    if (snap.coastal[id]) coastal[t] = true;
    for (const nb of snap.neighbors[id]) {
      const tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  return {
    neighbors, coastal,
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas), bbox: [],
  };
}
function boot({ peace = false } = {}) {
  const e = ERAS.find((x) => x.bookmark.id === '66ce');
  const provinceMap = buildProvinceMapping(MAP_DATA, e.bookmark);
  const geom = geomFor(provinceMap);
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: e.bookmark, events: [], playerTag: 'JUD', rngSeed: 293, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: e.bookmark, events: [], provinceMap });
  if (peace) {
    game.wars = [];
    game.truces = {};
    for (const k of Object.keys(game.tags)) if (game.tags[k]) game.tags[k].atWarWith = [];
  }
  return { game, ctx, actions: gameActions(ctx) };
}
const row = (rows, label) => (rows.find((r) => r.label === label) || {}).value;
const levels = (game, tag) => game.provinces.reduce((s, p) => s + (p && p.owner === tag && p.controller === tag && !p.mothballed ? p.fort | 0 : 0), 0);

console.log('== 1. the ledger ==');
{
  const { game, ctx } = boot();
  const lv = levels(game, 'JUD');
  const rows = explainIncome(ctx, 'JUD');
  ok(lv > 0 && near(row(rows, 'Fortresses'), -lv * 0.3), 'Judaea\'s ' + lv + ' fort levels cost ' + row(rows, 'Fortresses') + ' a month');
  const ships = Object.values(game.fleets).filter((f) => f && f.tag === 'ROM').reduce((s, f) => s + f.ships, 0);
  ok(ships > 0 && near(row(explainIncome(ctx, 'ROM'), 'Naval maintenance'), -ships * 0.5), 'Rome\'s ' + ships + ' ships cost ' + row(explainIncome(ctx, 'ROM'), 'Naval maintenance'));
  const bd = incomeBreakdown(ctx, 'ROM');
  const before = num(game.tags.ROM.treasury);
  const bleed = hoardBleed(ctx, 'ROM', bd);
  runMonthlyEconomy(ctx);
  navy.monthlyNavy(ctx);
  ok(near(num(game.tags.ROM.treasury) - before, bd.net - bleed, 0.05), 'the treasury moves by the month\'s balance, the fleet included: ' + (num(game.tags.ROM.treasury) - before).toFixed(2));
  ok(num(game.tags.ROM.expenses) >= bd.maint + bd.navy + bd.forts - 0.01, 'and the fleet and the walls are in the expenses the AI and the crisis read');
}

console.log('== 2. mothballing a fort ==');
{
  const { game, ctx, actions } = boot();
  const p = ctx.prov('Machaerus');
  const lv = p.fort | 0;
  const f0 = row(explainIncome(ctx, 'JUD'), 'Fortresses');
  const info = actions.getFortInfo(p.id);
  ok(info && info.can && near(info.upkeep, lv * 0.3), 'Machaerus (fort ' + lv + ') can be mothballed, saving ' + (info && info.upkeep));
  ok(actions.mothballFort(p.id, true) && p.mothballed, 'it is mothballed');
  ok(near(row(explainIncome(ctx, 'JUD'), 'Fortresses'), f0 + lv * 0.3), 'and costs nothing: ' + f0 + ' → ' + row(explainIncome(ctx, 'JUD'), 'Fortresses'));
  ok(mil.effectiveFort(p) === 0 && (p.fort | 0) === lv, 'its walls do not hold, and are still there');
  const g0 = p.garrison;
  mil.monthlyGarrisons(ctx);
  ok(p.garrison < g0 * 0.7, 'the garrison goes home: ' + g0 + ' → ' + p.garrison);
  for (let k = 0; k < 12; k++) mil.monthlyGarrisons(ctx);
  ok(p.garrison === 0, 'until nobody is left');
  // a siege takes it like an open town
  p.controller = 'JUD';
  mil.declareWar(ctx, 'NAB', 'JUD', 'Test War');
  const aid = simHelpers.spawnArmy(ctx, 'NAB', 'Machaerus', { inf: 3, name: 'Test besiegers' });
  for (const a of Object.values(game.armies)) if (a && a.tag === 'JUD' && a.prov === p.id) delete game.armies[a.id];
  mil.ensureSiege(ctx, p, 'NAB');
  ok(!!p.siege, 'three regiments invest it');
  ok(!actions.getFortInfo(p.id).can, 'nobody mans or mothballs a fort under siege: ' + actions.getFortInfo(p.id).why);
  let days = 0;
  for (; days < 30 && p.controller === 'JUD'; days++) mil.tickSieges(ctx);
  ok(p.controller === 'NAB' && days <= 11, 'and it falls in ' + days + ' days, like an open town');
  ok(!actions.getFortInfo(p.id).can, 'what the enemy holds is not ours to man: ' + actions.getFortInfo(p.id).why);
  delete game.armies[aid];
}
{
  const { ctx, actions } = boot();
  const p = ctx.prov('Machaerus');
  actions.mothballFort(p.id, true);
  for (let k = 0; k < 12; k++) mil.monthlyGarrisons(ctx);
  ok(actions.mothballFort(p.id, false) && !p.mothballed && mil.effectiveFort(p) === (p.fort | 0), 'manned again, its walls hold');
  mil.monthlyGarrisons(ctx);
  ok(p.garrison > 0 && p.garrison < p.maxGarrison * 0.2, 'and the garrison grows back slowly: ' + p.garrison + ' of ' + p.maxGarrison);
  ok(!actions.mothballFort(ctx.prov('Antioch').id, true), 'Rome\'s fort is not ours to mothball');
}

console.log('== 3. a squadron laid up in ordinary ==');
{
  const { game, ctx, actions } = boot({ peace: true });
  const joppa = ctx.prov('Joppa');
  joppa.owner = 'JUD'; joppa.controller = 'JUD';
  const f = simHelpers.spawnFleet(ctx, 'JUD', 'Joppa', 4, { name: 'Test squadron' });
  const n0 = row(explainIncome(ctx, 'JUD'), 'Naval maintenance');
  ok(near(n0, -2), 'four ships cost 2 a month');
  const row0 = actions.getNavy().fleets.find((x) => x.id === f.id);
  ok(row0.canLayUp && near(row0.layUpSave, 1.5), 'it can be laid up, saving ' + row0.layUpSave);
  ok(actions.layUpFleet(f.id, true) && f.laidUp, 'it is laid up');
  ok(near(row(explainIncome(ctx, 'JUD'), 'Naval maintenance'), -0.5), 'a quarter of the upkeep: ' + row(explainIncome(ctx, 'JUD'), 'Naval maintenance'));
  ok(!navy.issueFleetMove(ctx, f, ctx.prov('Caesarea Maritima').id) && !(f.path && f.path.length), 'it cannot sail');
  const army = simHelpers.spawnArmy(ctx, 'JUD', 'Joppa', { inf: 1, name: 'Test marines' });
  ok(!navy.embarkCore(ctx, f, army).ok, 'nor take troops aboard');
  ok(!trade.setFleetMissionCore(ctx, 'JUD', f.id, 'protect', 'judaea').ok, 'nor guard the lanes');
  const full = navy.fleetPowerOf(ctx, { ...f, laidUp: false });
  ok(near(navy.fleetPowerOf(ctx, f), full * 0.5, 1e-9), 'it fights at half strength if found');
  ok(actions.layUpFleet(f.id, false) && !f.laidUp && f.recommission === 30, 'recommissioned, it signs on crews for 30 days');
  ok(near(row(explainIncome(ctx, 'JUD'), 'Naval maintenance'), -2), 'at the full upkeep');
  ok(!navy.issueFleetMove(ctx, f, ctx.prov('Caesarea Maritima').id), 'and cannot sail yet');
  for (let d = 0; d < 30; d++) navy.fleetsDaily(ctx);
  ok(!f.recommission && navy.issueFleetMove(ctx, f, ctx.prov('Caesarea Maritima').id), 'a month on, it sails');
}
{
  const { game, ctx, actions } = boot({ peace: true });
  const joppa = ctx.prov('Joppa');
  joppa.owner = 'JUD'; joppa.controller = 'JUD';
  const f = simHelpers.spawnFleet(ctx, 'JUD', 'Joppa', 3, { name: 'Test squadron' });
  const a = simHelpers.spawnArmy(ctx, 'JUD', 'Joppa', { inf: 1, name: 'Test marines' });
  navy.embarkCore(ctx, f, a);
  ok(!actions.layUpFleet(f.id, true) && !f.laidUp, 'not with troops aboard');
  navy.disembarkCore(ctx, f);
  const r = simHelpers.spawnFleet(ctx, 'JUD', 'Alexandria', 2, { name: 'Abroad' });
  ok(!actions.layUpFleet(r.id, true), 'not in a harbor that is not ours');
  ok(actions.layUpFleet(f.id, true), 'laid up at Joppa');
  joppa.controller = 'ROM';
  navy.fleetsDaily(ctx);
  ok(!game.fleets[f.id], 'Joppa falls, and the squadron with it');
}

console.log('== 4. the AI ==');
{
  const { game, ctx } = boot({ peace: true });
  const t = game.tags.ROM;
  t.income = 170; t.expenses = 60; t.treasury = 900;
  const cap = mil.capitalProvince(ctx, 'ROM');
  aiUpkeep(ctx, 'ROM', false);
  const rf = game.provinces.filter((p) => p && p.owner === 'ROM' && (p.fort | 0) > 0);
  const mb = rf.filter((p) => p.mothballed).map((p) => p.name);
  const kept = rf.filter((p) => !p.mothballed).map((p) => p.name);
  ok(mb.length > 0 && !cap.mothballed, 'Rome at peace mothballs its interior forts (' + mb.join(', ') + '), not its capital ' + cap.name + ' (kept: ' + kept.join(', ') + ')');
  const nb = ctx.geom.neighbors;
  const borderMb = rf.filter((p) => p.mothballed && [...nb[p.id]].some((n) => game.provinces[n] && !game.provinces[n].impassable && game.provinces[n].owner && game.provinces[n].owner !== 'ROM' && game.tags[game.provinces[n].owner].overlord !== 'ROM'));
  ok(borderMb.length === 0, 'and no fort on a border' + (borderMb.length ? ' — ' + borderMb.map((p) => p.name).join(', ') : ''));
  ok(Object.values(game.fleets).filter((f) => f && f.tag === 'ROM').every((f) => !f.laidUp), 'in surplus its squadrons stay in commission');
  // in the red
  t.income = 20; t.expenses = 40; t.treasury = 10;
  aiUpkeep(ctx, 'ROM', false);
  const still = rf.filter((p) => !p.mothballed && p !== cap).map((p) => p.name);
  ok(still.length === 0, 'in the red the border forts go too' + (still.length ? ' — not ' + still.join(', ') : ''));
  const idle = Object.values(game.fleets).filter((f) => f && f.tag === 'ROM' && !f.mission && !(f.path && f.path.length));
  ok(idle.length > 0 && idle.every((f) => f.laidUp), 'and its idle squadrons are laid up (' + idle.length + ')');
  // back in surplus
  t.income = 170; t.expenses = 40; t.treasury = 900;
  aiUpkeep(ctx, 'ROM', false);
  ok(idle.every((f) => !f.laidUp && f.recommission > 0), 'back in surplus, they are recommissioned');
  // war
  for (const f of idle) { f.laidUp = true; delete f.recommission; }
  aiUpkeep(ctx, 'ROM', true);
  ok(rf.every((p) => !p.mothballed), 'at war every fort is manned');
  ok(idle.every((f) => !f.laidUp), 'and every squadron recommissioned');
}

console.log('== 5. a save keeps it ==');
{
  const { game, ctx, actions } = boot({ peace: true });
  const joppa = ctx.prov('Joppa');
  joppa.owner = 'JUD'; joppa.controller = 'JUD';
  const f = simHelpers.spawnFleet(ctx, 'JUD', 'Joppa', 3, { name: 'Test squadron' });
  actions.layUpFleet(f.id, true);
  actions.mothballFort(ctx.prov('Machaerus').id, true);
  const r = reviveGame(JSON.parse(JSON.stringify(game)));
  ok(r.fleets[f.id].laidUp && r.provinces[ctx.prov('Machaerus').id].mothballed, 'the squadron is still laid up and the fort still mothballed');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
