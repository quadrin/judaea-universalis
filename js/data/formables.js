// js/data/formables.js — formable nations (SPEC §22). DOM-free data.
// When a court fulfills the requirements of a greater crown, it may take a new
// tag outright — EU4's "form nation": the whole realm (provinces, armies, wars,
// opinions, truces) transfers to the new identity via switchTagCore, national
// ideas rebuild from the new tag's, and history is chronicled. Requirements
// are checked live through ctx; effects run through ctx.helpers at runtime.

// A formable with `ai: true` may be taken by an AI court the month it
// qualifies. The four dynastic restorations ship player-only: the 67/40 BCE
// event chains reference HYR/ARI/HER/ATG by tag, and an AI re-branding
// mid-arc would orphan the story (Aristobulus once formed Hasmonean Judaea
// the moment Pompey made his brother a client — legitimate, and chaos).

function broken(ctx, tag) {
  const t = ctx.game.tags[tag];
  if (!t || t.alive === false) return true; // gone
  if (t.overlord) return true; // bent the knee
  return ctx.helpers.countControlled(ctx, tag, {}) <= 3; // a rump
}

function atPeace(ctx, tag) {
  const t = ctx.game.tags[tag];
  if (!t) return false;
  return !(t.atWarWith || []).some((e) => ctx.game.tags[e] && ctx.game.tags[e].alive);
}

function independent(ctx, tag) {
  const t = ctx.game.tags[tag];
  return !!t && !t.overlord;
}

function ownsAndControls(ctx, tag, names) {
  return names.every((name) => {
    const p = ctx.prov(name);
    return !!p && p.owner === tag && p.controller === tag;
  });
}

function ownedControlledCount(ctx, tag, religion) {
  return ctx.game.provinces.filter((p) => p && !p.impassable
    && p.owner === tag && p.controller === tag
    && (!religion || p.religion === religion)).length;
}

// ---- what a crown is worth, and what it then asks of you (SPEC §102) --------
// A formed nation used to hand out the same +10% income and +5% morale
// whatever it was. These are the specific payoffs of specific crowns — coin,
// men, ministries, and a second permanent modifier that says what this
// particular kingdom is FOR — plus a chain of missions addressed to the new
// identity, so proclaiming a kingdom fills the panel instead of emptying it.
// HOLD means hold (SPEC §259): owned and controlled, not merely stood in.
// These are mission predicates, and a mission chain is a list of things the
// realm has become — an occupation in an unfinished war is a bargaining chip
// the treaty may hand straight back, so it buys no medallion until the peace
// makes it ownership. (`checkMissions` reads every chain through the same
// rule; this says it in the file where the word is written.)
function holds(ctx, tag, name) {
  return typeof ctx.helpers.holds === 'function'
    ? ctx.helpers.holds(ctx, tag, name)
    : ctx.helpers.controls(ctx, tag, name);
}
function ownedCount(ctx, tag, religion) {
  return ctx.game.provinces.filter((p) => p && !p.impassable
    && p.owner === tag && p.controller === tag
    && (!religion || p.religion === religion)).length;
}
function menOf(ctx, tag) {
  try { return ctx.helpers.armiesOf(ctx, tag).reduce((s, a) => s + ((a && a.men) || 0), 0); }
  catch (e) { return 0; }
}
function devOf(ctx, tag) {
  let dev = 0;
  for (const p of ctx.game.provinces) {
    if (!p || p.impassable || p.owner !== tag) continue;
    dev += (p.dev ? (p.dev.tax || 0) + (p.dev.prod || 0) + (p.dev.mp || 0) : 0);
  }
  return dev;
}

// ---- what a chapter's own missions ask after (SPEC §189) --------------------
// Province names are the canon keys the map ships with; a chapter that renames
// one for its era (Straton's Tower, Shechem) renames the LABEL, so the checks
// go on saying Caesarea Maritima and the prose says what the age said.
function holdsAll(ctx, tag, names) { return names.every((n) => holds(ctx, tag, n)); }
function treasuryOf(ctx, tag) {
  const t = ctx.game.tags[tag];
  return (t && t.treasury) || 0;
}
function stabilityOf(ctx, tag) {
  const t = ctx.game.tags[tag];
  return (t && t.stability) || 0;
}
// a's opinion OF b — the table lives on the holder of the opinion.
function opinionOf(ctx, a, b) {
  const t = ctx.game.tags[a];
  return (t && t.opinion && t.opinion[b]) || 0;
}
function atWarBetween(ctx, a, b) {
  const t = ctx.game.tags[a];
  return !!t && (t.atWarWith || []).indexOf(b) >= 0;
}
function atPeaceBetween(ctx, a, b) {
  return !atWarBetween(ctx, a, b) && !atWarBetween(ctx, b, a);
}
function allied(ctx, a, b) {
  const ta = ctx.game.tags[a];
  const tb = ctx.game.tags[b];
  return !!((ta && (ta.allies || []).indexOf(b) >= 0)
    || (tb && (tb.allies || []).indexOf(a) >= 0));
}
// Where a diaspora community's standing sits (SPEC §172); an untouched one has
// not been seeded yet, and reads as nothing rather than as its opening value.
function standingAt(ctx, name) {
  const p = ctx.prov && ctx.prov(name);
  // Filed per crown since SPEC §216 (two Jewish states may be played at one
  // table, and Alexandria's warmth toward one is not its warmth toward the
  // other). A zero-import package reads the record of the crown that is asking.
  const rec = p && p.dia && p.dia.by && p.dia.by[ctx.game.playerTag];
  return rec && Number.isFinite(rec.standing) ? rec.standing : 0;
}
function templeStands(ctx) {
  if (ctx.game.flags && ctx.game.flags.templeBurned) return false;
  const p = ctx.prov && ctx.prov('Jerusalem');
  return !!p && p.wonder === 'temple';
}
// SPEC §32's House, paid for by the crown rather than by the chapter's own
// side. A Mount that is already built on is endowed, not billed twice.
function raiseTheThirdHouse(ctx) {
  const p = ctx.prov && ctx.prov('Jerusalem');
  if (!p || p.wonder !== 'temple') {
    ctx.helpers.adjust(ctx, 'MLI', { treasury: -300 });
    if (p) p.wonder = 'temple';
  }
  ctx.helpers.adjust(ctx, 'MLI', { legitimacy: 20, gov: 25 });
}

// ---- the Kingdom of Israel's own programme (SPEC §189) ----------------------
// The crown is formable in six chapters, and until now it read the same four
// missions in all of them: settle the crown, muster the kingdom, hold the
// land, build rather than merely hold. Those four are what a kingdom does
// whenever it is proclaimed and they stay the SPINE of every chapter's tree.
// What they could not say is which age the proclamation happened in — and the
// ages ask sharply different things. A crown raised out of the Maccabean
// rising has a Seleucid throne to finish and a Republic to keep sweet; the
// same crown in 132 has a Roman colony to unmake and a bare Mount; in 614 it
// has Babylonia's Exilarch on one side and the empty desert road on the other.
//
// So each chapter adds a BRANCH of three, hanging off the crowning. A mission
// that declares `chapters` is offered only there (`chapterChain`, realm.js);
// one that declares none is offered in all six. Seats: the spine holds cols
// 0-1, every branch takes cols 2-3, so no chapter's tree collides.
const MLI_SPINE = [
  {
    id: 'mli_the_crowning', name: 'The Crown Set Down',
    icon: 'star8', col: 1, row: 0,
    desc: 'Settle the realm under the new crown: stability 2 and a court that is not at war '
      + 'with itself (no pretender in the field).',
    rewardText: '"The Crown Settled": +10% income and −0.5 unrest everywhere permanently.',
    check: (ctx) => (ctx.game.tags.MLI && (ctx.game.tags.MLI.stability || 0) >= 2)
      && !(ctx.game.pretenders && ctx.game.pretenders.MLI),
    reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'crown_settled', name: 'The Crown Settled', months: -1,
      effects: { incomeMult: 1.1, unrestAll: -0.5 },
    }),
  },
  {
    id: 'mli_the_muster', name: 'The Muster of Israel',
    icon: 'spears', col: 0, row: 1, requires: ['mli_the_crowning'],
    desc: 'Put 42,000 men under the kingdom\'s own banner.',
    rewardText: '+95 martial points and "The King\'s Own": +8% discipline permanently.',
    check: (ctx) => menOf(ctx, 'MLI') >= 42000,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { mar: 95 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'kings_own', name: "The King's Own", months: -1, effects: { disciplineMult: 1.08 },
      });
    },
  },
  {
    id: 'mli_the_land', name: 'The Land of the Twelve',
    icon: 'grain', col: 1, row: 1, requires: ['mli_the_crowning'],
    desc: 'Thirty provinces under the crown, twenty of them keeping the Law.',
    rewardText: '+300 talents and "The Kingdom Whole": +12% manpower, permanent.',
    check: (ctx) => ownedCount(ctx, 'MLI') >= 30 && ownedCount(ctx, 'MLI', 'judaism') >= 20,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { treasury: 300 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'kingdom_whole', name: 'The Kingdom Whole', months: -1, effects: { manpowerMult: 1.12 },
      });
    },
  },
  {
    id: 'mli_the_house', name: 'The House of the Name',
    icon: 'bricks', col: 1, row: 2, requires: ['mli_the_land'],
    desc: 'Build the realm rather than merely holding it: 260 points of development under the '
      + 'crown.',
    rewardText: '"The Builders": +8% income and +0.2 public belief a month, permanent.',
    check: (ctx) => devOf(ctx, 'MLI') >= 260,
    reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'the_builders', name: 'The Builders', months: -1,
      effects: { incomeMult: 1.08, legitimacyAdd: 0.2 },
    }),
  },

  // ── The kingdom after the crowning (SPEC §211) ────────────────────────────
  // Four rungs and a branch was what a player got for doing the hardest thing
  // in the game: the greater crown SHRANK the objectives panel from the
  // chapter's twenty-odd to seven. These five deepen the spine itself — the
  // things a united monarchy does in any century — and they read relative to
  // the age (`techAbove`) rather than naming a rung number that means
  // different things four hundred years apart.
  {
    id: 'mli_the_fortresses', name: 'The Fortresses of the Kingdom',
    icon: 'tower', col: 0, row: 2, requires: ['mli_the_muster'],
    desc: 'Take the age\'s war-craft two rungs past the baseline it began with.',
    rewardText: '"The King\'s Engineers": +12% siege progress and +1 to hill-country '
      + 'defense, permanent.',
    check: (ctx) => marAbove(ctx, 'MLI', 2),
    reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'the_kings_engineers', name: "The King's Engineers", months: -1,
      effects: { siegeMult: 1.12, hillDefBonus: 1 },
    }),
  },
  {
    id: 'mli_the_standing_host', name: 'The Standing Host',
    icon: 'helmet', col: 0, row: 3, requires: ['mli_the_fortresses'],
    desc: 'Keep 63,000 men on the rolls, half again the muster — a levy goes home at harvest '
      + 'and a standing host does not.',
    rewardText: '+95 martial points and "The Host That Does Not Go Home": +6% morale and '
      + '+10% reinforcement, permanent.',
    check: (ctx) => menOf(ctx, 'MLI') >= 63000,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { mar: 95 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'host_that_stays', name: 'The Host That Does Not Go Home', months: -1,
        effects: { moraleMult: 1.06, reinforceMult: 1.1 },
      });
    },
  },
  {
    id: 'mli_the_kings_peace', name: "The King's Peace",
    icon: 'dove', col: 0, row: 4, requires: ['mli_the_standing_host'],
    desc: 'Stand at war with nobody, with the realm steady at stability +3 — a peace the crown '
      + 'chose rather than one it was handed.',
    rewardText: '"The Nine Quiet Years": +12% income, +10% development growth and −0.5 '
      + 'unrest everywhere, permanent.',
    check: (ctx) => atPeace(ctx, 'MLI') && stabilityOf(ctx, 'MLI') >= 3,
    reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'the_quiet_years', name: 'The Nine Quiet Years', months: -1,
      effects: { incomeMult: 1.12, growthMult: 1.1, unrestAll: -0.5 },
    }),
  },
  {
    id: 'mli_the_succession', name: 'The Succession Settled',
    icon: 'scales', col: 1, row: 3, requires: ['mli_the_house'],
    desc: 'Seat an heir with the realm behind him: legitimacy 80 and a named successor.',
    rewardText: '+70 governance points and "The Line Assured": +0.3 legitimacy a month '
      + 'and −0.5 unrest everywhere, permanent.',
    check: (ctx) => {
      const t = ctx.game.tags.MLI;
      return !!(t && t.heir) && (t && (t.legitimacy || 0)) >= 80;
    },
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { gov: 70 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_line_assured', name: 'The Line Assured', months: -1,
        effects: { legitimacyAdd: 0.3, unrestAll: -0.5 },
      });
    },
  },
  {
    id: 'mli_the_ingathering', name: 'The Ingathering',
    icon: 'diaspora', col: 1, row: 4, requires: ['mli_the_succession'],
    desc: 'Thirty provinces under the crown keeping the Law — the difference between a Jewish '
      + 'state and a state with a Jewish crown.',
    rewardText: '+10,000 manpower and "The Gathered In": +10% manpower and +0.2 legitimacy '
      + 'a month, permanent.',
    check: (ctx) => ownedCount(ctx, 'MLI', 'judaism') >= 30,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { manpower: 10000 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_gathered_in', name: 'The Gathered In', months: -1,
        effects: { manpowerMult: 1.1, legitimacyAdd: 0.2 },
      });
    },
  },

  // ── The civil band (SPEC §211) ────────────────────────────────────────────
  // §211 gave every chapter's own side three strands beside its war; the
  // crown, which is a chapter's side too the moment it is proclaimed, was the
  // one tree the pass never reached. Same grammar: col 0 the government, col 1
  // the region, col 2 the court, every root workable from the day of the
  // crowning. The court strand asks the WHOLE court rather than naming an
  // estate, because a formed crown inherits whichever one its chapter had.
  {
    id: 'mli_civil_arts_of_rule', name: 'The Arts of the Kingdom',
    icon: 'quill', civil: 'govt', col: 0, row: 5,
    desc: 'Carry all three of the age\'s ladders two rungs past the baseline this chapter '
      + 'opened with.',
    rewardText: '"The Kingdom\'s Own Clerks": administration costs −12% and +8% income, '
      + 'permanent.',
    check: (ctx) => techAbove(ctx, 'MLI', 2),
    reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'the_kingdoms_clerks', name: "The Kingdom's Own Clerks", months: -1,
      effects: { adminMult: 0.88, incomeMult: 1.08 },
    }),
  },
  {
    id: 'mli_civil_built_kingdom', name: 'The Kingdom Built',
    icon: 'bricks', civil: 'govt', col: 0, row: 6, requires: ['mli_civil_arts_of_rule'],
    desc: 'Carry 400 points of development with 900 talents still banked — a realm that '
      + 'built the roads AND can pay for the year after it built them.',
    rewardText: '+400 talents and "The Wealth of the Kingdom": +12% income, +10% trade '
      + 'and +8% development growth, permanent.',
    check: (ctx) => devOf(ctx, 'MLI') >= 400 && treasuryOf(ctx, 'MLI') >= 900,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { treasury: 400 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'wealth_of_the_kingdom', name: 'The Wealth of the Kingdom', months: -1,
        effects: { incomeMult: 1.12, tradeMult: 1.1, growthMult: 1.08 },
      });
    },
  },
  {
    id: 'mli_civil_among_the_powers', name: 'Among the Powers',
    icon: 'flag', civil: 'region', col: 1, row: 5,
    desc: 'Stand among the world\'s first five courts — the standing the realm panel keeps, '
      + 'which counts revenue.',
    rewardText: '+95 influence points and "Written To as a Power": +1 diplomatic seat '
      + 'and +1 deterrence, permanent.',
    check: (ctx) => {
      const i = standingRank(ctx, 'MLI');
      return i >= 0 && i < 5;
    },
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { infl: 95 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'written_to_as_a_power_mli', name: 'Written To as a Power', months: -1,
        effects: { diploSeats: 1, deterrent: 1 },
      });
    },
  },
  {
    id: 'mli_civil_the_bonds', name: 'The Bonds of the Crown',
    icon: 'scroll', civil: 'region', col: 1, row: 6, requires: ['mli_civil_among_the_powers'],
    desc: 'Hold two alliances, or two crowns owing this one fealty — the difference between a '
      + 'kingdom the powers respect and a kingdom the powers are arranged.',
    rewardText: '+70 influence points and "The Web of the Kingdom": +8% trade and '
      + '+0.2 legitimacy a month, permanent.',
    check: (ctx) => alliesOf(ctx, 'MLI') >= 2 || clientsOf(ctx, 'MLI') >= 2,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { infl: 70 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_web_of_the_kingdom', name: 'The Web of the Kingdom', months: -1,
        effects: { tradeMult: 1.08, legitimacyAdd: 0.2 },
      });
    },
  },
  {
    id: 'mli_civil_the_whole_court', name: 'The Whole Court Standing',
    icon: 'speaker', civil: 'court', col: 2, row: 5,
    desc: 'Bring every estate in the room to 60 approval at once.',
    rewardText: '+40 legitimacy and "The Court United": −0.75 unrest everywhere and '
      + '+0.25 legitimacy a month, permanent.',
    check: (ctx) => courtFloor(ctx, 'MLI', 60),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { legitimacy: 40 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_court_united', name: 'The Court United', months: -1,
        effects: { unrestAll: -0.75, legitimacyAdd: 0.25 },
      });
    },
  },
  {
    id: 'mli_civil_favor_banked', name: 'The Crown Owes Nobody',
    icon: 'coins', civil: 'court', col: 2, row: 6, requires: ['mli_civil_the_whole_court'],
    desc: 'Bank forty with every estate at once, and the kingdom can spend a court session on '
      + 'something other than keeping the court.',
    rewardText: '+95 governance points and "The Crown\'s Credit": +10% manpower and '
      + '+8% income, permanent.',
    check: (ctx) => favorFloor(ctx, 'MLI', 40),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { gov: 95 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_crowns_credit', name: "The Crown's Credit", months: -1,
        effects: { manpowerMult: 1.1, incomeMult: 1.08 },
      });
    },
  },
];

