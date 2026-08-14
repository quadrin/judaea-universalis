// Judaea Universalis — the country, not the court: 143–377 CE (SPEC §247).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// §240 filled the thin decades with the realm's own business — a book, a law,
// a calendar, a school. §241 filled them with the ring of small courts on the
// other side of the border. Both are the STATE: one deciding what it is, the
// other discovering what surrounds it. Measured after both, this chapter is
// still the thinnest in the game by a distance — thirty decades of real room,
// twenty-five of them carrying three dated cards or fewer, across the longest
// window on the board.
//
// The register here is the third one: the country rather than the court. What
// the land grows and what happens when it does not; the trades a province
// lives by; the roads and who is on them; the years the rain fails, the ground
// moves, or the sickness comes up the coast. These are the decades in which
// almost nothing "happens" politically and a great deal happens to people —
// which is precisely why they were empty, and precisely what a chapter three
// centuries long needs in order to feel like three centuries.
//
// Fourteen cards, every one seated in a decade the audit found carrying two or
// three. Sources: the Mishnah and the Yerushalmi on agriculture, prices and
// the sabbatical year; the Beth She'arim and Beth Alpha excavations; the
// Diocletianic Price Edict of 301; Ammianus XXIII.1 and the Cyril letter for
// the earthquake of 363; the Egeria and Bordeaux pilgrim itineraries; the
// Rehob mosaic inscription for the tithing boundaries.

const _warned = new Set();
function warnOnce(key, e) { if (_warned.has(key)) return; _warned.add(key); console.warn('[events_132ce_country] ' + key, e || ''); }
function guard(key, fn) { return function (ctx) { try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); } }; }
function P(ctx) { return ctx.game.playerTag; }
function mod(ctx, id, name, effects, months) {
  ctx.helpers.addTagModifier(ctx, P(ctx), { id, name, months: Number.isFinite(months) ? months : -1, effects });
}

