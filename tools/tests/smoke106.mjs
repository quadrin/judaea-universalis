// Headless regression — SPEC §169: the hope, the office and the ascents.
//
// The assertion this file exists for is the FIRST one: the Temple gate. The
// first run of `sacred.js` offered 1948 Israel a High Priest from the Coalition
// — the religion test passed and there was no test for whether there was a
// Temple. Everything else here is ordinary contract; that one is the bug.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const { incomeBreakdown } = await import(R + '/js/sim/economy.js');
const sacred = await import(R + '/js/sim/sacred.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

function loadGeom() {
  const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
  return {
    neighbors: snap.neighbors.map((a) => new Set(a)),
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas), bbox: [],
  };
}
function foldGeom(raw, mapping) {
  const N = raw.neighbors.length - 1;
  const to = (id) => (mapping && mapping[id]) || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  const areas = new Int32Array(N + 1);
  const coastal = new Array(N + 1).fill(false);
  const centroids = raw.centroids.slice();
  const offshore = raw.offshore.slice();
  for (let id = 1; id <= N; id++) {
    const t = to(id);
    areas[t] += raw.areas[id];
    if (raw.coastal[id]) coastal[t] = true;
    if (!offshore[t] && raw.offshore[id]) offshore[t] = raw.offshore[id];
    for (const nb of raw.neighbors[id]) {
      const tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  for (let id = 1; id <= N; id++) {
    if (to(id) !== id) { centroids[id] = centroids[to(id)]; offshore[id] = offshore[to(id)]; }
  }
  return { neighbors, centroids, areas, coastal, offshore, bbox: [] };
}
const RAW = loadGeom();
function boot(bookmarkId, { seed = 13 } = {}) {
  const era = ERAS.find((e) => e.bookmark.id === bookmarkId);
  const bm = era.bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, bm);
  const geom = foldGeom(RAW, provinceMap);
  const tag = bm.playableTags[0].tag;
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: bm, events: era.events, playerTag: tag, rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus: { emit() {}, on() {} }, bookmark: bm, events: era.events, provinceMap,
  });
  game.tags[tag].ai = false;
  return { bm, game, ctx, actions: gameActions(ctx), tag };
}
const run = (ctx, years) => { for (let i = 0; i < years * 360; i++) tickDay(ctx); };

console.log('== the Temple gate: where the office existed, and only there ==');
{
  // REGRESSION: 1948 Israel was offered a High Priest from the Coalition.
  const EXPECT = {
    '167bce': true, '67bce': true, '40bce': true, '66ce': true,
    '132ce': false, // the House is down; only `altarRaised` puts it back
    '529ce': true, // the Samaritan High Priesthood is a continuous line
    '614ce': false, // …until `altarRestored`
    '1948ce': false, // REGRESSION: there is no Temple and no High Priest in 1948
  };
  for (const era of ERAS) {
    const id = era.bookmark.id;
    const { ctx, actions } = boot(id);
    run(ctx, 1);
    const stands = sacred.templeStands(ctx);
    ok(stands === EXPECT[id], `${id}: the House ${EXPECT[id] ? 'stands' : 'does not stand'}`);
    const rep = actions.getSacred();
    ok(!!rep === EXPECT[id], `${id}: the panel ${EXPECT[id] ? 'appears' : 'stays hidden'}`);
  }
}
{
  // …and a chapter's own chain can put it back.
  const { game, ctx, actions } = boot('132ce');
  run(ctx, 1);
  ok(!actions.getSacred(), '132 CE opens with no Temple to argue about');
  game.flags.altarRaised = true;
  ok(!!actions.getSacred(), 'and raising the altar opens the office');
}
{
  // …and burning it closes it again.
  const { game, ctx, actions } = boot('66ce');
  run(ctx, 1);
  ok(!!actions.getSacred(), '66 CE opens with the House standing');
  game.flags.templeBurned = true;
  ok(!actions.getSacred(), 'and the burning closes it');
}

