// Headless regression — SPEC §231: the silhouettes are the map.
//
// §225 and §228 held folded adjacency identical and let "area drift" go,
// and the drift turned out to be the silhouettes of provinces those sections
// never named: their child cells took ground from NEIGHBOURING families —
// Douma from Batanea, Suwayda from Batanea, Mafraq (shipped at weight 1.30)
// from Bostra and Philadelphia — and Batanea came out a claw, displayed
// Gerasa an hourglass 2.3× its footprint. §231's rule: a carved district may
// take ground only from its own fold-family, so a parent loses ground to its
// own districts and never to another family's.
//
// This suite holds the restoration without a browser, three ways:
//   1. FAMILY AREAS. In the full-resolution snapshot, each §231 family's
//      area (parent + its §225/§228/§230 children) matches the parent's
//      pre-§225 area — constants baked from the §224 tree's own committed
//      snapshot — within tolerance. Batanea, with no children, must match
//      alone: the claw cannot come back without this failing.
//   2. THE SEEDS STAY TRIMMED. No Levant child of §225/§228 carries a weight
//      above 0.70 again. Mafraq and Qusayr shipped at 1.30; that class of
//      regression is one careless edit away, and this names it.
//   3. THE ROADS STILL RUN. Damascus reaches Palmyra and Emesa through the
//      Ghouta in the folded 66 CE map — pulling Douma back inside the
//      Damascus family was allowed to shrink it, not to sever it.
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

console.log('== the family areas match the pre-§225 map ==');
{
  // Pre-§225 areas, read from the §224 tree's committed geom-snapshot.json —
  // immutable history, safe as constants.
  const PRE = {
    'Batanea': 6704, 'Gadara': 1029, 'Gerasa': 2286, 'Philadelphia': 3920,
    'Damascus': 9388, 'Caesarea Philippi': 1726, 'Chalcis': 3554,
    'Emesa': 12387,
  };
  // family -> the §225/§228/§230 cells whose ground is that family's own.
  const KIDS = {
    'Batanea': [],
    'Gadara': [],
    'Gerasa': ['Mafraq'],
    'Philadelphia': ['Zarqa', 'Esbus'],
    'Damascus': ['Douma'],
    'Caesarea Philippi': ['Mount Hermon', 'Quneitra'],
    'Chalcis': ['Heliopolis'],
    'Emesa': ['Salamiyah', 'Qusayr'],
  };
  const TOL = 0.10; // warp jitter plus honest single-digit residue
  // Medaba is asserted alone: its child Characmoba deliberately reaches into
  // the exempt desert quadrant (§231), so the family SUM exceeds the old
  // parent by design — but the town's own cell must keep its core.
  const medaba = snap.areas[idOf('Medaba')] || 0;
  ok(medaba >= 3414 * 0.5 && medaba <= 3414 * 1.05,
    'Medaba keeps its core against its own district: ' + medaba + ' of pre-§225 3414');
  for (const [fam, kids] of Object.entries(KIDS)) {
    let area = snap.areas[idOf(fam)] || 0;
    for (const k of kids) area += snap.areas[idOf(k)] || 0;
    const want = PRE[fam];
    const off = Math.abs(area - want) / want;
    ok(off <= TOL, fam + (kids.length ? ' + ' + kids.join(' + ') : '')
      + ' = ' + area + ' vs pre-§225 ' + want + ' (' + (off * 100).toFixed(1) + '% off)');
  }
}

console.log('== the seeds stay trimmed ==');
{
  const TRIMMED = ['Douma', 'Suwayda', 'Mafraq', 'Qusayr', 'Salamiyah',
    'Quneitra', 'Mount Hermon', 'Heliopolis', 'Nabatieh', 'Bsharri',
    'Batroun', 'Akkar', 'Chouf', 'Jounieh'];
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
