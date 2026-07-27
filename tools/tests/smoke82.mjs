// Headless regression — SPEC §116 (a demand has to be somewhere) and §117
// (the length of the line costs something).
//
// Both come from one reported game. Iraq annexed parts of Egypt and Turkey
// parts of Lebanon, which made no sense; and Israel marched into Iraq and
// Saudi Arabia on foot, which made less. Tracing 1948 to 2002 reproduced worse:
// Egypt ending the century owning Hyrcania, Gabae and Susa in CENTRAL IRAN, and
// Jordan owning Hatra and Charax.
//
// Two independent causes. The peace table built its demandable list from
// occupation alone — `peaceDealInfo` asked who controlled a province and never
// asked where it was — so an army that had walked somewhere through a coalition
// war could keep it. And `traceSupply` floods the adjacency graph to depth 64,
// which is larger than the map, so a host was as well fed at the Gulf as at
// home and distance was structurally free.
//
// The subtle half of this suite is the RESTRAINT. The contiguity rule stands
// aside in two cases, both of them load-bearing, and a future tightening that
// removes either will show up here rather than in a broken campaign.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');
const { traceSupply, monthlySupply } = await import(R + '/js/sim/supply.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const EV = (ERAS.find((e) => e.bookmark.id === '1948ce') || {}).events || [];

// The REAL map. Every assertion about geography here has to run on the real
// adjacency, because the bug is invisible on anything else — and because the
// older suites' synthetic bead-chain geometry is exactly what the rule's
// restraint exists to survive.
function clearWars(game) {
  game.wars = [];
  for (const t of Object.values(game.tags)) if (t) t.atWarWith = [];
}
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
  return { game, ctx, geom };
}
// The bead chain the older suites build: real edges, meaningless ones.
function bootBeads(playerTag = 'ISR') {
  const N = MAP_DATA.provinces.length;
  const geom = {
    neighbors: Array.from({ length: N + 1 }, (_, i) => {
      const s = new Set();
      if (i > 1) s.add(i - 1);
      if (i >= 1 && i < N) s.add(i + 1);
      return s;
    }),
    centroids: [null, ...MAP_DATA.provinces.map(() => ({ x: 0, y: 0 }))],
    areas: new Int32Array(N + 1), bbox: [],
    coastal: [false, ...MAP_DATA.provinces.map(() => true)], offshore: [],
  };
  const bus = { emit() {}, on() { return () => {}; } };
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_1948, events: EV, playerTag, rngSeed: 5, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_1948, events: EV, provinceMap });
  return { game, ctx };
}
const idOf = (ctx, name) => { const p = ctx.prov(name); return p ? p.id : 0; };

console.log('== §116: a demand has to be somewhere ==');
{
  const { game, ctx } = boot();
  clearWars(game);
  // Egypt at war with Iran, and an Egyptian army standing in central Iran the
  // way the traced campaign left one. Occupation without a road home.
  mil.declareWar(ctx, 'EGY', 'IRN', 'the probe');
  const war = game.wars.find((w) => [].concat(w.attackers, w.defenders).includes('IRN'));
  ok(!!war, 'the war is on');
  const far = ['Hyrcania', 'Gabae', 'Susa'].map((n) => ctx.prov(n)).filter(Boolean);
  ok(far.length === 3, 'the three provinces the reported game handed Egypt exist');
  for (const p of far) { p.owner = 'IRN'; p.controller = 'EGY'; }
  const info = mil.peaceDealInfo(ctx, war, 'EGY', 'IRN');
  const offered = new Set((info.provinces || []).map((r) => r.id));
  const wrong = far.filter((p) => offered.has(p.id)).map((p) => p.canon);
  ok(!wrong.length, 'and the table will not sell Egypt central Iran ('
    + (wrong.join(', ') || 'none offered') + ')');
}