// ---- 167 BCE: the rising that became a kingdom ------------------------------
// The Maccabean chapter's own three. 1 Macc 13:41 dates the freedom: "the yoke
// of the gentiles was taken away from Israel, and the people began to write in
// their instruments and contracts, In the first year of Simon"; 14:5 has the
// harbour ("he took Joppa for a haven, and made an entrance to the isles of
// the sea"); and 8:17-32 has the embassy to a Republic that had beaten Antiochus'
// father and would put the answer on bronze.
const MLI_167 = [
  {
    id: 'mli_167_yoke', name: 'The Yoke Taken Away',
    icon: 'laurel', col: 2, row: 1, chapters: ['167bce'], requires: ['mli_the_crowning'],
    desc: 'Finish the throne that decreed the persecution: the Seleucid kingdom dead, bent to '
      + 'us as a client, or a rump of three.',
    rewardText: '+30 legitimacy and "The Yoke Taken Away": −0.5 unrest everywhere and '
      + '+0.2 public belief a month, permanent.',
    check: (ctx) => broken(ctx, 'SEL') && holds(ctx, 'MLI', 'Jerusalem'),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { legitimacy: 30 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'yoke_taken_away', name: 'The Yoke Taken Away', months: -1,
        effects: { unrestAll: -0.5, legitimacyAdd: 0.2 },
      });
    },
  },
  {
    id: 'mli_167_isles', name: 'An Entrance to the Isles of the Sea',
    icon: 'ship', col: 2, row: 2, chapters: ['167bce'], requires: ['mli_167_yoke'],
    desc: 'Take the harbours — Joppa, Azotus and Gaza. A hill kingdom that has to buy its iron '
      + 'through somebody else\'s customs house is a hill kingdom on sufferance.',
    rewardText: '+300 talents and "The Harbours of the Kingdom": +12% trade, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Joppa', 'Azotus', 'Gaza']),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { treasury: 300 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'harbours_of_the_kingdom', name: 'The Harbours of the Kingdom', months: -1,
        effects: { tradeMult: 1.12 },
      });
    },
  },
  {
    id: 'mli_167_bronze', name: 'The Tablets of Bronze',
    icon: 'scroll', col: 3, row: 2, chapters: ['167bce'], requires: ['mli_167_yoke'],
    desc: 'Keep the Republic on our side of the ledger: at peace with Rome, and its Senate '
      + 'thinking well of us.',
    rewardText: '+95 influence points and "The Friendship of the Republic": +10% income '
      + 'permanently.',
    check: (ctx) => {
      const rom = ctx.game.tags.ROM;
      if (!rom || rom.alive === false) return false;
      return atPeaceBetween(ctx, 'MLI', 'ROM') && opinionOf(ctx, 'ROM', 'MLI') >= 40;
    },
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { infl: 95 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'friendship_of_the_republic', name: 'The Friendship of the Republic',
        months: -1, effects: { incomeMult: 1.1 },
      });
    },
  },
  {
    // The rising's own three end where 1 Maccabees ends. What the state
    // BECAME — the thing Pompey rode into in 63 — is the century after the
    // book: a kingdom with a chancery, a coast, a mint and a treaty file.
    id: 'mli_167_hills', name: 'Gerizim and the Sons of Esau',
    icon: 'mountain', col: 2, row: 3, chapters: ['167bce'], requires: ['mli_167_isles'],
    desc: 'Hold all five — Hebron, Adora, Samaria, Shechem and Scythopolis.',
    rewardText: '+8,000 manpower and "The Hill Country Brought In": +12% manpower and '
      + '+15% conversion, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI',
      ['Hebron', 'Adora', 'Sebaste', 'Neapolis', 'Scythopolis']),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { manpower: 8000 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'mli167_hill_country_brought_in', name: 'The Hill Country Brought In', months: -1,
        effects: { manpowerMult: 1.12, convertMult: 1.15 },
      });
    },
    },
  {
    id: 'mli_167_coast', name: 'The Ladder of Tyre to the River of Egypt',
    icon: 'shipyard', col: 2, row: 4, chapters: ['167bce'], requires: ['mli_167_hills'],
    desc: 'Take the coast entire, Ascalon with it, and keep 450 talents by for the yards.',
    rewardText: 'The yards at Joppa are laid down: −150 talents, six ships commissioned '
    + 'there, and "The Ships of Joppa": +20% fleet strength, +10% trade and +5% income, '
    + 'permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI',
    ['Ptolemais', 'Dora', 'Caesarea Maritima', 'Joppa', 'Azotus', 'Ascalon', 'Gaza'])
    && treasuryOf(ctx, 'MLI') >= 450,
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { treasury: -150 });
    ctx.helpers.spawnFleet(ctx, 'MLI', 'Joppa', 6, { name: 'The Ships of Joppa' });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
    id: 'mli167_the_ships_of_joppa', name: 'The Ships of Joppa', months: -1,
    effects: { navalMult: 1.2, tradeMult: 1.1, incomeMult: 1.05 },
    });
    },
  },
  {
    id: 'mli_167_kinsmen', name: 'Brethren, of the Stock of Abraham',
    icon: 'quill', col: 3, row: 3, chapters: ['167bce'], requires: ['mli_167_bronze'],
    desc: 'Keep the file live: at peace with Rome with its Senate at +60, the kinsmen at '
      + 'Sparta standing with us at 70.',
    rewardText: '+120 influence points and "No King Shall Make War On Them": +1 deterrence '
    + 'and +8% trade, permanent.',
    check: (ctx) => {
    const rom = ctx.game.tags.ROM;
    if (!rom || rom.alive === false) return false;
    if (!atPeaceBetween(ctx, 'MLI', 'ROM')) return false;
    if (opinionOf(ctx, 'ROM', 'MLI') < 60) return false;
    if (standingAt(ctx, 'Sparta') < 70) return false;
    return standingAt(ctx, 'Rhodes') >= 55 || standingAt(ctx, 'Gortyn') >= 55;
    },
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { infl: 120 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli167_no_king_shall_make_war', name: 'No King Shall Make War On Them',
      months: -1, effects: { deterrent: 1, tradeMult: 1.08 },
    });
    },
  },
  {
    id: 'mli_167_stamp', name: 'Leave to Coin Money With Thine Own Stamp',
    icon: 'coins', col: 3, row: 4, chapters: ['167bce'], requires: ['mli_167_kinsmen'],
    desc: 'Strike: nobody\'s client, 750 talents of silver in hand, and all three of the age\'s '
      + 'ladders three rungs past where this chapter opened.',
    rewardText: '+70 influence points and "The Council\'s Own Silver": +12% income, '
    + '+8% trade and +0.2 public belief a month, permanent.',
    check: (ctx) => independent(ctx, 'MLI') && treasuryOf(ctx, 'MLI') >= 750
    && techAbove(ctx, 'MLI', 3),
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { infl: 70 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli167_the_councils_own_silver', name: "The Council's Own Silver", months: -1,
      effects: { incomeMult: 1.12, tradeMult: 1.08, legitimacyAdd: 0.2 },
    });
    },
  },
];

// ---- 67 BCE: the kingdom Pompey would have cut down -------------------------
// The settlement of 63 took the Greek cities of the Jordan out of the
// Hasmonean state and gave them to the new province of Syria; a crown that
// holds them is the state Rome never got to redraw. The other two asks are the
// chapter's own creditors: Aretas, who had to be paid in the twelve cities of
// Moab to march for a Hasmonean, and the communities beyond the Euphrates,
// older and larger than Judaea itself.
const MLI_67 = [
  {
    id: 'mli_67_cities', name: 'The Cities of the Jordan',
    icon: 'tower', col: 2, row: 1, chapters: ['67bce'], requires: ['mli_the_crowning'],
    desc: 'Hold Scythopolis, Pella, Gadara, Gerasa and Philadelphia — the Greek cities of the '
      + 'Jordan that Pompey\'s settlement tore out of this state and filed.',
    rewardText: '+240 talents and "The Cities Kept": +10% trade and +5% income, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI',
      ['Scythopolis', 'Pella', 'Gadara', 'Gerasa', 'Philadelphia']),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { treasury: 240 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_cities_kept', name: 'The Cities Kept', months: -1,
        effects: { tradeMult: 1.1, incomeMult: 1.05 },
      });
    },
  },
  {
    id: 'mli_67_academies', name: 'Babylonia Answers',
    icon: 'lamp', col: 2, row: 2, chapters: ['67bce'], requires: ['mli_67_cities'],
    desc: 'Win Babylonia: the Jews of Babylon standing with us at 70, or the city itself under '
      + 'the crown.',
    rewardText: '+6,000 manpower and +95 influence points.',
    check: (ctx) => standingAt(ctx, 'Babylon') >= 70 || holds(ctx, 'MLI', 'Babylon'),
    reward: (ctx) => ctx.helpers.adjust(ctx, 'MLI', { manpower: 6000, infl: 95 }),
  },
  {
    id: 'mli_67_petra', name: 'Petra Under the Crown',
    icon: 'market', col: 3, row: 2, chapters: ['67bce'], requires: ['mli_67_cities'],
    desc: 'Bring the desert king to heel: Petra and Bostra under the crown, or Nabataea owing '
      + 'us fealty.',
    rewardText: '+300 talents and "The Incense Road": +12% trade, permanent.',
    check: (ctx) => {
      const nab = ctx.game.tags.NAB;
      if (nab && nab.overlord === 'MLI') return true;
      return holdsAll(ctx, 'MLI', ['Petra', 'Bostra']);
    },
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { treasury: 300 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_incense_road', name: 'The Incense Road', months: -1, effects: { tradeMult: 1.12 },
      });
    },
  },
  {
    id: 'mli_67_half_shekel', name: 'The Road the Half-Shekel Takes',
    icon: 'shrine', col: 2, row: 3, chapters: ['67bce'], requires: ['mli_67_academies'],
    desc: 'Stand at 75 with the academy at Nehardea and at 65 with Nisibis, hold Jerusalem.',
    rewardText: '+300 talents and "The Road of the Half-Shekel": +15% from the ascents and '
      + '+8% income, permanent.',
    check: (ctx) => standingAt(ctx, 'Nehardea') >= 75 && standingAt(ctx, 'Nisibis') >= 65
      && holds(ctx, 'MLI', 'Jerusalem') && templeStands(ctx),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { treasury: 300 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'mli67_half_shekel_road', name: 'The Road of the Half-Shekel', months: -1,
        effects: { pilgrimMult: 1.15, incomeMult: 1.08 },
      });
    },
    },
  {
    id: 'mli_67_idumea', name: 'Antipater\'s Country',
    icon: 'note', col: 2, row: 4, chapters: ['67bce'], requires: ['mli_67_half_shekel'],
    desc: 'Rule over it instead — his country and its outlet held, 550 talents of the receipts '
      + 'banked in the crown\'s own ledger, and Government 7, The Royal.',
    rewardText: '+95 governance points and "The Crown\'s Own Officers": +8% income and '
    + '+8% manpower, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Hebron', 'Adora', 'Gaza'])
    && treasuryOf(ctx, 'MLI') >= 550
    && ((((ctx.game.tags.MLI || {}).tech) || {}).gov | 0) >= 7,
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { gov: 95 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli67_crowns_own_officers', name: "The Crown's Own Officers", months: -1,
      effects: { incomeMult: 1.08, manpowerMult: 1.08 },
    });
    },
  },
  {
    id: 'mli_67_euphrates', name: 'The Road to the Euphrates',
    icon: 'horseshoe', col: 3, row: 3, chapters: ['67bce'], requires: ['mli_67_petra'],
    desc: 'Hold Damascus and Palmyra, and keep Phraates at peace with this crown and thinking '
      + 'well of it at +60.',
    rewardText: '+95 influence points and "The Road to the River": +12% trade and +5% '
    + 'income, permanent.',
    check: (ctx) => {
    const par = ctx.game.tags.PAR;
    if (!par || par.alive === false) return false;
    return holdsAll(ctx, 'MLI', ['Damascus', 'Palmyra'])
      && atPeaceBetween(ctx, 'MLI', 'PAR') && opinionOf(ctx, 'PAR', 'MLI') >= 60;
    },
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { infl: 95 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli67_road_to_the_river', name: 'The Road to the River', months: -1,
      effects: { tradeMult: 1.12, incomeMult: 1.05 },
    });
    },
  },
  {
    id: 'mli_67_crassus', name: 'What Crassus Came For',
    icon: 'altar', col: 3, row: 4, chapters: ['67bce'], requires: ['mli_67_euphrates'],
    desc: 'Hold Jerusalem with the House standing and 600 talents banked that no proconsul has '
      + 'a claim on, and settle the Roman question either way.',
    rewardText: '+400 talents and "The Treasury Nobody Emptied": +10% income and +0.2 '
    + 'public belief a month, permanent.',
    check: (ctx) => {
    if (!holds(ctx, 'MLI', 'Jerusalem') || !templeStands(ctx)) return false;
    if (treasuryOf(ctx, 'MLI') < 600) return false;
    if (broken(ctx, 'ROM')) return true;
    return independent(ctx, 'MLI') && atPeaceBetween(ctx, 'MLI', 'ROM')
      && opinionOf(ctx, 'ROM', 'MLI') >= 80;
    },
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { treasury: 400 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli67_treasury_nobody_emptied', name: 'The Treasury Nobody Emptied', months: -1,
      effects: { incomeMult: 1.1, legitimacyAdd: 0.2 },
    });
    },
  },
];

