// Headless regression — SPEC §300: an island can be annexed.
//
// §116 lets a demand reach only by land, from the claimant's own soil through
// the other demands. An island touches no land, so Cyprus, Crete, Sicily or
// Britain, taken by a landing and held to the bell, could never be put on the
// table. Now a side with a harbor reaches a coast on another landmass by sea:
//
//   - an occupied island province is on the table (Israel holding Cyprus);
//   - an island's inland province joins by land from its occupied coast, and
//     not without it;
//   - a side with no harbor cannot reach an island;
//   - the mainland is one landmass: central Iran is still out of Egypt's
//     reach (§116's case);
//   - a war ended by the sword (`annexable`) keeps an island the same way.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const EV = (ERAS.find((e) => e.bookmark.id === '1948ce') || {}).events || [];
function boot(playerTag = 'ISR', seed = 5) {
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);
  const N = snap.neighbors.length - 1;
  const to = (id) => provinceMap[id] || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  for (let id = 1; id <= N; id++) {
    const t = to(id);
    for (const nb of snap.neighbors[id]) {
      const tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  const geom = {
    neighbors,
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas), bbox: [],
  };
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_1948, events: EV, playerTag, rngSeed: seed, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_1948, events: EV, provinceMap });
  game.wars = [];
  for (const t of Object.values(game.tags)) if (t) t.atWarWith = [];
  return { game, ctx, geom };
}
const warOf = (game, a, b) => game.wars.find((w) => [].concat(w.attackers, w.defenders).includes(a)
  && [].concat(w.attackers, w.defenders).includes(b));

console.log('== an occupied island is on the table ==');
{
  const { game, ctx } = boot();
  mil.declareWar(ctx, 'ISR', 'UK', 'the probe');
  const war = warOf(game, 'ISR', 'UK');
  ok(!!war, 'Israel and Britain are at war');
  const cyprus = ['Salamis', 'Paphos'].map((n) => ctx.prov(n));
  ok(cyprus.every((p) => p && p.owner === 'UK' && ctx.geom.coastal[p.id]), 'Cyprus is British, and on the coast');
  ok(cyprus.every((p) => ![...ctx.geom.neighbors[p.id]].some((n) => !cyprus.some((q) => q.id === n))),
    'and it touches no land but itself');
  for (const p of cyprus) p.controller = 'ISR';
  const info = mil.peaceDealInfo(ctx, war, 'ISR', 'UK');
  const offered = new Set((info.provinces || []).map((r) => r.id));
  ok(cyprus.every((p) => offered.has(p.id)), 'held to the bell, both provinces are on the table: '
    + cyprus.map((p) => p.name + (offered.has(p.id) ? ' ✓' : ' ✗')).join(', '));
}

console.log('== an island\'s inland province joins from its coast ==');
{
  const { game, ctx } = boot();
  const inland = ctx.prov('Britannia');
  const coast = ctx.prov('Londinium');
  ok(inland && coast && !ctx.geom.coastal[inland.id] && ctx.geom.coastal[coast.id], 'Britain: an inland province and a coast');
  inland.owner = 'UK'; coast.owner = 'UK';
  mil.declareWar(ctx, 'ISR', 'UK', 'the probe');
  const war = warOf(game, 'ISR', 'UK');
  inland.controller = 'ISR';
  let offered = new Set((mil.peaceDealInfo(ctx, war, 'ISR', 'UK').provinces || []).map((r) => r.id));
  ok(!offered.has(inland.id), 'the inland province alone is not reached: no coast held');
  coast.controller = 'ISR';
  offered = new Set((mil.peaceDealInfo(ctx, war, 'ISR', 'UK').provinces || []).map((r) => r.id));
  ok(offered.has(coast.id) && offered.has(inland.id), 'with the coast held, both are on the table');
}

console.log('== a side with no harbor cannot reach an island ==');
{
  const { game, ctx } = boot();
  mil.declareWar(ctx, 'ISR', 'UK', 'the probe');
  const war = warOf(game, 'ISR', 'UK');
  const cyprus = ['Salamis', 'Paphos'].map((n) => ctx.prov(n));
  for (const p of cyprus) p.controller = 'ISR';
  // every province of Israel's side inland, for this one question
  const side = new Set([].concat(war.attackers).filter(Boolean));
  const coastal = ctx.geom.coastal.slice();
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && side.has(p.owner)) coastal[i] = false;
  }
  ctx.geom = { ...ctx.geom, coastal };
  ctx._landmass = undefined;
  const offered = new Set((mil.peaceDealInfo(ctx, war, 'ISR', 'UK').provinces || []).map((r) => r.id));
  ok(!cyprus.some((p) => offered.has(p.id)), 'no harbor of ours: Cyprus stays off the table');
}

console.log('== the mainland is one landmass: §116 still holds ==');
{
  const { game, ctx } = boot();
  mil.declareWar(ctx, 'EGY', 'IRN', 'the probe');
  const war = warOf(game, 'EGY', 'IRN');
  const far = ['Hyrcania', 'Gabae', 'Susa'].map((n) => ctx.prov(n)).filter(Boolean);
  for (const p of far) { p.owner = 'IRN'; p.controller = 'EGY'; }
  const offered = new Set((mil.peaceDealInfo(ctx, war, 'EGY', 'IRN').provinces || []).map((r) => r.id));
  const wrong = far.filter((p) => offered.has(p.id)).map((p) => p.name);
  ok(far.length === 3 && !wrong.length, 'Egypt still cannot be sold central Iran (' + (wrong.join(', ') || 'none offered') + '), coast or no coast');
}

console.log('== a war ended by the sword keeps an island ==');
{
  const { game, ctx } = boot();
  mil.declareWar(ctx, 'ISR', 'UK', 'the probe');
  const war = warOf(game, 'ISR', 'UK');
  const cyprus = ['Salamis', 'Paphos'].map((n) => ctx.prov(n));
  for (const p of cyprus) p.controller = 'ISR';
  const key = war.attackers.includes('ISR') ? 'att' : 'def';
  mil.endWarBySword(ctx, war, key);
  ok(cyprus.every((p) => p.owner === 'ISR'), 'the sword keeps what it holds across the water: '
    + cyprus.map((p) => p.name + ' → ' + p.owner).join(', '));
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
