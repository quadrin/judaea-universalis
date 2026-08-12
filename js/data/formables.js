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
function holds(ctx, tag, name) { return ctx.helpers.controls(ctx, tag, name); }
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

// ---- the constitution takes a name of its own (SPEC §227) -------------------
// §214 gave the five constitutional forks teeth: a road that abolishes
// hereditary priestly power abolishes it, the succession rules move with the
// answer, and the Government row in the realm panel finally says which of the
// four was taken. What it could not do is make the answer a COUNTRY. All four
// settlements of 71 left the same three letters on the map in the same blue,
// under the same emblem, working the same chapter tree: a Judaea that filled
// its high priesthood by lot and a Judaea that had handed the office back to
// the four houses were one state wearing two labels, and the label was in a
// panel row the player had to go and look at.
//
// So every Jewish constitution is now a crown of its own, carried on the §22
// formable machinery every other greater banner already uses — three letters,
// a name and a colour on the map, an emblem, national ideas, and a mission
// tree written for THAT constitution and no other. Ten of them, out of the ten
// the four Jewish forks adopt: the temple-state, the lot, the Jubilee and no
// ruler but God out of the settlement of 71; the priest-kingdom and the
// commonwealth out of the diadem of 104 BCE; and the crown, the Davidic house,
// the two hereditary offices and Ezekiel's prince out of the accession of Beit
// Kosiba, two of which the crown of David in 614 offers again.
//
// The plumbing is `GOV_OF`. Every one of these banners declares the
// constitution it belongs to, and `switchTagCore` already applies the new
// banner's government when a crown is proclaimed — so taking the crown IS
// adopting the constitution, with the election clock started and the heir
// cleared where it does not inherit, and a save that reaches the crown by the
// fork and a save that reaches it by the panel land on the same state.
//
// The fork is untouched, on purpose. It still writes the constitution at its
// own call site, still sets its road marker, still fills §130's store: a
// player who answers The Second Government and never opens the Decisions panel
// gets exactly the game §214 shipped. The crown is the second half — the
// state's own name for what it has become, and a tree that asks after it.
//
// Two rules the ten obey. The first requirement of every one of them is the
// constitution itself, read off `govType` rather than off a flag, because that
// is the fact the crown is about; a realm that answered the fork differently
// sees the other nine as decisions it does not have. And every one of them
// keeps the road to the Kingdom of Israel open (the `israelFrom` entries
// below), because MLI is the endgame crown of the whole Jewish arc and a
// constitution is not a cul-de-sac — a commonwealth that finds a son of David
// may still proclaim the kingdom, and proclaiming it ends the commonwealth,
// which is the correct and rather pointed answer.
//
// The Samaritan crown at Neapolis (§136) adopts two of these same
// constitutions and gets no banner here: SAM is not a Jewish court, its road
// is its own chapter's, and a Samaritan state flying a Judaean crown would be
// the one thing that whole fork is about not being.

function govIs(ctx, tag, gov) {
  const t = ctx.game.tags[tag];
  return !!t && t.govType === gov;
}
// Court approval, read for a single named estate. The crowns below are each
// offered in one or two chapters rather than six, so unlike the Kingdom of
// Israel's shared spine they MAY name the party in the room — and should,
// because a constitution is a bargain with particular men.
function partyAt(ctx, tag, id, min) {
  try {
    const v = ctx.helpers.faction(ctx, tag, id);
    return Number.isFinite(v) && v >= min;
  } catch (e) { return false; }
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
// Five rungs, written once and read by all ten, because the first thing any of
// these states has to do is the same thing: survive its own founding, be
// obeyed from its own seat, put an army under the new name, run a chancery
// that can collect a tax under it, and then — the hard one — stop. They read
// RELATIVE to the chapter's own technology baseline for the reason §211 gives:
// these crowns stand in chapters seven hundred years apart.
//
// Cols 0-1 are the spine's and cols 2-3 are the branch's, so no constitution's
// own eight collide with it.
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

// ---- 66 CE, the settlement of 71: the temple-state --------------------------
// The arrangement with four centuries of practice behind it, and with the
// grievance that started the war written into it as the constitution.
const SNH_BRANCH = [
  {
    id: 'snh_the_courses', name: 'The Twenty-Four Courses',
    icon: 'altar', col: 2, row: 0, requires: ['snh_proclaimed'],
    desc: 'Put the roster back in place over a standing House, with 550 talents to pay for the '
      + 'year it will take.',
    rewardText: '+95 governance points and "The Rota Restored": +0.15 public belief a '
      + 'month and −0.3 unrest everywhere, permanent.',
    check: (ctx) => templeStands(ctx) && holds(ctx, 'SNH', 'Jerusalem')
      && treasuryOf(ctx, 'SNH') >= 550,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'SNH', { gov: 95 });
      mod(ctx, 'SNH', 'snh_rota_restored', 'The Rota Restored',
        { legitimacyAdd: 0.15, unrestAll: -0.3 });
    },
  },
  {
    id: 'snh_the_half_shekel', name: 'The Chest From Every Province',
    icon: 'coins', col: 2, row: 1, requires: ['snh_the_courses'],
    desc: 'Alexandria, Antioch and Babylon standing with us at 60, or under the crown '
      + 'outright.',
    rewardText: '+400 talents and "The Levy Restored": +12% income and +8% trade, permanent.',
    check: (ctx) => ['Alexandria', 'Antioch', 'Babylon']
      .every((n) => standingAt(ctx, n) >= 60 || holds(ctx, 'SNH', n)),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'SNH', { treasury: 400 });
      mod(ctx, 'SNH', 'snh_levy_restored', 'The Levy Restored',
        { incomeMult: 1.12, tradeMult: 1.08 });
    },
  },
  {
    id: 'snh_the_festivals', name: 'Three Times in the Year',
    icon: 'granary', col: 2, row: 2, requires: ['snh_the_half_shekel'],
    desc: 'Hold the pilgrim roads and the towns that feed them, Jerusalem, Jericho, Emmaus and '
      + 'Lydda, with 250 points of development behind them.',
    rewardText: '+300 talents and "The Roads Fill Three Times": +8% income and +8% '
      + 'development growth, permanent.',
    check: (ctx) => holdsAll(ctx, 'SNH', ['Jerusalem', 'Jericho', 'Emmaus', 'Lydda'])
      && devOf(ctx, 'SNH') >= 250,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'SNH', { treasury: 300 });
      mod(ctx, 'SNH', 'snh_roads_fill', 'The Roads Fill Three Times',
        { incomeMult: 1.08, growthMult: 1.08 });
    },
  },
  {
    id: 'snh_the_vestments', name: 'The Vestments in Our Own Keeping',
    icon: 'shrine', col: 2, row: 3, requires: ['snh_the_festivals'],
    desc: 'Owe fealty to nobody, with the House standing and legitimacy 70.',
    rewardText: '"Ours to Keep": +0.2 public belief a month and +1 envoy, permanent.',
    check: (ctx) => independent(ctx, 'SNH') && templeStands(ctx)
      && legitimacyOf(ctx, 'SNH') >= 70,
    reward: (ctx) => mod(ctx, 'SNH', 'snh_ours_to_keep', 'Ours to Keep',
      { legitimacyAdd: 0.2, diploSeats: 1 }),
  },
  {
    id: 'snh_the_four_houses', name: 'Boethus, Hanin, Kathros, Ishmael',
    icon: 'scales', col: 3, row: 0, requires: ['snh_proclaimed'],
    desc: 'The Temple priesthood at 70 and the peace party at 55 — the settlement hands the '
      + 'country back to the four families, so both must be in one room.',
    rewardText: '+95 influence points and "The Houses Content": +8% income, permanent.',
    check: (ctx) => partyAt(ctx, 'SNH', 'priesthood', 70) && partyAt(ctx, 'SNH', 'notables', 55),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'SNH', { infl: 95 });
      mod(ctx, 'SNH', 'snh_houses_content', 'The Houses Content', { incomeMult: 1.08 });
    },
  },
  {
    id: 'snh_the_curse', name: 'Woe Is Me Because of the House of Ishmael',
    icon: 'flame', col: 3, row: 1, requires: ['snh_the_four_houses'],
    desc: 'Hold the priesthood at 60 and get the Zealots back to 45 anyway: this settlement is '
      + 'the grievance restored, and it has to be forgiven for it.',
    rewardText: '+70 governance points and "The Curse Answered": −0.6 unrest everywhere, permanent.',
    check: (ctx) => partyAt(ctx, 'SNH', 'priesthood', 60) && partyAt(ctx, 'SNH', 'zealots', 45),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'SNH', { gov: 70 });
      mod(ctx, 'SNH', 'snh_curse_answered', 'The Curse Answered', { unrestAll: -0.6 });
    },
  },
  {
    id: 'snh_the_assize', name: 'The Assize Goes Out to the Villages',
    icon: 'flag', col: 3, row: 2, requires: ['snh_the_curse'],
    desc: 'Twenty provinces under the crown, fourteen of them keeping the Law, with the realm '
      + 'steady at stability +2.',
    rewardText: '+8,000 manpower and "The Courts of Three": +8% manpower and −0.2 unrest '
      + 'everywhere, permanent.',
    check: (ctx) => ownedCount(ctx, 'SNH') >= 20 && ownedCount(ctx, 'SNH', 'judaism') >= 14
      && stabilityOf(ctx, 'SNH') >= 2,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'SNH', { manpower: 8000 });
      mod(ctx, 'SNH', 'snh_courts_of_three', 'The Courts of Three',
        { manpowerMult: 1.08, unrestAll: -0.2 });
    },
  },
  {
    id: 'snh_four_centuries', name: 'The Arrangement With Four Centuries Behind It',
    icon: 'star8', col: 3, row: 3, requires: ['snh_the_assize'],
    desc: 'That argument is only worth anything if the practice is actually there: the art of '
      + 'government two rungs past this age\'s baseline.',
    rewardText: '+120 governance points and "Four Centuries of Practice": +8% income and '
      + '+0.15 public belief a month, permanent.',
    check: (ctx) => govAbove(ctx, 'SNH', 2) && courtFloor(ctx, 'SNH', 50),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'SNH', { gov: 120 });
      mod(ctx, 'SNH', 'snh_four_centuries', 'Four Centuries of Practice',
        { incomeMult: 1.08, legitimacyAdd: 0.15 });
    },
  },
];

