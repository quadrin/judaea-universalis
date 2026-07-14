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
  // Technology of the age (SPEC §22): the legions and the cataphract East.
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

  blurb: 'The Parthians have crossed the Euphrates and nothing stood. Syria is overrun, '
    + 'and in Jerusalem they have crowned Antigonus, the last fighting Hasmonean, who paid '
    + 'them in silver and promises. Herod — Idumean, commoner, Antipater\'s son — runs '
    + 'south through the night with his family and a plan of desperate arithmetic: Masada '
    + 'can hold, Petra can be bargained with, and in Rome there is a Senate that hates a '
    + 'vacuum more than it loves any king.',

  activeTags: ['HER', 'ATG', 'ROM', 'PAR', 'NAB', 'PTO', 'ARM', 'OSR', 'ADI', 'CHX'],

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
    PTO: { name: 'Cleopatra VII Philopator', title: 'Pharaoh', gov: 4, infl: 5, mar: 2, age: 29 },
    NAB: { name: 'Malichus I', title: 'King', gov: 2, infl: 2, mar: 2, age: 45 },
    ARM: { name: 'Artavasdes II', title: 'King', gov: 2, infl: 3, mar: 2, age: 45 },
  },

  missions: {
    HER: [
      {
        id: 'h5_rome', name: 'The Voyage to Rome',
        desc: 'Kneel before the Senate and rise a king (the flight to Rome, by event).',
        rewardText: '+25 influence points.',
        check: (ctx) => !!ctx.helpers.getFlag(ctx, 'herodKing'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HER', { infl: 25 }),
      },
      {
        id: 'h5_coast', name: 'The Coast Road',
        desc: 'Control Joppa and Lydda — the road to the city runs by the sea.',
        rewardText: '+100 talents of customs silver.',
        check: (ctx) => ctx.helpers.controls(ctx, 'HER', 'Joppa') && ctx.helpers.controls(ctx, 'HER', 'Lydda'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HER', { treasury: 100 }),
      },
      {
        id: 'h5_galilee', name: 'Galilee Pacified',
        desc: 'Control Sepphoris and Jotapata — the bandit country broken.',
        rewardText: '+1,500 manpower.',
        check: (ctx) => ctx.helpers.controls(ctx, 'HER', 'Sepphoris') && ctx.helpers.controls(ctx, 'HER', 'Jotapata'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HER', { manpower: 1500 }),
      },
      {
        id: 'h5_city', name: 'The City of David',
        desc: 'Take Jerusalem.',
        rewardText: '+20 legitimacy — a crown made true.',
        check: (ctx) => ctx.helpers.controls(ctx, 'HER', 'Jerusalem'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HER', { legitimacy: 20 }),
      },
      {
        id: 'h5_one_king', name: 'One King',
        desc: 'The last Hasmonean extinguished or bent to clienthood.',
        rewardText: '+1 stability, +15 legitimacy.',
        check: (ctx) => {
          const r = ctx.game.tags.ATG;
          return !r || !r.alive || r.overlord === 'HER';
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HER', { stability: 1, legitimacy: 15 }),
      },
    ],
    ATG: [
      {
        id: 'a5_army', name: 'The King\'s Muster',
        desc: 'Keep ten thousand men under arms.',
        rewardText: '+1,500 manpower.',
        check: (ctx) => totalMen(ctx, 'ATG') >= 10000,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { manpower: 1500 }),
      },
      {
        id: 'a5_idumea', name: 'Into Idumea',
        desc: 'Take Hebron and Adora — strangle the pretender in his cradle-country.',
        rewardText: '+25 martial points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ATG', 'Hebron') && ctx.helpers.controls(ctx, 'ATG', 'Adora'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { mar: 25 }),
      },
      {
        id: 'a5_anointed', name: 'The Anointed King',
        desc: 'Raise legitimacy to 60 — high priest and king, and seen to be both.',
        rewardText: '+25 influence points.',
        check: (ctx) => (ctx.game.tags.ATG.legitimacy || 0) >= 60,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { infl: 25 }),
      },
      {
        id: 'a5_masada', name: 'The Rock Must Fall',
        desc: 'Take Masada, where the Idumean left his family.',
        rewardText: '+15 legitimacy.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ATG', 'Masada'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { legitimacy: 15 }),
      },
      {
        id: 'a5_one_crown', name: 'The Last Hasmonean',
        desc: 'The pretender extinguished or bent to clienthood.',
        rewardText: '+1 stability, +15 legitimacy.',
        check: (ctx) => {
          const r = ctx.game.tags.HER;
          return !r || !r.alive || r.overlord === 'ATG';
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ATG', { stability: 1, legitimacy: 15 }),
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

    setOpinion(g, 'HER', 'ATG', -180); setOpinion(g, 'ATG', 'HER', -180);
    setOpinion(g, 'ROM', 'HER', 80);   setOpinion(g, 'HER', 'ROM', 100);
    setOpinion(g, 'ROM', 'PAR', -150); setOpinion(g, 'PAR', 'ROM', -150);
    setOpinion(g, 'ATG', 'PAR', 100);  setOpinion(g, 'PAR', 'ATG', 80);
    setOpinion(g, 'NAB', 'HER', -20);  setOpinion(g, 'HER', 'NAB', 20);
    setOpinion(g, 'PTO', 'ROM', 60);   setOpinion(g, 'ROM', 'PTO', 40);

    // Antony is busy with Octavian and Fulvia's war: Rome watches its coast
    // until the Senate acts (ev5_senate lifts this).
    h.addTagModifier(ctx, 'ROM', {
      id: 'wars_elsewhere', name: 'The Triumvirs Quarrel', months: 30,
      effects: { aiPassive: true },
    });
    h.addTagModifier(ctx, 'ATG', {
      id: 'parthian_favor', name: 'The Parthian Favor', months: 24,
      effects: { moraleMult: 1.05 },
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
