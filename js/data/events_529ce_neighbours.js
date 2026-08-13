// Judaea Universalis — the other side of the line: 531–607 CE (SPEC §241).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// §240 gave the Keepers' chapter the mountain's own seventy years. This one
// gives it the ring, which for four hill provinces is close and consequential:
// the Ghassanid phylarch who is the real government of the eastern approaches,
// the bishops who run the ports the linen is sold through, the desert houses
// coming up the wadis, the Persian merchants on the coast road, the tribes of
// the southern desert, and — on the far side of the frontier — a second Arab
// confederation doing the same job for the other empire.
//
// Two cards go to the second chair (SPEC §208): the Yemen's Aksumite viceroy
// and the Persian garrison that replaced him. Both chapters' cards name their
// own tag in the effects for §240's reason — a card addressed to Samaria
// resolves silently when the player is Himyar, and `playerTag` in the effects
// body would move the wrong ledger.
//
// Sources: Procopius, Wars I–II, for al-Harith, al-Mundhir and the Yemen;
// Cyril of Scythopolis for the desert houses and their water; the Nessana
// papyri for the southern road and its tribes; al-Tabari for Wahriz and the
// abna; the Piacenza Pilgrim and the Madaba map for the coast and the roads.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_529ce_neighbours] ' + key, e || '');
}

function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)];
  return !!(t && t.alive !== false);
}

function safeWhen(key, fn) {
  return function (ctx) {
    try { return !!fn(ctx); } catch (e) { warnOnce('when:' + key, e); return false; }
  };
}