// ---- 40 BCE: between the eagle and the archer ------------------------------
// Cleopatra got the balsam of Jericho and the bitumen of the Dead Sea out of
// Antony in 36 and leased them back to Herod at four hundred talents a year;
// the Parthians who rode to Jerusalem in 40 were the one power in the world
// that would seat a Jewish king against Rome; and the harbour at Straton's
// Tower, sunk in open water with hydraulic concrete, was the single largest
// thing anyone built in this country in five centuries.
const MLI_40 = [
  {
    id: 'mli_40_balsam', name: 'The Groves of Jericho',
    icon: 'grain', col: 2, row: 1, chapters: ['40bce'], requires: ['mli_the_crowning'],
    desc: 'Hold Jericho and Engaddi — the balsam and the bitumen. Cleopatra took them out of '
      + 'this country\'s revenue by asking Antony for them.',
    rewardText: '+240 talents and "The Balsam Kept": +10% income and +8% trade, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Jericho', 'Engaddi']),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { treasury: 240 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_balsam_kept', name: 'The Balsam Kept', months: -1,
        effects: { incomeMult: 1.1, tradeMult: 1.08 },
      });
    },
  },
  {
    id: 'mli_40_harbour', name: 'A Harbour Where the Tower Stands',
    icon: 'shipyard', col: 2, row: 2, chapters: ['40bce'], requires: ['mli_40_balsam'],
    desc: 'Hold Straton\'s Tower and Dora with 600 talents banked, and build the harbour this '
      + 'coast has never had.',
    rewardText: 'The harbour is built: −250 talents; "The King\'s Harbour": +15% trade and '
      + '+8% income, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Caesarea Maritima', 'Dora'])
      && treasuryOf(ctx, 'MLI') >= 600,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { treasury: -250 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_kings_harbour', name: "The King's Harbour", months: -1,
        effects: { tradeMult: 1.15, incomeMult: 1.08 },
      });
    },
  },
  {
    id: 'mli_40_east', name: 'The Door to the East',
    icon: 'horseshoe', col: 3, row: 2, chapters: ['40bce'], requires: ['mli_40_balsam'],
    desc: 'Bind Parthia to us in writing — allied or owing fealty — and stand at 70 with the '
      + 'Jews of the Twin Cities.',
    rewardText: '+6,000 manpower and +70 martial points.',
    check: (ctx) => {
      const par = ctx.game.tags.PAR;
      if (!par || par.alive === false) return false;
      if (par.overlord !== 'MLI' && !allied(ctx, 'MLI', 'PAR')) return false;
      return standingAt(ctx, 'Seleucia-Ctesiphon') >= 70;
    },
    reward: (ctx) => ctx.helpers.adjust(ctx, 'MLI', { manpower: 6000, mar: 70 }),
  },
  {
    id: 'mli_40_the_kings_cities', name: 'The Cities the Crown Built',
    icon: 'walls', col: 2, row: 3, chapters: ['40bce'], requires: ['mli_40_harbour'],
    desc: 'Hold Sebaste, Masada and Machaerus with three hundred and twenty points of '
      + 'development under the crown.',
    rewardText: '+95 governance points and "The Builder\'s Yards": +12% development growth '
      + 'and +8% income, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Sebaste', 'Masada', 'Machaerus'])
      && devOf(ctx, 'MLI') >= 320,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { gov: 95 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'mli40_builders_yards', name: "The Builder's Yards", months: -1,
        effects: { growthMult: 1.12, incomeMult: 1.08 },
      });
    },
    },
  {
    id: 'mli_40_the_platform', name: 'The Great Enclosure',
    icon: 'temple', col: 2, row: 4, chapters: ['40bce'],
    requires: ['mli_40_the_kings_cities'],
    desc: 'Hold Jerusalem with the House standing and 900 talents banked, and double the '
      + 'platform under it.',
    rewardText: 'The platform is doubled: −350 talents; +40 legitimacy and "The Great '
    + 'Enclosure": +20% from the ascents and +0.25 public belief a month, permanent.',
    check: (ctx) => holds(ctx, 'MLI', 'Jerusalem') && templeStands(ctx)
    && treasuryOf(ctx, 'MLI') >= 900,
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { treasury: -350, legitimacy: 40 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli40_great_enclosure', name: 'The Great Enclosure', months: -1,
      effects: { pilgrimMult: 1.2, legitimacyAdd: 0.25 },
    });
    },
  },
  {
    id: 'mli_40_rhodes', name: 'The Day the Patron Loses',
    icon: 'laurel', col: 3, row: 3, chapters: ['40bce'], requires: ['mli_40_east'],
    desc: 'Stand at peace with Rome and with Parthia at the same time, each of them thinking '
      + 'well of us at +50.',
    rewardText: '+95 influence points, +300 talents and "The Crown Worth Keeping": '
    + '+1 deterrence and +8% income, permanent.',
    check: (ctx) => {
    const rom = ctx.game.tags.ROM;
    const par = ctx.game.tags.PAR;
    if (!rom || rom.alive === false || !par || par.alive === false) return false;
    if (!atPeaceBetween(ctx, 'MLI', 'ROM') || !atPeaceBetween(ctx, 'MLI', 'PAR')) return false;
    if (opinionOf(ctx, 'ROM', 'MLI') < 50 || opinionOf(ctx, 'PAR', 'MLI') < 50) return false;
    const i = standingRank(ctx, 'MLI');
    return i >= 0 && i < 6;
    },
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { infl: 95, treasury: 300 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli40_crown_worth_keeping', name: 'The Crown Worth Keeping', months: -1,
      effects: { deterrent: 1, incomeMult: 1.08 },
    });
    },
  },
  {
    id: 'mli_40_the_patron', name: 'The Patron of the Communities',
    icon: 'lamp', col: 3, row: 4, chapters: ['40bce'], requires: ['mli_40_rhodes'],
    desc: 'Stand with the Jews of Rome and the Jews of Smyrna at 70 apiece — or hold their '
      + 'cities outright, which settles the question by abolishing it.',
    rewardText: 'The endowments are paid: −200 talents; +120 influence points and "The Patron '
    + 'of the Nations": +10% from the ascents and +8% trade, permanent.',
    check: (ctx) => (standingAt(ctx, 'Roma') >= 70 || holds(ctx, 'MLI', 'Roma'))
    && (standingAt(ctx, 'Smyrna') >= 70 || holds(ctx, 'MLI', 'Smyrna'))
    && treasuryOf(ctx, 'MLI') >= 750,
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { treasury: -200, infl: 120 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli40_patron_of_the_nations', name: 'The Patron of the Nations', months: -1,
      effects: { pilgrimMult: 1.1, tradeMult: 1.08 },
    });
    },
  },
];

// ---- 66 CE: the House that did not burn ------------------------------------
// The revolt began in Caesarea over whether a Jew could own a street in it,
// and ended — in the sources — with the Temple on fire in the sixth month of
// 70. A crown proclaimed inside that war has the procurators' seaboard to
// take, the last Herodian's tetrarchy to absorb, and one House to keep.
const MLI_66 = [
  {
    id: 'mli_66_coast', name: 'The Coast of the Kingdom',
    icon: 'ship', col: 2, row: 1, chapters: ['66ce'], requires: ['mli_the_crowning'],
    desc: 'Take the seaboard the procurators held: Caesarea Maritima, Ptolemais, Joppa and '
      + 'Ascalon. The war started in the first of them, over a street.',
    rewardText: '+300 talents and "The Ports Are Ours": +12% trade, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Caesarea Maritima', 'Ptolemais', 'Joppa', 'Ascalon']),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { treasury: 300 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_ports_are_ours', name: 'The Ports Are Ours', months: -1,
        effects: { tradeMult: 1.12 },
      });
    },
  },
  {
    id: 'mli_66_unburned', name: 'The House Unburned',
    icon: 'temple', col: 2, row: 2, chapters: ['66ce'], requires: ['mli_66_coast'],
    desc: 'Hold Jerusalem with the Temple still standing — no fire on the Mount — and 600 '
      + 'talents to endow it. Josephus wrote the ash; this crown does not have to.',
    rewardText: '+40 legitimacy and "The House Endowed": +0.25 public belief a month and '
      + '−0.5 unrest everywhere, permanent.',
    check: (ctx) => holds(ctx, 'MLI', 'Jerusalem') && templeStands(ctx)
      && treasuryOf(ctx, 'MLI') >= 600,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { legitimacy: 40 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_house_endowed', name: 'The House Endowed', months: -1,
        effects: { legitimacyAdd: 0.25, unrestAll: -0.5 },
      });
    },
  },
  {
    id: 'mli_66_herodian', name: "The Last Herodian's Country",
    icon: 'flag', col: 3, row: 2, chapters: ['66ce'], requires: ['mli_66_coast'],
    desc: 'Take in the tetrarchy — Caesarea Philippi, Batanea and Tiberias — with Agrippa\'s '
      + 'house finished as a power.',
    rewardText: '+5,000 manpower and +70 governance points.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Caesarea Philippi', 'Batanea', 'Tiberias'])
      && broken(ctx, 'AGR'),
    reward: (ctx) => ctx.helpers.adjust(ctx, 'MLI', { manpower: 5000, gov: 70 }),
  },
  {
    id: 'mli_66_one_house', name: 'The Knife and the Chamber',
    icon: 'split', col: 2, row: 3, chapters: ['66ce'], requires: ['mli_66_unburned'],
    desc: 'Hold Jerusalem with the House standing and the desert rocks the knife-men kept for '
      + 'themselves.',
    rewardText: '+40 legitimacy and "One Government in the House": −0.75 unrest everywhere '
      + 'and +8% manpower, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Jerusalem', 'Masada', 'Machaerus', 'Engaddi'])
      && templeStands(ctx) && stabilityOf(ctx, 'MLI') >= 3
      && menOf(ctx, 'MLI') >= 49000,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { legitimacy: 40 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'mli66_one_government', name: 'One Government in the House', months: -1,
        effects: { unrestAll: -0.75, manpowerMult: 1.08 },
      });
    },
    },
  {
    id: 'mli_66_half_shekel', name: 'The Half-Shekel of Every Province',
    icon: 'coins', col: 2, row: 4, chapters: ['66ce'], requires: ['mli_66_one_house'],
    desc: 'Keep the House standing in Jerusalem and the three great communities writing to it.',
    rewardText: '+500 talents and "The Levy of the Nation": +15% income and +10% trade, '
    + 'permanent.',
    check: (ctx) => {
    if (!templeStands(ctx) || !holds(ctx, 'MLI', 'Jerusalem')) return false;
    return ['Alexandria', 'Antioch', 'Babylon'].every(
      (n) => standingAt(ctx, n) >= 65 || holds(ctx, 'MLI', n));
    },
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { treasury: 500 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli66_levy_of_the_nation', name: 'The Levy of the Nation', months: -1,
      effects: { incomeMult: 1.15, tradeMult: 1.1 },
    });
    },
  },
  {
    id: 'mli_66_eagle', name: 'The Eagle of the Twelfth',
    icon: 'swords', col: 3, row: 3, chapters: ['66ce'], requires: ['mli_66_herodian'],
    desc: 'Make that arithmetic permanent — the ascent and the plain it falls to, Emmaus, '
      + 'Lydda and Antipatris, with the war-craft of the age three rungs past this '
      + 'chapter\'s.',
    rewardText: '+95 martial points and "The Ascent of Beth Horon": +1 deterrence and '
    + '+8% morale, permanent.',
    check: (ctx) => {
    if (!holdsAll(ctx, 'MLI', ['Emmaus', 'Lydda', 'Antipatris'])) return false;
    if (!marAbove(ctx, 'MLI', 3)) return false;
    if (broken(ctx, 'ROM')) return true;
    return atPeaceBetween(ctx, 'MLI', 'ROM') && opinionOf(ctx, 'ROM', 'MLI') >= 0;
    },
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { mar: 95 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli66_ascent_of_beth_horon', name: 'The Ascent of Beth Horon', months: -1,
      effects: { deterrent: 1, moraleMult: 1.08 },
    });
    },
  },
  {
    id: 'mli_66_grain', name: 'What Rome Eats',
    icon: 'granary', col: 3, row: 4, chapters: ['66ce'], requires: ['mli_66_eagle'],
    desc: 'Take the granary and its eastern gate, Alexandria and Pelusium, with the quarter '
      + 'itself standing with us at 70.',
    rewardText: '+600 talents and "The Alexandrian Sailing": +15% trade, +8% income and '
    + '+10% fleet strength, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Alexandria', 'Pelusium'])
    && standingAt(ctx, 'Alexandria') >= 70,
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { treasury: 600 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli66_alexandrian_sailing', name: 'The Alexandrian Sailing', months: -1,
      effects: { tradeMult: 1.15, incomeMult: 1.08, navalMult: 1.1 },
    });
    },
  },
];

