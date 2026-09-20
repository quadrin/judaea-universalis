// Judaea Universalis — bookmark: The Yoke of Babylon, 597 BCE (SPEC §268).
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
//
// Historical spine: on the second day of Adar — 16 March 597, a date the
// Babylonian Chronicle gives to the day — Nebuchadnezzar took Jerusalem. The
// city was not burned. The king, the queen mother, the court, the officers,
// the craftsmen and the smiths, ten thousand people and the treasure of the
// house, went to Babylon; and the king's uncle Mattaniah was installed on the
// throne under a new name, Zedekiah, and an oath sworn by his god.
//
// This is the chapter where everything that makes the rest of this game
// possible is decided. The community that is deported does not disappear the
// way the northern kingdom's did a hundred and twenty-five years earlier, and
// the difference is not luck: it is that a letter goes to Babylon telling the
// exiles to build houses, plant gardens, marry, and seek the peace of the city
// — and that somebody there writes everything down. Eleven years later the
// city IS burned, the house IS destroyed, and the state ends. The people do
// not. Fifty years after that a Persian edict lets them come back, and what
// comes back is not a kingdom.
//
// The player's court is Judah under a king installed by an empire and watched
// by the party that put him there, in a city where two prophets are shouting
// opposite things in the temple court and both of them are certain.
//
// Sources: 2 Kings 24-25; 2 Chronicles 36; Jeremiah (especially 27-29, 32,
// 37-44); Ezekiel; Lamentations; Ezra and Nehemiah; Haggai and Zechariah; the
// Babylonian Chronicle (ABC 5); the Jehoiachin ration tablets from Babylon;
// the Lachish ostraca; the Cyrus Cylinder; the Elephantine papyri; Herodotus
// I.74-191 for Lydia, Media and Cyrus.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[bookmark_597bce] ' + key, e || '');
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

// ---- the political map of the spring of 597 ---------------------------------
// What Zedekiah is given: the ridge, the Shephelah towns that are still
// standing, the Negeb forts and the wilderness. The coastal plain is
// Babylonian and so is everything north of Bethel.
const JDH_LANDS = [
  'Jerusalem', 'Bethlehem', 'Hebron', 'Adora', 'Jericho', 'Engaddi',
  'Emmaus', 'Beit Shemesh', 'Kiryat Gat', 'Oboda',
];
// The empire, which at this moment holds everything from the Zagros to the
// Brook of Egypt and is besieging or about to besiege the rest.
const BBL_LANDS = [
  'Babylon', 'Nehardea', 'Seleucia-Ctesiphon', 'Uruk', 'Charax', 'Susa',
  'Assur', 'Arbela', 'Hatra', 'Nisibis', 'Singara', 'Carrhae',
  'Edessa', 'Dura-Europos', 'Zeugma', 'Palmyra',
  'Damascus', 'Chalcis', 'Emesa', 'Apamea',
  'Beroea', 'Antioch', 'Laodicea', 'Seleucia Pieria', 'Samosata',
  'Sebaste', 'Neapolis', 'Jenin', 'Ramallah', 'Afula', 'Scythopolis',
  'Sepphoris', 'Tiberias', 'Gischala', 'Safed', 'Caesarea Philippi',
  'Dora', 'Antipatris', 'Ptolemais', 'Lydda',
  'Gadora', 'Gadara', 'Pella', 'Batanea', 'Gerasa',
  'Gaza', 'Ascalon', 'Azotus', 'Jamnia',
];
const TYR_LANDS = ['Tyre', 'Sidon', 'Berytus', 'Byblos', 'Tripolis', 'Aradus'];
const MOB_LANDS = ['Medaba'];
const AMO_LANDS = ['Philadelphia'];
const EDM_LANDS = ['Petra', 'Aila', 'Kadesh Barnea'];
// Egypt of the Saite pharaohs: rich, well-armed, and about to spend forty
// years encouraging other people's revolts from a safe distance.
const MIZ_LANDS = [
  'Leontopolis', 'Athribis', 'Alexandria', 'Memphis', 'Arsinoe', 'Oxyrhynchus',
  'Thebes', 'Syene', 'Pelusium', 'Rhinocolura',
];
const MDA_LANDS = ['Ecbatana', 'Gazaca', 'Tigranocerta', 'Sophene', 'Amida', 'Melitene'];
const PAS_LANDS = ['Persepolis', 'Gabae'];
const LYD_LANDS = ['Smyrna', 'Halicarnassus', 'Ancyra', 'Tyana', 'Caesarea Mazaca', 'Iconium', 'Pisidia'];
const TAB_LANDS = ['Tarsus', 'Seleucia Trachea'];
const KSH_LANDS = ['Napata', 'Meroe', 'Dodekaschoinos'];
const QDR_LANDS = ['Tayma', 'Dumatha', 'Hegra'];
const SAB_LANDS = ['Marib', 'Najran'];

