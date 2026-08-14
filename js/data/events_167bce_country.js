// Judaea Universalis — the country, not the court: 160–72 BCE (SPEC §247).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The third register: not the state deciding what it is (§240) and not the ring
// of courts across the border (§241), but the country underneath both. What
// this land grows, what it digs, what it sells, and what it does in the years
// the Law itself tells it to stop farming.
//
// Six cards. This chapter's decades are already well filled, so these are not
// gap-filling: they are the texture a hundred and seven years of a small
// agricultural country ought to have and did not. The Maccabean chapter is
// mostly about who rules; almost nothing in it was about what anybody ate.
//
// Sources: 1 Maccabees 6.49–54 for the sabbatical famine at Beth-Zur;
// Josephus, Antiquities XIV and Wars I for Jericho balsam and the Dead Sea
// bitumen concessions; the Timna and Feinan copper surveys; Diodorus XIX.98
// for the asphalt harvest.

const _warned = new Set();
function warnOnce(key, e) { if (_warned.has(key)) return; _warned.add(key); console.warn('[events_167bce_country] ' + key, e || ''); }
function guard(key, fn) { return function (ctx) { try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); } }; }
function P(ctx) { return ctx.game.playerTag; }
function mod(ctx, id, name, effects, months) {
  ctx.helpers.addTagModifier(ctx, P(ctx), { id, name, months: Number.isFinite(months) ? months : -1, effects });
}