// ---- 66 CE, the settlement of 71: the lot -----------------------------------
// Hereditary priestly power ended in one afternoon. What replaces it has to be
// a chancery, because a lottery run badly is just a shorter kind of dynasty.
const GRL_BRANCH = [
  {
    id: 'grl_the_stonecutter', name: 'The Stonecutter Learns the Vestments',
    icon: 'altar', col: 2, row: 0, requires: ['grl_proclaimed'],
    desc: 'Let the first man the urn produced serve out his term over a standing House with '
      + 'the realm at stability +2, and the joke stops being a joke.',
    rewardText: '+70 governance points and "He Served Out the Year": −0.4 unrest everywhere '
      + 'and +0.1 public belief a month, permanent.',
    check: (ctx) => templeStands(ctx) && stabilityOf(ctx, 'GRL') >= 2
      && holds(ctx, 'GRL', 'Jerusalem'),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'GRL', { gov: 70 });
      mod(ctx, 'GRL', 'grl_served_out_the_year', 'He Served Out the Year',
        { unrestAll: -0.4, legitimacyAdd: 0.1 });
    },
  },
  {
    id: 'grl_the_register', name: 'The Urn and the Register',
    icon: 'quill', col: 2, row: 1, requires: ['grl_the_stonecutter'],
    desc: 'Take the art of government two rungs past this age\'s baseline: an honest register '
      + 'of every priestly house, drawn from in full.',
    rewardText: '+95 governance points and "Drawn From the Whole List": +8% income and '
      + '+0.15 public belief a month, permanent.',
    check: (ctx) => govAbove(ctx, 'GRL', 2),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'GRL', { gov: 95 });
      mod(ctx, 'GRL', 'grl_whole_list', 'Drawn From the Whole List',
        { incomeMult: 1.08, legitimacyAdd: 0.15 });
    },
  },
  {
    id: 'grl_the_whole_priesthood', name: 'The Whole Priesthood, Not Four Families',
    icon: 'shrine', col: 2, row: 2, requires: ['grl_the_register'],
    desc: 'Sixteen provinces keeping the Law, a standing House, and 400 talents to pay a '
      + 'priesthood that is suddenly the whole priesthood.',
    rewardText: '+300 talents and "The Country Priests": +15% conversion and −0.3 unrest '
      + 'everywhere, permanent.',
    check: (ctx) => ownedCount(ctx, 'GRL', 'judaism') >= 16 && templeStands(ctx)
      && treasuryOf(ctx, 'GRL') >= 400,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'GRL', { treasury: 300 });
      mod(ctx, 'GRL', 'grl_country_priests', 'The Country Priests',
        { convertMult: 1.15, unrestAll: -0.3 });
    },
  },
  {
    id: 'grl_god_chooses', name: 'God Chooses, and Four Families Do Not',
    icon: 'star8', col: 2, row: 3, requires: ['grl_the_whole_priesthood'],
    desc: 'Have the urn produce a man who can actually govern — a head of state worth seven '
      + 'points across the three arts — with the realm behind him at legitimacy.',
    rewardText: '"The Draw Was Sound": +0.2 public belief a month and +6% income, permanent.',
    check: (ctx) => rulerWorth(ctx, 'GRL', 7) && legitimacyOf(ctx, 'GRL') >= 65,
    reward: (ctx) => mod(ctx, 'GRL', 'grl_draw_was_sound', 'The Draw Was Sound',
      { legitimacyAdd: 0.2, incomeMult: 1.06 }),
  },
  {
    id: 'grl_the_zealous_country', name: 'The Country That Drew Him',
    icon: 'spears', col: 3, row: 0, requires: ['grl_proclaimed'],
    desc: 'The Zealots at 70 — the lot was their act, and they are the constituency that has '
      + 'to keep turning out for it.',
    rewardText: '+10,000 manpower and "The Bands Are the Levy": +12% manpower, permanent.',
    check: (ctx) => partyAt(ctx, 'GRL', 'zealots', 70),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'GRL', { manpower: 10000 });
      mod(ctx, 'GRL', 'grl_bands_are_the_levy', 'The Bands Are the Levy', { manpowerMult: 1.12 });
    },
  },
  {
    id: 'grl_no_promises', name: 'Nothing Promised to Anybody',
    icon: 'dove', col: 3, row: 1, requires: ['grl_the_zealous_country'],
    desc: 'Stand at war with nobody, allied to nobody, and owing fealty to nobody.',
    rewardText: '+70 martial points and "No Court Can Plan Around Us": +8% morale and +5% '
      + 'discipline, permanent.',
    check: (ctx) => atPeace(ctx, 'GRL') && alliesOf(ctx, 'GRL') === 0 && independent(ctx, 'GRL'),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'GRL', { mar: 70 });
      mod(ctx, 'GRL', 'grl_no_planning', 'No Court Can Plan Around Us',
        { moraleMult: 1.08, disciplineMult: 1.05 });
    },
  },
  {
    id: 'grl_the_estates', name: 'The Estates of the Houses Are the State\'s',
    icon: 'market', col: 3, row: 2, requires: ['grl_no_promises'],
    desc: 'Eighteen provinces and 550 talents in hand — a constitution that abolished the '
      + 'families inherited their estates and has to run them.',
    rewardText: '+400 talents and "The Storehouses of Kathros": +10% income, permanent.',
    check: (ctx) => ownedCount(ctx, 'GRL') >= 18 && treasuryOf(ctx, 'GRL') >= 550,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'GRL', { treasury: 400 });
      mod(ctx, 'GRL', 'grl_storehouses', 'The Storehouses of Kathros', { incomeMult: 1.1 });
    },
  },
  {
    id: 'grl_no_crisis', name: 'The Death That Is Not a Wound',
    icon: 'scales', col: 3, row: 3, requires: ['grl_the_estates'],
    desc: 'Under the lot nobody\'s claim dies with the incumbent, because nobody had one.',
    rewardText: '+95 governance points and "Nobody\'s Claim Died With Him": −0.5 unrest '
      + 'everywhere and +0.15 public belief a month, permanent.',
    check: (ctx) => ownedCount(ctx, 'GRL') >= 20 && atPeace(ctx, 'GRL')
      && stabilityOf(ctx, 'GRL') >= 3,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'GRL', { gov: 95 });
      mod(ctx, 'GRL', 'grl_no_claim_died', 'Nobody\'s Claim Died With Him',
        { unrestAll: -0.5, legitimacyAdd: 0.15 });
    },
  },
];

// ---- 66 CE, the settlement of 71: the Jubilee -------------------------------
// Leviticus 25 enforced, which nobody has done, because it cannot be done
// twice. The dividend is a countryside that owns something; the price is that
// the credit system is gone and is not coming back inside a generation.
const YVL_BRANCH = [
  {
    id: 'yvl_the_horn', name: 'The Horn on the Tenth of the Seventh Month',
    icon: 'flame', col: 2, row: 0, requires: ['yvl_proclaimed'],
    desc: 'The Zealots at 60, with the realm still standing at stability +1.',
    rewardText: '+70 influence points and "Liberty Proclaimed": +8% manpower and −0.3 unrest '
      + 'everywhere, permanent.',
    check: (ctx) => partyAt(ctx, 'YVL', 'zealots', 60) && stabilityOf(ctx, 'YVL') >= 1,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'YVL', { infl: 70 });
      mod(ctx, 'YVL', 'yvl_liberty_proclaimed', 'Liberty Proclaimed',
        { manpowerMult: 1.08, unrestAll: -0.3 });
    },
  },
  {
    id: 'yvl_the_land_reverts', name: 'The Land Goes Back to the Families',
    icon: 'grain', col: 2, row: 1, requires: ['yvl_the_horn'],
    desc: 'Eighteen provinces under the crown with 250 points of development on them.',
    rewardText: '+300 talents and "Every Man Unto His Possession": +15% development growth '
      + 'and +6% manpower, permanent.',
    check: (ctx) => ownedCount(ctx, 'YVL') >= 18 && devOf(ctx, 'YVL') >= 250,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'YVL', { treasury: 300 });
      mod(ctx, 'YVL', 'yvl_unto_his_possession', 'Every Man Unto His Possession',
        { growthMult: 1.15, manpowerMult: 1.06 });
    },
  },
  {
    id: 'yvl_the_countryside', name: 'A Countryside That Owns Something',
    icon: 'helmet', col: 2, row: 2, requires: ['yvl_the_land_reverts'],
    desc: 'Thirty-47,500 under arms out of twenty provinces — a levy the other three '
      + 'settlements would have to hire.',
    rewardText: '+12,000 manpower and "Their Own Fields Behind Them": +12% manpower and +5% '
      + 'morale, permanent.',
    check: (ctx) => menOf(ctx, 'YVL') >= 47500 && ownedCount(ctx, 'YVL') >= 20,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'YVL', { manpower: 12000 });
      mod(ctx, 'YVL', 'yvl_own_fields', 'Their Own Fields Behind Them',
        { manpowerMult: 1.12, moraleMult: 1.05 });
    },
  },
  {
    id: 'yvl_never_twice', name: 'The Law Nobody Has Ever Enforced Twice',
    icon: 'star8', col: 2, row: 3, requires: ['yvl_the_countryside'],
    desc: 'A Jubilee state that reaches twenty-two provinces, sixteen of them keeping the Law, '
      + 'at stability +3.',
    rewardText: '"The Year of the Ram\'s Horn": +10% manpower, −0.5 unrest everywhere and '
      + '+0.15 public belief a month, permanent.',
    check: (ctx) => ownedCount(ctx, 'YVL') >= 22 && ownedCount(ctx, 'YVL', 'judaism') >= 16
      && stabilityOf(ctx, 'YVL') >= 3,
    reward: (ctx) => mod(ctx, 'YVL', 'yvl_year_of_the_horn', 'The Year of the Ram\'s Horn',
      { manpowerMult: 1.1, unrestAll: -0.5, legitimacyAdd: 0.15 }),
  },
  {
    id: 'yvl_the_assembly', name: 'The Assembly That Enforces It',
    icon: 'scales', col: 3, row: 0, requires: ['yvl_proclaimed'],
    desc: 'The art of government a rung past this age\'s baseline, at stability +2.',
    rewardText: '+95 governance points and "The Officers Renewed": −0.4 unrest everywhere '
      + 'and +0.12 public belief a month, permanent.',
    check: (ctx) => govAbove(ctx, 'YVL', 1) && stabilityOf(ctx, 'YVL') >= 2,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'YVL', { gov: 95 });
      mod(ctx, 'YVL', 'yvl_officers_renewed', 'The Officers Renewed',
        { unrestAll: -0.4, legitimacyAdd: 0.12 });
    },
  },
  {
    id: 'yvl_the_vote', name: 'The Vote Held Without an Army in the Room',
    icon: 'quill', col: 3, row: 1, requires: ['yvl_the_assembly'],
    desc: 'Come out of an election with the realm behind the result — legitimacy 60, and no '
      + 'party in the room under 45.',
    rewardText: '+95 influence points and "The Result Stood": +0.15 public belief a month '
      + 'and −0.3 unrest everywhere, permanent.',
    check: (ctx) => legitimacyOf(ctx, 'YVL') >= 60 && courtFloor(ctx, 'YVL', 45),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'YVL', { infl: 95 });
      mod(ctx, 'YVL', 'yvl_result_stood', 'The Result Stood',
        { legitimacyAdd: 0.15, unrestAll: -0.3 });
    },
  },
  {
    id: 'yvl_no_lenders', name: 'Nobody Will Lend to This Government',
    icon: 'market', col: 3, row: 2, requires: ['yvl_the_vote'],
    desc: 'A state that cannot borrow has to hold cash: 700 talents in the treasury against '
      + '250 points of development, earned rather than advanced.',
    rewardText: '+600 talents and "Cash and No Credit": +10% income and +8% trade, permanent.',
    check: (ctx) => treasuryOf(ctx, 'YVL') >= 700 && devOf(ctx, 'YVL') >= 250,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'YVL', { treasury: 600 });
      mod(ctx, 'YVL', 'yvl_cash_no_credit', 'Cash and No Credit',
        { incomeMult: 1.1, tradeMult: 1.08 });
    },
  },
  {
    id: 'yvl_the_seventh_year', name: 'The Land Rests and the State Does Not',
    icon: 'granary', col: 3, row: 3, requires: ['yvl_no_lenders'],
    desc: 'Come through a sabbatical year at peace, 450 talents still in hand and fourteen '
      + 'provinces keeping the Law.',
    rewardText: '+500 talents and "The Seventh Year Kept": +12% income and +8% development '
      + 'growth, permanent.',
    check: (ctx) => atPeace(ctx, 'YVL') && treasuryOf(ctx, 'YVL') >= 450
      && ownedCount(ctx, 'YVL', 'judaism') >= 14,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'YVL', { treasury: 500 });
      mod(ctx, 'YVL', 'yvl_seventh_year', 'The Seventh Year Kept',
        { incomeMult: 1.12, growthMult: 1.08 });
    },
  },
];

