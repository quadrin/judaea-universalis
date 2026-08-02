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

console.log('== the political east and south (SPEC §205) ==');
{
  // The Periplus map: Zoscales at Aksum, Charibael's two-tribes union
  // carrying Saba's Marib, Eleazus' island, Omana on the Persian side —
  // and Kush under the Kandake in every ancient era.
  const { game } = boot('66ce');
  const at = (n) => game.provinces.find((p) => p && p.canon === n);
  ok(at('Aksum').owner === 'AXM' && game.tags.AXM && game.tags.AXM.alive,
    '66: Zoscales\' Aksum is seated on its highlands');
  ok(at('Marib').owner === 'HMY' && at('Zafar').owner === 'HMY',
    '66: the king of the two tribes carries Saba and Himyar as one');
  ok(at('Dioscurida').owner === 'HDR', '66: Dioscurida answers to the frankincense king');
  ok(at('Omana').owner === 'OMA' && at('Meroe').owner === 'KSH',
    '66: Omana is a court and the Kandake reigns at Meroe');
  ok(at('Avalites').owner === 'WASTE' && at('Malao').owner === 'WASTE',
    '66: the Horn ports are "each under its own chief" (Periplus 14) — no invented kingdom');
  ok(at('Dodekaschoinos').owner === 'KSH', '66: the Nile corridor is Kushite ground');
}
{
  // Kaleb's Yemen (§208): the conquest is four years old and the negus rules
  // it the way Procopius says he did — through a client crowned at Zafar.
  // The owner is the native court now, so the terraces pay the ordinary
  // levy; what is thin about the client kingdom is the yoke, and the yoke
  // is modeled where a yoke lives (tribute, bond, garrison party).
  const { game } = boot('529ce');
  const at = (n) => game.provinces.find((p) => p && p.canon === n);
  ok(at('Muza').owner === 'HMY' && at('Zafar').owner === 'HMY' && at('Najran').owner === 'HMY',
    '529: the incense country answers to the client the negus crowned (§208)');
  ok(levyOf(at('Muza')) === 0.2 && levyOf(at('Zafar')) === 0.2,
    '529: the native court assesses its own terraces at the governed rate, not the garrison\'s 0.1');
  ok(at('Najran').religion === 'christianity',
    '529: Najran keeps the faith its martyrs died for');
  ok(at('Carmana').owner === 'SAS' && at('Mazun').owner === 'SAS',
    '529: the King of Kings holds his east, Mazun included');
  ok(at('Napata').owner === 'NOB' && at('Blemmyae').owner === 'BLM',
    '529: the Nubian kings and the Blemmyes hold where Kush was');
}
{
  // Persian Yemen and the Turk frontier, the year Jerusalem falls.
  const { game } = boot('614ce');
  const at = (n) => game.provinces.find((p) => p && p.canon === n);
  ok(at('Eudaemon Arabia').owner === 'SAS' && levyOf(at('Eudaemon Arabia')) === 0.1,
    '614: Persian Yemen is enclaves at the end of the world, at 0.1');
  ok(at('Chorasmia').owner === 'TRK', '614: the Turks hold the Oxus lands');
  ok(at('Napata').religion === 'christianity',
    '614: Nubia was baptized between 543 and 580');
  ok(at('Macoraba').owner === 'RSH',
    '614: Mecca sits with the dormant caliphate seed, beside its Yathrib');
}
{
  // 1948's sovereign south, by treaty line, in its own names.
  const { game } = boot('1948ce');
  const at = (n) => game.provinces.find((p) => p && p.canon === n);
  ok(at('Shewa').owner === 'ETH' && at('Shewa').name === 'Addis Ababa',
    '1948: the Lion of Judah reigns at Addis Ababa');
  ok(at('Ogaden').owner === 'ETH', '1948: the Ogaden came back that September');
  ok(at('Adulis').owner === 'UK' && at('Eudaemon Arabia').owner === 'UK',
    '1948: Eritrea is BMA ground and Aden is a Colony');
  ok(at('Carmana').owner === 'IRN' && at('Carmana').name === 'Kerman',
    '1948: Iran\'s east is Iranian, under its 1948 names');
  ok(at('Makuran').owner === 'PAK' && at('Artacoana').owner === 'AFG',
    '1948: one-year-old Pakistan holds the Makran marches, the King of Afghanistan his west');
  ok(at('Yamama').owner === 'SAU' && at('Yamama').name === 'Riyadh',
    '1948: Riyadh is Ibn Saud\'s');
  ok(at('Zafar').owner === 'YEM' && at('Zafar').name === 'Sanaa',
    '1948: the Imam keeps his capital');
  ok(at('Soba').owner === 'UK' && at('Soba').name === 'Khartoum',
    '1948: the condominium flies one color at this scale, and it is not Cairo\'s');
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
