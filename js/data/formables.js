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
