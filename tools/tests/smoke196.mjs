// Headless regression — SPEC §284: the war planner.
//
// The field AI used to gather every army into one stack and march it at the
// nearest cheap province. The planner decides what each army is for by what
// it buys in war score, and every judgement about a battle goes through a
// forecast that runs the real combat formulas forward. This suite holds:
//
//   - the forecast agrees with the battle system it forecasts;
//   - an army that would lose leaves before the enemy arrives;
//   - a siege of our own land is relieved when the relief would win, and not
//     when it would lose;
//   - what the enemy has taken is taken back;
//   - a column on the march is met on its road, by an army that got there first;
//   - the planner looks again between monthly councils;
//   - a withdrawal from a battle already joined is a lost battle.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const mil = await import(R + '/js/sim/military.js');
const { forecastBattle, planWar, winChance, aiMarchGuard, aiDangerWatch } = await import(R + '/js/sim/ai_war.js');
const { tickDay } = await import(R + '/js/sim/tick.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// The real map, folded through the 66 CE chapter's province mapping, exactly
// as the balance harness builds it.
const ERA = ERAS.find((e) => e.bookmark.id === '66ce');
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const mapping = buildProvinceMapping(MAP_DATA, ERA.bookmark);
const to = (id) => (mapping && mapping[id]) || id;
const N = snap.neighbors.length - 1;
const neighbors = Array.from({ length: N + 1 }, () => new Set());
for (let id = 1; id <= N; id++) {
  for (const nb of snap.neighbors[id]) {
    const a = to(id), b = to(nb);
    if (a !== b) { neighbors[a].add(b); neighbors[b].add(a); }
  }
}
const centroids = snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null));
for (let id = 1; id <= N; id++) if (to(id) !== id) centroids[id] = centroids[to(id)];
const geom = {
  neighbors, centroids, coastal: snap.coastal.map(Boolean),
  offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
  areas: Int32Array.from(snap.areas), bbox: [],
};
const bus = { emit() {}, on() { return () => {}; } };

// A fresh 66 CE world with the field cleared: JUD is the human chair, and
// every scene places exactly the armies it is about.
function scene(seed = 7) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: ERA.bookmark, events: ERA.events,
    playerTag: 'JUD', rngSeed: seed, provinceMap: mapping });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: ERA.bookmark, events: ERA.events,
    provinceMap: mapping });
  for (const id of Object.keys(game.armies)) delete game.armies[id];
  game.battles.length = 0;
  game.tags.JUD.ai = false;
  const P = (name) => ctx.prov(name);
  const spawn = (tag, where, inf, name) => game.armies[mil.spawnArmy(ctx, tag, where, { inf, name: name || tag + '@' + where })];
  return { game, ctx, P, spawn };
}
const dest = (a) => (a.path && a.path.length ? a.path[a.path.length - 1] : a.prov);

console.log('== the forecast agrees with the battle it forecasts ==');
{
  let agree = 0, n = 0, clear = 0, clearAgree = 0;
  const fights = [[10, 3], [6, 5], [5, 6], [8, 8], [12, 9], [4, 4], [20, 12], [3, 7], [9, 6]];
  let seed = 100;
  for (const where of ['Lydda', 'Jerusalem', 'Gischala', 'Masada']) {
    for (const [a, d] of fights) {
      for (let rep = 0; rep < 4; rep++) {
        const { game, ctx, spawn } = scene(seed++);
        const atkTag = rep % 2 ? 'ROM' : 'JUD';
        const defTag = rep % 2 ? 'JUD' : 'ROM';
        const A = spawn(atkTag, where, a), D = spawn(defTag, where, d);
        game.battles.length = 0;
        const f = forecastBattle(ctx, [A], [D], A.prov);
        const p = winChance(ctx, [A], [D], A.prov);
        game.battles.push({ id: 'x', prov: A.prov, atk: [A.id], def: [D.id], day: 0 });
        A.inBattle = D.inBattle = true;
        for (let k = 0; k < 200 && game.battles.length; k++) mil.tickBattles(ctx);
        const up = (x) => game.armies[x.id] && !game.armies[x.id].retreating && game.armies[x.id].men > 0;
        const real = up(A) && !up(D) ? 'atk' : up(D) && !up(A) ? 'def' : '?';
        n++; if (real === f.winner) agree++;
        // A fight the odds call at 85% or better is one the planner acts on.
        if (p >= 0.85 || p <= 0.15) { clear++; if ((p >= 0.85) === (real === 'atk')) clearAgree++; }
      }
    }
  }
  ok(agree / n >= 0.85, 'forecast and battle agree on ' + agree + ' of ' + n);
  ok(clear > 0 && clearAgree / clear >= 0.93, 'and on ' + clearAgree + ' of ' + clear + ' fights it is sure of');
}
{
  const { ctx, spawn } = scene();
  const hills = spawn('JUD', 'Gischala', 6);
  const foe = spawn('AGR', 'Gischala', 6);
  const up = forecastBattle(ctx, [foe], [hills], hills.prov);
  const down = forecastBattle(ctx, [hills], [foe], hills.prov);
  ok(up.winner === 'def' && down.winner === 'def', 'equal hosts in the hills: whoever holds the ground wins');
}

