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

// A crown answers to the name it wears NOW (SPEC §135): the local wrapper the
// content packages keep over livingTag, so a predicate written against the
// three letters this chapter shipped with survives a proclaimed greater crown.
function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
}

// What the crown's own survey adds up to (SPEC §211): the development standing
// on the land it owns, not the land its armies are standing on. A content
// package imports nothing, so it walks the province table itself.
function realmDev(ctx, tag) {
  let dev = 0;
  try {
    const g = ctx.game;
    const t = who(ctx, tag);
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable || p.owner !== t) continue;
      const d = p.dev || {};
      dev += (d.tax | 0) + (d.prod | 0) + (d.mp | 0);
    }
  } catch (e) { warnOnce('realmDev:' + tag, e); }
  return dev;
}

// Where a crown stands among the powers: the quarterly ranking, counted from
// zero, or -1 before the world has taken its first count of anybody.
function standingRank(ctx, tag) {
  try {
    const ord = (ctx.game.standing && ctx.game.standing.order) || [];
    return ord.indexOf(who(ctx, tag));
  } catch (e) { warnOnce('standingRank:' + tag, e); return -1; }
}

// What one court thinks of another, and how many crowns answer to this one.
function regard(ctx, from, of) {
  try {
    const t = ctx.game.tags[who(ctx, from)];
    return ((t && t.opinion) || {})[who(ctx, of)] || 0;
  } catch (e) { warnOnce('regard:' + from, e); return 0; }
}

function clientsOf(ctx, tag) {
  let n = 0;
  try {
    const g = ctx.game;
    const t = who(ctx, tag);
    for (const k of Object.keys(g.tags || {})) {
      const o = g.tags[k];
      if (o && o.alive !== false && o.overlord === t) n += 1;
    }
  } catch (e) { warnOnce('clientsOf:' + tag, e); }
  return n;
}