// ---- 132 CE: the colony unmade ---------------------------------------------
// Hadrian's Aelia Capitolina was a decree, a plough and a legion; the rising's
// own coins showed the Temple facade and dated themselves by the Redemption of
// Israel. A crown here is asked for both — and for the one thing that would
// have made Rome fight the war two-handed, which is Vologases on the Euphrates.
const MLI_132 = [
  {
    id: 'mli_132_colony', name: 'The Colony Unmade',
    icon: 'walls', col: 2, row: 1, chapters: ['132ce'], requires: ['mli_the_crowning'],
    desc: 'Hold Jerusalem, Caesarea Maritima, Sebaste, Emmaus and Lydda: not one Roman '
      + 'garrison between the sea and the Jordan.',
    rewardText: '+40 legitimacy and +95 governance points.',
    check: (ctx) => holdsAll(ctx, 'MLI',
      ['Jerusalem', 'Caesarea Maritima', 'Sebaste', 'Emmaus', 'Lydda']),
    reward: (ctx) => ctx.helpers.adjust(ctx, 'MLI', { legitimacy: 40, gov: 95 }),
  },
  {
    // SPEC §32: the Mount this chapter starts bare can bear a House again —
    // and it must stay reachable after the proclamation, or taking the greater
    // crown would quietly cost a player the capstone of the chapter.
    id: 'mli_132_third_house', name: 'Raise the Third House',
    icon: 'shrine', col: 2, row: 2, chapters: ['132ce'], requires: ['mli_132_colony'],
    desc: 'Hold Jerusalem with 750 talents in the treasury and the realm steady (stability '
      + '+1), and put back what Titus took.',
    rewardText: 'The Third Temple rises: −300 talents; +30 legitimacy, +60 governance '
      + 'points, and the Temple\'s yield (+1 governance point, +0.2 legitimacy a month) '
      + 'returns to Jerusalem\'s keeper. A House already standing is endowed instead, and '
      + 'the silver stays banked.',
    check: (ctx) => holds(ctx, 'MLI', 'Jerusalem') && treasuryOf(ctx, 'MLI') >= 750
      && stabilityOf(ctx, 'MLI') >= 1,
    reward: (ctx) => raiseTheThirdHouse(ctx),
  },
  {
    id: 'mli_132_east', name: 'Rome Looks East',
    icon: 'horseshoe', col: 3, row: 2, chapters: ['132ce'], requires: ['mli_132_colony'],
    desc: 'Make the empire fight two wars: Parthia in the field against Rome, or an alliance '
      + 'signed with the King of Kings.',
    rewardText: '+5,000 manpower and "Rome Looks East": +8% morale permanently.',
    check: (ctx) => atWarBetween(ctx, 'PAR', 'ROM') || allied(ctx, 'MLI', 'PAR'),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { manpower: 5000 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'rome_looks_east', name: 'Rome Looks East', months: -1, effects: { moraleMult: 1.08 },
      });
    },
  },
  {
    // The Redemption coinage carried two offices on one piece of silver, which
    // is the constitutional argument of the whole chapter: a prince who is not
    // a priest, in a state whose capital asset is a Temple.
    id: 'mli_132_eleazar', name: 'Eleazar the Priest',
    icon: 'altar', col: 2, row: 3,
    chapters: ['132ce'], requires: ['mli_132_third_house'],
    desc: 'Hold Jerusalem with the Temple standing, twenty-six provinces keeping the Law to '
      + 'tithe to it, and the realm steady at +2.',
    rewardText: '+40 legitimacy, +70 governance points and "The Two Names on the Silver": '
      + '+15% pilgrimage and +0.2 public belief a month, permanent.',
    check: (ctx) => templeStands(ctx) && holds(ctx, 'MLI', 'Jerusalem')
      && ownedCount(ctx, 'MLI', 'judaism') >= 26 && stabilityOf(ctx, 'MLI') >= 2,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { legitimacy: 40, gov: 70 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'mli132_two_names', name: 'The Two Names on the Silver', months: -1,
        effects: { pilgrimMult: 1.15, legitimacyAdd: 0.2 },
      });
    },
    },
    {
    // The best-documented thing this chapter has is not the war, it is the
    // filing: a three-year state that surveyed, let, assessed and requisitioned
    // while the legions were in the country.
    id: 'mli_132_leases', name: 'Dated by the Redemption of Israel',
    icon: 'quill', col: 2, row: 4,
    chapters: ['132ce'], requires: ['mli_132_eleazar'],
    desc: 'Carry all three of the age\'s ladders three rungs past the baseline it began with.',
    rewardText: '+95 governance points and "Dated by the Redemption": administration costs '
      + '−12%, +10% income and +8% development growth, permanent.',
    check: (ctx) => techAbove(ctx, 'MLI', 3) && devOf(ctx, 'MLI') >= 340,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { gov: 95 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'mli132_dated_by_the_redemption', name: 'Dated by the Redemption', months: -1,
        effects: { adminMult: 0.88, incomeMult: 1.1, growthMult: 1.08 },
      });
    },
    },
    {
    // What a peace with this empire has to contain, as opposed to what a truce
    // with it contains. The repeal came in the end — with a clause.
    id: 'mli_132_rescript', name: 'The Rescript Repealed',
    icon: 'scales', col: 3, row: 3,
    chapters: ['132ce'], requires: ['mli_132_east'],
    desc: 'Stand independent and at peace with the empire, with its court\'s regard at +60, and '
      + 'take the first clause without the second.',
    rewardText: '+95 influence points and "The Door Left Open": +15% conversion and −0.5 '
      + 'unrest everywhere, permanent.',
    check: (ctx) => {
      const rom = ctx.game.tags.ROM;
      if (!rom || rom.alive === false) return false;
      return independent(ctx, 'MLI') && atPeaceBetween(ctx, 'MLI', 'ROM')
        && opinionOf(ctx, 'ROM', 'MLI') >= 60;
    },
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { infl: 95 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'mli132_door_left_open', name: 'The Door Left Open', months: -1,
        effects: { convertMult: 1.15, unrestAll: -0.5 },
      });
    },
    },
    {
    // 115-117 is the reason this chapter's dispersion is the eastern one: the
    // Egyptian and Cyrenaican communities are closed windows on the §172 list,
    // and no campaign in 132 can write to them.
    id: 'mli_132_dispersion', name: 'What 117 Left',
    icon: 'diaspora', col: 3, row: 4,
    chapters: ['132ce'], requires: ['mli_132_rescript'],
    desc: 'Bring all four to 70 standing or under the crown, and send the letters the rising '
      + 'never sent.',
    rewardText: '+10,000 manpower, +95 influence points and "The Letters East": +10% trade and '
      + '+1 diplomatic seat, permanent.',
    check: (ctx) => ['Nehardea', 'Babylon', 'Nisibis', 'Antioch']
      .every((n) => standingAt(ctx, n) >= 70 || holds(ctx, 'MLI', n)),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { manpower: 10000, infl: 95 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'mli132_letters_east', name: 'The Letters East', months: -1,
        effects: { tradeMult: 1.1, diploSeats: 1 },
      });
    },
    },
];

// ---- 614 CE: the century the empires spent on each other --------------------
// Nehemiah ben Hushiel's Jerusalem lasted three years. A crown that lasts
// longer has the Mount swept and waiting, the Exilarch of Babylonia — the one
// Jewish authority nobody argued with, and a Davidide — sitting in another
// empire, and a southern road that both empires are too exhausted to watch.
const MLI_614 = [
  {
    id: 'mli_614_altar', name: 'The Altar on the Mount',
    icon: 'altar', col: 2, row: 1, chapters: ['614ce'], requires: ['mli_the_crowning'],
    desc: 'Hold Jerusalem with 750 talents and a steady realm (stability +1), and raise the '
      + 'House again five centuries after Titus.',
    rewardText: 'The Third Temple rises: −300 talents; +30 legitimacy, +60 governance '
    + 'points, and the Temple\'s yield (+1 governance point, +0.2 legitimacy a month) '
    + 'returns to Jerusalem\'s keeper. A House already standing is endowed instead, and '
    + 'the silver stays banked.',
    check: (ctx) => holds(ctx, 'MLI', 'Jerusalem') && treasuryOf(ctx, 'MLI') >= 750
    && stabilityOf(ctx, 'MLI') >= 1,
    reward: (ctx) => raiseTheThirdHouse(ctx),
  },
  {
    id: 'mli_614_exilarch', name: 'The Exilarch Comes Home',
    icon: 'star4', col: 2, row: 2, chapters: ['614ce'], requires: ['mli_614_altar'],
    desc: 'Reach the Exilarchate: Nehardea and Babylon under the crown, or the academy at '
      + 'Nehardea standing with us at 75.',
    rewardText: '+40 legitimacy, +95 influence points and "The Two Houses Joined": '
      + '+0.2 public belief a month, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Nehardea', 'Babylon'])
      || standingAt(ctx, 'Nehardea') >= 75,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { legitimacy: 40, infl: 95 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'two_houses_joined', name: 'The Two Houses Joined', months: -1,
        effects: { legitimacyAdd: 0.2 },
      });
    },
  },
  {
    id: 'mli_614_south', name: 'The Watch on the Southern Road',
    icon: 'shield', col: 3, row: 2, chapters: ['614ce'], requires: ['mli_614_altar'],
    desc: 'Close the desert road before it opens: Aila, Petra and Bostra held, with 28,000 men '
      + 'under the banner.',
    rewardText: '+70 martial points and "The Southern Watch": +1 to hill-country defense '
      + 'and +5% discipline permanently.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Aila', 'Petra', 'Bostra'])
      && menOf(ctx, 'MLI') >= 28000,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { mar: 70 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_southern_watch', name: 'The Southern Watch', months: -1,
        effects: { hillDefBonus: 1, disciplineMult: 1.05 },
      });
    },
  },
  {
    id: 'mli_614_calendar', name: 'Who Fixes the Year',
    icon: 'flame', col: 2, row: 3, chapters: ['614ce'], requires: ['mli_614_exilarch'],
    desc: 'Sit in Jerusalem and Tiberias and be obeyed where obedience is the whole of the '
      + 'argument.',
    rewardText: '+85 governance points and "The Year Fixed from Jerusalem": +0.25 public '
      + 'belief a month and +15% from the ascents, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Jerusalem', 'Tiberias'])
      && standingAt(ctx, 'Babylon') >= 70
      && standingAt(ctx, 'Seleucia-Ctesiphon') >= 70
      && standingAt(ctx, 'Nisibis') >= 70,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { gov: 85 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'mli_614_year_fixed', name: 'The Year Fixed from Jerusalem', months: -1,
        effects: { legitimacyAdd: 0.25, pilgrimMult: 1.15 },
      });
    },
    },
  {
    id: 'mli_614_academies', name: 'The Talmud Closed Under a Crown',
    icon: 'lamp', col: 2, row: 4, chapters: ['614ce'], requires: ['mli_614_calendar'],
    desc: 'Hold Jerusalem, Tiberias and Nehardea with 700 talents banked, and put Sura and '
      + 'Pumbedita on the crown\'s roll.',
    rewardText: 'The endowment is paid: −250 talents; +95 governance points and "The Lamps '
    + 'of the Two Rivers": administration costs −10%, +15% integration and +0.2 public '
    + 'belief a month, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Jerusalem', 'Tiberias', 'Nehardea'])
    && treasuryOf(ctx, 'MLI') >= 700,
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { treasury: -250, gov: 95 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli_614_lamps_two_rivers', name: 'The Lamps of the Two Rivers', months: -1,
      effects: { adminMult: 0.9, integrateMult: 1.15, legitimacyAdd: 0.2 },
    });
    },
  },
  {
    id: 'mli_614_cross', name: 'The Cross Does Not Come Back',
    icon: 'swords', col: 3, row: 3, chapters: ['614ce'], requires: ['mli_614_south'],
    desc: 'Hold Jerusalem with the coast a counter-offensive comes ashore on — Caesarea '
      + 'Maritima and Ptolemais.',
    rewardText: '+85 martial points and "No Oath Left to Break": +1 deterrence and +8% '
    + 'morale, permanent.',
    check: (ctx) => broken(ctx, 'BYZ')
    && holdsAll(ctx, 'MLI', ['Jerusalem', 'Caesarea Maritima', 'Ptolemais']),
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { mar: 85 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli_614_no_oath', name: 'No Oath Left to Break', months: -1,
      effects: { deterrent: 1, moraleMult: 1.08 },
    });
    },
  },
  {
    id: 'mli_614_hejaz', name: 'The Road Out of Arabia',
    icon: 'horseshoe', col: 3, row: 4, chapters: ['614ce'], requires: ['mli_614_cross'],
    desc: 'Hold the oases before the road needs them — Khaybar, Yathrib, Tayma and Dumatha.',
    rewardText: '+300 talents and +5,000 manpower — the oases muster; and "The Road Out of '
    + 'Arabia": +12% trade and +8% manpower, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Khaybar', 'Yathrib', 'Tayma', 'Dumatha'])
    && broken(ctx, 'RSH'),
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { treasury: 300, manpower: 5000 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli_614_road_out_of_arabia', name: 'The Road Out of Arabia', months: -1,
      effects: { tradeMult: 1.12, manpowerMult: 1.08 },
    });
    },
  },
];

// One table, six readings (SPEC §189). `chapterChain` hands each chapter the
// spine plus its own branch; the formables below carry the whole thing, so a
// crown proclaimed in any of the six finds a full tree waiting.
const MLI_MISSIONS = [
  ...MLI_SPINE,
  ...MLI_167, ...MLI_67, ...MLI_40, ...MLI_66, ...MLI_132, ...MLI_614,
];

