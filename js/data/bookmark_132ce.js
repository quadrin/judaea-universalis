// Judaea Universalis — bookmark: The Bar Kokhba Revolt, 132 CE (SPEC §13, §14).
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Historical spine: Cassius Dio LXIX; the Murabbaʿat and Naḥal Ḥever letters;
// rabbinic tradition on Akiva and Betar. Sixty years after the Temple burned,
// Hadrian ploughs the Temple Mount for Aelia Capitolina — and Judea rises as a
// planned, disciplined state under Simon bar Kosiba, "Prince of Israel".

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[bookmark_132ce] ' + key, e || '');
}

function findJudRomWar(game) {
  const wars = (game && game.wars) || [];
  for (const w of wars) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf('JUD') !== -1 && all.indexOf('ROM') !== -1) return w;
  }
  return null;
}

function judWarscore(ctx) {
  try {
    const w = findJudRomWar(ctx.game);
    if (!w || !w.warscore || typeof w.warscore !== 'object') return 0;
    const v = w.warscore.JUD;
    return typeof v === 'number' ? v : 0;
  } catch (e) { warnOnce('judWarscore', e); return 0; }
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

export const BOOKMARK_132 = {
  id: '132ce',
  name: 'The Bar Kokhba Revolt',
  startDate: { y: 132, m: 4, d: 1 },
  // Technology of the age (SPEC §22): Hadrian's legions at their zenith.
  techBase: 5,
  techTweaks: { ROM: { mar: 2, gov: 1 }, PAR: { mar: 1 } },

  blurb: 'Sixty years after the Temple burned, Hadrian has ploughed the sacred hill for a '
    + 'colony named Aelia Capitolina, with a temple of Jupiter where the House once stood. '
    + 'This time there is no improvised uprising: Simon bar Kosiba has spent years hollowing '
    + 'the hills with hideouts and armories, and when the legions\' backs are turned, Judea '
    + 'rises as one — with a prince, an administration, and coins that read "Year One of '
    + 'the Redemption of Israel."',

  // The map wears its era's shape (SPEC §47): the fortress-towns the Great
  // Revolt consumed were never rebuilt — Jotapata and Gamala fell in 67,
  // Machaerus and Masada by 74 — and their districts answer to their
  // neighbors ever after.
  mergeProvinces: {
    'Jotapata': 'Sepphoris', 'Gamala': 'Batanea',
    'Machaerus': 'Medaba', 'Masada': 'Engaddi',
  },

  // ...and Betar stands: the fortress village of the revolt's last stand
  // becomes its own place (it inherits Judean ownership from Emmaus).
  activeProvinces: ['Beit Shemesh'],
  provinceNames: { 'Beit Shemesh': 'Betar' },

  // Two pens wait on the schoolhouse (SPEC §66): the name a state writes on
  // a province it truly holds — integration at 1, or its own people settled.
  // In April 132 Aelia Capitolina is a decree and a construction site, so the
  // era map still says Jerusalem; only a Rome that finishes digesting the
  // province gets to relabel it — which is THE erasure this bookmark is
  // about — and the moment the Nasi takes the city, the signposts revert.
  // The Hebrew pen writes the names the Bar Kokhba deeds actually use.
  integratedNames: {
    ROM: {
      'Jerusalem': 'Aelia Capitolina',
      'Sepphoris': 'Diocaesarea', // Hadrian's rename of the Galilean capital
    },
    JUD: {
      'Ptolemais': 'Akko', 'Scythopolis': 'Beit She\'an',
      'Sepphoris': 'Tzippori', 'Azotus': 'Ashdod',
      'Ascalon': 'Ashkelon', 'Joppa': 'Yafo',
      'Lydda': 'Lod', 'Dora': 'Dor',
    },
    // A proclaimed Kingdom of Israel keeps Judaea's Hebrew pen (alias table).
    MLI: 'JUD',
  },

  activeTags: ['ROM', 'JUD', 'PAR', 'ARM', 'OSR', 'ADI', 'CHX'],

  // Political layer for 132 CE over map_data's 66 CE defaults. Nabataea has
  // been Provincia Arabia since 106; Agrippa's kingdom is long absorbed; the
  // rising holds the Judean hill country while Rome keeps the cities, the
  // coast, Galilee (which does not rise), and the fortresses.
  // The Second Temple burned in 70 CE — the Mount stands bare (SPEC §32).
  wonderTweaks: { Jerusalem: null },
  owners: {
    // -- The rising (JUD): the Judean hills and the rift edge ------------------
    'Hebron': 'JUD',
    'Adora': 'JUD',
    'Emmaus': 'JUD',
    'Lydda': 'JUD',
    'Jericho': 'JUD',
    'Engaddi': 'JUD',
    'Gadora': 'JUD',
    // -- Judea & Galilee under Rome (Aelia, the coast, the lake towns) ---------
    'Jerusalem': 'ROM',
    'Joppa': 'ROM',
    'Masada': 'ROM',
    'Machaerus': 'ROM',
    'Sepphoris': 'ROM',
    'Jotapata': 'ROM',
    'Tiberias': 'ROM',
    'Tarichaea': 'ROM',
    'Gischala': 'ROM',
    // -- The former kingdom of Agrippa II (absorbed ~93 CE) --------------------
    'Caesarea Philippi': 'ROM',
    'Batanea': 'ROM',
    'Gamala': 'ROM',
    // -- Provincia Arabia (Nabataea annexed 106 CE) ----------------------------
    'Petra': 'ROM',
    'Bostra': 'ROM',
    'Oboda': 'ROM',
    'Aila': 'ROM',
    'Hegra': 'ROM',
    'Dumatha': 'ROM',
    'Medaba': 'ROM',
    // PAR and ARM keep their map_data holdings.
  },

  // What the era asks of you (SPEC §33) — shown in the realm panel.
  objectives: {
    JUD: [
      'Win: maul Rome to +50 war score — Hadrian will offer a tributary prince (accept, or dig for the whole).',
      'Win: hold Jerusalem and the heartland into 136 CE — Rome offers a settlement you may accept or refuse.',
      'Crown the chain: the final mission raises the Third House on the Mount.',
      'Lose: the revolt crushed — Betar\'s fate.',
    ],
    ROM: [
      'Win: reduce the Nasi\'s state to nothing.',
      'Lose: the war still open when the Senate counts the mauled legions.',
    ],
  },

  // The court factions (SPEC §34): the realm's internal parties. The engine
  // ticks them for the human player alone; the AI keeps its politics offstage.
  factions: {
    JUD: [
      {
        id: 'captains', name: 'The Prince\'s Captains',
        desc: 'Bar Kokhba\'s commanders, sworn men of a leader who signs his letters with threats to his own officers.',
        drift(ctx, t) {
          const g = ctx.game;
          if ((t.treasury || 0) < 0) return -0.4;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.5 : -0.3;
        },
        boon: { name: 'The Prince\'s Discipline', text: '+5% discipline', effects: { disciplineMult: 1.05 } },
        bane: { name: 'The Letters Grow Sharp', text: '−6% morale', effects: { moraleMult: 0.94 } },
        appease: { label: 'Inspect the hill forts (40 martial points)', cost: { mar: 40 } },
        demand: {
          title: 'The Captains Ask for Stores',
          text: 'From Herodium the letters come up sealed and short: wheat, salt and iron for the '
            + 'hill forts, and the names of whoever failed to send them. The Prince\'s discipline '
            + 'is the state\'s spine — feed it, or feel it.',
          grant: { label: 'Wheat, salt and iron', cost: { mar: 50 } },
          refuse: { label: 'Every fort fends for itself', tooltip: 'The short letters get shorter.' },
        },
      },
      {
        id: 'sages', name: 'The Sages',
        desc: 'Akiva called him the star out of Jacob; not every academy agreed, and all of them are watching.',
        drift(ctx, t) { return (t.stability || 0) >= 1 ? 0.4 : -0.4; },
        boon: { name: 'Akiva\'s Blessing', text: '+0.3 legitimacy a month', effects: { legitimacyAdd: 0.3 } },
        bane: { name: 'The Blessing Withdrawn', text: '−0.3 legitimacy a month', effects: { legitimacyAdd: -0.3 } },
        appease: { label: 'Shelter the scholars (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'The Sages Ask for Their Students',
          text: 'The academies have emptied into the war, and the old men ask what will be left to '
            + 'teach if every student dies at a wall: exempt the scholars, endow the study houses '
            + '— the state fights for a Law someone must still know.',
          grant: { label: 'The study houses endowed', cost: { gov: 50 } },
          refuse: { label: 'The Law fights or falls', tooltip: 'Grass will grow from Akiva\'s jaw before some forgive this.' },
        },
      },
      {
        id: 'villages', name: 'The Villages',
        desc: 'The terraces and vineyards that feed the war and hide its tunnels — and empty a little every season it lasts.',
        drift(ctx, t) { return (t.warExhaustion || 0) <= 5 ? 0.3 : -0.6; },
        boon: { name: 'The Terraces Feed the War', text: '+12% manpower', effects: { manpowerMult: 1.12 } },
        bane: { name: 'The Land Empties', text: '−15% manpower', effects: { manpowerMult: 0.85 } },
        appease: { label: 'Seed corn and remitted taxes (80 talents)', cost: { treasury: 80 } },
        demand: {
          title: 'The Villages Ask for the Harvest',
          text: 'The requisition parties have taken the seed corn twice, and the village elders '
            + 'stand in your doorway with empty hands and full memories. Remit a season, or the '
            + 'terraces will feed only the crows.',
          grant: { label: 'Remit the season', cost: { treasury: 120 } },
          refuse: { label: 'The war eats first', tooltip: 'The terraces begin to go quiet.' },
        },
      },
    ],
    ROM: [
      {
        id: 'senate', name: 'The Senate',
        desc: 'The fathers, who have learned not to ask where the emperor travels — only what the wars cost.',
        drift(ctx, t) { return (t.stability || 0) >= 1 ? 0.4 : -0.4; },
        boon: { name: 'The Fathers Approve', text: '+0.25 legitimacy a month', effects: { legitimacyAdd: 0.25 } },
        bane: { name: 'Obstruction in the Curia', text: '−7% income', effects: { incomeMult: 0.93 } },
        appease: { label: 'Provinces and praetorships (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Senate Reads the Casualty Lists',
          text: 'When a war goes well the emperor writes "I and the legions are in health" — the '
            + 'fathers have noticed the phrase is missing. They will vote the reinforcements, and '
            + 'they expect the courtesy of consulships in return.',
          grant: { label: 'The consulships', cost: { gov: 50 } },
          refuse: { label: 'The lists are a state secret', tooltip: 'Secrets have prices too.' },
        },
      },
      {
        id: 'legions', name: 'The Legions',
        desc: 'Dragged from Britain and the Danube to dig out a hill country stone by stone: the eagles are grim this reign.',
        drift(ctx, t) {
          const g = ctx.game;
          if ((t.treasury || 0) < 0) return -0.7;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.4 : -0.2;
        },
        boon: { name: 'The Eagles Content', text: '+4% discipline', effects: { disciplineMult: 1.04 } },
        bane: { name: 'Mutinous Winter Quarters', text: '−6% morale', effects: { moraleMult: 0.94 } },
        appease: { label: 'The donative (100 talents)', cost: { treasury: 100 } },
        demand: {
          title: 'The Legions Hate This War',
          text: 'No battles, no plunder, no glory — tunnels, snipers and burned farms, and a '
            + 'legion\'s eagle rumored lost. The camps ask for the siege pay Hadrian\'s '
            + 'quartermasters keep studying. Studying does not spend.',
          grant: { label: 'The siege pay, doubled', cost: { treasury: 150 } },
          refuse: { label: 'Duty is the pay', tooltip: 'The camps compose their own phrases.' },
        },
      },
      {
        id: 'people', name: 'The People of Rome',
        desc: 'The city, for whom Judaea is a rumor and the games schedule is a sacred text.',
        drift(ctx, t) { return (t.warExhaustion || 0) <= 4 ? 0.3 : -0.5; },
        boon: { name: 'The Levies Come Willing', text: '+10% manpower', effects: { manpowerMult: 1.1 } },
        bane: { name: 'Bread Riots', text: '+1 unrest everywhere', effects: { unrestAll: 1 } },
        appease: { label: 'Games and grain (80 talents)', cost: { treasury: 80 } },
        demand: {
          title: 'The City Wants Spectacle',
          text: 'A war with no triumphs is, to the Circus crowd, a scheduling failure. The aediles '
            + 'beg for something to announce — games, grain, a victory lap of any size — before '
            + 'the crowd writes its own program.',
          grant: { label: 'Fund the games', cost: { treasury: 120 } },
          refuse: { label: 'Rome can wait for the real triumph', tooltip: 'The crowd\'s program stars the emperor.' },
        },
      },
    ],
  },
  playableTags: [
    {
      tag: 'JUD',
      difficulty: 'Very Hard',
      blurb: 'You are not a mob; you are a state in hiding. Two legions are in the province '
        + 'and one of them can be destroyed before Rome understands what has begun. Take '
        + 'Aelia — Jerusalem — relight the altar, and dig in: Hadrian will send his best '
        + 'general from Britain and try to starve the hills stone by stone. Hold Jerusalem '
        + 'and the heartland to 136, and even Rome may prefer a tributary prince to a '
        + 'second desert.',
    },
  ],

  // Courts of 132 CE.
  rulers: {
    ROM: { name: 'Hadrian', title: 'Emperor', gov: 4, infl: 3, mar: 3, age: 56 },
    JUD: { name: 'Simon bar Kosiba', title: 'Nasi Israel', gov: 2, infl: 3, mar: 5, age: 45 },
    PAR: { name: 'Vologases III', title: 'King of Kings', gov: 2, infl: 3, mar: 2, age: 50 },
    ARM: { name: 'Vologases of Armenia', title: 'King', gov: 2, infl: 2, mar: 2, age: 40 },
  },

  // Linear mission chains (realm panel).
  missions: {
    JUD: [
      {
        id: 'j2_host', name: 'The Prince\'s Host',
        desc: 'Field fifteen thousand men — the hideouts and armories were dug for this.',
        rewardText: '"The Nasi\'s Levies": +10% manpower for 24 months.',
        check: (ctx) => totalMen(ctx, 'JUD') >= 15000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'nasi_levies', name: 'The Nasi\'s Levies', months: 24, effects: { manpowerMult: 1.1 },
        }),
      },
      {
        id: 'j2_maul', name: 'Maul the Legions',
        desc: 'Reach +10 war score against Rome.',
        rewardText: '+25 martial points.',
        check: (ctx) => judWarscore(ctx) >= 10,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { mar: 25 }),
      },
      {
        id: 'j2_aelia', name: 'Aelia Undone',
        desc: 'Take Jerusalem from the colony builders.',
        rewardText: '+20 legitimacy, +25 governance points — the coins are struck in the city itself.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Jerusalem'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 20, gov: 25 }),
      },
      {
        id: 'j2_galilee', name: 'Galilee Rises',
        desc: 'Carry the revolt north: take Sepphoris and Tiberias.',
        rewardText: 'The north sends its sons: +2,000 manpower.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Sepphoris') && ctx.helpers.controls(ctx, 'JUD', 'Tiberias'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { manpower: 2000 }),
      },
      {
        id: 'j2_redemption', name: 'The Redemption of Israel',
        desc: 'Reach +25 war score — make Rome count the cost aloud.',
        rewardText: '"Redemption Coinage": +15% income permanently, +15 legitimacy.',
        check: (ctx) => judWarscore(ctx) >= 25,
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JUD', {
            id: 'redemption_coinage', name: 'Redemption Coinage', months: -1, effects: { incomeMult: 1.15 },
          });
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 15 });
        },
      },
      {
        // SPEC §32: the bare Mount can bear a House again. Bar Kokhba's
        // coins showed the Temple facade — this is what they promised.
        id: 'j2_third_temple', name: 'Raise the Third House',
        desc: 'Hold Jerusalem with 500 talents in the treasury and the realm steady (stability +1) — the House the coins promised.',
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
    ROM: [
      {
        id: 'r2_contain', name: 'Contain the Rising',
        desc: 'Stop the bleeding: reach +10 war score against the rebels.',
        rewardText: '+25 martial points.',
        check: (ctx) => {
          const w = findJudRomWar(ctx.game);
          return !!w && typeof w.warscore.ROM === 'number' && w.warscore.ROM >= 10;
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { mar: 25 }),
      },
      {
        id: 'r2_shephelah', name: 'Clear the Shephelah',
        desc: 'Take Emmaus and Lydda; the coast road must run without escort.',
        rewardText: 'Confiscations: +100 talents.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ROM', 'Emmaus') && ctx.helpers.controls(ctx, 'ROM', 'Lydda'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { treasury: 100 }),
      },
      {
        id: 'r2_hills', name: 'Into the Hills',
        desc: 'Take Hebron and Adora, the rising\'s southern anchor.',
        rewardText: '"The Severan Method": +1 siege bonus for 24 months.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ROM', 'Hebron') && ctx.helpers.controls(ctx, 'ROM', 'Adora'),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ROM', {
          id: 'severan_method', name: 'The Severan Method', months: 24, effects: { siegeBonus: 1 },
        }),
      },
      {
        id: 'r2_muster', name: 'The Empire Answers',
        desc: 'Field forty thousand men in the East.',
        rewardText: '"Detachments of Every Army": +5% discipline for 12 months.',
        check: (ctx) => totalMen(ctx, 'ROM') >= 40000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ROM', {
          id: 'every_army', name: 'Detachments of Every Army', months: 12, effects: { disciplineMult: 1.05 },
        }),
      },
      {
        id: 'r2_rift', name: 'Seal the Rift',
        desc: 'Take Jericho, Engaddi and Gadora; nothing must cross the Jordan or reach the caves.',
        rewardText: '+1 stability.',
        check: (ctx) => ['Jericho', 'Engaddi', 'Gadora'].every((n) => ctx.helpers.controls(ctx, 'ROM', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { stability: 1 }),
      },
    ],
  },

  // Pre-existing works (SPEC §58): the imperial infrastructure of 132 CE.
  buildings: {
    'Alexandria': ['shipyard', 'granary', 'market'],
    'Caesarea Maritima': ['shipyard'], // Sebastos, seat of the governor
    'Seleucia Pieria': ['shipyard'],   // the port of Antioch
    'Antioch': ['market'],
  },

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

    // --- Starting fleets (SPEC §58): Rome's standing provincial squadrons. ---
    h.spawnFleet(ctx, 'ROM', 'Alexandria', 8, { name: 'Classis Alexandrina' });
    h.spawnFleet(ctx, 'ROM', 'Seleucia Pieria', 6, { name: 'Classis Syriaca' });

    // The Tigris kingdoms ride in Parthia's train (v2.1): clients of the
    // King of Kings, paying tribute, joining his wars through sameSide.
    for (const cl of ['OSR', 'ADI', 'CHX']) {
      if (g.tags[cl] && g.tags.PAR) g.tags[cl].overlord = 'PAR';
    }

    // --- The war. It ends by the sword or by events, never at the peace table. ---
    h.declareWar(ctx, 'JUD', 'ROM', 'The Bar Kokhba Revolt');
    try {
      const war = findJudRomWar(g);
      if (war) war.noNegotiation = true;
    } catch (e) { warnOnce('setup:war', e); }

    // --- Treasuries, manpower, stability, legitimacy. -------------------------
    // JUD: an organized state-in-waiting — coined money, stores, discipline.
    h.adjust(ctx, 'JUD', { treasury: 120, manpower: 6000, stability: 1, legitimacy: 15 });
    h.adjust(ctx, 'ROM', { treasury: 500, manpower: 25000, stability: 2, legitimacy: 40 });
    h.adjust(ctx, 'PAR', { treasury: 180, stability: 1, legitimacy: 20 });
    h.adjust(ctx, 'ARM', { treasury: 30 });

    // --- Opinions. Parthia watches with interest; Armenia balances. -----------
    setOpinion(g, 'JUD', 'ROM', -190); setOpinion(g, 'ROM', 'JUD', -170);
    setOpinion(g, 'PAR', 'ROM', -80);  setOpinion(g, 'ROM', 'PAR', -70);
    setOpinion(g, 'PAR', 'JUD', 30);   setOpinion(g, 'JUD', 'PAR', 50);
    setOpinion(g, 'ARM', 'ROM', 20);   setOpinion(g, 'ARM', 'PAR', 30);

    // --- Starting modifiers. ---------------------------------------------------
    // Years of preparation: hidden armories, tunnels, a real chain of command.
    h.addTagModifier(ctx, 'JUD', {
      id: 'messianic_fervor', name: 'Messianic Fervor', months: 36,
      effects: { moraleMult: 1.2 },
    });
    h.addTagModifier(ctx, 'JUD', {
      id: 'hidden_armories', name: 'Hidden Armories', months: 24,
      effects: { reinforceMult: 1.25, maintMult: 0.55 },
    });
    // The emperor is far away and the first response is provincial.
    h.addTagModifier(ctx, 'ROM', {
      id: 'provincial_response', name: 'A Provincial Response', months: 14,
      effects: { reinforceMult: 0.75, aiPassive: true },
    });

    // --- Starting armies & generals. -------------------------------------------
    h.spawnArmy(ctx, 'JUD', 'Hebron', {
      inf: 10, cav: 1, name: 'Host of Israel',
      general: { name: 'Simon bar Kosiba', fire: 3, shock: 4, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'JUD', 'Emmaus', {
      inf: 5, name: 'Men of the Shephelah',
      general: { name: 'Yehonatan bar Baayan', fire: 2, shock: 2, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'JUD', 'Jericho', { inf: 3, name: 'Zealots of the Rift' });
    h.spawnArmy(ctx, 'JUD', 'Gadora', { inf: 2, name: 'Men of Perea' });

    h.spawnArmy(ctx, 'ROM', 'Jerusalem', {
      inf: 8, cav: 1, name: 'Legio X Fretensis',
      general: { name: 'Tineius Rufus', fire: 1, shock: 2, maneuver: 1 },
    });
    h.spawnArmy(ctx, 'ROM', 'Sepphoris', {
      inf: 7, name: 'Legio VI Ferrata',
      general: { name: 'Lollius Urbicus', fire: 2, shock: 2, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'ROM', 'Caesarea Maritima', { inf: 3, name: 'Caesarea Garrison' });
    h.spawnArmy(ctx, 'ROM', 'Bostra', { inf: 4, name: 'Legio III Cyrenaica' });
    h.spawnArmy(ctx, 'ROM', 'Antioch', { inf: 4, name: 'Syrian Vexillations' });

    h.spawnArmy(ctx, 'PAR', 'Seleucia-Ctesiphon', {
      inf: 10, cav: 8, name: 'Royal Army of Parthia',
    });
    h.spawnArmy(ctx, 'ARM', 'Tigranocerta', { inf: 3, name: 'Army of Armenia' });

    h.notify(ctx, {
      title: 'The Bar Kokhba Revolt',
      text: 'Judea rises as one man. The hill country is already lost to Rome, the roads are '
        + 'cut, and the rebels strike coins for the Redemption of Israel.',
      type: 'war', provName: 'Hebron',
    });
  },

  aiHints: {
    ROM: { rally: ['Caesarea Maritima', 'Antioch'], targetRegiments: 50 },
    JUD: { rally: ['Hebron', 'Emmaus'], targetRegiments: 24 },
    PAR: { rally: ['Seleucia-Ctesiphon'], targetRegiments: 22 },
    ARM: { rally: ['Tigranocerta'], targetRegiments: 4 },
    OSR: { rally: ['Edessa'], targetRegiments: 5 },
    ADI: { rally: ['Arbela'], targetRegiments: 7 },
    CHX: { rally: ['Charax'], targetRegiments: 4 },
    REB: { rally: [], targetRegiments: 0 },
  },

  // Victory rules, checked monthly; game.over stops further checks.
  checkVictory(ctx) {
    try {
      const g = ctx.game;
      const h = ctx.helpers;
      if (!g || g.over || g.result) return;

      const judTag = g.tags && g.tags.JUD;
      const judAlive = !!(judTag && judTag.alive !== false);
      const judProvs = judAlive ? h.countControlled(ctx, 'JUD', {}) : 0;
      const jerusalemHeld = judAlive && h.controls(ctx, 'JUD', 'Jerusalem');
      const ws = judWarscore(ctx);

      if (g.playerTag === 'JUD') {
        // Early concession (SPEC §32): Hadrian's offer arrives at +50 as an
        // event card the player may accept or refuse. Offered once.
        if (ws >= 50 && !h.getFlag(ctx, 'romeTermsOffered')) {
          h.setFlag(ctx, 'romeTermsOffered', true);
          h.fireEvent(ctx, 'ev132_terms');
          return;
        }
        // Enduring into 136 earns another Roman offer; it does not sign a
        // treaty for the player. The old direct endGame call also applied
        // uti possidetis to every occupied province before any click.
        if (dateGE(g.date, 136, 1) && jerusalemHeld
            && h.countControlled(ctx, 'JUD', { religion: 'judaism' }) >= 6
            && !h.getFlag(ctx, 'enduranceTermsOffered')) {
          h.setFlag(ctx, 'enduranceTermsOffered', true);
          h.fireEvent(ctx, 'ev132_endurance_terms');
          return;
        }
        if (judProvs === 0) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'Syria Palaestina',
            text: 'Betar has fallen, and the last letters lie unread in the caves above the '
              + 'Dead Sea. Hadrian ploughs the name of Judea from the map as he once ploughed '
              + 'the Temple Mount: the province will be called Syria Palaestina, and Jews may '
              + 'enter Aelia one day in the year, to weep.',
            score: 0,
          });
          return;
        }
        if (!jerusalemHeld && judProvs <= 2 && totalMen(ctx, 'JUD') < 2500) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The Last Letters',
            text: '"From Simon bar Kosiba to the men of En-gedi: you sit, eat and drink from '
              + 'the property of the house of Israel, and care nothing for your brothers." '
              + 'The letters stop. The caves keep them for eighteen centuries.',
            score: Math.max(0, judProvs * 5),
          });
          return;
        }
      } else if (g.playerTag === 'ROM') {
        if (judProvs === 0) {
          const early = g.date.y < 135;
          h.endGame(ctx, {
            result: 'win',
            title: early ? 'Swift and Merciless' : 'Syria Palaestina',
            text: early
              ? 'The rising is broken before it can dig in, and the province learns the price '
                + 'of testing Hadrian. The Senate is told, correctly, that the emperor and the '
                + 'army are well.'
              : 'Fifty fortresses razed, near a thousand villages, and at the end Betar. The '
                + 'province is renamed Syria Palaestina and salted with garrisons. It is a '
                + 'victory; no one in the East mistakes it for a cheap one.',
            score: early ? 200 : 120,
          });
          return;
        }
        if (dateGE(g.date, 137, 1) && (jerusalemHeld || judProvs >= 10)) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The East Slips',
            text: 'Five years, the best general of the age, and the hills still answer to the '
              + 'Nasi — while Parthia arms on the Euphrates and every governor east of Byzantium '
              + 'writes the same nervous letter. Hadrian, dying at Baiae, orders the standards '
              + 'home and forbids the Senate to speak of it.',
            score: 0,
          });
          return;
        }
      }
    } catch (e) { warnOnce('checkVictory', e); }
  },
};
