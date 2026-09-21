// Judaea Universalis — bookmark: The Assyrian Flood, 732 BCE (SPEC §268).
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
//
// Historical spine: Tiglath-Pileser III has taken Damascus after a two-year
// siege, executed its king and made the kingdom of Aram into three Assyrian
// provinces. On the way he took the Galilee, the Gilead and the coast off
// Israel and made them provinces too — Magidu, Du'ru, Gal'azu — and the king
// who lost them has been murdered by a man named Hoshea, who is now paying
// tribute for what is left: Ephraim, the hill country around Samaria, and
// nothing else. The king of Judah asked Assyria to do all this, and paid for
// it with the silver and gold of the Temple, and has just come back from
// Damascus with the plans of an altar he liked.
//
// This is the chapter where the thing the other chapters call "empire" is
// invented. Tiglath-Pileser's Assyria is the first state in history to make
// deportation an instrument of routine administration rather than an act of
// vengeance: a province that revolts twice is not punished, it is REPLACED,
// its people counted out and marched somewhere they have no kin and its fields
// filled with somebody else's. Ten years from the opening it does that to the
// northern kingdom, and the people it does it to are not heard from again.
//
// Two courts are playable and they are two halves of one argument that runs
// for a hundred and twenty years: whether a small kingdom in this country
// survives by paying, or by finding a bigger patron, or by fortifying and
// refusing. Israel tries all three in ten years and is erased. Judah tries all
// three in a hundred and thirty and is still standing when Nineveh burns.
//
// Sources: 2 Kings 15-25, 2 Chronicles 28-35; Isaiah 1-39; Micah; the annals
// and summary inscriptions of Tiglath-Pileser III, Sargon II, Sennacherib,
// Esarhaddon and Ashurbanipal; the Sennacherib (Taylor/Oriental Institute)
// prism; the Lachish reliefs; the Siloam tunnel inscription; the LMLK jar
// stamps; the Assyrian eponym canon; the Babylonian Chronicle.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[bookmark_732bce] ' + key, e || '');
}

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

function anyFlag(ctx, ...keys) {
  const f = (ctx.game && ctx.game.flags) || {};
  for (const k of keys) if (f[k]) return true;
  return false;
}

// ---- the political map of the spring of 732 ---------------------------------
// What is left of Israel after the Assyrian settlement: Ephraim and the hills
// round Samaria. The Galilee, the Gilead and the coastal plain are Assyrian
// provinces with Assyrian governors in them, which is what "Tiglath-Pileser
// carried them captive to Assyria" (2 Kings 15:29) means on a map.
const ISL_LANDS = ['Sebaste', 'Neapolis', 'Jenin', 'Ramallah'];
// Judah under Ahaz: the ridge, the Shephelah, the Negeb forts and the wells.
// Elath is gone — Rezin took it and "the Edomites came and dwelt there unto
// this day" (2 Kings 16:6) — and Gath has answered to Jerusalem since Uzziah
// broke down its wall.
const JDH_LANDS = [
  'Jerusalem', 'Bethlehem', 'Hebron', 'Adora', 'Jericho', 'Engaddi',
  'Emmaus', 'Beit Shemesh', 'Lydda', 'Kiryat Gat', 'Oboda', 'Kadesh Barnea',
];
// The provinces of the empire in this country, and the empire behind them.
const ASR_LANDS = [
  // the Israelite provinces of 733-732
  'Afula', 'Scythopolis', 'Sepphoris', 'Tiberias', 'Gischala', 'Safed',
  'Caesarea Philippi', 'Dora', 'Antipatris',
  'Gadora', 'Gadara', 'Pella', 'Batanea', 'Gerasa',
  // Aram, made into provinces this year
  'Damascus', 'Chalcis', 'Palmyra',
  // the north Syrian provinces taken 743-738
  'Emesa', 'Apamea', 'Beroea', 'Antioch', 'Laodicea', 'Seleucia Pieria',
  'Samosata', 'Melitene',
  // the Assyrian homeland and the Khabur
  'Assur', 'Arbela', 'Hatra', 'Nisibis', 'Singara', 'Carrhae',
  'Edessa', 'Dura-Europos',
];
// Tyre pays and keeps its island; Sidon is watched.
const TYR_LANDS = ['Tyre', 'Sidon', 'Berytus', 'Byblos', 'Tripolis', 'Aradus', 'Ptolemais'];
// The Philistine cities, tributary since Hanunu of Gaza fled to Egypt.
const PLS_LANDS = ['Gaza', 'Ascalon', 'Azotus', 'Jamnia'];
// The plateau kingdoms, tributary and intact — the three that survive this
// century by paying without ever once trying anything else.
const MOB_LANDS = ['Medaba'];
const AMO_LANDS = ['Philadelphia'];
const EDM_LANDS = ['Petra', 'Aila'];
// Babylon under a Chaldean king, for another year.
const BBL_LANDS = ['Babylon', 'Nehardea', 'Seleucia-Ctesiphon', 'Uruk', 'Charax'];
// Elam still holds Anshan and the highland behind Susa; Ashurbanipal does not
// erase it until 646, and until he does it is the thing that finances every
// Chaldean revolt in Babylonia.
const ELA_LANDS = ['Susa', 'Persepolis', 'Gabae'];
const MDA_LANDS = ['Ecbatana', 'Gazaca'];
// Urartu after Sarduri's defeat: the highland, and no more than the highland.
const URA_LANDS = ['Tigranocerta', 'Sophene', 'Amida'];
// Midas of Phrygia, whom the Assyrians call Mita of Mushki and write letters
// about; Tabal's two dozen highland lords; the Cilician plain.
const PHR_LANDS = ['Ancyra', 'Pisidia'];
const TAB_LANDS = ['Tyana', 'Caesarea Mazaca', 'Tarsus', 'Seleucia Trachea', 'Iconium'];
const LYD_LANDS = ['Smyrna', 'Halicarnassus'];
// Egypt divided, and the Kushite about to come down the river.
const MIZ_LANDS = [
  'Leontopolis', 'Athribis', 'Alexandria', 'Memphis', 'Arsinoe', 'Oxyrhynchus',
  'Pelusium', 'Rhinocolura',
];
const KSH_LANDS = ['Napata', 'Meroe', 'Dodekaschoinos', 'Thebes', 'Syene'];
const QDR_LANDS = ['Tayma', 'Dumatha', 'Hegra'];
const SAB_LANDS = ['Marib', 'Najran'];
// Pisiris still rules in Carchemish: Sargon does not annex the last Hittite
// kingdom until 717, fifteen years into this chapter.
const CRC_LANDS = ['Zeugma', 'Cyrrhus'];

