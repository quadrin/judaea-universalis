// Judaea Universalis — bookmark: The Persian Gambit, 614 CE (SPEC §9.1).
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Historical spine: the last great war of antiquity (602–628): Khosrow II's
// armies under Shahrbaraz take Syria and Palestine; the Jews of Galilee under
// Benjamin of Tiberias and Nehemiah ben Hushiel march with them; Jerusalem
// falls in May 614 and for three years Jewish governance returns to the city —
// until Persia trades its allies away. Then Heraclius comes back from the sea.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[bookmark_614ce] ' + key, e || '');
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
// content package asks after them by the names its chapter shipped with. The
// forwarding address lives on the game state, so this reads it without needing
// a ctx it was never given.
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

// ---- the political map of May 614, built from region lists -----------------
const SAS_LANDS = [
  // the Persian homeland and the Mesopotamia it never lost
  'Seleucia-Ctesiphon', 'Babylon', 'Nehardea', 'Uruk', 'Charax', 'Ecbatana',
  'Susa', 'Gazaca', 'Persepolis', 'Gabae', 'Gerrha', 'Dura-Europos', 'Hatra', 'Assur', 'Singara', 'Arbela',
  'Nisibis', 'Edessa', 'Carrhae',
  // Persarmenia and the upper Euphrates, taken 607-611
  'Tigranocerta', 'Sophene', 'Amida', 'Melitene', 'Samosata', 'Zeugma', 'Cyrrhus',
  // Syria, taken 610-613
  'Beroea', 'Antioch', 'Seleucia Pieria', 'Laodicea', 'Apamea', 'Emesa',
  'Chalcis', 'Damascus', 'Palmyra',
];
const JUD_LANDS = [
  // Benjamin of Tiberias' Galilee, in arms beside the Persian advance
  'Sepphoris', 'Jotapata', 'Tiberias', 'Tarichaea', 'Gischala',
];
const GHA_LANDS = [
  // the phylarchate and the tribes it answers for
  'Bostra', 'Philadelphia', 'Medaba', 'Gerasa', 'Hegra', 'Dumatha', 'Tayma',
];
// Everything else on the map is the Empire's: Palestine, Phoenicia, Anatolia,
// Cyprus, Egypt, and the Petra corridor.
const BYZ_LANDS = [
  'Jerusalem', 'Jericho', 'Emmaus', 'Lydda', 'Joppa', 'Masada', 'Engaddi',
  'Gadora', 'Machaerus', 'Gaza', 'Ascalon', 'Azotus', 'Jamnia', 'Hebron',
  'Adora', 'Sebaste', 'Neapolis', 'Antipatris', 'Caesarea Maritima', 'Dora',
  'Ptolemais', 'Scythopolis', 'Pella', 'Gadara', 'Caesarea Philippi',
  'Batanea', 'Gamala', 'Tyre', 'Sidon', 'Berytus', 'Byblos', 'Tripolis',
  'Aradus', 'Tarsus', 'Iconium', 'Tyana', 'Pisidia', 'Attalia',
  'Seleucia Trachea', 'Caesarea Mazaca', 'Pelusium', 'Rhinocolura',
  'Alexandria', 'Athribis', 'Leontopolis', 'Memphis', 'Arsinoe',
  'Oxyrhynchus', 'Thebes', 'Myos Hormos', 'Salamis', 'Paphos', 'Petra',
  'Oboda', 'Aila',
  // v5.0: the empire's west — Hellas, Crete, Cyrenaica, Upper Egypt
  'Corinth', 'Athens', 'Sparta', 'Gortyn', 'Rhodes', 'Halicarnassus',
  'Cyrene', 'Marmarica', 'Paraetonium', 'Syene', 'Berenice',
  // v5.4: the wider frame — Italy and Sicily (the Ravenna exarchate's south),
  // Tripolitania, the Balkan and Anatolian themes, the City itself, Lazica.
  // CORRECTED (SPEC §173): Capua is not in this list any more — the plain of
  // Campania answered to the Lombard dukes of Benevento by 614, and Naples
  // was the Byzantine enclave inside it, which at this cell size means the
  // cell is Lombard. The political map seats LMB there.
  'Roma', 'Tarentum', 'Brundisium', 'Rhegium', 'Panormus', 'Syracusae',
  'Oea', 'Leptis Magna', 'Macomades',
  'Dyrrhachium', 'Thessalonica', 'Hadrianopolis', 'Byzantion',
  'Nicaea', 'Smyrna', 'Ancyra', 'Sinope', 'Trapezus', 'Phasis',
];

const OWNERS = {};
for (const n of SAS_LANDS) OWNERS[n] = 'SAS';
for (const n of JUD_LANDS) OWNERS[n] = 'JUD';
for (const n of GHA_LANDS) OWNERS[n] = 'GHA';
for (const n of BYZ_LANDS) OWNERS[n] = 'BYZ';
// v5.0: the Hejaz oases belong to the dormant Caliphate — quiet neutral towns
// until the Hijra events wake the tag (Khaybar keeps its Jewish farmers).
OWNERS['Yathrib'] = 'RSH';
OWNERS['Khaybar'] = 'RSH';
// v5.4: the Sasanian Caucasus and the Caspian shore
OWNERS['Caucasian Albania'] = 'SAS';
OWNERS['Hyrcania'] = 'SAS';

// ---- the map of faiths, six centuries on ------------------------------------
// Christianity nearly everywhere Rome or Persia rules settled land; Judaism in
// Galilee and Babylonia; the Samaritans on their mountain; the fire temples in
// the Iranian heartland.
const RELIGIONS = {};
for (const n of SAS_LANDS.concat(GHA_LANDS, BYZ_LANDS)) RELIGIONS[n] = 'christianity';
for (const n of ['Seleucia-Ctesiphon', 'Ecbatana', 'Susa', 'Gazaca', 'Assur', 'Singara',
  'Caucasian Albania', 'Hyrcania']) RELIGIONS[n] = 'zoroastrianism';
for (const n of JUD_LANDS.concat(['Nehardea', 'Arbela', 'Khaybar'])) RELIGIONS[n] = 'judaism';
RELIGIONS['Neapolis'] = 'samaritanism';
RELIGIONS['Sebaste'] = 'samaritanism';

