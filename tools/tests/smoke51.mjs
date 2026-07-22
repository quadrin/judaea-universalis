// Headless regression — the junior partner's withdrawal (SPEC §74).
// A court pulled into an ally's war no longer wields the coalition's pen:
//  1. Its table is a WITHDRAWAL — it may keep what its OWN men hold (priced
//     by war score), then leaves while the ally's war continues untouched.
//  2. A white withdrawal spares the ally everything: no enemy struck from
//     the ally's war, no truce binding the ally, no ally occupation reverted.
//  3. The congress instruments (separate peaces, subjugation, releases,
//     humiliation, reparations) belong to the side's leader alone.
//  4. A junior losing badly cannot simply walk away.
import { readFileSync } from 'node:fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_614 } = await import(R + '/js/data/bookmark_614ce.js');
const { EVENTS_614 } = await import(R + '/js/data/events_614ce.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const N = MAP_DATA.provinces.length;
const bus = { emit() {}, on() { return () => {}; } };
function boot(seed) {
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_614);
  const geom = {
    neighbors: snap.neighbors.map((arr) => new Set(arr)),
    centroids: [null, ...MAP_DATA.provinces.map((p) => {
      const [x, y] = MAP_DATA.project(p.lon, p.lat);
      return { x, y };
    })],
    areas: new Int32Array(N + 1), bbox: [], coastal: snap.coastal || [], offshore: [],
  };
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_614, events: EVENTS_614,
    playerTag: 'JUD', rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_614,
    events: EVENTS_614, provinceMap,
  });
  return { game, ctx };
}
function warOf(game, a, b) {
  return (game.wars || []).find((w) => {
    const all = (w.attackers || []).concat(w.defenders || []);
    return all.includes(a) && all.includes(b);
  }) || null;
}
function effect(id, ctx) {
  const ev = EVENTS_614.find((e) => e && e.id === id);
  ev.options[ev.aiOption || 0].effects(ctx);
}

console.log('== the withdrawing junior keeps what its own men hold ==');
{
  const { game, ctx } = boot(51);
  effect('ev_p_rashidun', ctx);
  effect('ev_p_iraq_raids', ctx);
  const war = warOf(game, 'RSH', 'SAS');
  ok(!!war && war.defenders[0] === 'SAS' && war.defenders.includes('JUD'),
    'Judaea is pulled into Persia\'s war as the junior defender');
  const dum = ctx.prov('Dumatha');
  const heg = ctx.prov('Hegra');
  mil.changeControllerCore(ctx, dum, 'JUD'); // our men hold Dumatha
  mil.changeControllerCore(ctx, heg, 'SAS'); // the ally holds Hegra
  war.warscore.JUD = 60; war.warscore.SAS = 60; war.warscore.RSH = -60;

  const info = mil.peaceDealInfo(ctx, war, 'JUD');
  ok(info.exit === true && info.sideLeader === 'SAS',
    'the junior\'s table is a withdrawal, and it knows whose war this is');
  ok(info.provinces.length === 1 && info.provinces[0].name === 'Dumatha',
    'only what OUR men hold is on the table — the ally\'s occupation is not ours to spend');
  ok(info.separateTargets.length === 0 && !info.canSubjugate && info.releasable.length === 0,
    'the congress instruments are absent from the withdrawal table');

  const ev = mil.evaluatePeaceDeal(ctx, war, 'JUD', { provinces: [dum.id], gold: 0, humiliate: true, reparations: true });
  ok(ev.acceptable && !ev.humiliate && !ev.reparations,
    'leader-grade terms are quietly struck; the province demand stands at +60');
  mil.executePeaceDeal(ctx, war, 'JUD', { provinces: [dum.id], gold: 0 });
  ok(dum.owner === 'JUD' && dum.controller === 'JUD',
    'the conquered province is KEPT, not flipped back to the enemy');
  ok(!game.tags.JUD.atWarWith.includes('RSH'), 'Judaea is out of the war');
  const after = warOf(game, 'RSH', 'SAS');
  ok(!!after && !after.defenders.includes('JUD'),
    'Persia\'s war continues without us — the ally still fights it');
  ok(heg.controller === 'SAS', 'the ally\'s occupation of Hegra is untouched');
  ok(!!game.truces['JUD|RSH'] && !game.truces['RSH|SAS'],
    'the truce binds the leaver alone — never the ally');
}

