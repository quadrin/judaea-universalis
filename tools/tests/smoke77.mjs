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
  const rows = mil.releasableNations(ctx, war, 'HAS', 'SEL');
  ok(rows.length >= 8, 'the Seleucid empire is divisible into ' + rows.length + ' states');
  const broken = rows.filter((r) => pieces(geom, r.provIds).length > 1);
  ok(!broken.length, 'and not one of them is in two pieces ('
    + (broken.map((r) => r.tag + ':' + pieces(geom, r.provIds).length).join(', ') || 'none') + ')');
  ok(rows.every((r) => r.provIds.length >= 1), 'none is empty');
  // The specific case that was reported: culture and faith say nothing about
  // geography, and the Greek provinces of a Seleucid empire are scattered from
  // Anatolia to Gaza.
  const greek = rows.find((r) => /Greek/.test(r.name));
  ok(!!greek, 'a Greek state is on offer');
  ok(pieces(geom, greek.provIds).length === 1,
    'and it is one country rather than a census category ('
    + greek.provIds.length + ' provinces)');
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
  const openWar = (o) => {
    mil.declareWar(o.ctx, 'HAS', 'SEL', 'the probe');
    const war = o.game.wars.find((w) => [].concat(w.attackers, w.defenders).includes('SEL'));
    return mil.releasableNations(o.ctx, war, 'HAS', 'SEL');
  };
  const a = boot(BOOKMARK_167, 'HAS');
  const baseline = openWar(a).find((r) => /Greek/.test(r.name));
  ok(!!baseline, 'with no Greek court on the map the table offers a new Greek state');
  ok(pieces(a.geom, baseline.provIds).length === 1, 'and it is one piece');
  const chosen = new Set(baseline.provIds);

  const b = boot(BOOKMARK_167, 'HAS');
  // A Greek pocket the baseline did NOT take, and a province beside it.
  const greek = [];
  for (let i = 1; i < b.game.provinces.length; i++) {
    const p = b.game.provinces[i];
    if (p && !p.impassable && p.owner === 'SEL'
      && p.culture === 'greek' && p.religion === 'hellenism') greek.push(i);
  }
  const pockets = pieces(b.geom, greek).filter((c) => !c.some((id) => chosen.has(id)));
  ok(pockets.length > 0, 'the empire has ' + pockets.length
    + ' further Greek pocket(s) the baseline left behind');
  const target = pockets[pockets.length - 1];
  let seatId = null;
  for (const id of target) {
    for (const n of (b.geom.neighbors[id] || [])) {
      const q = b.game.provinces[n];
      if (q && !q.impassable && greek.indexOf(n) < 0) { seatId = n; break; }
    }
    if (seatId) break;
  }
  ok(!!seatId, 'with a province beside it to seat a court in');

  // A court with NO other territory, so exactly one piece can touch it.
  const HOST = 'ITU';
  const host = b.game.tags[HOST];
  host.alive = true;
  host.releaseIdentity = 'greek|hellenism';
  for (let i = 1; i < b.game.provinces.length; i++) {
    const p = b.game.provinces[i];
    if (p && p.owner === HOST) { p.owner = 'SEL'; p.controller = 'SEL'; }
  }
  b.game.provinces[seatId].owner = HOST;
  b.game.provinces[seatId].controller = HOST;

  const grown = openWar(b).find((r) => r.tag === HOST);
  ok(!!grown, 'the table offers to enlarge the living court instead of founding a new one');
  ok(pieces(b.geom, grown.provIds).length === 1, 'still one piece');
  ok(grown.provIds.some((id) => [...(b.geom.neighbors[id] || [])].includes(seatId)),
    'and the piece borders what that court already holds');
  // It is exactly one of the pockets — a whole one, not a mixture — and it is
  // not the pocket the table offered when this court did not exist.
  const isWholePocket = pockets.concat([[...chosen]]).some((pk) =>
    pk.length === grown.provIds.length && pk.every((id) => grown.provIds.includes(id)));
  ok(isWholePocket, 'the offer is one whole pocket (' + grown.provIds.length + ' provinces)');
  ok(!baseline.provIds.every((id) => grown.provIds.includes(id)),
    'and a different one from the offer made when no such court existed ('
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