// Every other cell of the base atlas, named rather than left with an owner
// inherited from a map drawn for 66 CE (SPEC §268). A cell that keeps a tag no
// chapter seats is scenery: no court, no economy, no AI, and no army may enter
// it.
const OTHER_597 = {
  'Joppa': 'BBL',                         // the coastal plain, with the rest of it
  'Cyrrhus': 'BBL',
  'Bostra': 'BBL',
  'Salamis': 'TYR', 'Paphos': 'TYR',      // the island kingdoms, Phoenician and Greek by turns
  'Yathrib': 'QDR', 'Khaybar': 'QDR', 'Gerrha': 'QDR',
  'Marmarica': 'MIZ', 'Paraetonium': 'MIZ',
  'Hyrcania': 'MDA',
  // The Greek cities, on every shore of two seas: Cyrene is two generations
  // old, Byzantion seventy years, Sinope and the Pontic foundations younger
  // still, and the western colonies are the richest thing in Italy.
  'Corinth': 'COR', 'Athens': 'ATH', 'Sparta': 'SPT', 'Gortyn': 'CRT',
  'Rhodes': 'RHO', 'Byzantion': 'THR', 'Cyrene': 'CYR', 'Sinope': 'MIL',
  'Trapezus': 'MIL', 'Syracusae': 'SYC', 'Tarentum': 'TAR', 'Rhegium': 'TAR',
  'Attalia': 'LYD',
  // Carthage's sea: the African emporia and the Sicilian corner it holds
  // against the Greeks of Syracuse.
  'Oea': 'CAR', 'Leptis Magna': 'CAR', 'Macomades': 'CAR', 'Panormus': 'CAR',
  // …and what is still nobody's. Rome is a town with kings and no empire, the
  // Illyrian and Thracian shores have no polity this map can name, and the
  // Caucasus is the Caucasus.
  'Roma': 'WASTE', 'Capua': 'WASTE', 'Brundisium': 'WASTE',
  'Dyrrhachium': 'WASTE', 'Thessalonica': 'WASTE', 'Hadrianopolis': 'WASTE',
  'Nicaea': 'WASTE', 'Phasis': 'WASTE', 'Caucasian Albania': 'WASTE',
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
put(JDH_LANDS, 'JDH'); put(BBL_LANDS, 'BBL'); put(TYR_LANDS, 'TYR');
put(MOB_LANDS, 'MOB'); put(AMO_LANDS, 'AMO'); put(EDM_LANDS, 'EDM');
put(MIZ_LANDS, 'MIZ'); put(MDA_LANDS, 'MDA'); put(PAS_LANDS, 'PAS');
put(LYD_LANDS, 'LYD'); put(TAB_LANDS, 'TAB'); put(KSH_LANDS, 'KSH');
put(QDR_LANDS, 'QDR'); put(SAB_LANDS, 'SAB');
for (const n of Object.keys(OTHER_597)) OWNERS[n] = OTHER_597[n];

const RELIGIONS = {};
for (const n of JDH_LANDS) RELIGIONS[n] = 'yahwism';
for (const n of BBL_LANDS) RELIGIONS[n] = 'mesopotamian';
// The Babylonian Levant keeps its own gods under a Babylonian governor, and
// the hill country north of Bethel keeps the god of Israel — which is why
// there is still somebody there to argue with when the exiles come back.
for (const n of ['Sebaste', 'Neapolis', 'Jenin', 'Ramallah', 'Afula',
  'Scythopolis', 'Sepphoris', 'Tiberias', 'Gischala', 'Safed',
  'Caesarea Philippi', 'Gadora', 'Gadara', 'Pella', 'Batanea', 'Gerasa',
  'Lydda']) RELIGIONS[n] = 'yahwism';
for (const n of ['Damascus', 'Chalcis', 'Emesa',
  'Apamea', 'Beroea', 'Antioch', 'Laodicea', 'Seleucia Pieria',
  'Palmyra', 'Carrhae', 'Edessa', 'Dura-Europos',
  'Dora', 'Antipatris', 'Ptolemais', 'Gaza', 'Ascalon', 'Azotus',
  'Jamnia']) RELIGIONS[n] = 'canaanite';
for (const n of TYR_LANDS.concat(MOB_LANDS, AMO_LANDS, EDM_LANDS, QDR_LANDS)) RELIGIONS[n] = 'canaanite';
for (const n of MIZ_LANDS) RELIGIONS[n] = 'egyptian';
for (const n of MDA_LANDS.concat(PAS_LANDS)) RELIGIONS[n] = 'zoroastrianism';
for (const n of LYD_LANDS.concat(TAB_LANDS)) RELIGIONS[n] = 'anatolian_cults';
for (const n of KSH_LANDS) RELIGIONS[n] = 'kushite';
for (const n of SAB_LANDS) RELIGIONS[n] = 'south_arabian';

const CULTURES = {};
for (const n of JDH_LANDS) CULTURES[n] = 'judean';
for (const n of ['Sebaste', 'Neapolis', 'Jenin', 'Ramallah', 'Afula',
  'Scythopolis', 'Sepphoris', 'Tiberias', 'Gischala', 'Safed',
  'Caesarea Philippi', 'Gadora', 'Gadara', 'Pella', 'Batanea', 'Gerasa',
  'Lydda', 'Antipatris', 'Dora']) CULTURES[n] = 'israelite';
for (const n of ['Babylon', 'Nehardea', 'Seleucia-Ctesiphon', 'Uruk', 'Charax',
  'Susa']) CULTURES[n] = 'babylonian';
for (const n of ['Assur', 'Arbela', 'Hatra', 'Nisibis', 'Singara',
  'Zeugma', 'Samosata']) CULTURES[n] = 'assyrian';
for (const n of ['Damascus', 'Chalcis', 'Emesa',
  'Apamea', 'Beroea', 'Antioch', 'Laodicea', 'Seleucia Pieria',
  'Palmyra', 'Carrhae', 'Edessa', 'Dura-Europos',
  'Ptolemais']) CULTURES[n] = 'aramean';
for (const n of ['Gaza', 'Ascalon', 'Azotus', 'Jamnia']) CULTURES[n] = 'philistine';
for (const n of TYR_LANDS) CULTURES[n] = 'phoenician';
for (const n of MOB_LANDS) CULTURES[n] = 'moabite';
for (const n of AMO_LANDS) CULTURES[n] = 'ammonite';
for (const n of EDM_LANDS) CULTURES[n] = 'edomite';
for (const n of MIZ_LANDS) CULTURES[n] = 'egyptian';
for (const n of MDA_LANDS.concat(PAS_LANDS)) CULTURES[n] = 'persian';
for (const n of LYD_LANDS.concat(TAB_LANDS)) CULTURES[n] = 'anatolian';
for (const n of KSH_LANDS) CULTURES[n] = 'kushite';
for (const n of QDR_LANDS) CULTURES[n] = 'arab';
for (const n of SAB_LANDS) CULTURES[n] = 'south_arabian';


// …and the same for the cells named one by one above.
for (const n of Object.keys(OTHER_597)) {
  const pair = OTHER_FAITH[OTHER_597[n]];
  if (!pair) continue;
  RELIGIONS[n] = pair[0];
  CULTURES[n] = pair[1];
}

export const BOOKMARK_597 = {
  id: '597bce',
  name: 'The Yoke of Babylon',
  startDate: { y: -597, m: 4, d: 1 },
  // SPEC §121. The chapter runs to the walls of 445; its own undated cards
  // belong to the generation of the exile and stop before the Persian century
  // has finished settling.
  generationHorizon: -500,
  techBase: 3,
  // The ceiling of the last pre-Hellenistic age: the imperial road, the
  // satrapy, the trireme and the composite bow. The phalanx belongs to the
  // chapter after this one.
  techCeiling: 8,
  techTweaks: { BBL: { mar: 1, gov: 2 }, MIZ: { gov: 1, infl: 1 }, MDA: { mar: 1 }, LYD: { infl: 1 } },
  techNames: {
    gov: {
      2: 'The Twelve Districts', 3: 'The Stamped Jar', 4: 'The Scribes of the King',
      5: 'The Book of the Chronicles', 6: 'The Written Covenant', 7: 'The Provincial Register',
      8: 'The Satrapy',
    },
    infl: {
      2: 'The Caravan Tolls', 3: 'The Tribute Embassy', 4: 'The Vassal Treaty',
      5: 'The Letters to the Exiles', 6: 'The Assembly of the Elders', 7: 'The Royal Rescript',
      8: 'The Correspondence of the Dispersion',
    },
    mar: {
      2: 'The Fortified Gate', 3: 'The Hewn Casemate', 4: 'The Water Shaft',
      5: 'The Signal Fires', 6: 'The Standing Companies', 7: 'The Siege Train',
      8: 'The Imperial Levy',
    },
  },
  popMult: 0.5,

  govTypes: { JDH: 'monarchy' },

  provinceNames: {
    'Kiryat Gat': 'Lachish',
    'Beit Shemesh': 'Azekah',
    'Emmaus': 'Aijalon',
    'Adora': 'Adoraim',
    'Engaddi': 'En-Gedi',
    'Oboda': 'The Negeb',
    'Sebaste': 'Samaria',
    'Neapolis': 'Shechem',
    'Ramallah': 'Mizpah',      // where the governor is seated after the city falls
    'Jenin': 'Ibleam',
    'Afula': 'Megiddo',
    'Scythopolis': 'Beth-Shean',
    'Sepphoris': 'Shimron',
    'Tiberias': 'Chinnereth',
    'Gischala': 'Kedesh',
    'Safed': 'Hazor',
    'Caesarea Philippi': 'Dan',
    'Antipatris': 'Aphek',
    'Dora': 'Dor',
    'Lydda': 'Gezer',
    'Gadora': 'Ramoth-Gilead',
    'Pella': 'Jabesh-Gilead',
    'Gadara': 'Gilead',
    'Batanea': 'Bashan',
    'Gerasa': 'Jazer',
    'Jamnia': 'Ekron',
    'Azotus': 'Ashdod',
    'Ascalon': 'Ashkelon',
    'Ptolemais': 'Akko',
    'Byblos': 'Gebal',
    'Aradus': 'Arvad',
    'Chalcis': 'Riblah',       // where the king of Babylon keeps his headquarters
    'Emesa': 'Hamath',
    'Apamea': 'Hadrach',
    'Palmyra': 'Tadmor',
    'Medaba': 'Kir-Hareseth',
    'Philadelphia': 'Rabbah',
    'Petra': 'Sela',
    'Aila': 'Elath',
    'Kadesh Barnea': 'Kadesh-Barnea',
    'Zeugma': 'Carchemish',
    'Beroea': 'Arpad',
    'Antioch': 'Unqi',
    'Carrhae': 'Harran',
    'Nisibis': 'Nasibina',
    'Arbela': 'Arbail',
    'Assur': 'Ashur',
    'Seleucia-Ctesiphon': 'Opis',
    'Nehardea': 'Sippar',
    'Charax': 'Bit-Yakin',
    'Dura-Europos': 'Suhu',
    'Tigranocerta': 'Tushpa',
    'Leontopolis': 'Tanis',
    'Athribis': 'Bubastis',
    'Alexandria': 'Sais',
    'Pelusium': 'Sin',
    'Rhinocolura': 'The Brook of Egypt',
    'Syene': 'Elephantine',
    'Oxyrhynchus': 'Per-Medjed',
    'Arsinoe': 'The Fayyum',
    'Smyrna': 'Sardis',
    'Ancyra': 'Gordion',
    'Bostra': 'The Hauran',      // Busra is a Nabataean foundation a thousand years off
    'Shobak': 'Seir',
    'Wadi Rum': 'The Hisma',
    'Edessa': 'Urhai',
  },

  integratedNames: {
    JDH: {
      'Sebaste': 'Shomron', 'Neapolis': 'Shechem', 'Ptolemais': 'Akko',
      'Azotus': 'Ashdod', 'Ascalon': 'Ashkelon', 'Joppa': 'Yafo', 'Gaza': 'Azzah',
      'Dora': 'Dor',
    },
    BBL: {
      'Jerusalem': 'Ursalimmu', 'Sebaste': 'Samerina', 'Kiryat Gat': 'Lakisu',
      'Tyre': 'Surru', 'Sidon': 'Sidunnu', 'Gaza': 'Hazzatu',
    },
    MLI: 'JDH',
  },

  blurb: 'On the second day of Adar the city was taken, and it was not burned. The king, '
    + 'the queen mother, the court, the craftsmen and the smiths — ten thousand people and '
    + 'the treasure of the house — are on the road to Babylon, and the king\'s uncle is on '
    + 'the throne with a new name and an oath sworn by his own god. In the temple court two '
    + 'prophets are shouting opposite things: two years, says one; seventy, says the other. '
    + 'Egypt is promising cavalry. Everything that survives the next eleven years survives '
    + 'because somebody wrote it down.',

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
      description: 'The empire that inherited Assyria\'s map and did not inherit its habits: '
        + 'it deports, but it settles what it deports in one place, with its own elders and '
        + 'its own courts, which turns out to make all the difference in the world.',
    },
    MIZ: {
      name: 'Egypt', adj: 'Egyptian', capital: 'Alexandria',
      description: 'Saite Egypt: one country again, rich, fortified, with a Greek mercenary '
        + 'army and a settled policy of encouraging other people to fight Babylon.',
    },
    MDA: {
      name: 'Media', adj: 'Median', capital: 'Ecbatana',
      description: 'Half of Assyria\'s inheritance, from the Halys to the Zagros — and, for '
        + 'another sixty years, the senior partner of a highland vassal at Anshan.',
    },
    PAS: {
      name: 'Persia', adj: 'Persian', capital: 'Persepolis',
      description: 'A Median vassal in the southern highland, ruled by a house that has begun '
        + 'marrying into its overlord\'s.',
    },
    TAB: {
      name: 'Cilicia', adj: 'Cilician', capital: 'Tarsus',
      description: 'The plain behind the gates and the Syennesis who rules it: the one court '
        + 'in Anatolia both the Lydian and the Mede will accept as a mediator, which is how '
        + 'the peace of 585 gets signed.',
    },
    GRC: {
      name: 'The Hellenes', adj: 'Hellene', capital: 'Corinth',
      religion: 'hellenism', culture: 'greek',
      description: 'A hundred cities with no common government and colonies on every shore '
        + 'of two seas: the newest commercial power in this world, and the one that will '
        + 'eventually write its history.',
    },
    LYD: {
      name: 'Lydia', adj: 'Lydian', capital: 'Smyrna',
      description: 'The kingdom that invented coined money and spends it on everything: '
        + 'mercenaries, walls, the largest army west of the Halys, and offerings at Delphi.',
    },
  },

  activeTags: [
    'JDH', 'BBL', 'TYR', 'MOB', 'AMO', 'EDM', 'MIZ', 'MDA', 'PAS',
    'LYD', 'TAB', 'KSH', 'QDR', 'SAB',
    // The political frame in the sixth century: Carthage is an empire in the
    // west, the Greeks are everywhere on the water, the steppe is Scythian,
    // and the Garamantes are where they always are.
    'CAR', 'GRC', 'SCY', 'GRM', 'HDR',
    'COR', 'ATH', 'SPT', 'CRT', 'RHO', 'SYC', 'TAR', 'THR', 'CYR', 'MIL', 'MAS',
  ],
  rivalries: [['BBL', 'MIZ'], ['BBL', 'MDA'], ['JDH', 'EDM'], ['MDA', 'LYD']],
  affinities: [
    ['JDH', 'MIZ', { axis: 'alignment', sign: -1 }],
    ['MDA', 'PAS'],
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

  // The empire's own religion, and the thing it cannot touch (SPEC §104).
  // Babylon settled its deportees in communities rather than scattering them,
  // and the community it settled by the Chebar canal produced a literature, a
  // law and a calendar instead of assimilating. This drift is what happens to
  // everyone ELSE, and the `resistedBy` number on yahwism is the whole point.
  faithDrift: {
    mesopotamian: {
      from: ['canaanite', 'anatolian_cults', 'yahwism'],
      resistedBy: { yahwism: 0.88, canaanite: 0.4 },
      seeds: ['Babylon', 'Nehardea', 'Uruk', 'Assur'],
      seedOwner: 'BBL',
      seedShare: 0.1,
      vigor: 0.0008,
      spreadsAlong: 'trade',
      monthlyCap: 0.003,
      curve: (y, ctx) => {
        const f = (ctx && ctx.game && ctx.game.flags) || {};
        if (f.exilesSettled) return 0.25;
        return y >= -586 ? 0.7 : 0.35;
      },
    },
  },

  objectives: {
    JDH: [
      'Win: hold Jerusalem with the house standing in 560, with 16 provinces — the state that did not end.',
      'Win: reach 516 holding Jerusalem, Mizpah and Lachish with 14 provinces — the return, on its own ground.',
      'Crown the chain: the House raised again on the Mount, and a wall round the city.',
      'Lose: Jerusalem taken and the house burned.',
    ],
  },

  schools: { JDH: 'yoke_and_word' },

  factions: {
    JDH: [
      {
        id: 'house', name: 'The House of David',
        desc: 'A dynasty with two living kings — one in the palace under an oath, one in a '
          + 'Babylonian prison drawing rations that a clerk writes down by name.',
        drift(ctx, t) { return (t.legitimacy || 0) >= 50 ? 0.4 : -0.5; },
        boon: { name: 'The Lamp Still Burning', text: '+0.3 legitimacy a month', effects: { legitimacyAdd: 0.3 } },
        bane: { name: 'Two Kings, One Throne', text: '−1 stability', effects: { stabilityAdd: -1 } },
        appease: { label: 'Honour the house (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'The House Asks Which King Is King',
          text: 'The man in Babylon is still called king in every document the exiles date, '
            + 'and the man in the palace is called "the king\'s uncle" by people who mean it '
            + 'as an insult. The family wants the question settled — a regency, an adoption, '
            + 'an heir named, anything with a document attached.',
          grant: { label: 'Settle it in writing', cost: { infl: 55 } },
          refuse: { label: 'Both kings serve', tooltip: 'Both courts go on acting as if they were the court.' },
        },
      },
      {
        id: 'priesthood', name: 'The Temple Priesthood',
        desc: 'The courses of the house, minus the vessels, the silver, the senior families '
          + 'and most of the craftsmen, all of which went to Babylon in the spring.',
        drift(ctx, t) {
          try { return ctx.helpers.controls(ctx, 'JDH', 'Jerusalem') ? 0.4 : -0.8; } catch (e) { return 0; }
        },
        boon: { name: 'The Service Kept', text: '−0.5 unrest everywhere', effects: { unrestAll: -0.5 } },
        bane: { name: 'The Vessels Are Gone', text: '−0.4 legitimacy a month', effects: { legitimacyAdd: -0.4 } },
        appease: { label: 'Refit the service (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Courses Ask for the Vessels Back',
          text: 'The bronze was cut up, the gold went north in the inventory and the service '
            + 'is being kept with replacements. The priesthood wants the crown to ask for the '
            + 'vessels — formally, through the governor, in writing — and understands '
            + 'perfectly well what asking implies about who owns them.',
          grant: { label: 'Petition for the vessels', cost: { gov: 55 } },
          refuse: { label: 'We do not ask for what is ours', tooltip: 'The service goes on with the replacements.' },
        },
      },
      {
        id: 'assembly', name: 'The People of the Land',
        desc: 'The free landholders left behind: the poorest of the land, says the chronicle, '
          + 'to be vinedressers and husbandmen — and, within a decade, the owners of every '
          + 'field the deported families used to hold.',
        drift(ctx, t) { return (t.stability || 0) >= 0 ? 0.35 : -0.5; },
        boon: { name: 'The Fields Worked', text: '+8% income', effects: { incomeMult: 1.08 } },
        bane: { name: 'The Fields Left', text: '−10% income', effects: { incomeMult: 0.9 } },
        appease: { label: 'Remit the levy (80 talents)', cost: { treasury: 80 } },
        demand: {
          title: 'The Country Asks Who Owns the Land Now',
          text: 'Ten thousand households went to Babylon in the spring and their fields are '
            + 'being worked by the people who stayed. When — if — the deported come back, two '
            + 'sets of families will have an excellent claim to the same terraces. The country '
            + 'would like that settled now, in its favour, while the other party is nine '
            + 'hundred miles away.',
          grant: { label: 'Confirm the tenancies', cost: { gov: 60 } },
          refuse: { label: 'The deeds stand', tooltip: 'The men working the land make their own arrangements.' },
        },
      },
    ],
  },
  playableTags: [
    {
      tag: 'JDH',
      difficulty: 'Very Hard',
      blurb: 'You are a king your overlord appointed, with a name your overlord gave you, in '
        + 'a city whose treasure, craftsmen and previous king are in Babylon. Egypt is '
        + 'promising cavalry, your nobles want the oath broken, and a man in the temple court '
        + 'is wearing a wooden yoke and telling everyone to submit. History gives this court '
        + 'eleven years. What it does not give — and what this chapter is actually about — is '
        + 'any way for the thing that matters to be destroyed, because the thing that matters '
        + 'has already been written down and carried out of the city.',
    },
  ],

  buildings: {
    'Jerusalem': ['walls', 'temple', 'granary'],
    'Kiryat Gat': ['walls'],
    'Babylon': ['walls', 'market', 'granary'],
    'Tyre': ['shipyard', 'market', 'walls'],
    'Sidon': ['shipyard'],
    'Memphis': ['market', 'granary'],
    'Alexandria': ['shipyard', 'market'],
    'Smyrna': ['market'],
    'Damascus': ['walls', 'market'],
  },

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

    if (g.tags.JDH) g.tags.JDH.overlord = 'BBL';
    for (const t of ['MOB', 'AMO', 'EDM']) if (g.tags[t]) g.tags[t].overlord = 'BBL';
    h.setFlag(ctx, 'babylonianVassalage', true);

    h.adjust(ctx, 'BBL', { treasury: 2000, manpower: 80000, stability: 3, legitimacy: 85 });
    h.adjust(ctx, 'JDH', { treasury: 60, manpower: 6000, stability: -1, legitimacy: 30 });
    h.adjust(ctx, 'MIZ', { treasury: 900, manpower: 30000, stability: 2, legitimacy: 70 });
    h.adjust(ctx, 'MDA', { treasury: 700, manpower: 40000, stability: 2, legitimacy: 70 });
    h.adjust(ctx, 'LYD', { treasury: 900, manpower: 20000, stability: 2, legitimacy: 70 });
    h.adjust(ctx, 'TYR', { treasury: 700, manpower: 6000, stability: 2 });
    h.adjust(ctx, 'PAS', { treasury: 150, manpower: 12000, stability: 1, legitimacy: 55 });
    h.adjust(ctx, 'KSH', { treasury: 420, manpower: 14000 });
    h.adjust(ctx, 'EDM', { treasury: 120, manpower: 5000 });

    setOpinion(g, 'BBL', 'JDH', 20);  setOpinion(g, 'JDH', 'BBL', -80);
    setOpinion(g, 'BBL', 'MIZ', -140); setOpinion(g, 'MIZ', 'BBL', -140);
    setOpinion(g, 'BBL', 'MDA', 40);   setOpinion(g, 'MDA', 'BBL', 40);
    setOpinion(g, 'MDA', 'LYD', -90);  setOpinion(g, 'LYD', 'MDA', -90);
    setOpinion(g, 'JDH', 'MIZ', 60);   setOpinion(g, 'MIZ', 'JDH', 40);
    setOpinion(g, 'JDH', 'EDM', -120); setOpinion(g, 'EDM', 'JDH', -140);
    setOpinion(g, 'MDA', 'PAS', 60);   setOpinion(g, 'PAS', 'MDA', 30);

    h.addTagModifier(ctx, 'BBL', {
      id: 'the_new_empire_597', name: 'The Empire of Nebuchadnezzar', months: -1,
      effects: { milPowerMult: 1.2, siegeMult: 1.25, incomeMult: 1.2, manpowerMult: 1.15 },
    });
    h.addTagModifier(ctx, 'JDH', {
      id: 'the_first_deportation', name: 'The First Deportation', months: -1,
      effects: { incomeMult: 0.6, manpowerMult: 0.6, legitimacyAdd: -0.2, adminMult: 1.15 },
    });
    h.addTagModifier(ctx, 'JDH', {
      id: 'the_oath_by_his_god', name: 'The Oath Sworn by His God', months: 144,
      effects: { unrestAll: 0.8 },
    });
    h.addTagModifier(ctx, 'MIZ', {
      id: 'the_saite_wealth', name: 'The Wealth of Sais', months: -1,
      effects: { incomeMult: 1.2, navalMult: 1.15 },
    });
    h.addTagModifier(ctx, 'LYD', {
      id: 'the_coined_treasury', name: 'The Coined Treasury', months: -1,
      effects: { incomeMult: 1.25, tradeMult: 1.15 },
    });
    // "Thou that dwellest in the clefts of the rock, whose habitation is
    // high" — Obadiah 3, written at Edom for exactly this decade. Sela is a
    // rock with one way in, and Edom's whole record in this period is of a
    // client that survives everybody by not being worth the siege.
    h.addTagModifier(ctx, 'EDM', {
      id: 'the_clefts_of_the_rock', name: 'The Clefts of the Rock', months: -1,
      effects: { hillDefBonus: 2, fortDefBonus: 1, tradeMult: 1.1 },
    });

    h.spawnFleet(ctx, 'TYR', 'Tyre', 8, { name: 'The Fleet of Tyre' });
    h.spawnFleet(ctx, 'MIZ', 'Alexandria', 6, { name: 'The Fleet of Sais' });

    h.spawnArmy(ctx, 'BBL', 'Chalcis', {
      inf: 18, cav: 9, name: 'The Army of the King of Babylon',
      general: { name: 'Nebuchadnezzar II', fire: 4, shock: 4, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'BBL', 'Babylon', { inf: 14, cav: 6, name: 'The Royal Reserve' });
    h.spawnArmy(ctx, 'BBL', 'Sebaste', { inf: 5, cav: 2, name: 'The Garrison of Samerina' });
    h.spawnArmy(ctx, 'JDH', 'Jerusalem', {
      inf: 4, name: 'The Guard of the City',
      general: { name: 'Zedekiah', fire: 1, shock: 1, maneuver: 1 },
    });
    h.spawnArmy(ctx, 'JDH', 'Kiryat Gat', { inf: 2, name: 'The Garrison of Lachish' });
    h.spawnArmy(ctx, 'MIZ', 'Pelusium', {
      inf: 14, cav: 5, name: 'The Army of Pharaoh',
      general: { name: 'Psamtik II', fire: 3, shock: 3, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'MDA', 'Ecbatana', {
      inf: 16, cav: 10, name: 'The Host of the Medes',
      general: { name: 'Cyaxares', fire: 3, shock: 4, maneuver: 4 },
    });
    h.spawnArmy(ctx, 'LYD', 'Smyrna', {
      inf: 12, cav: 6, name: 'The Army of Sardis',
      general: { name: 'Alyattes', fire: 3, shock: 3, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'PAS', 'Persepolis', { inf: 4, cav: 2, name: 'The Levy of Anshan' });
    h.spawnArmy(ctx, 'TYR', 'Tyre', { inf: 3, name: 'The Guard of the Island' });
    h.spawnArmy(ctx, 'EDM', 'Petra', { inf: 3, name: 'The Men of Seir' });
    h.spawnArmy(ctx, 'AMO', 'Philadelphia', { inf: 3, name: 'The Guard of Rabbah' });
    h.spawnArmy(ctx, 'MOB', 'Medaba', { inf: 2, name: 'The Men of Chemosh' });

    h.notify(ctx, {
      title: 'The Yoke of Babylon',
      text: 'The city stands, the house stands, and ten thousand people are on the road '
        + 'north with the treasure. There is a new king in the palace with a new name and an '
        + 'oath, and eleven years before the question is settled for good.',
      type: 'war', provName: 'Jerusalem',
    });
  },

  rulers: {
    BBL: { name: 'Nebuchadnezzar II', title: 'King of Babylon', gov: 4, infl: 4, mar: 4, age: 47 },
    JDH: {
      name: 'Zedekiah', title: 'King of Judah', gov: 1, infl: 1, mar: 1, age: 21,
      heir: { name: 'Jehoiachin in Babylon', gov: 2, infl: 2, mar: 1, age: 19 },
    },
    MIZ: { name: 'Psamtik II', title: 'Pharaoh', gov: 3, infl: 3, mar: 3, age: 40 },
    MDA: { name: 'Cyaxares', title: 'King of the Medes', gov: 3, infl: 3, mar: 4, age: 58 },
    PAS: { name: 'Cambyses I', title: 'King of Anshan', gov: 2, infl: 2, mar: 2, age: 40 },
    LYD: { name: 'Alyattes', title: 'King of Lydia', gov: 4, infl: 4, mar: 3, age: 50 },
    TYR: { name: 'Ithobaal III', title: 'King of Tyre', gov: 3, infl: 4, mar: 2, age: 45 },
    EDM: { name: 'The King of Edom', title: 'King of Edom', gov: 2, infl: 2, mar: 2, age: 42 },
    AMO: { name: 'Baalis', title: 'King of Ammon', gov: 2, infl: 3, mar: 2, age: 38 },
    MOB: { name: 'The King of Moab', title: 'King of Moab', gov: 2, infl: 2, mar: 2, age: 44 },
    KSH: { name: 'Aspelta', title: 'King of Kush', gov: 2, infl: 2, mar: 3, age: 40 },
  },

  missions: {
    JDH: [
      {
        id: 'zk_the_city_stands', name: 'The City Still Stands',
        icon: 'temple', col: 1, row: 0,
        desc: 'Hold Jerusalem with the house standing — which after the spring of 597 is not '
          + 'a formality but the one thing that has not yet been taken.',
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
        id: 'zk_the_two_towns', name: 'Lachish and Azekah',
        icon: 'walls', col: 0, row: 1, requires: ['zk_the_city_stands'],
        desc: 'Hold Lachish and Azekah — the last two fortified towns of the kingdom besides '
          + 'the capital, and the two the signal fires are between.',
        rewardText: '"The Signal Fires": +1 fort defence and +10% siege endurance, permanently.',
        check: (ctx) => ['Kiryat Gat', 'Beit Shemesh'].every((n) => ctx.helpers.controls(ctx, 'JDH', n)),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'the_signal_fires', name: 'The Signal Fires', months: -1,
          effects: { fortDefBonus: 1, siegeMult: 1.1 },
        }),
      },
      {
        id: 'zk_the_negeb_held', name: 'The Negeb Held Against Edom',
        icon: 'tower', col: 2, row: 1, requires: ['zk_the_city_stands'],
        desc: 'Hold the Negeb, En-Gedi and Adoraim — the frontier Edom takes the moment this '
          + 'kingdom is busy, and never gives back.',
        rewardText: '+120 talents and "The South Held": −0.5 unrest everywhere permanently.',
        check: (ctx) => ['Oboda', 'Engaddi', 'Adora'].every((n) => ctx.helpers.controls(ctx, 'JDH', n)),
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'JDH', { treasury: 120 });
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'the_south_held', name: 'The South Held', months: -1,
            effects: { unrestAll: -0.5 },
          });
        },
      },
      {
        id: 'zk_the_archive', name: 'The Archive Copied',
        icon: 'scroll', col: 1, row: 1, requires: ['zk_the_city_stands'],
        desc: 'Take two rungs of The Art of Rule — the scribes set to copying everything in '
          + 'the chamber, twice, because one copy is going to be somewhere else.',
        rewardText: '"The Copies Made": −8% cost of governing and +0.2 legitimacy a month, permanently.',
        check: (ctx) => (((crown(ctx, 'JDH').reforms || {}).civ | 0) >= 2),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'the_copies_made', name: 'The Copies Made', months: -1,
          effects: { adminMult: 0.92, legitimacyAdd: 0.2 },
        }),
      },
      {
        id: 'zk_the_hills_north', name: 'The Hill Country North',
        icon: 'mountain', col: 0, row: 2, requires: ['zk_the_two_towns'],
        desc: 'Take Mizpah, Bethel\'s ridge and Shechem — the Israelite hill country the '
          + 'empire governs and the people in it are still, by every measure that matters, '
          + 'this kingdom\'s kin.',
        rewardText: '+3,000 manpower and "The Hills Come In": +8% manpower permanently.',
        check: (ctx) => ['Ramallah', 'Neapolis'].every((n) => ctx.helpers.controls(ctx, 'JDH', n)),
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'JDH', { manpower: 3000 });
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'the_hills_come_in', name: 'The Hills Come In', months: -1,
            effects: { manpowerMult: 1.08 },
          });
        },
      },
      {
        id: 'zk_the_kingdom_alive', name: 'A Kingdom, Not a Remnant',
        icon: 'flag', col: 1, row: 2, requires: ['zk_the_two_towns', 'zk_the_negeb_held'],
        desc: 'Hold ten provinces with the realm steady at +1 stability — twice the ridge '
          + 'the settlement of 597 left, and a court that is not waiting for instructions.',
        rewardText: '+25 legitimacy, +60 martial points.',
        check: (ctx) => ctx.helpers.countControlled(ctx, 'JDH', {}) >= 10
          && (crown(ctx, 'JDH').stability || 0) >= 1,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JDH', { legitimacy: 25, mar: 60 }),
      },
      {
        id: 'zk_the_coast', name: 'The Plain and the Port',
        icon: 'anchor', col: 2, row: 2, requires: ['zk_the_negeb_held'],
        desc: 'Take Ekron, Ashdod and Gezer — the coastal plain, and with it the one road '
          + 'out of this country that is not through somebody\'s empire.',
        rewardText: '+180 talents and "The Plain Held": +10% trade permanently.',
        check: (ctx) => ['Jamnia', 'Azotus', 'Lydda'].every((n) => ctx.helpers.controls(ctx, 'JDH', n)),
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'JDH', { treasury: 180 });
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'the_plain_held_597', name: 'The Plain Held', months: -1,
            effects: { tradeMult: 1.1 },
          });
        },
      },
      {
        id: 'zk_the_walls', name: 'The Walls Raised Again',
        icon: 'bricks', col: 0, row: 3, requires: ['zk_the_hills_north'],
        desc: 'Reach Military 5 — The Signal Fires — and hold Jerusalem with walls on it. A '
          + 'city without a wall is a village with a memory.',
        rewardText: '"The Wall Rebuilt": +1 fort defence and +15% siege endurance, permanently.',
        check: (ctx) => {
          try {
            if ((((crown(ctx, 'JDH').tech || {}).mar | 0) < 5)) return false;
            const p = ctx.prov && ctx.prov('Jerusalem');
            return !!p && p.owner === who(ctx, 'JDH') && (p.buildings || []).indexOf('walls') !== -1;
          } catch (e) { return false; }
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'the_wall_rebuilt', name: 'The Wall Rebuilt', months: -1,
          effects: { fortDefBonus: 1, siegeMult: 1.15 },
        }),
      },
      {
        id: 'zk_the_treasury', name: 'The Treasury Refilled',
        icon: 'coins', col: 1, row: 3, requires: ['zk_the_kingdom_alive'],
        desc: 'Carry the realm to 140 development with 450 talents banked — what went north '
          + 'in the spring of 597, earned back.',
        rewardText: '"The Country Rebuilt": +10% income and +6% growth, permanently.',
        check: (ctx) => ownedDev(ctx, 'JDH') >= 140 && (crown(ctx, 'JDH').treasury || 0) >= 450,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'the_country_rebuilt', name: 'The Country Rebuilt', months: -1,
          effects: { incomeMult: 1.1, growthMult: 1.06 },
        }),
      },
      {
        id: 'zk_the_exiles_answer', name: 'The Letters Both Ways',
        icon: 'quill', col: 2, row: 3, requires: ['zk_the_coast'],
        desc: 'Bring Babylon\'s regard for us to +55 — a court that can correspond with the '
          + 'empire holding its own people, and get answers.',
        rewardText: '+60 influence points and "The Road to Babylon Open": +8% income permanently.',
        check: (ctx) => regard(ctx, 'BBL', 'JDH') >= 55,
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'JDH', { infl: 60 });
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'road_to_babylon_open', name: 'The Road to Babylon Open', months: -1,
            effects: { incomeMult: 1.08 },
          });
        },
      },
      {
        id: 'zk_the_arts_of_the_age', name: 'The Arts of the Age',
        icon: 'lamp', col: 1, row: 4, requires: ['zk_the_treasury'],
        desc: 'Take up three ideas of the age — the generation that turns a national cult '
          + 'into a portable one, which is the only technology in this chapter that matters.',
        rewardText: '+70 governance points, +25 legitimacy.',
        check: (ctx) => eraTiers(crown(ctx, 'JDH')) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JDH', { gov: 70, legitimacy: 25 }),
      },
      {
        id: 'zk_the_house_and_the_wall', name: 'The House and the Wall',
        icon: 'shrine', col: 1, row: 5, requires: ['zk_the_arts_of_the_age', 'zk_the_walls'],
        desc: 'Hold Jerusalem with the house standing, walls raised and 14 provinces — a '
          + 'city with a temple and a wall round it, which is the whole programme of the '
          + 'next two centuries achieved inside one.',
        rewardText: '+40 legitimacy, +1 stability, and "The City Restored" (+10% income, +0.3 legitimacy a month).',
        check: (ctx) => {
          try {
            const p = ctx.prov && ctx.prov('Jerusalem');
            if (!p || p.owner !== who(ctx, 'JDH') || p.wonder !== 'temple') return false;
            if ((p.buildings || []).indexOf('walls') === -1) return false;
            return ctx.helpers.countControlled(ctx, 'JDH', {}) >= 14;
          } catch (e) { return false; }
        },
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'JDH', { legitimacy: 40, stability: 1 });
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'the_city_restored', name: 'The City Restored', months: -1,
            effects: { incomeMult: 1.1, legitimacyAdd: 0.3 },
          });
        },
      },
      // ── The civil band (SPEC §211) ──────────────────────────────────────
      {
        id: 'zk_the_register_of_families', name: 'The Register of Families',
        icon: 'quill', col: 0, row: 6, civil: 'govt',
        desc: 'Take three rungs of the civil reforms — a state whose central administrative '
          + 'act is a list of who belongs to it, by household, by town and by descent.',
        rewardText: '"The Genealogies Kept": −0.5 unrest everywhere permanently, +60 governance points.',
        check: (ctx) => (((crown(ctx, 'JDH').reforms || {}).civ | 0) >= 3),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'the_genealogies_kept', name: 'The Genealogies Kept', months: -1,
            effects: { unrestAll: -0.5 },
          });
          ctx.helpers.adjust(ctx, 'JDH', { gov: 60 });
        },
      },
      {
        id: 'zk_the_law_read_aloud', name: 'The Law Read Aloud',
        icon: 'scroll', col: 0, row: 7, civil: 'govt', requires: ['zk_the_register_of_families'],
        desc: 'Carry the realm to 170 development with the country steady at +2 stability — '
          + 'a polity governed by a text read out in public and explained, which nobody else '
          + 'on this map has.',
        rewardText: '"A Kingdom of the Book": +10% income and +5% force limit, permanent.',
        check: (ctx) => ownedDev(ctx, 'JDH') >= 170 && (crown(ctx, 'JDH').stability || 0) >= 2,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'a_kingdom_of_the_book', name: 'A Kingdom of the Book', months: -1,
          effects: { incomeMult: 1.1, forceLimitMult: 1.05 },
        }),
      },
      {
        id: 'zk_among_the_powers', name: 'A Name Among the Powers',
        icon: 'flag', col: 1, row: 6, civil: 'region',
        desc: 'Stand among the first three courts of the world — from a kingdom that began '
          + 'this chapter as a line in somebody else\'s chronicle for the month of Adar.',
        rewardText: '"Not a Line in a Chronicle": +1 diplomatic seat permanently, +50 influence points.',
        check: (ctx) => { const i = standingRank(ctx, 'JDH'); return i >= 0 && i < 3; },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'not_a_line_in_a_chronicle', name: 'Not a Line in a Chronicle', months: -1,
            effects: { diploSeats: 1 },
          });
          ctx.helpers.adjust(ctx, 'JDH', { infl: 50 });
        },
      },
      {
        id: 'zk_the_dispersion', name: 'The Correspondence of the Dispersion',
        icon: 'diaspora', col: 1, row: 7, civil: 'region', requires: ['zk_among_the_powers'],
        desc: 'Hold the first three seats of the standing with Egypt\'s regard at +60 — '
          + 'Elephantine, Babylonia and here, writing to each other about the calendar and '
          + 'expecting answers.',
        rewardText: '"One People, Three Countries": +10% income permanently, +4,000 manpower.',
        check: (ctx) => {
          const i = standingRank(ctx, 'JDH');
          return i >= 0 && i < 3 && regard(ctx, 'MIZ', 'JDH') >= 60;
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JDH', {
            id: 'one_people_three_countries', name: 'One People, Three Countries', months: -1,
            effects: { incomeMult: 1.1 },
          });
          ctx.helpers.adjust(ctx, 'JDH', { manpower: 4000 });
        },
      },
      {
        id: 'zk_the_house_and_the_country', name: 'The House and the Country',
        icon: 'altar', col: 2, row: 6, civil: 'court',
        desc: 'Bring the Temple Priesthood and the People of the Land both to 65 approval at '
          + 'once — the courses and the men working the fields of families who are nine '
          + 'hundred miles away.',
        rewardText: '"The Land and the Courses": +0.2 legitimacy a month and −0.5 unrest everywhere, permanent.',
        check: (ctx) => {
          const f = crown(ctx, 'JDH').factions || {};
          return (f.priesthood || 0) >= 65 && (f.assembly || 0) >= 65;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'land_and_courses', name: 'The Land and the Courses', months: -1,
          effects: { legitimacyAdd: 0.2, unrestAll: -0.5 },
        }),
      },
      {
        id: 'zk_one_people', name: 'One People, One Court',
        icon: 'speaker', col: 2, row: 7, civil: 'court', requires: ['zk_the_house_and_the_country'],
        desc: 'Bring the house, the priesthood and the people of the land all to 65 approval '
          + 'with 30 favour banked from the house — two kings, no vessels, two claims to every '
          + 'field, and all of them agreeing.',
        rewardText: '"No Two Kings": +0.3 legitimacy a month and +8% income, permanent.',
        check: (ctx) => {
          const t = crown(ctx, 'JDH');
          const f = t.factions || {};
          const bank = t.estateFavor || {};
          return (f.house || 0) >= 65 && (f.priesthood || 0) >= 65
            && (f.assembly || 0) >= 65 && (bank.house || 0) >= 30;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JDH', {
          id: 'no_two_kings', name: 'No Two Kings', months: -1,
          effects: { legitimacyAdd: 0.3, incomeMult: 1.08 },
        }),
      },
      // ── The roads not taken (SPEC §183) ─────────────────────────────────
      {
        id: 'hy_the_oath', name: 'The Oath by His God', hypothetical: true,
        fork: '597bce/the_oath_to_babylon',
        roads: ['oath_kept', 'oath_broken'],
        icon: 'split', col: 3, row: 0,
        desc: 'Settle what the oath sworn to Nebuchadnezzar is worth: keep it and be a vassal '
          + 'with a court and a house, or break it with Egyptian cavalry promised.',
        rewardText: '+25 legitimacy, +40 governance points.',
        check: (ctx) => anyFlag(ctx, 'oathKept', 'oathBroken'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JDH', { legitimacy: 25, gov: 40 }),
      },
      {
        id: 'hy_the_two_prophets', name: 'Two Years or Seventy', hypothetical: true,
        fork: '597bce/the_prophets_quarrel',
        roads: ['yoke_of_wood', 'yoke_of_iron'],
        icon: 'flame', col: 3, row: 1, requires: ['hy_the_oath'],
        desc: 'Rule between the two men in the temple court: the one who says the vessels '
          + 'come home in two years, and the one wearing a wooden yoke who says seventy and '
          + 'that the yoke will be iron if it is broken.',
        rewardText: '+50 influence points, +20 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'yokeOfWood', 'yokeOfIron'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JDH', { infl: 50, legitimacy: 20 }),
      },
      {
        id: 'hy_the_letter', name: 'The Letter to the Exiles', hypothetical: true,
        fork: '597bce/the_letter_to_the_exiles',
        roads: ['exiles_settled', 'exiles_promised_return'],
        icon: 'diaspora', col: 3, row: 2, requires: ['hy_the_two_prophets'],
        desc: 'Settle what this court tells the ten thousand in Babylonia: build houses and '
          + 'plant gardens and seek the peace of the city — or keep your bags packed, because '
          + 'this will be over shortly.',
        rewardText: '+60 influence points, +25 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'exilesSettled', 'exilesPromisedReturn'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JDH', { infl: 60, legitimacy: 25 }),
      },
      {
        id: 'hy_the_edict', name: 'What Is Rebuilt First', hypothetical: true,
        fork: '597bce/the_house_rebuilt',
        roads: ['house_first', 'walls_first'],
        icon: 'shrine', col: 4, row: 2, requires: ['hy_the_letter'],
        desc: 'Reach the Persian century with a community on this ground and a permit in '
          + 'hand, and decide what the first stones go into: the house on the Mount, or a '
          + 'wall round the people building it.',
        rewardText: '+70 governance points, +30 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'houseRebuilt', 'wallsFirst'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JDH', { gov: 70, legitimacy: 30 }),
      },
    ],
  },

  aiHints: {
    BBL: { rally: ['Babylon', 'Chalcis'], targetRegiments: 70 },
    JDH: { rally: ['Jerusalem'], targetRegiments: 10 },
    MIZ: { rally: ['Pelusium', 'Memphis'], targetRegiments: 34 },
    MDA: { rally: ['Ecbatana'], targetRegiments: 44 },
    LYD: { rally: ['Smyrna'], targetRegiments: 26 },
    PAS: { rally: ['Persepolis'], targetRegiments: 9 },
    EDM: { rally: ['Petra'], targetRegiments: 3 },
    AMO: { rally: ['Philadelphia'], targetRegiments: 4 },
    MOB: { rally: ['Medaba'], targetRegiments: 4 },
    KSH: { rally: ['Napata'], targetRegiments: 6 },
    TYR: { rally: ['Tyre'], targetRegiments: 6 },
    REB: { rally: [], targetRegiments: 0 },
  },

  checkVictory(ctx) {
    try {
      const g = ctx.game;
      const h = ctx.helpers;
      if (!g || g.over || g.result) return;
      const jdhTag = g.tags && g.tags[who(ctx, 'JDH')];
      const alive = !!(jdhTag && jdhTag.alive !== false);
      if (g.playerTag !== who(ctx, 'JDH')) return;
      // §146: held ground for a win, the realm itself for a loss.
      const held = alive ? h.countHeld(ctx, 'JDH', {}) : 0;
      const realm = alive ? h.countOwned(ctx, 'JDH', {}) : 0;
      const jer = alive && h.controls(ctx, 'JDH', 'Jerusalem');
      const temple = (() => {
        try { const p = ctx.prov && ctx.prov('Jerusalem'); return !!(p && p.wonder === 'temple'); } catch (e) { return false; }
      })();

      if (dateGE(g.date, -560, 1) && jer && temple && held >= 16) {
        h.endGame(ctx, {
          result: 'win',
          title: 'The State That Did Not End',
          text: 'The house is standing, the courses are serving, the archive is in the chamber '
            + 'and the king in Jerusalem is the king. There is no exile, no Lamentations and '
            + 'no return — and no way of knowing what this people would have become without '
            + 'them, which is the argument every scribe in the city is now having.',
          score: 250,
        });
        return;
      }
      if (dateGE(g.date, -516, 1) && jer && temple
          && ['Ramallah', 'Kiryat Gat'].every((n) => h.controls(ctx, 'JDH', n)) && held >= 14) {
        h.endGame(ctx, {
          result: 'win',
          title: 'The Second House',
          text: 'Seventy years, to the year, and the foundation is laid: the old men who saw '
            + 'the first house weep out loud, and the young men shout, and nobody outside can '
            + 'tell the weeping from the shouting. It is smaller. It is here.',
          score: 220,
        });
        return;
      }
      if (!alive || (realm === 0 && totalMen(ctx, 'JDH') < 1500)) {
        h.endGame(ctx, {
          result: 'loss',
          title: 'By the Rivers of Babylon',
          text: 'The wall is breached in the fourth month, the house is burned in the fifth, '
            + 'and the last king of this line is blinded at Riblah after being shown his sons. '
            + 'What survives is a library, a calendar, an argument and a promise — which is, '
            + 'in the event, enough, but nobody in this generation can possibly know that.',
          score: 0,
        });
        return;
      }
    } catch (e) { warnOnce('checkVictory', e); }
  },
};
