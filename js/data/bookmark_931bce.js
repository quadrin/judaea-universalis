// Judaea Universalis — bookmark: The Kingdom Divided, 931 BCE (SPEC §268).
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
//
// Historical spine: Solomon dies. His son goes north to Shechem to be made
// king over all Israel and is asked, by an assembly that has just buried the
// man who conscripted it, to lighten the yoke. He answers with the sentence
// the sources preserve word for word — "my father chastised you with whips,
// but I will chastise you with scorpions" — and the ten tribes walk out. The
// man they call back from exile in Egypt to lead them, Jeroboam son of Nebat,
// builds two golden calves at Bethel and Dan so that nobody in his kingdom
// ever needs to go up to Jerusalem to sacrifice again. Five years later
// Shoshenq I comes north out of Egypt and takes tribute from both of them,
// and writes a hundred and fifty town names on a wall at Karnak to prove it.
//
// This is the chapter the game did not have: the one where the Jewish state
// is TWO Jewish states, and the question is not whether they survive an
// empire but whether they can survive each other. Everything the other eight
// chapters treat as settled — one people, one altar, one crown, one enemy —
// is in dispute here, and the sources on both sides are inside the same book.
//
// Sources: 1 Kings 11-22 and 2 Kings 1-17; 2 Chronicles 10-28; the Bubastite
// Portal at Karnak for Shoshenq's list; the Mesha stele for Moab; the Tel Dan
// inscription for the house of David as its enemies wrote it; the Kurkh
// monolith of Shalmaneser III for Ahab's two thousand chariots at Qarqar; the
// Samaria ostraca for the northern kingdom's own administration; the Assyrian
// eponym lists; and the excavated gates and stables at Megiddo, Hazor and
// Gezer, whose dating is the oldest argument in Levantine archaeology and
// which this chapter does not try to settle.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[bookmark_931bce] ' + key, e || '');
}

// The letters this court answers to NOW (SPEC §135). A realm that has taken a
// greater crown files its provinces, armies and wars under the new tag, while
// this chapter was written against the old one; the sim keeps the forwarding
// address and hands it back through ctx.helpers. Defensive about `helpers`
// because the content packages are also read cold, with no game to resolve
// against.
function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
}

function warTag(game, t) {
  if (!game || !t) return t;
  if (game.tags && game.tags[t]) return t;
  const to = game.tagAliases && game.tagAliases[t];
  return (to && game.tags && game.tags[to]) ? to : t;
}

function findWar(game, a, b) {
  const x = warTag(game, a);
  const y = warTag(game, b);
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(x) !== -1 && all.indexOf(y) !== -1) return w;
  }
  return null;
}

function totalMen(ctx, tag) {
  try {
    return ctx.helpers.armiesOf(ctx, tag).reduce((s, a) => s + ((a && a.men) || 0), 0);
  } catch (e) { warnOnce('totalMen', e); return 0; }
}

// Era-idea tiers a court has taken up (SPEC §179), read off the tag.
function eraTiers(t) {
  const o = (t && t.eraIdeas) || {};
  let n = 0;
  for (const k of Object.keys(o)) n += Math.max(0, o[k] | 0);
  return n;
}

// ── What the civil band reads (SPEC §211) ───────────────────────────────────
function crown(ctx, tag) {
  try { return (ctx.game.tags && ctx.game.tags[who(ctx, tag)]) || {}; } catch (e) { warnOnce('crown', e); return {}; }
}

function ownedDev(ctx, tag) {
  try {
    const g = ctx.game;
    const t = who(ctx, tag);
    let n = 0;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable || p.owner !== t) continue;
      const d = p.dev || {};
      n += (d.tax | 0) + (d.prod | 0) + (d.mp | 0);
    }
    return n;
  } catch (e) { warnOnce('ownedDev', e); return 0; }
}

function standingRank(ctx, tag) {
  try {
    const ord = (ctx.game.standing && ctx.game.standing.order) || [];
    return ord.indexOf(who(ctx, tag));
  } catch (e) { warnOnce('standingRank', e); return -1; }
}

function regard(ctx, from, of) {
  try {
    const t = (ctx.game.tags && ctx.game.tags[who(ctx, from)]) || null;
    const op = (t && t.opinion) || {};
    const live = op[who(ctx, of)];
    const v = Number.isFinite(live) ? live : op[of];
    return Number.isFinite(v) ? v : 0;
  } catch (e) { warnOnce('regard', e); return 0; }
}

function setOpinion(game, a, b, val) {
  try {
    const ta = game.tags && game.tags[a];
    if (!ta) return;
    if (!ta.opinion || typeof ta.opinion !== 'object') ta.opinion = {};
    ta.opinion[b] = Math.max(-200, Math.min(200, val));
  } catch (e) { warnOnce('setOpinion', e); }
}

function dateGE(date, y, m) {
  return date.y > y || (date.y === y && date.m >= m);
}

// The roads not taken (SPEC §183): hypothetical missions read the same flags
// the fork cards themselves set (SPEC §119) — one source of truth.
function anyFlag(ctx, ...keys) {
  const f = (ctx.game && ctx.game.flags) || {};
  for (const k of keys) if (f[k]) return true;
  return false;
}

// How many provinces this court holds that still sacrifice to YHWH. The
// chapter's own measure of itself: both kingdoms are Israelite states, and
// the argument the book of Kings is having is about the altars, not the flag.
function faithfulProvinces(ctx, tag) {
  try {
    const g = ctx.game;
    const held = who(ctx, tag);
    let n = 0;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable) continue;
      if (p.owner === held && p.religion === 'yahwism') n++;
    }
    return n;
  } catch (e) { warnOnce('faithfulProvinces', e); return 0; }
}

// ---- the political map of the spring of 931 ---------------------------------
// The ten tribes: the hill country from Bethel north, the Jezreel valley and
// its fortress towns, the Galilee to Dan, the coastal plain of Sharon, and
// the Gilead east of the Jordan. Shechem is the capital because that is where
// the assembly met; Tirzah and Samaria come later and the chapter's own cards
// move the seat.
const ISL_LANDS = [
  // Ephraim and the central hills — the assembly's own country
  'Neapolis', 'Sebaste', 'Jenin', 'Ramallah',
  // the valley: Megiddo, Beth-Shean, and the road between them
  'Afula', 'Scythopolis',
  // the Galilee to Dan
  'Sepphoris', 'Tiberias', 'Gischala', 'Safed', 'Caesarea Philippi',
  // the plain of Sharon and the northern coast
  'Antipatris', 'Dora',
  // the Gilead and the Bashan: Reuben, Gad and half Manasseh
  'Gadora', 'Pella', 'Gadara', 'Batanea', 'Gerasa',
];
// Judah and Benjamin: the ridge, the Shephelah below it, the Negeb forts and
// the Arabah down to the Gulf — Solomon's fleet port is still Jerusalem's.
const JDH_LANDS = [
  'Jerusalem', 'Bethlehem', 'Hebron', 'Adora', 'Jericho', 'Engaddi',
  'Emmaus', 'Beit Shemesh', 'Lydda',
  'Oboda', 'Kadesh Barnea', 'Aila',
];
// The pentapolis, one cell each: Gaza, Ashkelon, Ashdod, Ekron and Gath.
const PHL_LANDS = ['Gaza', 'Ascalon', 'Azotus', 'Jamnia', 'Kiryat Gat'];
// Tyre under Hiram's house: the coast, its hinterland strip, and Akko.
const PHN_LANDS = ['Tyre', 'Sidon', 'Berytus', 'Byblos', 'Tripolis', 'Aradus', 'Ptolemais'];
// Rezon son of Eliada, "an adversary to Israel all the days of Solomon"
// (1 Kings 11:23-25), holds Damascus and the old Aram-Zobah behind it.
const ADM_LANDS = ['Damascus', 'Chalcis'];
// The Orontes kingdom, Israel's friend against Damascus for two centuries.
const HMT_LANDS = ['Emesa', 'Apamea'];
// Moab of the plateau, Ammon of the springs, Edom of the red highland.
const MOA_LANDS = ['Medaba'];
const AMN_LANDS = ['Philadelphia'];
const EDM_LANDS = ['Petra'];
// The last Hittite kingdom and the Euphrates crossing, with the plain of the
// lower Orontes (Patina) and the Amuq under it.
const CRC_LANDS = ['Zeugma', 'Beroea', 'Antioch', 'Laodicea', 'Samosata'];
// Tabal and the Cilician plain: the highland lords who still write in
// hieroglyphic Luwian four centuries after there is no Hittite empire.
const TAB_LANDS = ['Tyana', 'Caesarea Mazaca', 'Tarsus', 'Melitene'];
// Assyria in its recovery, holding the triangle and nothing west of the
// Khabur: Ashur-dan II has spent his reign taking back Assyria's own land.
const ASR_LANDS = ['Assur', 'Arbela', 'Nisibis', 'Singara', 'Hatra'];
// Babylon under the ninth dynasty, and the Chaldean tribes of the marshes.
const BAB_LANDS = ['Babylon', 'Nehardea', 'Seleucia-Ctesiphon', 'Uruk', 'Charax', 'Dura-Europos'];
const ELA_LANDS = ['Susa'];
// The Twenty-Second Dynasty, Libyan by descent, ruling from the eastern Delta
// and about to make the last Egyptian march into Asia for four centuries.
const KMT_LANDS = [
  'Leontopolis', 'Athribis', 'Alexandria', 'Memphis', 'Arsinoe', 'Oxyrhynchus',
  'Thebes', 'Syene', 'Pelusium', 'Rhinocolura',
];
// The oases of the north Arabian caravan road, and the incense country that
// sent a queen to Solomon.
const QDR_LANDS = ['Tayma', 'Dumatha', 'Hegra'];
const SAB_LANDS = ['Marib', 'Najran', 'Zafar'];
const KSH_LANDS = ['Napata'];
// Palmyra is Tadmor, which 2 Chronicles 8:4 says Solomon built and which the
// Assyrian merchants already know: a caravan town that answers to nobody.

