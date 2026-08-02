// Judaea Universalis — bookmark: The Keepers, 529 CE (SPEC §136).
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
//
// The one chapter in this game whose player is not Jewish.
//
// The Samaritans — Shamerim, "the keepers", which is what they call themselves
// and not what anyone else calls them — are an Israelite people with their own
// Torah, their own Aaronide priesthood, their own script, and their own holy
// mountain. Their Deuteronomy 27:4 reads Gerizim where the Jewish text reads
// Ebal, and their tenth commandment is the command to build the altar there.
// Every other bookmark in this game is a Jewish state that regards Jerusalem as
// the centre of the world. This one is a rival Israelite tradition that regards
// Jerusalem as a usurpation four centuries older than the schism with Rome.
//
// The historical spine of 529: Justinian's legislation had stripped Samaritans
// of the right to inherit, to testify, and to hold property, and ordered their
// synagogues destroyed. The rising that answered it crowned a king — Julianus
// ben Sabar — at Neapolis, held chariot races to prove it, and executed the
// Christian charioteer Nicias for winning. Churches burned across Samaria and
// the bishop of Neapolis was mutilated. Justinian sent the dux Theodorus with
// the Ghassanid Arabs of al-Harith ibn Jabalah; Julianus was defeated near the
// mountain, killed, and his jewelled crown sent to Constantinople.
//
// The casualty figures are disputed and the dispute does not matter much:
// Procopius says a hundred thousand, Malalas twenty, and the direction is the
// same either way. A community of hundreds of thousands became a remnant. There
// are roughly eight hundred Samaritans alive today. So this chapter's victory
// condition sits where no other chapter in the game has to put it — not a
// state, not a border, but whether there is anybody left.
//
// Sources: Procopius, Anecdota XI and Buildings V.vii; Malalas XVIII;
// Cyril of Scythopolis, Life of Sabas 70; the Codex Justinianus I.v; the
// Samaritan Chronicle Adler and the Kitab al-Tarikh of Abu'l-Fath, which are
// not uniformly admiring of the men who led the risings.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[bookmark_529ce] ' + key, e || '');
}

// The letters this court answers to NOW (SPEC §135).
function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
}

// A war is filed under the names its belligerents wear now (SPEC §135).
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

// Era-idea tiers a court has taken up (SPEC §179), read off the tag —
// content packages import nothing.
function eraTiers(t) {
  const o = (t && t.eraIdeas) || {};
  let n = 0;
  for (const k of Object.keys(o)) n += Math.max(0, o[k] | 0);
  return n;
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

// How many provinces still keep the Torah of the Keepers, wherever their
// banner flies. This is the chapter's real scoreboard (SPEC §136): the
// question is not how much ground the state holds but whether the people
// who hold that Torah are still on the map.
function keeperProvinces(ctx) {
  const g = ctx.game;
  let n = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.religion === 'samaritanism') n++;
  }
  return n;
}

// ---- the political map of the spring of 529 ---------------------------------
// The hill country the community actually held, and nothing else. Neapolis is
// the only cell of the four with a city in it; the map already carries Gerizim
// as its holy site.
const SAM_LANDS = ['Neapolis', 'Jenin', 'Tulkarm', 'Qalqilya'];

// The Jews of Palaestina under their own tag, not as a faction of somebody
// else's court (SPEC §136). In 556 these two communities rose together at
// Caesarea and killed the governor Stephanus in his praetorium; a chapter that
// wants to ask whether the schism matters more than the empire has to let the
// other side answer, and a modifier cannot answer.
//
// Four towns and not one of them is in Judaea, which is the whole point: this
// is GALILEE (SPEC §139), and the chapter renames the tag to say so. Judaea
// proper — Jerusalem, Hebron, Lydda, the hill country the other seven chapters
// are fought over — is a Christian province in 529 that Jews may enter one day
// a year to mourn. What is left of the nation is around a lake sixty miles
// north: the patriarchate is a century lapsed, the academy at Tiberias is what
// governs, and the Palestinian Talmud was closed at Tiberias with Sepphoris
// beside it — two of these four towns, which is two more than Judaea has.
const JUD_LANDS = ['Tiberias', 'Sepphoris', 'Tarichaea', 'Gischala'];

// Everything else in the diocese of the East is Justinian's, and so is
// everything the frame reaches west of it.
const BYZ_LANDS = [
  // Palaestina Prima and Secunda: the coast, the hills, the two capitals
  'Caesarea Maritima', 'Sebaste', 'Antipatris', 'Dora',
  'Jerusalem', 'Jericho', 'Emmaus',
  'Lydda', 'Joppa', 'Hebron', 'Adora', 'Engaddi', 'Masada', 'Gaza', 'Ascalon',
  'Azotus', 'Jamnia', 'Scythopolis', 'Ptolemais', 'Jotapata', 'Gadara', 'Pella',
  'Caesarea Philippi', 'Batanea', 'Gamala', 'Gadora', 'Machaerus',
  // Phoenice and Syria
  'Tyre', 'Sidon', 'Berytus', 'Byblos', 'Tripolis', 'Aradus', 'Chalcis',
  'Damascus', 'Emesa', 'Apamea', 'Palmyra', 'Beroea', 'Antioch',
  'Seleucia Pieria', 'Laodicea', 'Cyrrhus', 'Zeugma', 'Samosata', 'Edessa',
  'Carrhae', 'Amida', 'Melitene', 'Sophene', 'Dura-Europos',
  // Arabia and the Negev road
  'Petra', 'Oboda', 'Aila', 'Rhinocolura', 'Pelusium',
  // Anatolia, Cyprus, Egypt, and the empire's west
  'Tarsus', 'Iconium', 'Tyana', 'Pisidia', 'Attalia', 'Seleucia Trachea',
  'Caesarea Mazaca', 'Salamis', 'Paphos', 'Alexandria', 'Athribis',
  'Leontopolis', 'Memphis', 'Arsinoe', 'Oxyrhynchus', 'Thebes', 'Myos Hormos',
  'Syene', 'Berenice', 'Cyrene', 'Marmarica', 'Paraetonium',
  'Corinth', 'Athens', 'Sparta', 'Gortyn', 'Rhodes', 'Halicarnassus',
  'Dyrrhachium', 'Thessalonica', 'Hadrianopolis', 'Byzantion',
  'Nicaea', 'Smyrna', 'Ancyra', 'Sinope', 'Trapezus', 'Phasis',
  // CORRECTED (SPEC §173): this list used to reach Rome, Sicily and
  // Tripolitania — the west Justinian holds only in the histories his own
  // reign has not written yet. In the spring of 529 Italy and Sicily are
  // Athalaric's, Carthage and the Syrtic shore are Hilderic's, and Belisarius
  // is a young officer on the PERSIAN front. The political map
  // (js/data/political_maps.js) seats the Ostrogoths and Vandals on that
  // ground; the reconquest is a war the player gets to watch — or prevent.
];
const SAS_LANDS = [
  'Seleucia-Ctesiphon', 'Babylon', 'Nehardea', 'Uruk', 'Charax', 'Ecbatana',
  'Susa', 'Gazaca', 'Persepolis', 'Gabae', 'Gerrha', 'Hatra', 'Assur',
  'Singara', 'Arbela', 'Nisibis', 'Tigranocerta',
  'Caucasian Albania', 'Hyrcania',
];
const GHA_LANDS = ['Bostra', 'Philadelphia', 'Medaba', 'Gerasa', 'Hegra', 'Dumatha', 'Tayma'];

const OWNERS = {};
for (const n of BYZ_LANDS) OWNERS[n] = 'BYZ';
for (const n of SAS_LANDS) OWNERS[n] = 'SAS';
for (const n of GHA_LANDS) OWNERS[n] = 'GHA';
// SPEC §162: the Galilee is PALAESTINA SECUNDA in 529, not a kingdom. There
// was no Jewish state anywhere between Bar Kokhba and 1948, and this chapter
// was quietly asserting one — JUD held these four towns outright, with no
// overlord, a treasury, and a standing army. What the community actually had
// in 529 is what the comment above already says: an academy at Tiberias, a
// closed Talmud, and a patriarchate a century lapsed. The emperor let it lapse
// in 425 and the chain in events_132ce_galilee.js is built on exactly that.
//
// So the towns start Byzantine and the Jewish population stays Jewish (the
// RELIGIONS overlay below is untouched — these are Jewish provinces under an
// empire that legislates against them, which is the whole point).
//
// Galilee is not deleted, it is DEFERRED: JUD stays in activeTags as a dormant
// court, on the same pattern 167 BCE uses for the Seleucid successors, and it
// comes into being in July 556 when the two houses rise together at Caesarea —
// `ev529_the_praetorium_at_caesarea`, which already models that rising and
// already sets `roseWithTheJews`. An entity that appears out of a joint revolt
// is a truer thing than one that was simply always there.
for (const n of JUD_LANDS) OWNERS[n] = 'BYZ';
for (const n of SAM_LANDS) OWNERS[n] = 'SAM';
OWNERS['Yathrib'] = 'RSH';
OWNERS['Khaybar'] = 'RSH';

// ---- the map of faiths in the reign of Justinian ----------------------------
const RELIGIONS = {};
for (const n of BYZ_LANDS.concat(GHA_LANDS)) RELIGIONS[n] = 'christianity';
for (const n of SAS_LANDS) RELIGIONS[n] = 'christianity';
for (const n of ['Seleucia-Ctesiphon', 'Ecbatana', 'Susa', 'Gazaca', 'Assur',
  'Singara', 'Persepolis', 'Gabae', 'Caucasian Albania', 'Hyrcania']) RELIGIONS[n] = 'zoroastrianism';
for (const n of JUD_LANDS.concat(['Nehardea', 'Arbela', 'Khaybar'])) RELIGIONS[n] = 'judaism';
for (const n of SAM_LANDS) RELIGIONS[n] = 'samaritanism';
// Sebaste is the knife in the middle of Samaria: Herod's Greek foundation five
// miles from Neapolis, still a Christian garrison town in 529. It sits in the
// hill country and is not of it.
RELIGIONS['Sebaste'] = 'christianity';
// …and the Sharon foothills west of the hills are Jewish, as Galilee is. By 529
// the coast and the cities of Palaestina Prima are Christian, but the villages
// between the hill country and the plain are not, and that is the geography the
// chapter's hardest fork needs: the Keepers are ringed on three sides by people
// who hold the same Torah and think their mountain is a lie. In 556 those two
// communities rose together at Caesarea and killed the governor in his own
// praetorium, which is not a thing strangers do.
RELIGIONS['Antipatris'] = 'judaism';
// Caesarea's Samaritan quarter is why both the 484 and the 556 risings started
// there and not on the mountain. The province is the empire's and Christian;
// the quarter is a fact the cards know about and the map does not.

