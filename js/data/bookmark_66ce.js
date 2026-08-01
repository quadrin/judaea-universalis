// Judaea Universalis — bookmark: The Great Revolt, 66 CE (SPEC §9.1).
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Historical spine: Josephus, Bellum Judaicum II–VII.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[bookmark_66ce] ' + key, e || '');
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
// content packages import nothing, and the registry validated every key at
// purchase time.
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

// Manually fire an event by id (used for the ev_negotiated_peace flavor on the timed
// JUD win). Mirrors SPEC §6.5 firing semantics: push to pendingEvents, mark fired,
// pause + emit 'event' for the player.
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

export const BOOKMARK_66 = {
  id: '66ce',
  name: 'The Great Revolt',
  startDate: { y: 66, m: 6, d: 1 },
  // SPEC §121: the year after which this chapter's own undated trigger
  // cards stop belonging to anybody — the Great Revolt and the generation that fought it.
  // A card that legitimately runs later says so with its own maxYear.
  generationHorizon: 100,
  // Technology of the age (SPEC §22): imperial Rome musters Professional
  // Legions; Judaea's host is drilled but a pattern behind.
  techBase: 5,
  // How far up the ladder this age can climb (SPEC §99). The Flavian century stops at the professional legion (SPEC §99).
  techCeiling: 9,
  techTweaks: { ROM: { mar: 2, gov: 1 }, PAR: { mar: 1 } },
  // The rungs' own names (SPEC §179): the arts of the Revolt's generation,
  // from the procurator's books Florus kept to the legion's equal Josephus
  // tried to drill into Galilee.
  techNames: {
    gov: {
      4: 'The Procurator\'s Books', 5: 'The Temple Administration', 6: 'The Korban Treasury',
      7: 'The Provisioned City', 8: 'The Third Wall', 9: 'The Flavian Order',
    },
    infl: {
      4: 'The Synagogue Letters', 5: 'The Festival Crowds', 6: 'The Diaspora\'s Silver',
      7: 'The Eastern Embassies', 8: 'The Coined Message', 9: 'The Historian\'s Pen',
    },
    mar: {
      4: 'The City Militias', 5: 'The Zealots\' Fire', 6: 'The Drilled Companies',
      7: 'The Roman Manner', 8: 'The Armies Massed', 9: 'The Legion\'s Equal',
    },
  },

  // Who actually lives here (SPEC §56): the mixed cities whose riots lit the
  // Revolt — Caesarea's Greek-Jewish knife's edge (BJ 2.266), Scythopolis,
  // and Alexandria's three quarters. Unlisted provinces are homogeneous.
  pops: {
    'Caesarea Maritima': [
      { r: 'hellenism', c: 'greek', share: 0.55 },
      { r: 'judaism', c: 'judean', share: 0.45 },
    ],
    'Scythopolis': [
      { r: 'hellenism', c: 'greek', share: 0.62 },
      { r: 'judaism', c: 'galilean', share: 0.38 },
    ],
    'Alexandria': [
      { r: 'hellenism', c: 'greek', share: 0.55 },
      { r: 'egyptian', c: 'egyptian', share: 0.27 },
      { r: 'judaism', c: 'judean', share: 0.18 },
    ],
  },

  // Era name (SPEC §25): Flavia Neapolis is founded only in 72 CE.
  provinceNames: { 'Neapolis': 'Shechem' },

  // The victors' pens wait on the schoolhouse (SPEC §66): the name a state
  // writes on a province it has made its own (integration at 1, or its own
  // culture on the land). Rome's is the Flavian pen — what the dynasty
  // actually wrote on this ground after 70; Judaea's is the Hebrew pen of
  // the victory timeline, set to the Greek coast once the coast is truly
  // absorbed. Towns Judaea holds from the start (Joppa, the hill country)
  // keep the era register — the pen is for conquests, not for home.
  integratedNames: {
    ROM: {
      // Flavia Neapolis, founded 72/73 CE on the ground below Gerizim: the
      // era map says Shechem until Rome makes the canon name true.
      'Neapolis': 'Neapolis',
      'Joppa': 'Flavia Ioppe',    // the refounded harbor, as its coins style it
      'Sepphoris': 'Eirenopolis', // the mint's own boast — City of Peace
    },
    JUD: {
      'Ptolemais': 'Akko', 'Scythopolis': 'Beit She\'an',
      'Azotus': 'Ashdod', 'Ascalon': 'Ashkelon', 'Dora': 'Dor',
      'Sebaste': 'Shomron', 'Jamnia': 'Yavneh', 'Sepphoris': 'Tzippori',
    },
    // (No AGR pen: Agrippa's 'Neronias' for Caesarea Philippi would rename
    // his own start-owned capital the moment the AI integrates it — and the
    // name died with Nero's memory anyway.)
    // A proclaimed Kingdom of Israel keeps Judaea's Hebrew pen (alias table).
    MLI: 'JUD',
  },

  blurb: 'The procurator Gessius Florus has taken seventeen talents from the Temple treasury, '
    + 'and Jerusalem has answered with stones, then with steel. In the Temple, the captain '
    + 'Eleazar moves to refuse every offering from a foreign hand; in Antioch the governor of '
    + 'Syria watches, and waits, and counts his legions. Four years of fire begin now.',

  // Tags of other eras (SEL, PTO, HAS, HYR, ARI) never enter this game.
  activeTags: ['ROM', 'JUD', 'PAR', 'NAB', 'ARM', 'AGR', 'OSR', 'ADI', 'CHX',
    // The political west (SPEC §173): everyone outside Nero's empire — the
    // free Germans, the client Bosporus, the Sarmatian steppe, and Dacia
    // waiting for Decebalus. Rome's own west arrives through the political
    // map with its levy shares, which is why it can arrive at all.
    'GRM', 'CAL', 'HIB',
    'SUE', 'CHE', 'CHA', 'FRS', 'CIM', 'SCN', 'GOT', 'AES',
    'DAC', 'BOS', 'SCY', 'SRM', 'VEN'],
  // Standing rivalries (SPEC §73): Corbulo's Armenian war just closed; the
  // Euphrates rivalry only pauses.
  rivalries: [['ROM', 'PAR']],
  // Historical friends (SPEC §86): the great Jewish communities of Babylonia
  // sat inside Parthia, and every Judaean court that looked east found a
  // hearing there — Adiabene's royal house had converted a generation before
  // and sent its princes to fight in the revolt.
  affinities: [
    ['JUD', 'PAR', { axis: 'alignment', sign: -1 }],
    ['JUD', 'ADI'],
  ],

  // What the era asks of you (SPEC §33) — shown in the realm panel.
  // The era's own way of coming apart (SPEC §98). The Great Revolt was not
  // lost to Rome alone: three factions held three quarters of Jerusalem, burned
  // each other's granaries in the year before the siege, and fought street
  // battles inside a city under blockade. The Factions in the City brews
  // whenever a Judaea at war lets its own house go unquiet.
  crises: [
    {
      id: 'factions_in_the_city',
      name: 'The Factions in the City',
      applies(ctx, tag) {
        const t = ctx.game.tags[tag];
        return !!(t && t.alive && t.religion === 'judaism' && ctx.helpers.controls(ctx, tag, 'Jerusalem'));
      },
      pressure(ctx, tag) {
        const t = ctx.game.tags[tag];
        const p = ctx.prov('Jerusalem');
        const atWar = (t.atWarWith || []).some((e) => ctx.game.tags[e] && ctx.game.tags[e].alive);
        let heat = 0;
        if (atWar) heat += 2;
        if (p && (p.unrest || 0) >= 3) heat += 3;
        if ((t.stability || 0) < 0) heat += 3;
        if ((t.warExhaustion || 0) > 6) heat += 2;
        if (!atWar && (t.stability || 0) >= 1) heat -= 8;
        return heat;
      },
      stages: [
        {
          at: 34,
          name: 'Three Courts in One City',
          label: 'Let them keep their quarters, for now',
          desc: 'The moderates hold the upper city, the zealots the Temple mount, '
            + 'the Galileans everything between, and each of them posts its own '
            + 'guards on its own streets. Orders leave the council and arrive as '
            + 'suggestions.',
          effects: { unrestAll: 0.75, incomeMult: 0.95 },
        },
        {
          at: 67,
          name: 'The Granaries Burn',
          label: 'Nothing to be done but count what is left',
          desc: 'In a city that will be besieged, one faction burns another\'s '
            + 'stores to force it to fight. Years of grain go up in an afternoon. '
            + 'Whatever the walls could have withstood, the storehouses now cannot.',
          effects: { unrestAll: 1.5, incomeMult: 0.85, reinforceMult: 0.85 },
        },
        {
          at: 100,
          name: 'War Inside the Walls',
          label: 'Then the city fights itself first',
          desc: 'The factions fight each other through the streets while the '
            + 'legions build their ramps outside. Whoever wins this will inherit a '
            + 'garrison that has already fought its hardest battle — against '
            + 'itself.',
          effects: { unrestAll: 2.5, incomeMult: 0.75, moraleMult: 0.9, manpowerMult: 0.85 },
        },
      ],
      resolvedText: 'the city speaks with one voice again',
    },
  ],

  objectives: {
    JUD: [
      'Win: bleed Rome to +50 war score — the emperor will sue for peace (accept, or wager the House on the next season).',
      'Win: hold Jerusalem and a living heartland into 71 CE — Vespasian finds a client cheaper than a war.',
      'Lose: the last ember — no provinces and the bands scattered.',
    ],
    ROM: [
      'Win: erase the revolt — Judaea reduced to nothing (before 70 CE for the triumph).',
      'Lose: Jerusalem still defiant in 74 CE while Parthia arms.',
    ],
    AGR: [
      'Win: still a king in 71 CE — alive, seated at Caesarea Philippi, the home provinces held.',
      'Win: the richer verdict — end the war with the kingdom whole and Rome still devoted.',
      'Lose: a king without a country — the capital gone and the royal army scattered, or nothing left at all.',
    ],
    ADI: [
      'Win: the house stands in 71 CE — Arbela held through the war that burned the west.',
      'Win: the greater verdict — stand free of the King of Kings, or stand rich while Judaea still lives.',
      'Lose: the fall of the house — every province gone, the converts\' kingdom erased.',
    ],
  },

  // The court factions (SPEC §34): the realm's internal parties. The engine
  // ticks them for the human player alone; the AI keeps its politics offstage.
  factions: {
    JUD: [
      {
        id: 'zealots', name: 'The Zealots',
        desc: 'The war party of the lower city: Eleazar\'s priests, the sicarii, and every man who burned his debts.',
        drift(ctx, t) {
          const g = ctx.game;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.6 : -0.7;
        },
        boon: { name: 'The Bands Muster', text: '+15% manpower', effects: { manpowerMult: 1.15 } },
        bane: { name: 'The Daggers Turn Inward', text: '+1.25 unrest everywhere', effects: { unrestAll: 1.25 } },
        appease: { label: 'Arm the bands (40 martial points)', cost: { mar: 40 } },
        demand: {
          title: 'The Zealots Smell Treachery',
          text: 'Every week of quiet is, to them, a week of secret embassies: the daggers move '
            + 'through the festival crowds asking who has been writing to the Romans. Give the war '
            + 'party its war footing — or be the next name the sicarii whisper.',
          grant: { label: 'The city arms', cost: { mar: 50 } },
          refuse: { label: 'No knife commands this city', tooltip: 'Your name enters the whispers.' },
        },
      },
      {
        id: 'notables', name: 'The Peace Party',
        desc: 'The high-priestly houses and the men of property: they fund the war they never wanted, and count the exits.',
        drift(ctx, t) { return (t.warExhaustion || 0) <= 4 ? 0.3 : -0.5; },
        boon: { name: 'The Notables Keep the Markets', text: '+8% income', effects: { incomeMult: 1.08 } },
        bane: { name: 'The Notables Withhold', text: '−15% reinforcement', effects: { reinforceMult: 0.85 } },
        appease: { label: 'Guard their houses (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Notables Ask for a Door',
          text: 'They have seen Roman sieges. They ask — quietly, over dinner, deniably — that '
            + 'someone keep a door open to negotiation, that the city\'s wealth not be spent down '
            + 'to the last stone of the last wall. Courage, they say, is knowing when.',
          grant: { label: 'A door stays open', cost: { infl: 50 } },
          refuse: { label: 'The doors are walled up', tooltip: 'The wealth finds its own doors.' },
        },
      },
      {
        id: 'priesthood', name: 'The Temple Priesthood',
        desc: 'The courses of the altar, keeping the daily sacrifice while the world decides whether the House stands.',
        drift(ctx, t) {
          try { return ctx.helpers.controls(ctx, 'JUD', 'Jerusalem') ? 0.4 : -0.8; } catch (e) { return 0; }
        },
        boon: { name: 'The Daily Sacrifice Steadies', text: '−0.75 unrest everywhere', effects: { unrestAll: -0.75 } },
        bane: { name: 'The Altar Doubts', text: '−0.25 legitimacy a month', effects: { legitimacyAdd: -0.25 } },
        appease: { label: 'Endow the offerings (80 talents)', cost: { treasury: 80 } },
        demand: {
          title: 'The Priesthood Presents the Accounts',
          text: 'The Temple treasury bought grain, walls and javelins; the courses ask when the '
            + 'sacred shekels come home. A war fought from the House\'s strongbox had better be '
            + 'a war the House can bless.',
          grant: { label: 'The shekels come home', cost: { treasury: 120 } },
          refuse: { label: 'The House gave them to the war', tooltip: 'The blessing grows conditional.' },
        },
      },
    ],
    ROM: [
      {
        id: 'senate', name: 'The Senate',
        desc: 'The fathers, who vote Nero\'s honors and remember every governor\'s failure in perfect detail.',
        drift(ctx, t) { return (t.stability || 0) >= 1 ? 0.4 : -0.4; },
        boon: { name: 'The Fathers Approve', text: '+0.25 legitimacy a month', effects: { legitimacyAdd: 0.25 } },
        bane: { name: 'Obstruction in the Curia', text: '−7% income', effects: { incomeMult: 0.93 } },
        appease: { label: 'Provinces and praetorships (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Senate Expects Its Share',
          text: 'The fathers have sons, and the sons need provinces, quaestorships, commissions in '
            + 'legions that are actually fighting. Feed the ladder of honors, or the Curia will '
            + 'debate the eastern command with unusual thoroughness.',
          grant: { label: 'Feed the ladder', cost: { gov: 50 } },
          refuse: { label: 'The princeps appoints whom he likes', tooltip: 'The debates grow thorough.' },
        },
      },
      {
        id: 'legions', name: 'The Legions',
        desc: 'The eagles of the East: they make emperors when unpaid, and this decade will prove it.',
        drift(ctx, t) {
          const g = ctx.game;
          if ((t.treasury || 0) < 0) return -0.7;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.4 : -0.2;
        },
        boon: { name: 'The Eagles Content', text: '+4% discipline', effects: { disciplineMult: 1.04 } },
        bane: { name: 'Mutinous Winter Quarters', text: '−6% morale', effects: { moraleMult: 0.94 } },
        appease: { label: 'The donative (100 talents)', cost: { treasury: 100 } },
        demand: {
          title: 'The Legions Expect the Donative',
          text: 'The eastern legions have marched, dug and bled, and the accession donative Nero '
            + 'promised is a camp legend by now. Legionaries are patient creatures — right up '
            + 'until the year they start naming emperors.',
          grant: { label: 'Pay the donative', cost: { treasury: 150 } },
          refuse: { label: 'Rome pays in glory', tooltip: 'The camps begin naming names.' },
        },
      },
      {
        id: 'people', name: 'The People of Rome',
        desc: 'The city that must be fed and amused whatever burns in the provinces.',
        drift(ctx, t) { return (t.warExhaustion || 0) <= 4 ? 0.3 : -0.5; },
        boon: { name: 'The Levies Come Willing', text: '+10% manpower', effects: { manpowerMult: 1.1 } },
        bane: { name: 'Bread Riots', text: '+1 unrest everywhere', effects: { unrestAll: 1 } },
        appease: { label: 'Games and grain (80 talents)', cost: { treasury: 80 } },
        demand: {
          title: 'The City Wants Its Games',
          text: 'The grain fleet is late, the war in Judaea threatens the Alexandrian sailing, and '
            + 'the Circus crowd has started chanting arithmetic at the emperor\'s box. Rome forgives '
            + 'any war it does not have to feel at the baker\'s.',
          grant: { label: 'Grain and games', cost: { treasury: 120 } },
          refuse: { label: 'Let them chant', tooltip: 'The chants find the emperor\'s box.' },
        },
      },
    ],
    AGR: [
      {
        id: 'pious', name: 'The Pious of the Land',
        desc: 'The synagogues of Batanea and the Golan villages: Jewish subjects watching their Jewish king march with the men besieging Jerusalem.',
        drift(ctx, t) {
          const g = ctx.game;
          const judTag = (g.tagAliases && g.tagAliases.JUD) || 'JUD';
          const jud = g.tags[judTag];
          return jud && jud.alive && (t.atWarWith || []).indexOf(judTag) >= 0 ? -0.6 : 0.4;
        },
        boon: { name: 'The Villages Keep Faith', text: '−0.75 unrest everywhere', effects: { unrestAll: -0.75 } },
        bane: { name: 'The Synagogues Turn Away', text: '−0.25 legitimacy a month', effects: { legitimacyAdd: -0.25 } },
        appease: { label: 'Endow the houses of prayer (60 talents)', cost: { treasury: 60 } },
        demand: {
          title: 'The Pious Ask Whose King You Are',
          text: 'A delegation from the villages — greybeards, a scribe, a boy who walked from Gamala '
            + '— asks the question the whole kingdom whispers: when the House burns, will the king '
            + 'of the Jews be found among the men holding torches? They ask for bread for the '
            + 'refugees and a word they can carry home.',
          grant: { label: 'Bread, and the word', cost: { treasury: 80 } },
          refuse: { label: 'The king answers to Rome', tooltip: 'The villages remember the answer.' },
        },
      },
      {
        id: 'stewards', name: 'The Stewards of the House',
        desc: 'Berenice\'s estates, the palace secretaries, the grain contracts: the machinery that makes a small kingdom rich and keeps it obedient.',
        drift(ctx, t) { return (t.treasury || 0) >= 0 ? 0.3 : -0.6; },
        boon: { name: 'The Estates Deliver', text: '+8% income', effects: { incomeMult: 1.08 } },
        bane: { name: 'The Ledgers Close', text: '−12% reinforcement', effects: { reinforceMult: 0.88 } },
        appease: { label: 'Confirm their leases (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Stewards Present the Grain Contracts',
          text: 'The war is eating the kingdom\'s surplus: Rome\'s quartermasters buy at the price '
            + 'they name, and the stewards want the difference made good from the treasury — or '
            + 'leave to sell to whoever pays. They are very correct about it. They are always '
            + 'very correct.',
          grant: { label: 'Make the difference good', cost: { treasury: 100 } },
          refuse: { label: 'The kingdom eats first', tooltip: 'The surplus finds quieter roads.' },
        },
      },
      {
        id: 'babylonians', name: 'The Babylonian Horse',
        desc: 'Zamaris\' colony in Batanea — Jewish lancers settled three generations ago to hold the road, now the spine of the royal army under Philip ben Jacimus.',
        drift(ctx, t) {
          const g = ctx.game;
          if ((t.treasury || 0) < 0) return -0.7;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.5 : -0.2;
        },
        boon: { name: 'The Lancers Drill', text: '+5% discipline', effects: { disciplineMult: 1.05 } },
        bane: { name: 'The Colony Sits Its Horses', text: '−8% morale', effects: { moraleMult: 0.92 } },
        appease: { label: 'Remounts and pay (60 talents)', cost: { treasury: 60 } },
        demand: {
          title: 'The Horse Asks for Its Arrears',
          text: 'Philip\'s troopers have charged for the king at Jerusalem and been called traitors '
            + 'for it in both directions. What the colony wants is what soldiers always want — '
            + 'pay, remounts, and their king seen once in the camp instead of the palace.',
          grant: { label: 'Ride to the camp with the pay chests', cost: { treasury: 90 } },
          refuse: { label: 'Loyalty is the rent for Batanea', tooltip: 'The squadrons remember the rent.' },
        },
      },
    ],
    ADI: [
      {
        id: 'proselytes', name: 'The Proselyte House',
        desc: 'The converts of the royal family and the court that prays toward Jerusalem: Helena\'s memory, the princes\' zeal, and the palace in the holy city.',
        drift(ctx, t) {
          const g = ctx.game;
          const jud = g.tags[(g.tagAliases && g.tagAliases.JUD) || 'JUD'];
          return jud && jud.alive ? 0.4 : -0.6;
        },
        boon: { name: 'The Covenant Kept', text: '+0.2 legitimacy a month', effects: { legitimacyAdd: 0.2 } },
        bane: { name: 'The Court Doubts the Crown', text: '−0.25 legitimacy a month, +0.5 unrest', effects: { legitimacyAdd: -0.25, unrestAll: 0.5 } },
        appease: { label: 'Silver for the holy city (60 talents)', cost: { treasury: 60 } },
        demand: {
          title: 'The Proselytes Ask for the West',
          text: 'The letters from Jerusalem read like Lamentations, and the court that took the '
            + 'covenant wants more than prayers sent west — grain, silver, and leave for the '
            + 'young men who keep slipping across the Euphrates anyway.',
          grant: { label: 'Open the granaries', cost: { treasury: 100 } },
          refuse: { label: 'Arbela cannot feed two kingdoms', tooltip: 'The young men go regardless, angrier.' },
        },
      },
      {
        id: 'caravans', name: 'The Caravan Lords',
        desc: 'The masters of the Gulf Road\'s northern tolls: silk, spices and Tyrian silver moving through Arbela and Nisibis under the King of Kings\' peace.',
        drift(ctx, t) {
          return (t.atWarWith || []).length ? -0.6 : 0.4;
        },
        boon: { name: 'The Tolls Flow', text: '+10% income', effects: { incomeMult: 1.1 } },
        bane: { name: 'The Roads Go Around', text: '−10% income', effects: { incomeMult: 0.9 } },
        appease: { label: 'Remit a season\'s tolls (50 talents)', cost: { treasury: 50 } },
        demand: {
          title: 'The Caravans Want the Peace Kept',
          text: 'War in the west has doubled every escort\'s price, and the lords of the road are '
            + 'blunt: a small kingdom astride a great road lives by being boring. They ask for '
            + 'guards at the fords and no adventures the King of Kings has not blessed.',
          grant: { label: 'Guards at the fords', cost: { treasury: 70 } },
          refuse: { label: 'The road serves the house, not the house the road', tooltip: 'The escorts\' prices double again.' },
        },
      },
      {
        id: 'riders', name: 'The Riders of Arbela',
        desc: 'The armored horse of the Tigris bank — the arm Parthia values, the reason a small kingdom keeps its crown, and the pride of every landed family.',
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
          text: 'The landed families armed their sons for the King of Kings\' wars and have watched '
            + 'two seasons of other people\'s glory. Pay for the muster they keep, or point it at '
            + 'something — the lances do not care greatly which.',
          grant: { label: 'Pay for the muster', cost: { treasury: 80 } },
          refuse: { label: 'The lances wait on the house\'s word', tooltip: 'The families count the seasons.' },
        },
      },
    ],
  },
  playableTags: [
    {
      tag: 'JUD',
      difficulty: 'Hard',
      blurb: 'Hold the hills. Rome will come with sixty thousand men and all the patience of '
        + 'empire — but Cestius must cross Beth Horon, Galilee can be walled, and in three '
        + 'years Rome will be busy murdering its own emperors. Survive to 71 with Jerusalem '
        + 'and the Temple standing, and Vespasian may find a client king cheaper than a war.',
    },
    {
      tag: 'AGR',
      difficulty: 'Moderate',
      blurb: 'The last Herodian. You warned Jerusalem in the Xystus and the city answered with '
        + 'stones; now your Jewish kingdom marches beside the legions against your own people, '
        + 'Gamala watches for its moment, and every month of war asks the same question — how '
        + 'much of a king survives being useful? Keep the north, and outlive the fire.',
    },
    {
      tag: 'ADI',
      difficulty: 'Hard',
      blurb: 'The house beyond the Tigris that took the God of Israel. Two provinces, the '
        + 'King of Kings for an overlord, and kinsmen already riding for Jerusalem — Arbela '
        + 'must weigh grain for the holy city against a Parthia that reads its letters, and '
        + 'decide what a convert kingdom owes when the House itself is burning.',
    },
  ],

  // Pre-existing works (SPEC §58): the built world of 66 CE — Herod's harbor
  // at Caesarea, the grain machine at Alexandria, the markets of the great
  // cities — stands before the first player order.
  buildings: {
    'Alexandria': ['shipyard', 'granary', 'market'],
    'Caesarea Maritima': ['shipyard'], // Sebastos, Herod's great harbor
    'Seleucia Pieria': ['shipyard'],   // the port of Antioch
    'Jerusalem': ['market'],
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

    // --- The war: Judaea has risen; Agrippa's kingdom fights beside Rome. ---
    h.declareWar(ctx, 'JUD', 'ROM', 'The Great Revolt');
    try {
      const war = findJudRomWar(g);
      if (war) {
        // This war resolves only through the event chain and checkVictory —
        // the generic peace table would short-circuit the designed arc.
        war.noNegotiation = true;
        war.independenceSide = 'att'; // winning free is not conquest (SPEC §174)
        const romSide = (war.attackers || []).indexOf('ROM') !== -1 ? war.attackers : war.defenders;
        if (Array.isArray(romSide) && romSide.indexOf('AGR') === -1) romSide.push('AGR');
        if (war.warscore && typeof war.warscore === 'object' && war.warscore.AGR === undefined) {
          war.warscore.AGR = 0;
        }
      }
      const agr = g.tags.AGR, jud = g.tags.JUD, rom = g.tags.ROM;
      if (agr && jud) {
        if (Array.isArray(agr.atWarWith) && agr.atWarWith.indexOf('JUD') === -1) agr.atWarWith.push('JUD');
        if (Array.isArray(jud.atWarWith) && jud.atWarWith.indexOf('AGR') === -1) jud.atWarWith.push('AGR');
      }
      if (agr && rom) {
        if (Array.isArray(agr.allies) && agr.allies.indexOf('ROM') === -1) agr.allies.push('ROM');
        if (Array.isArray(rom.allies) && rom.allies.indexOf('AGR') === -1) rom.allies.push('AGR');
        agr.overlord = 'ROM'; // the last Herodian is a client king (tribute, wars shared)
      }
    } catch (e) { warnOnce('setup:agrJoin', e); }

    // --- Treasuries, manpower, stability, legitimacy (deltas via helpers.adjust). ---
    // JUD: the Temple treasury as a war chest; euphoric but institutionally shaky.
    h.adjust(ctx, 'JUD', { treasury: 150, manpower: 5000, stability: 1, legitimacy: 10 });
    // ROM: far richer, but the east is a sideshow — for now.
    h.adjust(ctx, 'ROM', { treasury: 400, manpower: 20000, stability: 1, legitimacy: 30 });
    h.adjust(ctx, 'AGR', { treasury: 40, legitimacy: 20 });
    h.adjust(ctx, 'NAB', { treasury: 80, stability: 1 });
    h.adjust(ctx, 'PAR', { treasury: 200, stability: 1, legitimacy: 20 });
    h.adjust(ctx, 'ARM', { treasury: 30 });
    // The convert kingdom (SPEC §185): rich enough on the road's tolls to
    // matter, devoted enough to Jerusalem to be watched from Ctesiphon.
    h.adjust(ctx, 'ADI', { treasury: 60, legitimacy: 15 });

    // --- Opinions. PAR–ROM hostile; NAB and AGR pro-Roman; PAR quietly sympathetic. ---
    setOpinion(g, 'JUD', 'ROM', -180); setOpinion(g, 'ROM', 'JUD', -150);
    setOpinion(g, 'PAR', 'ROM', -120); setOpinion(g, 'ROM', 'PAR', -100);
    setOpinion(g, 'NAB', 'ROM', 100);  setOpinion(g, 'ROM', 'NAB', 75);
    setOpinion(g, 'NAB', 'JUD', -60);
    setOpinion(g, 'AGR', 'ROM', 150);  setOpinion(g, 'ROM', 'AGR', 150);
    setOpinion(g, 'AGR', 'JUD', -50);  setOpinion(g, 'JUD', 'AGR', -75);
    setOpinion(g, 'PAR', 'JUD', 40);   setOpinion(g, 'JUD', 'PAR', 60);
    // The house of Monobazus (SPEC §185): converts whose princes are already
    // riding west, watched narrowly by both empires.
    setOpinion(g, 'ADI', 'JUD', 90);   setOpinion(g, 'JUD', 'ADI', 80);
    setOpinion(g, 'ADI', 'PAR', 80);   setOpinion(g, 'PAR', 'ADI', 60);
    setOpinion(g, 'ADI', 'ROM', -40);  setOpinion(g, 'ROM', 'ADI', -25);
    // Post-Rhandeia: Tiridates was crowned by Nero weeks before the start date —
    // Armenia is formally amicable with Rome while remaining an Arsacid house.
    setOpinion(g, 'ARM', 'ROM', 15);  setOpinion(g, 'ARM', 'PAR', 40);

    // --- Starting modifiers. ---
    h.addTagModifier(ctx, 'JUD', {
      id: 'religious_fervor', name: 'Religious Fervor', months: 36,
      effects: { moraleMult: 1.15, maintMult: 0.65 },
    });
    // Cestius waits on events at Antioch; ev_cestius_marches (66-10) removes this.
    // Months 6 is a safety net in case the event chain is disturbed.
    h.addTagModifier(ctx, 'ROM', {
      id: 'governor_hesitates', name: 'The Governor Hesitates', months: 6,
      effects: { aiPassive: true },
    });

    // --- Starting armies & generals (Josephus, BJ II). ---
    // Judaea: the city host, Josephus' Galilee command, militia bits. Masada's Sicarii
    // arrive via ev_menahem.
    h.spawnArmy(ctx, 'JUD', 'Jerusalem', {
      inf: 13, cav: 2, name: 'Host of Jerusalem',
      general: { name: 'Eleazar ben Simon', fire: 2, shock: 3, maneuver: 1 },
    });
    h.spawnArmy(ctx, 'JUD', 'Jotapata', {
      inf: 8, name: 'Army of Galilee',
      general: { name: 'Josephus ben Matthias', fire: 1, shock: 2, maneuver: 4 },
    });
    h.spawnArmy(ctx, 'JUD', 'Tarichaea', { inf: 2, name: 'Galilean Militia' });
    h.spawnArmy(ctx, 'JUD', 'Gadora', { inf: 1, name: 'Men of Perea' });

    // Rome: Cestius Gallus with the Twelfth at Antioch; coastal garrisons; Egypt quiet.
    h.spawnArmy(ctx, 'ROM', 'Antioch', {
      inf: 15, cav: 3, name: 'Legio XII Fulminata',
      general: { name: 'Cestius Gallus', fire: 1, shock: 1, maneuver: 1 },
    });
    h.spawnArmy(ctx, 'ROM', 'Caesarea Maritima', { inf: 3, name: 'Caesarea Garrison' });
    h.spawnArmy(ctx, 'ROM', 'Scythopolis', { inf: 2, name: 'Scythopolis Garrison' });
    h.spawnArmy(ctx, 'ROM', 'Alexandria', {
      inf: 4, name: 'Legio III Cyrenaica',
      general: { name: 'Tiberius Julius Alexander', fire: 2, shock: 2, maneuver: 2 },
    });

    // Agrippa II: a small royal army, at war on Rome's side.
    h.spawnArmy(ctx, 'AGR', 'Caesarea Philippi', {
      inf: 3, cav: 1, name: "Agrippa's Royal Army",
      general: { name: 'Philip ben Jacimus', fire: 1, shock: 2, maneuver: 2 },
    });

    // Neutral powers keep token forces at home.
    h.spawnArmy(ctx, 'NAB', 'Petra', { inf: 4, cav: 2, name: 'Army of Malichus II' });
    h.spawnArmy(ctx, 'ADI', 'Arbela', {
      inf: 2, cav: 3, name: 'The Riders of Arbela',
      general: { name: 'Kenedaeus', fire: 1, shock: 3, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'PAR', 'Seleucia-Ctesiphon', {
      inf: 12, cav: 8, name: 'Royal Army of Parthia',
      general: { name: 'Monaeses', fire: 2, shock: 3, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'ARM', 'Tigranocerta', { inf: 3, name: 'Army of Armenia' });

    h.setFlag(ctx, 'cestiusMen0', 18000);

    h.notify(ctx, {
      title: 'The Great Revolt',
      text: 'Jerusalem has risen against Rome. The sacrifices for Caesar have ceased, and the '
        + 'governor of Syria gathers his legion at Antioch.',
      type: 'war', provName: 'Jerusalem',
    });
  },

  // Courts of June 66 CE. Skills 0-6 feed monthly monarch points (base +2);
  // ages drive mortality; heirs succeed (children get regencies). Nero dies
  // heirless by design — the Year of the Four Emperors arrives by event.
  rulers: {
    JUD: {
      name: 'Ananus ben Ananus', title: 'High Priest', gov: 3, infl: 3, mar: 2, age: 53,
      heir: { name: 'Eleazar ben Ananias', gov: 2, infl: 2, mar: 3, age: 30 },
    },
    ROM: { name: 'Nero Claudius Caesar', title: 'Emperor', gov: 1, infl: 4, mar: 1, age: 28 },
    PAR: {
      name: 'Vologases I', title: 'King of Kings', gov: 3, infl: 4, mar: 3, age: 55,
      heir: { name: 'Pacorus II', gov: 2, infl: 3, mar: 2, age: 20 },
    },
    NAB: {
      name: 'Malichus II', title: 'King', gov: 2, infl: 3, mar: 1, age: 60,
      heir: { name: 'Rabbel II', gov: 2, infl: 2, mar: 1, age: 6 }, // a child — his death means a regency
    },
    ARM: { name: 'Tiridates I', title: 'King', gov: 2, infl: 3, mar: 2, age: 45 },
    AGR: { name: 'Agrippa II', title: 'King', gov: 2, infl: 4, mar: 1, age: 38 },
    // The converted house (Josephus, AJ XX): Monobazus II, Izates' brother,
    // who sent his kinsmen to fight at Beth Horon and his grain to the city.
    ADI: {
      name: 'Monobazus II', title: 'King', gov: 2, infl: 3, mar: 2, age: 52,
      heir: { name: 'Izates bar Monobazus', gov: 2, infl: 2, mar: 3, age: 24 },
    },
    // The political west (SPEC §173): the client king of the straits, whose
    // grain fleet matters to Rome more than most provinces do.
    BOS: { name: 'Cotys I', title: 'King of the Bosporus', gov: 2, infl: 2, mar: 2, age: 50 },
  },

  // Linear mission chains (realm panel). check/reward run through ctx.helpers.
  missions: {
    JUD: [
      // The tree (SPEC §177): one root, then the war score, the coast and
      // the Parthian east as branches that advance on their own. Rome's
      // chain below stays a ladder on purpose — Vespasian's method WAS a
      // sequence, and a tree would be a lie about it.
      {
        id: 'jm_arm_the_nation', name: 'Arm the Nation',
        icon: 'spears', col: 1,
        desc: 'Put twenty thousand men under arms — the revolt must become an army.',
        rewardText: '"Levies of Zion": +10% manpower for 24 months.',
        check: (ctx) => totalMen(ctx, 'JUD') >= 20000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'levies_of_zion', name: 'Levies of Zion', months: 24, effects: { manpowerMult: 1.1 },
        }),
      },
      {
        id: 'jm_throw_back', name: 'Throw Back the Governor',
        icon: 'swords', col: 0, requires: ['jm_arm_the_nation'],
        desc: 'Bloody the legions: reach +10 war score against Rome.',
        rewardText: '+25 martial points.',
        check: (ctx) => judWarscore(ctx) >= 10,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { mar: 25 }),
      },
      {
        id: 'jm_coastal_road', name: 'The Coastal Road',
        icon: 'ship', col: 1, requires: ['jm_arm_the_nation'],
        desc: 'Take Caesarea Maritima, seat of the procurators and gate of the sea.',
        rewardText: 'The procurator\'s treasury: +100 talents.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Caesarea Maritima'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { treasury: 100 }),
      },
      {
        id: 'jm_diaspora', name: 'Brothers of the Diaspora',
        icon: 'diaspora', col: 2, requires: ['jm_arm_the_nation'],
        desc: 'Win the East: gain Parthian sympathy, or raise their opinion of us to +80.',
        rewardText: 'Silver and volunteers: +100 talents, +2,000 manpower.',
        check: (ctx) => !!ctx.helpers.getFlag(ctx, 'parthianSympathy')
          || ((ctx.game.tags.PAR && ctx.game.tags.PAR.opinion && ctx.game.tags.PAR.opinion.JUD) || 0) >= 80,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { treasury: 100, manpower: 2000 }),
      },
      {
        id: 'jm_samaria', name: 'Cleanse Samaria',
        icon: 'mountain', col: 1, requires: ['jm_coastal_road'],
        desc: 'Take Shechem and Sebaste, and hold the spine of the hill country.',
        rewardText: '+10 legitimacy, +25 governance points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Neapolis') && ctx.helpers.controls(ctx, 'JUD', 'Sebaste'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 10, gov: 25 }),
      },
      {
        id: 'jm_freedom_of_zion', name: 'The Freedom of Zion',
        icon: 'laurel', col: 0, requires: ['jm_throw_back'],
        desc: 'Reach +25 war score against Rome — make the revolt a fact of empire.',
        rewardText: '"Year One" coinage: +15% income permanently, +15 legitimacy.',
        check: (ctx) => judWarscore(ctx) >= 25,
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JUD', {
            id: 'year_one_coinage', name: 'Year One Coinage', months: -1, effects: { incomeMult: 1.15 },
          });
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 15 });
        },
      },
      // The age's curriculum (SPEC §179): the ladders and the era ideas are
      // now objectives in their own right — two branches for the state the
      // revolt must become.
      {
        id: 'jm_roman_manner', name: 'The Roman Manner',
        icon: 'helmet', col: 3, requires: ['jm_coastal_road'],
        desc: 'Learn the enemy\'s art: reach Military 7 — The Roman Manner — as Josephus drilled Galilee.',
        rewardText: '"Drilled in the Roman Manner": +5% discipline for 24 months.',
        check: (ctx) => (((ctx.game.tags.JUD || {}).tech || {}).mar | 0) >= 7,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'roman_manner_drill', name: 'Drilled in the Roman Manner', months: 24, effects: { disciplineMult: 1.05 },
        }),
      },
      {
        id: 'jm_mind_of_the_nation', name: 'The Mind of the Nation',
        icon: 'lamp', col: 2, requires: ['jm_diaspora'],
        desc: 'Take up three ideas of the age — a revolt that thinks is a state.',
        rewardText: '+25 governance points, +15 legitimacy.',
        check: (ctx) => eraTiers(ctx.game.tags.JUD) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { gov: 25, legitimacy: 15 }),
      },
      // The war carried outward (SPEC §192): the cities that killed their
      // Jews, and the client kingdom whose towns came over one by one.
      {
        id: 'jm_decapolis', name: 'Answer the Cities',
        icon: 'amphora', col: 0, row: 3, requires: ['jm_samaria'],
        desc: 'Take Scythopolis, Gadara and Pella — the Greek cities that slaughtered '
          + 'their Jewish neighbors in the first month of the war.',
        rewardText: '+100 talents, +15 martial points.',
        check: (ctx) => ['Scythopolis', 'Gadara', 'Pella']
          .every((n) => ctx.helpers.controls(ctx, 'JUD', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { treasury: 100, mar: 15 }),
      },
      {
        id: 'jm_kings_country', name: 'The King\'s Country Rises',
        icon: 'mountain', col: 2, row: 3, requires: ['jm_coastal_road'],
        desc: 'Take Gamala and Caesarea Philippi — the client king\'s own towns, where '
          + 'Gamala has already chosen the revolt over its king.',
        rewardText: '+2,000 manpower — the Golan villages enlist.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Gamala')
          && ctx.helpers.controls(ctx, 'JUD', 'Caesarea Philippi'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { manpower: 2000 }),
      },
      // ── The roads not taken (SPEC §183) ─────────────────────────────────
      // The §119 forks, standing in the tree as hypotheticals: checks read
      // the markers the fork cards themselves set — one source of truth.
      {
        id: 'hy_house_stands', name: 'The House That Stood', hypothetical: true,
        fork: '66ce/how_the_revolt_ends',
        icon: 'temple', col: 4, row: 0,
        desc: 'Free Judaea of Rome — the war ended, no overlord, Jerusalem yours — and reach '
          + 'June of 70 with the Temple unburned. Where Josephus recorded ash, a Second '
          + 'Kingdom begins.',
        rewardText: '+1 stability, +20 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'secondKingdom'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { stability: 1, legitimacy: 20 }),
      },
      {
        id: 'hy_what_kind', name: 'What Kind of Kingdom', hypothetical: true,
        fork: '66ce/what_kind_of_kingdom',
        icon: 'scales', col: 4, row: 1, requires: ['hy_house_stands'],
        desc: 'Let the doctrine axes decide what the House that stood is FOR — the Kingdom of '
          + 'the Altar, the Commonwealth of the Chamber, or the state worth more standing. '
          + 'The question arrives once the kingdom has lived to 78.',
        rewardText: '+25 governance points.',
        check: (ctx) => anyFlag(ctx, 'kingdomOfTheAltar', 'commonwealthOfTheChamber', 'worthMoreStanding'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { gov: 25 }),
      },
      {
        id: 'hy_trajan_flank', name: 'The Flank of Trajan\'s War', hypothetical: true,
        fork: '66ce/the_flank_of_trajans_war',
        icon: 'horseshoe', col: 4, row: 2, requires: ['hy_house_stands'],
        desc: 'Keep the Second Kingdom alive to 116, when Trajan is at the Gulf and the East '
          + 'rises behind him — and a Jewish kingdom sits on the road home, with the whole '
          + 'war\'s weight in its answer.',
        rewardText: '+25 martial points, +1,500 manpower.',
        check: (ctx) => anyFlag(ctx, 'roadHeldOpen', 'roadShut', 'roseWithTheEast'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { mar: 25, manpower: 1500 }),
      },
      {
        id: 'hy_royal_robes', name: 'A King in Royal Robes', hypothetical: true,
        fork: '66ce/the_royal_robes',
        icon: 'star4', col: 4, row: 3,
        desc: 'When Menahem enters the Temple courts in royal dress (July 66), spare the '
          + 'pretender history struck down on the Ophel: arm the Sicarii and let the '
          + 'revolt keep its king of the knives — and, eventually, answer for him.',
        rewardText: '+20 martial points.',
        check: (ctx) => anyFlag(ctx, 'menahemLives'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { mar: 20 }),
      },
      {
        id: 'hy_granaries', name: 'The Sealed Granaries', hypothetical: true,
        fork: '66ce/the_granaries_of_the_city',
        icon: 'granary', col: 4, row: 4,
        desc: 'Hold Jerusalem in the faction winter (68) and do what no faction did: seal '
          + 'the stores of the city under one guard with a published ledger, so the siege, '
          + 'if it comes, besieges a city that can wait.',
        rewardText: '+1 stability, +10 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'storesSealed'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { stability: 1, legitimacy: 10 }),
      },
    ],
    ROM: [
      {
        id: 'rm_secure_coast', name: 'Secure the Coast',
        icon: 'ship',
        desc: 'Hold Caesarea Maritima and Ptolemais, and take Joppa: the sea must be Roman.',
        rewardText: '+25 martial points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ROM', 'Caesarea Maritima')
          && ctx.helpers.controls(ctx, 'ROM', 'Ptolemais')
          && ctx.helpers.controls(ctx, 'ROM', 'Joppa'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { mar: 25 }),
      },
      {
        id: 'rm_reduce_galilee', name: 'Reduce Galilee',
        icon: 'flame',
        desc: 'Take all five fortified towns of Galilee — Vespasian\'s method: the countryside first.',
        rewardText: '"Methodical Reduction": +1 siege bonus for 24 months.',
        check: (ctx) => ['Sepphoris', 'Jotapata', 'Tiberias', 'Tarichaea', 'Gischala']
          .every((n) => ctx.helpers.controls(ctx, 'ROM', n)),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ROM', {
          id: 'methodical_reduction', name: 'Methodical Reduction', months: 24, effects: { siegeBonus: 1 },
        }),
      },
      {
        id: 'rm_ring_closes', name: 'The Ring Closes',
        icon: 'tower',
        desc: 'Take Emmaus, Jericho and Lydda; no supply or sally must reach Jerusalem.',
        rewardText: 'Plunder of the approaches: +100 talents.',
        check: (ctx) => ['Emmaus', 'Jericho', 'Lydda'].every((n) => ctx.helpers.controls(ctx, 'ROM', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { treasury: 100 }),
      },
      {
        id: 'rm_jerusalem', name: 'Jerusalem Must Fall',
        icon: 'temple',
        desc: 'Take the city itself.',
        rewardText: '+15 legitimacy, +25 of every monarch point: a triumph in all but name.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ROM', 'Jerusalem'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { legitimacy: 15, gov: 25, infl: 25, mar: 25 }),
      },
      {
        id: 'rm_desert_forts', name: 'No Stone Upon Stone',
        icon: 'walls',
        desc: 'Reduce the last desert fortresses: Masada, Machaerus, Engaddi.',
        rewardText: '+1 stability — the East is quiet.',
        check: (ctx) => ['Masada', 'Machaerus', 'Engaddi'].every((n) => ctx.helpers.controls(ctx, 'ROM', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { stability: 1 }),
      },
      // The age's curriculum (SPEC §179), appended WITHOUT requires so the
      // chain stays the ladder §177 pinned — Vespasian's method was a
      // sequence, and so is what follows it: first supply, then the
      // settlement of the East.
      {
        id: 'rm_army_that_eats', name: 'An Army That Eats',
        icon: 'grain',
        desc: 'The method runs on corn: reach Government 7 — The Provisioned City.',
        rewardText: '"The Corn of Egypt": +10% manpower for 24 months.',
        check: (ctx) => (((ctx.game.tags.ROM || {}).tech || {}).gov | 0) >= 7,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ROM', {
          id: 'corn_of_egypt', name: 'The Corn of Egypt', months: 24, effects: { manpowerMult: 1.1 },
        }),
      },
      {
        id: 'rm_iudaea_capta', name: 'Iudaea Capta',
        icon: 'coins',
        desc: 'Strike the victory into the world\'s hand: take up three ideas of the age.',
        rewardText: '"Iudaea Capta" coinage: +10% income permanently, +10 legitimacy.',
        check: (ctx) => eraTiers(ctx.game.tags.ROM) >= 3,
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ROM', {
            id: 'iudaea_capta_coinage', name: 'Iudaea Capta Coinage', months: -1, effects: { incomeMult: 1.1 },
          });
          ctx.helpers.adjust(ctx, 'ROM', { legitimacy: 10 });
        },
      },
    ],
    // The last Herodian's tree (SPEC §185): a client king's war is fought at
    // court as much as in the field — keep the north, keep Rome's regard,
    // and be standing when the verdict is read.
    AGR: [
      {
        id: 'am_kings_speech', name: 'The Words in the Xystus',
        icon: 'scroll', col: 1,
        desc: 'You told Jerusalem what sixty thousand men mean. Master the arts of being heard: reach Influence 6 — The Diaspora\'s Silver.',
        rewardText: '+25 influence points, +10 legitimacy.',
        check: (ctx) => (((ctx.game.tags.AGR || {}).tech || {}).infl | 0) >= 6,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'AGR', { infl: 25, legitimacy: 10 }),
      },
      {
        id: 'am_babylonian_horse', name: 'The Babylonian Horse',
        icon: 'horseshoe', col: 0, requires: ['am_kings_speech'],
        desc: 'Zamaris\' colony holds the road for the House of Herod. Put five thousand men under the royal standards.',
        rewardText: '"Zamaris\' Colonists": +5% discipline for 24 months.',
        check: (ctx) => totalMen(ctx, 'AGR') >= 5000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'AGR', {
          id: 'zamaris_colonists', name: 'Zamaris\' Colonists', months: 24, effects: { disciplineMult: 1.05 },
        }),
      },
      {
        id: 'am_cities_nero_gave', name: 'The Cities Nero Gave',
        icon: 'ship', col: 2, requires: ['am_kings_speech'],
        desc: 'Tiberias and Tarichaea are yours by the emperor\'s own grant, and the rebels hold both. Take back the lake.',
        rewardText: 'The lake\'s revenues: +75 talents, +10 legitimacy.',
        check: (ctx) => ctx.helpers.controls(ctx, 'AGR', 'Tiberias') && ctx.helpers.controls(ctx, 'AGR', 'Tarichaea'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'AGR', { treasury: 75, legitimacy: 10 }),
      },
      {
        id: 'am_kings_country', name: 'Hold the King\'s Country',
        icon: 'mountain', col: 0, requires: ['am_babylonian_horse'],
        desc: 'Gamala watches for its moment and the Golan villages count the war\'s dead. Keep every home province under the royal standard.',
        rewardText: '+1 stability — the north answers to the king.',
        check: (ctx) => ['Caesarea Philippi', 'Batanea', 'Gamala']
          .every((n) => ctx.helpers.controls(ctx, 'AGR', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'AGR', { stability: 1 }),
      },
      {
        id: 'am_provisioned_kingdom', name: 'The Provisioned Kingdom',
        icon: 'grain', col: 1, requires: ['am_kings_country'],
        desc: 'A client is kept for what it delivers. Reach Government 7 — The Provisioned City — and deliver.',
        rewardText: '"The Granaries of Batanea": +10% manpower for 24 months.',
        check: (ctx) => (((ctx.game.tags.AGR || {}).tech || {}).gov | 0) >= 7,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'AGR', {
          id: 'granaries_of_batanea', name: 'The Granaries of Batanea', months: 24, effects: { manpowerMult: 1.1 },
        }),
      },
      {
        id: 'am_clients_curriculum', name: 'The Client\'s Curriculum',
        icon: 'lamp', col: 2, requires: ['am_cities_nero_gave'],
        desc: 'A king who survives empires studies them. Take up three ideas of the age.',
        rewardText: '+25 governance points, +10 legitimacy.',
        check: (ctx) => eraTiers(ctx.game.tags.AGR) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'AGR', { gov: 25, legitimacy: 10 }),
      },
      {
        id: 'am_outlives_the_war', name: 'A Kingdom That Outlives the War',
        icon: 'laurel', col: 1, requires: ['am_provisioned_kingdom', 'am_clients_curriculum'],
        desc: 'End the Great Revolt still seated at Caesarea Philippi — whoever won it.',
        rewardText: '"The Loyal Client": +10% income permanently, +15 legitimacy.',
        check: (ctx) => !findJudRomWar(ctx.game) && ctx.helpers.controls(ctx, 'AGR', 'Caesarea Philippi'),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'AGR', {
            id: 'loyal_client', name: 'The Loyal Client', months: -1, effects: { incomeMult: 1.1 },
          });
          ctx.helpers.adjust(ctx, 'AGR', { legitimacy: 15 });
        },
      },
      // ── The chair's own reach (SPEC §196): the reign's documented arts —
      // the queen's ledgers, the advocate's brief, and the crown he held at
      // twenty-one and traded up from.
      {
        id: 'am_queens_estates', name: 'The Queen\'s Grain Contracts',
        icon: 'amphora', col: 2, row: 3, requires: ['am_kings_speech'],
        desc: 'Berenice\'s grain sits at Besara on the Great Plain\'s edge, and Rome\'s '
          + 'quartermasters buy at the price they name. Bank 300 talents — a treasury that '
          + 'can carry the difference keeps the stewards\' machinery loyal.',
        rewardText: '"The Stewards\' Ledgers": +5% income permanently, +10 governance points.',
        check: (ctx) => ((ctx.game.tags.AGR || {}).treasury || 0) >= 300,
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'AGR', {
            id: 'stewards_ledgers', name: 'The Stewards\' Ledgers', months: -1, effects: { incomeMult: 1.05 },
          });
          ctx.helpers.adjust(ctx, 'AGR', { gov: 10 });
        },
      },
      {
        id: 'am_first_crown', name: 'The First Crown',
        icon: 'star4', col: 0, row: 3, requires: ['am_babylonian_horse'],
        desc: 'Chalcis under Lebanon was yours at twenty-one — the crown Claudius gave and the '
          + 'one you traded up from. The cousin\'s line has lapsed and the valley remembers '
          + 'Herodian rule. Take it back.',
        rewardText: '+75 talents, +15 influence points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'AGR', 'Chalcis'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'AGR', { treasury: 75, infl: 15 }),
      },
      {
        id: 'am_emperors_ear', name: 'The Emperor\'s Ear',
        icon: 'speaker', col: 1, row: 1, requires: ['am_kings_speech'],
        desc: 'The vestments won back under Claudius, the Levites\' linen argued under Nero: '
          + 'the advocate king wins in chambers what no army takes in the field. Raise Rome\'s '
          + 'regard for the house past devotion — its opinion at +180.',
        rewardText: '+25 influence points, +10 legitimacy.',
        check: (ctx) => {
          const rom = ctx.game.tags.ROM;
          return ((rom && rom.opinion && rom.opinion.AGR) || 0) >= 180;
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'AGR', { infl: 25, legitimacy: 10 }),
      },
      // ── The roads not taken (SPEC §183) ─────────────────────────────────
      {
        id: 'hy_two_crowns', name: 'Two Crowns of Israel', hypothetical: true,
        fork: '66ce/how_the_revolt_ends',
        icon: 'temple', col: 4, row: 0,
        desc: 'If the Second Kingdom stands while you still reign in the north, the land Josephus '
          + 'buried holds two Jewish crowns at once — the free one at Jerusalem and yours, the '
          + 'one that chose the empire and lived.',
        rewardText: '+1 stability, +20 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'secondKingdom')
          && !!(ctx.game.tags.AGR && ctx.game.tags.AGR.alive !== false)
          && ctx.helpers.controls(ctx, 'AGR', 'Caesarea Philippi'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'AGR', { stability: 1, legitimacy: 20 }),
      },
      {
        id: 'hy_worth_more_standing', name: 'The Kingdom Worth Keeping', hypothetical: true,
        fork: '66ce/what_kind_of_kingdom',
        icon: 'scales', col: 4, row: 1, requires: ['hy_two_crowns'],
        desc: 'Every clause of your reign argues that a client is cheaper than a province. If the '
          + 'House that stood must decide what kind of kingdom it is, you already know the '
          + 'answer you would give — wait to hear the one Jerusalem gives.',
        rewardText: '+25 governance points.',
        check: (ctx) => anyFlag(ctx, 'kingdomOfTheAltar', 'commonwealthOfTheChamber', 'worthMoreStanding'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'AGR', { gov: 25 }),
      },
      {
        id: 'hy_other_royal_robes', name: 'The Other Man in Royal Robes', hypothetical: true,
        fork: '66ce/the_royal_robes',
        icon: 'swords', col: 3, row: 0,
        desc: 'Your cavalry was driven from the palace by the man who now walks the Temple '
          + 'courts in royal dress. If Menahem keeps his crown and his knives, the age holds '
          + 'two men calling themselves king of the Jews — and only one of them was ever '
          + 'crowned by anyone.',
        rewardText: '+15 legitimacy, +10 martial points.',
        check: (ctx) => anyFlag(ctx, 'menahemLives'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'AGR', { legitimacy: 15, mar: 10 }),
      },
      {
        id: 'hy_king_of_which_jews', name: 'A King of Which Jews?', hypothetical: true,
        fork: '66ce/a_state_or_a_nation',
        icon: 'flag', col: 4, row: 2, requires: ['hy_two_crowns'],
        desc: 'Four Jews in five live under other kings — most of them under yours and the '
          + 'King of Kings\'. If the House that stood claims to speak for the whole nation, '
          + 'your own synagogues hear it; if it settles for being a state, the nation beyond '
          + 'its borders remains yours to speak for. Either answer redraws your reign.',
        rewardText: '+20 influence points, +10 governance points.',
        check: (ctx) => anyFlag(ctx, 'speakerForTheNation', 'stateNotNation'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'AGR', { infl: 20, gov: 10 }),
      },
    ],
    // The house beyond the Tigris (SPEC §185): a convert kingdom's chapter —
    // feed the west, keep the King of Kings sweet, and weigh the yoke.
    ADI: [
      {
        id: 'dm_queens_granaries', name: 'The Queen\'s Granaries',
        icon: 'grain', col: 1,
        desc: 'Helena bought Egyptian grain for a starving Jerusalem within living memory. Fill the treasury to 150 talents — the house must be able to feed the west again.',
        rewardText: '"Helena\'s Charity": +10% growth for 24 months, +10 legitimacy.',
        check: (ctx) => ((ctx.game.tags.ADI || {}).treasury || 0) >= 150,
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ADI', {
            id: 'helenas_charity', name: 'Helena\'s Charity', months: 24, effects: { growthMult: 1.1 },
          });
          ctx.helpers.adjust(ctx, 'ADI', { legitimacy: 10 });
        },
      },
      {
        id: 'dm_princes_ride', name: 'The Princes Ride West',
        icon: 'horseshoe', col: 0, requires: ['dm_queens_granaries'],
        desc: 'Kinsmen of Monobazus fought at the ascent of Beth Horon. Stand openly with Jerusalem — at war with Rome, or its court\'s devoted friend.',
        rewardText: '"The Princes at the Ascent": +10% morale for 24 months, +25 martial points.',
        check: (ctx) => {
          const g = ctx.game;
          const adi = g.tags.ADI || {};
          const jud = g.tags[(g.tagAliases && g.tagAliases.JUD) || 'JUD'];
          return (adi.atWarWith || []).indexOf('ROM') >= 0
            || ((jud && jud.opinion && jud.opinion.ADI) || 0) >= 100;
        },
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ADI', {
            id: 'princes_at_the_ascent', name: 'The Princes at the Ascent', months: 24, effects: { moraleMult: 1.1 },
          });
          ctx.helpers.adjust(ctx, 'ADI', { mar: 25 });
        },
      },
      {
        id: 'dm_northern_tolls', name: 'The Tolls of the Gulf Road',
        icon: 'coins', col: 2, requires: ['dm_queens_granaries'],
        desc: 'Silk and spices cross the Tigris at your fords. Bank 300 talents of the road\'s custom.',
        rewardText: '"The Northern Tolls": +10% trade permanently.',
        check: (ctx) => ((ctx.game.tags.ADI || {}).treasury || 0) >= 300,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ADI', {
          id: 'northern_tolls', name: 'The Northern Tolls', months: -1, effects: { tradeMult: 1.1 },
        }),
      },
      {
        id: 'dm_school_at_nisibis', name: 'The School at Nisibis',
        icon: 'lamp', col: 2, requires: ['dm_northern_tolls'],
        desc: 'Judah ben Bathyra teaches at Nisibis, and a kingdom that keeps the Law must learn to read it: reach Government 6 — The Korban Treasury.',
        rewardText: '+25 governance points, +10 legitimacy.',
        check: (ctx) => (((ctx.game.tags.ADI || {}).tech || {}).gov | 0) >= 6,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { gov: 25, legitimacy: 10 }),
      },
      {
        id: 'dm_wisdom_of_rivers', name: 'The Wisdom of Two Rivers',
        icon: 'scroll', col: 1, requires: ['dm_queens_granaries'],
        desc: 'A court that prays toward Jerusalem and bows toward Ctesiphon needs every art of both. Take up three ideas of the age.',
        rewardText: '+25 influence points.',
        check: (ctx) => eraTiers(ctx.game.tags.ADI) >= 3,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { infl: 25 }),
      },
      {
        id: 'dm_yoke_weighed', name: 'The Yoke, Weighed',
        icon: 'scales', col: 0, requires: ['dm_princes_ride'],
        desc: 'A client house ends one of two ways: devoted beyond suspicion, or free. Reach the King of Kings\' full regard — or stand without an overlord.',
        rewardText: '+15 legitimacy, +25 martial points.',
        check: (ctx) => {
          const g = ctx.game;
          const adi = g.tags.ADI || {};
          const par = g.tags.PAR;
          return !adi.overlord || ((par && par.opinion && par.opinion.ADI) || 0) >= 120;
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { legitimacy: 15, mar: 25 }),
      },
      // ── The chair's own reach (SPEC §196): the deeds Josephus credits the
      // house with — the escort of the half-shekel, the tombs by Jerusalem —
      // and the lances a convert kingdom keeps beyond its tribute-book.
      {
        id: 'dm_riders_of_two_rivers', name: 'The Riders of the Two Rivers',
        icon: 'spears', col: 0, row: 3, requires: ['dm_princes_ride'],
        desc: 'Kenedaeus and the kinsmen of Monobazus charged at Beth Horon with the men they '
          + 'brought themselves. Arm the house beyond its tribute-book — eight thousand under '
          + 'the standards, and the King of Kings can count them however he likes.',
        rewardText: '"The Convert Lances": +5% discipline for 24 months, +1,000 manpower.',
        check: (ctx) => totalMen(ctx, 'ADI') >= 8000,
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ADI', {
            id: 'convert_lances', name: 'The Convert Lances', months: 24, effects: { disciplineMult: 1.05 },
          });
          ctx.helpers.adjust(ctx, 'ADI', { manpower: 1000 });
        },
      },
      {
        id: 'dm_treasure_house', name: 'The Treasure-Houses of the Half-Shekel',
        icon: 'market', col: 2, row: 3, requires: ['dm_northern_tolls'],
        desc: 'Babylonia banks its Temple silver at Nehardea and Nisibis until the escort of '
          + 'ten thousands can ride. Hold both treasure-cities, and the dispersion\'s '
          + 'half-shekels cross under the house\'s own guard from strongroom to gate.',
        rewardText: '"The Escort of the Ascents": +5% income permanently, +10 governance points.',
        check: (ctx) => ['Nehardea', 'Nisibis']
          .every((n) => ctx.helpers.controls(ctx, 'ADI', n)),
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ADI', {
            id: 'escort_of_the_ascents', name: 'The Escort of the Ascents', months: -1, effects: { incomeMult: 1.05 },
          });
          ctx.helpers.adjust(ctx, 'ADI', { gov: 10 });
        },
      },
      {
        id: 'dm_tombs_of_kings', name: 'The Tombs of the Kings',
        icon: 'temple', col: 1, row: 2, requires: ['dm_princes_ride'],
        desc: 'Helena\'s pyramids stand three stadia north of Jerusalem\'s wall, and the bones '
          + 'of the queen and her son traveled west to fill them. Raise the house\'s '
          + 'legitimacy to 80 — a covenant made stone outlasts every court that doubts it.',
        rewardText: '"The Pyramids North of the Wall": +0.1 legitimacy a month permanently.',
        check: (ctx) => {
          const g = ctx.game;
          const jud = g.tags[(g.tagAliases && g.tagAliases.JUD) || 'JUD'];
          return !!(jud && jud.alive) && ((g.tags.ADI || {}).legitimacy || 0) >= 80;
        },
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ADI', {
          id: 'pyramids_north_of_the_wall', name: 'The Pyramids North of the Wall',
          months: -1, effects: { legitimacyAdd: 0.1 },
        }),
      },
      // ── The roads not taken (SPEC §183) ─────────────────────────────────
      {
        id: 'hy_grain_ships', name: 'The Grain Ships Come Again', hypothetical: true,
        fork: '66ce/how_the_revolt_ends',
        icon: 'temple', col: 4, row: 0,
        desc: 'If the Second Kingdom stands, the house that fed Jerusalem in the famine feeds a '
          + 'free city in its triumph — Helena\'s road from the Tigris to the Temple courts, '
          + 'open in both directions at last.',
        rewardText: '+50 talents, +15 legitimacy.',
        check: (ctx) => anyFlag(ctx, 'secondKingdom')
          && !!(ctx.game.tags.ADI && ctx.game.tags.ADI.alive !== false),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { treasury: 50, legitimacy: 15 }),
      },
      {
        id: 'hy_road_past_arbela', name: 'The Road Home Runs Past Arbela', hypothetical: true,
        fork: '66ce/the_flank_of_trajans_war',
        icon: 'horseshoe', col: 4, row: 1, requires: ['hy_grain_ships'],
        desc: 'If a Jewish kingdom sits on Trajan\'s road home, the army that took Ctesiphon '
          + 'must march back through the Tigris kingdoms — and the house of the converts '
          + 'holds a ford on that road, with the whole war\'s weight in its answer.',
        rewardText: '+25 martial points, +1,000 manpower.',
        check: (ctx) => anyFlag(ctx, 'roadHeldOpen', 'roadShut', 'roseWithTheEast'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { mar: 25, manpower: 1000 }),
      },
      {
        id: 'hy_city_never_starved', name: 'The City That Never Starved', hypothetical: true,
        fork: '66ce/the_granaries_of_the_city',
        icon: 'granary', col: 3, row: 0,
        desc: 'The house bought Jerusalem out of one famine with Egyptian grain and Cypriot '
          + 'figs. If the stores are sealed under one guard before the torches reach them, '
          + 'the siege Josephus starved through never happens — and the queen\'s charity '
          + 'becomes the city\'s own habit, kept without her.',
        rewardText: '+50 talents, +15 governance points.',
        check: (ctx) => anyFlag(ctx, 'storesSealed'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ADI', { treasury: 50, gov: 15 }),
      },
    ],
  },

  aiHints: {
    ROM: { rally: ['Antioch', 'Caesarea Maritima'], targetRegiments: 45 },
    JUD: { rally: ['Jerusalem', 'Jotapata'], targetRegiments: 28 },
    AGR: { rally: ['Caesarea Philippi'], targetRegiments: 5 },
    NAB: { rally: ['Petra'], targetRegiments: 8 },
    PAR: { rally: ['Seleucia-Ctesiphon'], targetRegiments: 22 },
    ARM: { rally: ['Tigranocerta'], targetRegiments: 4 },
    OSR: { rally: ['Edessa'], targetRegiments: 5 },
    ADI: { rally: ['Arbela'], targetRegiments: 7 },
    CHX: { rally: ['Charax'], targetRegiments: 4 },
    REB: { rally: [], targetRegiments: 0 },
  },

  // Victory rules (SPEC §9.1), checked monthly; game.over stops further checks.
  checkVictory(ctx) {
    try {
      const g = ctx.game;
      const h = ctx.helpers;
      if (!g || g.over || g.result) return; // result stays set after "continue observing"

      const judTag = g.tags && g.tags[who(ctx, 'JUD')];
      const judAlive = !!(judTag && judTag.alive !== false);
      const judProvs = judAlive ? h.countControlled(ctx, 'JUD', {}) : 0;
      const jerusalemHeld = judAlive && h.controls(ctx, 'JUD', 'Jerusalem');
      const ws = judWarscore(ctx);

      if (g.playerTag === who(ctx, 'JUD')) {
        // Early concession (SPEC §32): Rome OFFERS peace at +50 — an event
        // card the player may accept or refuse. Offered once.
        if (ws >= 50 && !h.getFlag(ctx, 'romeTermsOffered')) {
          h.setFlag(ctx, 'romeTermsOffered', true);
          h.fireEvent(ctx, 'ev_rome_sues');
          return;
        }
        // Timed win: on (or after) 1 January 71, Jerusalem plus a living Jewish heartland.
        // If the House burned during a Roman interlude, the win stands but the text
        // and score must not pretend otherwise.
        if (dateGE(g.date, 71, 1) && jerusalemHeld
            && h.countControlled(ctx, 'JUD', { religion: 'judaism' }) >= 6) {
          const burned = !!h.getFlag(ctx, 'templeBurned');
          fireEventById(ctx, 'ev_negotiated_peace');
          h.endGame(ctx, {
            result: 'win',
            title: burned ? 'A Peace Among Ashes' : 'A Negotiated Peace',
            text: burned
              ? 'Vespasian is secure on his throne and counting the cost of a fifth year of '
                + 'war. A client Judaea — tributary, disarmed at the frontiers, but standing — '
                + 'is cheaper than three legions in perpetuity. The city is held; the sanctuary '
                + 'is in ashes. On the Temple Mount, men clear the stones and remember.'
              : 'Vespasian is secure on his throne and counting the cost of a fifth year of '
                + 'war. A client Judaea — tributary, disarmed at the frontiers, but standing — '
                + 'is cheaper than three legions in perpetuity. The Temple stands. The war ends.',
            score: burned ? 100 : 150,
          });
          return;
        }
        // Losses.
        if (judProvs === 0) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'Judaea Capta',
            text: 'The last stronghold has fallen. In Rome they will strike a coin: a woman '
              + 'weeping beneath a palm tree, a soldier standing over her. IVDAEA CAPTA.',
            score: 0,
          });
          return;
        }
        if (!jerusalemHeld && totalMen(ctx, 'JUD') < 3000) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The Lamps Go Out',
            text: 'Jerusalem is lost and the field armies are gone; what remains is a handful '
              + 'of men on desert rocks, and the long memory of a people. At Yavneh, the sages '
              + 'begin again.',
            score: Math.max(0, judProvs * 5),
          });
          return;
        }
      } else if (g.playerTag === 'ROM') {
        if (judProvs === 0) {
          const early = g.date.y < 70;
          h.endGame(ctx, {
            result: 'win',
            title: early ? 'A Triumph in Rome' : 'Judaea Capta',
            text: early
              ? 'The revolt is crushed before the empire even trembled. The Senate votes a '
                + 'triumph: the spoils of the Temple carried up the Sacred Way, and the arch '
                + 'to prove it forever.'
              : 'It took years and legions, but the rebellion is ended and the east is quiet. '
                + 'The mint strikes IVDAEA CAPTA in bronze, silver, and gold.',
            score: early ? 200 : 120,
          });
          return;
        }
        if (dateGE(g.date, 74, 1) && jerusalemHeld) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The East in Flames',
            text: 'Eight years, and Jerusalem still stands defiant behind its walls while '
              + 'Parthia arms and the provinces whisper. The emperor recalls his commanders '
              + 'in disgrace and accepts what no Roman will call a defeat — aloud.',
            score: 0,
          });
          return;
        }
      } else if (g.playerTag === who(ctx, 'AGR')) {
        // The client's contract (SPEC §185): be standing, at home, when the
        // verdict is read — however the verdict goes.
        const agrTag = g.tags[who(ctx, 'AGR')];
        const agrAlive = !!(agrTag && agrTag.alive !== false);
        const agrProvs = agrAlive ? h.countControlled(ctx, 'AGR', {}) : 0;
        const seated = agrAlive && h.controls(ctx, 'AGR', 'Caesarea Philippi');
        if (agrProvs === 0) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The Last Herodian',
            text: 'The kingdom is gone — to the rebels, to the province, it no longer matters '
              + 'which. A hundred years after the Senate named his great-grandfather king, '
              + 'the House of Herod ends as it began: in Rome, at dinner, telling stories.',
            score: 0,
          });
          return;
        }
        if (!seated && totalMen(ctx, 'AGR') < 1000) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'A King Without a Country',
            text: 'Caesarea Philippi is lost and the Babylonian horse is scattered. Rome will '
              + 'find you an income and a title; it will not find you a kingdom. The client '
              + 'who could not hold his own north has told the empire what clients are for.',
            score: Math.max(0, agrProvs * 5),
          });
          return;
        }
        if (dateGE(g.date, 71, 1) && seated && agrProvs >= 3) {
          const lakeToo = h.controls(ctx, 'AGR', 'Tiberias') && h.controls(ctx, 'AGR', 'Tarichaea');
          h.endGame(ctx, {
            result: 'win',
            title: lakeToo ? 'The Kingdom Enlarged' : 'The Kingdom Kept',
            text: lakeToo
              ? 'The war is decided and the last Herodian is still a king — with the lake '
                + 'towns under his standard and the emperor in his debt. Vespasian pays the '
                + 'loyalty of 66 in territory, and the kingdom in the north grows larger than '
                + 'anything his father ruled.'
              : 'The war is decided and the last Herodian is still a king. The home provinces '
                + 'held, the horse rode where it was asked, and the empire has learned again '
                + 'what a loyal client is worth. The kingdom keeps its crown for as long as '
                + 'its king keeps breathing — which is the only tenure the age offers anyone.',
            score: lakeToo ? 150 : 110,
          });
          return;
        }
      } else if (g.playerTag === who(ctx, 'ADI')) {
        // The convert kingdom's contract (SPEC §185): the house endures the
        // war that burned the west — freer or richer than it began.
        const adiTag = g.tags[who(ctx, 'ADI')];
        const adiAlive = !!(adiTag && adiTag.alive !== false);
        const adiProvs = adiAlive ? h.countControlled(ctx, 'ADI', {}) : 0;
        if (adiProvs === 0) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The Fall of the House of Monobazus',
            text: 'Arbela is taken and the converts\' kingdom is erased. In Jerusalem the tomb '
              + 'Helena built stands over an empty title; whatever the letters cost, nobody '
              + 'will write from Adiabene again.',
            score: 0,
          });
          return;
        }
        if (dateGE(g.date, 71, 1) && adiAlive && h.controls(ctx, 'ADI', 'Arbela')) {
          const free = !adiTag.overlord;
          const judStands = judAlive && judProvs > 0;
          h.endGame(ctx, {
            result: 'win',
            title: free ? 'A Crown Without a Yoke' : 'The House Between the Rivers',
            text: (free
              ? 'The house of Monobazus ends the war owing tribute to nobody: the King of '
                + 'Kings\' writ stops at the Zab, and the tolls of the Gulf Road pay a free '
                + 'crown. '
              : 'The house of Monobazus is still seated at Arbela when the war\'s verdict is '
                + 'read — client, convert, and unburned. ')
              + (judStands
                ? 'And the road west still ends somewhere: Judaea lives, and the grain ships '
                  + 'of the queen\'s house sail again.'
                : 'The road west now ends at a ruin — and the house that fed Jerusalem keeps '
                  + 'its faith in a world that burned the address.'),
            score: 100 + (free ? 40 : 0) + (judStands ? 20 : 0),
          });
          return;
        }
      }
    } catch (e) { warnOnce('checkVictory', e); }
  },
};