// Hasmonean Judaea restored: the priest-kings' own programme.
const HAS_MISSIONS = [
  {
    id: 'has_one_throne', name: 'One Throne, One Temple',
    desc: 'End the dynastic quarrel: legitimacy 70 and Jerusalem in our hands.',
    rewardText: '+70 governance points and "The Priest-King": −0.5 unrest everywhere permanently.',
    check: (ctx) => (ctx.game.tags.HAS && (ctx.game.tags.HAS.legitimacy || 0) >= 70)
      && holds(ctx, 'HAS', 'Jerusalem'),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'HAS', { gov: 70 });
      ctx.helpers.addTagModifier(ctx, 'HAS', {
        id: 'priest_king', name: 'The Priest-King', months: -1, effects: { unrestAll: -0.5 },
      });
    },
  },
  {
    id: 'has_the_coast', name: 'The Kingdom Reaches the Sea',
    desc: 'Hold Joppa: a kingdom with no harbor is a kingdom that pays somebody else\'s '
      + 'customs.',
    rewardText: '+240 talents and "The Customs of Joppa": +10% trade, permanent.',
    check: (ctx) => holds(ctx, 'HAS', 'Joppa'),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'HAS', { treasury: 240 });
      ctx.helpers.addTagModifier(ctx, 'HAS', {
        id: 'customs_of_joppa', name: 'The Customs of Joppa', months: -1, effects: { tradeMult: 1.1 },
      });
    },
  },
  {
    id: 'has_yannai', name: "Yannai's Borders",
    desc: 'Twenty provinces under the Hasmonean crown, the borders of the greatest of the '
      + 'line.',
    rewardText: '+8,000 manpower and "The Old Borders": +8% morale, permanent.',
    check: (ctx) => ownedCount(ctx, 'HAS') >= 20,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'HAS', { manpower: 8000 });
      ctx.helpers.addTagModifier(ctx, 'HAS', {
        id: 'old_borders', name: 'The Old Borders', months: -1, effects: { moraleMult: 1.08 },
      });
    },
  },
];

const ISRAEL_HEARTLAND = [
  'Jerusalem', 'Hebron', 'Neapolis', 'Sepphoris', 'Tiberias', 'Adora',
];

// A son of David on the throne (SPEC §138). The Kingdom of Israel is the united
// monarchy and the united monarchy is David's, so the greater crown costs a
// dynasty rather than a war — the shared house-of-David arc, the accession of
// Beit Kosiba in 132, or the crown of David in 614, whichever a chapter offers.
// Every one of them raises the same flag.
function davidicThrone(ctx) {
  return !!(ctx.game.flags && ctx.game.flags.davidicThrone);
}

// ---- era-neutral readings for the crown's own tree (SPEC §211) --------------
// The Kingdom of Israel is formable in six chapters whose technology baselines
// are two hundred years apart, so a rung asking for "Military 7" is a
// formality in one age and out of reach in another. These read RELATIVE to the
// bookmark's own baseline, which is what makes one spine legible in all six.
function techBase(ctx) {
  const b = ctx.bookmark;
  return Number.isFinite(b && b.techBase) ? b.techBase : 3;
}
function techAbove(ctx, tag, over) {
  const t = ctx.game.tags[tag];
  const tech = (t && t.tech) || {};
  const floor = techBase(ctx) + over;
  return (tech.gov | 0) >= floor && (tech.infl | 0) >= floor && (tech.mar | 0) >= floor;
}
function marAbove(ctx, tag, over) {
  const t = ctx.game.tags[tag];
  return (((t && t.tech) || {}).mar | 0) >= techBase(ctx) + over;
}
// Rank among the powers (SPEC §165) — the quarterly ordering the realm panel
// prints, which counts revenue and clients rather than only spears.
function standingRank(ctx, tag) {
  const ord = (ctx.game.standing && ctx.game.standing.order) || [];
  return ord.indexOf(tag);
}
function alliesOf(ctx, tag) {
  const t = ctx.game.tags[tag];
  return ((t && t.allies) || []).length;
}
function clientsOf(ctx, tag) {
  const g = ctx.game;
  let n = 0;
  for (const k of Object.keys(g.tags)) {
    const o = g.tags[k];
    if (o && o.alive !== false && o.overlord === tag) n++;
  }
  return n;
}
// A formed crown keeps the court of the tag it grew out of (SPEC §127), so the
// estates in the room are the chapter's own — Hasideans and Hellenizers in
// 167, the Exilarch's men in 614 — and no mission on this shared spine may
// name one. These ask the WHOLE court instead, whoever it happens to be,
// which is both era-neutral and the truer question for a united monarchy.
function courtFloor(ctx, tag, min) {
  const t = ctx.game.tags[tag];
  const vals = Object.values((t && t.factions) || {}).filter((v) => Number.isFinite(v));
  return vals.length >= 2 && Math.min(...vals) >= min;
}
function favorFloor(ctx, tag, min) {
  const t = ctx.game.tags[tag];
  const vals = Object.values((t && t.estateFavor) || {}).filter((v) => Number.isFinite(v));
  return vals.length >= 2 && Math.min(...vals) >= min;
}

// ---- Judaean government crowns (SPEC §250) -------------------------------
// Only the Ethnarchy and Kingdom have separate formable identities. Other
// constitutional settlements keep their existing Judaean or Hasmonean tag.
// Formation preserves the constitution already adopted through the events.
function govIn(ctx, tag, govs) {
  const t = ctx.game.tags[tag];
  return !!t && govs.indexOf(t.govType) >= 0;
}
// Court approval, read for a single named estate. A crown offered in ONE
// chapter may name the men in that chapter's room, and should — a constitution
// is a bargain with particular people. A crown offered in two reads the whole
// court instead (`courtFloor`), because the room is not the same room.
function partyAt(ctx, tag, id, min) {
  try {
    const v = ctx.helpers.faction(ctx, tag, id);
    return Number.isFinite(v) && v >= min;
  } catch (e) { return false; }
}
// §32's House, paid for by whichever crown is raising it. A Mount that is
// already built on is endowed rather than billed twice — the generalisation of
// the Kingdom of Israel's own `raiseTheThirdHouse`, which two chapters of MLI
// missions still call under that name.
function raiseTheHouse(ctx, tag) {
  const p = ctx.prov && ctx.prov('Jerusalem');
  if (!p || p.wonder !== 'temple') {
    ctx.helpers.adjust(ctx, tag, { treasury: -300 });
    if (p) p.wonder = 'temple';
  }
  ctx.helpers.adjust(ctx, tag, { legitimacy: 40 });
}
function govAbove(ctx, tag, over) {
  const t = ctx.game.tags[tag];
  return (((t && t.tech) || {}).gov | 0) >= techBase(ctx) + over;
}
function heirSeated(ctx, tag) {
  const t = ctx.game.tags[tag];
  return !!(t && t.heir);
}
function rulerWorth(ctx, tag, min) {
  const r = (ctx.game.tags[tag] || {}).ruler;
  if (!r) return false;
  return ((r.gov | 0) + (r.infl | 0) + (r.mar | 0)) >= min;
}
function legitimacyOf(ctx, tag) {
  const t = ctx.game.tags[tag];
  return (t && t.legitimacy) || 0;
}
function mod(ctx, tag, id, name, effects, months) {
  return ctx.helpers.addTagModifier(ctx, tag, {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

// ---- the spine every settled constitution works -----------------------------
// Five rungs, shared by the Ethnarchy and Kingdom, because the first
// thing any of these states has to do is the same thing: survive its own
// founding, be obeyed from its own seat, put an army under the new name, run a
// chancery that can collect a tax under it, and then — the hard one — stop.
// Technology requirements follow the chapter's own baseline (SPEC §211).
//
// Cols 0-1 are the spine's and cols 2-3 are the branch's, so no form of
// government's own six collide with it.
function settledSpine(TAG) {
  const k = TAG.toLowerCase();
  return [
    {
      id: k + '_proclaimed', name: 'The Constitution Proclaimed',
      icon: 'scroll', col: 1, row: 0,
      desc: 'Settle the realm under the new arrangement: stability +2 and legitimacy 75, with '
        + 'nobody in the field claiming the seat it names.',
      rewardText: '"The New Arrangement": +8% income and −0.4 unrest everywhere permanently.',
      check: (ctx) => stabilityOf(ctx, TAG) >= 2 && legitimacyOf(ctx, TAG) >= 75
        && !(ctx.game.pretenders && ctx.game.pretenders[TAG]),
      reward: (ctx) => mod(ctx, TAG, k + '_new_arrangement', 'The New Arrangement',
        { incomeMult: 1.08, unrestAll: -0.4 }),
    },
    {
      id: k + '_the_seat', name: 'The Seat of Government',
      icon: 'temple', col: 0, row: 1, requires: [k + '_proclaimed'],
      desc: 'Hold Jerusalem, with eighteen provinces owned and controlled under the new name — '
        + 'more than the crown itself was proclaimed on.',
      rewardText: '+240 talents and "Obeyed From the City": +6% income, permanent.',
      check: (ctx) => holds(ctx, TAG, 'Jerusalem') && ownedCount(ctx, TAG) >= 18,
      reward: (ctx) => {
        ctx.helpers.adjust(ctx, TAG, { treasury: 240 });
        mod(ctx, TAG, k + '_obeyed_from_the_city', 'Obeyed From the City', { incomeMult: 1.06 });
      },
    },
    {
      id: k + '_the_muster', name: 'The Muster Under the New Name',
      icon: 'spears', col: 1, row: 1, requires: [k + '_proclaimed'],
      desc: 'Get 39,000 men onto the rolls of the state the constitution made — which is not '
        + 'the same act as having them.',
      rewardText: '+70 martial points and "Sworn to the Arrangement": +6% discipline permanently.',
      check: (ctx) => menOf(ctx, TAG) >= 39000,
      reward: (ctx) => {
        ctx.helpers.adjust(ctx, TAG, { mar: 70 });
        mod(ctx, TAG, k + '_sworn_to_it', 'Sworn to the Arrangement', { disciplineMult: 1.06 });
      },
    },
    {
      id: k + '_the_chancery', name: 'The Ledger and the Assize',
      icon: 'quill', col: 0, row: 2, requires: [k + '_the_seat'],
      desc: 'Take the art of government two rungs past this age\'s baseline and put 275 points '
        + 'of development under the new name.',
      rewardText: '"The Clerks of the New State": +6% income and +8% development growth, permanent.',
      check: (ctx) => govAbove(ctx, TAG, 2) && devOf(ctx, TAG) >= 275,
      reward: (ctx) => mod(ctx, TAG, k + '_the_clerks', 'The Clerks of the New State',
        { incomeMult: 1.06, growthMult: 1.08 }),
    },
    {
      id: k + '_the_quiet', name: 'The Years Nobody Writes About',
      icon: 'dove', col: 1, row: 2, requires: [k + '_the_muster'],
      desc: 'Stand at war with nobody, with the realm steady at stability +2.',
      rewardText: '"Nothing Happened That Year": −0.4 unrest everywhere and +0.1 public '
        + 'belief a month, permanent.',
      check: (ctx) => atPeace(ctx, TAG) && stabilityOf(ctx, TAG) >= 2,
      reward: (ctx) => mod(ctx, TAG, k + '_nothing_happened', 'Nothing Happened That Year',
        { unrestAll: -0.4, legitimacyAdd: 0.1 }),
    },
  ];
}

// ---- the ethnarchy: hereditary, and deliberately not a crown ---------------
// Ezekiel's prince and the coinage's Nasi are the same office: a house that
// succeeds itself, holds no priestly title, and is bound in writing not to
// take of the people's inheritance. The Two Houses is that office with a
// hereditary priest standing beside it and no arbiter above either. Both are
// answered in the same chapter, so this branch may name the room's own men.
const EPJ_BRANCH = [
  {
    id: 'epj_two_seals', name: 'Two Seals on Every Order',
    icon: 'scroll', col: 2, row: 0, requires: ['epj_proclaimed'],
    desc: 'Hold the realm at stability +3 with every estate in the room at 55 — an arrangement '
      + 'with no arbiter in it has to be agreed rather than decided.',
    rewardText: '+95 governance points and "Both Seals Affixed": −0.5 unrest everywhere and '
      + '+0.15 public belief a month, permanent.',
    check: (ctx) => stabilityOf(ctx, 'EPJ') >= 3 && courtFloor(ctx, 'EPJ', 55),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'EPJ', { gov: 95 });
      mod(ctx, 'EPJ', 'epj_both_seals', 'Both Seals Affixed',
        { unrestAll: -0.5, legitimacyAdd: 0.15 });
    },
  },
  {
    id: 'epj_the_princes_portion', name: "The Prince's Own Portion",
    icon: 'grain', col: 2, row: 1, requires: ['epj_two_seals'],
    desc: 'Ezekiel 46:18, administered: twenty provinces under the office with 600 talents in '
      + 'hand, and the household paid out of its own domain.',
    rewardText: '+300 talents and "He Shall Not Take of the People\'s Inheritance": +8% income '
      + 'and −0.4 unrest everywhere, permanent.',
    check: (ctx) => ownedCount(ctx, 'EPJ') >= 20 && treasuryOf(ctx, 'EPJ') >= 600,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'EPJ', { treasury: 300 });
      mod(ctx, 'EPJ', 'epj_not_of_the_inheritance', "He Shall Not Take of the People's Inheritance",
        { incomeMult: 1.08, unrestAll: -0.4 });
    },
  },
  {
    id: 'epj_the_letters', name: 'Wherever the Letters Are Read',
    icon: 'lamp', col: 2, row: 2, requires: ['epj_the_princes_portion'],
    desc: 'Stand at 65 with the Jews of Babylon, of Alexandria and of Rome: the office\'s reach '
      + 'is its post, and its post is longer than its border.',
    rewardText: '+120 influence points and "The Patriarch\'s Post": +15% from the ascents and '
      + '+6% income, permanent.',
    check: (ctx) => ['Babylon', 'Alexandria', 'Roma']
      .every((n) => standingAt(ctx, n) >= 65 || holds(ctx, 'EPJ', n)),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'EPJ', { infl: 120 });
      mod(ctx, 'EPJ', 'epj_the_post', "The Patriarch's Post",
        { pilgrimMult: 1.15, incomeMult: 1.06 });
    },
  },
  {
    id: 'epj_the_schools', name: 'The Schools in the Room',
    icon: 'quill', col: 3, row: 0, requires: ['epj_proclaimed'],
    desc: 'Bring the sages to 60. The office was invented by men who will go on ruling on it '
      + 'after the state is gone, and they know it.',
    rewardText: '+95 governance points and "The Prince and the Study House": +15% conversion '
      + 'and +0.15 public belief a month, permanent.',
    check: (ctx) => partyAt(ctx, 'EPJ', 'sages', 60),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'EPJ', { gov: 95 });
      mod(ctx, 'EPJ', 'epj_prince_and_study_house', 'The Prince and the Study House',
        { convertMult: 1.15, legitimacyAdd: 0.15 });
    },
  },
  {
    id: 'epj_the_house_raised', name: 'The House Raised Again',
    icon: 'temple', col: 3, row: 1, requires: ['epj_the_schools'],
    desc: 'Hold Jerusalem with 700 talents to spend, and put the House back on the Mount for '
      + 'a state that has no king to consecrate it.',
    rewardText: 'The House is raised: −300 talents; +40 legitimacy and "The Third House": '
      + '+0.2 public belief a month and +15% from the ascents, permanent.',
    check: (ctx) => holds(ctx, 'EPJ', 'Jerusalem') && treasuryOf(ctx, 'EPJ') >= 700,
    reward: (ctx) => {
      raiseTheHouse(ctx, 'EPJ');
      mod(ctx, 'EPJ', 'epj_the_third_house', 'The Third House',
        { legitimacyAdd: 0.2, pilgrimMult: 1.15 });
    },
  },
  {
    id: 'epj_the_office_binds', name: 'The Office That Binds Its Holder',
    icon: 'scales', col: 3, row: 2, requires: ['epj_the_house_raised'],
    desc: 'Seat an heir at legitimacy 85 and stability +3 — the constitution\'s one real claim '
      + 'is that it holds the men who wrote it, and this is the generation that tests it.',
    rewardText: '"The Terms Kept": +0.2 public belief a month and −0.4 unrest everywhere, '
      + 'permanent.',
    check: (ctx) => heirSeated(ctx, 'EPJ') && legitimacyOf(ctx, 'EPJ') >= 85
      && stabilityOf(ctx, 'EPJ') >= 3,
    reward: (ctx) => mod(ctx, 'EPJ', 'epj_the_terms_kept', 'The Terms Kept',
      { legitimacyAdd: 0.2, unrestAll: -0.4 }),
  },
];

