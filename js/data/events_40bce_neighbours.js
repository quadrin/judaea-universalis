// Judaea Universalis — the other side of the line: 38 BCE – 44 CE (SPEC §241).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The crown's chapter is a war with Rome's cast in it and then a reign, and
// §240 gave the reign its own decisions. What neither has is the ring of small
// courts this kingdom actually lived among: the lava country and its raiders,
// Petra's ledger, the Commagenian bridge over the Euphrates, the Ituraean
// inheritance, the five hundred Babylonian horse-archers who were given a
// province to hold, and the Nabataean war that a king lost because he
// repudiated the wrong man's daughter.
//
// The register is deliberately different from §240's. Those cards are the
// state deciding what it is; these are the state discovering what it is
// surrounded by, which in this century is where nearly all of its actual
// diplomacy went.
//
// Sources: Josephus, Antiquities XV–XVIII, for Trachonitis, Zenodorus, Zamaris
// of Babylonia, the Samaritan outrage and the war with Aretas IV; Strabo XVI
// for the lava country; Tacitus, Annals VI, for the Arsacid princes sent east.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_40bce_neighbours] ' + key, e || '');
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

export const EVENTS_40_NEIGHBOURS = [

  // ── 38 BCE ─────────────────────────────────────────────────────────────────
  {
    id: 'ev40n_the_brigands_of_trachonitis',
    title: 'The Brigands of Trachonitis',
    desc: 'North-east of the plateau there is a district of black lava, broken into gullies and '
      + 'caves, with no roads worth the name and nothing growing on it. Nobody has ever '
      + 'governed it. What lives there raids the farmland below it in the autumn, goes back '
      + 'into the rock, and cannot be followed by anybody in formation.\n\n'
      + 'The caravan road to Damascus runs along its edge, which is the whole problem: the '
      + 'merchants pay protection to the men in the rocks and factor it into the price, and '
      + 'everybody upstream regards that as a tax on trade this kingdom is failing to '
      + 'collect. Reducing it has been tried twice by two different powers and neither '
      + 'campaign found anybody to fight.',
    forTag: 'player',
    date: { y: -38, m: 6 },
    aiOption: 2,
    historical: 'Trachonitis — the Leja — was a byword for an ungovernable district. Herod was granted it precisely because nobody else could hold it, and settled soldiers in it to do so.',
    options: [
      {
        label: 'A campaign into the rocks',
        tooltip: '−55 talents: +10 martial points and "The Lava Campaign" (+4% force limit) for ten years, with +0.9 unrest everywhere for six. The column marches in, finds nothing, and marches out again poorer.',
        effects: guard('trach:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, mar: 10 });
          mod(ctx, 'the_lava_campaign', 'The Lava Campaign', { forceLimitMult: 1.04, unrestAll: 0.9 }, 120);
          h.chronicle(ctx, 'war', 'A column goes into the lava country and comes out again with '
            + 'nothing to show. The raiding resumes in the autumn on the usual schedule.');
        }),
      },
      {
        label: 'Settle soldiers on the edge and give them the land',
        tooltip: '−45 talents in grants and tools: +8 martial points and "The Planted Frontier" (+6% manpower, +5% income, −0.5 unrest everywhere) for twenty years. Men with fields of their own on that edge will fight for them.',
        effects: guard('trach:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, mar: 8 });
          mod(ctx, 'the_planted_frontier', 'The Planted Frontier', { manpowerMult: 1.06, incomeMult: 1.05, unrestAll: -0.5 }, 240);
          h.setFlag(ctx, 'plantedFrontier', true);
          h.chronicle(ctx, 'war', 'Veterans are settled along the edge of the lava country with '
            + 'land of their own. The raiding falls off within three seasons, which no campaign '
            + 'had managed.');
        }),
      },
      {
        label: 'Licence the protection and take a share of it',
        tooltip: '+50 talents and "The Road Toll" (+7% income, +5% trade) for twelve years, with −6 legitimacy. What the merchants were paying anyway now goes through a customs house, and the men in the rocks are on a retainer.',
        effects: guard('trach:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 50, legitimacy: -6 });
          mod(ctx, 'the_road_toll', 'The Road Toll', { incomeMult: 1.07, tradeMult: 1.05 }, 144);
          h.chronicle(ctx, 'era', 'The protection the caravans were paying anyway is licensed, '
            + 'taxed and rebranded as a road toll. The chiefs in the lava country are on a '
            + 'retainer and the merchants notice no difference at all.');
        }),
      },
    ],
  },

  // ── 35 BCE ─────────────────────────────────────────────────────────────────
  {
    id: 'ev40n_the_nabataean_ledger',
    title: 'The Nabataean Ledger',
    desc: 'There is a debt on the books that is a diplomatic instrument disguised as an '
      + 'accounting entry. The Nabataeans owe an annual sum for territory they hold, this court '
      + 'has been made responsible for collecting it on behalf of a third party, and the '
      + 'payments have been getting later every year in a way that everybody involved '
      + 'understands perfectly.\n\n'
      + 'Collecting it means pressing a neighbour on somebody else\'s behalf, for money that '
      + 'does not stay here. Not collecting it means standing surety for a default. And '
      + 'somewhere behind both is the real question, which is whether the two kingdoms on this '
      + 'frontier are going to spend the next twenty years as each other\'s creditors or as '
      + 'each other\'s enemies, because they cannot afford to be both and are currently trying.',
    forTag: 'player',
    date: { y: -35, m: 5 },
    aiOption: 1,
    historical: 'Herod was made responsible for the Nabataean tribute owed to Cleopatra; the arrears were the immediate cause of the war of 32–31.',
    options: [
      {
        label: 'Collect it, hard, and bill the arrears',
        tooltip: '+90 talents and +6 martial points, with "The Pressed Debt" (+1.0 unrest everywhere) for eight years and a neighbour whose court now has a war party in it.',
        effects: guard('ledger:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 90, mar: 6 });
          mod(ctx, 'the_pressed_debt', 'The Pressed Debt', { unrestAll: 1.0 }, 96);
          h.setFlag(ctx, 'nabataeanArrears', true);
          h.chronicle(ctx, 'diplomacy', 'The arrears are collected in full and the manner of it '
            + 'is remembered. Petra acquires, for the first time in a generation, a party that '
            + 'wants a war with this kingdom.');
        }),
      },
      {
        label: 'Carry the arrears ourselves and say nothing',
        tooltip: '−70 talents out of our own treasury: +12 influence points and "The Debt Carried" (+6% income, +5% trade, −0.5 unrest everywhere) for fifteen years. The neighbour knows exactly what was done and who did it.',
        effects: guard('ledger:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, infl: 12 });
          mod(ctx, 'the_debt_carried', 'The Debt Carried', { incomeMult: 1.06, tradeMult: 1.05, unrestAll: -0.5 }, 180);
          h.setFlag(ctx, 'debtCarried', true);
          h.chronicle(ctx, 'diplomacy', 'The Nabataean arrears are quietly paid out of this '
            + 'treasury and the account is shown as current. Petra is told, privately, exactly '
            + 'who did it.');
        }),
      },
      {
        label: 'Refuse the commission and hand the ledger back',
        tooltip: '+12 governance points and "Not Our Ledger" (−0.6 unrest everywhere) for twelve years, with −10 influence points where the commission came from. A crown that will not collect for a patron is a crown that has said something.',
        effects: guard('ledger:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12, infl: -10 });
          mod(ctx, 'not_our_ledger', 'Not Our Ledger', { unrestAll: -0.6 }, 144);
          h.chronicle(ctx, 'diplomacy', 'The collection commission is handed back with thanks. '
            + 'It is a small refusal and it is filed in a place where small refusals are kept.');
        }),
      },
    ],
  },

  // ── 29 BCE ─────────────────────────────────────────────────────────────────
  {
    id: 'ev40n_the_bridge_at_samosata',
    title: 'The Bridge at Samosata',
    desc: 'Commagene is a small mountain kingdom with one asset: it holds the crossing at '
      + 'Samosata, which is where an army going east or west actually gets over the Euphrates. '
      + 'Its kings have spent two centuries being simultaneously Greek, Persian and locally '
      + 'divine — there is a mountain-top with colossal statues of the family sitting among '
      + 'the gods, which tells you everything about the dynasty\'s self-image and most of what '
      + 'you need to know about its diplomacy.\n\n'
      + 'They have written proposing a standing arrangement about the crossing: notice of who '
      + 'is moving over it, in both directions, exchanged privately between the two courts. '
      + 'For a kingdom on this frontier, thirty days\' warning that an army is on the far bank '
      + 'is worth more than a legion.',
    forTag: 'player',
    date: { y: -29, m: 8 },
    aiOption: 0,
    historical: 'Commagene controlled the Samosata crossing and survived as a client kingdom until 72 CE. Its dynastic cult on Nemrut Dağı is the most literal statement of client-king self-image in the ancient world.',
    options: [
      {
        label: 'Take the arrangement, and pay for the couriers',
        tooltip: '−30 talents: +14 influence points and "Thirty Days\' Warning" (+6% manpower, +5% morale, +4% income) for twenty years. Nothing this court can buy is worth more on this frontier than knowing early.',
        effects: guard('sam40:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, infl: 14 });
          mod(ctx, 'thirty_days_warning', 'Thirty Days\' Warning', { manpowerMult: 1.06, moraleMult: 1.05, incomeMult: 1.04 }, 240);
          h.setFlag(ctx, 'samosataWarning', true);
          h.chronicle(ctx, 'diplomacy', 'A courier arrangement is made with Commagene about the '
            + 'crossing at Samosata. This court now hears about armies while they are still on '
            + 'the far bank.');
        }),
      },
      {
        label: 'Take the trade half and leave the military half alone',
        tooltip: '−20 talents: +8 influence points and "The Crossing Trade" (+8% income, +6% trade) for twenty years. Caravans and tariffs; nothing that anybody\'s intelligence service would call a treaty.',
        effects: guard('sam40:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -20, infl: 8 });
          mod(ctx, 'the_crossing_trade', 'The Crossing Trade', { incomeMult: 1.08, tradeMult: 1.06 }, 240);
          h.chronicle(ctx, 'era', 'A tariff and carriage agreement is made on the Euphrates '
            + 'crossing and nothing military is mentioned in it anywhere.');
        }),
      },
      {
        label: 'Decline. Two client kings exchanging army movements is a conspiracy',
        tooltip: '+12 governance points and "Nothing to Explain" (−0.4 unrest everywhere) for fifteen years. Correct, cautious, and this kingdom will be surprised at least twice by things it could have known.',
        effects: guard('sam40:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'nothing_to_explain', 'Nothing to Explain', { unrestAll: -0.4 }, 180);
          h.chronicle(ctx, 'diplomacy', 'The Commagenian proposal is declined on the ground that '
            + 'two client kings exchanging troop movements is a word with a penalty attached '
            + 'to it.');
        }),
      },
    ],
  },

  // ── 24 BCE ─────────────────────────────────────────────────────────────────
  {
    id: 'ev40n_the_sons_of_zenodorus',
    title: 'The Sons of Zenodorus',
    desc: 'The Ituraean tetrarch is dead and his territory is being divided by a Roman decision '
      + 'rather than by his family, which is now the normal way inheritances work on this '
      + 'frontier. Auranitis, Batanaea, Trachonitis and the Paneas district are in play — '
      + 'plateau grain land, lava country, and the springs at the head of the Jordan, which is '
      + 'both a shrine and the source of the water this whole country farms with.\n\n'
      + 'The claims are being lodged in Antioch and the decision will be made by men who have '
      + 'never seen any of it. What matters is which of the three assets this court asks for '
      + 'first, because it will get one and be told the others were promised elsewhere.',
    forTag: 'player',
    date: { y: -24, m: 4 },
    aiOption: 0,
    historical: 'Zenodorus\' territories were transferred to Herod by Augustus in stages between 23 and 20 BCE, including the Paneas district with the springs of the Jordan.',
    options: [
      {
        label: 'Ask for the springs',
        tooltip: '−25 talents on the embassy: +10 legitimacy and "The Head of the River" (+8% income, +6% growth) for twenty-five years. Whoever holds the springs holds the summer of every farm downstream.',
        effects: guard('zen:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -25, legitimacy: 10 });
          mod(ctx, 'the_head_of_the_river', 'The Head of the River', { incomeMult: 1.08, growthMult: 1.06 }, 300);
          h.setFlag(ctx, 'headOfTheRiver', true);
          h.chronicle(ctx, 'diplomacy', 'The springs at the head of the Jordan are asked for '
            + 'first and granted. Every farm downstream is drinking from ground this crown now '
            + 'holds.');
        }),
      },
      {
        label: 'Ask for the grain plateau',
        tooltip: '−25 talents: "The Plateau Harvest" (+10% income, +5% manpower) for twenty-five years. The richest wheat land within reach, and it feeds an army as well as a treasury.',
        effects: guard('zen:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -25 });
          mod(ctx, 'the_plateau_harvest', 'The Plateau Harvest', { incomeMult: 1.10, manpowerMult: 1.05 }, 300);
          h.chronicle(ctx, 'diplomacy', 'The grain plateau is asked for and granted. It is the '
            + 'best wheat land this crown has ever held and it is four days from the capital.');
        }),
      },
      {
        label: 'Ask for the lava country nobody else wants',
        tooltip: '−15 talents: +12 influence points and "The Hard Grant" (+6% manpower, +1 defence in hill country, +4% income) for twenty-five years. Asking for the worthless district is noticed in Antioch, and the next grant is larger.',
        effects: guard('zen:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -15, infl: 12 });
          mod(ctx, 'the_hard_grant', 'The Hard Grant', { manpowerMult: 1.06, hillDefBonus: 1, incomeMult: 1.04 }, 300);
          h.setFlag(ctx, 'hardGrant', true);
          h.chronicle(ctx, 'diplomacy', 'This court asks for the district nobody wants and is '
            + 'given it immediately. The staff in Antioch note the request, and the next '
            + 'petition from this kingdom is read with unusual attention.');
        }),
      },
    ],
  },

  // ── 18 BCE ─────────────────────────────────────────────────────────────────
  {
    id: 'ev40n_the_colony_in_the_rocks',
    title: 'The Colony in the Rocks',
    desc: 'Holding the lava country turns out to be a settlement problem rather than a military '
      + 'one, and the settlement scheme is unusual: a garrison colony of three thousand '
      + 'Idumaeans, given land, exemption from tribute and the standing obligation to be armed. '
      + 'They are being planted not to farm it — nothing farms it — but to be in it, so that '
      + 'the raiding parties are met by people who live there.\n\n'
      + 'It works and it creates a permanent constituency: three thousand armed households on '
      + 'the frontier who owe their land to the crown, pay it nothing, and will be asked for '
      + 'men in every war for the next century. Every state that does this discovers the same '
      + 'thing about a generation later, which is that a tax exemption is easy to grant and '
      + 'impossible to withdraw.',
    forTag: 'player',
    date: { y: -18, m: 9 },
    aiOption: 0,
    historical: 'Herod settled three thousand Idumaeans in Trachonitis, and later Zamaris\' Babylonians in Batanaea, on exactly these terms; the colonies were still supplying troops two generations later.',
    options: [
      {
        label: 'Plant the colony on the full exemption',
        tooltip: '−50 talents to establish: +10 martial points and "The Frontier Colony" (+8% manpower, +1 defence in hill country, −0.4 unrest everywhere) for twenty-five years, and no tribute from that district for as long as it exists.',
        effects: guard('col:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, mar: 10 });
          mod(ctx, 'the_frontier_colony', 'The Frontier Colony', { manpowerMult: 1.08, hillDefBonus: 1, unrestAll: -0.4 }, 300);
          h.setFlag(ctx, 'frontierColony', true);
          h.chronicle(ctx, 'war', 'Three thousand armed households are planted in the lava '
            + 'country on a full exemption. The frontier holds, and the exemption is never '
            + 'withdrawn by anybody.');
        }),
      },
      {
        label: 'Plant it on a term: twenty years, then the tribute begins',
        tooltip: '−50 talents: +8 martial points and "The Colony on Terms" (+6% manpower, +6% income after the term) for twenty-five years, with +0.6 unrest everywhere from year twenty, when the district discovers that somebody wrote the term down.',
        effects: guard('col:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, mar: 8 });
          mod(ctx, 'the_colony_on_terms', 'The Colony on Terms', { manpowerMult: 1.06, incomeMult: 1.06, unrestAll: 0.6 }, 300);
          h.chronicle(ctx, 'war', 'The frontier colony is planted on a twenty-year exemption '
            + 'with the end date written into the grant. Everybody signs it and nobody expects '
            + 'the date to be enforced.');
        }),
      },
      {
        label: 'Garrison it with paid troops instead',
        tooltip: '−80 talents: +12 martial points and "The Paid Garrison" (+6% discipline, +4% force limit) for twenty years. It costs four times as much, it obeys orders exactly, and it goes home when it stops being paid.',
        effects: guard('col:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -80, mar: 12 });
          mod(ctx, 'the_paid_garrison', 'The Paid Garrison', { disciplineMult: 1.06, forceLimitMult: 1.04 }, 240);
          h.chronicle(ctx, 'war', 'The lava country is held with paid troops rather than settled '
            + 'ones. It is four times the cost, it does what it is told, and it creates no '
            + 'constituency at all.');
        }),
      },
    ],
  },

  // ── 8 BCE ──────────────────────────────────────────────────────────────────
  {
    id: 'ev40n_the_man_from_babylon',
    title: 'The Man From Babylon',
    desc: 'A Babylonian Jew named Zamaris has crossed the Euphrates with five hundred mounted '
      + 'archers and a hundred relations, having fallen out with a Parthian governor, and is '
      + 'looking for somewhere to be. He is a professional soldier of a kind this country does '
      + 'not produce: horse archery is a steppe skill and takes a childhood to learn.\n\n'
      + 'The offer he wants is land on the frontier, exemption, and the right to be commanded '
      + 'by his own family. The offer this court would like to make is a paid squadron under '
      + 'its own officers. Between those two is the whole argument about frontier defence, and '
      + 'the practical point is that his five hundred can do something that nobody else on this '
      + 'muster roll can do at all.',
    forTag: 'player',
    date: { y: -8, m: 5 },
    aiOption: 0,
    historical: 'Zamaris the Babylonian settled in Batanaea with five hundred horse-archers under Herod. His descendants were still leading that district\'s troops in 66 CE.',
    options: [
      {
        label: 'Land, exemption, and his own command',
        tooltip: '−35 talents: +12 martial points and "The Babylonian Horse" (+8% morale, +6% manpower, +1 defence in hill country) for twenty-five years. His grandsons command that district when the war comes.',
        effects: guard('zam:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, mar: 12 });
          mod(ctx, 'the_babylonian_horse', 'The Babylonian Horse', { moraleMult: 1.08, manpowerMult: 1.06, hillDefBonus: 1 }, 300);
          h.setFlag(ctx, 'babylonianHorse', true);
          h.chronicle(ctx, 'war', 'Zamaris and his five hundred are given land, exemption and '
            + 'their own command on the eastern frontier. Their grandsons are still holding it '
            + 'seventy years later.');
        }),
      },
      {
        label: 'A paid squadron under our officers',
        tooltip: '−60 talents: +10 martial points and "The Hired Archers" (+7% morale, +5% discipline) for fifteen years. Better controlled, more expensive, and it dissolves the year the money does.',
        effects: guard('zam:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, mar: 10 });
          mod(ctx, 'the_hired_archers', 'The Hired Archers', { moraleMult: 1.07, disciplineMult: 1.05 }, 180);
          h.chronicle(ctx, 'war', 'The Babylonians are taken as a paid squadron under this '
            + 'kingdom\'s own officers. They are excellent and they are gone within fifteen '
            + 'years.');
        }),
      },
      {
        label: 'Have them teach, and raise our own',
        tooltip: '−45 talents and a generation: +8 martial points and "The Riding Schools" (+6% morale, +5% manpower, +4% force limit) for twenty-five years. The skill takes a childhood, so this pays in the reign after this one.',
        effects: guard('zam:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, mar: 8 });
          mod(ctx, 'the_riding_schools', 'The Riding Schools', { moraleMult: 1.06, manpowerMult: 1.05, forceLimitMult: 1.04 }, 300);
          h.chronicle(ctx, 'war', 'The Babylonians are set to teaching rather than to fighting. '
            + 'The first useful class of native horse-archers rides out about twenty years '
            + 'later, which is exactly as long as everybody said it would take.');
        }),
      },
    ],
  },

  // ── 9 CE ───────────────────────────────────────────────────────────────────
  {
    id: 'ev40n_the_bones_in_the_court',
    title: 'The Bones in the Court',
    desc: 'The gates of the Temple are opened at midnight for Passover, as they are every year, '
      + 'and some men come in early and scatter human bones through the porticoes and across '
      + 'the court. There is no ambiguity about what it is for: nothing else could make the '
      + 'ground unclean at that hour on that night, and the feast is stopped.\n\n'
      + 'They are Samaritans, or they are said to be, and after this the courts are guarded '
      + 'from the eve of every festival by men whose entire job is to keep the neighbours out. '
      + 'It is a small crime with a very long tail: a quarrel that had been about which '
      + 'mountain and which book acquires, from this night, a specific and remembered '
      + 'atrocity, and every Passover for two centuries is celebrated behind a guard because '
      + 'of one night\'s work by perhaps a dozen men.',
    forTag: 'player',
    date: { y: 9, m: 4 },
    aiOption: 1,
    historical: 'Josephus records the scattering of bones in the Temple courts at Passover under the prefect Coponius, and the permanent guard on the gates that followed.',
    options: [
      {
        label: 'Find them, try them, and publish the verdict',
        tooltip: '−40 talents on the search and the court: +10 legitimacy and "The Verdict Published" (−0.6 unrest everywhere, +4% income) for fifteen years. A named crime with named men in the dock is a smaller thing than a rumour about a people.',
        effects: guard('bones:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, legitimacy: 10 });
          mod(ctx, 'the_verdict_published', 'The Verdict Published', { unrestAll: -0.6, incomeMult: 1.04 }, 180);
          h.chronicle(ctx, 'era', 'The men who scattered the bones are found, tried and named. '
            + 'The verdict is read out in every town, and it names men rather than a nation.');
        }),
      },
      {
        label: 'Guard the gates from now on and say nothing about who',
        tooltip: '−30 talents a decade on the festival watch: +12 governance points and "The Festival Watch" (−0.7 unrest everywhere, +5% festival draw) for twenty-five years. The feast is safe and the accusation is never made in public.',
        effects: guard('bones:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, gov: 12 });
          mod(ctx, 'the_festival_watch', 'The Festival Watch', { unrestAll: -0.7, pilgrimMult: 1.05 }, 300);
          h.setFlag(ctx, 'festivalWatch', true);
          h.chronicle(ctx, 'era', 'From that year the courts are guarded from the eve of every '
            + 'festival. No accusation is made in public against anybody, and everybody knows '
            + 'what the guard is for.');
        }),
      },
      {
        label: 'Answer it on the ground',
        tooltip: '+8 martial points and "The Reprisal" (+5% manpower, +1.4 unrest everywhere) for ten years, with −8 legitimacy. Somebody\'s villages pay for what a dozen men did, and the quarrel acquires a second atrocity to remember.',
        effects: guard('bones:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { mar: 8, legitimacy: -8 });
          mod(ctx, 'the_reprisal', 'The Reprisal', { manpowerMult: 1.05, unrestAll: 1.4 }, 120);
          h.chronicle(ctx, 'war', 'The answer is made on the ground and in the villages. The '
            + 'quarrel now has two dates in it that both sides can recite.');
        }),
      },
    ],
  },

  // ── 17 CE ──────────────────────────────────────────────────────────────────
  {
    id: 'ev40n_the_princes_sent_back',
    title: 'The Princes Rome Sends Back',
    desc: 'There is a standing arrangement between the two empires that nobody signed: the '
      + 'Arsacid house sends sons to Rome as hostages, Rome raises them, and when a Parthian '
      + 'throne falls vacant Rome sends one of them east to claim it. The princes arrive '
      + 'speaking Greek and Latin, with Roman habits and Roman friends, and are usually '
      + 'murdered within four years by nobles who find them insufficiently Parthian.\n\n'
      + 'The route east runs past this frontier and the escorts want supplies, guides and a '
      + 'discreet place to wait. Every one of these candidates is a lottery ticket: three in '
      + 'four are dead in a few seasons, and the fourth is King of Kings and remembers who fed '
      + 'him on the way.',
    forTag: 'player',
    date: { y: 17, m: 6 },
    aiOption: 0,
    historical: 'Rome repeatedly sent Romanised Arsacid princes east to claim the Parthian throne; most were rejected by the nobility within a few years.',
    options: [
      {
        label: 'Host every one of them, properly',
        tooltip: '−45 talents over the years: +14 influence points and "The Waiting Room" (+7% income, +5% trade) for twenty-five years. One of them eventually wins, and the account is settled generously.',
        effects: guard('prin:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, infl: 14 });
          mod(ctx, 'the_waiting_room', 'The Waiting Room', { incomeMult: 1.07, tradeMult: 1.05 }, 300);
          h.setFlag(ctx, 'arsacidWaitingRoom', true);
          h.chronicle(ctx, 'diplomacy', 'Every Arsacid candidate going east is hosted, supplied '
            + 'and sent on with an escort. Three of the four die. The fourth remembers.');
        }),
      },
      {
        label: 'Supply the escorts at cost and stay out of the politics',
        tooltip: '+40 talents and +8 governance points, with "The Quartermaster" (+5% income) for fifteen years. Money now, no exposure, and no gratitude in any direction.',
        effects: guard('prin:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 40, gov: 8 });
          mod(ctx, 'the_quartermaster', 'The Quartermaster', { incomeMult: 1.05 }, 180);
          h.chronicle(ctx, 'era', 'The escorts are supplied at the going rate and nothing else '
            + 'is offered. It pays immediately and buys nothing.');
        }),
      },
      {
        label: 'Send word east about each one before he arrives',
        tooltip: '+12 influence points and "The Word Ahead" (+6% income, +4% manpower, −0.4 unrest everywhere) for twenty years. A favour to the men who currently hold Ctesiphon, and it is worth more than a favour to the men who probably will not.',
        effects: guard('prin:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 12 });
          mod(ctx, 'the_word_ahead', 'The Word Ahead', { incomeMult: 1.06, manpowerMult: 1.04, unrestAll: -0.4 }, 240);
          h.chronicle(ctx, 'diplomacy', 'Word goes east ahead of each Roman candidate, to the '
            + 'court that is currently sitting. It is a favour to the men who are actually in '
            + 'power, which is a different bet and a better one.');
        }),
      },
    ],
  },

  // ── 36 CE ──────────────────────────────────────────────────────────────────
  {
    id: 'ev40n_the_war_of_aretas',
    title: 'The War of Aretas',
    desc: 'A tetrarch of this region repudiated his wife to marry his brother\'s, and his wife '
      + 'was the daughter of the king of Petra, and she left for her father\'s court before the '
      + 'announcement — having worked out what was coming and arranged her own transport. The '
      + 'Nabataean answer arrives some years later in the form of an army, and the tetrarch\'s '
      + 'force is destroyed.\n\n'
      + 'The population, according to the historian who records it, held that the defeat was '
      + 'punishment for what the same tetrarch had done to a preacher he had executed for '
      + 'saying the marriage was unlawful. Whatever the theology, the strategic content is '
      + 'plain: a dynastic insult on this frontier is a casus belli with a fifteen-year fuse, '
      + 'and Petra can put a field army into the Jordan valley whenever it decides to.',
    forTag: 'player',
    date: { y: 36, m: 7 },
    aiOption: 1,
    historical: 'Aretas IV destroyed Herod Antipas\' army in 36 CE over the repudiation of his daughter. Josephus reports that the Jews saw it as retribution for the execution of John the Baptist.',
    options: [
      {
        label: 'Mediate, and be the court both sides talk through',
        tooltip: '−40 talents on the embassies: +14 influence points and "The Broker" (+7% income, +5% trade, −0.5 unrest everywhere) for twenty years. Neither side wins and both of them owe the mediator.',
        effects: guard('aretas:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, infl: 14 });
          mod(ctx, 'the_broker', 'The Broker', { incomeMult: 1.07, tradeMult: 1.05, unrestAll: -0.5 }, 240);
          h.setFlag(ctx, 'aretasBrokered', true);
          h.chronicle(ctx, 'diplomacy', 'This court mediates between Petra and the tetrarchy. '
            + 'The war stops short of the valley and both sides send their next quarrel here '
            + 'first.');
        }),
      },
      {
        label: 'Take the valley districts while both are occupied',
        tooltip: '+80 talents and +10 martial points, with "The Valley Taken" (+8% income, +1.0 unrest everywhere) for twelve years. Two neighbours are fighting and the ground between them is unattended.',
        effects: guard('aretas:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 80, mar: 10 });
          mod(ctx, 'the_valley_taken', 'The Valley Taken', { incomeMult: 1.08, unrestAll: 1.0 }, 144);
          h.chronicle(ctx, 'war', 'The valley districts are taken while both neighbours are '
            + 'looking at each other. Both of them notice, and neither is currently able to do '
            + 'anything about it.');
        }),
      },
      {
        label: 'Note the fuse, and fortify the valley road',
        tooltip: '−55 talents: +10 martial points and "The Valley Road" (+6% manpower, +1 defence in hill country, −0.4 unrest everywhere) for twenty years. Petra has just shown everybody how far it can march, and this court writes the distance down.',
        effects: guard('aretas:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, mar: 10 });
          mod(ctx, 'the_valley_road', 'The Valley Road', { manpowerMult: 1.06, hillDefBonus: 1, unrestAll: -0.4 }, 240);
          h.chronicle(ctx, 'war', 'The valley road is fortified and posted. What the campaign '
            + 'demonstrated about how far a Nabataean army can march is written into the '
            + 'defence plan that month.');
        }),
      },
    ],
  },

  // ── 44 CE ──────────────────────────────────────────────────────────────────
  {
    id: 'ev40n_the_clients_after_the_king',
    title: 'The Clients After the King',
    desc: 'A king who had held nearly the whole country dies suddenly at the games in Caesarea, '
      + 'and his son is seventeen and in Rome, and the decision in the imperial council is that '
      + 'a boy cannot hold it. The territory goes back under direct administration. Every '
      + 'client court in the region reads the file and takes the same lesson, which is not '
      + 'about that family.\n\n'
      + 'It is that the client system has no rule of succession. A kingdom exists because an '
      + 'emperor finds it convenient, it is inherited if the emperor thinks the heir is up to '
      + 'it, and there is no appeal and no precedent and nothing written down. Every crown on '
      + 'this frontier now knows that its own continuation is a judgement call made in a room '
      + 'it will never enter, and each of them starts, quietly, building something that does '
      + 'not depend on that judgement.',
    forTag: 'player',
    date: { y: 44, m: 9 },
    aiOption: 0,
    historical: 'Agrippa I died in 44 CE; his kingdom reverted to direct Roman administration because his son was judged too young. The client kingdoms of the east all ended the same way within a century.',
    options: [
      {
        label: 'Get the heir into the imperial household early and keep him there',
        tooltip: '−60 talents on the establishment: +14 influence points and "Raised in the Palace" (+7% income, −0.5 unrest everywhere) for twenty-five years. The judgement call is made about somebody they know.',
        effects: guard('after:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, infl: 14 });
          mod(ctx, 'raised_in_the_palace', 'Raised in the Palace', { incomeMult: 1.07, unrestAll: -0.5 }, 300);
          h.setFlag(ctx, 'heirInThePalace', true);
          h.chronicle(ctx, 'diplomacy', 'The heir is established in the imperial household with '
            + 'a proper establishment and the right friends. The judgement, when it comes, is '
            + 'made about a young man the men making it have had dinner with.');
        }),
      },
      {
        label: 'Build the institutions that outlive a dynasty',
        tooltip: '−55 talents into courts, registries and a standing council: +18 governance points and "What Survives a King" (+7% income, −0.7 unrest everywhere, −5% cost of governing) for thirty years. If the crown is revocable, the state should not be.',
        effects: guard('after:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, gov: 18 });
          mod(ctx, 'what_survives_a_king', 'What Survives a King', { incomeMult: 1.07, unrestAll: -0.7, adminMult: 0.95 }, 360);
          h.setFlag(ctx, 'survivesAKing', true);
          h.chronicle(ctx, 'era', 'Courts, a registry and a standing council are built and '
            + 'staffed. Whoever is or is not confirmed as king, the country now has a '
            + 'government that does not stop when he does.');
        }),
      },
      {
        label: 'Talk to the other client courts about it',
        tooltip: '−35 talents on the correspondence: +12 influence points and "The Clients\' Correspondence" (+6% income, +4% manpower) for twenty years, with +0.6 unrest everywhere for six — several small kings discussing the succession rules is a sentence that reads badly in Latin.',
        effects: guard('after:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, infl: 12 });
          mod(ctx, 'the_clients_correspondence', 'The Clients\' Correspondence', { incomeMult: 1.06, manpowerMult: 1.04, unrestAll: 0.6 }, 240);
          h.chronicle(ctx, 'diplomacy', 'A correspondence opens between four client courts about '
            + 'what happened, and what each of them intends to do about it. Every one of them '
            + 'writes carefully, and every one of them writes.');
        }),
      },
    ],
  },
];
