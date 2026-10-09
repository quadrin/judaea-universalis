// Headless regression — SPEC §294: the sea fights the map draws, and what
// the fleet panel reads.
//
//   1. Two hostile squadrons at one anchor fight, and the fight is kept on
//      g.seaFights by its anchor: who, each side's hulls now, the hulls each
//      has lost, and since when. Its sides keep their order day to day. It is
//      live while broadsides were traded in the last two days, and gone three
//      days after the last.
//   2. Squadrons at peace with each other do not fight.
//   3. getNavy gives each squadron where it is bound, who is aboard, and its
//      trade mission's market by name.
//   4. A save keeps a live fight.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions, reviveGame, simHelpers } = await import(R + '/js/sim/init.js');
const navy = await import(R + '/js/sim/navy.js');
const mil = await import(R + '/js/sim/military.js');
const trade = await import(R + '/js/sim/trade.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

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
function boot() {
  const e = ERAS.find((x) => x.bookmark.id === '66ce');
  const provinceMap = buildProvinceMapping(MAP_DATA, e.bookmark);
  const geom = geomFor(provinceMap);
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: e.bookmark, events: [], playerTag: 'JUD', rngSeed: 294, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: e.bookmark, events: [], provinceMap });
  game.wars = [];
  game.truces = {};
  for (const k of Object.keys(game.tags)) if (game.tags[k]) game.tags[k].atWarWith = [];
  return { game, ctx, actions: gameActions(ctx) };
}
const nextDay = (g) => {
  g.date.d++;
  if (g.date.d > 30) { g.date.d = 1; g.date.m++; }
  if (g.date.m > 12) { g.date.m = 1; g.date.y++; }
};

console.log('== 1. a sea fight is kept by its anchor ==');
{
  const { game, ctx } = boot();
  const caes = ctx.prov('Caesarea Maritima');
  mil.declareWar(ctx, 'JUD', 'NAB', 'Test War');
  const a = simHelpers.spawnFleet(ctx, 'JUD', 'Caesarea Maritima', 12, { name: 'Judaean squadron' });
  const b = simHelpers.spawnFleet(ctx, 'NAB', 'Caesarea Maritima', 9, { name: 'Nabataean squadron' });
  navy.fleetsDaily(ctx);
  let sf = game.seaFights && game.seaFights[caes.id];
  ok(!!sf && sf.a === 'JUD' && sf.b === 'NAB', 'Judaea and Nabataea fight off Caesarea');
  ok(sf.shipsA === a.ships && sf.shipsB === b.ships && sf.lostA + sf.lostB > 0, `hulls now ${sf.shipsA} : ${sf.shipsB}, lost ${sf.lostA} : ${sf.lostB}`);
  ok(navy.seaFightsLive(game).length === 1, 'and it is live');
  const since = sf.since;
  nextDay(game);
  navy.fleetsDaily(ctx);
  sf = game.seaFights[caes.id];
  ok(sf.a === 'JUD' && sf.since === since && sf.lostA + sf.lostB >= 2, 'a second day: the same sides in the same order, the losses add up');
  // part them
  b.prov = ctx.prov('Joppa').id;
  nextDay(game); navy.fleetsDaily(ctx);
  nextDay(game); navy.fleetsDaily(ctx);
  ok(navy.seaFightsLive(game).length === 1, 'two days after the last broadside it still shows');
  nextDay(game); navy.fleetsDaily(ctx);
  ok(navy.seaFightsLive(game).length === 0, 'then it is over on the map');
  nextDay(game); navy.fleetsDaily(ctx);
  ok(!game.seaFights[caes.id], 'and three days on it is gone from the save');
}

console.log('== 2. no fight at peace ==');
{
  const { game, ctx } = boot();
  simHelpers.spawnFleet(ctx, 'JUD', 'Caesarea Maritima', 5, {});
  simHelpers.spawnFleet(ctx, 'NAB', 'Caesarea Maritima', 5, {});
  navy.fleetsDaily(ctx);
  ok(navy.seaFightsLive(game).length === 0, 'two courts at peace share an anchor quietly');
}

console.log('== 3. what the fleet panel reads ==');
{
  const { game, ctx, actions } = boot();
  const joppa = ctx.prov('Joppa');
  joppa.owner = 'JUD'; joppa.controller = 'JUD';
  const f = simHelpers.spawnFleet(ctx, 'JUD', 'Joppa', 4, { name: 'Test squadron' });
  const aid = simHelpers.spawnArmy(ctx, 'JUD', 'Joppa', { inf: 2, name: 'Marines of Joppa' });
  navy.embarkCore(ctx, f, aid);
  navy.issueFleetMove(ctx, f, ctx.prov('Caesarea Maritima').id);
  let row = actions.getNavy().fleets.find((x) => x.id === f.id);
  ok(row.destName === 'Caesarea Maritima', 'bound for ' + row.destName);
  ok(row.aboard.length === 1 && row.aboard[0].name === 'Marines of Joppa' && row.aboardMen > 0, 'carrying ' + row.aboard.map((a) => a.name).join(', '));
  f.path = [];
  navy.disembarkCore(ctx, f);
  f.mission = { kind: 'protect', node: 'judaea' };
  trade.touchTrade(game);
  row = actions.getNavy().fleets.find((x) => x.id === f.id);
  ok(row.mission && row.mission.nodeName === 'Joppa' && !row.aboard.length, 'guarding the market of ' + (row.mission && row.mission.nodeName));
}

console.log('== 4. a save keeps a live fight ==');
{
  const { game, ctx } = boot();
  mil.declareWar(ctx, 'JUD', 'NAB', 'Test War');
  simHelpers.spawnFleet(ctx, 'JUD', 'Caesarea Maritima', 6, {});
  simHelpers.spawnFleet(ctx, 'NAB', 'Caesarea Maritima', 6, {});
  navy.fleetsDaily(ctx);
  const r = reviveGame(JSON.parse(JSON.stringify(game)));
  ok(navy.seaFightsLive(r).length === 1, 'the revived game still shows the fight');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
