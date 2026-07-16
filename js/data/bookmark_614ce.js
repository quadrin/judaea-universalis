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

function findWar(game, a, b) {
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(a) !== -1 && all.indexOf(b) !== -1) return w;
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

// ---- the map of faiths, six centuries on ------------------------------------
// Christianity nearly everywhere Rome or Persia rules settled land; Judaism in
// Galilee and Babylonia; the Samaritans on their mountain; the fire temples in
// the Iranian heartland.
const RELIGIONS = {};
for (const n of SAS_LANDS.concat(GHA_LANDS, BYZ_LANDS)) RELIGIONS[n] = 'christianity';
for (const n of ['Seleucia-Ctesiphon', 'Ecbatana', 'Susa', 'Gazaca', 'Assur', 'Singara']) RELIGIONS[n] = 'zoroastrianism';
for (const n of JUD_LANDS.concat(['Nehardea', 'Arbela', 'Khaybar'])) RELIGIONS[n] = 'judaism';
RELIGIONS['Neapolis'] = 'samaritanism';
RELIGIONS['Sebaste'] = 'samaritanism';

export const BOOKMARK_614 = {
  id: '614ce',
  name: 'The Persian Gambit',
  startDate: { y: 614, m: 5, d: 1 },
  // Technology of the age (SPEC §22): thematic regulars and armored lancers.
  techBase: 10,
  techTweaks: { SAS: { mar: 1 }, BYZ: { gov: 1 } },

  // The map speaks its era (SPEC §25): Byzantine and Sasanian names.
  provinceNames: {
    'Salamis': 'Constantia',      // rebuilt and renamed after the 4th-century quakes
    'Persepolis': 'Istakhr',      // the Sasanian town beside the dead palaces
    'Gabae': 'Spahan',            // Middle Persian, before Isfahan
    'Ecbatana': 'Hamadan',        // the Middle Persian name
    'Dura-Europos': 'Circesium',  // Dura is dust; Circesium holds the Euphrates reach
    'Charax': 'Maishan',          // the old port is now the Maishan district
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

  activeTags: ['BYZ', 'SAS', 'JUD', 'GHA', 'RSH'],

  // The Second Temple burned in 70 CE — the Mount stands bare (SPEC §32).
  wonderTweaks: { Jerusalem: null },
  owners: OWNERS,
  religions: RELIGIONS,

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

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

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
      effects: { maintMult: 0.65, reinforceMult: 1.08 },
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
  },

  missions: {
    JUD: [
      {
        id: 'p_jerusalem', name: 'The City of the Great King',
        desc: 'Stand in Jerusalem — control the Holy City.',
        rewardText: '+20 legitimacy, +25 influence points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Jerusalem'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 20, infl: 25 }),
      },
      {
        id: 'p_host', name: 'The Watchmen on the Walls',
        desc: 'Field ten thousand men — the Return must be able to defend itself.',
        rewardText: '"The Remnant Armed": +10% manpower for 24 months.',
        check: (ctx) => totalMen(ctx, 'JUD') >= 10000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'remnant_armed', name: 'The Remnant Armed', months: 24, effects: { manpowerMult: 1.1 },
        }),
      },
      {
        id: 'p_coast', name: 'A Window on the Sea',
        desc: 'Take Caesarea Maritima — a state without a port is a state on sufferance.',
        rewardText: '+75 talents (the customs house).',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Caesarea Maritima'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { treasury: 75 }),
      },
      {
        id: 'p_hills', name: 'The Heartland Whole',
        desc: 'Control Jerusalem, Hebron, Jericho and Emmaus together.',
        rewardText: '+15 legitimacy, +25 governance points.',
        check: (ctx) => ['Jerusalem', 'Hebron', 'Jericho', 'Emmaus'].every((n) => ctx.helpers.controls(ctx, 'JUD', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 15, gov: 25 }),
      },
      {
        id: 'p_worth_more_unsold', name: 'Worth More Unsold',
        desc: 'Still stand — alive, five provinces — in 620, after Persia has weighed selling you.',
        rewardText: '+1 stability, +20 legitimacy.',
        check: (ctx) => dateGE(ctx.game.date, 620, 1) && ctx.helpers.countControlled(ctx, 'JUD', {}) >= 5,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { stability: 1, legitimacy: 20 }),
      },
      {
        // SPEC §32: Nehemiah ben Hushiel's dream — five centuries after the
        // fire, the sacrifices resume on the Mount.
        id: 'p_third_temple', name: 'Raise the Third House',
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
    ],
    BYZ: [
      {
        id: 'b_line', name: 'Hold the Line',
        desc: 'Keep the Anatolian shield: control Iconium, Attalia and Seleucia Trachea.',
        rewardText: '+25 martial points.',
        check: (ctx) => ['Iconium', 'Attalia', 'Seleucia Trachea'].every((n) => ctx.helpers.controls(ctx, 'BYZ', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'BYZ', { mar: 25 }),
      },
      {
        id: 'b_egypt', name: 'The Granary Held',
        desc: 'Still hold Alexandria in 617 — the Empire eats Egyptian bread.',
        rewardText: '+25 government points.',
        check: (ctx) => dateGE(ctx.game.date, 617, 1) && ctx.helpers.controls(ctx, 'BYZ', 'Alexandria'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'BYZ', { gov: 25 }),
      },
      {
        id: 'b_fleet', name: 'The Sea Is Roman',
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
        desc: 'Carry the war home: control Amida or Tigranocerta.',
        rewardText: '+25 of every point — the Empire believes again.',
        check: (ctx) => ctx.helpers.controls(ctx, 'BYZ', 'Amida') || ctx.helpers.controls(ctx, 'BYZ', 'Tigranocerta'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'BYZ', { gov: 25, infl: 25, mar: 25 }),
      },
      {
        id: 'b_cross', name: 'The True Cross',
        desc: 'Hold Jerusalem again — whatever it takes, however long.',
        rewardText: '+25 legitimacy, +1 stability.',
        check: (ctx) => ctx.helpers.controls(ctx, 'BYZ', 'Jerusalem') && dateGE(ctx.game.date, 616, 1),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'BYZ', { legitimacy: 25, stability: 1 }),
      },
    ],
  },

  aiHints: {
    BYZ: { rally: ['Iconium', 'Alexandria'], targetRegiments: 40 },
    SAS: { rally: ['Damascus', 'Seleucia-Ctesiphon'], targetRegiments: 45 },
    JUD: { rally: ['Tiberias'], targetRegiments: 12 },
    GHA: { rally: ['Bostra'], targetRegiments: 6 },
    RSH: { rally: ['Hegra', 'Dumatha'], targetRegiments: 32 },
    REB: { rally: [], targetRegiments: 0 },
  },

  checkVictory(ctx) {
    try {
      const g = ctx.game;
      const h = ctx.helpers;
      if (!g || g.over || g.result) return;

      const judTag = g.tags && g.tags.JUD;
      const judAlive = !!(judTag && judTag.alive !== false);
      const judProvs = judAlive ? h.countControlled(ctx, 'JUD', {}) : 0;
      const jerusalemJud = judAlive && h.controls(ctx, 'JUD', 'Jerusalem');

      if (g.playerTag === 'JUD') {
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
      } else if (g.playerTag === 'BYZ') {
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
