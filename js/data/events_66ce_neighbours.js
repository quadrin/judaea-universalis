// Judaea Universalis — the other side of the line: 68–127 CE (SPEC §241).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The Great Revolt's chapter looks at Rome, and §240 gave it the nation's own
// interior. The third thing in the room is the ring: the Greek cities of the
// coast whose neighbours turned on each other in the first summer, the client
// kingdom next door that is Jewish and did not rise, Petra, Palmyra, the
// Babylonian colonists on the eastern plateau, the Keepers on the middle
// ridge, and the new communities in the coast towns who are neither of the
// old things and are about to matter enormously.
//
// A war fought in a country this size is fought among neighbours, and the
// settlement afterwards is a settlement with them. The chapter had the war and
// the empire and almost nothing about the fifty miles in between.
//
// Sources: Josephus, War II and VII, for the coast cities, Agrippa's kingdom
// and the Babylonian settlers; Suetonius and Josephus for the annexation of
// Commagene; the Palmyrene tariff and caravan inscriptions; the Bostra and
// Petra papyri for the Nabataean succession; Pliny X and the coastal
// congregations for the communities that were neither.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_66ce_neighbours] ' + key, e || '');
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

export const EVENTS_66_NEIGHBOURS = [

  // ── 68 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev66n_the_greeks_of_the_coast',
    title: 'The Greeks of the Coast',
    desc: 'The coast towns are the part of this war nobody wants to write down. Caesarea, '
      + 'Ascalon, Ptolemais, Tyre, Scythopolis — mixed towns, two populations in the same '
      + 'streets for two hundred years, intermarried at the edges, doing business daily — and '
      + 'in one summer each of them turned on itself, in both directions, town by town, with '
      + 'the numbers running into the thousands.\n\n'
      + 'Whatever else this war settles, those towns have to be lived in afterwards by whoever '
      + 'is left in them. The men now proposing terms have to decide whether the coast is a '
      + 'frontier to be cleared, a set of communities to be put back together at enormous cost, '
      + 'or a place where two populations who have just done this to each other are going to '
      + 'be asked to share a market again by the end of the decade.',
    forTag: 'player',
    date: { y: 68, m: 5 },
    aiOption: 1,
    historical: 'Josephus records reciprocal massacres in the mixed cities of the coast and the Decapolis in 66; Scythopolis, Caesarea and Ascalon are the worst attested.',
    options: [
      {
        label: 'Clear the coast and hold it as a frontier',
        tooltip: '+10 martial points and "The Cleared Coast" (+5% force limit, +4% manpower) for fifteen years, with +1.3 unrest everywhere for eight and a shoreline that is a garrison rather than a market.',
        effects: guard('coast:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { mar: 10, legitimacy: -6 });
          mod(ctx, 'the_cleared_coast', 'The Cleared Coast', { forceLimitMult: 1.05, manpowerMult: 1.04, unrestAll: 1.3 }, 180);
          h.chronicle(ctx, 'war', 'The coast towns are cleared and held as a frontier. The '
            + 'harbours work at a fraction of what they did and the ground is quiet.');
        }),
      },
      {
        label: 'Guarantee both populations in every town, and pay for it',
        tooltip: '−85 talents in restitution, rebuilding and standing wardens: +12 legitimacy, +1 stability, and "The Two Populations" (+8% income, +6% trade, −0.8 unrest everywhere) for twenty years.',
        effects: guard('coast:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -85, legitimacy: 12, stability: 1 });
          mod(ctx, 'the_two_populations', 'The Two Populations', { incomeMult: 1.08, tradeMult: 1.06, unrestAll: -0.8 }, 240);
          h.setFlag(ctx, 'coastGuaranteed', true);
          h.chronicle(ctx, 'era', 'Both populations of every coast town are guaranteed, in '
            + 'writing, with restitution paid and wardens posted. It costs more than the year\'s '
            + 'revenue and the harbours are open by the following spring.');
        }),
      },
      {
        label: 'Move our people inland and let the coast be theirs',
        tooltip: '−50 talents in resettlement: +8 legitimacy and "The Inland Country" (+6% growth, +5% manpower, −0.6 unrest everywhere) for twenty years, with −7% trade. Nobody has to live next to what happened, and this kingdom stops being a maritime one.',
        effects: guard('coast:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, legitimacy: 8 });
          mod(ctx, 'the_inland_country', 'The Inland Country', { growthMult: 1.06, manpowerMult: 1.05, tradeMult: 0.93, unrestAll: -0.6 }, 240);
          h.chronicle(ctx, 'era', 'The Jewish population of the coast towns is moved inland at '
            + 'the crown\'s expense. Nobody is asked to share a street with what happened, and '
            + 'the country loses its harbours.');
        }),
      },
    ],
  },

  // ── 72 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev66n_commagene_ends',
    title: 'Commagene Ends',
    desc: 'The governor of Syria writes to the emperor that the king of Commagene is preparing '
      + 'to revolt to Parthia. There is no evidence, the king denies it, and the legions go in '
      + 'anyway; the kingdom is annexed, the dynasty is pensioned off to Rome and treated with '
      + 'perfect courtesy for the rest of their lives, and the Euphrates crossing at Samosata '
      + 'becomes a legionary fortress.\n\n'
      + 'What has happened is not a punishment. It is a tidying: a frontier that used to run '
      + 'through a set of small kingdoms now runs along a river with legions on it, because '
      + 'that is easier to administer. Every client court in the east reads the file, and the '
      + 'lesson is not about loyalty. Two of them were loyal for a century and are gone.',
    forTag: 'player',
    date: { y: 72, m: 9 },
    world: true,
    worldLabel: 'Rome annexes Commagene and fortifies the Euphrates crossing',
    aiOption: 0,
    historical: 'Commagene was annexed in 72 CE on an unproven accusation; Emesa went the same way within a generation. The eastern client kingdoms were consolidated into provinces across the Flavian period.',
    options: [
      {
        label: 'Take in the dynasty\'s people and their knowledge of the crossing',
        tooltip: '−35 talents: +10 influence points and "The Men Who Knew the River" (+6% income, +5% trade, +4% manpower) for twenty years. Guides, factors and officers who have worked that frontier for three generations.',
        effects: guard('comm:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, infl: 10 });
          mod(ctx, 'men_who_knew_the_river', 'The Men Who Knew the River', { incomeMult: 1.06, tradeMult: 1.05, manpowerMult: 1.04 }, 240);
          h.chronicle(ctx, 'era', 'Commagene\'s factors, guides and officers are taken in. What '
            + 'they know about the crossing is worth more than the kingdom was.');
        }),
      },
      {
        label: 'Read the file and make ourselves administratively convenient',
        tooltip: '+15 governance points and "Easy to Administer" (+7% income, −0.6 unrest everywhere) for twenty-five years. Regular accounts, prompt answers, no disputes — the surest defence available against a tidying.',
        effects: guard('comm:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15 });
          mod(ctx, 'easy_to_administer', 'Easy to Administer', { incomeMult: 1.07, unrestAll: -0.6 }, 300);
          h.setFlag(ctx, 'easyToAdminister', true);
          h.chronicle(ctx, 'era', 'The lesson of Commagene is read correctly: a kingdom is '
            + 'annexed when it becomes easier to administer than to deal with. This one becomes '
            + 'very easy to deal with.');
        }),
      },
      {
        label: 'Open a quiet line to the courts still standing',
        tooltip: '−40 talents on the correspondence: +12 influence points and "The Remaining Kings" (+6% income, +4% morale) for twenty years, with +0.7 unrest everywhere for six if anybody\'s post is read.',
        effects: guard('comm:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, infl: 12 });
          mod(ctx, 'the_remaining_kings', 'The Remaining Kings', { incomeMult: 1.06, moraleMult: 1.04, unrestAll: 0.7 }, 240);
          h.chronicle(ctx, 'diplomacy', 'A quiet correspondence opens with the client courts '
            + 'still standing. Every one of them has now read the same file and reached the '
            + 'same conclusion about the century.');
        }),
      },
    ],
  },

  // ── 77 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev66n_the_kingdom_next_door',
    title: 'The Kingdom Next Door',
    desc: 'There is still a Jewish king on this frontier. He holds the northern districts, the '
      + 'lake towns and the Paneas country; he did not rise; he spent the war on the other '
      + 'side, arguing at every stage that it could not be won; and he is now in his own '
      + 'capital with a kingdom, a treasury and a great many subjects who agree with him and '
      + 'a great many who will not speak to him.\n\n'
      + 'He is the awkward fact of the settlement. Everything he said turned out to be '
      + 'correct, which nobody forgives, and his territory is where a very large number of '
      + 'people from the south are currently trying to go. What is decided about him decides '
      + 'whether there is one Jewish polity on this map with two opinions in it, or two '
      + 'polities that do not correspond.',
    forTag: 'player',
    date: { y: 77, m: 6 },
    aiOption: 1,
    historical: 'Agrippa II ruled his northern kingdom until the 90s, having opposed the revolt throughout. His territory absorbed refugees and remained Jewish for centuries.',
    options: [
      {
        label: 'One nation, two governments: recognise him and correspond',
        tooltip: '−30 talents: +12 influence points and "Two Governments" (+8% income, +5% manpower, −0.5 unrest everywhere) for twenty-five years, with −8 legitimacy from everybody who fought.',
        effects: guard('next:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, infl: 12, legitimacy: -8 });
          mod(ctx, 'two_governments', 'Two Governments', { incomeMult: 1.08, manpowerMult: 1.05, unrestAll: -0.5 }, 300);
          h.setFlag(ctx, 'twoGovernments', true);
          h.chronicle(ctx, 'diplomacy', 'The northern kingdom is recognised and corresponded '
            + 'with. One nation, two governments, and a great many people who will not have the '
            + 'sentence said in front of them.');
        }),
      },
      {
        label: 'Let the refugees go north and help them do it',
        tooltip: '−45 talents on the movement: +10 legitimacy and "The Northern Road" (+6% growth, +4% manpower, −0.6 unrest everywhere) for twenty years. Thousands of people get somewhere they can live, and they are not here.',
        effects: guard('next:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, legitimacy: 10 });
          mod(ctx, 'the_northern_road', 'The Northern Road', { growthMult: 1.06, manpowerMult: 1.04, unrestAll: -0.6 }, 240);
          h.chronicle(ctx, 'era', 'The road north is opened and paid for. Thousands of people '
            + 'who could not stay end up somewhere they can, in a kingdom whose king they will '
            + 'not name.');
        }),
      },
      {
        label: 'Nothing. He was on the other side',
        tooltip: '+10 legitimacy with everybody who fought and "No Letters North" (−0.4 unrest everywhere) for fifteen years, with −6% income. The two Jewish polities on this map do not correspond, and the next generation grows up thinking that is natural.',
        effects: guard('next:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10 });
          mod(ctx, 'no_letters_north', 'No Letters North', { unrestAll: -0.4, incomeMult: 0.94 }, 180);
          h.chronicle(ctx, 'era', 'No letter goes north and none is answered. Within a '
            + 'generation the two halves of one nation are corresponding through third '
            + 'parties, when they correspond at all.');
        }),
      },
    ],
  },

  // ── 82 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev66n_petra_after_the_war',
    title: 'Petra After the War',
    desc: 'The Nabataeans sent a contingent to the Roman side and have spent every year since '
      + 'quietly regretting how visible it was. They are the last real kingdom on this frontier '
      + 'and they can count: Commagene is gone, Emesa is going, the client system is being '
      + 'wound up, and the only question about Petra is the year.\n\n'
      + 'What has arrived is not an alliance proposal, because neither court is in a position '
      + 'to make one. It is smaller and stranger: a proposal to co-operate on the things that '
      + 'do not look like policy — water rights in the dry country, a shared assize for '
      + 'caravan disputes, mutual recognition of contracts, and an agreement about which '
      + 'wells nobody fortifies. Every clause is technical. The document as a whole is two '
      + 'kingdoms that expect to be annexed agreeing on what they want to survive them.',
    forTag: 'player',
    date: { y: 82, m: 4 },
    aiOption: 0,
    historical: 'Nabataea supplied auxiliaries to Titus and was annexed anyway in 106. Its legal and commercial arrangements outlived the kingdom by centuries.',
    options: [
      {
        label: 'Sign every technical clause',
        tooltip: '−35 talents: +12 influence points and "What Outlives Kingdoms" (+9% income, +7% trade, −0.4 unrest everywhere) for thirty years. Water, contracts and an assize: the parts of a state that do not need a state.',
        effects: guard('petra66:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, infl: 12 });
          mod(ctx, 'what_outlives_kingdoms', 'What Outlives Kingdoms', { incomeMult: 1.09, tradeMult: 1.07, unrestAll: -0.4 }, 360);
          h.setFlag(ctx, 'technicalTreaty', true);
          h.chronicle(ctx, 'diplomacy', 'The technical agreement with Petra is signed clause by '
            + 'clause: water, contracts, caravan disputes, and the wells neither side will '
            + 'fortify. It is still being cited a century after both crowns are gone.');
        }),
      },
      {
        label: 'Take the trade clauses and refuse the rest',
        tooltip: '+8 influence points and "The Caravan Clauses" (+7% income, +6% trade) for twenty years. Commerce only, nothing that a governor could read as an understanding between two kingdoms.',
        effects: guard('petra66:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 8 });
          mod(ctx, 'the_caravan_clauses', 'The Caravan Clauses', { incomeMult: 1.07, tradeMult: 1.06 }, 240);
          h.chronicle(ctx, 'era', 'The commercial clauses are taken and the rest returned. It is '
            + 'the cautious half of a good document.');
        }),
      },
      {
        label: 'Position ourselves to inherit the trade when the kingdom goes',
        tooltip: '−50 talents into agents, warehousing and guides in their own towns: "The Successor Houses" (+11% income, +6% trade) for thirty years, and −6 influence points with a neighbour who works out what is being done.',
        effects: guard('petra66:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, infl: -6 });
          mod(ctx, 'the_successor_houses', 'The Successor Houses', { incomeMult: 1.11, tradeMult: 1.06 }, 360);
          h.chronicle(ctx, 'era', 'Agents, warehouses and guides are established inside the '
            + 'Nabataean towns against the day the kingdom ends. Petra notices, and cannot '
            + 'think of a way to object that does not concede the premise.');
        }),
      },
    ],
  },

  // ── 87 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev66n_the_squadrons_of_batanaea',
    title: 'The Squadrons of Batanaea',
    desc: 'On the eastern plateau there is a district of Jewish villages founded three '
      + 'generations ago by horse-archers out of Babylonia, held on a soldier\'s tenure, '
      + 'commanded by the founder\'s descendants, and exempt from tribute in exchange for '
      + 'service. They fought on both sides of the late war and mostly on neither, and they '
      + 'still muster four hundred horse in a fortnight.\n\n'
      + 'They are the only Jewish military tradition left standing on this map, and their '
      + 'position is peculiar: too far east to be administered closely, too useful to be '
      + 'disbanded, too Jewish to be trusted by a province and too professional to be ignored '
      + 'by it. What is done with them decides whether the nation has an armed frontier '
      + 'district or a folk memory of one.',
    forTag: 'player',
    date: { y: 87, m: 8 },
    aiOption: 1,
    historical: 'The Babylonian military colony in Batanaea survived the revolt and its commanders — Philip son of Jacimus and his family — were still leading it in the 60s and after.',
    options: [
      {
        label: 'Confirm the tenure and the command in the founder\'s line',
        tooltip: '+10 martial points, +8 legitimacy, and "The Eastern Squadrons" (+7% manpower, +6% morale, +1 defence in hill country) for twenty-five years. An armed Jewish district on the plateau, hereditary and exempt, for as long as anybody lets it be.',
        effects: guard('bat:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { mar: 10, legitimacy: 8 });
          mod(ctx, 'the_eastern_squadrons', 'The Eastern Squadrons', { manpowerMult: 1.07, moraleMult: 1.06, hillDefBonus: 1 }, 300);
          h.setFlag(ctx, 'easternSquadrons', true);
          h.chronicle(ctx, 'war', 'The eastern squadrons are confirmed in their tenure and their '
            + 'command. Four hundred horse on the plateau, hereditary, exempt, and Jewish.');
        }),
      },
      {
        label: 'Turn the exemption into a stipend and the command into an appointment',
        tooltip: '−45 talents a decade: +14 governance points and "The Regularised District" (+6% manpower, +5% income, −0.4 unrest everywhere) for twenty-five years. It is a unit of the state now instead of a family with a duty.',
        effects: guard('bat:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, gov: 14 });
          mod(ctx, 'the_regularised_district', 'The Regularised District', { manpowerMult: 1.06, incomeMult: 1.05, unrestAll: -0.4 }, 300);
          h.chronicle(ctx, 'era', 'The eastern district is regularised: a stipend instead of an '
            + 'exemption, an appointment instead of an inheritance. It is better governed and '
            + 'the muster is slower every decade.');
        }),
      },
      {
        label: 'Bring the families west and settle them among us',
        tooltip: '−55 talents: +10 martial points and "The Horse Brought West" (+6% morale, +5% manpower, +4% growth) for twenty-five years. The skill comes into the heartland; the plateau district ceases to be Jewish within two generations.',
        effects: guard('bat:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, mar: 10 });
          mod(ctx, 'horse_brought_west', 'The Horse Brought West', { moraleMult: 1.06, manpowerMult: 1.05, growthMult: 1.04 }, 300);
          h.chronicle(ctx, 'era', 'The Babylonian families are brought west and settled in the '
            + 'heartland with their horses. The plateau villages are somebody else\'s within '
            + 'two generations and the riding is not lost.');
        }),
      },
    ],
  },

  // ── 93 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev66n_the_middle_ridge',
    title: 'The Middle Ridge',
    desc: 'The district in the middle of the country did not rise. The Keepers on Gerizim sat '
      + 'out the war — with, according to the accounts, one bad afternoon on the mountain that '
      + 'both sides describe differently — and they are still there: their own book, their own '
      + 'priesthood, their own calendar, and a population that on some counts is not much '
      + 'smaller than the one south of them.\n\n'
      + 'Between the northern districts and the southern ones there is now a belt of people '
      + 'who are not Rome and are not us and have to be crossed by everybody going anywhere. '
      + 'Every road, every courier, every pilgrim and every levy passes through a district '
      + 'that has spent a thousand years being told it is a heresy, and the practical '
      + 'arrangements have all been made informally by people at the village level who need '
      + 'to get through.',
    forTag: 'player',
    date: { y: 93, m: 5 },
    aiOption: 0,
    historical: 'The Samaritan community remained large and self-governing through the Roman period; the roads between Galilee and Judaea ran through it, and rabbinic sources argue at length about whether to use them.',
    options: [
      {
        label: 'Formalise the passage: safe conduct, both ways, in writing',
        tooltip: '−30 talents: +14 governance points and "The Ridge Passage" (+7% income, +5% festival draw, −0.6 unrest everywhere) for twenty-five years. The pilgrim road works and neither side has conceded a word of theology.',
        effects: guard('ridge:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, gov: 14 });
          mod(ctx, 'the_ridge_passage', 'The Ridge Passage', { incomeMult: 1.07, pilgrimMult: 1.05, unrestAll: -0.6 }, 300);
          h.setFlag(ctx, 'ridgePassage', true);
          h.chronicle(ctx, 'diplomacy', 'Safe conduct through the middle district is agreed in '
            + 'writing, both ways, with wardens on the road. Not one clause mentions which '
            + 'mountain.');
        }),
      },
      {
        label: 'Use the valley road and go round',
        tooltip: '−45 talents to make and hold the valley route: +8 legitimacy with the strict houses and "The Long Way" (+4% income, −0.3 unrest everywhere) for twenty years. Two extra days each way, for ever, and nobody has to talk to anybody.',
        effects: guard('ridge:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, legitimacy: 8 });
          mod(ctx, 'the_long_way', 'The Long Way', { incomeMult: 1.04, unrestAll: -0.3 }, 240);
          h.chronicle(ctx, 'era', 'The valley road is made up and used instead. It is two days '
            + 'longer each way and it is used by everybody for four hundred years.');
        }),
      },
      {
        label: 'One law for both districts, enforced by one bench',
        tooltip: '+16 governance points and "One Bench for the Middle" (+8% income, −0.7 unrest everywhere) for twenty-five years, with −10 legitimacy from every house on both mountains that regards the proposal as an outrage.',
        effects: guard('ridge:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 16, legitimacy: -10 });
          mod(ctx, 'one_bench_for_the_middle', 'One Bench for the Middle', { incomeMult: 1.08, unrestAll: -0.7 }, 300);
          h.chronicle(ctx, 'era', 'A single bench is seated for the middle districts, applying '
            + 'one civil law to both communities. The priesthoods of two mountains denounce it '
            + 'in identical language.');
        }),
      },
    ],
  },

  // ── 98 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev66n_the_legion_that_stays',
    title: 'The Legion That Stays',
    desc: 'The garrison arrangement has been revised and the revision is permanent. There is a '
      + 'legion in the country now — camp, canabae, brickworks with its own stamp, a road '
      + 'programme, a veteran colony, and a legate who outranks every civil official in the '
      + 'province.\n\n'
      + 'A legion is not primarily a military fact. It is an economy: it buys grain, oil, '
      + 'leather, timber and building stone on a scale nothing else here does, it pays in '
      + 'coin, and the district around it becomes rich and dependent inside a decade. It is '
      + 'also a permanent presence of twelve thousand men whose retirement plan is land, in a '
      + 'country where the land question is the only question. Both of those arrive together '
      + 'and cannot be separated.',
    forTag: 'player',
    date: { y: 98, m: 3 },
    aiOption: 0,
    historical: 'A legion was permanently stationed in Judaea from the Flavian period and a second added under Hadrian; their supply contracts and veteran settlements reshaped the province.',
    options: [
      {
        label: 'Take the contracts: feed it, build for it, carry for it',
        tooltip: '−35 talents to set up: "The Army Contracts" (+11% income, +6% trade, +5% growth) for twenty-five years, with +0.6 unrest everywhere for eight from everybody who does not like where the money comes from.',
        effects: guard('legion:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35 });
          mod(ctx, 'the_army_contracts', 'The Army Contracts', { incomeMult: 1.11, tradeMult: 1.06, growthMult: 1.05, unrestAll: 0.6 }, 300);
          h.setFlag(ctx, 'armyContracts66', true);
          h.chronicle(ctx, 'era', 'Grain, oil, leather, timber and stone for the legion, on '
            + 'standing contracts. The district around the camp is the richest in the country '
            + 'within ten years and everybody knows exactly why.');
        }),
      },
      {
        label: 'Buy the land the veterans will want, before they want it',
        tooltip: '−70 talents: +12 governance points and "The Land Held" (+7% income, −0.7 unrest everywhere, +4% manpower) for thirty years. The settlement question is answered with money in advance instead of with a grievance afterwards.',
        effects: guard('legion:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, gov: 12 });
          mod(ctx, 'the_land_held', 'The Land Held', { incomeMult: 1.07, manpowerMult: 1.04, unrestAll: -0.7 }, 360);
          h.setFlag(ctx, 'veteranLandHeld', true);
          h.chronicle(ctx, 'era', 'The land the veterans will be granted is bought up quietly in '
            + 'advance. When the grants are made, most of them are made out of ground somebody '
            + 'here already owns.');
        }),
      },
      {
        label: 'Keep our distance from all of it',
        tooltip: '+10 legitimacy and "No Contracts, No Camp" (−0.6 unrest everywhere) for twenty years, with −7% income. Somebody else feeds the legion, gets rich on it, and is remembered for it.',
        effects: guard('legion:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10 });
          mod(ctx, 'no_contracts_no_camp', 'No Contracts, No Camp', { unrestAll: -0.6, incomeMult: 0.93 }, 240);
          h.chronicle(ctx, 'era', 'The army contracts are left to somebody else. They make '
            + 'somebody else rich, and the somebody else is named in the sources for four '
            + 'generations.');
        }),
      },
    ],
  },

  // ── 104 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev66n_the_caravan_city',
    title: 'The Caravan City',
    desc: 'Palmyra has become the most useful place in the world and it did it by being in the '
      + 'middle of nowhere. An oasis in the desert between two empires, it has organised the '
      + 'entire land route from the Euphrates to the coast: its own caravan-protection '
      + 'troops, its own tariff law carved in stone in two languages, its own merchant '
      + 'families with agents from the Gulf to the Tiber, and a set of arrangements with both '
      + 'great powers that neither of them has ever quite formalised.\n\n'
      + 'Their proposal is to run the western end of the route through this country rather '
      + 'than through the northern ports. It would be the largest single commercial '
      + 'arrangement anybody here has ever made, and it would tie this country\'s prosperity '
      + 'to a city whose entire position depends on two empires continuing not to fight.',
    forTag: 'player',
    date: { y: 104, m: 6 },
    aiOption: 0,
    historical: 'Palmyra organised the trans-desert caravan trade with its own protection troops and published tariff; its bilingual tariff law of 137 CE is one of the most detailed commercial documents of antiquity.',
    options: [
      {
        label: 'Take the western terminus',
        tooltip: '−60 talents into warehousing, escorts and a tariff office: "The Western Terminus" (+13% income, +9% trade) for twenty-five years. The largest arrangement this country has ever signed, and it rests on somebody else\'s peace.',
        effects: guard('palm:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60 });
          mod(ctx, 'the_western_terminus', 'The Western Terminus', { incomeMult: 1.13, tradeMult: 1.09 }, 300);
          h.setFlag(ctx, 'westernTerminus', true);
          h.chronicle(ctx, 'era', 'The western end of the desert route is brought through this '
            + 'country. It is the largest commercial arrangement in its history and it depends '
            + 'entirely on two empires not fighting.');
        }),
      },
      {
        label: 'Take a share and keep the northern ports open too',
        tooltip: '−35 talents: "The Two Routes" (+8% income, +7% trade) for twenty-five years. Less money and no single point of failure, which is the whole argument.',
        effects: guard('palm:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35 });
          mod(ctx, 'the_two_routes', 'The Two Routes', { incomeMult: 1.08, tradeMult: 1.07 }, 300);
          h.chronicle(ctx, 'era', 'A share of the desert route is taken and the northern ports '
            + 'are kept working. It earns less every year and it survives the century.');
        }),
      },
      {
        label: 'Copy their tariff law instead',
        tooltip: '+16 governance points and "The Published Tariff" (+9% income, +6% trade, −0.5 unrest everywhere) for thirty years. Every duty, on every good, cut in stone where the merchants can read it — which is why Palmyra is rich, and it is not a secret.',
        effects: guard('palm:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 16 });
          mod(ctx, 'the_published_tariff', 'The Published Tariff', { incomeMult: 1.09, tradeMult: 1.06, unrestAll: -0.5 }, 360);
          h.setFlag(ctx, 'publishedTariff', true);
          h.chronicle(ctx, 'era', 'The tariff is written out in full and cut in stone in two '
            + 'languages at every gate: every duty, on every good, at a fixed rate. The '
            + 'merchants can read it, and the collectors can no longer improvise.');
        }),
      },
    ],
  },

  // ── 121 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev66n_the_third_congregation',
    title: 'The Third Congregation',
    desc: 'In the coast towns and in the Decapolis there are now assemblies that are neither of '
      + 'the two old things. They read our scriptures in Greek, keep no sabbath and no '
      + 'circumcision, meet on the first day of the week, and are drawn from exactly the '
      + 'population that used to fill the back of the synagogue — the gentiles who came to '
      + 'listen and were never going to take the whole yoke.\n\n'
      + 'A generation ago they were an argument inside the family. They are now a separate '
      + 'thing with its own officers, its own letters going between towns and its own quarrel '
      + 'with us that it is starting to write down. Nobody in this century thinks it is '
      + 'important. The one decision available is whether to treat it as a heresy to be shut '
      + 'out, a neighbour to be dealt with, or a nuisance not worth a ruling — and all three '
      + 'have been chosen by different towns already.',
    forTag: 'player',
    date: { y: 121, m: 4 },
    aiOption: 1,
    historical: 'By the early second century the Christian assemblies of the Levantine cities were institutionally separate, with their own hierarchy and correspondence, and drew heavily on the synagogue\'s gentile adherents.',
    options: [
      {
        label: 'Shut them out formally, and say why',
        tooltip: '+10 legitimacy and "The Formal Separation" (−0.7 unrest everywhere) for twenty years, with −5% income as the coast congregations lose the adherents who paid for a good deal of them.',
        effects: guard('third:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10 });
          mod(ctx, 'the_formal_separation', 'The Formal Separation', { unrestAll: -0.7, incomeMult: 0.95 }, 240);
          h.chronicle(ctx, 'era', 'The separation is made formal and the reasons are published. '
            + 'Both sides now have a document, which is what the next four centuries are '
            + 'argued out of.');
        }),
      },
      {
        label: 'Deal with them as a neighbour: contracts, courts, burial ground',
        tooltip: '+14 governance points and "The Working Arrangement" (+6% income, −0.5 unrest everywhere) for twenty-five years. Nothing is conceded about the argument and everything is agreed about the street.',
        effects: guard('third:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 14 });
          mod(ctx, 'the_working_arrangement', 'The Working Arrangement', { incomeMult: 1.06, unrestAll: -0.5 }, 300);
          h.setFlag(ctx, 'workingArrangement', true);
          h.chronicle(ctx, 'era', 'Contracts, courts and burial grounds are settled with the '
            + 'new assemblies of the coast towns. The theological argument is untouched and the '
            + 'streets work.');
        }),
      },
      {
        label: 'Not worth a ruling',
        tooltip: '+8 governance points and +25 talents unspent. In this century that is a defensible reading of the evidence, and it is the last century in which it is.',
        effects: guard('third:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 8, treasury: 25 });
          h.chronicle(ctx, 'era', 'No ruling is issued about the new assemblies. On the evidence '
            + 'available in this century it is a perfectly reasonable decision.');
        }),
      },
    ],
  },

  // ── 127 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev66n_the_camel_corps',
    title: 'The Camel Corps',
    desc: 'The desert frontier has been reorganised and the interesting part is who is doing '
      + 'the work. The new units are mounted on camels, recruited from the tribes of the '
      + 'steppe edge, officered partly by their own chiefs, and paid to patrol the ground they '
      + 'were previously raiding. The empire has stopped trying to hold a line in the desert '
      + 'and started renting the desert instead.\n\n'
      + 'For this country it changes the eastern approaches entirely. The clans who used to be '
      + 'a seasonal problem are now a paid frontier force with a chain of command; the wells '
      + 'are on somebody\'s establishment; and the phylarchs — the chiefs the empire deals '
      + 'through — are becoming the most important men on the eastern side of this map, '
      + 'without anybody ever quite deciding that they should.',
    forTag: 'player',
    date: { y: 127, m: 6 },
    aiOption: 1,
    historical: 'Roman dromedarii and allied phylarchs took over desert-frontier policing across the second century; the phylarch system eventually produced the Ghassanid and Lakhmid confederations.',
    options: [
      {
        label: 'Deal directly with the phylarchs and pay our own retainer',
        tooltip: '−45 talents a decade: +12 influence points and "Our Own Phylarchs" (+7% income, +6% trade, +4% manpower) for twenty-five years. The men who actually control the eastern approaches answer to two paymasters, and one of them is us.',
        effects: guard('camel:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, infl: 12 });
          mod(ctx, 'our_own_phylarchs', 'Our Own Phylarchs', { incomeMult: 1.07, tradeMult: 1.06, manpowerMult: 1.04 }, 300);
          h.setFlag(ctx, 'ownPhylarchs', true);
          h.chronicle(ctx, 'diplomacy', 'A retainer is paid directly to the desert chiefs on top '
            + 'of the imperial one. The eastern approaches are watched by men who are being '
            + 'paid by both sides to watch them.');
        }),
      },
      {
        label: 'Raise our own mounted troops from the same recruiting ground',
        tooltip: '−65 talents: +12 martial points and "The Camel Squadrons" (+6% morale, +5% force limit, +5% manpower) for twenty-five years. It costs more and it belongs to this country.',
        effects: guard('camel:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -65, mar: 12 });
          mod(ctx, 'the_camel_squadrons', 'The Camel Squadrons', { moraleMult: 1.06, forceLimitMult: 1.05, manpowerMult: 1.05 }, 300);
          h.chronicle(ctx, 'war', 'Mounted squadrons are raised off the same steppe edge the '
            + 'empire recruits from. They cost more than the retainer and they are on this '
            + 'kingdom\'s muster roll.');
        }),
      },
      {
        label: 'Let the empire hold the desert and put the money into the sown land',
        tooltip: '−40 talents into wells, terraces and roads on this side of the line: "The Sown Side" (+9% income, +7% growth) for twenty-five years. The eastern approaches are somebody else\'s establishment, with everything that implies.',
        effects: guard('camel:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40 });
          mod(ctx, 'the_sown_side', 'The Sown Side', { incomeMult: 1.09, growthMult: 1.07 }, 300);
          h.chronicle(ctx, 'era', 'The desert is left to the empire and its chiefs, and the '
            + 'money goes into the sown land on this side of the line. It is the richer '
            + 'decision and it hands somebody else the approaches.');
        }),
      },
    ],
  },
];
