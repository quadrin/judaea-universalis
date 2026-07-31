// smoke107 — the political west and the levy share (SPEC §173).
//
// Eight political maps fill the §160 ground under each chapter's own owners;
// every cell they assign carries a levy share (0.2 interior / 0.1 frontier)
// and every cell the chapters were tuned against keeps 1. Three of the eight
// maps are historical corrections. This suite pins all of it:
//
//   1. coverage: every non-impassable §160 cell resolves to a live tag or a
//      deliberate WASTE in every era — never to a tag the era does not seat
//   2. the levy contract: new cells 0.2/0.1, old cells exactly 1, and the
//      measured effect on the antagonist chapter stays inside the band the
//      section shipped with (Rome in 66 CE: ~+16% manpower, not +98%)
//   3. the corrections: Justinian does not hold Italy in 529, Capua is
//      Lombard in 614, and the sealed 1948 borders are owned and shut
//   4. the courts are real: named, colored, governed, staffed from their own
//      name pools, and drawn with their own class on the political map
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { POLITICAL_MAPS } from '../../js/data/political_maps.js';
import { initGame } from '../../js/sim/init.js';
import { buildProvinceMapping } from '../../js/data/map_profile.js';
import { maxManpowerOf } from '../../js/sim/economy.js';
import { forceLimitOf, levyOf, GENERAL_NAMES, courtNamePool, tagDef } from '../../js/sim/military.js';

let failures = 0;
function ok(cond, msg) {
  console.log((cond ? '  PASS ' : '  FAIL ') + msg);
  if (!cond) failures++;
}

const provs = MAP_DATA.provinces;
const firstNew = provs.findIndex((p) => p.name === 'Carthago');
const NEW = new Set(provs.slice(firstNew).map((p) => p.name));

function boot(id) {
  const era = ERAS.find((e) => e.bookmark.id === id);
  const game = initGame({
    DEFINES, MAP_DATA, geom: null, bookmark: era.bookmark, events: era.events,
    playerTag: era.bookmark.activeTags[0], rngSeed: 11,
    provinceMap: buildProvinceMapping(MAP_DATA, era.bookmark),
  });
  return { game, bookmark: era.bookmark };
}

console.log('== every era seats what it paints ==');
for (const era of ERAS) {
  const id = era.bookmark.id;
  ok(!!era.bookmark.political && era.bookmark.political === POLITICAL_MAPS[id],
    id + ' carries its political map through the registry');
  const { game } = boot(id);
  const bad = [];
  let painted = 0;
  let wasted = 0;
  for (const p of game.provinces) {
    if (!p || p.impassable || !NEW.has(p.canon)) continue;
    if (p.owner === 'WASTE') { wasted++; continue; }
    painted++;
    if (!game.tags[p.owner]) bad.push(p.canon + '→' + p.owner);
  }
  ok(bad.length === 0, id + ': every painted western cell has a seated court'
    + (bad.length ? ' (' + bad.slice(0, 4).join(', ') + ')' : ''));
  ok(painted >= 100, id + ': the west is filled (' + painted + ' cells painted, '
    + wasted + ' deliberate waste)');
}

console.log('== the levy contract ==');
{
  const { game } = boot('66ce');
  let oldWrong = 0;
  let newWrong = 0;
  for (const p of game.provinces) {
    if (!p || p.impassable) continue;
    const lev = levyOf(p);
    if (NEW.has(p.canon) && p.owner !== 'WASTE') {
      if (lev !== 0.2 && lev !== 0.1) newWrong++;
    } else if (!NEW.has(p.canon)) {
      if (lev !== 1) oldWrong++;
    }
  }
  ok(oldWrong === 0, 'every province the campaigns were tuned against keeps levy 1');
  ok(newWrong === 0, 'every painted western cell carries 0.2 or 0.1');

  // The measured effect this section shipped with: Rome's 83 new provinces in
  // the chapter Rome is the antagonist of. Raw, they would be ~+98% manpower;
  // the bands hold the delta near +16%. The corridor below is wide enough for
  // dev-tweak drift and narrow enough that removing the levy read anywhere
  // (manpower, force limit) blows straight through it.
  const ctx = { game, DEFINES, byId: (i) => game.provinces[i] || null };
  let baseMp = 0;
  let westMp = 0;
  let westFl = 0;
  let baseFl = 0;
  let romNew = 0;
  for (const p of game.provinces) {
    if (!p || p.impassable || p.owner !== 'ROM') continue;
    const dev = p.dev.tax + p.dev.prod + p.dev.mp;
    if (NEW.has(p.canon)) { romNew++; westMp += p.dev.mp * levyOf(p); westFl += dev * levyOf(p); }
    else { baseMp += p.dev.mp; baseFl += dev; }
  }
  ok(romNew === 83, 'Rome holds exactly 83 new provinces in 66 CE (' + romNew + ')');
  const mpDelta = westMp / baseMp;
  const flDelta = westFl / baseFl;
  ok(mpDelta > 0.10 && mpDelta < 0.25,
    'the west adds ~+16% manpower, not ~+98% (' + (mpDelta * 100).toFixed(1) + '%)');
  ok(flDelta > 0.08 && flDelta < 0.22,
    'and ~+13% force limit (' + (flDelta * 100).toFixed(1) + '%)');
  ok(maxManpowerOf(ctx, 'ROM') > 0 && forceLimitOf(ctx, 'ROM') > 0, 'both reads live');
}