// ---- the kingdom: a crown, and no mitre under it ---------------------------
// The Diadem is a crown taken out of a war by the house that won it; the House
// of David is the one claim in the Jewish world nobody argues with. Both are
// kingdoms, and a kingdom is judged on three things no commonwealth is: what
// the chanceries call it, what it builds, and whether it survives the man who
// took it.
const KGJ_BRANCH = [
  {
    id: 'kgj_the_royal_style', name: 'The Royal Style',
    icon: 'star8', col: 2, row: 0, requires: ['kgj_proclaimed'],
    desc: 'Hold Jerusalem at legitimacy 60 and let the new style go out over the seal.',
    rewardText: '+95 governance points and "Addressed as King": +0.15 public belief a month '
      + 'and +6% income, permanent.',
    check: (ctx) => holds(ctx, 'KGJ', 'Jerusalem') && legitimacyOf(ctx, 'KGJ') >= 60,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KGJ', { gov: 95 });
      mod(ctx, 'KGJ', 'kgj_addressed_as_king', 'Addressed as King',
        { legitimacyAdd: 0.15, incomeMult: 1.06 });
    },
  },
  {
    id: 'kgj_the_kings_own', name: "The King's Own",
    icon: 'helmet', col: 2, row: 1, requires: ['kgj_the_royal_style'],
    desc: 'Put 47,500 men under the crown\'s own banner with the war-craft of the age two '
      + 'rungs past this chapter\'s baseline.',
    rewardText: '+95 martial points and "The Levy of the Kingdom": +6% discipline and +10% '
      + 'manpower, permanent.',
    check: (ctx) => menOf(ctx, 'KGJ') >= 47500 && marAbove(ctx, 'KGJ', 2),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KGJ', { mar: 95 });
      mod(ctx, 'KGJ', 'kgj_levy_of_the_kingdom', 'The Levy of the Kingdom',
        { disciplineMult: 1.06, manpowerMult: 1.1 });
    },
  },
  {
    id: 'kgj_the_royal_cities', name: 'The Cities the Crown Built',
    icon: 'walls', col: 2, row: 2, requires: ['kgj_the_kings_own'],
    desc: 'Carry twenty-four provinces at 320 development — a crown is remembered for what it '
      + 'left standing, not for the year it was taken.',
    rewardText: '+95 governance points and "The Builder\'s Yards": +12% development growth and '
      + '+8% income, permanent.',
    check: (ctx) => ownedCount(ctx, 'KGJ') >= 24 && devOf(ctx, 'KGJ') >= 320,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KGJ', { gov: 95 });
      mod(ctx, 'KGJ', 'kgj_builders_yards', "The Builder's Yards",
        { growthMult: 1.12, incomeMult: 1.08 });
    },
  },
  {
    id: 'kgj_among_the_crowns', name: 'Among the Crowned Heads',
    icon: 'flag', col: 3, row: 0, requires: ['kgj_proclaimed'],
    desc: 'Stand among the world\'s first six courts with two alliances, or with a client '
      + 'kingdom of our own under the collar. Every chancery understands a king.',
    rewardText: '+120 influence points and "A Peer of Every Chancery": +1 diplomatic seat and '
      + '+8% trade, permanent.',
    check: (ctx) => {
      const i = standingRank(ctx, 'KGJ');
      if (!(i >= 0 && i < 6)) return false;
      return alliesOf(ctx, 'KGJ') >= 2 || clientsOf(ctx, 'KGJ') >= 1;
    },
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KGJ', { infl: 120 });
      mod(ctx, 'KGJ', 'kgj_peer_of_every_chancery', 'A Peer of Every Chancery',
        { diploSeats: 1, tradeMult: 1.08 });
    },
  },
  {
    id: 'kgj_the_house_raised', name: 'The House Raised Again',
    icon: 'temple', col: 3, row: 1, requires: ['kgj_among_the_crowns'],
    desc: 'Hold Jerusalem with 700 talents to spend, and put the House back on the Mount under '
      + 'the crown\'s own warrant.',
    rewardText: 'The House is raised: −300 talents; +40 legitimacy and "The King\'s House": '
      + '+0.2 public belief a month and +15% from the ascents, permanent.',
    check: (ctx) => holds(ctx, 'KGJ', 'Jerusalem') && treasuryOf(ctx, 'KGJ') >= 700,
    reward: (ctx) => {
      raiseTheHouse(ctx, 'KGJ');
      mod(ctx, 'KGJ', 'kgj_the_kings_house', "The King's House",
        { legitimacyAdd: 0.2, pilgrimMult: 1.15 });
    },
  },
  {
    id: 'kgj_the_second_king', name: 'The Second King of the House',
    icon: 'scales', col: 3, row: 2, requires: ['kgj_the_house_raised'],
    desc: 'Seat an heir at legitimacy 85 and stability +3, with a ruler the courtier roll rates '
      + 'at twelve — a crown becomes a dynasty at the second coronation, not the first.',
    rewardText: '"The Line Assured": +0.25 public belief a month and −0.5 unrest everywhere, '
      + 'permanent.',
    check: (ctx) => heirSeated(ctx, 'KGJ') && legitimacyOf(ctx, 'KGJ') >= 85
      && stabilityOf(ctx, 'KGJ') >= 3 && rulerWorth(ctx, 'KGJ', 12),
    reward: (ctx) => mod(ctx, 'KGJ', 'kgj_the_line_assured', 'The Line Assured',
      { legitimacyAdd: 0.25, unrestAll: -0.5 }),
  },
];

const EPJ_MISSIONS = [...settledSpine('EPJ'), ...EPJ_BRANCH];
const KGJ_MISSIONS = [...settledSpine('KGJ'), ...KGJ_BRANCH];

// Both crowns are player-only; chapter events continue through tag aliases.
// Neither declares a government in GOV_OF.
const GOVERNMENT_CROWNS = [
  {
    id: 'form_epj_jud', from: 'JUD', to: 'EPJ',
    name: 'Take the Name of the Ethnarchy',
    desc: 'A house holds the seat and passes it on, and nobody has put a crown on anybody: '
      + 'Ezekiel\'s prince, or the prince and the priest of the coinage. That office has a '
      + 'name in this country\'s own history and it is not kingdom — Hyrcanus was an ethnarch '
      + 'and so was Archelaus, and both of them were exactly this.',
    bookmarks: ['132ce'],
    requires: [
      {
        label: 'The seat is hereditary and uncrowned (the Patriarchate or the Two Houses)',
        check: (ctx, tag) => govIn(ctx, tag, ['nasi', 'dyarchy']),
      },
      { label: 'Own and control Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      { label: 'Own and control sixteen provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 16 },
      { label: 'The Sages stand with us (60)', check: (ctx, tag) => partyAt(ctx, tag, 'sages', 60) },
      { label: 'Stability 2', check: (ctx, tag) => stabilityOf(ctx, tag) >= 2 },
    ],
    bonus: {
      legitimacy: 25, stability: 2,
      grant: { treasury: 200, gov: 50, infl: 50 },
      rulerTitle: 'Nasi of Israel',
      modifier: {
        id: 'epj_the_office_and_its_terms', name: 'The Office and Its Terms', months: -1,
        effects: { legitimacyAdd: 0.2, convertMult: 1.1 },
      },
      modifier2: {
        id: 'epj_the_letters_are_the_office', name: 'The Letters Are the Office', months: -1,
        effects: { incomeMult: 1.08, unrestAll: -0.3 },
      },
    },
    missions: EPJ_MISSIONS,
  },
  {
    id: 'form_kgj_jud', from: 'JUD', to: 'KGJ',
    name: 'Take the Name of the Kingdom',
    desc: 'There is a king on this throne — by the war the house won, or by the line of '
      + 'Jehoiachin that nobody argues with — and every chancery between the Nile and the '
      + 'Tigris already knows how to address one. Say the form of government on the coins and '
      + 'in the letters: a kingdom of the Jews, with no priestly title under the crown.',
    bookmarks: ['132ce', '614ce'],
    requires: [
      {
        label: 'A crowned king holds the throne (the Diadem or the House of David)',
        check: (ctx, tag) => govIn(ctx, tag, ['diadem', 'davidic']),
      },
      { label: 'Own and control Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      { label: 'Own and control sixteen provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 16 },
      { label: 'Twenty thousand men under arms', check: (ctx, tag) => menOf(ctx, tag) >= 20000 },
      { label: 'Owe fealty to no one', check: (ctx, tag) => independent(ctx, tag) },
    ],
    bonus: {
      legitimacy: 25, stability: 1,
      grant: { treasury: 180, manpower: 5000, gov: 40, mar: 40 },
      rulerTitle: 'King of the Jews',
      modifier: {
        id: 'kgj_a_crown_understood', name: 'A Crown Every Chancery Understands', months: -1,
        effects: { moraleMult: 1.08, incomeMult: 1.08 },
      },
      modifier2: {
        id: 'kgj_the_objection_in_writing', name: 'The Objection, in Writing', months: -1,
        effects: { legitimacyAdd: 0.15, unrestAll: 0.15 },
      },
    },
    missions: KGJ_MISSIONS,
  },
];

