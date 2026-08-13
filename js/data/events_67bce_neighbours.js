// Judaea Universalis — the other side of the line: 65–28 BCE (SPEC §241).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The brothers' chapter is about one empire arriving, and its chain and its
// world package both look north-west at Rome. The courts that a courier can
// reach in three days go almost unmentioned: Aretas holding Damascus, the
// priest-king at Chalcis, the Ten Cities counting their years from Pompey, the
// Emesan house on the Orontes, Orhay across the Euphrates, and the nomads on
// the desert edge who are nobody's subjects and everybody's guides.
//
// These are the courts a small kingdom actually negotiates with — the ones it
// marries into, buys grain from, loses caravans to and hires cavalry off.
// Written for whichever chair is playing: the elder brother, the younger, or
// the crown beyond the Euphrates, for whom several of these are not neighbours
// at all but the country next door on the other side.
//
// Sources: Josephus, Antiquities XIV, for Aretas at Damascus, Chalcis and the
// refoundations; Strabo XVI for Emesa, the Ten Cities and the desert edge;
// Pliny VI for Orhay; the civic eras on Decapolis coinage for the year they
// all started counting from.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_67bce_neighbours] ' + key, e || '');
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

export const EVENTS_67_NEIGHBOURS = [

  // ── 65 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67n_the_king_in_damascus',
    title: 'The King in Damascus',
    desc: 'Damascus invited the Nabataean in because its own governors could not keep order, '
      + 'and Aretas has been holding the city for the better part of two decades — a desert '
      + 'king in the richest caravan town in Syria, striking coins in Greek with his own face '
      + 'on them and the word Philhellene underneath.\n\n'
      + 'It is the high-water mark of Petra and everybody can see it will not last, because '
      + 'the legions are coming south and a city like that is the first thing a proconsul '
      + 'organises. The question for this court is what to do in the interval. Aretas holding '
      + 'Damascus is a friendly power on the northern road and an enemy on the southern one, '
      + 'and both of those are true at once and about the same king.',
    forTag: 'player',
    date: { y: -65, m: 8 },
    aiOption: 1,
    historical: 'Aretas III held Damascus from about 84 BCE and struck Hellenistic coinage there. Rome took the city into the province within a few years of arriving.',
    options: [
      {
        label: 'Back him, and take the northern road while it is open',
        tooltip: '−30 talents in subsidy: +10 influence points and "The Damascus Road" (+8% income, +6% trade) for twelve years. When Rome takes the city the arrangement dies with it, and twelve years is twelve years.',
        effects: guard('dam:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, infl: 10 });
          mod(ctx, 'the_damascus_road', 'The Damascus Road', { incomeMult: 1.08, tradeMult: 1.06 }, 144);
          h.chronicle(ctx, 'diplomacy', 'A subsidy goes to the Nabataean in Damascus and the '
            + 'northern road opens. Both courts know what it is worth and how long it has.');
        }),
      },
      {
        label: 'Tell Rome the city would be better in a province',
        tooltip: '+12 influence points with the coming power and "The Helpful Letter" (+5% income) for twelve years, with −8 legitimacy: a small kingdom that helps an empire annex its neighbour has explained its own future to itself.',
        effects: guard('dam:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 12, legitimacy: -8 });
          mod(ctx, 'the_helpful_letter', 'The Helpful Letter', { incomeMult: 1.05 }, 144);
          h.setFlag(ctx, 'helpfulLetter', true);
          h.chronicle(ctx, 'diplomacy', 'A letter goes to the Roman staff explaining why '
            + 'Damascus should be a Roman city. It is well received, filed, and remembered by '
            + 'Petra for thirty years.');
        }),
      },
      {
        label: 'Take the southern road off him while he is looking north',
        tooltip: '+70 talents and +8 martial points, with "The Southern Tolls" (+7% income, +0.8 unrest everywhere) for ten years. He is busy, the ground is soft, and he has a long memory and good cavalry.',
        effects: guard('dam:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 70, mar: 8 });
          mod(ctx, 'the_southern_tolls', 'The Southern Tolls', { incomeMult: 1.07, unrestAll: 0.8 }, 120);
          h.chronicle(ctx, 'war', 'The southern toll stations are taken while the Nabataean is '
            + 'occupied in Syria. The caravans pay here now, and the reprisal is a matter of '
            + 'when.');
        }),
      },
    ],
  },

  // ── 60 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67n_the_cities_pompey_freed',
    title: 'The Cities Pompey Freed',
    desc: 'The Greek cities of the plateau and the coast have started counting years from '
      + 'their liberation, which they date to the arrival of the proconsul, and the new era is '
      + 'on their coins where the old kings\' names used to be. Gadara, Hippos, Pella, Dium, '
      + 'Scythopolis: each of them restored to its assembly, its territory and its charter, '
      + 'and each of them explicitly detached from this kingdom by a Roman order.\n\n'
      + 'They are, from a certain angle, a hostile ring. From another they are ten markets '
      + 'with money, no armies and a permanent nervous interest in staying on good terms with '
      + 'whoever governs the road to them — and the crown that can supply their grain and '
      + 'protect their caravans owns a great deal more of them than the crown that captures '
      + 'their walls.',
    forTag: 'player',
    date: { y: -60, m: 5 },
    aiOption: 1,
    historical: 'Pompey detached the Greek cities from Hasmonean rule and restored their institutions; most dated their coinage from 64/63 BCE for centuries afterwards.',
    options: [
      {
        label: 'Contest it. They were ours and the order was not lawful',
        tooltip: '+10 legitimacy, +6 martial points, and "The Detached Cities" (+5% manpower, +1.0 unrest everywhere) for twelve years. The claim is made loudly and answered by a governor with legions.',
        effects: guard('freed:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10, mar: 6 });
          mod(ctx, 'the_detached_cities', 'The Detached Cities', { manpowerMult: 1.05, unrestAll: 1.0 }, 144);
          h.chronicle(ctx, 'diplomacy', 'The detachment of the cities is contested formally and '
            + 'at length. Nothing is returned and the grievance is on the record, which was '
            + 'most of the point.');
        }),
      },
      {
        label: 'Feed them, bank for them, and carry their goods',
        tooltip: '−35 talents to set the houses up: "The Ten Creditors" (+10% income, +8% trade) for twenty years. They keep their charters and owe us their winter.',
        effects: guard('freed:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35 });
          mod(ctx, 'the_ten_creditors', 'The Ten Creditors', { incomeMult: 1.10, tradeMult: 1.08 }, 240);
          h.setFlag(ctx, 'tenCreditors', true);
          h.chronicle(ctx, 'era', 'Grain, credit and carriage for the freed cities, from houses '
            + 'in this kingdom. They keep every charter and a good deal of their trade is ours '
            + 'inside a decade.');
        }),
      },
      {
        label: 'Accept it and fix the border properly',
        tooltip: '+14 governance points and "The Settled Border" (+6% income, −0.7 unrest everywhere) for twenty years. A frontier everybody agrees on is worth more than a claim nobody will enforce.',
        effects: guard('freed:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 14 });
          mod(ctx, 'the_settled_border', 'The Settled Border', { incomeMult: 1.06, unrestAll: -0.7 }, 240);
          h.chronicle(ctx, 'diplomacy', 'The new border with the freed cities is surveyed, '
            + 'marked and registered with the province. Nobody is happy and nobody argues '
            + 'about it again for forty years.');
        }),
      },
    ],
  },

  // ── 56 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67n_samaria_rebuilt',
    title: 'Samaria Rebuilt',
    desc: 'The proconsul is refounding towns, and one of them is Samaria — walls, a grid, a '
      + 'settlement of veterans and Greek-speaking colonists, on the ridge in the middle of the '
      + 'country, astride the road between the north and the south.\n\n'
      + 'The old population is still there and is not being consulted. The Keepers on Gerizim, '
      + 'five miles away, regard the whole project as a foreign city dropped on their district. '
      + 'And the strategic fact is simple and unwelcome: whoever holds that ridge cuts this '
      + 'country in half, it is being rebuilt by somebody else, and the colonists going into it '
      + 'are being chosen partly for their willingness to hold it against the people around '
      + 'them.',
    forTag: 'player',
    date: { y: -56, m: 4 },
    aiOption: 0,
    historical: 'Gabinius refounded Samaria and several other towns in the 50s; Herod later rebuilt it as Sebaste with a temple to Augustus on the summit.',
    options: [
      {
        label: 'Get our own people into the settlement lists',
        tooltip: '−45 talents in land purchases and agents: +10 governance points and "Inside the New Town" (+7% income, −0.4 unrest everywhere) for fifteen years. A quarter of the colonists are ours and nobody in Antioch noticed.',
        effects: guard('sam:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, gov: 10 });
          mod(ctx, 'inside_the_new_town', 'Inside the New Town', { incomeMult: 1.07, unrestAll: -0.4 }, 180);
          h.setFlag(ctx, 'insideNewTown', true);
          h.chronicle(ctx, 'era', 'Agents of this court buy into the settlement lists of the '
            + 'refounded city. A quarter of the colonists answer, quietly, to somebody south of '
            + 'the ridge.');
        }),
      },
      {
        label: 'Make common cause with the Keepers about it',
        tooltip: '+12 influence points and "The Ridge Understanding" (+5% income, −0.6 unrest everywhere) for fifteen years, with −8 legitimacy from every house that will not sit at a table with Gerizim.',
        effects: guard('sam:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 12, legitimacy: -8 });
          mod(ctx, 'the_ridge_understanding', 'The Ridge Understanding', { incomeMult: 1.05, unrestAll: -0.6 }, 180);
          h.chronicle(ctx, 'diplomacy', 'A quiet understanding is reached with the Keepers about '
            + 'the new city on the ridge. It is the first useful conversation the two have had '
            + 'in two hundred years and neither writes it down.');
        }),
      },
      {
        label: 'Build our own road around it',
        tooltip: '−55 talents to cut and garrison a bypass through the hills: +8 martial points and "The Road Around the Ridge" (+6% income, +4% manpower) for twenty years. The city can hold the ridge; it can no longer cut the country.',
        effects: guard('sam:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, mar: 8 });
          mod(ctx, 'road_around_the_ridge', 'The Road Around the Ridge', { incomeMult: 1.06, manpowerMult: 1.04 }, 240);
          h.chronicle(ctx, 'war', 'A road is cut and garrisoned around the ridge through worse '
            + 'country. It is slower, it is ours, and the new city no longer sits on the only '
            + 'way north.');
        }),
      },
    ],
  },

  // ── 52 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67n_the_man_at_chalcis',
    title: 'The Man at Chalcis',
    desc: 'Ptolemy son of Mennaeus rules the Beqaa and the mountains from a fortress at Chalcis '
      + 'with about eight thousand men, most of them archers, and a policy of paying whoever '
      + 'has just arrived with an army. He bought off Pompey for a thousand talents, he shelters '
      + 'anybody\'s fugitives for a price, and he has married into three ruling houses '
      + 'including this one\'s cousins.\n\n'
      + 'He is a bandit with a genealogy, he is the northern march, and he will outlive most of '
      + 'the men currently writing him off. What the court has to decide is whether a neighbour '
      + 'like that is a wall between this kingdom and Syria, or a hole in it that anybody can '
      + 'rent.',
    forTag: 'player',
    date: { y: -52, m: 9 },
    aiOption: 1,
    historical: 'Ptolemy son of Mennaeus of Chalcis bought off Pompey, sheltered Hasmonean fugitives, and married his son to Alexandra of the Hasmonean house.',
    options: [
      {
        label: 'Marry into it and make the march ours',
        tooltip: '−25 talents on the settlement: +12 influence points and "The Northern March" (+6% manpower, +6% morale, +4% income) for fifteen years. His archers ride for us, and his fugitives become our problem.',
        effects: guard('chal:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -25, infl: 12 });
          mod(ctx, 'the_northern_march', 'The Northern March', { manpowerMult: 1.06, moraleMult: 1.06, incomeMult: 1.04 }, 180);
          h.setFlag(ctx, 'chalcisMarriage', true);
          h.chronicle(ctx, 'diplomacy', 'A marriage settles the northern march on the house at '
            + 'Chalcis and its archers on our muster rolls. So does everybody the mountain is '
            + 'currently sheltering.');
        }),
      },
      {
        label: 'Pay him to shelter nobody of ours',
        tooltip: '−45 talents a decade: +10 governance points and "Nobody Sheltered" (−0.7 unrest everywhere, +4% income) for fifteen years. Every claimant this kingdom produces now has one fewer place to sit and wait.',
        effects: guard('chal:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, gov: 10 });
          mod(ctx, 'nobody_sheltered', 'Nobody Sheltered', { unrestAll: -0.7, incomeMult: 1.04 }, 180);
          h.chronicle(ctx, 'diplomacy', 'A retainer is paid to Chalcis on one condition: that '
            + 'nobody with a claim to this crown is fed on that mountain. It is cheaper than a '
            + 'campaign and it has to be paid every year.');
        }),
      },
      {
        label: 'Break him',
        tooltip: '−65 talents and a northern campaign: +12 martial points and "The March Taken" (+6% force limit, +5% income) for fifteen years, with +1.1 unrest everywhere for eight and a mountain that has to be held by somebody.',
        effects: guard('chal:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -65, mar: 12 });
          mod(ctx, 'the_march_taken', 'The March Taken', { forceLimitMult: 1.06, incomeMult: 1.05, unrestAll: 1.1 }, 180);
          h.chronicle(ctx, 'war', 'The mountain is taken off the house at Chalcis. It has to be '
            + 'garrisoned from that day on, in a country where every valley is a separate '
            + 'problem.');
        }),
      },
    ],
  },

  // ── 48 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67n_the_grain_of_egypt',
    title: 'The Grain of Egypt',
    desc: 'Egypt has a Roman army in it, two Ptolemies at war with each other, and the largest '
      + 'grain surplus on earth sitting in the Delta warehouses while nobody with authority '
      + 'signs for it. Everybody in the eastern Mediterranean who eats bread has noticed.\n\n'
      + 'The offer that has come north is from the factors rather than from any king: standing '
      + 'contracts, in advance, at a price that will look absurd in five years, for whoever '
      + 'can guarantee the carriage and put money down now. It is the single largest commercial '
      + 'opportunity of the decade and it requires the court to bet that the winner in '
      + 'Alexandria will honour paper signed by the loser.',
    forTag: 'player',
    date: { y: -48, m: 6 },
    aiOption: 0,
    historical: 'The Alexandrian war of 48–47 left Egypt\'s grain trade in the hands of whoever could organise carriage; Judaean and Nabataean intermediaries did well out of it.',
    options: [
      {
        label: 'Sign the contracts and put the money down',
        tooltip: '−70 talents now: "The Delta Contracts" (+12% income, +8% trade) for fifteen years. A bet on a civil war, and the paper is honoured.',
        effects: guard('egy:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70 });
          mod(ctx, 'the_delta_contracts', 'The Delta Contracts', { incomeMult: 1.12, tradeMult: 1.08 }, 180);
          h.setFlag(ctx, 'deltaContracts', true);
          h.chronicle(ctx, 'era', 'The Delta contracts are signed and paid for in advance, in '
            + 'the middle of somebody else\'s civil war. Every one of them is honoured.');
        }),
      },
      {
        label: 'Carry it for a commission and sign for nothing',
        tooltip: '−25 talents into hulls and drovers: "The Carriers" (+8% income, +7% trade) for fifteen years. Less upside, no exposure, and the ships are ours whoever wins.',
        effects: guard('egy:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -25 });
          mod(ctx, 'the_carriers', 'The Carriers', { incomeMult: 1.08, tradeMult: 1.07 }, 180);
          h.chronicle(ctx, 'era', 'The crown puts its money into carriage rather than into '
            + 'contracts. It earns less and it cannot be repudiated by anybody.');
        }),
      },
      {
        label: 'Fill our own granaries at that price and sell nothing',
        tooltip: '−55 talents: +10 legitimacy and "The Full Granaries" (+5% income, +5% growth, −0.8 unrest everywhere) for fifteen years. There will be a bad year and this country will not notice it.',
        effects: guard('egy:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, legitimacy: 10 });
          mod(ctx, 'the_full_granaries', 'The Full Granaries', { incomeMult: 1.05, growthMult: 1.05, unrestAll: -0.8 }, 180);
          h.chronicle(ctx, 'era', 'Egyptian grain is bought at the bottom of the market and put '
            + 'into this country\'s own stores. Nothing is resold. The next failed harvest '
            + 'passes almost unremarked.');
        }),
      },
    ],
  },

  // ── 44 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67n_the_kings_of_orhay',
    title: 'The Kings of Orhay',
    desc: 'Across the Euphrates, in a town the Greeks call Edessa and its own people call '
      + 'Orhay, there is a small dynasty that has been playing the same hand for a century: '
      + 'nominally Parthian, occasionally Roman, permanently in the middle, and rich because '
      + 'everything crossing the river crosses somewhere near it.\n\n'
      + 'They have sent an embassy, and what they want is exactly what this court wants — a '
      + 'correspondent on the other side of the great quarrel, so that each of them hears '
      + 'about a war before it arrives. They are also the road to the Jewish communities of '
      + 'the rivers, which are large, old and have never once been asked for anything by '
      + 'anybody in Jerusalem.',
    forTag: 'player',
    date: { y: -44, m: 7 },
    aiOption: 0,
    historical: 'Osrhoene and its capital Edessa survived between Rome and Parthia for three centuries by never fully committing to either.',
    options: [
      {
        label: 'Exchange residents, and share what each of us hears',
        tooltip: '−30 talents on the household and the couriers: +14 influence points and "The Ear Across the River" (+6% income, +5% manpower) for twenty years. Two small courts on opposite banks of the world\'s quarrel, telling each other what is coming.',
        effects: guard('orhay:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, infl: 14 });
          mod(ctx, 'ear_across_the_river', 'The Ear Across the River', { incomeMult: 1.06, manpowerMult: 1.05 }, 240);
          h.setFlag(ctx, 'orhayResident', true);
          h.chronicle(ctx, 'diplomacy', 'Residents are exchanged with the court at Orhay. Each '
            + 'hears about the other side\'s wars two months before the other side\'s empire '
            + 'announces them.');
        }),
      },
      {
        label: 'Use the road to reach the communities of the rivers',
        tooltip: '−40 talents: +12 influence points and "The River Communities" (+9% income, +6% trade) for twenty years. Babylon, Nehardea and Nisibis are a nation this crown has never written to.',
        effects: guard('orhay:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, infl: 12 });
          mod(ctx, 'the_river_communities', 'The River Communities', { incomeMult: 1.09, tradeMult: 1.06 }, 240);
          h.setFlag(ctx, 'riverCommunities', true);
          h.chronicle(ctx, 'diplomacy', 'The road through Orhay opens the communities of the '
            + 'rivers to this court for the first time. What comes back is money, students and '
            + 'an entirely different account of the world.');
        }),
      },
      {
        label: 'Nothing that a Roman clerk could read as an eastern letter',
        tooltip: '+10 governance points and "Nothing in the Post" (−0.4 unrest everywhere) for twelve years. A correspondence across the Euphrates is a treason charge waiting for a bad governor, and this court declines to write one.',
        effects: guard('orhay:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 10 });
          mod(ctx, 'nothing_in_the_post', 'Nothing in the Post', { unrestAll: -0.4 }, 144);
          h.chronicle(ctx, 'era', 'The embassy from Orhay is received warmly and answered with '
            + 'nothing that could be read out in a Roman court.');
        }),
      },
    ],
  },

  // ── 40 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67n_the_priest_kings_of_emesa',
    title: 'The Priest-Kings of Emesa',
    desc: 'On the Orontes there is a dynasty that is a family, a priesthood and a cavalry '
      + 'contract all at once. The house of Sampsigeramus rules Emesa, serves the black stone '
      + 'of its own god, and fields the best light horse in Syria — which it rents out, '
      + 'reliably, to whichever Roman is currently senior in the east.\n\n'
      + 'They are the model client: never rebellious, never important, never absent from a '
      + 'muster. Three centuries from now one of their descendants will be Roman emperor and '
      + 'will bring the stone with him. For the moment the relevant fact is narrower — they '
      + 'have a thousand horse available this season, they have no quarrel with anybody here, '
      + 'and everything about the next ten years is going to be decided by who has cavalry.',
    forTag: 'player',
    date: { y: -40, m: 5 },
    aiOption: 0,
    historical: 'The Emesene dynasty supplied auxiliary cavalry to Rome for two centuries and produced, eventually, the emperor Elagabalus and the empress Julia Domna\'s family.',
    options: [
      {
        label: 'Hire the horse',
        tooltip: '−55 talents for the season: +12 martial points and "The Emesan Horse" (+8% morale, +6% discipline) for ten years. The gap in this army has always been cavalry and it is now filled by somebody else\'s.',
        effects: guard('eme:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, mar: 12 });
          mod(ctx, 'the_emesan_horse', 'The Emesan Horse', { moraleMult: 1.08, disciplineMult: 1.06 }, 120);
          h.setFlag(ctx, 'emesanHorse', true);
          h.chronicle(ctx, 'war', 'A thousand Emesan horse are hired for the season and stay '
            + 'for ten years. It is the first time this army has had cavalry worth the name.');
        }),
      },
      {
        label: 'Learn how they do it and raise our own',
        tooltip: '−70 talents and a decade: +10 martial points and "Horse of Our Own" (+7% morale, +5% force limit, +4% manpower) for twenty years. Slower, dearer, and it does not go home when the contract ends.',
        effects: guard('eme:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, mar: 10 });
          mod(ctx, 'horse_of_our_own', 'Horse of Our Own', { moraleMult: 1.07, forceLimitMult: 1.05, manpowerMult: 1.04 }, 240);
          h.chronicle(ctx, 'war', 'Emesan riding-masters are hired to teach rather than to '
            + 'fight. In ten years there is a cavalry arm on this kingdom\'s own muster roll.');
        }),
      },
      {
        label: 'A marriage and a standing friendship instead',
        tooltip: '−20 talents: +12 influence points and "The Orontes Friendship" (+5% income, +4% morale, −0.4 unrest everywhere) for twenty years. Not soldiers — a court on the Orontes that answers letters.',
        effects: guard('eme:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -20, infl: 12 });
          mod(ctx, 'the_orontes_friendship', 'The Orontes Friendship', { incomeMult: 1.05, moraleMult: 1.04, unrestAll: -0.4 }, 240);
          h.chronicle(ctx, 'diplomacy', 'A marriage and a standing friendship are made with the '
            + 'priest-kings of Emesa. No troops are hired and the letters run both ways for '
            + 'sixty years.');
        }),
      },
    ],
  },

  // ── 36 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67n_the_desert_edge',
    title: 'The Desert Edge',
    desc: 'East of the cultivated line there is no border, because there is nothing for a '
      + 'border to be drawn on. There are wells, and the people who know where they are: clans '
      + 'moving flocks on a circuit that takes a year, who scratch their names and their '
      + 'grievances on the basalt where they camp and who have no king, no capital and no '
      + 'interest in acquiring either.\n\n'
      + 'To a chancery they are a raiding problem. To a quartermaster they are the only people '
      + 'who can move a column across two hundred miles of nothing, and to a merchant they are '
      + 'the difference between a caravan and a loss. Every empire that has come through here '
      + 'has eventually worked out that the desert is not a frontier to be held but a service '
      + 'to be bought, and each of them has taken about thirty years to work it out.',
    forTag: 'player',
    date: { y: -36, m: 9 },
    aiOption: 1,
    historical: 'The Safaitic inscriptions of the basalt desert record the nomad clans of exactly this frontier — their camps, their raids and their grazing years — over several centuries.',
    options: [
      {
        label: 'A line of forts and a patrol season',
        tooltip: '−70 talents: +10 martial points and "The Desert Line" (+5% force limit, −0.6 unrest everywhere) for fifteen years. It works, it costs every year, and it is obsolete the first time somebody goes round it.',
        effects: guard('desert:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, mar: 10 });
          mod(ctx, 'the_desert_line', 'The Desert Line', { forceLimitMult: 1.05, unrestAll: -0.6 }, 180);
          h.chronicle(ctx, 'war', 'Forts and a patrol season are established on the desert edge. '
            + 'The line holds where it is and the raiding moves forty miles south.');
        }),
      },
      {
        label: 'Buy the wells: subsidy, grazing rights and guides',
        tooltip: '−40 talents a decade: +12 influence points and "The Wells Bought" (+8% income, +7% trade, −0.5 unrest everywhere) for twenty years. The men who were the raiding problem are the escort now.',
        effects: guard('desert:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, infl: 12 });
          mod(ctx, 'the_wells_bought', 'The Wells Bought', { incomeMult: 1.08, tradeMult: 1.07, unrestAll: -0.5 }, 240);
          h.setFlag(ctx, 'wellsBought', true);
          h.chronicle(ctx, 'diplomacy', 'Grazing rights, a subsidy and a guiding contract are '
            + 'agreed with the clans of the desert edge. The caravans stop being robbed by the '
            + 'people now escorting them.');
        }),
      },
      {
        label: 'Settle the edge with our own villages',
        tooltip: '−60 talents in wells, seed and title: "The Sown Edge" (+7% income, +7% growth, +4% manpower) for twenty years, with +0.7 unrest everywhere for eight while the grazing circuit is renegotiated the hard way.',
        effects: guard('desert:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60 });
          mod(ctx, 'the_sown_edge', 'The Sown Edge', { incomeMult: 1.07, growthMult: 1.07, manpowerMult: 1.04, unrestAll: 0.7 }, 240);
          h.chronicle(ctx, 'era', 'Wells are sunk and villages planted along the desert edge. '
            + 'The sown land advances ten miles and the grazing circuit it interrupted is '
            + 'renegotiated over about a decade of trouble.');
        }),
      },
    ],
  },

  // ── 32 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67n_the_neighbours_choose',
    title: 'The Neighbours Choose',
    desc: 'Every client court from the Taurus to the cataracts is doing the same arithmetic in '
      + 'the same month, because the Roman world has finally divided into two halves that will '
      + 'have to fight, and every small crown has to be standing next to the winner when it is '
      + 'over. Emesa is hedging. Chalcis has committed. Nabataea is being visibly careful. '
      + 'Egypt is one of the two halves.\n\n'
      + 'What is unusual is that for once the decision is legible in advance: the eastern side '
      + 'has the fleet, the money and the grain, and the western side has Italy and the '
      + 'recruiting grounds, and every professional in the region can list those and still not '
      + 'tell you which wins. The courts that survive this decade are mostly the ones that '
      + 'manage to be useful without being committed, and it is not clear in advance which of '
      + 'those is which either.',
    forTag: 'player',
    date: { y: -32, m: 6 },
    aiOption: 1,
    historical: 'Most eastern client kingdoms backed Antony and kept their thrones anyway; Octavian confirmed nearly all of them, on the stated ground that a client\'s loyalty to his patron was a recommendation.',
    options: [
      {
        label: 'Commit, early and visibly, to one of them',
        tooltip: '+12 influence points and "The Early Commitment" (+7% income, +5% morale) for fifteen years, with +0.8 unrest everywhere for six. A patron remembers who came first, and so does the other one.',
        effects: guard('choose:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 12 });
          mod(ctx, 'the_early_commitment', 'The Early Commitment', { incomeMult: 1.07, moraleMult: 1.05, unrestAll: 0.8 }, 180);
          h.setFlag(ctx, 'earlyCommitment', true);
          h.chronicle(ctx, 'diplomacy', 'The court commits early and publicly to one side of '
            + 'the Roman quarrel. It is the sort of decision that is either forgotten or quoted '
            + 'for thirty years.');
        }),
      },
      {
        label: 'Be useful to both and committed to neither',
        tooltip: '−35 talents in supplies to whoever asks: +14 governance points and "Useful to Everybody" (+6% income, −0.5 unrest everywhere) for fifteen years. Nobody is grateful and nobody is owed anything.',
        effects: guard('choose:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, gov: 14 });
          mod(ctx, 'useful_to_everybody', 'Useful to Everybody', { incomeMult: 1.06, unrestAll: -0.5 }, 180);
          h.chronicle(ctx, 'diplomacy', 'Grain, guides and harbour rights go to whichever side '
            + 'asks, and nothing is signed with either. It is unheroic and it survives the '
            + 'decade.');
        }),
      },
      {
        label: 'Settle the neighbours\' quarrels while both Romans are busy',
        tooltip: '−45 talents on the negotiations: +12 influence points, +10 governance points, and "The Neighbours\' Peace" (+7% income, +5% trade, −0.6 unrest everywhere) for twenty years. Nobody with a legion is watching this frontier for three years.',
        effects: guard('choose:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, infl: 12, gov: 10 });
          mod(ctx, 'the_neighbours_peace', 'The Neighbours\' Peace', { incomeMult: 1.07, tradeMult: 1.05, unrestAll: -0.6 }, 240);
          h.setFlag(ctx, 'neighboursPeace', true);
          h.chronicle(ctx, 'diplomacy', 'While both Roman sides are looking at each other, the '
            + 'border quarrels of four small courts are settled by the one of them that '
            + 'bothered. All four owe something afterwards.');
        }),
      },
    ],
  },

  // ── 28 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67n_the_kingdoms_re_dated',
    title: 'The Kingdoms Re-Dated',
    desc: 'The settlement of the east is being written and the striking thing about it is how '
      + 'little moves. Almost every client king who backed the loser keeps his throne, on the '
      + 'stated principle that a man who was loyal to his patron will be loyal to the next one; '
      + 'the borders are tidied; two dynasties are quietly ended and their ground given to '
      + 'neighbours who behaved well.\n\n'
      + 'What has actually changed is the paperwork, and the paperwork is the thing. Every '
      + 'kingdom on this frontier now holds its territory by a grant that is dated, signed and '
      + 'revocable, and every one of them has been given a boundary description drawn by a '
      + 'Roman surveyor. There is no more customary ground. There are only the maps, and the '
      + 'office that keeps them.',
    forTag: 'player',
    date: { y: -28, m: 4 },
    aiOption: 0,
    historical: 'The Augustan settlement of the east confirmed most client dynasties in place and regularised their boundaries — replacing customary frontiers with surveyed, documented ones.',
    options: [
      {
        label: 'Get our own surveyors onto the boundary commission',
        tooltip: '−40 talents on the staff and the hospitality: +14 governance points and "The Line We Drew" (+8% income, −0.5 unrest everywhere) for twenty-five years. The map is going to be authoritative for two hundred years; better it is drawn by somebody who has walked it.',
        effects: guard('redate:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, gov: 14 });
          mod(ctx, 'the_line_we_drew', 'The Line We Drew', { incomeMult: 1.08, unrestAll: -0.5 }, 300);
          h.setFlag(ctx, 'boundaryCommission', true);
          h.chronicle(ctx, 'diplomacy', 'This kingdom\'s own surveyors sit on the boundary '
            + 'commission and walk every mile of it. The map that comes out is authoritative, '
            + 'and it is generous in the three places that mattered.');
        }),
      },
      {
        label: 'Trade ground for a better grant',
        tooltip: '+10 influence points and "The Firmer Title" (+6% income, −0.6 unrest everywhere) for twenty-five years, with −4% force limit. Two districts are given up and what is left is held by a document nobody can argue with.',
        effects: guard('redate:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 10 });
          mod(ctx, 'the_firmer_title', 'The Firmer Title', { incomeMult: 1.06, forceLimitMult: 0.96, unrestAll: -0.6 }, 300);
          h.chronicle(ctx, 'diplomacy', 'Two marginal districts are traded for a firmer grant '
            + 'over everything else. It is a smaller kingdom on a better document.');
        }),
      },
      {
        label: 'Take the grant and keep the customary claims in a drawer',
        tooltip: '+12 governance points, +8 legitimacy, and "The Older Claims" (+4% income, +4% manpower) for twenty years. The signed map is obeyed and the older claims are copied, dated and filed for whenever the office that keeps the maps stops working.',
        effects: guard('redate:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12, legitimacy: 8 });
          mod(ctx, 'the_older_claims', 'The Older Claims', { incomeMult: 1.04, manpowerMult: 1.04 }, 240);
          h.chronicle(ctx, 'era', 'The Roman grant is accepted and obeyed. The customary claims '
            + 'it overwrote are copied out, dated and put in a drawer, against the century in '
            + 'which nobody is keeping the maps.');
        }),
      },
    ],
  },
];
