// Judaea Universalis — the other side of the line: 145–430 CE (SPEC §241).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// This chapter is three hundred years long and the emptiest in the game: even
// after §240 it has decades with one dated card in them and three with none.
// It is also the chapter in which the neighbours change more completely than
// anywhere else on this map. It opens with a belt of small buffer kingdoms
// between two empires — Edessa, Hatra, Adiabene, Palmyra — every one of them
// with a Jewish population and a policy of its own, and it ends with all of
// them gone, replaced by a Persia that is a rival civilisation, an Arab
// federate system that is becoming a nation, a bishop in every city who is the
// civic power, and two Christian kingdoms on the Red Sea.
//
// Seventeen cards, weighted deliberately at the decades that were empty. The
// register is the ring rather than the realm: what is on the other side of
// each border, and what this court does about it.
//
// Sources: Cassius Dio LXVIII and LXXV–LXXX for Hatra, Edessa and the Severan
// charters; the Palmyrene tariff and caravan texts; al-Tabari and the Paikuli
// inscription for Ardashir and the end of the buffer kingdoms; the Notitia and
// the Strata Diocletiana for the desert road; Socrates and Rufinus for Mavia
// and for Aksum; the Himyarite royal inscriptions for the God of Israel.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_132ce_neighbours] ' + key, e || '');
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

