// Headless regression — SPEC §230/§234: the neighbours' country, and the
// chapters that gave it back.
//
// §230 activated the carved districts in the seven ancient chapters to fix
// the province-count asymmetry around Judaea. §234 withdrew the activation:
// every carved cell renders as a Voronoi bubble inside its parent — no seed
// tuning changes that geometry — and the user chose clean provinces over
// district count. The districts remain 1948 content, where the density is
// the point; the ancient chapters read the §228 map again, at the v5.4 warp
// phase §233 restored. What this suite holds:
//
//   1. every §230 district — the sixteen once-activated latents and the six
//      §230 cells — FOLDS AWAY in all seven ancient chapters;
//   2. the six §230 cells are latent under the province their ground and
//      development came from, and active in 1948 like every latent cell;
//   3. no realm gained or lost a point of development anywhere: the ancient
//      chapters weigh exactly what they weighed before §229 existed, and
//      1948 pays its districts out of its own table;
//   4. the §228 roads are DIRECT again in the folded ancient map.
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

const ONCE_ACTIVE = ['Beersheba', 'Arad', 'Paran', 'Wadi Rum', 'Zoara', 'Shobak',
  'Azraq', 'Suwayda', 'Mount Hermon', 'Heliopolis', 'Douma', 'Salamiyah',
  'Akkar', 'Batroun', 'Nineveh', 'Kirkuk'];
const SIX = { 'Esbus': 'Philadelphia', 'Characmoba': 'Medaba', 'Auara': 'Petra',
  'Elusa': 'Oboda', 'Dedan': 'Hegra', 'Sirhan': 'Dumatha' };

console.log('== the atlas is well formed, and the six are latent ==');
{
  const w = validateMapData() || [];
  ok(!w.length, 'validateMapData is clean: ' + (w.slice(0, 4).join(' | ') || 'no warnings'));
  ok(snap.neighbors.length === P.length + 1,
    'the geometry snapshot is current for this atlas ('
    + (snap.neighbors.length - 1) + ' vs ' + P.length + ' cells)');
  const wrong = Object.entries(SIX)
    .filter(([kid, par]) => (byName.get(kid) || { p: {} }).p.latentParent !== par)
    .map(([kid, par]) => kid + '→' + ((byName.get(kid) || { p: {} }).p.latentParent || 'none'));
  ok(!wrong.length, 'the six §230 cells are latent under their carve-parents: '
    + (wrong.join(', ') || 'all correct'));
}

console.log('== the seven ancient chapters fold every district away ==');
for (const era of ERAS) {
  const bm = era.bookmark;
  if (bm.id === '1948ce') continue;
  const map = buildProvinceMapping(MAP_DATA, bm);
  const leaked = ONCE_ACTIVE.concat(Object.keys(SIX))
    .filter((n) => map[byName.get(n).id] === byName.get(n).id);
  ok(!leaked.length, bm.id + ': all twenty-two fold away — '
    + (leaked.join(', ') || 'none leaked'));
}

console.log('== no realm gained or lost a point anywhere ==');
{
  // The ancient chapters weigh exactly what they weighed before §229: the
  // §230 base-dev redistribution is reverted, so these are the §228 numbers.
  const WANT = {
    '167bce': { SEL: 843, PTO: 171, NAB: 71, ROM: 335, GRC: 151 },
    '67bce': { ROM: 744, PAR: 211, HYR: 164, ARI: 152, SEL: 194, NAB: 103, PTO: 158 },
    '40bce': { ROM: 1095, PAR: 343, ATG: 230, NAB: 92, HER: 68, PTO: 158 },
    '66ce': { ROM: 1719, PAR: 217, JUD: 140, NAB: 71, AGR: 31, ADI: 31 },
    '132ce': { ROM: 1874, PAR: 217, JUD: 68, NAB: 17 },
    // 529's phylarchate weighs twelve more than 614's for one reason, and it
    // is not a development change: §235 took Yathrib and Khaybar off the
    // RASHIDUN CALIPHATE, which this chapter was flying over them forty-one
    // years before Muhammad was born, and gave them to the Ghassanids who hold
    // every oasis around them. In 614 those two are the dormant Caliphate's
    // own home ground, so GHA is back to 53 there. No province's dev moved.
    '529ce': { BYZ: 1082, SAS: 324, GHA: 65, SAM: 21 },
    '614ce': { BYZ: 1089, SAS: 610, GHA: 53, JUD: 43 },
    '1948ce': { ISR: 183, JOR: 173, EGY: 213, SYR: 187, IRQ: 119, LEB: 131, SAU: 67 },
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

console.log('== the §228 roads are direct again ==');
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
  for (const [a, b] of [['Seleucia-Ctesiphon', 'Susa'], ['Seleucia-Ctesiphon', 'Ecbatana'],
    ['Damascus', 'Palmyra'], ['Damascus', 'Emesa'], ['Beroea', 'Carrhae'],
    ['Carrhae', 'Dura-Europos'], ['Petra', 'Aila']]) {
    ok(nb.get(a) && nb.get(a).has(b), 'the ' + a + '–' + b + ' road runs, one hop');
  }
}

console.log(failures ? `smoke155: ${failures} FAIL` : 'smoke155: ALL PASS');
process.exit(failures ? 1 : 0);