export const EVENTS_132_COUNTRY = [
  {
    id: 'ev132c_the_presses_of_the_second_year',
    title: 'The Presses of the Second Year',
    desc: 'The war took the men and the burning took the terraces, and an olive tree that is cut '
      + 'to the root does not bear for seven years. The second harvest since the fighting stopped '
      + 'is in, and it is a third of what the same ground gave before it.\n\n'
      + 'The presses at Sepphoris are standing idle half the season. The villages want the crown '
      + 'to do what crowns do about this: remit what cannot be paid, or advance the money to '
      + 'replant, or say plainly that neither is coming and let people decide whether to stay.',
    forTag: 'player',
    date: { y: 143, m: 10 },
    aiOption: 1,
    historical: 'Galilean olive culture took roughly a generation to recover from the Bar Kokhba war; the rabbinic sources of the Usha period are unusually preoccupied with debt, tenancy and abandoned fields.',
    options: [
      {
        label: 'Remit the tax on the ruined terraces',
        tooltip: '−40 talents of revenue foregone: −1.2 unrest everywhere and "The Terraces Remitted" (+6% population growth, −0.8 unrest) for twenty years. The cheapest thing a crown can give is the thing it was never going to collect.',
        effects: guard('presses:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, stability: 1 });
          mod(ctx, 'the_terraces_remitted', 'The Terraces Remitted', { growthMult: 1.06, unrestAll: -0.8 }, 240);
          h.chronicle(ctx, 'era', 'The tax on the burnt terraces is remitted until they bear again. '
            + 'The villages of the Galilee stay where they are.');
        }),
      },
      {
        label: 'Advance the money to replant, against the future crop',
        tooltip: '−70 talents: "The Replanting" (+11% income, +7% population growth) for twenty-five years. Seven years of nothing, and then a century of oil.',
        effects: guard('presses:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70 });
          mod(ctx, 'the_replanting', 'The Replanting', { incomeMult: 1.11, growthMult: 1.07 }, 300);
          h.setFlag(ctx, 'terracesReplanted', true);
          h.chronicle(ctx, 'era', 'The crown advances the price of the saplings against the crop '
            + 'they will bear in seven years. It is the longest loan anybody here has made.');
        }),
      },
      {
        label: 'Say plainly that nothing is coming',
        tooltip: '+25 talents kept: +1.5 unrest and "The Year They Were Told" (−5% population growth) for fifteen years. Some of them go to the coast, and some of them go further than that.',
        effects: guard('presses:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 25, stability: -1 });
          mod(ctx, 'the_year_they_were_told', 'The Year They Were Told', { growthMult: 0.95, unrestAll: 1.5 }, 180);
          h.chronicle(ctx, 'era', 'The crown says there is no relief. The road to the coast carries '
            + 'families all that winter, and not all of them stop at the coast.');
        }),
      },
    ],
  },
  {
    id: 'ev132c_the_glassmakers_of_the_valley',
    title: 'The Glassmakers of the Valley',
    desc: 'The sand at the mouth of the Belus makes glass that nothing else in the world makes, '
      + 'and the furnaces along that coast have been turning it into cups and windows for as long '
      + 'as anyone has been writing things down. It is the one trade here that sells to the whole '
      + 'Mediterranean rather than to the next village.\n\n'
      + 'The masters want a charter: the right to hold the sand, fix what an apprenticeship is, '
      + 'and refuse the trade to anyone who has not served one. It would make them rich and it '
      + 'would make the crown a partner in it.',
    forTag: 'player',
    date: { y: 156, m: 4 },
    aiOption: 0,
    historical: 'The sands near the Belus (Na\'aman) supplied the eastern glass industry for centuries; Roman-period furnaces have been excavated along the Galilean coast and at Beth She\'arim.',
    options: [
      {
        label: 'Grant the charter and take a share',
        tooltip: '+50 talents in fees: "The Glass Charter" (+9% trade, +7% income) permanently. A guild is a tax you only have to collect once.',
        effects: guard('glass:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 50, gov: 5 });
          mod(ctx, 'the_glass_charter', 'The Glass Charter', { tradeMult: 1.09, incomeMult: 1.07 });
          h.setFlag(ctx, 'glassCharter', true);
          h.chronicle(ctx, 'era', 'The glassmakers of the valley are chartered, and the crown takes '
            + 'a share of every cup that leaves for Alexandria and Rome.');
        }),
      },
      {
        label: 'Keep the sand open to anybody who can work it',
        tooltip: '"The Open Sand" (+5% trade, +8% population growth, −0.5 unrest) permanently. A dozen small furnaces pay less than one great one and employ four times as many people.',
        effects: guard('glass:1', (ctx) => {
          const h = ctx.helpers;
          mod(ctx, 'the_open_sand', 'The Open Sand', { tradeMult: 1.05, growthMult: 1.08, unrestAll: -0.5 });
          h.chronicle(ctx, 'era', 'The sand stays open. The coast fills with small furnaces and the '
            + 'families that keep them.');
        }),
      },
    ],
  },
  {
    id: 'ev132c_what_the_rain_did_not_do',
    title: 'What the Rain Did Not Do',
    desc: 'The early rain did not come in Marheshvan and the late rain did not come at all. This '
      + 'is the second such year running, which is the point at which the granaries that carried '
      + 'the country through the first one are empty.\n\n'
      + 'The courts are being asked to declare a public fast, which is what the Law prescribes and '
      + 'what everyone expects. The treasury is being asked for grain from Egypt, which is what '
      + 'would actually feed people. The two are not the same request and only one of them is free.',
    forTag: 'player',
    date: { y: 192, m: 11 },
    aiOption: 0,
    historical: 'Drought and its liturgical response (the public fasts of Mishnah Ta\'anit) are among the best-documented recurring crises of Roman Palestine; grain was imported from Egypt in the worst years.',
    options: [
      {
        label: 'Declare the fast, and buy the Egyptian grain',
        tooltip: '−85 talents: +1 stability, −2 unrest everywhere and "The Year of the Grain Ships" (+0.15 legitimacy a month, +5% population growth) for twenty years. Both answers, and the country notices which one arrived by sea.',
        effects: guard('rain:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -85, stability: 1, legitimacy: 6 });
          mod(ctx, 'the_year_of_the_grain_ships', 'The Year of the Grain Ships', { legitimacyAdd: 0.15, growthMult: 1.05, unrestAll: -2 }, 240);
          h.chronicle(ctx, 'era', 'The fast is called and the grain ships are paid for out of the '
            + 'treasury. The country is told to pray and is also fed.');
        }),
      },
      {
        label: 'Declare the fast only',
        tooltip: 'Free: +0.5 unrest and "The Fast of the Second Year" (+4% population growth from the rains that eventually come) for ten years. It is what the Law asks. It is not what the granary asks.',
        effects: guard('rain:1', (ctx) => {
          const h = ctx.helpers;
          mod(ctx, 'the_fast_of_the_second_year', 'The Fast of the Second Year', { growthMult: 1.04, unrestAll: 0.5 }, 120);
          h.chronicle(ctx, 'era', 'The fast is called. The rain comes the following winter, which '
            + 'is either an answer or a coincidence, depending on who is asked.');
        }),
      },
      {
        label: 'Open the crown\'s own stores at a fixed price',
        tooltip: '−55 talents: −1.5 unrest everywhere and "The Fixed Price" (+8% income, −0.6 unrest) for fifteen years. The merchants will remember it, and so will everybody who ate.',
        effects: guard('rain:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, stability: 1 });
          mod(ctx, 'the_fixed_price', 'The Fixed Price', { incomeMult: 1.08, unrestAll: -0.6 }, 180);
          h.setFlag(ctx, 'grainPriceFixed', true);
          h.chronicle(ctx, 'era', 'The crown\'s stores are opened at a price fixed by decree. The '
            + 'grain factors petition against it for a decade and sell at it anyway.');
        }),
      },
    ],
  },
  {
    id: 'ev132c_the_citizenship_that_arrived_by_post',
    title: 'The Citizenship That Arrived by Post',
    desc: 'An edict from Rome makes every free man in the empire a citizen. There was no petition '
      + 'for it, no delegation, no argument won. It simply arrived, and the reason everyone gives '
      + 'is the true one: citizens pay the inheritance tax and non-citizens do not.\n\n'
      + 'It changes what a court is. Cases that were ours because the parties were not citizens '
      + 'are now Roman cases by right, and any litigant who prefers Roman law can now simply have '
      + 'it. Our courts keep only what people choose to bring them.',
    forTag: 'player',
    date: { y: 213, m: 3 },
    aiOption: 1,
    historical: 'The Constitutio Antoniniana of 212 extended citizenship to nearly all free inhabitants of the empire, with a fiscal motive contemporaries noted openly. Jewish courts thereafter operated largely by consent of the parties.',
    options: [
      {
        label: 'Make ours the court people choose: faster, cheaper, and in their own tongue',
        tooltip: '−30 talents: +10 governance points and "The Court They Choose" (−7% cost of governing, +0.12 legitimacy a month) permanently. A jurisdiction that survives on being better than the alternative.',
        effects: guard('citizen:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, gov: 10 });
          mod(ctx, 'the_court_they_choose', 'The Court They Choose', { adminMult: 0.93, legitimacyAdd: 0.12 });
          h.setFlag(ctx, 'courtByConsent', true);
          h.chronicle(ctx, 'era', 'The courts are reformed to compete: heard within the month, '
            + 'argued in Aramaic, and cheap. People keep coming to them for three hundred years.');
        }),
      },
      {
        label: 'Take the citizenship for what it is worth and press for offices',
        tooltip: '+35 talents and +8 influence points: "Citizens of the Empire" (+7% income, +5% trade) for twenty-five years. Every road in the world is now open to a man from here.',
        effects: guard('citizen:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 35, infl: 8 });
          mod(ctx, 'citizens_of_the_empire', 'Citizens of the Empire', { incomeMult: 1.07, tradeMult: 1.05 }, 300);
          h.chronicle(ctx, 'era', 'The new citizenship is used rather than mourned. Within a '
            + 'generation there are men from this country in offices from Antioch to Carthage.');
        }),
      },
      {
        label: 'Warn that a tax is what this is, and prepare for it',
        tooltip: '−20 talents: +1 stability and "The Inheritance Rolls" (−5% cost of governing, +6% income) for twenty years. Knowing what the bill is before it comes is worth something.',
        effects: guard('citizen:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -20, stability: 1, gov: 4 });
          mod(ctx, 'the_inheritance_rolls', 'The Inheritance Rolls', { adminMult: 0.95, incomeMult: 1.06 }, 240);
          h.chronicle(ctx, 'era', 'The country is told plainly what the grant costs and the rolls '
            + 'are made ready. Nobody is surprised by the assessment, which is itself unusual.');
        }),
      },
    ],
  },
  {
    id: 'ev132c_the_coin_that_stopped_meaning_anything',
    title: 'The Coin That Stopped Meaning Anything',
    desc: 'The denarius has been getting quietly worse for fifty years and this is the year the '
      + 'country notices all at once. The silver in it is a wash over copper. Rents fixed in coin '
      + 'a decade ago are worth a tenth of what they were; rents fixed in wheat are worth exactly '
      + 'what they always were.\n\n'
      + 'The courts are being asked to rule on which debts are payable in what. It is the single '
      + 'most consequential economic question anybody here will decide this century, and it will '
      + 'be decided in a study house.',
    forTag: 'player',
    date: { y: 238, m: 7 },
    aiOption: 0,
    historical: 'The third-century debasement pushed the eastern provinces toward payment in kind; rabbinic and papyrological sources from the period show contracts increasingly written in produce rather than coin.',
    options: [
      {
        label: 'Rule that debts are owed in produce, not in coin',
        tooltip: '"The Wheat Standard" (+13% income, −1 unrest) for thirty years. A country that has stopped trusting the coin can still count sacks.',
        effects: guard('coin:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { stability: 1, gov: 6 });
          mod(ctx, 'the_wheat_standard', 'The Wheat Standard', { incomeMult: 1.13, unrestAll: -1 }, 360);
          h.setFlag(ctx, 'wheatStandard', true);
          h.chronicle(ctx, 'era', 'The courts rule that an obligation is owed in the thing, not in '
            + 'the coin. The country goes on eating through the worst currency in Roman history.');
        }),
      },
      {
        label: 'Hold to the coin and let the debts fall where they fall',
        tooltip: '+60 talents to debtors\' relief and creditors\' fury: +2 unrest and "The Debts Dissolved" (+9% population growth, −4% income) for twenty years. A whole generation of debt evaporates, and so does a whole generation of savings.',
        effects: guard('coin:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 60, stability: -1 });
          mod(ctx, 'the_debts_dissolved', 'The Debts Dissolved', { growthMult: 1.09, incomeMult: 0.96, unrestAll: 2 }, 240);
          h.chronicle(ctx, 'era', 'The coin is held to and the debts are paid in it. Half the '
            + 'country is freed and the other half is ruined, in the same season.');
        }),
      },
      {
        label: 'Let each contract say for itself, and write the forms',
        tooltip: '−25 talents: +8 governance points and "The Written Form" (−8% cost of governing, +6% trade) permanently. The dullest answer, and the one that is still in use fifteen centuries later.',
        effects: guard('coin:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -25, gov: 8 });
          mod(ctx, 'the_written_form', 'The Written Form', { adminMult: 0.92, tradeMult: 1.06 });
          h.chronicle(ctx, 'era', 'Standard forms of contract are published, naming what is owed '
            + 'and in what. They outlive the empire that made them necessary.');
        }),
      },
    ],
  },
  {
    id: 'ev132c_the_sickness_up_the_coast',
    title: 'The Sickness Up the Coast',
    desc: 'It came off the ships at Alexandria and it has been walking north along the coast road '
      + 'for a year. Caesarea has it now. The reports from Egypt say a third in some towns, and '
      + 'the reports are the sort that get worse when they are checked.\n\n'
      + 'There is no medicine for it. There are only decisions about roads: whether to shut them, '
      + 'which is ruinous and works, or keep them open, which is survivable and does not.',
    forTag: 'player',
    date: { y: 249, m: 5 },
    aiOption: 0,
    historical: 'The Plague of Cyprian (c. 249–262) spread from Egypt through the eastern provinces; ancient accounts describe mortality high enough to depopulate towns and disrupt the army.',
    options: [
      {
        label: 'Shut the coast road and quarter the sick outside the towns',
        tooltip: '−60 talents and −8% trade for fifteen years: "The Road Shut" (−1.5 unrest, +7% population growth) for twenty-five years. Poorer, and more of the country is alive at the end of it.',
        effects: guard('sick:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, stability: 1 });
          mod(ctx, 'the_road_shut', 'The Road Shut', { growthMult: 1.07, tradeMult: 0.92, unrestAll: -1.5 }, 300);
          h.setFlag(ctx, 'plagueRoadShut', true);
          h.chronicle(ctx, 'era', 'The coast road is shut and the sick are quartered beyond the '
            + 'walls. The towns of the interior come through the plague years nearly whole.');
        }),
      },
      {
        label: 'Keep the roads open and pay for the burying',
        tooltip: '−45 talents: −8% population growth for twenty years and "They Buried Their Own" (+0.18 legitimacy a month, −1 unrest) for thirty. The trade survives. Fewer people do.',
        effects: guard('sick:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, legitimacy: 8 });
          mod(ctx, 'they_buried_their_own', 'They Buried Their Own', { growthMult: 0.92, legitimacyAdd: 0.18, unrestAll: -1 }, 360);
          h.chronicle(ctx, 'era', 'The roads stay open and the burial societies are paid out of '
            + 'the treasury. What the country remembers is who came for the bodies.');
        }),
      },
    ],
  },
  {
    id: 'ev132c_the_linen_of_the_valley_towns',
    title: 'The Linen of the Valley Towns',
    desc: 'Scythopolis linen is the finest in the empire and the whole valley lives on it — the '
      + 'flax in the bottomland, the retting pits, the looms in every second house, and the '
      + 'factors who take it to Antioch and Rome.\n\n'
      + 'The imperial treasury has decided to make the good linen a state monopoly, run out of '
      + 'imperial weaving houses. Our weavers will be permitted to work for the state at the '
      + 'state\'s price. There is a delegation at the door asking what the crown intends to do '
      + 'about it, which is a polite way of asking whether the answer is anything.',
    forTag: 'player',
    date: { y: 276, m: 9 },
    aiOption: 1,
    historical: 'Scythopolis (Beth Shean) linen was famous enough to be priced separately in the Diocletianic Edict; late Roman state weaving houses (gynaecea) did absorb much of the eastern textile trade.',
    options: [
      {
        label: 'Petition hard, and pay for the petition',
        tooltip: '−50 talents and 10 influence points: "The Weavers\' Exemption" (+10% trade, +7% income) for twenty-five years. Governors can be persuaded, and this one has a price.',
        effects: guard('linen:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, infl: -10 });
          mod(ctx, 'the_weavers_exemption', 'The Weavers\' Exemption', { tradeMult: 1.10, incomeMult: 1.07 }, 300);
          h.chronicle(ctx, 'diplomacy', 'The valley weavers are exempted from the imperial houses, '
            + 'at a price paid quietly and in full.');
        }),
      },
      {
        label: 'Let the monopoly take the fine cloth and build the common trade',
        tooltip: '"The Common Cloth" (+6% trade, +9% population growth, −0.5 unrest) permanently. The state takes the luxury and leaves the thing everybody actually wears.',
        effects: guard('linen:1', (ctx) => {
          const h = ctx.helpers;
          mod(ctx, 'the_common_cloth', 'The Common Cloth', { tradeMult: 1.06, growthMult: 1.09, unrestAll: -0.5 });
          h.chronicle(ctx, 'era', 'The fine linen goes to the imperial houses. The valley turns to '
            + 'the ordinary cloth of the whole east, and does better out of it than anyone expected.');
        }),
      },
      {
        label: 'Move the trade: buy looms in towns the edict does not name',
        tooltip: '−65 talents: "The Looms Moved" (+12% trade, +5% income) for thirty years, and +1 unrest for fifteen while the valley towns hollow out. What the valley loses, the hills gain.',
        effects: guard('linen:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -65 });
          mod(ctx, 'the_looms_moved', 'The Looms Moved', { tradeMult: 1.12, incomeMult: 1.05, unrestAll: 1 }, 360);
          h.setFlag(ctx, 'loomsMoved', true);
          h.chronicle(ctx, 'era', 'Looms are bought in a dozen towns the edict never heard of. The '
            + 'valley empties a little and the hill villages fill.');
        }),
      },
    ],
  },
  {
    id: 'ev132c_the_edict_of_prices',
    title: 'The Edict of Prices',
    desc: 'The emperor has published a schedule of maximum prices for everything sold in the '
      + 'empire — a thousand items, from wheat to a lion, with death for exceeding them. It is '
      + 'carved on stone in every market square, ours included.\n\n'
      + 'Within a season the goods have gone from the stalls to the back rooms. The schedule is '
      + 'the law and the back room is the market, and every magistrate in the country now has to '
      + 'decide which of the two he is enforcing.',
    forTag: 'player',
    date: { y: 302, m: 6 },
    aiOption: 1,
    historical: 'Diocletian\'s Edict on Maximum Prices (301) was published across the east and widely evaded; Lactantius records goods vanishing from markets, and it was effectively abandoned within a few years.',
    options: [
      {
        label: 'Enforce it to the letter',
        tooltip: '+40 talents in fines: +2 unrest and "The Letter of the Edict" (−9% trade) for twelve years. The stone says what the price is. The market says what the price is.',
        effects: guard('edict:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 40, stability: -1 });
          mod(ctx, 'the_letter_of_the_edict', 'The Letter of the Edict', { tradeMult: 0.91, unrestAll: 2 }, 144);
          h.chronicle(ctx, 'era', 'The price edict is enforced to the letter. The markets empty, '
            + 'the fines are collected, and everything is bought at night.');
        }),
      },
      {
        label: 'Enforce it on the grain and ignore the rest',
        tooltip: '−1 unrest and "Bread at the Stone Price" (+7% income, −0.8 unrest) for twenty years. The one price a riot is ever about.',
        effects: guard('edict:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { stability: 1, gov: 4 });
          mod(ctx, 'bread_at_the_stone_price', 'Bread at the Stone Price', { incomeMult: 1.07, unrestAll: -0.8 }, 240);
          h.chronicle(ctx, 'era', 'The edict is kept for bread and quietly forgotten for everything '
            + 'else. It is the arrangement the whole east arrives at within a year.');
        }),
      },
      {
        label: 'Let it be a dead letter from the first week',
        tooltip: '"The Stone Nobody Reads" (+9% trade, +5% income) for twenty years, −0.5 legitimacy at court for defying a published edict. The traders notice, and so does the governor.',
        effects: guard('edict:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: -5 });
          mod(ctx, 'the_stone_nobody_reads', 'The Stone Nobody Reads', { tradeMult: 1.09, incomeMult: 1.05 }, 240);
          h.chronicle(ctx, 'era', 'The price stones are put up and never enforced. The markets here '
            + 'stay full while the empire\'s go empty.');
        }),
      },
    ],
  },
  {
    id: 'ev132c_the_pilgrims_start_arriving',
    title: 'The Pilgrims Start Arriving',
    desc: 'They come off the ships at Caesarea with itineraries copied from other people\'s '
      + 'itineraries, and they want to be shown places. Not our places — theirs: a tomb, a hill, '
      + 'a cave at Bethlehem, a pool. The emperor\'s mother came, and building followed her, and '
      + 'now everyone is coming.\n\n'
      + 'It is a trade. Beds, mules, guides, food, the copying of itineraries, the selling of '
      + 'things people take home. Whether it is a trade this country wants to be in is a separate '
      + 'question, and it is being asked loudly.',
    forTag: 'player',
    date: { y: 335, m: 4 },
    aiOption: 0,
    historical: 'Christian pilgrimage to Palestine began in earnest after Constantine\'s building programme and Helena\'s visit; the Bordeaux Itinerary dates to 333 and describes an established route.',
    options: [
      {
        label: 'Take the trade: beds, mules, guides, and a toll on the road',
        tooltip: '+55 talents: "The Pilgrim Road" (+11% trade, +6% income) permanently, and +0.5 unrest for fifteen years from those who think it shameful. The road pays whoever holds it, whatever it is a road to.',
        effects: guard('pilg:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 55 });
          mod(ctx, 'the_pilgrim_road', 'The Pilgrim Road', { tradeMult: 1.11, incomeMult: 1.06 });
          mod(ctx, 'the_shame_of_the_road', 'The Shame of the Road', { unrestAll: 0.5 }, 180);
          h.setFlag(ctx, 'pilgrimTradeTaken', true);
          h.chronicle(ctx, 'era', 'The crown takes the pilgrim trade: the beds, the mules, the '
            + 'guides and the toll. It becomes the steadiest income the country has.');
        }),
      },
      {
        label: 'Keep our own people out of it entirely',
        tooltip: '−1 unrest everywhere and "The Separate Road" (+0.14 legitimacy a month, −4% trade) for thirty years. There is a line, and this crown draws it where its own people asked it to.',
        effects: guard('pilg:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { stability: 1, legitimacy: 5 });
          mod(ctx, 'the_separate_road', 'The Separate Road', { legitimacyAdd: 0.14, tradeMult: 0.96, unrestAll: -1 }, 360);
          h.chronicle(ctx, 'era', 'The pilgrim traffic is left to those who want it. The crown '
            + 'takes nothing from it and is thanked for taking nothing.');
        }),
      },
      {
        label: 'Sell them the guiding, and make sure of what they are told',
        tooltip: '+30 talents: "Whose Country They See" (+7% trade, +0.1 legitimacy a month) for thirty years. Every pilgrim goes home with a story about this place, and somebody is going to tell it to them.',
        effects: guard('pilg:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 30, infl: 6 });
          mod(ctx, 'whose_country_they_see', 'Whose Country They See', { tradeMult: 1.07, legitimacyAdd: 0.1 }, 360);
          h.chronicle(ctx, 'era', 'The guiding is licensed and the guides are ours. What Europe '
            + 'learns about this country for two centuries, it learns from them.');
        }),
      },
    ],
  },
  {
    id: 'ev132c_the_ground_moved',
    title: 'The Ground Moved',
    desc: 'It came in the night and it took a third of the towns along the rift with it — '
      + 'Sepphoris, Tiberias, the valley towns, the coast as far as Beirut. Whole streets are '
      + 'lying in the street. The lake came up over its own shore and went back.\n\n'
      + 'What is left is the arithmetic of rebuilding: what to rebuild first, with what, and '
      + 'whether to rebuild some of it at all. There are towns on that fault that have now fallen '
      + 'twice in living memory.',
    forTag: 'player',
    date: { y: 363, m: 5 },
    aiOption: 0,
    historical: 'The earthquake of 18-19 May 363 devastated Galilee and the rift valley, damaging some two dozen cities. It also ended Julian\'s project to rebuild the Temple, which contemporaries on all sides read as a sign.',
    options: [
      {
        label: 'Rebuild the towns where they stood',
        tooltip: '−90 talents: +1 stability and "Where They Stood" (+8% population growth, +0.12 legitimacy a month) for thirty years. It is not where an engineer would put them. It is where the graves are.',
        effects: guard('quake:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -90, stability: 1, legitimacy: 8 });
          mod(ctx, 'where_they_stood', 'Where They Stood', { growthMult: 1.08, legitimacyAdd: 0.12 }, 360);
          h.chronicle(ctx, 'era', 'The fallen towns are rebuilt on their own foundations. The '
            + 'masons say what masons say about it and are overruled by everybody else.');
        }),
      },
      {
        label: 'Rebuild off the fault, and move what can be moved',
        tooltip: '−110 talents: "Off the Fault" (+10% income, +6% population growth) permanently, and +1.5 unrest for fifteen years from those made to move. The right answer, and the one nobody thanks a crown for.',
        effects: guard('quake:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -110 });
          mod(ctx, 'off_the_fault', 'Off the Fault', { incomeMult: 1.10, growthMult: 1.06 });
          mod(ctx, 'made_to_move', 'Made to Move', { unrestAll: 1.5 }, 180);
          h.setFlag(ctx, 'rebuiltOffFault', true);
          h.chronicle(ctx, 'era', 'The rebuilding is moved off the rift. Two generations later '
            + 'nobody remembers why the old towns are half a mile from the new ones.');
        }),
      },
      {
        label: 'Rebuild the synagogues first, and let the houses follow',
        tooltip: '−70 talents: +0.2 legitimacy a month and "The Floors They Laid" (+9% conversion resistance, −1 unrest) for forty years. The mosaic floors of this century are laid in the years after this.',
        effects: guard('quake:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, legitimacy: 10 });
          mod(ctx, 'the_floors_they_laid', 'The Floors They Laid', { convertMult: 0.91, legitimacyAdd: 0.2, unrestAll: -1 }, 480);
          h.chronicle(ctx, 'era', 'The synagogues go up before the houses. The floors laid in those '
            + 'years — the zodiacs, the ark, the Hebrew and the Greek together — outlast everything '
            + 'built around them.');
        }),
      },
    ],
  },
  {
    id: 'ev132c_the_boundaries_of_the_tithe',
    title: 'The Boundaries of the Tithe',
    desc: 'Which fields owe the tithe depends on which fields are the Land, and the answer has '
      + 'never been written down in a way two villages can agree on. It matters to every farmer '
      + 'on a border: a field on one side owes a portion of everything it grows, and a field a '
      + 'hundred paces away owes nothing.\n\n'
      + 'The proposal is to settle it — survey the boundary, name the towns one by one, and carve '
      + 'the list where everyone can read it. It will make enemies in every town that ends up on '
      + 'the wrong side of a line.',
    forTag: 'player',
    date: { y: 378, m: 8 },
    aiOption: 0,
    historical: 'The Rehob mosaic inscription — the longest ancient Hebrew inscription known — lists the halakhic boundaries of the Land and the tithing status of named towns, and dates to roughly this period.',
    options: [
      {
        label: 'Survey it and carve the list',
        tooltip: '−45 talents: +10 governance points and "The Boundaries Carved" (−9% cost of governing, +8% income) permanently. Two hundred years of argument, ended by a floor.',
        effects: guard('tithe:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, gov: 10 });
          mod(ctx, 'the_boundaries_carved', 'The Boundaries Carved', { adminMult: 0.91, incomeMult: 1.08 });
          h.setFlag(ctx, 'titheBoundariesCarved', true);
          h.chronicle(ctx, 'era', 'The boundaries of the tithe are surveyed, named town by town, '
            + 'and carved in the floor of the synagogue at Rehob, where they can still be read.');
        }),
      },
      {
        label: 'Rule generously: the Land is where our people farm it',
        tooltip: '+9% income and −1.5 unrest for twenty-five years, −4 governance points for a rule nobody can quite cite. Generous, popular, and impossible to apply twice the same way.',
        effects: guard('tithe:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: -4, stability: 1 });
          mod(ctx, 'the_generous_boundary', 'The Generous Boundary', { incomeMult: 1.09, unrestAll: -1.5 }, 300);
          h.chronicle(ctx, 'era', 'The boundary is ruled generously and vaguely. Every village is '
            + 'happy and no two courts apply it alike.');
        }),
      },
      {
        label: 'Leave it to each town\'s own court',
        tooltip: '+5% income and "Each Town Its Own" (−4% cost of governing) for twenty years, +0.8 unrest from the border villages. The oldest answer: let the people who have to live next to each other work it out.',
        effects: guard('tithe:2', (ctx) => {
          const h = ctx.helpers;
          mod(ctx, 'each_town_its_own', 'Each Town Its Own', { incomeMult: 1.05, adminMult: 0.96, unrestAll: 0.8 }, 240);
          h.chronicle(ctx, 'era', 'The tithing boundary is left to each town. The disputes run for '
            + 'another century and are mostly settled over walls rather than in courts.');
        }),
      },
    ],
  },
];