export const BOOKMARK_614 = {
  id: '614ce',
  name: 'The Persian Gambit',
  startDate: { y: 614, m: 5, d: 1 },
  // SPEC §121: the year after which this chapter's own undated trigger
  // cards stop belonging to anybody — the Persian conquest and the century it opened.
  // A card that legitimately runs later says so with its own maxYear.
  generationHorizon: 700,
  // Technology of the age (SPEC §22): thematic regulars and armored lancers.
  techBase: 10,
  // How far up the ladder this age can climb (SPEC §99). Heraclius' world reaches the thematic regulars and stops there — the
  // gunpowder patterns belong to ages this bookmark never sees (SPEC §99).
  techCeiling: 13,
  techTweaks: { SAS: { mar: 1 }, BYZ: { gov: 1 } },
  // The rungs' own names (SPEC §179): the arts of the last war of antiquity —
  // a Return governed from the academies, financed from Babylonia, and
  // fortified against the day Persia changes its mind.
  techNames: {
    gov: {
      9: 'The Prefect\'s Remnant', 10: 'The Community Rolls', 11: 'The Rule of the Learned',
      12: 'The Standing Chancery', 13: 'The Restored Polity',
    },
    infl: {
      9: 'The Synagogue Post', 10: 'The Exilarch\'s Purse', 11: 'The Ctesiphon Embassy',
      12: 'The Two Courts Played', 13: 'The World\'s Correspondence',
    },
    mar: {
      9: 'The City Wards', 10: 'The Returned Levies', 11: 'The Persian Pattern',
      12: 'The Refortified City', 13: 'The Thematic Regulars',
    },
  },
  popMult: 0.8, // the late-antique world, thinner than 1948 but denser than the Hasmoneans' (SPEC §56)

  // The map speaks its era (SPEC §25): Byzantine and Sasanian names.
  provinceNames: {
    'Salamis': 'Constantia',      // rebuilt and renamed after the 4th-century quakes
    'Persepolis': 'Istakhr',      // the Sasanian town beside the dead palaces
    'Gabae': 'Spahan',            // Middle Persian, before Isfahan
    'Byzantion': 'Constantinople', // v5.4: the City, at last on the map
    'Ecbatana': 'Hamadan',        // the Middle Persian name
    'Dura-Europos': 'Circesium',  // Dura is dust; Circesium holds the Euphrates reach
    'Charax': 'Maishan',          // the old port is now the Maishan district
  },

  // The victors' pens wait on the land being truly theirs (SPEC §66): a name
  // below is written on a province only once its owner has integration at 1
  // or its own people settled there; until then — and again the moment it
  // changes hands — the labels keep the era's names above.
  integratedNames: {
    // The Arab pen writes the conquest's actual 7th-century names: Iliya from
    // Aelia (Bayt al-Maqdis is a later usage), and the forms the Arabic
    // geographers fixed for the towns of Filastin and al-Urdunn.
    RSH: {
      'Jerusalem': 'Iliya', 'Caesarea Maritima': 'Qaysariyya',
      'Scythopolis': 'Baysan', 'Ptolemais': 'Akka', 'Neapolis': 'Nablus',
      'Emmaus': 'Imwas', 'Hebron': 'al-Khalil', 'Tiberias': 'Tabariyya',
      'Sepphoris': 'Saffuriyya', 'Gaza': 'Ghazza', 'Damascus': 'Dimashq',
    },
    // The Hebrew pen restores the names the Greek administration wrote over.
    JUD: {
      'Ptolemais': 'Akko', 'Scythopolis': 'Beit She\'an',
      'Sepphoris': 'Tzippori', 'Azotus': 'Ashdod', 'Ascalon': 'Ashkelon',
      'Joppa': 'Yafo', 'Neapolis': 'Shechem',
    },
    // A proclaimed Kingdom of Israel keeps Judaea's Hebrew pen (alias table).
    MLI: 'JUD',
    // No Byzantine pen: the era's names above are already the Empire's.
  },

  blurb: 'The Roman and Persian empires are killing each other at last, totally, after '
    + 'seven hundred years of border wars. Shahrbaraz has taken Damascus and marches on '
    + 'Jerusalem; beside his lancers ride thousands of Jewish fighters under Nehemiah ben '
    + 'Hushiel, who believe — with reason — that the King of Kings will give them back '
    + 'their city. The True Cross, the Empire, and every certainty of six centuries are '
    + 'about to change hands.',

  // RSH begins off-map and dormant. Dated world events awaken it after the
  // Hijra and bring its armies through the northern Arabian map edge.
  // The map wears its era's shape (SPEC §47): the fortress-towns the Great
  // Revolt consumed were never rebuilt — Jotapata and Gamala fell in 67,
  // Machaerus and Masada by 74 — and their districts answer to their
  // neighbors ever after.
  mergeProvinces: {
    'Jotapata': 'Sepphoris', 'Gamala': 'Batanea',
    'Machaerus': 'Medaba', 'Masada': 'Engaddi',
  },

  // The era's lens on the western tags (SPEC §139, §173).
  tagTweaks: {
    CAL: { name: 'The Picts', description: 'The kingdom beyond the old wall, a generation after Columba came to Iona.' },
    CIM: { name: 'The Danes', description: 'The sea-kings of the Cimbric shore, whom Frankish annals already know by name.' },
    MAU: { name: 'The Moorish Kingdoms', description: 'Altava\'s world: the kings the exarchate pays, fights, and cannot replace.' },
    SAX: {
      name: 'The English Kingdoms', capital: 'Britannia',
      description: 'Æthelfrith\'s generation: seven crowns on a Christian island, most of them still pagan.',
    },
  },

  activeTags: ['BYZ', 'SAS', 'JUD', 'GHA', 'RSH',
    // The political west (SPEC §173): the world Heraclius is losing the year
    // Jerusalem falls — Chlothar's Gaul, Sisebut's Spain, Lombard Italy, the
    // khaganate on the Danube and the Turks he will one day ride to meet.
    // Seated by js/data/political_maps.js.
    'LMB', 'FRK', 'VIS', 'MAU', 'GRM', 'ARO',
    'CAL', 'HIB', 'SAX', 'FRS', 'CIM', 'SCN', 'AES',
    'AVA', 'SLV', 'TRK', 'BGR'],
  // Standing rivalries (SPEC §73): once the jihad state wakes it is the
  // standing enemy of both empires — the truces of the 640s do not soften
  // Medina toward Constantinople or Ctesiphon, so the conquest resumes when
  // the ink dries. (BYZ–SAS is deliberately absent: their great war is fully
  // evented 614–628 and history's exhausted peace should hold afterward.)
  rivalries: [['RSH', 'BYZ'], ['RSH', 'SAS']],
  // Historical friends (SPEC §86): Persia armed the Return, took Jerusalem
  // with Jewish troops, handed the city over — and then took it back three
  // years later and handed it to the Christians. That is a quarrel between
  // friends, not between enemies. A Return that wins Jerusalem back by the
  // sword will be hated for it, and then, if it does not go on choosing
  // Ctesiphon for an enemy, forgiven for it: the two courts need each other
  // against Constantinople far more than they need the grievance. The bond
  // holds only while the realm keeps facing east — swing west and Persia is
  // simply another empire that lost a city. Ghassan is Byzantium's own
  // client by the same rule.
  affinities: [
    ['JUD', 'SAS', { axis: 'alignment', sign: -1 }],
    ['BYZ', 'GHA'],
  ],

  // The Second Temple burned in 70 CE — the Mount stands bare (SPEC §32).
  wonderTweaks: { Jerusalem: null },
  owners: OWNERS,
  religions: RELIGIONS,

  // Whose church is it, really (SPEC §104). The Sasanian state did not
  // persecute belief — it had a Christian physician, a Christian queen and a
  // Christian half of its capital. It persecuted defection from the fire, and
  // it suspected a congregation whose co-religionists ruled the enemy empire.
  // One rule states both halves of the historical asymmetry: the Christians
  // of Mesopotamia carry a suspicion the Jews of Babylonia never did, because
  // there is no Jewish emperor for anyone to suspect them of preferring. The
  // synod at Ctesiphon (`ev_p_not_romes_church`) clears it permanently, which
  // is exactly why the synod was held.
  foreignPatron: {
    christianity: {
      patron: 'BYZ',
      unrest: 1.6,
      minShare: 0.2,
      name: 'The Enemy\'s Church',
      freedFlag: 'churchOfTheEastFree',
    },
  },

  // The gradient, not the sword (SPEC §104). Islam does not begin drifting
  // until the conquest has settled into an assessment — the flag that
  // `ev_p_jizya_gradient` sets — and then it moves at the speed a tax moves a
  // household, over centuries, taking the fire temples fastest (their
  // establishment fell with the state that endowed it) and the Jewish and
  // Samaritan communities slowest.
  faithDrift: {
    islam: {
      from: ['zoroastrianism', 'nabataean'],
      resistedBy: { christianity: 0.45, judaism: 0.72, samaritanism: 0.72 },
      seeds: ['Yathrib', 'Khaybar', 'Tayma', 'Hegra', 'Dumatha'],
      // Islam did not walk from town to town the way the churches did: it
      // arrived with a government, in garrison cities founded for the
      // purpose, and spread outward from those. Every province the Caliphate
      // rules is a seed.
      seedOwner: 'RSH',
      seedShare: 0.15, // the garrison and its households, not the province
      vigor: 0.0011,
      spreadsAlong: 'trade',
      monthlyCap: 0.004,
      curve: (y, ctx) => {
        const f = (ctx && ctx.game && ctx.game.flags) || {};
        if (!f.jizyaAssessed && !f.conversionPressed) return 0;
        const base = 1 / (1 + Math.exp(-(y - 800) / 60));
        return f.conversionPressed ? Math.min(1, base * 2 + 0.15) : base;
      },
    },
  },

  // What the era asks of you (SPEC §33) — shown in the realm panel.
  objectives: {
    JUD: [
      'Win: hold Jerusalem and Caesarea with 8 provinces — a state, not a garrison.',
      'Win: still hold Jerusalem with 4+ provinces in mid-628, when the empires\' war ends.',
      'Crown the chain: the final mission raises the Third House on the Mount.',
      'Lose: the Return extinguished — by either empire.',
    ],
    BYZ: [
      'Win: reach +35 war score against Persia — Khosrow\'s court will sue (accept, or march on Ctesiphon).',
      'Win: the war ended and the Cross home in Jerusalem by 620.',
      'Lose: Alexandria and the East slipping away by 624.',
    ],
  },

  // The court factions (SPEC §34): the realm's internal parties. The engine
  // ticks them for the human player alone; the AI keeps its politics offstage.
  factions: {
    JUD: [
      {
        id: 'fighters', name: 'The Fighters of the Return',
        desc: 'Benjamin of Tiberias\' armed men and everyone who stormed the breach beside the Persians.',
        drift(ctx, t) {
          const g = ctx.game;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.5 : -0.4;
        },
        boon: { name: 'The Breach-Stormers', text: '+5% morale', effects: { moraleMult: 1.05 } },
        bane: { name: 'The Swords Go Home', text: '−15% reinforcement', effects: { reinforceMult: 0.85 } },
        appease: { label: 'Arms for the Return (40 martial points)', cost: { mar: 40 } },
        demand: {
          title: 'The Fighters Ask What They Fought For',
          text: 'They took the city no Jewish army had held in five centuries, and they watch the '
            + 'Persian garrison commanders with narrowing eyes: arm the Return in its own right, '
            + 'or admit the breach was stormed for another empire\'s convenience.',
          grant: { label: 'The Return arms itself', cost: { mar: 50 } },
          refuse: { label: 'Patience — the alliance holds', tooltip: 'The eyes narrow further.' },
        },
      },
      {
        id: 'exilarch', name: 'The Exilarch\'s House',
        desc: 'Babylonian money and Babylonian caution: the oldest Jewish power on earth, and the most careful.',
        drift(ctx, t) { return (t.treasury || 0) > 0 ? 0.4 : -0.4; },
        boon: { name: 'Silver from Mahoza', text: '+8% income', effects: { incomeMult: 1.08 } },
        bane: { name: 'The Purses of Babylon Close', text: '−7% income', effects: { incomeMult: 0.93 } },
        appease: { label: 'Honor the Exilarch (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'Mahoza Counsels Caution',
          text: 'The Exilarch\'s letters are masterpieces of the conditional: the House will fund '
            + 'what endures, not what blazes. Show Babylon a state — budgets, garrisons, quiet '
            + 'roads — and the silver flows; show it a bonfire and it warms its hands from afar.',
          grant: { label: 'Show them a state', cost: { infl: 50 } },
          refuse: { label: 'The bonfire is the point', tooltip: 'The hands warm from afar.' },
        },
      },
      {
        id: 'priests', name: 'The Priests of the Mount',
        desc: 'The men who kept the genealogies five hundred years for exactly this: the altar, dreamed nightly.',
        drift(ctx, t) {
          try { return ctx.helpers.controls(ctx, 'JUD', 'Jerusalem') ? 0.5 : -0.7; } catch (e) { return 0; }
        },
        boon: { name: 'The Altar Dreamed', text: '+0.3 legitimacy a month', effects: { legitimacyAdd: 0.3 } },
        bane: { name: 'The Dream Deferred', text: '+1 unrest everywhere', effects: { unrestAll: 1 } },
        appease: { label: 'Provision the courses (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Priests Ask for the Mount',
          text: 'The genealogies are proved, the vessels are begun, and the piyyutim already '
            + 'rehearse the restored service. The courses ask for workmen, stone and a date — '
            + 'the Mount has waited five centuries and refuses to wait politely.',
          grant: { label: 'Workmen, stone, a date', cost: { gov: 50 } },
          refuse: { label: 'The hour is not yet', tooltip: 'The piyyutim acquire a mournful verse.' },
        },
      },
    ],
    BYZ: [
      {
        id: 'church', name: 'The Church',
        desc: 'Patriarch Sergius and the wealth of a thousand altars: the empire\'s soul, and its last credit line.',
        drift(ctx, t) { return (t.stability || 0) >= 1 ? 0.4 : -0.4; },
        boon: { name: 'The Patriarch\'s Blessing', text: '+0.3 legitimacy a month', effects: { legitimacyAdd: 0.3 } },
        bane: { name: 'The Plate Withheld', text: '−7% income', effects: { incomeMult: 0.93 } },
        appease: { label: 'Endow the churches (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Church Presents the Loan',
          text: 'The melted plate of a thousand churches marches in your pay-chests, and Sergius '
            + 'reminds the crown — gently, liturgically — that God\'s loan bears interest in '
            + 'churches rebuilt and heresies suppressed. Begin repaying, in stone or in zeal.',
          grant: { label: 'Rebuild what burned', cost: { treasury: 120 } },
          refuse: { label: 'Victory first, ledgers after', tooltip: 'The liturgy acquires an edge.' },
        },
      },
      {
        id: 'army', name: 'The Army',
        desc: 'What remains of Rome\'s field forces: rebuilt by one man\'s will, paid with one Church\'s plate.',
        drift(ctx, t) {
          const g = ctx.game;
          if ((t.treasury || 0) < 0) return -0.7;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.4 : -0.2;
        },
        boon: { name: 'The Reformed Ranks', text: '+4% discipline', effects: { disciplineMult: 1.04 } },
        bane: { name: 'The Themes Grumble', text: '−6% morale', effects: { moraleMult: 0.94 } },
        appease: { label: 'The donative (100 talents)', cost: { treasury: 100 } },
        demand: {
          title: 'The Army Asks for Its Arrears',
          text: 'The ranks that survived Antioch and the long retreat have been paid in halves and '
            + 'promises since before the Persians reached the sea. An emperor who marches with '
            + 'his men, they say, should also pay with them.',
          grant: { label: 'The arrears in full', cost: { treasury: 150 } },
          refuse: { label: 'The empire\'s need is the pay', tooltip: 'The promises stop being believed.' },
        },
      },
      {
        id: 'demes', name: 'The Demes',
        desc: 'The Blues and Greens of the Hippodrome: mobs, militias and the loudest opinion in the City.',
        drift(ctx, t) { return (t.warExhaustion || 0) <= 5 ? 0.3 : -0.5; },
        boon: { name: 'The Factions Man the Walls', text: '+10% manpower', effects: { manpowerMult: 1.1 } },
        bane: { name: 'Riot in the Hippodrome', text: '+1.25 unrest everywhere', effects: { unrestAll: 1.25 } },
        appease: { label: 'Races and bread (80 talents)', cost: { treasury: 80 } },
        demand: {
          title: 'The Demes Want the Races',
          text: 'The grain dole is finished, the Persians hold the Asian shore, and the Blues and '
            + 'Greens agree on one thing for the first time in living memory: the City needs races, '
            + 'bread and the sight of its emperor. Emperors who forget the Hippodrome are remembered '
            + 'by it.',
          grant: { label: 'The races run', cost: { treasury: 120 } },
          refuse: { label: 'The City must fast with the army', tooltip: 'The factions agree a second time.' },
        },
      },
    ],
  },
  playableTags: [
    {
      tag: 'JUD',
      difficulty: 'Hard',
      blurb: 'For the first time since Bar Kokhba, Jewish soldiers march on Jerusalem '
        + 'with a great power beside them. Take the city, restore what can be restored — '
        + 'and never forget that your ally is an empire, and empires trade. When Persia '
        + 'sells you (and it will try), be strong enough to be worth more unsold.',
    },
  ],

  // Pre-existing works (SPEC §58): the two imperial harbors still standing
  // after three centuries of Christian empire.
  buildings: {
    'Byzantion': ['shipyard', 'market'],  // the Golden Horn
    'Alexandria': ['shipyard', 'granary'], // the grain fleet's home
  },

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

    // --- Starting fleets (SPEC §58): the sea is the one element Heraclius
    // still commands outright. ---
    h.spawnFleet(ctx, 'BYZ', 'Byzantion', 8, { name: 'The Imperial Fleet' });

    if (g.tags.RSH) g.tags.RSH.alive = false;

    // The Ghassanid phylarchate still answers the Empire.
    if (g.tags.GHA) g.tags.GHA.overlord = 'BYZ';

    // --- The last great war of antiquity: Persia and the rising against the Empire.
    h.declareWar(ctx, 'SAS', 'BYZ', 'The Last Great War of Antiquity');
    try {
      const w = findWar(g, 'SAS', 'BYZ');
      if (w) {
        w.noNegotiation = true; // only Nineveh or the walls of Constantinople end this
        const sasSide = (w.attackers || []).indexOf('SAS') !== -1 ? w.attackers : w.defenders;
        if (sasSide.indexOf('JUD') === -1) sasSide.push('JUD');
        if (w.warscore && w.warscore.JUD === undefined) w.warscore.JUD = 0;
      }
      const jud = g.tags.JUD, sas = g.tags.SAS, byz = g.tags.BYZ;
      if (jud && byz) {
        if (jud.atWarWith.indexOf('BYZ') === -1) jud.atWarWith.push('BYZ');
        if (byz.atWarWith.indexOf('JUD') === -1) byz.atWarWith.push('JUD');
        if (jud.atWarWith.indexOf('GHA') === -1) jud.atWarWith.push('GHA');
        if (g.tags.GHA && g.tags.GHA.atWarWith.indexOf('JUD') === -1) g.tags.GHA.atWarWith.push('JUD');
      }
      if (jud && sas) {
        if (jud.allies.indexOf('SAS') === -1) jud.allies.push('SAS');
        if (sas.allies.indexOf('JUD') === -1) sas.allies.push('JUD');
      }
    } catch (e) { warnOnce('setup:war', e); }

    // --- Treasuries, manpower, stability. ---
    h.adjust(ctx, 'BYZ', { treasury: 300, manpower: 20000, stability: -1, legitimacy: 35 }); // Phocas' corpse is barely cold
    h.adjust(ctx, 'SAS', { treasury: 500, manpower: 25000, stability: 2, legitimacy: 70 });
    h.adjust(ctx, 'JUD', { treasury: 100, manpower: 6000, stability: 1, legitimacy: 20 });
    h.adjust(ctx, 'GHA', { treasury: 50 });

    // --- Opinions. ---
    setOpinion(g, 'SAS', 'BYZ', -200); setOpinion(g, 'BYZ', 'SAS', -200);
    setOpinion(g, 'JUD', 'BYZ', -170); setOpinion(g, 'BYZ', 'JUD', -150);
    setOpinion(g, 'JUD', 'SAS', 90);   setOpinion(g, 'SAS', 'JUD', 60); // warmer on one side than the other
    setOpinion(g, 'GHA', 'BYZ', 60);   setOpinion(g, 'BYZ', 'GHA', 50);

    // --- Starting modifiers. ---
    h.addTagModifier(ctx, 'SAS', {
      id: 'high_tide', name: 'The High Tide', months: 48,
      effects: { moraleMult: 1.1 },
    });
    h.addTagModifier(ctx, 'BYZ', {
      id: 'empire_reeling', name: 'The Empire Reels', months: 24,
      effects: { incomeMult: 0.85 },
    });
    h.addTagModifier(ctx, 'JUD', {
      id: 'return_to_zion', name: 'The Return to Zion', months: 36,
      effects: { moraleMult: 1.15, manpowerMult: 1.1 },
    });
    // The Return fields an army because it marches inside Persia's invasion,
    // using Persian magazines and roads. That support lasts only until
    // Ctesiphon decides the client has become more expensive than useful.
    h.addTagModifier(ctx, 'JUD', {
      id: 'persian_supply_trains', name: 'Persian Supply Trains', months: 38,
      // adminMult (SPEC §52): Ctesiphon's silver carries the Return's clerks
      // as well as its rations while the client is useful.
      effects: { maintMult: 0.65, reinforceMult: 1.08, adminMult: 0.5 },
    });

    // --- Starting armies. ---
    // Persia: Shahrbaraz before Jerusalem's road, Shahin on the Anatolian front.
    h.spawnArmy(ctx, 'SAS', 'Damascus', {
      inf: 12, cav: 8, name: 'Army of Shahrbaraz',
      general: { name: 'Shahrbaraz', fire: 3, shock: 4, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'SAS', 'Melitene', {
      inf: 8, cav: 5, name: 'Army of Shahin',
      general: { name: 'Shahin', fire: 2, shock: 3, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'SAS', 'Seleucia-Ctesiphon', { inf: 8, cav: 4, name: 'The Royal Reserve' });

    // The rising: Benjamin's Galileans, Nehemiah's column with the Persians.
    h.spawnArmy(ctx, 'JUD', 'Tiberias', {
      inf: 5, name: 'Host of Benjamin',
      general: { name: 'Benjamin of Tiberias', fire: 1, shock: 2, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'JUD', 'Tiberias', {
      inf: 3, name: "Nehemiah's Column",
      general: { name: 'Nehemiah ben Hushiel', fire: 2, shock: 2, maneuver: 2 },
    });

    // The Empire: Palestine garrisons, Egypt under Nicetas, the Anatolian line.
    h.spawnArmy(ctx, 'BYZ', 'Jerusalem', { inf: 4, name: 'Garrison of the Holy City' });
    h.spawnArmy(ctx, 'BYZ', 'Caesarea Maritima', { inf: 3, name: 'Palaestina Field Force' });
    h.spawnArmy(ctx, 'BYZ', 'Alexandria', {
      inf: 8, cav: 1, name: 'Army of Nicetas',
      general: { name: 'Nicetas', fire: 2, shock: 2, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'BYZ', 'Iconium', {
      inf: 9, cav: 2, name: 'Army of the Anatolics',
      general: { name: 'Philippicus', fire: 2, shock: 2, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'BYZ', 'Salamis', { inf: 1, name: 'Cyprus Garrison' });
    h.spawnArmy(ctx, 'GHA', 'Bostra', { inf: 4, cav: 2, name: 'The Phylarch\'s Riders' });

    h.notify(ctx, {
      title: 'The Persian Gambit',
      text: 'Shahrbaraz marches from Damascus on the Holy City, and the fighters of '
        + 'Galilee march with him. Six centuries turn on the next two years.',
      type: 'war', provName: 'Jerusalem',
    });
  },

  // Courts of May 614.
  rulers: {
    BYZ: { name: 'Heraclius', title: 'Basileus', gov: 3, infl: 3, mar: 4, age: 39 },
    SAS: { name: 'Khosrow II', title: 'King of Kings', gov: 3, infl: 4, mar: 3, age: 44 },
    JUD: { name: 'Nehemiah ben Hushiel', title: 'Prince of the Return', gov: 2, infl: 3, mar: 3, age: 30 },
    GHA: { name: 'Jabala', title: 'Phylarch', gov: 2, infl: 2, mar: 3, age: 42 },
    RSH: { name: 'Abu Bakr', title: 'Successor to the Messenger', gov: 3, infl: 4, mar: 3, age: 41 },
    // The political west (SPEC §173): Chlothar has ruled ALL the Franks for
    // one year; Sisebut — scholar, poet, and the king whose forced baptisms
    // this chapter's own refugees are fleeing — for two; Agilulf has two
    // left; Æthelfrith dies at the Idle in two more. The Avar khagan of these
    // years is Bayan's second son, whom no source names.
    FRK: { name: 'Chlothar II', title: 'King of the Franks', gov: 3, infl: 3, mar: 3, age: 30 },
    VIS: { name: 'Sisebut', title: 'King', gov: 4, infl: 3, mar: 3, age: 40 },
    LMB: { name: 'Agilulf', title: 'King', gov: 3, infl: 3, mar: 3, age: 60,
      heir: { name: 'Adaloald', gov: 1, infl: 1, mar: 1, age: 12 } },
    SAX: { name: 'Æthelfrith', title: 'King of Bernicia and Deira', gov: 2, infl: 1, mar: 4, age: 42 },
    AVA: { name: 'The Khagan', title: 'Khagan of the Avars', gov: 2, infl: 3, mar: 4, age: 45 },
    TRK: { name: 'Sheguy', title: 'Yabghu Khagan', gov: 3, infl: 3, mar: 3, age: 40 },
    HIB: { name: 'Máel Cobo mac Áedo', title: 'High King', gov: 2, infl: 2, mar: 2, age: 40 },
  },

  missions: {
    JUD: [
      {
        id: 'p_jerusalem', name: 'The City of the Great King',
        icon: 'temple', col: 1,
        desc: 'Stand in Jerusalem — control the Holy City.',
        rewardText: '+20 legitimacy, +25 influence points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Jerusalem'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 20, infl: 25 }),
      },
      {
        id: 'p_host', name: 'The Watchmen on the Walls',
        icon: 'spears', col: 0, requires: ['p_jerusalem'],
        desc: 'Field ten thousand men — the Return must be able to defend itself.',
        rewardText: '"The Remnant Armed": +10% manpower for 24 months.',
        check: (ctx) => totalMen(ctx, 'JUD') >= 10000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'remnant_armed', name: 'The Remnant Armed', months: 24, effects: { manpowerMult: 1.1 },
        }),
      },
      {
        id: 'p_coast', name: 'A Window on the Sea',
        icon: 'ship', col: 2, requires: ['p_jerusalem'],
        desc: 'Take Caesarea Maritima — a state without a port is a state on sufferance.',
        rewardText: '+75 talents (the customs house).',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Caesarea Maritima'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { treasury: 75 }),
      },
      {
        id: 'p_hills', name: 'The Heartland Whole',
        icon: 'mountain', col: 1, requires: ['p_jerusalem'],
        desc: 'Control Jerusalem, Hebron, Jericho and Emmaus together.',
        rewardText: '+15 legitimacy, +25 governance points.',
        check: (ctx) => ['Jerusalem', 'Hebron', 'Jericho', 'Emmaus'].every((n) => ctx.helpers.controls(ctx, 'JUD', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 15, gov: 25 }),
      },
      {
        id: 'p_worth_more_unsold', name: 'Worth More Unsold',
        icon: 'lamp', col: 1, requires: ['p_host', 'p_hills'],
        desc: 'Still stand — alive, five provinces — in 620, after Persia has weighed selling you.',
        rewardText: '+1 stability, +20 legitimacy.',
        check: (ctx) => dateGE(ctx.game.date, 620, 1) && ctx.helpers.countControlled(ctx, 'JUD', {}) >= 5,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { stability: 1, legitimacy: 20 }),
      },
      {
        // SPEC §32: Nehemiah ben Hushiel's dream — five centuries after the
        // fire, the sacrifices resume on the Mount.
        id: 'p_third_temple', name: 'Raise the Third House',
        icon: 'shrine', col: 1, requires: ['p_worth_more_unsold'],
        desc: 'Hold Jerusalem with 500 talents in the treasury and the realm steady (stability +1) — begin the sacrifices again.',
        rewardText: 'The Third Temple rises: −300 talents; +20 legitimacy, and the Temple\'s yield (+1 governance point, +0.2 legitimacy a month) returns to Jerusalem\'s keeper. A wonder stands on the map again.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')
          && (ctx.game.tags.JUD.treasury || 0) >= 500
          && (ctx.game.tags.JUD.stability || 0) >= 1,
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { treasury: -300, legitimacy: 20 });
          const p = ctx.prov && ctx.prov('Jerusalem');
          if (p) p.wonder = 'temple';
        },
      },
      // The age's curriculum (SPEC §179), appended AFTER the capstone so the
      // Third House keeps its table seat (smoke16 forces the chain by index).
      {
        id: 'p_walls_manned', name: 'A City That Can Refuse',
        icon: 'walls', col: 0, requires: ['p_host'],
        desc: 'Whatever Persia decides, be expensive: reach Military 12 — The Refortified City.',
        rewardText: '"The Breaches Closed": +1 to hill-country defense for 36 months.',
        check: (ctx) => (((ctx.game.tags.JUD || {}).tech || {}).mar | 0) >= 12,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'breaches_closed', name: 'The Breaches Closed', months: 36, effects: { hillDefBonus: 1 },
        }),
      },
      {
        id: 'p_rule_of_law', name: 'The Academies Govern',
        icon: 'scroll', col: 2, requires: ['p_coast'],
        desc: 'Take up three ideas of the age — four centuries of law must now run a state.',
        rewardText: '+25 governance points, +10 legitimacy.',
        check: (ctx) => eraTiers(ctx.game.tags.JUD) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { gov: 25, legitimacy: 10 }),
      },
      // The empty ground made specific (SPEC §187): where a kingdom actually
      // marches when neither empire can field an army — the Phoenician coast,
      // the King's Highway, and the granary the Persians showed the way to.
      {
        id: 'p_phoenicia', name: 'The Ladder of Tyre',
        icon: 'walls', col: 0, row: 3, requires: ['p_walls_manned'],
        desc: 'Take Tyre and Sidon — the fortified coast that has flanked every army '
          + 'that ever marched on Jerusalem from the north.',
        rewardText: '+100 talents (the purple and the customs), +10 legitimacy.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Tyre')
          && ctx.helpers.controls(ctx, 'JUD', 'Sidon'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { treasury: 100, legitimacy: 10 }),
      },
      {
        id: 'p_kings_highway', name: 'The King\'s Highway',
        icon: 'horseshoe', col: 2, row: 3, requires: ['p_rule_of_law'],
        desc: 'Take Damascus and Bostra — the two ends of the road every conqueror of '
          + 'this country has used, held for once from the middle.',
        rewardText: '"The Highway Held": +8% income, permanently.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Damascus')
          && ctx.helpers.controls(ctx, 'JUD', 'Bostra'),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'the_highway_held', name: 'The Highway Held', months: -1,
          effects: { incomeMult: 1.08 },
        }),
      },
      {
        id: 'p_granary', name: 'The Granary of the World',
        icon: 'grain', col: 1, row: 4, requires: ['p_coast'],
        desc: 'Take Alexandria and Pelusium — the wheat that fed Constantinople, and the '
          + 'largest Jewish city on earth outside the Land, under the crown\'s law.',
        rewardText: '+150 talents, +2,000 manpower — the diaspora of Egypt enlists.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Alexandria')
          && ctx.helpers.controls(ctx, 'JUD', 'Pelusium'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { treasury: 150, manpower: 2000 }),
      },
      // ── The century the Return has to hold (SPEC §197) ──────────────────
      // The chapter runs to 692 — through Heraclius, the Arab conquest and
      // the Dome. These are what a Jewish polity has to build to still be
      // there when the third empire arrives.
      {
        id: 'p_the_mint_of_the_return', name: 'The Coinage of the Return',
        icon: 'coins', col: 1, row: 5, requires: ['p_granary'],
        desc: 'Nehemiah ben Hushiel governed Jerusalem for three years and the record of it '
          + 'is an argument about coins. Bank 500 talents and strike a currency the whole '
          + 'Levant has to price against.',
        rewardText: '"The Silver of the Return": +12% income and +0.2 legitimacy a month, permanent.',
        check: (ctx) => ((ctx.game.tags[who(ctx, 'JUD')] || {}).treasury || 0) >= 500,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'silver_of_the_return', name: 'The Silver of the Return', months: -1,
          effects: { incomeMult: 1.12, legitimacyAdd: 0.2 },
        }),
      },
      {
        id: 'p_the_desert_frontier', name: 'The Desert Frontier',
        icon: 'walls', col: 0, row: 4, requires: ['p_phoenicia'],
        desc: 'Every power that has ever taken this country took it from the south-east, and '
          + 'the next one is being assembled in the Hijaz while Persia and Byzantium bleed '
          + 'each other white. Hold Bostra and Petra before somebody else needs them.',
        rewardText: '"The Southern Watch": +8% morale, +1 stability.',
        check: (ctx) => ['Bostra', 'Petra'].every((n) => ctx.helpers.controls(ctx, 'JUD', n)),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JUD', {
            id: 'the_southern_watch', name: 'The Southern Watch', months: -1, effects: { moraleMult: 1.08 },
          });
          ctx.helpers.adjust(ctx, 'JUD', { stability: 1 });
        },
      },
      {
        id: 'p_a_state_that_outlives_its_patron', name: 'A State That Outlives Its Patron',
        icon: 'tower', col: 2, row: 4, requires: ['p_kings_highway'],
        desc: 'This polity exists because Khosrow found it useful, and Khosrow will be '
          + 'murdered by his own son in a dungeon. Reach Government 8 and +3 stability: a '
          + 'government that does not depend on which empire is winning.',
        rewardText: '"Standing On Its Own": −1 unrest everywhere and +10% income, permanent.',
        check: (ctx) => (((ctx.game.tags[who(ctx, 'JUD')] || {}).tech || {}).gov | 0) >= 8
          && ((ctx.game.tags[who(ctx, 'JUD')] || {}).stability || 0) >= 3,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'standing_on_its_own', name: 'Standing On Its Own', months: -1,
          effects: { unrestAll: -1, incomeMult: 1.1 },
        }),
      },
      {
        id: 'p_the_army_of_the_return', name: 'The Army of the Return',
        icon: 'spears', col: 0, row: 5, requires: ['p_the_desert_frontier'],
        desc: 'The Return marched with Persian columns and garrisoned with volunteers from '
          + 'Galilee and the dispersion. Reach Military 8 with twenty thousand men — an army '
          + 'that does not need a great power to be its spine.',
        rewardText: '"The Host of the Return": +10% discipline and +10% manpower, permanent.',
        check: (ctx) => (((ctx.game.tags[who(ctx, 'JUD')] || {}).tech || {}).mar | 0) >= 8
          && totalMen(ctx, 'JUD') >= 20000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'host_of_the_return', name: 'The Host of the Return', months: -1,
          effects: { disciplineMult: 1.1, manpowerMult: 1.1 },
        }),
      },
      {
        id: 'p_the_gathering', name: 'The Gathering In',
        icon: 'diaspora', col: 2, row: 5, requires: ['p_a_state_that_outlives_its_patron'],
        desc: 'A Jewish government in Jerusalem is a fact every community from Babylonia to '
          + 'Spain has to have an opinion about. Reach 90 legitimacy — the exiles come to a '
          + 'country that is worth coming to.',
        rewardText: '"The Ingathering": +15% growth and +20% from the ascents, permanent.',
        check: (ctx) => ((ctx.game.tags[who(ctx, 'JUD')] || {}).legitimacy || 0) >= 90,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'the_ingathering', name: 'The Ingathering', months: -1,
          effects: { growthMult: 1.15, pilgrimMult: 1.2 },
        }),
      },
      // ── The roads not taken (SPEC §183) ─────────────────────────────────
      // The §119 forks as standing hypotheticals; checks read the markers
      // the fork cards themselves set. Appended after the curriculum so the
      // Third House keeps its table seat (smoke16 forces the chain by index).
      {
        id: 'hy_whose_century', name: 'A Century of Our Own', hypothetical: true,
        fork: '614ce/whose_century',
        icon: 'split', col: 3, row: 0,
        desc: 'Outlast the empires\' war still standing — no overlord, Jerusalem held — and the '
          + 'Return is written down as a polity: the Davidic charter after the betrayal of 622, '
          + 'or a kingdom apart from both thrones.',
        rewardText: '+1 stability, +20 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'charterDavidic', 'kingdomApart'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { stability: 1, legitimacy: 20 }),
      },
      {
        id: 'hy_altar_mount', name: 'What Stands on the Mount', hypothetical: true,
        fork: '614ce/what_stands_on_the_mount',
        icon: 'altar', col: 3, row: 1, requires: ['hy_whose_century'],
        desc: 'Hold Jerusalem outright with six provinces under the charter, and the cleared '
          + 'platform asks its question: the altar restored — the first sacrifice since '
          + 'Titus — or swept, and left as it is.',
        rewardText: '+25 governance points, +10 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'altarRestored', 'mountKeptEmpty'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { gov: 25, legitimacy: 10 }),
      },
      {
        id: 'hy_window_628', name: 'The Window of 628', hypothetical: true,
        fork: '614ce/the_window_of_628',
        icon: 'play', col: 3, row: 2, requires: ['hy_whose_century'],
        desc: 'Reach 628 as a standing kingdom with a marshal worth the name, and both empires '
          + 'have destroyed each other: the one decade this state can expand at all — ground, '
          + 'or depth — before somebody else fills the vacuum.',
        rewardText: '+25 martial points.',
        check: (ctx) => anyFlag(ctx, 'tookTheEmptyGround', 'depthNotReach'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { mar: 25 }),
      },
      {
        id: 'hy_crown_of_david', name: 'The Line of Jehoiachin', hypothetical: true,
        fork: '614ce/the_line_of_jehoiachin',
        icon: 'star8', col: 3, row: 3, requires: ['hy_whose_century'],
        desc: 'Reach east to Nehardea and Babylon and settle the Exilarchate under Jerusalem, '
          + 'and for the first time since 586 BCE a throne and a man with the pedigree share '
          + 'one polity. Crowned, or honoured and kept — the age must answer.',
        rewardText: '+20 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'davidCrowned', 'davidDeclined'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 20 }),
      },
      {
        id: 'hy_exilarchate', name: 'The Other Half of the People', hypothetical: true,
        fork: '614ce/the_exilarchate',
        icon: 'diaspora', col: 4, row: 0, requires: ['hy_whose_century'],
        desc: 'Grow to a Levantine power while Persia comes apart, and the question no '
          + 'generation since the First House could ask arrives: one Jewish government over '
          + 'both centres — the Exilarch under Jerusalem, or two houses, one people.',
        rewardText: '+20 influence points, +10 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'oneCrownBothCentres', 'twoHousesOnePeople'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { infl: 20, legitimacy: 10 }),
      },
      {
        id: 'hy_caliphs_categories', name: 'What the Caliph Will Sign', hypothetical: true,
        fork: '614ce/the_caliphs_categories',
        icon: 'scroll', col: 4, row: 1, requires: ['hy_whose_century'],
        desc: 'Still be standing when the new power out of the south offers its two '
          + 'categories — submission, or treaty on the Nubian pattern — and answer as a '
          + 'state: the tribute signed, or both categories refused to the envoy\'s face.',
        rewardText: '+20 governance points.',
        check: (ctx) => anyFlag(ctx, 'theTreatyState', 'refusedTheCategory'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { gov: 20 }),
      },
      {
        id: 'hy_other_israel', name: 'The Other Israel', hypothetical: true,
        fork: '614ce/the_other_israel',
        icon: 'mountain', col: 4, row: 2,
        desc: 'Govern Jerusalem and Neapolis under one crown, and inherit Justinian\'s '
          + 'statutes against the Keepers of Gerizim — the first Israelite state ever in a '
          + 'position to repeal them, or to keep them running under a new seal.',
        rewardText: '+15 legitimacy, +1 stability.',
        check: (ctx) => anyFlag(ctx, 'twoTorahsPeace', 'oldQuarrelKept'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 15, stability: 1 }),
      },
    ],
    BYZ: [
      {
        id: 'b_line', name: 'Hold the Line',
        icon: 'shield', col: 1,
        desc: 'Keep the Anatolian shield: control Iconium, Attalia and Seleucia Trachea.',
        rewardText: '+25 martial points.',
        check: (ctx) => ['Iconium', 'Attalia', 'Seleucia Trachea'].every((n) => ctx.helpers.controls(ctx, 'BYZ', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'BYZ', { mar: 25 }),
      },
      {
        id: 'b_egypt', name: 'The Granary Held',
        icon: 'grain', col: 0, requires: ['b_line'],
        desc: 'Still hold Alexandria in 617 — the Empire eats Egyptian bread.',
        rewardText: '+25 government points.',
        check: (ctx) => dateGE(ctx.game.date, 617, 1) && ctx.helpers.controls(ctx, 'BYZ', 'Alexandria'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'BYZ', { gov: 25 }),
      },
      {
        id: 'b_fleet', name: 'The Sea Is Roman',
        icon: 'ship', col: 2, requires: ['b_line'],
        desc: 'Keep a fleet of six ships — the Empire\'s last undisputed possession.',
        rewardText: '"Master of the Sea": +10% income for 24 months.',
        check: (ctx) => {
          let ships = 0;
          for (const f of Object.values(ctx.game.fleets || {})) if (f && f.tag === 'BYZ') ships += f.ships || 0;
          return ships >= 6;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'BYZ', {
          id: 'master_of_sea', name: 'Master of the Sea', months: 24, effects: { incomeMult: 1.1 },
        }),
      },
      {
        id: 'b_counter', name: 'The Great Counteroffensive',
        icon: 'swords', col: 2, requires: ['b_fleet'],
        desc: 'Carry the war home: control Amida or Tigranocerta.',
        rewardText: '+25 of every point — the Empire believes again.',
        check: (ctx) => ctx.helpers.controls(ctx, 'BYZ', 'Amida') || ctx.helpers.controls(ctx, 'BYZ', 'Tigranocerta'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'BYZ', { gov: 25, infl: 25, mar: 25 }),
      },
      {
        id: 'b_cross', name: 'The True Cross',
        icon: 'star8', col: 1, requires: ['b_counter'],
        desc: 'Hold Jerusalem again — whatever it takes, however long.',
        rewardText: '+25 legitimacy, +1 stability.',
        check: (ctx) => ctx.helpers.controls(ctx, 'BYZ', 'Jerusalem') && dateGE(ctx.game.date, 616, 1),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'BYZ', { legitimacy: 25, stability: 1 }),
      },
      // The age's curriculum (SPEC §179): the reform that financed survival,
      // and the army it drilled for 622.
      {
        id: 'b_reform', name: 'The Empire Reorganized',
        icon: 'scales', col: 0, requires: ['b_line'],
        desc: 'Half the coinage, all of it paid to soldiers: reach Government 11 — The Rule of the Learned.',
        rewardText: '"The Reform": +8% income for 36 months.',
        check: (ctx) => (((ctx.game.tags.BYZ || {}).tech || {}).gov | 0) >= 11,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'BYZ', {
          id: 'heraclian_purse', name: 'The Reform', months: 36, effects: { incomeMult: 1.08 },
        }),
      },
      {
        id: 'b_army_of_622', name: 'The Army of 622',
        icon: 'helmet', col: 2, requires: ['b_fleet'],
        desc: 'Take up three ideas of the age — the counteroffensive is trained before it is fought.',
        rewardText: '+25 martial points, +10 legitimacy.',
        check: (ctx) => eraTiers(ctx.game.tags.BYZ) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'BYZ', { mar: 25, legitimacy: 10 }),
      },
    ],
  },

  aiHints: {
    BYZ: { rally: ['Iconium', 'Alexandria'], targetRegiments: 40 },
    SAS: { rally: ['Damascus', 'Seleucia-Ctesiphon'], targetRegiments: 45 },
    JUD: { rally: ['Tiberias'], targetRegiments: 12 },
    GHA: { rally: ['Bostra'], targetRegiments: 6 },
    RSH: { rally: ['Hegra', 'Dumatha'], targetRegiments: 42 },
    REB: { rally: [], targetRegiments: 0 },
  },

  checkVictory(ctx) {
    try {
      const g = ctx.game;
      const h = ctx.helpers;
      if (!g || g.over || g.result) return;

      const judTag = g.tags && g.tags[who(ctx, 'JUD')];
      const judAlive = !!(judTag && judTag.alive !== false);
      const judProvs = judAlive ? h.countControlled(ctx, 'JUD', {}) : 0;
      const jerusalemJud = judAlive && h.controls(ctx, 'JUD', 'Jerusalem');

      if (g.playerTag === who(ctx, 'JUD')) {
        // The dream: Jerusalem AND the coast, a real state, before the wheel turns.
        if (jerusalemJud && h.controls(ctx, 'JUD', 'Caesarea Maritima') && judProvs >= 8) {
          h.endGame(ctx, {
            result: 'win',
            title: 'The Kingdom Restored',
            text: 'A Jewish state from the sea to the Jordan, five centuries after the '
              + 'legions burned the last one — held not by Persian favor but by its own '
              + 'walls and spears. Whatever the empires decide at their tables, this is '
              + 'no longer theirs to trade.',
            score: 200,
          });
          return;
        }
        // The historical near-miss survived: still in Jerusalem come 628.
        if (dateGE(g.date, 628, 6) && jerusalemJud && judProvs >= 4) {
          h.endGame(ctx, {
            result: 'win',
            title: 'The Return That Held',
            text: 'Khosrow is dead, Heraclius is master of the East again — and the '
              + 'community in Jerusalem is too strong, too armed, and too useful to '
              + 'evict. The Empire signs, with distaste, a charter it means to break '
              + 'and never can.',
            score: 150,
          });
          return;
        }
        if (!judAlive || (judProvs === 0 && totalMen(ctx, 'JUD') < 2000)) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'Sold and Scattered',
            text: 'Persia traded its allies for a quieter province; the Empire, returning, '
              + 'was crueler than the trade. The rabbis will write of this generation: '
              + 'do not force the end.',
            score: 0,
          });
          return;
        }
      } else if (g.playerTag === who(ctx, 'BYZ')) {
        const w = findWar(g, 'SAS', 'BYZ');
        const byzScore = w && typeof w.warscore.BYZ === 'number' ? w.warscore.BYZ : 0;
        // Mid-war concession (SPEC §32): Khosrow's court sues at +35 — an
        // event card the player may accept or refuse. Offered once.
        if (w && byzScore >= 35 && !h.getFlag(ctx, 'persiaTermsOffered')) {
          h.setFlag(ctx, 'persiaTermsOffered', true);
          h.fireEvent(ctx, 'ev614_persia_sues');
          return;
        }
        // War already over with the Cross home: the win stands on its own.
        if (!w && h.controls(ctx, 'BYZ', 'Jerusalem') && dateGE(g.date, 620, 1)) {
          h.endGame(ctx, {
            result: 'win',
            title: 'The Empire Endures',
            text: 'The fire temples pay for the churches they burned; the Cross returns '
              + 'to Jerusalem on the Emperor\'s own shoulders. It is the greatest victory '
              + 'Rome ever won — and the last, though no one yet knows it, before the '
              + 'armies of a newer faith come out of the south.',
            score: 200,
          });
          return;
        }
        if (dateGE(g.date, 624, 1) && !h.controls(ctx, 'BYZ', 'Alexandria')
            && !h.controls(ctx, 'BYZ', 'Antioch') && !h.controls(ctx, 'BYZ', 'Jerusalem')) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The East Is Lost',
            text: 'Egypt, Syria, Palestine — gone in one reign. The Empire that remains '
              + 'is a walled city with a navy, praying the Persians cannot swim.',
            score: 0,
          });
          return;
        }
      }
    } catch (e) { warnOnce('checkVictory', e); }
  },
};