export const EVENTS_167_COUNTRY = [
  {
    id: 'ev167c_the_year_the_land_rests',
    title: 'The Year the Land Rests',
    desc: 'The seventh year is coming and the Law is plain: nothing is sown, nothing is reaped, '
      + 'and what grows of itself belongs to anybody who wants it. In a country at peace this is '
      + 'a hardship arranged in advance. In a country at war it is a siege engine pointed at '
      + 'ourselves — the garrisons eat, the fields do not, and everyone knows the date.\n\n'
      + 'It has already cost a fortress once. Beth-Zur fell in a sabbatical year for want of '
      + 'stores and not for want of walls.',
    forTag: 'player',
    date: { y: -160, m: 8 },
    aiOption: 0,
    historical: '1 Maccabees records Beth-Zur surrendering in a sabbatical year because the defenders had no provisions; the seventh-year fallow was observed strictly enough to shape campaign timing.',
    options: [
      {
        label: 'Fill the magazines two years ahead, by decree',
        tooltip: '−60 talents: +1 stability and "The Sixth-Year Store" (+9% manpower, −0.8 unrest) permanently. The Law says do not sow. It does not say do not plan.',
        effects: guard('shmita:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, stability: 1 });
          mod(ctx, 'the_sixth_year_store', 'The Sixth-Year Store', { manpowerMult: 1.09, unrestAll: -0.8 });
          h.setFlag(ctx, 'sixthYearStore', true);
          h.chronicle(ctx, 'era', 'The sixth-year magazines are made a standing institution. No '
            + 'fortress of this realm is ever again starved out by the calendar.');
        }),
      },
      {
        label: 'Buy from abroad in the seventh year and pay what it costs',
        tooltip: '−45 talents: "The Seventh-Year Purchase" (+7% income, +5% trade) for thirty years. The neighbours learn exactly when this country must buy, and price accordingly.',
        effects: guard('shmita:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45 });
          mod(ctx, 'the_seventh_year_purchase', 'The Seventh-Year Purchase', { incomeMult: 1.07, tradeMult: 1.05 }, 360);
          h.chronicle(ctx, 'era', 'The seventh year is bought through rather than stored against. '
            + 'Every grain factor from Gaza to Tyre marks the date in his own calendar.');
        }),
      },
      {
        label: 'Keep it strictly and let the year cost what it costs',
        tooltip: '−1.5 unrest everywhere and +0.16 legitimacy a month permanently; −6% manpower for the same. The oldest argument in this country, answered in the oldest way.',
        effects: guard('shmita:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10, stability: 1 });
          mod(ctx, 'the_year_kept_whole', 'The Year Kept Whole', { legitimacyAdd: 0.16, manpowerMult: 0.94, unrestAll: -1.5 });
          h.chronicle(ctx, 'era', 'The seventh year is kept whole, at the price the seventh year '
            + 'costs. The country is hungrier and nobody says the crown chose otherwise.');
        }),
      },
    ],
  },
  {
    id: 'ev167c_the_balsam_of_the_valley',
    title: 'The Balsam of the Valley',
    desc: 'It grows in two gardens on earth and both of them are in this valley. The sap is worth '
      + 'twice its weight in silver in Rome, it is used in every temple and every physician\'s '
      + 'chest from Spain to India, and it will not take anywhere else — people have tried for '
      + 'three hundred years.\n\n'
      + 'The gardens are the single most valuable thing this country owns. What is unsettled is '
      + 'whether they belong to the crown, to the men who work them, or to whoever holds Jericho '
      + 'in a given decade.',
    forTag: 'player',
    date: { y: -146, m: 5 },
    aiOption: 0,
    historical: 'The Jericho and Ein Gedi balsam groves were a monopoly commodity of extraordinary value; Antony gave them to Cleopatra, and Roman writers treated them as one of the wonders of Judaea.',
    options: [
      {
        label: 'Take them for the crown and guard them like a fortress',
        tooltip: '+80 talents: "The Balsam Monopoly" (+14% income, +8% trade) permanently, and +0.8 unrest from the valley families. The most profitable acre in the world, held directly.',
        effects: guard('balsam:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 80 });
          mod(ctx, 'the_balsam_monopoly', 'The Balsam Monopoly', { incomeMult: 1.14, tradeMult: 1.08, unrestAll: 0.8 });
          h.setFlag(ctx, 'balsamCrownHeld', true);
          h.chronicle(ctx, 'era', 'The balsam gardens are taken into the crown\'s own hand and '
            + 'garrisoned. They pay for more of this realm than any province does.');
        }),
      },
      {
        label: 'Leave them with the families and tax the sap',
        tooltip: '+45 talents: "The Sap Tithe" (+9% income, +6% trade, −0.5 unrest) permanently. Men who own a thing that rare will protect it better than a garrison will.',
        effects: guard('balsam:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 45 });
          mod(ctx, 'the_sap_tithe', 'The Sap Tithe', { incomeMult: 1.09, tradeMult: 1.06, unrestAll: -0.5 });
          h.chronicle(ctx, 'era', 'The gardens stay with the families that have always worked them, '
            + 'and the sap is tithed. Neither side has ever cheated the other very much.');
        }),
      },
    ],
  },
  {
    id: 'ev167c_the_asphalt_harvest',
    title: 'The Asphalt Harvest',
    desc: 'Twice a year the Dead Sea throws up slabs of bitumen the size of a threshing floor, and '
      + 'they float. The Nabataeans go out on reed boats with hooks and drag them ashore, and it '
      + 'goes to Egypt, where it is used to embalm the dead and to caulk everything that floats '
      + 'on the Nile.\n\n'
      + 'There have been small wars over this. The Nabataeans regard the harvest as theirs by '
      + 'long custom and the western shore is ours by any map. Nobody has yet decided to make it '
      + 'a question, which means everybody can still decide to.',
    forTag: 'player',
    date: { y: -133, m: 3 },
    aiOption: 1,
    historical: 'Diodorus describes the periodic bitumen harvest of the Dead Sea and the armed competition for it; Egyptian demand for asphalt in embalming made it a genuinely strategic export.',
    options: [
      {
        label: 'Put our own boats on the water and take the western shore\'s share',
        tooltip: '−35 talents: +55 talents a season — "The Asphalt Shore" (+10% income, +7% trade) for forty years — and +8 Nabataean hostility. Reed boats and hooks, and a quarrel that lasts a century.',
        effects: guard('asphalt:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35 });
          mod(ctx, 'the_asphalt_shore', 'The Asphalt Shore', { incomeMult: 1.10, tradeMult: 1.07 }, 480);
          h.setFlag(ctx, 'asphaltContested', true);
          h.chronicle(ctx, 'era', 'Our boats go out for the bitumen. The Nabataeans regard it as '
            + 'theft and say so for three generations.');
        }),
      },
      {
        label: 'Sell them the licence instead',
        tooltip: '+40 talents and 6 influence points: "The Bitumen Licence" (+7% income, +5% trade) for forty years. A quarrel avoided and paid for, which is the Nabataean way of doing business.',
        effects: guard('asphalt:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 40, infl: 6 });
          mod(ctx, 'the_bitumen_licence', 'The Bitumen Licence', { incomeMult: 1.07, tradeMult: 1.05 }, 480);
          h.chronicle(ctx, 'diplomacy', 'The bitumen harvest is licensed to the Nabataeans for a '
            + 'yearly payment. Both sides think they have the better of it.');
        }),
      },
    ],
  },
  {
    id: 'ev167c_the_hill_villages_fill',
    title: 'The Hill Villages Fill',
    desc: 'The hill country is being farmed again. Terraces that went out of use when the war '
      + 'started are being walled up, cisterns dug out, and villages that had six families have '
      + 'twenty. It is the quietest and most consequential thing happening in this reign.\n\n'
      + 'What the villages want is what new villages always want: a road they can get a cart '
      + 'down, and somebody to say whose the water is before two of them work it out with sticks.',
    forTag: 'player',
    date: { y: -121, m: 9 },
    aiOption: 0,
    historical: 'Archaeological survey shows a substantial expansion of rural settlement in the Judaean and Samarian hills through the later second century BCE, contemporary with Hasmonean expansion.',
    options: [
      {
        label: 'Build the roads and register the cisterns',
        tooltip: '−50 talents: +8 governance points and "The Hill Roads" (+10% population growth, +7% income, −0.6 unrest) permanently. Cheap ground, made worth farming.',
        effects: guard('hills:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, gov: 8 });
          mod(ctx, 'the_hill_roads', 'The Hill Roads', { growthMult: 1.10, incomeMult: 1.07, unrestAll: -0.6 });
          h.setFlag(ctx, 'hillRoadsBuilt', true);
          h.chronicle(ctx, 'era', 'Cart roads are cut to the hill villages and the cisterns are '
            + 'registered. The hill country carries more people than it has in three centuries.');
        }),
      },
      {
        label: 'Settle veterans there on grants of land',
        tooltip: '−40 talents: "The Veterans\' Terraces" (+8% manpower, +6% population growth, +1 hill defence) permanently. Farmers who already know one end of a spear from the other.',
        effects: guard('hills:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, mar: 5 });
          mod(ctx, 'the_veterans_terraces', 'The Veterans\' Terraces', { manpowerMult: 1.08, growthMult: 1.06, hillDefBonus: 1 });
          h.chronicle(ctx, 'era', 'The hill grants go to men who served. The terraces are walled '
            + 'and so, quietly, are the approaches to them.');
        }),
      },
      {
        label: 'Leave them to it and tax the increase',
        tooltip: '+9% income for thirty years, and +1 unrest from villages arguing over water with nobody to arbitrate. The cheapest option, and it works until two villages want the same spring.',
        effects: guard('hills:2', (ctx) => {
          const h = ctx.helpers;
          mod(ctx, 'the_untended_increase', 'The Untended Increase', { incomeMult: 1.09, unrestAll: 1 }, 360);
          h.chronicle(ctx, 'era', 'The hill villages are left to themselves and taxed on what they '
            + 'grow. The water disputes reach the courts one at a time for forty years.');
        }),
      },
    ],
  },
  {
    id: 'ev167c_the_copper_of_the_arabah',
    title: 'The Copper of the Arabah',
    desc: 'There is copper in the southern wadis and there has been since anybody was here to want '
      + 'it — shafts in the sandstone, slag heaps a thousand years old, and nobody working them '
      + 'now because the men who did are dead or gone and the water has to be carried in.\n\n'
      + 'A realm that intends to arm itself out of its own ground rather than out of Tyre\'s '
      + 'warehouses will have to reopen them. It is a long way from anywhere and it will cost '
      + 'more than the copper is worth for the first ten years.',
    forTag: 'player',
    date: { y: -108, m: 6 },
    aiOption: 1,
    historical: 'The Arabah copper districts (Timna, Feinan) were worked intermittently from the Bronze Age; large-scale operation required imported labour and water and was episodic.',
    options: [
      {
        label: 'Reopen the shafts and carry the water',
        tooltip: '−75 talents: "Our Own Metal" (+9% income, +8% discipline from arms that owe nobody) for forty years. Expensive, slow, and it is ours.',
        effects: guard('copper:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -75, mar: 8 });
          mod(ctx, 'our_own_metal', 'Our Own Metal', { incomeMult: 1.09, disciplineMult: 1.08 }, 480);
          h.setFlag(ctx, 'arabahCopper', true);
          h.chronicle(ctx, 'era', 'The Arabah shafts are reopened and the water is carried in by '
            + 'the caravan-load. The realm stops buying its bronze from Tyre.');
        }),
      },
      {
        label: 'Leave it and buy from Tyre, who are cheaper and always will be',
        tooltip: '+25 talents kept: "The Tyrian Account" (+8% trade, +5% income) for thirty years. Cheaper every year, and a standing account with a city that has other friends.',
        effects: guard('copper:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 25 });
          mod(ctx, 'the_tyrian_account', 'The Tyrian Account', { tradeMult: 1.08, incomeMult: 1.05 }, 360);
          h.chronicle(ctx, 'era', 'The southern shafts stay shut. The bronze comes from Tyre, on '
            + 'account, at a price that is always fair and never ours to set.');
        }),
      },
    ],
  },
  {
    id: 'ev167c_the_grain_road_to_egypt',
    title: 'The Grain Road to Egypt',
    desc: 'In a bad year this country buys Egyptian wheat, and in a good year the coastal plain '
      + 'has a surplus that Egypt does not want and Phoenicia does. The road runs both ways '
      + 'depending on the rain, and the men who work it are the same either way.\n\n'
      + 'They want the crown to keep the road: wells at the stages, a patrol against the desert '
      + 'raiders, and a fixed toll instead of whatever the local strongman decides this season.',
    forTag: 'player',
    date: { y: -84, m: 4 },
    aiOption: 0,
    historical: 'The coastal route between Egypt and the Levant carried grain in both directions depending on the harvest; its wells and staging posts were a standing charge on whoever claimed the plain.',
    options: [
      {
        label: 'Dig the wells, patrol the stages, fix the toll',
        tooltip: '−55 talents: "The Road Kept" (+12% trade, +7% income, −0.5 unrest) permanently. Roads are the one investment a small country can make that a large one cannot take away.',
        effects: guard('grainroad:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, gov: 5 });
          mod(ctx, 'the_road_kept', 'The Road Kept', { tradeMult: 1.12, incomeMult: 1.07, unrestAll: -0.5 });
          h.setFlag(ctx, 'grainRoadKept', true);
          h.chronicle(ctx, 'era', 'The wells are dug and the stages patrolled, and the toll is '
            + 'published. The coast road becomes the most reliable thing in the region.');
        }),
      },
      {
        label: 'Farm the toll out to the strongest man on each stretch',
        tooltip: '+50 talents at no cost: +1.2 unrest and "The Farmed Road" (+6% income, −4% trade) for twenty-five years. It collects itself, and everyone on it knows who to hate.',
        effects: guard('grainroad:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 50 });
          mod(ctx, 'the_farmed_road', 'The Farmed Road', { incomeMult: 1.06, tradeMult: 0.96, unrestAll: 1.2 }, 300);
          h.chronicle(ctx, 'era', 'The road tolls are farmed out. They come in without effort and '
            + 'the caravans start going around.');
        }),
      },
    ],
  },
];
