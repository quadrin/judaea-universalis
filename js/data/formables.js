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
  return (p && p.dia && Number.isFinite(p.dia.standing)) ? p.dia.standing : 0;
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
    desc: 'Settle the realm under the new crown: stability 2 and a court that is not '
      + 'at war with itself (no pretender in the field).',
    rewardText: '"The Crown Settled": +10% income and −0.5 unrest everywhere for 60 months.',
    check: (ctx) => (ctx.game.tags.MLI && (ctx.game.tags.MLI.stability || 0) >= 2)
      && !(ctx.game.pretenders && ctx.game.pretenders.MLI),
    reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'crown_settled', name: 'The Crown Settled', months: 60,
      effects: { incomeMult: 1.1, unrestAll: -0.5 },
    }),
  },
  {
    id: 'mli_the_muster', name: 'The Muster of Israel',
    icon: 'spears', col: 0, row: 1, requires: ['mli_the_crowning'],
    desc: 'Put thirty thousand men under the kingdom\'s own banner.',
    rewardText: '+40 martial points and "The King\'s Own": +8% discipline for 60 months.',
    check: (ctx) => menOf(ctx, 'MLI') >= 30000,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { mar: 40 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'kings_own', name: "The King's Own", months: 60, effects: { disciplineMult: 1.08 },
      });
    },
  },
  {
    id: 'mli_the_land', name: 'The Land of the Twelve',
    icon: 'grain', col: 1, row: 1, requires: ['mli_the_crowning'],
    desc: 'Thirty provinces under the crown, twenty of them keeping the Law.',
    rewardText: '+150 talents and "The Kingdom Whole": +12% manpower, permanent.',
    check: (ctx) => ownedCount(ctx, 'MLI') >= 30 && ownedCount(ctx, 'MLI', 'judaism') >= 20,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { treasury: 150 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'kingdom_whole', name: 'The Kingdom Whole', months: -1, effects: { manpowerMult: 1.12 },
      });
    },
  },
  {
    id: 'mli_the_house', name: 'The House of the Name',
    icon: 'bricks', col: 1, row: 2, requires: ['mli_the_land'],
    desc: 'Build the realm rather than merely holding it: 260 points of development '
      + 'under the crown.',
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
    desc: 'Every crown that held this country held it from the same dozen rocks — the '
      + 'desert eyries above the Salt Sea, the passes down from the hills, the citadel '
      + 'over the Temple court. A kingdom whose engineers are somebody else\'s engineers '
      + 'holds none of them. Take the age\'s war-craft two rungs past the baseline it '
      + 'began with.',
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
    desc: 'A levy goes home at harvest. Every Jewish state that mattered — Yannai\'s, '
      + 'Herod\'s, the one that held Jerusalem for three years under the Persians — paid '
      + 'somebody to stay under arms in the months when there was nothing to do. '
      + 'Forty-five thousand men on the rolls, half again the muster.',
    rewardText: '+40 martial points and "The Host That Does Not Go Home": +6% morale and '
      + '+10% reinforcement, permanent.',
    check: (ctx) => menOf(ctx, 'MLI') >= 45000,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { mar: 40 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'host_that_stays', name: 'The Host That Does Not Go Home', months: -1,
        effects: { moraleMult: 1.06, reinforceMult: 1.1 },
      });
    },
  },
  {
    id: 'mli_the_kings_peace', name: "The King's Peace",
    icon: 'dove', col: 0, row: 4, requires: ['mli_the_standing_host'],
    desc: 'The hardest thing a kingdom in this corridor ever did was stop. Salome '
      + 'Alexandra managed nine years of it and the chronicles remember the rain and the '
      + 'size of the grain. Stand at war with nobody, with the realm steady at stability '
      + '+3 — a peace the crown chose rather than one it was handed.',
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
    desc: 'Every Jewish monarchy in this game\'s six chapters died of its own succession '
      + 'before a foreigner got to it — the brothers at the gates of Jerusalem, the sons '
      + 'strangled at Sebaste, the will rewritten six times. Seat an heir with the realm '
      + 'behind him: legitimacy 80 and a named successor.',
    rewardText: '+30 governance points and "The Line Assured": +0.3 legitimacy a month '
      + 'and −0.5 unrest everywhere, permanent.',
    check: (ctx) => {
      const t = ctx.game.tags.MLI;
      return !!(t && t.heir) && (t && (t.legitimacy || 0)) >= 80;
    },
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { gov: 30 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_line_assured', name: 'The Line Assured', months: -1,
        effects: { legitimacyAdd: 0.3, unrestAll: -0.5 },
      });
    },
  },
  {
    id: 'mli_the_ingathering', name: 'The Ingathering',
    icon: 'diaspora', col: 1, row: 4, requires: ['mli_the_succession'],
    desc: 'The Land of the Twelve asked for twenty provinces keeping the Law. This asks '
      + 'for thirty — the difference between a Jewish state and a state with a Jewish '
      + 'crown, and the thing every prophet in the canon said the kingdom was for.',
    rewardText: '+5,000 manpower and "The Gathered In": +10% manpower and +0.2 legitimacy '
      + 'a month, permanent.',
    check: (ctx) => ownedCount(ctx, 'MLI', 'judaism') >= 30,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { manpower: 5000 });
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
    desc: 'A crown proclaimed is a crown that now has to collect a tax, hear a case and '
      + 'answer a letter in three languages. Carry all three of the age\'s ladders two '
      + 'rungs past the baseline this chapter opened with — not the war-craft alone, '
      + 'which is the mistake every rising in this game makes first.',
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
    desc: 'The House of the Name asked for two hundred and sixty points of development. '
      + 'This asks for four hundred with six hundred talents still in the treasury — a '
      + 'realm that built the roads AND can pay for the year after it built them, which '
      + 'is the distinction between Herod\'s reign and Herod\'s reputation.',
    rewardText: '+200 talents and "The Wealth of the Kingdom": +12% income, +10% trade '
      + 'and +8% development growth, permanent.',
    check: (ctx) => devOf(ctx, 'MLI') >= 400 && treasuryOf(ctx, 'MLI') >= 600,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { treasury: 200 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'wealth_of_the_kingdom', name: 'The Wealth of the Kingdom', months: -1,
        effects: { incomeMult: 1.12, tradeMult: 1.1, growthMult: 1.08 },
      });
    },
  },
  {
    id: 'mli_civil_among_the_powers', name: 'Among the Powers',
    icon: 'flag', civil: 'region', col: 1, row: 5,
    desc: 'The united monarchy is the one Jewish state the surrounding chanceries ever '
      + 'wrote to as an equal rather than about as a problem. Stand among the world\'s '
      + 'first five courts — the standing the realm panel keeps, which counts revenue, '
      + 'development and clients and not only men under arms.',
    rewardText: '+40 influence points and "Written To as a Power": +1 diplomatic seat '
      + 'and +1 deterrence, permanent.',
    check: (ctx) => {
      const i = standingRank(ctx, 'MLI');
      return i >= 0 && i < 5;
    },
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { infl: 40 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'written_to_as_a_power_mli', name: 'Written To as a Power', months: -1,
        effects: { diploSeats: 1, deterrent: 1 },
      });
    },
  },
  {
    id: 'mli_civil_the_bonds', name: 'The Bonds of the Crown',
    icon: 'scroll', civil: 'region', col: 1, row: 6, requires: ['mli_civil_among_the_powers'],
    desc: 'Standing is what the chanceries think; bonds are what they have signed. Hold '
      + 'two alliances, or two crowns owing this one fealty — the difference between a '
      + 'kingdom the powers respect and a kingdom the powers are arranged around.',
    rewardText: '+30 influence points and "The Web of the Kingdom": +8% trade and '
      + '+0.2 legitimacy a month, permanent.',
    check: (ctx) => alliesOf(ctx, 'MLI') >= 2 || clientsOf(ctx, 'MLI') >= 2,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { infl: 30 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_web_of_the_kingdom', name: 'The Web of the Kingdom', months: -1,
        effects: { tradeMult: 1.08, legitimacyAdd: 0.2 },
      });
    },
  },
  {
    id: 'mli_civil_the_whole_court', name: 'The Whole Court Standing',
    icon: 'speaker', civil: 'court', col: 2, row: 5,
    desc: 'Whatever the estates are called in the century you were crowned in — the pious '
      + 'and the Hellenizers, the captains and the sages, the Exilarch\'s men and the '
      + 'priests — a united monarchy is the claim that they are one people\'s parties and '
      + 'not two peoples\' armies. Bring every estate in the room to 60 approval at once.',
    rewardText: '+25 legitimacy and "The Court United": −0.75 unrest everywhere and '
      + '+0.25 legitimacy a month, permanent.',
    check: (ctx) => courtFloor(ctx, 'MLI', 60),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { legitimacy: 25 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_court_united', name: 'The Court United', months: -1,
        effects: { unrestAll: -0.75, legitimacyAdd: 0.25 },
      });
    },
  },
  {
    id: 'mli_civil_favor_banked', name: 'The Crown Owes Nobody',
    icon: 'coins', civil: 'court', col: 2, row: 6, requires: ['mli_civil_the_whole_court'],
    desc: 'Approval is a mood and it turns with the season. Favor is credit — what an '
      + 'estate will actually do when the crown asks, having been given no reason to '
      + 'refuse. Bank forty with every estate at once, and the kingdom can spend a court '
      + 'session on something other than keeping the court.',
    rewardText: '+40 governance points and "The Crown\'s Credit": +10% manpower and '
      + '+8% income, permanent.',
    check: (ctx) => favorFloor(ctx, 'MLI', 40),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { gov: 40 });
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
    desc: 'Finish the throne that decreed the persecution: the Seleucid kingdom dead, '
      + 'bent to us as a client, or a rump of three — with Jerusalem in our hands. Then '
      + 'the contracts may be dated by our own years and not by theirs.',
    rewardText: '+20 legitimacy and "The Yoke Taken Away": −0.5 unrest everywhere and '
      + '+0.2 public belief a month, permanent.',
    check: (ctx) => broken(ctx, 'SEL') && holds(ctx, 'MLI', 'Jerusalem'),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { legitimacy: 20 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'yoke_taken_away', name: 'The Yoke Taken Away', months: -1,
        effects: { unrestAll: -0.5, legitimacyAdd: 0.2 },
      });
    },
  },
  {
    id: 'mli_167_isles', name: 'An Entrance to the Isles of the Sea',
    icon: 'ship', col: 2, row: 2, chapters: ['167bce'], requires: ['mli_167_yoke'],
    desc: 'Take the harbours — Joppa, Azotus and Gaza. A hill kingdom that has to buy '
      + 'its iron through somebody else\'s customs house is a hill kingdom on sufferance.',
    rewardText: '+150 talents and "The Harbours of the Kingdom": +12% trade, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Joppa', 'Azotus', 'Gaza']),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { treasury: 150 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'harbours_of_the_kingdom', name: 'The Harbours of the Kingdom', months: -1,
        effects: { tradeMult: 1.12 },
      });
    },
  },
  {
    id: 'mli_167_bronze', name: 'The Tablets of Bronze',
    icon: 'scroll', col: 3, row: 2, chapters: ['167bce'], requires: ['mli_167_yoke'],
    desc: 'Keep the Republic on our side of the ledger: at peace with Rome, and its '
      + 'Senate thinking well of us — opinion +40. Judas sent an embassy to it in 161, '
      + 'and the answer came back cut into bronze and hung up in Jerusalem.',
    rewardText: '+40 influence points and "The Friendship of the Republic": +10% income '
      + 'for 120 months.',
    check: (ctx) => {
      const rom = ctx.game.tags.ROM;
      if (!rom || rom.alive === false) return false;
      return atPeaceBetween(ctx, 'MLI', 'ROM') && opinionOf(ctx, 'ROM', 'MLI') >= 40;
    },
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { infl: 40 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'friendship_of_the_republic', name: 'The Friendship of the Republic',
        months: 120, effects: { incomeMult: 1.1 },
      });
    },
  },
  {
    // The rising's own three end where 1 Maccabees ends. What the state
    // BECAME — the thing Pompey rode into in 63 — is the century after the
    // book: a kingdom with a chancery, a coast, a mint and a treaty file.
    id: 'mli_167_hills', name: 'Gerizim and the Sons of Esau',
    icon: 'mountain', col: 2, row: 3, chapters: ['167bce'], requires: ['mli_167_isles'],
    desc: 'The Akra starved through the winter of 141 and came out under terms, and '
      + 'Josephus has Simon levelling the hill it stood on so that nothing in the city '
      + 'would ever look down into the Temple court again. That freed a field army for '
      + 'the first time in three generations, and John Hyrcanus spent it outward: Hebron '
      + 'and Adora in the south, Samaria and Shechem in the north, and the rival house on '
      + 'Gerizim pulled down after two hundred years of it. Hold all five — Hebron, Adora, '
      + 'Samaria, Shechem and Scythopolis.',
    rewardText: '+4,000 manpower and "The Hill Country Brought In": +12% manpower and '
      + '+15% conversion, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI',
      ['Hebron', 'Adora', 'Sebaste', 'Neapolis', 'Scythopolis']),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { manpower: 4000 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'mli167_hill_country_brought_in', name: 'The Hill Country Brought In', months: -1,
        effects: { manpowerMult: 1.12, convertMult: 1.15 },
      });
    },
    },
  {
    id: 'mli_167_coast', name: 'The Ladder of Tyre to the River of Egypt',
    icon: 'shipyard', col: 2, row: 4, chapters: ['167bce'], requires: ['mli_167_hills'],
    desc: 'Josephus lists the cities Alexander Jannaeus died holding, and the list is the '
    + 'whole seaboard: Ptolemais, Dora, Straton\'s Tower, Joppa, Azotus, Gaza, and on '
    + 'south to Rhinocorura. Ascalon alone was never taken — it bought its freedom and '
    + 'kept it two hundred years, and the list simply goes around it. Take the coast '
    + 'entire, Ascalon with it, and keep 300 talents by for the yards: a kingdom with '
    + 'harbours and no ships in them is still renting the sea from whoever has them.',
    rewardText: 'The yards at Joppa are laid down: −150 talents, six ships commissioned '
    + 'there, and "The Ships of Joppa": +20% fleet strength, +10% trade and +5% income, '
    + 'permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI',
    ['Ptolemais', 'Dora', 'Caesarea Maritima', 'Joppa', 'Azotus', 'Ascalon', 'Gaza'])
    && treasuryOf(ctx, 'MLI') >= 300,
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
    desc: 'The bronze hung up in the Temple court was one letter and thirty years old. '
    + 'Simon sent Numenius back to Rome with a gold shield of a thousand mina; the '
    + 'Senate renewed the amity and wrote round the whole east about it — to Ptolemy, '
    + 'to Demetrius, to Arsaces, to Sparta and Delos and Rhodes and Gortyna and Cyrene '
    + '— that these are our friends and no king is to make war on them. Keep the file '
    + 'live: at peace with Rome with its Senate at +60, the kinsmen at Sparta standing '
    + 'with us at 70, and one of the islands of the consul\'s circular — Rhodes or '
    + 'Gortyn — at 55.',
    rewardText: '+50 influence points and "No King Shall Make War On Them": +1 deterrence '
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
    ctx.helpers.adjust(ctx, 'MLI', { infl: 50 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli167_no_king_shall_make_war', name: 'No King Shall Make War On Them',
      months: -1, effects: { deterrent: 1, tradeMult: 1.08 },
    });
    },
  },
  {
    id: 'mli_167_stamp', name: 'Leave to Coin Money With Thine Own Stamp',
    icon: 'coins', col: 3, row: 4, chapters: ['167bce'], requires: ['mli_167_kinsmen'],
    desc: 'Antiochus VII wrote it to Simon in 138, in the season he needed Judaean troops: '
    + '"I give thee leave also to coin money for thy country with thine own stamp." He '
    + 'withdrew it inside the year and sent Cendebeus down the coast with an army '
    + 'instead. The dies were cut anyway, two reigns later, and the legend struck on '
    + 'them names no king at all — Yehohanan the High Priest and the Council of the '
    + 'Jews. Strike: nobody\'s client, 500 talents of silver in hand, and all three of '
    + 'the age\'s ladders three rungs past where this chapter opened, which is what a '
    + 'mint actually costs — dies, a chancery to weigh the flans, and no one left who '
    + 'can tell you no.',
    rewardText: '+30 influence points and "The Council\'s Own Silver": +12% income, '
    + '+8% trade and +0.2 public belief a month, permanent.',
    check: (ctx) => independent(ctx, 'MLI') && treasuryOf(ctx, 'MLI') >= 500
    && techAbove(ctx, 'MLI', 3),
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { infl: 30 });
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
    desc: 'Hold Scythopolis, Pella, Gadara, Gerasa and Philadelphia — the Greek cities of '
      + 'the Jordan that Pompey\'s settlement tore out of this state and filed under the '
      + 'province of Syria.',
    rewardText: '+120 talents and "The Cities Kept": +10% trade and +5% income, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI',
      ['Scythopolis', 'Pella', 'Gadara', 'Gerasa', 'Philadelphia']),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { treasury: 120 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_cities_kept', name: 'The Cities Kept', months: -1,
        effects: { tradeMult: 1.1, incomeMult: 1.05 },
      });
    },
  },
  {
    id: 'mli_67_academies', name: 'Babylonia Answers',
    icon: 'lamp', col: 2, row: 2, chapters: ['67bce'], requires: ['mli_67_cities'],
    desc: 'Win Babylonia: the Jews of Babylon standing with us at 70, or the city itself '
      + 'under the crown. There are more Jews beyond the Euphrates than in Judaea, and '
      + 'every one of them lives inside somebody else\'s empire.',
    rewardText: '+3,000 manpower and +40 influence points.',
    check: (ctx) => standingAt(ctx, 'Babylon') >= 70 || holds(ctx, 'MLI', 'Babylon'),
    reward: (ctx) => ctx.helpers.adjust(ctx, 'MLI', { manpower: 3000, infl: 40 }),
  },
  {
    id: 'mli_67_petra', name: 'Petra Under the Crown',
    icon: 'market', col: 3, row: 2, chapters: ['67bce'], requires: ['mli_67_cities'],
    desc: 'Bring the desert king to heel: Petra and Bostra under the crown, or Nabataea '
      + 'owing us fealty. Aretas was paid in the twelve cities of Moab to march for a '
      + 'Hasmonean; a kingdom does not buy its allies with its own provinces.',
    rewardText: '+150 talents and "The Incense Road": +12% trade, permanent.',
    check: (ctx) => {
      const nab = ctx.game.tags.NAB;
      if (nab && nab.overlord === 'MLI') return true;
      return holdsAll(ctx, 'MLI', ['Petra', 'Bostra']);
    },
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { treasury: 150 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_incense_road', name: 'The Incense Road', months: -1, effects: { tradeMult: 1.12 },
      });
    },
  },
  {
    id: 'mli_67_half_shekel', name: 'The Road the Half-Shekel Takes',
    icon: 'shrine', col: 2, row: 3, chapters: ['67bce'], requires: ['mli_67_academies'],
    desc: 'Babylonia answering is a sentiment; the half-shekel arriving is a road. The '
      + 'communities beyond the Euphrates bank the offering at Nehardea and at Nisibis — '
      + 'behind walls they garrison themselves — and send it up once a year with tens of '
      + 'thousands of men walking around it, because everyone on that road knows what the '
      + 'caravan is carrying. Stand at 75 with the academy at Nehardea and at 65 with '
      + 'Nisibis, hold Jerusalem, and keep a House standing at the end of the road for the '
      + 'money to arrive at.',
    rewardText: '+150 talents and "The Road of the Half-Shekel": +15% from the ascents and '
      + '+8% income, permanent.',
    check: (ctx) => standingAt(ctx, 'Nehardea') >= 75 && standingAt(ctx, 'Nisibis') >= 65
      && holds(ctx, 'MLI', 'Jerusalem') && templeStands(ctx),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { treasury: 150 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'mli67_half_shekel_road', name: 'The Road of the Half-Shekel', months: -1,
        effects: { pilgrimMult: 1.15, incomeMult: 1.08 },
      });
    },
    },
  {
    id: 'mli_67_idumea', name: 'Antipater\'s Country',
    icon: 'note', col: 2, row: 4, chapters: ['67bce'], requires: ['mli_67_half_shekel'],
    desc: 'Jannaeus made an Idumean the governor of Idumea, and the governor\'s son made '
    + 'himself the government: Antipater has the levies of Hebron and Adora, the customs '
    + 'road down to Gaza, an Arab royal wife, and two sons he is already placing in '
    + 'offices. The elder brother will rule through that house for twenty years and end '
    + 'as the ornament on it. Rule over it instead — his country and its outlet held, 350 '
    + 'talents of the receipts banked in the crown\'s own ledger, and Government 7, The '
    + 'Royal Chancery, so that the men collecting in Idumea answer to a king and not to a '
    + 'fixer.',
    rewardText: '+40 governance points and "The Crown\'s Own Officers": +8% income and '
    + '+8% manpower, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Hebron', 'Adora', 'Gaza'])
    && treasuryOf(ctx, 'MLI') >= 350
    && ((((ctx.game.tags.MLI || {}).tech) || {}).gov | 0) >= 7,
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { gov: 40 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli67_crowns_own_officers', name: "The Crown's Own Officers", months: -1,
      effects: { incomeMult: 1.08, manpowerMult: 1.08 },
    });
    },
  },
  {
    id: 'mli_67_euphrates', name: 'The Road to the Euphrates',
    icon: 'horseshoe', col: 3, row: 3, chapters: ['67bce'], requires: ['mli_67_petra'],
    desc: 'Petra is a stage and not a destination. The incense goes north from it to Bostra '
    + 'and Damascus, which Aretas took off the Seleucids in 85 and holds '
    + 'still, and east from Damascus across the steppe to Palmyra — and past Palmyra the '
    + 'road is the King of Kings\'. Hold both cities, and keep Phraates at peace with this '
    + 'crown and thinking well of it, regard +60. Asked to accept the Euphrates as the '
    + 'boundary, Pompey answered that the boundary would be justice; the road east is the '
    + 'one thing his settlement cannot close.',
    rewardText: '+40 influence points and "The Road to the River": +12% trade and +5% '
    + 'income, permanent.',
    check: (ctx) => {
    const par = ctx.game.tags.PAR;
    if (!par || par.alive === false) return false;
    return holdsAll(ctx, 'MLI', ['Damascus', 'Palmyra'])
      && atPeaceBetween(ctx, 'MLI', 'PAR') && opinionOf(ctx, 'PAR', 'MLI') >= 60;
    },
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { infl: 40 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli67_road_to_the_river', name: 'The Road to the River', months: -1,
      effects: { tradeMult: 1.12, incomeMult: 1.05 },
    });
    },
  },
  {
    id: 'mli_67_crassus', name: 'What Crassus Came For',
    icon: 'altar', col: 3, row: 4, chapters: ['67bce'], requires: ['mli_67_euphrates'],
    desc: 'In 54 the proconsul of Syria stopped in Jerusalem on his way to the river and '
    + 'took the two thousand talents Pompey had left in the treasury, and then the '
    + 'Temple\'s gold as well: Eleazar the priest bought the rest off with a beam of solid '
    + 'gold and a sworn oath, and Crassus swore, and took everything. The next summer he '
    + 'was dead at Carrhae and the eagles were in Parthian hands. Hold Jerusalem with the '
    + 'House standing and 600 talents banked that no proconsul has a claim on, and settle '
    + 'the Roman question either way — Rome finished as a power in this country, or at '
    + 'peace with us and its regard at +80, with this crown wearing no collar.',
    rewardText: '+200 talents and "The Treasury Nobody Emptied": +10% income and +0.2 '
    + 'public belief a month, permanent.',
    check: (ctx) => {
    if (!holds(ctx, 'MLI', 'Jerusalem') || !templeStands(ctx)) return false;
    if (treasuryOf(ctx, 'MLI') < 600) return false;
    if (broken(ctx, 'ROM')) return true;
    return independent(ctx, 'MLI') && atPeaceBetween(ctx, 'MLI', 'ROM')
      && opinionOf(ctx, 'ROM', 'MLI') >= 80;
    },
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { treasury: 200 });
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
    desc: 'Hold Jericho and Engaddi — the balsam and the bitumen. Cleopatra took them out '
      + 'of this country\'s revenue by asking Antony for them; a kingdom does not rent its '
      + 'own groves back.',
    rewardText: '+120 talents and "The Balsam Kept": +10% income and +8% trade, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Jericho', 'Engaddi']),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { treasury: 120 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_balsam_kept', name: 'The Balsam Kept', months: -1,
        effects: { incomeMult: 1.1, tradeMult: 1.08 },
      });
    },
  },
  {
    id: 'mli_40_harbour', name: 'A Harbour Where the Tower Stands',
    icon: 'shipyard', col: 2, row: 2, chapters: ['40bce'], requires: ['mli_40_balsam'],
    desc: 'Hold Straton\'s Tower and Dora with 400 talents banked, and build the harbour '
      + 'this coast has never had: moles sunk in open water, a road up to Jerusalem, and '
      + 'a customs house that answers to the crown.',
    rewardText: 'The harbour is built: −250 talents; "The King\'s Harbour": +15% trade and '
      + '+8% income, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Caesarea Maritima', 'Dora'])
      && treasuryOf(ctx, 'MLI') >= 400,
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
    desc: 'Keep the eastern door open at both ends: Parthia bound to us in writing — '
      + 'allied, or owing us fealty — and the Jews of the Twin Cities, at the King of '
      + 'Kings\' own palace gate, standing with us at 70. Every Judaean court that loses '
      + 'Rome goes looking east; the ones that arrived with something to offer were heard.',
    rewardText: '+3,000 manpower and +30 martial points.',
    check: (ctx) => {
      const par = ctx.game.tags.PAR;
      if (!par || par.alive === false) return false;
      if (par.overlord !== 'MLI' && !allied(ctx, 'MLI', 'PAR')) return false;
      return standingAt(ctx, 'Seleucia-Ctesiphon') >= 70;
    },
    reward: (ctx) => ctx.helpers.adjust(ctx, 'MLI', { manpower: 3000, mar: 30 }),
  },
  {
    id: 'mli_40_the_kings_cities', name: 'The Cities the Crown Built',
    icon: 'walls', col: 2, row: 3, chapters: ['40bce'], requires: ['mli_40_harbour'],
    desc: 'Hold Sebaste, Masada and Machaerus with three hundred and twenty points of '
      + 'development under the crown. Herod walled Samaria, settled six thousand men in it, '
      + 'renamed it for Augustus in Greek and put a temple to Rome and the emperor on its '
      + 'acropolis; he hung two palaces off the northern spur of the rock above the Salt Sea '
      + 'on terraces over a thousand feet of nothing, with cisterns and grain enough for '
      + 'years of siege; and the one work he signed with his own name was an artificial '
      + 'mountain in the desert behind Bethlehem, which he had himself carried up to be '
      + 'buried in. The yards were real. The names on them were somebody else\'s. Build the '
      + 'same country and sign it yourself.',
    rewardText: '+40 governance points and "The Builder\'s Yards": +12% development growth '
      + 'and +8% income, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Sebaste', 'Masada', 'Machaerus'])
      && devOf(ctx, 'MLI') >= 320,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { gov: 40 });
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
    desc: 'Hold Jerusalem with the House standing and six hundred talents banked, and double '
    + 'the platform under it — a thousand priests taught the mason\'s trade so that no '
    + 'unconsecrated hand touched the sanctuary, a stoa of a hundred and sixty columns '
    + 'along the southern side, and a precinct larger than any sacred enclosure in the '
    + 'Roman world, white enough from the Mount of Olives that Josephus reached for a '
    + 'mountain of snow to describe it. Herod\'s version carried a golden eagle over the '
    + 'gate and a daily sacrifice for Caesar inside it, and men were burned alive for '
    + 'pulling the eagle down while he lay dying. Raise the same courts with nothing over '
    + 'the gate.',
    rewardText: 'The platform is doubled: −350 talents; +25 legitimacy and "The Great '
    + 'Enclosure": +20% from the ascents and +0.25 public belief a month, permanent.',
    check: (ctx) => holds(ctx, 'MLI', 'Jerusalem') && templeStands(ctx)
    && treasuryOf(ctx, 'MLI') >= 600,
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { treasury: -350, legitimacy: 25 });
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
    + 'well of us at +50, and among the world\'s first six courts by the standing the realm '
    + 'panel keeps. On the second of September in 31 the man who had made Herod a king lost '
    + 'his fleet at Actium — and Herod, who had spent the decade renting his own balsam back '
    + 'from that man\'s queen, sailed to Rhodes, walked in to the winner without his diadem, '
    + 'and asked to be judged on what kind of friend he was rather than on whose. He came '
    + 'home with the diadem and more country than Antony had ever given him. A crown that is '
    + 'nobody\'s client has no diadem to lay on the table and nobody to hand it back; it '
    + 'survives the fall of a great power by being expensive to remove.',
    rewardText: '+40 influence points, +150 talents and "The Crown Worth Keeping": '
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
    ctx.helpers.adjust(ctx, 'MLI', { infl: 40, treasury: 150 });
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
    + 'cities outright, which settles the question by abolishing it — with five hundred '
    + 'talents to spend outside the kingdom. The Ionian cities spent two centuries trying to '
    + 'have their Jews\' privileges unsaid — the Sabbath, the courts, the money sent up to '
    + 'Jerusalem — and in 14 Agrippa heard the case at Ephesus with Nicolaus of Damascus '
    + 'arguing it and Herod sitting beside him, and found for the communities. The same king '
    + 'endowed the games of Zeus at Olympia in perpetuity and was made their president for '
    + 'the money. Both were bought with one Roman\'s friendship, and neither outlived it. Be '
    + 'owed the verdict instead of lent it, and buy the standing in a currency the Mount can '
    + 'be told about.',
    rewardText: 'The endowments are paid: −200 talents; +50 influence points and "The Patron '
    + 'of the Nations": +10% from the ascents and +8% trade, permanent.',
    check: (ctx) => (standingAt(ctx, 'Roma') >= 70 || holds(ctx, 'MLI', 'Roma'))
    && (standingAt(ctx, 'Smyrna') >= 70 || holds(ctx, 'MLI', 'Smyrna'))
    && treasuryOf(ctx, 'MLI') >= 500,
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { treasury: -200, infl: 50 });
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
    desc: 'Take the seaboard the procurators held: Caesarea Maritima, Ptolemais, Joppa '
      + 'and Ascalon. The war started in the first of them, over a street.',
    rewardText: '+150 talents and "The Ports Are Ours": +12% trade, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Caesarea Maritima', 'Ptolemais', 'Joppa', 'Ascalon']),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { treasury: 150 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_ports_are_ours', name: 'The Ports Are Ours', months: -1,
        effects: { tradeMult: 1.12 },
      });
    },
  },
  {
    id: 'mli_66_unburned', name: 'The House Unburned',
    icon: 'temple', col: 2, row: 2, chapters: ['66ce'], requires: ['mli_66_coast'],
    desc: 'Hold Jerusalem with the Temple still standing — no fire on the Mount — and '
      + '400 talents to endow it. Josephus wrote the ash; this crown does not have to.',
    rewardText: '+25 legitimacy and "The House Endowed": +0.25 public belief a month and '
      + '−0.5 unrest everywhere, permanent.',
    check: (ctx) => holds(ctx, 'MLI', 'Jerusalem') && templeStands(ctx)
      && treasuryOf(ctx, 'MLI') >= 400,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { legitimacy: 25 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_house_endowed', name: 'The House Endowed', months: -1,
        effects: { legitimacyAdd: 0.25, unrestAll: -0.5 },
      });
    },
  },
  {
    id: 'mli_66_herodian', name: "The Last Herodian's Country",
    icon: 'flag', col: 3, row: 2, chapters: ['66ce'], requires: ['mli_66_coast'],
    desc: 'Take in the tetrarchy — Caesarea Philippi, Batanea and Tiberias — with '
      + 'Agrippa\'s house finished as a power: dead, our client, or a rump of three. '
      + 'The last Herodian spent the whole war on the other side of it.',
    rewardText: '+2,500 manpower and +30 governance points.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Caesarea Philippi', 'Batanea', 'Tiberias'])
      && broken(ctx, 'AGR'),
    reward: (ctx) => ctx.helpers.adjust(ctx, 'MLI', { manpower: 2500, gov: 30 }),
  },
  {
    id: 'mli_66_one_house', name: 'The Knife and the Chamber',
    icon: 'split', col: 2, row: 3, chapters: ['66ce'], requires: ['mli_66_unburned'],
    desc: 'The revolt ate three governments of its own before Titus reached the wall. '
      + 'Menahem came up from Masada in royal robes and was killed in the Ophel by the '
      + 'Temple captain\'s men; Ananus the high priest, who opened this chapter, was cut '
      + 'down in his own city by Zealots who let the Idumeans in under cover of a storm; '
      + 'and in the last winter three factions held three quarters and burned each '
      + 'other\'s granaries. Hold Jerusalem with the House standing and the desert rocks '
      + 'the knife-men kept for themselves — Masada, Machaerus, Engaddi — with thirty-five '
      + 'thousand men on the crown\'s own rolls and the realm steady at stability +3.',
    rewardText: '+25 legitimacy and "One Government in the House": −0.75 unrest everywhere '
      + 'and +8% manpower, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Jerusalem', 'Masada', 'Machaerus', 'Engaddi'])
      && templeStands(ctx) && stabilityOf(ctx, 'MLI') >= 3
      && menOf(ctx, 'MLI') >= 35000,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { legitimacy: 25 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'mli66_one_government', name: 'One Government in the House', months: -1,
        effects: { unrestAll: -0.75, manpowerMult: 1.08 },
      });
    },
    },
  {
    id: 'mli_66_half_shekel', name: 'The Half-Shekel of Every Province',
    icon: 'coins', col: 2, row: 4, chapters: ['66ce'], requires: ['mli_66_one_house'],
    desc: 'Half a shekel a year from every adult man who counts himself of Israel, to a '
    + 'building most of them will never see. Cicero prosecuted Flaccus for seizing the '
    + 'year\'s consignment in Asia; the largest chest of all came from Babylonia, which '
    + 'is in another empire, under an escort a Parthian king was pleased to grant. Keep '
    + 'the House standing in Jerusalem and the three great communities writing to it — '
    + 'Alexandria, Antioch and Babylon at 65 standing, or under the crown outright. When '
    + 'the House burned, Vespasian did not abolish the levy: he redirected it to Jupiter '
    + 'Capitolinus, which is the empire conceding in writing what it was worth.',
    rewardText: '+250 talents and "The Levy of the Nation": +15% income and +10% trade, '
    + 'permanent.',
    check: (ctx) => {
    if (!templeStands(ctx) || !holds(ctx, 'MLI', 'Jerusalem')) return false;
    return ['Alexandria', 'Antioch', 'Babylon'].every(
      (n) => standingAt(ctx, n) >= 65 || holds(ctx, 'MLI', n));
    },
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { treasury: 250 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli66_levy_of_the_nation', name: 'The Levy of the Nation', months: -1,
      effects: { incomeMult: 1.15, tradeMult: 1.1 },
    });
    },
  },
  {
    id: 'mli_66_eagle', name: 'The Eagle of the Twelfth',
    icon: 'swords', col: 3, row: 3, chapters: ['66ce'], requires: ['mli_66_herodian'],
    desc: 'A consular governor came down the Beth Horon road in November with the Twelfth '
    + 'Fulminata and two thousand picked men from each of the other eastern legions, and '
    + 'went back up it without his baggage, his engines or his eagle. Beating a consular '
    + 'army does not mean Rome is beaten; it means the next man who wants this country '
    + 'has to be voted four legions and a year to want it in. Make that arithmetic '
    + 'permanent — the ascent and the plain it falls to, Emmaus, Lydda and Antipatris, '
    + 'with the war-craft of the age three rungs past this chapter\'s baseline, and Rome '
    + 'either finished or no longer filing us under rebellion: at peace, and thinking no '
    + 'worse of us than nothing. Vologases offered Vespasian forty thousand horse in this '
    + 'same war. There is no second empire coming.',
    rewardText: '+40 martial points and "The Ascent of Beth Horon": +1 deterrence and '
    + '+8% morale, permanent.',
    check: (ctx) => {
    if (!holdsAll(ctx, 'MLI', ['Emmaus', 'Lydda', 'Antipatris'])) return false;
    if (!marAbove(ctx, 'MLI', 3)) return false;
    if (broken(ctx, 'ROM')) return true;
    return atPeaceBetween(ctx, 'MLI', 'ROM') && opinionOf(ctx, 'ROM', 'MLI') >= 0;
    },
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { mar: 40 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli66_ascent_of_beth_horon', name: 'The Ascent of Beth Horon', months: -1,
      effects: { deterrent: 1, moraleMult: 1.08 },
    });
    },
  },
  {
    id: 'mli_66_grain', name: 'What Rome Eats',
    icon: 'granary', col: 3, row: 4, chapters: ['66ce'], requires: ['mli_66_eagle'],
    desc: 'On the first of July in 69 the legions of Egypt swore to Vespasian, and he did '
    + 'not march on Rome — he went to Alexandria and sat on the grain, because the city '
    + 'that must be fed is the city that acclaims. The prefect who administered that oath '
    + 'was Tiberius Julius Alexander, an Alexandrian Jew and Philo\'s nephew, who three '
    + 'years before had turned two legions loose in the Delta quarter of his own people. '
    + 'Take the granary and its eastern gate, Alexandria and Pelusium, with the quarter '
    + 'itself standing with us at 70: holding the port is not the same thing as being '
    + 'trusted by the largest Jewish community in the world, and a crown that confuses '
    + 'the two has protected nobody.',
    rewardText: '+300 talents and "The Alexandrian Sailing": +15% trade, +8% income and '
    + '+10% fleet strength, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Alexandria', 'Pelusium'])
    && standingAt(ctx, 'Alexandria') >= 70,
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { treasury: 300 });
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
    desc: 'Not one Roman garrison between the sea and the Jordan: Jerusalem, Caesarea '
      + 'Maritima, Sebaste, Emmaus and Lydda, all of them under the crown.',
    rewardText: '+25 legitimacy and +40 governance points.',
    check: (ctx) => holdsAll(ctx, 'MLI',
      ['Jerusalem', 'Caesarea Maritima', 'Sebaste', 'Emmaus', 'Lydda']),
    reward: (ctx) => ctx.helpers.adjust(ctx, 'MLI', { legitimacy: 25, gov: 40 }),
  },
  {
    // SPEC §32: the Mount this chapter starts bare can bear a House again —
    // and it must stay reachable after the proclamation, or taking the greater
    // crown would quietly cost a player the capstone of the chapter.
    id: 'mli_132_third_house', name: 'Raise the Third House',
    icon: 'shrine', col: 2, row: 2, chapters: ['132ce'], requires: ['mli_132_colony'],
    desc: 'Hold Jerusalem with 500 talents in the treasury and the realm steady '
      + '(stability +1), and put back what Titus took — the House the Redemption coinage '
      + 'has been promising on every struck shekel.',
    rewardText: 'The Third Temple rises: −300 talents; +20 legitimacy, +25 governance '
      + 'points, and the Temple\'s yield (+1 governance point, +0.2 legitimacy a month) '
      + 'returns to Jerusalem\'s keeper. A House already standing is endowed instead, and '
      + 'the silver stays banked.',
    check: (ctx) => holds(ctx, 'MLI', 'Jerusalem') && treasuryOf(ctx, 'MLI') >= 500
      && stabilityOf(ctx, 'MLI') >= 1,
    reward: (ctx) => raiseTheThirdHouse(ctx),
  },
  {
    id: 'mli_132_east', name: 'Rome Looks East',
    icon: 'horseshoe', col: 3, row: 2, chapters: ['132ce'], requires: ['mli_132_colony'],
    desc: 'Make the empire fight two wars: Parthia in the field against Rome, or an '
      + 'alliance signed with the King of Kings. Trajan stood on the Gulf in 116, and '
      + 'Vologases has not forgotten what the road home cost him.',
    rewardText: '+2,500 manpower and "Rome Looks East": +8% morale for 60 months.',
    check: (ctx) => atWarBetween(ctx, 'PAR', 'ROM') || allied(ctx, 'MLI', 'PAR'),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { manpower: 2500 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'rome_looks_east', name: 'Rome Looks East', months: 60, effects: { moraleMult: 1.08 },
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
    desc: 'The rising\'s silver was struck with two names. One face reads Shimon, Prince of '
      + 'Israel; the other reads Eleazar the Priest, and nobody has ever settled who he was '
      + '— Akiva\'s colleague, the Nasi\'s uncle, a name the mint quietly drops in the third '
      + 'year. The Hasmoneans put the crown and the mitre on one head and the sages never '
      + 'stopped saying so; this coinage kept them apart. A House on the Mount is a payroll '
      + 'and twenty-four courses of priests before it is a symbol. Hold Jerusalem with the '
      + 'Temple standing, twenty-six provinces keeping the Law to tithe to it, and the realm '
      + 'steady at +2.',
    rewardText: '+25 legitimacy, +30 governance points and "The Two Names on the Silver": '
      + '+15% pilgrimage and +0.2 public belief a month, permanent.',
    check: (ctx) => templeStands(ctx) && holds(ctx, 'MLI', 'Jerusalem')
      && ownedCount(ctx, 'MLI', 'judaism') >= 26 && stabilityOf(ctx, 'MLI') >= 2,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { legitimacy: 25, gov: 30 });
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
    desc: 'The caves above the Dead Sea gave back the state\'s own paper: crown land at Ein '
      + 'Gedi let to tenants who pay their rent in wheat, the parcels measured, the witnesses '
      + 'named, every deed drawn in the name of Shimon bar Kosiba, Nasi Israel, and dated by '
      + 'the year of the redemption of Israel. Beside the leases lie the requisition orders, '
      + 'and a letter telling the parnasim of Ein Gedi in the prince\'s own hand that they sit '
      + 'comfortably eating the property of the house of Israel while their brothers hold the '
      + 'line. A prince can requisition; only a kingdom can survey. Carry all three of the '
      + 'age\'s ladders three rungs past the baseline it began with — the Redemption Mint, the '
      + 'Diaspora\'s Watch, the Fortified Villages — with 340 points of development on the '
      + 'books.',
    rewardText: '+40 governance points and "Dated by the Redemption": administration costs '
      + '−12%, +10% income and +8% development growth, permanent.',
    check: (ctx) => techAbove(ctx, 'MLI', 3) && devOf(ctx, 'MLI') >= 340,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { gov: 40 });
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
    desc: 'Hadrian\'s law never named the Jews: it extended the castrator\'s penalty to the '
      + 'knife and left the rest to governors. Sextus Julius Severus was fetched from Britain '
      + 'to put down the consequence and would not give battle — he cut the hill country into '
      + 'pieces, took Dio\'s fifty fortresses one at a time and starved the villages between '
      + 'them, and the emperor\'s dispatch to the Senate dropped the customary line about '
      + 'himself and the legions being in health. Twenty years on Antoninus issued the repeal, '
      + 'whose second clause made circumcising a convert a capital offence: the licence and '
      + 'the shut door in one rescript. Stand independent and at peace with the empire, with '
      + 'its court\'s regard at +60, and take the first clause without the second.',
    rewardText: '+40 influence points and "The Door Left Open": +15% conversion and −0.5 '
      + 'unrest everywhere, permanent.',
    check: (ctx) => {
      const rom = ctx.game.tags.ROM;
      if (!rom || rom.alive === false) return false;
      return independent(ctx, 'MLI') && atPeaceBetween(ctx, 'MLI', 'ROM')
        && opinionOf(ctx, 'ROM', 'MLI') >= 60;
    },
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { infl: 40 });
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
    desc: 'Fifteen years before the Nasi wrote his first letter, the Jews of Egypt, Cyrenaica '
      + 'and Cyprus rose against Trajan\'s rear and were destroyed for it. Alexandria — once '
      + 'perhaps a third of a city of half a million, the largest community in the world — is '
      + 'seven per cent of it afterwards; Cyrenaica is country the surveyors write up as '
      + 'needing resettlement; Cyprus is closed to Jews by law. Half the dispersion cannot be '
      + 'written to, because it is not there. What is left is older and lies east and north: '
      + 'Nehardea and Babylon on the Euphrates, Nisibis in the hands of the house whose kings '
      + 'took the covenant, Antioch under the legate of Syria\'s own window. Bring all four to '
      + '70 standing or under the crown, and send the letters the rising never sent.',
    rewardText: '+5,000 manpower, +40 influence points and "The Letters East": +10% trade and '
      + '+1 diplomatic seat, permanent.',
    check: (ctx) => ['Nehardea', 'Babylon', 'Nisibis', 'Antioch']
      .every((n) => standingAt(ctx, n) >= 70 || holds(ctx, 'MLI', n)),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { manpower: 5000, infl: 40 });
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
    desc: 'Hold Jerusalem with 500 talents and a steady realm (stability +1), and raise '
    + 'the House again five centuries after Titus — on a platform that has been swept '
    + 'and empty since the day the city was taken.',
    rewardText: 'The Third Temple rises: −300 talents; +20 legitimacy, +25 governance '
    + 'points, and the Temple\'s yield (+1 governance point, +0.2 legitimacy a month) '
    + 'returns to Jerusalem\'s keeper. A House already standing is endowed instead, and '
    + 'the silver stays banked.',
    check: (ctx) => holds(ctx, 'MLI', 'Jerusalem') && treasuryOf(ctx, 'MLI') >= 500
    && stabilityOf(ctx, 'MLI') >= 1,
    reward: (ctx) => raiseTheThirdHouse(ctx),
  },
  {
    id: 'mli_614_exilarch', name: 'The Exilarch Comes Home',
    icon: 'star4', col: 2, row: 2, chapters: ['614ce'], requires: ['mli_614_altar'],
    desc: 'Reach the Exilarchate: Nehardea and Babylon under the crown, or the academy at '
      + 'Nehardea standing with us at 75. Since 586 BCE the pedigree nobody disputes has '
      + 'sat in another empire; a Davidic throne in Jerusalem is a question addressed to it.',
    rewardText: '+25 legitimacy, +40 influence points and "The Two Houses Joined": '
      + '+0.2 public belief a month, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Nehardea', 'Babylon'])
      || standingAt(ctx, 'Nehardea') >= 75,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { legitimacy: 25, infl: 40 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'two_houses_joined', name: 'The Two Houses Joined', months: -1,
        effects: { legitimacyAdd: 0.2 },
      });
    },
  },
  {
    id: 'mli_614_south', name: 'The Watch on the Southern Road',
    icon: 'shield', col: 3, row: 2, chapters: ['614ce'], requires: ['mli_614_altar'],
    desc: 'Close the desert road before it opens: Aila, Petra and Bostra held, with twenty '
      + 'thousand men under the banner. Both empires are spending their last armies on each '
      + 'other, and nobody at all is watching the road up from Arabia.',
    rewardText: '+30 martial points and "The Southern Watch": +1 to hill-country defense '
      + 'and +5% discipline for 120 months.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Aila', 'Petra', 'Bostra'])
      && menOf(ctx, 'MLI') >= 20000,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { mar: 30 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'the_southern_watch', name: 'The Southern Watch', months: 120,
        effects: { hillDefBonus: 1, disciplineMult: 1.05 },
      });
    },
  },
  {
    id: 'mli_614_calendar', name: 'Who Fixes the Year',
    icon: 'flame', col: 2, row: 3, chapters: ['614ce'], requires: ['mli_614_exilarch'],
    desc: 'A court in the Land used to sanctify the new moon and light the chain of fires '
      + 'from the Mount of Olives to Beth Baltin, until the Samaritans learned to light '
      + 'false ones on the wrong night and the couriers took over; then Hillel calculated '
      + 'the year in advance, and after 425 there was no patriarch left to proclaim it at '
      + 'all. Sit in Jerusalem and Tiberias and be obeyed where obedience is the whole of '
      + 'the argument — Babylon, the Twin Cities and Nisibis keeping our reckoning at 70. '
      + 'Whoever fixes the festivals is the government of this people, wherever he sits.',
    rewardText: '+35 governance points and "The Year Fixed from Jerusalem": +0.25 public '
      + 'belief a month and +15% from the ascents, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Jerusalem', 'Tiberias'])
      && standingAt(ctx, 'Babylon') >= 70
      && standingAt(ctx, 'Seleucia-Ctesiphon') >= 70
      && standingAt(ctx, 'Nisibis') >= 70,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'MLI', { gov: 35 });
      ctx.helpers.addTagModifier(ctx, 'MLI', {
        id: 'mli_614_year_fixed', name: 'The Year Fixed from Jerusalem', months: -1,
        effects: { legitimacyAdd: 0.25, pilgrimMult: 1.15 },
      });
    },
    },
  {
    id: 'mli_614_academies', name: 'The Talmud Closed Under a Crown',
    icon: 'lamp', col: 2, row: 4, chapters: ['614ce'], requires: ['mli_614_calendar'],
    desc: 'The Galilean academies stopped editing their Talmud around the year 400 and it '
    + 'breaks off unfinished, mid-tractate, because there was no longer a patriarch or a '
    + 'purse to finish it. The other one is being given its final shape by the savoraim '
    + 'in these very decades, in houses on the Euphrates that no Jewish government has '
    + 'ever paid for. Hold Jerusalem, Tiberias and Nehardea with 450 talents banked, and '
    + 'put Sura and Pumbedita on the crown\'s roll — two Talmuds, one treasury, and the '
    + 'Land\'s own left standing rather than abandoned.',
    rewardText: 'The endowment is paid: −250 talents; +40 governance points and "The Lamps '
    + 'of the Two Rivers": administration costs −10%, +15% integration and +0.2 public '
    + 'belief a month, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Jerusalem', 'Tiberias', 'Nehardea'])
    && treasuryOf(ctx, 'MLI') >= 450,
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { treasury: -250, gov: 40 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli_614_lamps_two_rivers', name: 'The Lamps of the Two Rivers', months: -1,
      effects: { adminMult: 0.9, integrateMult: 1.15, legitimacyAdd: 0.2 },
    });
    },
  },
  {
    id: 'mli_614_cross', name: 'The Cross Does Not Come Back',
    icon: 'swords', col: 3, row: 3, chapters: ['614ce'], requires: ['mli_614_south'],
    desc: 'Heraclius sailed east in 622 with the melted plate of every church in the City, '
    + 'broke Khosrow at Nineveh in the winter of 627, and on the twenty-first of March 630 '
    + 'carried the True Cross back into Jerusalem on his own shoulders. He had stopped at '
    + 'Tiberias on the road, in Benjamin\'s own house, and sworn a safe conduct; the monks '
    + 'absolved him of the oath, and the killing and the expulsion from the city followed, '
    + 'and their churches kept a fast for the perjury for thirteen centuries. Hold '
    + 'Jerusalem with the coast a counter-offensive comes ashore on — Caesarea Maritima '
    + 'and Ptolemais — and finish the Empire as a power: dead, bent to us, or a rump of '
    + 'three. Then no oath is needed and none can be broken.',
    rewardText: '+35 martial points and "No Oath Left to Break": +1 deterrence and +8% '
    + 'morale, permanent.',
    check: (ctx) => broken(ctx, 'BYZ')
    && holdsAll(ctx, 'MLI', ['Jerusalem', 'Caesarea Maritima', 'Ptolemais']),
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { mar: 35 });
    ctx.helpers.addTagModifier(ctx, 'MLI', {
      id: 'mli_614_no_oath', name: 'No Oath Left to Break', months: -1,
      effects: { deterrent: 1, moraleMult: 1.08 },
    });
    },
  },
  {
    id: 'mli_614_hejaz', name: 'The Road Out of Arabia',
    icon: 'horseshoe', col: 3, row: 4, chapters: ['614ce'], requires: ['mli_614_cross'],
    desc: 'In the same year Heraclius marched, a merchant of Mecca went up to Yathrib, and '
    + 'within ten years of his death the armies raised in that oasis held Damascus, '
    + 'Jerusalem and Ctesiphon — the empire that actually replaced both of the ones now '
    + 'bleeding each other out. Yathrib had three Jewish tribes in 622 and none by 627; '
    + 'Khaybar was taken in 628 and its farmers kept their palms as tenants on half the '
    + 'crop until Umar cleared them off. Hold the oases before the road needs them — '
    + 'Khaybar, Yathrib, Tayma and Dumatha — with the power out of the south finished or '
    + 'never risen: dead, bent to us, or a rump of three.',
    rewardText: '+150 talents and +2,500 manpower — the oases muster; and "The Road Out of '
    + 'Arabia": +12% trade and +8% manpower, permanent.',
    check: (ctx) => holdsAll(ctx, 'MLI', ['Khaybar', 'Yathrib', 'Tayma', 'Dumatha'])
    && broken(ctx, 'RSH'),
    reward: (ctx) => {
    ctx.helpers.adjust(ctx, 'MLI', { treasury: 150, manpower: 2500 });
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
    rewardText: '+30 governance points and "The Priest-King": −0.5 unrest everywhere for 48 months.',
    check: (ctx) => (ctx.game.tags.HAS && (ctx.game.tags.HAS.legitimacy || 0) >= 70)
      && holds(ctx, 'HAS', 'Jerusalem'),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'HAS', { gov: 30 });
      ctx.helpers.addTagModifier(ctx, 'HAS', {
        id: 'priest_king', name: 'The Priest-King', months: 48, effects: { unrestAll: -0.5 },
      });
    },
  },
  {
    id: 'has_the_coast', name: 'The Kingdom Reaches the Sea',
    desc: 'Hold Joppa: a kingdom with no harbor is a kingdom that pays somebody else\'s customs.',
    rewardText: '+120 talents and "The Customs of Joppa": +10% trade, permanent.',
    check: (ctx) => holds(ctx, 'HAS', 'Joppa'),
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'HAS', { treasury: 120 });
      ctx.helpers.addTagModifier(ctx, 'HAS', {
        id: 'customs_of_joppa', name: 'The Customs of Joppa', months: -1, effects: { tradeMult: 1.1 },
      });
    },
  },
  {
    id: 'has_yannai', name: "Yannai's Borders",
    desc: 'Twenty provinces under the Hasmonean crown, the borders of the greatest of the line.',
    rewardText: '+4,000 manpower and "The Old Borders": +8% morale, permanent.',
    check: (ctx) => ownedCount(ctx, 'HAS') >= 20,
    reward: (ctx) => {
      ctx.helpers.adjust(ctx, 'HAS', { manpower: 4000 });
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
  // ---- the Kingdom of Israel: the endgame crown of every Jewish arc ----------
  {
    id: 'form_mli_jud',
    from: 'JUD', to: 'MLI',
    name: 'Proclaim the Kingdom of Israel',
    desc: 'Not a revolt that survived, not a client on sufferance — a kingdom, with '
      + 'Jerusalem for its seat and the Law for its charter. The crown of David — '
      + 'and the sceptre does not depart from Judah, so it is claimed in two courts: '
      + 'the field, and the genealogies.',
    bookmarks: ['66ce', '132ce', '614ce'],
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
];
