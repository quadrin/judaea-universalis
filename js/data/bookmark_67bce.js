// Judaea Universalis — bookmark: The Judaean Civil War, 67 BCE (SPEC §13, §15).
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Historical spine: Josephus, Antiquitates XIII.16–XIV.4 / Bellum I.5–7; Cassius
// Dio XXXVII. Queen Salome Alexandra is dead. Her sons — Hyrcanus the weak elder,
// Aristobulus the able younger — tear the Hasmonean kingdom in half while Pompey
// finishes Mithridates and turns, unhurried, toward the vacuum. This is the first
// bookmark whose central war is fought with the open diplomacy kit: claims,
// alliances, peace deals, even subjugating your own brother.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[bookmark_67bce] ' + key, e || '');
}

function findBrothersWar(game) {
  const wars = (game && game.wars) || [];
  for (const w of wars) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf('HYR') !== -1 && all.indexOf('ARI') !== -1) return w;
  }
  return null;
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

function setOpinion(game, a, b, val) {
  try {
    const ta = game.tags && game.tags[a];
    if (!ta) return;
    if (!ta.opinion || typeof ta.opinion !== 'object') ta.opinion = {};
    ta.opinion[b] = Math.max(-200, Math.min(200, val));
  } catch (e) { warnOnce('setOpinion', e); }
}

// Works for negative (BCE) years: -62 > -63.
function dateGE(date, y, m) {
  return date.y > y || (date.y === y && date.m >= m);
}

