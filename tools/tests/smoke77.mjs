// Headless regression — SPEC §109: a released state has to be somewhere.
// Every assertion here runs against the REAL map adjacency (the geometry
// snapshot), because the bug this suite exists for is invisible on the empty
// adjacency graph the older peace-table suites build.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
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
function boot(bookmark, playerTag, seed = 5) {
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
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
  const events = (ERAS.find((e) => e.bookmark.id === bookmark.id) || {}).events || [];
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events, provinceMap });
  return { game, ctx, geom, events };
}
// Connected components over land adjacency — computed here independently of
// the engine, so the test is not marking its own homework.
function pieces(geom, ids) {
  const pool = new Set(ids);
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const stack = [id];
    const comp = [];
    seen.add(id);
    while (stack.length) {
      const cur = stack.pop();
      comp.push(cur);
      for (const n of (geom.neighbors[cur] || [])) {
        if (pool.has(n) && !seen.has(n)) { seen.add(n); stack.push(n); }
      }
    }
    out.push(comp);
  }
  return out.sort((a, b) => b.length - a.length);
}

console.log('== §109: every release the table offers is one piece of land ==');
{
  const { game, ctx, geom } = boot(BOOKMARK_167, 'HAS');
  mil.declareWar(ctx, 'HAS', 'SEL', 'the probe');
  const war = game.wars.find((w) => [].concat(w.attackers, w.defenders).includes('SEL'));
  // §247 gave every old name a war-score threshold, so a table opened the day
  // war is declared is empty on purpose. This suite is about GEOGRAPHY, and it
  // needs the rows: a war going well enough to redraw a map.
  war.warscore.HAS = 100;
  const rows = mil.releasableNations(ctx, war, 'HAS', 'SEL');
  ok(rows.length >= 8, 'the Seleucid empire is divisible into ' + rows.length + ' states');
  const broken = rows.filter((r) => pieces(geom, r.provIds).length > 1);
  ok(!broken.length, 'and not one of them is in two pieces ('
    + (broken.map((r) => r.tag + ':' + pieces(geom, r.provIds).length).join(', ') || 'none') + ')');
  ok(rows.every((r) => r.provIds.length >= 1), 'none is empty');
  // The case this suite was written for, in its §247 form: Phoenicia's ground
  // is a coastal ribbon and the Seleucid empire holds it in one hand, but the
  // list that names its provinces knows nothing whatever about geography.
  const pho = rows.find((r) => r.tag === 'PHO');
  ok(!!pho, 'Phoenicia is on offer');
  ok(pho && pieces(geom, pho.provIds).length === 1,
    'and it is one country rather than a census category ('
    + (pho ? pho.provIds.length : 0) + ' provinces)');
  // The seat must be inside the land being handed over.
  const seatOutside = rows.filter((r) => r.capitalId && !r.provIds.includes(r.capitalId));
  ok(!seatOutside.length, 'and every state is seated inside its own territory ('
    + (seatOutside.map((r) => r.tag).join(', ') || 'none') + ')');
}