// The remaining Judaean crowns can still form the Kingdom of Israel using
// the same dynasty and territorial requirements as Judaea and the Hasmoneans.
function israelFrom(from, bookmarks) {
  return {
    id: 'form_mli_' + from.toLowerCase(),
    from, to: 'MLI',
    name: 'Proclaim the Kingdom of Israel',
    desc: 'The constitution answered what this state is. This answers what it is FOR: not '
      + 'a settlement, not an arrangement, not an office with a text behind it — a kingdom, '
      + 'with Jerusalem for its seat and the Law for its charter, under the crown of David. '
      + 'Everything the last constitution was is now a chapter in the chronicle of this one.',
    bookmarks,
    requires: [
      { label: 'A son of David on the throne', check: (ctx) => davidicThrone(ctx) },
      {
        label: 'Own and control Jerusalem, Hebron, Neapolis, Sepphoris, Tiberias, and Adora',
        check: (ctx, tag) => ownsAndControls(ctx, tag, ISRAEL_HEARTLAND),
      },
      { label: 'Own and control twenty-five provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 25 },
      { label: 'Twelve provinces follow Judaism', check: (ctx, tag) => ownedControlledCount(ctx, tag, 'judaism') >= 12 },
      { label: 'Owe fealty to no one', check: (ctx, tag) => independent(ctx, tag) },
      { label: 'Stability 2', check: (ctx, tag) => stabilityOf(ctx, tag) >= 2 },
      { label: 'Legitimacy 85', check: (ctx, tag) => legitimacyOf(ctx, tag) >= 85 },
      { label: 'At peace', check: (ctx, tag) => atPeace(ctx, tag) },
    ],
    bonus: {
      legitimacy: 30, stability: 2,
      grant: { treasury: 300, manpower: 8000, gov: 60, infl: 60, mar: 60 },
      rulerTitle: 'King of Israel',
      modifier: {
        id: 'crown_of_david', name: 'The Crown of David', months: -1,
        effects: { incomeMult: 1.1, moraleMult: 1.05, unrestAll: -0.5 },
      },
      modifier2: {
        id: 'the_law_is_the_charter', name: 'The Law Is the Charter', months: -1,
        effects: { manpowerMult: 1.1, legitimacyAdd: 0.25, disciplineMult: 1.05 },
      },
    },
    missions: MLI_MISSIONS,
  };
}


// ---- the crown that ends the split (SPEC §276) ------------------------------
// The Iron Age chapters gave Judah two hundred years of being the smaller half
// and no way to stop being it. A player who takes the north — and in 931 that
// means beating a kingdom with three quarters of the people and all the good
// ground, which is the hard road the chapter's own blurb describes — had
// nothing to show for it but a bigger Judah.
//
// This is what there is to show for it. Not MLI: that crown is the Second
// Temple endgame, Judaism and the Law for a charter, and it belongs four
// centuries downstream. This one answers the assembly at Shechem in the age
// the assembly happened in.
//
// The cells are the ones the Iron Age chapters actually seat: Sebaste is
// Samaria and Neapolis is Shechem (the bookmark renames them for the era), and
// Caesarea Philippi is Panion at the foot of Hermon — the Dan end of the only
// phrase the sources use for the whole land.
// A place list in the words the map is using (SPEC §287). The checks key on
// canonical cells, which is right — a cell is the same ground under every
// name — but a label that lists the canonical names sends an Iron Age player
// looking for a "Sebaste" and a "Caesarea Philippi" that his map calls
// Samaria (Tirzah, before Omri builds it) and Dan.
function placesNow(ctx, names) {
  const shown = names.map((n) => { const p = ctx.prov(n); return (p && p.name) || n; });
  return shown.length > 1 ? shown.slice(0, -1).join(', ') + ' and ' + shown[shown.length - 1] : shown.join('');
}

const ALL_ISRAEL_CELLS = [
  'Jerusalem', 'Hebron',              // Judah's own seat and its second city
  'Sebaste', 'Neapolis',              // Samaria, and the town the kingdom broke at
  'Scythopolis', 'Sepphoris',         // the valley and the Galilee
  'Caesarea Philippi',                // the far north: from Dan
];

// Is the northern crown finished? `broken` is the file's own test — gone,
// collared, or down to a rump — and it is the right one here: a kingdom that
// still governs ten tribes has not been reunited with anybody.
function northEnded(ctx) {
  const g = ctx.game;
  const isl = g.tags.ISL;
  if (!isl || isl.alive === false) return true;
  return broken(ctx, 'ISL');
}

function menOfAis(ctx) { return menOf(ctx, 'AIS'); }

const AIS_MISSIONS = [
  {
    id: 'ais_the_elders_come', name: 'The Elders Come to Shechem',
    icon: 'star8', col: 1, row: 0,
    desc: 'Settle the kingdom under one crown: stability 2, and no pretender in the field.',
    rewardText: '"One Crown": +10% income and −0.6 unrest everywhere, permanent.',
    check: (ctx) => stabilityOf(ctx, 'AIS') >= 2
      && !(ctx.game.pretenders && ctx.game.pretenders.AIS),
    reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'AIS', {
      id: 'ais_one_crown', name: 'One Crown', months: -1,
      effects: { incomeMult: 1.1, unrestAll: -0.6 },
    }),
  },
  {
    id: 'ais_the_muster', name: 'The Muster of the Twelve',
    icon: 'spears', col: 0, row: 1, requires: ['ais_the_elders_come'],
    desc: 'Put 24,000 men under the one banner — the levies of both halves, called out '
      + 'together for the first time since Solomon.',
    rewardText: '+70 martial points and "The Levy of the Twelve": +10% manpower, permanent.',
    check: (ctx) => menOfAis(ctx) >= 24000,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'AIS', { mar: 70 });
      ctx.helpers.addTagModifier(ctx, 'AIS', {
        id: 'ais_levy_of_twelve', name: 'The Levy of the Twelve', months: -1,
        effects: { manpowerMult: 1.1 },
      });
    },
  },
  {
    id: 'ais_one_altar', name: 'One Altar, and the Calves Thrown Down',
    icon: 'flame', col: 2, row: 1, requires: ['ais_the_elders_come'],
    desc: 'Going up to Jerusalem no longer means going up to somebody else\'s king. Bring '
      + 'twenty provinces of the kingdom to the faith of the Name.',
    rewardText: '+80 government points and "One Altar": +0.3 legitimacy a month and '
      + '−0.8 unrest everywhere, permanent.',
    check: (ctx) => ownedCount(ctx, 'AIS', 'yahwism') >= 20,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'AIS', { gov: 80 });
      ctx.helpers.addTagModifier(ctx, 'AIS', {
        id: 'ais_one_altar', name: 'One Altar', months: -1,
        effects: { legitimacyAdd: 0.3, unrestAll: -0.8 },
      });
    },
  },
  {
    id: 'ais_the_land', name: 'From Dan to the Negev',
    icon: 'grain', col: 1, row: 2, requires: ['ais_the_muster', 'ais_one_altar'],
    desc: 'Twenty-eight provinces under the crown: the hill country, the valley, the '
      + 'Galilee and the south, held rather than merely marched through.',
    rewardText: '+250 talents and "The Land Whole": +12% growth, permanent.',
    check: (ctx) => ownedCount(ctx, 'AIS') >= 28,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'AIS', { treasury: 250 });
      ctx.helpers.addTagModifier(ctx, 'AIS', {
        id: 'ais_land_whole', name: 'The Land Whole', months: -1,
        effects: { growthMult: 1.12 },
      });
    },
  },
  {
    id: 'ais_the_sea', name: 'A Coast of Our Own',
    icon: 'ship', col: 0, row: 3, requires: ['ais_the_land'],
    desc: 'Neither kingdom ever held a port. Hold Dor and Aphek, and the trade that '
      + 'has always gone to Tyre comes here instead.',
    rewardText: '"The Coast Road": +14% trade and +10% income, permanent.',
    check: (ctx) => ownsAndControls(ctx, 'AIS', ['Dora', 'Antipatris']),
    reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'AIS', {
      id: 'ais_coast_road', name: 'The Coast Road', months: -1,
      effects: { tradeMult: 1.14, incomeMult: 1.1 },
    }),
  },
  {
    id: 'ais_the_house', name: 'The House Enlarged',
    icon: 'bricks', col: 2, row: 3, requires: ['ais_the_land'],
    desc: 'Build the kingdom rather than merely holding it: 150 points of development '
      + 'under the crown.',
    rewardText: '"The Builders": +9% income and +0.2 legitimacy a month, permanent.',
    check: (ctx) => devOf(ctx, 'AIS') >= 150,
    reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'AIS', {
      id: 'ais_the_builders', name: 'The Builders', months: -1,
      effects: { incomeMult: 1.09, legitimacyAdd: 0.2 },
    }),
  },
  {
    id: 'ais_the_succession', name: 'The Succession Nobody Contested',
    icon: 'laurel', col: 1, row: 4, requires: ['ais_the_sea', 'ais_the_house'],
    desc: 'The north went through nine dynasties in two hundred years. Reach legitimacy 90 '
      + 'with an heir named, and the question is closed.',
    rewardText: '"The House Secure": +0.35 legitimacy a month, +8% discipline and '
      + '−0.5 unrest everywhere, permanent.',
    check: (ctx) => legitimacyOf(ctx, 'AIS') >= 90
      && !!(ctx.game.tags.AIS && ctx.game.tags.AIS.heir),
    reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'AIS', {
      id: 'ais_house_secure', name: 'The House Secure', months: -1,
      effects: { legitimacyAdd: 0.35, disciplineMult: 1.08, unrestAll: -0.5 },
    }),
  },
  {
    id: 'ais_outlast_them', name: 'Outlast the Empire',
    icon: 'shield', col: 1, row: 5, requires: ['ais_the_succession'],
    desc: 'Every kingdom on this map becomes somebody\'s province. Stand as one at the end '
      + 'of the chapter — independent, at peace, and still holding Jerusalem, Samaria and '
      + 'the Galilee.',
    rewardText: '+400 talents and "The Kingdom That Was Not Deported": +12% manpower, '
      + '+10% siege defence and +0.4 legitimacy a month, permanent.',
    check: (ctx) => independent(ctx, 'AIS') && atPeace(ctx, 'AIS')
      && ownsAndControls(ctx, 'AIS', ['Jerusalem', 'Sebaste', 'Sepphoris']),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'AIS', { treasury: 400 });
      ctx.helpers.addTagModifier(ctx, 'AIS', {
        id: 'ais_not_deported', name: 'The Kingdom That Was Not Deported', months: -1,
        effects: { manpowerMult: 1.12, siegeDefenseMult: 1.1, legitimacyAdd: 0.4 },
      });
    },
  },
];