function fireEventById(ctx, eventId) {
  try {
    const g = ctx.game;
    const list = ctx.events || [];
    let ev = null;
    for (const e of list) { if (e && e.id === eventId) { ev = e; break; } }
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

export const BOOKMARK_67 = {
  id: '67bce',
  name: 'The Judaean Civil War',
  startDate: { y: -67, m: 4, d: 1 },
  // Technology of the age (SPEC §22): Pompey's Rome fields the Marian legion,
  // two patterns ahead of the quarreling Levant.
  techBase: 4,
  // Rome is a republic until the emperors (SPEC §25).
  govTypes: { ROM: 'republic' },
  techTweaks: { ROM: { mar: 2, gov: 1 }, PAR: { mar: 1 } },

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

  blurb: 'Queen Salome Alexandra is dead, and her sons cannot both be king. Hyrcanus the '
    + 'elder has the high priesthood, the law of succession, and no spine; Aristobulus the '
    + 'younger has the army, the fortresses, and no patience. Idumean Antipater whispers to '
    + 'one, the Nabataean king weighs his price for the other\'s ruin — and far to the north '
    + 'Pompey the Great is finishing the last war that matters, after which he will need '
    + 'something to organize.',

  activeTags: ['HYR', 'ARI', 'ROM', 'SEL', 'PTO', 'NAB', 'ARM', 'PAR', 'OSR', 'ADI', 'CHX'],

  // Political layer for 67 BCE over map_data's 66 CE defaults. The Hasmonean
  // kingdom of Jannaeus is split between the brothers; Syria is the Seleucid
  // rump of Antiochus XIII; Egypt and Cyprus are Ptolemaic; Rome holds only
  // Cilicia and the Anatolian coast — until Pompey turns east by event.
  owners: {
    // -- Hyrcanus (HYR): Idumea, the Shephelah, the coast, Samaria, Perea ------
    'Hebron': 'HYR',
    'Adora': 'HYR',
    'Emmaus': 'HYR',
    'Lydda': 'HYR',
    'Joppa': 'HYR',
    'Jamnia': 'HYR',
    'Azotus': 'HYR',
    'Ascalon': 'HYR',
    'Gaza': 'HYR',
    'Sebaste': 'HYR',
    'Neapolis': 'HYR',
    'Antipatris': 'HYR',
    'Caesarea Maritima': 'HYR', // Straton's Tower in this era; canonical name kept
    'Dora': 'HYR',
    'Gadora': 'HYR',
    'Medaba': 'HYR', // one of the twelve cities Aretas wants back
    // -- Aristobulus (ARI): Jerusalem, the fortresses, Galilee, the Decapolis --
    'Jerusalem': 'ARI',
    'Jericho': 'ARI',
    'Masada': 'ARI',
    'Engaddi': 'ARI',
    'Machaerus': 'ARI',
    'Sepphoris': 'ARI',
    'Jotapata': 'ARI',
    'Tiberias': 'ARI',
    'Tarichaea': 'ARI',
    'Gischala': 'ARI',
    'Gamala': 'ARI',
    'Scythopolis': 'ARI',
    'Pella': 'ARI',
    'Gadara': 'ARI',
    'Gerasa': 'ARI',
    // -- The Seleucid rump of Antiochus XIII (SEL): Syria & Phoenicia ----------
    'Antioch': 'SEL',
    'Seleucia Pieria': 'SEL',
    'Laodicea': 'SEL',
    'Apamea': 'SEL',
    'Emesa': 'SEL',
    'Beroea': 'SEL',
    'Cyrrhus': 'SEL',
    'Zeugma': 'SEL',
    'Samosata': 'SEL',
    'Chalcis': 'SEL',
    'Palmyra': 'SEL',
    'Tyre': 'SEL',
    'Sidon': 'SEL',
    'Berytus': 'SEL',
    'Byblos': 'SEL',
    'Tripolis': 'SEL',
    'Aradus': 'SEL',
    'Caesarea Philippi': 'SEL', // Iturean Panion, folded into the rump
    // -- Nabataea (NAB): the map holdings plus Damascus and the Hauran ---------
    'Damascus': 'NAB',
    'Batanea': 'NAB',
    'Philadelphia': 'NAB',
    // -- Roman Cilicia & the Anatolian coast (ROM, organized by Pompey 67) -----
    'Tarsus': 'ROM',
    'Seleucia Trachea': 'ROM',
    'Attalia': 'ROM',
    'Pisidia': 'ROM',
    'Iconium': 'ROM',
    'Tyana': 'ROM',
    'Caesarea Mazaca': 'ROM', // Cappadocia of Ariobarzanes, a Roman client — folded
    'Melitene': 'ROM',
    // -- Ptolemaic Egypt & Cyprus (PTO) ----------------------------------------
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
    // PAR and ARM keep their map_data holdings (Tigranes licking his wounds,
    // Phraates III watching everyone).
    // -- v5.0: the wider world -------------------------------------------------
    'Corinth': 'ROM', 'Athens': 'ROM', 'Sparta': 'ROM', 'Gortyn': 'ROM',
    'Rhodes': 'ROM', 'Halicarnassus': 'ROM', 'Cyrene': 'ROM',
    'Marmarica': 'PTO', 'Paraetonium': 'PTO', 'Syene': 'PTO',
    'Yathrib': 'NAB', 'Khaybar': 'NAB', 'Berenice': 'PTO',
    'Persepolis': 'PAR', 'Gabae': 'PAR', 'Gerrha': 'CHX',
  },

  // What the era asks of you (SPEC §33) — shown in the realm panel.
  objectives: {
    HYR: [
      'Win: break your brother and unify the realm, then beat Rome back (+40 war score — Pompey will offer his settlement).',
      'Win: by 60 BCE stand unified with Jerusalem, no Roman collar. A client crown by 55 BCE is the lesser verdict.',
      'Lose: the dynasty extinguished, or Jerusalem in the rival\'s hands when the ledger closes.',
    ],
    ARI: [
      'Win: break your brother and unify the realm, then beat Rome back (+40 war score — Pompey will offer his settlement).',
      'Win: by 60 BCE stand unified with Jerusalem, no Roman collar. A client crown by 55 BCE is the lesser verdict.',
      'Lose: the dynasty extinguished, or Jerusalem in the rival\'s hands when the ledger closes.',
    ],
  },

  // The court factions (SPEC §34): the realm's internal parties. The engine
  // ticks them for the human player alone; the AI keeps its politics offstage.
  factions: {
    HYR: [
      {
        id: 'pharisees', name: 'The Pharisees',
        desc: 'The sages and their followings: they crowned your grandmother\'s peace and they prefer the elder line — yours.',
        drift(ctx, t) { return (t.stability || 0) >= 1 ? 0.5 : -0.4; },
        boon: { name: 'The Sages Preach the Elder Line', text: '+0.3 legitimacy a month', effects: { legitimacyAdd: 0.3 } },
        bane: { name: 'The Synagogues Turn', text: '+1 unrest everywhere', effects: { unrestAll: 1 } },
        appease: { label: 'Defer to the sages (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Pharisees Ask for the Council',
          text: 'Salome Alexandra gave them the Sanhedrin and her son Aristobulus would take it back. '
            + 'They ask what you would give: confirm the sages in the council\'s seats, and every '
            + 'synagogue in the land preaches your right — hedge, and they start weighing your brother.',
          grant: { label: 'The seats are theirs', cost: { gov: 50 } },
          refuse: { label: 'A king above the schools', tooltip: 'The weighing begins.' },
        },
      },
      {
        id: 'antipater', name: 'The House of Antipater',
        desc: 'The Idumean who wanted this war for you: money, spies, Nabataean in-laws, and sons worth watching.',
        drift(ctx, t) {
          const g = ctx.game;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.5 : -0.3;
        },
        boon: { name: 'Idumean Silver', text: '+8% income', effects: { incomeMult: 1.08 } },
        bane: { name: 'The Fixer Withholds', text: '−15% reinforcement', effects: { reinforceMult: 0.85 } },
        appease: { label: 'Trust the fixer (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'Antipater Asks for His Sons',
          text: 'He has bought you an army, an ally and half the coast, and he presents the bill with '
            + 'perfect courtesy: offices for Phasael and the boy Herod. Every court needs able men, '
            + 'he says. Every able man needs a court, he does not say.',
          grant: { label: 'Offices for the sons', cost: { infl: 50 } },
          refuse: { label: 'Idumea serves; it does not rule', tooltip: 'The perfect courtesy cools.' },
        },
      },
      {
        id: 'priesthood', name: 'The Temple Priesthood',
        desc: 'The courses of the altar: they anointed you high priest once and want to know who pays for the incense now.',
        drift(ctx, t) {
          try { return ctx.helpers.controls(ctx, 'HYR', 'Jerusalem') ? 0.4 : -0.6; } catch (e) { return 0; }
        },
        boon: { name: 'The Daily Offering Steadies', text: '−0.75 unrest everywhere', effects: { unrestAll: -0.75 } },
        bane: { name: 'The Altar Withholds Its Blessing', text: '−0.25 legitimacy a month', effects: { legitimacyAdd: -0.25 } },
        appease: { label: 'Endow the offerings (80 talents)', cost: { treasury: 80 } },
        demand: {
          title: 'The Priesthood Presents the Accounts',
          text: 'War has emptied the Temple\'s storerooms — the tithes unpaid, the courses unfed, and '
            + 'a brother\'s army between the villages and the altar. The priests ask the high priest '
            + 'to remember what he is high priest of.',
          grant: { label: 'The tithes made whole', cost: { treasury: 120 } },
          refuse: { label: 'The altar must wait for the crown', tooltip: 'The blessing grows faint.' },
        },
      },
    ],
    ARI: [
      {
        id: 'sadducees', name: 'The Sadducees',
        desc: 'The great priestly houses your father favored: rich, proud, and yours as long as you are winning.',
        drift(ctx, t) { return (t.treasury || 0) > 0 ? 0.4 : -0.4; },
        boon: { name: 'The Great Houses Open Their Purses', text: '+8% income', effects: { incomeMult: 1.08 } },
        bane: { name: 'The Great Houses Hedge', text: '−7% income', effects: { incomeMult: 0.93 } },
        appease: { label: 'Confirm the estates (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Sadducees Want Their Estates',
          text: 'Nine years of your mother\'s Pharisees cost the great houses land, offices and pride, '
            + 'and they backed you to get all three back. The deeds are drawn; they need only a seal '
            + '— yours, and soon, while your seal still means something.',
          grant: { label: 'Seal the deeds', cost: { gov: 50 } },
          refuse: { label: 'After the war', tooltip: 'The purses close to a slit.' },
        },
      },
      {
        id: 'captains', name: 'The King\'s Captains',
        desc: 'The mercenaries and garrison commanders who declared for you first — professionals, with professional appetites.',
        drift(ctx, t) {
          const g = ctx.game;
          if ((t.treasury || 0) < 0) return -0.6;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.5 : -0.4;
        },
        boon: { name: 'The Garrisons Stand Fast', text: '+5% morale', effects: { moraleMult: 1.05 } },
        bane: { name: 'The Captains Bargain', text: '−6% morale', effects: { moraleMult: 0.94 } },
        appease: { label: 'A donative for the captains (100 talents)', cost: { treasury: 100 } },
        demand: {
          title: 'The Captains Name the Donative',
          text: 'Twenty-two fortresses declared for you in a single week — your father\'s men, bought '
            + 'with your father\'s reputation. The reputation is spent; the men remain, and they '
            + 'remind you, respectfully, that fortresses can declare twice.',
          grant: { label: 'Pay the donative', cost: { treasury: 150 } },
          refuse: { label: 'Loyalty is not for sale', tooltip: 'Everything is for sale. The price merely rises.' },
        },
      },
      {
        id: 'priesthood', name: 'The Temple Priesthood',
        desc: 'The courses of the altar: you wear the diadem and the ephod both, and the priests watch how you carry each.',
        drift(ctx, t) {
          try { return ctx.helpers.controls(ctx, 'ARI', 'Jerusalem') ? 0.4 : -0.6; } catch (e) { return 0; }
        },
        boon: { name: 'The Daily Offering Steadies', text: '−0.75 unrest everywhere', effects: { unrestAll: -0.75 } },
        bane: { name: 'The Altar Withholds Its Blessing', text: '−0.25 legitimacy a month', effects: { legitimacyAdd: -0.25 } },
        appease: { label: 'Endow the offerings (80 talents)', cost: { treasury: 80 } },
        demand: {
          title: 'The Priesthood Presents the Accounts',
          text: 'The storerooms empty, the courses unfed, and the high priesthood itself the prize of '
            + 'a civil war: the priests ask the younger son to prove the altar gains by his winning '
            + '— in silver, the language every argument at court eventually reaches.',
          grant: { label: 'The tithes made whole', cost: { treasury: 120 } },
          refuse: { label: 'The altar must wait for the crown', tooltip: 'The blessing grows faint.' },
        },
      },
    ],
  },
  playableTags: [
    {
      tag: 'HYR',
      difficulty: 'Moderate',
      blurb: 'You did not want this war — Antipater wanted it for you. Your brother has the '
        + 'army, so you must have everything else: Idumea\'s levies, the coastal customs '
        + 'houses, Aretas\' cavalry (he names his price in cities), and in time the favor of '
        + 'whichever Roman turns up to inherit the East. Win before Pompey arrives, or make '
        + 'sure that when he does, the elder brother is the convenient one.',
    },
    {
      tag: 'ARI',
      difficulty: 'Hard',
      blurb: 'You took the crown because your brother would have dropped it. Jerusalem, the '
        + 'desert fortresses, Galilee and the army are yours; against you stand Idumean '
        + 'money, Nabataean lances, and time itself — every season the war drags on brings '
        + 'Pompey\'s settlement of the East one season closer. Unify the kingdom fast, and '
        + 'dig in deep enough that even Rome prefers to deal.',
    },
  ],

  // Courts of 67 BCE.
  rulers: {
    HYR: { name: 'Hyrcanus II', title: 'High Priest', gov: 1, infl: 2, mar: 1, age: 46 },
    ARI: {
      name: 'Aristobulus II', title: 'King and High Priest', gov: 2, infl: 2, mar: 4, age: 33,
      heir: { name: 'Alexander of Judaea', gov: 2, infl: 2, mar: 3, age: 18 },
    },
    ROM: { name: 'Pompeius Magnus', title: 'Proconsul of the East', gov: 4, infl: 4, mar: 5, age: 39 },
    SEL: { name: 'Antiochus XIII Asiaticus', title: 'Basileus', gov: 1, infl: 1, mar: 1, age: 27 },
    PTO: {
      name: 'Ptolemy XII Auletes', title: 'Pharaoh', gov: 1, infl: 3, mar: 1, age: 50,
      heir: { name: 'Berenice IV', gov: 2, infl: 2, mar: 1, age: 10 },
    },
    NAB: { name: 'Aretas III Philhellen', title: 'King', gov: 3, infl: 3, mar: 2, age: 55 },
    ARM: {
      name: 'Tigranes II the Great', title: 'King of Kings', gov: 3, infl: 2, mar: 3, age: 73,
      heir: { name: 'Artavasdes II', gov: 2, infl: 3, mar: 2, age: 25 },
    },
    PAR: { name: 'Phraates III', title: 'King of Kings', gov: 2, infl: 3, mar: 3, age: 45 },
  },

  // Linear mission chains (realm panel).
  missions: {
    HYR: [
      {
        id: 'h4_levy', name: 'Idumea Answers',
        desc: 'Keep nine thousand men in the field — Antipater\'s country will provide.',
        rewardText: '+1,500 manpower.',
        check: (ctx) => totalMen(ctx, 'HYR') >= 9000,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { manpower: 1500 }),
      },
      {
        id: 'h4_aretas', name: 'The Price of Petra',
        desc: 'Bring Aretas into the war (his price is the twelve cities), or raise Nabataea\'s opinion of us to +100.',
        rewardText: 'Nabataean lances: +25 martial points.',
        check: (ctx) => !!ctx.helpers.getFlag(ctx, 'aretasMarches')
          || ((ctx.game.tags.NAB && ctx.game.tags.NAB.opinion && ctx.game.tags.NAB.opinion.HYR) || 0) >= 100,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { mar: 25 }),
      },
      {
        id: 'h4_city', name: 'The City of David',
        desc: 'Take Jerusalem from your brother.',
        rewardText: '+20 legitimacy — the high priesthood, restored in fact.',
        check: (ctx) => ctx.helpers.controls(ctx, 'HYR', 'Jerusalem'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { legitimacy: 20 }),
      },
      {
        id: 'h4_one_crown', name: 'One Crown',
        desc: 'End the division: your brother\'s realm extinguished, or bent to you as a client.',
        rewardText: '+1 stability, +15 legitimacy.',
        check: (ctx) => {
          const r = ctx.game.tags.ARI;
          return !r || !r.alive || r.overlord === 'HYR';
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { stability: 1, legitimacy: 15 }),
      },
      {
        id: 'h4_web', name: 'Antipater\'s Web',
        desc: 'Fill the treasury to 400 talents — customs houses, tolls, and quiet arrangements.',
        rewardText: '+25 governance and +25 influence points.',
        check: (ctx) => (ctx.game.tags.HYR.treasury || 0) >= 400,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { gov: 25, infl: 25 }),
      },
    ],
    ARI: [
      {
        id: 'a4_army', name: 'The King\'s Army',
        desc: 'Keep eleven thousand men in the field.',
        rewardText: '+1,500 manpower.',
        check: (ctx) => totalMen(ctx, 'ARI') >= 11000,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { manpower: 1500 }),
      },
      {
        id: 'a4_break', name: 'Break the Elder',
        desc: 'Reach +15 war score against your brother.',
        rewardText: '+25 martial points.',
        check: (ctx) => warscoreVs(ctx, 'ARI', 'HYR') >= 15,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { mar: 25 }),
      },
      {
        id: 'a4_idumea', name: 'Into Idumea',
        desc: 'Take Hebron and Adora — cut the web at the spider.',
        rewardText: 'Antipater\'s estates: +100 talents.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ARI', 'Hebron') && ctx.helpers.controls(ctx, 'ARI', 'Adora'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { treasury: 100 }),
      },
      {
        id: 'a4_one_crown', name: 'One Crown',
        desc: 'End the division: your brother\'s realm extinguished, or bent to you as a client.',
        rewardText: '+1 stability, +15 legitimacy.',
        check: (ctx) => {
          const r = ctx.game.tags.HYR;
          return !r || !r.alive || r.overlord === 'ARI';
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { stability: 1, legitimacy: 15 }),
      },
      {
        id: 'a4_treasury', name: 'The Temple Treasury',
        desc: 'Fill the treasury to 400 talents.',
        rewardText: '+25 governance and +25 martial points.',
        check: (ctx) => (ctx.game.tags.ARI.treasury || 0) >= 400,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { gov: 25, mar: 25 }),
      },
    ],
  },

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

    // The Tigris kingdoms ride in Parthia's train (v2.1): clients of the
    // King of Kings, paying tribute, joining his wars through sameSide.
    for (const cl of ['OSR', 'ADI', 'CHX']) {
      if (g.tags[cl] && g.tags.PAR) g.tags[cl].overlord = 'PAR';
    }

    // --- The war of the brothers. NEGOTIABLE: this is the first bookmark whose
    // central war can end at the peace table — cede, tribute, or a brother
    // bent to clienthood. Aristobulus struck first, historically and here.
    h.declareWar(ctx, 'ARI', 'HYR', 'The War of the Brothers');

    // NAB allies with Hyrcanus AFTER the declaration (Aretas joins the war
    // itself only when his price is paid — ev4_aretas_price).
    try {
      const hyr = g.tags.HYR, nab = g.tags.NAB;
      if (hyr && nab) {
        if (hyr.allies.indexOf('NAB') === -1) hyr.allies.push('NAB');
        if (nab.allies.indexOf('HYR') === -1) nab.allies.push('HYR');
      }
    } catch (e) { warnOnce('setup:nab', e); }

    // --- Treasuries, manpower, stability, legitimacy. -------------------------
    h.adjust(ctx, 'HYR', { treasury: 150, manpower: 4000, legitimacy: 35 });
    h.adjust(ctx, 'ARI', { treasury: 120, manpower: 6000, stability: 1, legitimacy: 45 });
    h.adjust(ctx, 'SEL', { treasury: 60, stability: -1, legitimacy: 20 });
    h.adjust(ctx, 'PTO', { treasury: 200, stability: -1, legitimacy: 30 });
    h.adjust(ctx, 'NAB', { treasury: 150, stability: 1 });
    h.adjust(ctx, 'ARM', { treasury: 100, stability: -1, legitimacy: 30 });
    h.adjust(ctx, 'PAR', { treasury: 200, stability: 1, legitimacy: 20 });
    h.adjust(ctx, 'ROM', { treasury: 600, stability: 2, legitimacy: 60 });

    // --- Opinions. -------------------------------------------------------------
    setOpinion(g, 'HYR', 'ARI', -180); setOpinion(g, 'ARI', 'HYR', -180);
    setOpinion(g, 'NAB', 'HYR', 80);   setOpinion(g, 'HYR', 'NAB', 80);
    setOpinion(g, 'NAB', 'ARI', -80);  setOpinion(g, 'ARI', 'NAB', -60);
    setOpinion(g, 'ARM', 'ROM', -80);  setOpinion(g, 'ROM', 'ARM', -40);
    setOpinion(g, 'PAR', 'ROM', -60);  setOpinion(g, 'ROM', 'PAR', -50);
    setOpinion(g, 'ARM', 'PAR', -40);
    setOpinion(g, 'SEL', 'ROM', -30);

    // --- Starting modifiers. ----------------------------------------------------
    // Pompey is finishing the pirates and Mithridates: Rome's eastern legions
    // hold their lines until the settlement of the East begins (ev4_pompey_syria).
    h.addTagModifier(ctx, 'ROM', {
      id: 'wars_elsewhere', name: 'Wars Elsewhere', months: 40,
      effects: { aiPassive: true },
    });
    h.addTagModifier(ctx, 'ARI', {
      id: 'kings_army', name: 'The King\'s Army', months: 24,
      effects: { disciplineMult: 1.05 },
    });
    h.addTagModifier(ctx, 'HYR', {
      id: 'antipaters_credit', name: 'Antipater\'s Credit', months: 36,
      effects: { maintMult: 0.8, incomeMult: 1.05 },
    });

    // --- Starting armies & generals. ---------------------------------------------
    h.spawnArmy(ctx, 'ARI', 'Jerusalem', {
      inf: 7, cav: 1, name: 'Army of the King',
      general: { name: 'Aristobulus II', fire: 2, shock: 3, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'ARI', 'Machaerus', { inf: 2, name: 'Garrison of the Fortresses' });
    h.spawnArmy(ctx, 'ARI', 'Sepphoris', { inf: 2, name: 'Levies of Galilee' });

    h.spawnArmy(ctx, 'HYR', 'Hebron', {
      inf: 5, cav: 1, name: 'Host of Idumea',
      general: { name: 'Antipater the Idumean', fire: 2, shock: 2, maneuver: 4 },
    });
    h.spawnArmy(ctx, 'HYR', 'Emmaus', { inf: 2, name: 'Men of the Shephelah' });
    h.spawnArmy(ctx, 'HYR', 'Gaza', { inf: 2, name: 'Coastal Levies' });

    h.spawnArmy(ctx, 'NAB', 'Petra', {
      inf: 5, cav: 3, name: 'Army of Aretas',
      general: { name: 'Aretas III', fire: 2, shock: 2, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'SEL', 'Antioch', { inf: 5, name: 'The Last Phalanx' });
    h.spawnArmy(ctx, 'PTO', 'Alexandria', { inf: 8, cav: 2, name: 'Army of Egypt' });
    h.spawnArmy(ctx, 'ARM', 'Tigranocerta', { inf: 5, name: 'Army of Tigranes' });
    h.spawnArmy(ctx, 'PAR', 'Seleucia-Ctesiphon', { inf: 12, cav: 6, name: 'Royal Army of Parthia' });
    h.spawnArmy(ctx, 'ROM', 'Tarsus', {
      inf: 10, cav: 2, name: 'Legions of Cilicia',
      general: { name: 'Afranius', fire: 2, shock: 3, maneuver: 2 },
    });

    h.notify(ctx, {
      title: 'The Judaean Civil War',
      text: 'Salome Alexandra is dead. Aristobulus has seized the crown; Hyrcanus flees to '
        + 'Idumea, where Antipater is already writing letters to Petra. The kingdom of the '
        + 'Maccabees goes to war with itself.',
      type: 'war', provName: 'Jerusalem',
    });
  },

  aiHints: {
    HYR: { rally: ['Hebron', 'Emmaus'], targetRegiments: 16 },
    ARI: { rally: ['Jerusalem', 'Jericho'], targetRegiments: 18 },
    ROM: { rally: ['Tarsus', 'Antioch'], targetRegiments: 40 },
    SEL: { rally: ['Antioch'], targetRegiments: 10 },
    PTO: { rally: ['Alexandria'], targetRegiments: 14 },
    NAB: { rally: ['Petra'], targetRegiments: 12 },
    ARM: { rally: ['Tigranocerta'], targetRegiments: 8 },
    PAR: { rally: ['Seleucia-Ctesiphon'], targetRegiments: 20 },
    OSR: { rally: ['Edessa'], targetRegiments: 5 },
    ADI: { rally: ['Arbela'], targetRegiments: 7 },
    CHX: { rally: ['Charax'], targetRegiments: 4 },
    REB: { rally: [], targetRegiments: 0 },
  },

  // Victory rules, checked monthly.
  checkVictory(ctx) {
    try {
      const g = ctx.game;
      const h = ctx.helpers;
      if (!g || g.over || g.result) return;
      const me = g.playerTag;
      if (me !== 'HYR' && me !== 'ARI') return;
      const rivalTag = me === 'HYR' ? 'ARI' : 'HYR';
      const mine = g.tags[me];
      const rival = g.tags[rivalTag];
      const alive = !!(mine && mine.alive !== false);
      const myProvs = alive ? h.countControlled(ctx, me, {}) : 0;
      const jerusalem = alive && h.controls(ctx, me, 'Jerusalem');
      const unified = !rival || !rival.alive || rival.overlord === me;
      const romanClient = !!(mine && mine.overlord === 'ROM');

      // Losses first: the house falls, or Rome takes the city and the field.
      if (!alive || myProvs === 0) {
        h.endGame(ctx, {
          result: 'loss',
          title: 'The House Divided Falls',
          text: 'The last Hasmonean banner comes down. What the Seleucids could not do in '
            + 'forty years, the brothers did to each other in five — and strangers will '
            + 'divide the inheritance.',
          score: 0,
        });
        return;
      }
      const romWs = warscoreVs(ctx, me, 'ROM');
      const atWarWithRome = (mine.atWarWith || []).indexOf('ROM') >= 0 && g.tags.ROM && g.tags.ROM.alive;
      if (h.getFlag(ctx, 'pompeyCame') && !jerusalem && totalMen(ctx, me) < 3000
          && g.tags.ROM && h.controls(ctx, 'ROM', 'Jerusalem')) {
        h.endGame(ctx, {
          result: 'loss',
          title: 'Pompey in the Holy of Holies',
          text: 'The Roman walked into the sanctuary, looked at the empty throne of the '
            + 'invisible God, touched nothing, and walked out — which was worse than '
            + 'plunder. Judaea will pay tribute, and the brothers will grow old as exhibits '
            + 'in other men\'s triumphs.',
          score: Math.max(0, myProvs * 5),
        });
        return;
      }
      // Early concession (SPEC §32): Pompey OFFERS his settlement at +40 —
      // an event card the player may accept or refuse. Offered once.
      if (unified && atWarWithRome && romWs >= 40 && !h.getFlag(ctx, 'romeTermsOffered')) {
        h.setFlag(ctx, 'romeTermsOffered', true);
        h.fireEvent(ctx, 'ev4_rome_recoils');
        return;
      }
      // Timed reckonings: 60 BCE for the free crown, 55 BCE closes the book.
      if (dateGE(g.date, -60, 1) && unified && jerusalem && !romanClient) {
        fireEventById(ctx, 'ev4_kingdom_restored');
        h.endGame(ctx, {
          result: 'win',
          title: 'The Kingdom Restored',
          text: 'One crown, one altar, and a Roman East that has decided Judaea is more '
            + 'useful whole than broken. The kingdom of Jannaeus stands again — bruised, '
            + 'watchful, and free.',
          score: 180,
        });
        return;
      }
      if (dateGE(g.date, -60, 1) && unified && jerusalem && romanClient) {
        h.endGame(ctx, {
          result: 'win',
          title: 'Client of Rome',
          text: 'The kingdom is whole and the crown sits on one head — bowed. Tribute sails '
            + 'west each spring, and a prefect\'s letter can still ruin any week; but the '
            + 'Temple stands, the Law runs, and the dynasty endures on Rome\'s sufferance.',
          score: 100,
        });
        return;
      }
      if (dateGE(g.date, -55, 1)) {
        if (jerusalem) {
          h.endGame(ctx, {
            result: 'win',
            title: 'An Uneasy Ethnarchy',
            text: 'Twelve years of war have settled nothing cleanly, but the city is yours '
              + 'and the other claims have gone quiet. History will call it a reign; you '
              + 'know it was a siege that never quite ended.',
            score: 60,
          });
        } else {
          h.endGame(ctx, {
            result: 'loss',
            title: 'A Roman Province',
            text: 'The quarrel outlived every chance of winning it. Syria has a governor '
              + 'now, Judaea a tax farmer, and the brothers\' war is remembered mainly as '
              + 'the invitation.',
            score: 0,
          });
        }
      }
    } catch (e) { warnOnce('checkVictory', e); }
  },
};
