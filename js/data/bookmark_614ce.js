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
  'Susa', 'Gazaca', 'Dura-Europos', 'Hatra', 'Assur', 'Singara', 'Arbela',
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
];

const OWNERS = {};
for (const n of SAS_LANDS) OWNERS[n] = 'SAS';
for (const n of JUD_LANDS) OWNERS[n] = 'JUD';
for (const n of GHA_LANDS) OWNERS[n] = 'GHA';
for (const n of BYZ_LANDS) OWNERS[n] = 'BYZ';

// ---- the map of faiths, six centuries on ------------------------------------
// Christianity nearly everywhere Rome or Persia rules settled land; Judaism in
// Galilee and Babylonia; the Samaritans on their mountain; the fire temples in
// the Iranian heartland.
const RELIGIONS = {};
for (const n of SAS_LANDS.concat(GHA_LANDS, BYZ_LANDS)) RELIGIONS[n] = 'christianity';
for (const n of ['Seleucia-Ctesiphon', 'Ecbatana', 'Susa', 'Gazaca', 'Assur', 'Singara']) RELIGIONS[n] = 'zoroastrianism';
for (const n of JUD_LANDS.concat(['Nehardea', 'Arbela'])) RELIGIONS[n] = 'judaism';
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

  activeTags: ['BYZ', 'SAS', 'JUD', 'GHA'],

  owners: OWNERS,
  religions: RELIGIONS,

  playableTags: [
    {
      tag: 'JUD',
      difficulty: 'Hard',
      blurb: 'For the first time since Bar Kokhba, Jewish soldiers march on Jerusalem '
        + 'with a great power beside them. Take the city, restore what can be restored — '
        + 'and never forget that your ally is an empire, and empires trade. When Persia '
        + 'sells you (and it will try), be strong enough to be worth more unsold.',
    },
    {
      tag: 'BYZ',
      difficulty: 'Hard',
      blurb: 'Syria is gone, Jerusalem is about to fall, and the Persians will have Egypt '
        + 'within five years — the Empire is losing this war everywhere at once. Hold the '
        + 'Anatolian line, keep the fleet, and endure until you can do what Heraclius did: '
        + 'gamble the whole Empire on one campaign into the enemy\'s heart.',
    },
  ],

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

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
        if (byzScore >= 35 || (!w && h.controls(ctx, 'BYZ', 'Jerusalem') && dateGE(g.date, 620, 1))) {
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