console.log('== §116: but occupation next door is still a claim ==');
{
  // The rule is about geography, not about denying conquest. A province the
  // claimant's own border touches is demandable exactly as before.
  const { game, ctx, geom } = boot();
  clearWars(game);
  mil.declareWar(ctx, 'EGY', 'JOR', 'the probe');
  const war = game.wars.find((w) => [].concat(w.attackers, w.defenders).includes('JOR'));
  // Find a Jordanian province that borders Egyptian soil, and occupy it.
  let border = 0;
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (!p || p.impassable || p.owner !== 'JOR') continue;
    if ([...(geom.neighbors[i] || [])].some((n) => {
      const q = game.provinces[n];
      return q && q.owner === 'EGY';
    })) { border = i; break; }
  }
  ok(!!border, 'Jordan has a province on Egypt\'s border ('
    + (border ? game.provinces[border].canon : 'none') + ')');
  game.provinces[border].controller = 'EGY';
  const info = mil.peaceDealInfo(ctx, war, 'EGY', 'JOR');
  ok((info.provinces || []).some((r) => r.id === border),
    'and holding it puts it on the table, as it always did');
}

console.log('== §116: a demand may chain outward through the other demands ==');
{
  // A corridor is a country's arm. Two provinces deep from the border is
  // reachable BECAUSE the one in between is also being demanded — otherwise
  // the rule would forbid every advance beyond one province.
  const { game, ctx, geom } = boot();
  clearWars(game);
  mil.declareWar(ctx, 'EGY', 'JOR', 'the probe');
  const war = game.wars.find((w) => [].concat(w.attackers, w.defenders).includes('JOR'));
  let first = 0;
  for (let i = 1; i < game.provinces.length && !first; i++) {
    const p = game.provinces[i];
    if (!p || p.impassable || p.owner !== 'JOR') continue;
    if ([...(geom.neighbors[i] || [])].some((n) => (game.provinces[n] || {}).owner === 'EGY')) first = i;
  }
  let second = 0;
  for (const n of (geom.neighbors[first] || [])) {
    const q = game.provinces[n];
    if (q && !q.impassable && q.owner === 'JOR' && n !== first) { second = n; break; }
  }
  ok(!!first && !!second, 'a first and second rank of Jordanian provinces');
  game.provinces[second].controller = 'EGY';
  let info = mil.peaceDealInfo(ctx, war, 'EGY', 'JOR');
  ok(!(info.provinces || []).some((r) => r.id === second),
    'the second rank alone is not demandable — nothing connects it');
  game.provinces[first].controller = 'EGY';
  info = mil.peaceDealInfo(ctx, war, 'EGY', 'JOR');
  const ids = new Set((info.provinces || []).map((r) => r.id));
  ok(ids.has(first) && ids.has(second),
    'occupy the province between and both are, because the corridor is the arm');
}

console.log('== §116: the restraint — a bead chain teaches the rule nothing ==');
{
  // The older suites build a geometry where province i borders i±1. Those edges
  // are REAL, so `geomHasEdges` cannot tell them from a map; applying the rule
  // to them would strike every demand off every table in half the battery. The
  // rule refuses the one outcome that is certainly wrong — a winner holding
  // enemy ground with nothing to ask for — and otherwise stands aside.
  const { game, ctx } = bootBeads();
  mil.declareWar(ctx, 'ISR', 'EGY', 'the probe');
  const war = game.wars.find((w) => [].concat(w.attackers, w.defenders).includes('EGY'));
  let held = 0;
  for (let i = 1; i < game.provinces.length && held < 3; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === 'EGY') { p.controller = 'ISR'; held++; }
  }
  ok(held > 0, 'Israel occupies ' + held + ' Egyptian provinces on a meaningless map');
  const info = mil.peaceDealInfo(ctx, war, 'ISR', 'EGY');
  ok((info.provinces || []).length > 0,
    'and the table is not empty — a rule that took everything would have learned nothing ('
    + (info.provinces || []).length + ' offered)');
}