export const FORMABLES = [
  {
    id: 'form_has_hyr',
    from: 'HYR', to: 'HAS',
    name: 'Restore Hasmonean Judaea',
    desc: 'The kingdom of your grandfather Yannai, whole again under the elder line. '
      + 'Let the brothers\' war end the way dynastic wars are supposed to: with one '
      + 'throne, one Temple, and one name on the coins.',
    bookmarks: ['67bce'],
    requires: [
      { label: 'Hold Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      { label: 'Hold twelve provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 12 },
      { label: "Aristobulus' cause broken (dead, client, or a rump of 3)", check: (ctx) => broken(ctx, 'ARI') },
      { label: 'Legitimacy 50', check: (ctx, tag) => (ctx.game.tags[tag].legitimacy || 0) >= 50 },
    ],
    bonus: {
      legitimacy: 25, stability: 1,
      // The dynasty's own treasury and levies come out of hiding with it.
      grant: { treasury: 150, manpower: 4000, gov: 40, mar: 25 },
      modifier: {
        id: 'kingdom_restored', name: 'The Kingdom Restored', months: -1,
        effects: { incomeMult: 1.1, moraleMult: 1.05 },
      },
      modifier2: {
        id: 'priestly_crown', name: 'The Priestly Crown', months: -1,
        effects: { unrestAll: -0.5, legitimacyAdd: 0.15 },
      },
    },
    missions: HAS_MISSIONS,
  },
  {
    id: 'form_has_ari',
    from: 'ARI', to: 'HAS',
    name: 'Restore Hasmonean Judaea',
    desc: 'Your father\'s kingdom, whole again under the abler son. The priesthood '
      + 'will grumble about the succession; victors write the genealogies.',
    bookmarks: ['67bce'],
    requires: [
      { label: 'Hold Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      { label: 'Hold twelve provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 12 },
      { label: "Hyrcanus' cause broken (dead, client, or a rump of 3)", check: (ctx) => broken(ctx, 'HYR') },
      { label: 'Legitimacy 50', check: (ctx, tag) => (ctx.game.tags[tag].legitimacy || 0) >= 50 },
    ],
    bonus: {
      legitimacy: 25, stability: 1,
      // The dynasty's own treasury and levies come out of hiding with it.
      grant: { treasury: 150, manpower: 4000, gov: 40, mar: 25 },
      modifier: {
        id: 'kingdom_restored', name: 'The Kingdom Restored', months: -1,
        effects: { incomeMult: 1.1, moraleMult: 1.05 },
      },
      modifier2: {
        id: 'priestly_crown', name: 'The Priestly Crown', months: -1,
        effects: { unrestAll: -0.5, legitimacyAdd: 0.15 },
      },
    },
    missions: HAS_MISSIONS,
  },
  {
    id: 'form_has_atg',
    from: 'ATG', to: 'HAS',
    name: 'Restore Hasmonean Judaea',
    desc: 'You are the last king of the blood. Break the Idumean\'s paper crown, and '
      + 'the dynasty the Romans deposed rules again in its own name — no client, no '
      + 'decree, no Antony.',
    bookmarks: ['40bce'],
    requires: [
      { label: 'Hold Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      { label: 'Hold Hebron', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Hebron']) },
      { label: 'Hold ten provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 10 },
      { label: "Herod's cause broken (dead, client, or a rump of 3)", check: (ctx) => broken(ctx, 'HER') },
      { label: 'Owe fealty to no one', check: (ctx, tag) => !ctx.game.tags[tag].overlord },
    ],
    bonus: {
      legitimacy: 30, stability: 1,
      // The dynasty's own treasury and levies come out of hiding with it.
      grant: { treasury: 150, manpower: 4000, gov: 40, mar: 25 },
      modifier: {
        id: 'kingdom_restored', name: 'The Kingdom Restored', months: -1,
        effects: { incomeMult: 1.1, moraleMult: 1.05 },
      },
      modifier2: {
        id: 'priestly_crown', name: 'The Priestly Crown', months: -1,
        effects: { unrestAll: -0.5, legitimacyAdd: 0.15 },
      },
    },
    missions: HAS_MISSIONS,
  },
  {
    id: 'form_jud_her',
    from: 'HER', to: 'JUD',
    name: 'Proclaim the Kingdom of Judaea',
    desc: 'The decree of the Senate made you king of a country you did not hold. Now '
      + 'you hold it. Let the title mean the land itself: Judaea, under Herod, in fact '
      + 'as well as parchment.',
    bookmarks: ['40bce'],
    requires: [
      { label: 'Hold Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      { label: 'Hold ten provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 10 },
      { label: "Antigonus' cause broken (dead, client, or a rump of 3)", check: (ctx) => broken(ctx, 'ATG') },
      { label: 'Legitimacy 40', check: (ctx, tag) => (ctx.game.tags[tag].legitimacy || 0) >= 40 },
    ],
    bonus: {
      legitimacy: 25, stability: 1,
      // The builder-king's programme is money and mortar, not manpower.
      grant: { treasury: 250, gov: 50, infl: 40 },
      modifier: {
        id: 'herods_peace', name: "Herod's Peace", months: -1,
        effects: { incomeMult: 1.15 },
      },
      modifier2: {
        id: 'the_builder_king', name: 'The Builder King', months: -1,
        effects: { tradeMult: 1.12, legitimacyAdd: 0.1 },
      },
    },
  },
  // ---- the client king who is given the whole country ----------------------
  {
    id: 'form_jud_agr',
    from: 'AGR', to: 'JUD',
    name: 'Proclaim the Kingdom of Judaea',
    desc: 'You told them on the Xystus what sixty thousand men mean, and they threw '
      + 'stones at you for it. You were right, and being right has taken everything: '
      + 'the rising is finished, the country is quiet, and the men who called you Rome\'s '
      + 'creature are dead or scattered. So take the title your great-grandfather held '
      + 'and your family has been asking Caesar for ever since — not the tetrarchy of a '
      + 'Golan valley and two towns Nero happened to be feeling generous about, but '
      + 'JUDAEA: Jerusalem, the Temple whose High Priest you already name, and the whole '
      + 'of the country. A client kingdom is cheaper than a province. Prove it.',
    bookmarks: ['66ce'],
    // The banner is the revolt's while the revolt lives (SPEC §221), so the
    // crown sits in the panel, greyed, from the first day of the chapter.
    contested: true,
    requires: [
      {
        label: 'The rising is ended — no court flies the banner of Judaea',
        check: (ctx) => !ctx.game.tags.JUD || ctx.game.tags.JUD.alive === false,
      },
      { label: 'Hold Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      {
        // The country the rising held, not the coast Rome governs from:
        // Caesarea Maritima is the procurator's own seat, and a client king
        // taking it from Caesar is a different chapter entirely.
        label: 'Hold the country: Jericho, Sepphoris and Tiberias',
        check: (ctx, tag) => holdsAll(ctx, tag, ['Jericho', 'Sepphoris', 'Tiberias']),
      },
      { label: 'Own and control ten provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 10 },
      {
        // The crown of Judaea is Rome's to give — or, for a house that has
        // stopped asking, ours to take. Either road, and the label says both.
        label: 'Caesar is content with us (Rome 50+), or we answer to nobody',
        check: (ctx, tag) => {
          const rom = ctx.game.tags.ROM;
          const regard = rom && rom.opinion ? (rom.opinion[tag] || 0) : 0;
          return (rom && rom.alive && regard >= 50) || independent(ctx, tag);
        },
      },
      { label: 'Legitimacy 40', check: (ctx, tag) => (ctx.game.tags[tag].legitimacy || 0) >= 40 },
      { label: 'Stability 1', check: (ctx, tag) => (ctx.game.tags[tag].stability || 0) >= 1 },
    ],
    bonus: {
      legitimacy: 25, stability: 1,
      // Not the client's chancery this time (SPEC §221) — a kingdom's levies,
      // a kingdom's treasury, and the ministries to run a whole country.
      grant: { treasury: 150, manpower: 3000, gov: 40, infl: 40 },
      // The title Rome conferred, and the one the family spent a century
      // asking for.
      rulerTitle: 'King of the Jews',
      modifier: {
        id: 'the_whole_country', name: 'The Whole Country', months: -1,
        effects: { incomeMult: 1.1, manpowerMult: 1.1 },
      },
      modifier2: {
        // Claudius left the house the custody of the vestments and the naming
        // of the High Priest. It is the whole reason this crown is not merely
        // a Roman governorship with a diadem on it.
        id: 'custody_of_the_vestments', name: 'The Custody of the Vestments', months: -1,
        effects: { legitimacyAdd: 0.2, unrestAll: -0.5 },
      },
    },
  },
  // ---- the Kingdom of Israel: the endgame crown of every Jewish arc ----------
  {
    id: 'form_mli_jud',
    from: 'JUD', to: 'MLI',
    name: 'Proclaim the Kingdom of Israel',
    desc: 'Not a revolt that survived, not a client on sufferance — a kingdom, with '
      + 'Jerusalem for its seat and the Law for its charter. The crown of David — '
      + 'and the sceptre does not depart from Judah, so it is claimed in two courts: '
      + 'the field, and the genealogies.',
    // 351 is on this list for the reason the compendium already gives: the
    // crown of Israel is David's, so every chapter that can seat a son of
    // David must have somewhere for him to be crowned. The rising plays the
    // shared House of David pool like its neighbours — `ev_hd_the_son_of_the
    // _marriage` sets `davidicThrone` — and without this line that road ended
    // at a locked door. Nothing is given away by opening it: the gate below
    // wants Jerusalem, the heartland, twenty-five provinces and a peace, and
    // a chapter that opens with three towns and a stolen arms chest reaches
    // that the same way 132 and 614 do, which is by winning for eighty years.
    bookmarks: ['66ce', '132ce', '351ce', '614ce'],
    requires: [
      {
        label: 'A son of David on the throne',
        check: (ctx) => davidicThrone(ctx),
      },
      {
        label: 'Own and control Jerusalem, Hebron, Neapolis, Sepphoris, Tiberias, and Adora',
        check: (ctx, tag) => ownsAndControls(ctx, tag, ISRAEL_HEARTLAND),
      },
      { label: 'Own and control twenty-five provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 25 },
      { label: 'Twelve provinces follow Judaism', check: (ctx, tag) => ownedControlledCount(ctx, tag, 'judaism') >= 12 },
      { label: 'Owe fealty to no one', check: (ctx, tag) => independent(ctx, tag) },
      { label: 'Stability 2', check: (ctx, tag) => (ctx.game.tags[tag].stability || 0) >= 2 },
      { label: 'Legitimacy 85', check: (ctx, tag) => (ctx.game.tags[tag].legitimacy || 0) >= 85 },
      { label: 'At peace', check: (ctx, tag) => atPeace(ctx, tag) },
    ],
    bonus: {
      legitimacy: 30, stability: 2,
      // The endgame crown pays like one: a full treasury, the levies of a
      // kingdom, and the ministries of a state that has stopped improvising.
      grant: { treasury: 300, manpower: 8000, gov: 60, infl: 60, mar: 60 },
      // The man who proclaims Israel is styled by it (SPEC §178). The 614
      // coronation's fuller "King of Israel, of the House of David" already
      // says Israel and is left standing.
      rulerTitle: 'King of Israel',
      modifier: {
        id: 'crown_of_david', name: 'The Crown of David', months: -1,
        effects: { incomeMult: 1.1, moraleMult: 1.05, unrestAll: -0.5 },
      },
      modifier2: {
        id: 'the_law_is_the_charter', name: 'The Law Is the Charter', months: -1,
        effects: { manpowerMult: 1.1, legitimacyAdd: 0.25, disciplineMult: 1.05 },
      },
    },
    missions: MLI_MISSIONS,
  },
  {
    id: 'form_mli_has',
    from: 'HAS', to: 'MLI',
    name: 'Proclaim the Kingdom of Israel',
    desc: 'The Hasmonean priest-kings took a rebel province and made it a state. '
      + 'Take the state and make it what the prophets named: Israel, whole, under '
      + 'one crown in Jerusalem.',
    bookmarks: ['167bce', '67bce', '40bce'],
    requires: [
      {
        label: 'A son of David on the throne',
        check: (ctx) => davidicThrone(ctx),
      },
      {
        label: 'Own and control Jerusalem, Hebron, Neapolis, Sepphoris, Tiberias, and Adora',
        check: (ctx, tag) => ownsAndControls(ctx, tag, ISRAEL_HEARTLAND),
      },
      { label: 'Own and control twenty-five provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 25 },
      { label: 'Twelve provinces follow Judaism', check: (ctx, tag) => ownedControlledCount(ctx, tag, 'judaism') >= 12 },
      { label: 'Owe fealty to no one', check: (ctx, tag) => independent(ctx, tag) },
      { label: 'Stability 2', check: (ctx, tag) => (ctx.game.tags[tag].stability || 0) >= 2 },
      { label: 'Legitimacy 85', check: (ctx, tag) => (ctx.game.tags[tag].legitimacy || 0) >= 85 },
      { label: 'At peace', check: (ctx, tag) => atPeace(ctx, tag) },
    ],
    bonus: {
      legitimacy: 30, stability: 2,
      // The endgame crown pays like one: a full treasury, the levies of a
      // kingdom, and the ministries of a state that has stopped improvising.
      grant: { treasury: 300, manpower: 8000, gov: 60, infl: 60, mar: 60 },
      // The man who proclaims Israel is styled by it (SPEC §178).
      rulerTitle: 'King of Israel',
      modifier: {
        id: 'crown_of_david', name: 'The Crown of David', months: -1,
        effects: { incomeMult: 1.1, moraleMult: 1.05, unrestAll: -0.5 },
      },
      modifier2: {
        id: 'the_law_is_the_charter', name: 'The Law Is the Charter', months: -1,
        effects: { manpowerMult: 1.1, legitimacyAdd: 0.25, disciplineMult: 1.05 },
      },
    },
    missions: MLI_MISSIONS,
  },
  // ---- 1948: the united Arab crown, if Israel is strangled -------------------
  {
    id: 'form_uar_egy',
    from: 'EGY', to: 'UAR',
    name: 'Proclaim the United Arab Republic',
    desc: 'Cairo wins the war the League only talked about — and claims the mantle: '
      + 'one Arab republic from the Nile across the Jordan, with every rival capital '
      + 'reduced to a governorate.',
    bookmarks: ['1948ce'],
    requires: [
      { label: 'Hold Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      { label: 'Hold Tel Aviv-Jaffa (Joppa)', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Joppa']) },
      { label: "Israel's cause broken (dead, client, or a rump of 3)", check: (ctx) => broken(ctx, 'ISR') },
      { label: 'Hold twenty provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 20 },
    ],
    bonus: {
      legitimacy: 25, stability: 1,
      grant: { treasury: 200, manpower: 10000, gov: 40, infl: 40, mar: 40 },
      modifier: {
        id: 'arab_unity', name: 'The Hour of Unity', months: -1,
        effects: { manpowerMult: 1.1, incomeMult: 1.05 },
      },
      modifier2: {
        id: 'one_republic', name: 'One Republic, Two Capitals', months: -1,
        effects: { disciplineMult: 1.05, unrestAll: 0.25 },
      },
    },
  },
  {
    id: 'form_uar_jor',
    from: 'JOR', to: 'UAR',
    name: 'Proclaim the United Arab Republic',
    desc: 'The Hashemite king ends the war holding what every other Arab ruler '
      + 'promised — and takes the mantle with it: one crown from the desert to the sea.',
    bookmarks: ['1948ce'],
    requires: [
      { label: 'Hold Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      { label: 'Hold Tel Aviv-Jaffa (Joppa)', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Joppa']) },
      { label: "Israel's cause broken (dead, client, or a rump of 3)", check: (ctx) => broken(ctx, 'ISR') },
      { label: 'Hold twenty provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 20 },
    ],
    bonus: {
      legitimacy: 25, stability: 1,
      grant: { treasury: 200, manpower: 10000, gov: 40, infl: 40, mar: 40 },
      modifier: {
        id: 'arab_unity', name: 'The Hour of Unity', months: -1,
        effects: { manpowerMult: 1.1, incomeMult: 1.05 },
      },
      modifier2: {
        id: 'one_republic', name: 'One Republic, Two Capitals', months: -1,
        effects: { disciplineMult: 1.05, unrestAll: 0.25 },
      },
    },
  },
  // ---- the Iron Age: Judah ends the split (SPEC §276) ---------------------
  {
    id: 'form_ais_jdh',
    from: 'JDH', to: 'AIS',
    name: 'Proclaim the United Kingdom of Israel',
    desc: 'The elders came to Shechem to ask one question and were answered with whips '
      + 'and scorpions, and the kingdom has been two kingdoms ever since. The north is '
      + 'finished, its capital and its sanctuaries are under this crown, and the man in '
      + 'Jerusalem is of the house the ten tribes walked out on. Take the name they '
      + 'walked out with: not Judah enlarged — all Israel, as it was under David, and '
      + 'the ten tribes written into the rolls of the two.',
    // The Iron Age only. MLI is the same idea four centuries downstream and
    // wears a different faith; a chapter that can reach one must not offer both.
    bookmarks: ['931bce', '732bce', '597bce'],
    requires: [
      { label: 'The northern kingdom is finished', check: (ctx) => northEnded(ctx) },
      {
        label: 'Own and control Jerusalem, Hebron, Samaria, Shechem, Beth-Shean, Shimron and Dan',
        liveLabel: (ctx) => 'Own and control ' + placesNow(ctx, ALL_ISRAEL_CELLS),
        check: (ctx, tag) => ownsAndControls(ctx, tag, ALL_ISRAEL_CELLS),
      },
      { label: 'Own and control twenty-two provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 22 },
      { label: 'Fourteen provinces keep the Name', check: (ctx, tag) => ownedControlledCount(ctx, tag, 'yahwism') >= 14 },
      { label: 'Owe fealty to no one', check: (ctx, tag) => independent(ctx, tag) },
      { label: 'Stability 2', check: (ctx, tag) => stabilityOf(ctx, tag) >= 2 },
      { label: 'Legitimacy 80', check: (ctx, tag) => legitimacyOf(ctx, tag) >= 80 },
      { label: 'At peace', check: (ctx, tag) => atPeace(ctx, tag) },
    ],
    bonus: {
      legitimacy: 25, stability: 2,
      grant: { treasury: 200, manpower: 6000, gov: 45, infl: 45, mar: 45 },
      rulerTitle: 'King of Israel',
      modifier: {
        id: 'ais_the_two_sticks', name: 'The Two Sticks Made One', months: -1,
        effects: { manpowerMult: 1.1, moraleMult: 1.05, unrestAll: -0.5 },
      },
      modifier2: {
        id: 'ais_the_house_of_david', name: 'The House That Did Not Break', months: -1,
        effects: { legitimacyAdd: 0.25, incomeMult: 1.08 },
      },
      // The reunification itself (SPEC §276). The crown's culture is judean,
      // so Judah's own cells stay the crown's own; what the proclamation buys
      // is the OTHER half — every Israelite province this crown holds is
      // written into its rolls the day it is proclaimed, which is the one
      // thing a rename could not do and the whole reason the decision exists.
      onForm: (ctx, tag) => {
        let written = 0;
        for (const p of ctx.game.provinces) {
          if (!p || p.impassable || p.owner !== tag) continue;
          if (p.culture !== 'israelite') continue;
          // `num` is the sim's; this file imports nothing, so read it plainly.
          if (Number.isFinite(p.integration) && p.integration >= 1) continue;
          p.integration = 1;
          p.integrating = null;
          written++;
        }
        ctx.helpers.chronicle(ctx, 'era', written
          ? 'The ten tribes are written into the rolls of the two: ' + written
            + (written === 1 ? ' district' : ' districts')
            + ' of the north entered as the kingdom\'s own, not as conquests held.'
          : 'The kingdom is proclaimed over ground already entered in its own rolls.');
      },
    },
    missions: AIS_MISSIONS,
  },
  // ---- 614: the Empire un-divided ---------------------------------------------
  {
    id: 'form_rom_byz',
    from: 'BYZ', to: 'ROM',
    name: 'Restore the Roman Empire',
    desc: 'Hold the four great cities of the East — Antioch, Alexandria, Jerusalem, '
      + 'and the King of Kings\' own Ctesiphon — and no chancery in the world will '
      + 'dare write "Byzantine." The Empire is Rome again, in fact and in name.',
    bookmarks: ['614ce'],
    requires: [
      { label: 'Hold Antioch', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Antioch']) },
      { label: 'Hold Alexandria', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Alexandria']) },
      { label: 'Hold Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      { label: 'Hold Seleucia-Ctesiphon', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Seleucia-Ctesiphon']) },
    ],
    bonus: {
      legitimacy: 30, stability: 1,
      grant: { treasury: 400, manpower: 12000, gov: 60, infl: 60, mar: 60 },
      modifier: {
        id: 'renovatio_imperii', name: 'Renovatio Imperii', months: -1,
        effects: { disciplineMult: 1.05, legitimacyAdd: 0.2 },
      },
      modifier2: {
        id: 'the_name_restored', name: 'The Name Restored', months: -1,
        effects: { incomeMult: 1.08, moraleMult: 1.05 },
      },
    },
  },
  // ---- the remaining Judaean government crowns (SPEC §250) ---------------
  ...GOVERNMENT_CROWNS,
  israelFrom('EPJ', ['132ce']),
  israelFrom('KGJ', ['132ce', '614ce']),
];
