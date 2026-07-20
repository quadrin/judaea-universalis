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
  // Rome is a republic until the emperors (SPEC §25).
  govTypes: { ROM: 'republic' },

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
    'Modi\'in Hills': 'Modi\'in',           // the village where the revolt began
  },

  // The victors' pens wait on the schoolhouse (SPEC §66): the name a state
  // writes on a conquered province, applied only once the land is truly its
  // own — owned, and either integrated or peopled by the owner's culture.
  // The Hebrew pen writes the old names back over the Greek foundations of
  // the kings; until then, and again the moment the land changes hands, the
  // labels keep the era names above.
  integratedNames: {
    HAS: {
      'Ptolemais': 'Akko', 'Scythopolis': 'Beit She\'an', 'Sebaste': 'Shomron',
      'Joppa': 'Yafo', 'Jamnia': 'Yavneh', 'Azotus': 'Ashdod',
      'Ascalon': 'Ashkelon', 'Gaza': 'Azza', 'Dora': 'Dor',
      'Sepphoris': 'Tzippori', 'Gadara': 'Gader', 'Philadelphia': 'Rabbat Ammon',
    },
    // The Seleucid pen has one name it longs to write: Epiphanes re-founded
    // the city of David as Antiochia-in-Judaea, gymnasium and all.
    SEL: { 'Jerusalem': 'Antiochia' },
  },

  // The map wears its era's shape (SPEC §47): the desert fortresses are not
  // yet built — Jannaeus raises Machaerus and the Masada fort decades later —
  // and Modi'in, the Hasmoneans' home village, stands as its own place
  // (it inherits the rebels' ownership from Lydda, its toparchy).
  mergeProvinces: { 'Masada': 'Engaddi', 'Machaerus': 'Medaba' },
  activeProvinces: ['Modi\'in Hills'],

  blurb: 'The king has decreed one law for all his peoples: the daily offering has ceased, '
    + 'the scrolls burn, and on the altar of the Lord stands an abomination sacred to Olympian '
    + 'Zeus. In the village of Modein an old priest has killed the king’s officer beside '
    + 'the pagan altar and fled to the hills with his five sons. Antiochus rules from the '
    + 'Taurus to Persis; against him stands the hill country of Judea, and a family.',

  // v5.4: ROM and PNT join — Rome watches from Italy the year after Pydna
  // (Popillius' circle in the sand is diplomacy, not conquest), and Pontus
  // keeps its Black Sea coast.
  activeTags: ['SEL', 'PTO', 'HAS', 'NAB', 'ARM', 'PAR', 'GRC', 'ROM', 'PNT'],

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
    // -- v5.0: the wider world -------------------------------------------------
    // Hellas: the leagues and free cities (GRC — Rome's shadow lies off-map)
    'Corinth': 'GRC', 'Athens': 'GRC', 'Sparta': 'GRC', 'Gortyn': 'GRC',
    'Rhodes': 'GRC', 'Halicarnassus': 'GRC',
    // Ptolemaic Africa: the Pentapolis and the Nile to the cataract
    'Cyrene': 'PTO', 'Marmarica': 'PTO', 'Paraetonium': 'PTO', 'Syene': 'PTO',
    // Arabia and the Seleucid east (Persis is still nominally the king's)
    'Yathrib': 'NAB', 'Khaybar': 'NAB', 'Berenice': 'PTO',
    'Persepolis': 'SEL', 'Gabae': 'SEL', 'Gerrha': 'SEL',
    // -- v5.4: the frame grows west and north ----------------------------------
    // Rome enters the map the year after Pydna: Italy, Sicily, Tripolitania
    // and the Illyrian shore are the Republic's (base map_data holdings), and
    // its shadow now lies ON the map. The Aegean north stays Greek; Pontus
    // holds its Black Sea kingdom under Pharnaces' heirs.
    'Thessalonica': 'GRC', 'Hadrianopolis': 'GRC', 'Byzantion': 'GRC',
    'Nicaea': 'GRC', 'Smyrna': 'GRC', 'Ancyra': 'GRC',
    'Sinope': 'PNT', 'Trapezus': 'PNT', 'Phasis': 'PNT',
    'Caucasian Albania': 'ARM', 'Hyrcania': 'SEL',
  },

  // What the era asks of you (SPEC §33) — shown in the realm panel.
  objectives: {
    HAS: [
      'Win: reach +50 war score against the Seleucids — Antioch will offer terms (accept, or fight for the whole inheritance).',
      'Win: by 140 BCE hold Jerusalem and a living Jewish heartland (5+ provinces of the faith). Rededicate the Temple for the fuller verdict.',
      'Lose: the last band broken — no provinces and fewer than 1,500 men.',
    ],
    SEL: [
      'Win: stamp out the rising — Hasmonean Judaea reduced to nothing (before 163 BCE for the swifter verdict).',
      'The longer the hills burn, the poorer the verdict — and Parthia waits in the east.',
    ],
  },

  // The court factions (SPEC §34): the realm's internal parties. The engine
  // ticks them for the human player alone; the AI keeps its politics offstage.
  factions: {
    HAS: [
      {
        id: 'hasideans', name: 'The Hasideans',
        desc: 'The pious who fight for the Law, not for a crown — and will go home the day the Law is safe.',
        drift(ctx, t) { return (t.stability || 0) >= 1 ? 0.4 : -0.4; },
        boon: { name: 'The Pious Bless the House', text: '+0.25 legitimacy a month', effects: { legitimacyAdd: 0.25 } },
        bane: { name: 'The Pious Go Home', text: '−15% manpower', effects: { manpowerMult: 0.85 } },
        appease: { label: 'Honor the Law\'s courts (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Hasideans Ask for the Law',
          text: 'They came to the hills for the Torah, not for the sons of Mattathias, and they say '
            + 'so to your face: let the courts of the Law sit again in every village you hold, or '
            + 'the pious will conclude that one king of this world is much like another.',
          grant: { label: 'The courts sit', cost: { gov: 50 } },
          refuse: { label: 'The war cannot wait on judges', tooltip: 'The pious begin counting your sins instead of the enemy\'s.' },
        },
      },
      {
        id: 'hellenizers', name: 'The Hellenizers',
        desc: 'The gymnasium party — Jason\'s people, rich, connected, and certain this rebellion ruins them.',
        drift(ctx, t) {
          const g = ctx.game;
          const atWar = (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
          return atWar ? -0.4 : ((t.treasury || 0) > 0 ? 0.4 : 0);
        },
        boon: { name: 'The Cities Trade Anyway', text: '+8% income', effects: { incomeMult: 1.08 } },
        bane: { name: 'The Cities Conspire', text: '+1 unrest everywhere', effects: { unrestAll: 1 } },
        appease: { label: 'Leave their houses standing (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'The Hellenizers Name Their Price',
          text: 'The men who bought the high priesthood twice send a discreet delegation: they can '
            + 'make the coastal money flow toward the hills — or toward Antioch. They ask only that '
            + 'the zealous stop burning the houses of everyone who ever spoke Greek.',
          grant: { label: 'Restrain the zealous', cost: { infl: 50 } },
          refuse: { label: 'They chose their side long ago', tooltip: 'Their silver goes to Antioch.' },
        },
      },
      {
        id: 'warparty', name: 'The Brothers\' Captains',
        desc: 'Judas\' commanders and the young men of the ascents: the war party, hungriest when the war stalls.',
        drift(ctx, t) {
          const g = ctx.game;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.5 : -0.6;
        },
        boon: { name: 'The Hammer\'s Men', text: '+5% morale', effects: { moraleMult: 1.05 } },
        bane: { name: 'The Bands Drift Home', text: '−20% reinforcement', effects: { reinforceMult: 0.8 } },
        appease: { label: 'Feast the captains (40 martial points)', cost: { mar: 40 } },
        demand: {
          title: 'The Captains Want the Offensive',
          text: 'They did not leave their farms to hold ground. The captains crowd the tent: strike '
            + 'the garrisons, take the fight down from the hills — or watch the bands drift home '
            + 'for the plowing season and come back only if there is something to win.',
          grant: { label: 'Sound the advance', cost: { mar: 50 } },
          refuse: { label: 'Patience wins this war', tooltip: 'The tents empty a little each week.' },
        },
      },
    ],
    SEL: [
      {
        id: 'court', name: 'The Friends of the King',
        desc: 'The purple-wearers of Antioch: regents, treasurers and cousins, every one a rival to every other.',
        drift(ctx, t) { return (t.stability || 0) >= 1 ? 0.4 : -0.4; },
        boon: { name: 'The Court Aligned', text: '+0.25 legitimacy a month', effects: { legitimacyAdd: 0.25 } },
        bane: { name: 'The Ministers Embezzle', text: '−7% income', effects: { incomeMult: 0.93 } },
        appease: { label: 'Preferments and titles (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Friends Demand Preferment',
          text: 'Lysias\' rivals and Philip\'s friends and the treasurer\'s nephews all want the same '
            + 'thing: more. A king in Persis is far away; a satrapy signed today is near. Pay the '
            + 'court in offices, or discover what an unpaid court does to a regency.',
          grant: { label: 'Sign the appointments', cost: { gov: 50 } },
          refuse: { label: 'The king will judge them all', tooltip: 'The knives come out of their sheaths a finger\'s width.' },
        },
      },
      {
        id: 'phalanx', name: 'The Phalanx',
        desc: 'The settler-soldiers of the military colonies: the empire\'s spine, paid in land and arrears.',
        drift(ctx, t) {
          const g = ctx.game;
          if ((t.treasury || 0) < 0) return -0.7;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.4 : -0.2;
        },
        boon: { name: 'The Sarissas Level', text: '+4% discipline', effects: { disciplineMult: 1.04 } },
        bane: { name: 'Pay in Arrears', text: '−6% morale', effects: { moraleMult: 0.94 } },
        appease: { label: 'A donative for the ranks (100 talents)', cost: { treasury: 100 } },
        demand: {
          title: 'The Phalanx Counts Its Pay',
          text: 'The colonies of Syria have sent their sons to Egypt, to Persis, and now to a war in '
            + 'the Judaean hills, and the pay-chests run three months behind. Elephants eat; so do '
            + 'phalangites. The ranks would like to be reminded which comes first.',
          grant: { label: 'Open the war chest', cost: { treasury: 150 } },
          refuse: { label: 'Victory pays all debts', tooltip: 'The muster rolls grow quietly shorter.' },
        },
      },
      {
        id: 'cities', name: 'The Greek Cities',
        desc: 'The poleis of the coast and the Decapolis: the tax base, forever petitioning for exemptions.',
        drift(ctx, t) { return (t.warExhaustion || 0) <= 5 ? 0.3 : -0.5; },
        boon: { name: 'The Harbors Pay Gladly', text: '+8% income', effects: { incomeMult: 1.08 } },
        bane: { name: 'The Assemblies Grumble', text: '+1 unrest everywhere', effects: { unrestAll: 1 } },
        appease: { label: 'Hear their embassies (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'The Cities Petition the Regent',
          text: 'Ptolemais and Gaza have paid for one royal war already this decade, and their '
            + 'assemblies vote long resolutions about ancient liberties whenever the tribute is '
            + 'mentioned. Remit a season\'s taxes, or let the resolutions grow teeth.',
          grant: { label: 'Remit the season\'s tribute', cost: { treasury: 120 } },
          refuse: { label: 'Liberties are for the loyal', tooltip: 'The resolutions grow teeth.' },
        },
      },
    ],
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
  ],

  // Pre-existing works (SPEC §58): the two great Hellenistic harbors are
  // working shipyards at the bookmark's dawn.
  buildings: {
    'Seleucia Pieria': ['shipyard'], // the port of Antioch
    'Alexandria': ['shipyard'],
  },

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

    // --- Starting fleets (SPEC §58): the royal navies are afloat on day one. ---
    h.spawnFleet(ctx, 'SEL', 'Seleucia Pieria', 5, { name: 'The Royal Fleet' });
    h.spawnFleet(ctx, 'PTO', 'Alexandria', 5, { name: 'Fleet of Alexandria' });

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
      effects: { moraleMult: 1.15, reinforceMult: 1.2, maintMult: 0.55 },
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
    // The village that raised the revolt now stands on the map (SPEC §47),
    // and its sons muster at home — a second band, or the wider front the
    // third province opens would stretch the rising to breaking.
    h.spawnArmy(ctx, 'HAS', 'Modi\'in Hills', {
      inf: 3, name: 'Men of Modein',
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
    // v5.4: the wider frame's crowned heads
    ROM: { name: 'The Senate and People', title: 'Res Publica', gov: 4, infl: 4, mar: 4, age: 40 },
    PNT: { name: 'Pharnaces I', title: 'King', gov: 3, infl: 2, mar: 3, age: 60 },
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
        // Early concession: at 50% war score Antioch OFFERS terms (SPEC §31) —
        // an event card the player may accept (win; keeps only the provinces
        // of the faith) or refuse (the war goes on). Offered once.
        if (ws >= 50 && !h.getFlag(ctx, 'termsOffered')) {
          h.setFlag(ctx, 'termsOffered', true);
          fireEventById(ctx, 'ev_terms_antioch');
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