export const EVENTS_132_NEIGHBOURS = [

  // ── 145 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132n_the_kingdoms_beyond_the_river',
    title: 'The Kingdoms Beyond the River',
    desc: 'Between the two empires there is a belt of small kingdoms that have made a career of '
      + 'the gap: Edessa on the crossing, Hatra in the desert with walls nobody has breached, '
      + 'Adiabene on the Tigris with a royal house that converted to our faith a century ago '
      + 'and has been sending gifts to a Temple that no longer exists ever since.\n\n'
      + 'Each of them has a Jewish population, a working relationship with both empires and no '
      + 'illusions about the arrangement lasting. What they are proposing is a correspondence '
      + 'of the kind small powers keep: who is moving, what is being demanded, and what each '
      + 'of them intends to do when it stops being possible to be in the middle.',
    forTag: 'player',
    date: { y: 145, m: 6 },
    aiOption: 0,
    historical: 'Osrhoene, Hatra and Adiabene held the ground between Rome and Parthia for two centuries. All three were absorbed by the Sasanians within a generation of 224.',
    options: [
      {
        label: 'Join the correspondence',
        tooltip: '−35 talents on couriers: +14 influence points and "The Buffer Correspondence" (+7% income, +5% manpower) for thirty years. Four small courts telling each other what is coming, in a century when that is the only intelligence anybody has.',
        effects: guard('buffer:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, infl: 14 });
          mod(ctx, 'the_buffer_correspondence', 'The Buffer Correspondence', { incomeMult: 1.07, manpowerMult: 1.05 }, 360);
          h.setFlag(ctx, 'bufferCorrespondence', true);
          h.chronicle(ctx, 'diplomacy', 'A standing correspondence is joined with the courts of '
            + 'the river belt. For eighty years this country hears about eastern wars before '
            + 'the province does.');
        }),
      },
      {
        label: 'Take the Adiabene connection only, and make it a road',
        tooltip: '−45 talents: +12 influence points and "The Tigris Road" (+9% income, +7% trade) for thirty years. One royal house that shares our faith, and everything that travels with a shared faith.',
        effects: guard('buffer:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, infl: 12 });
          mod(ctx, 'the_tigris_road', 'The Tigris Road', { incomeMult: 1.09, tradeMult: 1.07 }, 360);
          h.setFlag(ctx, 'tigrisRoad', true);
          h.chronicle(ctx, 'diplomacy', 'The road to Adiabene is made a standing one: students, '
            + 'money, letters and goods, both ways, every season the passes are open.');
        }),
      },
      {
        label: 'Nothing across the frontier in writing',
        tooltip: '+12 governance points and "Nothing Written Eastward" (−0.5 unrest everywhere) for twenty years. A letter to a court beyond the river is an exhibit at somebody\'s treason trial, and this court declines to write one.',
        effects: guard('buffer:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'nothing_written_eastward', 'Nothing Written Eastward', { unrestAll: -0.5 }, 240);
          h.chronicle(ctx, 'era', 'The eastern proposals are declined and nothing is written '
            + 'across the frontier. It is the safe answer and it is paid for in surprises.');
        }),
      },
    ],
  },

  // ── 152 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132n_the_roads_reopened',
    title: 'The Roads Reopened',
    desc: 'The Greek cities of the plateau and the coast have decided the war is over, which is '
      + 'a commercial judgement rather than a political one, and their caravans are moving '
      + 'through the hill country again for the first time in twenty years. The tolls have not '
      + 'been renegotiated since before the rising and neither has anything else.\n\n'
      + 'What they want is the old arrangement back and no discussion of the interval. What '
      + 'the hill villages want is compensation for a decade of requisition that these same '
      + 'cities supplied the requisitioning for. Both positions are entirely reasonable and '
      + 'the only person who can hold the two of them in the same room is whoever currently '
      + 'speaks for this country, which is not a position anybody envies.',
    forTag: 'player',
    date: { y: 152, m: 9 },
    aiOption: 1,
    historical: 'The Decapolis and coastal cities resumed normal trade with the interior within a generation of the Bar Kokhba war; the rabbinic sources of the period argue constantly about dealings with them.',
    options: [
      {
        label: 'The old tolls, and no discussion of the interval',
        tooltip: '+40 talents and "The Roads Open" (+8% income, +6% trade) for twenty years, with +0.7 unrest everywhere for eight from villages that were asked to forget something.',
        effects: guard('roads:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 40 });
          mod(ctx, 'the_roads_open', 'The Roads Open', { incomeMult: 1.08, tradeMult: 1.06, unrestAll: 0.7 }, 240);
          h.chronicle(ctx, 'era', 'The roads reopen on the old tolls with nothing said about the '
            + 'twenty years in between. The trade is worth it and the silence is noted in every '
            + 'village it passes through.');
        }),
      },
      {
        label: 'Reopen them, and take the compensation out of the tolls',
        tooltip: '+15 governance points and "The Toll That Pays" (+6% income, +5% growth, −0.6 unrest everywhere) for twenty-five years. Slower to agree, and the hill villages see the money.',
        effects: guard('roads:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15 });
          mod(ctx, 'the_toll_that_pays', 'The Toll That Pays', { incomeMult: 1.06, growthMult: 1.05, unrestAll: -0.6 }, 300);
          h.setFlag(ctx, 'tollCompensation', true);
          h.chronicle(ctx, 'era', 'The roads reopen with a surcharge that goes to the villages '
            + 'they run through. It takes two years to agree and it holds for fifty.');
        }),
      },
      {
        label: 'Keep the hill country closed to them',
        tooltip: '+10 legitimacy and "The Closed Hills" (−0.7 unrest everywhere, +4% manpower) for fifteen years, with −8% income. The caravans go round by the coast and the hill country stays poor and unvisited.',
        effects: guard('roads:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10 });
          mod(ctx, 'the_closed_hills', 'The Closed Hills', { unrestAll: -0.7, manpowerMult: 1.04, incomeMult: 0.92 }, 180);
          h.chronicle(ctx, 'era', 'The hill roads stay shut to the cities. The caravans go round '
            + 'by the coast, and the interior is poorer and left alone.');
        }),
      },
    ],
  },

  // ── 155 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132n_the_desert_city',
    title: 'The Desert City',
    desc: 'Palmyra is at its height and the height is remarkable. An oasis with a colonnaded '
      + 'street a mile long, a tariff law cut in stone in Greek and Aramaic, caravan-'
      + 'protection troops that escort merchants to the Gulf, and merchant families whose '
      + 'agents sit in Egypt, in Rome, and on the Persian side of a frontier their own empire '
      + 'is at war across.\n\n'
      + 'They speak a dialect close enough to ours to be read without a translator, and their '
      + 'proposal is technical: reciprocal enforcement of contracts, so that a debt incurred '
      + 'in one jurisdiction can be collected in the other. It sounds like nothing. It is the '
      + 'single most useful thing one commercial community can offer another, and almost '
      + 'nobody in this century has it.',
    forTag: 'player',
    date: { y: 155, m: 4 },
    aiOption: 0,
    historical: 'Palmyra\'s bilingual tariff and its caravan network reached from Egypt to the Persian Gulf. Its Aramaic was mutually intelligible with the Jewish Aramaic of the period.',
    options: [
      {
        label: 'Reciprocal enforcement, both ways',
        tooltip: '+16 governance points and "The Debt Collected Anywhere" (+10% income, +8% trade) for thirty years. A contract that is good in two jurisdictions is worth about double a contract that is good in one.',
        effects: guard('desert:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 16 });
          mod(ctx, 'debt_collected_anywhere', 'The Debt Collected Anywhere', { incomeMult: 1.10, tradeMult: 1.08 }, 360);
          h.setFlag(ctx, 'reciprocalEnforcement', true);
          h.chronicle(ctx, 'diplomacy', 'Reciprocal enforcement of contracts is agreed with '
            + 'Palmyra. A merchant of either community can now sue in the other, and the '
            + 'volume of business doubles inside a decade.');
        }),
      },
      {
        label: 'Take their caravan escort instead',
        tooltip: '−40 talents a decade: +10 influence points and "The Escorted Roads" (+8% income, +7% trade, −0.4 unrest everywhere) for twenty-five years. Somebody else\'s cavalry, on the desert stages, at a published rate.',
        effects: guard('desert:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, infl: 10 });
          mod(ctx, 'the_escorted_roads', 'The Escorted Roads', { incomeMult: 1.08, tradeMult: 1.07, unrestAll: -0.4 }, 300);
          h.chronicle(ctx, 'era', 'Palmyrene escort is contracted for the desert stages. It is '
            + 'the best protection money can buy in this century and it is bought.');
        }),
      },
      {
        label: 'Send our own factors to live there',
        tooltip: '−50 talents: +12 influence points and "The House at the Oasis" (+9% income, +6% trade, +4% manpower) for thirty years. A permanent community of ours in the most connected town between two empires.',
        effects: guard('desert:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, infl: 12 });
          mod(ctx, 'the_house_at_the_oasis', 'The House at the Oasis', { incomeMult: 1.09, tradeMult: 1.06, manpowerMult: 1.04 }, 360);
          h.chronicle(ctx, 'era', 'Factors are sent to live at the oasis permanently. Within a '
            + 'generation there is a community there that hears everything and writes home '
            + 'weekly.');
        }),
      },
    ],
  },

  // ── 172 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132n_the_letters_of_the_bishops',
    title: 'The Letters of the Bishops',
    desc: 'The new assemblies of the cities have built something in two generations that took '
      + 'this nation five hundred years: a courier network. Their officers write to each other '
      + 'constantly — rulings, disputes, appeals, warnings about individuals — and a letter '
      + 'from Antioch is read in Lyon within the season and treated as authoritative by people '
      + 'who have never met the writer.\n\n'
      + 'They copied the apparatus from us, openly and without embarrassment, and they have '
      + 'improved on it in one respect: their network is organised by city rather than by '
      + 'descent, which means it can absorb anybody. Watching a competitor do the thing you '
      + 'invented, better, is instructive if you are prepared to be instructed, and there are '
      + 'men at this court who are and men who would rather not discuss it.',
    forTag: 'player',
    date: { y: 172, m: 5 },
    aiOption: 1,
    historical: 'The episcopal correspondence networks of the second century were modelled on synagogue communication and became the most effective information system in the empire.',
    options: [
      {
        label: 'Match it: our own circuit, on their schedule',
        tooltip: '−50 talents: +15 governance points and "The Matched Circuit" (+8% income, −0.5 unrest everywhere) for thirty years. If a competitor has built a better version of your own institution, the answer is not to complain about it.',
        effects: guard('bish:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, gov: 15 });
          mod(ctx, 'the_matched_circuit', 'The Matched Circuit', { incomeMult: 1.08, unrestAll: -0.5 }, 360);
          h.setFlag(ctx, 'matchedCircuit', true);
          h.chronicle(ctx, 'era', 'The couriers are put on a proper schedule and the circuit is '
            + 'rebuilt to run as often as theirs. It costs money and it closes the gap.');
        }),
      },
      {
        label: 'Read their post',
        tooltip: '−30 talents on the arrangements: +12 influence points and "What Is In the Letters" (+6% income, +4% manpower, −0.4 unrest everywhere) for twenty-five years. Their network is open by design, and everything in it can be had by anybody who takes the trouble.',
        effects: guard('bish:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, infl: 12 });
          mod(ctx, 'what_is_in_the_letters', 'What Is In the Letters', { incomeMult: 1.06, manpowerMult: 1.04, unrestAll: -0.4 }, 300);
          h.chronicle(ctx, 'era', 'Arrangements are made to read the bishops\' correspondence. It '
            + 'is not difficult, because it was never designed to be private, and it is the '
            + 'best news service in the empire.');
        }),
      },
      {
        label: 'Nothing. Let them have their post',
        tooltip: '+10 governance points and +20 talents unspent. Two networks run side by side across the same empire for two hundred years, and only one of them is expanding.',
        effects: guard('bish:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 10, treasury: 20 });
          h.chronicle(ctx, 'era', 'Nothing is done about the bishops\' correspondence. The two '
            + 'networks run side by side over the same roads for two centuries.');
        }),
      },
    ],
  },

  // ── 187 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132n_the_merchants_of_the_red_sea',
    title: 'The Merchants of the Red Sea',
    desc: 'A shipmaster puts in at the southern ports with a cargo out of the Indian Ocean and '
      + 'a proposal. The monsoon route is running at full volume — pepper, ivory, tortoiseshell '
      + 'and silk up the Red Sea to Egypt and then overland — and the two kingdoms at the '
      + 'bottom of it are both worth knowing: Aksum in the highlands, which is becoming the '
      + 'power on that sea, and Himyar across the strait, whose ruling house has been showing '
      + 'a marked and well-documented interest in the God of Israel.\n\n'
      + 'It is four months\' sailing away and it is not obviously any of this court\'s '
      + 'business. It is also, if the reports about the Himyarite kings are half true, the '
      + 'only place on earth where a crown is moving towards this nation rather than away '
      + 'from it.',
    forTag: 'player',
    date: { y: 187, m: 3 },
    aiOption: 1,
    historical: 'The Red Sea and monsoon trade peaked in this period. The Himyarite royal house adopted the worship of Rahmanan — the Merciful, the God of Israel — over the following century and a half.',
    options: [
      {
        label: 'Send factors and a teacher south',
        tooltip: '−55 talents on the voyages: +12 influence points and "The Southern Sea" (+9% income, +8% trade) for thirty years. A trade route and a correspondence with a royal house that is asking questions.',
        effects: guard('red:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, infl: 12 });
          mod(ctx, 'the_southern_sea', 'The Southern Sea', { incomeMult: 1.09, tradeMult: 1.08 }, 360);
          h.setFlag(ctx, 'southernSea', true);
          h.chronicle(ctx, 'diplomacy', 'Factors and a teacher go south with the monsoon. What '
            + 'comes back is pepper, ivory and a correspondence with a court at the other end '
            + 'of the world that wants to know what the Law says.');
        }),
      },
      {
        label: 'Take the cargo trade and leave the courts alone',
        tooltip: '−35 talents: "The Monsoon Cargo" (+8% income, +7% trade) for twenty-five years. Pepper pays; theology at four months\' distance does not.',
        effects: guard('red:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35 });
          mod(ctx, 'the_monsoon_cargo', 'The Monsoon Cargo', { incomeMult: 1.08, tradeMult: 1.07 }, 300);
          h.chronicle(ctx, 'era', 'The southern cargo trade is taken up and nothing else. It is '
            + 'the most profitable route on earth and it is treated as freight.');
        }),
      },
      {
        label: 'Four months\' sailing is not a foreign policy',
        tooltip: '+10 governance points and +25 talents unspent. In sixty years a Jewish dynasty will hold the Yemen and this court will hear about it from a merchant.',
        effects: guard('red:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 10, treasury: 25 });
          h.chronicle(ctx, 'era', 'The southern proposal is declined as too far away to be '
            + 'anybody\'s business. The next report from that sea arrives in a generation, from '
            + 'a merchant, secondhand.');
        }),
      },
    ],
  },

  // ── 203 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132n_the_charters_of_the_cities',
    title: 'The Charters of the Cities',
    desc: 'The emperor is handing out civic status like a man distributing patronage, which is '
      + 'exactly what he is doing: cities that backed him in the civil war become colonies, '
      + 'cities that backed the other man are demoted, and the whole map of who outranks whom '
      + 'on this coast is redrawn according to a war that happened somewhere else.\n\n'
      + 'The practical content is money and law. A colony pays different taxes, its magistrates '
      + 'have wider jurisdiction, and its charter is a document that outlives the emperor who '
      + 'granted it. Half this country\'s neighbours are about to be promoted over its head on '
      + 'the strength of a bet they made in a year when nobody here was consulted.',
    forTag: 'player',
    date: { y: 203, m: 6 },
    aiOption: 0,
    historical: 'Septimius Severus rewarded and punished eastern cities wholesale after the civil war of 193–197, promoting some to colonial status and demoting others.',
    options: [
      {
        label: 'Petition for status of our own, and pay what it costs',
        tooltip: '−75 talents in the right hands: +12 influence points and "The Charter" (+9% income, −0.5 unrest everywhere, −5% cost of governing) for thirty years. A document that outlives the emperor who signed it.',
        effects: guard('chart:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -75, infl: 12 });
          mod(ctx, 'the_charter', 'The Charter', { incomeMult: 1.09, unrestAll: -0.5, adminMult: 0.95 }, 360);
          h.setFlag(ctx, 'civicCharter', true);
          h.chronicle(ctx, 'diplomacy', 'A charter is petitioned for and bought. It costs a '
            + 'year\'s revenue and it is still being cited when the dynasty that granted it is '
            + 'a footnote.');
        }),
      },
      {
        label: 'Buy into the cities that were promoted',
        tooltip: '−50 talents into property and partnerships in the new colonies: "Inside the Charters" (+10% income, +6% trade) for thirty years. If the status cannot be had, the benefit of it can be bought.',
        effects: guard('chart:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50 });
          mod(ctx, 'inside_the_charters', 'Inside the Charters', { incomeMult: 1.10, tradeMult: 1.06 }, 360);
          h.chronicle(ctx, 'era', 'Money goes into property and partnerships inside the newly '
            + 'promoted cities. The status belongs to them and a good deal of the benefit '
            + 'belongs to us.');
        }),
      },
      {
        label: 'Stay out of the promotions entirely',
        tooltip: '+12 governance points and "Unpromoted" (−0.4 unrest everywhere) for twenty years. Every charter granted in a civil war is a debt to the winner, and there is going to be another civil war.',
        effects: guard('chart:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'unpromoted', 'Unpromoted', { unrestAll: -0.4 }, 240);
          h.chronicle(ctx, 'era', 'No petition is made for status. Every charter granted in a '
            + 'civil war is a debt to a man who will be dead in a decade, and this court '
            + 'declines to owe one.');
        }),
      },
    ],
  },

  // ── 205 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132n_the_fortress_never_taken',
    title: 'The Fortress Never Taken',
    desc: 'Hatra sits in open desert with double walls, a hundred and sixty towers, its own '
      + 'gods and about six wells. Two Roman emperors have besieged it with full siege trains '
      + 'and both went away — the second one twice, in successive years, with the machines '
      + 'burning behind him.\n\n'
      + 'The garrison lives on caravan tolls and on the fact that an army in that country runs '
      + 'out of water before the city runs out of patience. Its people are Arab, its '
      + 'inscriptions are Aramaic, its trade is everybody\'s, and it has been quietly hosting '
      + 'a Jewish community for a century. What it is offering is what a fortress offers: a '
      + 'place where things can be kept, and a guarantee about them that has never once been '
      + 'broken.',
    forTag: 'player',
    date: { y: 205, m: 5 },
    aiOption: 0,
    historical: 'Hatra repelled Trajan and Septimius Severus and fell only to the Sasanians in 240–241, after which it was abandoned entirely.',
    options: [
      {
        label: 'Lodge a reserve there: money, copies and the register',
        tooltip: '−40 talents on the vault and the carriage: +12 governance points and "The Desert Reserve" (+6% income, −0.5 unrest everywhere) for thirty years. Whatever happens to this country, the copies are four hundred miles away behind walls nobody has breached.',
        effects: guard('hatra:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, gov: 12 });
          mod(ctx, 'the_desert_reserve', 'The Desert Reserve', { incomeMult: 1.06, unrestAll: -0.5 }, 360);
          h.setFlag(ctx, 'desertReserve', true);
          h.chronicle(ctx, 'era', 'A reserve is lodged at Hatra: coin, copies of the rolls, and '
            + 'the register. It is the safest place anybody knows of, until it is not.');
        }),
      },
      {
        label: 'Learn how the walls are built',
        tooltip: '−55 talents on engineers: +12 martial points and "The Double Wall" (+1 defence in hill country, +5% force limit, +4% discipline) for thirty years. Two emperors could not get through it and the method is not secret.',
        effects: guard('hatra:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, mar: 12 });
          mod(ctx, 'the_double_wall', 'The Double Wall', { hillDefBonus: 1, forceLimitMult: 1.05, disciplineMult: 1.04 }, 360);
          h.chronicle(ctx, 'war', 'Engineers are sent to Hatra to measure the walls and come '
            + 'back with the drawings. Two emperors failed against that plan and it is written '
            + 'down now in this country\'s own hand.');
        }),
      },
      {
        label: 'Take the caravan agency and nothing else',
        tooltip: '−25 talents: "The Desert Agency" (+7% income, +6% trade) for twenty-five years. An office in a fortress on a trade road, which is the least romantic and most reliable thing on offer.',
        effects: guard('hatra:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -25 });
          mod(ctx, 'the_desert_agency', 'The Desert Agency', { incomeMult: 1.07, tradeMult: 1.06 }, 300);
          h.chronicle(ctx, 'era', 'An agency is opened at Hatra for the caravan business and '
            + 'nothing else is undertaken. It pays quietly for thirty-five years.');
        }),
      },
    ],
  },

  // ── 226 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132n_the_new_persia',
    title: 'The New Persia',
    desc: 'The house that has ruled the east for four hundred and seventy years has been '
      + 'replaced, and the replacement is not another dynasty of the same kind. The Arsacids '
      + 'were a confederation of great families with a king at the top who left everybody else '
      + 'alone. What has come out of Fars is centralising, priestly, and explicitly claiming '
      + 'to restore an empire that fell six centuries ago — which means claiming everything '
      + 'west to the sea.\n\n'
      + 'The immediate consequence for the small courts of the river belt is that the space '
      + 'they lived in is closing. The consequence for the Jewish communities of the east, '
      + 'which are enormous and have been comfortable under the Arsacids for three centuries, '
      + 'is that they are about to find out what a state religion is.',
    forTag: 'player',
    date: { y: 226, m: 6 },
    world: true,
    worldLabel: 'The Sasanians replace the Arsacids; a centralising Persia claims the west',
    aiOption: 0,
    historical: 'Ardashir I overthrew the Arsacids in 224 and claimed the Achaemenid inheritance. The eastern Jewish communities negotiated their position with the new order over the following generation.',
    options: [
      {
        label: 'Send east at once, before the new order has decided anything',
        tooltip: '−50 talents on the embassy: +14 influence points and "In Early" (+8% income, +5% manpower, −0.4 unrest everywhere) for thirty years. A settlement made in the first ten years of a dynasty lasts four hundred.',
        effects: guard('sas:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, infl: 14 });
          mod(ctx, 'in_early', 'In Early', { incomeMult: 1.08, manpowerMult: 1.05, unrestAll: -0.4 }, 360);
          h.setFlag(ctx, 'sasanianEarly', true);
          h.chronicle(ctx, 'diplomacy', 'An embassy goes east in the first years of the new '
            + 'dynasty, while its policy towards everybody is still being written. What is '
            + 'agreed then holds for centuries.');
        }),
      },
      {
        label: 'Warn the eastern communities and help them prepare',
        tooltip: '−45 talents: +12 legitimacy and "The Eastern Preparations" (+6% income, −0.6 unrest everywhere) for twenty-five years. Money, advice and a warning about what a state religion does, sent by people who have met one.',
        effects: guard('sas:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, legitimacy: 12 });
          mod(ctx, 'the_eastern_preparations', 'The Eastern Preparations', { incomeMult: 1.06, unrestAll: -0.6 }, 300);
          h.chronicle(ctx, 'era', 'Money and advice go east ahead of the new order: what a state '
            + 'religion asks for, what it will settle for, and how to be too useful to press.');
        }),
      },
      {
        label: 'Say nothing that a Roman could read as eastern sympathy',
        tooltip: '+14 governance points and "Visibly Loyal" (+5% income, −0.5 unrest everywhere) for twenty-five years. In the century that is coming, being on the wrong side of a Persian war by accident is how communities end.',
        effects: guard('sas:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 14 });
          mod(ctx, 'visibly_loyal', 'Visibly Loyal', { incomeMult: 1.05, unrestAll: -0.5 }, 300);
          h.chronicle(ctx, 'era', 'Nothing is said or sent eastward, publicly or otherwise. In '
            + 'the century that follows this is repeatedly the difference between a community '
            + 'and a rumour about one.');
        }),
      },
    ],
  },

  // ── 231 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132n_the_emperor_comes_east',
    title: 'The Emperor Comes East',
    desc: 'An emperor is bringing a field army through, which for the provinces on the route is '
      + 'not a campaign but a weather event. Detachments from four frontiers, the guard, the '
      + 'baggage and the followers: something between fifty and eighty thousand people moving '
      + 'along roads built for a tenth of that, requisitioning as they go under warrants that '
      + 'are legal, unpriced and unrefusable.\n\n'
      + 'The campaign against the new Persia will be indecisive and will get its emperor killed '
      + 'by his own men two years later. What it does on the way is more consequential for '
      + 'everybody here: two harvests bought at the state\'s price, the transport animals of '
      + 'four districts gone, and — for anybody positioned to supply an army on that scale — '
      + 'the largest single order this province will see in a generation.',
    forTag: 'player',
    date: { y: 231, m: 5 },
    aiOption: 1,
    historical: 'Severus Alexander\'s Persian expedition of 231–233 moved a concentrated field army through Syria and Palestine; the requisition burden on the transit provinces is attested in the papyri.',
    options: [
      {
        label: 'Supply it: grain, animals, leather and carriage',
        tooltip: '+90 talents on the contracts and "The Great Order" (+9% income, +5% growth) for fifteen years, with +0.8 unrest everywhere for six from every district whose mules did not come back.',
        effects: guard('east231:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 90 });
          mod(ctx, 'the_great_order', 'The Great Order', { incomeMult: 1.09, growthMult: 1.05, unrestAll: 0.8 }, 180);
          h.setFlag(ctx, 'greatOrder', true);
          h.chronicle(ctx, 'era', 'The army is supplied on contract: grain, animals, leather and '
            + 'carriage. It is the largest order this province has seen in a generation and the '
            + 'mules do not come back.');
        }),
      },
      {
        label: 'Get the requisition assessed and capped in writing first',
        tooltip: '−35 talents on the advocates and the escorts: +15 governance points and "The Assessed Requisition" (+6% income, −0.7 unrest everywhere) for twenty years. Less money, and no village is stripped by a warrant nobody read.',
        effects: guard('east231:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, gov: 15 });
          mod(ctx, 'the_assessed_requisition', 'The Assessed Requisition', { incomeMult: 1.06, unrestAll: -0.7 }, 240);
          h.chronicle(ctx, 'era', 'The requisition is assessed, capped and priced before the '
            + 'column arrives, with our own men walking beside the warrants. The province is '
            + 'poorer by the difference and nothing is taken twice.');
        }),
      },
      {
        label: 'Move the animals and the stores out of the route',
        tooltip: '−45 talents in lost season and hiding places: +8 legitimacy and "Off the Route" (+5% manpower, +4% growth, −0.5 unrest everywhere) for fifteen years. The column finds four empty districts, and somebody in the commissariat writes that down.',
        effects: guard('east231:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, legitimacy: 8 });
          mod(ctx, 'off_the_route', 'Off the Route', { manpowerMult: 1.05, growthMult: 1.04, unrestAll: -0.5 }, 180);
          h.chronicle(ctx, 'era', 'The animals and the stores are moved off the line of march '
            + 'before the column arrives. It finds four empty districts, and the emptiness is '
            + 'noted in a report.');
        }),
      },
    ],
  },

  // ── 235 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132n_the_kingdoms_that_ended',
    title: 'The Kingdoms That Ended',
    desc: 'The belt is gone. Edessa is a colony with a Roman garrison, Hatra has fallen at last '
      + 'and been abandoned to the desert, and Adiabene is a Persian province governed by a '
      + 'marzban. The whole apparatus of small courts that stood between the two empires for '
      + 'two centuries has been dismantled inside a generation by both of them, working '
      + 'independently and to the same design.\n\n'
      + 'The frontier is now a line with two armies on it and nothing in between. Every '
      + 'community that used to live in the space — including several very large Jewish ones — '
      + 'is now inside one empire or the other with no intermediary, no local king to petition '
      + 'and no third party to appeal to. What they have instead is whatever arrangement they '
      + 'can make directly, and this is the decade in which those arrangements get made.',
    forTag: 'player',
    date: { y: 235, m: 4 },
    aiOption: 1,
    historical: 'Edessa lost its dynasty in 214, Hatra fell to Shapur I about 241, and Adiabene became a Sasanian province. The buffer belt ceased to exist within thirty years.',
    options: [
      {
        label: 'Take in whoever crosses, from either side',
        tooltip: '−60 talents: +12 legitimacy and "The Crossers" (+7% growth, +6% income, +4% manpower) for twenty-five years. Merchants, scribes and soldiers out of four ended kingdoms, and all of them know two frontiers.',
        effects: guard('ended:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, legitimacy: 12 });
          mod(ctx, 'the_crossers', 'The Crossers', { growthMult: 1.07, incomeMult: 1.06, manpowerMult: 1.04 }, 300);
          h.chronicle(ctx, 'era', 'Whoever crosses is taken in, from either side. What arrives '
            + 'is the professional class of four ended kingdoms, and it arrives with its '
            + 'address books.');
        }),
      },
      {
        label: 'Build the direct arrangements now, both empires at once',
        tooltip: '−55 talents on two sets of embassies: +14 influence points and "Two Doors" (+8% income, −0.5 unrest everywhere) for thirty years. With no intermediaries left, a community either has a direct arrangement or it has nothing.',
        effects: guard('ended:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, infl: 14 });
          mod(ctx, 'two_doors', 'Two Doors', { incomeMult: 1.08, unrestAll: -0.5 }, 360);
          h.setFlag(ctx, 'twoDoors', true);
          h.chronicle(ctx, 'diplomacy', 'Direct arrangements are made with both empires in the '
            + 'same decade, by different men, in different languages, saying different things '
            + 'and contradicting nothing.');
        }),
      },
      {
        label: 'Write down what the buffer kingdoms did, while anybody remembers',
        tooltip: '+16 governance points and "The Lesson of the Belt" (+5% income, +5% manpower, −0.4 unrest everywhere) for thirty years. Two centuries of small-power survival, recorded by the people who watched it fail.',
        effects: guard('ended:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 16 });
          mod(ctx, 'the_lesson_of_the_belt', 'The Lesson of the Belt', { incomeMult: 1.05, manpowerMult: 1.05, unrestAll: -0.4 }, 360);
          h.chronicle(ctx, 'era', 'What the buffer kingdoms did — how they hedged, what they '
            + 'paid, and the exact point at which each of them ran out of room — is written '
            + 'down while the men who watched it are still alive.');
        }),
      },
    ],
  },

  // ── 253 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132n_the_tribes_between',
    title: 'The Tribes Between',
    desc: 'With the kingdoms gone, the space between the empires has been filled by something '
      + 'older and harder to negotiate with: tribal confederations, moving between winter and '
      + 'summer grazing across a frontier that means nothing to them, each led by a chief the '
      + 'empires call a phylarch and pay.\n\n'
      + 'They are not a state and they are becoming one. Both empires are subsidising them, '
      + 'both are using them as auxiliaries against each other, and both are discovering that a '
      + 'client you pay to fight becomes, within about two generations, a client who understands '
      + 'the frontier better than you do. In this century they are the most under-estimated '
      + 'people on this map, and every court that deals with them early is dealing with them '
      + 'cheaply.',
    forTag: 'player',
    date: { y: 253, m: 5 },
    aiOption: 0,
    historical: 'The Tanukh and their successors were subsidised by both empires from the third century; the system produced the Ghassanid and Lakhmid confederations that dominated the sixth-century frontier.',
    options: [
      {
        label: 'Treat with the chiefs directly, and early',
        tooltip: '−40 talents a decade: +14 influence points and "The Standing Guest-Friendship" (+8% income, +6% trade, +4% manpower) for thirty years. In eighty years these men will be a power, and this is the decade in which their friendship is cheap.',
        effects: guard('tribes:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, infl: 14 });
          mod(ctx, 'guest_friendship', 'The Standing Guest-Friendship', { incomeMult: 1.08, tradeMult: 1.06, manpowerMult: 1.04 }, 360);
          h.setFlag(ctx, 'guestFriendship', true);
          h.chronicle(ctx, 'diplomacy', 'Guest-friendship is established with the desert chiefs '
            + 'at a price that will look absurd in eighty years, which is when they are a '
            + 'power and this court is still on the list.');
        }),
      },
      {
        label: 'Hire their cavalry and learn their country',
        tooltip: '−55 talents: +12 martial points and "The Frontier Auxiliaries" (+7% morale, +5% manpower, +1 defence in hill country) for twenty-five years.',
        effects: guard('tribes:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, mar: 12 });
          mod(ctx, 'the_frontier_auxiliaries', 'The Frontier Auxiliaries', { moraleMult: 1.07, manpowerMult: 1.05, hillDefBonus: 1 }, 300);
          h.chronicle(ctx, 'war', 'Desert cavalry is hired and the officers sent with it are '
            + 'told to learn the country. Both halves of that instruction pay.');
        }),
      },
      {
        label: 'Fortify against them and let the empires do the paying',
        tooltip: '−60 talents on the eastern posts: +10 martial points and "The Posted Line" (+4% force limit, −0.5 unrest everywhere) for twenty-five years. It is defensible, it is expensive, and in eighty years it faces a confederation instead of a raiding party.',
        effects: guard('tribes:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, mar: 10 });
          mod(ctx, 'the_posted_line', 'The Posted Line', { forceLimitMult: 1.04, unrestAll: -0.5 }, 300);
          h.chronicle(ctx, 'war', 'Posts and patrols go up along the eastern edge and the '
            + 'subsidies are left to the empires. The line holds, and what it faces gets '
            + 'larger every generation.');
        }),
      },
    ],
  },

  // ── 285 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132n_the_road_in_the_desert',
    title: 'The Road in the Desert',
    desc: 'The empire is building a road where there is nothing to go to. It runs along the '
      + 'desert edge from the Euphrates south past Damascus and down past Bostra, with a fort '
      + 'every day\'s march, cisterns, garrisons and a paved surface — hundreds of miles of '
      + 'engineering across country whose entire population is seasonal.\n\n'
      + 'It is a statement about the next two centuries: the frontier is no longer a zone that '
      + 'is negotiated, it is a line that is held, and everything east of it has been written '
      + 'off. For the districts on the sown side it means garrisons, contracts and safety. For '
      + 'the caravan trade it means the routes are now fixed where the army wants them. And '
      + 'for everybody whose grazing crosses that line twice a year it means the beginning of '
      + 'a very long argument.',
    forTag: 'player',
    date: { y: 285, m: 6 },
    aiOption: 1,
    historical: 'The Strata Diocletiana fortified the desert frontier from the Euphrates to the Gulf of Aqaba with a fort a day\'s march apart. Much of it is still visible.',
    options: [
      {
        label: 'Supply the road and settle beside it',
        tooltip: '−50 talents: "The Road Districts" (+10% income, +6% growth, +4% manpower) for thirty years. Forts need grain, water, leather and men, every day, for two hundred years.',
        effects: guard('strata:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50 });
          mod(ctx, 'the_road_districts', 'The Road Districts', { incomeMult: 1.10, growthMult: 1.06, manpowerMult: 1.04 }, 360);
          h.setFlag(ctx, 'roadDistricts', true);
          h.chronicle(ctx, 'era', 'Villages, contracts and depots go in beside the new desert '
            + 'road. The forts are supplied from this side of the line for as long as there '
            + 'are forts.');
        }),
      },
      {
        label: 'Keep the crossing rights for the flocks in the treaty',
        tooltip: '−35 talents on the negotiation: +14 governance points and "The Crossing Rights" (+6% income, −0.7 unrest everywhere) for thirty years. The argument that a wall in a grazing country starts is settled before it starts.',
        effects: guard('strata:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, gov: 14 });
          mod(ctx, 'the_crossing_rights', 'The Crossing Rights', { incomeMult: 1.06, unrestAll: -0.7 }, 360);
          h.chronicle(ctx, 'diplomacy', 'Crossing rights for the flocks are written into the '
            + 'arrangements before the road is finished. It is a small clause that prevents '
            + 'two centuries of an entirely predictable argument.');
        }),
      },
      {
        label: 'Move the trade to the sea before the routes are fixed',
        tooltip: '−55 talents into ports and hulls: "The Sea Route" (+9% income, +8% trade, +4% fleet strength) for thirty years. If the army is going to decide where the land routes run, the water is the part it does not control.',
        effects: guard('strata:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55 });
          mod(ctx, 'the_sea_route', 'The Sea Route', { incomeMult: 1.09, tradeMult: 1.08, navalMult: 1.04 }, 360);
          h.chronicle(ctx, 'era', 'The trade is moved to the water before the land routes are '
            + 'fixed by somebody with a legion. It costs a great deal and it cannot be '
            + 're-routed by an engineer.');
        }),
      },
    ],
  },

  // ── 322 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132n_the_bishop_is_the_city',
    title: 'The Bishop Is the City Now',
    desc: 'The change in the coast towns is administrative and total. The bishop has a court '
      + 'that hears civil cases and whose judgments the state enforces; he runs the poor '
      + 'relief, which is the largest charitable operation any of these cities has ever seen; '
      + 'he has the emperor\'s ear and the emperor\'s money for building; and the town council, '
      + 'which used to be the city, meets less every year.\n\n'
      + 'For every community that is not his, this is the single most important fact of the '
      + 'century, and it has nothing to do with doctrine. The man who decides where the water '
      + 'is dug, who gets the grain, which building permits are granted and which disputes are '
      + 'heard is now a religious officer of a religion that is not ours, and the relationship '
      + 'with him is the whole of local politics from this year forward.',
    forTag: 'player',
    date: { y: 322, m: 5 },
    aiOption: 0,
    historical: 'Constantine gave bishops civil jurisdiction and imperial funds; across the fourth century the episcopate displaced the curia as the effective government of eastern cities.',
    options: [
      {
        label: 'Deal with the bishops as the civil power they are',
        tooltip: '−40 talents on the calls and the courtesies: +14 governance points and "The Working Relationship" (+7% income, −0.7 unrest everywhere) for thirty years. Unheroic, unpopular at home, and it is where the decisions are.',
        effects: guard('bishcity:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, gov: 14 });
          mod(ctx, 'the_working_relationship', 'The Working Relationship', { incomeMult: 1.07, unrestAll: -0.7 }, 360);
          h.setFlag(ctx, 'bishopsDealtWith', true);
          h.chronicle(ctx, 'era', 'The bishops are called on, addressed correctly and dealt with '
            + 'as what they are. Several houses at home object in writing and none of them has '
            + 'a better proposal.');
        }),
      },
      {
        label: 'Build our own of everything, and need nothing from them',
        tooltip: '−80 talents into our own courts, relief, wells and schools: +16 governance points and "Needing Nothing" (+6% income, +5% growth, −0.8 unrest everywhere) for thirty years. Expensive and it removes the leverage entirely.',
        effects: guard('bishcity:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -80, gov: 16 });
          mod(ctx, 'needing_nothing', 'Needing Nothing', { incomeMult: 1.06, growthMult: 1.05, unrestAll: -0.8 }, 360);
          h.setFlag(ctx, 'needingNothing', true);
          h.chronicle(ctx, 'era', 'Courts, relief, wells and schools are built so that nothing '
            + 'has to be asked of anybody. It costs more than everything else in the decade '
            + 'and it buys the one thing money can buy here.');
        }),
      },
      {
        label: 'Keep to the old councils while they last',
        tooltip: '+10 legitimacy and "The Old Curia" (−0.4 unrest everywhere) for twenty years, with −6% income. The councils are the lawful government, they are owed the courtesy, and they are meeting four times a year and then twice.',
        effects: guard('bishcity:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10 });
          mod(ctx, 'the_old_curia', 'The Old Curia', { unrestAll: -0.4, incomeMult: 0.94 }, 240);
          h.chronicle(ctx, 'era', 'Business is kept with the town councils, which are the lawful '
            + 'government. They meet four times a year, and then twice, and then when there is '
            + 'something to sign.');
        }),
      },
    ],
  },

  // ── 345 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132n_the_kings_of_the_south',
    title: 'The Kings of the South',
    desc: 'Two reports come up the Red Sea in the same season and they point in opposite '
      + 'directions. The king of Aksum has taken the Cross, and his coinage — which circulates '
      + 'from Egypt to India — now carries it; the highlands are becoming a Christian kingdom '
      + 'with a church of its own and a bishop consecrated at Alexandria.\n\n'
      + 'And across the strait, in the Yemen, the royal inscriptions have stopped naming the '
      + 'old gods. What they name instead is Rahmanan — the Merciful — the Lord of Heaven and '
      + 'Earth, and there are synagogues in the highland towns and Jewish names among the '
      + 'notables. Nobody at this court has ever seen either country. One of them is about to '
      + 'be the only Jewish kingdom on earth, and the other is going to break it.',
    forTag: 'player',
    date: { y: 345, m: 4 },
    aiOption: 0,
    historical: 'Ezana of Aksum adopted Christianity around 340; the Himyarite kings turned to the exclusive worship of Rahmanan across the fourth century, and the kingdom became Jewish under Yusuf As\'ar.',
    options: [
      {
        label: 'Send teachers and books to the Yemen',
        tooltip: '−60 talents on the voyages: +14 influence points, +10 legitimacy, and "The Southern Kingdom" (+8% income, +6% trade) for thirty years. A crown at the other end of the world that is asking what the Law says, and answering it.',
        effects: guard('south:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, infl: 14, legitimacy: 10 });
          mod(ctx, 'the_southern_kingdom', 'The Southern Kingdom', { incomeMult: 1.08, tradeMult: 1.06 }, 360);
          h.setFlag(ctx, 'yemenMission', true);
          h.chronicle(ctx, 'diplomacy', 'Teachers, books and a standing correspondence go south '
            + 'to the Yemen. In a century there is a Jewish kingdom on the Red Sea and it '
            + 'learned it from letters sent this year.');
        }),
      },
      {
        label: 'Deal with both, and stay out of the quarrel between them',
        tooltip: '−40 talents: +12 influence points and "Both Shores" (+9% income, +7% trade) for thirty years. Two kingdoms on one strait, both worth trading with, and a war between them that is not ours.',
        effects: guard('south:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, infl: 12 });
          mod(ctx, 'both_shores', 'Both Shores', { incomeMult: 1.09, tradeMult: 1.07 }, 360);
          h.chronicle(ctx, 'era', 'Agents are established on both shores of the southern strait '
            + 'and nothing is signed with either court. The quarrel between them, when it '
            + 'comes, is watched from a warehouse.');
        }),
      },
      {
        label: 'Neither. Four months\' sailing and somebody else\'s ocean',
        tooltip: '+12 governance points and +30 talents unspent. Both kingdoms go on without us, and in the sixth century one of them is destroyed for a faith this court never once wrote to it about.',
        effects: guard('south:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12, treasury: 30 });
          h.chronicle(ctx, 'era', 'The southern reports are filed. Both kingdoms go on without '
            + 'any word from here, which is what the distance recommends and not what the next '
            + 'two centuries recommend.');
        }),
      },
    ],
  },

  // ── 375 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132n_the_queen_of_the_saracens',
    title: 'The Queen of the Saracens',
    desc: 'The federate confederation on the eastern frontier has a new leader, the widow of '
      + 'the last chief, and when the treaty was not renewed on her terms she took the '
      + 'confederation off the establishment and into the field. Her cavalry has beaten Roman '
      + 'forces in Palestine, in Phoenicia and on the Egyptian road, and the empire — which is '
      + 'simultaneously dealing with the Goths — has had to negotiate.\n\n'
      + 'Her terms are not territorial and not financial. She wants a specific bishop, of her '
      + 'own choosing and her own doctrine, for her people. She gets him. The frontier '
      + 'confederation that everybody has been treating as hired help has just demonstrated '
      + 'that it can beat imperial troops, dictate ecclesiastical appointments, and stop when '
      + 'it has what it came for, which is the behaviour of a state.',
    forTag: 'player',
    date: { y: 375, m: 6 },
    aiOption: 1,
    historical: 'Mavia, queen of the Tanukh, defeated Roman forces across the southern Levant in the 370s and made peace on condition that a hermit of her own choosing be consecrated bishop for her people.',
    options: [
      {
        label: 'Treat with her directly, as with a power',
        tooltip: '−45 talents: +14 influence points and "The Queen\'s Peace" (+7% income, +6% trade, −0.6 unrest everywhere) for twenty-five years. The eastern approaches are hers, and this court is on her list.',
        effects: guard('mavia:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, infl: 14 });
          mod(ctx, 'the_queens_peace', 'The Queen\'s Peace', { incomeMult: 1.07, tradeMult: 1.06, unrestAll: -0.6 }, 300);
          // NOT `queensPeace` — that is the 167 chapter's marker for Salome
          // Alexandra's reign and gates its royal-century content. Different
          // chapter, same two words; this one gets its own key.
          h.setFlag(ctx, 'saracenQueensPeace', true);
          h.chronicle(ctx, 'diplomacy', 'This court treats with the queen of the frontier '
            + 'confederation directly, as with a power, and gets a settled eastern approach out '
            + 'of it for a generation.');
        }),
      },
      {
        label: 'Supply her campaign and take payment in protection',
        tooltip: '+50 talents\' worth of standing escort and +8 martial points, with "The Supplier" (+6% income, +0.8 unrest everywhere) for fifteen years — supplying a confederation at war with the empire is a sentence somebody will read out later.',
        effects: guard('mavia:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 50, mar: 8 });
          mod(ctx, 'the_supplier', 'The Supplier', { incomeMult: 1.06, unrestAll: 0.8 }, 180);
          h.chronicle(ctx, 'war', 'The confederation is supplied and pays in protection. It is '
            + 'extremely profitable and it is written down somewhere by somebody.');
        }),
      },
      {
        label: 'Shut the eastern districts and wait it out',
        tooltip: '−40 talents on the posts: +10 martial points and "The Shut East" (−0.7 unrest everywhere, +4% manpower) for fifteen years, with −6% trade. The war goes past and takes nothing from us, and the peace afterwards is made without us in it.',
        effects: guard('mavia:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, mar: 10 });
          mod(ctx, 'the_shut_east', 'The Shut East', { unrestAll: -0.7, manpowerMult: 1.04, tradeMult: 0.94 }, 180);
          h.chronicle(ctx, 'war', 'The eastern districts are shut and posted and the war goes '
            + 'past. Nothing is lost, and the settlement afterwards is made by people who did '
            + 'not have to consider this court at all.');
        }),
      },
    ],
  },

  // ── 405 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132n_the_monasteries_on_the_edge',
    title: 'The Monasteries on the Edge',
    desc: 'The desert east and south of the settled line has filled up with monasteries, and '
      + 'they are not what the word suggests. The large ones hold hundreds of men, own '
      + 'estates, run hostels on the pilgrim roads, employ builders and muleteers, and are '
      + 'endowed by imperial and senatorial money from the far side of the empire.\n\n'
      + 'In one generation they have become the principal landowners, the principal employers '
      + 'and the principal water-rights holders along the whole desert edge, and their abbots '
      + 'correspond with emperors. They are a polity, in the only senses that matter locally, '
      + 'and they occupy precisely the ground that this country\'s own frontier villages and '
      + 'the desert clans have been negotiating over for four hundred years.',
    forTag: 'player',
    date: { y: 405, m: 4 },
    aiOption: 0,
    historical: 'Judaean desert monasticism expanded enormously from the late fourth century; the great laurae held estates, water rights and imperial endowments along the whole desert edge.',
    options: [
      {
        label: 'Settle the water and grazing rights with the abbots now',
        tooltip: '−45 talents on the survey and the negotiation: +14 governance points and "The Water Settled" (+7% income, +5% growth, −0.7 unrest everywhere) for thirty years. Agreed in a year while both sides are still willing, instead of litigated for a century.',
        effects: guard('mon:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, gov: 14 });
          mod(ctx, 'the_water_settled', 'The Water Settled', { incomeMult: 1.07, growthMult: 1.05, unrestAll: -0.7 }, 360);
          h.setFlag(ctx, 'waterSettled', true);
          h.chronicle(ctx, 'diplomacy', 'Water and grazing rights along the desert edge are '
            + 'surveyed and settled with the monasteries in a single season. Nobody litigates '
            + 'it for a hundred years.');
        }),
      },
      {
        label: 'Supply them: bread, oil, mules and building',
        tooltip: '−30 talents to set the contracts up: "The Desert Contracts" (+9% income, +5% trade) for thirty years. They are the biggest customer on that frontier and their money comes from four provinces away.',
        effects: guard('mon:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30 });
          mod(ctx, 'the_desert_contracts', 'The Desert Contracts', { incomeMult: 1.09, tradeMult: 1.05 }, 360);
          h.chronicle(ctx, 'era', 'Bread, oil, mules and masonry for the desert houses, on '
            + 'standing contracts. Their endowments come from Rome and Constantinople and they '
            + 'are spent here.');
        }),
      },
      {
        label: 'Buy the edge land before the endowments do',
        tooltip: '−70 talents: "The Edge Held" (+8% income, +6% growth, +4% manpower) for thirty years, with +0.6 unrest everywhere for eight as two expanding landlords meet on the same hillsides.',
        effects: guard('mon:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70 });
          mod(ctx, 'the_edge_held', 'The Edge Held', { incomeMult: 1.08, growthMult: 1.06, manpowerMult: 1.04, unrestAll: 0.6 }, 360);
          h.chronicle(ctx, 'era', 'The land along the desert edge is bought up ahead of the '
            + 'endowments. Two expanding landlords meet on the same hillsides within the '
            + 'decade and neither has anywhere else to go.');
        }),
      },
    ],
  },

  // ── 430 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132n_who_is_on_this_map_now',
    title: 'Who Is On This Map Now',
    desc: 'Somebody at the court has done the thing nobody does, which is to write out the list '
      + 'of neighbours as it stood three hundred years ago and the list as it stands now, side '
      + 'by side. Of the courts on the first list — Edessa, Hatra, Adiabene, Palmyra, Emesa, '
      + 'Nabataea, the Greek cities running themselves, a Parthian confederation of great '
      + 'families — not one is still there in the form it had.\n\n'
      + 'What is on the second list instead is: an eastern empire with a state church, a '
      + 'Persia with a state church, an Arab federate world that is becoming a nation, a '
      + 'bishop in every city, a monastic order along the desert edge, and two kingdoms on the '
      + 'Red Sea that nobody here has ever visited. The country is the same shape and every '
      + 'single thing around it has been replaced, and the practical question is which of the '
      + 'new list this court intends to actually know.',
    forTag: 'player',
    date: { y: 430, m: 9 },
    aiOption: 0,
    historical: 'By the fifth century every third-century polity of the Near East had been replaced. The Jewish communities of the region negotiated with an entirely new set of powers within four generations.',
    options: [
      {
        label: 'Send to all of them, and keep the list current',
        tooltip: '−60 talents on the establishment: +16 influence points and "The Current List" (+8% income, +5% trade, −0.5 unrest everywhere) for forty years. A standing register of who actually holds what, revised every year by people who go and look.',
        effects: guard('map:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, infl: 16 });
          mod(ctx, 'the_current_list', 'The Current List', { incomeMult: 1.08, tradeMult: 1.05, unrestAll: -0.5 }, 480);
          h.setFlag(ctx, 'currentList', true);
          h.chronicle(ctx, 'era', 'A standing register of the powers is begun and revised '
            + 'yearly by men sent to look. It is the least glamorous instrument this court '
            + 'possesses and the one it is never again without.');
        }),
      },
      {
        label: 'Pick the three that will matter and know them properly',
        tooltip: '−45 talents: +14 influence points and "The Three That Matter" (+9% income, +5% manpower) for forty years. Persia, the federates and the eastern court — and nothing spent on anybody else.',
        effects: guard('map:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, infl: 14 });
          mod(ctx, 'the_three_that_matter', 'The Three That Matter', { incomeMult: 1.09, manpowerMult: 1.05 }, 480);
          h.chronicle(ctx, 'era', 'Three powers are picked to be known properly and the rest are '
            + 'left to the merchants. It is a bet on which three, and it is written down so '
            + 'that whoever made it can be identified later.');
        }),
      },
      {
        label: 'File the list. This country deals with whoever is at the gate',
        tooltip: '+14 governance points and "Whoever Is At the Gate" (+6% income, −0.4 unrest everywhere) for thirty years. No foreign establishment, no correspondence, and a court that finds out what has changed when it arrives.',
        effects: guard('map:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 14 });
          mod(ctx, 'whoever_is_at_the_gate', 'Whoever Is At the Gate', { incomeMult: 1.06, unrestAll: -0.4 }, 360);
          h.chronicle(ctx, 'era', 'The list is filed and no establishment is kept abroad. This '
            + 'country deals with whoever arrives at the gate, on the day, which is cheap and '
            + 'has never once been early.');
        }),
      },
    ],
  },
];