// Every other cell of the base atlas, named rather than left to inherit a
// Roman or Parthian owner from an atlas drawn for 66 CE (SPEC §268). A cell
// that keeps a tag no chapter seats is scenery: no court, no economy, no AI,
// and no army may enter it. Where the tenth century genuinely had no state,
// the cell is WASTE on §160's rule.
const OTHER_931 = {
  // The Phoenician and Philistine coast, Cyprus, and the caravan oases: these
  // ARE somebody's in 931.
  'Joppa': 'PLS',
  'Salamis': 'TYR', 'Paphos': 'TYR',      // the Kition Phoenicians and the island kings
  'Bostra': 'DMS',                        // the Hauran, Damascus' own grazing
  'Palmyra': 'QDR',                       // Tadmor: a caravan town that answers to nobody
  'Yathrib': 'QDR', 'Khaybar': 'QDR', 'Gerrha': 'QDR',
  'Edessa': 'ASR', 'Carrhae': 'ASR',      // Urhai and Harran, Assyria's own west
  'Cyrrhus': 'CRC',
  // …and everything that is not. Greece is four centuries into a dark age,
  // Rome is a hundred and seventy-eight years from being founded, Carthage a
  // hundred and seventeen, Cyrene two hundred and ninety-nine; the Medes and
  // Persians are not in anybody's annals yet, and Urartu is a generation from
  // being organised.
  'Iconium': 'WASTE', 'Pisidia': 'WASTE', 'Attalia': 'WASTE', 'Seleucia Trachea': 'WASTE',
  'Nicaea': 'WASTE', 'Smyrna': 'WASTE', 'Ancyra': 'WASTE', 'Sinope': 'WASTE',
  'Trapezus': 'WASTE', 'Phasis': 'WASTE', 'Halicarnassus': 'WASTE', 'Rhodes': 'WASTE',
  'Corinth': 'WASTE', 'Athens': 'WASTE', 'Sparta': 'WASTE', 'Gortyn': 'WASTE',
  'Cyrene': 'WASTE', 'Marmarica': 'WASTE', 'Paraetonium': 'WASTE',
  'Roma': 'WASTE', 'Capua': 'WASTE', 'Tarentum': 'WASTE', 'Brundisium': 'WASTE',
  'Rhegium': 'WASTE', 'Panormus': 'WASTE', 'Syracusae': 'WASTE',
  'Oea': 'WASTE', 'Leptis Magna': 'WASTE', 'Macomades': 'WASTE',
  'Dyrrhachium': 'WASTE', 'Thessalonica': 'WASTE', 'Hadrianopolis': 'WASTE', 'Byzantion': 'WASTE',
  'Ecbatana': 'WASTE', 'Gazaca': 'WASTE', 'Persepolis': 'WASTE', 'Gabae': 'WASTE',
  'Tigranocerta': 'WASTE', 'Sophene': 'WASTE', 'Amida': 'WASTE',
  'Caucasian Albania': 'WASTE', 'Hyrcania': 'WASTE',
};

// The faith and the people of the cells named above, on the same rule as the
// lists: the base atlas is drawn for the Roman east and a Phoenician Cyprus or
// an Arab oasis would otherwise wear a Hellenistic label eight centuries early.
const OTHER_FAITH = {
  PLS: ['canaanite', 'philistine'], TYR: ['canaanite', 'phoenician'],
  DMS: ['canaanite', 'aramean'], QDR: ['canaanite', 'arab'],
  ASR: ['mesopotamian', 'assyrian'], BBL: ['mesopotamian', 'babylonian'],
  CRC: ['anatolian_cults', 'aramean'], GRC: ['hellenism', 'greek'],
  CAR: ['punic', 'phoenician'], MIZ: ['egyptian', 'egyptian'],
  MDA: ['zoroastrianism', 'persian'],
};

const OWNERS = {};
const put = (list, tag) => { for (const n of list) OWNERS[n] = tag; };
put(ISL_LANDS, 'ISL'); put(JDH_LANDS, 'JDH'); put(PHL_LANDS, 'PLS');
put(PHN_LANDS, 'TYR'); put(ADM_LANDS, 'DMS'); put(HMT_LANDS, 'HMT');
put(MOA_LANDS, 'MOB'); put(AMN_LANDS, 'AMO'); put(EDM_LANDS, 'EDM');
put(CRC_LANDS, 'CRC'); put(TAB_LANDS, 'TAB'); put(ASR_LANDS, 'ASR');
put(BAB_LANDS, 'BBL'); put(ELA_LANDS, 'ELA'); put(KMT_LANDS, 'MIZ');
put(QDR_LANDS, 'QDR'); put(SAB_LANDS, 'SAB'); put(KSH_LANDS, 'KSH');
// The west, which these boards left as unclaimed waste (SPEC §280). Etruria
// north of the Tiber, the Samnite highlands, Tartessos on the silver, the
// Iberian coast, the Celtiberian meseta, and an island that built seven
// thousand towers.
const ETR_LANDS = ['Pisae', 'Genua', 'Bononia', 'Ravenna', 'Ancona'];
const SRD_LANDS = ['Caralis', 'Turris Libisonis'];
const TRT_LANDS = ['Gades', 'Hispalis', 'Corduba'];
const IBE_LANDS = ['Tarraco', 'Emporiae', 'Carthago Nova', 'Toletum'];
put(ETR_LANDS, 'ETR'); put(SRD_LANDS, 'SRD'); put(TRT_LANDS, 'TRT');
put(IBE_LANDS, 'IBE'); put(['Numantia'], 'CTB');
// Corsica keeps its own towers: Aleria is Phocaean only from 565.
put(['Aleria'], 'SRD');

for (const n of Object.keys(OTHER_931)) OWNERS[n] = OTHER_931[n];

// ---- the map of faiths, four centuries before the exile ---------------------
// The two Israelite kingdoms keep YHWH — which in 931 means a national god
// with a house in the capital and a great many other houses everywhere else,
// and not one word of a canon. Everything around them is Canaan, the rivers,
// or the Nile.
const RELIGIONS = {};
for (const n of ISL_LANDS.concat(JDH_LANDS)) RELIGIONS[n] = 'yahwism';
for (const n of PHL_LANDS.concat(PHN_LANDS, ADM_LANDS, HMT_LANDS, MOA_LANDS,
  AMN_LANDS, EDM_LANDS, QDR_LANDS)) RELIGIONS[n] = 'canaanite';
for (const n of ASR_LANDS.concat(BAB_LANDS, ELA_LANDS)) RELIGIONS[n] = 'mesopotamian';
for (const n of CRC_LANDS.concat(TAB_LANDS)) RELIGIONS[n] = 'anatolian_cults';
for (const n of KMT_LANDS) RELIGIONS[n] = 'egyptian';
for (const n of SAB_LANDS) RELIGIONS[n] = 'south_arabian';
for (const n of KSH_LANDS) RELIGIONS[n] = 'kushite';

// ---- and of peoples ---------------------------------------------------------
const CULTURES = {};
for (const n of ISL_LANDS) CULTURES[n] = 'israelite';
for (const n of JDH_LANDS) CULTURES[n] = 'judean';
for (const n of PHL_LANDS) CULTURES[n] = 'philistine';
for (const n of PHN_LANDS) CULTURES[n] = 'phoenician';
for (const n of ADM_LANDS.concat(HMT_LANDS, CRC_LANDS)) CULTURES[n] = 'aramean';
for (const n of MOA_LANDS) CULTURES[n] = 'moabite';
for (const n of AMN_LANDS) CULTURES[n] = 'ammonite';
for (const n of EDM_LANDS) CULTURES[n] = 'edomite';
for (const n of TAB_LANDS) CULTURES[n] = 'anatolian';
for (const n of ASR_LANDS) CULTURES[n] = 'assyrian';
for (const n of BAB_LANDS) CULTURES[n] = 'babylonian';
for (const n of ELA_LANDS) CULTURES[n] = 'elamite';
for (const n of KMT_LANDS) CULTURES[n] = 'egyptian';
for (const n of QDR_LANDS) CULTURES[n] = 'arab';
for (const n of SAB_LANDS) CULTURES[n] = 'south_arabian';


// …and the same for the cells named one by one above.
for (const n of Object.keys(OTHER_931)) {
  const pair = OTHER_FAITH[OTHER_931[n]];
  if (!pair) continue;
  RELIGIONS[n] = pair[0];
  CULTURES[n] = pair[1];
}