console.log('== an army that would lose leaves before the enemy arrives ==');
{
  const { game, ctx, P, spawn } = scene();
  const rom = spawn('ROM', 'Emmaus', 4);
  const jud = spawn('JUD', 'Jerusalem', 20);
  mil.issueMove(ctx, jud, P('Emmaus').id);
  planWar(ctx, 'ROM');
  ok(rom.path && rom.path.length > 0, 'the Roman column marches: ' + (rom.path || []).length + ' hops');
  ok(dest(rom) !== P('Emmaus').id && dest(rom) !== P('Jerusalem').id,
    'and not into the host coming for it: ' + game.provinces[dest(rom)].name);
}

console.log('== a siege of our land is relieved when the relief would win ==');
{
  const { game, ctx, P, spawn } = scene();
  const town = P('Scythopolis');
  const besiegers = spawn('JUD', town.name, 3);
  mil.ensureSiege(ctx, town, 'JUD');
  if (town.siege) town.siege.progress = 40;
  const relief = spawn('ROM', 'Caesarea Maritima', 14);
  planWar(ctx, 'ROM');
  ok(!!town.siege, 'Scythopolis is under siege');
  ok(dest(relief) === town.id, 'the legion marches to lift it: ' + game.provinces[dest(relief)].name);
  void besiegers;
}
{
  const { game, ctx, P, spawn } = scene();
  const town = P('Scythopolis');
  spawn('JUD', town.name, 20);
  mil.ensureSiege(ctx, town, 'JUD');
  const relief = spawn('ROM', 'Caesarea Maritima', 3);
  planWar(ctx, 'ROM');
  ok(dest(relief) !== town.id, 'a relief that would be beaten stays away: '
    + game.provinces[dest(relief)].name);
}

console.log('== what the enemy has taken is taken back ==');
{
  // Seen from Judaea: Lydda is a tenth of the realm, so a Roman flag over it
  // is score Rome is holding. (Seen from Rome, one town of an empire is not
  // worth a march — which is also right, and is why the scene is Judaea's.)
  const { game, ctx, P, spawn } = scene();
  game.tags.JUD.ai = true;
  game.tags.ROM.ai = false;
  game.playerTag = 'ROM';
  const lost = P('Lydda');
  lost.controller = 'ROM';
  spawn('ROM', 'Antioch', 30);
  const jud = spawn('JUD', 'Jerusalem', 6);
  planWar(ctx, 'JUD');
  ok(dest(jud) === lost.id, 'the Judaean host goes back for Lydda: ' + game.provinces[dest(jud)].name);
}

console.log('== a column on the march is met on its road ==');
{
  // Seen from Judaea again: a Roman column marching on Lydda is a town's
  // worth of score coming down the road, and the Judaean host goes to meet it.
  const { game, ctx, P, spawn } = scene();
  game.tags.JUD.ai = true;
  game.tags.ROM.ai = false;
  game.playerTag = 'ROM';
  const col = spawn('ROM', 'Caesarea Maritima', 5);
  mil.issueMove(ctx, col, P('Lydda').id);
  const road = new Set(col.path);
  const jud = spawn('JUD', 'Jerusalem', 12);
  planWar(ctx, 'JUD');
  const d = dest(jud);
  ok(road.has(d), 'the Judaean host stands on the column\'s road: ' + game.provinces[d].name);
}

console.log('== the planner looks again between monthly councils ==');
{
  const { game, ctx, P, spawn } = scene();
  game.tags.ROM.ai = true;
  game.tags.ROM.modifiers = (game.tags.ROM.modifiers || []).filter((m) => !(m && m.effects && m.effects.aiPassive));
  const rom = spawn('ROM', 'Emmaus', 4);
  spawn('JUD', 'Jerusalem', 20);
  game.date.d = 5;
  game.paused = false;
  tickDay(ctx); // → day 6: a tactical pass
  ok(game.date.d === 6, 'the sixth of the month');
  ok(rom.path && rom.path.length > 0 && dest(rom) !== P('Jerusalem').id,
    'the threatened legion already has orders: ' + game.provinces[dest(rom)].name);
}

