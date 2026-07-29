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
  'Roma', 'Capua', 'Tarentum', 'Brundisium', 'Rhegium', 'Panormus', 'Syracusae',
  'Oea', 'Leptis Magna', 'Macomades',
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
for (const n of JUD_LANDS) OWNERS[n] = 'JUD';
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
      name: 'Galilee',
      capital: 'Tiberias',
      description: 'What is left of the nation, around a lake sixty miles north of the '
        + 'city it may not live in: the academy at Tiberias, the town that closed the '
        + 'Talmud, and a patriarchate the emperor let lapse.',
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

  activeTags: ['SAM', 'BYZ', 'JUD', 'GHA', 'SAS'],
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
  },

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

    // The rising. It is a war from the first month because the legislation is
    // already law: this chapter does not open with a decision to revolt, it
    // opens with a decision about what kind of revolt it is.
    h.declareWar(ctx, 'SAM', 'BYZ', 'The Rising of the Keepers');
    try {
      const w = findWar(g, 'SAM', 'BYZ');
      if (w) {
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
    h.adjust(ctx, 'JUD', { treasury: 60, manpower: 4000, stability: 1, legitimacy: 40 });
    h.adjust(ctx, 'SAS', { treasury: 400, manpower: 22000, stability: 1, legitimacy: 60 });
    h.adjust(ctx, 'GHA', { treasury: 60, manpower: 5000 });

    // --- Opinions. Four centuries of schism, and one empire. ---
    setOpinion(g, 'SAM', 'BYZ', -190); setOpinion(g, 'BYZ', 'SAM', -160);
    setOpinion(g, 'SAM', 'GHA', -120); setOpinion(g, 'GHA', 'SAM', -100);
    // The two Israelite communities: not enemies, not friends, and watching.
    setOpinion(g, 'SAM', 'JUD', -40);  setOpinion(g, 'JUD', 'SAM', -55);
    setOpinion(g, 'JUD', 'BYZ', -90);  setOpinion(g, 'BYZ', 'JUD', -70);
    setOpinion(g, 'BYZ', 'SAS', -120); setOpinion(g, 'SAS', 'BYZ', -120);
    setOpinion(g, 'GHA', 'BYZ', 70);   setOpinion(g, 'BYZ', 'GHA', 60);

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
    h.spawnArmy(ctx, 'JUD', 'Tiberias', { inf: 2, name: 'The Watch of Tiberias' });

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
  },

  missions: {
    SAM: [
      {
        id: 's_sebaste', name: 'The Knife in the Middle',
        desc: 'Take Sebaste — Herod\'s Greek foundation, five miles from Neapolis, garrisoned.',
        rewardText: '+15 legitimacy, +20 martial points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'SAM', 'Sebaste'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'SAM', { legitimacy: 15, mar: 20 }),
      },
      {
        id: 's_host', name: 'The Men of the Hills',
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
        desc: 'Take Caesarea Maritima — the seat of the dux, the port, and the quarter '
          + 'where both risings actually began.',
        rewardText: '+120 talents and the customs house.',
        check: (ctx) => ctx.helpers.controls(ctx, 'SAM', 'Caesarea Maritima'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'SAM', { treasury: 120, gov: 20 }),
      },
      {
        id: 's_endure', name: 'A People, Not an Episode',
        desc: 'Reach 560 with six provinces of the Keepers\' Torah still on the map.',
        rewardText: '"The Keepers Keep": +0.3 legitimacy a month, permanently.',
        check: (ctx) => dateGE(ctx.game.date, 560, 1) && keeperProvinces(ctx) >= 6,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'SAM', {
          id: 'the_keepers_keep', name: 'The Keepers Keep', months: -1,
          effects: { legitimacyAdd: 0.3 },
        }),
      },
    ],
    BYZ: [
      {
        id: 'b_neapolis', name: 'The Town Below the Mountain',
        desc: 'Hold Neapolis — the rising has a capital and it is five miles from your garrison.',
        rewardText: '+15 legitimacy, +20 governance points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'BYZ', 'Neapolis'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'BYZ', { legitimacy: 15, gov: 20 }),
      },
      {
        id: 'b_quiet', name: 'A Quiet Province',
        desc: 'Hold every one of the four hill provinces at once.',
        rewardText: '+150 talents — the assessment resumes.',
        check: (ctx) => ['Neapolis', 'Jenin', 'Tulkarm', 'Qalqilya']
          .every((n) => ctx.helpers.controls(ctx, 'BYZ', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'BYZ', { treasury: 150 }),
      },
      {
        id: 'b_east', name: 'The War That Matters',
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
    ],
  },

  aiHints: {
    SAM: { rally: ['Neapolis'], targetRegiments: 12 },
    BYZ: { rally: ['Caesarea Maritima', 'Antioch'], targetRegiments: 40 },
    GHA: { rally: ['Bostra'], targetRegiments: 10 },
    SAS: { rally: ['Nisibis'], targetRegiments: 35 },
    JUD: { rally: ['Tiberias'], targetRegiments: 5 },
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
      }
    } catch (e) { warnOnce('checkVictory', e); }
  },
};