// ---- 66 CE, the settlement of 71: no ruler but God --------------------------
// Judas the Galilean's doctrine, held for sixty years and never implemented,
// because implementing it means having no state to implement it with.
const HRZ_BRANCH = [
  {
    id: 'hrz_no_census', name: 'No Census, No Tribute, No King',
    icon: 'scroll', col: 2, row: 0, requires: ['hrz_proclaimed'],
    desc: 'Owe fealty to nobody and stand in no alliance: a promise needs an office to make '
      + 'it, and an office is the beginning of a king.',
    rewardText: '+70 martial points and "Acknowledging No King": +8% morale, permanent.',
    check: (ctx) => independent(ctx, 'HRZ') && alliesOf(ctx, 'HRZ') === 0,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'HRZ', { mar: 70 });
      mod(ctx, 'HRZ', 'hrz_no_king', 'Acknowledging No King', { moraleMult: 1.08 });
    },
  },
  {
    id: 'hrz_fourth_philosophy', name: 'Judas the Galilean Wins the Argument',
    icon: 'flame', col: 2, row: 1, requires: ['hrz_no_census'],
    desc: 'He rose against the census of Quirinius in the sixth year, was killed, and his sons '
      + 'were crucified by Tiberius Alexander forty years later.',
    rewardText: '+12,000 manpower and "The Fourth Philosophy": +15% manpower, permanent.',
    check: (ctx) => partyAt(ctx, 'HRZ', 'zealots', 80),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'HRZ', { manpower: 12000 });
      mod(ctx, 'HRZ', 'hrz_fourth_philosophy', 'The Fourth Philosophy', { manpowerMult: 1.15 });
    },
  },
  {
    id: 'hrz_the_rocks', name: 'The Country Is the Fortress',
    icon: 'tower', col: 2, row: 2, requires: ['hrz_fourth_philosophy'],
    desc: 'Hold Jerusalem, Masada, Machaerus and Engaddi with the war-craft of the age two '
      + 'rungs past this chapter\'s baseline.',
    rewardText: '+95 martial points and "The Rocks Above the Sea": +1 to hill-country '
      + 'defense and +1 deterrence, permanent.',
    check: (ctx) => holdsAll(ctx, 'HRZ', ['Jerusalem', 'Masada', 'Machaerus', 'Engaddi'])
      && marAbove(ctx, 'HRZ', 2),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'HRZ', { mar: 95 });
      mod(ctx, 'HRZ', 'hrz_rocks_above_the_sea', 'The Rocks Above the Sea',
        { hillDefBonus: 1, deterrent: 1 });
    },
  },
  {
    id: 'hrz_no_address', name: 'A Polity With No Address',
    icon: 'dove', col: 2, row: 3, requires: ['hrz_the_rocks'],
    desc: 'Twenty provinces, at war with nobody, allied to nobody, owing fealty to nobody: a '
      + 'quiet that was not negotiated.',
    rewardText: '"Nothing to Negotiate With": +8% morale and +6% discipline, permanent.',
    check: (ctx) => ownedCount(ctx, 'HRZ') >= 20 && atPeace(ctx, 'HRZ')
      && alliesOf(ctx, 'HRZ') === 0 && independent(ctx, 'HRZ'),
    reward: (ctx) => mod(ctx, 'HRZ', 'hrz_nothing_to_negotiate', 'Nothing to Negotiate With',
      { moraleMult: 1.08, disciplineMult: 1.06 }),
  },
  {
    id: 'hrz_the_bands', name: 'Every Village Its Own Band',
    icon: 'spears', col: 3, row: 0, requires: ['hrz_proclaimed'],
    desc: 'Thirty-47,500 men, raised by a state that cannot conscript them.',
    rewardText: '+70 martial points and "They Came Because They Came": +12% reinforcement, '
      + 'permanent.',
    check: (ctx) => menOf(ctx, 'HRZ') >= 47500,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'HRZ', { mar: 70 });
      mod(ctx, 'HRZ', 'hrz_they_came', 'They Came Because They Came', { reinforceMult: 1.12 });
    },
  },
  {
    id: 'hrz_the_coins', name: 'Freedom of Zion, Year Four',
    icon: 'coins', col: 3, row: 1, requires: ['hrz_the_bands'],
    desc: 'Hold Jerusalem with the House standing, at legitimacy 80, and mint the fourth year.',
    rewardText: '+300 talents and "No Head on the Silver": +0.15 public belief a month and '
      + '−0.3 unrest everywhere, permanent.',
    check: (ctx) => holds(ctx, 'HRZ', 'Jerusalem') && templeStands(ctx)
      && legitimacyOf(ctx, 'HRZ') >= 80,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'HRZ', { treasury: 300 });
      mod(ctx, 'HRZ', 'hrz_no_head_on_the_silver', 'No Head on the Silver',
        { legitimacyAdd: 0.15, unrestAll: -0.3 });
    },
  },
  {
    id: 'hrz_no_purse', name: 'The Treasury That Is Not a Treasury',
    icon: 'amphora', col: 3, row: 2, requires: ['hrz_the_coins'],
    desc: 'A state that will not count its people cannot assess them, so what it has is what '
      + 'the land gives and what the roads pay: eighteen provinces.',
    rewardText: '+400 talents and "What the Land Gives": +12% income, permanent.',
    check: (ctx) => ownedCount(ctx, 'HRZ') >= 18 && treasuryOf(ctx, 'HRZ') >= 400,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'HRZ', { treasury: 400 });
      mod(ctx, 'HRZ', 'hrz_what_the_land_gives', 'What the Land Gives', { incomeMult: 1.12 });
    },
  },
  {
    id: 'hrz_menahem', name: 'Menahem Came In Royal Dress',
    icon: 'shieldCrack', col: 3, row: 3, requires: ['hrz_no_purse'],
    desc: 'A settlement that means it has to survive its own Menahem: twenty provinces, '
      + 'sixteen keeping the Law, at stability +3.',
    rewardText: '+95 governance points and "His Own Side Killed Him": −0.5 unrest everywhere '
      + 'and +6% morale, permanent.',
    check: (ctx) => ownedCount(ctx, 'HRZ') >= 20 && ownedCount(ctx, 'HRZ', 'judaism') >= 16
      && stabilityOf(ctx, 'HRZ') >= 3,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'HRZ', { gov: 95 });
      mod(ctx, 'HRZ', 'hrz_his_own_side', 'His Own Side Killed Him',
        { unrestAll: -0.5, moraleMult: 1.06 });
    },
  },
];

// ---- 167 BCE, the diadem of 104: the priest-kingdom -------------------------
// Aristobulus I put on a crown and Josephus says he was the first to do it.
// One head, two offices, and a quarrel with the study houses that outlived the
// dynasty that started it.
const KHN_BRANCH = [
  {
    id: 'khn_the_royal_style', name: 'The Royal Style',
    icon: 'star8', col: 2, row: 0, requires: ['khn_proclaimed'],
    desc: 'Hold Jerusalem at legitimacy 60 and let the new style go out over the seal.',
    rewardText: '+95 governance points and "Addressed as King": +0.15 public belief a month '
      + 'and +6% income, permanent.',
    check: (ctx) => holds(ctx, 'KHN', 'Jerusalem') && legitimacyOf(ctx, 'KHN') >= 60,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KHN', { gov: 95 });
      mod(ctx, 'KHN', 'khn_addressed_as_king', 'Addressed as King',
        { legitimacyAdd: 0.15, incomeMult: 1.06 });
    },
  },
  {
    id: 'khn_a_peer', name: 'A Peer of Every Chancery',
    icon: 'quill', col: 2, row: 1, requires: ['khn_the_royal_style'],
    desc: 'Stand in two alliances, or with a client kingdom of our own under the collar.',
    rewardText: '+95 influence points and "Among the Crowned Heads": +1 envoy, permanent.',
    check: (ctx) => alliesOf(ctx, 'KHN') >= 2 || clientsOf(ctx, 'KHN') >= 1,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KHN', { infl: 95 });
      mod(ctx, 'KHN', 'khn_crowned_heads', 'Among the Crowned Heads', { diploSeats: 1 });
    },
  },
  {
    id: 'khn_the_coast', name: 'The Ladder of Tyre to the River of Egypt',
    icon: 'ship', col: 2, row: 2, requires: ['khn_a_peer'],
    desc: 'Joppa, Ascalon, Gaza and Ptolemais under the crown — a kingdom with no harbour pays '
      + 'somebody else\'s customs on its own grain.',
    rewardText: '+500 talents and "The King\'s Customs": +12% trade and +6% income, permanent.',
    check: (ctx) => holdsAll(ctx, 'KHN', ['Joppa', 'Ascalon', 'Gaza', 'Ptolemais']),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KHN', { treasury: 500 });
      mod(ctx, 'KHN', 'khn_kings_customs', 'The King\'s Customs',
        { tradeMult: 1.12, incomeMult: 1.06 });
    },
  },
  {
    id: 'khn_yannais_borders', name: "Yannai's Borders",
    icon: 'flag', col: 2, row: 3, requires: ['khn_the_coast'],
    desc: 'Alexander Jannaeus died besieging a fort east of the Jordan with the largest Jewish '
      + 'state between Solomon and 1948 behind him.',
    rewardText: '+10,000 manpower and "The Borders of the Kings": +8% morale, permanent.',
    check: (ctx) => ownedCount(ctx, 'KHN') >= 22,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KHN', { manpower: 10000 });
      mod(ctx, 'KHN', 'khn_borders_of_the_kings', 'The Borders of the Kings',
        { moraleMult: 1.08 });
    },
  },
  {
    id: 'khn_the_mitre', name: 'The Mitre Kept',
    icon: 'altar', col: 3, row: 0, requires: ['khn_proclaimed'],
    desc: 'Hold Jerusalem with the House standing and 300 talents endowed on it.',
    rewardText: '+70 influence points and "Both Offices, One Head": +15% conversion, permanent.',
    check: (ctx) => holds(ctx, 'KHN', 'Jerusalem') && templeStands(ctx)
      && treasuryOf(ctx, 'KHN') >= 300,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KHN', { infl: 70 });
      mod(ctx, 'KHN', 'khn_both_offices', 'Both Offices, One Head', { convertMult: 1.15 });
    },
  },
  {
    id: 'khn_the_quarrel', name: 'The Quarrel That Outlived the Dynasty',
    icon: 'split', col: 3, row: 1, requires: ['khn_the_mitre'],
    desc: 'Hold both parties at 50 at once — the Pharisees and the Sadducees — which is the '
      + 'thing the actual dynasty never once did.',
    rewardText: '+120 governance points and "Both Parties at the Table": −0.6 unrest everywhere '
      + 'and +0.15 public belief a month, permanent.',
    check: (ctx) => partyAt(ctx, 'KHN', 'pharisees', 50) && partyAt(ctx, 'KHN', 'sadducees', 50),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KHN', { gov: 120 });
      mod(ctx, 'KHN', 'khn_both_parties', 'Both Parties at the Table',
        { unrestAll: -0.6, legitimacyAdd: 0.15 });
    },
  },
  {
    id: 'khn_the_army', name: 'The King\'s Own Foreigners',
    icon: 'helmet', col: 3, row: 2, requires: ['khn_the_quarrel'],
    desc: 'Do it the other way: thirty-47,500 men on the rolls, and the war-craft of the age '
      + 'two rungs past this chapter\'s baseline.',
    rewardText: '+95 martial points and "The Levy of the Kingdom": +6% discipline and +10% '
      + 'manpower, permanent.',
    check: (ctx) => menOf(ctx, 'KHN') >= 47500 && marAbove(ctx, 'KHN', 2),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KHN', { mar: 95 });
      mod(ctx, 'KHN', 'khn_levy_of_the_kingdom', 'The Levy of the Kingdom',
        { disciplineMult: 1.06, manpowerMult: 1.1 });
    },
  },
  {
    id: 'khn_one_house', name: 'One House, Two Offices, One Succession',
    icon: 'scales', col: 3, row: 3, requires: ['khn_the_army'],
    desc: 'Seat an heir with the realm behind him — legitimacy 80, stability +3 — and the '
      + 'arithmetic is answered before it is asked.',
    rewardText: '"The Succession Not Divided": +0.2 public belief a month and −0.4 unrest '
      + 'everywhere, permanent.',
    check: (ctx) => heirSeated(ctx, 'KHN') && legitimacyOf(ctx, 'KHN') >= 80
      && stabilityOf(ctx, 'KHN') >= 3,
    reward: (ctx) => mod(ctx, 'KHN', 'khn_not_divided', 'The Succession Not Divided',
      { legitimacyAdd: 0.2, unrestAll: -0.4 }),
  },
];

