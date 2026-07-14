// Judaea Universalis — bookmark: The Maccabean Revolt, 167 BCE (SPEC §9.1, §13).
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Historical spine: 1–2 Maccabees; Josephus, Antiquitates Judaicae XII–XIII.
// BCE years are negative (SPEC §13); the campaign runs 167 BCE -> ~140 BCE.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[bookmark_167bce] ' + key, e || '');
}

function findHasSelWar(game) {
  const wars = (game && game.wars) || [];
  for (const w of wars) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf('HAS') !== -1 && all.indexOf('SEL') !== -1) return w;
  }
  return null;
}

function hasWarscore(ctx) {
  try {
    const w = findHasSelWar(ctx.game);
    if (!w || !w.warscore || typeof w.warscore !== 'object') return 0;
    const v = w.warscore.HAS;
    return typeof v === 'number' ? v : 0;
  } catch (e) { warnOnce('hasWarscore', e); return 0; }
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

// Works for negative (BCE) years: -139 > -140, so "on or after 140 BCE" holds.
function dateGE(date, y, m) {
  return date.y > y || (date.y === y && date.m >= m);
}

// Manually fire an event by id (used for ev_independence on the timed HAS win).
// Mirrors SPEC §6.5 firing semantics: push to pendingEvents, mark fired,
// pause + emit 'event' for the player. Copied from bookmark_66ce.
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

export const BOOKMARK_167 = {
  id: '167bce',
  name: 'The Maccabean Revolt',
  startDate: { y: -167, m: 11, d: 1 },
  // Technology of the age (SPEC §22). Everyone starts level: the Seleucid
  // edge is already scripted into armies and events — a tech edge on top
  // crushes the designed underdog arc flat.
  techBase: 3,

  blurb: 'The king has decreed one law for all his peoples: the daily offering has ceased, '
    + 'the scrolls burn, and on the altar of the Lord stands an abomination sacred to Olympian '
    + 'Zeus. In the village of Modein an old priest has killed the king’s officer beside '
    + 'the pagan altar and fled to the hills with his five sons. Antiochus rules from the '
    + 'Taurus to Persis; against him stands the hill country of Judea, and a family.',

  activeTags: ['SEL', 'PTO', 'HAS', 'NAB', 'ARM', 'PAR'],

  // Political layer for 167 BCE, applied by initGame over map_data's 66 CE defaults.
  // Covers every province owned by ROM/JUD/AGR (tags absent from this bookmark),
  // plus era corrections: the Seleucid east is still Seleucid (Parthia proper lies
  // off-map beyond Gazaca — Mithridates I arrives BY EVENT), Egypt and Cyprus are
  // Ptolemaic, and the rising holds only Emmaus and Lydda (the Gophna hill country).
  // NOTE (abstraction): the Anatolian interior (Iconium, Tyana, Pisidia, Attalia,
  // Caesarea Mazaca) was lost to the dynasty at Apamea in 188 BCE, but no Attalid or
  // Cappadocian tag exists — it is folded into SEL per the scenario design.
  owners: {
    // -- Judea proper (SEL: the Akra garrison holds Jerusalem, fort intact) ---
    'Jerusalem': 'SEL',
    'Jericho': 'SEL',
    'Joppa': 'SEL',
    'Masada': 'SEL',
    'Engaddi': 'SEL',
    'Gadora': 'SEL',
    'Machaerus': 'SEL',
    // -- The Gophna hill country in arms (HAS) --------------------------------
    'Emmaus': 'HAS',
    'Lydda': 'HAS',
    // -- Galilee (SEL) --------------------------------------------------------
    'Sepphoris': 'SEL',
    'Jotapata': 'SEL',
    'Tiberias': 'SEL',
    'Tarichaea': 'SEL',
    'Gischala': 'SEL',
    // -- Coast, Idumea, Samaria (SEL) -----------------------------------------
    'Gaza': 'SEL',
    'Ascalon': 'SEL',
    'Azotus': 'SEL',
    'Jamnia': 'SEL',
    'Hebron': 'SEL',
    'Adora': 'SEL',
    'Sebaste': 'SEL',
    'Neapolis': 'SEL',
    'Antipatris': 'SEL',
    'Caesarea Maritima': 'SEL', // Straton's Tower in this era; canonical name kept
    'Dora': 'SEL',
    'Ptolemais': 'SEL',
    'Scythopolis': 'SEL',
    // -- Decapolis & Transjordan (SEL) ----------------------------------------
    'Pella': 'SEL',
    'Gadara': 'SEL',
    'Gerasa': 'SEL',
    'Philadelphia': 'SEL',
    'Caesarea Philippi': 'SEL',
    'Batanea': 'SEL',
    'Gamala': 'SEL',
    // -- Phoenicia (SEL) ------------------------------------------------------
    'Tyre': 'SEL',
    'Sidon': 'SEL',
    'Berytus': 'SEL',
    'Byblos': 'SEL',
    'Tripolis': 'SEL',
    'Aradus': 'SEL',
    // -- Syria, Commagene, Cilicia, Anatolia (SEL) ----------------------------
    'Damascus': 'SEL',
    'Chalcis': 'SEL',
    'Emesa': 'SEL',
    'Apamea': 'SEL',
    'Antioch': 'SEL',
    'Seleucia Pieria': 'SEL',
    'Laodicea': 'SEL',
    'Beroea': 'SEL',
    'Cyrrhus': 'SEL',
    'Palmyra': 'SEL',
    'Zeugma': 'SEL',
    'Samosata': 'SEL',
    'Tarsus': 'SEL',
    'Melitene': 'SEL',
    'Iconium': 'SEL',
    'Tyana': 'SEL',
    'Pisidia': 'SEL',
    'Attalia': 'SEL',
    'Seleucia Trachea': 'SEL',
    'Caesarea Mazaca': 'SEL',
    // -- Mesopotamia & the still-Seleucid east (SEL) ---------------------------
    'Edessa': 'SEL',
    'Carrhae': 'SEL',
    'Nisibis': 'SEL',
    'Singara': 'SEL',
    'Hatra': 'SEL',
    'Arbela': 'SEL',
    'Assur': 'SEL',
    'Dura-Europos': 'SEL',
    'Babylon': 'SEL',
    'Nehardea': 'SEL',
    'Seleucia-Ctesiphon': 'SEL',
    'Charax': 'SEL',
    'Susa': 'SEL',
    'Ecbatana': 'SEL',
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
    // NAB and ARM keep their map_data holdings; PAR keeps Gazaca only —
    // Media and Babylonia remain Seleucid in 167 and fall by event.
  },

  playableTags: [
    {
      tag: 'HAS',
      difficulty: 'Hard',
      blurb: 'You have no cities, no cavalry, no treasury — only the hills of Gophna, '
        + 'the Law, and the sons of Mattathias. Bleed every column the Seleucids send up '
        + 'the ascents, and endure: the king will die far away in Persis, regents will '
        + 'fight over his child, and pretenders will tear the dynasty in half. In those '
        + 'windows take Jerusalem, relight the lamps, and hold the city until the kingdom '
        + 'of the Greeks lets go — to 140, and freedom.',
    },
    {
      tag: 'SEL',
      difficulty: 'Moderate',
      blurb: 'One more provincial rising, in an empire that has outlived a hundred — '
        + 'but this one is led by a family that does not stay dead, and your dynasty is '
        + 'about to devour itself. Crush the rebellion in the hills before the regency and '
        + 'the pretenders paralyze Antioch, and keep men beyond the Tigris while the Arsacid '
        + 'gathers: every year of delay costs a satrapy. The empire of Seleucus is vast. '
        + 'It is also mortal.',
    },
  ],

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

    // --- The war. It ends by the sword or by events, never at the peace table. ---
    h.declareWar(ctx, 'HAS', 'SEL', 'The Maccabean Revolt');
    try {
      const war = findHasSelWar(g);
      if (war) war.noNegotiation = true;
    } catch (e) { warnOnce('setup:war', e); }

    // --- Treasuries, manpower, stability (deltas via helpers.adjust). ---
    // HAS: a family, a hill country, and whatever the faithful carry in.
    h.adjust(ctx, 'HAS', { treasury: 25, manpower: 1500, stability: 1, legitimacy: 5 });
    // SEL: an empire's income and an emptied treasury — Antiochus robbed the Temple
    // for money, and died trying to rob another (Polybius XXXI; 1 Macc 6).
    h.adjust(ctx, 'SEL', { treasury: 250, manpower: 20000, stability: 1 });
    // PTO: humiliated at Eleusis, ruled by quarreling brother-kings.
    h.adjust(ctx, 'PTO', { treasury: 200, manpower: 8000, stability: -1 });
    h.adjust(ctx, 'NAB', { treasury: 60, stability: 1 });
    h.adjust(ctx, 'ARM', { treasury: 40, stability: 1 });
    h.adjust(ctx, 'PAR', { treasury: 120, stability: 1, legitimacy: 15 });

    // --- Opinions. The Day of Eleusis (168) is a fresh humiliation: a Roman envoy
    // drew a circle in the sand around the king before Alexandria and made him
    // answer inside it. SEL and PTO are rivals; Parthia watches; Artaxias defies.
    setOpinion(g, 'HAS', 'SEL', -200); setOpinion(g, 'SEL', 'HAS', -150);
    setOpinion(g, 'SEL', 'PTO', -80);  setOpinion(g, 'PTO', 'SEL', -80);
    setOpinion(g, 'SEL', 'PAR', -50);  setOpinion(g, 'PAR', 'SEL', -60);
    setOpinion(g, 'SEL', 'ARM', -70);  setOpinion(g, 'ARM', 'SEL', -70);
    setOpinion(g, 'NAB', 'HAS', 20);   setOpinion(g, 'HAS', 'NAB', 20);
    setOpinion(g, 'NAB', 'SEL', -20);
    setOpinion(g, 'PTO', 'HAS', 10);   // the Oniad exiles are in Egypt
    setOpinion(g, 'ARM', 'PAR', 20);

    // --- Starting modifiers. ---
    h.addTagModifier(ctx, 'HAS', {
      id: 'zeal_for_the_law', name: 'Zeal for the Law', months: 48,
      effects: { moraleMult: 1.15 },
    });
    // Antioch treats the rising as banditry; ev_apollonius (-166.6) removes this.
    // Months 9 is a safety net in case the event chain is disturbed.
    h.addTagModifier(ctx, 'SEL', {
      id: 'empire_of_distractions', name: 'An Empire of Distractions', months: 9,
      effects: { aiPassive: true },
    });
    // The desecrated sanctuary. Removed by ev_rededication when HAS first holds the city.
    h.addProvinceModifier(ctx, 'Jerusalem', {
      id: 'abomination_of_desolation', name: 'The Abomination of Desolation', months: -1,
      effects: { unrest: 5, taxMult: 0.9 },
    });

    // --- Starting armies & generals (1 Macc 2–3). ---
    // Hasmonean Judaea: Judah's band in the hills, and his brother's at Lydda.
    h.spawnArmy(ctx, 'HAS', 'Emmaus', {
      inf: 3, name: 'Band of the Maccabee',
      general: { name: 'Judah Maccabee', fire: 2, shock: 4, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'HAS', 'Lydda', {
      inf: 1, name: 'Men of Modein',
      general: { name: 'Eleazar Avaran', fire: 1, shock: 3, maneuver: 1 },
    });

    // Seleucids: Apollonius' Samaria command, garrisons, and the reserve at Antioch.
    h.spawnArmy(ctx, 'SEL', 'Sebaste', {
      inf: 4, name: 'Army of Samaria',
      general: { name: 'Apollonius', fire: 1, shock: 2, maneuver: 1 },
    });
    h.spawnArmy(ctx, 'SEL', 'Jerusalem', {
      inf: 2, name: 'Garrison of the Akra',
      general: { name: 'Philip the Phrygian', fire: 1, shock: 1, maneuver: 0 },
    });
    h.spawnArmy(ctx, 'SEL', 'Gaza', { inf: 2, name: 'Coastal Garrisons' });
    // The royal field army is NOT in theater at start: the first waves are local
    // commands (1 Macc 3:13 — Seron, "commander of the army of Syria"). Lysias'
    // great expedition arrives with ev_anabasis (-165) after the king goes east.
    h.spawnArmy(ctx, 'SEL', 'Damascus', {
      inf: 6, name: 'Army of Coele-Syria',
      general: { name: 'Seron', fire: 1, shock: 2, maneuver: 1 },
    });
    h.spawnArmy(ctx, 'SEL', 'Seleucia-Ctesiphon', {
      inf: 5, name: 'Army of the Upper Satrapies',
    });

    // Neutral powers keep their forces at home.
    h.spawnArmy(ctx, 'PTO', 'Alexandria', { inf: 8, cav: 1, name: 'Army of the Two Kings' });
    h.spawnArmy(ctx, 'PTO', 'Pelusium', { inf: 2, name: 'Garrison of Pelusium' });
    h.spawnArmy(ctx, 'NAB', 'Petra', { inf: 3, cav: 2, name: 'Host of the Nabatu' });
    // Tigranocerta is anachronistic here (founded c. 83 BCE); Artaxias' seat at
    // Artaxata lies off-map, so Armenia musters at its map presence per design.
    h.spawnArmy(ctx, 'ARM', 'Tigranocerta', {
      inf: 4, name: 'Army of Artaxias',
      general: { name: 'Artaxias I', fire: 2, shock: 2, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'PAR', 'Gazaca', {
      inf: 3, cav: 3, name: 'Riders of Mithridates',
      general: { name: 'Mithridates I', fire: 2, shock: 3, maneuver: 3 },
    });

    h.notify(ctx, {
      title: 'The Maccabean Revolt',
      text: 'Mattathias has struck down the king’s officer at Modein and fled to the '
        + 'hills with his sons. The tax convoys through the Gophna country do not arrive.',
      type: 'war', provName: 'Emmaus',
    });
  },

  // Courts of November 167 BCE. Skills 0-6 feed monthly monarch points
  // (base +2); ages drive mortality; heirs succeed. The Hasmonean succession
  // (Mattathias → Judah → Jonathan → Simon) is carried by the event chain.
  rulers: {
    HAS: {
      name: 'Mattathias ben Yohanan', title: 'Priest of Modein', gov: 3, infl: 2, mar: 4, age: 79,
      heir: { name: 'Judah Maccabee', gov: 2, infl: 3, mar: 5, age: 26 },
    },
    SEL: {
      name: 'Antiochus IV Epiphanes', title: 'Basileus', gov: 2, infl: 2, mar: 3, age: 48,
      heir: { name: 'Antiochus V Eupator', gov: 1, infl: 1, mar: 1, age: 6 },
    },
    PTO: {
      name: 'Ptolemy VI Philometor', title: 'Pharaoh', gov: 2, infl: 3, mar: 1, age: 19,
      heir: { name: 'Ptolemy VIII Physcon', gov: 2, infl: 2, mar: 2, age: 15 },
    },
    NAB: { name: 'Aretas I', title: 'King', gov: 2, infl: 2, mar: 2, age: 50 },
    ARM: { name: 'Artaxias I', title: 'King', gov: 3, infl: 2, mar: 3, age: 63 },
    PAR: { name: 'Mithridates I', title: 'King of Kings', gov: 3, infl: 3, mar: 4, age: 28 },
  },

  // Linear mission chains (realm panel).
  missions: {
    HAS: [
      {
        id: 'hm_hills', name: 'The Hills Are Ours',
        desc: 'Put eight thousand men under arms in the Gophna country.',
        rewardText: 'The villages send their sons: +1,500 manpower.',
        check: (ctx) => totalMen(ctx, 'HAS') >= 8000,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HAS', { manpower: 1500 }),
      },
      {
        id: 'hm_ascents', name: 'Masters of the Ascents',
        desc: 'Bleed the king\'s columns in the passes: reach +10 war score against the Seleucids.',
        rewardText: '+25 martial points.',
        check: (ctx) => hasWarscore(ctx) >= 10,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HAS', { mar: 25 }),
      },
      {
        id: 'hm_city', name: 'The Road to the City',
        desc: 'Take Jerusalem and the Temple mount.',
        rewardText: '+20 legitimacy, +25 governance points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'HAS', 'Jerusalem'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HAS', { legitimacy: 20, gov: 25 }),
      },
      {
        id: 'hm_heartland', name: 'Heirs of David',
        desc: 'Hold six provinces of the faith.',
        rewardText: '+1 stability.',
        check: (ctx) => ctx.helpers.countControlled(ctx, 'HAS', { religion: 'judaism' }) >= 6,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'HAS', { stability: 1 }),
      },
      {
        id: 'hm_freedom', name: 'The Yoke Is Broken',
        desc: 'Reach +25 war score — make the kingdom of the Greeks let go.',
        rewardText: 'Our own shekels: +15% income permanently, +10 legitimacy.',
        check: (ctx) => hasWarscore(ctx) >= 25,
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'HAS', {
            id: 'shekel_coinage', name: 'Shekels of Israel', months: -1, effects: { incomeMult: 1.15 },
          });
          ctx.helpers.adjust(ctx, 'HAS', { legitimacy: 10 });
        },
      },
    ],
    SEL: [
      {
        id: 'sm_order', name: 'One Law for All',
        desc: 'Break the rising\'s momentum: reach +10 war score against the Hasmoneans.',
        rewardText: '+25 martial points.',
        check: (ctx) => {
          const w = findHasSelWar(ctx.game);
          return !!w && typeof w.warscore.SEL === 'number' && w.warscore.SEL >= 10;
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'SEL', { mar: 25 }),
      },
      {
        id: 'sm_gophna', name: 'Burn Out the Nest',
        desc: 'Take Emmaus and Lydda, the rebellion\'s hill-country base.',
        rewardText: 'Plunder and confiscations: +100 talents.',
        check: (ctx) => ctx.helpers.controls(ctx, 'SEL', 'Emmaus') && ctx.helpers.controls(ctx, 'SEL', 'Lydda'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'SEL', { treasury: 100 }),
      },
      {
        id: 'sm_kings_peace', name: 'The King\'s Peace',
        desc: 'Restore order across the satrapies: reach +2 stability.',
        rewardText: '+25 governance points.',
        check: (ctx) => (ctx.game.tags.SEL.stability || 0) >= 2,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'SEL', { gov: 25 }),
      },
      {
        id: 'sm_mint', name: 'The Royal Mint',
        desc: 'Fill the treasury to 400 talents.',
        rewardText: '"Royal Mint": +10% income for 24 months.',
        check: (ctx) => (ctx.game.tags.SEL.treasury || 0) >= 400,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'SEL', {
          id: 'royal_mint', name: 'Royal Mint', months: 24, effects: { incomeMult: 1.1 },
        }),
      },
      {
        id: 'sm_grand_army', name: 'The Grand Army',
        desc: 'Field thirty thousand men.',
        rewardText: '"Phalanx Drill": +5% discipline for 12 months.',
        check: (ctx) => totalMen(ctx, 'SEL') >= 30000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'SEL', {
          id: 'phalanx_drill', name: 'Phalanx Drill', months: 12, effects: { disciplineMult: 1.05 },
        }),
      },
    ],
  },

  aiHints: {
    SEL: { rally: ['Antioch', 'Damascus'], targetRegiments: 35 },
    HAS: { rally: ['Emmaus', 'Jerusalem'], targetRegiments: 15 },
    PTO: { rally: ['Alexandria'], targetRegiments: 12 },
    NAB: { rally: ['Petra'], targetRegiments: 8 },
    PAR: { rally: ['Gazaca'], targetRegiments: 6 },
    ARM: { rally: ['Tigranocerta'], targetRegiments: 5 },
    REB: { rally: [], targetRegiments: 0 },
  },

  // Victory rules (mirrors the 66 CE structure), checked monthly; game.over
  // stops further checks and the game continues for observation.
  checkVictory(ctx) {
    try {
      const g = ctx.game;
      const h = ctx.helpers;
      if (!g || g.over || g.result) return;

      const hasTag = g.tags && g.tags.HAS;
      const hasAlive = !!(hasTag && hasTag.alive !== false);
      const hasProvs = hasAlive ? h.countControlled(ctx, 'HAS', {}) : 0;
      const jerusalemHeld = hasAlive && h.controls(ctx, 'HAS', 'Jerusalem');
      if (jerusalemHeld && !h.getFlag(ctx, 'hasHeldJerusalem')) {
        h.setFlag(ctx, 'hasHeldJerusalem', true);
      }
      const ws = hasWarscore(ctx);

      if (g.playerTag === 'HAS') {
        // Early win: the kingdom concedes rather than bleed further.
        if (ws >= 50) {
          h.endGame(ctx, {
            result: 'win',
            title: 'Terms from Antioch',
            text: 'Lysias speaks to the king’s council as he once spoke beneath Jerusalem’s walls, with Philip at his back: '
              + '"We grow weaker daily, and the kingdom’s affairs press on every side. '
              + 'Let us give these men their right to live by their own laws, as before; '
              + 'for it was on account of their laws which we abolished that they were '
              + 'angered, and did all these things." The decree goes out under the royal '
              + 'seal. Judea keeps its Law, its arms, and its hills — and the kingdom '
              + 'of the Greeks keeps its distance.',
            score: 200,
          });
          return;
        }
        // Timed win: on (or after) 1 January 140 BCE, Jerusalem plus a living
        // Jewish heartland — the independence of Simon (1 Macc 13–14).
        if (dateGE(g.date, -140, 1) && jerusalemHeld
            && h.countControlled(ctx, 'HAS', { religion: 'judaism' }) >= 5) {
          const reded = !!h.getFlag(ctx, 'templeRededicated');
          fireEventById(ctx, 'ev_independence');
          h.endGame(ctx, {
            result: 'win',
            title: reded ? 'The Independence of Simon' : 'A Freedom Without Lamps',
            text: reded
              ? 'In the hundred and seventy-second year of the kingdom of the Greeks the yoke '
                + 'of the heathen is taken away from Israel. The people write in their '
                + 'contracts, "In the first year of the son of Mattathias, the great high '
                + 'priest, the commander and leader of the Jews" — and on Mount Zion the tablets '
                + 'of brass are set up, and the lamps burn in a cleansed House. The land '
                + 'of Judah has rest.'
              : 'The yoke of the heathen is taken away from Israel, and Judah’s hills '
                + 'and Jerusalem’s walls are its own — yet the sanctuary was never '
                + 'cleansed in all the years of war, and the feast of its dedication was '
                + 'never kept. Free men climb Mount Zion in silence, and begin the work '
                + 'their fathers meant to live to see.',
            score: reded ? 150 : 100,
          });
          return;
        }
        // Losses. A guerrilla war is not lost with the towns: Judah spent years
        // holding nothing but the wilderness. The rising dies only when the
        // last band is broken too.
        if (hasProvs === 0 && totalMen(ctx, 'HAS') < 1500) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The Last Ember',
            text: 'The hill country is garrisoned, the last band is scattered, and the '
              + 'high priesthood is sold in Antioch to whoever bids highest. In the '
              + 'villages the Law survives the way an ember survives — covered, '
              + 'carried, and waiting for wind.',
            score: 0,
          });
          return;
        }
        if (!h.getFlag(ctx, 'hasHeldJerusalem') && totalMen(ctx, 'HAS') < 1500) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The Hills Fall Silent',
            text: 'Jerusalem was never taken, and the men who meant to take it lie in '
              + 'the passes they defended. What remains of the house of Mattathias is a '
              + 'grave at Modein and a story told quietly — and stories, in this '
              + 'country, have outlived kingdoms before.',
            score: Math.max(0, hasProvs * 5),
          });
          return;
        }
      } else if (g.playerTag === 'SEL') {
        if (hasProvs === 0 && totalMen(ctx, 'HAS') < 1500) {
          const swift = g.date.y < -163;
          h.endGame(ctx, {
            result: 'win',
            title: swift ? 'The King’s Justice' : 'Order Restored',
            text: swift
              ? 'The rising is stamped out before the dynasty ever trembled. The '
                + 'garrisons stand, the tribute flows, and the chancery in Antioch files '
                + 'Judea where it files Persis and Media: quiet. The men of the hills are '
                + 'dead, scattered, or silent — and the king never had to learn '
                + 'their names.'
              : 'It cost years, regents, and more silver than the province will return '
                + 'in a generation, but the hill country is subdued and the high '
                + 'priesthood answers to Antioch. The kingdom turns, late, to face the '
                + 'Arsacid in the east — and to face itself.',
            score: swift ? 200 : 120,
          });
          return;
        }
        if (dateGE(g.date, -140, 1) && jerusalemHeld) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The Yoke Is Broken',
            text: 'In the hundred and seventy-second year the yoke of the heathen is taken '
              + 'away from Israel. Twenty-seven years of expeditions have bought the '
              + 'dynasty nothing but casualty lists, and the east is Parthian while the '
              + 'army watched Judea. The chancery drafts the recognition of Simon with '
              + 'the careful language kingdoms use for defeats they cannot name.',
            score: 0,
          });
          return;
        }
      }
    } catch (e) { warnOnce('checkVictory', e); }
  },
};