console.log('== the expectation pays, and then it charges ==');
{
  const { game, ctx, actions, tag } = boot('66ce');
  run(ctx, 1);
  const t = game.tags[tag];
  ok(actions.getSacred().band === 'quiet', 'a chapter opens quiet');
  sacred.raiseExpectation(ctx, 90, 'a star out of Jacob');
  run(ctx, 0.1);
  const rep = actions.getSacred();
  ok(rep.band === 'fevered', `the mantle makes it fevered (${rep.expectation})`);
  const mod = (t.modifiers || []).find((m) => m && m.id === 'messianic');
  ok(!!mod, 'and it rides the ordinary modifier stream');
  ok(mod.effects.manpowerMult > 1 && mod.effects.moraleMult > 1, 'paying manpower and morale');
  ok(mod.effects.unrestAll > 0, '…and charging unrest the whole time');

  const legitBefore = t.legitimacy;
  const stabBefore = t.stability;
  ok(sacred.messianicSetback(ctx, 'a defeat at Betar'), 'a setback lands');
  ok(t.legitimacy < legitBefore, `legitimacy falls ${Math.round(legitBefore)} → ${Math.round(t.legitimacy)}`);
  ok(t.stability < stabBefore, 'and a fevered movement loses a point of stability with it');
  ok(sacred.expectation(ctx) < rep.expectation, 'and the hope itself collapses');
}
{
  // A quiet realm feels nothing: the punishment is FOR having raised it.
  const { game, ctx, tag } = boot('66ce');
  run(ctx, 1);
  const t = game.tags[tag];
  const before = t.legitimacy;
  ok(!sacred.messianicSetback(ctx, 'a defeat'), 'a quiet country takes no messianic setback');
  ok(t.legitimacy === before, 'and loses no legitimacy for one');
}

console.log('== the office, and the room it moves ==');
{
  const { game, ctx, actions, tag } = boot('66ce');
  run(ctx, 1);
  const info = actions.getSacred().priesthood;
  ok(info && info.vacant, 'the office opens vacant');
  ok(info.candidates.length >= 2, `${info.candidates.length} parties could hold it`);
  const target = info.candidates[0];
  const others = info.candidates.slice(1).map((c) => c.id);
  const before = {};
  for (const c of info.candidates) before[c.id] = game.tags[tag].factions[c.id];
  const res = sacred.seatHighPriest(ctx, target.id);
  ok(res.ok, `${res.name} is anointed from ${res.factionName}`);
  ok(game.tags[tag].factions[target.id] > before[target.id], 'the party that got it gains');
  ok(others.every((id) => game.tags[tag].factions[id] < before[id]), 'and every party that did not, loses');
  run(ctx, 0.2);
  const mod = (game.tags[tag].modifiers || []).find((m) => m && m.id === 'high_priesthood');
  ok(mod && mod.effects.legitimacyAdd > 0, 'a filled and agreeable office pays legitimacy');
  // …and a vacancy costs it.
  sacred.vacateHighPriesthood(ctx, 'is dead');
  run(ctx, 0.2);
  const mod2 = (game.tags[tag].modifiers || []).find((m) => m && m.id === 'high_priesthood');
  ok(mod2 && mod2.effects.legitimacyAdd < 0, 'and an empty one costs it');
}

console.log('== the ascents ==');
{
  const { game, ctx, tag } = boot('66ce');
  run(ctx, 1);
  const jer = ctx.prov('Jerusalem');
  jer.owner = tag; jer.controller = tag;
  game.tags[tag].atWarWith = [];
  const atPeace = incomeBreakdown(ctx, tag).pilgrims;
  ok(atPeace > 0, `holding the Temple pays ${atPeace.toFixed(2)} a month at peace`);
  sacred.raiseExpectation(ctx, 90, 'the mantle');
  ok(incomeBreakdown(ctx, tag).pilgrims > atPeace, 'and more while the world is expecting something');
  game.tags[tag].atWarWith = ['ROM'];
  const atWar = incomeBreakdown(ctx, tag).pilgrims;
  ok(atWar < atPeace, `a war on the roads cuts it to ${atWar.toFixed(2)}`);
  jer.controller = 'ROM';
  ok(incomeBreakdown(ctx, tag).pilgrims === 0, 'and an occupied shrine draws nobody at all');
}

console.log('== nothing here reaches an AI hand ==');
{
  const { game, ctx, actions, tag } = boot('66ce');
  game.tags[tag].ai = true;
  run(ctx, 1);
  ok(actions.getSacred() === null, 'no panel under an AI hand');
  ok(!sacred.raiseExpectation(ctx, 50, 'x'), 'the gauge will not move');
  ok(!sacred.seatHighPriest(ctx, 'zealots').ok, 'and no office can be seated');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