// ---- 167 BCE, the diadem of 104 refused: the commonwealth -------------------
// The road the chronicles do not have. The decree confirming the house named
// it high priest and left the other title out, and this is the state that
// takes the omission seriously.
const GRS_BRANCH = [
  {
    id: 'grs_the_decree', name: 'The Decree of the Great Assembly',
    icon: 'scroll', col: 2, row: 0, requires: ['grs_proclaimed'],
    desc: 'A commonwealth is the decree read literally and then administered, which nobody has '
      + 'tried: legitimacy 55, at stability +2.',
    rewardText: '+95 governance points and "The Bronze Read Literally": −0.4 unrest everywhere '
      + 'and +0.12 public belief a month, permanent.',
    check: (ctx) => legitimacyOf(ctx, 'GRS') >= 55 && stabilityOf(ctx, 'GRS') >= 2,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'GRS', { gov: 95 });
      mod(ctx, 'GRS', 'grs_bronze_literally', 'The Bronze Read Literally',
        { unrestAll: -0.4, legitimacyAdd: 0.12 });
    },
  },
  {
    id: 'grs_the_elders', name: 'The Elders in the Chamber',
    icon: 'quill', col: 2, row: 1, requires: ['grs_the_decree'],
    desc: 'Take the art of government two rungs past this age\'s baseline: an assembly is a '
      + 'chamber, a roll and a treasury it can question.',
    rewardText: '+95 influence points and "The Assembly Sits": +8% income and +0.12 public '
      + 'belief a month, permanent.',
    check: (ctx) => govAbove(ctx, 'GRS', 2),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'GRS', { infl: 95 });
      mod(ctx, 'GRS', 'grs_assembly_sits', 'The Assembly Sits',
        { incomeMult: 1.08, legitimacyAdd: 0.12 });
    },
  },
  {
    id: 'grs_no_crown_to_dispute', name: 'No Crown for the Schools to Dispute',
    icon: 'dove', col: 2, row: 2, requires: ['grs_the_elders'],
    desc: 'The whole quarrel of the next two centuries is about a linen band that this state '
      + 'never put on, so the study houses have to find something else to argue.',
    rewardText: '+120 governance points and "Nothing to Argue About": −0.5 unrest everywhere, '
      + 'permanent.',
    check: (ctx) => partyAt(ctx, 'GRS', 'pharisees', 55) && partyAt(ctx, 'GRS', 'sadducees', 55),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'GRS', { gov: 120 });
      mod(ctx, 'GRS', 'grs_nothing_to_argue', 'Nothing to Argue About', { unrestAll: -0.5 });
    },
  },
  {
    id: 'grs_an_officer', name: 'An Officer, Not a Peer',
    icon: 'scales', col: 2, row: 3, requires: ['grs_no_crown_to_dispute'],
    desc: 'Make the arrangement pay anyway — twenty provinces, at peace, standing in two '
      + 'alliances.',
    rewardText: '+95 influence points and "Dealt With on the Merits": +8% income and +1 '
      + 'envoy, permanent.',
    check: (ctx) => ownedCount(ctx, 'GRS') >= 20 && atPeace(ctx, 'GRS')
      && alliesOf(ctx, 'GRS') >= 2,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'GRS', { infl: 95 });
      mod(ctx, 'GRS', 'grs_on_the_merits', 'Dealt With on the Merits',
        { incomeMult: 1.08, diploSeats: 1 });
    },
  },
  {
    id: 'grs_the_levy', name: 'The Levy of the Commonwealth',
    icon: 'spears', col: 3, row: 0, requires: ['grs_proclaimed'],
    desc: 'Answer it with numbers: 42,000 men under a state with no crown on it.',
    rewardText: '+70 martial points and "Followed Without a Diadem": +10% manpower, permanent.',
    check: (ctx) => menOf(ctx, 'GRS') >= 42000,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'GRS', { mar: 70 });
      mod(ctx, 'GRS', 'grs_without_a_diadem', 'Followed Without a Diadem',
        { manpowerMult: 1.1 });
    },
  },
  {
    id: 'grs_the_temple_treasury', name: 'The Treasury Under the Mount',
    icon: 'coins', col: 3, row: 1, requires: ['grs_the_levy'],
    desc: 'Hold Jerusalem with the House standing and 550 talents in it, under officers the '
      + 'assembly can call to account.',
    rewardText: '+500 talents and "The Purse Audited": +10% income, permanent.',
    check: (ctx) => holds(ctx, 'GRS', 'Jerusalem') && templeStands(ctx)
      && treasuryOf(ctx, 'GRS') >= 550,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'GRS', { treasury: 500 });
      mod(ctx, 'GRS', 'grs_purse_audited', 'The Purse Audited', { incomeMult: 1.1 });
    },
  },
  {
    id: 'grs_the_country', name: 'The Country Without a Court',
    icon: 'grain', col: 3, row: 2, requires: ['grs_the_temple_treasury'],
    desc: 'Twenty provinces with 275 points of development on them — a commonwealth spends its '
      + 'revenue on the country, not on a court.',
    rewardText: '+300 talents and "Spent on the Towns": +10% development growth and +6% '
      + 'income, permanent.',
    check: (ctx) => ownedCount(ctx, 'GRS') >= 20 && devOf(ctx, 'GRS') >= 275,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'GRS', { treasury: 300 });
      mod(ctx, 'GRS', 'grs_spent_on_the_towns', 'Spent on the Towns',
        { growthMult: 1.1, incomeMult: 1.06 });
    },
  },
  {
    id: 'grs_the_office_outlives', name: 'The Office Outlives the Man',
    icon: 'star8', col: 3, row: 3, requires: ['grs_the_country'],
    desc: 'An heir seated, legitimacy 75, and no party in the room below 50: the arrangement '
      + 'has to go on being the arrangement.',
    rewardText: '+120 governance points and "The Arrangement Holds": +0.2 public belief a '
      + 'month and −0.4 unrest everywhere, permanent.',
    check: (ctx) => heirSeated(ctx, 'GRS') && legitimacyOf(ctx, 'GRS') >= 75
      && courtFloor(ctx, 'GRS', 50),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'GRS', { gov: 120 });
      mod(ctx, 'GRS', 'grs_arrangement_holds', 'The Arrangement Holds',
        { legitimacyAdd: 0.2, unrestAll: -0.4 });
    },
  },
];