// Named-tag effects, for §240's reason: this chapter seats two chairs.
function mod(ctx, tag, id, name, effects, months) {
  if (!alive(ctx, tag)) return;
  ctx.helpers.addTagModifier(ctx, tag, {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

export const EVENTS_529_NEIGHBOURS = [

  // ── 531 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529n_the_phylarch_of_the_east',
    title: 'The Phylarch of the East',
    desc: 'The empire has given one man authority over all the allied Arabs of the eastern '
      + 'frontier and the rank of a patrician with it — a single chief, hereditary, commanding '
      + 'a confederation from the Euphrates to the Red Sea, because the alternative was fifteen '
      + 'chiefs and fifteen negotiations.\n\n'
      + 'For this district he is now the nearest real government. The provincial staff is at '
      + 'Caesarea and does paperwork; the phylarch\'s men are on the eastern roads, in the '
      + 'grazing country, and at every well between here and the desert. He is also a '
      + 'Christian of the party the emperor disapproves of, which means he understands '
      + 'perfectly well what it is to be a useful subject with the wrong doctrine, and he has '
      + 'sent to ask whether the mountain would like an arrangement.',
    forTag: 'SAM',
    date: { y: 531, m: 7 },
    when: safeWhen('phyl529', (ctx) => alive(ctx, 'SAM')),
    aiOption: 0,
    historical: 'Justinian made al-Harith ibn Jabala supreme phylarch of the eastern Arabs with patrician rank. He and his house were Miaphysite throughout, and protected their own church.',
    options: [
      {
        label: 'Take the arrangement: safe roads, and a word when trouble is coming',
        tooltip: '−30 talents a decade: +14 influence points and "The Phylarch\'s Word" (+7% income, +5% trade, −0.6 unrest everywhere) for twenty-five years. The nearest thing to a friendly government this district has.',
        effects: guard('phyl529:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -30, infl: 14 });
          mod(ctx, 'SAM', 'the_phylarchs_word', 'The Phylarch\'s Word', { incomeMult: 1.07, tradeMult: 1.05, unrestAll: -0.6 }, 300);
          h.setFlag(ctx, 'phylarchWord', true);
          h.chronicle(ctx, 'diplomacy', 'An arrangement is made with the phylarch of the east: '
            + 'safe roads, and a rider when something is coming. It is worth more than the '
            + 'province and costs a tenth as much.');
        }),
      },
      {
        label: 'Sell to his people: grain, cloth and iron',
        tooltip: '−25 talents to open the trade: "The Desert Market" (+9% income, +7% trade) for twenty-five years. Fifteen thousand tents that buy everything and grow nothing.',
        effects: guard('phyl529:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -25 });
          mod(ctx, 'SAM', 'the_desert_market', 'The Desert Market', { incomeMult: 1.09, tradeMult: 1.07 }, 300);
          h.chronicle(ctx, 'era', 'Grain, cloth and ironwork go east to the confederation. It is '
            + 'the best customer the district has had in a century and it pays in coin.');
        }),
      },
      {
        label: 'Nothing. A district under suspicion cannot afford a private ally',
        tooltip: '+12 governance points and "Nothing to Explain" (−0.5 unrest everywhere) for twenty years. Every arrangement this community makes is read by somebody, and this one would read badly.',
        effects: guard('phyl529:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { gov: 12 });
          mod(ctx, 'SAM', 'nothing_to_explain_529', 'Nothing to Explain', { unrestAll: -0.5 }, 240);
          h.chronicle(ctx, 'era', 'The phylarch\'s approach is answered with courtesies and no '
            + 'undertakings. A community already under legislation cannot afford a private '
            + 'friendship with an armed one.');
        }),
      },
    ],
  },

  // ── 536 · the Yemen ────────────────────────────────────────────────────────
  {
    id: 'ev529n_the_negus_viceroy',
    title: 'The Negus\'s Viceroy',
    desc: 'The crown of this country is held on somebody else\'s authority and everybody in the '
      + 'palace knows the arrangement. Across the strait is the negus who put it there; in the '
      + 'capital is his garrison, which has not been paid on time in two years and whose '
      + 'officers have started marrying locally; and in the highlands are the old houses, who '
      + 'have not forgotten what was done to the last king and are being extremely polite '
      + 'about it.\n\n'
      + 'The garrison is the whole question. It is the guarantee of this throne and the '
      + 'likeliest cause of its ending, and the historian across the sea who is writing all '
      + 'this down already knows how it turns out. What is in front of the court is narrower '
      + 'and entirely practical: whether to pay those men, disperse them, or make them '
      + 'natives.',
    forTag: 'HMY',
    date: { y: 536, m: 5 },
    when: safeWhen('viceroy', (ctx) => alive(ctx, 'HMY')),
    aiOption: 2,
    historical: 'Aksum installed a client king in Himyar after 525; the occupying troops mutinied and made one of their own officers, Abraha, king within a decade.',
    options: [
      {
        label: 'Pay them properly, out of the customs',
        tooltip: '−60 talents a decade: +8 legitimacy and "The Garrison Paid" (+5% morale, −0.7 unrest everywhere) for fifteen years. A garrison in arrears is a coup with a timetable, and this one is paid.',
        effects: guard('vice:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HMY', { treasury: -60, legitimacy: 8 });
          mod(ctx, 'HMY', 'the_garrison_paid', 'The Garrison Paid', { moraleMult: 1.05, unrestAll: -0.7 }, 180);
          h.chronicle(ctx, 'war', 'The garrison is paid in full and on time out of the customs. '
            + 'It is expensive and it removes the one thing everybody in the palace was waiting '
            + 'for.');
        }),
      },
      {
        label: 'Disperse them: garrisons in the districts, away from the capital',
        tooltip: '−35 talents: +10 governance points and "The Dispersed Garrison" (+5% manpower, −0.4 unrest everywhere) for fifteen years, with +0.6 unrest everywhere for four while the districts find out what has been billeted on them.',
        effects: guard('vice:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HMY', { treasury: -35, gov: 10 });
          mod(ctx, 'HMY', 'the_dispersed_garrison', 'The Dispersed Garrison', { manpowerMult: 1.05, unrestAll: -0.4 }, 180);
          h.chronicle(ctx, 'war', 'The occupying troops are broken up into district garrisons '
            + 'far from the capital. Nobody can raise them all in one night, which was the '
            + 'entire object.');
        }),
      },
      {
        label: 'Make them natives: land, marriage and a stake',
        tooltip: '−45 talents in grants: +12 governance points and "The Settled Garrison" (+7% manpower, +5% growth, −0.5 unrest everywhere) for twenty-five years, with −8 legitimacy from the old houses. Men with land here stop being somebody else\'s army.',
        effects: guard('vice:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HMY', { treasury: -45, gov: 12, legitimacy: -8 });
          mod(ctx, 'HMY', 'the_settled_garrison', 'The Settled Garrison', { manpowerMult: 1.07, growthMult: 1.05, unrestAll: -0.5 }, 300);
          h.setFlag(ctx, 'garrisonSettled', true);
          h.chronicle(ctx, 'era', 'The garrison is given land, wives and a stake in the country '
            + 'it is occupying. Within a generation its sons are Yemenis with an accent, which '
            + 'is the cheapest answer anybody proposed.');
        }),
      },
    ],
  },

  // ── 539 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529n_the_ports_the_linen_goes_through',
    title: 'The Ports the Linen Goes Through',
    desc: 'Everything this district earns leaves through three coast towns, and in all three '
      + 'the bishop is now the man who matters: he hears the disputes, licenses the '
      + 'warehousing, allocates the quay space and decides which complaints reach the '
      + 'governor. He is also, in each of the three, the same man who reads out the '
      + 'legislation about this community twice a year.\n\n'
      + 'There is no theological conversation to be had here and nobody is proposing one. '
      + 'There is a completely practical question about whether the men who sell the linen '
      + 'should be dealing with that office directly, going round it through factors nobody '
      + 'notices, or getting out of the ports altogether and selling east to a confederation '
      + 'that has never had an opinion about anybody\'s book.',
    forTag: 'SAM',
    date: { y: 539, m: 4 },
    when: safeWhen('ports529', (ctx) => alive(ctx, 'SAM')),
    aiOption: 1,
    historical: 'Sixth-century bishops controlled harbour administration, warehousing and civil jurisdiction in the Palestinian coastal cities.',
    options: [
      {
        label: 'Deal with the office directly and correctly',
        tooltip: '−30 talents on the courtesies: +12 governance points and "The Correct Channel" (+8% income, +5% trade, −0.5 unrest everywhere) for twenty-five years. Humiliating in the retelling and it keeps the quay space.',
        effects: guard('ports529:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -30, gov: 12 });
          mod(ctx, 'SAM', 'the_correct_channel', 'The Correct Channel', { incomeMult: 1.08, tradeMult: 1.05, unrestAll: -0.5 }, 300);
          h.chronicle(ctx, 'diplomacy', 'The district deals with the harbour offices directly '
            + 'and with perfect correctness. The quay space is kept and the story is not told '
            + 'at home.');
        }),
      },
      {
        label: 'Go through factors who are not of this community',
        tooltip: '−25 talents in commissions: +8 governance points and "The Nameless Trade" (+6% income, +4% trade) for twenty-five years. Everything moves and nothing has our name on the manifest.',
        effects: guard('ports529:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -25, gov: 8 });
          mod(ctx, 'SAM', 'the_nameless_trade', 'The Nameless Trade', { incomeMult: 1.06, tradeMult: 1.04 }, 300);
          h.chronicle(ctx, 'era', 'The trade moves through factors of other communities, at a '
            + 'commission. Nothing on any manifest in any of the three ports says where the '
            + 'cloth was woven.');
        }),
      },
      {
        label: 'Sell east and let the ports do without us',
        tooltip: '−40 talents to open the desert route: "The Eastern Sale" (+7% income, +8% trade) for twenty-five years. Worse prices, longer roads, and buyers who have never read a rescript about anybody.',
        effects: guard('ports529:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -40 });
          mod(ctx, 'SAM', 'the_eastern_sale', 'The Eastern Sale', { incomeMult: 1.07, tradeMult: 1.08 }, 300);
          h.setFlag(ctx, 'easternSale', true);
          h.chronicle(ctx, 'era', 'The cloth goes east by caravan instead of west by sea. It '
            + 'earns less and it passes through nobody who has ever had a view about this '
            + 'community.');
        }),
      },
    ],
  },

  // ── 547 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529n_the_houses_in_the_wadis',
    title: 'The Houses in the Wadis',
    desc: 'The monastic houses have come up the wadis to the edge of the district. They are '
      + 'large, endowed from Constantinople and from senatorial estates in Italy, and they are '
      + 'buying: springs, terraces, mills, and the strips of hillside that this district\'s own '
      + 'families have been working since before there was an empire.\n\n'
      + 'Nobody is being evicted. That is what makes it hard to argue with. The sales are '
      + 'voluntary, the prices are generous, and the men selling are smallholders in a decade '
      + 'of bad harvests and worse legislation who cannot inherit, cannot testify and cannot '
      + 'leave their fields to their own sons under the law as it currently stands. The house '
      + 'in the wadi is offering cash for land in a market the state has spent twenty years '
      + 'rigging, and it did not rig it.',
    forTag: 'SAM',
    date: { y: 547, m: 8 },
    when: safeWhen('wadis', (ctx) => alive(ctx, 'SAM')),
    aiOption: 0,
    historical: 'The Judaean and Samarian desert monasteries acquired extensive estates and water rights across the sixth century, largely by purchase from smallholders under fiscal and legal pressure.',
    options: [
      {
        label: 'A community fund that buys at the same price',
        tooltip: '−80 talents into the fund: +12 legitimacy and "The Land Kept" (+7% income, +5% growth, −0.6 unrest everywhere) for thirty years. Whoever must sell sells to us, at their price, and works the same field as a tenant of their own people.',
        effects: guard('wadis:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -80, legitimacy: 12 });
          mod(ctx, 'SAM', 'the_land_kept', 'The Land Kept', { incomeMult: 1.07, growthMult: 1.05, unrestAll: -0.6 }, 360);
          h.setFlag(ctx, 'landKeptFund', true);
          h.chronicle(ctx, 'era', 'A community fund is raised to buy at the monasteries\' price. '
            + 'The families sell, and stay, and work the same ground for an institution that '
            + 'is theirs.');
        }),
      },
      {
        label: 'Settle the water rights first and let the land go',
        tooltip: '−35 talents on the survey: +14 governance points and "The Springs Registered" (+6% income, −0.7 unrest everywhere) for thirty years. Land can be bought back in a better century; a spring signed away is gone.',
        effects: guard('wadis:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -35, gov: 14 });
          mod(ctx, 'SAM', 'the_springs_registered', 'The Springs Registered', { incomeMult: 1.06, unrestAll: -0.7 }, 360);
          h.chronicle(ctx, 'era', 'Every spring and channel in the district is surveyed and '
            + 'registered before another field changes hands. The land goes and the water does '
            + 'not.');
        }),
      },
      {
        label: 'Let it happen. The prices are good and the money is real',
        tooltip: '+90 talents into the district and "The Sales" (+8% income) for twenty years, with −8 legitimacy and −5% manpower: the money is spent within a generation and the hillsides are not coming back.',
        effects: guard('wadis:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: 90, legitimacy: -8 });
          mod(ctx, 'SAM', 'the_sales', 'The Sales', { incomeMult: 1.08, manpowerMult: 0.95 }, 240);
          h.chronicle(ctx, 'era', 'The sales go through at good prices and the money comes into '
            + 'the district. It is spent inside a generation, and the terraces have a different '
            + 'landlord for the next six hundred years.');
        }),
      },
    ],
  },

  // ── 555 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529n_the_persian_merchants',
    title: 'The Persian Merchants',
    desc: 'There are Persian traders on the coast road now, openly, under the treaty: silk out '
      + 'of the east, and the arrangement by which the empire buys it at fixed points on the '
      + 'frontier at a price that keeps the whole eastern budget in balance. Both states have '
      + 'agreed where the trade may cross, precisely so that both of them can tax it and '
      + 'neither can be undercut.\n\n'
      + 'It also means that the men riding through this district twice a year are subjects of '
      + 'the other empire, with money, and with an entirely open interest in what everybody '
      + 'along their road thinks of the government they live under. Everybody understands what '
      + 'that means. The district has to decide whether it sells them mules and says nothing, '
      + 'or nothing at all, and either choice is a report somebody could file.',
    forTag: 'SAM',
    date: { y: 555, m: 5 },
    when: safeWhen('persian', (ctx) => alive(ctx, 'SAM')),
    aiOption: 1,
    historical: 'The Roman–Persian treaties fixed the crossing points and pricing of the silk trade; merchants on those routes were universally assumed by both states to be reporting.',
    options: [
      {
        label: 'Sell them everything a caravan needs and ask nothing',
        tooltip: '+60 talents and "The Road Custom" (+8% income, +6% trade) for twenty years, with +0.6 unrest everywhere for six because somebody always writes a letter about it.',
        effects: guard('pers:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: 60 });
          mod(ctx, 'SAM', 'the_road_custom', 'The Road Custom', { incomeMult: 1.08, tradeMult: 1.06, unrestAll: 0.6 }, 240);
          h.chronicle(ctx, 'era', 'Mules, fodder, lodging and repairs for the eastern caravans. '
            + 'It is legal, it is profitable, and a letter is written about it within the '
            + 'year.');
        }),
      },
      {
        label: 'Sell, and report every conversation to the province first',
        tooltip: '+40 talents and +12 influence points, with "The Volunteered Report" (+5% income, −0.5 unrest everywhere) for twenty years. Being the first to tell the province about a conversation is the cheapest insurance available.',
        effects: guard('pers:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: 40, infl: 12 });
          mod(ctx, 'SAM', 'the_volunteered_report', 'The Volunteered Report', { incomeMult: 1.05, unrestAll: -0.5 }, 240);
          h.setFlag(ctx, 'volunteeredReport', true);
          h.chronicle(ctx, 'era', 'The eastern caravans are supplied and every conversation is '
            + 'reported to the province before anybody else can report it. The trade continues '
            + 'and the file on this district acquires a helpful page.');
        }),
      },
      {
        label: 'Close the district to them',
        tooltip: '+10 legitimacy, +10 influence points with the province, and "The Closed Road" (−0.6 unrest everywhere) for fifteen years, with −7% income and −6% trade. Nothing can be alleged and nothing is earned.',
        effects: guard('pers:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 10, infl: 10 });
          mod(ctx, 'SAM', 'the_closed_road_529', 'The Closed Road', { unrestAll: -0.6, incomeMult: 0.93, tradeMult: 0.94 }, 180);
          h.chronicle(ctx, 'era', 'The district is closed to the eastern caravans and the '
            + 'closure is reported upward in writing. Nothing can be alleged about anybody, and '
            + 'the road custom goes to the next district north.');
        }),
      },
    ],
  },

  // ── 563 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529n_the_southern_road',
    title: 'The Southern Road',
    desc: 'South of the settled country the road runs down through the desert towns to the Red '
      + 'Sea, and it is run by an arrangement rather than by a government. The garrison towns '
      + 'are half soldier and half farmer, paid partly in land; the tribes hold the wells and '
      + 'move the flocks; the monastery at the mountain draws pilgrims from three continents '
      + 'through country that would kill them without guides.\n\n'
      + 'It works because everybody in it is paid, and the payments come from an imperial '
      + 'establishment that is currently two years behind. What the tribal chiefs have sent to '
      + 'ask is whether this district would like to contract directly for the southern trade — '
      + 'escort, wells and camels — while the imperial arrangement is still notionally in '
      + 'force and visibly not working.',
    forTag: 'SAM',
    date: { y: 563, m: 9 },
    when: safeWhen('south529', (ctx) => alive(ctx, 'SAM')),
    aiOption: 0,
    historical: 'The Nessana papyri show the southern desert road running on a mixture of soldier-farmers, tribal escorts and monastic pilgrimage traffic, with imperial pay chronically in arrears.',
    options: [
      {
        label: 'Contract directly for the southern trade',
        tooltip: '−40 talents: +12 influence points and "The Southern Contract" (+9% income, +7% trade) for twenty-five years. The wells, the guides and the camels, on our paper, while the imperial arrangement is two years late.',
        effects: guard('south529:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -40, infl: 12 });
          mod(ctx, 'SAM', 'the_southern_contract', 'The Southern Contract', { incomeMult: 1.09, tradeMult: 1.07 }, 300);
          h.setFlag(ctx, 'southernContract', true);
          h.chronicle(ctx, 'diplomacy', 'The wells, guides and camels of the southern road are '
            + 'contracted directly. The imperial establishment goes on being two years behind '
            + 'and nobody mentions it.');
        }),
      },
      {
        label: 'Take the pilgrim traffic only',
        tooltip: '−25 talents on hostels and mules: "The Pilgrim Stages" (+7% income, +5% festival draw) for twenty-five years. Beds, food and animals for people going somewhere else, which is the safest money on any road.',
        effects: guard('south529:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -25 });
          mod(ctx, 'SAM', 'the_pilgrim_stages', 'The Pilgrim Stages', { incomeMult: 1.07, pilgrimMult: 1.05 }, 300);
          h.chronicle(ctx, 'era', 'Hostels and mule-stages are set up along the southern road '
            + 'for the pilgrim traffic. It is unglamorous, uncontroversial and it pays every '
            + 'season.');
        }),
      },
      {
        label: 'Nothing that far from the mountain',
        tooltip: '+10 governance points and +30 talents unspent. Four hill provinces have enough to do, and the southern road is somebody else\'s arrangement to inherit.',
        effects: guard('south529:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { gov: 10, treasury: 30 });
          h.chronicle(ctx, 'era', 'The southern proposal is declined. Four hill provinces have '
            + 'as much frontier as they can hold and the road is left to whoever inherits it.');
        }),
      },
    ],
  },

  // ── 575 · the Yemen ────────────────────────────────────────────────────────
  {
    id: 'ev529n_the_sons_of_the_garrison',
    title: 'The Sons of the Garrison',
    desc: 'The Persian expedition that took this country was small, it was not relieved, and '
      + 'the men in it are still here. They have married local women, their sons speak the '
      + 'local language at home and Persian on parade, and they are turning into a caste: the '
      + 'sons of the garrison, half of each thing, holding every office worth holding and '
      + 'entirely aware that nobody in Ctesiphon is coming to check on them.\n\n'
      + 'They are the government now in every sense that matters locally, and the question in '
      + 'front of everybody else is what they are becoming. A satrapy administered by men who '
      + 'were born here answers letters from the King of Kings slowly, and there will come a '
      + 'year in which one of those letters is an order nobody feels obliged to carry out.',
    forTag: 'HMY',
    date: { y: 575, m: 7 },
    when: safeWhen('abna', (ctx) => alive(ctx, 'HMY')),
    aiOption: 1,
    historical: 'The abna — descendants of Wahriz\' Persian troops and Yemeni mothers — governed the Yemen for two generations and converted to Islam collectively in 628.',
    options: [
      {
        label: 'Marry into them and govern through them',
        tooltip: '−30 talents on the settlements: +12 influence points and "The Half-Native Court" (+8% income, +5% manpower, −0.5 unrest everywhere) for twenty-five years. The men with the offices become the men with the families, and the letters from the east get slower.',
        effects: guard('abna:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HMY', { treasury: -30, infl: 12 });
          mod(ctx, 'HMY', 'the_half_native_court', 'The Half-Native Court', { incomeMult: 1.08, manpowerMult: 1.05, unrestAll: -0.5 }, 300);
          h.setFlag(ctx, 'halfNativeCourt', true);
          h.chronicle(ctx, 'era', 'The great houses marry into the garrison families. Within a '
            + 'generation there is one governing class instead of two and it answers eastward '
            + 'when it feels like it.');
        }),
      },
      {
        label: 'Keep the old houses in the offices they still hold',
        tooltip: '+10 legitimacy and "The Old Houses" (+5% income, −0.4 unrest everywhere) for twenty years, with +0.7 unrest everywhere for six as two administrations compete for the same revenue.',
        effects: guard('abna:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HMY', { legitimacy: 10 });
          mod(ctx, 'HMY', 'the_old_houses', 'The Old Houses', { incomeMult: 1.05, unrestAll: -0.4 }, 240);
          h.chronicle(ctx, 'era', 'The old highland houses are kept in every office they still '
            + 'hold. Two administrations now collect from the same districts and both send '
            + 'accounts.');
        }),
      },
      {
        label: 'Write to Ctesiphon and ask for a governor from outside',
        tooltip: '+10 influence points eastward and "The Sent Governor" (+6% income, −0.3 unrest everywhere) for fifteen years, with −10 legitimacy: a country that asks to be governed by a stranger has told the stranger something.',
        effects: guard('abna:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HMY', { infl: 10, legitimacy: -10 });
          mod(ctx, 'HMY', 'the_sent_governor', 'The Sent Governor', { incomeMult: 1.06, unrestAll: -0.3 }, 180);
          h.chronicle(ctx, 'diplomacy', 'A governor is asked for from the east. One is sent, '
            + 'eventually, and the request is remembered by everybody in the country who was '
            + 'not consulted about it.');
        }),
      },
    ],
  },

  // ── 583 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529n_the_other_confederation',
    title: 'The Other Confederation',
    desc: 'On the far side of the frontier there is a second Arab confederation doing exactly '
      + 'the same job for the other empire: the king at Hira on the Euphrates, Persian-'
      + 'subsidised, commanding the desert on that side, and the hereditary enemy of the '
      + 'phylarch on this one. The two of them have been raiding each other for sixty years '
      + 'and their two empires have twice gone to war over what started as a quarrel between '
      + 'them about grazing.\n\n'
      + 'Both are now large enough to have their own foreign policy, and this year both '
      + 'empires have started to find their clients inconvenient — the eastern one has just '
      + 'deposed its king at Hira, and the western one has arrested its own phylarch. Two '
      + 'confederations that used to be everybody\'s auxiliaries are discovering, in the same '
      + 'decade, that they are on their own.',
    forTag: 'SAM',
    date: { y: 583, m: 6 },
    when: safeWhen('other', (ctx) => alive(ctx, 'SAM')),
    aiOption: 0,
    historical: 'The Ghassanid phylarch was arrested and his confederation broken up in 582; the Lakhmid kingdom of Hira was suppressed by Khosrow II in 602. Both empires dismantled their Arab clients within twenty years of each other.',
    options: [
      {
        label: 'Keep the roads open to both, and take neither side',
        tooltip: '−35 talents: +14 influence points and "Both Deserts" (+8% income, +7% trade, −0.4 unrest everywhere) for twenty-five years. Two confederations with no patrons are two customers with money and grievances.',
        effects: guard('other:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -35, infl: 14 });
          mod(ctx, 'SAM', 'both_deserts', 'Both Deserts', { incomeMult: 1.08, tradeMult: 1.07, unrestAll: -0.4 }, 300);
          h.setFlag(ctx, 'bothDeserts', true);
          h.chronicle(ctx, 'diplomacy', 'Roads and credit are kept open to both confederations '
            + 'and no side is taken. Within twenty years both of them have been abandoned by '
            + 'their empires and both remember who did not.');
        }),
      },
      {
        label: 'Write down what happens when an empire dismantles its own clients',
        tooltip: '+16 governance points and "The Dismantled Clients" (+5% income, +5% manpower, −0.4 unrest everywhere) for twenty-five years. Two identical decisions on two frontiers in one decade is a pattern, and this community is in the same category of usefulness.',
        effects: guard('other:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { gov: 16 });
          mod(ctx, 'SAM', 'the_dismantled_clients', 'The Dismantled Clients', { incomeMult: 1.05, manpowerMult: 1.05, unrestAll: -0.4 }, 300);
          h.chronicle(ctx, 'era', 'What both empires did to their own Arab clients in the same '
            + 'decade is written down and read to the elders. The word "useful" is discussed '
            + 'at some length.');
        }),
      },
      {
        label: 'Take the trade that both confederations can no longer protect',
        tooltip: '−50 talents to raise our own escorts: "The Escort of the Desert" (+9% income, +6% trade, +4% manpower) for twenty-five years. With both confederations broken, the roads are unprotected and the protecting is a business.',
        effects: guard('other:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -50 });
          mod(ctx, 'SAM', 'the_escort_of_the_desert', 'The Escort of the Desert', { incomeMult: 1.09, tradeMult: 1.06, manpowerMult: 1.04 }, 300);
          h.chronicle(ctx, 'era', 'With both confederations broken, this district raises its own '
            + 'escorts and takes the protection trade. It is the most profitable decade the '
            + 'mountain has had and it is built on somebody else\'s collapse.');
        }),
      },
    ],
  },

  // ── 595 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529n_the_armenians_in_the_province',
    title: 'The Armenians in the Province',
    desc: 'There are Armenian units in the province now and Armenian villages behind them. The '
      + 'empire has been moving them west for a generation — out of a partitioned country, '
      + 'into garrisons where their loyalty is a military question rather than a national one '
      + '— and a good number have been settled here on soldiers\' tenures.\n\n'
      + 'They are Christians of a church the imperial one does not recognise, they keep their '
      + 'own liturgy and their own script, they marry among themselves, and they are '
      + 'exceptionally good soldiers. They are also, in the eyes of every clerk in Caesarea, a '
      + 'community with the wrong doctrine settled on the frontier for its usefulness — which '
      + 'is a description this district has been living under for seventy years, and the '
      + 'Armenians have noticed the resemblance first.',
    forTag: 'SAM',
    date: { y: 595, m: 4 },
    when: safeWhen('armen', (ctx) => alive(ctx, 'SAM')),
    aiOption: 0,
    historical: 'Armenian troops were settled across the eastern provinces after the partition; their non-Chalcedonian church put them in the same administrative category as other imperial dissidents.',
    options: [
      {
        label: 'Make neighbours of them properly: markets, water, and no questions',
        tooltip: '−30 talents: +12 governance points and "The Armenian Villages" (+7% income, +5% manpower, −0.6 unrest everywhere) for twenty-five years. Two communities on the wrong side of the same schedule, sharing a hillside and a market.',
        effects: guard('armen:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -30, gov: 12 });
          mod(ctx, 'SAM', 'the_armenian_villages', 'The Armenian Villages', { incomeMult: 1.07, manpowerMult: 1.05, unrestAll: -0.6 }, 300);
          h.setFlag(ctx, 'armenianVillages', true);
          h.chronicle(ctx, 'era', 'Markets, water and grazing are settled with the Armenian '
            + 'villages without a single question being asked about anybody\'s liturgy.');
        }),
      },
      {
        label: 'Learn from them: how a community keeps a script and an army',
        tooltip: '+16 governance points and "The Armenian Lesson" (+6% income, +5% manpower, −0.4 unrest everywhere) for twenty-five years. A people with its own alphabet, its own church and men under arms has solved a problem this district is living inside.',
        effects: guard('armen:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { gov: 16 });
          mod(ctx, 'SAM', 'the_armenian_lesson', 'The Armenian Lesson', { incomeMult: 1.06, manpowerMult: 1.05, unrestAll: -0.4 }, 300);
          h.chronicle(ctx, 'era', 'How the Armenians hold a script, a church and a muster roll '
            + 'inside somebody else\'s empire is studied and written down. Several of the '
            + 'answers are adopted within the decade.');
        }),
      },
      {
        label: 'Keep well clear of another suspect community',
        tooltip: '+10 governance points and "Two Suspicions Apart" (−0.5 unrest everywhere) for twenty years. Two communities under the same shadow, deliberately not seen together, which is prudent and is exactly what the arrangement was designed to produce.',
        effects: guard('armen:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { gov: 10 });
          mod(ctx, 'SAM', 'two_suspicions_apart', 'Two Suspicions Apart', { unrestAll: -0.5 }, 240);
          h.chronicle(ctx, 'era', 'The district keeps its distance from the Armenian villages. '
            + 'Two suspect communities on one frontier, carefully never in the same room, '
            + 'which is what the arrangement was for.');
        }),
      },
    ],
  },

  // ── 607 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529n_what_is_coming_up_the_road',
    title: 'What Is Coming Up the Road',
    desc: 'The reports from the north have stopped being rumours. The eastern army has taken '
      + 'the frontier fortresses, then Mesopotamia, then most of Armenia, and it has not been '
      + 'checked anywhere; the field army that used to stand between this country and that one '
      + 'has been fighting on the Danube for six years and is not coming back.\n\n'
      + 'Every neighbour on this map is doing the same arithmetic in the same season. The '
      + 'phylarchs have been dismantled, the coast cities have walls that were decorative, the '
      + 'monasteries have no walls at all, and the province has a staff and no soldiers. '
      + 'Whatever arrives will arrive along the coast road in about seven years, and the only '
      + 'question any community here has to answer is what it wants to be holding when it does.',
    forTag: 'SAM',
    date: { y: 607, m: 8 },
    when: safeWhen('coming', (ctx) => alive(ctx, 'SAM')),
    aiOption: 0,
    historical: 'The Persian offensive of 603–619 met almost no field opposition in the Levant; the eastern army had been stripped for the Balkans and the client confederations had been dismantled.',
    options: [
      {
        label: 'Stores, walls and the high villages',
        tooltip: '−75 talents: +12 martial points and "Ready for Whatever Comes" (+1 defence in hill country, +7% manpower, −0.5 unrest everywhere) for twenty years. Grain for three years, the passes posted, and nothing that anybody could call a rebellion.',
        effects: guard('coming:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -75, mar: 12 });
          mod(ctx, 'SAM', 'ready_for_whatever', 'Ready for Whatever Comes', { hillDefBonus: 1, manpowerMult: 1.07, unrestAll: -0.5 }, 240);
          h.setFlag(ctx, 'readyForWhateverComes', true);
          h.chronicle(ctx, 'war', 'Three years of grain into the high villages, the passes '
            + 'posted and the walls repaired. Nothing is declared and everything is ready.');
        }),
      },
      {
        label: 'Send quietly to the east and ask what terms would be offered',
        tooltip: '−30 talents on the messengers: +12 influence points and "The Question Asked Early" (+6% income, −0.4 unrest everywhere) for twenty years, with +1.0 unrest everywhere for six if anybody finds out — and somebody usually does.',
        effects: guard('coming:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -30, infl: 12 });
          mod(ctx, 'SAM', 'question_asked_early', 'The Question Asked Early', { incomeMult: 1.06, unrestAll: 1.0 }, 240);
          h.setFlag(ctx, 'askedEarly', true);
          h.chronicle(ctx, 'diplomacy', 'Messengers go east, quietly, to ask what terms a '
            + 'district like this one would be offered. The answer is encouraging and the '
            + 'errand is the kind that gets written down by somebody.');
        }),
      },
      {
        label: 'Nothing visible. Whatever comes, be what we were',
        tooltip: '+12 legitimacy and "Unchanged" (−0.6 unrest everywhere, +4% income) for twenty years. No stores, no messengers, no walls, and nothing that any of the three possible governments could hold against this district afterwards.',
        effects: guard('coming:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 12 });
          mod(ctx, 'SAM', 'unchanged_529', 'Unchanged', { unrestAll: -0.6, incomeMult: 1.04 }, 240);
          h.chronicle(ctx, 'era', 'Nothing visible is done. No stores are laid in and no letters '
            + 'are sent, so that whoever is governing this district in ten years finds nothing '
            + 'to read.');
        }),
      },
    ],
  },
];