console.log('== a white withdrawal spares the ally everything ==');
{
  const { game, ctx } = boot(52);
  const war = warOf(game, 'SAS', 'BYZ');
  const mySide = war && (war.attackers.includes('JUD') ? war.attackers : war.defenders);
  ok(!!war && mySide.includes('JUD') && mySide[0] === 'SAS',
    'the opening great war carries Judaea as Persia\'s junior partner');
  war.started = { y: 612, m: 1 }; // an aged war: the white-peace fresh-grudge rule is not the subject here
  const mine = ['Jerusalem', 'Caesarea Maritima'].map((n) => ctx.prov(n));
  for (const p of mine) mil.changeControllerCore(ctx, p, 'JUD');
  const allyPrize = ctx.prov('Antioch');
  mil.changeControllerCore(ctx, allyPrize, 'SAS'); // BYZ-owned, ally-occupied
  mil.updateWarscores(ctx);

  const evW = mil.evaluatePeaceDeal(ctx, war, 'JUD', { provinces: [], gold: 0 });
  ok(evW.acceptable, 'the enemy lets a coalition member fold its tents and go: ' + evW.reason);
  mil.executePeaceDeal(ctx, war, 'JUD', { provinces: [], gold: 0 });
  ok(mine.every((p) => p.controller === 'BYZ'),
    'our own occupations revert on a white withdrawal — the price of walking away');
  ok(allyPrize.controller === 'SAS',
    'the ally\'s occupation of Antioch stands');
  const after = warOf(game, 'SAS', 'BYZ');
  ok(!!after && after.attackers.concat(after.defenders).includes('GHA')
    && !after.attackers.includes('JUD') && !after.defenders.includes('JUD'),
  'the great war continues at full strength — no enemy was struck from the ally\'s war');
  ok(!game.truces['BYZ|SAS'] && !!game.truces['BYZ|JUD'] && !!game.truces['GHA|JUD'],
    'truces bind the leaver to every enemy, and the ally to no one');
  ok(game.tags.JUD.atWarWith.length === 0, 'we are fully out');
}

console.log('== the pen belongs to the leader ==');
{
  const { game, ctx } = boot(53);
  const war = warOf(game, 'SAS', 'BYZ');
  const asJunior = mil.peaceDealInfo(ctx, war, 'JUD', 'BYZ');
  ok(asJunior.exit === true && asJunior.separate === false,
    'a junior asking for a separate peace gets the withdrawal table instead');
  const asLeader = mil.peaceDealInfo(ctx, war, 'SAS');
  ok(asLeader.exit === false && asLeader.separateTargets.length === 2,
    'the side leader keeps the full congress and the separate-peace chips');
  const asLeaderSep = mil.peaceDealInfo(ctx, war, 'SAS', 'GHA');
  ok(asLeaderSep.separate === true,
    'the leader\'s separate peace with one enemy member still works');
}

console.log('== a junior losing badly cannot simply walk ==');
{
  const { game, ctx } = boot(54);
  const war = warOf(game, 'SAS', 'BYZ');
  war.started = { y: 612, m: 1 };
  war.warscore.JUD = -40;
  game.tags.BYZ.warExhaustion = 0;
  const evW = mil.evaluatePeaceDeal(ctx, war, 'JUD', { provinces: [], gold: 0 });
  ok(!evW.acceptable,
    'at −40 the enemy will not let us walk: ' + evW.reason);
}

console.log(failures ? 'FAILURES: ' + failures : 'ALL PASS');
process.exit(failures ? 1 : 0);