console.log('== §109: a state grows along its own border ==');
{
  // Among the pieces a state could be given, it gets one that TOUCHES what it
  // already holds — so a second treaty enlarges a country instead of scattering
  // it. (Among several touching pieces the most valuable wins, which is why the
  // court used here is landless apart from the seat it is planted in: a real
  // regional power would legitimately border more than one pocket.)
  //
  // The vehicle used to be a synthetic cultural state keyed on
  // `releaseIdentity`; §247 retired those, so it is now a fallen historical
  // court — the other consumer of `contiguousRelease`, and the one whose rule
  // this always was. Nabataea's ten-province homeland is one piece with an
  // articulation at Hegra: take Hegra away and it is a seven-province north and
  // a two-province south with no land between them.
  const setup = (o, aliveAt) => {
    const g = o.game;
    const born = [];
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (p && !p.impassable && mil.eraOwnerOf(o.ctx, p) === 'NAB') born.push(i);
    }
    const cutId = born.find((i) => (g.provinces[i].canon || g.provinces[i].name) === 'Hegra');
    for (const i of born) {
      if (i === cutId) { g.provinces[i].owner = 'PTO'; g.provinces[i].controller = 'PTO'; continue; }
      g.provinces[i].owner = 'SEL';
      g.provinces[i].controller = 'SEL';
    }
    for (const a of mil.armiesOf(o.ctx, 'NAB')) delete g.armies[a.id];
    g.tags.NAB.alive = !!aliveAt;
    g.tags.NAB.overlord = null;
    if (aliveAt) { g.provinces[aliveAt].owner = 'NAB'; g.provinces[aliveAt].controller = 'NAB'; }
    mil.declareWar(o.ctx, 'HAS', 'SEL', 'the probe');
    const war = g.wars.find((w) => [].concat(w.attackers, w.defenders).includes('SEL'));
    war.warscore.HAS = 100;
    return { rows: mil.releasableNations(o.ctx, war, 'HAS', 'SEL'), born, cutId };
  };

  const a = boot(BOOKMARK_167, 'HAS');
  const first = setup(a, 0);
  const baseline = first.rows.find((r) => r.tag === 'NAB');
  ok(!!baseline, 'a fallen Nabataea whose homeland the Seleucids hold is on the table');
  ok(pieces(a.geom, baseline.provIds).length === 1, 'and the offer is one piece');
  const pockets = pieces(a.geom, first.born.filter((i) => i !== first.cutId));
  ok(pockets.length === 2, 'though the homeland itself is in two ('
    + pockets.map((c) => c.length).join(' + ') + ')');
  ok(baseline.provIds.length === Math.max(...pockets.map((c) => c.length)),
    'a court risen from nothing takes the larger pocket (' + baseline.provIds.length + ')');
  const small = pockets.slice().sort((x, y) => x.length - y.length)[0];

  // Now plant the court itself beside the SMALLER pocket, holding nothing else,
  // so exactly one piece touches it — and watch the offer move.
  const b = boot(BOOKMARK_167, 'HAS');
  let seatId = 0;
  for (const id of small) {
    for (const n of (b.geom.neighbors[id] || [])) {
      const q = b.game.provinces[n];
      if (q && !q.impassable && small.indexOf(n) < 0 && first.born.indexOf(n) < 0) { seatId = n; break; }
    }
    if (seatId) break;
  }
  ok(!!seatId, 'with a province beside the smaller pocket to seat the court in');
  const second = setup(b, seatId);
  const grown = second.rows.find((r) => r.tag === 'NAB');
  ok(!!grown, 'the table offers to enlarge the living court instead of restoring a fallen one');
  ok(grown && grown.kind === 'return', 'and calls it a return rather than a restoration');
  ok(grown && pieces(b.geom, grown.provIds).length === 1, 'still one piece');
  ok(grown && grown.provIds.some((id) => [...(b.geom.neighbors[id] || [])].includes(seatId)),
    'and the piece borders what that court already holds');
  ok(grown && grown.provIds.length === small.length
    && small.every((id) => grown.provIds.includes(id)),
    'it is one whole pocket (' + (grown ? grown.provIds.length : 0) + ' provinces)');
  ok(grown && !baseline.provIds.every((id) => grown.provIds.includes(id)),
    'and a different one from the offer made when the court held nothing ('
    + baseline.provIds.length + ' provinces elsewhere)');
}

console.log('== §109: the degenerate graph is not mistaken for an archipelago ==');
{
  // The older peace-table suites build `neighbors` as empty sets. That is not
  // a map of islands, it is an absence of information, and the release must
  // not fragment on it.
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_167);
  const N = MAP_DATA.provinces.length;
  const geom = {
    neighbors: Array.from({ length: N + 1 }, () => new Set()),
    centroids: [null, ...MAP_DATA.provinces.map(() => ({ x: 0, y: 0 }))],
    areas: new Int32Array(N + 1), bbox: [],
    coastal: [false, ...MAP_DATA.provinces.map(() => true)], offshore: [],
  };
  const events = (ERAS.find((e) => e.bookmark.id === '167bce') || {}).events || [];
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_167, events, playerTag: 'HAS', rngSeed: 5, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_167, events, provinceMap });
  mil.declareWar(ctx, 'HAS', 'SEL', 'the probe');
  const war = game.wars.find((w) => [].concat(w.attackers, w.defenders).includes('SEL'));
  war.warscore.HAS = 100; // §247's threshold; this block is about the graph
  const rows = mil.releasableNations(ctx, war, 'HAS', 'SEL');
  ok(rows.some((r) => r.provIds.length > 1),
    'with no adjacency data at all, releases keep their whole homeland');
}

console.log('== §109: the scripted secession is contiguous too ==');
{
  // `secedeTagCore` takes an authored province list rather than deriving one,
  // so the engine cannot fix it — but the authored list must still describe a
  // country. This is the check that catches an author, not a bug.
  const { game, ctx, geom, events } = boot(BOOKMARK_1948, 'ISR', 3);
  game.wars = [];
  for (const t of Object.values(game.tags)) if (t) t.atWarWith = [];
  const byId = (id) => events.find((e) => e && e.id === id);
  byId('ev_i_uar_union').options[0].effects(ctx);
  byId('ev_i_secession').options[0].effects(ctx);
  const ids = [];
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === 'SAR') ids.push(i);
  }
  ok(ids.length >= 10, 'Syria leaves the union with ' + ids.length + ' provinces');
  ok(pieces(geom, ids).length === 1, 'and they are one contiguous country');
  const egy = [];
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === 'EGY') egy.push(i);
  }
  ok(egy.length > 0 && pieces(geom, egy).length <= 2,
    'and what is left of Egypt is not shredded by the split ('
    + pieces(geom, egy).length + ' piece(s) — the Sinai/Negev frontier can leave two)');
}

console.log(failures ? `smoke77: ${failures} FAIL` : 'smoke77: ALL PASS');
process.exit(failures ? 1 : 0);
