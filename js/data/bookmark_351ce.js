// Judaea Universalis — bookmark: The Rising Against Gallus, 351 CE (SPEC §235).
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
//
// Historical spine: Aurelius Victor (Caes. 42.11), Jerome (Chron. s.a. 352),
// Socrates (HE II.33), Sozomen (HE IV.7), Theophanes, and the Galilean
// rabbinic material on "the days of Ursicinus" (y. Shevi'it 4:2, y. Berakhot
// 5:1). In March 351 Constantius II makes his cousin Gallus Caesar of the East
// and marches west against the usurper Magnentius, taking the field army with
// him; Shapur II is over the border every summer and Nisibis has been besieged
// three times in twelve years. And at Diocaesarea — Sepphoris under the name
// Hadrian's successors gave it — a garrison's weapons are taken off it in the
// night and a man named Patricius is raised up.
//
// In the history that happened this lasted a season. Ursicinus came down from
// Antioch with what the East still had, the towns of the lake were burned, and
// the whole affair occupies a sentence and a half in Ammianus. It is the last
// time for fifteen hundred years that Jews in the Galilee take a Roman
// garrison's arms, and the only thing wrong with it was the arithmetic: the
// Empire was fighting itself in Pannonia that autumn, and nobody in Sepphoris
// knew how badly.
//
// The chapter's slow enemy is not Ursicinus. It is the fourth century — the
// Christianization of the province, the law that follows it, and the
// Patriarchate's own long negotiation with an empire that will finally stop
// answering. `faithDrift` is that enemy, and no army beats it.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[bookmark_351ce] ' + key, e || '');
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

// A war is filed under the names its belligerents wear NOW (SPEC §135), and a
// content package asks after them by the names its chapter shipped with.
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

// How much of the country still keeps the Torah (SPEC §104's drift, read back).
// The chapter's real clock: the fourth century converts a province whoever wins
// the war, and a mission that asks for a Jewish Galilee has to ask for the
// PEOPLE and not the flag.
function jewishProvinces(ctx, tag) {
  try {
    const g = ctx.game;
    const held = who(ctx, tag);
    let n = 0;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable) continue;
      if (p.owner === held && p.religion === 'judaism') n++;
    }
    return n;
  } catch (e) { warnOnce('jewishProvinces', e); return 0; }
}

// ---- the political map of May 351 ------------------------------------------
// The rising holds what the sources give it and nothing else: Diocaesarea,
// where the arms were taken, the lake shore below it, and the villages of the
// upper Galilee that came in with the town. Tiberias — the Patriarch's own
// city, three miles down the shore — is the Empire's, and stays the Empire's
// until the chapter's first fork is answered. That is the whole design of the
// opening: the rising begins within sight of the one Jewish institution in the
// world that has something to lose.
const JUD_LANDS = ['Sepphoris', 'Tarichaea', 'Gischala'];

// Everything else in the theater is the Empire's. Rome has held all of it
// without interruption since 135 — Judaea, Galilee, the coast, the Decapolis,
// Provincia Arabia (Nabataea annexed 106), Agrippa's old kingdom (absorbed by
// 93), and Mesopotamia as far as the Khabur.
const ROM_LANDS = [
  // Palaestina: the hill country, the coast and the south
  'Jerusalem', 'Jericho', 'Emmaus', 'Lydda', 'Joppa', 'Engaddi', 'Gadora',
  'Gaza', 'Ascalon', 'Azotus', 'Jamnia', 'Hebron', 'Adora', 'Sebaste',
  'Neapolis', 'Antipatris', 'Caesarea Maritima', 'Dora',
  // Galilee and the valley the Empire did not lose
  'Tiberias', 'Ptolemais', 'Scythopolis',
  // the Decapolis, the Golan, and Agrippa's absorbed kingdom
  'Pella', 'Gadara', 'Gerasa', 'Philadelphia', 'Caesarea Philippi',
  'Batanea',
  // Provincia Arabia
  'Petra', 'Bostra', 'Oboda', 'Aila', 'Medaba', 'Hegra', 'Dumatha',
];

// The House of Sasan holds everything Parthia held and more: Ardashir broke
// the last Arsacid in 224 and had Ctesiphon two years later, and Shapur II has
// spent his whole reign trying to take back the five trans-Tigritine provinces
// Narseh signed away at Nisibis in 298. The Khabur line is still Roman in 351
// — which is why Nisibis and Singara are not in this list.
const SAS_LANDS = [
  'Seleucia-Ctesiphon', 'Babylon', 'Nehardea', 'Uruk', 'Charax', 'Gerrha',
  'Ecbatana', 'Susa', 'Gazaca', 'Persepolis', 'Gabae',
  'Dura-Europos', 'Hatra', 'Assur', 'Arbela',
  'Caucasian Albania', 'Hyrcania',
];

const OWNERS = {};
for (const n of JUD_LANDS) OWNERS[n] = 'JUD';
for (const n of ROM_LANDS) OWNERS[n] = 'ROM';
for (const n of SAS_LANDS) OWNERS[n] = 'SAS';
// The Roman east beyond the theater's old edge: Syria, Osrhoene, Mesopotamia
// to the Khabur, Cilicia, Cappadocia and Egypt are all one empire's in 351,
// and the base atlas still deals them the way 66 CE left them.
for (const n of ['Nisibis', 'Singara', 'Edessa', 'Carrhae', 'Amida']) OWNERS[n] = 'ROM';
// Arsacid Armenia keeps Tigranocerta and Sophene: Arsaces II is Rome's client
// and Shapur's target, and the kingdom is the reason the whole eastern war is
// fought where it is fought.
OWNERS['Tigranocerta'] = 'ARM';
OWNERS['Sophene'] = 'ARM';

// ---- the map of faiths, two centuries after Bar Kokhba ----------------------
// The base atlas is 66 CE, and the fourth century is exactly what has happened
// to it since. Christianity holds the great sees and the imperial foundations;
// the Galilee and the Judaean villages keep the Torah; Gerizim keeps its own;
// and the countryside of Syria, Phoenicia and Egypt is still, in 351, mostly
// what it always was. `faithDrift` below carries the rest of the century.
const RELIGIONS = {};
for (const n of [
  // Constantine's own foundations and the sees that ran the province
  'Jerusalem',            // the Holy Sepulchre, dedicated 335; Cyril is bishop
  'Caesarea Maritima',    // Eusebius' see and its library; Acacius has it now
  'Lydda',                // Diospolis, a bishopric before Nicaea
  'Antioch',              // the Golden Church, dedicated 341
  'Alexandria',           // Athanasius', when Athanasius is in it
  'Byzantion',            // the New Rome, twenty-one years old
  'Nicaea', 'Ancyra', 'Caesarea Mazaca', 'Edessa', 'Nisibis',
  'Thessalonica', 'Roma', 'Salamis',
  'Tigranocerta', 'Sophene',  // Armenia, Christian by law since Trdat
]) RELIGIONS[n] = 'christianity';
// The mountain keeps its keepers, a hundred and thirty years before Zeno
// builds on the summit.
RELIGIONS['Neapolis'] = 'samaritanism';
// The fire in the Iranian heartland, exactly as the later chapters have it.
for (const n of ['Seleucia-Ctesiphon', 'Ecbatana', 'Susa', 'Gazaca', 'Assur',
  'Caucasian Albania', 'Hyrcania', 'Persepolis', 'Gabae']) RELIGIONS[n] = 'zoroastrianism';
// Babylonia's academies are at their height — Abaye and Rava are the
// generation that just ended — and Nehardea, Nisibis and Arbela are Jewish
// towns under two different empires.
for (const n of ['Nehardea', 'Arbela']) RELIGIONS[n] = 'judaism';

