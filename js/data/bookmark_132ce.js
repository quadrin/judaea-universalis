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

// The letters this court answers to NOW (SPEC §135). A realm that has taken a
// greater crown files its provinces, armies and wars under the new tag, while
// this chapter was written against the old one; the sim keeps the forwarding
// address and hands it back through ctx.helpers. Defensive about `helpers`
// because the content packages are also read cold, with no game to resolve
// against.
function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
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

function findJudRomWar(game) {
  const wars = (game && game.wars) || [];
  for (const w of wars) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(warTag(game, 'JUD')) !== -1 && all.indexOf(warTag(game, 'ROM')) !== -1) return w;
  }
  return null;
}

function judWarscore(ctx) {
  try {
    const w = findJudRomWar(ctx.game);
    if (!w || !w.warscore || typeof w.warscore !== 'object') return 0;
    const v = w.warscore[warTag(ctx.game, 'JUD')];
    return typeof v === 'number' ? v : 0;
  } catch (e) { warnOnce('judWarscore', e); return 0; }
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

export const BOOKMARK_132 = {
  id: '132ce',
  name: 'The Bar Kokhba Revolt',
  startDate: { y: 132, m: 4, d: 1 },
  // SPEC §121: the year after which this chapter's own undated trigger
  // cards stop belonging to anybody — Bar Kokhba and the three centuries the chapter follows it through.
  // A card that legitimately runs later says so with its own maxYear.
  generationHorizon: 430,
  // Technology of the age (SPEC §22): Hadrian's legions at their zenith.
  techBase: 5,
  // How far up the ladder this age can climb (SPEC §99). Hadrian's century stops at the professional legion (SPEC §99).
  techCeiling: 9,
  techTweaks: { ROM: { mar: 2, gov: 1 }, PAR: { mar: 1 } },
  // The rungs' own names (SPEC §179): the arts of the hidden state — the
  // cave systems dug before the first blow, the Nasi's leases, the
  // overstruck mint.
  techNames: {
    gov: {
      4: 'The Colonial Assessment', 5: 'The Hidden Stores', 6: 'The Nasi\'s Leases',
      7: 'The Camp Rations', 8: 'The Redemption Mint', 9: 'The Restored Land',
    },
    infl: {
      4: 'The Village Networks', 5: 'The Letter Carriers', 6: 'The Schools in Hiding',
      7: 'The Sages\' Blessing', 8: 'The Diaspora\'s Watch', 9: 'The Star\'s Proclamation',
    },
    mar: {
      4: 'The Quarried Arms', 5: 'The Cave Systems', 6: 'The Prince\'s Companies',
      7: 'The Ambush Doctrine', 8: 'The Fortified Villages', 9: 'The Last Standard',
    },
  },

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

  activeTags: ['ROM', 'JUD', 'PAR', 'ARM', 'OSR', 'ADI', 'CHX',
    // The political west (SPEC §173): Hadrian's world one conquest wider —
    // Dacia is a province now, so its tag rests, and the steppe peoples
    // Trajan never finished with hold the grass.
    'GRM', 'CAL', 'HIB',
    'SUE', 'CHE', 'CHA', 'FRS', 'CIM', 'SCN', 'GOT', 'AES',
    'BOS', 'SCY', 'SRM', 'VEN'],
  // Standing rivalries (SPEC §73): Trajan's Parthian war is a decade old and
  // Hadrian's peace is a truce of exhaustion, not friendship.
  rivalries: [['ROM', 'PAR']],
  // Historical friends (SPEC §86): the same eastern hearing the Nasi's state
  // could still get — Parthian silver was offered, and Adiabene remembered
  // its converted kings.
  affinities: [
    ['JUD', 'PAR', { axis: 'alignment', sign: -1 }],
    ['JUD', 'ADI'],
  ],

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
    ADI: [
      'Win: the house stands in 136 CE — Arbela held while the west burns.',
      'Win: the greater verdict — stand free of the King of Kings, or stand rich while the Nasi\'s state still lives.',
      'Lose: the fall of the house — every province gone, and no second restoration.',
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
    ADI: [
      {
        id: 'proselytes', name: 'The Proselyte House',
        desc: 'The court that keeps the covenant of the converted kings — thinner since Trajan\'s war, and holding the memory harder for it.',
        drift(ctx, t) {
          const g = ctx.game;
          const jud = g.tags[(g.tagAliases && g.tagAliases.JUD) || 'JUD'];
          return jud && jud.alive ? 0.4 : -0.6;
        },
        boon: { name: 'The Covenant Kept', text: '+0.2 legitimacy a month', effects: { legitimacyAdd: 0.2 } },
        bane: { name: 'The Court Doubts the Crown', text: '−0.25 legitimacy a month, +0.5 unrest', effects: { legitimacyAdd: -0.25, unrestAll: 0.5 } },
        appease: { label: 'Silver for the west (60 talents)', cost: { treasury: 60 } },
        demand: {
          title: 'The Proselytes Read the Nasi\'s Letters',
          text: 'The letters from the hill country are copied in every synagogue east of the '
            + 'Euphrates, and the court that took the covenant wants an answer sent — grain, '
            + 'silver, and leave for the young men who keep crossing anyway.',
          grant: { label: 'Open the granaries', cost: { treasury: 100 } },
          refuse: { label: 'Arbela buried its dead already', tooltip: 'The young men go regardless, angrier.' },
        },
      },
      {
        id: 'caravans', name: 'The Caravan Lords',
        desc: 'The masters of the Gulf Road\'s northern tolls, rebuilding warehouses Trajan burned and pricing every rumor of the next war.',
        drift(ctx, t) {
          return (t.atWarWith || []).length ? -0.6 : 0.4;
        },
        boon: { name: 'The Tolls Flow', text: '+10% income', effects: { incomeMult: 1.1 } },
        bane: { name: 'The Roads Go Around', text: '−10% income', effects: { incomeMult: 0.9 } },
        appease: { label: 'Remit a season\'s tolls (50 talents)', cost: { treasury: 50 } },
        demand: {
          title: 'The Caravans Want No Second Trajan',
          text: 'The lords of the road rebuilt once and remember exactly what it cost. They ask '
            + 'for guards at the fords, no letters that could be read in Antioch, and nothing '
            + '— nothing — that gives an emperor a reason to cross the Euphrates again.',
          grant: { label: 'Guards, and discretion', cost: { treasury: 70 } },
          refuse: { label: 'The house writes what it must', tooltip: 'The warehouses stay half-stocked.' },
        },
      },
      {
        id: 'riders', name: 'The Riders of Arbela',
        desc: 'The armored horse of the Tigris bank, remounted since the last war — the arm that makes a restored client worth restoring.',
        drift(ctx, t) {
          const g = ctx.game;
          if ((t.treasury || 0) < 0) return -0.7;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.5 : -0.1;
        },
        boon: { name: 'The Lances Sharp', text: '+5% discipline', effects: { disciplineMult: 1.05 } },
        bane: { name: 'The Families Keep Their Sons', text: '−12% manpower', effects: { manpowerMult: 0.88 } },
        appease: { label: 'Barding and remounts (50 talents)', cost: { treasury: 50 } },
        demand: {
          title: 'The Riders Count What Trajan Took',
          text: 'The landed families rebuilt their studs from Median stock and buried a generation '
            + 'doing it. Pay for the muster they keep, or explain to them why the house needs '
            + 'lances at all if it never means to use them.',
          grant: { label: 'Pay for the muster', cost: { treasury: 80 } },
          refuse: { label: 'The lances wait on the house\'s word', tooltip: 'The families count the seasons.' },
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
    {
      tag: 'ADI',
      difficulty: 'Hard',
      blurb: 'Sixteen years ago Trajan\'s columns burned through the house of the converts; '
        + 'Hadrian\'s withdrawal gave it back its crown. Now the west rises again, and the '
        + 'letters cross the Euphrates asking what Arbela remembers. Rebuild what the last '
        + 'war broke, keep the King of Kings sweet, and decide — again — what the covenant '
        + 'costs.',
    },
  ],

  // Courts of 132 CE.
  rulers: {
    ROM: { name: 'Hadrian', title: 'Emperor', gov: 4, infl: 3, mar: 3, age: 56 },
    JUD: { name: 'Simon bar Kosiba', title: 'Nasi Israel', gov: 2, infl: 3, mar: 5, age: 45 },
    PAR: { name: 'Vologases III', title: 'King of Kings', gov: 2, infl: 3, mar: 2, age: 50 },
    // The restored client (SPEC §185): Mebarsapes fought Trajan in 116 and
    // the record goes quiet after Hadrian gave the kingdom back; the game
    // keeps him seated, older, with an heir from the dynasty's name-stock.
    ADI: {
      name: 'Mebarsapes', title: 'King', gov: 2, infl: 2, mar: 3, age: 58,
      heir: { name: 'Monobazus', gov: 3, infl: 2, mar: 2, age: 22 },
    },
    ARM: { name: 'Vologases of Armenia', title: 'King', gov: 2, infl: 2, mar: 2, age: 40 },
    // The political west (SPEC §173): the Bosporan client crown in the year
    // its coins stop — Cotys II dies as this chapter opens.
    BOS: { name: 'Cotys II', title: 'King of the Bosporus', gov: 2, infl: 2, mar: 2, age: 45 },
  },

  // Linear mission chains (realm panel).
  missions: {
    JUD: [
      {
        id: 'j2_host', name: 'The Prince\'s Host',
        icon: 'spears', col: 1,
        desc: 'Field fifteen thousand men — the hideouts and armories were dug for this.',
        rewardText: '"The Nasi\'s Levies": +10% manpower for 24 months.',
        check: (ctx) => totalMen(ctx, 'JUD') >= 15000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'nasi_levies', name: 'The Nasi\'s Levies', months: 24, effects: { manpowerMult: 1.1 },
        }),
      },
      {
        id: 'j2_maul', name: 'Maul the Legions',
        icon: 'swords', col: 0, requires: ['j2_host'],
        desc: 'Reach +10 war score against Rome.',
        rewardText: '+25 martial points.',
        check: (ctx) => judWarscore(ctx) >= 10,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { mar: 25 }),
      },
      {
        id: 'j2_aelia', name: 'Aelia Undone',
        icon: 'temple', col: 2, requires: ['j2_host'],
        desc: 'Take Jerusalem from the colony builders.',
        rewardText: '+20 legitimacy, +25 governance points — the coins are struck in the city itself.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Jerusalem'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 20, gov: 25 }),
      },
      {
        id: 'j2_galilee', name: 'Galilee Rises',
        icon: 'mountain', col: 2, requires: ['j2_aelia'],
        desc: 'Carry the revolt north: take Sepphoris and Tiberias.',
        rewardText: 'The north sends its sons: +2,000 manpower.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Sepphoris') && ctx.helpers.controls(ctx, 'JUD', 'Tiberias'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { manpower: 2000 }),
      },
      {
        id: 'j2_redemption', name: 'The Redemption of Israel',
        icon: 'coins', col: 0, requires: ['j2_maul'],
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
        icon: 'shrine', col: 1, requires: ['j2_aelia', 'j2_redemption'],
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
      // The age's curriculum (SPEC §179), appended AFTER the capstone so the
      // Third House keeps its table seat (smoke16 forces the chain by index):
      // two more branches off the war and the north.
      // Row declared (SPEC §183 found the overlap): it derived the same cell
      // as The Redemption of Israel and the two medallions stacked.
      {
        id: 'j2_ambush_doctrine', name: 'The Ambush Doctrine',
        icon: 'mountain', col: 0, row: 3, requires: ['j2_maul'],
        desc: 'Make the method a doctrine: reach Military 7 — The Ambush Doctrine.',
        rewardText: '"The Roads Are Ours": +1 to hill-country defense for 24 months.',
        check: (ctx) => (((ctx.game.tags.JUD || {}).tech || {}).mar | 0) >= 7,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'roads_are_ours', name: 'The Roads Are Ours', months: 24, effects: { hillDefBonus: 1 },
        }),
      },
      {
        id: 'j2_state_in_hiding', name: 'The State in Hiding',
        icon: 'lamp', col: 2, requires: ['j2_galilee'],
        desc: 'Take up three ideas of the age — the letters from the wadi are a government\'s.',
        rewardText: '+25 governance points, +10 legitimacy.',
        check: (ctx) => eraTiers(ctx.game.tags.JUD) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { gov: 25, legitimacy: 10 }),
      },
      // The war carried past the hills (SPEC §192): the revolt history kept
      // landlocked and inland reaches for the sea and the legion's nest.
      {
        id: 'j2_the_coast', name: 'The Governor\'s Sea',
        icon: 'ship', col: 1, row: 1, requires: ['j2_maul'],
        desc: 'Take Joppa and Caesarea Maritima — the revolt history kept landlocked '
          + 'reaches the sea, and the governor\'s own seat.',
        rewardText: '+100 talents (the harbor customs), +10 legitimacy.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Joppa')
          && ctx.helpers.controls(ctx, 'JUD', 'Caesarea Maritima'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { treasury: 100, legitimacy: 10 }),
      },
      {
        id: 'j2_arabia', name: 'The Legion\'s Nest',
        icon: 'horseshoe', col: 1, row: 2, requires: ['j2_aelia'],
        desc: 'Take Medaba and Bostra — the base of the Arabian legion, so the next '
          + 'column against the Nasi musters a province further away.',
        rewardText: '"The Highway Cut": +1 hill-country defense for 36 months.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Medaba')
          && ctx.helpers.controls(ctx, 'JUD', 'Bostra'),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'the_highway_cut', name: 'The Highway Cut', months: 36,
          effects: { hillDefBonus: 1 },
        }),
      },
      // ── The roads not taken (SPEC §183) ─────────────────────────────────
      // The §119 forks as standing hypotheticals; checks read the markers
      // the fork cards themselves set. Appended after the curriculum so the
      // Third House keeps its table seat (smoke16 forces the chain by index).
      {
        id: 'hy_redemption_era', name: 'The Years of the Redemption', hypothetical: true,
        fork: '132ce/how_the_revolt_ends',
        icon: 'laurel', col: 3, row: 0,
        desc: 'Win the war outright — Rome\'s peace signed, Jerusalem held, no overlord — and '
          + 'stand to 137, and the documents of this state are dated by the Redemption of '
          + 'Israel: the era history gave three years, kept.',
        rewardText: '+1 stability, +20 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'redemptionEra'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { stability: 1, legitimacy: 20 }),
      },
      {
        id: 'hy_beit_kosiba', name: 'The House of Kosiba', hypothetical: true,
        fork: '132ce/the_accession',
        icon: 'quill', col: 3, row: 1, requires: ['hy_redemption_era'],
        desc: 'The founder left no rule of succession. When the prince ages or dies in a '
          + 'redeemed Judaea, the state must say what the house of Kosiba IS — crown, Davidic '
          + 'marriage, two houses, or Ezekiel\'s prince.',
        rewardText: '+25 governance points, +10 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'beitKosibaSettled'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { gov: 25, legitimacy: 10 }),
      },
      {
        id: 'hy_akiva_grass', name: 'The Grass on Akiva\'s Cheeks', hypothetical: true,
        fork: '132ce/the_grass_on_akivas_cheeks',
        icon: 'note', col: 3, row: 2, requires: ['hy_beit_kosiba'],
        desc: 'Victory inverted the record: a century of the academies\' own recorded doubt '
          + 'about the redeemer must be answered — collected, shelved, or read out at the '
          + 'founding every year.',
        rewardText: '+25 influence points.',
        check: (ctx) => anyFlag(ctx, 'doubtSuppressed', 'doubtPreserved', 'doubtCanonized'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { infl: 25 }),
      },
      {
        id: 'hy_nasis_letters', name: 'Mercy Is Also Policy', hypothetical: true,
        fork: '132ce/the_nasis_letters',
        icon: 'quill', col: 3, row: 3,
        desc: 'When the Nasi\'s letters go out (winter 132), write the ones the caves never '
          + 'held: the villages fed first, the chains left in the armory — and the other '
          + 'ledger arrives two winters later, because mercy has a price in wheat.',
        rewardText: '+15 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'lettersMercy'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 15 }),
      },
      {
        id: 'hy_letters_east', name: 'The Letters East', hypothetical: true,
        fork: '132ce/the_letters_east',
        icon: 'diaspora', col: 4, row: 0,
        desc: 'Answer 117 the way the land never did: send the letters east to Babylonia '
          + '(133), and let the dispersion be counted in the Redemption — volunteers at '
          + 'the smugglers\' fords, and a second question marching in behind them.',
        rewardText: '+20 influence points.',
        check: (ctx) => anyFlag(ctx, 'dispersionCalled'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { infl: 20 }),
      },
    ],
    ROM: [
      {
        id: 'r2_contain', name: 'Contain the Rising',
        icon: 'shield', col: 1,
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
        icon: 'flame', col: 0, requires: ['r2_contain'],
        desc: 'Take Emmaus and Lydda; the coast road must run without escort.',
        rewardText: 'Confiscations: +100 talents.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ROM', 'Emmaus') && ctx.helpers.controls(ctx, 'ROM', 'Lydda'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { treasury: 100 }),
      },
      {
        id: 'r2_hills', name: 'Into the Hills',
        icon: 'mountain', col: 0, requires: ['r2_shephelah'],
        desc: 'Take Hebron and Adora, the rising\'s southern anchor.',
        rewardText: '"The Severan Method": +1 siege bonus for 24 months.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ROM', 'Hebron') && ctx.helpers.controls(ctx, 'ROM', 'Adora'),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ROM', {
          id: 'severan_method', name: 'The Severan Method', months: 24, effects: { siegeBonus: 1 },
        }),
      },
      {
        id: 'r2_muster', name: 'The Empire Answers',
        icon: 'helmet', col: 2, requires: ['r2_contain'],
        desc: 'Field forty thousand men in the East.',
        rewardText: '"Detachments of Every Army": +5% discipline for 12 months.',
        check: (ctx) => totalMen(ctx, 'ROM') >= 40000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ROM', {
          id: 'every_army', name: 'Detachments of Every Army', months: 12, effects: { disciplineMult: 1.05 },
        }),
      },
      {
        id: 'r2_rift', name: 'Seal the Rift',
        icon: 'tower', col: 2, requires: ['r2_hills', 'r2_muster'],
        desc: 'Take Jericho, Engaddi and Gadora; nothing must cross the Jordan or reach the caves.',
        rewardText: '+1 stability.',
        check: (ctx) => ['Jericho', 'Engaddi', 'Gadora'].every((n) => ctx.helpers.controls(ctx, 'ROM', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { stability: 1 }),
      },
      // The age's curriculum (SPEC §179): Severus' war of engineering, and
      // the province Hadrian means to have afterward.
      {
        id: 'r2_engineers_war', name: 'The Engineers\' War',
        icon: 'walls', col: 0, requires: ['r2_shephelah'],
        desc: 'Fight the hills with the manual: reach Military 8 — The Fortified Villages.',
        rewardText: '"The Method Perfected": +15% siege progress for 24 months.',
        check: (ctx) => (((ctx.game.tags.ROM || {}).tech || {}).mar | 0) >= 8,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ROM', {
          id: 'method_perfected', name: 'The Method Perfected', months: 24, effects: { siegeMult: 1.15 },
        }),
      },
      {
        id: 'r2_syria_palaestina', name: 'Syria Palaestina',
        icon: 'scroll', col: 2, requires: ['r2_muster'],
        desc: 'Take up three ideas of the age — the province must be governed into a different name.',
        rewardText: '+25 governance points, +10 legitimacy.',
        check: (ctx) => eraTiers(ctx.game.tags.ROM) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { gov: 25, legitimacy: 10 }),
      },
    ],
    // The restored house's tree (SPEC §185): rebuild what Trajan burned,
    // shelter what the west loses, and never give an emperor a reason.
    ADI: [
      {
        id: 'b2_house_rebuilt', name: 'The House Rebuilt',
        icon: 'bricks', col: 1,
        desc: 'Trajan\'s war burned the warehouses and Hadrian\'s peace gave back the crown. Bank 150 talents — the restoration must pay for itself.',
        rewardText: '"The Restoration": +10% growth for 24 months.',
        check: (ctx) => ((ctx.game.tags.ADI || {}).treasury || 0) >= 150,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ADI', {
          id: 'the_restoration', name: 'The Restoration', months: 24, effects: { growthMult: 1.1 },
        }),
      },
      {
        id: 'b2_refuge_east', name: 'A Refuge East of the Rivers',
        icon: 'diaspora', col: 0, requires: ['b2_house_rebuilt'],
        desc: 'Whatever happens in the hill country, the survivors will walk east. Keep the realm steady enough to take them — stability at +2.',
        rewardText: 'The settled refugees: +2,000 manpower.',
        check: (ctx) => ((ctx.game.tags.ADI || {}).stability || 0) >= 2,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { manpower: 2000 }),
      },
      {
        id: 'b2_letters_west', name: 'The Letters From the West',
        icon: 'quill', col: 2, requires: ['b2_house_rebuilt'],
        desc: 'The Nasi\'s state knows who remembers it. Reach the devoted friendship of the court at war — its opinion of the house at +100.',
        rewardText: '+25 influence points, +10 legitimacy.',
        check: (ctx) => {
          const g = ctx.game;
          const jud = g.tags[(g.tagAliases && g.tagAliases.JUD) || 'JUD'];
          return !!(jud && jud.alive) && ((jud.opinion && jud.opinion.ADI) || 0) >= 100;
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { infl: 25, legitimacy: 10 }),
      },
      {
        id: 'b2_silver_redemption', name: 'Silver for the Redemption',
        icon: 'coins', col: 2, requires: ['b2_letters_west'],
        desc: 'The mint in the hills strikes over Roman denarii; the metal must come from somewhere. Bank 300 talents while the Nasi\'s state still lives.',
        rewardText: '"The Western Accounts": +5% income permanently.',
        check: (ctx) => {
          const g = ctx.game;
          const jud = g.tags[(g.tagAliases && g.tagAliases.JUD) || 'JUD'];
          return !!(jud && jud.alive) && ((g.tags.ADI || {}).treasury || 0) >= 300;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ADI', {
          id: 'western_accounts', name: 'The Western Accounts', months: -1, effects: { incomeMult: 1.05 },
        }),
      },
      {
        id: 'b2_princes_companies', name: 'The Prince\'s Companies',
        icon: 'helmet', col: 0, requires: ['b2_refuge_east'],
        desc: 'The age\'s war is fought by organized companies. Reach Military 6 — The Prince\'s Companies.',
        rewardText: '+25 martial points.',
        check: (ctx) => (((ctx.game.tags.ADI || {}).tech || {}).mar | 0) >= 6,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { mar: 25 }),
      },
      {
        id: 'b2_wisdom', name: 'The Wisdom of Two Rivers',
        icon: 'lamp', col: 1, requires: ['b2_house_rebuilt'],
        desc: 'A restored court between empires needs every art of both. Take up three ideas of the age.',
        rewardText: '+25 governance points.',
        check: (ctx) => eraTiers(ctx.game.tags.ADI) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { gov: 25 }),
      },
      // ── The roads not taken (SPEC §183) ─────────────────────────────────
      {
        id: 'hy_mint_of_redemption', name: 'The Mint Reads Redemption', hypothetical: true,
        fork: '132ce/how_the_revolt_ends',
        icon: 'coins', col: 4, row: 0,
        desc: 'If the era of the Redemption becomes real — Rome\'s peace signed, the Nasi\'s '
          + 'state standing — then the house\'s silver crosses to a free Jerusalem, and the '
          + 'converts\' kingdom banks in a currency dated by the Redemption of Israel.',
        rewardText: '+50 talents, +15 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'redemptionEra')
          && !!(ctx.game.tags.ADI && ctx.game.tags.ADI.alive !== false),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { treasury: 50, legitimacy: 15 }),
      },
    ],
  },

  // Who actually lives here (SPEC §56, §104). The hill country is homogeneous
  // and needs no table; the cities of the diaspora are the reason this
  // bookmark has a religious mechanic at all. Two things are being seeded.
  //
  // First, the synagogue communities of the Greek east — thinner than they
  // were in 66 CE, because the Diaspora Revolt of 115–117 went through
  // Alexandria, Cyrene and Cyprus like a scythe (Jews are barred from Cyprus
  // outright after it, which is why Salamis has none).
  //
  // Second, the theosebeis: the gentiles who kept the sabbath, the food laws
  // and the ethics without accepting circumcision. They are attested on the
  // benches at Aphrodisias and in Josephus's aside that in every city there
  // were Greeks who had adopted Jewish observance — and they are the pool
  // both missions recruited from, which is the whole of §104's second half.
  // (The evidence is genuinely contested; they are a mechanic here, not a
  // claim about how many there were.)
  pops: {
    'Antioch': [
      { r: 'hellenism', c: 'greek', share: 0.60 },
      { r: 'judaism', c: 'judean', share: 0.22 },
      { r: 'godfearers', c: 'greek', share: 0.08 },
      { r: 'roman_cult', c: 'roman', share: 0.10 },
    ],
    'Alexandria': [
      { r: 'hellenism', c: 'greek', share: 0.52 },
      { r: 'egyptian', c: 'egyptian', share: 0.30 },
      { r: 'judaism', c: 'judean', share: 0.07 }, // what 115–117 left
      { r: 'godfearers', c: 'greek', share: 0.05 },
      { r: 'roman_cult', c: 'roman', share: 0.06 },
    ],
    'Caesarea Maritima': [
      { r: 'hellenism', c: 'greek', share: 0.55 },
      { r: 'judaism', c: 'judean', share: 0.28 },
      { r: 'godfearers', c: 'greek', share: 0.07 },
      { r: 'roman_cult', c: 'roman', share: 0.10 },
    ],
    'Scythopolis': [
      { r: 'hellenism', c: 'greek', share: 0.62 },
      { r: 'judaism', c: 'galilean', share: 0.30 },
      { r: 'godfearers', c: 'greek', share: 0.08 },
    ],
    'Ptolemais': [
      { r: 'hellenism', c: 'phoenician', share: 0.72 },
      { r: 'judaism', c: 'galilean', share: 0.20 },
      { r: 'godfearers', c: 'phoenician', share: 0.08 },
    ],
    'Damascus': [
      { r: 'hellenism', c: 'aramean', share: 0.72 },
      { r: 'judaism', c: 'judean', share: 0.20 },
      { r: 'godfearers', c: 'aramean', share: 0.08 },
    ],
    'Pella': [
      { r: 'hellenism', c: 'greek', share: 0.70 },
      { r: 'judaism', c: 'judean', share: 0.20 },
      { r: 'godfearers', c: 'greek', share: 0.10 },
    ],
    'Smyrna': [
      { r: 'hellenism', c: 'greek', share: 0.78 },
      { r: 'judaism', c: 'judean', share: 0.14 },
      { r: 'godfearers', c: 'greek', share: 0.08 },
    ],
    'Corinth': [
      { r: 'hellenism', c: 'greek', share: 0.84 },
      { r: 'judaism', c: 'judean', share: 0.09 },
      { r: 'godfearers', c: 'greek', share: 0.07 },
    ],
    'Thessalonica': [
      { r: 'hellenism', c: 'greek', share: 0.86 },
      { r: 'judaism', c: 'judean', share: 0.08 },
      { r: 'godfearers', c: 'greek', share: 0.06 },
    ],
    'Roma': [
      { r: 'roman_cult', c: 'roman', share: 0.80 },
      { r: 'hellenism', c: 'greek', share: 0.11 },
      { r: 'judaism', c: 'judean', share: 0.06 },
      { r: 'godfearers', c: 'roman', share: 0.03 },
    ],
    'Cyrene': [
      { r: 'hellenism', c: 'greek', share: 0.92 },
      { r: 'judaism', c: 'judean', share: 0.03 }, // Cyrenaican Jewry, after 115
      { r: 'godfearers', c: 'greek', share: 0.05 },
    ],
    'Salamis': [
      { r: 'hellenism', c: 'greek', share: 0.94 },
      { r: 'godfearers', c: 'greek', share: 0.06 }, // no Jews: the island is closed to them
    ],
    'Berytus': [
      { r: 'hellenism', c: 'phoenician', share: 0.86 },
      { r: 'judaism', c: 'judean', share: 0.07 },
      { r: 'godfearers', c: 'phoenician', share: 0.07 },
    ],
  },

  // What spreads with no state behind it (SPEC §104). The engine owns the
  // arithmetic; this table owns the politics. The curve is the age's own
  // pull — near zero when Bar Kokhba's coins are struck, steepest through
  // the third century, all but complete by Theodosius — and the resistance
  // entries are why a Jewish Galilee and a Samaritan Gerizim are still on
  // the map when the Greek cities around them have turned.
  faithDrift: {
    christianity: {
      from: ['hellenism', 'roman_cult', 'nabataean', 'egyptian'],
      resistedBy: { judaism: 0.35, samaritanism: 0.50 },
      seeds: ['Antioch', 'Alexandria', 'Roma', 'Corinth', 'Smyrna', 'Pella'],
      seedShare: 0.012,
      curve: (y) => 1 / (1 + Math.exp(-(y - 275) / 38)),
      vigor: 0.0016,
      spreadsAlong: 'trade',
      monthlyCap: 0.004,
    },
  },

  // The pool both missions fished in (SPEC §104). Christianity's pull is the
  // age's; Judaism's is a legal question before it is a theological one — and
  // the Rescript of Antoninus is where the law answers it. A realm that
  // accepts the rescript's terms buys quiet and gives up the mission field
  // permanently; there is no card later that gives it back.
  godfearers: {
    pool: 'godfearers',
    monthlyCap: 0.0009,
    weigh(ctx) {
      const g = ctx.game;
      const f = g.flags || {};
      const jud = g.tags && g.tags.JUD;
      let christian = 1 / (1 + Math.exp(-(g.date.y - 275) / 38));
      // A religion with an answer for persecution recruits during one.
      if (f.shemad && !f.shemadEased) christian += 0.15;
      if (f.plagueCharity) christian += 0.20;
      let jewish = f.missionBarred ? 0 : 0.55;
      if (jewish > 0) {
        // A state that stands is a reason to join the people that has one.
        if (jud && jud.alive !== false && !jud.overlord) jewish += 0.25;
        if (f.ushaSanhedrin) jewish += 0.15;   // an address to be admitted by
        if (f.calendarHeld) jewish += 0.10;    // and a calendar to keep
        if (f.proselytesDefended) jewish += 0.15;
        if (f.shemad && !f.shemadEased) jewish += 0.05; // the cohesion of a hunted people
      }
      return {
        judaism: Math.max(0, Math.min(1, jewish)),
        christianity: Math.max(0, Math.min(1, christian)),
      };
    },
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
      if (war) {
        war.noNegotiation = true;
        war.independenceSide = 'att'; // winning free is not conquest (SPEC §174)
      }
    } catch (e) { warnOnce('setup:war', e); }

    // --- Treasuries, manpower, stability, legitimacy. -------------------------
    // JUD: an organized state-in-waiting — coined money, stores, discipline.
    h.adjust(ctx, 'JUD', { treasury: 120, manpower: 6000, stability: 1, legitimacy: 15 });
    h.adjust(ctx, 'ROM', { treasury: 500, manpower: 25000, stability: 2, legitimacy: 40 });
    h.adjust(ctx, 'PAR', { treasury: 180, stability: 1, legitimacy: 20 });
    h.adjust(ctx, 'ARM', { treasury: 30 });
    // The restored house (SPEC §185): rebuilt, solvent, and careful.
    h.adjust(ctx, 'ADI', { treasury: 50, legitimacy: 15 });

    // --- Opinions. Parthia watches with interest; Armenia balances. -----------
    setOpinion(g, 'JUD', 'ROM', -190); setOpinion(g, 'ROM', 'JUD', -170);
    setOpinion(g, 'PAR', 'ROM', -80);  setOpinion(g, 'ROM', 'PAR', -70);
    setOpinion(g, 'PAR', 'JUD', 30);   setOpinion(g, 'JUD', 'PAR', 50);
    setOpinion(g, 'ARM', 'ROM', 20);   setOpinion(g, 'ARM', 'PAR', 30);
    // Adiabene remembered its converted kings (SPEC §185) — and Trajan.
    setOpinion(g, 'ADI', 'JUD', 70);   setOpinion(g, 'JUD', 'ADI', 60);
    setOpinion(g, 'ADI', 'PAR', 70);   setOpinion(g, 'PAR', 'ADI', 50);
    setOpinion(g, 'ADI', 'ROM', -60);  setOpinion(g, 'ROM', 'ADI', -30);

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
    h.spawnArmy(ctx, 'ADI', 'Arbela', { inf: 2, cav: 2, name: 'The Riders of Arbela' });

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

      const judTag = g.tags && g.tags[who(ctx, 'JUD')];
      const judAlive = !!(judTag && judTag.alive !== false);
      const judProvs = judAlive ? h.countControlled(ctx, 'JUD', {}) : 0;
      const jerusalemHeld = judAlive && h.controls(ctx, 'JUD', 'Jerusalem');
      const ws = judWarscore(ctx);

      if (g.playerTag === who(ctx, 'JUD')) {
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
      } else if (g.playerTag === who(ctx, 'ADI')) {
        // The restored house's contract (SPEC §185): no second Trajan, no
        // second fall — be seated at Arbela when the west's verdict is read.
        const adi = g.tags[who(ctx, 'ADI')];
        const adiAlive = !!(adi && adi.alive !== false);
        const adiProvs = adiAlive ? h.countControlled(ctx, 'ADI', {}) : 0;
        if (adiProvs === 0) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The Fall of the House of Monobazus',
            text: 'Arbela is taken, and this time there is no Hadrian to give the crown '
              + 'back. The converts\' kingdom ends as a paragraph in other people\'s '
              + 'histories, and the synagogues east of the rivers pray for a house that '
              + 'no longer answers.',
            score: 0,
          });
          return;
        }
        if (dateGE(g.date, 136, 1) && adiAlive && h.controls(ctx, 'ADI', 'Arbela')) {
          const free = !adi.overlord;
          const judStands = judAlive && judProvs > 0;
          h.endGame(ctx, {
            result: 'win',
            title: free ? 'A Crown Without a Yoke' : 'The House Restored, and Kept',
            text: (free
              ? 'The house of the converts ends the war owing tribute to nobody: the King '
                + 'of Kings\' writ stops at the Zab, and what Trajan burned stands rebuilt '
                + 'under a free crown. '
              : 'The house of the converts is still seated at Arbela when the west\'s '
                + 'verdict is read — client, rebuilt, and unburned a second time. ')
              + (judStands
                ? 'And the letters still have somewhere to go: the Nasi\'s state lives, '
                  + 'and the western accounts stay open.'
                : 'The letters from the west have stopped; the house keeps the covenant '
                  + 'in a world that burned the correspondents.'),
            score: 100 + (free ? 40 : 0) + (judStands ? 20 : 0),
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