console.log('== no column walks into a fight it would lose ==');
{
  const { game, ctx, P, spawn } = scene();
  game.tags.ROM.ai = true;
  spawn('JUD', 'Lydda', 12);
  const col = spawn('ROM', 'Joppa', 3);
  col.path = [P('Lydda').id]; col.moveDaysLeft = 1; // arriving tomorrow
  aiMarchGuard(ctx);
  ok(!col.path.length, 'three regiments one day from twelve halt short');
  const bold = spawn('ROM', 'Joppa', 30);
  bold.path = [P('Lydda').id]; bold.moveDaysLeft = 1;
  aiMarchGuard(ctx);
  ok(bold.path.length === 1, 'thirty march on');
}

console.log('== an army sees a column coming and does not wait for it ==');
{
  const { game, ctx, P, spawn } = scene();
  game.tags.ROM.ai = true;
  const rom = spawn('ROM', 'Emmaus', 4);
  const jud = spawn('JUD', 'Jerusalem', 20);
  mil.issueMove(ctx, jud, P('Emmaus').id);
  ok(!(rom.path && rom.path.length), 'the legion is standing still');
  aiDangerWatch(ctx);
  ok(rom.path && rom.path.length > 0 && dest(rom) !== P('Emmaus').id,
    'the watch sends it out of the way the same day: ' + game.provinces[dest(rom)].name);
}

console.log('== a scripted lull starts nothing, but does not stand to be destroyed ==');
{
  const { game, ctx, P, spawn } = scene();
  ok((game.tags.ROM.modifiers || []).some((m) => m && m.effects && m.effects.aiPassive),
    'Rome opens 66 CE under the governor\'s hesitation');
  const doomed = spawn('ROM', 'Emmaus', 4);
  spawn('JUD', 'Jerusalem', 20);
  const idle = spawn('ROM', 'Antioch', 10);
  const lost = P('Scythopolis');
  lost.controller = 'JUD';
  game.tags.ROM.ai = true;
  const { runMonthlyAI } = await import(R + '/js/sim/ai.js');
  runMonthlyAI(ctx);
  ok(doomed.path && doomed.path.length > 0, 'the column in harm\'s way steps aside');
  ok(!(idle.path && idle.path.length), 'the legion at Antioch starts nothing');
}

console.log('== a withdrawal from a battle already joined is a lost battle ==');
{
  const { game, ctx, spawn } = scene();
  const war = game.wars.find((w) => w.attackers.indexOf('JUD') >= 0 || w.defenders.indexOf('JUD') >= 0);
  const mine = spawn('JUD', 'Lydda', 3);
  const theirs = spawn('ROM', 'Lydda', 9);
  game.battles.length = 0;
  game.battles.push({ id: 'w', prov: mine.prov, atk: [theirs.id], def: [mine.id], day: 4, casAtk: 400, casDef: 3000 });
  mine.inBattle = theirs.inBattle = true;
  const before = mil.sideComponents(ctx, war, war.attackers.indexOf('ROM') >= 0 ? 'att' : 'def').battles;
  const res = mil.withdrawFromBattle(ctx, 'JUD', mine.prov);
  const after = mil.sideComponents(ctx, war, war.attackers.indexOf('ROM') >= 0 ? 'att' : 'def').battles;
  ok(res.ok, 'the withdrawal is sounded');
  ok(Math.abs(after - before - 2) < 1e-9, 'Rome holds the field and scores the 3,000 it cost us: ' + before + ' → ' + after);
  ok(game.battles.length === 0 && !theirs.inBattle, 'the battle is over');
}
{
  const { game, ctx, spawn } = scene();
  const war = game.wars.find((w) => w.attackers.indexOf('JUD') >= 0 || w.defenders.indexOf('JUD') >= 0);
  const mine = spawn('JUD', 'Lydda', 3);
  const theirs = spawn('ROM', 'Lydda', 9);
  game.battles.length = 0;
  game.battles.push({ id: 'w', prov: mine.prov, atk: [theirs.id], def: [mine.id], day: 0 });
  mine.inBattle = theirs.inBattle = true;
  const key = war.attackers.indexOf('ROM') >= 0 ? 'att' : 'def';
  const before = mil.sideComponents(ctx, war, key).battles;
  mil.withdrawFromBattle(ctx, 'JUD', mine.prov);
  ok(mil.sideComponents(ctx, war, key).battles === before,
    'refusing battle before a blow is struck costs no score');
}

console.log('== a court at peace takes its towns back from rebels ==');
{
  const { game, ctx, spawn } = scene();
  const { runMonthlyAI } = await import(R + '/js/sim/ai.js');
  const nab = game.tags.NAB;
  nab.atWarWith = [];
  const towns = game.provinces.filter((q) => q && q.owner === 'NAB' && !q.impassable);
  const lost = towns.find((q) => (q.fort | 0) === 0) || towns[0];
  lost.controller = 'REB';
  const home = towns.find((q) => q !== lost && [...geom.neighbors[q.id]].includes(lost.id)) || towns.find((q) => q !== lost);
  const host = spawn('NAB', home.name, 6);
  runMonthlyAI(ctx);
  ok(dest(host) === lost.id, 'Nabataea marches on ' + lost.name + ': ' + game.provinces[dest(host)].name);
}