// The court's two numbers (SPEC §34, §197) — approval is the mood a party is
// in, `t.factions[fid]`, and favor is the credit it has banked with the crown,
// `t.estateFavor[fid]` — are read INLINE by the court strand below rather than
// through a wrapper. The engine ticks both for the human player alone, so the
// §211 audit reads the source of every check to prove the government and the
// region strands never touch them; a helper would hide exactly the thing that
// audit exists to see.

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

  // SPEC §229: the neighbours' country at the resolution Judea is played at.
  // Sixteen districts that have existed as cells since §225/§228 and were
  // visible only in 1948. Their development comes out of the parents they were
  // carved from (js/data/map_data.js), so no realm gains a point by the map
  // being drawn finer around it.
  activeProvinces: [
    'Beersheba', 'Arad', 'Paran', 'Wadi Rum', 'Zoara', 'Shobak',
    'Azraq', 'Suwayda', 'Mount Hermon',
    'Heliopolis', 'Douma', 'Salamiyah', 'Akkar', 'Batroun',
    'Nineveh', 'Kirkuk'],

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
    // The §229 districts under the names their own age used.
    'Shobak': 'Gebalene',                   // Josephus' Gobolitis, the highland of Seir
    'Wadi Rum': 'Iram',
    'Azraq': 'Basie',                       // the post on the Wadi Sirhan
    'Suwayda': 'Dionysias',                 // Soada, refounded for the god of the vine
    'Douma': 'Ghouta',                      // the garden ring east of Damascus
    'Salamiyah': 'Salaminias',
    'Akkar': 'Arca',                        // Arca Caesarea, under the Lebanon
    'Batroun': 'Botrys',
    'Kirkuk': 'Arrapha',
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
    'BOS', 'SCY', 'SRM', 'VEN',
    // The political east and south (SPEC §205).
    'KSH', 'SAB', 'HMY', 'HDR', 'SAK', 'CHO'],
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
  // The crown war (SPEC §226): two claimants, one throne, and a war that is
  // about which of them wears it rather than where the border runs. Neither
  // man's pen belongs to his protectors at the peace table — Ventidius and
  // Pacorus fight this war, they do not settle it — and at 80 war score the
  // table can write the answer both sides say they are fighting for: the
  // loser renounces, and the kingdom is one again under the winner.
  crownWar: { claimants: ['ATG', 'HER'], of: 'Judaea' },

  // Political layer of July 40 BCE. Rome's Syria is torn: Parthia holds the
  // interior, Rome clings to Cilicia and the coast. Egypt is Cleopatra's.
  owners: {
    // -- The §229 districts, each under the crown that holds its parent ------
    // The year Pacorus rode to the sea: the Parthian tide holds the Damascene,
    // the Beqaa and the Hermon, so the districts carved out of them ride with it.
    'Arad': 'HER',          // with Adora
    'Mount Hermon': 'PAR',  // with Panion
    'Heliopolis': 'PAR',    // with Chalcis
    'Douma': 'PAR',         // with Damascus
    'Salamiyah': 'PAR',     // with Emesa
    // …and the four §229 cells east of the Jordan: Antigonus holds the northern
    // Decapolis with the Parthians behind him, Malichus the Ammonite plateau
    'Hippos': 'ATG',        // with Gadara
    'Abila': 'ATG',         // with Gadara
    'Dion': 'NAB',          // with Gerasa
    'Esbus': 'NAB',         // with Philadelphia
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

  // The argument of this reign (SPEC §201): the Sanhedrin Herod executed
  // forty-five of, against the Alexandrian priesthood he imported so that the
  // office could never be used against him. Antigonus' court is the same
  // quarrel from the other side of the war and is left to the last Hasmonean's
  // own three seats, which do not divide along it.
  schools: { HER: 'fence_and_gate' },

  // The court factions (SPEC §34): the realm's internal parties. The engine
  // ticks them for the human player alone; the AI keeps its politics offstage.
  factions: {
    HER: [
      // The house this king invented (SPEC §201). Herod solved the Hasmonean
      // problem — a High Priest with a claim to the throne — by fetching Simon
      // son of Boethus out of Alexandria, marrying his daughter, and handing
      // the office to a family that had no base in the country and therefore
      // could never use it against him (Ant. XV.320–322). The Boethusians are
      // named in the sources for two centuries after as the party of that
      // arrangement, and this court had no seat for them: a roster with a
      // Sanhedrin and no priesthood at all was the one court in the game where
      // the altar had no voice, in the reign that rebuilt the Temple.
      {
        id: 'boethusians', name: 'The House of Boethus',
        priestly: true,
        desc: 'The high priesthood the king imported from Alexandria and married into: rich, '
          + 'obliging, and with no following anywhere in the country — which is precisely why '
          + 'they were chosen.',
        drift(ctx, t) {
          // They exist by the crown's favour and they can count. A solvent king
          // who keeps the office in his own gift is their king; a king in debt
          // is a king who might sell the office to somebody else.
          const base = (t.treasury || 0) > 0 ? 0.4 : -0.5;
          return (ctx.game.flags && ctx.game.flags.boethusDeposed) ? base - 0.5 : base;
        },
        boon: {
          name: 'The Altar Blesses the Builder',
          text: '+8% from the ascents, +0.2 legitimacy a month',
          effects: { pilgrimMult: 1.08, legitimacyAdd: 0.2 },
        },
        bane: {
          name: 'A Priesthood That Serves Reluctantly',
          text: '−0.25 legitimacy a month, −10% from the ascents',
          effects: { legitimacyAdd: -0.25, pilgrimMult: 0.90 },
        },
        appease: { label: 'Confirm the vestments and the revenues (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'The Alexandrians Ask for Certainty',
          text: 'They gave a daughter to this house and took an office their family had no claim '
            + 'to, and they have been the priesthood nobody in the country respects ever since. '
            + 'They would like the arrangement put beyond doubt: the office confirmed, the '
            + 'estates entailed, and the vestments kept somewhere other than the king\'s fortress.',
          grant: { label: 'The office is theirs', cost: { infl: 55 } },
          refuse: { label: 'The office is mine to give', tooltip: 'They begin writing to Alexandria again.' },
        },
      },
      {
        id: 'kin', name: 'The House of Antipater',
        priestly: false, // an Idumean house; the same bar as their cousins in 67 (SPEC §190)
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
        priestly: false, // mercenaries, mostly foreign (SPEC §190)
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
        priestly: false, // a foreign interest at a Jewish court (SPEC §190)
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
        + 'You also already wear Rome\'s collar — your father was Caesar\'s man and a Roman '
        + 'citizen for it, so you begin inside the system rather than outside it, paying its '
        + 'tribute and answering its wars. Sail to Rome and come back a paper king — then '
        + 'make the paper true, province by province, before your patrons lose interest. '
        + 'Rome\'s legions will break Parthia for their own reasons; Jerusalem you must take '
        + 'for yours, and the crown war is yours to end however large the friends standing '
        + 'behind it.',
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
      // The expansion the settlement of the East actually paid this king
      // (SPEC §187): the Decapolis grants and the bandit country command.
      {
        id: 'h5_greek_cities', name: 'The Cities of the Decapolis',
        icon: 'amphora', col: 0, row: 3, requires: ['h5_city'],
        desc: 'Take Gadara, Scythopolis and Pella — the Greek cities Augustus signed over '
          + 'to the king history\'s Herod, taken here by the king\'s own hand.',
        rewardText: '+120 talents of Greek customs, +15 influence points.',
        check: (ctx) => ['Gadara', 'Scythopolis', 'Pella']
          .every((n) => ctx.helpers.controls(ctx, 'HER', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HER', { treasury: 120, infl: 15 }),
      },
      {
        id: 'h5_hauran', name: 'The Trachonitis Command',
        icon: 'horseshoe', col: 2, row: 3, requires: ['h5_galilee'],
        desc: 'Take Batanea and Panion — the caravan-raiding country Augustus gave Herod '
          + 'to police, held at your own expense so Antioch does the arithmetic on what '
          + 'that saves.',
        rewardText: '"The Desert Watch": +8% manpower, permanently.',
        check: (ctx) => ctx.helpers.controls(ctx, 'HER', 'Batanea')
          && ctx.helpers.controls(ctx, 'HER', 'Caesarea Philippi'),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HER', {
          id: 'the_desert_watch', name: 'The Desert Watch', months: -1,
          effects: { manpowerMult: 1.08 },
        }),
      },
      // ── The reign, not the war (SPEC §197) ──────────────────────────────
      // The crown war is three years; the chapter is a hundred and six. These
      // are the things the reign is actually remembered for — the harbour,
      // the Temple, the grain year, the fortresses, and the will.
      {
        id: 'h5_caesarea', name: 'A Harbour Where There Was None',
        icon: 'shipyard', col: 1, row: 1, requires: ['h5_rome'],
        desc: 'There is no natural anchorage on this coast between Egypt and Ptolemais, so '
          + 'build one: hydraulic concrete sunk in open water off the Sharon shore. Hold '
          + 'Dora and Joppa with 300 talents banked to pay for it.',
        rewardText: '"Sebastos Harbour": +15% trade permanently, +1 stability.',
        check: (ctx) => ['Dora', 'Joppa'].every((n) => ctx.helpers.controls(ctx, 'HER', n))
          && ((ctx.game.tags.HER || {}).treasury || 0) >= 300,
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'sebastos_harbour', name: 'Sebastos Harbour', months: -1, effects: { tradeMult: 1.15 },
          });
          ctx.helpers.adjust(ctx, 'HER', { stability: 1 });
        },
      },
      {
        id: 'h5_the_temple', name: 'The House Rebuilt',
        icon: 'temple', col: 1, row: 4, requires: ['h5_one_king'],
        desc: 'A thousand priests trained as masons so that no unconsecrated hand touched the '
          + 'sanctuary, and the platform doubled. Hold Jerusalem with 400 talents banked and '
          + 'Government 7 — this is an administrative feat before it is a religious one.',
        rewardText: '"The Temple of Herod": +0.3 legitimacy a month and +20% from the ascents, permanent.',
        check: (ctx) => ctx.helpers.controls(ctx, 'HER', 'Jerusalem')
          && ((ctx.game.tags.HER || {}).treasury || 0) >= 400
          && (((ctx.game.tags.HER || {}).tech || {}).gov | 0) >= 7,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HER', {
          id: 'the_temple_of_herod', name: 'The Temple of Herod', months: -1,
          effects: { legitimacyAdd: 0.3, pilgrimMult: 1.2 },
        }),
      },
      {
        id: 'h5_famine_year', name: 'The Grain Year',
        icon: 'granary', col: 0, row: 4, requires: ['h5_greek_cities'],
        desc: 'In the famine of 25 the king melted the palace plate and bought Egyptian wheat, '
          + 'and it is the one thing his subjects never held against him. Reach +2 stability '
          + 'with 250 talents in hand — be able to do it before it is needed.',
        rewardText: '"The King Who Fed Them": −1 unrest everywhere permanently.',
        check: (ctx) => {
          const t = ctx.game.tags.HER || {};
          return (t.stability || 0) >= 2 && (t.treasury || 0) >= 250;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HER', {
          id: 'the_king_who_fed_them', name: 'The King Who Fed Them', months: -1, effects: { unrestAll: -1 },
        }),
      },
      {
        id: 'h5_the_fortress_ring', name: 'The Ring of Fortresses',
        icon: 'walls', col: 2, row: 4, requires: ['h5_hauran'],
        desc: 'Masada, Machaerus, Herodium in the hills behind Bethlehem: a king who came in '
          + 'with Parthians behind him builds where he can be besieged rather than caught. '
          + 'Hold Masada and Machaerus.',
        rewardText: '"The King\'s Rocks": +8% morale, +1 stability.',
        check: (ctx) => ['Masada', 'Machaerus'].every((n) => ctx.helpers.controls(ctx, 'HER', n)),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'the_kings_rocks', name: 'The King\'s Rocks', months: -1, effects: { moraleMult: 1.08 },
          });
          ctx.helpers.adjust(ctx, 'HER', { stability: 1 });
        },
      },
      {
        id: 'h5_the_friend_of_caesar', name: 'Friend and Ally',
        icon: 'laurel', col: 1, row: 5, requires: ['h5_the_temple'],
        desc: 'The title is a legal category and it is worth more than any province: raise '
          + 'Rome\'s regard to +180, past devotion, and the kingdom stops being audited and '
          + 'starts being consulted.',
        rewardText: '"Socius et Amicus": +10% income permanently, +30 influence points.',
        check: (ctx) => {
          const rom = ctx.game.tags.ROM;
          return ((rom && rom.opinion && rom.opinion.HER) || 0) >= 180;
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'socius_et_amicus', name: 'Socius et Amicus', months: -1, effects: { incomeMult: 1.1 },
          });
          ctx.helpers.adjust(ctx, 'HER', { infl: 30 });
        },
      },
      {
        id: 'h5_a_dynasty_not_a_reign', name: 'A Dynasty, Not a Reign',
        icon: 'star8', col: 0, row: 5, requires: ['h5_famine_year'],
        desc: 'Everything this house has is held personally, from one man, by one emperor\'s '
          + 'goodwill. Reach 85 legitimacy and +3 stability: make the crown outlive the head '
          + 'wearing it.',
        rewardText: '"The House Established": +0.25 legitimacy a month, +6% discipline, permanent.',
        check: (ctx) => {
          const t = ctx.game.tags.HER || {};
          return (t.legitimacy || 0) >= 85 && (t.stability || 0) >= 3;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HER', {
          id: 'the_house_established', name: 'The House Established', months: -1,
          effects: { legitimacyAdd: 0.25, disciplineMult: 1.06 },
        }),
      },
      // ── The civil band (SPEC §211) ──────────────────────────────────────
      // Three strands that run beside the war rather than after it: what the
      // government becomes, where the kingdom stands among the courts of the
      // East, and the court at home — which in the end cost this house more
      // than Antigonus ever did.
      {
        id: 'h5_the_arts_of_the_kingdom', name: 'The Arts of the Kingdom',
        icon: 'quill', col: 0, row: 6, civil: 'govt',
        desc: 'Nicolaus of Damascus ran this chancery — a Peripatetic who wrote a hundred and '
          + 'forty-four books of universal history between embassies — and the king\'s sons went '
          + 'to Rome to be fostered in Asinius Pollio\'s house. A client kingdom is administered '
          + 'in the age\'s own arts or it is administered badly. Embrace three institutions of '
          + 'the age: the two the world already had, and one this kingdom goes out and learns.',
        rewardText: '"The Damascene\'s Chancery": administration a tenth cheaper, +5% income, permanently.',
        check: (ctx) => (((ctx.game.tags.HER || {}).embraced) || []).length >= 3,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HER', {
          id: 'the_damascenes_chancery', name: 'The Damascene\'s Chancery', months: -1,
          effects: { adminMult: 0.9, incomeMult: 1.05 },
        }),
      },
      {
        id: 'h5_the_remitted_third', name: 'The Remitted Third',
        icon: 'coins', col: 0, row: 7, civil: 'govt', requires: ['h5_the_arts_of_the_kingdom'],
        desc: 'In 20 the king stood up before the assembly and remitted a third of that year\'s '
          + 'taxes; in 14 he remitted a quarter, and said plainly that he wanted goodwill more '
          + 'than the money. He could afford it because of what the crown owned outright — the '
          + 'balsam groves at Jericho, half the copper of Cyprus on lease from Augustus. Raise '
          + 'the realm to 130 development with 450 talents banked: remit from strength or not at all.',
        rewardText: '"The Remitted Third": +10% town growth, −0.5 unrest everywhere, permanently.',
        check: (ctx) => realmDev(ctx, 'HER') >= 130
          && ((ctx.game.tags.HER || {}).treasury || 0) >= 450,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HER', {
          id: 'the_remitted_third', name: 'The Remitted Third', months: -1,
          effects: { growthMult: 1.1, unrestAll: -0.5 },
        }),
      },
      {
        id: 'h5_among_the_powers', name: 'Among the Powers',
        icon: 'flag', col: 1, row: 6, civil: 'region',
        desc: 'He endowed the Olympic games in perpetuity and was made their president for it, '
          + 'gave Antioch its colonnaded street two and a half miles long, roofed the temple of '
          + 'Apollo at Rhodes and walled Byblos — and Augustus is supposed to have said the '
          + 'kingdom was too small for the man. Standing cannot be besieged and it cannot be '
          + 'inherited. Stand among the four first powers of the world.',
        rewardText: '"The King the East Consulted": +1 diplomatic seat, +20 influence points.',
        check: (ctx) => {
          const i = standingRank(ctx, 'HER');
          return i >= 0 && i < 4;
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'the_king_the_east_consulted', name: 'The King the East Consulted', months: -1,
            effects: { diploSeats: 1 },
          });
          ctx.helpers.adjust(ctx, 'HER', { infl: 20 });
        },
      },
      {
        id: 'h5_the_peace_with_petra', name: 'The Peace With Petra',
        icon: 'dove', col: 1, row: 7, civil: 'region', requires: ['h5_among_the_powers'],
        desc: 'In the flight of 40 he rode for Petra to borrow the ransom for his brother '
          + 'Phasael, not yet knowing Phasael had dashed his own head against the prison wall, '
          + 'and Malichus sent messengers to the border forbidding him to enter Arabia at all. '
          + 'Twelve years later he was collecting Nabataean tribute for Cleopatra and fighting '
          + 'them at Philadelphia. Raise Petra\'s regard to +60 and hold one sworn alliance.',
        rewardText: '"The Petra Settlement": +8% trade permanently, +100 talents of caravan custom.',
        check: (ctx) => regard(ctx, 'NAB', 'HER') >= 60
          && ((ctx.game.tags.HER || {}).allies || []).length >= 1,
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'the_petra_settlement', name: 'The Petra Settlement', months: -1,
            effects: { tradeMult: 1.08 },
          });
          ctx.helpers.adjust(ctx, 'HER', { treasury: 100 });
        },
      },
      {
        id: 'h5_the_alexandrian_priesthood', name: 'The Priesthood He Imported',
        icon: 'altar', col: 2, row: 6, civil: 'court',
        desc: 'Simon son of Boethus was a priest in Alexandria with a beautiful daughter and no '
          + 'following whatever in this country, which is exactly what the office needed: the '
          + 'king married the daughter and handed Simon the high priesthood, and the Hasmonean '
          + 'problem — a high priest with a claim to the throne — stopped existing (Ant. XV.320). '
          + 'Hold the House of Boethus at 70 approval; a bought altar is paid for every month.',
        rewardText: '"The Vestments in the King\'s Keeping": +0.25 legitimacy a month, +10% from the ascents, permanently.',
        check: (ctx) => (((ctx.game.tags.HER || {}).factions || {}).boethusians || 0) >= 70,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HER', {
          id: 'vestments_in_the_kings_keeping', name: 'The Vestments in the King\'s Keeping',
          months: -1, effects: { legitimacyAdd: 0.25, pilgrimMult: 1.1 },
        }),
      },
      {
        id: 'h5_the_court_that_ate_its_own', name: 'The Court That Ate Its Own',
        icon: 'scales', col: 2, row: 7, civil: 'court', requires: ['h5_the_alexandrian_priesthood'],
        desc: 'Mariamne executed in 29, her mother Alexandra the year after, the two sons she '
          + 'bore him strangled at Sebaste in 7, Antipater five days before the king\'s own '
          + 'death — Augustus is supposed to have said it was safer to be Herod\'s pig than his '
          + 'son. The family and the seventy-one destroyed each other through him because he '
          + 'never held both at once. Bank 40 favour with the House of Antipater while the '
          + 'Sanhedrin stands at 60 approval.',
        rewardText: '"The King\'s Peace at Home": −1 unrest everywhere, +0.2 legitimacy a month, permanently.',
        check: (ctx) => {
          const t = ctx.game.tags.HER || {};
          return ((t.estateFavor || {}).kin || 0) >= 40
            && ((t.factions || {}).sanhedrin || 0) >= 60;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'HER', {
          id: 'the_kings_peace_at_home', name: 'The King\'s Peace at Home', months: -1,
          effects: { unrestAll: -1, legitimacyAdd: 0.2 },
        }),
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
      {
        id: 'hy_queens_portion', name: 'The Queen\'s Portion', hypothetical: true,
        fork: '40bce/the_queens_portion',
        icon: 'amphora', col: 3, row: 2,
        desc: 'Hold Jericho as the crown when the Donations name its groves among the queen '
          + 'of Egypt\'s revenues — and answer with something other than the rent history '
          + 'paid: the deed returned unread, or the valley sold whole at your own price.',
        rewardText: '+15 influence points, +50 talents.',
        check: (ctx) => anyFlag(ctx, 'grovesRefused', 'grovesCeded'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HER', { infl: 15, treasury: 50 }),
      },
      {
        id: 'hy_where_the_king_stood', name: 'Where the King Stood', hypothetical: true,
        fork: '40bce/where_the_king_stood',
        icon: 'ship', col: 3, row: 3,
        desc: 'Wear the Senate\'s crown when Antony musters the East against Octavian, and '
          + 'refuse the queen\'s diversion that history\'s Herod obeyed: the banner in the '
          + 'line at Actium, or the levies kept home behind a documented famine.',
        rewardText: '+20 martial points.',
        check: (ctx) => anyFlag(ctx, 'sailedWithAntony', 'keptTheArmyHome'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HER', { mar: 20 }),
      },
          {
        id: 'hy_undivided_realm', name: 'The Undivided Realm', hypothetical: true,
        fork: '40bce/the_testament',
        icon: 'quill', col: 4, row: 0,
        desc: 'Reach the end of the reign with the realm whole and hand it on that way — one '
          + 'heir, one army, one set of accounts. The division the sixth will actually made '
          + 'is the road by which this kingdom became a province ten years later; a crown '
          + 'that passes entire is a crown with no third for a prefect to inherit.',
        rewardText: '+25 legitimacy, +2 stability.',
        check: (ctx) => anyFlag(ctx, 'kingdomWhole'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HER', { legitimacy: 25, stability: 2 }),
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
        // Declared seat (SPEC §183): the derived row collided with The Rock
        // Must Fall — two children of Into Idumea in one column.
        id: 'a5_hired_veterans', name: 'The Veterans\' Price',
        icon: 'helmet', col: 1, row: 1, requires: ['a5_idumea'],
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
      // The map of the grandfathers (SPEC §187): Jannaeus held the coast and
      // the Damascus road, and a restored house is measured against his map.
      {
        id: 'a5_coast', name: 'The Coast of Jannaeus',
        icon: 'ship', col: 0, row: 3, requires: ['a5_masada'],
        desc: 'Take Gaza, Ascalon and Azotus from the pretender — the ports your '
          + 'grandfather held, and the customs silver his wars ran on.',
        rewardText: '+100 talents of customs silver.',
        check: (ctx) => ['Gaza', 'Ascalon', 'Azotus']
          .every((n) => ctx.helpers.controls(ctx, 'ATG', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { treasury: 100 }),
      },
      {
        id: 'a5_damascus', name: 'The Ghost of Coele-Syria',
        icon: 'flag', col: 2, row: 3, requires: ['a5_hasmonean_charter'],
        desc: 'Take Damascus — the city that once offered itself to your house against '
          + 'the Itureans, held now by whichever empire is passing through.',
        rewardText: '+25 martial points, +10 legitimacy.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ATG', 'Damascus'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { mar: 25, legitimacy: 10 }),
      },
      // ── The Hasmonean restoration (SPEC §197) ───────────────────────────
      // Antigonus is the last king of his house and the only one this game
      // lets win. These are what a restored Hasmonean state has to do with
      // the century the chronicles gave to somebody else.
      {
        id: 'a5_the_mint', name: 'The Bilingual Coin',
        icon: 'coins', col: 1, row: 2, requires: ['a5_hired_veterans'],
        desc: 'Your coins read Mattathias the High Priest in Hebrew on one face and King '
          + 'Antigonus in Greek on the other, which is the whole political programme in two '
          + 'alphabets. Bank 250 talents and strike it everywhere.',
        rewardText: '"The Two Alphabets": +8% income and +0.15 legitimacy a month, permanent.',
        check: (ctx) => ((ctx.game.tags.ATG || {}).treasury || 0) >= 250,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ATG', {
          id: 'the_two_alphabets', name: 'The Two Alphabets', months: -1,
          effects: { incomeMult: 1.08, legitimacyAdd: 0.15 },
        }),
      },
      {
        id: 'a5_the_rocks', name: 'The Rocks of the House',
        icon: 'walls', col: 0, row: 4, requires: ['a5_coast'],
        desc: 'Masada is holding out against you with the Idumean\'s family inside it, and '
          + 'Machaerus guards the road he will come back along. Take both and the restoration '
          + 'has no back door left open.',
        rewardText: '"No Door Left Open": +8% morale, +1 stability.',
        check: (ctx) => ['Masada', 'Machaerus'].every((n) => ctx.helpers.controls(ctx, 'ATG', n)),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ATG', {
            id: 'no_door_left_open', name: 'No Door Left Open', months: -1, effects: { moraleMult: 1.08 },
          });
          ctx.helpers.adjust(ctx, 'ATG', { stability: 1 });
        },
      },
      {
        id: 'a5_the_north_restored', name: 'The North Restored',
        icon: 'grain', col: 1, row: 4, requires: ['a5_one_crown'],
        desc: 'Galilee declared for your house in every generation and paid for it in every '
          + 'generation. Hold Sepphoris, Jotapata and Gischala.',
        rewardText: '+3,000 manpower, +1 stability.',
        check: (ctx) => ['Sepphoris', 'Jotapata', 'Gischala'].every((n) => ctx.helpers.controls(ctx, 'ATG', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { manpower: 3000, stability: 1 }),
      },
      {
        id: 'a5_the_priest_king_settled', name: 'The Priest-King Settled',
        icon: 'scales', col: 2, row: 4, requires: ['a5_damascus'],
        desc: 'Your house has worn both offices for eighty years and been argued with for '
          + 'eighty years. Reach Government 7 and +2 stability: govern the quarrel instead of '
          + 'surviving it.',
        rewardText: '"The Settled Question": −0.75 unrest everywhere, +0.2 legitimacy a month, permanent.',
        check: (ctx) => (((ctx.game.tags.ATG || {}).tech || {}).gov | 0) >= 7
          && ((ctx.game.tags.ATG || {}).stability || 0) >= 2,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ATG', {
          id: 'the_settled_question', name: 'The Settled Question', months: -1,
          effects: { unrestAll: -0.75, legitimacyAdd: 0.2 },
        }),
      },
      {
        id: 'a5_terms_with_the_eagle', name: 'Terms With the Eagle',
        icon: 'dove', col: 1, row: 5, requires: ['a5_the_north_restored'],
        desc: 'Rome declared you an enemy and gave your crown to an Idumean. Outlast the '
          + 'decree: raise Rome\'s regard for the restored house to +80 — a Senate that '
          + 'ratifies what it cannot remove.',
        rewardText: '+30 influence points, +20 legitimacy.',
        check: (ctx) => {
          const rom = ctx.game.tags.ROM;
          return ((rom && rom.opinion && rom.opinion.ATG) || 0) >= 80;
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { infl: 30, legitimacy: 20 }),
      },
      // ── The civil band (SPEC §211) ──────────────────────────────────────
      // The legitimist case, made in three places at once: the government the
      // house already built and has to keep working, the patron and the
      // communities beyond the river, and the estates of the nation itself —
      // which are the one asset an Idumean with a Senate decree cannot buy.
      {
        id: 'a5_the_registers_of_the_nation', name: 'The Registers of the Nation',
        icon: 'scroll', col: 0, row: 6, civil: 'govt',
        desc: 'The house has governed through toparchies and a council of elders for eighty '
          + 'years and banked the nation\'s silver in the Temple, and every Hasmonean who fought '
          + 'a war fought it out of a system his grandfather built. Antigonus inherited the '
          + 'system and perhaps three years to prove it still runs. Take three reforms of the '
          + 'Art of Rule — the census, the governors, the granaries of state.',
        rewardText: '"The Nation\'s Registers": +8% income, −0.5 unrest everywhere, permanently.',
        check: (ctx) => (((ctx.game.tags.ATG || {}).reforms || {}).civ | 0) >= 3,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ATG', {
          id: 'the_nations_registers', name: 'The Nation\'s Registers', months: -1,
          effects: { incomeMult: 1.08, unrestAll: -0.5 },
        }),
      },
      {
        id: 'a5_the_silver_in_the_rocks', name: 'The Silver in the Rocks',
        icon: 'tower', col: 0, row: 7, civil: 'govt', requires: ['a5_the_registers_of_the_nation'],
        desc: 'Hyrcania, Alexandrium, Machaerus, Masada: your house put its treasuries where the '
          + 'road up is single file, because a dynasty invaded four times in a century keeps its '
          + 'reserve above the invasion and its accounts out of the invader\'s hands. Raise the '
          + 'realm to 280 development with 450 talents banked — the whole country working, and '
          + 'the silver sitting on a rock.',
        rewardText: '"The Silver in the Rocks": upkeep a tenth cheaper, +6% income, permanently.',
        check: (ctx) => realmDev(ctx, 'ATG') >= 280
          && ((ctx.game.tags.ATG || {}).treasury || 0) >= 450,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ATG', {
          id: 'the_silver_in_the_rocks', name: 'The Silver in the Rocks', months: -1,
          effects: { maintMult: 0.9, incomeMult: 1.06 },
        }),
      },
      {
        id: 'a5_the_king_of_kings_regard', name: 'The Lances That Crowned You',
        icon: 'horseshoe', col: 1, row: 6, civil: 'region',
        desc: 'Pacorus and Barzapharnes put you on the throne, and the price was a promise of '
          + 'talents and noblewomen that no treasury in Jerusalem could actually have paid; '
          + 'Lysanias of Chalcis, whose father married into your house, brokered it. A crown '
          + 'given by lances is rented until the lender says otherwise. Raise Parthia\'s regard '
          + 'for the restored house to +100 — a patron who has stopped counting.',
        rewardText: '"The Lances Remember": +10% manpower permanently, +20 martial points.',
        check: (ctx) => regard(ctx, 'PAR', 'ATG') >= 100,
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ATG', {
            id: 'the_lances_remember', name: 'The Lances Remember', months: -1,
            effects: { manpowerMult: 1.1 },
          });
          ctx.helpers.adjust(ctx, 'ATG', { mar: 20 });
        },
      },
      {
        id: 'a5_beyond_the_euphrates', name: 'Beyond the River',
        icon: 'diaspora', col: 1, row: 7, civil: 'region', requires: ['a5_the_king_of_kings_regard'],
        desc: 'Nehardea and Nisibis gather the half-shekel of the eastern communities and convoy '
          + 'it to Jerusalem under armed escort, tens of thousands of men moving at once, because '
          + 'the road is not safe and the money is not small. That is a constituency no Idumean '
          + 'can buy and no legion can garrison. Swear a second alliance, or take a client crown '
          + 'of your own: a house with friends is a house Rome must negotiate with.',
        rewardText: '"Friends Beyond the River": +1 diplomatic seat, +2,000 men of the eastern communities.',
        check: (ctx) => ((ctx.game.tags.ATG || {}).allies || []).length >= 2
          || clientsOf(ctx, 'ATG') >= 1,
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ATG', {
            id: 'friends_beyond_the_river', name: 'Friends Beyond the River', months: -1,
            effects: { diploSeats: 1 },
          });
          ctx.helpers.adjust(ctx, 'ATG', { manpower: 2000 });
        },
      },
      {
        id: 'a5_the_courses_of_the_altar', name: 'The Courses of the Altar',
        icon: 'altar', col: 2, row: 6, civil: 'court',
        desc: 'Twenty-four courses serve in rotation, a week apiece, and the men who keep them '
          + 'watch their king work: when Sosius\' soldiers came over the wall in 37 the priests '
          + 'went on with the offering while the fighting reached the courts. A king who is also '
          + 'high priest is judged by professionals. Hold the priesthood at 75 approval — the '
          + 'ephod is an office before it is an argument.',
        rewardText: '"The Ephod Sits Straight": +0.25 legitimacy a month, −0.5 unrest everywhere, permanently.',
        check: (ctx) => (((ctx.game.tags.ATG || {}).factions || {}).priesthood || 0) >= 75,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ATG', {
          id: 'the_ephod_sits_straight', name: 'The Ephod Sits Straight', months: -1,
          effects: { legitimacyAdd: 0.25, unrestAll: -0.5 },
        }),
      },
      {
        id: 'a5_the_nations_own', name: 'The Nation\'s Own',
        icon: 'speaker', col: 2, row: 7, civil: 'court', requires: ['a5_the_courses_of_the_altar'],
        desc: 'The city cheered the horsemen in at the Fish Gate, and three years later the '
          + 'country came up for Pentecost and fought the legions in the outer court rather than '
          + 'take an Idumean. That is the whole Hasmonean argument — the nation\'s own estates '
          + 'prefer their own — and it is worth more than a legion right up to the day it is '
          + 'worth nothing. Bank 40 favour with the priesthood and hold the street at 70.',
        rewardText: '"The Nation\'s Own": +12% manpower permanently, +1 stability.',
        check: (ctx) => {
          const t = ctx.game.tags.ATG || {};
          return ((t.estateFavor || {}).priesthood || 0) >= 40
            && ((t.factions || {}).street || 0) >= 70;
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ATG', {
            id: 'the_nations_own', name: 'The Nation\'s Own', months: -1,
            effects: { manpowerMult: 1.12 },
          });
          ctx.helpers.adjust(ctx, 'ATG', { stability: 1 });
        },
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
      {
        id: 'hy_queens_portion', name: 'The Queen\'s Portion', hypothetical: true,
        fork: '40bce/the_queens_portion',
        icon: 'amphora', col: 3, row: 2,
        desc: 'Hold Jericho as the crown when the Donations name its groves among the queen '
          + 'of Egypt\'s revenues — and answer with something other than the rent history '
          + 'paid: the deed returned unread, or the valley sold whole at your own price.',
        rewardText: '+15 influence points, +50 talents.',
        check: (ctx) => anyFlag(ctx, 'grovesRefused', 'grovesCeded'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { infl: 15, treasury: 50 }),
      },
      {
        id: 'hy_old_man_in_babylon', name: 'The Old Man in Babylon', hypothetical: true,
        fork: '40bce/the_old_man_in_babylon',
        icon: 'diaspora', col: 3, row: 3, requires: ['hy_hasmonean_holds'],
        desc: 'Keep the Hasmonean crown past the year the war settles, and the question '
          + 'history answered with a strangling cord comes to a standing house instead: '
          + 'what a dynasty owes the mutilated elder living on among the Jews of Babylon.',
        rewardText: '+15 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'hyrcanusHome', 'hyrcanusPensioned'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { legitimacy: 15 }),
      },
          {
        id: 'hy_undivided_realm', name: 'A Crown That Passes Whole', hypothetical: true,
        fork: '40bce/the_testament',
        icon: 'quill', col: 4, row: 0,
        desc: 'A restored house reaches the end of a long reign and answers the question that '
          + 'destroyed the last one: does the realm pass entire, or in pieces to sons who '
          + 'will each be confirmed separately by a foreign secretary? Hand it on whole.',
        rewardText: '+25 legitimacy, +2 stability.',
        check: (ctx) => anyFlag(ctx, 'kingdomWhole'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { legitimacy: 25, stability: 2 }),
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
      // ── The chair's own reach (SPEC §196): this chapter's span holds the
      // whole conversion story — Ananias at Charax, Helena's vow, a fugitive
      // King of Kings warming himself at the house's fire — and the missions
      // should ask for the deeds the chronicles actually credit it with.
      {
        id: 't5_kingmakers_house', name: 'A King of Kings, Restored',
        icon: 'flag', col: 1, row: 2, requires: ['t5_tide_riders'],
        desc: 'One winter a King of Kings arrives at the fords with nothing but his fugitives, '
          + 'and the house that shelters him crowns its own overlord. Keep eight thousand '
          + 'lances mustered — enough to ride a guest home to Ctesiphon as a king.',
        rewardText: '"The Kingmaker\'s House": +0.1 legitimacy a month permanently, +15 influence points.',
        check: (ctx) => totalMen(ctx, 'ADI') >= 8000,
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ADI', {
            id: 'kingmakers_house', name: 'The Kingmaker\'s House', months: -1, effects: { legitimacyAdd: 0.1 },
          });
          ctx.helpers.adjust(ctx, 'ADI', { infl: 15 });
        },
      },
      {
        id: 't5_queens_vow', name: 'The Queen\'s Vow',
        icon: 'grain', col: 2, row: 3, requires: ['t5_customs_frontier'],
        desc: 'A famine is coming to Jerusalem in the queen mother\'s lifetime, and she will meet '
          + 'it under a Nazirite vow — grain from Alexandria, figs from Cyprus, at any price the '
          + 'captains name. Bank 250 talents so the vow can be paid when it is sworn.',
        rewardText: '"The Lamp Over the Door": +5% from the ascents permanently, +10 legitimacy.',
        check: (ctx) => ((ctx.game.tags.ADI || {}).treasury || 0) >= 250,
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ADI', {
            id: 'lamp_over_the_door', name: 'The Lamp Over the Door', months: -1, effects: { pilgrimMult: 1.05 },
          });
          ctx.helpers.adjust(ctx, 'ADI', { legitimacy: 10 });
        },
      },
      {
        id: 't5_island_the_tide_missed', name: 'The Island the Tide Broke On',
        icon: 'ship', col: 1, row: 3, requires: ['t5_kingmakers_house'],
        desc: 'Pacorus took Syria to the sea\'s edge and Tyre alone refused the tide — no fleet, '
          + 'no mole, no patience for island arithmetic. Take Tyre, and lay the one city the '
          + 'invasion could not reach at the King of Kings\' feet.',
        rewardText: '+100 talents, +15 martial points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ADI', 'Tyre'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { treasury: 100, mar: 15 }),
      },
      // ── The civil band (SPEC §211) ──────────────────────────────────────
      // Three things a client house does that have nothing to do with the
      // tide: it governs the country behind its fords, it stays worth more
      // standing than taken to both empires at once, and it manages what it
      // prays to in front of the men who hold its lances.
      {
        id: 't5_the_arts_of_arbela', name: 'The Arts of Two Empires',
        icon: 'bricks', col: 0, row: 4, civil: 'govt',
        desc: 'Arbela was a Seleucid town before it was a Parthian client and it kept the arts '
          + 'of both — Greek accounts on the same table as Aramaic contracts, and a customs house '
          + 'that will take payment in whichever empire\'s coin came up the road last. Embrace '
          + 'three institutions of the age and raise the house\'s land to 45 development: fords '
          + 'are worth exactly what the country behind them is worth.',
        rewardText: '"The Arts of Two Empires": +8% income, administration a tenth cheaper, permanently.',
        check: (ctx) => (((ctx.game.tags.ADI || {}).embraced) || []).length >= 3
          && realmDev(ctx, 'ADI') >= 45,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ADI', {
          id: 'the_arts_of_two_empires', name: 'The Arts of Two Empires', months: -1,
          effects: { incomeMult: 1.08, adminMult: 0.9 },
        }),
      },
      {
        id: 't5_between_the_empires', name: 'Read in Both Chanceries',
        icon: 'scales', col: 1, row: 4, civil: 'region',
        desc: 'This house\'s whole business is being worth more standing than taken, to both '
          + 'sides at once: it will shelter a beaten King of Kings and be paid in Nisibis for it, '
          + 'and the queen mother will be buried in a pyramid-topped tomb outside Jerusalem, well '
          + 'inside the Roman half of the world. Bring Rome\'s regard for Arbela to +25 — off the '
          + 'enemy list entirely — and stand among the seven first powers.',
        rewardText: '"Read in Both Chanceries": +1 diplomatic seat and +10% trade, permanently.',
        check: (ctx) => {
          const i = standingRank(ctx, 'ADI');
          return regard(ctx, 'ROM', 'ADI') >= 25 && i >= 0 && i < 7;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ADI', {
          id: 'read_in_both_chanceries', name: 'Read in Both Chanceries', months: -1,
          effects: { diploSeats: 1, tradeMult: 1.1 },
        }),
      },
      {
        id: 't5_the_old_fires', name: 'The Old Fires and the New Prayers',
        icon: 'flame', col: 2, row: 4, civil: 'court',
        desc: 'A merchant named Ananias will teach the women of Charax and then the king himself, '
          + 'and Eleazar the Galilean will tell him that reading the Law is not the same as '
          + 'keeping it — after which the nobles of Adiabene raise two revolts against a king who '
          + 'left the ancestral fires, calling in Abias the Arab and then Vologaeses (Ant. '
          + 'XX.75–91). Hold the fire priests at 70 approval with 35 favour banked among the '
          + 'caravan lords: change what the house prays to without losing the men who fund it.',
        rewardText: '"The Fires Kept, the Lamps Lit": −1 unrest everywhere, +0.2 legitimacy a month, permanently.',
        check: (ctx) => {
          const t = ctx.game.tags.ADI || {};
          return ((t.factions || {}).magi || 0) >= 70
            && ((t.estateFavor || {}).caravans || 0) >= 35;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ADI', {
          id: 'the_fires_and_the_lamps', name: 'The Fires Kept, the Lamps Lit', months: -1,
          effects: { unrestAll: -1, legitimacyAdd: 0.2 },
        }),
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
      {
        id: 'hy_house_unpolluted', name: 'A House Unpolluted', hypothetical: true,
        fork: '40bce/the_statue',
        icon: 'altar', col: 3, row: 1,
        desc: 'A merchant named Ananias will teach the Law at Charax in this chapter\'s span, and '
          + 'the house\'s new prayers will need an address. If the year of Gaius passes with the '
          + 'order never given — or refused in writing before it is asked — the Temple the queen '
          + 'mother will adorn is never threatened with an emperor\'s face.',
        rewardText: '+15 legitimacy, +10 influence points.',
        check: (ctx) => anyFlag(ctx, 'orderNeverGiven', 'refusedInAdvance'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { legitimacy: 15, infl: 10 }),
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

    // Herod is Rome's client from the first day of the chapter, not from the
    // day the Senate votes him a crown. The collar is his inheritance: Antipater
    // was Caesar's man and a Roman citizen for it, and the son begins the war
    // already inside the Roman system — which is what makes Rome worth running
    // to, and what the whole reign is afterwards spent negotiating with. Tribute
    // (15% of a small income), Rome's wars to answer, and no client kingdoms of
    // his own until he is out from under it (§61); the crown war is his own to
    // settle regardless, because a crown war's pen belongs to the claimant
    // (SPEC §226).
    //
    // Set AFTER the declaration above: a war declared ON a client is the
    // protecting crown's war too, and Rome must not be dragged into the field
    // in July of 40 — Antony is busy with Fulvia's war, and the legions come
    // when the Senate says so (ev5_senate).
    try {
      const her = g.tags.HER;
      if (her && g.tags.ROM) her.overlord = 'ROM';
    } catch (e) { warnOnce('setup:client', e); }

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