// ---- 132 CE and 614 CE, the crown out of a war ------------------------------
// A diadem taken by the house that won the fighting, with no priestly title
// and no Davidic descent under it. Every chancery understands a king; the
// objection is made at home, in writing, in every generation. Offered in two
// chapters, so the branch names no estate and no foreign court — the parties
// in the room are the chapter's own and they are not the same two rooms.
const KTR_BRANCH = [
  {
    id: 'ktr_one_generation', name: 'King in One Generation',
    icon: 'star8', col: 2, row: 0, requires: ['ktr_proclaimed'],
    desc: 'Hold Jerusalem at legitimacy 65, with the realm not at war with itself.',
    rewardText: '+95 governance points and "The Undivided Succession": +0.15 public belief a '
      + 'month and +8% income, permanent.',
    check: (ctx) => holds(ctx, 'KTR', 'Jerusalem') && legitimacyOf(ctx, 'KTR') >= 65
      && !(ctx.game.pretenders && ctx.game.pretenders.KTR),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KTR', { gov: 95 });
      mod(ctx, 'KTR', 'ktr_undivided', 'The Undivided Succession',
        { legitimacyAdd: 0.15, incomeMult: 1.08 });
    },
  },
  {
    id: 'ktr_the_army_that_made_it', name: 'The Army That Made the Crown',
    icon: 'helmet', col: 2, row: 1, requires: ['ktr_one_generation'],
    desc: 'A crown with no priestly descent and no Davidic descent under it rests on exactly '
      + 'one thing, and that thing has to stay in the field: thirty-50,500.',
    rewardText: '+95 martial points and "The Men Who Made It": +6% discipline and +6% morale, '
      + 'permanent.',
    check: (ctx) => menOf(ctx, 'KTR') >= 50500 && marAbove(ctx, 'KTR', 2),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KTR', { mar: 95 });
      mod(ctx, 'KTR', 'ktr_men_who_made_it', 'The Men Who Made It',
        { disciplineMult: 1.06, moraleMult: 1.06 });
    },
  },
  {
    id: 'ktr_the_writing', name: 'The Writing Is What Survives',
    icon: 'scroll', col: 2, row: 2, requires: ['ktr_the_army_that_made_it'],
    desc: 'No party in the room below 55, at stability +3 — the objection to this crown is '
      + 'answered by being a good king in front of it.',
    rewardText: '+120 governance points and "Answered In Front of Them": −0.6 unrest everywhere '
      + 'and +0.15 public belief a month, permanent.',
    check: (ctx) => courtFloor(ctx, 'KTR', 55) && stabilityOf(ctx, 'KTR') >= 3,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KTR', { gov: 120 });
      mod(ctx, 'KTR', 'ktr_answered_in_front', 'Answered In Front of Them',
        { unrestAll: -0.6, legitimacyAdd: 0.15 });
    },
  },
  {
    id: 'ktr_the_line', name: 'A Second King of the Same House',
    icon: 'scales', col: 2, row: 3, requires: ['ktr_the_writing'],
    desc: 'Any war can produce a king; the second one is what makes it a dynasty.',
    rewardText: '"The Second Reign": +0.25 public belief a month and −0.4 unrest everywhere, '
      + 'permanent.',
    check: (ctx) => heirSeated(ctx, 'KTR') && legitimacyOf(ctx, 'KTR') >= 85
      && atPeace(ctx, 'KTR'),
    reward: (ctx) => mod(ctx, 'KTR', 'ktr_second_reign', 'The Second Reign',
      { legitimacyAdd: 0.25, unrestAll: -0.4 }),
  },
  {
    id: 'ktr_every_chancery', name: 'Every Chancery Understands a King',
    icon: 'quill', col: 3, row: 0, requires: ['ktr_proclaimed'],
    desc: 'Two alliances, or a client kingdom of our own — a title that needs no explaining '
      + 'between the Nile and the Tigris.',
    rewardText: '+95 influence points and "A Title That Needs No Explaining": +1 envoy, '
      + 'permanent.',
    check: (ctx) => alliesOf(ctx, 'KTR') >= 2 || clientsOf(ctx, 'KTR') >= 1,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KTR', { infl: 95 });
      mod(ctx, 'KTR', 'ktr_no_explaining', 'A Title That Needs No Explaining',
        { diploSeats: 1 });
    },
  },
  {
    id: 'ktr_the_country', name: 'The Country the Crown Was Taken Over',
    icon: 'flag', col: 3, row: 1, requires: ['ktr_every_chancery'],
    desc: 'Twenty-two provinces owned and controlled, sixteen of them keeping the Law.',
    rewardText: '+10,000 manpower and "Held By the House": +10% manpower, permanent.',
    check: (ctx) => ownedCount(ctx, 'KTR') >= 22 && ownedCount(ctx, 'KTR', 'judaism') >= 16,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KTR', { manpower: 10000 });
      mod(ctx, 'KTR', 'ktr_held_by_the_house', 'Held By the House', { manpowerMult: 1.1 });
    },
  },
  {
    id: 'ktr_the_fisc', name: 'A Royal Fisc, Kept Separately',
    icon: 'coins', col: 3, row: 2, requires: ['ktr_the_country'],
    desc: 'Keep the books apart and full: 600 talents against 275 points of development.',
    rewardText: '+500 talents and "The Books Kept Apart": +10% income and +8% trade, permanent.',
    check: (ctx) => treasuryOf(ctx, 'KTR') >= 600 && devOf(ctx, 'KTR') >= 275,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KTR', { treasury: 500 });
      mod(ctx, 'KTR', 'ktr_books_apart', 'The Books Kept Apart',
        { incomeMult: 1.1, tradeMult: 1.08 });
    },
  },
  {
    id: 'ktr_the_letters', name: 'The Letters Go Out Under a Seal',
    icon: 'diaspora', col: 3, row: 3, requires: ['ktr_the_fisc'],
    desc: 'Alexandria, Antioch and Babylon standing with us at 60, or under the crown '
      + 'outright.',
    rewardText: '+400 talents and "Read in the Communities": +0.2 public belief a month and '
      + '+8% income, permanent.',
    check: (ctx) => ['Alexandria', 'Antioch', 'Babylon']
      .every((n) => standingAt(ctx, n) >= 60 || holds(ctx, 'KTR', n)),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'KTR', { treasury: 400 });
      mod(ctx, 'KTR', 'ktr_read_in_the_communities', 'Read in the Communities',
        { legitimacyAdd: 0.2, incomeMult: 1.08 });
    },
  },
];

// ---- 132 CE and 614 CE, the line of Jehoiachin ------------------------------
// The one claim in the Jewish world nobody argues with, and an expectation the
// state has to live beside for ever. Reached by marriage in 132 and by
// coronation in 614; both roads raise the same flag, and the flag is what
// makes the Kingdom of Israel formable at all.
const BTD_BRANCH = [
  {
    id: 'btd_the_contract', name: 'The Contract Read Out in Jerusalem',
    icon: 'scroll', col: 2, row: 0, requires: ['btd_proclaimed'],
    desc: 'Hold Jerusalem at legitimacy 70 — the claim is a document that can be read aloud '
      + 'and checked.',
    rewardText: '+95 governance points and "The Pedigree Entered": +0.2 public belief a month '
      + 'and −0.3 unrest everywhere, permanent.',
    check: (ctx) => holds(ctx, 'BTD', 'Jerusalem') && legitimacyOf(ctx, 'BTD') >= 70,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'BTD', { gov: 95 });
      mod(ctx, 'BTD', 'btd_pedigree_entered', 'The Pedigree Entered',
        { legitimacyAdd: 0.2, unrestAll: -0.3 });
    },
  },
  {
    id: 'btd_the_east', name: 'The Academies Answer',
    icon: 'diaspora', col: 2, row: 1, requires: ['btd_the_contract'],
    desc: 'Babylon and Nehardea standing with us at 65, or under the crown outright.',
    rewardText: '+400 talents and "The East Writes Back": +0.2 public belief a month and +8% '
      + 'income, permanent.',
    check: (ctx) => ['Babylon', 'Nehardea']
      .every((n) => standingAt(ctx, n) >= 65 || holds(ctx, 'BTD', n)),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'BTD', { treasury: 400 });
      mod(ctx, 'BTD', 'btd_east_writes_back', 'The East Writes Back',
        { legitimacyAdd: 0.2, incomeMult: 1.08 });
    },
  },
  {
    id: 'btd_the_grandson', name: 'The Payoff Is the Grandson',
    icon: 'scales', col: 2, row: 2, requires: ['btd_the_east'],
    desc: 'Seat an heir of the joined line, at legitimacy 85 and stability +3.',
    rewardText: '+120 governance points and "The Line Joined": +0.3 public belief a month and '
      + '−0.5 unrest everywhere, permanent.',
    check: (ctx) => heirSeated(ctx, 'BTD') && legitimacyOf(ctx, 'BTD') >= 85
      && stabilityOf(ctx, 'BTD') >= 3,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'BTD', { gov: 120 });
      mod(ctx, 'BTD', 'btd_line_joined', 'The Line Joined',
        { legitimacyAdd: 0.3, unrestAll: -0.5 });
    },
  },
  {
    id: 'btd_the_expectation', name: 'The Expectation Lives Next Door',
    icon: 'star8', col: 2, row: 3, requires: ['btd_the_grandson'],
    desc: 'Live beside it — no party in the room below 55, twenty-two provinces, and the realm '
      + 'at peace.',
    rewardText: '"Not Yet, and Not Denied": +0.2 public belief a month, +6% morale and −0.3 '
      + 'unrest everywhere, permanent.',
    check: (ctx) => courtFloor(ctx, 'BTD', 55) && ownedCount(ctx, 'BTD') >= 22
      && atPeace(ctx, 'BTD'),
    reward: (ctx) => mod(ctx, 'BTD', 'btd_not_yet', 'Not Yet, and Not Denied',
      { legitimacyAdd: 0.2, moraleMult: 1.06, unrestAll: -0.3 }),
  },
  {
    id: 'btd_the_city_of_david', name: 'The City of David, Held',
    icon: 'walls', col: 3, row: 0, requires: ['btd_proclaimed'],
    desc: 'Jerusalem, Hebron and Engaddi — the city he took, the city he was crowned in, and '
      + 'the strongholds he was hiding in when Saul came looking.',
    rewardText: '+300 talents and "Where He Was Crowned": +0.15 public belief a month and '
      + '+8% income, permanent.',
    check: (ctx) => holdsAll(ctx, 'BTD', ['Jerusalem', 'Hebron', 'Engaddi']),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'BTD', { treasury: 300 });
      mod(ctx, 'BTD', 'btd_where_crowned', 'Where He Was Crowned',
        { legitimacyAdd: 0.15, incomeMult: 1.08 });
    },
  },
  {
    id: 'btd_the_host', name: 'The Host of the House',
    icon: 'spears', col: 3, row: 1, requires: ['btd_the_city_of_david'],
    desc: 'The Davidic claim is the one that costs nothing to assert and everything to defend.',
    rewardText: '+95 martial points and "The Sceptre and the Sword": +8% morale, permanent.',
    check: (ctx) => menOf(ctx, 'BTD') >= 45000,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'BTD', { mar: 95 });
      mod(ctx, 'BTD', 'btd_sceptre_and_sword', 'The Sceptre and the Sword',
        { moraleMult: 1.08 });
    },
  },
  {
    id: 'btd_the_ingathering', name: 'The Kingdom the Prophets Meant',
    icon: 'grain', col: 3, row: 2, requires: ['btd_the_host'],
    desc: 'Twenty provinces keeping the Law, with 300 points of development under them.',
    rewardText: '+12,000 manpower and "The Land and the Line": +10% manpower and +8% '
      + 'development growth, permanent.',
    check: (ctx) => ownedCount(ctx, 'BTD', 'judaism') >= 20 && devOf(ctx, 'BTD') >= 300,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'BTD', { manpower: 12000 });
      mod(ctx, 'BTD', 'btd_land_and_line', 'The Land and the Line',
        { manpowerMult: 1.1, growthMult: 1.08 });
    },
  },
  {
    id: 'btd_the_standing_claim', name: 'Whoever Holds the Exilarchate Holds a Claim',
    icon: 'split', col: 3, row: 3, requires: ['btd_the_ingathering'],
    desc: 'Settle it the only way it settles: owe fealty to nobody, hold legitimacy 90, and '
      + 'stand at war with nobody.',
    rewardText: '+120 governance points and "One Claim, One Throne": +0.25 public belief a '
      + 'month and −0.4 unrest everywhere, permanent.',
    check: (ctx) => independent(ctx, 'BTD') && legitimacyOf(ctx, 'BTD') >= 90
      && atPeace(ctx, 'BTD'),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'BTD', { gov: 120 });
      mod(ctx, 'BTD', 'btd_one_claim', 'One Claim, One Throne',
        { legitimacyAdd: 0.25, unrestAll: -0.4 });
    },
  },
];

