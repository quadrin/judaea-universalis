// Headless regression — SPEC §229: the neighbours' country, at the resolution
// Judea is played at.
//
// §225 and §228 raised the northern frontier and the three eastern states for
// 1948 alone, under an invariant that the seven older chapters see nothing.
// §229 is the section that opens that ground to the ancient chapters too:
// sixteen districts that already existed as cells and were visible only in
// 1948, and nine wholly new cells for Decapolis and Nabataean ground the atlas
// had none for. What this suite holds:
//
//   1. every §229 district is a province in all seven ancient chapters, under
//      the crown that holds the province it was carved out of;
//   2. no realm gained a point of development by being drawn finer — the
//      national totals are what they were before the section;
//   3. 1948 is untouched, to the point, in all six states smoke153 names;
//   4. the roads the §228 search protected still run;
//   5. the districts left latent (Ottoman Lebanon, Islamic Iraq, the modern
//      Negev towns) still fold away in the ancient chapters.
import { readFileSync } from 'fs';
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA, validateMapData } = await import(R + '/js/data/map_data.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame } = await import(R + '/js/sim/init.js');
const { ERAS } = await import(R + '/js/data/compendium.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const P = MAP_DATA.provinces;
const byName = new Map(P.map((p, i) => [p.name, { p, id: i + 1 }]));
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));

// The sixteen that already existed as cells, and the nine this section added.
const OPENED = ['Beersheba', 'Arad', 'Paran', 'Wadi Rum', 'Zoara', 'Shobak',
  'Azraq', 'Suwayda', 'Mount Hermon', 'Heliopolis', 'Douma', 'Salamiyah',
  'Akkar', 'Batroun', 'Nineveh', 'Kirkuk'];
const NEW_CELLS = ['Hippos', 'Abila', 'Dion', 'Esbus', 'Characmoba', 'Auara',
  'Elusa', 'Dedan', 'Sirhan'];
// child -> the province its development came out of
const CARVED = {
  'Beersheba': 'Oboda', 'Arad': 'Adora', 'Paran': 'Aila', 'Wadi Rum': 'Aila',
  'Zoara': 'Petra', 'Shobak': 'Petra', 'Azraq': 'Bostra', 'Suwayda': 'Bostra',
  'Mount Hermon': 'Caesarea Philippi', 'Heliopolis': 'Chalcis', 'Douma': 'Damascus',
  'Salamiyah': 'Emesa', 'Akkar': 'Tripolis', 'Batroun': 'Byblos',
  'Nineveh': 'Hatra', 'Kirkuk': 'Arbela',
  'Hippos': 'Gadara', 'Abila': 'Gadara', 'Dion': 'Gerasa', 'Esbus': 'Philadelphia',
  'Characmoba': 'Medaba', 'Auara': 'Petra', 'Elusa': 'Oboda', 'Dedan': 'Hegra',
  'Sirhan': 'Dumatha',
};

console.log('== the atlas is well formed ==');
{
  const w = validateMapData() || [];
  ok(!w.length, 'validateMapData is clean: ' + (w.slice(0, 4).join(' | ') || 'no warnings'));
  const missing = OPENED.concat(NEW_CELLS).filter((n) => !byName.has(n));
  ok(!missing.length, 'every §229 district is on the map: ' + (missing.join(', ') || 'all present'));
  // The nine new cells are appended, so nothing that existed moved id.
  const lowest = Math.min(...NEW_CELLS.map((n) => byName.get(n).id));
  ok(lowest > 407, 'the nine new cells are appended past the whole §228 atlas (lowest id ' + lowest + ')');
  // …and they are NOT latent: this section's cells are provinces everywhere.
  const latent = NEW_CELLS.filter((n) => byName.get(n).p.latentParent);
  ok(!latent.length, 'and none of them is latent: ' + (latent.join(', ') || 'all permanent'));
  ok(snap.neighbors.length === P.length + 1,
    'the geometry snapshot is current for this atlas ('
    + (snap.neighbors.length - 1) + ' vs ' + P.length + ' cells)');
}

console.log('== the seven ancient chapters have them, under the right crown ==');
{
  const eff = (bm, n) => {
    const o = bm.owners && bm.owners[n]; if (o) return o;
    const pol = bm.political && bm.political.owners && bm.political.owners[n]; if (pol) return pol;
    return (byName.get(n) || { p: {} }).p.owner || 'WASTE';
  };
  for (const era of ERAS) {
    const bm = era.bookmark;
    if (bm.id === '1948ce') continue;
    const map = buildProvinceMapping(MAP_DATA, bm);
    const absent = OPENED.concat(NEW_CELLS)
      .filter((n) => map[byName.get(n).id] !== byName.get(n).id);
    ok(!absent.length, bm.id + ': all twenty-five are provinces — '
      + (absent.join(', ') || 'none folded away'));
    // each stands under whoever holds the ground it was carved from
    const wrong = [];
    for (const [kid, par] of Object.entries(CARVED)) {
      // a chapter may merge the parent away (Gamala, Machaerus); skip those
      if (map[byName.get(par).id] !== byName.get(par).id) continue;
      if (eff(bm, kid) !== eff(bm, par)) wrong.push(kid + '=' + eff(bm, kid) + ' vs ' + par + '=' + eff(bm, par));
    }
    ok(!wrong.length, '  and each under its parent\'s crown: ' + (wrong.join(', ') || 'all match'));
  }
}

