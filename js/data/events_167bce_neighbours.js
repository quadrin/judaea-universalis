// Judaea Universalis — the other side of the line: 147–64 BCE (SPEC §241).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The chapter knows two scales and nothing in between. There is the empire —
// Antioch, Rome, the Arsacids, in the world and republic packages — and there
// is the realm, in the chain and in §240. What is missing is the scale a
// courier can ride in a day: Petra, Chalcis, the Ten Cities, Ascalon, Tyre,
// the eastern shore of the lake, and the men in the watchtowers who see all of
// them. A small kingdom's foreign policy is nine tenths neighbours and the
// chapter had almost none of it.
//
// Sources: Josephus, Antiquities XIII, for the Ituraeans, Ascalon and the
// eastern shore; 1 Maccabees for the coast and the watchtowers; Diodorus XIX
// for the Nabataeans and the bitumen; the Tyrian shekel hoards and the
// rabbinic rule that the Temple's coin is Tyrian; Strabo XVI for the Ten
// Cities and the pirate coast.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_167bce_neighbours] ' + key, e || '');
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

export const EVENTS_167_NEIGHBOURS = [

  // ── 147 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev167n_the_silver_of_tyre',
    title: 'The Silver of Tyre',
    desc: 'The half-shekel of the sanctuary must be paid in a coin of the right weight and the '
      + 'right purity, and there is exactly one mint in the world that reliably strikes it: '
      + 'Tyre. Which means the holiest obligation in the calendar is discharged, by every Jew '
      + 'alive, in a coin with the head of Melqart on one side and an eagle on the other, '
      + 'struck by a Phoenician city that has never taken an order from anybody here.\n\n'
      + 'The money-changers in the outer court exist entirely to solve this: they take what '
      + 'the pilgrim has and give back Tyrian silver, at a commission. Strike our own and the '
      + 'weight has to be perfect for ever, because the day it slips the whole nation is '
      + 'paying its Temple tax in short coin and everybody will know whose fault it is.',
    forTag: 'player',
    date: { y: -147, m: 4 },
    aiOption: 1,
    historical: 'The Tyrian shekel remained the required coin of the Temple tax until 70 CE, long after Judaea had a mint of its own.',
    options: [
      {
        label: 'Strike our own, to the Tyrian weight, and require it',
        tooltip: '−45 talents to set up the assay: +10 legitimacy and "The Sanctuary Coin" (+8% income) for fifteen years, with +0.6 unrest everywhere for six while every changer in the court is told his trade has moved.',
        effects: guard('tyre:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, legitimacy: 10 });
          mod(ctx, 'the_sanctuary_coin', 'The Sanctuary Coin', { incomeMult: 1.08, unrestAll: 0.6 }, 180);
          h.setFlag(ctx, 'sanctuaryCoin', true);
          h.chronicle(ctx, 'era', 'A sanctuary coin is struck at home to the Tyrian weight and '
            + 'required at the gate. The weight is checked publicly, every year, for ever.');
        }),
      },
      {
        label: 'Take a treaty with Tyre instead: fixed weight, fixed supply',
        tooltip: '−25 talents in gifts to the Tyrian magistrates: +10 influence points and "The Tyrian Agreement" (+6% income, +4% trade) for fifteen years. The coin stays foreign and the supply stops being somebody\'s whim.',
        effects: guard('tyre:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -25, infl: 10 });
          mod(ctx, 'the_tyrian_agreement', 'The Tyrian Agreement', { incomeMult: 1.06, tradeMult: 1.04 }, 180);
          h.chronicle(ctx, 'diplomacy', 'An agreement is made with Tyre on the weight and the '
            + 'supply of the sanctuary coin. Melqart stays on the silver and nobody at the '
            + 'gate is short-changed.');
        }),
      },
      {
        label: 'Take the changers\' commission into the treasury',
        tooltip: '+55 talents a decade and "The Tables in the Court" (+7% income) for twelve years, with −8 legitimacy: the crown is now taking a cut of the Temple tax, which is exactly what everybody will call it.',
        effects: guard('tyre:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 55, legitimacy: -8 });
          mod(ctx, 'tables_in_the_court', 'The Tables in the Court', { incomeMult: 1.07 }, 144);
          h.chronicle(ctx, 'era', 'The changers\' tables are licensed and their commission is '
            + 'taken into the treasury. It is a great deal of money and it is described, '
            + 'accurately, as a tax on the tax.');
        }),
      },
    ],
  },

  // ── 128 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev167n_the_king_across_the_salt_sea',
    title: 'The King Across the Salt Sea',
    desc: 'An embassy comes up from Petra, which is a city cut into a gorge that nobody has ever '
      + 'taken and that most people cannot find. What the Nabataeans have is the whole southern '
      + 'trade — frankincense and myrrh out of Arabia Felix, moving north by camel through wells '
      + 'that only their guides know — and what they want is a settled arrangement about the '
      + 'road it comes up, which runs through country both crowns claim.\n\n'
      + 'They are not a threat and they are not friends. They are the other small kingdom on '
      + 'this frontier that has managed, so far, to be nobody\'s province, and they have worked '
      + 'out that there are exactly two of those and that the empires can only be balanced by '
      + 'people who are not fighting each other.',
    forTag: 'player',
    date: { y: -128, m: 6 },
    aiOption: 0,
    historical: 'Nabataea and Hasmonean Judaea alternated between alliance and war for a century, and both survived as client kingdoms far longer than any of their neighbours.',
    options: [
      {
        label: 'A treaty on the road, and the tolls split',
        tooltip: '+12 influence points and "The Incense Road" (+9% income, +7% trade) for fifteen years. Two kingdoms that are not fighting each other are two kingdoms an empire has to invade twice.',
        effects: guard('petra:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 12 });
          mod(ctx, 'the_incense_road', 'The Incense Road', { incomeMult: 1.09, tradeMult: 1.07 }, 180);
          h.setFlag(ctx, 'nabataeanRoad', true);
          h.chronicle(ctx, 'diplomacy', 'A road treaty is signed with the court at Petra and '
            + 'the tolls are split. Neither crown mentions the empires, and both are thinking '
            + 'about nothing else.');
        }),
      },
      {
        label: 'Take the road and set our own tolls',
        tooltip: '+80 talents and +8 martial points, with "The Contested Road" (+6% income, +0.9 unrest everywhere) for ten years and a neighbour who now has a grievance and knows where the wells are.',
        effects: guard('petra:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 80, mar: 8 });
          mod(ctx, 'the_contested_road', 'The Contested Road', { incomeMult: 1.06, unrestAll: 0.9 }, 120);
          h.chronicle(ctx, 'era', 'The road is taken and the tolls are set at the crown\'s own '
            + 'rate. The caravans start going round, by wells nobody here has ever seen.');
        }),
      },
      {
        label: 'Nothing in writing. Trade and no treaty',
        tooltip: '+8 governance points and "The Open Frontier" (+5% income, +4% trade) for twelve years. Nothing is conceded and nothing is guaranteed, which suits both courts for about a generation.',
        effects: guard('petra:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 8 });
          mod(ctx, 'the_open_frontier', 'The Open Frontier', { incomeMult: 1.05, tradeMult: 1.04 }, 144);
          h.chronicle(ctx, 'era', 'No treaty is made and the caravans come up anyway. Both '
            + 'courts prefer an arrangement neither of them has to defend in front of anybody.');
        }),
      },
    ],
  },

  // ── 124 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev167n_the_cities_of_the_ten',
    title: 'The Cities of the Ten',
    desc: 'Across the river and up the eastern plateau there are a dozen Greek cities that have '
      + 'been running themselves since Alexander: Gerasa, Philadelphia, Gadara, Pella, '
      + 'Scythopolis on this side of the water. Each has an assembly, a gymnasium, its own '
      + 'coinage and a charter it can produce whenever anybody asks. They have outlived the '
      + 'dynasty that founded them and are extremely confident that they will outlive the next '
      + 'one too.\n\n'
      + 'They are also rich, they sit on every road east, and they are entirely indefensible '
      + 'one at a time. What is on the table is whether to treat them as a frontier to be '
      + 'reduced, a market to be joined, or a set of small republics whose charters are worth '
      + 'more to this crown intact than the tribute of any of them.',
    forTag: 'player',
    date: { y: -124, m: 3 },
    aiOption: 2,
    historical: 'The Decapolis cities kept their civic institutions through Hasmonean conquest, Roman annexation and everything after. Pompey made restoring them a headline of the settlement of 63.',
    options: [
      {
        label: 'Reduce them, city by city',
        tooltip: '+10 martial points and "The Eastern Towns" (+8% income, +4% force limit) for fifteen years, with +1.2 unrest everywhere for eight: a Greek city under a Jewish crown is a grievance with a charter and an archive.',
        effects: guard('ten:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { mar: 10 });
          mod(ctx, 'the_eastern_towns', 'The Eastern Towns', { incomeMult: 1.08, forceLimitMult: 1.04, unrestAll: 1.2 }, 180);
          h.chronicle(ctx, 'war', 'The eastern cities are reduced one at a time. Each keeps its '
            + 'charter in a box and its resentment in the open, and both are produced the next '
            + 'time an empire comes through.');
        }),
      },
      {
        label: 'Join their market and leave their assemblies alone',
        tooltip: '−30 talents on roads, weights and a customs union: "The Ten Markets" (+10% income, +8% trade) for twenty years.',
        effects: guard('ten:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30 });
          mod(ctx, 'the_ten_markets', 'The Ten Markets', { incomeMult: 1.10, tradeMult: 1.08 }, 240);
          h.setFlag(ctx, 'decapolisMarket', true);
          h.chronicle(ctx, 'diplomacy', 'A customs union is made with the eastern cities: one '
            + 'set of weights, one set of road tolls, and every assembly still sitting.');
        }),
      },
      {
        label: 'Guarantee their charters and take a tribute for it',
        tooltip: '+40 talents a decade, +12 influence points, and "The Guarantor" (+6% income, −0.4 unrest everywhere) for twenty years. They pay to be left as they are, which is what they were going to do anyway.',
        effects: guard('ten:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 40, infl: 12 });
          mod(ctx, 'the_guarantor', 'The Guarantor', { incomeMult: 1.06, unrestAll: -0.4 }, 240);
          h.chronicle(ctx, 'diplomacy', 'The charters of the eastern cities are guaranteed under '
            + 'this crown\'s seal, for a tribute. Every one of them signs, and every one of '
            + 'them keeps a copy of the older charter as well.');
        }),
      },
    ],
  },

  // ── 119 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev167n_the_men_from_the_mountain',
    title: 'The Men From the Mountain',
    desc: 'The Ituraeans come down off Hermon in the raiding season and go back up it before '
      + 'anybody can bring a column north. They are a confederation rather than a kingdom, they '
      + 'hold the Beqaa and the high country and a fortress at Chalcis, and their archers are '
      + 'the best in the region and available to whoever is paying.\n\n'
      + 'The villages of the upper Galilee lose stock, grain and occasionally people every '
      + 'autumn, and have been asking for a garrison for six years. A garrison up there costs '
      + 'more than the district produces. What the frontier headmen actually want, when they '
      + 'are asked instead of read, is either the money to arm themselves or a standing '
      + 'arrangement with the men on the mountain — and the second one is cheaper and cannot '
      + 'be admitted to in public.',
    forTag: 'player',
    date: { y: -119, m: 8 },
    aiOption: 1,
    historical: 'The Ituraeans dominated the Lebanon and the northern Galilee frontier until Aristobulus I and then Pompey broke their reach.',
    options: [
      {
        label: 'Garrison the north properly',
        tooltip: '−70 talents: +10 martial points and "The Northern Line" (+5% manpower, +1 defence in hill country, −0.6 unrest everywhere) for fifteen years. Expensive, and the raiding stops.',
        effects: guard('itu:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, mar: 10 });
          mod(ctx, 'the_northern_line', 'The Northern Line', { manpowerMult: 1.05, hillDefBonus: 1, unrestAll: -0.6 }, 180);
          h.chronicle(ctx, 'war', 'The northern district is garrisoned in earnest. The raiding '
            + 'stops within two seasons and the cost is entered every year for fifteen.');
        }),
      },
      {
        label: 'Arm the villages and let them keep what they defend',
        tooltip: '−35 talents: +8 martial points and "The Armed Frontier" (+7% manpower, +1 defence in hill country) for fifteen years, with +0.5 unrest everywhere — armed villages are a frontier and also a constituency.',
        effects: guard('itu:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, mar: 8 });
          mod(ctx, 'the_armed_frontier', 'The Armed Frontier', { manpowerMult: 1.07, hillDefBonus: 1, unrestAll: 0.5 }, 180);
          h.setFlag(ctx, 'armedFrontier', true);
          h.chronicle(ctx, 'war', 'The northern villages are armed and told to keep what they '
            + 'can hold. The raiding halves in three years, and the district acquires opinions '
            + 'about the crown that it did not have before.');
        }),
      },
      {
        label: 'Pay the mountain, and hire its archers',
        tooltip: '−40 talents a decade: +10 influence points and "The Mountain Contract" (+6% morale, +4% income, −0.5 unrest everywhere) for fifteen years. The men who were raiding the Galilee are now on our muster rolls, which is cheaper and is never written down as policy.',
        effects: guard('itu:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, infl: 10 });
          mod(ctx, 'the_mountain_contract', 'The Mountain Contract', { moraleMult: 1.06, incomeMult: 1.04, unrestAll: -0.5 }, 180);
          h.chronicle(ctx, 'diplomacy', 'A subsidy goes up to the mountain and the archers come '
            + 'down under contract. Nobody signs anything and the autumn raids stop.');
        }),
      },
    ],
  },

  // ── 112 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev167n_the_city_never_taken',
    title: 'The City That Was Never Taken',
    desc: 'Ascalon sends the usual embassy with the usual gifts and the usual reminder that it '
      + 'is a free city, that it has been a free city since before anybody at this court was '
      + 'born, and that it would like to renew the arrangement whereby it acknowledges nothing '
      + 'and pays a great deal.\n\n'
      + 'It is the one town on this coast nobody ever storms. It has an assembly, its own era '
      + 'on its own coins, a harbour that takes grain out of half the southern plain, and a '
      + 'standing policy of being useful to whatever power is currently ascendant while '
      + 'conceding nothing whatever. Every crown that has looked at the walls has decided the '
      + 'money is better, and every one of them has been slightly annoyed by the decision.',
    forTag: 'player',
    date: { y: -112, m: 5 },
    aiOption: 0,
    historical: 'Ascalon kept its freedom through the whole Hasmonean expansion and dated its coins by its own civic era for four centuries.',
    options: [
      {
        label: 'Renew it. Take the money',
        tooltip: '+70 talents and "The Free City" (+7% income, +5% trade) for fifteen years. The one port on this coast that will always be open, because it is not ours to close.',
        effects: guard('asc:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 70 });
          mod(ctx, 'the_free_city', 'The Free City', { incomeMult: 1.07, tradeMult: 1.05 }, 180);
          h.chronicle(ctx, 'diplomacy', 'The arrangement with Ascalon is renewed on the old '
            + 'terms: it concedes nothing and pays a great deal, and its harbour stays open in '
            + 'every season including the ones with a war in them.');
        }),
      },
      {
        label: 'Take the city',
        tooltip: '−60 talents and a siege: +10 martial points, "The Southern Harbour" (+9% income, +5% trade) for fifteen years, and +1.3 unrest everywhere for eight. It can be done. It has simply never been worth it before.',
        effects: guard('asc:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, mar: 10 });
          mod(ctx, 'the_southern_harbour', 'The Southern Harbour', { incomeMult: 1.09, tradeMult: 1.05, unrestAll: 1.3 }, 180);
          h.setFlag(ctx, 'ascalonTaken', true);
          h.chronicle(ctx, 'war', 'Ascalon is taken. The harbour is worth what everybody said '
            + 'it was worth, and the city writes to three empires about it within the year.');
        }),
      },
      {
        label: 'Buy the grain trade instead of the town',
        tooltip: '−40 talents into the granaries and the shipping agents: "The Grain of the Plain" (+8% income, +6% trade) for twenty years, and the walls stay somebody else\'s problem.',
        effects: guard('asc:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40 });
          mod(ctx, 'the_grain_of_the_plain', 'The Grain of the Plain', { incomeMult: 1.08, tradeMult: 1.06 }, 240);
          h.chronicle(ctx, 'era', 'The crown buys the granaries and the agents rather than the '
            + 'town. Ascalon stays free, and most of what leaves it belongs to somebody in '
            + 'Jerusalem.');
        }),
      },
    ],
  },

  // ── 102 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev167n_the_eastern_shore',
    title: 'The Eastern Shore',
    desc: 'The lake has two sides and only one of them answers to anybody here. The eastern '
      + 'shore and the plateau above it are a patchwork: Greek-founded towns, Arab clans '
      + 'wintering their flocks, Jewish villages that have been there since the tribes, and '
      + 'a run of basalt gorges nobody governs at all. The fishermen of both shores work the '
      + 'same water and have for ever, and settle their own disputes because the alternative '
      + 'is two crowns.\n\n'
      + 'What has changed is that the district is now worth something: grain out of the '
      + 'plateau, the road to Damascus, and a lake that could carry both. The elders of the '
      + 'western towns want the eastern one brought in. The fishermen, who are the only people '
      + 'who use it daily, would prefer everybody left it exactly as it is.',
    forTag: 'player',
    date: { y: -102, m: 9 },
    aiOption: 1,
    historical: 'The Golan and the eastern lake shore passed between Ituraean, Hasmonean, Herodian and civic control for a century; its Jewish villages persisted through all of it.',
    options: [
      {
        label: 'Bring the eastern shore in',
        tooltip: '+10 martial points and "The Whole Lake" (+8% income, +5% growth) for twenty years, with +0.9 unrest everywhere for eight from every clan and town that was not asked.',
        effects: guard('shore:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { mar: 10 });
          mod(ctx, 'the_whole_lake', 'The Whole Lake', { incomeMult: 1.08, growthMult: 1.05, unrestAll: 0.9 }, 240);
          h.chronicle(ctx, 'war', 'The eastern shore is brought under the crown. The fishing '
            + 'goes on exactly as before and the tax on it does not.');
        }),
      },
      {
        label: 'Settle the villages and leave the towns alone',
        tooltip: '−45 talents in seed, tools and titles: +8 legitimacy and "The Lake Villages" (+7% income, +6% growth, +4% manpower) for twenty years. The Jewish settlements on the far shore double, and nobody has been conquered.',
        effects: guard('shore:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, legitimacy: 8 });
          mod(ctx, 'the_lake_villages', 'The Lake Villages', { incomeMult: 1.07, growthMult: 1.06, manpowerMult: 1.04 }, 240);
          h.setFlag(ctx, 'easternShoreSettled', true);
          h.chronicle(ctx, 'era', 'Seed, tools and titles go across the water to the villages '
            + 'of the eastern shore. In twenty years there are twice as many of them and no '
            + 'campaign was fought.');
        }),
      },
      {
        label: 'One water, one court for the fishermen, and no border on it',
        tooltip: '+12 governance points and "The Lake Assize" (+6% income, −0.6 unrest everywhere) for twenty years. A joint bench for the men who work the water, and neither crown has to say where the line is.',
        effects: guard('shore:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'the_lake_assize', 'The Lake Assize', { incomeMult: 1.06, unrestAll: -0.6 }, 240);
          h.chronicle(ctx, 'diplomacy', 'A joint bench is seated for the fishermen of both '
            + 'shores and no border is drawn on the water. It works for sixty years, which is '
            + 'longer than most borders.');
        }),
      },
    ],
  },

  // ── 88 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev167n_the_road_full_of_antiochenes',
    title: 'The Road Full of Antiochenes',
    desc: 'Syria has stopped working. There are two kings in the north and neither of them '
      + 'controls a road; the cities are hiring their own garrisons; and the people who can '
      + 'afford to leave are leaving, southward, because south is where there is a government. '
      + 'They arrive at the frontier in family groups with what they could carry: Greek-'
      + 'speaking, mostly urban, a great many of them craftsmen, some of them the sort of '
      + 'people who used to run things.\n\n'
      + 'They are not our nation and they are not a threat, and there are a lot of them. The '
      + 'towns of the coast would take them tomorrow. The hill country would rather they went '
      + 'somewhere else. And a court that lets in ten thousand Greek-speakers has made a '
      + 'decision about what this country is going to look like in thirty years, whether or '
      + 'not it says so out loud.',
    forTag: 'player',
    date: { y: -88, m: 7 },
    aiOption: 0,
    historical: 'The collapse of Seleucid Syria in the 90s and 80s emptied its cities southward and westward; Judaea and the coast absorbed a great deal of it.',
    options: [
      {
        label: 'Take them, and settle them on the coast',
        tooltip: '−50 talents: "The Newcomers" (+9% income, +7% growth, +5% trade) for twenty years, with +0.7 unrest everywhere for eight as the hill country works out what has been done.',
        effects: guard('ant:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50 });
          mod(ctx, 'the_newcomers', 'The Newcomers', { incomeMult: 1.09, growthMult: 1.07, tradeMult: 1.05, unrestAll: 0.7 }, 240);
          h.setFlag(ctx, 'syrianNewcomers', true);
          h.chronicle(ctx, 'era', 'The Syrian refugees are taken in and settled on the coast. '
            + 'The port towns are unrecognisable in a generation and pay for a third of the '
            + 'army.');
        }),
      },
      {
        label: 'Take the craftsmen and the physicians only',
        tooltip: '−25 talents: +10 governance points and "The Skilled Intake" (+7% income, +4% growth) for twenty years, and −6 legitimacy for a policy that is exactly as cold as it looks.',
        effects: guard('ant:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -25, gov: 10, legitimacy: -6 });
          mod(ctx, 'the_skilled_intake', 'The Skilled Intake', { incomeMult: 1.07, growthMult: 1.04 }, 240);
          h.chronicle(ctx, 'era', 'Craftsmen and physicians are admitted at the frontier and '
            + 'the rest are turned back. Both halves of the policy are carried out by the same '
            + 'clerks at the same gate.');
        }),
      },
      {
        label: 'Close the frontier',
        tooltip: '+10 legitimacy with the hill country and "The Closed Frontier" (−0.6 unrest everywhere) for twelve years, with −5% income and −4% growth. The coast towns note that the ships stopped calling.',
        effects: guard('ant:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10 });
          mod(ctx, 'the_closed_frontier', 'The Closed Frontier', { unrestAll: -0.6, incomeMult: 0.95, growthMult: 0.96 }, 144);
          h.chronicle(ctx, 'era', 'The northern frontier is closed to the Syrians. They go to '
            + 'the coast cities and to Egypt instead, with their trades and their money.');
        }),
      },
    ],
  },

  // ── 79 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev167n_the_ships_with_no_flag',
    title: 'The Ships With No Flag',
    desc: 'The pirates of Cilicia have stopped being a nuisance and become an institution. They '
      + 'have fleets, dockyards, fortified harbours, a command structure and a going rate; '
      + 'they took a Roman praetor off a road in Italy last year; and their business model on '
      + 'this coast is a landing party at dawn on a village with no wall, and the people in it '
      + 'sold on Delos six weeks later.\n\n'
      + 'There is no navy in the eastern Mediterranean that is currently interested in stopping '
      + 'them. The Seleucids have no ships, Egypt has ships and no policy, and the one power '
      + 'that could clear the sea in a season is busy with a war in Anatolia. Every coastal '
      + 'town from Gaza to Ptolemais is asking the same question and nobody upstream is '
      + 'answering it.',
    forTag: 'player',
    date: { y: -79, m: 5 },
    aiOption: 1,
    historical: 'Cilician piracy peaked in the 70s BCE and was ended by Pompey in a single campaigning season in 67 — the command that brought him east in the first place.',
    options: [
      {
        label: 'Build and crew a squadron',
        tooltip: '−85 talents: "The Coast Squadron" (+7% fleet strength, +6% income, −0.5 unrest everywhere) for fifteen years. Expensive, and the villages stop losing people.',
        effects: guard('pir:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -85 });
          mod(ctx, 'coast_squadron_167', 'The Coast Squadron', { navalMult: 1.07, incomeMult: 1.06, unrestAll: -0.5 }, 180);
          h.setFlag(ctx, 'coastSquadron167', true);
          h.chronicle(ctx, 'war', 'A squadron is built and crewed for the coast. It is the most '
            + 'expensive thing in the budget and the landings stop.');
        }),
      },
      {
        label: 'Wall the villages and watch the beaches',
        tooltip: '−40 talents on walls, towers and a signal chain: +8 martial points and "The Watched Beaches" (+4% manpower, −0.7 unrest everywhere) for fifteen years. The raids continue and take almost nobody.',
        effects: guard('pir:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, mar: 8 });
          mod(ctx, 'the_watched_beaches', 'The Watched Beaches', { manpowerMult: 1.04, unrestAll: -0.7 }, 180);
          h.chronicle(ctx, 'war', 'Walls, towers and a chain of signal fires go up along the '
            + 'shore. The ships keep coming in and keep going away empty.');
        }),
      },
      {
        label: 'Pay them not to land here',
        tooltip: '+35 talents saved against a squadron, −25 in tribute: "The Arrangement" (+4% income) for ten years, −10 legitimacy, and a coast that knows exactly what its crown did.',
        effects: guard('pir:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -25, legitimacy: -10 });
          mod(ctx, 'the_arrangement', 'The Arrangement', { incomeMult: 1.04 }, 120);
          h.chronicle(ctx, 'era', 'A payment is made, through intermediaries, to men who will '
            + 'not be named in any record. The landings stop on this coast and continue on the '
            + 'next one.');
        }),
      },
    ],
  },

  // ── 71 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev167n_the_watchtowers',
    title: 'The Watchtowers',
    desc: 'The frontier is not a line. It is about sixty towers, most of them a day\'s walk '
      + 'apart, each held by four to eight men who are farmers eleven months of the year, on '
      + 'ground that changes hands by degrees and not by treaty. They see the caravans, the '
      + 'flocks moving north, and whoever is coming, and the whole early-warning system of the '
      + 'kingdom is those men and a signal fire.\n\n'
      + 'They are also the only officials most of the frontier ever meets, and they have been '
      + 'settling disputes, taking tolls and marrying into the villages on both sides for '
      + 'forty years. The report on the table asks a question nobody has put in writing before: '
      + 'whether the men in the towers are the crown\'s frontier or the frontier\'s own '
      + 'arrangement with the crown.',
    forTag: 'player',
    date: { y: -71, m: 8 },
    aiOption: 0,
    historical: 'The Hellenistic and Hasmonean frontier was a system of small towers and signal fires manned locally; the archaeology shows them continuously occupied through every change of ruler.',
    options: [
      {
        label: 'Pay them properly and put an officer on the circuit',
        tooltip: '−45 talents: +12 governance points and "The Watch" (+5% manpower, +5% income, −0.5 unrest everywhere) for twenty years. The frontier reports to somebody, and knows it.',
        effects: guard('watch:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, gov: 12 });
          mod(ctx, 'the_watch', 'The Watch', { manpowerMult: 1.05, incomeMult: 1.05, unrestAll: -0.5 }, 240);
          h.chronicle(ctx, 'war', 'The towers are put on the payroll and an officer rides the '
            + 'circuit twice a year. The frontier becomes a thing the crown can be told about.');
        }),
      },
      {
        label: 'Let them keep the tolls and answer for the ground',
        tooltip: '+30 talents saved and +8 governance points, with "The Frontier\'s Own" (+7% manpower, +0.5 unrest everywhere) for twenty years. Cheap, effective, and in thirty years the border families are a power in themselves.',
        effects: guard('watch:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 30, gov: 8 });
          mod(ctx, 'the_frontiers_own', 'The Frontier\'s Own', { manpowerMult: 1.07, unrestAll: 0.5 }, 240);
          h.setFlag(ctx, 'frontierFamilies', true);
          h.chronicle(ctx, 'era', 'The tower families keep their tolls and answer for the '
            + 'ground. It costs the treasury nothing and produces, in a generation, a frontier '
            + 'aristocracy nobody voted for.');
        }),
      },
      {
        label: 'Replace them with a standing company',
        tooltip: '−75 talents: +12 martial points and "The Standing Company" (+6% discipline, +4% force limit, −0.4 unrest everywhere) for twenty years. Professional, obedient, and it does not know anybody on the other side.',
        effects: guard('watch:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -75, mar: 12 });
          mod(ctx, 'the_standing_company', 'The Standing Company', { disciplineMult: 1.06, forceLimitMult: 1.04, unrestAll: -0.4 }, 240);
          h.chronicle(ctx, 'war', 'A standing company replaces the tower farmers. It is better '
            + 'at fighting and worse at knowing, which the frontier notices within a year.');
        }),
      },
    ],
  },

  // ── 64 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev167n_the_governor_next_door',
    title: 'The Governor Next Door',
    desc: 'There is a Roman governor in Antioch now, with legions, an assize circuit and a '
      + 'staff, and the northern frontier of this kingdom has stopped being a frontier with '
      + 'Syria and become a frontier with Rome. Nothing has been declared and nothing has '
      + 'changed on the ground. Every single thing about the next century has changed.\n\n'
      + 'The immediate consequences are administrative and they arrive within the month: '
      + 'extradition requests, a demand that road tolls be harmonised, an enquiry about grain '
      + 'contracts for the legions, and an invitation to send somebody to the assize. Each is '
      + 'small. Each is also a precedent about what kind of thing this kingdom is, and the '
      + 'clerks answering them are junior men who have not been told which answers matter.',
    forTag: 'player',
    date: { y: -64, m: 9 },
    aiOption: 1,
    historical: 'Pompey organised Syria as a province in 64 BCE. Every eastern kingdom spent the following century discovering what a Roman neighbour meant in practice.',
    options: [
      {
        label: 'Answer everything, generously, and get the file opened right',
        tooltip: '−40 talents in gifts and grain: +14 influence points and "The Good Neighbour" (+7% income, −0.4 unrest everywhere) for fifteen years. The first file a province opens on you is the one it reads for fifty years.',
        effects: guard('gov:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, infl: 14 });
          mod(ctx, 'the_good_neighbour', 'The Good Neighbour', { incomeMult: 1.07, unrestAll: -0.4 }, 180);
          h.setFlag(ctx, 'romanFileOpened', true);
          h.chronicle(ctx, 'diplomacy', 'Every request from Antioch is answered generously and '
            + 'in the correct form. The file opened on this kingdom that year is the one every '
            + 'later governor reads first.');
        }),
      },
      {
        label: 'Answer narrowly, and concede one precedent at a time',
        tooltip: '+15 governance points and "The Careful Answers" (+5% income, −0.3 unrest everywhere) for fifteen years. Slower, colder, and nothing is conceded that was not asked for.',
        effects: guard('gov:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15 });
          mod(ctx, 'the_careful_answers', 'The Careful Answers', { incomeMult: 1.05, unrestAll: -0.3 }, 180);
          h.chronicle(ctx, 'diplomacy', 'The requests from Antioch are answered narrowly, one at '
            + 'a time, by men instructed to concede nothing that was not asked for.');
        }),
      },
      {
        label: 'Refer everything to the treaty and answer nothing else',
        tooltip: '+12 legitimacy and "The Older Document" (−0.4 unrest everywhere, +4% manpower) for twelve years, with −10 influence points. The oldest treaty in the archive is produced, and Antioch is told to read it.',
        effects: guard('gov:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 12, infl: -10 });
          mod(ctx, 'the_older_document', 'The Older Document', { unrestAll: -0.4, manpowerMult: 1.04 }, 144);
          h.chronicle(ctx, 'diplomacy', 'The treaty of friendship with the Senate is produced '
            + 'and every request is referred to it. Antioch finds this irritating and legally '
            + 'unanswerable, which is the whole intention.');
        }),
      },
    ],
  },
];