// Every other cell of the base atlas, named rather than left with a Roman or
// Parthian owner inherited from a map drawn for 66 CE (SPEC §268). A cell that
// keeps a tag no chapter seats is scenery — no court, no economy, no AI, and
// no army may enter it — so the eighth century is written out in full, WASTE
// included.
const OTHER_732 = {
  'Joppa': 'PLS',
  'Salamis': 'TYR', 'Paphos': 'TYR',     // the seven kings of Iadnana, who pay Sargon and rule themselves
  'Bostra': 'ASR',                       // the Hauran, annexed with Damascus
  'Yathrib': 'QDR', 'Khaybar': 'QDR', 'Gerrha': 'QDR',
  // The Greek world is a hundred city-states and this map has one banner for
  // it; at this cell size that banner is the honest answer and a separate
  // court for each harbour is not.
  'Corinth': 'COR', 'Athens': 'ATH', 'Sparta': 'SPT', 'Gortyn': 'CRT',
  'Rhodes': 'RHO', 'Byzantion': 'THR', 'Syracusae': 'SYC', 'Tarentum': 'TAR',
  'Rhegium': 'TAR',
  // The Tyrian emporia of the Syrtis, which by now look to the New City.
  'Oea': 'CAR', 'Leptis Magna': 'CAR', 'Macomades': 'CAR', 'Panormus': 'CAR',
  // …and what is nobody's in 732. Rome is villages sharing a market, Cyrene
  // is a century from being founded, the Persians are not in the annals, and
  // the Pontic and Adriatic shores have no polity this map can name.
  'Attalia': 'WASTE', 'Nicaea': 'WASTE', 'Sinope': 'WASTE', 'Trapezus': 'WASTE',
  'Phasis': 'WASTE', 'Cyrene': 'WASTE', 'Marmarica': 'WASTE', 'Paraetonium': 'WASTE',
  'Roma': 'WASTE', 'Capua': 'WASTE', 'Brundisium': 'WASTE',
  'Dyrrhachium': 'WASTE', 'Thessalonica': 'WASTE', 'Hadrianopolis': 'WASTE',
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
put(ISL_LANDS, 'ISL'); put(JDH_LANDS, 'JDH'); put(ASR_LANDS, 'ASR');
put(TYR_LANDS, 'TYR'); put(PLS_LANDS, 'PLS'); put(MOB_LANDS, 'MOB');
put(AMO_LANDS, 'AMO'); put(EDM_LANDS, 'EDM'); put(BBL_LANDS, 'BBL');
put(ELA_LANDS, 'ELA'); put(MDA_LANDS, 'MDA'); put(URA_LANDS, 'URA');
put(PHR_LANDS, 'PHR'); put(TAB_LANDS, 'TAB'); put(LYD_LANDS, 'LYD');
put(MIZ_LANDS, 'MIZ'); put(KSH_LANDS, 'KSH'); put(QDR_LANDS, 'QDR');
put(SAB_LANDS, 'SAB'); put(CRC_LANDS, 'CRC');
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
put(['Aleria'], 'SRD');

for (const n of Object.keys(OTHER_732)) OWNERS[n] = OTHER_732[n];

const RELIGIONS = {};
for (const n of ISL_LANDS.concat(JDH_LANDS)) RELIGIONS[n] = 'yahwism';
for (const n of TYR_LANDS.concat(PLS_LANDS, MOB_LANDS, AMO_LANDS, EDM_LANDS, QDR_LANDS)) RELIGIONS[n] = 'canaanite';
for (const n of ASR_LANDS.concat(BBL_LANDS, ELA_LANDS)) RELIGIONS[n] = 'mesopotamian';
for (const n of URA_LANDS.concat(PHR_LANDS, TAB_LANDS, LYD_LANDS, CRC_LANDS)) RELIGIONS[n] = 'anatolian_cults';
for (const n of MIZ_LANDS.concat(KSH_LANDS)) RELIGIONS[n] = 'egyptian';
for (const n of MDA_LANDS) RELIGIONS[n] = 'zoroastrianism';
for (const n of SAB_LANDS) RELIGIONS[n] = 'south_arabian';
// The Aramean towns of the Assyrian Levant keep their own gods under an
// Assyrian governor: the empire installs Ashur beside a local cult, never in
// place of it, which is why the provinces stay quiet and the exiles do not.
for (const n of ['Damascus', 'Chalcis', 'Palmyra',
  'Emesa', 'Apamea', 'Beroea', 'Antioch', 'Laodicea', 'Seleucia Pieria']) RELIGIONS[n] = 'canaanite';
// The Israelite provinces of the Assyrian Levant keep theirs too, for now.
for (const n of ['Afula', 'Scythopolis', 'Sepphoris', 'Tiberias', 'Gischala',
  'Safed', 'Caesarea Philippi', 'Gadora', 'Gadara', 'Pella', 'Batanea',
  'Gerasa']) RELIGIONS[n] = 'yahwism';

const CULTURES = {};
for (const n of ISL_LANDS) CULTURES[n] = 'israelite';
for (const n of JDH_LANDS) CULTURES[n] = 'judean';
for (const n of ['Afula', 'Scythopolis', 'Sepphoris', 'Tiberias', 'Gischala',
  'Safed', 'Caesarea Philippi', 'Gadora', 'Gadara', 'Pella', 'Batanea',
  'Gerasa', 'Antipatris', 'Dora']) CULTURES[n] = 'israelite';
for (const n of PLS_LANDS) CULTURES[n] = 'philistine';
for (const n of TYR_LANDS) CULTURES[n] = 'phoenician';
for (const n of ['Damascus', 'Chalcis', 'Palmyra',
  'Emesa', 'Apamea', 'Beroea', 'Antioch', 'Laodicea', 'Seleucia Pieria',
  'Carrhae', 'Edessa', 'Dura-Europos', 'Cyrrhus']) CULTURES[n] = 'aramean';
for (const n of MOB_LANDS) CULTURES[n] = 'moabite';
for (const n of AMO_LANDS) CULTURES[n] = 'ammonite';
for (const n of EDM_LANDS) CULTURES[n] = 'edomite';
for (const n of ['Assur', 'Arbela', 'Hatra', 'Nisibis', 'Singara',
  'Samosata', 'Melitene']) CULTURES[n] = 'assyrian';
for (const n of BBL_LANDS) CULTURES[n] = 'babylonian';
for (const n of ELA_LANDS) CULTURES[n] = 'elamite';
for (const n of URA_LANDS.concat(PHR_LANDS, TAB_LANDS, LYD_LANDS)) CULTURES[n] = 'anatolian';
for (const n of MIZ_LANDS) CULTURES[n] = 'egyptian';
for (const n of KSH_LANDS) CULTURES[n] = 'kushite';
for (const n of MDA_LANDS) CULTURES[n] = 'persian';
for (const n of QDR_LANDS) CULTURES[n] = 'arab';
for (const n of SAB_LANDS) CULTURES[n] = 'south_arabian';


// …and the same for the cells named one by one above.
for (const n of Object.keys(OTHER_732)) {
  const pair = OTHER_FAITH[OTHER_732[n]];
  if (!pair) continue;
  RELIGIONS[n] = pair[0];
  CULTURES[n] = pair[1];
}

export const BOOKMARK_732 = {
  id: '732bce',
  name: 'The Assyrian Flood',
  startDate: { y: -732, m: 4, d: 1 },
  // SPEC §121: the chapter runs to Megiddo in 609; its own undated cards
  // belong to the century of the flood and stop a reign short of the end.
  generationHorizon: -640,
  techBase: 2,
  // The Assyrian siege train is the ceiling of this age: rams, ramps, sappers
  // and a standing army paid from a treasury. Nothing on this map gets past it
  // for another three hundred years.
  techCeiling: 7,
  techTweaks: { ASR: { mar: 2, gov: 1 }, BBL: { gov: 1 }, TYR: { infl: 1 }, MIZ: { gov: 1 } },
  techNames: {
    gov: {
      1: 'The Clans and Their Levies', 2: 'The Twelve Districts', 3: 'The Royal Storehouses',
      4: 'The Stamped Jar', 5: 'The Scribes of the King', 6: 'The Book of the Chronicles',
      7: 'The Provincial Register',
    },
    infl: {
      1: 'The Gift and the Guest', 2: 'The Caravan Tolls', 3: 'The Tribute Embassy',
      4: 'The Vassal Treaty', 5: 'The Letters of the Kings', 6: 'The Loyalty Oath',
      7: 'The Court of the Great King',
    },
    mar: {
      1: 'The Men of Valour', 2: 'The Fortified Gate', 3: 'The Chariot Cities',
      4: 'The Hewn Casemate', 5: 'The Water Shaft', 6: 'The Standing Companies',
      7: 'The Siege Train',
    },
  },
  popMult: 0.5,

  govTypes: { ISL: 'monarchy', JDH: 'monarchy', PLS: 'republic' },

  provinceNames: {
    'Sebaste': 'Samaria',
    'Neapolis': 'Shechem',
    'Jenin': 'Ibleam',
    'Ramallah': 'Bethel',
    'Afula': 'Megiddo',
    'Scythopolis': 'Beth-Shean',
    'Sepphoris': 'Shimron',
    'Tiberias': 'Chinnereth',
    'Gischala': 'Kedesh',
    'Safed': 'Hazor',
    'Caesarea Philippi': 'Dan',
    'Antipatris': 'Aphek',
    'Dora': 'Dor',
    'Gadora': 'Ramoth-Gilead',
    'Pella': 'Jabesh-Gilead',
    'Gadara': 'Gilead',
    'Batanea': 'Bashan',
    'Gerasa': 'Jazer',
    'Emmaus': 'Aijalon',
    'Beit Shemesh': 'Beth-Shemesh',
    'Lydda': 'Gezer',
    'Kiryat Gat': 'Lachish',      // the second city of Judah, and the one Sennacherib besieges
    'Adora': 'Adoraim',
    'Engaddi': 'En-Gedi',
    'Oboda': 'The Negeb',
    'Aila': 'Elath',
    'Jamnia': 'Ekron',
    'Azotus': 'Ashdod',
    'Ascalon': 'Ashkelon',
    'Ptolemais': 'Akko',
    'Byblos': 'Gebal',
    'Aradus': 'Arvad',
    'Chalcis': 'Subatu',
    'Emesa': 'Hamath',
    'Apamea': 'Hadrach',
    'Palmyra': 'Tadmor',
    'Medaba': 'Kir-Hareseth',
    'Philadelphia': 'Rabbah',
    'Petra': 'Sela',
    'Kadesh Barnea': 'Kadesh-Barnea',
    'Zeugma': 'Carchemish',
    'Beroea': 'Arpad',
    'Antioch': 'Unqi',
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
    'Tigranocerta': 'Tushpa',
    'Amida': 'Amedi',
    'Sophene': 'Shupria',
    'Leontopolis': 'Tanis',
    'Athribis': 'Bubastis',
    'Alexandria': 'Sais',
    'Pelusium': 'Sin',
    'Rhinocolura': 'The Brook of Egypt',
    'Syene': 'Elephantine',
    'Oxyrhynchus': 'Per-Medjed',
    'Arsinoe': 'The Fayyum',
    'Bostra': 'The Hauran',      // Busra is a Nabataean foundation a thousand years off
    'Shobak': 'Seir',
    'Wadi Rum': 'The Hisma',
    'Azraq': 'The Sirhan Wells',
    'Salamiyah': 'The Hamath Steppe',
    'Edessa': 'Urhai',
    'Ancyra': 'Gordion',
    'Smyrna': 'Sardis',
  },

  integratedNames: {
    ISL: { 'Jerusalem': 'Jerusalem', 'Ptolemais': 'Akko', 'Azotus': 'Ashdod', 'Ascalon': 'Ashkelon' },
    JDH: {
      'Sebaste': 'Shomron', 'Neapolis': 'Shechem', 'Ptolemais': 'Akko',
      'Azotus': 'Ashdod', 'Ascalon': 'Ashkelon', 'Joppa': 'Yafo', 'Gaza': 'Azzah',
    },
    ASR: {
      'Sebaste': 'Samerina', 'Neapolis': 'Sikkunu', 'Jerusalem': 'Ursalimmu',
      'Afula': 'Magidu', 'Dora': 'Du\'ru', 'Gadara': 'Gal\'azu', 'Damascus': 'Dimasqu',
      'Tyre': 'Surru', 'Sidon': 'Sidunnu', 'Gaza': 'Hazzatu', 'Ascalon': 'Isqaluna',
      'Azotus': 'Asdudu', 'Jamnia': 'Amqarruna', 'Kiryat Gat': 'Lakisu',
    },
    MLI: 'JDH',
  },

  blurb: 'Damascus has fallen and been made into three provinces. The Galilee, the Gilead '
    + 'and the coast are provinces too, with Assyrian governors in them, and the king who '
    + 'lost them has been murdered by the man now paying tribute for what is left. In '
    + 'Jerusalem the king who asked Assyria to do all this has come home from Damascus '
    + 'with the plans of an altar he admired. Ten years from now the northern kingdom will '
    + 'stop existing. The southern one has a hundred and twenty-three years, if it is '
    + 'careful, and it will not be.',

  // SPEC §234 withdrew every district §225, §228 and §230 carved out of the
  // ancient map: outside 1948 they read as Voronoi bubbles inside their own
  // parents, and the choice was clean provinces over district count. These
  // chapters keep that rule, so what they activate is the older latent set
  // only — the Galilee and hill-country cells that carry Hazor, Megiddo,
  // Ibleam, Bethel, Bethlehem, Beth-Shemesh and Gath.
  activeProvinces: ['Safed', 'Afula', 'Jenin', 'Ramallah', 'Bethlehem', 'Beit Shemesh', 'Kiryat Gat'],
  mergeProvinces: {
    'Masada': 'Engaddi',
    'Machaerus': 'Medaba',
    'Jotapata': 'Sepphoris',
    'Tarichaea': 'Tiberias',
    'Caesarea Maritima': 'Dora',
    'Gamala': 'Batanea',
    'Berenice': 'Thebes',
    'Myos Hormos': 'Thebes',
  },

  tagTweaks: {
    BBL: {
      name: 'Babylon', adj: 'Babylonian', capital: 'Babylon',
      description: 'The old city of the south under a Chaldean king from the marshes, paying '
        + 'Assyria when it must and financing every revolt against it when it can.',
    },
    ASR: {
      name: 'Assyria', adj: 'Assyrian', capital: 'Assur',
      description: 'The first empire in the world with a standing army, a provincial civil '
        + 'service and a population policy. It does not want your land; it wants your tribute, '
        + 'your cavalry and your silence, and if it has to ask twice it moves your nation.',
    },
    // The era's lens on two courts whose letters outlive their century
    // (SPEC §139). `GRC` is the modern Greek state's three letters; in the
    // eighth century what they stand for is a hundred independent cities that
    // share a language, a script newly borrowed from Tyre, a festival calendar
    // and nothing else — and which are, collectively, the newest commercial
    // power in this sea. `CIM` is the Cimbri of Jutland eight centuries later;
    // here it is the horse-people out of the Caucasus who break Urartu in this
    // chapter's own lifetime and burn Gordion.
    GRC: {
      name: 'The Hellenes', adj: 'Hellene', capital: 'Corinth',
      religion: 'hellenism', culture: 'greek',
      description: 'A hundred cities with no common government, a script borrowed from Tyre '
        + 'two generations ago, and colonies going out along every shore of two seas at once.',
    },
    CIM: {
      name: 'The Cimmerians', adj: 'Cimmerian', capital: 'Panticapaeum',
      religion: 'steppe_cults', culture: 'sarmatian',
      description: 'Horse-archers out of the grass beyond the Caucasus, who beat the Urartian '
        + 'army in the field, burned Gordion, and are tracked anxiously through the Assyrian '
        + 'intelligence correspondence for fifty years.',
    },
    MIZ: {
      name: 'Egypt', adj: 'Egyptian', capital: 'Leontopolis',
      description: 'Four courts in the Delta calling each other Pharaoh, with a Kushite army '
        + 'coming up the river behind them. Everyone in the Levant leans on it and the '
        + 'Assyrians have a phrase for what happens next.',
    },
  },

  activeTags: [
    'ISL', 'JDH', 'ASR', 'BBL', 'TYR', 'PLS', 'MOB', 'AMO', 'EDM',
    'ELA', 'MDA', 'URA', 'PHR', 'TAB', 'LYD', 'CRC', 'MIZ', 'KSH', 'QDR', 'SAB',
    // The political frame (SPEC §173, §205) in the eighth century: Carthage is
    // ninety years old, Tartessos is trading tin, the horse-peoples are over
    // the Caucasus, and the Garamantes are where they always are.
    'CAR', 'GRC', 'GRM', 'SCY', 'CIM', 'HDR',
    'COR', 'ATH', 'SPT', 'CRT', 'RHO', 'SYC', 'TAR', 'THR',
    // The west (SPEC §280).
    'ETR', 'SRD', 'TRT', 'IBE', 'CTB',
  ],
  rivalries: [['ASR', 'BBL'], ['ASR', 'URA'], ['ASR', 'ELA'], ['JDH', 'ISL'], ['JDH', 'EDM']],
  affinities: [
    ['JDH', 'ASR', { axis: 'alignment', sign: -1 }], // Ahaz asked, and paid
    ['ISL', 'MIZ'],
    ['BBL', 'ELA'],
  ],

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

  // The empire's own god, installed beside the local one (SPEC §104). Assyria
  // did not convert anybody: it required that the king of Ashur be
  // acknowledged, put a stele in the provincial capital, and left the rest
  // alone. What it DID do — and this is the mechanism that ends a nation —
  // was move populations, and a province with somebody else's people in it
  // drifts to somebody else's gods within a generation.
  faithDrift: {
    mesopotamian: {
      from: ['yahwism', 'canaanite', 'anatolian_cults'],
      resistedBy: { yahwism: 0.7, canaanite: 0.45 },
      seeds: ['Assur', 'Arbela', 'Hatra', 'Nisibis'],
      seedOwner: 'ASR',
      seedShare: 0.12,
      vigor: 0.0009,
      spreadsAlong: 'trade',
      monthlyCap: 0.0035,
      curve: (y, ctx) => {
        const f = (ctx && ctx.game && ctx.game.flags) || {};
        if (f.deportationsBegun) return 1;
        return y >= -722 ? 0.6 : 0.2;
      },
    },
  },

  objectives: {
    ISL: [
      'Win: still holding Samaria in 715, with 8 provinces — the kingdom that was not deported.',
      'Win: retake the Galilee and the Gilead — Megiddo, Hazor and Ramoth-Gilead held together.',
      'Crown the chain: hold Samaria and Jerusalem at once and rule all Israel.',
      'Lose: Samaria taken, or the north reduced below two provinces.',
    ],
    JDH: [
      'Win: still holding Jerusalem in 700, with the Assyrian repulsed and 18 provinces.',
      'Win: reach 640 as the first power of the world — the kingdom that outlived the empire.',
      'Crown the chain: take Samaria and bring the north back under the house of David.',
      'Lose: Jerusalem taken, or the house of David extinguished.',
    ],
  },

  schools: { ISL: 'altars_and_the_house', JDH: 'altars_and_the_house' },

  factions: {
    ISL: [
      {
        id: 'assembly', name: 'The Elders of Ephraim',
        desc: 'What is left of the assembly that made kings at Shechem: four districts of hill '
          + 'country and a memory of having been ten tribes.',
        drift(ctx, t) { return (t.warExhaustion || 0) <= 5 ? 0.4 : -0.5; },
        boon: { name: 'The Hills Muster', text: '+10% manpower', effects: { manpowerMult: 1.1 } },
        bane: { name: 'The Villages Bargain Alone', text: '+1.25 unrest everywhere', effects: { unrestAll: 1.25 } },
        appease: { label: 'Remit the tribute levy (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Elders Ask Who Is Paying the Tribute',
          text: 'The schedule the Assyrian set is assessed on a kingdom that no longer exists: '
            + 'the Galilee and the Gilead are provinces now and their share has quietly been '
            + 'added to Ephraim\'s. The districts want it re-cut or they will cut it themselves.',
          grant: { label: 'Re-cut the assessment', cost: { gov: 55 } },
          refuse: { label: 'The Assyrian does not renegotiate', tooltip: 'Neither, it turns out, do the districts.' },
        },
      },
      {
        id: 'priesthood', name: 'The Priests of Bethel',
        desc: 'The establishment of the northern kingdom, whose southern shrine is now four '
          + 'miles from a border it did not use to have.',
        drift(ctx, t) {
          try { return ctx.helpers.controls(ctx, 'ISL', 'Ramallah') ? 0.45 : -0.6; } catch (e) { return 0; }
        },
        boon: { name: 'The Feast Kept', text: '+0.25 legitimacy a month', effects: { legitimacyAdd: 0.25 } },
        bane: { name: 'The Shrine Stands Empty', text: '−8% income', effects: { incomeMult: 0.92 } },
        appease: { label: 'Endow the house at Bethel (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'Bethel Asks for a Guarantee',
          text: 'The king\'s sanctuary is a day\'s walk from Judah and two days from an Assyrian '
            + 'garrison, and the priests have noticed that neither of those is a guarantee. They '
            + 'want walls, a treasury and a written undertaking that the crown will not trade '
            + 'the shrine for a border.',
          grant: { label: 'Walls and a written undertaking', cost: { infl: 55 } },
          refuse: { label: 'Nothing here can be guaranteed', tooltip: 'The priests begin their own correspondence with Jerusalem.' },
        },
      },
      {
        id: 'captains', name: 'The Captains of Samaria',
        desc: 'The garrison of the last walled city this kingdom owns, and the men who put '
          + 'the present king on the throne by killing the last one.',
        drift(ctx, t) {
          const g = ctx.game;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.5 : -0.35;
        },
        boon: { name: 'The Hill Fortress', text: '+1 fort defence', effects: { fortDefBonus: 1 } },
        bane: { name: 'A Third King in Ten Years', text: '−1 stability', effects: { stabilityAdd: -1 } },
        appease: { label: 'Pay the garrison (100 talents)', cost: { treasury: 100 } },
        demand: {
          title: 'The Garrison Wants the Walls Finished',
          text: 'Samaria is on a hill with a casemate wall and cisterns and it is the only '
            + 'reason this kingdom still exists. The captains want the second wall, the '
            + 'granaries filled and the cisterns deepened, and they want it before the next '
            + 'tribute is due rather than after.',
          grant: { label: 'Finish the walls', cost: { treasury: 160 } },
          refuse: { label: 'The tribute comes first', tooltip: 'The captains count the months of grain.' },
        },
      },
    ],
    JDH: [
      {
        id: 'house', name: 'The House of David',
        desc: 'Fourteen generations of unbroken succession and a great many cousins, which is '
          + 'this kingdom\'s only structural advantage over every state around it.',
        drift(ctx, t) { return (t.legitimacy || 0) >= 55 ? 0.45 : -0.45; },
        boon: { name: 'The Lamp in Jerusalem', text: '+0.3 legitimacy a month', effects: { legitimacyAdd: 0.3 } },
        bane: { name: 'The Cousins Confer', text: '−1 stability', effects: { stabilityAdd: -1 } },
        appease: { label: 'Honour the house (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'The House Asks About the Succession',
          text: 'Two kings of this house in living memory have been assassinated by their own '
            + 'servants and one was struck with leprosy and governed from a separate house. The '
            + 'family wants the heir named, housed, given a fortress and shown to the country '
            + 'while there is still a country to show him to.',
          grant: { label: 'Name him and show him', cost: { treasury: 130 } },
          refuse: { label: 'Not while the Assyrian is reading our letters', tooltip: 'The cousins take their own precautions.' },
        },
      },
      {
        id: 'priesthood', name: 'The Temple Priesthood',
        desc: 'Zadok\'s house: the establishment of the one house in the world where this god '
          + 'is sacrificed to according to the pattern — and the men who watched the king '
          + 'send its silver to Nineveh.',
        drift(ctx, t) {
          try { return ctx.helpers.controls(ctx, 'JDH', 'Jerusalem') ? 0.4 : -0.8; } catch (e) { return 0; }
        },
        boon: { name: 'The Courses in Order', text: '−0.5 unrest everywhere', effects: { unrestAll: -0.5 } },
        bane: { name: 'The Doors Are Shut', text: '−0.4 legitimacy a month', effects: { legitimacyAdd: -0.4 } },
        appease: { label: 'Repair the house (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Priesthood Asks What the Altar Is For',
          text: 'There is a new altar in the court, built to a pattern the king admired at '
            + 'Damascus, and the bronze one Solomon made has been moved to the north side "to '
            + 'enquire by." The priesthood would like to know, in writing, which of the two the '
            + 'kingdom sacrifices on — and whose pattern the next one will follow.',
          grant: { label: 'Rule on the altar, in writing', cost: { gov: 60 } },
          refuse: { label: 'The king sacrifices where he likes', tooltip: 'The priesthood writes it down anyway.' },
        },
      },
      {
        id: 'assembly', name: 'The People of the Land',
        desc: 'The free landholders of Judah, who made Joash king, killed Athaliah, and will '
          + 'put two more kings on this throne before the century ends.',
        drift(ctx, t) { return (t.stability || 0) >= 0 ? 0.35 : -0.5; },
        boon: { name: 'The Country Musters', text: '+8% manpower', effects: { manpowerMult: 1.08 } },
        bane: { name: 'The Country Stays Home', text: '−10% reinforcement', effects: { reinforceMult: 0.9 } },
        appease: { label: 'Remit the levy (80 talents)', cost: { treasury: 80 } },
        demand: {
          title: 'The Country Wants Lachish Walled',
          text: 'Everybody who has ever taken Jerusalem came up through the Shephelah, and the '
            + 'landholders of the Shephelah have worked out that they are the shield and the '
            + 'ridge is the thing being shielded. They want Lachish, Azekah and Beth-Shemesh '
            + 'walled and stocked out of the royal treasury, in that order, this year.',
          grant: { label: 'The crown pays for the walls', cost: { treasury: 170 } },
          refuse: { label: 'The tribute has first call', tooltip: 'The Shephelah begins negotiating on its own account.' },
        },
      },
    ],
  },
  playableTags: [
    {
      tag: 'JDH',
      difficulty: 'Hard',
      blurb: 'You asked the Assyrian in and paid him with the Temple silver, and it worked: '
        + 'Damascus is gone, Israel is a quarter of what it was, and you are alive. Now find '
        + 'out what being alive costs. The hundred and twenty years in front of you contain '
        + 'the single most dangerous army in the world coming up this road twice, and the '
        + 'kingdom that survives them is the one that walls the Shephelah, digs the tunnel, '
        + 'and never once believes Egypt.',
    },
    {
      tag: 'ISL',
      difficulty: 'Very Hard',
      blurb: 'Four districts, one walled city, a tribute assessed on a kingdom that no longer '
        + 'exists, and ten years before the counting begins. History gives this court no way '
        + 'out; the sources record it trying Egypt, which was the worst of the available '
        + 'options. There are others.',
    },
  ],

  buildings: {
    'Jerusalem': ['walls', 'temple', 'market'],
    'Sebaste': ['walls', 'granary'],
    'Kiryat Gat': ['walls'],       // Lachish, level III
    'Afula': ['walls'],
    'Hatra': ['walls', 'market'],
    'Assur': ['walls'],
    'Babylon': ['walls', 'market'],
    'Tyre': ['shipyard', 'market'],
    'Sidon': ['shipyard'],
    'Memphis': ['market', 'granary'],
    'Damascus': ['walls', 'market'],
    'Gaza': ['market'],
  },

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

    // The settlement of 732: everyone in this country is somebody's tributary.
    for (const t of ['ISL', 'JDH', 'PLS', 'MOB', 'AMO', 'EDM', 'TYR']) {
      if (g.tags[t]) g.tags[t].overlord = 'ASR';
    }
    h.setFlag(ctx, 'assyrianVassalage', true);

    h.adjust(ctx, 'ASR', { treasury: 1200, manpower: 60000, stability: 3, legitimacy: 85 });
    h.adjust(ctx, 'ISL', { treasury: 240, manpower: 5000, stability: -1, legitimacy: 25 });
    h.adjust(ctx, 'JDH', { treasury: 160, manpower: 9000, stability: 0, legitimacy: 60 });
    h.adjust(ctx, 'BBL', { treasury: 400, manpower: 14000, stability: 0, legitimacy: 40 });
    h.adjust(ctx, 'MIZ', { treasury: 500, manpower: 18000, stability: -1, legitimacy: 35 });
    h.adjust(ctx, 'KSH', { treasury: 350, manpower: 16000, stability: 2, legitimacy: 65 });
    h.adjust(ctx, 'TYR', { treasury: 500, manpower: 4000, stability: 1 });
    h.adjust(ctx, 'URA', { treasury: 200, manpower: 10000, stability: 0 });
    h.adjust(ctx, 'ELA', { treasury: 320, manpower: 14000 });
    h.adjust(ctx, 'MDA', { treasury: 120, manpower: 8000 });
    h.adjust(ctx, 'PHR', { treasury: 260, manpower: 9000 });
    h.adjust(ctx, 'LYD', { treasury: 300, manpower: 6000 });

    setOpinion(g, 'ASR', 'ISL', -60); setOpinion(g, 'ISL', 'ASR', -150);
    setOpinion(g, 'ASR', 'JDH', 50);  setOpinion(g, 'JDH', 'ASR', -40);
    setOpinion(g, 'ISL', 'JDH', -80); setOpinion(g, 'JDH', 'ISL', -60);
    setOpinion(g, 'ISL', 'MIZ', 60);  setOpinion(g, 'MIZ', 'ISL', 30);
    setOpinion(g, 'ASR', 'BBL', -160); setOpinion(g, 'BBL', 'ASR', -160);
    setOpinion(g, 'ASR', 'URA', -140); setOpinion(g, 'URA', 'ASR', -140);
    setOpinion(g, 'ASR', 'MIZ', -90);  setOpinion(g, 'MIZ', 'ASR', -90);
    setOpinion(g, 'JDH', 'EDM', -90);  setOpinion(g, 'EDM', 'JDH', -110);

    h.addTagModifier(ctx, 'ASR', {
      id: 'the_reorganised_empire', name: 'The Reorganised Empire', months: -1,
      effects: { milPowerMult: 1.2, siegeMult: 1.25, manpowerMult: 1.15, incomeMult: 1.35 },
    });
    // Four districts out of twelve, and the four that are left are the hill
    // country around the capital — but they ARE the hill country around the
    // capital, with the Samaria ivories and the wine and oil of the northern
    // terraces still in them. Stripped is not the same as destitute: at 0.7
    // the rump could not pay its own garrison in four campaigns out of five,
    // which made Very Hard mean bankrupt rather than hard.
    h.addTagModifier(ctx, 'ISL', {
      id: 'the_stripped_kingdom', name: 'The Stripped Kingdom', months: -1,
      effects: { incomeMult: 0.82, manpowerMult: 0.7, legitimacyAdd: -0.2 },
    });
    // Six years, not ten: the tribute stops when Hoshea stops paying it, which
    // is the chapter's own letter to So and the reason Shalmaneser comes. A
    // schedule that ran to the end of the chapter would be charging Israel for
    // an obedience the sources say it withdrew.
    h.addTagModifier(ctx, 'ISL', {
      id: 'the_tribute_of_hoshea', name: 'The Tribute of Hoshea', months: 72,
      effects: { incomeMult: 0.85 },
    });
    h.addTagModifier(ctx, 'JDH', {
      id: 'the_silver_of_the_house', name: 'The Silver of the House', months: 96,
      effects: { incomeMult: 0.85, legitimacyAdd: -0.1 },
    });
    h.addTagModifier(ctx, 'JDH', {
      id: 'the_lamp_of_david', name: 'The Lamp of David', months: -1,
      effects: { legitimacyAdd: 0.2, hillDefBonus: 1 },
    });
    h.addTagModifier(ctx, 'MIZ', {
      id: 'the_broken_reed', name: 'The Broken Reed', months: -1,
      effects: { moraleMult: 0.85, incomeMult: 0.9 },
    });
    // Kush is not a poor kingdom having a good century. It is the gold: the
    // Nubian mines are the reason every Assyrian king from Sargon on writes
    // about Egypt in the same paragraph as tribute, and the 25th Dynasty is
    // paying for the Nile valley out of them.
    h.addTagModifier(ctx, 'KSH', {
      id: 'the_gold_of_nubia', name: 'The Gold of Nubia', months: -1,
      effects: { incomeMult: 1.35, tradeMult: 1.1 },
    });
    // Urartu after 743: the field army is gone, the canals of Rusa are not,
    // and the metalwork still goes west by the ton.
    h.addTagModifier(ctx, 'URA', {
      id: 'the_canals_of_rusa', name: 'The Canals of Rusa', months: -1,
      effects: { incomeMult: 1.2, fortDefBonus: 1, moraleMult: 0.92 },
    });

    h.spawnFleet(ctx, 'TYR', 'Tyre', 7, { name: 'The Fleet of Tyre' });
    h.spawnFleet(ctx, 'MIZ', 'Leontopolis', 3, { name: 'The Delta Squadron' });

    h.spawnArmy(ctx, 'ASR', 'Damascus', {
      inf: 13, cav: 7, name: 'The Army of the Land',
      general: { name: 'Tiglath-Pileser III', fire: 4, shock: 4, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'ASR', 'Assur', { inf: 9, cav: 4, name: 'The Royal Reserve' });
    h.spawnArmy(ctx, 'ASR', 'Afula', { inf: 5, cav: 2, name: 'The Governor of Magidu' });
    h.spawnArmy(ctx, 'ISL', 'Sebaste', {
      inf: 3, name: 'The Guard of Samaria',
      general: { name: 'Hoshea son of Elah', fire: 1, shock: 2, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'JDH', 'Jerusalem', {
      inf: 6, cav: 1, name: 'The Muster of Judah',
      general: { name: 'Ahaz', fire: 1, shock: 1, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'JDH', 'Kiryat Gat', { inf: 3, name: 'The Garrison of Lachish' });
    h.spawnArmy(ctx, 'BBL', 'Babylon', {
      inf: 9, cav: 3, name: 'The Levy of Babylon',
      general: { name: 'Nabu-mukin-zeri', fire: 2, shock: 2, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'MIZ', 'Leontopolis', { inf: 8, cav: 3, name: 'The Army of the Delta' });
    h.spawnArmy(ctx, 'KSH', 'Thebes', {
      inf: 9, cav: 3, name: 'The Army of Napata',
      general: { name: 'Piye', fire: 2, shock: 3, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'URA', 'Tigranocerta', { inf: 4, cav: 2, name: 'The Host of Haldi' });
    h.spawnArmy(ctx, 'ELA', 'Susa', { inf: 6, cav: 3, name: 'The Host of Elam' });
    h.spawnArmy(ctx, 'PLS', 'Gaza', { inf: 3, name: 'The Levy of the Cities' });
    h.spawnArmy(ctx, 'EDM', 'Petra', { inf: 2, name: 'The Men of Seir' });
    h.spawnArmy(ctx, 'MOB', 'Medaba', { inf: 2, name: 'The Men of Chemosh' });
    h.spawnArmy(ctx, 'AMO', 'Philadelphia', { inf: 2, name: 'The Guard of Rabbah' });

    h.notify(ctx, {
      title: 'The Assyrian Flood',
      text: 'Damascus is three provinces, the Galilee is a fourth, and the tribute is due in '
        + 'the spring. Every crown in this country now serves at somebody else\'s pleasure.',
      type: 'war', provName: 'Sebaste',
    });
  },

  rulers: {
    ASR: { name: 'Tiglath-Pileser III', title: 'King of the Four Quarters', gov: 4, infl: 4, mar: 4, age: 58 },
    ISL: { name: 'Hoshea son of Elah', title: 'King of Israel', gov: 2, infl: 2, mar: 2, age: 38 },
    JDH: {
      name: 'Ahaz', title: 'King of Judah', gov: 2, infl: 3, mar: 1, age: 25,
      heir: { name: 'Hezekiah', gov: 4, infl: 3, mar: 3, age: 7 },
    },
    BBL: { name: 'Nabu-mukin-zeri', title: 'King of Babylon', gov: 2, infl: 2, mar: 2, age: 46 },
    MIZ: { name: 'Osorkon IV', title: 'Pharaoh', gov: 1, infl: 2, mar: 1, age: 40 },
    KSH: { name: 'Piye', title: 'King of Kush', gov: 3, infl: 3, mar: 4, age: 35 },
    TYR: { name: 'Hiram II', title: 'King of Tyre', gov: 3, infl: 4, mar: 1, age: 45 },
    URA: { name: 'Sarduri II', title: 'King of Urartu', gov: 3, infl: 2, mar: 3, age: 55 },
    PHR: { name: 'Midas', title: 'King of Phrygia', gov: 3, infl: 3, mar: 2, age: 35 },
    ELA: { name: 'Humban-nikash I', title: 'King of Elam', gov: 2, infl: 2, mar: 3, age: 44 },
    MDA: { name: 'The Chiefs of the Medes', title: 'Chief', gov: 2, infl: 1, mar: 3, age: 40 },
    EDM: { name: 'Qaus-malaka', title: 'King of Edom', gov: 2, infl: 2, mar: 2, age: 42 },
    MOB: { name: 'Salamanu', title: 'King of Moab', gov: 2, infl: 2, mar: 2, age: 45 },
    AMO: { name: 'Sanipu', title: 'King of Ammon', gov: 2, infl: 2, mar: 2, age: 40 },
    PLS: { name: 'Mitinti of Ashkelon', title: 'Seren', gov: 2, infl: 2, mar: 2, age: 44 },
    LYD: { name: 'The King of Sardis', title: 'King', gov: 3, infl: 3, mar: 2, age: 40 },
  },

  missions: {
    JDH: [
      {
        id: 'jh_the_city', name: 'The City and the House',
        icon: 'temple', col: 1, row: 0,
        desc: 'Hold Jerusalem with the house standing — the capital, the dynasty and the one '
          + 'building the Assyrian schedule has already been paid out of once.',
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
        id: 'jh_the_shephelah', name: 'The Shephelah Walled',
        icon: 'walls', col: 0, row: 1, requires: ['jh_the_city'],
        desc: 'Hold Lachish, Beth-Shemesh and Aijalon — the low hills that are the only road '
          + 'to Jerusalem, and the ground the Assyrian reliefs are about.',
        rewardText: '"The Fortified Towns": +1 hill defence permanently, +40 martial points.',
        check: (ctx) => ['Kiryat Gat', 'Beit Shemesh', 'Emmaus'].every((n) => ctx.helpers.controls(ctx, 'JDH', n)),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'the_fortified_towns_732', name: 'The Fortified Towns', months: -1,
            effects: { hillDefBonus: 1 },
          });
          ctx.helpers.adjust(ctx, 'JDH', { mar: 40 });
        },
      },
      {
        id: 'jh_the_negeb', name: 'The Wells and the Forts',
        icon: 'tower', col: 2, row: 1, requires: ['jh_the_city'],
        desc: 'Hold the Negeb, En-Gedi and Adoraim — the desert frontier, the caravan customs '
          + 'and the one direction the empire does not come from.',
        rewardText: '+120 talents, "The Southern Tolls": +8% trade permanently.',
        check: (ctx) => ['Oboda', 'Engaddi', 'Adora'].every((n) => ctx.helpers.controls(ctx, 'JDH', n)),
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'JDH', { treasury: 120 });
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'the_southern_tolls_732', name: 'The Southern Tolls', months: -1,
            effects: { tradeMult: 1.08 },
          });
        },
      },
      {
        id: 'jh_the_conduit', name: 'The Conduit and the Pool',
        icon: 'bricks', col: 1, row: 1, requires: ['jh_the_city'],
        desc: 'Hold Jerusalem with walls and a granary raised on it — the tunnel from the '
          + 'spring to the pool inside the wall, which is the whole answer to a siege.',
        rewardText: '"The Waters of Gihon Within": +15% siege endurance and +1 fort defence, permanently.',
        check: (ctx) => {
          try {
            const p = ctx.prov && ctx.prov('Jerusalem');
            if (!p || p.owner !== who(ctx, 'JDH')) return false;
            const b = p.buildings || [];
            return b.indexOf('walls') !== -1 && b.indexOf('granary') !== -1;
          } catch (e) { return false; }
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'waters_of_gihon', name: 'The Waters of Gihon Within', months: -1,
          effects: { siegeMult: 1.15, fortDefBonus: 1 },
        }),
      },
      {
        id: 'jh_the_water_shaft', name: 'The Art of the Siege',
        icon: 'shield', col: 0, row: 2, requires: ['jh_the_shephelah'],
        desc: 'Reach Military 5 — The Water Shaft. A kingdom that cannot beat this army in '
          + 'the field can make every town it takes cost a season.',
        rewardText: '"Forty-Six Towns Dear": +12% siege endurance permanently.',
        check: (ctx) => (((crown(ctx, 'JDH').tech || {}).mar | 0) >= 5),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'forty_six_towns_dear', name: 'Forty-Six Towns Dear', months: -1,
          effects: { siegeMult: 1.12 },
        }),
      },
      {
        id: 'jh_the_lamp_kept', name: 'The Lamp Kept',
        icon: 'lamp', col: 1, row: 2, requires: ['jh_the_shephelah', 'jh_the_negeb'],
        desc: 'Hold Jerusalem with the realm steady at +2 stability — a house that has not '
          + 'been broken by an empire, a plague, or its own cousins.',
        rewardText: '"The Unbroken House": +0.3 legitimacy a month and +6% income, permanent.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JDH', 'Jerusalem')
          && (crown(ctx, 'JDH').stability || 0) >= 2,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'the_unbroken_house', name: 'The Unbroken House', months: -1,
          effects: { legitimacyAdd: 0.3, incomeMult: 1.06 },
        }),
      },
      {
        id: 'jh_the_gulf', name: 'Elath Retaken',
        icon: 'ship', col: 2, row: 2, requires: ['jh_the_negeb'],
        desc: 'Hold Sela and Elath — the red highland and the port at the head of the gulf '
          + 'that Rezin took off this kingdom in the year the chapter opens.',
        rewardText: '+200 talents (the copper and the caravans), +20 legitimacy.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JDH', 'Petra')
          && ctx.helpers.controls(ctx, 'JDH', 'Aila'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JDH', { treasury: 200, legitimacy: 20 }),
      },
      {
        id: 'jh_the_coast_road', name: 'Ekron and the Plain',
        icon: 'anchor', col: 0, row: 3, requires: ['jh_the_water_shaft'],
        desc: 'Take Ekron, Ashdod and Gezer — the coastal plain, which is where every '
          + 'Philistine revolt against the empire starts and where Judah is always blamed '
          + 'for it.',
        rewardText: '+180 talents and "The Plain Held": +10% trade permanently.',
        check: (ctx) => ['Jamnia', 'Azotus', 'Lydda'].every((n) => ctx.helpers.controls(ctx, 'JDH', n)),
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'JDH', { treasury: 180 });
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'the_plain_held', name: 'The Plain Held', months: -1,
            effects: { tradeMult: 1.1 },
          });
        },
      },
      {
        id: 'jh_the_refugees', name: 'The City That Doubled',
        icon: 'quill', col: 2, row: 3, requires: ['jh_the_gulf'],
        desc: 'Carry Jerusalem to 12 development — the western hill walled in and settled, '
          + 'because everybody who could walk out of the north walked here.',
        rewardText: '"The Broad Wall": +8% growth and +6% manpower, permanently.',
        check: (ctx) => {
          try {
            const p = ctx.prov && ctx.prov('Jerusalem');
            if (!p || p.owner !== who(ctx, 'JDH')) return false;
            const d = p.dev || {};
            return ((d.tax | 0) + (d.prod | 0) + (d.mp | 0)) >= 12;
          } catch (e) { return false; }
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'the_broad_wall', name: 'The Broad Wall', months: -1,
          effects: { growthMult: 1.08, manpowerMult: 1.06 },
        }),
      },
      {
        id: 'jh_the_stamped_jars', name: 'Belonging to the King',
        icon: 'amphora', col: 1, row: 3, requires: ['jh_the_lamp_kept'],
        desc: 'Carry the realm to 160 development with 500 talents banked — four royal '
          + 'storage centres, stamped jars, and a kingdom that can provision a siege.',
        rewardText: '"The Four Towns": +10% income and +5% growth, permanently.',
        check: (ctx) => ownedDev(ctx, 'JDH') >= 160 && (crown(ctx, 'JDH').treasury || 0) >= 500,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'the_four_towns_732', name: 'The Four Towns', months: -1,
          effects: { incomeMult: 1.1, growthMult: 1.05 },
        }),
      },
      {
        id: 'jh_the_arts_of_the_age', name: 'The Arts of the Age',
        icon: 'scroll', col: 1, row: 4, requires: ['jh_the_stamped_jars'],
        desc: 'Take up three ideas of the age — the century that produced this kingdom\'s '
          + 'archive, its prophets and its engineers.',
        rewardText: '+70 governance points, +20 legitimacy.',
        check: (ctx) => eraTiers(crown(ctx, 'JDH')) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JDH', { gov: 70, legitimacy: 20 }),
      },
      {
        id: 'jh_all_israel', name: 'All Israel Under David',
        icon: 'laurel', col: 1, row: 5, requires: ['jh_the_arts_of_the_age', 'jh_the_coast_road'],
        desc: 'Hold Jerusalem, Samaria and Megiddo together with 20 provinces — the north '
          + 'taken back off the empire rather than off its own king.',
        rewardText: '+40 legitimacy, +1 stability, and "The Kingdom Reunited" (+10% manpower, +0.3 legitimacy a month).',
        check: (ctx) => ['Jerusalem', 'Sebaste', 'Afula'].every((n) => ctx.helpers.controls(ctx, 'JDH', n))
          && ctx.helpers.countControlled(ctx, 'JDH', {}) >= 20,
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'JDH', { legitimacy: 40, stability: 1 });
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'the_kingdom_reunited_732', name: 'The Kingdom Reunited', months: -1,
            effects: { manpowerMult: 1.1, legitimacyAdd: 0.3 },
          });
        },
      },
      // ── The civil band (SPEC §211) ──────────────────────────────────────
      {
        id: 'jh_the_scribes', name: 'The Scribes of the King',
        icon: 'quill', col: 0, row: 6, civil: 'govt',
        desc: 'Take two rungs of the civil reforms — the recorder, the scribe and the man '
          + 'over the household, which is what a kingdom uses instead of an empire.',
        rewardText: '"The Royal Seals": −0.5 unrest everywhere permanently, +60 governance points.',
        check: (ctx) => (((crown(ctx, 'JDH').reforms || {}).civ | 0) >= 2),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'the_royal_seals_732', name: 'The Royal Seals', months: -1,
            effects: { unrestAll: -0.5 },
          });
          ctx.helpers.adjust(ctx, 'JDH', { gov: 60 });
        },
      },
      {
        id: 'jh_the_archive', name: 'The Archive in the House',
        icon: 'scroll', col: 0, row: 7, civil: 'govt', requires: ['jh_the_scribes'],
        desc: 'Carry the realm to 190 development with the country steady at +2 stability — '
          + 'a state whose written record outlasts every empire that ever taxed it.',
        rewardText: '"The Book of the Chronicles": +10% income and +5% force limit, permanent.',
        check: (ctx) => ownedDev(ctx, 'JDH') >= 190 && (crown(ctx, 'JDH').stability || 0) >= 2,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'book_of_the_chronicles', name: 'The Book of the Chronicles', months: -1,
          effects: { incomeMult: 1.1, forceLimitMult: 1.05 },
        }),
      },
      {
        id: 'jh_among_the_powers', name: 'A Name in the Annals',
        icon: 'flag', col: 1, row: 6, civil: 'region',
        desc: 'Stand among the first three courts of the world — a thing this kingdom does '
          + 'by outlasting rather than by winning.',
        rewardText: '"Ursalimmu": +1 diplomatic seat permanently, +50 influence points.',
        check: (ctx) => { const i = standingRank(ctx, 'JDH'); return i >= 0 && i < 3; },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'ursalimmu', name: 'Ursalimmu', months: -1, effects: { diploSeats: 1 },
          });
          ctx.helpers.adjust(ctx, 'JDH', { infl: 50 });
        },
      },
      {
        id: 'jh_the_league_of_the_coast', name: 'The League of the Coast',
        icon: 'dove', col: 1, row: 7, civil: 'region', requires: ['jh_among_the_powers'],
        desc: 'Hold the first three seats of the standing with Tyre\'s regard at +60 — the '
          + 'island that can still be paid to carry a message, and the one state on this '
          + 'coast the empire has never closed.',
        rewardText: '"The Message Carried": +10% trade permanently, +4,000 manpower.',
        check: (ctx) => {
          const i = standingRank(ctx, 'JDH');
          return i >= 0 && i < 3 && regard(ctx, 'TYR', 'JDH') >= 60;
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'the_message_carried', name: 'The Message Carried', months: -1,
            effects: { tradeMult: 1.1 },
          });
          ctx.helpers.adjust(ctx, 'JDH', { manpower: 4000 });
        },
      },
      {
        id: 'jh_the_altar_and_the_country', name: 'The Altar and the Country',
        icon: 'altar', col: 2, row: 6, civil: 'court',
        desc: 'Bring the Temple Priesthood and the People of the Land both to 65 approval at '
          + 'once — the establishment and the freeholders, who between them decide who wears '
          + 'this crown whenever the house cannot.',
        rewardText: '"The Country and the Courses": +0.2 legitimacy a month and −0.5 unrest everywhere, permanent.',
        check: (ctx) => {
          const f = crown(ctx, 'JDH').factions || {};
          return (f.priesthood || 0) >= 65 && (f.assembly || 0) >= 65;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'country_and_courses_732', name: 'The Country and the Courses', months: -1,
          effects: { legitimacyAdd: 0.2, unrestAll: -0.5 },
        }),
      },
      {
        id: 'jh_one_house_one_kingdom', name: 'One House, One Kingdom',
        icon: 'speaker', col: 2, row: 7, civil: 'court', requires: ['jh_the_altar_and_the_country'],
        desc: 'Bring the house, the priesthood and the people of the land all to 65 approval '
          + 'with 30 favour banked from the priesthood — one king everybody wants, while an '
          + 'empire reads the post.',
        rewardText: '"No Servant\'s Conspiracy": +0.3 legitimacy a month and +8% income, permanent.',
        check: (ctx) => {
          const t = crown(ctx, 'JDH');
          const f = t.factions || {};
          const bank = t.estateFavor || {};
          return (f.house || 0) >= 65 && (f.priesthood || 0) >= 65
            && (f.assembly || 0) >= 65 && (bank.priesthood || 0) >= 30;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'no_servants_conspiracy', name: 'No Servant\'s Conspiracy', months: -1,
          effects: { legitimacyAdd: 0.3, incomeMult: 1.08 },
        }),
      },
      // ── The roads not taken (SPEC §183) ─────────────────────────────────
      {
        id: 'hy_the_schedule', name: 'The Tribute Schedule', hypothetical: true,
        fork: '732bce/the_tribute',
        roads: ['tribute_paid', 'tribute_refused'],
        icon: 'coins', col: 3, row: 0,
        desc: 'Answer the first assessment the empire sends: pay it, on time and in full, or '
          + 'tell the envoys that this kingdom is not a province and find out what that costs.',
        rewardText: '+25 legitimacy, +40 governance points.',
        check: (ctx) => anyFlag(ctx, 'tributeAssyria', 'tributeRefused'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JDH', { legitimacy: 25, gov: 40 }),
      },
      {
        id: 'hy_the_altar', name: 'The Altar From Damascus', hypothetical: true,
        fork: '732bce/the_altar_of_damascus',
        roads: ['altar_installed', 'altar_refused'],
        icon: 'altar', col: 3, row: 1, requires: ['hy_the_schedule'],
        desc: 'Settle what stands in the court of the house: the great altar the king '
          + 'admired at Damascus and had drawn to scale, or the bronze one that has been '
          + 'there since Solomon.',
        rewardText: '+50 influence points, +15 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'damascusAltar', 'damascusAltarRefused'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JDH', { infl: 50, legitimacy: 15 }),
      },
      {
        id: 'hy_the_defiance', name: 'The Year Sargon Died', hypothetical: true,
        fork: '732bce/hezekiahs_rebellion',
        roads: ['defiance', 'loyalty'],
        icon: 'split', col: 3, row: 2, requires: ['hy_the_schedule'],
        desc: 'Reach 705, when an Assyrian king is killed in battle and his body is not '
          + 'recovered and every vassal from Elam to the sea has to decide the same thing in '
          + 'the same season.',
        rewardText: '+60 martial points, +20 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'sennacheribDefied', 'sennacheribPaid'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JDH', { mar: 60, legitimacy: 20 }),
      },
      {
        id: 'hy_the_book', name: 'The Book in the House', hypothetical: true,
        fork: '732bce/the_scroll_in_the_house',
        roads: ['scroll_enforced', 'scroll_shelved'],
        icon: 'scroll', col: 4, row: 2, requires: ['hy_the_defiance'],
        desc: 'Still be a kingdom in 622, when the workmen repairing the house bring the '
          + 'high priest a scroll nobody has seen before, and it says that almost everything '
          + 'this country has ever done was forbidden.',
        rewardText: '+60 governance points, +25 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'scrollEnforced', 'scrollShelved'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JDH', { gov: 60, legitimacy: 25 }),
      },
    ],
    ISL: [
      {
        id: 'ih_the_last_city', name: 'The Last Walled City',
        icon: 'tower', col: 1, row: 0,
        desc: 'Hold Samaria with walls raised on it — one hill, one casemate wall and a '
          + 'cistern, which is the whole of what is left of the ten tribes.',
        rewardText: '+20 legitimacy, +50 martial points.',
        check: (ctx) => {
          try {
            const p = ctx.prov && ctx.prov('Sebaste');
            return !!p && p.owner === who(ctx, 'ISL') && (p.buildings || []).indexOf('walls') !== -1;
          } catch (e) { return false; }
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ISL', { legitimacy: 20, mar: 50 }),
      },
      {
        id: 'ih_the_assessment', name: 'The Assessment Met',
        icon: 'coins', col: 0, row: 1, requires: ['ih_the_last_city'],
        desc: 'Stand at +1 stability with 250 talents banked — a kingdom that can pay what '
          + 'the empire asked without selling the year\'s seed corn.',
        rewardText: '"The Tribute Met": −0.5 unrest everywhere and +6% income, permanently.',
        check: (ctx) => (crown(ctx, 'ISL').stability || 0) >= 1 && (crown(ctx, 'ISL').treasury || 0) >= 250,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ISL', {
          id: 'the_tribute_met', name: 'The Tribute Met', months: -1,
          effects: { unrestAll: -0.5, incomeMult: 1.06 },
        }),
      },
      {
        id: 'ih_bethel', name: 'Bethel Kept',
        icon: 'altar', col: 2, row: 1, requires: ['ih_the_last_city'],
        desc: 'Hold Bethel — the king\'s sanctuary, now four miles from a border that did not '
          + 'use to be there and a day\'s walk from the other kingdom\'s recruiting officers.',
        rewardText: '"The Feast Kept": +0.25 legitimacy a month permanently.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ISL', 'Ramallah'),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ISL', {
          id: 'the_feast_kept', name: 'The Feast Kept', months: -1,
          effects: { legitimacyAdd: 0.25 },
        }),
      },
      {
        id: 'ih_the_hills_mustered', name: 'The Hills Mustered',
        icon: 'spears', col: 1, row: 1, requires: ['ih_the_last_city'],
        desc: 'Field 9,000 men — a kingdom of four districts that can still put an army in '
          + 'the field is a kingdom the governor at Megiddo has to write home about.',
        rewardText: '"The Ephraimite Levy": +10% manpower permanently.',
        check: (ctx) => totalMen(ctx, 'ISL') >= 9000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ISL', {
          id: 'the_ephraimite_levy', name: 'The Ephraimite Levy', months: -1,
          effects: { manpowerMult: 1.1 },
        }),
      },
      {
        id: 'ih_the_galilee', name: 'The Galilee Retaken',
        icon: 'mountain', col: 0, row: 2, requires: ['ih_the_assessment'],
        desc: 'Take Megiddo and Hazor back off the empire — the province the annals call '
          + 'Magidu, with the governor\'s residence in the middle of it.',
        rewardText: '+250 talents, +50 martial points, +20 legitimacy.',
        check: (ctx) => ['Afula', 'Safed'].every((n) => ctx.helpers.controls(ctx, 'ISL', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ISL', { treasury: 250, mar: 50, legitimacy: 20 }),
      },
      {
        id: 'ih_a_kingdom_again', name: 'A Kingdom Again',
        icon: 'flag', col: 1, row: 2, requires: ['ih_the_hills_mustered', 'ih_bethel'],
        desc: 'Hold eight provinces — twice what the settlement of 732 left, which means the '
          + 'settlement of 732 has been undone.',
        rewardText: '+25 legitimacy, +60 governance points.',
        check: (ctx) => ctx.helpers.countControlled(ctx, 'ISL', {}) >= 8,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ISL', { legitimacy: 25, gov: 60 }),
      },
      {
        id: 'ih_the_gilead', name: 'The Gilead Retaken',
        icon: 'horseshoe', col: 2, row: 2, requires: ['ih_bethel'],
        desc: 'Take Ramoth-Gilead and the Gilead behind it — the east bank, the province the '
          + 'annals call Gal\'azu, and the grazing that fed the chariot corps.',
        rewardText: '+3,000 manpower and "The East Bank Back": +8% manpower permanently.',
        check: (ctx) => ['Gadora', 'Gadara'].every((n) => ctx.helpers.controls(ctx, 'ISL', n)),
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'ISL', { manpower: 3000 });
          ctx.helpers.addTagModifier(ctx, 'ISL', {
            id: 'the_east_bank_back', name: 'The East Bank Back', months: -1,
            effects: { manpowerMult: 1.08 },
          });
        },
      },
      {
        id: 'ih_the_walls_doubled', name: 'The Walls Doubled',
        icon: 'walls', col: 0, row: 3, requires: ['ih_the_galilee'],
        desc: 'Reach Military 4 — The Hewn Casemate. Samaria held a three-year siege in the '
          + 'event; a better wall is the difference between three years and never.',
        rewardText: '"The Hill Fortress": +1 fort defence and +10% siege endurance permanently.',
        check: (ctx) => (((crown(ctx, 'ISL').tech || {}).mar | 0) >= 4),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ISL', {
          id: 'the_hill_fortress', name: 'The Hill Fortress', months: -1,
          effects: { fortDefBonus: 1, siegeMult: 1.1 },
        }),
      },
      {
        id: 'ih_the_coast', name: 'A Window on the Sea',
        icon: 'anchor', col: 2, row: 3, requires: ['ih_the_gilead'],
        desc: 'Take Dor and Akko — the coast the empire made a province called Du\'ru, and '
          + 'the harbour that pays for everything else.',
        rewardText: '+200 talents and "The Coast Regained": +10% trade permanently.',
        check: (ctx) => ['Dora', 'Ptolemais'].every((n) => ctx.helpers.controls(ctx, 'ISL', n)),
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'ISL', { treasury: 200 });
          ctx.helpers.addTagModifier(ctx, 'ISL', {
            id: 'the_coast_regained', name: 'The Coast Regained', months: -1,
            effects: { tradeMult: 1.1 },
          });
        },
      },
      {
        id: 'ih_the_storehouses', name: 'The Storehouses Refilled',
        icon: 'granary', col: 1, row: 3, requires: ['ih_a_kingdom_again'],
        desc: 'Carry the realm to 130 development with 400 talents banked — the districts '
          + 'assessed again, and by us.',
        rewardText: '"The Districts Ours": +10% income and +5% growth, permanently.',
        check: (ctx) => ownedDev(ctx, 'ISL') >= 130 && (crown(ctx, 'ISL').treasury || 0) >= 400,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ISL', {
          id: 'the_districts_ours', name: 'The Districts Ours', months: -1,
          effects: { incomeMult: 1.1, growthMult: 1.05 },
        }),
      },
      {
        id: 'ih_the_arts_of_the_age', name: 'The Arts of the Age',
        icon: 'quill', col: 1, row: 4, requires: ['ih_the_storehouses'],
        desc: 'Take up three ideas of the age — a kingdom that intends to be here in a '
          + 'century has to learn something in this one.',
        rewardText: '+70 governance points, +20 legitimacy.',
        check: (ctx) => eraTiers(crown(ctx, 'ISL')) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ISL', { gov: 70, legitimacy: 20 }),
      },
      {
        id: 'ih_all_israel', name: 'All Israel Under One Crown',
        icon: 'laurel', col: 1, row: 5, requires: ['ih_the_arts_of_the_age', 'ih_the_walls_doubled'],
        desc: 'Hold Samaria and Jerusalem together with 18 provinces — the division undone '
          + 'from the north, by the kingdom history deported.',
        rewardText: '+40 legitimacy, +1 stability, and "The Whole House of Israel" (+10% manpower, +0.3 legitimacy a month).',
        check: (ctx) => ctx.helpers.controls(ctx, 'ISL', 'Sebaste')
          && ctx.helpers.controls(ctx, 'ISL', 'Jerusalem')
          && ctx.helpers.countControlled(ctx, 'ISL', {}) >= 18,
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'ISL', { legitimacy: 40, stability: 1 });
          ctx.helpers.addTagModifier(ctx, 'ISL', {
            id: 'whole_house_of_israel_732', name: 'The Whole House of Israel', months: -1,
            effects: { manpowerMult: 1.1, legitimacyAdd: 0.3 },
          });
        },
      },
      // ── The civil band (SPEC §211) ──────────────────────────────────────
      {
        id: 'ih_the_districts', name: 'The Districts Reassessed',
        icon: 'quill', col: 0, row: 6, civil: 'govt',
        desc: 'Take two rungs of the civil reforms — a kingdom paying somebody else\'s '
          + 'assessment had better know its own.',
        rewardText: '"The Ledger Kept": −0.5 unrest everywhere permanently, +60 governance points.',
        check: (ctx) => (((crown(ctx, 'ISL').reforms || {}).civ | 0) >= 2),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ISL', {
            id: 'the_ledger_kept', name: 'The Ledger Kept', months: -1,
            effects: { unrestAll: -0.5 },
          });
          ctx.helpers.adjust(ctx, 'ISL', { gov: 60 });
        },
      },
      {
        id: 'ih_the_register', name: 'A Register of Our Own',
        icon: 'scroll', col: 0, row: 7, civil: 'govt', requires: ['ih_the_districts'],
        desc: 'Carry the realm to 150 development with the country steady at +2 stability — '
          + 'a state, rather than a district awaiting a census.',
        rewardText: '"Not a Province": +10% income and +5% force limit, permanent.',
        check: (ctx) => ownedDev(ctx, 'ISL') >= 150 && (crown(ctx, 'ISL').stability || 0) >= 2,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ISL', {
          id: 'not_a_province', name: 'Not a Province', months: -1,
          effects: { incomeMult: 1.1, forceLimitMult: 1.05 },
        }),
      },
      {
        id: 'ih_among_the_powers', name: 'A Name in the Annals',
        icon: 'flag', col: 1, row: 6, civil: 'region',
        desc: 'Stand among the first three courts of the world — which for this kingdom '
          + 'means being written about in Nineveh as a problem rather than as an inventory.',
        rewardText: '"Bit-Humri Still": +1 diplomatic seat permanently, +50 influence points.',
        check: (ctx) => { const i = standingRank(ctx, 'ISL'); return i >= 0 && i < 3; },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ISL', {
            id: 'bit_humri_still', name: 'Bit-Humri Still', months: -1, effects: { diploSeats: 1 },
          });
          ctx.helpers.adjust(ctx, 'ISL', { infl: 50 });
        },
      },
      {
        id: 'ih_the_patron', name: 'A Patron Worth Having',
        icon: 'dove', col: 1, row: 7, civil: 'region', requires: ['ih_among_the_powers'],
        desc: 'Hold the first three seats of the standing while Egypt\'s regard for us stands '
          + 'at +60 — the ally the sources say this court reached for, made into something '
          + 'that can actually march.',
        rewardText: '"Not a Broken Reed": +10% army strength permanently, +4,000 manpower.',
        check: (ctx) => {
          const i = standingRank(ctx, 'ISL');
          return i >= 0 && i < 3 && regard(ctx, 'MIZ', 'ISL') >= 60;
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ISL', {
            id: 'not_a_broken_reed', name: 'Not a Broken Reed', months: -1,
            effects: { milPowerMult: 1.1 },
          });
          ctx.helpers.adjust(ctx, 'ISL', { manpower: 4000 });
        },
      },
      {
        id: 'ih_the_shrine_and_the_gate', name: 'The Shrine and the Gate',
        icon: 'flame', col: 2, row: 6, civil: 'court',
        desc: 'Bring the Priests of Bethel and the Elders of Ephraim both to 65 approval at '
          + 'once — the establishment and the districts, agreeing while there is still time '
          + 'for it to matter.',
        rewardText: '"The Word and the Throne": +0.2 legitimacy a month and −0.5 unrest everywhere, permanent.',
        check: (ctx) => {
          const f = crown(ctx, 'ISL').factions || {};
          return (f.priesthood || 0) >= 65 && (f.assembly || 0) >= 65;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ISL', {
          id: 'word_and_throne_732', name: 'The Word and the Throne', months: -1,
          effects: { legitimacyAdd: 0.2, unrestAll: -0.5 },
        }),
      },
      {
        id: 'ih_one_court', name: 'One Court, One Kingdom',
        icon: 'speaker', col: 2, row: 7, civil: 'court', requires: ['ih_the_shrine_and_the_gate'],
        desc: 'Bring the elders, the priests and the captains all to 65 approval with 30 '
          + 'favour banked from the captains — three men who have each killed a king, in one '
          + 'room, on your side.',
        rewardText: '"No Fourth King in Ten Years": +0.3 legitimacy a month and +8% income, permanent.',
        check: (ctx) => {
          const t = crown(ctx, 'ISL');
          const f = t.factions || {};
          const bank = t.estateFavor || {};
          return (f.assembly || 0) >= 65 && (f.priesthood || 0) >= 65
            && (f.captains || 0) >= 65 && (bank.captains || 0) >= 30;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ISL', {
          id: 'no_fourth_king', name: 'No Fourth King in Ten Years', months: -1,
          effects: { legitimacyAdd: 0.3, incomeMult: 1.08 },
        }),
      },
      // ── The roads not taken (SPEC §183) ─────────────────────────────────
      {
        id: 'hy_the_schedule_north', name: 'The Tribute Schedule', hypothetical: true,
        fork: '732bce/the_tribute',
        roads: ['tribute_paid', 'tribute_refused'],
        icon: 'coins', col: 3, row: 0,
        desc: 'Answer the assessment the empire sends: pay it, on time and in full, or tell '
          + 'the envoys that this kingdom is not a province and find out what that costs.',
        rewardText: '+25 legitimacy, +40 governance points.',
        check: (ctx) => anyFlag(ctx, 'tributeAssyria', 'tributeRefused'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ISL', { legitimacy: 25, gov: 40 }),
      },
      {
        id: 'hy_the_letter', name: 'The Letter to So', hypothetical: true,
        fork: '732bce/the_egyptian_letter',
        roads: ['letter_sent', 'letter_burned'],
        icon: 'quill', col: 3, row: 1, requires: ['hy_the_schedule_north'],
        desc: 'Settle what this court does about Egypt: send the embassy the sources say it '
          + 'sent, or burn the draft and keep paying. One of the two ended the kingdom.',
        rewardText: '+50 influence points, +20 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'egyptLetterSent', 'egyptLetterBurned'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ISL', { infl: 50, legitimacy: 20 }),
      },
    ],
  },

  aiHints: {
    ASR: { rally: ['Assur', 'Damascus'], targetRegiments: 42 },
    ISL: { rally: ['Sebaste'], targetRegiments: 6 },
    JDH: { rally: ['Jerusalem', 'Kiryat Gat'], targetRegiments: 16 },
    BBL: { rally: ['Babylon'], targetRegiments: 22 },
    MIZ: { rally: ['Leontopolis', 'Memphis'], targetRegiments: 22 },
    KSH: { rally: ['Thebes', 'Napata'], targetRegiments: 12 },
    URA: { rally: ['Tigranocerta'], targetRegiments: 7 },
    ELA: { rally: ['Susa'], targetRegiments: 14 },
    TYR: { rally: ['Tyre'], targetRegiments: 5 },
    PLS: { rally: ['Gaza'], targetRegiments: 6 },
    EDM: { rally: ['Petra'], targetRegiments: 4 },
    MOB: { rally: ['Medaba'], targetRegiments: 4 },
    AMO: { rally: ['Philadelphia'], targetRegiments: 4 },
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
        // §146: held ground for a win, the realm itself for a loss.
        const held = islAlive ? h.countHeld(ctx, 'ISL', {}) : 0;
        const realm = islAlive ? h.countOwned(ctx, 'ISL', {}) : 0;
        if (islAlive && ['Afula', 'Safed', 'Gadora'].every((n) => h.controls(ctx, 'ISL', n))) {
          h.endGame(ctx, {
            result: 'win',
            title: 'The Provinces Taken Back',
            text: 'Megiddo, Hazor and Ramoth-Gilead are Israelite again, which no source and no '
              + 'excavation records and which the Assyrian eponym lists would have had to '
              + 'explain. The northern kingdom is a kingdom again rather than a district '
              + 'awaiting a census.',
            score: 220,
          });
          return;
        }
        if (dateGE(g.date, -715, 1) && islAlive && h.controls(ctx, 'ISL', 'Sebaste') && held >= 8) {
          h.endGame(ctx, {
            result: 'win',
            title: 'The Kingdom That Was Not Counted',
            text: 'Seven years after Samaria should have fallen it is still standing, still '
              + 'Israelite, and still sending its own tribute rather than its own people. '
              + 'Sargon\'s annals for these years have a gap in them.',
            score: 180,
          });
          return;
        }
        if (!islAlive || realm < 1) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'To Halah and Habor',
            text: 'Twenty-seven thousand two hundred and ninety, by the empire\'s own count, '
              + 'marched to Halah and to Habor by the river of Gozan and to the cities of the '
              + 'Medes. Other people were brought in to take the fields. Nothing further is '
              + 'recorded of them, anywhere, by anyone.',
            score: 0,
          });
          return;
        }
      } else if (g.playerTag === who(ctx, 'JDH')) {
        const held = jdhAlive ? h.countHeld(ctx, 'JDH', {}) : 0;
        const realm = jdhAlive ? h.countOwned(ctx, 'JDH', {}) : 0;
        const jer = jdhAlive && h.controls(ctx, 'JDH', 'Jerusalem');
        if (dateGE(g.date, -700, 1) && jer && held >= 18
            && !(jdhTag.atWarWith || []).includes(who(ctx, 'ASR'))) {
          h.endGame(ctx, {
            result: 'win',
            title: 'The City That Was Not Taken',
            text: 'Forty-six fortified towns, the prism says, and their innumerable villages. '
              + 'Not the capital. The Assyrian went home with tribute and a wall of reliefs '
              + 'about Lachish, and the kingdom he did not take is still here, walled, watered '
              + 'and considerably harder than it was.',
            score: 220,
          });
          return;
        }
        if (dateGE(g.date, -640, 1) && jer && standingRank(ctx, 'JDH') === 0) {
          h.endGame(ctx, {
            result: 'win',
            title: 'The Kingdom That Outlived the Empire',
            text: 'Assyria is a memory being fought over by Medes and Chaldeans, and the '
              + 'kingdom that spent a century paying it is the first power in this world. No '
              + 'chronicle in any language expected this, least of all the one written here.',
            score: 250,
          });
          return;
        }
        if (!jdhAlive || realm < 1) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The Ridge Is a Province',
            text: 'Jerusalem is taken, and with it the house, the building and the archive. '
              + 'What the north lost in 722 the south loses here, a century early and just as '
              + 'completely, and nothing is written down afterwards to say so.',
            score: 0,
          });
          return;
        }
      }
    } catch (e) { warnOnce('checkVictory', e); }
  },
};