console.log('== no realm gained a point by being drawn finer ==');
{
  // The national development totals as they stood before §229 touched the
  // atlas. A district carved out of a province takes its development with it
  // (SPEC §47), and this section does it in the BASE atlas, so the sum is
  // conserved in all seven ancient eras at once.
  const WANT = {
    '167bce': { SEL: 843, PTO: 171, NAB: 71, ROM: 335, GRC: 151 },
    '67bce': { ROM: 744, PAR: 211, HYR: 164, ARI: 152, SEL: 194, NAB: 103, PTO: 158 },
    '40bce': { ROM: 1095, PAR: 343, ATG: 230, NAB: 92, HER: 68, PTO: 158 },
    '66ce': { ROM: 1719, PAR: 217, JUD: 140, NAB: 71, AGR: 31, ADI: 31 },
    '132ce': { ROM: 1874, PAR: 217, JUD: 68, NAB: 17 },
    '529ce': { BYZ: 1082, SAS: 324, GHA: 53, SAM: 21 },
    '614ce': { BYZ: 1089, SAS: 610, GHA: 53, JUD: 43 },
    // …and 1948, which pays for its own districts and must not move a point.
    '1948ce': { ISR: 183, JOR: 173, EGY: 213, SYR: 187, IRQ: 119, LEB: 131 },
  };
  for (const era of ERAS) {
    const bm = era.bookmark;
    const want = WANT[bm.id];
    if (!want) continue;
    const map = buildProvinceMapping(MAP_DATA, bm);
    const game = initGame({
      DEFINES, MAP_DATA, geom: null, bookmark: bm, events: era.events,
      playerTag: bm.playableTags[0].tag, rngSeed: 1, provinceMap: map,
    });
    const dev = {};
    for (const p of game.provinces) {
      if (!p || p.impassable) continue;
      dev[p.owner] = (dev[p.owner] || 0) + p.dev.tax + p.dev.prod + p.dev.mp;
    }
    const bad = Object.entries(want).filter(([t, n]) => dev[t] !== n)
      .map(([t, n]) => t + ' ' + dev[t] + '≠' + n);
    ok(!bad.length, bm.id + ': every realm opens on the development it always had — '
      + (bad.join(', ') || Object.keys(want).join(' ') + ' all exact'));
  }
}

console.log('== the roads still run, and the latent stay latent ==');
{
  const nameOf = (i) => (P[i - 1] || {}).name;
  const foldedFor = (bookmark) => {
    const map = buildProvinceMapping(MAP_DATA, bookmark);
    const nb = new Map();
    for (let i = 1; i < snap.neighbors.length; i++) {
      const t = nameOf(map[i] || i); if (!t) continue;
      if (!nb.has(t)) nb.set(t, new Set());
      for (const j of snap.neighbors[i]) {
        const u = nameOf(map[j] || j);
        if (u && u !== t) nb.get(t).add(u);
      }
    }
    return nb;
  };
  const anc = foldedFor(ERAS.find((e) => e.bookmark.id === '66ce').bookmark);
  for (const [a, b] of [['Seleucia-Ctesiphon', 'Susa'], ['Seleucia-Ctesiphon', 'Ecbatana'],
    ['Beroea', 'Carrhae'], ['Carrhae', 'Dura-Europos']]) {
    ok(anc.get(a) && anc.get(a).has(b), 'the ' + a + '–' + b + ' road survives this section');
  }
  // Damascus reaches Palmyra and Emesa through the Ghouta now — the district
  // sits ON that road, which is where it physically ran.
  for (const [a, via, b] of [['Damascus', 'Douma', 'Palmyra'], ['Damascus', 'Douma', 'Emesa']]) {
    ok(anc.get(a) && anc.get(a).has(via) && anc.get(via) && anc.get(via).has(b),
      'the ' + a + '–' + b + ' road runs through ' + via + ', and still runs');
  }
  // Every new cell has real geometry: area and neighbours from the raster.
  const empty = NEW_CELLS.filter((n) => {
    const id = byName.get(n).id;
    return !(snap.areas[id] > 0) || !(snap.neighbors[id] || []).length;
  });
  ok(!empty.length, 'every new cell has area and neighbours in the raster: '
    + (empty.join(', ') || 'all seated'));
  // The genuinely modern districts still fold away in antiquity.
  const STILL_LATENT = ['Dimona', 'Mitzpe Ramon', 'Eilat', 'Chouf', 'Jounieh',
    'Bsharri', 'Nabatieh', 'Zarqa', 'Mafraq', 'Ruwayshid', 'Idlib', 'Qusayr',
    'Sulaymaniyah', 'Baquba', 'Najaf', 'Kut', 'Samawa', 'Amara'];
  const map66 = buildProvinceMapping(MAP_DATA, ERAS.find((e) => e.bookmark.id === '66ce').bookmark);
  const leaked = STILL_LATENT.filter((n) => byName.has(n)
    && map66[byName.get(n).id] === byName.get(n).id);
  ok(!leaked.length, 'and the modern districts still fold away in 66 CE: '
    + (leaked.join(', ') || 'all latent'));
}

console.log(failures ? `smoke154: ${failures} FAIL` : 'smoke154: ALL PASS');
process.exit(failures ? 1 : 0);
