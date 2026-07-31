// smoke108 — a nation is named where it is (SPEC §173 follow-up).
//
// The nation-label anchor used to be one area-weighted centroid over every
// owned province, and the midpoint of an empire is mostly water: 1948
// Britain (home islands + Cyprus + Libya) was labeled in the Tyrrhenian sea,
// France (métropole + the Maghreb + the Fezzan) in the western
// Mediterranean. labels.js now anchors each realm on its principal landmass
// — connected components by land adjacency, chosen by development (a realm
// is principally where its people are; by area the Marmarican desert
// out-labels the home islands), with the capital's component taking the
// name only against a near-tie (Copenhagen over Jutland; NOT Salamis over
// Britain).
//
// The contract pinned here is the bug class, not the layout: every placed
// nation label must sit on or near the realm's own land — within reach of
// one of its own provinces' centroids — in every era. Plus the three 1948
// anchors that were visibly wrong, by name.
import { readFileSync } from 'fs';
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');

// labels.js pools DOM divs; give it the two properties it actually touches.
global.document = {
  createElement: () => ({ style: {} }),
};

const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { createLabels } = await import(R + '/js/map/labels.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const N = snap.neighbors.length - 1;

function boot(id) {
  const era = ERAS.find((e) => e.bookmark.id === id);
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
  // Fold the full-resolution snapshot per bookmark, exactly as autorun does.
  const to = (i) => provinceMap[i] || i;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  for (let i = 1; i <= N; i++) {
    const t = to(i);
    for (const nb of snap.neighbors[i]) {
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
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events,
    playerTag: era.bookmark.activeTags[0], rngSeed: 9, provinceMap,
  });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: era.bookmark, events: era.events, provinceMap });
  return { ctx, geom, game };
}

function placeLabels(ctx, geom) {
  const placed = [];
  const el = { appendChild: (d) => placed.push(d), style: {} };
  const labels = createLabels(el, MAP_DATA, geom);
  const camera = {
    zoom: 0.55, // below the province-label threshold: nation names render
    viewport: { w: 40000, h: 40000 },
    mapToScreen: (x, y) => [x, y], // identity — screen px are map px
  };
  labels.update(ctx, camera, 'political');
  const out = new Map();
  for (const d of placed) {
    if (!d._shown || !d._text) continue;
    const m = /translate\((-?\d+)px, (-?\d+)px\)/.exec(d._tr || '');
    if (m) out.set(d._text, [Number(m[1]), Number(m[2])]);
  }
  return out;
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

console.log('== every nation label sits on its realm\'s own land ==');
// One map pixel is ~1.1 km; 700 px is the visual reach of a big label's
// glyphs — far under the ~1,600 px the Tyrrhenian miss measured.
const NEAR = 700;
for (const id of ['167bce', '66ce', '529ce', '1948ce']) {
  const { ctx, geom, game } = boot(id);
  const labels = placeLabels(ctx, geom);
  ok(labels.size >= 8, id + ': ' + labels.size + ' nation labels placed');
  let far = 0;
  const offenders = [];
  for (const [name, pos] of labels) {
    let nearest = Infinity;
    for (let i = 1; i < game.provinces.length; i++) {
      const p = game.provinces[i];
      if (!p || p.impassable) continue;
      // Same fallback as labels.js: a painted-but-unseated owner (529's
      // dormant Hejaz) is named from the catalog.
      const t = game.tags[p.owner] || DEFINES.TAGS[p.owner];
      if (!t || ((t.name || p.owner) !== name)) continue;
      const c = geom.centroids[i];
      if (!c) continue;
      nearest = Math.min(nearest, dist(pos, [c.x, c.y]));
    }
    if (nearest > NEAR) { far++; offenders.push(name + '@' + Math.round(nearest)); }
  }
  ok(far === 0, id + ': every label within ' + NEAR + 'px of its own land'
    + (far ? ' (' + offenders.slice(0, 4).join(', ') + ')' : ''));
}

console.log('== the three 1948 anchors that were visibly wrong ==');
{
  const { ctx, geom } = boot('1948ce');
  const labels = placeLabels(ctx, geom);
  const at = (canon) => {
    const i = ctx.provId(canon);
    const c = geom.centroids[i];
    return [c.x, c.y];
  };
  const brit = labels.get('Britain');
  ok(!!brit && dist(brit, at('Londinium')) < dist(brit, at('Salamis'))
    && dist(brit, at('Londinium')) < dist(brit, at('Cyrene')),
    'BRITAIN is named on the island, not at its Cyprus seat or over Libya');
  const fra = labels.get('France');
  ok(!!fra && dist(fra, at('Lutetia')) < dist(fra, at('Icosium')),
    'FRANCE is named on the métropole, not over Algeria');
  const den = labels.get('Denmark');
  ok(!!den && dist(den, at('Selandia')) <= dist(den, at('Cimbria')),
    'DENMARK is named at Copenhagen — the capital still breaks the near-tie');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