export const BOOKMARK_529 = {
  id: '529ce',
  name: 'The Keepers',
  startDate: { y: 529, m: 3, d: 1 },
  // SPEC §121: the year after which this chapter's own undated trigger cards
  // stop belonging to anybody. The chapter runs to the eve of the Persian
  // conquest — 614 is where the next bookmark opens, and the Samaritans who
  // are still there in 614 sided with Persia.
  generationHorizon: 620,
  techBase: 9,
  techCeiling: 13,
  techTweaks: { BYZ: { gov: 1, mar: 1 } },
  // The rungs' own names (SPEC §179): the arts of Justinian's provinces and
  // of the people that means to leave them.
  techNames: {
    gov: {
      8: 'The Diocesan Rolls', 9: 'The Village Assessment', 10: 'The Priests\' Districts',
      11: 'The Courts of the Law', 12: 'The Codex of Laws', 13: 'The Kingdom\'s Book',
    },
    infl: {
      8: 'The Pilgrim Roads', 9: 'The Provincial Assemblies', 10: 'The Synagogue Word',
      11: 'The Coastal Merchants', 12: 'The Foreign Ears', 13: 'The Two Empires Read',
    },
    mar: {
      8: 'The Village Watch', 9: 'The Terrace Walls', 10: 'The Hill Musters',
      11: 'The Captured Arsenals', 12: 'The Drilled Bands', 13: 'The Thematic Pattern',
    },
  },
  popMult: 0.8,

  // The map speaks its era (SPEC §25).
  provinceNames: {
    'Byzantion': 'Constantinople',
    'Neapolis': 'Neapolis',           // the Greek city; the Keepers' own name is below
    'Dura-Europos': 'Circesium',
    'Persepolis': 'Istakhr',
    'Gabae': 'Spahan',
    'Ecbatana': 'Hamadan',
    'Charax': 'Maishan',
    'Salamis': 'Constantia',
  },

  // The victors' pens (SPEC §66). The Keepers' pen is its own — the Jewish pen
  // is the wrong pen here, and that is most of the point of this chapter. The
  // names are the Samaritan Aramaic and Hebrew forms their own chronicles use:
  // Shechem for the town below the mountain, Har Brikh for the blessed
  // mountain, and Luza for the ancient site their tradition places there.
  integratedNames: {
    SAM: {
      'Neapolis': 'Shechem',
      'Sebaste': 'Shomron',
      'Jenin': 'Ein Ganim',
      'Tulkarm': 'Tur Karma',
      'Qalqilya': 'Qalqilya',
      'Antipatris': 'Migdal Afeq',
      'Caesarea Maritima': 'Qisri',
      'Afula': 'Ophel',
      'Scythopolis': 'Beit She\'an',
    },
    // The Hebrew pen, for the other Israelite state on this map.
    JUD: {
      'Ptolemais': 'Akko', 'Scythopolis': 'Beit She\'an',
      'Sepphoris': 'Tzippori', 'Neapolis': 'Shechem',
      'Caesarea Maritima': 'Qisri', 'Joppa': 'Yafo',
    },
    MLI: 'JUD',
    // The Sayhadic pen (SPEC §208): the client kingdom writes its country
    // in its own names, not the Periplus' Greek — Aden for the merchants'
    // harbor, Mawza for the roadstead, Sumhuram for the frankincense port
    // the excavators found under Moscha, Suqutra for the island.
    HMY: {
      'Eudaemon Arabia': 'Aden', 'Muza': 'Mawza',
      'Moscha': 'Sumhuram', 'Dioscurida': 'Suqutra',
    },
    // No Byzantine pen: the era's names above are already the Empire's.
  },

  // What the era calls its courts (SPEC §139). Three letters outlive their
  // century; the state under them does not.
  //
  // JUD is Judaea in the seven chapters that turn on Jerusalem. It is not
  // Judaea here. By 529 the name is a Roman provincial label with no Jewish
  // polity behind it — Hadrian struck it off in 135, the hill country is
  // Christian Palaestina Prima, and Jews enter the city one day a year to
  // mourn on the ninth of Ab. The nation moved north and stayed there: the
  // Sanhedrin to Sepphoris and then Tiberias, the patriarchate with it until
  // Theodosius II let the office lapse around 425, and the Palestinian Talmud
  // was closed at Tiberias with Sepphoris beside it, a century before this
  // chapter opens. The Jewish state on this map is GALILEE, its seat is
  // Tiberias, and calling it Judaea would be the same error as calling the
  // Keepers Jews.
  //
  // The seat matters mechanically as well as on the label: the growth bonus,
  // the AI's development and rally logic, the pretender's prize and the peace
  // table's protected crown all read a capital, and Jerusalem in this chapter
  // belongs to the Empire.
  tagTweaks: {
    JUD: {
      name: 'Galilee', adj: 'Galilean',
      capital: 'Tiberias',
      description: 'What is left of the nation, around a lake sixty miles north of the '
        + 'city it may not live in: the academy at Tiberias, the town that closed the '
        + 'Talmud, and a patriarchate the emperor let lapse.',
    },
    // The era's lens on the western tags (SPEC §139, §173): the same three
    // letters, the state the sixth century actually knows under them. A renamed
    // court renames its adjective too, or the map would write GALILEE at home
    // and "Judaean Egypt" abroad (SPEC §5.6).
    CAL: { name: 'The Picts', adj: 'Pictish', description: 'The painted peoples beyond the old wall, whom Columba has not yet visited.' },
    SUE: {
      name: 'The Sueves', adj: 'Suevic', capital: 'Bracara',
      description: 'The Suebic kingdom of Gallaecia: a migration that stopped, took the land, and kept the name.',
    },
    MAU: { name: 'The Moorish Kingdoms', adj: 'Moorish', description: 'Masuna\'s "kingdom of the Moors and Romans", Iaudas in the Aures: what the Vandals never held and the reconquest will learn about.' },
    LMB: { capital: 'Carnuntum' }, // Wacho rules from the middle Danube; Italy is thirty years away
    CIM: { name: 'The Danes', adj: 'Danish', description: 'The new lords of the Cimbric sea: Chlochilaich\'s raid is eight years old and Gaul remembers it.' },
    // The kingdom beyond the strait (SPEC §208). The static define carries
    // `south_arabian` because the 66 CE frame seats a pre-conversion Himyar;
    // by 529 the house has kept the God of Israel for a century and a half —
    // Abikarib As'ad to Yusuf, the Rahmanan formula on every royal
    // inscription — and four years of a viceroy's church at Zafar do not
    // undo it. Same single-religion-key compromise as Adiabene (SPEC §185):
    // the tag carries the covenant the kings took, and the 529 nuance — a
    // Christian client crown on a Jewish country's throne — lives in the
    // court, where nuance belongs.
    HMY: {
      religion: 'judaism',
      description: 'The kingdom whose kings took the God of Israel and lost the war about it: '
        + 'broken by the negus four years ago, held by the client he crowned, garrisoned by '
        + 'the army that will shortly stop answering him.',
    },
  },

  blurb: 'Justinian has ruled two years and has already legislated the Keepers out of the '
    + 'right to inherit, to testify, and to own what they hold. The synagogues are to come '
    + 'down. On the mountain the Church of St Mary Theotokos stands where the altar should '
    + 'be, garrisoned, with the summit barred to the people whose Torah commands them to '
    + 'build there. Four hill provinces, no port, no ally, and a law that says you may not '
    + 'own your own fields — and in Neapolis they are talking about a king.',

  // The map wears its era's shape (SPEC §47): the fortress-towns of the two
  // Jewish wars were never rebuilt.
  mergeProvinces: {
    'Jotapata': 'Sepphoris', 'Gamala': 'Batanea',
    'Machaerus': 'Medaba', 'Masada': 'Engaddi',
  },
  // The hill country in its own right (SPEC §47). Jenin is a latent cell of
  // Neapolis and Tulkarm and Qalqilya are latent cells of SEBASTE — which is
  // the Christian garrison town five miles away, so leaving them folded would
  // give the community's own farmland to the thing watching it. This chapter
  // is four hill provinces or it is nothing.
  activeProvinces: ['Jenin', 'Tulkarm', 'Qalqilya'],

  activeTags: ['SAM', 'BYZ', 'JUD', 'GHA', 'SAS',
    // The political west (SPEC §173): the successor kingdoms four years
    // before Belisarius sails, seated by js/data/political_maps.js. The
    // reconquest is not scripted; the courts, wars and successions of §163
    // decide whether an Amal Italy is still there to be taken.
    'OST', 'VAN', 'MAU', 'GRM', 'VIS', 'SUE', 'FRK', 'BGD', 'ARO',
    'BRT', 'CAL', 'HIB', 'SAX', 'FRS', 'CIM', 'SCN', 'AES',
    'GEP', 'LMB', 'BGR', 'SLV',
    // The political east and south (SPEC §205): the Nubian kings and the
    // Blemmyes on the Nile, the Hephthalites over the Oxus — and the far
    // end of the Red Sea seated as the two courts it actually was (SPEC
    // §208): Kaleb's Aksum on its highlands, and the client kingdom of
    // Himyar he left at Zafar when he sailed home.
    'NOB', 'BLM', 'AXM', 'HEP', 'HMY'],
  // Standing rivalries (SPEC §73): the era's weather. The Ghassanid phylarchate
  // is the instrument Justinian actually used against the mountain, which makes
  // GHA an antagonist here rather than the background client it is in 614.
  rivalries: [['SAM', 'BYZ'], ['SAM', 'GHA'], ['BYZ', 'SAS']],
  // Historical friends (SPEC §86). The two Israelite communities are NOT
  // friends at the start and the chapter does not pretend otherwise — four
  // centuries of schism, and the Jewish courts of Palaestina had their own
  // reasons to keep clear of a rising that would be blamed on them. The
  // affinity has to be earned by the card that earns it.
  affinities: [['BYZ', 'GHA']],

  // The Mount stands bare and the mountain does not (SPEC §32): Zeno's church
  // is on the Gerizim summit and the Keepers are barred from it. Jerusalem's
  // Temple is five centuries gone.
  wonderTweaks: { Jerusalem: null },
  owners: OWNERS,
  religions: RELIGIONS,

  // Whose church is it (SPEC §104). The empire's suspicion runs the other way
  // here from 614: it is the ruling faith that is the foreign patron's, and the
  // two Israelite faiths that are legislated against. There is no Samaritan
  // emperor anywhere for anyone to suspect them of preferring, which is exactly
  // why the persecution could be so thorough and so cheap.
  foreignPatron: {},

  // What the era asks of you (SPEC §33) — shown in the realm panel.
  objectives: {
    SAM: [
      'Win: still 4+ provinces of the Keepers\' Torah on the map in 614 — the bar no other chapter has to clear.',
      'Win: hold Neapolis, Sebaste and Caesarea Maritima with the mountain cleared — the province is yours.',
      'Lose: the community broken — no province of the Torah left, or the state gone with it.',
    ],
    BYZ: [
      'Win: the rising put down and Samaria quiet — Neapolis held, the mountain garrisoned, by 532.',
      'Win: reach +50 war score against the rising.',
      'Lose: Palaestina Prima lost — Caesarea and Neapolis both out of imperial hands.',
    ],
    // The reckoning of 570 (SPEC §208): the year the eight ships sailed for
    // a broken country. The client contract is dated the way the §185
    // chairs are — alive and seated is the bar, freer and whole is the
    // grade.
    HMY: [
      'Win: be a kingdom in 570 — alive and seated at Zafar when the ships would have come; free of every yoke for the full verdict.',
      'Win: the crown of the covenant — free, the incense country whole, and 70 legitimacy: the Kings of Saba and Dhu Raydan again.',
      'Lose: the country passed from hand to hand — the state dead, or Zafar another\'s at the reckoning.',
    ],
  },

  // The Samaritan quarrel is its own (SPEC §201): Baba Rabba's Council of
  // Seven, three of them laymen, against a priesthood that IS this community's
  // constitution.
  schools: { SAM: 'mountain_and_book' },

  // The court factions (SPEC §34). Three of these are documented institutions
  // and the fourth is a documented position, which is unusual — most chapters
  // have to invent at least one party. The Council of Seven is dated variously
  // to the third or fourth century and the sources disagree; the chapter takes
  // no position on the date and uses the institution.
  factions: {
    SAM: [
      {
        id: 'priesthood', name: 'The High Priesthood',
        desc: 'The Eleazarite line — Aaron through Phinehas — keepers of the scroll and the calendar. '
          + 'They will bless a rising. They will not anoint a king.',
        drift(ctx, t) {
          try {
            const crowned = !!(ctx.game.flags && ctx.game.flags.kingAtNeapolis);
            return crowned ? -0.55 : ((t.legitimacy || 0) >= 50 ? 0.4 : -0.25);
          } catch (e) { return 0; }
        },
        boon: { name: 'The Scroll and the Calendar', text: '+0.35 legitimacy a month', effects: { legitimacyAdd: 0.35 } },
        bane: { name: 'The Priests Withdraw', text: '−1 unrest becomes +1.25 everywhere', effects: { unrestAll: 1.25 } },
        appease: { label: 'Provision the courses (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Priesthood Asks Who Anointed Him',
          text: 'The line from Phinehas has kept this people\'s calendar through Assyria, Persia, '
            + 'Alexander, Rome and the churches, and it has never once anointed a king, because '
            + 'there is no king in the Torah it keeps. The High Priest is not asking the crown to '
            + 'abdicate. He is asking it to say, in writing, what it thinks he is.',
          grant: { label: 'The priesthood is the office; the crown serves it', cost: { gov: 50 } },
          refuse: { label: 'The people crowned him', tooltip: 'The calendar is still theirs to keep.' },
        },
      },
      {
        id: 'council', name: 'The Council of Seven',
        desc: 'Three priests and four laymen — the constitutional party, and the only institution '
          + 'here that has ever governed anything.',
        drift(ctx, t) { return (t.stability || 0) >= 0 ? 0.35 : -0.45; },
        boon: { name: 'The Seven Sit', text: '+8% income, −0.5 unrest everywhere', effects: { incomeMult: 1.08, unrestAll: -0.5 } },
        bane: { name: 'The Seven Rise', text: '−8% income', effects: { incomeMult: 0.92 } },
        appease: { label: 'Refer it to the Seven (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'The Seven Ask to Be Consulted',
          text: 'They point out, without heat, that the villages are administered by them, the tithes '
            + 'are assessed by them and the disputes are heard by them, and that a war fought over '
            + 'their heads is still fought out of their granaries. They are not opposing the war. '
            + 'They are opposing being told about it afterwards.',
          grant: { label: 'Nothing without the Seven', cost: { infl: 50 } },
          refuse: { label: 'A war is not a committee', tooltip: 'The granaries are still theirs to open.' },
        },
      },
      {
        id: 'crowned', name: 'The Crowned Party',
        desc: 'Julianus ben Sabar\'s men. They have a king, they held races to prove it, and they '
          + 'executed a charioteer for winning.',
        drift(ctx, t) {
          const g = ctx.game;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.5 : -0.5;
        },
        boon: { name: 'A King in Israel', text: '+8% morale', effects: { moraleMult: 1.08 } },
        bane: { name: 'The Crown Doubted', text: '−12% reinforcement', effects: { reinforceMult: 0.88 } },
        appease: { label: 'The king\'s state (40 martial points)', cost: { mar: 40 } },
        demand: {
          title: 'The Crown Wants to Look Like One',
          text: 'A king who cannot pay a guard, mint a coin or hold a games is a man in a diadem, and '
            + 'the men who put the diadem on him know exactly how thin the difference is. They want '
            + 'the difference closed while there is still a treasury to close it with.',
          grant: { label: 'Guard, mint and games', cost: { mar: 50 } },
          refuse: { label: 'The diadem is enough', tooltip: 'Everyone can see how thin it is.' },
        },
      },
      {
        id: 'quietists', name: 'The Quietists',
        desc: 'Survive by submission. Not a strawman: the community\'s own chronicles are ambivalent '
          + 'about the men who led the risings, and Arsenius — a rich Samaritan who converted and '
          + 'became a favourite at Justinian\'s court — is what this position looks like when it wins.',
        drift(ctx, t) {
          const g = ctx.game;
          const atWar = (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
          return atWar ? -0.5 : 0.45;
        },
        boon: { name: 'The Quiet Villages', text: '−1 unrest everywhere, +6% income', effects: { unrestAll: -1, incomeMult: 1.06 } },
        bane: { name: 'The Villages Bargain Alone', text: '−10% manpower', effects: { manpowerMult: 0.9 } },
        appease: { label: 'Send the embassy (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'The Quietists Ask What the Rising Is For',
          text: 'They have done the arithmetic and they would like it read aloud: the empire has '
            + 'Egypt, Anatolia, Africa and a field army, and the Keepers have four hills. Every '
            + 'rising in living memory has ended with fewer of us than it began with. They are not '
            + 'asking to be loved. They are asking whether anyone has a plan that ends with a people.',
          grant: { label: 'Open a channel to Caesarea', cost: { infl: 50 } },
          refuse: { label: 'There is a plan and it is the mountain', tooltip: 'They do the arithmetic again.' },
        },
      },
    ],
    BYZ: [
      {
        id: 'church', name: 'The Church',
        desc: 'The bishops of Palaestina and the monasteries of the Judaean desert — Sabas himself '
          + 'went to Constantinople to ask for this legislation.',
        drift(ctx, t) { return (t.stability || 0) >= 1 ? 0.4 : -0.4; },
        boon: { name: 'The Bishops Content', text: '+0.3 legitimacy a month', effects: { legitimacyAdd: 0.3 } },
        bane: { name: 'The Bishops Petition', text: '−7% income', effects: { incomeMult: 0.93 } },
        appease: { label: 'Endow the churches (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Church Asks for the Law to Be Enforced',
          text: 'The statutes are on the books and the bishops would like to know when the '
            + 'praetorian prefect intends to notice. It is not enough, they explain, for the '
            + 'synagogues to be illegal. They must be gone.',
          grant: { label: 'The law enforced to the letter', cost: { gov: 50 } },
          refuse: { label: 'The province must also be governed', tooltip: 'The petitions go over your head.' },
        },
      },
      {
        id: 'landowners', name: 'The Landowners',
        desc: 'The men who own Samaria and do not farm it. The Keepers work those fields, and a '
          + 'confiscated tenant is a tenant who is not paying rent.',
        drift(ctx, t) { return (t.treasury || 0) > 0 ? 0.35 : -0.4; },
        boon: { name: 'The Rents Come In', text: '+9% income', effects: { incomeMult: 1.09 } },
        bane: { name: 'The Estates Go Untilled', text: '−9% income', effects: { incomeMult: 0.91 } },
        appease: { label: 'Remit the assessment (80 talents)', cost: { treasury: 80 } },
        demand: {
          title: 'The Landowners Would Like Their Tenants Back',
          text: 'They are entirely orthodox and entirely uninterested in theology. The estates of '
            + 'Samaria are worked by people the law has just told they may not inherit, and the '
            + 'landowners have noticed that a man with nothing to leave his sons has no reason to '
            + 'bring in a harvest for somebody else.',
          grant: { label: 'The law bends where the rents are', cost: { treasury: 150 } },
          refuse: { label: 'The law is the law', tooltip: 'The estates go untilled and they say so in Constantinople.' },
        },
      },
      {
        id: 'army', name: 'The Army of the East',
        desc: 'The dux Palaestinae and his garrisons, with a Persian war one bad year away.',
        drift(ctx, t) {
          const g = ctx.game;
          if ((t.treasury || 0) < 0) return -0.6;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.35 : -0.2;
        },
        boon: { name: 'The Duces Supplied', text: '+4% discipline', effects: { disciplineMult: 1.04 } },
        bane: { name: 'Two Fronts, One Purse', text: '−6% morale', effects: { moraleMult: 0.94 } },
        appease: { label: 'The donative (100 talents)', cost: { treasury: 100 } },
        demand: {
          title: 'The Army Points East',
          text: 'The dux would like it recorded that Palaestina is a police problem and Persia is a '
            + 'war, that the field army cannot be in both places, and that whoever decided to open '
            + 'a religious front in the year the Persian truce expires is welcome to explain the '
            + 'decision to the men holding Dara.',
          grant: { label: 'Reinforce the East', cost: { treasury: 140 } },
          refuse: { label: 'Samaria first', tooltip: 'The dux records the decision.' },
        },
      },
    ],
    // The court at Zafar (SPEC §208). Every party here is documented: the
    // garrison Procopius says Kaleb left (and names the man it will follow
    // instead), the Yazanid house that will produce Sayf son of Dhi Yazan,
    // the qayls whose castles the royal inscriptions count allegiance by,
    // and the merchant houses of the harbors the Periplus priced. What no
    // party can say out loud — and every one is arranged around — is that
    // the crown itself is the conquest's.
    HMY: [
      {
        id: 'negus_men', name: 'The Negus\' Men',
        desc: 'The Aksumite garrison at Zafar and the church the conquest built there. They '
          + 'crowned this king, they can uncrown him, and Procopius already knows the name of '
          + 'the soldier they will follow when they stop taking orders from across the strait.',
        drift(ctx, t) {
          const g = ctx.game;
          const lordAlive = !!(t.overlord && g.tags[t.overlord] && g.tags[t.overlord].alive);
          if ((t.atWarWith || []).some((e) => e === 'AXM' || e === t.overlord)) return -0.7;
          return lordAlive ? 0.35 : -0.4;
        },
        boon: { name: 'The Strait Held Open', text: '+12% reinforcement — the negus\' spears are a crossing away', effects: { reinforceMult: 1.12 } },
        bane: { name: 'The Garrison\'s Own Judgment', text: '−8% morale — soldiers who answer elsewhere, or nowhere', effects: { moraleMult: 0.92 } },
        appease: { label: 'The garrison\'s donative (80 talents)', cost: { treasury: 80 } },
        demand: {
          title: 'The Garrison Asks for Its Arrears',
          text: 'The men who broke Yusuf\'s army have been paid in promises since the fleet went '
            + 'home, and they have noticed that the customs of Aden do not cross the strait '
            + 'either. They are not threatening anybody. They are observing, in formation, that '
            + 'a garrison is loyal to whoever pays it, and that at present nobody does.',
          grant: { label: 'The arrears in full', cost: { treasury: 120 } },
          refuse: { label: 'The negus\' men are the negus\' bill', tooltip: 'They begin to consider whose men they are.' },
        },
      },
      {
        id: 'yazanids', name: 'The House of Yazan',
        desc: 'The old nobility of the covenant — the line that fought for Yusuf at the strait '
          + 'and buried him in it. They keep the Law, the genealogies, and a precise account '
          + 'of what the crown owes the God of Israel. Their grandsons will fetch a fleet.',
        drift(ctx, t) {
          const free = !t.overlord;
          return (free ? 0.4 : -0.35) + ((t.legitimacy || 0) >= 60 ? 0.15 : 0);
        },
        boon: { name: 'The Old Line Blesses', text: '+0.3 legitimacy a month', effects: { legitimacyAdd: 0.3 } },
        bane: { name: 'The Highlands Remember Yusuf', text: '−12% manpower — the covenant\'s villages stay home', effects: { manpowerMult: 0.88 } },
        appease: { label: 'Honor the martyrs of the strait (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'The House Asks Whose Crown This Is',
          text: 'They do not dispute that the king is king; the negus settled that argument with '
            + 'a fleet. They ask a smaller question, in writing, with the genealogies attached: '
            + 'whether the crown of Saba and Dhu Raydan still answers to the God whose name is '
            + 'on every royal inscription for a hundred and fifty years, or to the one the '
            + 'garrison\'s church was built for. They are prepared to wait one generation for '
            + 'the answer. Not two.',
          grant: { label: 'The covenant is the crown\'s', cost: { gov: 50 } },
          refuse: { label: 'The crown answers the age it lives in', tooltip: 'The genealogies are put away. Not burned.' },
        },
      },
      {
        id: 'qayls', name: 'The Qayls of the Mist',
        desc: 'The lords of the highland castles — the misty heights the war songs name. Their '
          + 'levies are the only army this country has ever actually fielded, and their '
          + 'allegiance is a rent the crown pays yearly, in spoil or in respect.',
        drift(ctx, t) {
          const g = ctx.game;
          const atWar = (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
          return ((t.treasury || 0) > 0 ? 0.25 : -0.45) + (atWar ? 0.2 : -0.1);
        },
        boon: { name: 'The Spears Come Down', text: '+8% morale', effects: { moraleMult: 1.08 } },
        bane: { name: 'The Castles Shut Their Gates', text: '−12% manpower', effects: { manpowerMult: 0.88 } },
        appease: { label: 'The crown\'s respect, in kind (40 martial points)', cost: { mar: 40 } },
        demand: {
          title: 'The Qayls Ask for the Share',
          text: 'The castles put four thousand men at the strait for Yusuf and got back a foreign '
            + 'king and a tribute assessment. They are not sentimental about which God the crown '
            + 'keeps — several keep two themselves — but they are exact about the share of every '
            + 'customs season, and the share has been crossing the water. They would like it to '
            + 'stop crossing.',
          grant: { label: 'The share stays in the hills', cost: { treasury: 100 } },
          refuse: { label: 'The assessment stands', tooltip: 'The gates are counted again, from outside.' },
        },
      },
      {
        id: 'incense_houses', name: 'The Houses of the Incense Sea',
        desc: 'The merchant houses of Aden and Mawza and the caravan masters of the inland road: '
          + 'the monsoon, the customs, and a professional indifference to theology. Every '
          + 'empire that has ever wanted this country wanted it for their ledgers.',
        drift(ctx, t) {
          const g = ctx.game;
          const atWar = (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
          return (atWar ? -0.45 : 0.3) + ((t.treasury || 0) > 0 ? 0.15 : -0.25);
        },
        boon: { name: 'The Monsoon Kept', text: '+9% income', effects: { incomeMult: 1.09 } },
        bane: { name: 'The Roads Go North by Land', text: '−9% income', effects: { incomeMult: 0.91 } },
        appease: { label: 'Remit the harbor dues (80 talents)', cost: { treasury: 80 } },
        demand: {
          title: 'The Houses Ask for a Quiet Sea',
          text: 'They have traded under the Jewish kings, the negus\' viceroy, and whatever is '
            + 'coming next, and they can price each regime to the talent: what ruins them is '
            + 'not any of these but a season when the strait is a war. They are asking the '
            + 'crown to buy the peace of the water, from whoever is selling it this year.',
          grant: { label: 'Buy the peace of the strait', cost: { infl: 50 } },
          refuse: { label: 'The sea is not for sale', tooltip: 'The houses begin pricing the next regime.' },
        },
      },
    ],
  },

  playableTags: [
    {
      tag: 'SAM',
      difficulty: 'Very Hard',
      blurb: 'Four landlocked hill provinces against the Roman Empire in the year it '
        + 'legislated you out of owning your own fields. Your mountain is five miles away, '
        + 'garrisoned, with a church on it. Your co-religionists number in the hundreds of '
        + 'thousands and every rising has made that number smaller. Nobody is coming. Win '
        + 'here and the bar is not a border — it is whether there are any of you left.',
    },
    // The second chair (SPEC §208), on the §185 rule: every seated Jewish
    // court is on offer, and this chapter now seats one — the kingdom whose
    // royal house took the God of Israel a century before Kaleb crossed to
    // break it. The Keepers' chapter stays the Keepers'; this is the same
    // sixth century heard from the far end of the map's one sea.
    {
      tag: 'HMY',
      difficulty: 'Hard',
      blurb: 'Four years ago the negus broke your king at the strait and crowned a client '
        + 'in his place. You are the client: a Christian crown on a Jewish country, an '
        + 'Aksumite garrison in your capital that Procopius already knows will mutiny, a '
        + 'tribute crossing the water, and a house in the highlands keeping the genealogies '
        + 'until the crown remembers whose it is. In 570 the eight ships come for a broken '
        + 'country. Be a kingdom instead.',
    },
  ],
  // The empire is NOT playable, and that is the house rule rather than an
  // omission: every chapter in this game is played from an Israelite side, and
  // 614 keeps a full Byzantine court — factions, objectives, a victory branch —
  // without ever offering the chair. This chapter does the same. The imperial
  // half below exists because the AI needs politics and because the chapter's
  // terms card has to be addressed to somebody, not because Constantinople is
  // a seat on offer.


  // Pre-existing works (SPEC §58).
  buildings: {
    'Caesarea Maritima': ['market'],   // the provincial capital's customs house
    'Byzantion': ['shipyard', 'market'],
    'Alexandria': ['shipyard', 'granary'],
    'Neapolis': ['walls'],             // the town below the mountain, such as its walls are
  },

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

    if (g.tags.RSH) g.tags.RSH.alive = false;

    // The phylarchate answers Constantinople — and in this chapter it is the
    // instrument, not the background.
    if (g.tags.GHA) g.tags.GHA.overlord = 'BYZ';

    // The client kingdom answers Aksum (SPEC §208): Procopius I.20 — Kaleb
    // set Sumyafa Ashwa over the Himyarites, took his tribute, and sailed
    // home. The yoke is the chapter's opening fact in the south the way the
    // statutes are in the north; what the player does about it is the game.
    if (g.tags.HMY) g.tags.HMY.overlord = 'AXM';

    // The rising. It is a war from the first month because the legislation is
    // already law: this chapter does not open with a decision to revolt, it
    // opens with a decision about what kind of revolt it is.
    h.declareWar(ctx, 'SAM', 'BYZ', 'The Rising of the Keepers');
    try {
      const w = findWar(g, 'SAM', 'BYZ');
      if (w) {
        w.independenceSide = 'att'; // winning free is not conquest (SPEC §174)
        const byzSide = (w.attackers || []).indexOf('BYZ') !== -1 ? w.attackers : w.defenders;
        if (byzSide.indexOf('GHA') === -1) byzSide.push('GHA');
        if (w.warscore && w.warscore.SAM === undefined) w.warscore.SAM = 0;
      }
      const sam = g.tags.SAM, gha = g.tags.GHA;
      if (sam && gha) {
        if (sam.atWarWith.indexOf('GHA') === -1) sam.atWarWith.push('GHA');
        if (gha.atWarWith.indexOf('SAM') === -1) gha.atWarWith.push('SAM');
      }
    } catch (e) { warnOnce('setup:war', e); }

    // --- Treasuries, manpower, stability. ---
    // A hill people with olive oil and no port. The empire is rich and busy.
    h.adjust(ctx, 'SAM', { treasury: 40, manpower: 9000, stability: 1, legitimacy: 45 });
    h.adjust(ctx, 'BYZ', { treasury: 600, manpower: 30000, stability: 2, legitimacy: 65 });
    // A community, not a court (SPEC §162): no treasury and no standing army
    // until the Caesarea rising gives it a state to keep them in. The manpower
    // is the men the academy towns could actually put in a street in 556.
    h.adjust(ctx, 'JUD', { manpower: 4000, stability: 1, legitimacy: 40 });
    h.adjust(ctx, 'SAS', { treasury: 400, manpower: 22000, stability: 1, legitimacy: 60 });
    h.adjust(ctx, 'GHA', { treasury: 60, manpower: 5000 });
    // The south (SPEC §208): the incense customs are real money and the
    // crown's title to them is not — a client king with a full strongbox
    // and 35 legitimacy is the entire situation in one line (the deltas
    // ride the engine's base 50: −15 seats the crown at 35, where the
    // covenant mission's bar of 70 is a reign's work away). Aksum is four
    // years into digesting a conquest across a sea.
    h.adjust(ctx, 'HMY', { treasury: 120, manpower: 7000, stability: 0, legitimacy: -15 });
    h.adjust(ctx, 'AXM', { treasury: 250, manpower: 14000, stability: 1, legitimacy: 15 });

    // --- Opinions. Four centuries of schism, and one empire. ---
    setOpinion(g, 'SAM', 'BYZ', -190); setOpinion(g, 'BYZ', 'SAM', -160);
    setOpinion(g, 'SAM', 'GHA', -120); setOpinion(g, 'GHA', 'SAM', -100);
    // The two Israelite communities: not enemies, not friends, and watching.
    setOpinion(g, 'SAM', 'JUD', -40);  setOpinion(g, 'JUD', 'SAM', -55);
    setOpinion(g, 'JUD', 'BYZ', -90);  setOpinion(g, 'BYZ', 'JUD', -70);
    setOpinion(g, 'BYZ', 'SAS', -120); setOpinion(g, 'SAS', 'BYZ', -120);
    setOpinion(g, 'GHA', 'BYZ', 70);   setOpinion(g, 'BYZ', 'GHA', 60);
    // The south (SPEC §208). The client resents the yoke short of the −75
    // that fires an AI independence war on its own — the breaking of the
    // bond belongs to Abraha's card and to the player. Justinian courts the
    // whole Red Sea against Persia (the Julianus embassy is two years out);
    // Persia files the incense country under "eventually". And the two
    // communities of the one God write to each other: the priests the
    // hagiographers put at Najran came from Tiberias.
    setOpinion(g, 'HMY', 'AXM', -70);  setOpinion(g, 'AXM', 'HMY', -20);
    setOpinion(g, 'HMY', 'BYZ', 20);   setOpinion(g, 'BYZ', 'HMY', 30);
    setOpinion(g, 'HMY', 'SAS', -20);  setOpinion(g, 'SAS', 'HMY', -10);
    setOpinion(g, 'JUD', 'HMY', 40);   setOpinion(g, 'HMY', 'JUD', 40);

    // --- Starting modifiers. ---
    // The statutes are the enemy's opening move and they are already in force
    // (SPEC §136): this is the one chapter that opens with a law rather than
    // an army, and the law is worse than the army.
    h.addTagModifier(ctx, 'SAM', {
      id: 'the_statutes', name: 'The Statutes of Justinian', months: -1,
      effects: { incomeMult: 0.75, unrestAll: 1.5 },
    });
    h.addTagModifier(ctx, 'SAM', {
      id: 'the_hills_are_ours', name: 'The Hills Are Ours', months: 36,
      effects: { hillDefBonus: 1, moraleMult: 1.06 },
    });
    // Justinian's reign is two years old, the codification is running, Africa
    // is being planned, and the Persian truce is not going to hold.
    h.addTagModifier(ctx, 'BYZ', {
      id: 'the_great_projects', name: 'The Great Projects', months: 60,
      effects: { incomeMult: 0.92, adminMult: 1.15 },
    });
    // The south's opening wound (SPEC §208): the war of 525 took the army
    // that lost it, and the men who would have remustered it are dead at
    // the strait or gone up to the castles. Five years of thin levies, and
    // the trade the monsoon never stopped paying underneath.
    h.addTagModifier(ctx, 'HMY', {
      id: 'the_year_of_the_strait', name: 'The Year of the Strait', months: 60,
      effects: { manpowerMult: 0.85, unrestAll: 0.5 },
    });
    h.addTagModifier(ctx, 'HMY', {
      id: 'the_monsoon_ledger', name: 'The Monsoon Ledger', months: -1,
      effects: { tradeMult: 1.05 },
    });
    // Kaleb's Aksum at its commercial peak: Kosmas Indicopleustes sailed
    // these waters the very year of the crossing and describes the Adulis
    // trade himself — ivory, the gold of Sasu, emeralds for India. Four
    // highland cells understate the customs house; this carries it.
    h.addTagModifier(ctx, 'AXM', {
      id: 'the_trade_of_adulis', name: 'The Trade of Adulis', months: -1,
      effects: { incomeMult: 1.25 },
    });

    // --- Starting armies. ---
    // The rising: the villages, and the king's own men at Neapolis.
    h.spawnArmy(ctx, 'SAM', 'Neapolis', {
      inf: 6, name: 'The King\'s Men',
      general: { name: 'Julianus ben Sabar', fire: 1, shock: 3, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'SAM', 'Jenin', { inf: 3, name: 'The Villages of the North' });

    // The empire: the provincial garrisons, then Theodorus, then the phylarch.
    h.spawnArmy(ctx, 'BYZ', 'Caesarea Maritima', {
      inf: 5, cav: 1, name: 'Palaestina Field Force',
      general: { name: 'Theodorus', fire: 2, shock: 2, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'BYZ', 'Sebaste', { inf: 2, name: 'Garrison of Sebaste' });
    h.spawnArmy(ctx, 'BYZ', 'Scythopolis', { inf: 3, name: 'Garrison of Palaestina Secunda' });
    h.spawnArmy(ctx, 'BYZ', 'Antioch', {
      inf: 9, cav: 3, name: 'Army of the East',
      general: { name: 'Belisarius', fire: 3, shock: 3, maneuver: 4 },
    });
    h.spawnArmy(ctx, 'GHA', 'Bostra', {
      inf: 2, cav: 5, name: 'The Phylarch\'s Riders',
      general: { name: 'al-Harith ibn Jabalah', fire: 2, shock: 3, maneuver: 4 },
    });
    h.spawnArmy(ctx, 'SAS', 'Nisibis', { inf: 8, cav: 4, name: 'The Marzban\'s Host' });
    // The south (SPEC §208): the client crown's own companies at the
    // capital, the qayls' levies at the dam — and across the strait, in the
    // negus' own port, the army of the conquest with its future mutineer
    // already named. Procopius calls Abraha a slave-born man of business;
    // the bookmark's rulers table has been calling him "waiting in the same
    // army" since §205, and here is the army.
    h.spawnArmy(ctx, 'HMY', 'Zafar', {
      inf: 3, name: 'The King\'s Companies',
      general: { name: 'Sumyafa Ashwa', fire: 1, shock: 2, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'HMY', 'Marib', { inf: 2, name: 'The Qayls\' Levies' });
    h.spawnArmy(ctx, 'AXM', 'Adulis', {
      inf: 2, cav: 1, name: 'The Army of the Crossing',
      general: { name: 'Abraha', fire: 2, shock: 3, maneuver: 3 },
    });
    // No Watch of Tiberias: there is no state here to raise one (SPEC §162).
    // The Galilee's two regiments are spawned by the rising that creates it.

    h.notify(ctx, {
      title: 'The Keepers',
      text: 'The synagogues are ordered down, the fields may not be inherited, and there is a '
        + 'church on the mountain. In Neapolis they are talking about a king.',
      type: 'war', provName: 'Neapolis',
    });
  },

  // Courts of the spring of 529.
  rulers: {
    SAM: {
      name: 'Julianus ben Sabar', title: 'King of the Keepers',
      gov: 2, infl: 3, mar: 3, age: 44,
    },
    BYZ: { name: 'Justinian', title: 'Augustus', gov: 5, infl: 4, mar: 2, age: 46 },
    JUD: { name: 'Mar Zutra', title: 'Head of the Academy', gov: 3, infl: 3, mar: 1, age: 51 },
    GHA: { name: 'al-Harith ibn Jabalah', title: 'Phylarch', gov: 2, infl: 3, mar: 4, age: 40 },
    SAS: { name: 'Kavad I', title: 'King of Kings', gov: 3, infl: 3, mar: 3, age: 56 },
    // The political west (SPEC §173), Procopius' cast list: a child on
    // Theodoric's throne with his mother actually governing; the mild Vandal
    // whose deposition next year is Justinian's casus belli; the last
    // Burgundian king; the last free Visigoth of the Balti line; the four
    // sons of Clovis, eldest named.
    OST: { name: 'Athalaric', title: 'King of the Goths and Romans', gov: 1, infl: 1, mar: 0, age: 13 },
    VAN: { name: 'Hilderic', title: 'King of the Vandals and Alans', gov: 2, infl: 2, mar: 1, age: 68,
      heir: { name: 'Gelimer', gov: 2, infl: 1, mar: 3, age: 45 } },
    VIS: { name: 'Amalaric', title: 'King', gov: 1, infl: 2, mar: 2, age: 27 },
    FRK: { name: 'Theuderic I', title: 'King of the Franks', gov: 3, infl: 3, mar: 4, age: 44 },
    BGD: { name: 'Godomar II', title: 'King', gov: 2, infl: 2, mar: 2, age: 45 },
    LMB: { name: 'Wacho', title: 'King', gov: 2, infl: 3, mar: 3, age: 40 },
    MAU: { name: 'Masuna', title: 'King of the Moors and Romans', gov: 3, infl: 2, mar: 3, age: 50 },
    // The political east and south (SPEC §205, §208): the negus who crossed
    // the strait four years ago — his title is the claim, the client court
    // below is the arithmetic — and Abraha, who will depose that client,
    // waiting in the same army (see setup: the Army of the Crossing).
    AXM: { name: 'Kaleb', title: 'Negus of Aksum and Himyar', gov: 3, infl: 3, mar: 4, age: 45,
      heir: { name: 'Wa\'zeb', gov: 2, infl: 2, mar: 2, age: 20 } },
    // Procopius' Esimiphaios: a Himyarite noble who took the conquest's
    // faith and the conquest's crown, and governs a country that kept the
    // other one. The heir carries a royal name of the old style — the house
    // has more genealogy than power, which is the whole court in one line.
    HMY: { name: 'Sumyafa Ashwa', title: 'King of Himyar', gov: 3, infl: 2, mar: 2, age: 50,
      heir: { name: 'Ma\'dikarib', gov: 2, infl: 2, mar: 3, age: 24 } },
  },

  missions: {
    SAM: [
      {
        id: 's_sebaste', name: 'The Knife in the Middle',
        icon: 'flame', col: 0,
        desc: 'Take Sebaste — Herod\'s Greek foundation, five miles from Neapolis, garrisoned.',
        rewardText: '+15 legitimacy, +20 martial points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'SAM', 'Sebaste'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'SAM', { legitimacy: 15, mar: 20 }),
      },
      {
        id: 's_host', name: 'The Men of the Hills',
        icon: 'spears', col: 2,
        desc: 'Field eight thousand men — a rising that cannot hold a line is a riot.',
        rewardText: '"The Villages Muster": +10% manpower for 24 months.',
        check: (ctx) => totalMen(ctx, 'SAM') >= 8000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'SAM', {
          id: 'villages_muster', name: 'The Villages Muster', months: 24,
          effects: { manpowerMult: 1.1 },
        }),
      },
      {
        id: 's_caesarea', name: 'The Provincial Capital',
        icon: 'ship', col: 1, requires: ['s_sebaste', 's_host'],
        desc: 'Take Caesarea Maritima — the seat of the dux, the port, and the quarter '
          + 'where both risings actually began.',
        rewardText: '+120 talents and the customs house.',
        check: (ctx) => ctx.helpers.controls(ctx, 'SAM', 'Caesarea Maritima'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'SAM', { treasury: 120, gov: 20 }),
      },
      {
        id: 's_endure', name: 'A People, Not an Episode',
        icon: 'lamp', col: 1, requires: ['s_caesarea'],
        desc: 'Reach 560 with six provinces of the Keepers\' Torah still on the map.',
        rewardText: '"The Keepers Keep": +0.3 legitimacy a month, permanently.',
        check: (ctx) => dateGE(ctx.game.date, 560, 1) && keeperProvinces(ctx) >= 6,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'SAM', {
          id: 'the_keepers_keep', name: 'The Keepers Keep', months: -1,
          effects: { legitimacyAdd: 0.3 },
        }),
      },
      // The age's curriculum (SPEC §179): a rising that means to outlive its
      // first summer arms itself from the dux's arsenals and writes a book
      // of its own.
      {
        id: 's_captured_arsenals', name: 'The Captured Arsenals',
        icon: 'swords', col: 0, requires: ['s_sebaste'],
        desc: 'Arm the villages with the garrisons\' own steel: reach Military 11 — The Captured Arsenals.',
        rewardText: '"Arms of the Garrisons": +5% army strength for 24 months.',
        check: (ctx) => (((ctx.game.tags.SAM || {}).tech || {}).mar | 0) >= 11,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'SAM', {
          id: 'arms_of_garrisons', name: 'Arms of the Garrisons', months: 24, effects: { milPowerMult: 1.05 },
        }),
      },
      {
        id: 's_kingdoms_book', name: 'The Kingdom\'s Book',
        icon: 'scroll', col: 2, requires: ['s_host'],
        desc: 'Take up three ideas of the age — five books and one mountain must become a state.',
        rewardText: '+25 governance points, +10 legitimacy.',
        check: (ctx) => eraTiers(ctx.game.tags.SAM) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'SAM', { gov: 25, legitimacy: 10 }),
      },
      // Past the hill country (SPEC §187): what a rising that survives its
      // first empire actually marches on — the seat of Palaestina Secunda,
      // and the coast road north of the port.
      {
        id: 's_second_palaestina', name: 'The Second Palaestina',
        icon: 'swords', col: 0, row: 2, requires: ['s_captured_arsenals'],
        desc: 'Take Scythopolis and Pella — the seat of Palaestina Secunda and its bridge '
          + 'over the river: the province the empire governs the north from.',
        rewardText: '+100 talents (the provincial treasury), +15 martial points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'SAM', 'Scythopolis')
          && ctx.helpers.controls(ctx, 'SAM', 'Pella'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'SAM', { treasury: 100, mar: 15 }),
      },
      {
        id: 's_coast_road', name: 'The Coast Between',
        icon: 'market', col: 1, row: 3, requires: ['s_caesarea'],
        desc: 'Take Dora and Ptolemais — the coast road north of the port, so the empire\'s '
          + 'answer must come by sea or through the passes, and not along the shore.',
        rewardText: '"The Shore Watched": +6% income, permanently.',
        check: (ctx) => ctx.helpers.controls(ctx, 'SAM', 'Dora')
          && ctx.helpers.controls(ctx, 'SAM', 'Ptolemais'),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'SAM', {
          id: 'the_shore_watched', name: 'The Shore Watched', months: -1,
          effects: { incomeMult: 1.06 },
        }),
      },
      // ── The mountain kingdom (SPEC §197) ────────────────────────────────
      // The Keepers' chapter runs to 614. These are what a rising that does
      // not die in its second year has to become: a treasury, a frontier, a
      // priesthood and a people the next century still has to count.
      {
        id: 's_the_treasury', name: 'The Treasury of the Mountain',
        icon: 'coins', col: 1, row: 0, requires: [],
        desc: 'The hill country grows olives and grain and pays its taxes to a capital that '
          + 'legislates against it. Stop remitting and start banking: 200 talents in the '
          + 'mountain\'s own hands.',
        rewardText: '"The Tithe Kept Home": +10% income permanently.',
        check: (ctx) => ((ctx.game.tags.SAM || {}).treasury || 0) >= 200,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'SAM', {
          id: 'the_tithe_kept_home', name: 'The Tithe Kept Home', months: -1, effects: { incomeMult: 1.1 },
        }),
      },
      {
        id: 's_the_high_priest', name: 'The High Priest of Gerizim',
        icon: 'altar', col: 2, row: 2, requires: ['s_kingdoms_book'],
        desc: 'Justinian\'s statutes barred the synagogues, the inheritances and the offices, '
          + 'and the priesthood on the mountain went on anyway. Reach 75 legitimacy — a '
          + 'crown the priesthood has publicly anointed.',
        rewardText: '"Anointed on the Mountain": +0.25 legitimacy a month, −0.5 unrest everywhere, permanent.',
        check: (ctx) => ((ctx.game.tags.SAM || {}).legitimacy || 0) >= 75,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'SAM', {
          id: 'anointed_on_the_mountain', name: 'Anointed on the Mountain', months: -1,
          effects: { legitimacyAdd: 0.25, unrestAll: -0.5 },
        }),
      },
      {
        id: 's_the_lowland_towns', name: 'The Towns Below',
        icon: 'bricks', col: 0, row: 3, requires: ['s_second_palaestina'],
        desc: 'A hill people that never comes down from the hills is a hill people until '
          + 'somebody has the patience to climb. Hold Antipatris and Lydda — the plain that '
          + 'feeds the mountain and the road that reaches it.',
        rewardText: '+100 talents, +2,000 manpower.',
        check: (ctx) => ['Antipatris', 'Lydda'].every((n) => ctx.helpers.controls(ctx, 'SAM', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'SAM', { treasury: 100, manpower: 2000 }),
      },
      {
        id: 's_the_drilled_host', name: 'The Drilled Host',
        icon: 'helmet', col: 2, row: 3, requires: ['s_the_high_priest'],
        desc: 'Julianus ben Sabar\'s men were farmers with captured arms, and the field army '
          + 'of the East went through them in a season. Reach Military 8 and put fifteen '
          + 'thousand men under the standards.',
        rewardText: '"The Mountain in Arms": +8% discipline and +8% morale, permanent.',
        check: (ctx) => (((ctx.game.tags.SAM || {}).tech || {}).mar | 0) >= 8
          && totalMen(ctx, 'SAM') >= 15000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'SAM', {
          id: 'the_mountain_in_arms', name: 'The Mountain in Arms', months: -1,
          effects: { disciplineMult: 1.08, moraleMult: 1.08 },
        }),
      },
      {
        id: 's_the_jordan_line', name: 'The Line of the Jordan',
        icon: 'walls', col: 0, row: 4, requires: ['s_the_lowland_towns'],
        desc: 'Every army that has ever come for this mountain came down the valley or up the '
          + 'coast road. Hold Scythopolis and Pella and the eastern door is bolted.',
        rewardText: '"The Valley Held": +1 stability, +6% morale permanently.',
        check: (ctx) => ['Scythopolis', 'Pella'].every((n) => ctx.helpers.controls(ctx, 'SAM', n)),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'SAM', {
            id: 'the_valley_held', name: 'The Valley Held', months: -1, effects: { moraleMult: 1.06 },
          });
          ctx.helpers.adjust(ctx, 'SAM', { stability: 1 });
        },
      },
      {
        id: 's_a_people_the_census_counts', name: 'A People the Census Counts',
        icon: 'quill', col: 1, row: 4, requires: ['s_coast_road'],
        desc: 'Procopius says the Samaritans were reduced from a nation to a remnant in this '
          + 'century, and the number he gives is a massacre in arithmetic. Reach +3 stability '
          + 'and 20 provinces: be too large to be a footnote.',
        rewardText: '"Not an Episode": +12% growth and +0.2 legitimacy a month, permanent.',
        check: (ctx) => ((ctx.game.tags.SAM || {}).stability || 0) >= 3
          && ctx.helpers.countControlled(ctx, 'SAM', {}) >= 20,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'SAM', {
          id: 'not_an_episode', name: 'Not an Episode', months: -1,
          effects: { growthMult: 1.12, legitimacyAdd: 0.2 },
        }),
      },
      {
        id: 's_the_statutes_repealed', name: 'The Statutes Repealed',
        icon: 'scales', col: 2, row: 4, requires: ['s_the_drilled_host'],
        desc: 'The disabilities are the reason this rising happened: no synagogue, no '
          + 'inheritance, no office, no testimony. Reach Government 8 — a state that writes '
          + 'its own law is a state whose people can inherit from each other again.',
        rewardText: '"The Law of the Mountain": −1 unrest everywhere and +10% income, permanent.',
        check: (ctx) => (((ctx.game.tags.SAM || {}).tech || {}).gov | 0) >= 8,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'SAM', {
          id: 'the_law_of_the_mountain', name: 'The Law of the Mountain', months: -1,
          effects: { unrestAll: -1, incomeMult: 1.1 },
        }),
      },
      // ── The roads not taken (SPEC §183) ─────────────────────────────────
      // The §119 forks as standing hypotheticals; checks read the markers
      // the fork cards themselves set.
      {
        id: 'hy_gerizim_answered', name: 'The Mountain Answered', hypothetical: true,
        fork: '529ce/the_mountain',
        icon: 'mountain', col: 3, row: 0,
        desc: 'Settle the crown question and keep the rising standing — sovereign, seated at '
          + 'Neapolis — and the commandment on the summit must be answered: the altar over '
          + 'the church, or the villages first.',
        rewardText: '+15 legitimacy, +1 stability.',
        check: (ctx) => anyFlag(ctx, 'gerizimCleared', 'gerizimLeft'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'SAM', { legitimacy: 15, stability: 1 }),
      },
      {
        id: 'hy_ctesiphon_letter', name: 'The Letter to Ctesiphon', hypothetical: true,
        fork: '529ce/ctesiphon',
        icon: 'scroll', col: 3, row: 1,
        desc: 'Outlive the first war (531) with the Keepers\' villages still on the map, and '
          + 'the refugees reach the Persian court with an offer to make — fifty thousand men, '
          + 'the men without the letter, or a disavowal meant to be read by the dux.',
        rewardText: '+25 influence points.',
        check: (ctx) => anyFlag(ctx, 'ctesiphonPromised', 'sentTheYoungMen', 'ctesiphonRefused'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'SAM', { infl: 25 }),
      },
      {
        id: 'hy_taheb', name: 'The Taheb Question', hypothetical: true,
        fork: '529ce/the_taheb',
        icon: 'lamp', col: 3, row: 2,
        desc: 'Keep a community alive past 542 with the phylarch question answered, and a '
          + 'claimant to Deuteronomy 18:18 appears in the villages. Whether the age is the '
          + 'age is not a question a council can table.',
        rewardText: '+20 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'tahebProclaimed', 'tahebAwaited', 'tahebIsThePeople'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'SAM', { legitimacy: 20 }),
      },
    ],
    BYZ: [
      {
        id: 'b_neapolis', name: 'The Town Below the Mountain',
        icon: 'shield', col: 0,
        desc: 'Hold Neapolis — the rising has a capital and it is five miles from your garrison.',
        rewardText: '+15 legitimacy, +20 governance points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'BYZ', 'Neapolis'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'BYZ', { legitimacy: 15, gov: 20 }),
      },
      {
        id: 'b_quiet', name: 'A Quiet Province',
        icon: 'scales', col: 0, requires: ['b_neapolis'],
        desc: 'Hold every one of the four hill provinces at once.',
        rewardText: '+150 talents — the assessment resumes.',
        check: (ctx) => ['Neapolis', 'Jenin', 'Tulkarm', 'Qalqilya']
          .every((n) => ctx.helpers.controls(ctx, 'BYZ', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'BYZ', { treasury: 150 }),
      },
      {
        id: 'b_east', name: 'The War That Matters',
        icon: 'flag', col: 2,
        desc: 'Keep Antioch, Edessa and Amida while Samaria is settled — the Persian truce '
          + 'was never going to hold.',
        rewardText: '"The East Held": +5% discipline for 36 months.',
        check: (ctx) => ['Antioch', 'Edessa', 'Amida']
          .every((n) => ctx.helpers.controls(ctx, 'BYZ', n)),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'BYZ', {
          id: 'the_east_held', name: 'The East Held', months: 36,
          effects: { disciplineMult: 1.05 },
        }),
      },
      // The age's curriculum (SPEC §179): the spring of 529 publishes the
      // Codex — the empire's answer to every rising is more law, better paid.
      {
        id: 'b_codex', name: 'The Codex Published',
        icon: 'scroll', col: 0, requires: ['b_neapolis'],
        desc: 'One law for the whole world: reach Government 12 — The Codex of Laws.',
        rewardText: '"The Codex": −0.5 unrest everywhere for 36 months.',
        check: (ctx) => (((ctx.game.tags.BYZ || {}).tech || {}).gov | 0) >= 12,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'BYZ', {
          id: 'the_codex', name: 'The Codex', months: 36, effects: { unrestAll: -0.5 },
        }),
      },
      {
        id: 'b_emperors_arts', name: 'The Emperor\'s Arts',
        icon: 'scales', col: 2, requires: ['b_east'],
        desc: 'Take up three ideas of the age — Justinian\'s empire governs with every instrument at once.',
        rewardText: '+25 influence points, +10 legitimacy.',
        check: (ctx) => eraTiers(ctx.game.tags.BYZ) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'BYZ', { infl: 25, legitimacy: 10 }),
      },
    ],
    // ── The client's century (SPEC §208) ──────────────────────────────────
    // The arc the sources give the south: an army of its own, the customs
    // banked, the yoke reduced to a word, the dam kept, the martyrs' city
    // quiet, the covenant back in the royal style — and in 570, when the
    // eight ships come for a broken country, a kingdom instead. The grid
    // reads left to right the way the reign would: spears, silver, crown.
    HMY: [
      {
        id: 'h_kings_companies', name: 'The King\'s Own Companies',
        icon: 'spears', col: 0,
        desc: 'The garrison in your capital answers the negus, and shortly nobody. Field six '
          + 'thousand men who answer the crown — a client with an army of its own is a '
          + 'kingdom in waiting.',
        rewardText: '"The Qayls Mustered": +10% manpower for 24 months.',
        check: (ctx) => totalMen(ctx, 'HMY') >= 6000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HMY', {
          id: 'the_qayls_mustered', name: 'The Qayls Mustered', months: 24,
          effects: { manpowerMult: 1.1 },
        }),
      },
      {
        id: 'h_customs_of_the_sea', name: 'The Customs of the Sea',
        icon: 'coins', col: 1,
        desc: 'Every empire that ever wanted this country wanted it for the ledgers of Aden '
          + 'and Mawza. Bank 250 talents the tribute never reaches — the monsoon pays '
          + 'whoever holds the harbors, and the harbors are yours.',
        rewardText: '"The Incense Ledger": +8% income, permanently.',
        check: (ctx) => ((ctx.game.tags[who(ctx, 'HMY')] || {}).treasury || 0) >= 250,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HMY', {
          id: 'the_incense_ledger', name: 'The Incense Ledger', months: -1,
          effects: { incomeMult: 1.08 },
        }),
      },
      {
        // `row: 0` is load-bearing: an undeclared row lands one below the
        // deepest parent (getMissions), which would seat this at 2:1 on top
        // of the covenant mission — smoke126/129 hold the grid.
        id: 'h_tribute_of_one_word', name: 'A Tribute of One Word',
        icon: 'scales', col: 2, row: 0, requires: ['h_kings_companies'],
        desc: 'Procopius\' phrase for how the conquest ends: a tribute agreed by a court '
          + 'strong enough not to pay it, remitted as a word both sides pretend is a fact. '
          + 'Be free of the yoke — by the garrison\'s mutiny, the negus\' distraction, or '
          + 'your own war of independence.',
        rewardText: '+15 legitimacy, +20 influence points.',
        check: (ctx) => {
          const t = ctx.game.tags[who(ctx, 'HMY')];
          return !!(t && t.alive !== false && !t.overlord);
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HMY', { legitimacy: 15, infl: 20 }),
      },
      {
        id: 'h_dam_at_marib', name: 'The Dam at Marib',
        icon: 'bricks', col: 0, row: 1, requires: ['h_kings_companies'],
        desc: 'Not a wall but a system, thirteen hundred years old, which every kingdom of '
          + 'the south has repaired as the price of calling itself one. Hold Marib and '
          + 'reach Government 10 — a crown whose assessors can budget the sluices.',
        rewardText: '"The Sluices Kept": +10% growth permanently — and the dam does not break on your watch.',
        check: (ctx) => ctx.helpers.controls(ctx, 'HMY', 'Marib')
          && ((((ctx.game.tags[who(ctx, 'HMY')] || {}).tech || {}).gov | 0) >= 10),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'HMY', {
            id: 'the_sluices_kept', name: 'The Sluices Kept', months: -1,
            effects: { growthMult: 1.1 },
          });
          // The §206 card reads this: a kingdom that budgets the works is a
          // world where the breach of 575 has nothing to break.
          ctx.helpers.setFlag(ctx, 'himyarDamKept', true);
        },
      },
      {
        id: 'h_peace_of_najran', name: 'The Peace of Najran',
        icon: 'lamp', col: 1, row: 1, requires: ['h_customs_of_the_sea'],
        desc: 'The martyrs\' city is why the negus crossed at all, and it watches every move '
          + 'a crown of the other faith makes. Hold Najran at +2 stability — a kingdom of '
          + 'two faiths that does not do 523 again, in either direction.',
        rewardText: '"The Two Faiths of the South": −0.5 unrest everywhere, permanently.',
        check: (ctx) => ctx.helpers.controls(ctx, 'HMY', 'Najran')
          && ((ctx.game.tags[who(ctx, 'HMY')] || {}).stability || 0) >= 2,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HMY', {
          id: 'the_two_faiths_of_the_south', name: 'The Two Faiths of the South', months: -1,
          effects: { unrestAll: -0.5 },
        }),
      },
      {
        id: 'h_crown_of_the_covenant', name: 'The Crown of the Covenant',
        icon: 'altar', col: 2, row: 1, requires: ['h_tribute_of_one_word'],
        desc: 'For a century and a half the royal style invoked Rahmanan, the Merciful, the '
          + 'Lord of the heavens — the formula of the kings who took the God of Israel. '
          + 'Reach 70 legitimacy: a crown the House of Yazan will write back into the '
          + 'genealogies.',
        rewardText: '"Rahmanan in the Style": +0.25 legitimacy a month, permanently.',
        check: (ctx) => ((ctx.game.tags[who(ctx, 'HMY')] || {}).legitimacy || 0) >= 70,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HMY', {
          id: 'rahmanan_in_the_style', name: 'Rahmanan in the Style', months: -1,
          effects: { legitimacyAdd: 0.25 },
        }),
      },
      {
        id: 'h_other_shore', name: 'The Other Shore of the Gulf',
        icon: 'ship', col: 0, row: 2, requires: ['h_dam_at_marib'],
        desc: 'Mazun — Sasanian Oman — watches the strait of Hormuz the way you watch the '
          + 'Bab al-Mandab, and the King of Kings files the incense country under '
          + '"eventually". Take Omana and Mazun and the file is filed the other way.',
        rewardText: '+100 talents, +15 martial points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'HMY', 'Omana')
          && ctx.helpers.controls(ctx, 'HMY', 'Mazun'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HMY', { treasury: 100, mar: 15 }),
      },
      {
        id: 'h_pretense_kept', name: 'The Pretense Kept',
        icon: 'shield', col: 1, row: 2, requires: ['h_tribute_of_one_word'],
        desc: 'Freedom is a fact the year you take it and a pretense every year after, kept '
          + 'by both courts agreeing not to test it. Reach 545 free, at peace with a '
          + 'living Aksum — the word outlasting the fleet that could dispute it.',
        rewardText: '+1 stability, +15 influence points.',
        check: (ctx) => {
          const g = ctx.game;
          const t = g.tags[who(ctx, 'HMY')];
          const axm = g.tags[who(ctx, 'AXM')];
          if (!t || t.alive === false || t.overlord) return false;
          if (!axm || axm.alive === false) return false;
          if ((t.atWarWith || []).indexOf(who(ctx, 'AXM')) !== -1) return false;
          return dateGE(g.date, 545, 1);
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HMY', { stability: 1, infl: 15 }),
      },
      {
        id: 'h_kingdom_counted', name: 'A Kingdom the Century Counts',
        icon: 'quill', col: 2, row: 2, requires: ['h_crown_of_the_covenant'],
        desc: 'In the history that happened, a prince of this house toured the courts of the '
          + 'north begging a fleet, and got eight ships of convicts because the country was '
          + 'not worth more. Reach 565 free, seated at Zafar, with eight provinces — a '
          + 'country worth too much to hand to eight hundred prisoners.',
        rewardText: '"No Ships From the North": +6% morale and +0.2 legitimacy a month, permanently.',
        check: (ctx) => {
          const t = ctx.game.tags[who(ctx, 'HMY')];
          return !!(t && t.alive !== false && !t.overlord)
            && dateGE(ctx.game.date, 565, 1)
            && ctx.helpers.controls(ctx, 'HMY', 'Zafar')
            && ctx.helpers.countOwned(ctx, 'HMY', {}) >= 8;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HMY', {
          id: 'no_ships_from_the_north', name: 'No Ships From the North', months: -1,
          effects: { moraleMult: 1.06, legitimacyAdd: 0.2 },
        }),
      },
      // The age's curriculum (SPEC §179, §185): the era's named rung and its
      // ideas, same two branches every chair carries.
      {
        id: 'h_drilled_spears', name: 'The Musters of the Mist',
        icon: 'helmet', col: 0, row: 3, requires: ['h_kings_companies'],
        desc: 'The qayls\' levies won the war songs and lost the war. Reach Military 10 — '
          + 'The Hill Musters — and the castles drill to one pattern under the crown\'s '
          + 'own captains.',
        rewardText: '"The Drilled Spears": +5% discipline for 24 months.',
        check: (ctx) => ((((ctx.game.tags[who(ctx, 'HMY')] || {}).tech || {}).mar | 0)) >= 10,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HMY', {
          id: 'the_drilled_spears', name: 'The Drilled Spears', months: 24,
          effects: { disciplineMult: 1.05 },
        }),
      },
      {
        id: 'h_kings_book_south', name: 'The King\'s Book of the South',
        icon: 'scroll', col: 1, row: 3, requires: ['h_customs_of_the_sea'],
        desc: 'A client court that means to outlive its patron studies everything at once: '
          + 'the customs, the castles, the formula of the kings. Take up three ideas of '
          + 'the age.',
        rewardText: '+25 governance points, +10 legitimacy.',
        check: (ctx) => eraTiers(ctx.game.tags[who(ctx, 'HMY')]) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HMY', { gov: 25, legitimacy: 10 }),
      },
      // ── The roads not taken (SPEC §183), the §185 way: no new fork is
      // charted — the south reads the markers the Keepers' own cards set,
      // because the one sea carries the news both directions. ─────────────
      {
        id: 'hy_the_other_mountain', name: 'The Other Mountain Answered', hypothetical: true,
        fork: '529ce/the_mountain',
        icon: 'mountain', col: 3, row: 0,
        desc: 'There is a church on Gerizim\'s summit and a church in Zafar\'s royal quarter, '
          + 'and both were built to say the same thing. If the Keepers answer their mountain '
          + '— either way — the court at Zafar hears that the question CAN be answered.',
        rewardText: '+10 legitimacy, +10 influence points.',
        check: (ctx) => anyFlag(ctx, 'gerizimCleared', 'gerizimLeft')
          && !!(ctx.game.tags[who(ctx, 'HMY')] && ctx.game.tags[who(ctx, 'HMY')].alive !== false),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HMY', { legitimacy: 10, infl: 10 }),
      },
      {
        id: 'hy_the_persian_file', name: 'The Persian File', hypothetical: true,
        fork: '529ce/ctesiphon',
        icon: 'quill', col: 3, row: 1,
        desc: 'If the Keepers\' refugees reach Ctesiphon — whatever they offer, whatever is '
          + 'answered — the chancery that hears them keeps files on every country an empire '
          + 'might want, and the incense country\'s file gets a new page. Forty years early, '
          + 'the south learns what a Persian answer costs.',
        rewardText: '+20 influence points.',
        check: (ctx) => anyFlag(ctx, 'ctesiphonPromised', 'sentTheYoungMen', 'ctesiphonRefused')
          && !!(ctx.game.tags[who(ctx, 'HMY')] && ctx.game.tags[who(ctx, 'HMY')].alive !== false),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HMY', { infl: 20 }),
      },
      {
        id: 'hy_two_houses_heard', name: 'The Two Houses, Heard From the South', hypothetical: true,
        fork: '529ce/the_two_houses',
        icon: 'lamp', col: 4, row: 0,
        desc: 'When Caesarea rises in 556 — together, alone, or held indoors — the synagogues '
          + 'of the south hear it from the pepper merchants inside a season. A kingdom that '
          + 'keeps the covenant learns what the covenant\'s other keepers just paid, and '
          + 'writes to Tiberias accordingly.',
        rewardText: '+10 legitimacy, +10 influence points.',
        check: (ctx) => anyFlag(ctx, 'roseWithTheJews', 'roseAlone', 'quarterKeptShut')
          && !!(ctx.game.tags[who(ctx, 'HMY')] && ctx.game.tags[who(ctx, 'HMY')].alive !== false),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HMY', { legitimacy: 10, infl: 10 }),
      },
    ],
  },

  aiHints: {
    SAM: { rally: ['Neapolis'], targetRegiments: 12 },
    BYZ: { rally: ['Caesarea Maritima', 'Antioch'], targetRegiments: 40 },
    GHA: { rally: ['Bostra'], targetRegiments: 10 },
    SAS: { rally: ['Nisibis'], targetRegiments: 35 },
    JUD: { rally: ['Tiberias'], targetRegiments: 5 },
    // The south (SPEC §208): the client keeps its spears at the capital the
    // garrison also holds; the negus keeps his at the port the crossing
    // sails from. Both targets are sized to the books — the harness bled
    // both courts at higher ones, and a standing army the customs cannot
    // pay is the Abraha story told as a bug instead of a card.
    HMY: { rally: ['Zafar'], targetRegiments: 6 },
    AXM: { rally: ['Adulis', 'Aksum'], targetRegiments: 4 },
    REB: { rally: [], targetRegiments: 0 },
  },

  checkVictory(ctx) {
    try {
      const g = ctx.game;
      const h = ctx.helpers;
      if (!g || g.over || g.result) return;

      const samTag = g.tags && g.tags[who(ctx, 'SAM')];
      const samAlive = !!(samTag && samTag.alive !== false);
      const samProvs = samAlive ? h.countControlled(ctx, 'SAM', {}) : 0;
      const keepers = keeperProvinces(ctx);

      if (g.playerTag === who(ctx, 'SAM')) {
        // The province taken outright: the town, the Greek foundation that
        // watches it, the port that supplies the empire's answer — and the
        // mountain cleared, which is the only one of the four that is about
        // theology rather than logistics.
        if (h.controls(ctx, 'SAM', 'Neapolis') && h.controls(ctx, 'SAM', 'Sebaste')
            && h.controls(ctx, 'SAM', 'Caesarea Maritima')
            && !!h.getFlag(ctx, 'gerizimCleared')) {
          h.endGame(ctx, {
            result: 'win',
            title: 'The Mountain and the Sea',
            text: 'Palaestina Prima answers to Neapolis. The church on the summit is down, '
              + 'the altar is where the Torah says to build it, and the port that would '
              + 'have landed the army that ended this is unloading grain for the people it '
              + 'was sent to break. No Samaritan state has existed since Alexander. One '
              + 'does now, and it is not asking Jerusalem\'s opinion.',
            score: 200,
          });
          return;
        }
        // The bar no other chapter has to clear (SPEC §136). Every other
        // bookmark asks whether a state survives. This one asks whether a
        // people does, and it asks it on the eve of the next chapter.
        if (dateGE(g.date, 614, 1) && keepers >= 4) {
          h.endGame(ctx, {
            result: 'win',
            title: 'There Are Still Keepers',
            text: 'Justinian is eighty years dead, the empire that legislated this people out '
              + 'of its own fields has spent itself against Persia, and on the mountain the '
              + 'calendar is still kept by the line of Phinehas. That is the whole victory '
              + 'and it is not a small one: in the history that happened, the number of '
              + 'Samaritans alive when the Persians came was already counted in thousands, '
              + 'and it went on falling for fourteen centuries.',
            score: 175,
          });
          return;
        }
        if (!samAlive || keepers === 0
            || (samProvs === 0 && totalMen(ctx, 'SAM') < 1200)) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'A Remnant',
            text: 'Procopius will say a hundred thousand and Malalas will say twenty, and '
              + 'the argument between them will outlast every village either of them is '
              + 'counting. The scroll is carried out of Neapolis by men who can name every '
              + 'family still keeping the calendar, and the naming does not take long.',
            score: 0,
          });
          return;
        }
      } else if (g.playerTag === who(ctx, 'BYZ')) {
        const w = findWar(g, 'SAM', 'BYZ');
        const byzScore = w && typeof w.warscore.BYZ === 'number' ? w.warscore.BYZ : 0;
        if (w && byzScore >= 50 && !h.getFlag(ctx, 'samaritanTermsOffered')) {
          h.setFlag(ctx, 'samaritanTermsOffered', true);
          h.fireEvent(ctx, 'ev529_the_crown_to_constantinople');
          return;
        }
        if (dateGE(g.date, 532, 1) && h.controls(ctx, 'BYZ', 'Neapolis')
            && h.controls(ctx, 'BYZ', 'Sebaste') && samProvs === 0) {
          h.endGame(ctx, {
            result: 'win',
            title: 'The Crown Sent to Constantinople',
            text: 'The jewelled diadem goes west in a box, the province is assessed again, '
              + 'and the legislation stays on the books because nobody in the capital can '
              + 'think of a reason to take it off. Procopius, who disliked this emperor, '
              + 'will record the number of dead and let the reader decide what it was for.',
            score: 150,
          });
          return;
        }
        if (!h.controls(ctx, 'BYZ', 'Caesarea Maritima') && !h.controls(ctx, 'BYZ', 'Neapolis')) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'Palaestina Prima Is Lost',
            text: 'A four-province rising in the hills has taken the provincial capital, and '
              + 'the dispatches from the East are getting shorter. The prefect writes that '
              + 'the situation is contained. He writes it from Scythopolis.',
            score: 0,
          });
          return;
        }
      } else if (g.playerTag === who(ctx, 'HMY')) {
        // The client contract, dated the §185 way (SPEC §208): the reckoning
        // is November 570, the month the eight ships sailed in the history
        // that happened. Alive and seated is the bar; freer and whole is
        // the grade.
        const t = g.tags[who(ctx, 'HMY')];
        const hmyAlive = !!(t && t.alive !== false);
        const hmyProvs = hmyAlive ? h.countOwned(ctx, 'HMY', {}) : 0;
        if (!hmyAlive || (hmyProvs === 0 && totalMen(ctx, 'HMY') < 1000)) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The Banners of Raydan Cast Down',
            text: 'The country passes to whoever wanted it most that season, and the '
              + 'chroniclers of three empires each give it a sentence. The genealogies '
              + 'go up to the castles with the families that kept them, which is where '
              + 'a Persian officer\'s clerk will find them, forty years on, filed under '
              + 'antiquities.',
            score: 0,
          });
          return;
        }
        if (dateGE(g.date, 570, 11)) {
          if (!h.controls(ctx, 'HMY', 'Zafar')) {
            h.endGame(ctx, {
              result: 'loss',
              title: 'A Country of Other Men\'s Fleets',
              text: 'It ends the way it began: a foreign fleet and a local claimant, and '
                + 'the capital answering to neither of them in its own name. The abna '
                + 'will hold Sana\'a for two generations, the negus\' church will keep '
                + 'its roof a while longer, and the kingdom of the covenant is a story '
                + 'the caravan masters tell in the past tense.',
              score: 0,
            });
            return;
          }
          const free = !t.overlord;
          const whole = ['Zafar', 'Muza', 'Eudaemon Arabia', 'Najran', 'Marib',
            'Shabwa', 'Moscha', 'Dioscurida'].every((n) => h.controls(ctx, 'HMY', n));
          if (free && whole && (t.legitimacy || 0) >= 70) {
            h.endGame(ctx, {
              result: 'win',
              title: 'The Kings of Saba and Dhu Raydan',
              text: 'The full style again, on stone: King of Saba and Dhu Raydan and '
                + 'Hadramawt and Yamnat and their Arabs of the highlands and the coast — '
                + 'and above it the formula of Rahmanan, unbroken from Abikarib to this '
                + 'reign, as though the fleet of 525 were a hard winter the country had. '
                + 'No ships come in 570. There is nothing here for convicts to take: '
                + 'the kingdom is somebody\'s, and the somebody is home.',
              score: 200,
            });
            return;
          }
          if (free) {
            h.endGame(ctx, {
              result: 'win',
              title: 'No Ships From the North',
              text: 'Sayf son of Dhi Yazan does not tour the courts of the north in this '
                + 'history, because there is nothing to beg back: the crown at Zafar '
                + 'answers nobody, pays nobody, and buries its own kings. The King of '
                + 'Kings\' war council files the incense country under "expensive" and '
                + 'sends the eight ships nowhere.',
              score: 170,
            });
            return;
          }
          h.endGame(ctx, {
            result: 'win',
            title: 'The Client That Outlived the Word',
            text: 'Still crowned, still tributary — to somebody; the ledgers have changed '
              + 'hands twice — and still here, which is more than the viceroyalty was '
              + 'ever expected to manage. A client kingdom that reaches 570 seated at '
              + 'its own capital has beaten the arithmetic that priced it at eight '
              + 'shiploads of prisoners. The genealogies stay in the palace. The '
              + 'question they ask stays open.',
            score: 120,
          });
          return;
        }
      }
    } catch (e) { warnOnce('checkVictory', e); }
  },
};
