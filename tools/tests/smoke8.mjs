// Headless smoke test — anti-snowball: infamy from conquest, opinion pressure,
// coalitions joining wars, overextension unrest, AI digestion pause.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');
const unrest = await import(R + '/js/sim/unrest.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [],
};
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66, playerTag: 'JUD', rngSeed: 6 });
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
const actions = gameActions(ctx);
const t = game.tags.JUD;

console.log('== infamy from conquest ==');
// JUD dominates its war and dictates a fat peace: three Roman provinces.
const war = game.wars[0];
const takes = [];
for (let i = 1; i < game.provinces.length && takes.length < 3; i++) {
  const p = game.provinces[i];
  if (p && !p.impassable && p.owner === 'ROM') { p.controller = 'JUD'; takes.push(i); }
}
war._bs = { att: 40, def: 0 };
for (let i = 1; i < game.provinces.length; i++) {
  const p = game.provinces[i];
  if (p && !p.impassable && war.defenders.includes(p.owner)) p.controller = 'JUD';
}
mil.updateWarscores(ctx);
actions.offerPeaceDeal(war.id, { provinces: takes, gold: 0, humiliate: false });
ok(game.provinces[takes[0]].owner === 'JUD', 'provinces taken');
ok(t.aggression > 0, 'conquest is remembered: infamy ' + t.aggression);

console.log('== opinion pressure + coalition ==');
t.aggression = 45; // a rampage
// courts abroad sour month by month
game.tags.PAR.opinion.JUD = -40;
game.tags.NAB.opinion.JUD = -40;
for (let m = 0; m < 12; m++) unrest.monthlyOpinionDrift(ctx);
ok(game.tags.PAR.opinion.JUD < -60, 'Parthian court sours: ' + game.tags.PAR.opinion.JUD);
ok(t.aggression < 45, 'infamy decays: ' + t.aggression);
t.aggression = 45;
game.tags.PAR.opinion.JUD = -100;
game.tags.NAB.opinion.JUD = -100;
const coal = mil.coalitionAgainst(ctx, 'JUD');
ok(coal.includes('PAR') && coal.includes('NAB'), 'coalition stands against us: ' + coal.join(','));
// attacking a coalition member brings the whole league
game.truces = {};
game.tags.JUD.atWarWith = [];
const w2 = mil.declareWar(ctx, 'JUD', 'NAB', 'Test Grab', 'conquest');
ok(w2 && w2.defenders.includes('PAR'), 'the coalition marches: defenders ' + w2.defenders.join('+'));

console.log('== overextension unrest ==');
const mine = [];
for (let i = 1; i < game.provinces.length; i++) {
  const p = game.provinces[i];
  if (p && !p.impassable && p.owner === 'JUD') mine.push(p);
}
for (const p of mine.slice(0, Math.ceil(mine.length / 2))) p.autonomy = 0.7;
const bd = unrest.computeUnrestBreakdown(ctx, mine[mine.length - 1]);
ok(bd.rows.some((r) => r.label === 'Overextension' && r.value > 0.5),
  'overextension strains the realm: ' + JSON.stringify(bd.rows.find((r) => r.label === 'Overextension')));

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