// ---- 132 CE, prince and priest both hereditary ------------------------------
// The arrangement the coinage implied, made permanent — the Hasmonean collapse
// run in reverse, which nobody has tried. Two hereditary offices means two
// successions to go wrong and no arbiter above either of them.
const SHB_BRANCH = [
  {
    id: 'shb_the_coinage', name: 'Two Names on the Silver',
    icon: 'coins', col: 2, row: 0, requires: ['shb_proclaimed'],
    desc: 'Make it the constitution: hold Jerusalem, with the realm at stability +2 and 300 '
      + 'talents to pay two households.',
    rewardText: '+95 governance points and "Prince and Priest": +0.15 public belief a month '
      + 'and −0.3 unrest everywhere, permanent.',
    check: (ctx) => holds(ctx, 'SHB', 'Jerusalem') && stabilityOf(ctx, 'SHB') >= 2
      && treasuryOf(ctx, 'SHB') >= 300,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'SHB', { gov: 95 });
      mod(ctx, 'SHB', 'shb_prince_and_priest', 'Prince and Priest',
        { legitimacyAdd: 0.15, unrestAll: -0.3 });
    },
  },
  {
    id: 'shb_the_courses', name: 'The Courses Settled Before the Office Is',
    icon: 'altar', col: 2, row: 1, requires: ['shb_the_coinage'],
    desc: 'Hold Jerusalem with the House standing and sixteen provinces keeping the Law.',
    rewardText: '+400 talents and "The Second House Endowed": +15% conversion and +0.15 '
      + 'public belief a month, permanent.',
    check: (ctx) => templeStands(ctx) && holds(ctx, 'SHB', 'Jerusalem')
      && ownedCount(ctx, 'SHB', 'judaism') >= 16,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'SHB', { treasury: 400 });
      mod(ctx, 'SHB', 'shb_second_house_endowed', 'The Second House Endowed',
        { convertMult: 1.15, legitimacyAdd: 0.15 });
    },
  },
  {
    id: 'shb_two_purses', name: 'Two Households, One Treasury',
    icon: 'market', col: 2, row: 2, requires: ['shb_the_courses'],
    desc: 'Carry it — 600 talents in hand against 275 points of development.',
    rewardText: '+500 talents and "The Second Household Paid": +10% income, permanent.',
    check: (ctx) => treasuryOf(ctx, 'SHB') >= 600 && devOf(ctx, 'SHB') >= 275,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'SHB', { treasury: 500 });
      mod(ctx, 'SHB', 'shb_second_household_paid', 'The Second Household Paid',
        { incomeMult: 1.1 });
    },
  },
  {
    id: 'shb_no_arbiter', name: 'No Arbiter Above Either of Them',
    icon: 'scales', col: 2, row: 3, requires: ['shb_two_purses'],
    desc: 'Run it anyway — the Sages at 65, the Captains at 55, and the realm at stability +3.',
    rewardText: '+120 governance points and "They Have Not Quarrelled Yet": −0.6 unrest '
      + 'everywhere and +0.2 public belief a month, permanent.',
    check: (ctx) => partyAt(ctx, 'SHB', 'sages', 65) && partyAt(ctx, 'SHB', 'captains', 55)
      && stabilityOf(ctx, 'SHB') >= 3,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'SHB', { gov: 120 });
      mod(ctx, 'SHB', 'shb_not_quarrelled', 'They Have Not Quarrelled Yet',
        { unrestAll: -0.6, legitimacyAdd: 0.2 });
    },
  },
  {
    id: 'shb_the_hasmonean_lesson', name: 'The Hasmonean Collapse Run Backwards',
    icon: 'split', col: 3, row: 0, requires: ['shb_proclaimed'],
    desc: 'It has to be shown, not asserted: legitimacy 70 with no pretender in the field.',
    rewardText: '+95 influence points and "The Merger Undone": +0.15 public belief a month '
      + 'and +6% income, permanent.',
    check: (ctx) => legitimacyOf(ctx, 'SHB') >= 70
      && !(ctx.game.pretenders && ctx.game.pretenders.SHB),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'SHB', { infl: 95 });
      mod(ctx, 'SHB', 'shb_merger_undone', 'The Merger Undone',
        { legitimacyAdd: 0.15, incomeMult: 1.06 });
    },
  },
  {
    id: 'shb_the_captains', name: 'The Prince Keeps the Army',
    icon: 'helmet', col: 3, row: 1, requires: ['shb_the_hasmonean_lesson'],
    desc: 'Thirty-45,000 men with the war-craft of the age two rungs past this chapter\'s '
      + 'baseline.',
    rewardText: '+95 martial points and "The Prince\'s Own": +6% discipline and +8% morale, '
      + 'permanent.',
    check: (ctx) => menOf(ctx, 'SHB') >= 45000 && marAbove(ctx, 'SHB', 2),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'SHB', { mar: 95 });
      mod(ctx, 'SHB', 'shb_princes_own', 'The Prince\'s Own',
        { disciplineMult: 1.06, moraleMult: 1.08 });
    },
  },
  {
    id: 'shb_two_successions', name: 'Two Successions to Go Wrong',
    icon: 'scroll', col: 3, row: 2, requires: ['shb_the_captains'],
    desc: 'Write one: an heir seated, the art of government two rungs past this age\'s '
      + 'baseline, and legitimacy 80.',
    rewardText: '+120 governance points and "The Case Provided For": +0.2 public belief a '
      + 'month and −0.4 unrest everywhere, permanent.',
    check: (ctx) => heirSeated(ctx, 'SHB') && govAbove(ctx, 'SHB', 2)
      && legitimacyOf(ctx, 'SHB') >= 80,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'SHB', { gov: 120 });
      mod(ctx, 'SHB', 'shb_case_provided_for', 'The Case Provided For',
        { legitimacyAdd: 0.2, unrestAll: -0.4 });
    },
  },
  {
    id: 'shb_the_two_signatures', name: 'Both Names on the Same Order',
    icon: 'quill', col: 3, row: 3, requires: ['shb_two_successions'],
    desc: 'Twenty-two provinces held, at peace, with no party in the room below 55.',
    rewardText: '"Two Seals on Every Order": +8% income, −0.4 unrest everywhere and +0.15 '
      + 'public belief a month, permanent.',
    check: (ctx) => ownedCount(ctx, 'SHB') >= 22 && atPeace(ctx, 'SHB')
      && courtFloor(ctx, 'SHB', 55),
    reward: (ctx) => mod(ctx, 'SHB', 'shb_two_seals', 'Two Seals on Every Order',
      { incomeMult: 1.08, unrestAll: -0.4, legitimacyAdd: 0.15 }),
  },
];

// ---- 132 CE, Ezekiel's prince -----------------------------------------------
// Chapters 44 to 46: a nasi who brings his offerings like any man, holds no
// priestly office, and may leave his inheritance to his sons but may not take
// the people's land. A hereditary office engineered not to be a monarchy — the
// first Jewish constitution since the elders, written by somebody who never
// expected it to be used.
const NSI_BRANCH = [
  {
    id: 'nsi_the_forty_sixth', name: 'The Forty-Sixth Chapter, Verse Eighteen',
    icon: 'scroll', col: 2, row: 0, requires: ['nsi_proclaimed'],
    desc: 'Get the constitution and the treasury into the same state: eighteen provinces held '
      + 'with the realm at stability +2, and the Sages at 60.',
    rewardText: '+95 governance points and "The Text Obeyed": +0.2 public belief a month and '
      + '−0.4 unrest everywhere, permanent.',
    check: (ctx) => ownedCount(ctx, 'NSI') >= 18 && stabilityOf(ctx, 'NSI') >= 2
      && partyAt(ctx, 'NSI', 'sages', 60),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'NSI', { gov: 95 });
      mod(ctx, 'NSI', 'nsi_text_obeyed', 'The Text Obeyed',
        { legitimacyAdd: 0.2, unrestAll: -0.4 });
    },
  },
  {
    id: 'nsi_no_priestly_office', name: 'He Holds No Priestly Office',
    icon: 'altar', col: 2, row: 1, requires: ['nsi_the_forty_sixth'],
    desc: 'Which means the priesthood has to exist separately and be content: the House '
      + 'standing in Jerusalem, and sixteen provinces keeping the Law.',
    rewardText: '+400 talents and "At the Gate Like Any Man": +15% conversion and −0.3 unrest '
      + 'everywhere, permanent.',
    check: (ctx) => templeStands(ctx) && holds(ctx, 'NSI', 'Jerusalem')
      && ownedCount(ctx, 'NSI', 'judaism') >= 16,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'NSI', { treasury: 400 });
      mod(ctx, 'NSI', 'nsi_at_the_gate', 'At the Gate Like Any Man',
        { convertMult: 1.15, unrestAll: -0.3 });
    },
  },
  {
    id: 'nsi_the_letters', name: 'The Letters of the Nasi',
    icon: 'diaspora', col: 2, row: 2, requires: ['nsi_no_priestly_office'],
    desc: 'Four communities reading our letters at 60 — Alexandria, Antioch, Babylon and Rome '
      + '— or under the crown outright.',
    rewardText: '+500 talents and "Read Wherever the Letters Go": +0.25 public belief a month, '
      + '+10% income and +1 envoy, permanent.',
    check: (ctx) => ['Alexandria', 'Antioch', 'Babylon', 'Roma']
      .every((n) => standingAt(ctx, n) >= 60 || holds(ctx, 'NSI', n)),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'NSI', { treasury: 500 });
      mod(ctx, 'NSI', 'nsi_read_wherever', 'Read Wherever the Letters Go',
        { legitimacyAdd: 0.25, incomeMult: 1.1, diploSeats: 1 });
    },
  },
  {
    id: 'nsi_bound_in_writing', name: 'A House Bound in Writing',
    icon: 'scales', col: 2, row: 3, requires: ['nsi_the_letters'],
    desc: 'An heir seated under those terms at legitimacy 85, with no party in the room below '
      + '55.',
    rewardText: '+120 governance points and "Bound By the Prophet": +0.25 public belief a '
      + 'month and −0.5 unrest everywhere, permanent.',
    check: (ctx) => heirSeated(ctx, 'NSI') && legitimacyOf(ctx, 'NSI') >= 85
      && courtFloor(ctx, 'NSI', 55),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'NSI', { gov: 120 });
      mod(ctx, 'NSI', 'nsi_bound_by_the_prophet', 'Bound By the Prophet',
        { legitimacyAdd: 0.25, unrestAll: -0.5 });
    },
  },
  {
    id: 'nsi_the_patriarchs_court', name: 'The Patriarch\'s Own Court',
    icon: 'quill', col: 3, row: 0, requires: ['nsi_proclaimed'],
    desc: 'Take the art of government two rungs past this age\'s baseline — a chancery of '
      + 'sages, not a household of captains.',
    rewardText: '+95 influence points and "The Chancery of the Sages": +8% income and +0.15 '
      + 'public belief a month, permanent.',
    check: (ctx) => govAbove(ctx, 'NSI', 2),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'NSI', { infl: 95 });
      mod(ctx, 'NSI', 'nsi_chancery_of_sages', 'The Chancery of the Sages',
        { incomeMult: 1.08, legitimacyAdd: 0.15 });
    },
  },
  {
    id: 'nsi_the_academies', name: 'The Academies Under the Patriarch',
    icon: 'lamp', col: 3, row: 1, requires: ['nsi_the_patriarchs_court'],
    desc: 'The Sages at 75 with 275 points of development under the realm.',
    rewardText: '+300 talents and "Ordination in Our Hands": +10% development growth and '
      + '−0.4 unrest everywhere, permanent.',
    check: (ctx) => partyAt(ctx, 'NSI', 'sages', 75) && devOf(ctx, 'NSI') >= 275,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'NSI', { treasury: 300 });
      mod(ctx, 'NSI', 'nsi_ordination', 'Ordination in Our Hands',
        { growthMult: 1.1, unrestAll: -0.4 });
    },
  },
  {
    id: 'nsi_not_a_monarchy', name: 'The Captains Are Told No',
    icon: 'helmet', col: 3, row: 2, requires: ['nsi_the_academies'],
    desc: 'Keep an army anyway — 42,000 men — with the Captains still at 45, which is the '
      + 'narrow thing this road has to do.',
    rewardText: '+70 martial points and "Constrained and Still Obeyed": +8% morale and +8% '
      + 'manpower, permanent.',
    check: (ctx) => menOf(ctx, 'NSI') >= 42000 && partyAt(ctx, 'NSI', 'captains', 45),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'NSI', { mar: 70 });
      mod(ctx, 'NSI', 'nsi_constrained_obeyed', 'Constrained and Still Obeyed',
        { moraleMult: 1.08, manpowerMult: 1.08 });
    },
  },
  {
    id: 'nsi_outlives_everything', name: 'The Office That Outlived the Country',
    icon: 'star8', col: 3, row: 3, requires: ['nsi_not_a_monarchy'],
    desc: 'Twenty provinces at peace, owing fealty to nobody, at stability +3 — what an office '
      + 'designed to survive looks like.',
    rewardText: '+120 influence points and "Ended Only By a Rescript": +0.2 public belief a '
      + 'month, +8% income and −0.4 unrest everywhere, permanent.',
    check: (ctx) => ownedCount(ctx, 'NSI') >= 20 && atPeace(ctx, 'NSI')
      && independent(ctx, 'NSI') && stabilityOf(ctx, 'NSI') >= 3,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'NSI', { infl: 120 });
      mod(ctx, 'NSI', 'nsi_only_a_rescript', 'Ended Only By a Rescript',
        { legitimacyAdd: 0.2, incomeMult: 1.08, unrestAll: -0.4 });
    },
  },
];

