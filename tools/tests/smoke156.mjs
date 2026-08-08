// Headless regression — SPEC §231/§232: the silhouettes are the map, and the
// map's phase is the v5.0 frame's.
//
// §231 found the §225/§228 children stealing neighbouring families' ground
// and pulled them home. §232 found the older wound: §160's frame growth
// translated every pixel and re-rolled the border wobble under unchanged
// seeds — Gerasa's triangle died of noise phase, not of cartography. The
// warp is anchored in the v5.0 frame's own coordinates now
// (MAP_DATA.warpAnchor), Mafraq's fold-parent is re-measured against the
// v5.4 raster (Bostra, not Gerasa — §228 measured it off the re-phased
// raster), and the family-area constants below come from the v5.4 tree's
// own committed snapshot, which is the oldest raster this map ever had.
//
// This suite holds the restoration without a browser, three ways:
//   1. FAMILY AREAS. Each family's area (parent + its carved children)
//      matches the parent's v5.4 area within tolerance. Batanea, with no
//      children, must match alone: the claw cannot come back silently.
//   2. THE SEEDS STAY TRIMMED. No carved Levant child carries a weight
//      above 0.70 again. Mafraq and Qusayr shipped at 1.30; that class of
//      regression is one careless edit away, and this names it.
//   3. THE ROADS STILL RUN. Damascus reaches Palmyra and Emesa through the
//      Ghouta in the folded 66 CE map — containment was allowed to shrink
//      the Ghouta, not to sever it.
import { readFileSync } from 'fs';
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { ERAS } = await import(R + '/js/data/compendium.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const P = MAP_DATA.provinces;
const idOf = (n) => P.findIndex((p) => p.name === n) + 1;
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
ok(snap.neighbors.length === P.length + 1,
  'the geometry snapshot is current for this atlas ('
  + (snap.neighbors.length - 1) + ' vs ' + P.length + ' cells)');

console.log('== the family areas match the v5.4 map ==');
{
  // v5.4 areas, read from the pre-§160 tree's committed geom-snapshot.json —
  // immutable history, safe as constants (§232).
  const PRE = {
    'Batanea': 6336, 'Gadara': 1197, 'Gerasa': 2324, 'Philadelphia': 4170,
    'Damascus': 8742, 'Caesarea Philippi': 1935, 'Chalcis': 2326,
    'Emesa': 13104,
  };
  // family -> the carved cells whose ground is that family's own. Mafraq is
  // NOT under Gerasa: §232 re-measured its ground against the v5.4 raster and
  // it is Bostra's, whose family the desert exemption covers.
  const KIDS = {
    'Batanea': [],
    'Gadara': [],
    'Gerasa': [],
    'Philadelphia': ['Zarqa', 'Esbus'],
    'Damascus': ['Douma'],
    'Caesarea Philippi': ['Mount Hermon', 'Quneitra'],
    'Chalcis': ['Heliopolis'],
    'Emesa': ['Salamiyah', 'Qusayr'],
  };
  const TOL = 0.12; // warp jitter, coastline redraws, honest small residue
  // Medaba is asserted alone: its child Characmoba deliberately reaches into
  // the exempt desert quadrant (§231), so the family SUM exceeds the old
  // parent by design — but the town's own cell must keep its core.
  const medaba = snap.areas[idOf('Medaba')] || 0;
  ok(medaba >= 3973 * 0.5 && medaba <= 3973 * 1.05,
    'Medaba keeps its core against its own district: ' + medaba + ' of v5.4 3973');
  for (const [fam, kids] of Object.entries(KIDS)) {
    let area = snap.areas[idOf(fam)] || 0;
    for (const k of kids) area += snap.areas[idOf(k)] || 0;
    const want = PRE[fam];
    const off = Math.abs(area - want) / want;
    ok(off <= TOL, fam + (kids.length ? ' + ' + kids.join(' + ') : '')
      + ' = ' + area + ' vs v5.4 ' + want + ' (' + (off * 100).toFixed(1) + '% off)');
  }
}

console.log('== the seeds stay trimmed ==');
{
  const TRIMMED = ['Douma', 'Suwayda', 'Mafraq', 'Qusayr', 'Salamiyah',
    'Quneitra', 'Mount Hermon', 'Heliopolis', 'Nabatieh', 'Bsharri',
    'Batroun', 'Akkar', 'Chouf', 'Jounieh', "Ma'alot", 'Esbus', 'Elusa'];
  const fat = TRIMMED.filter((n) => {
    const p = P[idOf(n) - 1];
    return p && p.weight > 0.70 + 1e-9;
  });
  ok(!fat.length, 'no §225/§228 Levant child above weight 0.70: '
    + (fat.length ? fat.map((n) => n + '=' + P[idOf(n) - 1].weight).join(', ') : 'all trimmed'));
}

console.log('== the roads still run ==');
{
  const bm = ERAS.find((e) => e.bookmark.id === '66ce').bookmark;
  const map = buildProvinceMapping(MAP_DATA, bm);
  const name = (i) => (P[i - 1] || {}).name;
  const nb = new Map();
  for (let i = 1; i < snap.neighbors.length; i++) {
    const t = name(map[i] || i); if (!t) continue;
    if (!nb.has(t)) nb.set(t, new Set());
    for (const j of snap.neighbors[i]) {
      const u = name(map[j] || j);
      if (u && u !== t) nb.get(t).add(u);
    }
  }
  for (const [a, via, b] of [['Damascus', 'Douma', 'Palmyra'], ['Damascus', 'Douma', 'Emesa']]) {
    ok(nb.get(a) && nb.get(a).has(via) && nb.get(via) && nb.get(via).has(b),
      'the ' + a + '–' + b + ' road runs through ' + via);
  }
}

console.log(failures ? `smoke156: ${failures} FAIL` : 'smoke156: ALL PASS');
process.exit(failures ? 1 : 0);