export const BOOKMARK_351 = {
  id: '351ce',
  name: 'The Rising Against Gallus',
  startDate: { y: 351, m: 5, d: 1 },
  // SPEC §121: the year after which this chapter's own undated trigger cards
  // stop belonging to anybody. The chapter runs to 429 — Julian, Adrianople,
  // Theodosius, and the year the Patriarchate's tax is redirected to the
  // imperial treasury, which is the end of the institution this chapter is
  // really about. A card that legitimately runs later says so with its own
  // maxYear.
  generationHorizon: 430,
  // Technology of the age (SPEC §22): the comitatenses and the limitanei —
  // Diocletian's and Constantine's army, past the legion and short of the
  // theme.
  techBase: 7,
  // How far up the ladder this age can climb (SPEC §99): the fourth century
  // reaches the thematic pattern at its very top and stops there.
  techCeiling: 11,
  techTweaks: { ROM: { mar: 2, gov: 1 }, SAS: { mar: 1 } },
  // The rungs' own names (SPEC §179): the arts of a country that is a
  // province — the Patriarch's letters, the apostoloi who carry them, the
  // ordinations, and the arms a town keeps when it is not allowed any.
  techNames: {
    gov: {
      6: 'The Town Councils', 7: 'The Patriarch\'s Rescripts', 8: 'The Village Rolls',
      9: 'The Courts of the Land', 10: 'The Standing Chancery', 11: 'The Province Refused',
    },
    infl: {
      6: 'The Apostoloi', 7: 'The Crown Gold', 8: 'The Letters of Ordination',
      9: 'The Diaspora\'s Ear', 10: 'The Reckoning Published', 11: 'The World\'s Calendar',
    },
    mar: {
      6: 'The Garrison\'s Arms', 7: 'The Village Levies', 8: 'The Hill Companies',
      9: 'The Lake Watch', 10: 'The Walled Towns', 11: 'The Galilean Regulars',
    },
  },
  popMult: 0.9, // the late-antique Galilee: thinner than Herod's, denser than Justinian's

  blurb: 'The Empire is fighting itself. Constantius has gone west against the usurper '
    + 'Magnentius and taken the field army with him, leaving the East to a twenty-five-'
    + 'year-old cousin he has just made Caesar and does not trust; Shapur is over the '
    + 'border every summer. At Diocaesarea a garrison has been disarmed in the night and '
    + 'a man named Patricius raised up, and three miles down the lake shore the Patriarch '
    + 'of the Jews — who holds a Roman rank, a Roman salary and the calendar of a scattered '
    + 'people — is deciding what to do about it. In the history that happened this lasted '
    + 'one season. Nothing about the arithmetic says it had to.',

  // The map wears its era's shape (SPEC §47): the fortress-towns the Great
  // Revolt consumed were never rebuilt — Jotapata and Gamala fell in 67,
  // Machaerus and Masada by 74 — and their districts answer to their
  // neighbours ever after.
  mergeProvinces: {
    'Jotapata': 'Sepphoris', 'Gamala': 'Batanea',
    'Machaerus': 'Medaba', 'Masada': 'Engaddi',
  },

  // The map speaks its era (SPEC §25): the names the fourth-century
  // administration actually used.
  provinceNames: {
    'Jerusalem': 'Aelia Capitolina',   // the colonia's name, in every rescript
    'Sepphoris': 'Diocaesarea',        // renamed under Antoninus Pius
    'Lydda': 'Diospolis',              // renamed by Septimius Severus, c. 200
    'Emmaus': 'Nicopolis',             // refounded 221 by Elagabalus' rescript
    'Caesarea Philippi': 'Paneas',     // the old name outlives the dynasty
    'Byzantion': 'Constantinople',     // dedicated 11 May 330
    'Salamis': 'Constantia',           // rebuilt after the quakes of 342
    'Dura-Europos': 'Circesium',       // Dura is ash; Diocletian's fort holds the reach
    'Charax': 'Maishan',               // the Sasanian district, not the old port
    'Persepolis': 'Istakhr',
    'Gabae': 'Spahan',
    'Ecbatana': 'Hamadan',
    // The §230 districts under the names their own age used.
    'Shobak': 'Gebalene', 'Wadi Rum': 'Iram', 'Azraq': 'Basie',
    'Suwayda': 'Dionysias', 'Douma': 'Ghouta', 'Salamiyah': 'Salaminias',
    'Akkar': 'Arca', 'Batroun': 'Botrys', 'Kirkuk': 'Arrapha',
  },

  // The victors' pens wait on the land being truly theirs (SPEC §66). There is
  // no Roman pen here: the era names above are already the Empire's, and the
  // whole point of them is that they are what a signpost says while somebody
  // else owns the road. The Hebrew pen is what taking the road looks like.
  integratedNames: {
    JUD: {
      'Jerusalem': 'Yerushalayim', 'Sepphoris': 'Tzippori', 'Lydda': 'Lod',
      'Emmaus': 'Ammaus', 'Tiberias': 'Tverya', 'Gischala': 'Gush Halav',
      'Tarichaea': 'Migdal', 'Ptolemais': 'Akko', 'Scythopolis': 'Beit She\'an',
      'Caesarea Maritima': 'Kesariya', 'Neapolis': 'Shechem', 'Joppa': 'Yafo',
    },
    // No MLI alias: the greater crown is not offered in this chapter. The
    // Kingdom of Israel wants Jerusalem, twenty-five provinces and a son of
    // David on the throne, and a chapter that opens with three towns and a
    // stolen arms chest has no road to it that would not be a fantasy — the
    // same call §136 made for the Keepers. A future section that earns the
    // crown here adds the alias with it.
  },

  activeTags: ['ROM', 'JUD', 'SAS', 'ARM',
    // The political west (SPEC §173): the world Constantius is not looking at
    // while he fights Magnentius for it. Dacia has been Gothic for eighty
    // years; the Rhine is Frankish and Alamannic on the far bank; the Picts
    // and the Irish are across their own water. Seated by
    // js/data/political_maps.js.
    'GOT', 'GEP', 'FRK', 'SAX', 'FRS', 'CHA', 'SUE', 'SCN', 'AES',
    'CAL', 'HIB', 'GRM',
    'BOS', 'SCY', 'SRM', 'VEN',
    // The political east and south (SPEC §205): post-Meroitic Nubia, the
    // Blemmyes who took the Dodekaschoinos when Diocletian gave it up, Ezana's
    // newly Christian Aksum, and the Himyar that has swallowed Saba and
    // Hadramawt.
    'NOB', 'BLM', 'AXM', 'HMY', 'CHO'],

  // Standing rivalries (SPEC §73): the war of 337–363 is the only permanent
  // fact in this chapter's world. Rome and Persia do not stop.
  rivalries: [['ROM', 'SAS']],
  // Historical friends (SPEC §86): there is no friend here, and pretending
  // otherwise would be the one lie this chapter cannot afford. What there is,
  // is an enemy's enemy — Ctesiphon will hear a Galilean embassy for exactly
  // as long as the Galilee is costing Antioch soldiers, and the Babylonian
  // academies under Shapur are the largest Jewish community on earth. The bond
  // is an alignment, not an affection.
  affinities: [
    ['JUD', 'SAS', { axis: 'alignment', sign: -1 }],
  ],

  // The Temple has been gone for two hundred and eighty-one years, and there
  // is a temple of Aphrodite over the tomb the new basilica was built beside
  // (SPEC §32).
  wonderTweaks: { Jerusalem: null },
  owners: OWNERS,
  religions: RELIGIONS,

  // Whose church is it, really (SPEC §104). Every other chapter's version of
  // this rule asks about a minority whose co-religionists rule somewhere else.
  // This one asks about the majority-in-waiting whose co-religionist rules
  // HERE: a Jewish state in this century governs Christian towns whose patron
  // is the Augustus, whose bishops correspond with his court, and whose legal
  // position improves every decade the war goes on. The synod card
  // (`ev351_the_bishops_terms`) clears it permanently, which is the only thing
  // that ever has.
  foreignPatron: {
    christianity: {
      patron: 'ROM',
      unrest: 1.5,
      minShare: 0.2,
      name: 'The Emperor\'s Church',
      freedFlag: 'bishopsSettled',
    },
  },

  // The fourth century itself (SPEC §104). This is the chapter's real
  // antagonist and it does not have an army. Constantine's building programme
  // is fifteen years old, the pilgrims have started arriving, the law has
  // begun to favour one side of every dispute, and the curve does not care who
  // wins at Diocaesarea. A Jewish Galilee that is still Jewish in 400 has beaten
  // something no rising ever fought.
  faithDrift: {
    christianity: {
      from: ['hellenism', 'roman_cult', 'nabataean', 'egyptian'],
      resistedBy: { judaism: 0.62, samaritanism: 0.66 },
      seeds: ['Jerusalem', 'Caesarea Maritima', 'Lydda', 'Antioch', 'Alexandria', 'Roma'],
      seedShare: 0.05,
      vigor: 0.0018,
      spreadsAlong: 'trade',
      monthlyCap: 0.005,
      curve: (y, ctx) => {
        const f = (ctx && ctx.game && ctx.game.flags) || {};
        // Julian's twenty months are a real dip and a real memory: the
        // subsidies stop, the temples reopen, and the century resumes.
        const base = 1 / (1 + Math.exp(-(y - 300) / 42));
        if (f.apostateReigns) return base * 0.45;
        // A state that governs its Christians instead of fighting them slows
        // nothing theologically and everything administratively.
        return f.bishopsSettled ? base * 0.85 : base;
      },
    },
  },

  // What the era asks of you (SPEC §33) — shown in the realm panel.
  objectives: {
    JUD: [
      'Win: hold the Galilee entire — Diocaesarea, Tiberias, Tarichaea, Gischala, Ptolemais, Scythopolis — with the rising alive in 356.',
      'Win: still a sovereign Jewish country in 364, when the emperor who offered you the Temple is dead and the Empire is Christian again.',
      'Crown the chain: put the Sanhedrin back in Jerusalem, and still hold ten provinces of the Torah in 400.',
      'Lose: Ursicinus came through — the towns burned and nothing left standing.',
    ],
    ROM: [
      'Win: the province quiet again — no rebel town left in the Galilee by 354.',
      'Win: the eastern frontier intact when the civil war ends.',
      'Lose: the Galilee lost while the Caesar sits in Antioch, and Persia over the Khabur.',
    ],
  },

  // The chapter's argument (SPEC §201): the moon and the reckoning. Hillel's
  // house fixes the calendar by computation in 358/9, seven years into this
  // chapter, and the reason it is remembered as a rescue is the reason it is a
  // question — a people that can compute its own festivals no longer needs the
  // Land to tell it when they are.
  schools: { JUD: 'moon_and_reckoning' },

  // The court factions (SPEC §34): the realm's internal parties. The engine
  // ticks them for the human player alone; the AI keeps its politics offstage.
  factions: {
    JUD: [
      {
        id: 'armed', name: 'The Men of Diocaesarea',
        desc: 'The ones who went over the wall for the arms chest. They are farmers with '
          + 'legionary weapons and no illusions about what happens if they put them down.',
        drift(ctx, t) {
          const g = ctx.game;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.5 : -0.45;
        },
        boon: { name: 'The Arms Chest', text: '+6% morale', effects: { moraleMult: 1.06 } },
        bane: { name: 'The Weapons Go Back in the Straw', text: '−15% reinforcement', effects: { reinforceMult: 0.85 } },
        appease: { label: 'Arm the villages (40 martial points)', cost: { mar: 40 } },
        demand: {
          title: 'The Men Ask What Happens to Them',
          text: 'Every negotiation this court opens is, from where they stand, a list of names '
            + 'to be handed over — theirs. They want the thing that makes a rising into a '
            + 'country: a muster with a roll, a wage, and somebody whose job it is to lose '
            + 'the list of who went over the wall first.',
          grant: { label: 'A roll, a wage, and no list', cost: { mar: 50 } },
          refuse: { label: 'Nothing is being negotiated', tooltip: 'They have heard that before, from Sepphoris in 67.' },
        },
      },
      {
        id: 'nasi', name: 'The House of the Nasi',
        desc: 'Hillel\'s house at Tiberias: a Roman rank, a Roman salary, the crown gold of '
          + 'every congregation from Spain to Babylonia, and the calendar of the whole '
          + 'people. The oldest Jewish authority still standing, and the most careful.',
        drift(ctx, t) {
          const g = ctx.game;
          if ((t.stability || 0) < 0) return -0.5;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? -0.25 : 0.45;
        },
        boon: { name: 'The Crown Gold', text: '+10% income', effects: { incomeMult: 1.1 } },
        bane: { name: 'The Letters Stop', text: '−0.3 legitimacy a month', effects: { legitimacyAdd: -0.3 } },
        appease: { label: 'Honour the Patriarch (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'Tiberias Asks Who Is Answering For the People',
          text: 'The house has spent a century and a half building the one address at which the '
            + 'Jews of the world can be reached, and it is written to by emperors. It will not '
            + 'watch a captain from Diocaesarea answer in its name. Confirm the patriarchate\'s '
            + 'seals, its courts and its collectors — or say plainly that the rising has '
            + 'replaced it.',
          grant: { label: 'The seals are confirmed', cost: { infl: 50 } },
          refuse: { label: 'The rising answers for the people now', tooltip: 'Then so does the rising, to everybody, for everything.' },
        },
      },
      {
        id: 'schools', name: 'The Academies',
        desc: 'Tiberias, Sepphoris, Lydda and Caesarea: the houses that are, this decade, '
          + 'putting the Talmud of the Land of Israel into the shape it will be abandoned in.',
        drift(ctx, t) { return (t.warExhaustion || 0) <= 6 ? 0.35 : -0.55; },
        boon: { name: 'The Benches Full', text: '+0.3 legitimacy a month', effects: { legitimacyAdd: 0.3 } },
        bane: { name: 'The Tractates Break Off', text: '+1 unrest everywhere', effects: { unrestAll: 1 } },
        appease: { label: 'Endow the houses (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Houses Ask for a Roof',
          text: 'Scholars are cheap and interruptible, which is why every state discovers late '
            + 'what it cost to interrupt them. The masters want the study houses endowed, the '
            + 'students exempted from the levy, and the redaction finished — because the '
            + 'alternative is that the Babylonians finish theirs and this one stops in the '
            + 'middle of a tractate for ever.',
          grant: { label: 'Endowments, exemptions, and a scribe', cost: { gov: 55 } },
          refuse: { label: 'Every man to the muster', tooltip: 'The tractate stops in the middle. It stays that way.' },
        },
      },
    ],
    ROM: [
      {
        id: 'court', name: 'The Sacred Consistory',
        desc: 'The eunuchs, notaries and masters of offices around a Caesar who is twenty-five '
          + 'and has been told exactly nothing about what he may decide.',
        drift(ctx, t) { return (t.stability || 0) >= 1 ? 0.4 : -0.4; },
        boon: { name: 'The Purple Obeyed', text: '+0.25 legitimacy a month', effects: { legitimacyAdd: 0.25 } },
        bane: { name: 'The Notaries Write to Milan', text: '−7% income', effects: { incomeMult: 0.93 } },
        appease: { label: 'Offices and codicils (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Consistory Wants a Decision in Writing',
          text: 'Everything this court does will be read out in front of an Augustus who is '
            + 'currently killing another Roman for the right to review it. The notaries want '
            + 'the orders signed, dated, and copied to Milan — because the man who carries an '
            + 'unsigned order is the man who is executed for it.',
          grant: { label: 'Signed, dated, copied', cost: { gov: 55 } },
          refuse: { label: 'The Caesar decides in the East', tooltip: 'Gallus decided in the East. It took Constantius three years.' },
        },
      },
      {
        id: 'army', name: 'The Army of the East',
        desc: 'What Constantius did not take west: the Syrian limitanei, the Osrhoene horse, '
          + 'and one very good general who is not allowed to say so.',
        drift(ctx, t) {
          const g = ctx.game;
          if ((t.treasury || 0) < 0) return -0.7;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.4 : -0.2;
        },
        boon: { name: 'Ursicinus Commands', text: '+5% discipline', effects: { disciplineMult: 1.05 } },
        bane: { name: 'Two Fronts, One Army', text: '−8% morale', effects: { moraleMult: 0.92 } },
        appease: { label: 'The donative (100 talents)', cost: { treasury: 100 } },
        demand: {
          title: 'The Army Asks Which War It Is Fighting',
          text: 'The Persians are over the Tigris in the summer and there is a rebel town in the '
            + 'Galilee, and the field army is in Pannonia fighting Romans. The staff would like '
            + 'to know, in order, which of these the East is expected to lose.',
          grant: { label: 'Pay them and let them choose', cost: { treasury: 150 } },
          refuse: { label: 'They will hold all three', tooltip: 'They held two. Amida is eight years away.' },
        },
      },
      {
        id: 'cities', name: 'The Cities',
        desc: 'Antioch, Caesarea and the councils: grain prices, bishops, and a mob three '
          + 'years away from tearing a praetorian prefect apart in the street over the price '
          + 'of bread.',
        drift(ctx, t) { return (t.warExhaustion || 0) <= 5 ? 0.3 : -0.5; },
        boon: { name: 'The Councils Assess', text: '+8% income', effects: { incomeMult: 1.08 } },
        bane: { name: 'Bread Riot at Antioch', text: '+1.25 unrest everywhere', effects: { unrestAll: 1.25 } },
        appease: { label: 'Fix the price of grain (80 talents)', cost: { treasury: 80 } },
        demand: {
          title: 'Antioch Wants the Grain Price Fixed',
          text: 'The harvest was short, the army is buying, and the curia has explained at '
            + 'length that a maximum price produces an empty market. The city does not want the '
            + 'explanation. The city wants the price — and in 354 it will take a prefect apart '
            + 'in the street for the want of it.',
          grant: { label: 'Fix it, and buy the shortfall', cost: { treasury: 120 } },
          refuse: { label: 'The market will settle', tooltip: 'Theophilus was torn to pieces for that sentence.' },
        },
      },
    ],
  },

  playableTags: [
    {
      tag: 'JUD',
      difficulty: 'Very Hard',
      blurb: 'Three towns, a chest of legionary weapons, and the best window any Jewish rising '
        + 'ever got: the Empire is fighting itself in Pannonia and Persia is over the border '
        + 'every summer. You will not beat Rome. What you are playing for is a country that is '
        + 'still standing, still Jewish and still governed when the fourth century has finished '
        + 'with everybody else\'s.',
    },
  ],

  // Pre-existing works (SPEC §58): the harbours and granaries of a late Roman
  // province, which the rising does not have and will have to take.
  buildings: {
    'Caesarea Maritima': ['shipyard', 'market'], // Sebastos, and the seat of the governor
    'Alexandria': ['shipyard', 'granary'],
    'Seleucia Pieria': ['shipyard'],
    'Antioch': ['market'],
  },

  // Courts of May 351.
  rulers: {
    ROM: {
      name: 'Constantius II', title: 'Augustus', gov: 3, infl: 3, mar: 2, age: 34,
      // The cousin he made Caesar in March and will execute in 354.
      heir: { name: 'Gallus', gov: 1, infl: 1, mar: 2, age: 25 },
    },
    JUD: { name: 'Patricius', title: 'Captain of Diocaesarea', gov: 1, infl: 2, mar: 3, age: 40 },
    SAS: { name: 'Shapur II', title: 'King of Kings', gov: 4, infl: 3, mar: 4, age: 42 },
    ARM: { name: 'Arsaces II', title: 'King of Armenia', gov: 2, infl: 2, mar: 2, age: 35 },
    // The political west (SPEC §173): the Tervingi judge whose son is
    // Athanaric, the Alamannic king Julian will break at Strasbourg in six
    // years, and Ezana, who has just put a cross on his coins.
    GOT: { name: 'Aoric', title: 'Judge of the Tervingi', gov: 2, infl: 2, mar: 3, age: 45 },
    SUE: { name: 'Chnodomarius', title: 'King of the Alamanni', gov: 1, infl: 2, mar: 4, age: 40 },
    FRK: { name: 'Mallobaudes', title: 'King of the Franks', gov: 2, infl: 2, mar: 3, age: 38 },
    AXM: { name: 'Ezana', title: 'Negus', gov: 3, infl: 3, mar: 3, age: 45 },
    HMY: { name: 'Tha\'ran Yuhan\'im', title: 'King of Saba and dhu-Raydan', gov: 3, infl: 2, mar: 2, age: 44 },
    NOB: { name: 'Silko', title: 'King of the Noubades', gov: 2, infl: 2, mar: 3, age: 35 },
  },

  // The era's lens on the western tags (SPEC §139, §173): the fourth century's
  // own names for peoples the atlas files under older ones.
  tagTweaks: {
    // The rising is not Judaea (SPEC §139, §236). Judaea was struck off the
    // map in 135 and the hill country around Aelia is Christian Palaestina
    // Prima; the nation moved north two centuries ago and everything this
    // chapter is about happens between Sepphoris, Tiberias and the lake. So
    // the three letters wear the name of the country they are actually in,
    // the seat is the town the arms were taken in — a capital is read by the
    // growth bonus, the AI's rally and the peace table, and Jerusalem in this
    // chapter belongs to the Empire — and the banner is the Galilee's own:
    // the zodiac roundel of the synagogue floors, on the light blue of the
    // lake. The Keepers' chapter dresses the same court the same way, which
    // is the point of a lens.
    JUD: {
      name: 'Galilee', adj: 'Galilean',
      capital: 'Sepphoris',
      flag: 'GAL',
      abbr: 'GAL',   // the letters on the strip; the engine still files it under JUD

      color: [124, 196, 214],
      description: 'The nation as the fourth century leaves it: an academy at Tiberias, '
        + 'villages on a lake, a patriarchate the emperor still writes to — and, this '
        + 'summer, a town with a cohort\'s weapons in it.',
    },
    CAL: { name: 'The Picts', adj: 'Pictish', description: 'The people beyond the wall, under the name the panegyrists have used since 297.' },
    SUE: { name: 'The Alamanni', adj: 'Alamannic', description: 'The Suebic confederation on the far bank of the upper Rhine, whom both sides of the civil war are bidding for.' },
    GOT: { name: 'The Tervingi', adj: 'Gothic', description: 'The Goths of the Dacia Rome gave up eighty years ago: a judge, a treaty, and a Danube they cross when the treaty lapses.' },
    GEP: { name: 'The Gepids', adj: 'Gepid', description: 'The Vistula country the Goths left behind them.' },
    SAX: { name: 'The Saxons', adj: 'Saxon', description: 'The sea-raiders of the Elbe mouth, for whom Rome is already building a coast of forts.' },
  },

  missions: {
    JUD: [
      // ── The campaign band ───────────────────────────────────────────────
      {
        id: 'dc_the_arms', name: 'The Arms of the Garrison',
        icon: 'spears', col: 1, row: 0,
        desc: 'Hold Diocaesarea and put 5,000 men in the field — a town with weapons in it is '
          + 'a riot; a town with a muster is a war.',
        rewardText: '+15 legitimacy, +40 martial points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Sepphoris') && totalMen(ctx, 'JUD') >= 5000,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 15, mar: 40 }),
      },
      {
        id: 'dc_the_lake', name: 'The Towns of the Lake',
        icon: 'ship', col: 0, row: 1, requires: ['dc_the_arms'],
        desc: 'Take Tiberias and hold Tarichaea with it — the shore, its boats, and the city '
          + 'the Patriarch lives in.',
        rewardText: '+120 talents (the fisheries and the lake customs), +15 legitimacy.',
        check: (ctx) => ['Tiberias', 'Tarichaea'].every((n) => ctx.helpers.controls(ctx, 'JUD', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { treasury: 120, legitimacy: 15 }),
      },
      {
        id: 'dc_the_valley', name: 'The Two Roads In',
        icon: 'horseshoe', col: 1, row: 1, requires: ['dc_the_arms'],
        desc: 'Hold Scythopolis and Paneas — every army that has ever come into the Galilee has '
          + 'come down one of those two roads.',
        rewardText: '"The Roads Watched": +1 to hill-country defence, permanently.',
        check: (ctx) => ['Scythopolis', 'Caesarea Philippi'].every((n) => ctx.helpers.controls(ctx, 'JUD', n)),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'the_roads_watched', name: 'The Roads Watched', months: -1, effects: { hillDefBonus: 1 },
        }),
      },
      {
        id: 'dc_the_port', name: 'A Window on the Sea',
        icon: 'anchor', col: 2, row: 1, requires: ['dc_the_arms'],
        desc: 'Take Ptolemais — a country with no port is a country that buys its iron from '
          + 'whoever is besieging it.',
        rewardText: '+150 talents (the customs house), +25 influence points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Ptolemais'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { treasury: 150, infl: 25 }),
      },
      {
        id: 'dc_the_governor', name: 'The Governor\'s Seat',
        icon: 'tower', col: 0, row: 2, requires: ['dc_the_lake'],
        desc: 'Take Caesarea Maritima — the praetorium, the archive, and the tax rolls of the '
          + 'whole province in one building.',
        rewardText: '+250 talents, +20 legitimacy.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Caesarea Maritima'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { treasury: 250, legitimacy: 20 }),
      },
      {
        id: 'dc_the_hills', name: 'Down Into Judaea',
        icon: 'mountain', col: 1, row: 2, requires: ['dc_the_valley'],
        desc: 'Hold Diospolis, Nicopolis and Jericho — the villages that rose in 132 and were '
          + 'still there in 351.',
        rewardText: '+50 governance points, +4,000 manpower.',
        check: (ctx) => ['Lydda', 'Emmaus', 'Jericho'].every((n) => ctx.helpers.controls(ctx, 'JUD', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { gov: 50, manpower: 4000 }),
      },
      {
        id: 'dc_aelia', name: 'The City Under Its Other Name',
        icon: 'temple', col: 1, row: 3, requires: ['dc_the_hills'],
        desc: 'Take Aelia Capitolina — a colonia with a Christian basilica in it, which Jews '
          + 'have been permitted to enter one day a year for two hundred years.',
        rewardText: '+40 legitimacy, +60 influence points, and the signposts change back.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Jerusalem'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 40, infl: 60 }),
      },
      {
        id: 'dc_the_sanhedrin', name: 'The Court Goes Back Up',
        icon: 'scroll', col: 1, row: 4, requires: ['dc_aelia'],
        desc: 'Hold Jerusalem with the realm steady (stability +1) and the Patriarch\'s house at '
          + '70 — and move the court back to the city it was expelled from in 70 CE.',
        rewardText: '"The Sanhedrin in Jerusalem": +0.35 legitimacy a month and −0.75 unrest everywhere, permanently; +80 governance points.',
        check: (ctx) => {
          const t = ctx.game.tags[who(ctx, 'JUD')] || {};
          return ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')
            && (t.stability || 0) >= 1
            && ((t.factions || {}).nasi || 0) >= 70;
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JUD', {
            id: 'sanhedrin_in_jerusalem', name: 'The Sanhedrin in Jerusalem', months: -1,
            effects: { legitimacyAdd: 0.35, unrestAll: -0.75 },
          });
          ctx.helpers.adjust(ctx, 'JUD', { gov: 80 });
        },
      },
      // ── The age's curriculum (SPEC §179) ────────────────────────────────
      {
        id: 'dc_the_levies', name: 'A Levy Instead of a Mob',
        icon: 'helmet', col: 2, row: 2, requires: ['dc_the_port'],
        desc: 'Reach Military 9 — The Lake Watch. Whoever comes down the road next will be a '
          + 'professional, and so must you be.',
        rewardText: '"The Watch Set": +6% discipline, permanently.',
        check: (ctx) => (((ctx.game.tags[who(ctx, 'JUD')] || {}).tech || {}).mar | 0) >= 9,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'the_watch_set', name: 'The Watch Set', months: -1, effects: { disciplineMult: 1.06 },
        }),
      },
      {
        id: 'dc_the_curriculum', name: 'The Arts of the Age',
        icon: 'quill', col: 2, row: 3, requires: ['dc_the_levies'],
        desc: 'Take up three ideas of the age — a rising that does not learn anything is a '
          + 'season, and this one has had its season.',
        rewardText: '+60 governance points, +15 legitimacy.',
        check: (ctx) => eraTiers(ctx.game.tags[who(ctx, 'JUD')]) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { gov: 60, legitimacy: 15 }),
      },
      {
        id: 'dc_the_walls', name: 'Towns That Can Refuse',
        icon: 'walls', col: 0, row: 3, requires: ['dc_the_governor'],
        desc: 'Bring the realm to 90 points of worked land with 200 talents still in the chest — '
          + 'walls, cisterns and granaries, in the towns that were burned last time.',
        rewardText: '"The Towns Walled": +1 to hill-country defence and −0.5 unrest everywhere, permanently.',
        check: (ctx) => {
          const g = ctx.game;
          const tag = who(ctx, 'JUD');
          const t = g.tags[tag] || {};
          if ((t.treasury || 0) < 200) return false;
          let dev = 0;
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.owner !== tag || !p.dev) continue;
            dev += (p.dev.tax | 0) + (p.dev.prod | 0) + (p.dev.mp | 0);
          }
          return dev >= 90;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'the_towns_walled', name: 'The Towns Walled', months: -1,
          effects: { hillDefBonus: 1, unrestAll: -0.5 },
        }),
      },
      {
        id: 'dc_the_frontier', name: 'The Desert Side',
        icon: 'horseshoe', col: 0, row: 4, requires: ['dc_the_walls'],
        desc: 'Hold Bostra and Philadelphia — the Arabian road, and the flank every relief '
          + 'column from Antioch has to use.',
        rewardText: '"The Arabian Road": +8% income, permanently.',
        check: (ctx) => ['Bostra', 'Philadelphia'].every((n) => ctx.helpers.controls(ctx, 'JUD', n)),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'the_arabian_road', name: 'The Arabian Road', months: -1, effects: { incomeMult: 1.08 },
        }),
      },
      {
        id: 'dc_the_host', name: 'The Host of the Galilee',
        icon: 'spears', col: 2, row: 4, requires: ['dc_the_curriculum'],
        desc: 'Field 22,000 men at Military 10 — the pattern the century itself fields.',
        rewardText: '"The Galilean Regulars": +10% discipline and +8% manpower, permanently.',
        check: (ctx) => (((ctx.game.tags[who(ctx, 'JUD')] || {}).tech || {}).mar | 0) >= 10
          && totalMen(ctx, 'JUD') >= 22000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'galilean_regulars', name: 'The Galilean Regulars', months: -1,
          effects: { disciplineMult: 1.1, manpowerMult: 1.08 },
        }),
      },
      {
        id: 'dc_the_century', name: 'A Country the Century Did Not Take',
        icon: 'lamp', col: 1, row: 5, requires: ['dc_the_sanhedrin', 'dc_the_host'],
        desc: 'Stand in 400 with ten provinces of your own that still keep the Torah — the one '
          + 'thing in this chapter no battle decides.',
        rewardText: '+1 stability, +40 legitimacy, and "The Land Kept": +12% growth and +0.25 legitimacy a month, permanently.',
        check: (ctx) => dateGE(ctx.game.date, 400, 1) && jewishProvinces(ctx, 'JUD') >= 10,
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { stability: 1, legitimacy: 40 });
          ctx.helpers.addTagModifier(ctx, 'JUD', {
            id: 'the_land_kept', name: 'The Land Kept', months: -1,
            effects: { growthMult: 1.12, legitimacyAdd: 0.25 },
          });
        },
      },
      // ── The civil band (SPEC §211) ──────────────────────────────────────
      // Three strands, two deep, beside the campaign rather than after it: what
      // the government becomes, where it stands among the powers, and who at
      // home pays for it. None of these waits on Aelia, because none of them
      // waited on Aelia in 351.
      {
        id: 'dc_the_rolls', name: 'The Rolls of the Villages',
        icon: 'quill', col: 0, row: 6, civil: 'govt',
        desc: 'Take the census and seat the courts — the first two rungs of the Art of Rule, '
          + 'with six provinces on the books.',
        rewardText: '"The Village Rolls": +10% income and +10% manpower, permanently.',
        check: (ctx) => {
          const t = ctx.game.tags[who(ctx, 'JUD')] || {};
          return (((t.reforms || {}).civ) | 0) >= 2
            && ctx.helpers.countOwned(ctx, 'JUD', {}) >= 6;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'the_village_rolls', name: 'The Village Rolls', months: -1,
          effects: { incomeMult: 1.1, manpowerMult: 1.1 },
        }),
      },
      {
        id: 'dc_the_province_refused', name: 'The Province Refused',
        icon: 'bricks', col: 0, row: 7, civil: 'govt', requires: ['dc_the_rolls'],
        desc: 'Reach Government 10 at +3 stability: a government that is not an interruption in '
          + 'somebody else\'s administration.',
        rewardText: '"Standing On Its Own": −1 unrest everywhere and +10% income, permanently.',
        check: (ctx) => {
          const t = ctx.game.tags[who(ctx, 'JUD')] || {};
          return ((t.tech || {}).gov | 0) >= 10 && (t.stability || 0) >= 3;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'standing_on_its_own_351', name: 'Standing On Its Own', months: -1,
          effects: { unrestAll: -1, incomeMult: 1.1 },
        }),
      },
      {
        id: 'dc_the_letters', name: 'Letters East and West',
        icon: 'note', col: 1, row: 6, civil: 'region',
        desc: 'Stand in three bonds at once — allies and clients together — so that the Galilee '
          + 'is a party to this century and not an item in its correspondence.',
        rewardText: '"The Letters Go Out": +1 diplomatic seat and +5% income, permanently.',
        check: (ctx) => {
          const g = ctx.game;
          const tag = who(ctx, 'JUD');
          const t = g.tags[tag] || {};
          let bonds = ((t.allies || []).length) | 0;
          for (const k of Object.keys(g.tags || {})) {
            const o = g.tags[k];
            if (o && o.alive !== false && o.overlord === tag) bonds++;
          }
          return bonds >= 3;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'letters_east_and_west', name: 'The Letters Go Out', months: -1,
          effects: { diploSeats: 1, incomeMult: 1.05 },
        }),
      },
      {
        id: 'dc_between_the_wars', name: 'Between Two Empires\' War',
        icon: 'scales', col: 1, row: 7, civil: 'region', requires: ['dc_the_letters'],
        desc: 'Stand among the four first powers of the world — a court that is worth writing '
          + 'to rather than about.',
        rewardText: '"Weighed With the Powers": +1 deterrence and +0.2 legitimacy a month, permanently; +60 influence points.',
        check: (ctx) => {
          const ord = (ctx.game.standing && ctx.game.standing.order) || [];
          const i = ord.indexOf(who(ctx, 'JUD'));
          return i >= 0 && i < 4;
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JUD', {
            id: 'weighed_with_the_powers_351', name: 'Weighed With the Powers', months: -1,
            effects: { deterrent: 1, legitimacyAdd: 0.2 },
          });
          ctx.helpers.adjust(ctx, 'JUD', { infl: 60 });
        },
      },
      {
        id: 'dc_the_crown_gold', name: 'The Crown Gold',
        icon: 'coins', col: 2, row: 6, civil: 'court',
        desc: 'Bank forty-five points of the Patriarch\'s credit — the aurum coronarium comes in '
          + 'from Spain to Babylonia, and it comes to whoever the congregations believe is the '
          + 'address.',
        rewardText: '"The Purse of the Congregations": +12% income, permanently; +350 talents and +50 influence points.',
        check: (ctx) => {
          const t = ctx.game.tags[who(ctx, 'JUD')] || {};
          return ((t.estateFavor || {}).nasi || 0) >= 45
            || ((t.factions || {}).nasi || 0) >= 75;
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JUD', {
            id: 'purse_of_the_congregations', name: 'The Purse of the Congregations', months: -1,
            effects: { incomeMult: 1.12 },
          });
          ctx.helpers.adjust(ctx, 'JUD', { treasury: 350, infl: 50 });
        },
      },
      {
        id: 'dc_the_redaction', name: 'The Tractate Finished',
        icon: 'scroll', col: 2, row: 7, civil: 'court', requires: ['dc_the_crown_gold'],
        desc: 'Bring the academies to eighty approval — and the Talmud of the Land of Israel is '
          + 'completed instead of abandoned.',
        rewardText: '"The Yerushalmi Completed": +0.3 legitimacy a month, −0.5 unrest everywhere and +6% growth, permanently; +70 governance points.',
        check: (ctx) => {
          const t = ctx.game.tags[who(ctx, 'JUD')] || {};
          return ((t.factions || {}).schools || 0) >= 80;
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JUD', {
            id: 'yerushalmi_completed', name: 'The Yerushalmi Completed', months: -1,
            effects: { legitimacyAdd: 0.3, unrestAll: -0.5, growthMult: 1.06 },
          });
          ctx.helpers.adjust(ctx, 'JUD', { gov: 70 });
        },
      },
      // ── The roads not taken (SPEC §183) ─────────────────────────────────
      // The §119 forks as standing hypotheticals; every check reads the marker
      // the fork card itself sets, so the tree and the chain cannot drift.
      {
        id: 'hy_the_name', name: 'What He Is Called', hypothetical: true,
        fork: '351ce/what_he_is_called',
        roads: ['crowned', 'captain'],
        icon: 'split', col: 3, row: 0,
        desc: 'Answer, in the first weeks, what the man the town raised up actually is.',
        rewardText: '+20 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'patriciusCrowned', 'patriciusCaptain'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 20 }),
      },
      {
        id: 'hy_the_house', name: 'The House Down the Shore', hypothetical: true,
        fork: '351ce/the_house_of_the_nasi',
        roads: ['blessed', 'stood_aside'],
        icon: 'scroll', col: 3, row: 1, requires: ['hy_the_name'],
        desc: 'Get an answer out of Tiberias — either answer. The Patriarch\'s house comes in '
          + 'with its letters and its collection, or it stands aside and survives; both are '
          + 'roads, and having no answer at all is not.',
        rewardText: '+50 influence points, +15 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'nasiBlessed', 'nasiStoodAside'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { infl: 50, legitimacy: 15 }),
      },
      {
        id: 'hy_the_calendar', name: 'The Moon and the Reckoning', hypothetical: true,
        fork: '351ce/the_calendar',
        roads: ['reckoning', 'moon'],
        icon: 'star8', col: 3, row: 2, requires: ['hy_the_name'],
        desc: 'Reach 358 with a court that can rule on the calendar, and rule on it.',
        rewardText: '+60 influence points.',
        check: (ctx) => anyFlag(ctx, 'reckoningPublished', 'moonKept'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { infl: 60 }),
      },
      {
        id: 'hy_julian', name: 'The Emperor Who Asked', hypothetical: true,
        fork: '351ce/the_emperors_offer',
        roads: ['stone_laid', 'offer_declined'],
        icon: 'temple', col: 3, row: 3, requires: ['hy_the_name'],
        desc: 'Still be a state in 363, when a pagan emperor offers to rebuild the House to '
          + 'spite the Christians.',
        rewardText: '+30 legitimacy, +60 governance points.',
        check: (ctx) => anyFlag(ctx, 'julianStoneLaid', 'julianOfferDeclined'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 30, gov: 60 }),
      },
      {
        id: 'hy_the_bishops', name: 'The Other Half of the Province', hypothetical: true,
        fork: '351ce/the_bishops_terms',
        roads: ['settled', 'unsettled'],
        icon: 'scales', col: 4, row: 0, requires: ['hy_the_name'],
        desc: 'Govern Caesarea and Aelia together, and answer for the Christians who live in '
          + 'them.',
        rewardText: '+25 legitimacy, +1 stability.',
        check: (ctx) => anyFlag(ctx, 'bishopsSettled', 'bishopsRefused'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 25, stability: 1 }),
      },
      {
        id: 'hy_the_patriarchate', name: 'What Became of the Office', hypothetical: true,
        fork: '351ce/the_last_nasi',
        roads: ['office_kept', 'office_lapsed'],
        icon: 'diaspora', col: 4, row: 1, requires: ['hy_the_house'],
        desc: 'Reach the year the Empire stopped answering the Patriarch\'s letters, and have an '
          + 'answer of your own.',
        rewardText: '+40 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'officeKept', 'officeLapsed'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 40 }),
      },
    ],
    ROM: [
      {
        id: 'rm_the_town', name: 'The Town Put Down',
        icon: 'swords', col: 1, row: 0,
        desc: 'Hold Diocaesarea — the rising began there and the Empire\'s answer has always '
          + 'been the same one.',
        rewardText: '+40 martial points, +15 legitimacy.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ROM', 'Sepphoris'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { mar: 40, legitimacy: 15 }),
      },
      {
        id: 'rm_the_province', name: 'The Province Quiet',
        icon: 'shield', col: 0, row: 1, requires: ['rm_the_town'],
        desc: 'Hold Tiberias, Ptolemais, Scythopolis and Caesarea Maritima together — the '
          + 'province is the road net, not the hills.',
        rewardText: '+60 governance points.',
        check: (ctx) => ['Tiberias', 'Ptolemais', 'Scythopolis', 'Caesarea Maritima']
          .every((n) => ctx.helpers.controls(ctx, 'ROM', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { gov: 60 }),
      },
      {
        id: 'rm_the_frontier', name: 'The Khabur Line',
        icon: 'walls', col: 2, row: 1, requires: ['rm_the_town'],
        desc: 'Still hold Nisibis and Singara in 356 — Shapur has besieged the first of them '
          + 'three times in twelve years.',
        rewardText: '"The Line Held": +6% discipline, permanently.',
        check: (ctx) => dateGE(ctx.game.date, 356, 1)
          && ['Nisibis', 'Singara'].every((n) => ctx.helpers.controls(ctx, 'ROM', n)),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ROM', {
          id: 'the_khabur_line', name: 'The Line Held', months: -1, effects: { disciplineMult: 1.06 },
        }),
      },
      {
        id: 'rm_the_reunion', name: 'One Augustus',
        icon: 'star8', col: 1, row: 2, requires: ['rm_the_province'],
        desc: 'Reach 354 with the East intact — the civil war is over and there is one emperor '
          + 'again, which has not been true since 337.',
        rewardText: '+30 legitimacy, +1 stability.',
        check: (ctx) => dateGE(ctx.game.date, 354, 1)
          && ctx.helpers.controls(ctx, 'ROM', 'Antioch')
          && ctx.helpers.controls(ctx, 'ROM', 'Caesarea Maritima'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { legitimacy: 30, stability: 1 }),
      },
      {
        id: 'rm_the_army', name: 'The Army Rebuilt',
        icon: 'helmet', col: 2, row: 2, requires: ['rm_the_frontier'],
        desc: 'Take up three ideas of the age — Mursa cost the Empire the men it needed for '
          + 'Persia, and they will not be replaced by being wished for.',
        rewardText: '+60 martial points, +15 legitimacy.',
        check: (ctx) => eraTiers(ctx.game.tags.ROM) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { mar: 60, legitimacy: 15 }),
      },
      {
        id: 'rm_the_church', name: 'The Church of the Empire',
        icon: 'shrine', col: 0, row: 2, requires: ['rm_the_province'],
        desc: 'Reach Government 10 — the fourth century\'s real instrument in this province is '
          + 'not the garrison, it is the endowment and the law.',
        rewardText: '"The Endowments": +8% income and +6% conversion, permanently.',
        check: (ctx) => (((ctx.game.tags.ROM || {}).tech || {}).gov | 0) >= 10,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ROM', {
          id: 'the_endowments', name: 'The Endowments', months: -1,
          effects: { incomeMult: 1.08, convertMult: 1.06 },
        }),
      },
    ],
  },

  aiHints: {
    ROM: { rally: ['Antioch', 'Caesarea Maritima'], targetRegiments: 38 },
    SAS: { rally: ['Seleucia-Ctesiphon', 'Arbela'], targetRegiments: 40 },
    JUD: { rally: ['Sepphoris'], targetRegiments: 12 },
    ARM: { rally: ['Tigranocerta'], targetRegiments: 8 },
    REB: { rally: [], targetRegiments: 0 },
  },

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

    // --- The rising, and the war it is already in. ---
    h.declareWar(ctx, 'ROM', 'JUD', 'The Rising at Diocaesarea');
    try {
      const w = findWar(g, 'ROM', 'JUD');
      // There is nothing to negotiate in 351: a provincial rising is not a
      // belligerent, it is a police matter with a body count. The chapter's
      // own cards open the exits — the terms after Ursicinus, the settlement
      // under Julian — and until one of them fires this war has no table.
      if (w) w.noNegotiation = true;
    } catch (e) { warnOnce('setup:war', e); }

    // The other war, which is the whole reason there is a window at all.
    h.declareWar(ctx, 'SAS', 'ROM', 'The War of Shapur II');
    try {
      const w = findWar(g, 'SAS', 'ROM');
      if (w) w.noNegotiation = true;
    } catch (e) { warnOnce('setup:persia', e); }

    // Armenia is Rome's client and Shapur's objective — the reason the eastern
    // war is fought where it is fought.
    if (g.tags.ARM) g.tags.ARM.overlord = 'ROM';

    // --- Treasuries, manpower, stability. ---
    // Rome is rich and split: the eastern prefecture's revenues with the
    // eastern field army four weeks' march away in the wrong direction.
    h.adjust(ctx, 'ROM', { treasury: 420, manpower: 26000, stability: 0, legitimacy: 55 });
    h.adjust(ctx, 'SAS', { treasury: 380, manpower: 22000, stability: 2, legitimacy: 70 });
    h.adjust(ctx, 'JUD', { treasury: 40, manpower: 4000, stability: 0, legitimacy: 12 });
    h.adjust(ctx, 'ARM', { treasury: 60, manpower: 6000, stability: 0, legitimacy: 45 });

    // --- Opinions. ---
    setOpinion(g, 'ROM', 'SAS', -200); setOpinion(g, 'SAS', 'ROM', -200);
    setOpinion(g, 'JUD', 'ROM', -180); setOpinion(g, 'ROM', 'JUD', -160);
    setOpinion(g, 'JUD', 'SAS', 40);   setOpinion(g, 'SAS', 'JUD', 20);
    setOpinion(g, 'ARM', 'ROM', 60);   setOpinion(g, 'ROM', 'ARM', 50);
    setOpinion(g, 'ARM', 'SAS', -120); setOpinion(g, 'SAS', 'ARM', -140);

    // --- Starting modifiers. ---
    // The window, and its length. Constantius takes the comitatus west in the
    // spring of 351 and does not finish with Magnentius until August 353; what
    // is left in Syria is the frontier army and a Caesar. Thirty months is the
    // whole chapter's opening argument, and the counter is visible.
    h.addTagModifier(ctx, 'ROM', {
      id: 'the_empire_fights_itself', name: 'The Empire Fights Itself', months: 30,
      effects: { reinforceMult: 0.6, manpowerMult: 0.75, moraleMult: 0.94 },
    });
    // A rising of one town: everything it has is enthusiasm and local ground.
    h.addTagModifier(ctx, 'JUD', {
      id: 'the_arms_of_the_night', name: 'The Arms of the Night', months: 24,
      effects: { moraleMult: 1.15, hillDefBonus: 1, maintMult: 0.7 },
    });
    // And no state behind it: no chancery, no mint, no assessment.
    h.addTagModifier(ctx, 'JUD', {
      id: 'no_administration', name: 'A Town, Not a Government', months: 36,
      effects: { adminMult: 1.35, incomeMult: 0.85 },
    });
    // Shapur has been in the field for fourteen years and knows exactly how
    // much of the Roman east is in Pannonia.
    h.addTagModifier(ctx, 'SAS', {
      id: 'the_kings_summer', name: 'The King\'s Summer', months: 36,
      effects: { moraleMult: 1.08, siegeBonus: 1 },
    });

    // --- Starting armies. ---
    // The rising: what a town of ten thousand can put in the field with a
    // captured armoury, and the villages that came in with it.
    h.spawnArmy(ctx, 'JUD', 'Sepphoris', {
      inf: 4, name: 'The Men of Diocaesarea',
      general: { name: 'Patricius', fire: 1, shock: 2, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'JUD', 'Gischala', { inf: 2, name: 'The Upper Galilee' });

    // Rome: the provincial garrisons, the Caesar's guard at Antioch, and the
    // one man in the East who can actually command — kept north, because
    // Ursicinus' business in 351 is Nisibis until Antioch decides otherwise.
    h.spawnArmy(ctx, 'ROM', 'Caesarea Maritima', {
      inf: 4, cav: 1, name: 'Palaestina Limitanei',
    });
    h.spawnArmy(ctx, 'ROM', 'Scythopolis', { inf: 2, name: 'Scythopolis Garrison' });
    h.spawnArmy(ctx, 'ROM', 'Antioch', {
      inf: 6, cav: 2, name: 'The Caesar\'s Household',
      general: { name: 'Gallus Caesar', fire: 1, shock: 1, maneuver: 1 },
    });
    h.spawnArmy(ctx, 'ROM', 'Nisibis', {
      inf: 9, cav: 3, name: 'Army of the East',
      general: { name: 'Ursicinus', fire: 3, shock: 3, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'ROM', 'Alexandria', { inf: 3, name: 'Aegyptus Garrison' });

    // Persia: the King of Kings on the Tigris, with the Arabian flank his
    // campaigns of the 320s cleared.
    h.spawnArmy(ctx, 'SAS', 'Arbela', {
      inf: 10, cav: 8, name: 'The Royal Host',
      general: { name: 'Shapur II', fire: 3, shock: 4, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'SAS', 'Seleucia-Ctesiphon', { inf: 6, cav: 3, name: 'The Ctesiphon Reserve' });
    h.spawnArmy(ctx, 'ARM', 'Tigranocerta', { inf: 4, cav: 2, name: 'The Armenian Horse' });

    h.notify(ctx, {
      title: 'The Rising Against Gallus',
      text: 'The garrison of Diocaesarea has been disarmed in the night and the arms are in '
        + 'Jewish hands. The Caesar is in Antioch, the field army is in Pannonia, and nobody '
        + 'in this town knows how long that will be true.',
      type: 'war', provName: 'Sepphoris',
    });
  },

  checkVictory(ctx) {
    try {
      const g = ctx.game;
      const h = ctx.helpers;
      if (!g || g.over || g.result) return;

      const judTag = g.tags && g.tags[who(ctx, 'JUD')];
      const judAlive = !!(judTag && judTag.alive !== false);
      const judProvs = judAlive ? h.countControlled(ctx, 'JUD', {}) : 0;

      if (g.playerTag === who(ctx, 'JUD')) {
        // The Galilee entire, with the rising still standing five years on:
        // the thing the rising was put down before it could try.
        const GALILEE = ['Sepphoris', 'Tiberias', 'Tarichaea', 'Gischala', 'Ptolemais', 'Scythopolis'];
        if (dateGE(g.date, 356, 1) && GALILEE.every((n) => h.controls(ctx, 'JUD', n))) {
          h.endGame(ctx, {
            result: 'win',
            title: 'The Galilee Held',
            text: 'Six towns and the roads between them, held through the years the Empire had '
              + 'nothing to spare — and the Empire has learned the lesson it learns slowest, '
              + 'which is that a country it cannot afford to reconquer is a country it '
              + 'negotiates with. Ammianus will give this a page instead of a sentence.',
            score: 200,
          });
          return;
        }
        // The long win: a sovereign Jewish country that is still there after
        // the one emperor who would have helped it is dead — which is the
        // moment the fourth century resumes and never stops again.
        if (dateGE(g.date, 364, 1) && judAlive && !judTag.overlord && judProvs >= 4) {
          h.endGame(ctx, {
            result: 'win',
            title: 'A Country in the Fourth Century',
            text: 'Julian is dead in Persia, the altars are cold again, and the law goes back to '
              + 'being written by men who think this state should not exist. It exists. Of every '
              + 'thing that could be said about the rising at Diocaesarea, that one was never '
              + 'available to be said.',
            score: 150,
          });
          return;
        }
        // Extinguished, and not merely occupied. The chapter's own answer to
        // Ursicinus is "into the hills, let him have the towns" — a state that
        // ended the campaign the moment every town was under siege would be
        // punishing the one option the sources say actually kept people
        // alive. So the verdict wants the ground GONE (owned, not merely
        // controlled), the host gone, and no manpower left to raise another.
        const judOwned = judAlive ? h.countOwned(ctx, 'JUD', {}) : 0;
        const judPool = (judTag && judTag.manpower) || 0;
        if (!judAlive || (judOwned === 0 && judProvs === 0
            && totalMen(ctx, 'JUD') < 1200 && judPool < 1500)) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'Ursicinus Came Through',
            text: 'Diocaesarea is levelled, the towns of the lake are burned, and the schools in '
              + 'them are scattered to where the next century will find them. In the history '
              + 'that happened this took one season and a sentence and a half. It reads the '
              + 'same at any length.',
            score: 0,
          });
          return;
        }
      } else if (g.playerTag === who(ctx, 'ROM')) {
        if (dateGE(g.date, 354, 1) && !judAlive) {
          h.endGame(ctx, {
            result: 'win',
            title: 'A Sentence and a Half',
            text: 'The province is quiet, the towns are rebuilt at their own expense, and the '
              + 'affair is closed with the brevity the Empire reserves for things that were '
              + 'never allowed to become important. Ammianus will mention it while explaining '
              + 'something else.',
            score: 200,
          });
          return;
        }
        if (dateGE(g.date, 357, 1) && judAlive && judProvs >= 6) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The Galilee Is Gone',
            text: 'A Caesar was sent east to hold the frontier and has instead presided over the '
              + 'loss of a province to farmers with a stolen armoury, while Persia takes the '
              + 'Khabur line at leisure. Constantius does not forgive administrative failure; '
              + 'the family has a procedure for it.',
            score: 0,
          });
          return;
        }
      }
    } catch (e) { warnOnce('checkVictory', e); }
  },
};
