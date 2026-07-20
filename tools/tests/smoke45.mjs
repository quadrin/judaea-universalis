// Headless regression — SPEC §67: the lost lands are remembered. A court
// whose provinces were taken in war holds its opinion of the taker at a deep
// ceiling for as long as the taker sits on the land: goodwill cannot cross
// the cap, drift does not heal the pair, and only restitution (or the fall of
// a house) prunes the grudge — after which the wound heals at drift speed.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions, reconcileGameProvinces } = await import(R + '/js/sim/init.js');
const { changeOwnerCore, endWarBySword, addOpinion, opinionOf, liveGrudge, grudgeCeiling } =
  await import(R + '/js/sim/military.js');
const { monthlyOpinionDrift } = await import(R + '/js/sim/unrest.js');

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
const bus = { emit() {}, on() { return () => {}; } };

const modernMap = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);
const g = initGame({
  DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_1948, events: [],
  playerTag: 'ISR', rngSeed: 42, provinceMap: modernMap,
});
const ctx = makeCtx({
  game: g, DEFINES, MAP_DATA, geom: fakeGeom, bus,
  bookmark: BOOKMARK_1948, events: [], provinceMap: modernMap,
});

const BAL = DEFINES.BALANCE;
const egyProvs = [];
for (let i = 1; i < g.provinces.length && egyProvs.length < 2; i++) {
  const p = g.provinces[i];
  if (p && !p.impassable && p.owner === 'EGY') egyProvs.push(i);
}
ok(egyProvs.length === 2, 'two Egyptian provinces found to take');

console.log('== the sword records the grudge ==');
{
  for (const i of egyProvs) g.provinces[i].controller = 'ISR';
  const war = g.wars.find((w) => w && w.attackers.includes('EGY') && w.defenders.includes('ISR'));
  ok(!!war, 'the invasion war has Egypt attacking Israel');
  endWarBySword(ctx, war, 'def');
  const held = liveGrudge(ctx, 'EGY', 'ISR');
  ok(!!held && held.length === 2, 'Egypt records both provinces taken by the sword');
  const cap = grudgeCeiling(ctx, 'EGY', 'ISR');
  ok(cap === -(BAL.grudgeCeilingBase + BAL.grudgeCeilingPerProv),
    'two held provinces set the ceiling at ' + cap);
  ok(opinionOf(ctx, 'EGY', 'ISR') <= cap, 'the wound is fresh: opinion sits at or below the cap');
}

console.log('== goodwill cannot cross the cap ==');
{
  const cap = grudgeCeiling(ctx, 'EGY', 'ISR');
  addOpinion(ctx, 'EGY', 'ISR', 500);
  ok(opinionOf(ctx, 'EGY', 'ISR') <= cap, 'a +500 charm offensive still parks at the cap');
  g.tags.EGY.opinion.ISR = -200;
  addOpinion(ctx, 'EGY', 'ISR', 30);
  ok(opinionOf(ctx, 'EGY', 'ISR') === -170,
    'below the cap, opinion can still be clawed upward — toward the cap, never past');
}

console.log('== drift enforces, never heals ==');
{
  const cap = grudgeCeiling(ctx, 'EGY', 'ISR');
  g.tags.EGY.opinion.ISR = -50; // a scripted warmth above the cap
  monthlyOpinionDrift(ctx);
  ok(opinionOf(ctx, 'EGY', 'ISR') === -50 - BAL.grudgeBite,
    'above the cap, drift bites ' + BAL.grudgeBite + ' a month toward it');
  g.tags.EGY.opinion.ISR = cap;
  monthlyOpinionDrift(ctx);
  ok(opinionOf(ctx, 'EGY', 'ISR') === cap,
    'at the cap, the pair is excluded from heal-toward-neutral');
  ok(!!liveGrudge(ctx, 'EGY', 'ISR'), 'the live grudge is not pruned');
}

console.log('== the player sees the wall ==');
{
  const acts = gameActions(ctx);
  g.tags.ISR.points.infl = 999; g.tags.ISR.treasury = 999;
  const d = acts.getDiplomacy('EGY');
  ok(d.grudge && d.grudge.count === 2, 'the panel reports the two remembered provinces');
  ok(!d.canImprove && /lost lands/.test(d.whyNotImprove), 'Improve Relations refuses, and says why');
  ok(!d.canGift && /lost lands/.test(d.whyNotGift), 'Send Gift refuses, and says why');
  ok(!d.canAlly && /lost lands/.test(d.whyNotAlly), 'no alliance while the grudge is live');
}

console.log('== the book survives a save ==');
{
  const legacy = JSON.parse(JSON.stringify(g));
  reconcileGameProvinces({
    game: legacy, DEFINES, MAP_DATA, geom: fakeGeom,
    bookmark: BOOKMARK_1948, provinceMap: modernMap,
  });
  const gr = legacy.tags.EGY.grudges && legacy.tags.EGY.grudges.ISR;
  ok(!!gr && gr.provs.length === 2, 'a load keeps the grudge book intact');
}

console.log('== restitution prunes the grudge, then time may heal ==');
{
  for (const i of egyProvs) changeOwnerCore(ctx, g.provinces[i], 'EGY');
  monthlyOpinionDrift(ctx);
  ok(!liveGrudge(ctx, 'EGY', 'ISR') && !(g.tags.EGY.grudges && g.tags.EGY.grudges.ISR),
    'the land returned, the grudge is pruned');
  ok(grudgeCeiling(ctx, 'EGY', 'ISR') === 200, 'no ceiling remains');
  const before = opinionOf(ctx, 'EGY', 'ISR');
  monthlyOpinionDrift(ctx);
  ok(opinionOf(ctx, 'EGY', 'ISR') === before + 1,
    'the old wound now heals at the ordinary point a month');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
