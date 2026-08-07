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

function findBrothersWar(game) {
  const wars = (game && game.wars) || [];
  for (const w of wars) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(warTag(game, 'HYR')) !== -1 && all.indexOf(warTag(game, 'ARI')) !== -1) return w;
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

// Works for negative (BCE) years: -62 > -63.
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
  // SPEC §121: the year after which this chapter's own undated trigger
  // cards stop belonging to anybody — the war of the brothers and the house that came out of it.
  // A card that legitimately runs later says so with its own maxYear.
  generationHorizon: -25,
  // Technology of the age (SPEC §22): Pompey's Rome fields the Marian legion,
  // two patterns ahead of the quarreling Levant.
  techBase: 4,
  // How far up the ladder this age can climb (SPEC §99). Pompey's century stops at the professional legion (SPEC §99).
  techCeiling: 9,
  // Rome is a republic until the emperors (SPEC §25).
  govTypes: { ROM: 'republic' },
  techTweaks: { ROM: { mar: 2, gov: 1 }, PAR: { mar: 1 } },
  // The rungs' own names (SPEC §179): the arts of the late Hasmonean world,
  // where every court is learning the Roman grammar whether it wants to or not.
  techNames: {
    gov: {
      3: 'The Elders\' Custom', 4: 'The King\'s Assessment', 5: 'The Fortress Registers',
      6: 'The Sanhedrin\'s Writ', 7: 'The Royal Chancery', 8: 'The Tax Farmers\' Books',
      9: 'The Governor\'s Census',
    },
    infl: {
      3: 'The Market Criers', 4: 'The Temple Envoys', 5: 'The Schools\' Dispute',
      6: 'The Dinner Diplomacy', 7: 'The Caravan Accords', 8: 'The Roman Grammar',
      9: 'The Proconsul\'s Ear',
    },
    mar: {
      3: 'The Town Levies', 4: 'The Royal Garrisons', 5: 'The Drilled Line',
      6: 'The Hired Companies', 7: 'The Fortress Art', 8: 'The Legion Observed',
      9: 'The Professional Host',
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

  // The conquerors' pens wait on integration (SPEC §66). A Jewish pen also
  // requires a Jewish community of the owner's culture; non-Jewish pens keep
  // the older integration-or-culture threshold. Until then — and again the
  // moment the land changes hands — the era names above hold.
  integratedNames: {
    // The Roman pen: what the dispatches and itineraries wrote on the
    // conquered east. Pompey's Decapolis needs no entries — the "liberated"
    // poleis (Scythopolis, Pella, Gadara, Gerasa, Philadelphia) already wear
    // their Greek names on this bookmark's map, so the pen only writes where
    // the era table (or the Hebrew map) says something else.
    ROM: {
      'Jerusalem': 'Hierosolyma',              // the name in Pompey's dispatches
      'Jericho': 'Hiericus',                   // Strabo's spelling for the balsam garden
      'Joppa': 'Iope',                         // the harbor detached from Judaea, Greek again
      'Sebaste': 'Gabinia',                    // Gabinius rebuilds Samaria and signs it
      'Caesarea Maritima': 'Turris Stratonis', // Straton's Tower in the itineraries' Latin
    },
    // The Hasmonean pens (either brother writes the same Hebrew): the Greek
    // coast and the Decapolis under the names of the conquering Law — only
    // once truly absorbed, as Jannaeus absorbed them once before.
    HYR: {
      'Ptolemais': 'Akko', 'Dora': 'Dor', 'Joppa': 'Yafo',
      'Azotus': 'Ashdod', 'Ascalon': 'Ashkelon', 'Gaza': 'Azza',
      'Scythopolis': 'Beit She\'an', 'Pella': 'Pehal', 'Gadara': 'Gader',
      'Philadelphia': 'Rabbat Ammon',
    },
    ARI: {
      'Ptolemais': 'Akko', 'Dora': 'Dor', 'Joppa': 'Yafo',
      'Azotus': 'Ashdod', 'Ascalon': 'Ashkelon', 'Gaza': 'Azza',
      'Scythopolis': 'Beit She\'an', 'Pella': 'Pehal', 'Gadara': 'Gader',
      'Philadelphia': 'Rabbat Ammon',
    },
    // The restored kingdom and the proclaimed Israel keep writing the same
    // Hebrew whichever brother's house they grew from (alias tables).
    HAS: 'HYR',
    MLI: 'HYR',
  },

  blurb: 'Queen Salome Alexandra is dead, and her sons cannot both be king. Hyrcanus the '
    + 'elder has the high priesthood, the law of succession, and no spine; Aristobulus the '
    + 'younger has the army, the fortresses, and no patience. Idumean Antipater whispers to '
    + 'one, the Nabataean king weighs his price for the other\'s ruin — and far to the north '
    + 'Pompey the Great is finishing the last war that matters, after which he will need '
    + 'something to organize.',

  // v5.4: PNT joins — Mithridates VI, restored at Zela, awaiting Pompey.
  activeTags: [
    'HYR', 'ARI', 'ROM', 'SEL', 'PTO', 'NAB', 'ARM', 'PAR',
    'OSR', 'ADI', 'CHX', 'CMG', 'ITU', 'PNT',
    // The political west (SPEC §173): Sertorius three years buried, Gaul one
    // generation from Caesar, Burebista's Dacia rising. Seated by
    // js/data/political_maps.js.
    'NUM', 'MAU', 'GRM', 'MAS', 'LUS',
    'AVN', 'AED', 'SEQ', 'BLG', 'ARO', 'AQT', 'NOR', 'BOI',
    'BRT', 'CAL', 'HIB',
    'SUE', 'CHE', 'CHA', 'FRS', 'CIM', 'SCN', 'GOT', 'AES',
    'DLM', 'SCO', 'DRD', 'THR', 'DAC',
    'BOS', 'SCY', 'SRM', 'VEN',
    // The political east and south (SPEC §205): the Kandake's Kush, the
    // incense crowns, Sakastan on the Helmand, the walled Oxus oases.
    'KSH', 'SAB', 'HMY', 'HDR', 'SAK', 'CHO',
  ],
  // Standing rivalries (SPEC §73): Rome and Parthia begin the century of
  // wars over the Euphrates line, and Tigranes' Armenia contests the same
  // marches with the Arsacids. In the west (SPEC §173), Burebista has begun
  // the wars that will empty the Boii country, and the Dalmatian federation
  // wants its port back.
  rivalries: [['ROM', 'PAR'], ['ARM', 'PAR'],
    ['DAC', 'BOI'], ['DAC', 'SCO'], ['DLM', 'ROM'], ['AED', 'SEQ']],
  // Historical friends (SPEC §86): Aretas marched for Hyrcanus and went home
  // again — Nabataea is the brothers' natural friend either way. Rome's
  // friendship is real for whichever brother courts it, and the Arsacid
  // alternative only exists for a court that turns east.
  affinities: [
    ['HYR', 'NAB'], ['ARI', 'NAB'],
    ['HYR', 'ROM', { axis: 'alignment', sign: 1 }],
    ['ARI', 'ROM', { axis: 'alignment', sign: 1 }],
    ['HYR', 'PAR', { axis: 'alignment', sign: -1 }],
    ['ARI', 'PAR', { axis: 'alignment', sign: -1 }],
  ],
  // The crown war (SPEC §226): Salome Alexandra's two sons are two claimants
  // to one kingdom, and the war between them is over which of them is king —
  // not over the Shephelah. Aretas' lances fight it and do not settle it, and
  // at 80 war score the table may write what neither brother would concede at
  // twenty: the loser renounces, and Jannaeus' kingdom is whole again under
  // the winner. The alternative history the chapter is built to offer is a
  // civil war that ENDS before Pompey arrives to settle it for them.
  crownWar: { claimants: ['ARI', 'HYR'], of: 'Judaea' },

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
    'Samosata': 'CMG',
    'Chalcis': 'ITU',
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
    // -- v5.4: the frame grows west and north ----------------------------------
    // Italy, Sicily, Libya, Macedonia, Bithynia and Galatia keep their base
    // Roman ownership. Mithridates, back at Zela this very year, holds the
    // Pontic core and Colchis for one more act; Tigranes' Caucasus sphere
    // stands; Hyrcania is long Parthian.
    'Sinope': 'PNT', 'Trapezus': 'PNT', 'Phasis': 'PNT',
    'Caucasian Albania': 'ARM',
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
    ADI: [
      'Win: the house stands in 60 BCE — Arbela held through Armenia\'s fall and Pompey\'s settlement.',
      'Win: the greater verdict — stand free of every overlord, or stand rich on the road\'s custom.',
      'Lose: the house between the rivers falls — every province gone.',
    ],
  },

  // Both brothers inherited the same argument (SPEC §190/§201) — and the same
  // two houses, standing at opposite ends of it. Adiabene's court is having a
  // different quarrel in a different language and is given none of this.
  schools: { HYR: 'sages_and_houses', ARI: 'sages_and_houses' },

  // The court factions (SPEC §34): the realm's internal parties. The engine
  // ticks them for the human player alone; the AI keeps its politics offstage.
  factions: {
    HYR: [
      {
        id: 'pharisees', name: 'The Pharisees',
        start: 70,
        desc: 'The sages and their followings: they crowned your grandmother\'s peace and they prefer the elder line — yours.',
        drift(ctx, t) { return (t.stability || 0) >= 1 ? 0.5 : -0.4; },
        boon: {
          name: 'The Sages Preach the Elder Line',
          text: '+0.3 legitimacy a month, −0.6 unrest everywhere',
          effects: { legitimacyAdd: 0.3, unrestAll: -0.6 },
        },
        bane: {
          name: 'The Synagogues Turn',
          text: '+1 unrest everywhere, −8% manpower',
          effects: { unrestAll: 1, manpowerMult: 0.92 },
        },
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
        id: 'sadducees', name: 'The Sadducees',
        start: 30,
        desc: 'The great priestly houses backed your brother, but they still sit in your court: estates, Temple offices, and loyalties that can be bought back.',
        drift(ctx, t) { return (t.treasury || 0) > 0 ? 0.3 : -0.4; },
        boon: {
          name: 'The Great Houses Reopen Their Purses',
          text: '+6% income, +8% from the ascents',
          effects: { incomeMult: 1.06, pilgrimMult: 1.08 },
        },
        bane: {
          name: 'The Great Houses Question the Elder',
          text: '−0.15 legitimacy a month, −5% income',
          effects: { legitimacyAdd: -0.15, incomeMult: 0.95 },
        },
        appease: { label: 'Confirm their Temple estates (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Sadducees Bring Their Deeds',
          text: 'The great houses chose the younger brother, but not every deed and office followed '
            + 'him out of Jerusalem. They offer the elder line a bargain: confirm their estates '
            + 'and the Temple aristocracy can discover that legitimacy has more than one reading.',
          grant: { label: 'Confirm the deeds', cost: { gov: 50 } },
          refuse: { label: 'They backed the usurper', tooltip: 'Their remaining purses close.' },
        },
      },
      {
        id: 'antipater', name: 'The House of Antipater',
        priestly: false, // an Idumean house; no reading of the Law seats them at the altar (SPEC §190)
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
        start: 75,
        desc: 'The great priestly houses your father favored: rich, proud, and yours as long as you are winning.',
        drift(ctx, t) { return (t.treasury || 0) > 0 ? 0.4 : -0.4; },
        boon: {
          name: 'The Great Houses Open Their Purses',
          text: '+8% income, +8% from the ascents',
          effects: { incomeMult: 1.08, pilgrimMult: 1.08 },
        },
        bane: {
          name: 'The Great Houses Hedge',
          text: '−7% income, −10% reinforcement',
          effects: { incomeMult: 0.93, reinforceMult: 0.90 },
        },
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
        id: 'pharisees', name: 'The Pharisees',
        start: 25,
        desc: 'The sages favored your mother’s peace and your brother’s elder claim. They remain in every town you mean to rule, whether invited to court or not.',
        drift(ctx, t) { return (t.stability || 0) >= 1 ? 0.3 : -0.5; },
        boon: {
          name: 'The Sages Accept the Younger Line',
          text: '+0.2 legitimacy a month, −0.6 unrest everywhere',
          effects: { legitimacyAdd: 0.2, unrestAll: -0.6 },
        },
        bane: {
          name: 'The Synagogues Denounce the Seizure',
          text: '+1 unrest everywhere, −8% manpower',
          effects: { unrestAll: 1, manpowerMult: 0.92 },
        },
        appease: { label: 'Hear the sages (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Pharisees Ask for the Council',
          text: 'Your mother gave the sages the council; your captains gave you the fortresses. '
            + 'The Pharisees ask whether the younger son means to govern every village from a '
            + 'garrison, or whether the schools will keep a voice under the new crown.',
          grant: { label: 'The council keeps its voice', cost: { gov: 50 } },
          refuse: { label: 'The fortresses have spoken', tooltip: 'The schools answer in every town.' },
        },
      },
      {
        id: 'captains', name: 'The King\'s Captains',
        priestly: false, // hired soldiers, half of them foreign (SPEC §190)
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
    ADI: [
      {
        id: 'magi', name: 'The Fire Priests of Arbela',
        desc: 'The altars older than the house\'s new prayers: the Magi keep the old fires and watch the court\'s westward drift with narrowed eyes.',
        drift(ctx, t) { return (t.stability || 0) >= 1 ? 0.3 : -0.5; },
        boon: { name: 'The Old Rites Steady the Land', text: '−0.5 unrest everywhere', effects: { unrestAll: -0.5 } },
        bane: { name: 'The Altars Murmur', text: '−0.2 legitimacy a month', effects: { legitimacyAdd: -0.2 } },
        appease: { label: 'Honor the fires (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Magi Ask Whose Gods Keep This House',
          text: 'The fire priests have buried three generations of this dynasty by the old rites, '
            + 'and they have counted the sabbath lamps multiplying in the palace windows. They ask '
            + 'for the festivals kept publicly, at the king\'s expense, in the king\'s presence.',
          grant: { label: 'The king attends the fires', cost: { treasury: 80 } },
          refuse: { label: 'The house prays as it pleases', tooltip: 'The altars remember who stopped coming.' },
        },
      },
      {
        id: 'caravans', name: 'The Caravan Lords',
        desc: 'The masters of the Tigris fords and the Gulf Road\'s northern tolls: silk east, silver west, and no patience for wars that close either.',
        drift(ctx, t) {
          return (t.atWarWith || []).length ? -0.6 : 0.4;
        },
        boon: { name: 'The Tolls Flow', text: '+10% income', effects: { incomeMult: 1.1 } },
        bane: { name: 'The Roads Go Around', text: '−10% income', effects: { incomeMult: 0.9 } },
        appease: { label: 'Remit a season\'s tolls (50 talents)', cost: { treasury: 50 } },
        demand: {
          title: 'The Caravans Want the Fords Guarded',
          text: 'Armenia\'s collapse has filled the roads with unpaid soldiers, and the lords of '
            + 'the caravans are blunt: a kingdom that lives on transit lives on safety. Guards '
            + 'at every ford, or the silk finds a southern crossing.',
          grant: { label: 'Guards at the fords', cost: { treasury: 70 } },
          refuse: { label: 'The road pays for its own guards', tooltip: 'The southern crossing prospers.' },
        },
      },
      {
        id: 'riders', name: 'The Riders of Arbela',
        desc: 'The armored horse of the Tigris bank — the arm every overlord values, and the pride of every landed family.',
        drift(ctx, t) {
          const g = ctx.game;
          if ((t.treasury || 0) < 0) return -0.7;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.5 : -0.1;
        },
        boon: { name: 'The Lances Sharp', text: '+5% discipline', effects: { disciplineMult: 1.05 } },
        bane: { name: 'The Families Keep Their Sons', text: '−12% manpower', effects: { manpowerMult: 0.88 } },
        appease: { label: 'Barding and remounts (50 talents)', cost: { treasury: 50 } },
        demand: {
          title: 'The Riders Ask for a War Worth Riding To',
          text: 'Tigranes is broken, Pompey is far away, and the landed families have armored '
            + 'sons with nothing to charge. Pay for the muster they keep, or point it at '
            + 'something — the lances do not care greatly which.',
          grant: { label: 'Pay for the muster', cost: { treasury: 80 } },
          refuse: { label: 'The lances wait on the house\'s word', tooltip: 'The families count the seasons.' },
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
    {
      tag: 'ADI',
      difficulty: 'Hard',
      blurb: 'The kingdom of the Tigris fords, barely out from under Tigranes\' shadow and '
        + 'already bowing to the King of Kings. Two provinces, the Gulf Road\'s northern '
        + 'tolls, and a court where the fire priests watch the house drift toward the God '
        + 'of Israel — keep the yoke light, the caravans moving, and the west in view.',
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
    // The Tigris client (SPEC §185): the record between Abdissares' coins and
    // Izates' conversion is a dynasty of names; the game seats the plausible one.
    ADI: {
      name: 'Abdissares II', title: 'King', gov: 2, infl: 2, mar: 3, age: 44,
      heir: { name: 'Izates', gov: 2, infl: 3, mar: 2, age: 15 },
    },
    CMG: { name: 'Antiochus I Theos', title: 'King', gov: 4, infl: 4, mar: 2, age: 31 },
    ITU: { name: 'Ptolemy son of Mennaeus', title: 'Tetrarch and High Priest', gov: 3, infl: 3, mar: 2, age: 58 },
    // v5.4: the old lion, restored at Zela this very year, waiting for Pompey
    PNT: { name: 'Mithridates VI Eupator', title: 'King', gov: 3, infl: 4, mar: 4, age: 68 },
    // The political west (SPEC §173): the three crowned heads worth naming.
    // Burebista is a decade into making one Dacia out of many; Hiempsal sits
    // where Pompey's own settlement put him; Machares governs the Bosporus
    // for Rome and against his father, which will shortly kill him.
    DAC: { name: 'Burebista', title: 'King', gov: 4, infl: 3, mar: 5, age: 44 },
    NUM: { name: 'Hiempsal II', title: 'King', gov: 3, infl: 2, mar: 2, age: 50,
      heir: { name: 'Juba', gov: 2, infl: 2, mar: 3, age: 18 } },
    BOS: { name: 'Machares', title: 'King in the Bosporus', gov: 2, infl: 2, mar: 2, age: 35 },
  },

  // Linear mission chains (realm panel).
  missions: {
    HYR: [
      {
        id: 'h4_levy', name: 'Idumea Answers',
        icon: 'spears', col: 1,
        desc: 'Keep 12,500 men in the field — Antipater\'s country will provide.',
        rewardText: '+3,000 manpower.',
        check: (ctx) => totalMen(ctx, 'HYR') >= 12500,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { manpower: 3000 }),
      },
      {
        id: 'h4_aretas', name: 'The Price of Petra',
        icon: 'dove', col: 0, requires: ['h4_levy'],
        desc: 'Bring Aretas into the war (his price is the twelve cities), or raise Nabataea\'s '
          + 'opinion of us to +100.',
        rewardText: 'Nabataean lances: +60 martial points.',
        check: (ctx) => !!ctx.helpers.getFlag(ctx, 'aretasMarches')
          || ((ctx.game.tags.NAB && ctx.game.tags.NAB.opinion && ctx.game.tags.NAB.opinion.HYR) || 0) >= 100,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { mar: 60 }),
      },
      {
        id: 'h4_city', name: 'The City of David',
        icon: 'temple', col: 1, requires: ['h4_aretas'],
        desc: 'Take Jerusalem from your brother.',
        rewardText: '+30 legitimacy — the high priesthood, restored in fact.',
        check: (ctx) => ctx.helpers.controls(ctx, 'HYR', 'Jerusalem'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { legitimacy: 30 }),
      },
      {
        id: 'h4_one_crown', name: 'One Crown',
        icon: 'star8', col: 1, requires: ['h4_city'],
        desc: 'End the division: your brother\'s realm extinguished, or bent to you as a '
          + 'client.',
        rewardText: '+1 stability, +25 legitimacy.',
        check: (ctx) => {
          const r = ctx.game.tags.ARI;
          return !r || !r.alive || r.overlord === 'HYR';
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { stability: 1, legitimacy: 25 }),
      },
      {
        id: 'h4_web', name: 'Antipater\'s Web',
        icon: 'coins', col: 2, requires: ['h4_levy'],
        desc: 'Fill the treasury to 600 talents — customs houses, tolls, and quiet '
          + 'arrangements.',
        rewardText: '+60 governance and +60 influence points.',
        check: (ctx) => (ctx.game.tags.HYR.treasury || 0) >= 600,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { gov: 60, infl: 60 }),
      },
      // The age's curriculum (SPEC §179): what the elder brother's cause must
      // learn — hired steel, and the arts of a court worth restoring.
      {
        id: 'h4_hired_steel', name: 'Hired Steel',
        icon: 'helmet', col: 0, requires: ['h4_aretas'],
        desc: 'Pay for the war the age fights: reach Military 6 — The Hired Companies.',
        rewardText: '"The Paymaster\'s Muster": +15% reinforcement speed permanently.',
        check: (ctx) => (((ctx.game.tags.HYR || {}).tech || {}).mar | 0) >= 6,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HYR', {
          id: 'paymasters_muster', name: 'The Paymaster\'s Muster', months: -1, effects: { reinforceMult: 1.15 },
        }),
      },
      {
        id: 'h4_school_of_rule', name: 'A School of Rule',
        icon: 'scroll', col: 2, requires: ['h4_web'],
        desc: 'Take up three ideas of the age — a restored high priesthood must govern, not '
          + 'merely reign.',
        rewardText: '+60 governance points, +15 legitimacy.',
        check: (ctx) => eraTiers(ctx.game.tags.HYR) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { gov: 60, legitimacy: 15 }),
      },
      // The map of the grandfathers (SPEC §187): Jannaeus' east bank and the
      // Damascus road — the expansion a restored elder is measured against.
      {
        id: 'h4_moab', name: 'The Twelve Cities of Moab',
        icon: 'mountain', col: 0, row: 3, requires: ['h4_hired_steel'],
        desc: 'Hold Medaba, Philadelphia and Gerasa — the east bank your grandfather took and '
          + 'your war may have promised away. What Aretas was paid in, take back.',
        rewardText: '+25 legitimacy, +50 martial points.',
        check: (ctx) => ['Medaba', 'Philadelphia', 'Gerasa']
          .every((n) => ctx.helpers.controls(ctx, 'HYR', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { legitimacy: 25, mar: 50 }),
      },
      {
        id: 'h4_damascus', name: 'The City Between Empires',
        icon: 'flag', col: 2, row: 3, requires: ['h4_school_of_rule'],
        desc: 'Take Damascus — the prize Aretas holds, Tigranes covets, and Rome will file '
          + 'under whoever is sitting in it when the clerks arrive.',
        rewardText: '"The Damascus Customs": +8% income permanently.',
        check: (ctx) => ctx.helpers.controls(ctx, 'HYR', 'Damascus'),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HYR', {
          id: 'the_damascus_customs', name: 'The Damascus Customs', months: -1,
          effects: { incomeMult: 1.08 },
        }),
      },
      // ── The kingdom the elder brother would inherit (SPEC §197) ─────────
      // The chapter runs to 6 CE. Winning the war of the brothers is the
      // first act; these are the state the winner then has to actually hold
      // — the customs, the rocks, the council, and the Roman who decides.
      {
        id: 'h4_customs_houses', name: 'The Customs Houses',
        icon: 'market', col: 1, row: 1, requires: ['h4_levy'],
        desc: 'Bank 400 talents out of Antipater\'s receipts: the Idumean roads, the coast '
          + 'landings, the Petra caravans.',
        rewardText: '"The Fixer\'s Receipts": +8% income permanently.',
        check: (ctx) => ((ctx.game.tags.HYR || {}).treasury || 0) >= 400,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HYR', {
          id: 'fixers_receipts', name: 'The Fixer\'s Receipts', months: -1, effects: { incomeMult: 1.08 },
        }),
      },
      {
        id: 'h4_desert_rocks', name: 'The Rocks in the Desert',
        icon: 'walls', col: 0, row: 4, requires: ['h4_moab'],
        desc: 'Take Masada and Machaerus — the last places this house can be driven to, and '
          + 'your brother\'s partisans know every path up both.',
        rewardText: '"The Last Places": +1 stability, +6% morale permanently.',
        check: (ctx) => ['Masada', 'Machaerus'].every((n) => ctx.helpers.controls(ctx, 'HYR', n)),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'HYR', {
            id: 'the_last_places', name: 'The Last Places', months: -1, effects: { moraleMult: 1.06 },
          });
          ctx.helpers.adjust(ctx, 'HYR', { stability: 1 });
        },
      },
      {
        id: 'h4_the_lake_country', name: 'The Lake Country',
        icon: 'grain', col: 1, row: 4, requires: ['h4_one_crown'],
        desc: 'Hold Sepphoris, Jotapata and Gischala — the north is where a restored crown '
          + 'finds soldiers who were not at Jericho.',
        rewardText: '+6,000 manpower, +1 stability.',
        check: (ctx) => ['Sepphoris', 'Jotapata', 'Gischala'].every((n) => ctx.helpers.controls(ctx, 'HYR', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { manpower: 6000, stability: 1 }),
      },
      {
        id: 'h4_the_sea_gates', name: 'The Sea Gates',
        icon: 'ship', col: 2, row: 4, requires: ['h4_damascus'],
        desc: 'Jannaeus took the coast and Pompey will give it away again unless somebody is '
          + 'standing on it. Hold Joppa, Azotus and Ascalon.',
        rewardText: '"The Coast Restored": +12% trade permanently, +150 talents.',
        check: (ctx) => ['Joppa', 'Azotus', 'Ascalon'].every((n) => ctx.helpers.controls(ctx, 'HYR', n)),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'HYR', {
            id: 'the_coast_restored', name: 'The Coast Restored', months: -1, effects: { tradeMult: 1.12 },
          });
          ctx.helpers.adjust(ctx, 'HYR', { treasury: 150 });
        },
      },
      {
        id: 'h4_the_council', name: 'The Council Confirmed',
        icon: 'scales', col: 1, row: 5, requires: ['h4_the_lake_country'],
        desc: 'Reach Government 7 — a court that governs through a council rather than around '
          + 'one.',
        rewardText: '"The Sanhedrin Seated": −0.75 unrest everywhere and +0.15 legitimacy a month, permanent.',
        check: (ctx) => (((ctx.game.tags.HYR || {}).tech || {}).gov | 0) >= 7,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HYR', {
          id: 'the_sanhedrin_seated', name: 'The Sanhedrin Seated', months: -1,
          effects: { unrestAll: -0.75, legitimacyAdd: 0.15 },
        }),
      },
      {
        id: 'h4_the_useful_brother', name: 'The Convenient Brother',
        icon: 'laurel', col: 0, row: 5, requires: ['h4_desert_rocks'],
        desc: 'Raise Rome\'s regard for this crown to +120 — be the convenient one before the '
          + 'question is asked.',
        rewardText: '+70 influence points, +25 legitimacy.',
        check: (ctx) => {
          const rom = ctx.game.tags.ROM;
          return ((rom && rom.opinion && rom.opinion.HYR) || 0) >= 120;
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { infl: 70, legitimacy: 25 }),
      },
      {
        id: 'h4_house_restored', name: 'The House Restored',
        icon: 'star8', col: 2, row: 5, requires: ['h4_the_sea_gates'],
        desc: 'A high priest who won a civil war is still a high priest who won a civil war. '
          + 'Reach +2 stability and 75 legitimacy — the reign has to stop being an argument.',
        rewardText: '"The Elder Line Vindicated": +8% income, +0.2 legitimacy a month, permanent.',
        check: (ctx) => {
          const t = ctx.game.tags.HYR || {};
          return (t.stability || 0) >= 2 && (t.legitimacy || 0) >= 75;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HYR', {
          id: 'elder_line_vindicated', name: 'The Elder Line Vindicated', months: -1,
          effects: { incomeMult: 1.08, legitimacyAdd: 0.2 },
        }),
      },
      // ── The civil band (SPEC §211): the state, the region, the court ────
      // Antipater's cause is not won in the field and never was going to be.
      // It is won in the register, in the letters that go out to six courts
      // at once, and in the room where the sages sit — the three widths an
      // EU4 tree spends most of itself on, and the three this chapter has
      // never once asked for. None of them waits on the war.
      {
        id: 'h4_the_ethnarchs_register', name: 'The Ethnarch\'s Register',
        icon: 'quill', civil: 'govt', col: 0, row: 6,
        desc: 'Build the office before the title arrives: enact Census & Taxation and '
          + 'Provincial Governors.',
        rewardText: '"The Ethnarch\'s Register": +6% income and −0.25 unrest everywhere, permanent.',
        check: (ctx) => (((ctx.game.tags[warTag(ctx.game, 'HYR')] || {}).reforms || {}).civ | 0) >= 2,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HYR', {
          id: 'ethnarchs_register', name: 'The Ethnarch\'s Register', months: -1,
          effects: { incomeMult: 1.06, unrestAll: -0.25 },
        }),
      },
      {
        id: 'h4_the_roads_of_the_ascents', name: 'The Roads of the Ascents',
        icon: 'shrine', civil: 'govt', col: 0, row: 7, requires: ['h4_the_ethnarchs_register'],
        desc: 'Enact Public Rites, Missionary Zeal and Sanctified Courts — the Voice of Heaven '
          + 'made a department of state, with the ascents as its ledger.',
        rewardText: '"The Custom of the Ascents": +12% from the ascents and +5% income, permanent.',
        check: (ctx) => (((ctx.game.tags[warTag(ctx.game, 'HYR')] || {}).reforms || {}).rel | 0) >= 3,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HYR', {
          id: 'custom_of_the_ascents', name: 'The Custom of the Ascents', months: -1,
          effects: { pilgrimMult: 1.12, incomeMult: 1.05 },
        }),
      },
      {
        id: 'h4_the_second_friend', name: 'The Second Friend',
        icon: 'dove', civil: 'region', col: 1, row: 6,
        desc: 'Bring a second crown into alliance with this cause — Ptolemy of Chalcis, the '
          + 'Commagenian, Alexandria, whoever will sign.',
        rewardText: '"The Idumean\'s Letters": +1 diplomatic seat, permanent; +50 influence points.',
        check: (ctx) => ((ctx.game.tags[warTag(ctx.game, 'HYR')] || {}).allies || []).length >= 2,
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'HYR', {
            id: 'idumeans_letters', name: 'The Idumean\'s Letters', months: -1,
            effects: { diploSeats: 1 },
          });
          ctx.helpers.adjust(ctx, 'HYR', { infl: 50 });
        },
      },
      {
        id: 'h4_the_regard_of_the_east', name: 'The Regard of the East',
        icon: 'speaker', civil: 'region', col: 1, row: 7, requires: ['h4_the_second_friend'],
        desc: 'Stand well with three courts at once — Nabataea, Rome, the Seleucid rump, '
          + 'Egypt, Chalcis, Commagene, Parthia or Armenia.',
        rewardText: '"The Convenient Court": nobody\'s cheap war, permanent; +60 influence points.',
        check: (ctx) => {
          const g = ctx.game;
          const me = warTag(g, 'HYR');
          let n = 0;
          for (const k of ['ROM', 'NAB', 'PTO', 'SEL', 'ITU', 'CMG', 'PAR', 'ARM']) {
            const o = g.tags[k];
            if (o && o.alive && ((o.opinion && o.opinion[me]) || 0) >= 50) n++;
          }
          return n >= 3;
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'HYR', {
            id: 'the_convenient_court', name: 'The Convenient Court', months: -1,
            effects: { deterrent: 0.5 },
          });
          ctx.helpers.adjust(ctx, 'HYR', { infl: 60 });
        },
      },
      {
        id: 'h4_the_sages_in_council', name: 'The Sages in Council',
        icon: 'lamp', civil: 'court', col: 2, row: 6,
        desc: 'Bring the Pharisees to devotion — approval at 80 — and every synagogue in the '
          + 'land preaches the succession as law rather than as an opinion.',
        rewardText: '"The Synagogues Preach the Elder Line": −0.5 unrest everywhere and +0.15 legitimacy a month, permanent.',
        check: (ctx) => (((ctx.game.tags[warTag(ctx.game, 'HYR')] || {}).factions || {}).pharisees || 0) >= 80,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HYR', {
          id: 'sages_in_council', name: 'The Synagogues Preach the Elder Line', months: -1,
          effects: { unrestAll: -0.5, legitimacyAdd: 0.15 },
        }),
      },
      {
        id: 'h4_offices_for_the_sons', name: 'Offices for the Sons',
        icon: 'note', civil: 'court', col: 2, row: 7, requires: ['h4_the_sages_in_council'],
        desc: 'Carry the house of Antipater\'s credit to 45 and seat a man of government at the '
          + 'council.',
        rewardText: '"The Idumean Administration": +6% income permanently; +95 governance points.',
        check: (ctx) => {
          const t = ctx.game.tags[warTag(ctx.game, 'HYR')] || {};
          return ((t.estateFavor || {}).antipater || 0) >= 45 && !!(t.advisors && t.advisors.gov);
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'HYR', {
            id: 'idumean_administration', name: 'The Idumean Administration', months: -1,
            effects: { incomeMult: 1.06 },
          });
          ctx.helpers.adjust(ctx, 'HYR', { gov: 95 });
        },
      },
      // ── The roads not taken (SPEC §183): the ev4_v_* strand, charted ────
      {
        id: 'hy_eagle_refused', name: 'The Eagle Refused', hypothetical: true,
        fork: '67bce/pompeys_arbitration',
        road: 'sovereign',
        icon: 'shield', col: 3, row: 0,
        desc: 'When Pompey comes to organize the East (63 BCE), answer no envoy, bend no knee, '
          + 'and still be standing free of Rome the following summer.',
        rewardText: '+15 legitimacy, +60 martial points.',
        check: (ctx) => anyFlag(ctx, 'eagleRefused'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { legitimacy: 15, mar: 60 }),
      },
      {
        id: 'hy_never_renamed', name: 'The Kingdom They Never Renamed', hypothetical: true,
        fork: '67bce/pompeys_arbitration',
        road: 'sovereign',
        icon: 'laurel', col: 3, row: 1, requires: ['hy_eagle_refused'],
        desc: 'Keep the gates shut for a generation: one crown over the brothers\' war, '
          + 'Jerusalem held, free of Rome to 35 BCE.',
        rewardText: '"The Unrenamed Crown": −1 unrest everywhere, permanent; +15 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'neverRenamed'),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'HYR', {
            id: 'hy_unrenamed_crown', name: 'The Unrenamed Crown', months: -1, effects: { unrestAll: -1 },
          });
          ctx.helpers.adjust(ctx, 'HYR', { legitimacy: 15 });
        },
      },
      {
        id: 'hy_cities_kept', name: 'The Cities Are Israel\'s', hypothetical: true,
        fork: '67bce/the_price_of_petra',
        road: 'the_cities_kept',
        icon: 'dove', col: 3, row: 2,
        desc: 'The road your brother did not take: when Aretas names the twelve cities of Moab '
          + 'as the cost of his lances, the price is refused, the cities stay.',
        rewardText: '+25 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'moabKept'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { legitimacy: 25 }),
      },
      {
        id: 'hy_proconsuls_bill', name: 'The Proconsul\'s Bill', hypothetical: true,
        fork: '67bce/the_proconsuls_bill',
        roads: ['the_open_treasury', 'the_shut_doors'],
        icon: 'coins', col: 3, row: 3,
        desc: 'Be a client crown when Crassus reaches the treasury in 54 BCE, and answer him '
          + 'with something other than the beam and the broken oath.',
        rewardText: '+50 governance points.',
        check: (ctx) => anyFlag(ctx, 'crassusAppeased', 'crassusRefused'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { gov: 50 }),
      },
      {
        id: 'hy_sovereigns_wager', name: 'The Sovereign\'s Wager', hypothetical: true,
        fork: '67bce/caesar_or_pompey',
        roads: ['backed_caesar', 'backed_pompey'],
        icon: 'scales', col: 4, row: 0,
        desc: 'Stand free and unified when Rome splits between Caesar and Pompey (49 BCE), and '
          + 'be courted instead of collected.',
        rewardText: '+50 influence points.',
        check: (ctx) => anyFlag(ctx, 'jvBackedCaesar', 'jvBackedPompey'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { infl: 50 }),
      },
      {
        id: 'hy_two_romans', name: 'The Same Dice, Thrown Free', hypothetical: true,
        fork: '67bce/antony_or_octavian',
        roads: ['backed_octavian', 'backed_antony'],
        icon: 'split', col: 4, row: 1,
        desc: 'Keep the kingdom sovereign to the last division of the Roman world (33 BCE), '
          + 'and choose between Antony and Octavian with a free hand.',
        rewardText: '+50 influence points.',
        check: (ctx) => anyFlag(ctx, 'jvBackedOctavian', 'jvBackedAntony'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { infl: 50 }),
      },
          {
        id: 'hy_succession_settled', name: 'The Succession Written Down', hypothetical: true,
        fork: '67bce/the_client_succession',
        roads: ['settled_in_rome', 'withheld'],
        icon: 'quill', col: 4, row: 2,
        desc: 'Reach the question with a house worth settling and settle it — either way it is '
          + 'answered.',
        rewardText: '+30 legitimacy, +60 governance points.',
        check: (ctx) => anyFlag(ctx, 'successionSettled', 'successionWithheld'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HYR', { legitimacy: 30, gov: 60 }),
      },
],
    ARI: [
      {
        id: 'a4_army', name: 'The King\'s Army',
        icon: 'helmet', col: 1,
        desc: 'Keep 15,500 men in the field.',
        rewardText: '+3,000 manpower.',
        check: (ctx) => totalMen(ctx, 'ARI') >= 15500,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { manpower: 3000 }),
      },
      {
        id: 'a4_break', name: 'Break the Elder',
        icon: 'swords', col: 0, requires: ['a4_army'],
        desc: 'Reach +15 war score against your brother.',
        rewardText: '+60 martial points.',
        check: (ctx) => warscoreVs(ctx, 'ARI', 'HYR') >= 15,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { mar: 60 }),
      },
      {
        id: 'a4_idumea', name: 'Into Idumea',
        icon: 'mountain', col: 2, requires: ['a4_army'],
        desc: 'Take Hebron and Adora — cut the web at the spider.',
        rewardText: 'Antipater\'s estates: +200 talents.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ARI', 'Hebron') && ctx.helpers.controls(ctx, 'ARI', 'Adora'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { treasury: 200 }),
      },
      {
        id: 'a4_one_crown', name: 'One Crown',
        icon: 'star8', col: 0, requires: ['a4_break'],
        desc: 'End the division: your brother\'s realm extinguished, or bent to you as a '
          + 'client.',
        rewardText: '+1 stability, +25 legitimacy.',
        check: (ctx) => {
          const r = ctx.game.tags.HYR;
          return !r || !r.alive || r.overlord === 'ARI';
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { stability: 1, legitimacy: 25 }),
      },
      {
        id: 'a4_treasury', name: 'The Temple Treasury',
        icon: 'coins', col: 2, requires: ['a4_idumea'],
        desc: 'Fill the treasury to 600 talents.',
        rewardText: '+60 governance and +60 martial points.',
        check: (ctx) => (ctx.game.tags.ARI.treasury || 0) >= 600,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { gov: 60, mar: 60 }),
      },
      // The age's curriculum (SPEC §179): the able brother fights like the
      // age and crowns himself with its ideas.
      {
        // Declared seat (SPEC §183): the derived row collided with One Crown
        // — two children of Break the Elder in one column.
        id: 'a4_kings_art', name: 'The King\'s Art of War',
        icon: 'helmet', col: 0, row: 3, requires: ['a4_break'],
        desc: 'Field the age\'s army, not a faction\'s: reach Military 6 — The Hired Companies.',
        rewardText: '"Veterans of Every War": +5% discipline permanently.',
        check: (ctx) => (((ctx.game.tags.ARI || {}).tech || {}).mar | 0) >= 6,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ARI', {
          id: 'veterans_every_war', name: 'Veterans of Every War', months: -1, effects: { disciplineMult: 1.05 },
        }),
      },
      {
        id: 'a4_priest_kings_charter', name: 'The Priest-King\'s Charter',
        icon: 'altar', col: 2, requires: ['a4_treasury'],
        desc: 'Take up three ideas of the age — the crown must out-think the elder, not merely '
          + 'outfight him.',
        rewardText: '+60 influence points, +15 legitimacy.',
        check: (ctx) => eraTiers(ctx.game.tags.ARI) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { infl: 60, legitimacy: 15 }),
      },
      // The map of the grandfathers (SPEC §187): the coast and the northern
      // road — the able brother\'s war does not stop at the hill country.
      {
        id: 'a4_coast', name: 'The Sea Gates',
        icon: 'ship', col: 1, row: 1, requires: ['a4_army'],
        desc: 'Take Joppa, Ascalon and Gaza from the elder — the ports his Idumean paymaster '
          + 'runs the war from, and the customs that fill his war chest.',
        rewardText: '+200 talents of customs silver.',
        check: (ctx) => ['Joppa', 'Ascalon', 'Gaza']
          .every((n) => ctx.helpers.controls(ctx, 'ARI', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { treasury: 200 }),
      },
      {
        id: 'a4_iturean_road', name: 'The Iturean Road',
        icon: 'horseshoe', col: 1, row: 2, requires: ['a4_coast'],
        desc: 'Take Panion and Chalcis — the Iturean principalities your father broke to the '
          + 'Law\'s obedience, drifting loose since the Armenian tide went out.',
        rewardText: '+3,000 manpower, +15 legitimacy.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ARI', 'Caesarea Philippi')
          && ctx.helpers.controls(ctx, 'ARI', 'Chalcis'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { manpower: 3000, legitimacy: 15 }),
      },
      // ── The kingdom the younger brother is fighting for (SPEC §197) ─────
      // Aristobulus holds the army, the city and the fortresses; what he does
      // not hold is time. These are the state he has to build fast enough
      // that Pompey's settlement finds something too solid to re-file.
      {
        id: 'a4_war_chest', name: 'The War Chest',
        icon: 'coins', col: 1, row: 3, requires: ['a4_treasury'],
        desc: 'Idumean money is buying your brother an army. Out-bank it: 550 talents in the '
          + 'treasury, and the mercenary market can hear only one bidder.',
        rewardText: '"The Higher Bidder": +15% reinforcement permanently.',
        check: (ctx) => ((ctx.game.tags.ARI || {}).treasury || 0) >= 550,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ARI', {
          id: 'the_higher_bidder', name: 'The Higher Bidder', months: -1, effects: { reinforceMult: 1.15 },
        }),
      },
      {
        id: 'a4_rocks_held', name: 'The Rocks Held',
        icon: 'walls', col: 0, row: 4, requires: ['a4_kings_art'],
        desc: 'Hold Masada and Machaerus when the dust settles: you began this war with the '
          + 'desert fortresses and mean to end it holding them.',
        rewardText: '"Dug In Deep": +1 stability, +8% morale permanently.',
        check: (ctx) => ['Masada', 'Machaerus'].every((n) => ctx.helpers.controls(ctx, 'ARI', n)),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ARI', {
            id: 'dug_in_deep', name: 'Dug In Deep', months: -1, effects: { moraleMult: 1.08 },
          });
          ctx.helpers.adjust(ctx, 'ARI', { stability: 1 });
        },
      },
      {
        id: 'a4_the_north', name: 'The North Secured',
        icon: 'grain', col: 1, row: 4, requires: ['a4_war_chest'],
        desc: 'Galilee and the hill villages are the recruiting ground your father used. Hold '
          + 'Sepphoris, Jotapata and Gischala before the Idumeans buy them.',
        rewardText: '+6,000 manpower, +35 martial points.',
        check: (ctx) => ['Sepphoris', 'Jotapata', 'Gischala'].every((n) => ctx.helpers.controls(ctx, 'ARI', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { manpower: 6000, mar: 35 }),
      },
      {
        id: 'a4_sea_gates', name: 'The Gates to the Sea',
        icon: 'ship', col: 2, row: 4, requires: ['a4_priest_kings_charter'],
        desc: 'Your father\'s coast is the difference between a hill kingdom and a state with '
          + 'customs revenue. Hold Joppa, Azotus and Ascalon.',
        rewardText: '"The King\'s Coast": +12% trade permanently, +150 talents.',
        check: (ctx) => ['Joppa', 'Azotus', 'Ascalon'].every((n) => ctx.helpers.controls(ctx, 'ARI', n)),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ARI', {
            id: 'the_kings_coast', name: 'The King\'s Coast', months: -1, effects: { tradeMult: 1.12 },
          });
          ctx.helpers.adjust(ctx, 'ARI', { treasury: 150 });
        },
      },
      {
        id: 'a4_too_solid_to_refile', name: 'Too Solid to Re-File',
        icon: 'tower', col: 0, row: 5, requires: ['a4_rocks_held'],
        desc: 'A settlement commission re-draws what it can move. Reach Government 7 and hold '
          + 'fifteen provinces: a governed kingdom is harder to file than a disputed one.',
        rewardText: '"A Governed Kingdom": +10% income, −0.5 unrest everywhere, permanent.',
        check: (ctx) => (((ctx.game.tags.ARI || {}).tech || {}).gov | 0) >= 7
          && ctx.helpers.countControlled(ctx, 'ARI', {}) >= 15,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ARI', {
          id: 'a_governed_kingdom', name: 'A Governed Kingdom', months: -1,
          effects: { incomeMult: 1.1, unrestAll: -0.5 },
        }),
      },
      {
        id: 'a4_rome_prefers_to_deal', name: 'Rome Prefers to Deal',
        icon: 'laurel', col: 1, row: 5, requires: ['a4_the_north'],
        desc: 'Raise Rome\'s regard to +120 while the kingdom still stands under your own '
          + 'crown.',
        rewardText: '+70 influence points, +25 legitimacy.',
        check: (ctx) => {
          const rom = ctx.game.tags.ROM;
          return ((rom && rom.opinion && rom.opinion.ARI) || 0) >= 120;
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { infl: 70, legitimacy: 25 }),
      },
      {
        id: 'a4_the_crown_kept', name: 'The Crown Kept',
        icon: 'star8', col: 2, row: 5, requires: ['a4_sea_gates'],
        desc: 'You took the crown because your brother would have dropped it. Reach +2 '
          + 'stability and 80 legitimacy still wearing it.',
        rewardText: '"The Younger Line Confirmed": +8% income, +0.2 legitimacy a month, permanent.',
        check: (ctx) => {
          const t = ctx.game.tags.ARI || {};
          return (t.stability || 0) >= 2 && (t.legitimacy || 0) >= 80;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ARI', {
          id: 'younger_line_confirmed', name: 'The Younger Line Confirmed', months: -1,
          effects: { incomeMult: 1.08, legitimacyAdd: 0.2 },
        }),
      },
      // ── The civil band (SPEC §211): the state, the region, the court ────
      // The younger brother's case is that he is the better king, and that
      // is not a thing the Jericho road can settle. It is settled in the
      // coinage, in the courts that answer his letters, and in the room
      // where the captains and the great houses sit counting. None of these
      // waits on the war either; all three are how he wins the argument.
      {
        id: 'a4_the_diadem_and_the_ephod', name: 'The Diadem and the Ephod',
        icon: 'shrine', civil: 'govt', col: 0, row: 6,
        desc: 'Enact Public Rites and Missionary Zeal — the Voice of Heaven, spoken by the one '
          + 'man wearing both.',
        rewardText: '"The Priest-King Crowned": +0.2 legitimacy a month, permanent.',
        check: (ctx) => (((ctx.game.tags[warTag(ctx.game, 'ARI')] || {}).reforms || {}).rel | 0) >= 2,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ARI', {
          id: 'priest_king_crowned', name: 'The Priest-King Crowned', months: -1,
          effects: { legitimacyAdd: 0.2 },
        }),
      },
      {
        id: 'a4_the_kings_purse', name: 'The King\'s Purse',
        icon: 'market', civil: 'govt', col: 0, row: 7, requires: ['a4_the_diadem_and_the_ephod'],
        desc: 'Make the purse a system rather than a windfall: Drilled Ranks, Standing Levies '
          + 'and Siegecraft enacted.',
        rewardText: '"The Higher Wage": −10% maintenance and +8% reinforcement, permanent.',
        check: (ctx) => {
          const t = ctx.game.tags[warTag(ctx.game, 'ARI')] || {};
          return (((t.reforms || {}).mil | 0) >= 3) && (t.treasury || 0) >= 750;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ARI', {
          id: 'the_higher_wage', name: 'The Higher Wage', months: -1,
          effects: { maintMult: 0.9, reinforceMult: 1.08 },
        }),
      },
      {
        id: 'a4_the_quarrel_with_petra', name: 'The Quarrel with Petra',
        icon: 'dove', civil: 'region', col: 1, row: 6,
        desc: 'Bring Petra\'s regard for this crown up to +25.',
        rewardText: '"The Peace After Papyron": +5% manpower recovery permanently; +60 influence points.',
        check: (ctx) => {
          const g = ctx.game;
          const nab = g.tags.NAB;
          return ((nab && nab.opinion && nab.opinion[warTag(g, 'ARI')]) || 0) >= 25;
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ARI', {
            id: 'peace_after_papyron', name: 'The Peace After Papyron', months: -1,
            effects: { manpowerMult: 1.05 },
          });
          ctx.helpers.adjust(ctx, 'ARI', { infl: 60 });
        },
      },
      {
        id: 'a4_the_second_throne', name: 'The Second Throne of the East',
        icon: 'scales', civil: 'region', col: 1, row: 7, requires: ['a4_the_quarrel_with_petra'],
        desc: 'Stand second among the powers of the world — behind Rome and ahead of everyone '
          + 'else, your brother included.',
        rewardText: '"The Second Throne": nobody\'s cheap war, permanent; +25 legitimacy.',
        check: (ctx) => {
          const ord = (ctx.game.standing && ctx.game.standing.order) || [];
          const i = ord.indexOf(warTag(ctx.game, 'ARI'));
          return i >= 0 && i < 2;
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ARI', {
            id: 'second_throne_of_the_east', name: 'The Second Throne of the East', months: -1,
            effects: { deterrent: 0.75 },
          });
          ctx.helpers.adjust(ctx, 'ARI', { legitimacy: 25 });
        },
      },
      {
        id: 'a4_the_twenty_two_fortresses', name: 'Twenty-Two Fortresses',
        icon: 'spears', civil: 'court', col: 2, row: 6,
        desc: 'Bring the King\'s Captains to devotion — approval at 80 — and that week stops '
          + 'being a debt the crown is still servicing.',
        rewardText: '"The Garrisons Sworn": +6% morale and +5% force limit, permanent.',
        check: (ctx) => (((ctx.game.tags[warTag(ctx.game, 'ARI')] || {}).factions || {}).captains || 0) >= 80,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ARI', {
          id: 'garrisons_sworn', name: 'The Garrisons Sworn', months: -1,
          effects: { moraleMult: 1.06, forceLimitMult: 1.05 },
        }),
      },
      {
        id: 'a4_the_deeds_sealed', name: 'The Deeds Sealed',
        icon: 'note', civil: 'court', col: 2, row: 7, requires: ['a4_the_twenty_two_fortresses'],
        desc: 'Bank the Sadducees\' credit to 45 and seat a soldier at the council.',
        rewardText: '"The Great Houses Bound": +6% income permanently; +95 martial points.',
        check: (ctx) => {
          const t = ctx.game.tags[warTag(ctx.game, 'ARI')] || {};
          return ((t.estateFavor || {}).sadducees || 0) >= 45 && !!(t.advisors && t.advisors.mar);
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ARI', {
            id: 'great_houses_bound', name: 'The Great Houses Bound', months: -1,
            effects: { incomeMult: 1.06 },
          });
          ctx.helpers.adjust(ctx, 'ARI', { mar: 95 });
        },
      },
      // ── The roads not taken (SPEC §183): the ev4_v_* strand, charted ────
      {
        id: 'hy_eagle_refused', name: 'The Eagle Refused', hypothetical: true,
        fork: '67bce/pompeys_arbitration',
        road: 'sovereign',
        icon: 'shield', col: 3, row: 0,
        desc: 'When Pompey comes to organize the East (63 BCE), answer no envoy, bend no knee, '
          + 'and still be standing free of Rome the following summer.',
        rewardText: '+15 legitimacy, +60 martial points.',
        check: (ctx) => anyFlag(ctx, 'eagleRefused'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { legitimacy: 15, mar: 60 }),
      },
      {
        id: 'hy_never_renamed', name: 'The Kingdom They Never Renamed', hypothetical: true,
        fork: '67bce/pompeys_arbitration',
        road: 'sovereign',
        icon: 'laurel', col: 3, row: 1, requires: ['hy_eagle_refused'],
        desc: 'Keep the gates shut for a generation: one crown over the brothers\' war, '
          + 'Jerusalem held, free of Rome to 35 BCE.',
        rewardText: '"The Unrenamed Crown": −1 unrest everywhere, permanent; +15 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'neverRenamed'),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ARI', {
            id: 'hy_unrenamed_crown', name: 'The Unrenamed Crown', months: -1, effects: { unrestAll: -1 },
          });
          ctx.helpers.adjust(ctx, 'ARI', { legitimacy: 15 });
        },
      },
      {
        id: 'hy_cities_kept', name: 'The Cities Are Israel\'s', hypothetical: true,
        fork: '67bce/the_price_of_petra',
        road: 'the_cities_kept',
        icon: 'dove', col: 3, row: 2,
        desc: 'The road your brother did not take: when Aretas names the twelve cities of Moab '
          + 'as the cost of his lances, the price is refused, the cities stay.',
        rewardText: '+25 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'moabKept'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { legitimacy: 25 }),
      },
      {
        id: 'hy_proconsuls_bill', name: 'The Proconsul\'s Bill', hypothetical: true,
        fork: '67bce/the_proconsuls_bill',
        roads: ['the_open_treasury', 'the_shut_doors'],
        icon: 'coins', col: 3, row: 3,
        desc: 'Be a client crown when Crassus reaches the treasury in 54 BCE, and answer him '
          + 'with something other than the beam and the broken oath.',
        rewardText: '+50 governance points.',
        check: (ctx) => anyFlag(ctx, 'crassusAppeased', 'crassusRefused'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { gov: 50 }),
      },
      {
        id: 'hy_sovereigns_wager', name: 'The Sovereign\'s Wager', hypothetical: true,
        fork: '67bce/caesar_or_pompey',
        roads: ['backed_caesar', 'backed_pompey'],
        icon: 'scales', col: 4, row: 0,
        desc: 'Stand free and unified when Rome splits between Caesar and Pompey (49 BCE), and '
          + 'be courted instead of collected.',
        rewardText: '+50 influence points.',
        check: (ctx) => anyFlag(ctx, 'jvBackedCaesar', 'jvBackedPompey'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { infl: 50 }),
      },
      {
        id: 'hy_two_romans', name: 'The Same Dice, Thrown Free', hypothetical: true,
        fork: '67bce/antony_or_octavian',
        roads: ['backed_octavian', 'backed_antony'],
        icon: 'split', col: 4, row: 1,
        desc: 'Keep the kingdom sovereign to the last division of the Roman world (33 BCE), '
          + 'and choose between Antony and Octavian with a free hand.',
        rewardText: '+50 influence points.',
        check: (ctx) => anyFlag(ctx, 'jvBackedOctavian', 'jvBackedAntony'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { infl: 50 }),
      },
          {
        id: 'hy_succession_settled', name: 'The Succession Written Down', hypothetical: true,
        fork: '67bce/the_client_succession',
        roads: ['settled_in_rome', 'withheld'],
        icon: 'quill', col: 4, row: 2,
        desc: 'Reach the question with a house worth settling and settle it — either way it is '
          + 'answered.',
        rewardText: '+30 legitimacy, +60 governance points.',
        check: (ctx) => anyFlag(ctx, 'successionSettled', 'successionWithheld'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ARI', { legitimacy: 30, gov: 60 }),
      },
],
    // The Tigris kingdom's tree (SPEC §185): a client house between Armenia's
    // wreck and Parthia's peace, living on the road and weighing the yoke.
    ADI: [
      {
        id: 't4_fords', name: 'The Fords of the Zab',
        icon: 'coins', col: 1,
        desc: 'Every bale that crosses the Tigris pays the house. Bank 400 talents of the '
          + 'road\'s custom.',
        rewardText: '"The Caravan Custom": +10% trade permanently.',
        check: (ctx) => ((ctx.game.tags.ADI || {}).treasury || 0) >= 400,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ADI', {
          id: 'caravan_custom', name: 'The Caravan Custom', months: -1, effects: { tradeMult: 1.1 },
        }),
      },
      {
        id: 't4_riders_mustered', name: 'The Riders Mustered',
        icon: 'horseshoe', col: 0, requires: ['t4_fords'],
        desc: 'Armenia\'s collapse leaves the fords to whoever can hold them. Put 8,500 men '
          + 'under the house\'s standards.',
        rewardText: '"The Lances of the Bank": +8% morale permanently.',
        check: (ctx) => totalMen(ctx, 'ADI') >= 8500,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ADI', {
          id: 'lances_of_the_bank', name: 'The Lances of the Bank', months: -1, effects: { moraleMult: 1.08 },
        }),
      },
      {
        id: 't4_kings_regard', name: 'The King of Kings\' Regard',
        icon: 'laurel', col: 2, requires: ['t4_fords'],
        desc: 'Phraates counts his clients by their usefulness. Reach his full regard — '
          + 'opinion of the house at +100.',
        rewardText: '+25 legitimacy, +60 influence points.',
        check: (ctx) => {
          const par = ctx.game.tags.PAR;
          return ((par && par.opinion && par.opinion.ADI) || 0) >= 100;
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { legitimacy: 25, infl: 60 }),
      },
      {
        id: 't4_nehardea', name: 'The Silver of Nehardea',
        icon: 'diaspora', col: 1, requires: ['t4_fords'],
        desc: 'The half-shekels of Babylonia travel to Jerusalem under the house\'s guard. Bank '
          + '450 talents and the depositors\' trust with them.',
        rewardText: '"The Deposits of Nehardea": +5% income permanently.',
        check: (ctx) => ((ctx.game.tags.ADI || {}).treasury || 0) >= 450,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ADI', {
          id: 'deposits_of_nehardea', name: 'The Deposits of Nehardea', months: -1, effects: { incomeMult: 1.05 },
        }),
      },
      {
        id: 't4_hired_art', name: 'The Art of the Companies',
        icon: 'helmet', col: 0, requires: ['t4_riders_mustered'],
        desc: 'The age fights with professionals. Reach Military 6 — The Hired Companies.',
        rewardText: '+60 martial points.',
        check: (ctx) => (((ctx.game.tags.ADI || {}).tech || {}).mar | 0) >= 6,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { mar: 60 }),
      },
      {
        id: 't4_wisdom', name: 'The Wisdom of Two Rivers',
        icon: 'lamp', col: 2, requires: ['t4_kings_regard'],
        desc: 'A small court between empires needs every art of both. Take up three ideas of '
          + 'the age.',
        rewardText: '+60 governance points.',
        check: (ctx) => eraTiers(ctx.game.tags.ADI) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { gov: 60 }),
      },
      // ── The chair's own reach (SPEC §196): what the Tigris kingdom can
      // become when Armenia's wreck stops smoking. The house rode in
      // Tigranes' train at Tigranocerta and knows exactly what fell there.
      {
        id: 't4_bones_of_armenia', name: 'The Bones of Tigranocerta',
        icon: 'tower', col: 0, row: 3, requires: ['t4_riders_mustered'],
        desc: 'Take Tigranocerta and Amida — the overlord\'s wreck is the client\'s inheritance.',
        rewardText: '+200 talents, +35 martial points.',
        check: (ctx) => ['Tigranocerta', 'Amida']
          .every((n) => ctx.helpers.controls(ctx, 'ADI', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { treasury: 200, mar: 35 }),
      },
      {
        id: 't4_elder_client_house', name: 'The Elder Client House',
        icon: 'split', col: 2, row: 3, requires: ['t4_kings_regard'],
        desc: 'Take Edessa and Carrhae — a house in full regard may be forgiven for swallowing '
          + 'its sister.',
        rewardText: '"The Western Fords": +5% trade permanently, +35 influence points.',
        check: (ctx) => ['Edessa', 'Carrhae']
          .every((n) => ctx.helpers.controls(ctx, 'ADI', n)),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ADI', {
            id: 'western_fords', name: 'The Western Fords', months: -1, effects: { tradeMult: 1.05 },
          });
          ctx.helpers.adjust(ctx, 'ADI', { infl: 35 });
        },
      },
      {
        id: 't4_peace_of_the_altars', name: 'The Peace of the Two Altars',
        icon: 'flame', col: 1, row: 2, requires: ['t4_wisdom'],
        desc: 'Bring the realm to +2 stability — a court where the old fires and the new '
          + 'prayers stop watching each other.',
        rewardText: '"The Two Altars": −0.25 unrest everywhere permanently.',
        check: (ctx) => ((ctx.game.tags.ADI || {}).stability || 0) >= 2,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ADI', {
          id: 'two_altars', name: 'The Two Altars', months: -1, effects: { unrestAll: -0.25 },
        }),
      },
      // ── The civil band (SPEC §211): the state, the region, the court ────
      // Three standing invitations, none of them waiting on a war and none
      // of them waiting on each other. The house between the rivers is not
      // a conquest problem: it is a customs house with a dynasty attached,
      // a client with two possible masters, and a court in the middle of
      // quietly changing its religion.
      {
        id: 't4_the_register_of_the_fords', name: 'The Register of the Fords',
        icon: 'note', civil: 'govt', col: 0, row: 4,
        desc: 'Enact the first three reforms of the Art of Rule — Census & Taxation, '
          + 'Provincial Governors, Granaries of State.',
        rewardText: '"The Assessed Crossings": +8% trade and −0.25 unrest everywhere, permanent.',
        check: (ctx) => (((ctx.game.tags[warTag(ctx.game, 'ADI')] || {}).reforms || {}).civ | 0) >= 3,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ADI', {
          id: 'assessed_crossings', name: 'The Assessed Crossings', months: -1,
          effects: { tradeMult: 1.08, unrestAll: -0.25 },
        }),
      },
      {
        id: 't4_between_two_kings', name: 'Between Two Kings',
        icon: 'scales', civil: 'region', col: 1, row: 4,
        desc: 'Hold the King of Kings\' regard at +80 while Rome\'s stands at +50: two '
          + 'friendships, neither of which is an alliance.',
        rewardText: '"The House Between Two Kings": +1 diplomatic seat and nobody\'s cheap war, permanent.',
        check: (ctx) => {
          const g = ctx.game;
          const me = warTag(g, 'ADI');
          const par = g.tags.PAR;
          const rom = g.tags.ROM;
          return ((par && par.opinion && par.opinion[me]) || 0) >= 80
            && ((rom && rom.opinion && rom.opinion[me]) || 0) >= 50;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ADI', {
          id: 'house_between_two_kings', name: 'The House Between Two Kings', months: -1,
          effects: { diploSeats: 1, deterrent: 0.5 },
        }),
      },
      {
        id: 't4_the_lamps_in_the_windows', name: 'The Lamps in the Palace Windows',
        icon: 'shrine', civil: 'court', col: 2, row: 4,
        desc: 'Keep the old altars warm while the house prays west: the Magi at 65 approval, '
          + '35 of their credit banked.',
        rewardText: '"The Two Prayers": −0.4 unrest everywhere and +0.15 legitimacy a month, permanent.',
        check: (ctx) => {
          const t = ctx.game.tags[warTag(ctx.game, 'ADI')] || {};
          return ((t.factions || {}).magi || 0) >= 65 && ((t.estateFavor || {}).magi || 0) >= 35;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ADI', {
          id: 'the_two_prayers', name: 'The Two Prayers', months: -1,
          effects: { unrestAll: -0.4, legitimacyAdd: 0.15 },
        }),
      },
      // ── The roads not taken (SPEC §183) ─────────────────────────────────
      {
        id: 'hy_west_unrenamed', name: 'The West They Never Renamed', hypothetical: true,
        fork: '67bce/pompeys_arbitration',
        road: 'sovereign',
        icon: 'laurel', col: 3, row: 0,
        desc: 'If the brothers\' kingdom is never filed under a Roman name — one crown, '
          + 'Jerusalem held, the eagle kept out.',
        rewardText: '+100 talents, +15 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'neverRenamed'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { treasury: 100, legitimacy: 15 }),
      },
      {
        id: 'hy_doors_stayed_shut', name: 'The Doors Stayed Shut', hypothetical: true,
        fork: '67bce/the_proconsuls_bill',
        road: 'the_shut_doors',
        icon: 'temple', col: 3, row: 1,
        desc: 'If Jerusalem seals its treasury for the record and Crassus marches for the '
          + 'Euphrates unpaid, then the half-shekels of Babylonia.',
        rewardText: '+100 talents, +35 influence points.',
        check: (ctx) => anyFlag(ctx, 'crassusRefused'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { treasury: 100, infl: 35 }),
      },
    ],
  },

  // Pre-existing works (SPEC §58): the harbors the Hellenistic kings built
  // do not vanish with their power.
  buildings: {
    'Seleucia Pieria': ['shipyard'], // the port of Antioch, in rump-Seleucid hands
    'Alexandria': ['shipyard'],
  },

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

    // --- Starting fleets (SPEC §58): Egypt still keeps a real navy. ---
    h.spawnFleet(ctx, 'PTO', 'Alexandria', 4, { name: 'Fleet of Alexandria' });

    // The Tigris kingdoms ride in Parthia's train (v2.1): clients of the
    // King of Kings, paying tribute, joining his wars through sameSide.
    for (const cl of ['OSR', 'ADI', 'CHX']) {
      if (g.tags[cl] && g.tags.PAR) g.tags[cl].overlord = 'PAR';
    }

    // --- The war of the brothers. NEGOTIABLE: this is the first bookmark whose
    // central war can end at the peace table — cede, tribute, a brother bent to
    // clienthood, or (SPEC §226, at 80 war score) the crown itself: one brother
    // renounces and the kingdom is one again. Aristobulus struck first,
    // historically and here.
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
    h.adjust(ctx, 'CMG', { treasury: 80, manpower: 2500, stability: 1, legitimacy: 55 });
    h.adjust(ctx, 'ITU', { treasury: 60, manpower: 1800, stability: 1, legitimacy: 50 });
    // The Tigris client (SPEC §185): solvent on the road's tolls, newly out
    // from under Tigranes and glad of a lighter yoke.
    h.adjust(ctx, 'ADI', { treasury: 60, legitimacy: 15 });

    // --- Opinions. -------------------------------------------------------------
    setOpinion(g, 'HYR', 'ARI', -180); setOpinion(g, 'ARI', 'HYR', -180);
    setOpinion(g, 'NAB', 'HYR', 80);   setOpinion(g, 'HYR', 'NAB', 80);
    setOpinion(g, 'NAB', 'ARI', -80);  setOpinion(g, 'ARI', 'NAB', -60);
    setOpinion(g, 'ARM', 'ROM', -80);  setOpinion(g, 'ROM', 'ARM', -40);
    setOpinion(g, 'PAR', 'ROM', -60);  setOpinion(g, 'ROM', 'PAR', -50);
    setOpinion(g, 'ARM', 'PAR', -40);
    setOpinion(g, 'SEL', 'ROM', -30);
    setOpinion(g, 'CMG', 'SEL', -40);  setOpinion(g, 'SEL', 'CMG', -30);
    setOpinion(g, 'ITU', 'SEL', -50);  setOpinion(g, 'SEL', 'ITU', -40);
    setOpinion(g, 'ADI', 'PAR', 70);   setOpinion(g, 'PAR', 'ADI', 50);
    setOpinion(g, 'ADI', 'ARM', -60);  setOpinion(g, 'ARM', 'ADI', -30);

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
    h.spawnArmy(ctx, 'CMG', 'Samosata', { inf: 3, cav: 1, name: 'Host of Commagene' });
    h.spawnArmy(ctx, 'ITU', 'Chalcis', { inf: 3, name: 'Archers of the Lebanon' });
    h.spawnArmy(ctx, 'PTO', 'Alexandria', { inf: 8, cav: 2, name: 'Army of Egypt' });
    h.spawnArmy(ctx, 'ARM', 'Tigranocerta', { inf: 5, name: 'Army of Tigranes' });
    h.spawnArmy(ctx, 'PAR', 'Seleucia-Ctesiphon', { inf: 12, cav: 6, name: 'Royal Army of Parthia' });
    h.spawnArmy(ctx, 'ADI', 'Arbela', { inf: 2, cav: 2, name: 'The Riders of Arbela' });
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
    CMG: { rally: ['Samosata'], targetRegiments: 5 },
    ITU: { rally: ['Chalcis'], targetRegiments: 4 },
    REB: { rally: [], targetRegiments: 0 },
  },

  // Victory rules, checked monthly.
  checkVictory(ctx) {
    try {
      const g = ctx.game;
      const h = ctx.helpers;
      if (!g || g.over || g.result) return;
      const me = g.playerTag;
      if (me === 'ADI') {
        // The Tigris client's contract (SPEC §185): endure the settlement of
        // the East with the house seated and the road still paying.
        const adi = g.tags.ADI;
        const adiAlive = !!(adi && adi.alive !== false);
        const adiProvs = adiAlive ? h.countControlled(ctx, 'ADI', {}) : 0;
        if (adiProvs === 0) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The House Between the Rivers Falls',
            text: 'Arbela is taken and the fords have new masters. A kingdom that lived by '
              + 'being useful has been found, finally, unnecessary.',
            score: 0,
          });
          return;
        }
        if (dateGE(g.date, -60, 1) && adiAlive && h.controls(ctx, 'ADI', 'Arbela')) {
          const free = !adi.overlord;
          const rich = (adi.treasury || 0) >= 300;
          h.endGame(ctx, {
            result: 'win',
            title: free ? 'A Crown Without a Yoke' : 'The Road Held',
            text: (free
              ? 'Tigranes is broken, Pompey has come and gone, and the house of Arbela owes '
                + 'tribute to nobody: the King of Kings\' writ stops at the Zab. '
              : 'Tigranes is broken, Pompey has come and gone, and the house of Arbela is '
                + 'still seated — client, solvent, and unburned. ')
              + (rich
                ? 'The fords pay a full treasury, and the caravan lords name the king\'s peace '
                  + 'in their contracts as a thing with a price.'
                : 'The road still crosses at the house\'s fords, and that has outlasted every '
                  + 'empire that promised more.'),
            score: 100 + (free ? 30 : 0) + (rich ? 20 : 0),
          });
          return;
        }
        return;
      }
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
