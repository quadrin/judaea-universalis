// Judaea Universalis — the other side of the line: 353–431 CE (SPEC §241).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The Galilee's chapter has an empire pressing on it and, since §240, a
// district of its own with floors, looms and boundaries. The third thing is
// the ring, and in this century the ring changes faster than the empire does:
// the desert federates become a power with a bishop of their own choosing, the
// last buffer kingdom is cut in half by treaty, the old cults come back for
// two years and then close for ever, the coast cities acquire a new kind of
// government, and the Keepers on the middle ridge spend the century being
// legislated at in exactly the same words this chapter's own people are.
//
// Ten cards, weighted at the end of the chapter, where the chain thins to one.
//
// Sources: Ammianus XIV and XXIII for the phylarchs and the Isaurians;
// Sozomen and Socrates for Mavia's settlement, the temples and the councils;
// the Theodosian Code XVI.8 for the shared legislation; Procopius, Buildings,
// and the Notitia for the eastern establishment; the Armenian partition of 387
// in Faustus and the Syriac chronicles.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_351ce_neighbours] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

function P(ctx) { return ctx.game.playerTag; }

function mod(ctx, id, name, effects, months) {
  ctx.helpers.addTagModifier(ctx, P(ctx), {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

export const EVENTS_351_NEIGHBOURS = [

  // ── 353 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351n_the_phylarchs_price',
    title: 'The Phylarch\'s Price',
    desc: 'The chief of the desert confederation sends to ask what this district is worth to '
      + 'itself. His men hold the eastern approaches; the imperial establishment pays him and '
      + 'is currently three years behind; and he has worked out that a district in the hills '
      + 'with a rising in it and no field army within four hundred miles is a customer with '
      + 'urgent needs.\n\n'
      + 'What he is offering is not troops. It is the thing a confederation actually sells: '
      + 'that his people will not be on a particular road in a particular season, and that '
      + 'anybody else\'s people who are will be reported. It is protection and it is '
      + 'intelligence, and it is available at a price that is trivial compared to a garrison '
      + 'and impossible to admit to in front of anybody in a uniform.',
    forTag: 'player',
    date: { y: 353, m: 6 },
    aiOption: 0,
    historical: 'The imperial phylarch system was chronically in arrears; the desert chiefs sold protection and information to whoever would pay on time.',
    options: [
      {
        label: 'Pay him, quietly, and pay on time',
        tooltip: '−35 talents a decade: +12 influence points and "The Eastern Understanding" (+6% income, +5% manpower, −0.6 unrest everywhere) for twenty years. The approaches are watched by people who are being paid on schedule for the first time in years.',
        effects: guard('phyl:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, infl: 12 });
          mod(ctx, 'the_eastern_understanding', 'The Eastern Understanding', { incomeMult: 1.06, manpowerMult: 1.05, unrestAll: -0.6 }, 240);
          h.setFlag(ctx, 'easternUnderstanding', true);
          h.chronicle(ctx, 'diplomacy', 'The desert chief is paid quietly and on time. The '
            + 'eastern roads are clear and this district hears about columns before they are '
            + 'on them.');
        }),
      },
      {
        label: 'Hire his riders outright',
        tooltip: '−55 talents: +12 martial points and "The Desert Riders" (+7% morale, +5% manpower, +1 defence in hill country) for fifteen years, with +0.7 unrest everywhere — an imperial auxiliary on somebody else\'s payroll is a sentence with a penalty attached.',
        effects: guard('phyl:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, mar: 12 });
          mod(ctx, 'the_desert_riders', 'The Desert Riders', { moraleMult: 1.07, manpowerMult: 1.05, hillDefBonus: 1, unrestAll: 0.7 }, 180);
          h.chronicle(ctx, 'war', 'Desert riders are hired outright. They are the best light '
            + 'cavalry available and every one of them is on an imperial roll as well.');
        }),
      },
      {
        label: 'Report the approach and take the credit',
        tooltip: '+10 influence points with the province and "The Loyal Report" (+5% income, −0.4 unrest everywhere) for fifteen years, with a frontier chief who now knows exactly what this court does with an approach.',
        effects: guard('phyl:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 10 });
          mod(ctx, 'the_loyal_report', 'The Loyal Report', { incomeMult: 1.05, unrestAll: -0.4 }, 180);
          h.chronicle(ctx, 'diplomacy', 'The desert chief\'s approach is reported to the '
            + 'province in full. The credit is banked and the eastern roads are exactly as '
            + 'safe as they were.');
        }),
      },
    ],
  },

  // ── 361 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351n_the_old_cults_return',
    title: 'The Old Cults Return',
    desc: 'For about two years the temples are open again. The new emperor has restored the '
      + 'sacrifices, reopened the shrines, put the priesthoods back on their endowments and '
      + 'invited every exiled bishop of every doctrine home simultaneously, on the theory that '
      + 'they will fight each other and leave him alone.\n\n'
      + 'On this coast it means the old cities are briefly what they were fifty years ago: the '
      + 'processions, the games, the sacred groves in business, and a set of neighbours who '
      + 'spent a generation being unfashionable behaving as though the last forty years were a '
      + 'misunderstanding. Everybody involved can do the arithmetic on the emperor\'s age and '
      + 'his Persian campaign, and everybody is behaving as though they cannot.',
    forTag: 'player',
    date: { y: 361, m: 9 },
    aiOption: 1,
    historical: 'Julian restored the temples and recalled the exiled bishops of every party. The restoration collapsed within months of his death in 363.',
    options: [
      {
        label: 'Make friends with the restored priesthoods while it lasts',
        tooltip: '+10 influence points and "The Old Families" (+6% income, +4% trade) for twelve years, with +0.6 unrest everywhere for six once it ends and everybody\'s associations are reviewed.',
        effects: guard('cults:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 10 });
          mod(ctx, 'the_old_families', 'The Old Families', { incomeMult: 1.06, tradeMult: 1.04, unrestAll: 0.6 }, 144);
          h.chronicle(ctx, 'diplomacy', 'Friendships are made with the restored priesthoods and '
            + 'the old civic families behind them. Some of them are worth having afterwards and '
            + 'all of them are on a list.');
        }),
      },
      {
        label: 'Take the two years to get everything in writing',
        tooltip: '+15 governance points and "The Documents of the Interval" (+7% income, −0.5 unrest everywhere) for twenty years. Two years in which every office in the east is distracted is two years in which petitions are granted.',
        effects: guard('cults:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15 });
          mod(ctx, 'documents_of_the_interval', 'The Documents of the Interval', { incomeMult: 1.07, unrestAll: -0.5 }, 240);
          h.setFlag(ctx, 'documentsOfTheInterval', true);
          h.chronicle(ctx, 'era', 'Every petition this district has ever wanted granted is '
            + 'lodged during the interval, while the offices are occupied with something else. '
            + 'A surprising number come back signed.');
        }),
      },
      {
        label: 'Change nothing. It will not last',
        tooltip: '+12 governance points and "Nothing Committed" (−0.5 unrest everywhere) for fifteen years. Correct, and it forgoes two years in which almost anything could have been asked for.',
        effects: guard('cults:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'nothing_committed', 'Nothing Committed', { unrestAll: -0.5 }, 180);
          h.chronicle(ctx, 'era', 'Nothing is committed to during the restoration. It lasts '
            + 'twenty months, and the court that committed to nothing has to explain nothing.');
        }),
      },
    ],
  },

  // ── 372 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351n_the_middle_ridge_351',
    title: 'The Middle Ridge',
    desc: 'The district between this one and the south is the Keepers\', and their century is '
      + 'running exactly parallel to ours in a way that neither community enjoys noticing. The '
      + 'same rescripts arrive in both. The same building restrictions apply. The same '
      + 'disabilities on office, on testimony and on inheritance are drafted in the same '
      + 'chancery, and where a law names them it usually names us in the following clause.\n\n'
      + 'A thousand years of quarrel says there is nothing to discuss. The clerks who read '
      + 'both sets of correspondence say something else, which is that two communities '
      + 'receiving identical letters from the same office have, whether they like it or not, '
      + 'the same problem — and that one petition signed twice weighs more than two petitions '
      + 'signed once.',
    forTag: 'player',
    date: { y: 372, m: 4 },
    aiOption: 2,
    historical: 'Fourth-century imperial legislation on Jews and Samaritans was frequently drafted in the same instruments; both communities petitioned the same offices, separately.',
    options: [
      {
        label: 'One petition, both names on it',
        tooltip: '−30 talents on the joint drafting: +12 influence points and "The Two Israels" (+7% income, −0.5 unrest everywhere) for twenty years, with −8 legitimacy from every house that will not have the sentence said out loud.',
        effects: guard('ridge351:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, infl: 12, legitimacy: -8 });
          mod(ctx, 'the_two_israels_351', 'The Two Israels', { incomeMult: 1.07, unrestAll: -0.5 }, 240);
          h.setFlag(ctx, 'jointPetition351', true);
          h.chronicle(ctx, 'diplomacy', 'One petition goes up with both names on it. It is the '
            + 'first document in a millennium signed by both mountains, and it is about '
            + 'inheritance law.');
        }),
      },
      {
        label: 'Share what each of us learns and sign nothing together',
        tooltip: '+14 governance points and "The Shared Reading" (+6% income, −0.4 unrest everywhere) for twenty years. Copies of every rescript, both ways, by messengers who are not asked what they carry.',
        effects: guard('ridge351:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 14 });
          mod(ctx, 'the_shared_reading', 'The Shared Reading', { incomeMult: 1.06, unrestAll: -0.4 }, 240);
          h.chronicle(ctx, 'era', 'Copies of every rescript pass quietly between the two '
            + 'districts. Nothing is signed, nothing is admitted, and both communities are '
            + 'better informed than the province.');
        }),
      },
      {
        label: 'Our own petitions, in our own name, as always',
        tooltip: '+10 legitimacy and "Our Own Name" (−0.4 unrest everywhere) for fifteen years, with −5% income. Two petitions arrive at the same office in the same month about the same clause, and are dealt with in the order the clerks prefer.',
        effects: guard('ridge351:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10 });
          mod(ctx, 'our_own_name', 'Our Own Name', { unrestAll: -0.4, incomeMult: 0.95 }, 180);
          h.chronicle(ctx, 'era', 'Petitions go up separately, as they always have. Two arrive '
            + 'in the same month about the same clause and are read by the same clerk, who '
            + 'observes as much in the margin.');
        }),
      },
    ],
  },

  // ── 384 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351n_the_partition_of_armenia',
    title: 'The Partition of Armenia',
    desc: 'The last kingdom between the two empires has been divided between them by agreement '
      + 'rather than by war: four fifths to Persia, one fifth to Rome, the royal house '
      + 'pensioned into irrelevance on both sides, and a frontier that now runs from the Black '
      + 'Sea to the desert with no third party anywhere on it.\n\n'
      + 'It is the end of a system that has been running since before anybody\'s grandfather. '
      + 'For four hundred years every community on this frontier has had somewhere to be that '
      + 'was neither empire — a court to petition, a border to cross, a king to shelter with. '
      + 'From this treaty there is nowhere. Every people between the two of them is now inside '
      + 'one of them, permanently, and the arrangements they make from here are made without '
      + 'any leverage at all.',
    forTag: 'player',
    date: { y: 384, m: 7 },
    world: true,
    worldLabel: 'Rome and Persia partition Armenia; the last buffer kingdom ends',
    aiOption: 1,
    historical: 'The partition of Armenia in 387 divided the kingdom between the empires and ended the buffer system of the eastern frontier for good.',
    options: [
      {
        label: 'Take in the Armenian houses that will not live under either',
        tooltip: '−50 talents in settlement: +10 legitimacy and "The Armenian Households" (+6% income, +5% manpower, +4% growth) for twenty-five years. Soldiers, masons and merchants out of a kingdom that has stopped existing.',
        effects: guard('arm:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, legitimacy: 10 });
          mod(ctx, 'the_armenian_households', 'The Armenian Households', { incomeMult: 1.06, manpowerMult: 1.05, growthMult: 1.04 }, 300);
          h.chronicle(ctx, 'era', 'The Armenian households that will not live under either '
            + 'empire are taken in and settled. They arrive with trades, with grievances and '
            + 'with an unusually clear account of how a buffer kingdom ends.');
        }),
      },
      {
        label: 'Make the direct arrangements now, with both, before the frontier hardens',
        tooltip: '−55 talents on two sets of embassies: +14 influence points and "Two Doors" (+8% income, −0.5 unrest everywhere) for twenty-five years. With no third party left, a community either has its own arrangement with each empire or it has none.',
        effects: guard('arm:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, infl: 14 });
          mod(ctx, 'two_doors_351', 'Two Doors', { incomeMult: 1.08, unrestAll: -0.5 }, 300);
          h.setFlag(ctx, 'twoDoors351', true);
          h.chronicle(ctx, 'diplomacy', 'Direct arrangements are made with both empires while '
            + 'the new frontier is still being surveyed. Nothing said to either contradicts '
            + 'anything said to the other, which took some drafting.');
        }),
      },
      {
        label: 'Write down what it means and put it in front of the elders',
        tooltip: '+16 governance points and "No Third Country" (+5% income, +4% manpower, −0.4 unrest everywhere) for twenty years. Every plan this community has that assumes somewhere to go is now obsolete, and saying so is worth more than any single arrangement.',
        effects: guard('arm:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 16 });
          mod(ctx, 'no_third_country', 'No Third Country', { incomeMult: 1.05, manpowerMult: 1.04, unrestAll: -0.4 }, 240);
          h.chronicle(ctx, 'era', 'What the partition means is written out and read to the '
            + 'elders: there is no third country. Every plan that assumed one is revised that '
            + 'winter.');
        }),
      },
    ],
  },

  // ── 393 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351n_the_temples_shut',
    title: 'The Temples Shut',
    desc: 'The sacrifices are prohibited everywhere, the temples are closed, the endowments are '
      + 'confiscated, and in the cities of this coast a set of institutions that had been '
      + 'continuously in operation for six hundred years stops in a season. At Alexandria a '
      + 'crowd pulls down the Serapeum, which was one of the wonders of the world and is '
      + 'quarried for building stone within a decade.\n\n'
      + 'The neighbours this district has argued with about idolatry since before the '
      + 'Maccabees have just been abolished by somebody else. What replaces them is not an '
      + 'absence: the endowments, the buildings, the processions and the civic calendar are '
      + 'all transferred, in most towns within one generation, to an institution that regards '
      + 'this community as its principal theological problem.',
    forTag: 'player',
    date: { y: 393, m: 5 },
    aiOption: 1,
    historical: 'Theodosius\' laws of 391–392 closed the temples and ended public sacrifice; the Serapeum was destroyed in 392. Endowments and civic functions passed to the churches.',
    options: [
      {
        label: 'Get the exemption for our own houses written into the same instrument',
        tooltip: '−45 talents on the drafting and the delivery: +14 influence points and "Named and Excepted" (+7% income, −0.6 unrest everywhere) for twenty-five years. A law that abolishes public cult and names one exception is the best document this community will get all century.',
        effects: guard('temples:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, infl: 14 });
          mod(ctx, 'named_and_excepted', 'Named and Excepted', { incomeMult: 1.07, unrestAll: -0.6 }, 300);
          h.setFlag(ctx, 'namedAndExcepted', true);
          h.chronicle(ctx, 'diplomacy', 'The exception for the synagogues is written into the '
            + 'same body of law that closes the temples. It is quoted back at four governors '
            + 'in the following thirty years.');
        }),
      },
      {
        label: 'Buy the endowments and the buildings while they are cheap',
        tooltip: '−60 talents: "The Confiscated Estates" (+9% income, +5% growth) for twenty-five years, with +0.8 unrest everywhere for eight from everybody who thinks the money came from somewhere it should not have.',
        effects: guard('temples:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60 });
          mod(ctx, 'the_confiscated_estates', 'The Confiscated Estates', { incomeMult: 1.09, growthMult: 1.05, unrestAll: 0.8 }, 300);
          h.chronicle(ctx, 'era', 'Temple estates come onto the market at confiscation prices '
            + 'and a good deal of it is bought. Where the money came from is discussed in this '
            + 'community for a generation.');
        }),
      },
      {
        label: 'Nothing. Do not be seen anywhere near it',
        tooltip: '+12 governance points and "Well Clear of It" (−0.6 unrest everywhere) for twenty years. When the crowds that pulled down a temple are looking for the next thing, a community that bought its land is easier to find than one that did not.',
        effects: guard('temples:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'well_clear_of_it', 'Well Clear of It', { unrestAll: -0.6 }, 240);
          h.chronicle(ctx, 'era', 'Nothing is bought and nobody from this district is seen near '
            + 'any of it. It is the cautious reading and it is the correct one about twice in '
            + 'the next four decades.');
        }),
      },
    ],
  },

  // ── 402 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351n_the_ports_and_the_bishops',
    title: 'The Ports and the Bishops',
    desc: 'The coast towns this district sells its linen and glass through have changed '
      + 'government without anybody holding an election. The bishop hears the civil cases, '
      + 'distributes the relief, signs for the building work and has the ear of the governor; '
      + 'the town council still exists and meets when there is something to seal.\n\n'
      + 'Every commercial relationship this district has runs through those towns, and every '
      + 'one of them now terminates in an office held by a religious officer of a religion '
      + 'whose local literature about this community is not friendly. The trade continues, '
      + 'because trade does, and the terms of it are now set by somebody whose interests are '
      + 'not merely commercial and who has never been dealt with by anybody from these hills.',
    forTag: 'player',
    date: { y: 402, m: 8 },
    aiOption: 0,
    historical: 'Episcopal jurisdiction and imperial building funds made the bishop the effective civil authority in eastern cities across the fifth century.',
    options: [
      {
        label: 'Call on them, formally, and keep calling',
        tooltip: '−35 talents on the courtesies: +14 governance points and "The Calls Paid" (+8% income, +5% trade, −0.6 unrest everywhere) for twenty-five years. Unpopular at home, and it is where the decisions about our trade are made.',
        effects: guard('ports:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, gov: 14 });
          mod(ctx, 'the_calls_paid', 'The Calls Paid', { incomeMult: 1.08, tradeMult: 1.05, unrestAll: -0.6 }, 300);
          h.setFlag(ctx, 'callsPaid', true);
          h.chronicle(ctx, 'diplomacy', 'The bishops of the coast towns are called on formally '
            + 'and regularly. Several houses at home object and none of them proposes anything '
            + 'that would sell a bale of linen.');
        }),
      },
      {
        label: 'Sell east instead, by caravan, and need no port',
        tooltip: '−45 talents to open the eastern trade: "The Landward Trade" (+7% income, +8% trade) for twenty-five years. Worse prices, longer routes, and nobody in the chain who has an opinion about us.',
        effects: guard('ports:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45 });
          mod(ctx, 'the_landward_trade', 'The Landward Trade', { incomeMult: 1.07, tradeMult: 1.08 }, 300);
          h.chronicle(ctx, 'era', 'The trade turns landward, east by caravan, at a worse price '
            + 'and through nobody who has read anything about us.');
        }),
      },
      {
        label: 'Put our own factors in the towns and keep the dealings small',
        tooltip: '−30 talents: +10 governance points and "The Quiet Factors" (+6% income, +4% trade) for twenty years. Nobody negotiates with a bishop; a great many small men negotiate with a great many small men.',
        effects: guard('ports:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, gov: 10 });
          mod(ctx, 'the_quiet_factors', 'The Quiet Factors', { incomeMult: 1.06, tradeMult: 1.04 }, 240);
          h.chronicle(ctx, 'era', 'Factors are placed in the coast towns and instructed to keep '
            + 'every dealing small enough that nobody important ever has to have a view about '
            + 'it.');
        }),
      },
    ],
  },

  // ── 411 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351n_the_isaurians_on_the_roads',
    title: 'The Isaurians on the Roads',
    desc: 'The mountain people of the Taurus have come down again, in numbers, and the eastern '
      + 'provinces have discovered that the empire cannot police its own interior. They take '
      + 'the roads, sack towns that have not been walled in three centuries because nobody '
      + 'imagined they would need to be, and withdraw into a country that has beaten every '
      + 'punitive expedition sent into it since the Republic.\n\n'
      + 'The state\'s answer, eventually, will be to hire them. In the meantime the roads north '
      + 'are unsafe, the couriers are three months late, and every district in the east is '
      + 'discovering how much of its security was an assumption rather than an arrangement. '
      + 'This one has hills of its own and a recent memory of what a district can do when it '
      + 'stops waiting for a field army.',
    forTag: 'player',
    date: { y: 411, m: 6 },
    aiOption: 1,
    historical: 'Isaurian raiding devastated the eastern provinces repeatedly between 404 and 440. The empire eventually solved the problem by recruiting them.',
    options: [
      {
        label: 'Wall the towns and post the roads ourselves',
        tooltip: '−65 talents: +12 martial points and "The Walled Towns" (+1 defence in hill country, +5% manpower, −0.6 unrest everywhere) for twenty-five years. Nobody is coming, and this district stops assuming anybody is.',
        effects: guard('isaur:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -65, mar: 12 });
          mod(ctx, 'the_walled_towns', 'The Walled Towns', { hillDefBonus: 1, manpowerMult: 1.05, unrestAll: -0.6 }, 300);
          h.setFlag(ctx, 'walledTowns', true);
          h.chronicle(ctx, 'war', 'The towns are walled and the roads are posted at this '
            + 'district\'s own expense. It is the first time in four centuries that anybody '
            + 'here has built a wall without asking permission.');
        }),
      },
      {
        label: 'Escort the caravans and charge for it',
        tooltip: '−40 talents to raise the escorts: "The Escort Trade" (+8% income, +6% trade, +4% manpower) for twenty years. Other people\'s goods, moving through unsafe country, under our men.',
        effects: guard('isaur:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40 });
          mod(ctx, 'the_escort_trade', 'The Escort Trade', { incomeMult: 1.08, tradeMult: 1.06, manpowerMult: 1.04 }, 240);
          h.chronicle(ctx, 'era', 'Escorts are raised and hired out to the merchants of four '
            + 'provinces. It pays for the walls inside six years.');
        }),
      },
      {
        label: 'Petition for a garrison and wait',
        tooltip: '−25 talents on the petitions: +8 influence points and "The Petition Lodged" (−0.3 unrest everywhere) for ten years, with −6% income and −5% trade while the roads stay closed. The garrison arrives in about nine years.',
        effects: guard('isaur:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -25, infl: 8 });
          mod(ctx, 'the_petition_lodged', 'The Petition Lodged', { unrestAll: -0.3, incomeMult: 0.94, tradeMult: 0.95 }, 120);
          h.chronicle(ctx, 'era', 'Petitions for a garrison are lodged and repeated. The roads '
            + 'stay shut for most of a decade and the garrison, when it comes, is Isaurian.');
        }),
      },
    ],
  },

  // ── 419 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351n_the_federate_bargain',
    title: 'The Federate Bargain',
    desc: 'The arrangement the western empire has been making for twenty years has reached the '
      + 'east: whole peoples are settled inside the frontier on treaty, given land and a share '
      + 'of the revenue of the district they sit in, and in exchange they are the army there. '
      + 'The arithmetic is that an empire which cannot pay soldiers buys them by ceasing to '
      + 'govern a province.\n\n'
      + 'On this frontier the beneficiaries are the desert confederations, and the effect is '
      + 'that the phylarchs are becoming landholders with jurisdictions. Every district on the '
      + 'eastern side of this map is now dealing, for taxes, roads, water and justice, with a '
      + 'confederation rather than with a governor — and the confederations have discovered '
      + 'that they like it and are asking for more.',
    forTag: 'player',
    date: { y: 419, m: 9 },
    aiOption: 0,
    historical: 'Federate settlement — land and revenue share in exchange for military service — became the standard imperial expedient in both halves of the empire from the 410s.',
    options: [
      {
        label: 'Deal with the phylarchs as the government they now are',
        tooltip: '−40 talents on the establishment: +14 influence points and "The Phylarch\'s Court" (+8% income, +5% manpower, −0.5 unrest everywhere) for twenty-five years. Roads, water and justice, agreed directly with the people who actually decide them.',
        effects: guard('fed:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, infl: 14 });
          mod(ctx, 'the_phylarchs_court', 'The Phylarch\'s Court', { incomeMult: 1.08, manpowerMult: 1.05, unrestAll: -0.5 }, 300);
          h.setFlag(ctx, 'phylarchsCourt', true);
          h.chronicle(ctx, 'diplomacy', 'This district deals with the desert confederation as a '
            + 'government: roads, water, tolls and a joint bench. It is the arrangement the '
            + 'next two centuries are actually run on.');
        }),
      },
      {
        label: 'Ask for the same terms ourselves',
        tooltip: '−30 talents on the petition: +12 legitimacy and "Federate Terms" (+7% income, +6% manpower, −5% cost of governing) for twenty-five years, with +0.7 unrest everywhere for six while the province works out what has been conceded.',
        effects: guard('fed:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, legitimacy: 12 });
          mod(ctx, 'federate_terms', 'Federate Terms', { incomeMult: 1.07, manpowerMult: 1.06, adminMult: 0.95, unrestAll: 0.7 }, 300);
          h.setFlag(ctx, 'federateTerms', true);
          h.chronicle(ctx, 'diplomacy', 'This district petitions for the terms the desert '
            + 'confederations have been given: land, a revenue share, and the obligation to '
            + 'defend it. Nobody in the province can think of a principled objection.');
        }),
      },
      {
        label: 'Stay a taxpaying district and let others take the bargain',
        tooltip: '+12 governance points and "The Taxpaying District" (+5% income, −0.4 unrest everywhere) for twenty years. Everything is lawful and orthodox, and the armed peoples around this one are acquiring rights it does not have.',
        effects: guard('fed:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'the_taxpaying_district', 'The Taxpaying District', { incomeMult: 1.05, unrestAll: -0.4 }, 240);
          h.chronicle(ctx, 'era', 'This district stays a taxpaying one. The peoples around it '
            + 'take the federate bargain, and within two generations they have jurisdictions '
            + 'and it has a receipt.');
        }),
      },
    ],
  },

  // ── 426 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351n_the_same_clause_twice',
    title: 'The Same Clause, Twice',
    desc: 'A clerk in the chancery has done the community a service without meaning to. The '
      + 'latest instrument on inheritance, office and testimony treats Jews, Samaritans, '
      + 'heretics and pagans in one schedule, under one set of clauses, with the differences '
      + 'noted in the margin — which means that for the first time all four have a written, '
      + 'official statement of exactly how they are alike.\n\n'
      + 'Three of the four have spent centuries insisting on the distinctions. The document '
      + 'does not care about the distinctions, and neither, it turns out, does the magistrate '
      + 'who has to apply it. Whether that is an outrage or an opportunity depends entirely on '
      + 'whether the four of them can be got into a room, and nobody has ever tried.',
    forTag: 'player',
    date: { y: 426, m: 4 },
    aiOption: 1,
    historical: 'Fifth-century imperial legislation increasingly grouped Jews, Samaritans, heretics and pagans in single schedules of disability, treating them as one administrative category.',
    options: [
      {
        label: 'Get them into a room',
        tooltip: '−45 talents on the meetings: +14 influence points and "The Four Schedules" (+8% income, −0.6 unrest everywhere) for twenty-five years, with −10 legitimacy from everybody who regards three of the four as the enemy.',
        effects: guard('clause:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, infl: 14, legitimacy: -10 });
          mod(ctx, 'the_four_schedules', 'The Four Schedules', { incomeMult: 1.08, unrestAll: -0.6 }, 300);
          h.setFlag(ctx, 'fourSchedules', true);
          h.chronicle(ctx, 'diplomacy', 'The four communities named in one schedule are got into '
            + 'one room. Nobody agrees about anything except the schedule, which is enough for '
            + 'the joint advocates it produces.');
        }),
      },
      {
        label: 'Litigate the distinctions, clause by clause',
        tooltip: '−50 talents on the advocates: +16 governance points and "The Distinctions Argued" (+7% income, −0.5 unrest everywhere) for twenty-five years. Slow, expensive, and every ruling won is a precedent nobody can take back.',
        effects: guard('clause:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, gov: 16 });
          mod(ctx, 'the_distinctions_argued', 'The Distinctions Argued', { incomeMult: 1.07, unrestAll: -0.5 }, 300);
          h.chronicle(ctx, 'era', 'The distinctions are argued clause by clause in front of '
            + 'magistrates who did not know there were any. It takes twenty years and it is '
            + 'still being cited in the next century.');
        }),
      },
      {
        label: 'Say nothing and comply visibly',
        tooltip: '+12 governance points and "Quiet Compliance" (+5% income, −0.6 unrest everywhere) for twenty years. Nothing is contested, nothing is conceded in argument, and every clause is applied as written for as long as anybody is watching.',
        effects: guard('clause:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'quiet_compliance', 'Quiet Compliance', { incomeMult: 1.05, unrestAll: -0.6 }, 240);
          h.chronicle(ctx, 'era', 'The schedule is complied with visibly and contested nowhere. '
            + 'It is the cheapest answer and it leaves the clause standing for the next '
            + 'community that reads it.');
        }),
      },
    ],
  },

  // ── 431 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351n_the_council_and_the_cities',
    title: 'The Council and the Cities',
    desc: 'The bishops meet at Ephesus and come apart. What is at issue is a technical question '
      + 'about how the divine and human are joined in one person, and the consequence is that '
      + 'the church of the empire splits along a line that runs, roughly, between the Greek '
      + 'cities and everybody east and south of them — the Syrians, the Egyptians, the '
      + 'Armenians, and eventually the whole Christian east.\n\n'
      + 'For the neighbours this is enormous and nobody says so out loud. The single '
      + 'institution that had been consolidating every city on this coast for a century has '
      + 'just acquired an internal enemy, and the communities that spent three generations '
      + 'being the thing everybody could agree to be against are about to find that everybody '
      + 'has something closer to hand.',
    forTag: 'player',
    date: { y: 431, m: 7 },
    aiOption: 0,
    historical: 'The Council of Ephesus in 431 opened the christological schisms that split the eastern churches permanently. The quarrel absorbed most of the ecclesiastical energy of the following two centuries.',
    options: [
      {
        label: 'Deal with each party and take sides with none',
        tooltip: '−35 talents on the correspondence: +14 influence points and "Every Party, No Side" (+8% income, −0.6 unrest everywhere) for thirty years. A community that is useful to three churches is harder to be unanimous about.',
        effects: guard('council:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, infl: 14 });
          mod(ctx, 'every_party_no_side', 'Every Party, No Side', { incomeMult: 1.08, unrestAll: -0.6 }, 360);
          h.setFlag(ctx, 'everyPartyNoSide', true);
          h.chronicle(ctx, 'diplomacy', 'Relations are opened with every party to the quarrel '
            + 'and taken with none. Three churches now have a reason to want this community '
            + 'left alone, which is three more than last year.');
        }),
      },
      {
        label: 'Use the interval: build, petition, expand, while they are busy',
        tooltip: '−55 talents: +12 governance points and "The Busy Decades" (+9% income, +6% growth) for thirty years, with +0.5 unrest everywhere for eight. The next two centuries of ecclesiastical attention are spoken for, and it is not by us.',
        effects: guard('council:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, gov: 12 });
          mod(ctx, 'the_busy_decades', 'The Busy Decades', { incomeMult: 1.09, growthMult: 1.06, unrestAll: 0.5 }, 360);
          h.chronicle(ctx, 'era', 'Building, petitioning and expansion are begun in the years '
            + 'when the men who would otherwise object are entirely occupied with each other.');
        }),
      },
      {
        label: 'Write down who holds what, and watch',
        tooltip: '+16 governance points and "The Register of Parties" (+6% income, −0.5 unrest everywhere) for thirty years. Which see holds which doctrine, and which governor leans which way: an unglamorous document that decides where this community is safe for two hundred years.',
        effects: guard('council:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 16 });
          mod(ctx, 'the_register_of_parties', 'The Register of Parties', { incomeMult: 1.06, unrestAll: -0.5 }, 360);
          h.chronicle(ctx, 'era', 'A register is kept of which see holds which doctrine and '
            + 'which official leans which way. It is dull, it is revised yearly, and it decides '
            + 'where this community is safe for two centuries.');
        }),
      },
    ],
  },
];
