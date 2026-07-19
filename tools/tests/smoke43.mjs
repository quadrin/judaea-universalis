// Headless regression — v6.9 (SPEC §67): the separate peace. Exhaust one
// member of an enemy coalition (occupation of THEIR land, THEIR war
// exhaustion — the bilateral separateWarscore) and you can negotiate them
// out of the war alone: their provinces cede, occupations between you
// revert, truces bind them, and the war goes on with everyone else — every
// other front keeping its lines. One enemy left = no separate table; a
// separate peace can never subjugate.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const {
  peaceDealInfo, evaluatePeaceDeal, executePeaceDeal, separateWarscore, truceActive,
} = await import(R + '/js/sim/military.js');

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
const idOf = (n) => MAP_DATA.provinces.findIndex((p) => p.name === n) + 1;

const modernMap = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);
const g = initGame({
  DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_1948, events: [],
  playerTag: 'ISR', rngSeed: 43, provinceMap: modernMap,
});
const ctx = makeCtx({
  game: g, DEFINES, MAP_DATA, geom: fakeGeom, bus,
  bookmark: BOOKMARK_1948, events: [], provinceMap: modernMap,
});
const war = g.wars.find((w) => w && w.defenders.includes('ISR'));
war.noNegotiation = false; // Rhodes has unlocked the envoys
const prov = (n) => g.provinces[idOf(n)];

console.log('== the coalition offers separate corridors ==');
{
  const info = peaceDealInfo(ctx, war, 'ISR');
  ok(!info.separate && info.enemyLeader === 'EGY',
    'the default table is the whole congress, led by Egypt');
  ok(info.separateTargets.length === 6
      && info.separateTargets.some((t) => t.tag === 'LEB'),
    'all six coalition courts are listed as separate targets');
}

console.log('== exhausting one court opens its door ==');
{
  // Hiram has run its course: Israel stands on every Lebanese-held province.
  for (const p of g.provinces) {
    if (p && !p.impassable && p.owner === 'LEB') p.controller = 'ISR';
  }
  g.tags.LEB.warExhaustion = 10;
  prov('Gaza').controller = 'ISR'; // and Yoav holds Gaza — a DIFFERENT front
  const sep = separateWarscore(ctx, war, 'ISR', 'LEB');
  ok(sep >= 60, 'full occupation and a weary court: separate score vs Lebanon is ' + sep);
  const info = peaceDealInfo(ctx, war, 'ISR', 'LEB');
  ok(info.separate && info.enemyLeader === 'LEB' && info.myWs === sep,
    'the scoped table prices against the bilateral ledger, not the side score');
  ok(info.provinces.length && info.provinces.every((r) => r.owner === 'LEB'),
    'only Lebanese land is on this table — Egyptian Gaza is not');
  ok(!info.canSubjugate && /congress/.test(info.whyNotSubjugate),
    'a separate peace cannot subjugate: ' + info.whyNotSubjugate);
}

console.log('== the separate treaty: they cede, they leave, the war goes on ==');
{
  const deal = { enemy: 'LEB', provinces: [idOf('Gischala')], gold: 0 };
  const ev = evaluatePeaceDeal(ctx, war, 'ISR', deal);
  ok(ev.acceptable, 'our position compels Lebanon: ' + ev.reason);
  executePeaceDeal(ctx, war, 'ISR', deal);
  ok(prov('Gischala').owner === 'ISR', 'Jish is ceded to Israel');
  ok(g.wars.includes(war) && !war.attackers.includes('LEB')
      && ['EGY', 'JOR', 'SYR', 'IRQ', 'SAU'].every((t) => war.attackers.includes(t)),
    'Lebanon is out of the war; five armies fight on');
  ok(!g.tags.ISR.atWarWith.includes('LEB') && g.tags.ISR.atWarWith.includes('EGY'),
    'the ledgers agree: peace with Beirut, war with Cairo');
  ok(truceActive(ctx, 'ISR', 'LEB'), 'a five-year truce binds the leaver');
  ok(prov('Tyre').controller === 'LEB',
    'undemanded Lebanese land reverts — status quo with the leaver alone');
  ok(prov('Gaza').controller === 'ISR',
    'the Egyptian front keeps its lines: occupied Gaza stays occupied');
}

console.log('== a war-weary court signs a separate white peace ==');
{
  g.tags.SYR.warExhaustion = 16;
  const ev = evaluatePeaceDeal(ctx, war, 'ISR', { enemy: 'SYR' });
  ok(ev.acceptable, 'Damascus is ready to lay down arms: ' + ev.reason);
  executePeaceDeal(ctx, war, 'ISR', { enemy: 'SYR' });
  ok(!war.attackers.includes('SYR') && truceActive(ctx, 'ISR', 'SYR'),
    'Syria leaves the war for nothing but the truce');
  ok(prov('Damascus').owner === 'SYR' && prov('Damascus').controller === 'SYR',
    'a white separate peace moves no land');
}

console.log('== the last court standing gets no separate corridor ==');
{
  const lastWar = { ...war, attackers: ['EGY'], defenders: ['ISR'], warscore: war.warscore };
  const info = peaceDealInfo(ctx, lastWar, 'ISR', 'EGY');
  ok(!info.separate && info.separateTargets.length === 0,
    'with one enemy left, the only table is the one that ends the war');
  const ev = evaluatePeaceDeal(ctx, war, 'ISR', { enemy: 'JOR', subjugate: true });
  ok(!ev.subjugate, 'a subjugation demand in a separate deal is quietly refused');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