console.log('== the battle window tells the player the odds ==');
{
  const { game, ctx, spawn } = scene();
  const { gameActions } = await import(R + '/js/sim/init.js');
  const actions = gameActions(ctx);
  const mine = spawn('JUD', 'Lydda', 12);
  const theirs = spawn('ROM', 'Lydda', 3);
  game.battles.length = 0;
  game.battles.push({ id: 'o', prov: mine.prov, atk: [mine.id], def: [theirs.id], day: 1 });
  mine.inBattle = theirs.inBattle = true;
  const info = actions.getBattleInfo(mine.prov);
  ok(info && Number.isFinite(info.atkChance) && info.atkChance > 0.9,
    'twelve regiments on three: ' + Math.round(100 * info.atkChance) + '% for the attackers');
}

console.log('== a battle scores what it cost the loser ==');
{
  const { ctx } = scene();
  ok(mil.battleScoreFor(ctx, 300) === 0.5, 'a patrol routed: half a point');
  ok(mil.battleScoreFor(ctx, 3000) === 2, 'three thousand men: the two points a battle always was');
  ok(mil.battleScoreFor(ctx, 20000) === 4, 'a Cannae: four, and no more');
}

console.log('== reparations are a share of what the loser earns ==');
{
  const { game, ctx } = scene();
  game.tags.JUD.income = 4;
  game.tags.ROM.income = 129;
  ok(mil.reparationsAmountFor(ctx, 'JUD') === 1, 'a realm earning 4 pays 1 a month, not 8');
  ok(mil.reparationsAmountFor(ctx, 'ROM') === 8, 'an empire pays the old ceiling of 8');
}

console.log('== the chapter tells the generals what the war is about ==');
{
  const { game, ctx, P, spawn } = scene();
  game.tags.ROM.ai = true;
  game.tags.ROM.modifiers = (game.tags.ROM.modifiers || []).filter((m) => !(m && m.effects && m.effects.aiPassive));
  ok((ERA.bookmark.aiObjectives || {}).ROM && ERA.bookmark.aiObjectives.ROM.includes('Jerusalem'),
    '66 CE names Jerusalem as Rome\'s objective');
  const rom = spawn('ROM', 'Emmaus', 12);
  const log = [];
  planWar(ctx, 'ROM', { log });
  ok(dest(rom) === P('Jerusalem').id, 'the legion marches on Jerusalem, not the nearest open town: '
    + game.provinces[dest(rom)].name);
}

console.log('== rule and reserves wait on the calendar ==');
{
  const { game, ctx, P } = scene();
  const { gameActions } = await import(R + '/js/sim/init.js');
  const actions = gameActions(ctx);
  const t = game.tags.JUD;
  const p = P('Lydda');
  p.autonomy = 0.75;
  t.points.gov = 999;
  const cost = mil.establishRuleTerms(ctx, p).cost;
  ok(cost > 25, 'the price of rule scales with the town: ' + cost);
  actions.establishRule(p.id);
  ok(Math.abs(p.autonomy - 0.6) < 1e-9 && t.points.gov === 999 - cost, 'the first grip takes: 75% → 60%');
  actions.establishRule(p.id);
  ok(Math.abs(p.autonomy - 0.6) < 1e-9 && t.points.gov === 999 - cost, 'the second, the same month, does not');
  game.date.y += 1;
  actions.establishRule(p.id);
  ok(Math.abs(p.autonomy - 0.45) < 1e-9, 'a year on, it can close again: ' + p.autonomy.toFixed(2));

  t.points.mar = 999;
  t.manpower = 0;
  actions.callReserves();
  ok(t.manpower === 2000, 'the reserves answer: +2,000');
  actions.callReserves();
  ok(t.manpower === 2000 && t.points.mar === 949, 'and do not answer twice in a year');
}

console.log('== the AI lays public works in peacetime ==');
{
  const { game, ctx } = scene();
  const { runMonthlyAI } = await import(R + '/js/sim/ai.js');
  const t = game.tags.NAB;
  t.atWarWith = [];
  t.treasury = 2000;
  t.income = 30; t.expenses = 10;
  runMonthlyAI(ctx);
  const works = game.provinces.filter((q) => q && q.owner === 'NAB' && q.construction);
  ok(works.length === 1, 'Nabataea begins one work: ' + works.map((q) => q.name + ' ' + q.construction.key).join(', '));
  runMonthlyAI(ctx);
  ok(game.provinces.filter((q) => q && q.owner === 'NAB' && q.construction).length === 1, 'and only one at a time');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