// One table per crown: the spine every settled constitution works, and the
// eight this one works instead of the other nine's.
const SNH_MISSIONS = [...settledSpine('SNH'), ...SNH_BRANCH];
const GRL_MISSIONS = [...settledSpine('GRL'), ...GRL_BRANCH];
const YVL_MISSIONS = [...settledSpine('YVL'), ...YVL_BRANCH];
const HRZ_MISSIONS = [...settledSpine('HRZ'), ...HRZ_BRANCH];
const KHN_MISSIONS = [...settledSpine('KHN'), ...KHN_BRANCH];
const GRS_MISSIONS = [...settledSpine('GRS'), ...GRS_BRANCH];
const KTR_MISSIONS = [...settledSpine('KTR'), ...KTR_BRANCH];
const BTD_MISSIONS = [...settledSpine('BTD'), ...BTD_BRANCH];
const SHB_MISSIONS = [...settledSpine('SHB'), ...SHB_BRANCH];
const NSI_MISSIONS = [...settledSpine('NSI'), ...NSI_BRANCH];

// The ten crowns, in the order the chapters offer them. Every one of them is
// player-only: an AI court that re-branded itself mid-chapter would orphan the
// fork's own follow-on cards, exactly as the four dynastic restorations would.
const CONSTITUTION_CROWNS = [
  {
    id: 'form_snh_jud', from: 'JUD', to: 'SNH', gov: 'sanhedrin',
    name: 'Take the Name of the Temple-State',
    desc: 'The settlement is adopted and the country is still called what the rebels '
      + 'called it. Let the name say the arrangement instead: a High Priest, a Sanhedrin '
      + 'and the constitution Judaea kept under Persia and the Ptolemies, written on the '
      + 'coins and used by every chancery that writes to us.',
    bookmarks: ['66ce'],
    requires: [
      { label: 'The settlement is the temple-state', check: (ctx, tag) => govIs(ctx, tag, 'sanhedrin') },
      { label: 'Own and control Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      { label: 'Own and control twelve provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 12 },
      { label: 'The Temple priesthood stands with us (60)', check: (ctx, tag) => partyAt(ctx, tag, 'priesthood', 60) },
      { label: 'Stability 1', check: (ctx, tag) => stabilityOf(ctx, tag) >= 1 },
    ],
    bonus: {
      legitimacy: 20, stability: 1,
      grant: { treasury: 150, gov: 40, infl: 30 },
      rulerTitle: 'High Priest of the Jews',
      modifier: {
        id: 'the_ancient_constitution', name: 'The Ancient Constitution', months: -1,
        effects: { incomeMult: 1.08, unrestAll: -0.4 },
      },
      modifier2: {
        id: 'everybody_knows_the_forms', name: 'Everybody Knows the Forms', months: -1,
        effects: { legitimacyAdd: 0.15, convertMult: 1.1 },
      },
    },
    missions: SNH_MISSIONS,
  },
  {
    id: 'form_grl_jud', from: 'JUD', to: 'GRL', gov: 'lot',
    name: 'Take the Name of the Commonwealth of the Lot',
    desc: 'Hereditary priestly power ended on an afternoon and the state has been trading '
      + 'under the old name ever since. Name the thing that replaced it: a commonwealth '
      + 'whose highest office is filled from the whole priesthood by the urn, where nobody '
      + 'inherits and nobody is in office long enough to promise anything to anybody.',
    bookmarks: ['66ce'],
    requires: [
      { label: 'The settlement is the lot', check: (ctx, tag) => govIs(ctx, tag, 'lot') },
      { label: 'Own and control Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      { label: 'Own and control twelve provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 12 },
      { label: 'The Zealots stand with us (60)', check: (ctx, tag) => partyAt(ctx, tag, 'zealots', 60) },
      { label: 'Owe fealty to no one', check: (ctx, tag) => independent(ctx, tag) },
    ],
    bonus: {
      legitimacy: 15, stability: 1,
      grant: { treasury: 100, manpower: 3000, gov: 40 },
      rulerTitle: 'High Priest by Lot',
      modifier: {
        id: 'the_urn_and_the_register', name: 'The Urn and the Register', months: -1,
        effects: { unrestAll: -0.4, legitimacyAdd: 0.12 },
      },
      modifier2: {
        id: 'nobody_inherits_anything', name: 'Nobody Inherits Anything', months: -1,
        effects: { manpowerMult: 1.08, moraleMult: 1.05 },
      },
    },
    missions: GRL_MISSIONS,
  },
  {
    id: 'form_yvl_jud', from: 'JUD', to: 'YVL', gov: 'jubilee',
    name: 'Take the Name of the Jubilee Commonwealth',
    desc: 'Liberty is proclaimed, the debts are gone and the land is reverting, and the '
      + 'state doing it is still filed under the name of a Roman province. Call it what it '
      + 'is: a commonwealth constituted by Leviticus 25 and administered by an assembly '
      + 'that renews its officers by vote, because a hereditary enforcer of the reversion '
      + 'is a landlord in two generations.',
    bookmarks: ['66ce'],
    requires: [
      { label: 'The settlement is the Jubilee', check: (ctx, tag) => govIs(ctx, tag, 'jubilee') },
      { label: 'Own and control Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      { label: 'Own and control fourteen provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 14 },
      { label: 'The Zealots stand with us (55)', check: (ctx, tag) => partyAt(ctx, tag, 'zealots', 55) },
      { label: 'Owe fealty to no one', check: (ctx, tag) => independent(ctx, tag) },
    ],
    bonus: {
      legitimacy: 20, stability: 1,
      grant: { treasury: 80, manpower: 5000, gov: 30, infl: 30 },
      rulerTitle: 'Warden of the Jubilee',
      modifier: {
        id: 'liberty_in_the_land', name: 'Liberty in the Land', months: -1,
        effects: { manpowerMult: 1.1, growthMult: 1.1 },
      },
      modifier2: {
        id: 'no_credit_no_creditors', name: 'No Credit and No Creditors', months: -1,
        effects: { unrestAll: -0.4, incomeMult: 0.96 },
      },
    },
    missions: YVL_MISSIONS,
  },
  {
    id: 'form_hrz_jud', from: 'JUD', to: 'HRZ', gov: 'noRuler',
    name: 'Take the Name of the Freedom of Zion',
    desc: 'The assembly resolved that there is no ruler but God and adjourned without '
      + 'appointing anybody to enforce the resolution, which is the resolution. The coins '
      + 'have been saying so since the second year: no head on the silver, and the years '
      + 'counted from the thing itself. Let the state be called what its own money calls it.',
    bookmarks: ['66ce'],
    requires: [
      { label: 'The settlement is no ruler but God', check: (ctx, tag) => govIs(ctx, tag, 'noRuler') },
      { label: 'Own and control Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      { label: 'Own and control fourteen provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 14 },
      { label: 'The Zealots stand with us (70)', check: (ctx, tag) => partyAt(ctx, tag, 'zealots', 70) },
      { label: 'Owe fealty to no one', check: (ctx, tag) => independent(ctx, tag) },
    ],
    bonus: {
      legitimacy: 15, stability: 1,
      grant: { manpower: 7000, mar: 40, gov: 20 },
      rulerTitle: 'Convener of the Assembly',
      modifier: {
        id: 'no_tribute_no_census', name: 'No Tribute, No Census', months: -1,
        effects: { moraleMult: 1.1, manpowerMult: 1.1 },
      },
      modifier2: {
        id: 'nothing_to_negotiate_for', name: 'Nothing to Negotiate For', months: -1,
        effects: { hillDefBonus: 1, incomeMult: 0.94 },
      },
    },
    missions: HRZ_MISSIONS,
  },
  {
    id: 'form_khn_has', from: 'HAS', to: 'KHN', gov: 'priestKing',
    name: 'Take the Name of the Priest-Kingdom',
    desc: 'The linen band is on and the secretaries have their answer, and the state is '
      + 'still writing to the world under a name that means the house rather than the '
      + 'kingdom. Style it as it is styled abroad: a kingdom of the Jews whose king is also '
      + 'the high priest, on the coins in two languages, as Aristobulus struck them.',
    bookmarks: ['167bce'],
    requires: [
      { label: 'The house wears the diadem', check: (ctx, tag) => govIs(ctx, tag, 'priestKing') },
      { label: 'Own and control Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      { label: 'Own and control sixteen provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 16 },
      { label: 'Legitimacy 55', check: (ctx, tag) => legitimacyOf(ctx, tag) >= 55 },
      { label: 'Owe fealty to no one', check: (ctx, tag) => independent(ctx, tag) },
    ],
    bonus: {
      legitimacy: 25, stability: 1,
      grant: { treasury: 200, manpower: 4000, gov: 40, infl: 40 },
      rulerTitle: 'King and High Priest of the Jews',
      modifier: {
        id: 'the_diadem_and_the_mitre', name: 'The Diadem and the Mitre', months: -1,
        effects: { incomeMult: 1.1, moraleMult: 1.06 },
      },
      modifier2: {
        id: 'a_peer_of_every_chancery', name: 'A Peer of Every Chancery', months: -1,
        effects: { legitimacyAdd: 0.15, tradeMult: 1.08 },
      },
    },
    missions: KHN_MISSIONS,
  },
  {
    id: 'form_grs_has', from: 'HAS', to: 'GRS', gov: 'gerousia',
    name: 'Take the Name of the Judaean Commonwealth',
    desc: 'The linen band went back in its box and what is left is the thing the decree '
      + 'actually described: a commonwealth of the Jews governed by the high priesthood and '
      + 'the elders, with no crown in it for anybody to dispute. Put that on the seal — the '
      + 'road the chronicles do not have, given a name they would have had to use.',
    bookmarks: ['167bce'],
    requires: [
      { label: 'The diadem was refused', check: (ctx, tag) => govIs(ctx, tag, 'gerousia') },
      { label: 'Own and control Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      { label: 'Own and control sixteen provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 16 },
      { label: 'Stability 2', check: (ctx, tag) => stabilityOf(ctx, tag) >= 2 },
      { label: 'Owe fealty to no one', check: (ctx, tag) => independent(ctx, tag) },
    ],
    bonus: {
      legitimacy: 20, stability: 2,
      grant: { treasury: 220, gov: 50, infl: 30 },
      rulerTitle: 'High Priest and Ethnarch of the Jews',
      modifier: {
        id: 'the_decree_as_written', name: 'The Decree as Written', months: -1,
        effects: { unrestAll: -0.5, legitimacyAdd: 0.15 },
      },
      modifier2: {
        id: 'the_elders_in_session', name: 'The Elders in Session', months: -1,
        effects: { incomeMult: 1.08, growthMult: 1.08 },
      },
    },
    missions: GRS_MISSIONS,
  },
  {
    id: 'form_ktr_jud', from: 'JUD', to: 'KTR', gov: 'diadem',
    name: 'Take the Name of the Crown of Judaea',
    desc: 'The house that won the war has taken the crown, and every chancery between the '
      + 'Nile and the Tigris already knows how to address one. Say it on the coins and in '
      + 'the letters: a kingdom, held by the men who took it, with no priestly title and no '
      + 'genealogy under it and no intention of apologising for either.',
    bookmarks: ['132ce', '614ce'],
    requires: [
      { label: 'The house took the crown', check: (ctx, tag) => govIs(ctx, tag, 'diadem') },
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
        id: 'a_crown_out_of_a_war', name: 'A Crown Out of a War', months: -1,
        effects: { moraleMult: 1.08, incomeMult: 1.08 },
      },
      modifier2: {
        id: 'the_objection_in_writing', name: 'The Objection, in Writing', months: -1,
        effects: { legitimacyAdd: 0.15, unrestAll: 0.15 },
      },
    },
    missions: KTR_MISSIONS,
  },
  {
    id: 'form_btd_jud', from: 'JUD', to: 'BTD', gov: 'davidic',
    name: 'Take the Name of the House of David',
    desc: 'The line of Jehoiachin is on this throne, by marriage or by coronation, and it '
      + 'is the one claim in the Jewish world that nobody argues with. Take the name that '
      + 'goes with it — and with it the question every generation will now be entitled to '
      + 'ask, which no other constitution has to answer.',
    bookmarks: ['132ce', '614ce'],
    requires: [
      { label: 'The line of Jehoiachin is on the throne', check: (ctx, tag) => govIs(ctx, tag, 'davidic') },
      { label: 'Own and control Jerusalem and Hebron', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem', 'Hebron']) },
      { label: 'Own and control sixteen provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 16 },
      { label: 'Legitimacy 65', check: (ctx, tag) => legitimacyOf(ctx, tag) >= 65 },
      { label: 'Owe fealty to no one', check: (ctx, tag) => independent(ctx, tag) },
    ],
    bonus: {
      legitimacy: 30, stability: 1,
      grant: { treasury: 180, manpower: 4000, gov: 40, infl: 40 },
      rulerTitle: 'King of the House of David',
      modifier: {
        // NOT `the_line_of_jehoiachin` — the 132 marriage and the shared
        // house-of-David arc both seat a modifier under that id, and
        // addTagModifier replaces by id: a crown proclaimed after either of
        // them would have quietly downgraded the thing it was celebrating.
        id: 'btd_nobody_argues_with_it', name: 'The Claim Nobody Argues With', months: -1,
        effects: { legitimacyAdd: 0.2, unrestAll: -0.4 },
      },
      modifier2: {
        id: 'the_question_next_door', name: 'The Question Next Door', months: -1,
        effects: { moraleMult: 1.06, incomeMult: 1.06 },
      },
    },
    missions: BTD_MISSIONS,
  },
  {
    id: 'form_shb_jud', from: 'JUD', to: 'SHB', gov: 'dyarchy',
    name: 'Take the Name of the Two Houses',
    desc: 'Prince and priest, both hereditary, exactly as the coinage implied — and the '
      + 'coinage is the only place it has ever been written down. Make it the state\'s own '
      + 'name: two offices, two households, two seals on every order, and no arbiter above '
      + 'either of them.',
    bookmarks: ['132ce'],
    requires: [
      { label: 'Prince and priest are both hereditary', check: (ctx, tag) => govIs(ctx, tag, 'dyarchy') },
      { label: 'Own and control Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      { label: 'Own and control sixteen provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 16 },
      { label: 'The Sages stand with us (60)', check: (ctx, tag) => partyAt(ctx, tag, 'sages', 60) },
      { label: 'Stability 2', check: (ctx, tag) => stabilityOf(ctx, tag) >= 2 },
    ],
    bonus: {
      legitimacy: 20, stability: 2,
      grant: { treasury: 200, gov: 40, infl: 40 },
      rulerTitle: 'Nasi of Israel',
      modifier: {
        id: 'two_offices_two_houses', name: 'Two Offices, Two Houses', months: -1,
        effects: { legitimacyAdd: 0.15, convertMult: 1.15 },
      },
      modifier2: {
        id: 'the_second_household', name: 'The Second Household', months: -1,
        effects: { unrestAll: -0.4, incomeMult: 0.96 },
      },
    },
    missions: SHB_MISSIONS,
  },
  {
    id: 'form_nsi_jud', from: 'JUD', to: 'NSI', gov: 'nasi',
    name: 'Take the Name of the Patriarchate',
    desc: 'The house kept the founder\'s title and accepted the prophet\'s terms for it, '
      + 'which makes this the first Jewish constitution since the elders and the only one '
      + 'in the room that binds the men who adopted it. Let the state be the office: a '
      + 'patriarchate, whose instrument is a letter and whose reach is wherever the letters '
      + 'are read.',
    bookmarks: ['132ce'],
    requires: [
      { label: 'The prince holds by Ezekiel\'s terms', check: (ctx, tag) => govIs(ctx, tag, 'nasi') },
      { label: 'Own and control Jerusalem', check: (ctx, tag) => ownsAndControls(ctx, tag, ['Jerusalem']) },
      { label: 'Own and control sixteen provinces', check: (ctx, tag) => ownedControlledCount(ctx, tag) >= 16 },
      { label: 'The Sages stand with us (65)', check: (ctx, tag) => partyAt(ctx, tag, 'sages', 65) },
      { label: 'Stability 2', check: (ctx, tag) => stabilityOf(ctx, tag) >= 2 },
    ],
    bonus: {
      legitimacy: 25, stability: 2,
      grant: { treasury: 200, gov: 50, infl: 50 },
      rulerTitle: 'Nasi of Israel',
      modifier: {
        id: 'the_prince_of_the_prophet', name: 'The Prince of the Prophet', months: -1,
        effects: { legitimacyAdd: 0.2, convertMult: 1.1 },
      },
      modifier2: {
        id: 'the_letters_are_the_office', name: 'The Letters Are the Office', months: -1,
        effects: { incomeMult: 1.08, unrestAll: -0.3 },
      },
    },
    missions: NSI_MISSIONS,
  },
];

// The greater crown is not closed off by naming the lesser one (SPEC §227).
// The Kingdom of Israel is the endgame of the whole Jewish arc and it is
// reached by a dynasty rather than by a war, so every constitution keeps the
// road to it on exactly the terms JUD and HAS have — and proclaiming it ENDS
// the constitution, because MLI's own government is a monarchy and
// switchTagCore applies the new banner's. A commonwealth that finds a son of
// David and crowns him has answered its own question, which is the point.
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
      { label: 'Hold Jerusalem', check: (ctx, tag) => ctx.helpers.controls(ctx, tag, 'Jerusalem') },
      { label: 'Hold twelve provinces', check: (ctx, tag) => ctx.helpers.countControlled(ctx, tag, {}) >= 12 },
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
      { label: 'Hold Jerusalem', check: (ctx, tag) => ctx.helpers.controls(ctx, tag, 'Jerusalem') },
      { label: 'Hold twelve provinces', check: (ctx, tag) => ctx.helpers.countControlled(ctx, tag, {}) >= 12 },
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
      { label: 'Hold Jerusalem', check: (ctx, tag) => ctx.helpers.controls(ctx, tag, 'Jerusalem') },
      { label: 'Hold Hebron', check: (ctx, tag) => ctx.helpers.controls(ctx, tag, 'Hebron') },
      { label: 'Hold ten provinces', check: (ctx, tag) => ctx.helpers.countControlled(ctx, tag, {}) >= 10 },
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
      { label: 'Hold Jerusalem', check: (ctx, tag) => ctx.helpers.controls(ctx, tag, 'Jerusalem') },
      { label: 'Hold ten provinces', check: (ctx, tag) => ctx.helpers.countControlled(ctx, tag, {}) >= 10 },
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
      { label: 'Hold Jerusalem', check: (ctx, tag) => ctx.helpers.controls(ctx, tag, 'Jerusalem') },
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
      { label: 'Hold Jerusalem', check: (ctx, tag) => ctx.helpers.controls(ctx, tag, 'Jerusalem') },
      { label: 'Hold Tel Aviv-Jaffa (Joppa)', check: (ctx, tag) => ctx.helpers.controls(ctx, tag, 'Joppa') },
      { label: "Israel's cause broken (dead, client, or a rump of 3)", check: (ctx) => broken(ctx, 'ISR') },
      { label: 'Hold twenty provinces', check: (ctx, tag) => ctx.helpers.countControlled(ctx, tag, {}) >= 20 },
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
      { label: 'Hold Jerusalem', check: (ctx, tag) => ctx.helpers.controls(ctx, tag, 'Jerusalem') },
      { label: 'Hold Tel Aviv-Jaffa (Joppa)', check: (ctx, tag) => ctx.helpers.controls(ctx, tag, 'Joppa') },
      { label: "Israel's cause broken (dead, client, or a rump of 3)", check: (ctx) => broken(ctx, 'ISR') },
      { label: 'Hold twenty provinces', check: (ctx, tag) => ctx.helpers.countControlled(ctx, tag, {}) >= 20 },
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
      { label: 'Hold Antioch', check: (ctx, tag) => ctx.helpers.controls(ctx, tag, 'Antioch') },
      { label: 'Hold Alexandria', check: (ctx, tag) => ctx.helpers.controls(ctx, tag, 'Alexandria') },
      { label: 'Hold Jerusalem', check: (ctx, tag) => ctx.helpers.controls(ctx, tag, 'Jerusalem') },
      { label: 'Hold Seleucia-Ctesiphon', check: (ctx, tag) => ctx.helpers.controls(ctx, tag, 'Seleucia-Ctesiphon') },
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
  // ---- the ten constitutional crowns, and the road they keep open (SPEC §227)
  ...CONSTITUTION_CROWNS,
  israelFrom('SNH', ['66ce']),
  israelFrom('GRL', ['66ce']),
  israelFrom('YVL', ['66ce']),
  israelFrom('HRZ', ['66ce']),
  israelFrom('KHN', ['167bce']),
  israelFrom('GRS', ['167bce']),
  israelFrom('KTR', ['132ce', '614ce']),
  israelFrom('BTD', ['132ce', '614ce']),
  israelFrom('SHB', ['132ce']),
  israelFrom('NSI', ['132ce']),
];
