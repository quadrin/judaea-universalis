// Judaea Universalis — bookmark: Herod's Rise, 40 BCE (SPEC §20).
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Historical spine: Josephus, Antiquitates XIV.13–16 / Bellum I.13–18; Cassius
// Dio XLVIII–XLIX. The Parthians have swept Syria and set Antigonus, last
// fighting Hasmonean, on the throne in Jerusalem. Herod escapes over the desert
// with his family — to Masada, to Petra, and then to Rome, where the Senate
// will make a king of an Idumean commoner. Three years of war decide whether
// the decree means anything.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[bookmark_40bce] ' + key, e || '');
}

function warscoreVs(ctx, mine, theirs) {
  try {
    for (const w of ctx.game.wars || []) {
      const all = (w.attackers || []).concat(w.defenders || []);
      if (all.indexOf(mine) !== -1 && all.indexOf(theirs) !== -1) {
        const v = w.warscore && w.warscore[mine];
        return typeof v === 'number' ? v : 0;
      }
    }
  } catch (e) { warnOnce('warscoreVs', e); }
  return 0;
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

function fireEventById(ctx, eventId) {
  try {
    const g = ctx.game;
    let ev = null;
    for (const e of ctx.events || []) { if (e && e.id === eventId) { ev = e; break; } }
    if (!ev) { warnOnce('fireEventById: unknown ' + eventId); return; }
    if (g.firedEvents && g.firedEvents[eventId]) return;
    if (g.firedEvents) g.firedEvents[eventId] = true;
    const instanceId = g.nextEventInstance++;
    g.pendingEvents.push({ instanceId, eventId, forTag: ev.forTag });
    const playerFacing = ev.forTag === 'player' || ev.forTag === 'both' || ev.forTag === g.playerTag;
    if (playerFacing) {
      g.paused = true;
      if (ctx.bus) {
        ctx.bus.emit('event', { instanceId, event: ev, forTag: ev.forTag });
        ctx.bus.emit('pause', true);
      }
    }
  } catch (e) { warnOnce('fireEventById', e); }
}

export const BOOKMARK_40 = {
  id: '40bce',
  name: "Herod's Rise",
  startDate: { y: -40, m: 7, d: 1 },
  // SPEC §121: the year after which this chapter's own undated trigger
  // cards stop belonging to anybody — the Parthian interlude and the reign it decided.
  // A card that legitimately runs later says so with its own maxYear.
  generationHorizon: 10,
  // Technology of the age (SPEC §22): the legions and the cataphract East.
  techBase: 4,
  // How far up the ladder this age can climb (SPEC §99). Herod's century stops at the professional legion (SPEC §99).
  techCeiling: 9,
  // Rome is a republic until the emperors (SPEC §25).
  govTypes: { ROM: 'republic' },
  techTweaks: { ROM: { mar: 2, gov: 1 }, PAR: { mar: 1 } },
  // The rungs' own names (SPEC §179): the arts of Herod's rise — a client's
  // education, from the toparch's rolls to the Augustan order.
  techNames: {
    gov: {
      3: 'The Toparch\'s Rolls', 4: 'The Customs Registers', 5: 'The Client\'s Tribute',
      6: 'The Builder\'s Survey', 7: 'The Royal Foundations', 8: 'The Harbor Works',
      9: 'The Augustan Order',
    },
    infl: {
      3: 'The Family Letters', 4: 'The Web of Favors', 5: 'The Gifts Remembered',
      6: 'The Triumvir\'s Friendship', 7: 'The Senate\'s Decree', 8: 'The Court of Kings',
      9: 'The Imperial Household',
    },
    mar: {
      3: 'The Hill Bands', 4: 'The Idumean Riders', 5: 'The Galilee Campaigns',
      6: 'The Hired Veterans', 7: 'The King\'s Regiments', 8: 'The Roman Drill',
      9: 'The Legate\'s Art',
    },
  },

  // The map speaks its era (SPEC §25): pre-Herodian, pre-Roman place names.
  provinceNames: {
    'Caesarea Maritima': "Straton's Tower", // Herod builds Caesarea decades later
    'Antipatris': 'Aphek',                  // Antipatris is Herod's foundation
    'Sebaste': 'Samaria',                   // renamed for Augustus in 27 BCE
    'Neapolis': 'Shechem',                  // Flavia Neapolis is founded 72 CE
    'Caesarea Philippi': 'Panion',          // the grotto of Pan, not yet a Caesarea
    'Tiberias': 'Rakkath',                  // Tiberias is founded 20 CE
    'Tarichaea': 'Magdala',
    'Caesarea Mazaca': 'Mazaca',            // named for Caesar only in 14 CE
    'Seleucia-Ctesiphon': 'Seleucia-on-Tigris', // Ctesiphon is still a camp across the river
  },

  // The victors' pens wait on the schoolhouse (SPEC §66). A Jewish pen
  // requires both full integration and a Jewish community of the owner's
  // culture; non-Jewish pens retain the older integration-or-culture
  // threshold. Until then the labels keep the era originals above.
  integratedNames: {
    // The builder's pen: Herod's historical re-foundations, written onto the
    // era names (Samaria, Straton's Tower, Aphek...) once the land is his in
    // more than title. Panion and Rakkath are his sons' foundations — the
    // dynasty's pen writes ahead for Philip and Antipas.
    HER: {
      'Sebaste': 'Sebaste',                     // Samaria, renamed for Sebastos
      'Caesarea Maritima': 'Caesarea',          // Straton's Tower, renamed for Caesar
      'Antipatris': 'Antipatris',               // Aphek, renamed for his father
      'Caesarea Philippi': 'Caesarea Philippi', // Panion, Philip's Caesarea
      'Tiberias': 'Tiberias',                   // Rakkath, Antipas' city for Tiberius
    },
    // The Hasmonean pen: Hebrew names back onto the Greek cities, as Jannaeus
    // wrote them — the map of a restored kingdom speaks the fathers' tongue.
    ATG: {
      'Ptolemais': 'Akko', 'Scythopolis': 'Beit She\'an',
      'Azotus': 'Ashdod', 'Ascalon': 'Ashkelon', 'Joppa': 'Yafo',
      'Dora': 'Dor', 'Gaza': 'Azzah', 'Sebaste': 'Shomron',
      'Philadelphia': 'Rabbat Ammon',
    },
    // The Roman pen has one name it longs to file correctly.
    ROM: { 'Jerusalem': 'Hierosolyma' },
    // Formed crowns keep their founders' pens (alias tables): a restored
    // Hasmonean kingdom or proclaimed Israel writes Antigonus' Hebrew, and
    // Herod's Kingdom of Judaea keeps signing the builder's re-foundations.
    HAS: 'ATG',
    MLI: 'ATG',
    JUD: 'HER',
  },

  blurb: 'The Parthians have crossed the Euphrates and nothing stood. Syria is overrun, '
    + 'and in Jerusalem they have crowned Antigonus, the last fighting Hasmonean, who paid '
    + 'them in silver and promises. Herod — Idumean, commoner, Antipater\'s son — runs '
    + 'south through the night with his family and a plan of desperate arithmetic: Masada '
    + 'can hold, Petra can be bargained with, and in Rome there is a Senate that hates a '
    + 'vacuum more than it loves any king.',

  activeTags: ['HER', 'ATG', 'ROM', 'PAR', 'NAB', 'PTO', 'ARM', 'OSR', 'ADI', 'CHX',
    // The political west (SPEC §173): the triumviral west — Caesar's Gaul
    // held down, Bocchus' Mauretania holding both shores of everything, and
    // the Danube in Burebista's wreckage. Seated by js/data/political_maps.js.
    'MAU', 'GRM', 'LUS',
    'NOR', 'BRT', 'CAL', 'HIB',
    'SUE', 'CHE', 'CHA', 'FRS', 'CIM', 'SCN', 'GOT', 'AES',
    'DLM', 'SCO', 'DRD', 'THR', 'DAC',
    'BOS', 'SCY', 'SRM', 'VEN'],
  // Standing rivalries (SPEC §73): the Parthian flood IS the chapter — the
  // two empires stay each other's natural war.
  rivalries: [['ROM', 'PAR']],
  // Historical friends (SPEC §86): Herod IS Rome's client — the friendship
  // survives Actium, a change of patron, and a good deal of land changing
  // hands. Antigonus is the Parthians' man by the same logic, and Nabataea
  // is everyone's neighbor and nobody's permanent enemy.
  affinities: [
    ['HER', 'ROM', { axis: 'alignment', sign: 1 }],
    ['ATG', 'PAR', { axis: 'alignment', sign: -1 }],
    ['HER', 'NAB'], ['ATG', 'NAB'],
  ],

  // Political layer of July 40 BCE. Rome's Syria is torn: Parthia holds the
  // interior, Rome clings to Cilicia and the coast. Egypt is Cleopatra's.
  owners: {
    // -- Herod (HER): Idumea, the desert forts, the southern coast ------------
    'Hebron': 'HER',
    'Adora': 'HER',
    'Masada': 'HER',
    'Engaddi': 'HER',
    'Gaza': 'HER',
    'Ascalon': 'HER',
    'Azotus': 'HER',
    'Jamnia': 'HER',
    // -- Antigonus (ATG): Jerusalem, the hills, Galilee, Perea -----------------
    'Jerusalem': 'ATG',
    'Jericho': 'ATG',
    'Emmaus': 'ATG',
    'Lydda': 'ATG',
    'Joppa': 'ATG',
    'Antipatris': 'ATG',
    'Neapolis': 'ATG',
    'Sebaste': 'ATG',
    'Caesarea Maritima': 'ATG',
    'Dora': 'ATG',
    'Sepphoris': 'ATG',
    'Jotapata': 'ATG',
    'Tiberias': 'ATG',
    'Tarichaea': 'ATG',
    'Gischala': 'ATG',
    'Gamala': 'ATG',
    'Scythopolis': 'ATG',
    'Pella': 'ATG',
    'Gadara': 'ATG',
    'Gadora': 'ATG',
    'Machaerus': 'ATG',
    // -- Parthian-held Syria (PAR): the interior, to the gates of the coast ----
    'Zeugma': 'PAR',
    'Samosata': 'PAR',
    'Cyrrhus': 'PAR',
    'Beroea': 'PAR',
    'Chalcis': 'PAR',
    'Emesa': 'PAR',
    'Apamea': 'PAR',
    'Palmyra': 'PAR',
    'Damascus': 'PAR',
    'Batanea': 'PAR',
    'Caesarea Philippi': 'PAR',
    // -- Rome (ROM): the Syrian coast, Cilicia, Anatolia ------------------------
    'Antioch': 'ROM',
    'Seleucia Pieria': 'ROM',
    'Laodicea': 'ROM',
    'Tyre': 'ROM',
    'Sidon': 'ROM',
    'Berytus': 'ROM',
    'Byblos': 'ROM',
    'Tripolis': 'ROM',
    'Aradus': 'ROM',
    'Ptolemais': 'ROM',
    'Tarsus': 'ROM',
    'Seleucia Trachea': 'ROM',
    'Attalia': 'ROM',
    'Pisidia': 'ROM',
    'Iconium': 'ROM',
    'Tyana': 'ROM',
    'Caesarea Mazaca': 'ROM',
    'Melitene': 'ROM',
    // -- Ptolemaic Egypt of Cleopatra (PTO) -------------------------------------
    'Pelusium': 'PTO',
    'Rhinocolura': 'PTO',
    'Alexandria': 'PTO',
    'Athribis': 'PTO',
    'Leontopolis': 'PTO',
    'Memphis': 'PTO',
    'Arsinoe': 'PTO',
    'Oxyrhynchus': 'PTO',
    'Thebes': 'PTO',
    'Myos Hormos': 'PTO',
    'Salamis': 'PTO',
    'Paphos': 'PTO',
    // -- Nabataea (NAB): Transjordan south of the Decapolis ---------------------
    'Philadelphia': 'NAB',
    'Medaba': 'NAB',
    'Gerasa': 'NAB',
    // -- v5.0: the wider world -------------------------------------------------
    'Corinth': 'ROM', 'Athens': 'ROM', 'Sparta': 'ROM', 'Gortyn': 'ROM',
    'Rhodes': 'ROM', 'Halicarnassus': 'ROM', 'Cyrene': 'ROM',
    'Marmarica': 'PTO', 'Paraetonium': 'PTO', 'Syene': 'PTO',
    'Yathrib': 'NAB', 'Khaybar': 'NAB', 'Berenice': 'PTO',
    'Persepolis': 'PAR', 'Gabae': 'PAR', 'Gerrha': 'CHX',
    // -- v5.4: the frame grows west and north ----------------------------------
    // The Roman west keeps its base ownership (Antony's east, Octavian's
    // Italy — one tag models the whole squabbling Republic). The Parthian
    // invasion year: the Caucasus leans to the Arsacids.
    'Caucasian Albania': 'PAR',
  },

  // What the era asks of you (SPEC §33) — shown in the realm panel.
  objectives: {
    HER: [
      'Win: take Jerusalem and unify the realm — before 36 BCE for the brighter verdict.',
      'Lose: 35 BCE arrives and the city still laughs at the Senate\'s decree.',
    ],
    ATG: [
      'Win: still hold Jerusalem, alive, in 36 BCE — the last Hasmonean ends standing up.',
      'Lose: Jerusalem gone and fewer than 3,000 men — Rome uses the axe for kings.',
    ],
    ADI: [
      'Win: the house stands in 36 BCE — Arbela held through the tide and the ebb.',
      'Win: the greater verdict — stand free of every overlord, or stand rich on the road\'s custom.',
      'Lose: the house between the rivers falls — every province gone.',
    ],
  },

  // The court factions (SPEC §34): the realm's internal parties. The engine
  // ticks them for the human player alone; the AI keeps its politics offstage.
  factions: {
    HER: [
      {
        id: 'kin', name: 'The House of Antipater',
        desc: 'Brothers, cousins and in-laws in every office you can fill — the family machine that raised you.',
        drift(ctx, t) { return (t.stability || 0) >= 1 ? 0.4 : -0.4; },
        boon: { name: 'The Family Machine', text: '+8% income', effects: { incomeMult: 1.08 } },
        bane: { name: 'Feuds in the House', text: '+1 unrest everywhere', effects: { unrestAll: 1 } },
        appease: { label: 'Divide the offices (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Family Presents Its Claims',
          text: 'Pheroras wants a command, Joseph wants Jerusalem\'s revenues promised, and your '
            + 'mother-in-law wants everyone else dead — the usual. A king who cannot pay his own '
            + 'blood discovers that blood keeps its own accounts.',
          grant: { label: 'Something for everyone', cost: { gov: 50 } },
          refuse: { label: 'The crown owes the family nothing', tooltip: 'The accounts stay open.' },
        },
      },
      {
        id: 'sanhedrin', name: 'The Sanhedrin',
        desc: 'The lawyers of Jerusalem, who tried you for murder once and have not changed their minds — only their circumstances.',
        drift(ctx, t) { return (t.legitimacy || 0) >= 50 ? 0.3 : -0.5; },
        boon: { name: 'The Court Acquiesces', text: '+0.3 legitimacy a month', effects: { legitimacyAdd: 0.3 } },
        bane: { name: 'The Court Remembers Galilee', text: '−0.25 legitimacy a month', effects: { legitimacyAdd: -0.25 } },
        appease: { label: 'Honor the Law\'s forms (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'The Sanhedrin Asks for Its Prerogatives',
          text: 'An Idumean commoner who marries into the priest-kings is still an Idumean commoner '
            + 'to the seventy-one. They will bless what they cannot prevent — for the return of the '
            + 'council\'s prerogatives, in writing, witnessed.',
          grant: { label: 'The prerogatives, in writing', cost: { infl: 50 } },
          refuse: { label: 'A king is not judged twice', tooltip: 'Seventy-one memories sharpen.' },
        },
      },
      {
        id: 'swords', name: 'The Hired Swords',
        desc: 'Idumean bands, Cilician veterans, whoever the silver reaches: the army that is yours exactly as long as the pay is.',
        drift(ctx, t) {
          const g = ctx.game;
          if ((t.treasury || 0) < 0) return -0.8;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.4 : -0.2;
        },
        boon: { name: 'Paid Steel', text: '+4% discipline', effects: { disciplineMult: 1.04 } },
        bane: { name: 'Pay or March Home', text: '−20% reinforcement', effects: { reinforceMult: 0.8 } },
        appease: { label: 'A donative for the bands (100 talents)', cost: { treasury: 100 } },
        demand: {
          title: 'The Bands Count the Silver',
          text: 'The paymasters are two months behind and the Cilicians have begun doing arithmetic '
            + 'out loud around the fires. Antigonus\' agents circulate with purses. Mercenaries do '
            + 'not desert kings — only debtors.',
          grant: { label: 'Empty the chest for them', cost: { treasury: 150 } },
          refuse: { label: 'They will be paid from Jerusalem', tooltip: 'The purses circulate freely.' },
        },
      },
    ],
    ATG: [
      {
        id: 'priesthood', name: 'The Priesthood',
        desc: 'You are king and high priest — Mattathias on your coins — and the courses of the altar hold you to both.',
        drift(ctx, t) {
          try { return ctx.helpers.controls(ctx, 'ATG', 'Jerusalem') ? 0.5 : -0.7; } catch (e) { return 0; }
        },
        boon: { name: 'The Altar Blesses the Maccabee', text: '−0.75 unrest everywhere', effects: { unrestAll: -0.75 } },
        bane: { name: 'The Ephod Sits Crooked', text: '−0.25 legitimacy a month', effects: { legitimacyAdd: -0.25 } },
        appease: { label: 'Serve the altar in person (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Priests Ask for Their King',
          text: 'A high priest who is always in the field is a high priest the courses never see. '
            + 'Come to the altar, keep the feasts in person, let Jerusalem watch the last Hasmonean '
            + 'serve — or let them whisper that the ephod was only ever a campaign banner.',
          grant: { label: 'Keep the feast in person', cost: { gov: 50 } },
          refuse: { label: 'The war is my office', tooltip: 'The whisper spreads.' },
        },
      },
      {
        id: 'parthians', name: 'The Parthian Party',
        desc: 'The courtiers who rode in with the horsemen and know exactly whose lances made you king.',
        drift(ctx, t) {
          const g = ctx.game;
          const par = g.tags.PAR;
          const parFighting = !!(par && par.alive && (par.atWarWith || []).some((e) => e === 'ROM' || e === 'HER'));
          return parFighting ? 0.4 : -0.6;
        },
        boon: { name: 'The King of Kings Remembers', text: '+12% manpower', effects: { manpowerMult: 1.12 } },
        bane: { name: 'A Client Without a Patron', text: '−5% morale', effects: { moraleMult: 0.95 } },
        appease: { label: 'Gifts eastward (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'The Parthian Party Wants Tribute Sent',
          text: 'Pacorus took Hyrcanus and five hundred talents\' promise when he gave you the city; '
            + 'the party that came with him suggests — with the delicacy of men holding receipts — '
            + 'that the balance travel east before the prince has to ask.',
          grant: { label: 'Send the balance east', cost: { treasury: 100 } },
          refuse: { label: 'Jerusalem pays no tribute', tooltip: 'The receipts are filed, not forgotten.' },
        },
      },
      {
        id: 'street', name: 'The Street of Jerusalem',
        desc: 'The crowd that cheered the horsemen at the Fish Gate: they love the Hasmonean name and eat every day.',
        drift(ctx, t) { return (t.warExhaustion || 0) <= 4 ? 0.3 : -0.5; },
        boon: { name: 'The City\'s Sons', text: '+12% manpower', effects: { manpowerMult: 1.12 } },
        bane: { name: 'The Crowd Turns', text: '+1.25 unrest everywhere', effects: { unrestAll: 1.25 } },
        appease: { label: 'Bread for the quarters (80 talents)', cost: { treasury: 80 } },
        demand: {
          title: 'The Street Asks for Bread',
          text: 'The siege economy reaches the ovens first: the queues lengthen, the loaves shrink, '
            + 'and the crowd that made you king with its cheering can unmake the cheering overnight. '
            + 'Open the granaries while there is something in them to open.',
          grant: { label: 'Open the granaries', cost: { treasury: 120 } },
          refuse: { label: 'The garrison eats first', tooltip: 'The queues learn new songs.' },
        },
      },
    ],
    ADI: [
      {
        id: 'magi', name: 'The Fire Priests of Arbela',
        desc: 'The altars older than the house\'s new prayers: the Magi keep the old fires and count the sabbath lamps in the palace windows.',
        drift(ctx, t) { return (t.stability || 0) >= 1 ? 0.3 : -0.5; },
        boon: { name: 'The Old Rites Steady the Land', text: '−0.5 unrest everywhere', effects: { unrestAll: -0.5 } },
        bane: { name: 'The Altars Murmur', text: '−0.2 legitimacy a month', effects: { legitimacyAdd: -0.2 } },
        appease: { label: 'Honor the fires (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Magi Ask Whose Gods Ride With Pacorus',
          text: 'The King of Kings\' war is blessed at the fire altars, and the priests notice '
            + 'which blessings this court attends. They ask for the festivals kept publicly, '
            + 'at the king\'s expense, in the king\'s presence — while the tide is high and '
            + 'everyone is watching.',
          grant: { label: 'The king attends the fires', cost: { treasury: 80 } },
          refuse: { label: 'The house prays as it pleases', tooltip: 'The altars remember who stopped coming.' },
        },
      },
      {
        id: 'caravans', name: 'The Caravan Lords',
        desc: 'The masters of the Tigris fords: Pacorus\' conquests have moved the customs frontier west, and every mile of it is profit.',
        drift(ctx, t) {
          return (t.atWarWith || []).length ? -0.6 : 0.4;
        },
        boon: { name: 'The Tolls Flow', text: '+10% income', effects: { incomeMult: 1.1 } },
        bane: { name: 'The Roads Go Around', text: '−10% income', effects: { incomeMult: 0.9 } },
        appease: { label: 'Remit a season\'s tolls (50 talents)', cost: { treasury: 50 } },
        demand: {
          title: 'The Caravans Ask What Happens After',
          text: 'The lords of the road have seen tides before. They ask — quietly, while the '
            + 'lances are still winning — what the house intends when Rome pushes back across '
            + 'the Euphrates: guards at the fords, and no debts to the losing side.',
          grant: { label: 'Guards at the fords', cost: { treasury: 70 } },
          refuse: { label: 'The tide will hold', tooltip: 'The lords remember who said so.' },
        },
      },
      {
        id: 'riders', name: 'The Riders of Arbela',
        desc: 'The armored horse of the Tigris bank — never worth more than now, with Pacorus in Syria and every ford a muster point.',
        drift(ctx, t) {
          const g = ctx.game;
          if ((t.treasury || 0) < 0) return -0.7;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.5 : -0.1;
        },
        boon: { name: 'The Lances Sharp', text: '+5% discipline', effects: { disciplineMult: 1.05 } },
        bane: { name: 'The Families Keep Their Sons', text: '−12% manpower', effects: { manpowerMult: 0.88 } },
        appease: { label: 'Barding and remounts (50 talents)', cost: { treasury: 50 } },
        demand: {
          title: 'The Riders Want to Join the Tide',
          text: 'Pacorus is handing out Syria, and the landed families can hear it happening '
            + 'from here. Pay for the muster and lead it somewhere, or watch the boldest '
            + 'sons ride west under somebody else\'s banner.',
          grant: { label: 'Pay for the muster', cost: { treasury: 80 } },
          refuse: { label: 'The house does not chase floods', tooltip: 'The boldest sons ride anyway.' },
        },
      },
    ],
  },
  playableTags: [
    {
      tag: 'HER',
      difficulty: 'Moderate',
      blurb: 'You hold Idumea, a rock above the Dead Sea, and a name the Senate can use. '
        + 'Sail to Rome and come back a paper king — then make the paper true, province by '
        + 'province, before your patrons lose interest. Rome\'s legions will break Parthia '
        + 'for their own reasons; Jerusalem you must take for yours.',
    },
    {
      tag: 'ATG',
      difficulty: 'Hard',
      blurb: 'You are Mattathias Antigonus, king and high priest, the last of the '
        + 'Hasmoneans willing to fight for it. The Parthians who crowned you will not stay; '
        + 'Rome will come back with the Idumean on a leash. Hold Jerusalem, outlast Antony\'s '
        + 'attention, and make the dynasty\'s last stand its finest.',
    },
    {
      tag: 'ADI',
      difficulty: 'Hard',
      blurb: 'Parthia\'s tide has crested the Euphrates, and the house of Arbela rides it: '
        + 'the King of Kings\' favorite client, the Gulf Road\'s northern tolls, and lances '
        + 'the whole war wants. But tides recede — Gindarus is two summers away — and a '
        + 'client who rose with the flood must learn to stand on the ebb.',
    },
  ],

  rulers: {
    HER: { name: 'Herod', title: 'Tetrarch in Exile', gov: 4, infl: 3, mar: 4, age: 33 },
    ATG: {
      name: 'Antigonus II Mattathias', title: 'King and High Priest', gov: 2, infl: 3, mar: 3, age: 40,
    },
    ROM: { name: 'Marcus Antonius', title: 'Triumvir of the East', gov: 2, infl: 4, mar: 4, age: 43 },
    PAR: {
      name: 'Orodes II', title: 'King of Kings', gov: 3, infl: 3, mar: 3, age: 57,
      heir: { name: 'Pacorus', gov: 2, infl: 3, mar: 4, age: 24 },
    },
    // The Tigris client (SPEC §185): the dynasty between Abdissares' coins
    // and the conversion, seated by plausible succession.
    ADI: {
      name: 'Izates', title: 'King', gov: 2, infl: 3, mar: 2, age: 42,
      heir: { name: 'Monobazus', gov: 2, infl: 2, mar: 3, age: 16 },
    },
    PTO: { name: 'Cleopatra VII Philopator', title: 'Pharaoh', gov: 4, infl: 5, mar: 2, age: 29 },
    NAB: { name: 'Malichus I', title: 'King', gov: 2, infl: 2, mar: 2, age: 45 },
    ARM: { name: 'Artavasdes II', title: 'King', gov: 2, infl: 3, mar: 2, age: 45 },
    // The political west (SPEC §173): Bocchus the durable, who outlived
    // Jugurtha's whole story and will leave both Mauretanias to Octavian;
    // Asander, who murdered his way onto the Bosporan throne and will keep it
    // thirty years; and one of the four kings Burebista's Dacia broke into.
    MAU: { name: 'Bocchus II', title: 'King', gov: 3, infl: 3, mar: 2, age: 55 },
    BOS: { name: 'Asander', title: 'Archon of the Bosporus', gov: 3, infl: 2, mar: 3, age: 62 },
    DAC: { name: 'Cotiso', title: 'King', gov: 2, infl: 2, mar: 3, age: 35 },
  },

  missions: {
    HER: [
      {
        id: 'h5_rome', name: 'The Voyage to Rome',
        icon: 'ship', col: 1,
        desc: 'Kneel before the Senate and rise a king (the flight to Rome, by event).',
        rewardText: '+25 influence points.',
        check: (ctx) => !!ctx.helpers.getFlag(ctx, 'herodKing'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HER', { infl: 25 }),
      },
      {
        id: 'h5_coast', name: 'The Coast Road',
        icon: 'market', col: 0, requires: ['h5_rome'],
        desc: 'Control Joppa and Lydda — the road to the city runs by the sea.',
        rewardText: '+100 talents of customs silver.',
        check: (ctx) => ctx.helpers.controls(ctx, 'HER', 'Joppa') && ctx.helpers.controls(ctx, 'HER', 'Lydda'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HER', { treasury: 100 }),
      },
      {
        id: 'h5_galilee', name: 'Galilee Pacified',
        icon: 'mountain', col: 2, requires: ['h5_rome'],
        desc: 'Control Sepphoris and Jotapata — the bandit country broken.',
        rewardText: '+1,500 manpower.',
        check: (ctx) => ctx.helpers.controls(ctx, 'HER', 'Sepphoris') && ctx.helpers.controls(ctx, 'HER', 'Jotapata'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HER', { manpower: 1500 }),
      },
      {
        id: 'h5_city', name: 'The City of David',
        icon: 'temple', col: 1, requires: ['h5_coast', 'h5_galilee'],
        desc: 'Take Jerusalem.',
        rewardText: '+20 legitimacy — a crown made true.',
        check: (ctx) => ctx.helpers.controls(ctx, 'HER', 'Jerusalem'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HER', { legitimacy: 20 }),
      },
      {
        id: 'h5_one_king', name: 'One King',
        icon: 'star8', col: 1, requires: ['h5_city'],
        desc: 'The last Hasmonean extinguished or bent to clienthood.',
        rewardText: '+1 stability, +15 legitimacy.',
        check: (ctx) => {
          const r = ctx.game.tags.ATG;
          return !r || !r.alive || r.overlord === 'HER';
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HER', { stability: 1, legitimacy: 15 }),
      },
      // The age's curriculum (SPEC §179): the works and the court that made
      // the commoner unremovable.
      {
        id: 'h5_builders_program', name: 'The Builder\'s Program',
        icon: 'bricks', col: 0, requires: ['h5_coast'],
        desc: 'Survey what a king will build: reach Government 6 — The Builder\'s Survey.',
        rewardText: '"The Foundations Laid": +10% town growth, permanently.',
        check: (ctx) => (((ctx.game.tags.HER || {}).tech || {}).gov | 0) >= 6,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HER', {
          id: 'foundations_laid', name: 'The Foundations Laid', months: -1, effects: { growthMult: 1.1 },
        }),
      },
      {
        id: 'h5_court_of_a_king', name: 'The Court of a King',
        icon: 'laurel', col: 2, requires: ['h5_galilee'],
        desc: 'Take up three ideas of the age — a decree made him king; only statecraft keeps him one.',
        rewardText: '+25 influence points, +15 legitimacy.',
        check: (ctx) => eraTiers(ctx.game.tags.HER) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HER', { infl: 25, legitimacy: 15 }),
      },
      // ── The roads not taken (SPEC §183) ─────────────────────────────────
      {
        id: 'hy_greater_herod', name: 'Too Large to Be a Favour', hypothetical: true,
        fork: '40bce/who_wears_the_crown',
        icon: 'star4', col: 3, row: 0,
        desc: 'Break Antigonus, keep Jerusalem, answer to no overlord — and then take Damascus '
          + 'or Petra. A client that size has outgrown the word, and Rome must decide what to '
          + 'call it instead of deciding its schedule.',
        rewardText: '+25 influence points, +100 talents.',
        check: (ctx) => {
          const her = ctx.game.tags.HER;
          const atg = ctx.game.tags.ATG;
          const atgBroken = !atg || atg.alive === false || atg.overlord === 'HER';
          return !!(her && her.alive !== false && !her.overlord && atgBroken
            && ctx.helpers.controls(ctx, 'HER', 'Jerusalem')
            && (ctx.helpers.controls(ctx, 'HER', 'Damascus') || ctx.helpers.controls(ctx, 'HER', 'Petra')));
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HER', { infl: 25, treasury: 100 }),
      },
      {
        id: 'hy_statue_kingdom', name: 'The Order Never Given', hypothetical: true,
        fork: '40bce/the_statue',
        icon: 'shrine', col: 3, row: 1,
        desc: 'Come to the year of Gaius (40 CE) as a kingdom rather than a province, and the '
          + 'statue for the Temple is talked away at a dinner — or refused in writing before '
          + 'it is asked. A thing a kingdom can do and a province cannot.',
        rewardText: '+15 legitimacy, +1 stability.',
        check: (ctx) => anyFlag(ctx, 'orderNeverGiven', 'refusedInAdvance'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HER', { legitimacy: 15, stability: 1 }),
      },
    ],
    ATG: [
      {
        id: 'a5_army', name: 'The King\'s Muster',
        icon: 'spears', col: 1,
        desc: 'Keep ten thousand men under arms.',
        rewardText: '+1,500 manpower.',
        check: (ctx) => totalMen(ctx, 'ATG') >= 10000,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { manpower: 1500 }),
      },
      {
        id: 'a5_idumea', name: 'Into Idumea',
        icon: 'mountain', col: 0, requires: ['a5_army'],
        desc: 'Take Hebron and Adora — strangle the pretender in his cradle-country.',
        rewardText: '+25 martial points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ATG', 'Hebron') && ctx.helpers.controls(ctx, 'ATG', 'Adora'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { mar: 25 }),
      },
      {
        id: 'a5_anointed', name: 'The Anointed King',
        icon: 'altar', col: 2, requires: ['a5_army'],
        desc: 'Raise legitimacy to 60 — high priest and king, and seen to be both.',
        rewardText: '+25 influence points.',
        check: (ctx) => (ctx.game.tags.ATG.legitimacy || 0) >= 60,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { infl: 25 }),
      },
      {
        id: 'a5_masada', name: 'The Rock Must Fall',
        icon: 'tower', col: 0, requires: ['a5_idumea'],
        desc: 'Take Masada, where the Idumean left his family.',
        rewardText: '+15 legitimacy.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ATG', 'Masada'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { legitimacy: 15 }),
      },
      {
        id: 'a5_one_crown', name: 'The Last Hasmonean',
        icon: 'star8', col: 1, requires: ['a5_masada', 'a5_anointed'],
        desc: 'The pretender extinguished or bent to clienthood.',
        rewardText: '+1 stability, +15 legitimacy.',
        check: (ctx) => {
          const r = ctx.game.tags.HER;
          return !r || !r.alive || r.overlord === 'ATG';
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { stability: 1, legitimacy: 15 }),
      },
      // The age's curriculum (SPEC §179): the last Hasmonean fights with the
      // age's hired steel and crowns the dynasty's own ideas.
      {
        id: 'a5_hired_veterans', name: 'The Veterans\' Price',
        icon: 'helmet', col: 0, requires: ['a5_idumea'],
        desc: 'Silver buys the age\'s soldiers: reach Military 6 — The Hired Veterans.',
        rewardText: '"The Companies Retained": +15% reinforcement speed for 24 months.',
        check: (ctx) => (((ctx.game.tags.ATG || {}).tech || {}).mar | 0) >= 6,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ATG', {
          id: 'companies_retained', name: 'The Companies Retained', months: 24, effects: { reinforceMult: 1.15 },
        }),
      },
      {
        id: 'a5_hasmonean_charter', name: 'The Hasmonean Charter',
        icon: 'scroll', col: 2, requires: ['a5_anointed'],
        desc: 'Take up three ideas of the age — the blood claims the crown; the ideas must keep it.',
        rewardText: '+25 governance points, +10 legitimacy.',
        check: (ctx) => eraTiers(ctx.game.tags.ATG) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { gov: 25, legitimacy: 10 }),
      },
      // ── The roads not taken (SPEC §183) ─────────────────────────────────
      {
        id: 'hy_hasmonean_holds', name: 'Mattathias, High Priest', hypothetical: true,
        fork: '40bce/who_wears_the_crown',
        icon: 'laurel', col: 3, row: 0,
        desc: 'Hold Jerusalem against the Senate\'s decree and the legions\' schedule — the '
          + 'crown war won, the Idumean broken, no overlord over you — and the last Hasmonean '
          + 'keeps the throne history gave to Herod.',
        rewardText: '+20 legitimacy, +25 martial points.',
        check: (ctx) => anyFlag(ctx, 'hasmoneanHolds'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { legitimacy: 20, mar: 25 }),
      },
      {
        id: 'hy_statue_kingdom', name: 'The Order Never Given', hypothetical: true,
        fork: '40bce/the_statue',
        icon: 'shrine', col: 3, row: 1,
        desc: 'Come to the year of Gaius (40 CE) as a kingdom rather than a province, and the '
          + 'statue for the Temple is talked away at a dinner — or refused in writing before '
          + 'it is asked. A thing a kingdom can do and a province cannot.',
        rewardText: '+15 legitimacy, +1 stability.',
        check: (ctx) => anyFlag(ctx, 'orderNeverGiven', 'refusedInAdvance'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { legitimacy: 15, stability: 1 }),
      },
    ],
    // The Tigris kingdom's tree (SPEC §185): ride the tide, bank the tolls,
    // and be standing when the ebb finds out who could swim.
    ADI: [
      {
        id: 't5_tide_riders', name: 'The Tide\'s Riders',
        icon: 'horseshoe', col: 1,
        desc: 'Pacorus is in Syria and every ford is a muster point. Put six thousand men under the house\'s standards.',
        rewardText: '"The Tide\'s Riders": +8% morale for 24 months.',
        check: (ctx) => totalMen(ctx, 'ADI') >= 6000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ADI', {
          id: 'tides_riders', name: 'The Tide\'s Riders', months: 24, effects: { moraleMult: 1.08 },
        }),
      },
      {
        id: 't5_customs_frontier', name: 'The Customs Frontier Moves West',
        icon: 'coins', col: 2, requires: ['t5_tide_riders'],
        desc: 'Every conquest of Pacorus moves the tolls west with it. Bank 200 talents of the widened road\'s custom.',
        rewardText: '"The Caravan Custom": +10% trade for 24 months.',
        check: (ctx) => ((ctx.game.tags.ADI || {}).treasury || 0) >= 200,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ADI', {
          id: 'caravan_custom', name: 'The Caravan Custom', months: 24, effects: { tradeMult: 1.1 },
        }),
      },
      {
        id: 't5_pacorus_favor', name: 'The Prince\'s Favor',
        icon: 'laurel', col: 0, requires: ['t5_tide_riders'],
        desc: 'Pacorus counts his clients by their lances. Reach the King of Kings\' full regard — opinion of the house at +100.',
        rewardText: '+15 legitimacy, +25 influence points.',
        check: (ctx) => {
          const par = ctx.game.tags.PAR;
          return ((par && par.opinion && par.opinion.ADI) || 0) >= 100;
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { legitimacy: 15, infl: 25 }),
      },
      {
        id: 't5_after_gindarus', name: 'After Gindarus',
        icon: 'mountain', col: 0, requires: ['t5_pacorus_favor'],
        desc: 'The tide breaks somewhere in Syria, one summer soon. Be seated at Arbela when the survivors ride home — from the middle of 38, still holding.',
        rewardText: '+1 stability — the ebb found the house standing.',
        check: (ctx) => dateGE(ctx.game.date, -37, 6) && ctx.helpers.controls(ctx, 'ADI', 'Arbela'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { stability: 1 }),
      },
      {
        id: 't5_hired_art', name: 'The Veterans\' Price',
        icon: 'helmet', col: 2, requires: ['t5_customs_frontier'],
        desc: 'The age fights with professionals. Reach Military 6 — The Hired Veterans.',
        rewardText: '+25 martial points.',
        check: (ctx) => (((ctx.game.tags.ADI || {}).tech || {}).mar | 0) >= 6,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { mar: 25 }),
      },
      {
        id: 't5_wisdom', name: 'The Wisdom of Two Rivers',
        icon: 'lamp', col: 1, requires: ['t5_tide_riders'],
        desc: 'A small court between empires needs every art of both. Take up three ideas of the age.',
        rewardText: '+25 governance points.',
        check: (ctx) => eraTiers(ctx.game.tags.ADI) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { gov: 25 }),
      },
      // ── The roads not taken (SPEC §183) ─────────────────────────────────
      {
        id: 'hy_crown_east_lives_with', name: 'The Crown the East Could Live With', hypothetical: true,
        fork: '40bce/who_wears_the_crown',
        icon: 'laurel', col: 3, row: 0,
        desc: 'If the last Hasmonean holds Jerusalem — the crown war won, the Idumean broken — '
          + 'then the kingdom at the road\'s western end stays a kingdom the east can trade '
          + 'with, pray toward, and reach without a Roman stamp on every bale.',
        rewardText: '+50 talents, +10 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'hasmoneanHolds'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { treasury: 50, legitimacy: 10 }),
      },
    ],
  },

  // Pre-existing works (SPEC §58): the old royal harbors still work.
  buildings: {
    'Seleucia Pieria': ['shipyard'], // the port of Antioch, now Rome's
    'Alexandria': ['shipyard'],
  },

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

    // --- Starting fleets (SPEC §58): Cleopatra's navy rides at Alexandria. ---
    h.spawnFleet(ctx, 'PTO', 'Alexandria', 4, { name: "The Queen's Fleet" });

    // The Tigris kingdoms ride in Parthia's train (v2.1): clients of the
    // King of Kings, paying tribute, joining his wars through sameSide.
    for (const cl of ['OSR', 'ADI', 'CHX']) {
      if (g.tags[cl] && g.tags.PAR) g.tags[cl].overlord = 'PAR';
    }

    // --- The War for the Crown: Antigonus + Parthia against Herod. Rome joins
    // when the Senate crowns him (ev5_senate). To the death — until dominance.
    h.declareWar(ctx, 'ATG', 'HER', 'The War for the Crown');
    try {
      const w = (g.wars || []).find((x) => x && (x.attackers || []).indexOf('ATG') >= 0);
      if (w) {
        w.noNegotiation = true;
        if (w.attackers.indexOf('PAR') < 0) w.attackers.push('PAR');
        const par = g.tags.PAR, her = g.tags.HER;
        if (par && par.atWarWith.indexOf('HER') < 0) par.atWarWith.push('HER');
        if (her && her.atWarWith.indexOf('PAR') < 0) her.atWarWith.push('PAR');
      }
    } catch (e) { warnOnce('setup:war', e); }

    // Alliances: Parthia stands behind Antigonus; Nabataea owes Herod money
    // and would rather not be asked.
    try {
      const atg = g.tags.ATG, par = g.tags.PAR;
      if (atg && par) {
        if (atg.allies.indexOf('PAR') === -1) atg.allies.push('PAR');
        if (par.allies.indexOf('ATG') === -1) par.allies.push('ATG');
      }
    } catch (e) { warnOnce('setup:allies', e); }

    h.adjust(ctx, 'HER', { treasury: 120, manpower: 3500, legitimacy: 25 });
    h.adjust(ctx, 'ATG', { treasury: 150, manpower: 6000, stability: 1, legitimacy: 50 });
    h.adjust(ctx, 'ROM', { treasury: 500, stability: 0, legitimacy: 55 });
    h.adjust(ctx, 'PAR', { treasury: 250, stability: 1, legitimacy: 40 });
    h.adjust(ctx, 'PTO', { treasury: 300, stability: 1, legitimacy: 45 });
    h.adjust(ctx, 'NAB', { treasury: 180, stability: 1 });
    h.adjust(ctx, 'ARM', { treasury: 80, stability: -1, legitimacy: 25 });
    // The Tigris client (SPEC §185): riding Parthia's high tide, and paid for it.
    h.adjust(ctx, 'ADI', { treasury: 70, legitimacy: 20 });

    setOpinion(g, 'HER', 'ATG', -180); setOpinion(g, 'ATG', 'HER', -180);
    setOpinion(g, 'ROM', 'HER', 80);   setOpinion(g, 'HER', 'ROM', 100);
    setOpinion(g, 'ROM', 'PAR', -150); setOpinion(g, 'PAR', 'ROM', -150);
    setOpinion(g, 'ATG', 'PAR', 100);  setOpinion(g, 'PAR', 'ATG', 80);
    setOpinion(g, 'NAB', 'HER', -20);  setOpinion(g, 'HER', 'NAB', 20);
    setOpinion(g, 'PTO', 'ROM', 60);   setOpinion(g, 'ROM', 'PTO', 40);
    setOpinion(g, 'ADI', 'PAR', 80);   setOpinion(g, 'PAR', 'ADI', 60);
    setOpinion(g, 'ADI', 'ROM', -50);  setOpinion(g, 'ROM', 'ADI', -30);

    // Antony is busy with Octavian and Fulvia's war: Rome watches its coast
    // until the Senate acts (ev5_senate lifts this).
    h.addTagModifier(ctx, 'ROM', {
      id: 'wars_elsewhere', name: 'The Triumvirs Quarrel', months: 30,
      effects: { aiPassive: true },
    });
    h.addTagModifier(ctx, 'ATG', {
      id: 'parthian_favor', name: 'The Parthian Favor', months: 24,
      effects: { moraleMult: 1.05, maintMult: 0.75, adminMult: 0.5 },
    });
    h.addTagModifier(ctx, 'HER', {
      id: 'roman_credit', name: 'Credit of the Senate', months: 36,
      effects: { maintMult: 0.75, incomeMult: 1.05, adminMult: 0.5 },
    });

    // --- Starting armies. -------------------------------------------------------
    h.spawnArmy(ctx, 'ATG', 'Jerusalem', {
      inf: 7, cav: 1, name: 'Army of the King',
      general: { name: 'Antigonus II', fire: 2, shock: 3, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'ATG', 'Sepphoris', { inf: 3, name: 'Levies of Galilee' });
    h.spawnArmy(ctx, 'ATG', 'Jericho', { inf: 2, name: 'Guard of the Balsam Groves' });

    h.spawnArmy(ctx, 'HER', 'Hebron', {
      inf: 5, cav: 1, name: 'Host of Idumea',
      general: { name: 'Joseph ben Antipater', fire: 2, shock: 2, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'HER', 'Masada', { inf: 1, name: 'Garrison of the Rock' });
    h.spawnArmy(ctx, 'HER', 'Gaza', { inf: 2, name: 'Coastal Levies' });

    h.spawnArmy(ctx, 'PAR', 'Damascus', {
      inf: 6, cav: 6, name: 'Host of Pacorus',
      general: { name: 'Pacorus', fire: 2, shock: 4, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'PAR', 'Apamea', { inf: 4, cav: 2, name: 'Riders of Barzapharnes' });
    h.spawnArmy(ctx, 'ROM', 'Antioch', {
      inf: 8, cav: 1, name: 'Legions of Syria',
      general: { name: 'Ventidius Bassus', fire: 3, shock: 3, maneuver: 4 },
    });
    h.spawnArmy(ctx, 'ROM', 'Tarsus', { inf: 6, cav: 1, name: 'Legions of Cilicia' });
    h.spawnArmy(ctx, 'PTO', 'Alexandria', { inf: 8, cav: 2, name: 'Army of Egypt' });
    h.spawnArmy(ctx, 'NAB', 'Petra', { inf: 5, cav: 3, name: 'Army of Malichus' });
    h.spawnArmy(ctx, 'ARM', 'Tigranocerta', { inf: 4, name: 'Army of Artavasdes' });
    h.spawnArmy(ctx, 'ADI', 'Arbela', { inf: 2, cav: 2, name: 'The Riders of Arbela' });

    h.notify(ctx, {
      title: "Herod's Rise",
      text: 'The Parthians hold Syria and Antigonus holds Jerusalem. Herod rides south '
        + 'with his family and his ambition — to the Rock, to Petra, and to Rome.',
      type: 'war', provName: 'Jerusalem',
    });
  },

  aiHints: {
    HER: { rally: ['Hebron', 'Gaza'], targetRegiments: 16 },
    ATG: { rally: ['Jerusalem', 'Sepphoris'], targetRegiments: 18 },
    ROM: { rally: ['Antioch', 'Tarsus'], targetRegiments: 36 },
    PAR: { rally: ['Damascus', 'Apamea'], targetRegiments: 22 },
    PTO: { rally: ['Alexandria'], targetRegiments: 14 },
    NAB: { rally: ['Petra'], targetRegiments: 12 },
    ARM: { rally: ['Tigranocerta'], targetRegiments: 8 },
    OSR: { rally: ['Edessa'], targetRegiments: 5 },
    ADI: { rally: ['Arbela'], targetRegiments: 7 },
    CHX: { rally: ['Charax'], targetRegiments: 4 },
    REB: { rally: [], targetRegiments: 0 },
  },

  // Victory rules, checked monthly. Verdicts are chronicled (the full card is
  // reserved for elimination — SPEC §19).
  checkVictory(ctx) {
    try {
      const g = ctx.game;
      const h = ctx.helpers;
      if (!g || g.over || g.result) return;
      const me = g.playerTag;
      if (me === 'ADI') {
        // The Tigris client's contract (SPEC §185): ride the tide, survive
        // the ebb, and be seated when the age settles its accounts.
        const adi = g.tags.ADI;
        const adiAlive = !!(adi && adi.alive !== false);
        const adiProvs = adiAlive ? h.countControlled(ctx, 'ADI', {}) : 0;
        if (adiProvs === 0) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The House Between the Rivers Falls',
            text: 'Arbela is taken and the fords have new masters. The tide the house rode '
              + 'has receded over it, and the road counts out its tolls to somebody else.',
            score: 0,
          });
          return;
        }
        if (dateGE(g.date, -36, 1) && adiAlive && h.controls(ctx, 'ADI', 'Arbela')) {
          const free = !adi.overlord;
          const rich = (adi.treasury || 0) >= 300;
          h.endGame(ctx, {
            result: 'win',
            title: free ? 'A Crown Without a Yoke' : 'The Ebb Found the House Standing',
            text: (free
              ? 'Pacorus is dead, the tide is out, and the house of Arbela owes tribute to '
                + 'nobody: the King of Kings\' writ stops at the Zab. '
              : 'Pacorus is dead and the tide is out, and the house of Arbela is still '
                + 'seated — client, solvent, and unburned. ')
              + (rich
                ? 'The fords pay a full treasury, and the caravan lords write the king\'s '
                  + 'peace into their contracts as a thing with a price.'
                : 'The road still crosses at the house\'s fords, which has outlasted every '
                  + 'empire that promised more.'),
            score: 100 + (free ? 30 : 0) + (rich ? 20 : 0),
          });
          return;
        }
        return;
      }
      if (me !== 'HER' && me !== 'ATG') return;
      const rivalTag = me === 'HER' ? 'ATG' : 'HER';
      const mine = g.tags[me];
      const rival = g.tags[rivalTag];
      const alive = !!(mine && mine.alive !== false);
      if (!alive) return; // elimination handles the funeral
      const jerusalem = h.controls(ctx, me, 'Jerusalem');
      const unified = !rival || !rival.alive || rival.overlord === me;

      if (me === 'HER') {
        if (jerusalem && unified) {
          const early = !dateGE(g.date, -36, 1);
          fireEventById(ctx, 'ev5_antigonus_end');
          h.endGame(ctx, {
            result: 'win',
            title: early ? 'The Kingdom of Herod' : 'A Crown Made True',
            text: 'The Senate\'s paper king is paper no longer. Jerusalem is his; the last '
              + 'Hasmonean is done; and for better and worse the age of Herod begins.',
            score: early ? 200 : 150,
          });
          return;
        }
        if (dateGE(g.date, -35, 1) && !jerusalem) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'A King Without a City',
            text: 'Five years, and the walls of Jerusalem still laugh at the Senate\'s '
              + 'decree. Antony\'s patience is spent; the East is re-let to other men, and '
              + 'the Idumean grows old as a curiosity at Roman dinners.',
            score: Math.max(0, h.countControlled(ctx, me, {}) * 5),
          });
          return;
        }
      } else {
        if (dateGE(g.date, -36, 1) && jerusalem && alive) {
          h.endGame(ctx, {
            result: 'win',
            title: 'The Last Hasmonean Stands',
            text: 'Four years the dynasty\'s last soldier held the city against Rome, '
              + 'Idumea, and time. Whatever comes after, the House of the Maccabees ends '
              + 'standing up.',
            score: unified ? 200 : 150,
          });
          return;
        }
        if (!jerusalem && totalMen(ctx, me) < 3000) {
          fireEventById(ctx, 'ev5_antigonus_end');
          h.endGame(ctx, {
            result: 'loss',
            title: 'The Axe for a King',
            text: 'Rome does not crucify kings; for a king they use the axe, after the '
              + 'lictors\' rods. Antony obliges. The Hasmonean line, one hundred and three '
              + 'years from Modein, ends in Antioch.',
            score: 0,
          });
          return;
        }
      }
    } catch (e) { warnOnce('checkVictory', e); }
  },
};