console.log('== §116: the restraint — an authored border is not second-guessed ==');
{
  // A scripted settlement that supplies its own `keep` predicate has drawn the
  // line by hand. Rhodes says which cells sit inside the 1949 lines, and the
  // engine does not overrule the author.
  const { game, ctx } = bootBeads();
  const armistice = EV.find((e) => e && e.id === 'ev_i_armistice');
  ok(!!armistice, 'the armistice card exists');
  for (const name of ['Ascalon', 'Paran']) {
    const p = ctx.prov(name);
    if (p) p.controller = 'ISR';
  }
  armistice.options[0].effects(ctx);
  ok(ctx.prov('Ascalon').owner === 'ISR' && ctx.prov('Paran').owner === 'ISR',
    'Rhodes confirms what Rhodes says it confirms');
}

console.log('== §117: the length of the line costs something ==');
{
  const SUP = DEFINES.SUPPLY || {};
  ok(Number.isFinite(SUP.reachComfort) && Number.isFinite(SUP.reachAttrition)
    && Number.isFinite(SUP.reachCap), 'the reach is a balance number, not a constant in the code ('
    + SUP.reachComfort + '/' + SUP.reachAttrition + '/' + SUP.reachCap + ')');

  const { game, ctx, geom } = boot();
  // An army at home, and the same army as far from home as the map allows —
  // walking a corridor it controls the whole way, which is exactly how the
  // reported campaign reached Iraq.
  const home = idOf(ctx, 'Jerusalem');
  const a = game.armies[mil.spawnArmy(ctx, 'ISR', 'Jerusalem', { inf: 10, name: 'The Probe' })];
  ok(!!a, 'an Israeli army takes the field');
  monthlySupply(ctx);
  ok(a.oosMonths === 0, 'at home it is supplied');
  ok(num(a.supplyReach) <= 1, 'and its line is as short as a line gets ('
    + num(a.supplyReach) + ')');

  // The longest corridor the map actually offers: breadth-first from home over
  // passable land, take the deepest province, and hold every step of the path
  // to it — which is exactly what a campaign that conquers its way east does.
  const prev = new Map([[home, 0]]);
  let frontier = [home];
  let deepest = home;
  while (frontier.length) {
    const next = [];
    for (const cur0 of frontier) {
      for (const n of (geom.neighbors[cur0] || [])) {
        const q = game.provinces[n];
        if (!q || q.impassable || prev.has(n)) continue;
        prev.set(n, cur0);
        next.push(n);
        deepest = n;
      }
    }
    frontier = next;
  }
  const path = [];
  for (let at = deepest; at && at !== home; at = prev.get(at)) path.push(at);
  for (const id of path) game.provinces[id].controller = 'ISR';
  const steps = path.length;
  const cur = deepest;
  ok(steps >= 10, 'it stands ' + steps + ' provinces from home over ground it holds');
  a.prov = cur;
  monthlySupply(ctx);
  ok(a.oosMonths === 0, 'the line still reaches — this is not a hard cutoff');
  ok(num(a.supplyReach) > num(SUP.reachComfort),
    'but it is now ' + num(a.supplyReach) + ' provinces long, past the comfortable reach of '
    + SUP.reachComfort);

  // And the length is paid for. Run the attrition month and compare.
  const before = a.men;
  mil.monthlyAttrition(ctx);
  const lostFar = before - a.men;
  const b = game.armies[mil.spawnArmy(ctx, 'ISR', 'Jerusalem', { inf: 10, name: 'The Home Guard' })];
  monthlySupply(ctx);
  const bBefore = b.men;
  mil.monthlyAttrition(ctx);
  const lostHome = bBefore - b.men;
  ok(lostFar > lostHome,
    'the far host bleeds for the distance (' + lostFar + ' men against ' + lostHome
    + ' at home) — the march is possible and it is expensive');
}
function num(v) { return Number.isFinite(+v) ? +v : 0; }

console.log(failures ? `smoke82: ${failures} FAIL` : 'smoke82: ALL PASS');
process.exit(failures ? 1 : 0);