export const BOOKMARK_931 = {
  id: '931bce',
  name: 'The Kingdom Divided',
  startDate: { y: -931, m: 3, d: 1 },
  // SPEC §121: the year after which this chapter's own undated trigger cards
  // stop belonging to anybody. The chapter runs to the fall of Samaria; the
  // horizon sits a generation earlier, because a card about Jeroboam's calves
  // firing in Hezekiah's reign is a card about nothing.
  generationHorizon: -750,
  // Technology of the age (SPEC §22): the iron is new, the chariot is the
  // decisive arm, and nobody in this world has a standing professional army
  // except the men in the king's own chariot corps.
  techBase: 1,
  // How far up the ladder this age can climb (SPEC §99). The tenth and ninth
  // centuries reach the mustered levy and the chariot line and stop: the
  // Assyrian siege train is the next chapter's, and the phalanx is six
  // hundred years away.
  techCeiling: 6,
  // Egypt has three thousand years of administration and Assyria has the best
  // army in the world; Tyre has the sea. Nobody else starts ahead.
  techTweaks: { MIZ: { gov: 1 }, ASR: { mar: 1 }, TYR: { infl: 1 } },
  // The rungs' own names (SPEC §179): the arts of the divided kingdom, from
  // the clans that mustered under the judges to the chariot corps that fights
  // at Qarqar.
  techNames: {
    gov: {
      0: 'The Elders in the Gate', 1: 'The Clans and Their Levies', 2: 'The Twelve Districts',
      3: 'The Royal Storehouses', 4: 'The Ostraca of the Vintage', 5: 'The Scribes of the King',
      6: 'The Book of the Chronicles',
    },
    infl: {
      0: 'The Marriage of Houses', 1: 'The Gift and the Guest', 2: 'The Caravan Tolls',
      3: 'The Treaty of Brothers', 4: 'The Tyrian Factors', 5: 'The Tribute Embassy',
      6: 'The Letters of the Kings',
    },
    mar: {
      0: 'The Muster of the Clans', 1: 'The Men of Valour', 2: 'The Fortified Gate',
      3: 'The Chariot Cities', 4: 'The Hewn Casemate', 5: 'The Standing Chariotry',
      6: 'The Line at Qarqar',
    },
  },
  // Iron Age I-II population: perhaps a fifth of what Herod's country carried
  // and a fiftieth of 1948 (SPEC §56). The country is villages.
  popMult: 0.45,

  // Two constitutions in one nation, and the difference is the chapter's
  // whole argument. Judah is a dynasty: one house, father to son, for four
  // hundred years without a break. Israel is an acclamation — the assembly
  // makes a king and the army unmakes him, nine times in two centuries.
  govTypes: { ISL: 'monarchy', JDH: 'monarchy', PLS: 'republic' },

  // The map speaks its era (SPEC §25): the names the Iron Age used, which for
  // most of this country are the names the Hebrew Bible uses, and for the rest
  // are the names in the Assyrian annals.
  provinceNames: {
    // — the two kingdoms —
    'Sebaste': 'Tirzah',                  // Samaria is Omri's, fifty years away
    'Neapolis': 'Shechem',
    'Jenin': 'Ibleam',
    'Ramallah': 'Bethel',                 // the calf, the border and the king's sanctuary
    'Afula': 'Megiddo',
    'Scythopolis': 'Beth-Shean',
    'Sepphoris': 'Shimron',
    'Tiberias': 'Chinnereth',
    'Gischala': 'Kedesh',
    'Safed': 'Hazor',
    'Caesarea Philippi': 'Dan',           // the northern calf, and the end of the proverb
    'Antipatris': 'Aphek',
    'Dora': 'Dor',
    'Gadora': 'Ramoth-Gilead',
    'Pella': 'Jabesh-Gilead',
    'Gadara': 'Gilead',
    'Batanea': 'Bashan',
    'Gerasa': 'Jazer',
    'Emmaus': 'Aijalon',
    'Beit Shemesh': 'Beth-Shemesh',
    'Lydda': 'Gezer',                     // Pharaoh burned it and gave it to Solomon's wife
    'Adora': 'Adoraim',
    'Engaddi': 'En-Gedi',
    'Oboda': 'The Negeb',
    'Aila': 'Ezion-Geber',                // Solomon's fleet, and Jehoshaphat's wreck
    // — the neighbours —
    'Jamnia': 'Ekron',
    'Azotus': 'Ashdod',
    'Ascalon': 'Ashkelon',
    'Kiryat Gat': 'Gath',
    'Ptolemais': 'Akko',
    'Byblos': 'Gebal',
    'Aradus': 'Arvad',
    'Chalcis': 'Zobah',
    'Emesa': 'Hamath',
    'Apamea': 'Hadrach',
    'Palmyra': 'Tadmor',
    'Medaba': 'Kir-Hareseth',
    'Philadelphia': 'Rabbah',
    'Petra': 'Sela',
    'Kadesh Barnea': 'Kadesh-Barnea',
    // — the north and the rivers —
    'Zeugma': 'Carchemish',
    'Beroea': 'Arpad',
    'Antioch': 'Patina',
    'Samosata': 'Kummuh',
    'Melitene': 'Melid',
    'Carrhae': 'Harran',
    'Nisibis': 'Nasibina',
    'Arbela': 'Arbail',
    'Assur': 'Ashur',
    'Seleucia-Ctesiphon': 'Opis',
    'Nehardea': 'Sippar',
    'Charax': 'Bit-Yakin',
    'Dura-Europos': 'Suhu',
    'Tigranocerta': 'Nairi',
    // — the Nile —
    'Leontopolis': 'Tanis',
    'Athribis': 'Bubastis',
    'Alexandria': 'Sais',
    'Pelusium': 'Sin',
    'Rhinocolura': 'The Brook of Egypt',
    'Syene': 'Elephantine',
    'Oxyrhynchus': 'Per-Medjed',
    'Arsinoe': 'The Fayyum',
    // — the §230 districts, under the names their own age used —
    'Bostra': 'The Hauran',      // Busra is a Nabataean foundation a thousand years off
    'Shobak': 'Seir',
    'Wadi Rum': 'The Hisma',
    'Azraq': 'The Sirhan Wells',
    'Douma': 'The Ghutah',
    'Kirkuk': 'Arrapha',
    'Manbij': 'Til-Barsip',
    'Salamiyah': 'The Hamath Steppe',
    'Heliopolis': 'Baalbek',
    'Mount Hermon': 'Mount Hermon',
  },

  // The victors' pens (SPEC §66). A northern kingdom that takes Jerusalem and
  // a southern kingdom that takes Samaria both write the same Hebrew; what
  // changes is which city the chronicle is written in. The Aramean and
  // Assyrian pens are what the annals actually called these places.
  integratedNames: {
    ISL: {
      'Jerusalem': 'Jerusalem', 'Ptolemais': 'Akko', 'Azotus': 'Ashdod',
      'Ascalon': 'Ashkelon', 'Joppa': 'Yafo', 'Gaza': 'Azzah',
    },
    JDH: {
      'Sebaste': 'Shomron', 'Neapolis': 'Shechem', 'Ptolemais': 'Akko',
      'Azotus': 'Ashdod', 'Ascalon': 'Ashkelon', 'Joppa': 'Yafo',
    },
    DMS: { 'Gadora': 'Ramath', 'Batanea': 'Bit-Hazael', 'Gischala': 'Qadesh' },
    ASR: {
      'Sebaste': 'Samerina', 'Neapolis': 'Sikkunu', 'Damascus': 'Dimasqu',
      'Jerusalem': 'Ursalimmu', 'Tyre': 'Surru', 'Sidon': 'Sidunnu',
      'Gaza': 'Hazzatu', 'Ascalon': 'Isqaluna', 'Azotus': 'Asdudu',
    },
    // A crown proclaimed over all Israel keeps the pen of whichever house
    // proclaimed it (alias table).
    MLI: 'JDH',
  },

  blurb: 'Solomon is three months dead and his son has just told the assembly at Shechem '
    + 'that his little finger is thicker than his father\'s loins. The ten tribes have gone '
    + 'home; Jeroboam son of Nebat is back from Egypt with a crown and a plan to build two '
    + 'golden calves so that nobody ever has to go up to Jerusalem again; and in Tanis, '
    + 'Shoshenq of Egypt is reading the reports and counting the towns. Two Jewish states, '
    + 'one covenant, and five years until Pharaoh comes north.',

  // The map wears its era's shape (SPEC §47). Everything Herod, the Ptolemies
  // and the legions built is four to eight centuries from being founded, and
  // the towns that matter in this age — Hazor, Megiddo, Bethel, Gath,
  // Beersheba, Arad, Heshbon, Kir of Moab, Nineveh — are cells the later
  // chapters fold away.
  // SPEC §234 withdrew every district §225, §228 and §230 carved out of the
  // ancient map: outside 1948 they read as Voronoi bubbles inside their own
  // parents, and the choice was clean provinces over district count. These
  // chapters keep that rule, so what they activate is the older latent set
  // only — the Galilee and hill-country cells that carry Hazor, Megiddo,
  // Ibleam, Bethel, Bethlehem, Beth-Shemesh and Gath.
  activeProvinces: ['Safed', 'Afula', 'Jenin', 'Ramallah', 'Bethlehem', 'Beit Shemesh', 'Kiryat Gat'],
  mergeProvinces: {
    'Masada': 'Engaddi',            // Jannaeus' fortress, eight centuries out
    'Machaerus': 'Medaba',
    'Jotapata': 'Sepphoris',
    'Tarichaea': 'Tiberias',
    'Caesarea Maritima': 'Dora',    // Straton's Tower is not founded yet either
    'Gamala': 'Batanea',
    'Seleucia Pieria': 'Antioch',
    'Berenice': 'Thebes',
    'Myos Hormos': 'Thebes',
  },

  // The era's lens on courts three letters older than their century
  // (SPEC §139). Israel's seat is Shechem until its own cards move it, and
  // Egypt is not an empire in 931 — it is four governments that agree to call
  // one of themselves Pharaoh.
  tagTweaks: {
    ISL: { capital: 'Neapolis' },
    MIZ: {
      name: 'Egypt', adj: 'Egyptian', capital: 'Leontopolis',
      description: 'The Twenty-Second Dynasty: Libyan chiefs in the Delta who have taken the '
        + 'double crown and the old titles, and who rule Thebes through a daughter made High '
        + 'Priestess of Amun because they cannot rule it any other way.',
    },
    ASR: {
      name: 'Assyria', adj: 'Assyrian', capital: 'Assur',
      description: 'Not yet the terror of the world: a recovering kingdom of the middle '
        + 'Tigris that has spent two reigns taking back its own farmland, and whose kings '
        + 'have begun again to write down how many cities they burned.',
    },
  },

  activeTags: [
    'ISL', 'JDH', 'PLS', 'TYR', 'DMS', 'HMT', 'MOB', 'AMO', 'EDM',
    'CRC', 'TAB', 'ASR', 'BBL', 'ELA', 'MIZ', 'QDR', 'SAB', 'KSH',
    // The west (SPEC §280).
    'ETR', 'SRD', 'TRT', 'IBE', 'CTB',
  ],

  // Standing rivalries (SPEC §73). The two halves of one nation are the
  // chapter's own rivalry and the sources say so — "there was war between
  // Rehoboam and Jeroboam all their days" (1 Kings 14:30). Damascus and
  // Israel fight over the Gilead for a century and a half; Assyria and Babylon
  // are the oldest quarrel on the map.
  rivalries: [['ISL', 'JDH'], ['ISL', 'DMS'], ['ASR', 'BBL'], ['JDH', 'EDM']],
  // Historical friends (SPEC §86). Tyre and Israel are one commercial system —
  // cedar for grain and oil, and eventually a marriage. Hamath needs Israel
  // against Damascus as much as Israel needs Hamath. Judah and Egypt is the
  // oldest bad idea in the region and the sources have it both ways: Shishak
  // sacks Jerusalem, and every later king of Judah still sends south for help.
  affinities: [
    ['ISL', 'TYR'],
    ['ISL', 'HMT'],
    ['JDH', 'MIZ', { axis: 'alignment', sign: -1 }],
  ],

  // Solomon's house stands, and it is the only one of its kind in the world
  // this chapter is played in (SPEC §32).
  wonderTweaks: { Jerusalem: 'temple' },
  // The levy band of SPEC §173 exists so that an empire cannot draw a full
  // army out of ground it governs from a thousand miles away. A court whose
  // WHOLE realm is on that ground is the case the band was not written for:
  // at a 0.2 share the kingdom of Kush and the incense kingdoms cannot pay two
  // regiments out of their own capitals. Their home cells answer to them in
  // full, which is what a sovereign kingdom's own country is.
  levies: {
    'Napata': 1, 'Meroe': 1, 'Soba': 0.5, 'Dodekaschoinos': 0.5,
    'Marib': 1, 'Najran': 1, 'Shabwa': 1, 'Moscha': 0.5, 'Dioscurida': 0.5,
  },
  owners: OWNERS,
  religions: RELIGIONS,
  cultures: CULTURES,

  // The high places (SPEC §104's machinery, pointed the other way). Every
  // other chapter's faith drift is a religion arriving; this one is a religion
  // consolidating. The Canaanite cults do not invade Israel — they are
  // already inside it, in the household shrines and the standing stones and
  // the asherah the archaeology finds in Judahite houses, and the pressure
  // that moves them is a royal one. The curve is flat until a court rules on
  // the altars, which is exactly what the reform cards are for.
  faithDrift: {
    canaanite: {
      from: ['yahwism'],
      resistedBy: { yahwism: 0.55 },
      seeds: ['Tyre', 'Sidon', 'Damascus', 'Gaza', 'Medaba'],
      vigor: 0.0009,
      spreadsAlong: 'trade',
      monthlyCap: 0.003,
      curve: (y, ctx) => {
        const f = (ctx && ctx.game && ctx.game.flags) || {};
        if (f.altarsPurged) return 0;
        return f.baalEstablished ? 0.9 : 0.25;
      },
    },
  },

  // What the era asks of you (SPEC §33) — shown in the realm panel.
  objectives: {
    ISL: [
      'Win: hold Shechem, Megiddo, Beth-Shean and Dan with 26 provinces — the ten tribes made a state.',
      'Win: be first among the powers in 841, when Jehu pays Shalmaneser — a kingdom nobody buys.',
      'Crown the chain: take Jerusalem and rule all Israel from one throne.',
      'Lose: Samaria taken, or the north reduced below four provinces.',
    ],
    JDH: [
      'Win: hold Jerusalem with 20 provinces and the Temple standing — the smaller kingdom made viable.',
      'Win: still holding Jerusalem in 722, the year the north ends.',
      'Crown the chain: bring the ten tribes back under the house of David.',
      'Lose: Jerusalem lost, or the house of David extinguished.',
    ],
  },

  // The argument this chapter is actually about (SPEC §201): one altar or
  // many, and whose.
  // Both holy mountains are Yahwism's in this age (SPEC §284): the Temple
  // Mount before there is a Judaism, and Shechem's altars before there is a
  // Samaritan faith to claim Gerizim.
  holyFaith: { temple_mount: 'yahwism', gerizim: 'yahwism' },
  schools: { ISL: 'altars_and_the_house', JDH: 'altars_and_the_house' },

  // The court factions (SPEC §34). The engine ticks them for the human player
  // alone; the AI keeps its politics offstage.
  factions: {
    ISL: [
      {
        id: 'assembly', name: 'The Elders of the Tribes',
        desc: 'The men who walked out at Shechem, and who can walk out again: this crown was '
          + 'given by an assembly and the assembly remembers giving it.',
        drift(ctx, t) { return (t.warExhaustion || 0) <= 6 ? 0.4 : -0.5; },
        boon: { name: 'The Assembly Consents', text: '+10% manpower', effects: { manpowerMult: 1.1 } },
        bane: { name: 'To Your Tents', text: '+1.25 unrest everywhere', effects: { unrestAll: 1.25 } },
        appease: { label: 'Lighten the yoke (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Elders Ask What the Walkout Was For',
          text: 'They left one king over forced labour and corvée gangs, and they have begun '
            + 'to count the gangs on the new king\'s walls. Either the yoke is lighter than '
            + 'Solomon\'s or the whole exercise was a change of family.',
          grant: { label: 'The corvée is cut', cost: { gov: 55 } },
          refuse: { label: 'The walls will not build themselves', tooltip: 'The counting continues, out loud.' },
        },
      },
      {
        id: 'priesthood', name: 'The Priests of the Calves',
        desc: 'The priesthood Jeroboam made "from among all the people, who were not of the '
          + 'sons of Levi" — a new establishment that exists because the old one is in '
          + 'somebody else\'s capital.',
        drift(ctx, t) {
          try { return ctx.helpers.controls(ctx, 'ISL', 'Ramallah') ? 0.45 : -0.6; } catch (e) { return 0; }
        },
        boon: { name: 'The Feast in the Eighth Month', text: '+0.25 legitimacy a month', effects: { legitimacyAdd: 0.25 } },
        bane: { name: 'The Pilgrims Go South', text: '−8% income', effects: { incomeMult: 0.92 } },
        appease: { label: 'Endow the two houses (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'Bethel and Dan Want an Establishment',
          text: 'Two shrines, one calf each, and a festival moved a month so that it does not '
            + 'collide with Jerusalem\'s. The priests want what an establishment has: land, '
            + 'a tithe, and a law that says going south to sacrifice is a crime.',
          grant: { label: 'Land, tithe and a law', cost: { infl: 55 } },
          refuse: { label: 'Let the people go where they like', tooltip: 'A great many of them go south.' },
        },
      },
      {
        id: 'captains', name: 'The Captains of the Chariots',
        desc: 'The chariot corps and the men who command it: the most expensive thing the '
          + 'kingdom owns, and the shortest road to the throne. Four of Israel\'s nine '
          + 'dynasties are founded by a man from this list.',
        drift(ctx, t) {
          const g = ctx.game;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.5 : -0.35;
        },
        boon: { name: 'Two Thousand Chariots', text: '+5% army strength', effects: { milPowerMult: 1.05 } },
        bane: { name: 'A Captain Is Proclaimed', text: '−1 stability', effects: { stabilityAdd: -1 } },
        appease: { label: 'Horses from Egypt (100 talents)', cost: { treasury: 100 } },
        demand: {
          title: 'The Chariot Cities Want Filling',
          text: 'Megiddo, Hazor and the yards at Gezer have stalls for horses the treasury has '
            + 'not bought and crews the muster has not raised. The captains point out, without '
            + 'raising their voices, that a chariot corps is the only reason anybody in Damascus '
            + 'takes this kingdom seriously.',
          grant: { label: 'Fill the stalls', cost: { treasury: 150 } },
          refuse: { label: 'The levy will have to do', tooltip: 'The captains discuss it among themselves.' },
        },
      },
    ],
    JDH: [
      {
        id: 'house', name: 'The House of David',
        desc: 'The dynasty itself: uncles, cousins, the queen mother and four hundred years '
          + 'of unbroken succession, which is the one asset the north can never counterfeit.',
        drift(ctx, t) { return (t.legitimacy || 0) >= 55 ? 0.45 : -0.45; },
        boon: { name: 'The Lamp in Jerusalem', text: '+0.3 legitimacy a month', effects: { legitimacyAdd: 0.3 } },
        bane: { name: 'The Queen Mother Governs', text: '−1 stability', effects: { stabilityAdd: -1 } },
        appease: { label: 'Honour the house (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'The House Asks for Its Portion',
          text: 'Solomon had seven hundred wives and the arithmetic has arrived: every fortified '
            + 'town in Judah is expected to hold a prince with a garrison, a granary and an '
            + 'allowance. It is a patronage system and it is also, as the house points out, '
            + 'the reason no pretender can find a base.',
          grant: { label: 'A prince in every fortress', cost: { treasury: 140 } },
          refuse: { label: 'One throne, one household', tooltip: 'The cousins go and talk to the north.' },
        },
      },
      {
        id: 'priesthood', name: 'The Temple Priesthood',
        desc: 'Zadok\'s house and the courses under it: the establishment of the one house in '
          + 'the world where this god is sacrificed to according to the pattern.',
        drift(ctx, t) {
          try { return ctx.helpers.controls(ctx, 'JDH', 'Jerusalem') ? 0.4 : -0.8; } catch (e) { return 0; }
        },
        boon: { name: 'The Courses in Order', text: '−0.5 unrest everywhere', effects: { unrestAll: -0.5 } },
        bane: { name: 'The Doors Are Shut', text: '−0.4 legitimacy a month', effects: { legitimacyAdd: -0.4 } },
        appease: { label: 'Repair the house (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Priesthood Asks About the High Places',
          text: 'Every ridge in Judah has a shrine on it and most of them are older than the '
            + 'Temple. The priesthood would like it stated, as law and not as preference, that '
            + 'there is one altar — and they know perfectly well that saying so out loud costs '
            + 'the crown every village elder who owns a hilltop.',
          grant: { label: 'One altar, and say so', cost: { gov: 60 } },
          refuse: { label: 'The high places stay', tooltip: 'The priesthood writes it down for later.' },
        },
      },
      {
        id: 'assembly', name: 'The People of the Land',
        desc: 'The free landholders of Judah — the ʿam ha-aretz who put Joash on the '
          + 'throne, killed Athaliah, and made every succession in this kingdom that the house '
          + 'could not make by itself.',
        drift(ctx, t) { return (t.stability || 0) >= 0 ? 0.35 : -0.5; },
        boon: { name: 'The Country Musters', text: '+8% manpower', effects: { manpowerMult: 1.08 } },
        bane: { name: 'The Country Stays Home', text: '−10% reinforcement', effects: { reinforceMult: 0.9 } },
        appease: { label: 'Remit the levy (80 talents)', cost: { treasury: 80 } },
        demand: {
          title: 'The Country Wants the Forts Manned',
          text: 'The Shephelah is the road to Jerusalem and everybody who has ever taken '
            + 'Jerusalem came up it. The landholders want Lachish, Azekah and Beth-Shemesh '
            + 'walled and garrisoned out of the royal treasury, not out of their own harvests.',
          grant: { label: 'The crown pays for the walls', cost: { treasury: 170 } },
          refuse: { label: 'Let each town wall itself', tooltip: 'Several of them decline to.' },
        },
      },
    ],
  },
  playableTags: [
    {
      tag: 'ISL',
      difficulty: 'Normal',
      blurb: 'The bigger half, and the better one: the valleys, the trade roads, three '
        + 'quarters of the people and a neighbour in Tyre who would rather sell to you than '
        + 'fight you. What you do not have is a reason for anyone to obey your grandson. '
        + 'Build one — an establishment, a capital, a dynasty — before a chariot captain '
        + 'decides he can do the job better.',
    },
    {
      tag: 'JDH',
      difficulty: 'Hard',
      blurb: 'Two tribes on a limestone ridge, no ports, no valleys, no trade road, and an '
        + 'army a third the size of the one across the border. What you have is a house that '
        + 'has ruled since David and a building nobody else can copy. Survive the north, '
        + 'survive Egypt, and outlast both — which is, in the event, exactly what happened.',
    },
  ],

  // Pre-existing works (SPEC §58): what Solomon actually built, as the
  // excavated gates and the king's own accounts have it.
  buildings: {
    'Jerusalem': ['walls', 'temple', 'market'],
    'Afula': ['walls', 'granary'],     // Megiddo's gate and stables
    'Safed': ['walls'],                // Hazor's casemate
    'Lydda': ['walls'],                // Gezer, Pharaoh's dowry
    'Tyre': ['shipyard', 'market'],
    'Sidon': ['shipyard'],
    'Aila': ['shipyard'],              // Ezion-Geber: the fleet that sails to Ophir
    'Memphis': ['market', 'granary'],
    'Babylon': ['walls', 'market'],
    'Nineveh': ['walls'],
    'Damascus': ['walls', 'market'],
    'Gaza': ['market'],
  },

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

    // --- The war that opens the chapter and never formally ends. 1 Kings
    // 14:30 and 15:6: "there was war between Rehoboam and Jeroboam all their
    // days." Shemaiah the prophet stops the first campaign before it starts,
    // which is the chapter's own first card; the state of war is the ground
    // everything else is played on.
    h.declareWar(ctx, 'JDH', 'ISL', 'The War of the Two Houses');
    try {
      const w = findWar(g, 'JDH', 'ISL');
      if (w) w.noNegotiation = false;
    } catch (e) { warnOnce('setup:war', e); }

    // --- Treasuries, manpower, stability. Solomon's treasury went north with
    // the tax districts; Jerusalem keeps the Temple gold, for five years.
    h.adjust(ctx, 'ISL', { treasury: 260, manpower: 14000, stability: 0, legitimacy: 30 });
    h.adjust(ctx, 'JDH', { treasury: 380, manpower: 9000, stability: 1, legitimacy: 75 });
    h.adjust(ctx, 'MIZ', { treasury: 600, manpower: 22000, stability: 1, legitimacy: 60 });
    h.adjust(ctx, 'ASR', { treasury: 560, manpower: 14000, stability: 2, legitimacy: 65 });
    h.adjust(ctx, 'BBL', { treasury: 300, manpower: 12000, stability: 0, legitimacy: 45 });
    h.adjust(ctx, 'DMS', { treasury: 180, manpower: 8000, stability: 1, legitimacy: 40 });
    h.adjust(ctx, 'TYR', { treasury: 420, manpower: 4000, stability: 2, legitimacy: 70 });
    h.adjust(ctx, 'PLS', { treasury: 140, manpower: 6000 });
    h.adjust(ctx, 'HMT', { treasury: 120, manpower: 5000 });
    h.adjust(ctx, 'MOB', { treasury: 80, manpower: 3500 });
    h.adjust(ctx, 'AMO', { treasury: 140, manpower: 3000 });
    h.adjust(ctx, 'EDM', { treasury: 70, manpower: 3000 });

    // --- Opinions. The two kingdoms hate each other at the outset more than
    // either hates any foreigner, which is the historically accurate and
    // strategically fatal fact this chapter is built on.
    setOpinion(g, 'ISL', 'JDH', -140); setOpinion(g, 'JDH', 'ISL', -140);
    setOpinion(g, 'ISL', 'TYR', 80);   setOpinion(g, 'TYR', 'ISL', 70);
    setOpinion(g, 'ISL', 'DMS', -90);  setOpinion(g, 'DMS', 'ISL', -90);
    setOpinion(g, 'ISL', 'MIZ', 40);   setOpinion(g, 'MIZ', 'ISL', 30); // Jeroboam's asylum
    setOpinion(g, 'JDH', 'MIZ', -30);  setOpinion(g, 'MIZ', 'JDH', -40);
    setOpinion(g, 'JDH', 'EDM', -70);  setOpinion(g, 'EDM', 'JDH', -110);
    setOpinion(g, 'ISL', 'HMT', 55);   setOpinion(g, 'HMT', 'ISL', 55);
    setOpinion(g, 'ASR', 'BBL', -120); setOpinion(g, 'BBL', 'ASR', -120);

    // --- Starting modifiers.
    h.addTagModifier(ctx, 'ISL', {
      id: 'ten_tribes_in_arms', name: 'The Ten Tribes', months: 60,
      effects: { manpowerMult: 1.1, incomeMult: 1.05, legitimacyAdd: -0.15 },
    });
    h.addTagModifier(ctx, 'JDH', {
      id: 'the_lamp_of_david', name: 'The Lamp of David', months: -1,
      effects: { legitimacyAdd: 0.2, hillDefBonus: 1, fortDefBonus: 1 },
    });
    h.addTagModifier(ctx, 'JDH', {
      id: 'solomons_arrears', name: 'Solomon\'s Arrears', months: 72,
      effects: { incomeMult: 0.85, unrestAll: 0.5 },
    });
    h.addTagModifier(ctx, 'TYR', {
      id: 'the_purple_and_the_cedar', name: 'The Purple and the Cedar', months: -1,
      effects: { tradeMult: 1.2 },
    });
    h.addTagModifier(ctx, 'MIZ', {
      id: 'the_libyan_dynasty', name: 'The Libyan Dynasty', months: -1,
      effects: { incomeMult: 1.1, moraleMult: 0.94 },
    });

    // --- Starting fleets. Tyre owns the sea; Ezion-Geber is Jerusalem's one
    // window on the other one, and the ships there were built by Tyrians.
    h.spawnFleet(ctx, 'TYR', 'Tyre', 6, { name: 'The Fleet of Hiram\'s House' });
    h.spawnFleet(ctx, 'JDH', 'Aila', 2, { name: 'The Ships of Tarshish' });
    h.spawnFleet(ctx, 'MIZ', 'Leontopolis', 3, { name: 'The Delta Squadron' });

    // --- Starting armies.
    h.spawnArmy(ctx, 'ISL', 'Neapolis', {
      inf: 8, cav: 2, name: 'The Muster of Israel',
      general: { name: 'Jeroboam son of Nebat', fire: 2, shock: 3, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'ISL', 'Afula', { inf: 3, cav: 2, name: 'The Chariots of the Valley' });
    h.spawnArmy(ctx, 'ISL', 'Gadora', { inf: 3, name: 'The Men of Gilead' });
    h.spawnArmy(ctx, 'JDH', 'Jerusalem', {
      inf: 8, cav: 1, name: 'The Muster of Judah',
      general: { name: 'Rehoboam son of Solomon', fire: 1, shock: 2, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'JDH', 'Hebron', { inf: 4, name: 'The Men of the Ridge' });
    h.spawnArmy(ctx, 'MIZ', 'Leontopolis', {
      inf: 12, cav: 4, name: 'The Army of Shoshenq',
      general: { name: 'Shoshenq I', fire: 2, shock: 3, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'DMS', 'Damascus', {
      inf: 6, cav: 3, name: 'The Riders of Rezon',
      general: { name: 'Rezon son of Eliada', fire: 2, shock: 3, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'PLS', 'Gaza', { inf: 5, name: 'The Levy of the Five Cities' });
    h.spawnArmy(ctx, 'ASR', 'Assur', {
      inf: 6, cav: 3, name: 'The Army of Ashur',
      general: { name: 'Ashur-dan II', fire: 2, shock: 3, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'BBL', 'Babylon', { inf: 7, cav: 2, name: 'The Levy of Babylon' });
    h.spawnArmy(ctx, 'MOB', 'Medaba', { inf: 3, name: 'The Men of Chemosh' });
    h.spawnArmy(ctx, 'AMO', 'Philadelphia', { inf: 1, name: 'The Guard of Rabbah' });
    h.spawnArmy(ctx, 'EDM', 'Petra', { inf: 2, name: 'The Men of Seir' });
    h.spawnArmy(ctx, 'TYR', 'Tyre', { inf: 2, name: 'The Guard of the Island' });
    h.spawnArmy(ctx, 'HMT', 'Emesa', { inf: 4, name: 'The Levy of Hamath' });

    h.notify(ctx, {
      title: 'To Your Tents, O Israel',
      text: 'The assembly at Shechem has gone home and taken ten tribes with it. There are '
        + 'two kings of the covenant people this morning, and neither of them recognises the '
        + 'other.',
      type: 'war', provName: 'Neapolis',
    });
  },

  // The courts of the spring of 931.
  rulers: {
    ISL: {
      name: 'Jeroboam son of Nebat', title: 'King of Israel', gov: 3, infl: 3, mar: 3, age: 45,
      heir: { name: 'Nadab', gov: 1, infl: 1, mar: 2, age: 18 },
    },
    JDH: {
      name: 'Rehoboam', title: 'King of Judah', gov: 1, infl: 1, mar: 2, age: 41,
      heir: { name: 'Abijah', gov: 2, infl: 2, mar: 3, age: 20 },
    },
    MIZ: { name: 'Shoshenq I', title: 'Pharaoh', gov: 3, infl: 3, mar: 4, age: 50 },
    ASR: { name: 'Ashur-dan II', title: 'King of Assyria', gov: 3, infl: 2, mar: 4, age: 47 },
    BBL: { name: 'Nabu-mukin-apli', title: 'King of Babylon', gov: 2, infl: 2, mar: 2, age: 44 },
    DMS: { name: 'Rezon son of Eliada', title: 'King of Aram', gov: 2, infl: 2, mar: 4, age: 55 },
    TYR: { name: 'Abibaal', title: 'King of Tyre', gov: 3, infl: 4, mar: 1, age: 38 },
    HMT: { name: 'Toi', title: 'King of Hamath', gov: 2, infl: 3, mar: 2, age: 50 },
    MOB: { name: 'The King of Moab', title: 'King of Moab', gov: 2, infl: 1, mar: 2, age: 40 },
    AMO: { name: 'The King of Ammon', title: 'King of Ammon', gov: 2, infl: 2, mar: 2, age: 36 },
    EDM: { name: 'Hadad the Edomite', title: 'King of Edom', gov: 2, infl: 3, mar: 3, age: 44 },
    PLS: { name: 'The Lords of the Five', title: 'Seren of Gaza', gov: 2, infl: 2, mar: 3, age: 45 },
    QDR: { name: 'The Sheikh of Adummatu', title: 'Sheikh', gov: 1, infl: 2, mar: 2, age: 40 },
    SAB: { name: 'The Mukarrib of Saba', title: 'Mukarrib', gov: 3, infl: 3, mar: 2, age: 42 },
    ELA: { name: 'The King of Elam', title: 'King of Anshan and Susa', gov: 2, infl: 2, mar: 3, age: 45 },
    CRC: { name: 'The Great King of Carchemish', title: 'Great King', gov: 2, infl: 2, mar: 2, age: 48 },
  },

  // The mission trees (SPEC §192, §200, §211). Both principals run twelve
  // objectives in the three war-and-state columns, the six-node civil band
  // beneath them, and the chapter's own forks as standing hypotheticals in
  // the spare columns (SPEC §183).
  missions: {
    ISL: [
      {
        id: 'il_the_ten_tribes', name: 'The Ten Tribes',
        icon: 'flag', col: 1, row: 0,
        desc: 'Hold Shechem and fourteen provinces with the realm steady (+1 stability) — turn a walkout into a country.',
        rewardText: '+20 legitimacy, +60 governance points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ISL', 'Neapolis')
          && ctx.helpers.countControlled(ctx, 'ISL', {}) >= 14
          && (crown(ctx, 'ISL').stability || 0) >= 1,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ISL', { legitimacy: 20, gov: 60 }),
      },
      {
        id: 'il_the_calves_planted', name: 'Bethel and Dan',
        icon: 'altar', col: 0, row: 1, requires: ['il_the_ten_tribes'],
        desc: 'Hold both ends of the kingdom — Bethel in the south and Dan in the north — '
          + 'so that nobody in Israel has to cross a border to sacrifice.',
        rewardText: '"The Feast in the Eighth Month": +0.25 legitimacy a month, permanently.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ISL', 'Ramallah')
          && ctx.helpers.controls(ctx, 'ISL', 'Caesarea Philippi'),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ISL', {
          id: 'feast_eighth_month', name: 'The Feast in the Eighth Month', months: -1,
          effects: { legitimacyAdd: 0.25 },
        }),
      },
      {
        id: 'il_the_valley_road', name: 'The Valley and Its Gates',
        icon: 'walls', col: 2, row: 1, requires: ['il_the_ten_tribes'],
        desc: 'Hold Megiddo, Beth-Shean and Hazor — the three gates on the road from Egypt '
          + 'to Damascus, and the reason this kingdom is worth conquering.',
        rewardText: '+150 talents (the caravan tolls), +12 legitimacy.',
        check: (ctx) => ['Afula', 'Scythopolis', 'Safed'].every((n) => ctx.helpers.controls(ctx, 'ISL', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ISL', { treasury: 150, legitimacy: 12 }),
      },
      {
        id: 'il_a_seat_for_a_kingdom', name: 'A Seat for a Kingdom',
        icon: 'tower', col: 1, row: 1, requires: ['il_the_ten_tribes'],
        desc: 'Hold Tirzah with walls raised on it — a capital that is a fortress and not '
          + 'merely the town the assembly happened to meet in.',
        rewardText: '"The King\'s Seat": +1 fort defence and −0.4 unrest everywhere, permanently.',
        check: (ctx) => {
          try {
            const p = ctx.prov && ctx.prov('Sebaste');
            return !!p && p.owner === who(ctx, 'ISL') && (p.buildings || []).indexOf('walls') !== -1;
          } catch (e) { return false; }
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ISL', {
          id: 'the_kings_seat', name: 'The King\'s Seat', months: -1,
          effects: { fortDefBonus: 1, unrestAll: -0.4 },
        }),
      },
      {
        id: 'il_the_gilead_held', name: 'The Gilead Held',
        icon: 'mountain', col: 0, row: 2, requires: ['il_the_calves_planted'],
        desc: 'Hold Ramoth-Gilead, Gilead and the Bashan together — the east bank, which '
          + 'Damascus takes from this kingdom four separate times in the sources.',
        rewardText: '+3,000 manpower, +40 martial points.',
        check: (ctx) => ['Gadora', 'Gadara', 'Batanea'].every((n) => ctx.helpers.controls(ctx, 'ISL', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ISL', { manpower: 3000, mar: 40 }),
      },
      {
        id: 'il_the_house_that_holds', name: 'A House That Holds',
        icon: 'laurel', col: 1, row: 2, requires: ['il_the_calves_planted', 'il_the_valley_road'],
        desc: 'Stand at 65 legitimacy with the realm steady (+1 stability) — an acclaimed '
          + 'crown that has begun to be an inherited one.',
        rewardText: '"The Second Generation": +0.2 legitimacy a month and +6% income, permanent.',
        check: (ctx) => (crown(ctx, 'ISL').legitimacy || 0) >= 65 && (crown(ctx, 'ISL').stability || 0) >= 1,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ISL', {
          id: 'the_second_generation', name: 'The Second Generation', months: -1,
          effects: { legitimacyAdd: 0.2, incomeMult: 1.06 },
        }),
      },
      {
        id: 'il_the_cedar_treaty', name: 'The Cedar and the Grain',
        icon: 'ship', col: 2, row: 2, requires: ['il_the_valley_road'],
        desc: 'Bring Tyre to +60 regard — the one neighbour whose interest is that this '
          + 'kingdom stay rich rather than stay weak.',
        rewardText: '"The Tyrian Factors": +12% trade, permanently, +120 talents.',
        check: (ctx) => regard(ctx, 'TYR', 'ISL') >= 60,
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ISL', {
            id: 'the_tyrian_factors', name: 'The Tyrian Factors', months: -1,
            effects: { tradeMult: 1.12 },
          });
          ctx.helpers.adjust(ctx, 'ISL', { treasury: 120 });
        },
      },
      {
        id: 'il_the_chariot_cities', name: 'The Chariot Cities',
        icon: 'horseshoe', col: 0, row: 3, requires: ['il_the_gilead_held'],
        desc: 'Reach Military 4 — The Chariot Cities. Two thousand chariots is what the '
          + 'Assyrian monolith credits Ahab with at Qarqar, and it is the largest contingent '
          + 'in the coalition.',
        rewardText: '"The Two Thousand": +6% army strength permanently.',
        check: (ctx) => (((crown(ctx, 'ISL').tech || {}).mar | 0) >= 4),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ISL', {
          id: 'the_two_thousand', name: 'The Two Thousand', months: -1,
          effects: { milPowerMult: 1.06 },
        }),
      },
      {
        id: 'il_the_ivory_house', name: 'The House of Ivory',
        icon: 'coins', col: 1, row: 3, requires: ['il_the_house_that_holds'],
        desc: 'Carry the realm to 150 development with 500 talents banked — the kingdom the '
          + 'Samaria ostraca record, with its vintages, its districts and its inlaid furniture.',
        rewardText: '"The Ivory House": +10% income and +5% growth, permanently.',
        check: (ctx) => ownedDev(ctx, 'ISL') >= 150 && (crown(ctx, 'ISL').treasury || 0) >= 500,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ISL', {
          id: 'the_ivory_house', name: 'The House of Ivory', months: -1,
          effects: { incomeMult: 1.1, growthMult: 1.05 },
        }),
      },
      {
        id: 'il_the_kings_highway', name: 'The King\'s Highway',
        icon: 'scales', col: 2, row: 3, requires: ['il_the_cedar_treaty'],
        desc: 'Hold Kir-Hareseth, Rabbah and Jazer — the plateau road, and the tribute of a '
          + 'hundred thousand lambs Mesha of Moab says on his own stele that he paid.',
        rewardText: '+200 talents, "The Lambs and the Wool": +8% income permanently.',
        check: (ctx) => ['Medaba', 'Philadelphia', 'Gerasa'].every((n) => ctx.helpers.controls(ctx, 'ISL', n)),
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'ISL', { treasury: 200 });
          ctx.helpers.addTagModifier(ctx, 'ISL', {
            id: 'lambs_and_wool', name: 'The Lambs and the Wool', months: -1,
            effects: { incomeMult: 1.08 },
          });
        },
      },
      {
        id: 'il_the_arts_of_the_age', name: 'The Arts of the Age',
        icon: 'quill', col: 1, row: 4, requires: ['il_the_ivory_house'],
        desc: 'Take up three ideas of the age — a kingdom that has learned to administer '
          + 'what it took by acclamation.',
        rewardText: '+70 governance points, +20 legitimacy.',
        check: (ctx) => eraTiers(crown(ctx, 'ISL')) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ISL', { gov: 70, legitimacy: 20 }),
      },
      {
        id: 'il_all_israel', name: 'All Israel Under One Crown',
        icon: 'temple', col: 1, row: 5, requires: ['il_the_arts_of_the_age', 'il_the_chariot_cities'],
        desc: 'Hold Jerusalem and Shechem together with 28 provinces — the division undone '
          + 'from the north, which is the one thing the book of Kings never allows.',
        rewardText: '+40 legitimacy, +1 stability, and "The Whole House of Israel" (+10% manpower, +0.3 legitimacy a month).',
        check: (ctx) => ctx.helpers.controls(ctx, 'ISL', 'Jerusalem')
          && ctx.helpers.controls(ctx, 'ISL', 'Neapolis')
          && ctx.helpers.countControlled(ctx, 'ISL', {}) >= 28,
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'ISL', { legitimacy: 40, stability: 1 });
          ctx.helpers.addTagModifier(ctx, 'ISL', {
            id: 'whole_house_of_israel', name: 'The Whole House of Israel', months: -1,
            effects: { manpowerMult: 1.1, legitimacyAdd: 0.3 },
          });
        },
      },
      // ── The civil band (SPEC §211) ──────────────────────────────────────
      // What the northern kingdom actually was when it was working: a taxed,
      // districted, literate state with the best agricultural land in the
      // Levant and an export trade in oil and wine. None of it waits on the
      // war and the war does not wait on it.
      {
        id: 'il_the_elders_in_the_gate', name: 'The Elders in the Gate',
        icon: 'quill', col: 0, row: 6, civil: 'govt',
        desc: 'Take two rungs of the civil reforms — a kingdom that keeps accounts is a '
          + 'kingdom and not a confederation of tribes that agreed on a man.',
        rewardText: '"The Districts Assessed": −0.5 unrest everywhere permanently, +60 governance points.',
        check: (ctx) => (((crown(ctx, 'ISL').reforms || {}).civ | 0) >= 2),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ISL', {
            id: 'the_districts_assessed', name: 'The Districts Assessed', months: -1,
            effects: { unrestAll: -0.5 },
          });
          ctx.helpers.adjust(ctx, 'ISL', { gov: 60 });
        },
      },
      {
        id: 'il_the_house_of_omri', name: 'The House of Omri',
        icon: 'scroll', col: 0, row: 7, civil: 'govt', requires: ['il_the_elders_in_the_gate'],
        desc: 'Carry the realm to 200 development with the country steady at +2 stability — '
          + 'a dynasty the Assyrians go on calling this country by for a century after it '
          + 'is extinct.',
        rewardText: '"Bit-Humri": +10% income and +5% force limit, permanent.',
        check: (ctx) => ownedDev(ctx, 'ISL') >= 200 && (crown(ctx, 'ISL').stability || 0) >= 2,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ISL', {
          id: 'bit_humri', name: 'Bit-Humri', months: -1,
          effects: { incomeMult: 1.1, forceLimitMult: 1.05 },
        }),
      },
      {
        id: 'il_among_the_kings', name: 'Among the Kings',
        icon: 'flag', col: 1, row: 6, civil: 'region',
        desc: 'Stand among the first three courts of the world — the rank an Israelite '
          + 'kingdom held exactly once, for one generation, under Omri\'s house.',
        rewardText: '"A Power on the Coast Road": +1 diplomatic seat permanently, +50 influence points.',
        check: (ctx) => { const i = standingRank(ctx, 'ISL'); return i >= 0 && i < 3; },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ISL', {
            id: 'power_on_the_coast_road', name: 'A Power on the Coast Road', months: -1,
            effects: { diploSeats: 1 },
          });
          ctx.helpers.adjust(ctx, 'ISL', { infl: 50 });
        },
      },
      {
        id: 'il_the_league_of_the_north', name: 'The League of the North',
        icon: 'dove', col: 1, row: 7, civil: 'region', requires: ['il_among_the_kings'],
        desc: 'Hold the first three seats of the standing while Hamath\'s regard for us '
          + 'stands at +60 — the coalition that stopped Shalmaneser at Qarqar, built and '
          + 'held on purpose.',
        rewardText: '"The Coalition of Twelve Kings": +10% army strength permanently, +4,000 manpower.',
        check: (ctx) => {
          const i = standingRank(ctx, 'ISL');
          return i >= 0 && i < 3 && regard(ctx, 'HMT', 'ISL') >= 60;
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ISL', {
            id: 'coalition_of_twelve', name: 'The Coalition of Twelve Kings', months: -1,
            effects: { milPowerMult: 1.1 },
          });
          ctx.helpers.adjust(ctx, 'ISL', { manpower: 4000 });
        },
      },
      {
        id: 'il_the_prophets_and_the_crown', name: 'The Prophets and the Crown',
        icon: 'flame', col: 2, row: 6, civil: 'court',
        desc: 'Bring the Elders of the Tribes and the Priests of the Calves both to 65 '
          + 'approval at once — the assembly and the establishment, agreeing for once.',
        rewardText: '"The Word and the Throne": +0.2 legitimacy a month and −0.5 unrest everywhere, permanent.',
        check: (ctx) => {
          const f = crown(ctx, 'ISL').factions || {};
          return (f.assembly || 0) >= 65 && (f.priesthood || 0) >= 65;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ISL', {
          id: 'the_word_and_the_throne', name: 'The Word and the Throne', months: -1,
          effects: { legitimacyAdd: 0.2, unrestAll: -0.5 },
        }),
      },
      {
        id: 'il_one_kingdom_one_court', name: 'One Kingdom, One Court',
        icon: 'speaker', col: 2, row: 7, civil: 'court', requires: ['il_the_prophets_and_the_crown'],
        desc: 'Bring the tribes, the shrines and the chariot captains all to 65 approval, '
          + 'with 30 favour banked from the captains — the three men who can each depose '
          + 'you, in one room, on your side.',
        rewardText: '"No Captain Is Proclaimed": +0.3 legitimacy a month and +8% income, permanent.',
        check: (ctx) => {
          const t = crown(ctx, 'ISL');
          const f = t.factions || {};
          const bank = t.estateFavor || {};
          return (f.assembly || 0) >= 65 && (f.priesthood || 0) >= 65
            && (f.captains || 0) >= 65 && (bank.captains || 0) >= 30;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ISL', {
          id: 'no_captain_proclaimed', name: 'No Captain Is Proclaimed', months: -1,
          effects: { legitimacyAdd: 0.3, incomeMult: 1.08 },
        }),
      },
      // ── The roads not taken (SPEC §183) ─────────────────────────────────
      {
        id: 'hy_the_calves', name: 'The Two Calves', hypothetical: true,
        fork: '931bce/the_calves',
        roads: ['calves_raised', 'pilgrimage_kept'],
        icon: 'split', col: 3, row: 0,
        desc: 'Settle, in the first years, where the ten tribes sacrifice: at two shrines of '
          + 'this kingdom\'s own making, or in the other kingdom\'s capital three times a year.',
        rewardText: '+25 legitimacy, +40 influence points.',
        check: (ctx) => anyFlag(ctx, 'calvesRaised', 'pilgrimageKept'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ISL', { legitimacy: 25, infl: 40 }),
      },
      {
        id: 'hy_shishak', name: 'What Pharaoh Was Paid', hypothetical: true,
        fork: '931bce/shishaks_price',
        roads: ['tribute_paid', 'gates_held'],
        icon: 'coins', col: 3, row: 1, requires: ['hy_the_calves'],
        desc: 'Be standing in 925, when Shoshenq comes up the coast road with the whole '
          + 'Egyptian army, and answer him one way or the other — with the treasury or with '
          + 'the garrisons.',
        rewardText: '+50 governance points, +15 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'shishakTributePaid', 'shishakGatesHeld'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ISL', { gov: 50, legitimacy: 15 }),
      },
      {
        id: 'hy_the_marriage', name: 'The Tyrian Marriage', hypothetical: true,
        fork: '931bce/the_tyrian_marriage',
        roads: ['marriage_made', 'marriage_refused'],
        icon: 'star4', col: 3, row: 2, requires: ['hy_the_calves'],
        desc: 'Reach the years of Omri\'s house still a kingdom, and answer Tyre\'s offer of '
          + 'a daughter — the alliance that made this country rich and gave it the one name '
          + 'everybody still knows.',
        rewardText: '+60 influence points, +150 talents.',
        check: (ctx) => anyFlag(ctx, 'tyrianMarriage', 'tyrianMarriageRefused'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ISL', { infl: 60, treasury: 150 }),
      },
    ],
    JDH: [
      {
        id: 'jd_the_city_of_david', name: 'The City of David',
        icon: 'temple', col: 1, row: 0,
        desc: 'Hold Jerusalem with the house standing — the capital, the dynasty and the '
          + 'one building in the world that makes a two-tribe kingdom worth taking seriously.',
        rewardText: '+20 legitimacy, +60 governance points.',
        check: (ctx) => {
          try {
            const p = ctx.prov && ctx.prov('Jerusalem');
            return ctx.helpers.controls(ctx, 'JDH', 'Jerusalem') && !!p && p.wonder === 'temple';
          } catch (e) { return false; }
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JDH', { legitimacy: 20, gov: 60 }),
      },
      {
        id: 'jd_the_shephelah', name: 'The Shephelah',
        icon: 'walls', col: 0, row: 1, requires: ['jd_the_city_of_david'],
        desc: 'Hold Beth-Shemesh, Aijalon and Adoraim — the low hills that are the only '
          + 'approach to Jerusalem an army has ever used.',
        rewardText: '"The Fortified Towns": +1 hill defence permanently, +40 martial points.',
        check: (ctx) => ['Beit Shemesh', 'Emmaus', 'Adora'].every((n) => ctx.helpers.controls(ctx, 'JDH', n)),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'the_fortified_towns', name: 'The Fortified Towns', months: -1,
            effects: { hillDefBonus: 1 },
          });
          ctx.helpers.adjust(ctx, 'JDH', { mar: 40 });
        },
      },
      {
        id: 'jd_the_negeb_forts', name: 'The Forts of the Negeb',
        icon: 'tower', col: 2, row: 1, requires: ['jd_the_city_of_david'],
        desc: 'Hold the Negeb, En-Gedi and Adoraim together — the desert frontier, which is '
          + 'also the customs house on the incense road.',
        rewardText: '+120 talents, "The Southern Tolls": +8% trade permanently.',
        check: (ctx) => ['Oboda', 'Engaddi', 'Adora'].every((n) => ctx.helpers.controls(ctx, 'JDH', n)),
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'JDH', { treasury: 120 });
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'the_southern_tolls', name: 'The Southern Tolls', months: -1,
            effects: { tradeMult: 1.08 },
          });
        },
      },
      {
        id: 'jd_the_house_repaired', name: 'The House Repaired',
        icon: 'bricks', col: 1, row: 1, requires: ['jd_the_city_of_david'],
        desc: 'Stand at 70 legitimacy with 400 talents banked — the repairs to the Temple '
          + 'that four kings of Judah are remembered for paying for.',
        rewardText: '"The Doors Are Open": +0.25 legitimacy a month and −0.5 unrest everywhere, permanent.',
        check: (ctx) => (crown(ctx, 'JDH').legitimacy || 0) >= 70 && (crown(ctx, 'JDH').treasury || 0) >= 400,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'the_doors_are_open', name: 'The Doors Are Open', months: -1,
          effects: { legitimacyAdd: 0.25, unrestAll: -0.5 },
        }),
      },
      {
        id: 'jd_the_coast_road', name: 'A Window on the Coast',
        icon: 'anchor', col: 0, row: 2, requires: ['jd_the_shephelah'],
        desc: 'Take Gezer, Ekron and Joppa — a landlocked kingdom\'s one chance at a port '
          + 'and the grain plain behind it.',
        rewardText: '+180 talents and "The Coast Road": +10% trade permanently.',
        check: (ctx) => ['Lydda', 'Jamnia', 'Joppa'].every((n) => ctx.helpers.controls(ctx, 'JDH', n)),
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'JDH', { treasury: 180 });
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'the_coast_road', name: 'The Coast Road', months: -1,
            effects: { tradeMult: 1.1 },
          });
        },
      },
      {
        id: 'jd_the_lamp_kept', name: 'The Lamp Kept',
        icon: 'lamp', col: 1, row: 2, requires: ['jd_the_shephelah', 'jd_the_negeb_forts'],
        desc: 'Hold Jerusalem with the realm steady at +2 stability — an unbroken house, '
          + 'which is the whole of Judah\'s advantage and the only one it has.',
        rewardText: '"Four Hundred Years": +0.3 legitimacy a month and +6% income, permanent.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JDH', 'Jerusalem')
          && (crown(ctx, 'JDH').stability || 0) >= 2,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'four_hundred_years', name: 'Four Hundred Years', months: -1,
          effects: { legitimacyAdd: 0.3, incomeMult: 1.06 },
        }),
      },
      {
        id: 'jd_edom_and_the_gulf', name: 'Edom and the Gulf',
        icon: 'ship', col: 2, row: 2, requires: ['jd_the_negeb_forts'],
        desc: 'Hold Sela and Ezion-Geber — the red highland and the fleet port at the head '
          + 'of the gulf, which Judah loses, retakes and loses again for three centuries.',
        rewardText: '+200 talents (the copper and the Ophir trade), +20 legitimacy.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JDH', 'Petra')
          && ctx.helpers.controls(ctx, 'JDH', 'Aila'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JDH', { treasury: 200, legitimacy: 20 }),
      },
      {
        id: 'jd_the_walls_of_the_ridge', name: 'The Walls of the Ridge',
        icon: 'shield', col: 0, row: 3, requires: ['jd_the_coast_road'],
        desc: 'Reach Military 4 — The Chariot Cities. Judah will never have the north\'s '
          + 'chariotry; it can have the north\'s walls.',
        rewardText: '"Hewn Casemate": +1 fort defence permanently.',
        check: (ctx) => (((crown(ctx, 'JDH').tech || {}).mar | 0) >= 4),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'hewn_casemate', name: 'Hewn Casemate', months: -1,
          effects: { fortDefBonus: 1 },
        }),
      },
      {
        id: 'jd_the_treasury_refilled', name: 'The Treasury Refilled',
        icon: 'coins', col: 1, row: 3, requires: ['jd_the_lamp_kept'],
        desc: 'Carry the realm to 130 development with 500 talents banked — what Shishak '
          + 'took out of Jerusalem in one week, put back.',
        rewardText: '"The Shields of Gold Recast": +10% income and +5% growth, permanently.',
        check: (ctx) => ownedDev(ctx, 'JDH') >= 130 && (crown(ctx, 'JDH').treasury || 0) >= 500,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'shields_of_gold_recast', name: 'The Shields of Gold Recast', months: -1,
          effects: { incomeMult: 1.1, growthMult: 1.05 },
        }),
      },
      {
        id: 'jd_the_kings_of_the_south', name: 'The Kings of the South',
        icon: 'scales', col: 2, row: 3, requires: ['jd_edom_and_the_gulf'],
        desc: 'Bring Moab and Ammon both to +55 regard — the two plateau kingdoms Judah '
          + 'usually meets in the field, brought to the table instead.',
        rewardText: '+60 influence points and "The Plateau at Peace": −0.5 unrest everywhere, permanently.',
        check: (ctx) => regard(ctx, 'MOB', 'JDH') >= 55 && regard(ctx, 'AMO', 'JDH') >= 55,
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'JDH', { infl: 60 });
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'plateau_at_peace', name: 'The Plateau at Peace', months: -1,
            effects: { unrestAll: -0.5 },
          });
        },
      },
      {
        id: 'jd_the_arts_of_the_age', name: 'The Arts of the Age',
        icon: 'quill', col: 1, row: 4, requires: ['jd_the_treasury_refilled'],
        desc: 'Take up three ideas of the age — the scribal kingdom whose writing outlives '
          + 'every state on this map.',
        rewardText: '+70 governance points, +20 legitimacy.',
        check: (ctx) => eraTiers(crown(ctx, 'JDH')) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JDH', { gov: 70, legitimacy: 20 }),
      },
      {
        id: 'jd_all_israel_under_david', name: 'All Israel Under David',
        icon: 'laurel', col: 1, row: 5, requires: ['jd_the_arts_of_the_age', 'jd_the_walls_of_the_ridge'],
        desc: 'Hold Jerusalem, Shechem and Megiddo together with 24 provinces — the ten '
          + 'tribes brought back under the house that never lost them at the assembly.',
        rewardText: '+40 legitimacy, +1 stability, and "The Kingdom Reunited" (+10% manpower, +0.3 legitimacy a month).',
        check: (ctx) => ['Jerusalem', 'Neapolis', 'Afula'].every((n) => ctx.helpers.controls(ctx, 'JDH', n))
          && ctx.helpers.countControlled(ctx, 'JDH', {}) >= 24,
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'JDH', { legitimacy: 40, stability: 1 });
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'the_kingdom_reunited', name: 'The Kingdom Reunited', months: -1,
            effects: { manpowerMult: 1.1, legitimacyAdd: 0.3 },
          });
        },
      },
      // ── The civil band (SPEC §211) ──────────────────────────────────────
      {
        id: 'jd_the_scribes_of_the_king', name: 'The Scribes of the King',
        icon: 'quill', col: 0, row: 6, civil: 'govt',
        desc: 'Take two rungs of the civil reforms — the recorder, the scribe and the man '
          + 'over the household, which is the whole government this kingdom has.',
        rewardText: '"The Royal Seals": −0.5 unrest everywhere permanently, +60 governance points.',
        check: (ctx) => (((crown(ctx, 'JDH').reforms || {}).civ | 0) >= 2),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'the_royal_seals', name: 'The Royal Seals', months: -1,
            effects: { unrestAll: -0.5 },
          });
          ctx.helpers.adjust(ctx, 'JDH', { gov: 60 });
        },
      },
      {
        id: 'jd_the_lmlk_jars', name: 'Belonging to the King',
        icon: 'amphora', col: 0, row: 7, civil: 'govt', requires: ['jd_the_scribes_of_the_king'],
        desc: 'Carry the realm to 150 development with the country steady at +2 stability — '
          + 'the stamped storage jars of four royal towns, which is a tax system a dig can '
          + 'still read.',
        rewardText: '"The Four Towns": +10% income and +5% force limit, permanent.',
        check: (ctx) => ownedDev(ctx, 'JDH') >= 150 && (crown(ctx, 'JDH').stability || 0) >= 2,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'the_four_towns', name: 'The Four Towns', months: -1,
          effects: { incomeMult: 1.1, forceLimitMult: 1.05 },
        }),
      },
      {
        id: 'jd_a_name_among_the_powers', name: 'A Name Among the Powers',
        icon: 'flag', col: 1, row: 6, civil: 'region',
        desc: 'Stand among the first three courts of the world — which the house of David '
          + 'manages exactly once, and which its enemies record on a stele at Dan.',
        rewardText: '"The House of David": +1 diplomatic seat permanently, +50 influence points.',
        check: (ctx) => { const i = standingRank(ctx, 'JDH'); return i >= 0 && i < 3; },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'the_house_of_david', name: 'The House of David', months: -1,
            effects: { diploSeats: 1 },
          });
          ctx.helpers.adjust(ctx, 'JDH', { infl: 50 });
        },
      },
      {
        id: 'jd_the_brother_in_the_north', name: 'The Brother in the North',
        icon: 'dove', col: 1, row: 7, civil: 'region', requires: ['jd_a_name_among_the_powers'],
        desc: 'Hold the first three seats of the standing with Israel\'s regard at +60 — '
          + 'the alliance of Jehoshaphat and Ahab, the one generation in two centuries when '
          + 'the two kingdoms are not at war.',
        rewardText: '"The Two Houses at Peace": +10% income permanently, +4,000 manpower.',
        check: (ctx) => {
          const i = standingRank(ctx, 'JDH');
          return i >= 0 && i < 3 && regard(ctx, 'ISL', 'JDH') >= 60;
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'two_houses_at_peace', name: 'The Two Houses at Peace', months: -1,
            effects: { incomeMult: 1.1 },
          });
          ctx.helpers.adjust(ctx, 'JDH', { manpower: 4000 });
        },
      },
      {
        id: 'jd_the_altar_and_the_ridge', name: 'The Altar and the Ridge',
        icon: 'altar', col: 2, row: 6, civil: 'court',
        desc: 'Bring the Temple Priesthood and the People of the Land both to 65 approval '
          + 'at once — the establishment and the freeholders, who between them decide every '
          + 'disputed succession this kingdom has.',
        rewardText: '"The Country and the Courses": +0.2 legitimacy a month and −0.5 unrest everywhere, permanent.',
        check: (ctx) => {
          const f = crown(ctx, 'JDH').factions || {};
          return (f.priesthood || 0) >= 65 && (f.assembly || 0) >= 65;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'country_and_courses', name: 'The Country and the Courses', months: -1,
          effects: { legitimacyAdd: 0.2, unrestAll: -0.5 },
        }),
      },
      {
        id: 'jd_one_house_one_kingdom', name: 'One House, One Kingdom',
        icon: 'speaker', col: 2, row: 7, civil: 'court', requires: ['jd_the_altar_and_the_ridge'],
        desc: 'Bring the house, the priesthood and the people of the land all to 65 approval, '
          + 'with 30 favour banked from the priesthood — a dynasty, an establishment and a '
          + 'country that all want the same king.',
        rewardText: '"No Athaliah": +0.3 legitimacy a month and +8% income, permanent.',
        check: (ctx) => {
          const t = crown(ctx, 'JDH');
          const f = t.factions || {};
          const bank = t.estateFavor || {};
          return (f.house || 0) >= 65 && (f.priesthood || 0) >= 65
            && (f.assembly || 0) >= 65 && (bank.priesthood || 0) >= 30;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'no_athaliah', name: 'No Athaliah', months: -1,
          effects: { legitimacyAdd: 0.3, incomeMult: 1.08 },
        }),
      },
      // ── The roads not taken (SPEC §183) ─────────────────────────────────
      {
        id: 'hy_the_yoke', name: 'The Yoke', hypothetical: true,
        fork: '931bce/the_yoke',
        roads: ['scorpions', 'lighter_yoke'],
        icon: 'split', col: 3, row: 0,
        desc: 'Answer the assembly at Shechem — with the scorpions the chronicler records, '
          + 'or with the lighter yoke the old men advised and nobody took.',
        rewardText: '+25 legitimacy, +40 governance points.',
        check: (ctx) => anyFlag(ctx, 'scorpionsAnswer', 'yokeLightened'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JDH', { legitimacy: 25, gov: 40 }),
      },
      {
        id: 'hy_pharaohs_price', name: 'What Pharaoh Was Paid', hypothetical: true,
        fork: '931bce/shishaks_price',
        roads: ['tribute_paid', 'gates_held'],
        icon: 'coins', col: 3, row: 1, requires: ['hy_the_yoke'],
        desc: 'Be standing in 925, when Shoshenq comes up out of Egypt, and answer him one '
          + 'way or the other — with the gold of the house and the palace, or with the '
          + 'garrisons of the Shephelah.',
        rewardText: '+50 governance points, +15 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'shishakTributePaid', 'shishakGatesHeld'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JDH', { gov: 50, legitimacy: 15 }),
      },
    ],
  },

  aiHints: {
    ISL: { rally: ['Neapolis', 'Afula'], targetRegiments: 14 },
    JDH: { rally: ['Jerusalem'], targetRegiments: 15 },
    MIZ: { rally: ['Leontopolis', 'Memphis'], targetRegiments: 26 },
    ASR: { rally: ['Assur', 'Nineveh'], targetRegiments: 12 },
    BBL: { rally: ['Babylon'], targetRegiments: 18 },
    DMS: { rally: ['Damascus'], targetRegiments: 8 },
    PLS: { rally: ['Gaza'], targetRegiments: 8 },
    TYR: { rally: ['Tyre'], targetRegiments: 4 },
    HMT: { rally: ['Emesa'], targetRegiments: 8 },
    MOB: { rally: ['Medaba'], targetRegiments: 5 },
    AMO: { rally: ['Philadelphia'], targetRegiments: 4 },
    EDM: { rally: ['Petra'], targetRegiments: 4 },
    REB: { rally: [], targetRegiments: 0 },
  },

  checkVictory(ctx) {
    try {
      const g = ctx.game;
      const h = ctx.helpers;
      if (!g || g.over || g.result) return;

      const islTag = g.tags && g.tags[who(ctx, 'ISL')];
      const jdhTag = g.tags && g.tags[who(ctx, 'JDH')];
      const islAlive = !!(islTag && islTag.alive !== false);
      const jdhAlive = !!(jdhTag && jdhTag.alive !== false);

      if (g.playerTag === who(ctx, 'ISL')) {
        // §146: a win asks for ground that is ours in law AND in fact; a loss
        // asks whether the realm still exists, which a siege does not answer.
        const held = islAlive ? h.countHeld(ctx, 'ISL', {}) : 0;
        const realm = islAlive ? h.countOwned(ctx, 'ISL', {}) : 0;
        const core = ['Neapolis', 'Afula', 'Scythopolis', 'Caesarea Philippi']
          .every((n) => h.controls(ctx, 'ISL', n));
        if (islAlive && core && held >= 26) {
          h.endGame(ctx, {
            result: 'win',
            title: 'A Kingdom, Not a Secession',
            text: 'The ten tribes have a capital, a chariot corps, a border on the Jordan and '
              + 'a treaty with Tyre. Whatever the chroniclers in Jerusalem write about the '
              + 'calves — and they will write it for six hundred years — this is a state, and '
              + 'it is the bigger of the two.',
            score: 200,
          });
          return;
        }
        if (dateGE(g.date, -841, 1) && islAlive && standingRank(ctx, 'ISL') === 0) {
          h.endGame(ctx, {
            result: 'win',
            title: 'The King Who Did Not Kneel',
            text: 'In the year the annals of Shalmaneser show Jehu of Israel on his face '
              + 'before the throne with his tribute, this kingdom is the first power of the '
              + 'world instead. The black obelisk in Nimrud has a different picture on it.',
            score: 180,
          });
          return;
        }
        if (!islAlive || realm < 3) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'Samaria Fell',
            text: 'The northern kingdom ends as it historically ended: a deportation, a '
              + 'resettlement, and a people who stop being a people in the records. The book '
              + 'of Kings gives it one verse and a reason.',
            score: 0,
          });
          return;
        }
      } else if (g.playerTag === who(ctx, 'JDH')) {
        const held = jdhAlive ? h.countHeld(ctx, 'JDH', {}) : 0;
        const realm = jdhAlive ? h.countOwned(ctx, 'JDH', {}) : 0;
        const jer = jdhAlive && h.controls(ctx, 'JDH', 'Jerusalem');
        const temple = (() => {
          try { const p = ctx.prov && ctx.prov('Jerusalem'); return !!(p && p.wonder === 'temple'); } catch (e) { return false; }
        })();
        if (jer && temple && held >= 20) {
          h.endGame(ctx, {
            result: 'win',
            title: 'The Smaller Kingdom Made Whole',
            text: 'The ridge has ports, the Shephelah has walls, the Negeb has forts and the '
              + 'house of David has outgrown the two tribes it started with. Judah was never '
              + 'supposed to be the one that lasted. It is.',
            score: 200,
          });
          return;
        }
        if (dateGE(g.date, -722, 1) && jer && held >= 8) {
          h.endGame(ctx, {
            result: 'win',
            title: 'The House That Outlived the North',
            text: 'Samaria is an Assyrian province and its people are in Media. Jerusalem is '
              + 'still Jerusalem, the lamp is still burning, and the refugees coming south '
              + 'have doubled the size of the city. The kingdom that was given no chance in '
              + '931 is the only one left.',
            score: 170,
          });
          return;
        }
        if (!jdhAlive || realm < 2) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The Lamp Goes Out',
            text: 'The house of David ends four centuries early, and with it the line every '
              + 'later hope in this game is counted from. There is no return, because there '
              + 'is nothing to return to.',
            score: 0,
          });
          return;
        }
      }
    } catch (e) { warnOnce('checkVictory', e); }
  },
};