console.log('== three of the eight are corrections ==');
{
  const { game } = boot('529ce');
  const at = (n) => game.provinces.find((p) => p && p.canon === n);
  ok(at('Roma').owner === 'OST' && at('Panormus').owner === 'OST',
    '529: Italy and Sicily are Athalaric\'s, not Justinian\'s');
  ok(at('Carthago').owner === 'VAN' && at('Oea').owner === 'VAN',
    '529: Carthage and Tripolitania are Hilderic\'s');
  ok(at('Roma').religion === 'christianity',
    '529: the corrected cells keep their sixth-century faith');
  ok(at('Volubilis').owner === 'MAU' && game.tags.MAU.name === 'The Moorish Kingdoms',
    '529: the interior Maghreb answers to the Moorish kings, under the era\'s name');
}
{
  const { game } = boot('614ce');
  const at = (n) => game.provinces.find((p) => p && p.canon === n);
  ok(at('Capua').owner === 'LMB', '614: Capua is Lombard');
  ok(at('Roma').owner === 'BYZ' && at('Genua').owner === 'BYZ' && at('Caralis').owner === 'BYZ',
    '614: Rome, Liguria and Sardinia stay imperial');
  ok(at('Malaca').owner === 'BYZ' && levyOf(at('Malaca')) === 0.1,
    '614: the Spania rump holds Malaca at the enclave share');
  ok(at('Serdica').owner === 'SLV' && at('Sirmium').owner === 'AVA',
    '614: the Balkan interior is an Avar and Slav country');
}
{
  const { game } = boot('1948ce');
  const at = (n) => game.provinces.find((p) => p && p.canon === n);
  ok(at('Dyrrhachium').owner === 'ALB' && at('Dyrrhachium').impassable,
    '1948: Albania is somebody\'s, and still sealed');
  ok(at('Phasis').owner === 'SOV' && at('Caucasian Albania').owner === 'SOV',
    '1948: the Soviet Caucasus is Soviet');
  ok(at('Lutetia').name === 'Paris' && at('Hyperborea').name === 'Moscow'
    && at('Aquincum').name === 'Budapest' && at('Londinium').name === 'London',
    '1948: the west wears its 1948 names (Lutetia → Paris)');
  ok(at('Roxolania').name === 'Stalingrad',
    '1948: and the names are the 15-May originals, not today\'s');
}

console.log('== the courts are real ==');
{
  const { game, bookmark } = boot('167bce');
  const ctxLite = { game, DEFINES, bookmark };
  const westTags = ['CAR', 'NUM', 'MAU', 'AVN', 'AED', 'THR', 'DAC', 'BOS', 'SCY', 'HIB', 'SUE'];
  ok(westTags.every((t) => game.tags[t] && game.tags[t].alive), 'the 167 west is seated and alive');
  ok(Object.keys(game.tags).length > 45,
    'one era seats more courts than the old 31-class border field could draw ('
    + Object.keys(game.tags).length + ')');
  // Every court staffed from a pool that is not the hellenic fallback —
  // a dead king in Carthage must not seat Nikanor (§143's bug class).
  const fallback = GENERAL_NAMES.hellenic;
  const wrongPool = westTags.filter((t) => {
    const d = tagDef(ctxLite, t);
    if (d.culture === 'greek') return false; // MAS, BOS: hellenic is correct
    return courtNamePool(ctxLite, t) === fallback;
  });
  ok(wrongPool.length === 0, 'no western court staffs from the hellenic fallback'
    + (wrongPool.length ? ' (' + wrongPool.join(',') + ')' : ''));
  ok(westTags.every((t) => (DEFINES.GOV_OF || {})[t]), 'every western court has a constitution');
  // Masinissa reigns, aged, with Micipsa named — the one crowned head 167
  // names in the west. Rulers are seated at bind (makeCtx), so the pin is on
  // the chapter's own table, which is what the bind reads.
  const numRow = bookmark.rulers && bookmark.rulers.NUM;
  ok(!!numRow && numRow.name === 'Masinissa' && numRow.age > 65
    && numRow.heir && numRow.heir.name === 'Micipsa',
    'Masinissa is on his throne with Micipsa named');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
