// Judaea Universalis — the years the chain skips: 366–429 CE (SPEC §240).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The rising against Gallus is decided in its first four years and the chapter
// runs another seventy-five. Those seventy-five are covered by the world spine
// — Amida, Adrianople, the creed made law, the Rhine, Alaric — and by the two
// cards about the office at Tiberias, and by nothing else. What is missing is
// the ground the chapter is actually played on: the Galilee of the fourth
// century, which is the one period in this entire game when the country's
// Jewish towns were building at scale, painting the sun on their own floors,
// exporting to three provinces, and writing a Talmud they never got to finish.
//
// So this file is a Galilee package with an empire pressing on it. The
// building years and the linen trade and the wheel on the mosaic floor come
// first; then the monks, the sermons at Antioch, the rank granted to the
// Patriarch and the rank abolished, the rescript about a feast, and the law
// that let a synagogue stand but never be built again. It ends in 429, at the
// year the office was struck off the rolls and its revenue redirected — which
// is the last thing the fourth century does to this chapter's country and the
// reason the next chapter opens with no Jewish state on the map at all.
//
// Sources: the Theodosian Code XVI.8 for the rank, the Purim rescript and the
// building law; John Chrysostom, Adversus Judaeos I–VIII; Libanius, Letters
// 914, 917, 1084 and 1105; the Rehob mosaic inscription for the boundaries;
// the excavated Galilean synagogues and the Hammat Tiberias zodiac floor;
// Diocletian's price edict for the linen of Scythopolis.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_351ce_years] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

// Addressed to the chapter's own court, so the modifiers land on the chair
// that answered the card.
function P(ctx) { return ctx.game.playerTag; }

function mod(ctx, id, name, effects, months) {
  ctx.helpers.addTagModifier(ctx, P(ctx), {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

export const EVENTS_351_YEARS = [

  // ── 366 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351y_the_wheel_on_the_floor',
    title: 'The Wheel on the Floor',
    desc: 'The congregation at the hot springs has laid a new floor and what is on it is a '
      + 'problem. There is an ark with a lamp on either side, which is unobjectionable. There '
      + 'is a panel of Greek naming the donors, which is ordinary. And in the middle there is '
      + 'a wheel: the twelve signs of the zodiac in order, the four seasons at the corners as '
      + 'women, and at the hub a young man driving a four-horse chariot with rays coming off '
      + 'his head.\n\n'
      + 'It is the sun. It is unmistakably the sun, drawn the way every Greek in the empire '
      + 'draws it, in the middle of a synagogue floor, and the men who paid for it are the '
      + 'leading families of the town and the men who walk on it every sabbath are the '
      + 'congregation, and nobody in the building appears to think it is idolatry. The '
      + 'question in front of the court is whether it is — and the second question, which '
      + 'nobody wants to ask first, is what happens to the answer if four other towns have '
      + 'already ordered the same design.',
    forTag: 'player',
    date: { y: 366, m: 4 },
    aiOption: 1,
    historical: 'The zodiac-and-Helios floor at Hammat Tiberias was laid in the fourth century and copied for two hundred years, at Beth Alpha, Sepphoris, Na\'aran and Husifa.',
    options: [
      {
        label: 'Take it up',
        tooltip: '−25 talents and a bad month: +8 legitimacy with the strict houses and "The Plain Floor" (−0.4 unrest everywhere) for twelve years, with −10 governance points and the leading families of a town badly out of temper.',
        effects: guard('wheel:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -25, legitimacy: 8, gov: -10 });
          mod(ctx, 'the_plain_floor', 'The Plain Floor', { unrestAll: -0.4 }, 144);
          h.chronicle(ctx, 'era', 'The floor at the hot springs is taken up and relaid plain. '
            + 'The families who paid for it are not asked to pay for the relaying.');
        }),
      },
      {
        label: 'It is a calendar, and a calendar is not a god',
        tooltip: '+12 governance points and "The Wheel of the Year" (+7% income, +5% growth) for twenty-five years. The design goes into four more towns within a decade and the ruling is what allows it.',
        effects: guard('wheel:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'wheel_of_the_year', 'The Wheel of the Year', { incomeMult: 1.07, growthMult: 1.05 }, 300);
          h.setFlag(ctx, 'zodiacRuling', true);
          h.chronicle(ctx, 'era', 'The court rules that the wheel is a calendar: the months in '
            + 'their order, and the sun that marks them, and no more a god than a sundial is. '
            + 'Four towns order the same design inside ten years.');
        }),
      },
      {
        label: 'Rule nothing, and let each congregation decide its own floor',
        tooltip: '+8 governance points and "Each Town Its Own" (+4% income, +0.4 unrest everywhere) for fifteen years. Some floors have the wheel and some do not, and the argument runs for two centuries without ever being settled.',
        effects: guard('wheel:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 8 });
          mod(ctx, 'each_town_its_own', 'Each Town Its Own', { incomeMult: 1.04, unrestAll: 0.4 }, 180);
          h.chronicle(ctx, 'era', 'No ruling is issued about the floors. Some towns lay the '
            + 'wheel and some lay a plain field of tesserae, and both are still there when '
            + 'the buildings come down.');
        }),
      },
    ],
  },

  // ── 369 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351y_the_linen_of_scythopolis',
    title: 'The Linen of Scythopolis',
    desc: 'The imperial price schedule, which fixes what everything in the world may be sold '
      + 'for, has a line for the linen of Scythopolis, and the line is at the top of it: the '
      + 'best grade in the empire, above Alexandria, above Tarsus, above anything from Gaul. '
      + 'The flax comes out of the valley, the weaving is done in the towns of the plain and '
      + 'the lake, and the state has been buying it in bulk for the army\'s clothing '
      + 'contracts for two generations.\n\n'
      + 'The glass is the other half. The furnaces of the coast make the raw slabs for half '
      + 'the Mediterranean and the finishing shops are inland, in towns whose entire economy '
      + 'is one trade and the road to a port. It is a real export economy and it is completely '
      + 'dependent on being allowed to use somebody else\'s roads and somebody else\'s '
      + 'harbours, which is the thought this council keeps arriving at and putting down again.',
    forTag: 'player',
    date: { y: 369, m: 9 },
    aiOption: 0,
    historical: 'Diocletian\'s price edict rates the linen of Scythopolis above every other grade in the empire. The Levantine glass industry supplied raw glass to the entire Mediterranean.',
    options: [
      {
        label: 'Take the army contracts and take them long',
        tooltip: '+60 talents on signature and "The Clothing Contracts" (+10% income, +5% trade) for twenty years. The state is our customer, which is excellent business and one signature away from being a hostage arrangement.',
        effects: guard('linen:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 60 });
          mod(ctx, 'clothing_contracts', 'The Clothing Contracts', { incomeMult: 1.10, tradeMult: 1.05 }, 240);
          h.setFlag(ctx, 'armyContracts', true);
          h.chronicle(ctx, 'era', 'The army\'s clothing contracts are taken for a long term. '
            + 'The looms of the valley run all year and the buyer is the government.');
        }),
      },
      {
        label: 'Sell east, through the caravans, and take less for it',
        tooltip: '−30 talents to open the routes: "The Eastern Buyers" (+8% income, +8% trade) for twenty-five years, and no single customer who can ruin us by changing his mind.',
        effects: guard('linen:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30 });
          mod(ctx, 'the_eastern_buyers', 'The Eastern Buyers', { incomeMult: 1.08, tradeMult: 1.08 }, 300);
          h.chronicle(ctx, 'era', 'The linen and the glass go east by caravan at a worse price '
            + 'to buyers in four kingdoms. Nobody in that market can close us down with a '
            + 'letter.');
        }),
      },
      {
        label: 'Own the finishing and let others grow the flax',
        tooltip: '−45 talents into the shops and the dye-houses: +10 governance points and "The Finishing Trade" (+9% income, +5% growth) for twenty-five years.',
        effects: guard('linen:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, gov: 10 });
          mod(ctx, 'the_finishing_trade', 'The Finishing Trade', { incomeMult: 1.09, growthMult: 1.05 }, 300);
          h.chronicle(ctx, 'era', 'The money goes into the finishing shops and the dye-houses '
            + 'rather than the fields. The flax can be grown anywhere; the last three '
            + 'operations cannot.');
        }),
      },
    ],
  },

  // ── 374 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351y_the_towns_build_in_stone',
    title: 'The Towns Build in Stone',
    desc: 'Every town on the lake and half the villages of the upper hills are building, and '
      + 'they are building the same thing: a hall on a podium with three doors facing '
      + 'Jerusalem, columns down both sides, a gallery, a carved lintel over the entrance, and '
      + 'a bench for the elders round the wall. The stone is dressed. The lintels have vines '
      + 'and lions and menorahs on them, and at Capernaum a limestone façade that would not '
      + 'disgrace a Greek city.\n\n'
      + 'These are villages of a few hundred people erecting public buildings that cost more '
      + 'than everything else in the settlement put together, in a century in which they are '
      + 'being taxed harder than at any point in living memory. Nobody ordered it and nobody '
      + 'is subsidising it. A people that has just been told what it may not build is putting '
      + 'up, out of its own pocket, the largest thing in every town it lives in.',
    forTag: 'player',
    date: { y: 374, m: 3 },
    aiOption: 0,
    historical: 'The great Galilean synagogues — Capernaum, Chorazin, Bar\'am, Meroth, Gush Halav — belong to the third to sixth centuries, the period of heaviest fiscal pressure.',
    options: [
      {
        label: 'Send the masons and the money where the villages are poorest',
        tooltip: '−65 talents: +12 legitimacy, +1 stability, and "The Building Years" (+7% income, +7% growth, −0.7 unrest everywhere) for thirty years. The poorest villages get the same hall as the rich ones.',
        effects: guard('build:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -65, legitimacy: 12, stability: 1 });
          mod(ctx, 'the_building_years', 'The Building Years', { incomeMult: 1.07, growthMult: 1.07, unrestAll: -0.7 }, 360);
          h.setFlag(ctx, 'buildingYears', true);
          h.chronicle(ctx, 'era', 'Masons and money go to the villages that could not have '
            + 'built on their own. Sixteen hundred years later the walls are still standing '
            + 'in six of them.');
        }),
      },
      {
        label: 'Let them build, and register every donor on the wall',
        tooltip: '+10 governance points and "The Donors\' Names" (+8% income, −0.4 unrest everywhere) for twenty-five years. Every man who gave is cut into the mosaic, which turns out to be the most effective fundraising instrument anybody here has invented.',
        effects: guard('build:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 10 });
          mod(ctx, 'the_donors_names', 'The Donors\' Names', { incomeMult: 1.08, unrestAll: -0.4 }, 300);
          h.chronicle(ctx, 'era', 'Every donor\'s name goes into the floor of the hall he paid '
            + 'for, in Greek or Aramaic as he prefers. The lists get longer every year.');
        }),
      },
      {
        label: 'Put the money into cisterns and presses instead',
        tooltip: '−50 talents: "The Working Villages" (+10% income, +6% growth) for thirty years, and −8 legitimacy. The towns are richer and there is nothing in any of them worth looking at.',
        effects: guard('build:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, legitimacy: -8 });
          mod(ctx, 'the_working_villages', 'The Working Villages', { incomeMult: 1.10, growthMult: 1.06 }, 360);
          h.chronicle(ctx, 'era', 'The building programme is turned into cisterns, presses and '
            + 'terracing. The villages prosper and they meet in somebody\'s front room.');
        }),
      },
    ],
  },

  // ── 379 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351y_the_monks_come_down',
    title: 'The Monks Come Down',
    desc: 'There are men living in caves in the wilderness south of the road, and there have '
      + 'been for fifty years, and until recently that was their business. What has changed is '
      + 'the number and the direction. They come down to the villages now, in bands, to preach '
      + 'and to be fed, and where they find a shrine that is not theirs they take it apart. '
      + 'They answer to no bishop, hold no office, own nothing anybody can fine, and cannot be '
      + 'sued, because they have no property and no home address.\n\n'
      + 'The imperial administration finds them nearly as difficult as everybody else does and '
      + 'has no theory of what to do about a mob with a theology. The villages of the lake '
      + 'have never seen anything like it. Two of them have already put men on their own roads '
      + 'at night, which is the beginning of a kind of trouble that ends with somebody being '
      + 'burned in a building.',
    forTag: 'player',
    date: { y: 379, m: 6 },
    aiOption: 1,
    historical: 'Fourth-century monastic bands were a recognised public-order problem across the eastern provinces; the Palestinian desert monasteries expanded rapidly from the 370s.',
    options: [
      {
        label: 'Put wardens on the roads and let nobody in after dark',
        tooltip: '−40 talents: +8 martial points and "The Village Wardens" (−0.6 unrest everywhere, +4% manpower) for twenty years. Nothing is burned and nobody is arrested, and both facts take work every night.',
        effects: guard('monks:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, mar: 8 });
          mod(ctx, 'the_village_wardens', 'The Village Wardens', { unrestAll: -0.6, manpowerMult: 1.04 }, 240);
          h.chronicle(ctx, 'era', 'Wardens are posted on the village roads and nobody comes in '
            + 'after dark. It costs money every night for twenty years, and no synagogue on '
            + 'the lake burns.');
        }),
      },
      {
        label: 'Take it to the governor and make it a matter of public order',
        tooltip: '−35 talents in advocacy: +12 governance points and "A Matter of Public Order" (−0.5 unrest everywhere, +4% income) for eighteen years. Framed as riot and not as religion, it is a problem the empire knows how to have.',
        effects: guard('monks:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, gov: 12 });
          mod(ctx, 'matter_of_public_order', 'A Matter of Public Order', { unrestAll: -0.5, incomeMult: 1.04 }, 216);
          h.chronicle(ctx, 'diplomacy', 'The complaint is filed as public order rather than as '
            + 'religion: bands on the roads, unlicensed assemblies, property destroyed. In '
            + 'that language the governor knows what to do.');
        }),
      },
      {
        label: 'Feed them, and be the last village they would burn',
        tooltip: '−30 talents a year in bread: +6 legitimacy, +10 governance points, and "The Bread at the Gate" (−0.8 unrest everywhere) for fifteen years. Cynical, humiliating, and it works for about a generation.',
        effects: guard('monks:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, legitimacy: 6, gov: 10 });
          mod(ctx, 'bread_at_the_gate', 'The Bread at the Gate', { unrestAll: -0.8 }, 180);
          h.chronicle(ctx, 'era', 'The villages feed the men who come down out of the desert. '
            + 'It is humiliating, it is cheap, and for a generation nothing is burned.');
        }),
      },
    ],
  },

  // ── 387 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351y_the_eight_sermons',
    title: 'The Eight Sermons',
    desc: 'A young preacher at Antioch has delivered eight sermons in two seasons and they are '
      + 'the most violent thing anybody has written down about this nation in five hundred '
      + 'years. What is instructive is who they are addressed to. They are not addressed to '
      + 'Jews. They are addressed to his own congregation, who keep going to the synagogue for '
      + 'the New Year and the Day of Atonement because they find the fasts impressive, who go '
      + 'to Jewish courts because they trust the oaths sworn there, and who consult Jewish '
      + 'physicians and wear their amulets.\n\n'
      + 'He is not describing a defeated remnant. He is describing a competitor with better '
      + 'attendance on the high days, and every hammer-blow in the eight sermons is a '
      + 'measurement of how attractive the thing he is attacking still is. It works. Within a '
      + 'generation the crossing-over stops, and the sermons are copied into every library in '
      + 'the Christian world and read for sixteen hundred years.',
    forTag: 'player',
    date: { y: 387, m: 1 },
    aiOption: 2,
    historical: 'John Chrysostom preached eight sermons against the Judaizers at Antioch in 386–387 because his congregation was attending synagogue. They became the foundational text of Christian anti-Judaism.',
    options: [
      {
        label: 'Answer them in writing, point by point',
        tooltip: '+12 governance points and "The Written Answer" (+5% income, −0.3 unrest everywhere) for twenty years, with +0.6 unrest everywhere for six. A reply makes the quarrel formal, and a formal quarrel has two sides.',
        effects: guard('sermons:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'the_written_answer', 'The Written Answer', { incomeMult: 1.05, unrestAll: -0.3 }, 240);
          h.chronicle(ctx, 'era', 'The sermons are answered in writing, point by point, and '
            + 'the answer is copied and sent to every congregation in Syria.');
        }),
      },
      {
        label: 'Shut the doors on the high days to everybody who is not of the congregation',
        tooltip: '+10 legitimacy and "The Closed Fast" (−0.8 unrest everywhere) for twenty years, with −6% income: the visitors were spending money, and the closing is the thing the preacher wanted and could not get himself.',
        effects: guard('sermons:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10 });
          mod(ctx, 'the_closed_fast', 'The Closed Fast', { unrestAll: -0.8, incomeMult: 0.94 }, 240);
          h.chronicle(ctx, 'era', 'The doors are shut on the high days to everybody not of the '
            + 'congregation. It is the preacher\'s own object, accomplished for him, and it '
            + 'ends the danger.');
        }),
      },
      {
        label: 'Change nothing, and let them keep coming',
        tooltip: '+8 legitimacy and "The Open Fast" (+7% income, +0.9 unrest everywhere) for eighteen years. They keep coming for another generation, and the price of that is the sermons getting worse.',
        effects: guard('sermons:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 8 });
          mod(ctx, 'the_open_fast', 'The Open Fast', { incomeMult: 1.07, unrestAll: 0.9 }, 216);
          h.chronicle(ctx, 'era', 'Nothing is changed. Half of Antioch is still in the '
            + 'synagogue on the Day of Atonement, and the sermons preached against them get '
            + 'louder every year.');
        }),
      },
    ],
  },

  // ── 392 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351y_the_letters_of_the_sophist',
    title: 'The Letters of the Sophist',
    desc: 'The most famous teacher of rhetoric in the eastern world writes to the Patriarch, '
      + 'repeatedly, in the tone of one great man to another: about a lawsuit, about a '
      + 'student, about a favour, about the weather in the Galilee. He is an unrepentant pagan '
      + 'in a Christian empire and he has taught half the officials in it, including the '
      + 'preacher at Antioch.\n\n'
      + 'The letters are worth more than their contents. What they establish is that the head '
      + 'of the Jews is a person a Hellenic gentleman corresponds with as an equal — a '
      + 'notable, on the circuit of notables, whose good opinion is worth having and whose son '
      + 'is being educated in the correct schools. In a century in which everything is being '
      + 'sorted into orthodox and other, two men who are both on the wrong side of that line '
      + 'have found each other, and are being extremely polite about it.',
    forTag: 'player',
    date: { y: 392, m: 5 },
    aiOption: 0,
    historical: 'Libanius corresponded with the Patriarch in Palestine in the 380s and 390s in the ordinary register of elite friendship — one of the last documents of a world before the sorting.',
    options: [
      {
        label: 'Keep the correspondence, and keep it wide',
        tooltip: '−35 talents on couriers, gifts and schooling: +14 influence points and "The Circle of Notables" (+8% income, −0.4 unrest everywhere) for twenty-five years. A court with friends in every provincial capital is a court with warning.',
        effects: guard('sophist:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, infl: 14 });
          mod(ctx, 'circle_of_notables', 'The Circle of Notables', { incomeMult: 1.08, unrestAll: -0.4 }, 300);
          h.setFlag(ctx, 'circleOfNotables', true);
          h.chronicle(ctx, 'diplomacy', 'The correspondence is kept up and widened: sophists, '
            + 'governors, curials, the old families of four provinces. Bad news arrives here '
            + 'two months before it arrives officially.');
        }),
      },
      {
        label: 'Send the sons to be educated in the Greek schools',
        tooltip: '−45 talents: +12 governance points, +8 influence points, and "The Educated Sons" (+7% income, +5% trade) for twenty-five years, with +0.5 unrest everywhere for eight from the houses who ask what exactly is being taught.',
        effects: guard('sophist:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, gov: 12, infl: 8 });
          mod(ctx, 'the_educated_sons', 'The Educated Sons', { incomeMult: 1.07, tradeMult: 1.05, unrestAll: 0.5 }, 300);
          h.chronicle(ctx, 'era', 'The sons of the leading houses go to the rhetoric schools. '
            + 'They come back able to draft a petition that a prefect will actually read, and '
            + 'quoting people their grandfathers had not heard of.');
        }),
      },
      {
        label: 'Answer courteously and commit to nothing',
        tooltip: '+8 influence points and +8 governance points. The letters are kept, the friendship is not deepened, and nobody can ever produce a document showing what was agreed.',
        effects: guard('sophist:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 8, gov: 8 });
          h.chronicle(ctx, 'era', 'The letters are answered with great courtesy and no '
            + 'undertakings. In this century a friendship in writing is a document, and '
            + 'documents are read out later by people who were not friends.');
        }),
      },
    ],
  },

  // ── 396 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351y_the_illustrious_patriarch',
    title: 'The Illustrious Patriarch',
    desc: 'A rescript arrives conferring rank. The head of the Jews is to be addressed as '
      + 'Illustrious, is placed among the honorary prefects, and anybody who insults him in '
      + 'public is to be dealt with by the ordinary courts as though he had insulted a magistrate '
      + 'of that grade.\n\n'
      + 'It is a real elevation and it is also, precisely, a definition. A man who holds rank '
      + 'in the imperial hierarchy holds it from the emperor; a rank that is granted can be '
      + 'graded downward, and thirteen years later it will be, and thirty years after that the '
      + 'office will be abolished by the same instrument that created its dignity. Everyone at '
      + 'this court can see both halves of the offer. Nobody can see a way to take the '
      + 'protection without taking the definition.',
    forTag: 'player',
    date: { y: 396, m: 4 },
    aiOption: 0,
    historical: 'The Theodosian Code records the Patriarch\'s honorary prefectural rank in 396, its demotion in 415 and the abolition of the office by 429.',
    options: [
      {
        label: 'Take the rank and use it',
        tooltip: '+12 influence points, +8 legitimacy, and "The Illustrious Office" (+8% income, −0.5 unrest everywhere) for twenty years. Governors take our letters first, and the office is now a thing the empire grants.',
        effects: guard('illustrious:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 12, legitimacy: 8 });
          mod(ctx, 'the_illustrious_office', 'The Illustrious Office', { incomeMult: 1.08, unrestAll: -0.5 }, 240);
          h.setFlag(ctx, 'patriarchRankTaken', true);
          h.chronicle(ctx, 'diplomacy', 'The rank is accepted and used. It opens every door in '
            + 'the province, and it writes the office into a list from which offices can be '
            + 'struck.');
        }),
      },
      {
        label: 'Take the protection clause and decline the rank',
        tooltip: '+10 governance points, +10 legitimacy, and "Protected, Not Graded" (+5% income, −0.6 unrest everywhere) for twenty-five years. The insult is still a crime and the office is still ours.',
        effects: guard('illustrious:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 10, legitimacy: 10 });
          mod(ctx, 'protected_not_graded', 'Protected, Not Graded', { incomeMult: 1.05, unrestAll: -0.6 }, 300);
          h.chronicle(ctx, 'diplomacy', 'The clause protecting the office is accepted and the '
            + 'grade attached to it is declined, with thanks, at length, in the correct '
            + 'formulae.');
        }),
      },
      {
        label: 'Decline the whole rescript',
        tooltip: '+14 legitimacy and "Nothing Held From Them" (−0.6 unrest everywhere) for twenty years, with −10 influence points. The office answers to the men who elect it and to nobody in Constantinople, which is worth exactly what it is worth.',
        effects: guard('illustrious:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 14, infl: -10 });
          mod(ctx, 'nothing_held_from_them', 'Nothing Held From Them', { unrestAll: -0.6 }, 240);
          h.chronicle(ctx, 'era', 'The rescript is declined entire. The office holds nothing '
            + 'from the emperor, which means there is nothing for the emperor to take back.');
        }),
      },
    ],
  },

  // ── 398 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351y_the_book_not_finished',
    title: 'The Book That Was Not Finished',
    desc: 'The schools of Tiberias, Sepphoris, Caesarea and Lydda have been building a '
      + 'commentary on the six divisions for four generations, and it is coming apart under '
      + 'them. The men are leaving — east, where there is no imperial tax on a school and no '
      + 'prefect who might decide an assembly is a conspiracy — and the material is being '
      + 'edited in a hurry by people who can see the end coming.\n\n'
      + 'What gets produced is short, abrupt, missing whole tractates, and stops in places '
      + 'where a scribe evidently put down the pen and did not come back. It is also '
      + 'irreplaceable, because it is the only record of what the sages of this land actually '
      + 'said, and everything else that survives from this civilisation was written on the '
      + 'other side of a frontier by people who had already left.',
    forTag: 'player',
    date: { y: 398, m: 9 },
    aiOption: 0,
    historical: 'The Jerusalem Talmud was closed abruptly around 400, incomplete and unpolished, as the Palestinian academies broke up. The Babylonian Talmud had another century and became the authoritative one.',
    options: [
      {
        label: 'Fund the schools, hold the men, and finish it',
        tooltip: '−80 talents and every clerk that can be spared: +18 governance points and "The Finished Commentary" (+9% income, −0.7 unrest everywhere) for thirty years. It gets finished, and what this land said survives in its own voice.',
        effects: guard('unfinished:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -80, gov: 18 });
          mod(ctx, 'finished_commentary', 'The Finished Commentary', { incomeMult: 1.09, unrestAll: -0.7 }, 360);
          h.setFlag(ctx, 'westernTalmudFinished', true);
          h.chronicle(ctx, 'era', 'The schools are funded, the teachers are kept, and the '
            + 'commentary of this land is finished in this land. It is the largest thing '
            + 'anybody here does in the century.');
        }),
      },
      {
        label: 'Copy what exists, in five sets, and get them out of the country',
        tooltip: '−45 talents: +12 governance points and "The Copies Abroad" (+6% income, −0.4 unrest everywhere) for thirty years. Unfinished, unpolished, and in five libraries on two sides of a frontier.',
        effects: guard('unfinished:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, gov: 12 });
          mod(ctx, 'the_copies_abroad', 'The Copies Abroad', { incomeMult: 1.06, unrestAll: -0.4 }, 360);
          h.chronicle(ctx, 'era', 'Five sets are copied out of the material as it stands and '
            + 'sent to five cities. What survives is a book with holes in it, and it survives.');
        }),
      },
      {
        label: 'Send the men and the material east and let the eastern schools carry it',
        tooltip: '−40 talents in passages: +10 influence points and "Carried East" (+8% income, +4% trade) for thirty years, and −10 legitimacy: the land has just handed its own tradition to somebody else to finish.',
        effects: guard('unfinished:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, infl: 10, legitimacy: -10 });
          mod(ctx, 'carried_east', 'Carried East', { incomeMult: 1.08, tradeMult: 1.04 }, 360);
          h.chronicle(ctx, 'era', 'The teachers and the material go east together. The '
            + 'commentary is finished, eventually, four hundred miles away, in another '
            + 'dialect, by men who cite this land as a memory.');
        }),
      },
    ],
  },

  // ── 405 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351y_the_boundaries_on_the_floor',
    title: 'The Boundaries Written on the Floor',
    desc: 'A congregation in the valley has done something no congregation has ever done: it '
      + 'has laid its legal problem into the mosaic floor of its own hall. Twenty-nine lines '
      + 'of it, naming towns — which places are inside the boundary of the Land for the '
      + 'purpose of the tithes and the seventh year and which are outside, which vegetables '
      + 'from which market are exempt, and where exactly the line runs through the country '
      + 'north of the lake.\n\n'
      + 'It is there because the question is asked in that hall every single season and the '
      + 'answer keeps getting lost. Half the towns on the list are Jewish villages under a '
      + 'Christian empire that has never heard of the boundary and would not enforce it if it '
      + 'had. The line is maintained entirely by the people it binds, written in a floor, '
      + 'because there is nowhere else left to keep a law that no government recognises.',
    forTag: 'player',
    date: { y: 405, m: 5 },
    aiOption: 0,
    historical: 'The Rehob inscription — the longest ancient Hebrew inscription ever found — is a halakhic text about tithe boundaries laid into a synagogue floor in the Beth Shean valley.',
    options: [
      {
        label: 'Have the boundary surveyed and cut it into every hall on the line',
        tooltip: '−50 talents on the survey and the mosaicists: +15 governance points and "The Boundary Kept" (+8% income, −0.6 unrest everywhere) for thirty years. Every village on the frontier of the Land knows which side it is on and why.',
        effects: guard('bounds:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, gov: 15 });
          mod(ctx, 'the_boundary_kept', 'The Boundary Kept', { incomeMult: 1.08, unrestAll: -0.6 }, 360);
          h.setFlag(ctx, 'boundarySurveyed', true);
          h.chronicle(ctx, 'era', 'The boundary of the Land is surveyed town by town and cut '
            + 'into the floors of the halls along it. It is the only border in this century '
            + 'that no army is required to hold.');
        }),
      },
      {
        label: 'Widen the boundary to take in the northern towns',
        tooltip: '+12 legitimacy and "The Land Enlarged" (+6% income, +5% growth) for twenty-five years, with +0.6 unrest everywhere for eight: the towns brought inside acquire obligations they had not budgeted for.',
        effects: guard('bounds:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 12 });
          mod(ctx, 'the_land_enlarged', 'The Land Enlarged', { incomeMult: 1.06, growthMult: 1.05, unrestAll: 0.6 }, 300);
          h.chronicle(ctx, 'era', 'The boundary is drawn wide, taking in the northern towns. '
            + 'They are inside the Land now, with everything that follows from it, including '
            + 'the seventh year.');
        }),
      },
      {
        label: 'Draw it narrow, so that the seventh year can actually be kept',
        tooltip: '+15 governance points and "The Narrow Boundary" (+9% income, −0.5 unrest everywhere) for thirty years. Fewer fields lie fallow, the commandment is kept where it is kept properly, and it is written down that this was a concession.',
        effects: guard('bounds:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15 });
          mod(ctx, 'the_narrow_boundary', 'The Narrow Boundary', { incomeMult: 1.09, unrestAll: -0.5 }, 360);
          h.chronicle(ctx, 'era', 'The boundary is drawn narrow so that the seventh year can '
            + 'be kept in full inside it. The concession is recorded as a concession, in the '
            + 'floor, where nobody can pretend later that it was always the rule.');
        }),
      },
    ],
  },

  // ── 408 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351y_the_feast_they_legislated_about',
    title: 'The Feast They Legislated About',
    desc: 'A rescript arrives about Purim. It has been reported to the court that at a certain '
      + 'festival the Jews burn an effigy of Haman on a frame, and that the frame is shaped '
      + 'like a cross, and that this is done in contempt of the Christian faith. The Jews are '
      + 'forbidden to burn Haman in that manner; they are, the same rescript is careful to '
      + 'add, to be left in possession of their own rites otherwise.\n\n'
      + 'Whether anybody was ever making the shape deliberately is unknowable and beside the '
      + 'point. What the rescript demonstrates is that the imperial chancery is now receiving, '
      + 'processing and legislating on reports about the details of somebody else\'s village '
      + 'festivals — that there is an informant, a file, and a machinery for turning a rumour '
      + 'about a bonfire into a law of the Roman Empire.',
    forTag: 'player',
    date: { y: 408, m: 4 },
    aiOption: 1,
    historical: 'Theodosian Code XVI.8.18 (408) forbids burning Haman in the shape of the cross while confirming that Jewish rites are otherwise protected.',
    options: [
      {
        label: 'Issue our own instruction about the bonfires first',
        tooltip: '+12 governance points, +6 legitimacy, and "The Feast Regulated" (−0.6 unrest everywhere, +4% income) for twenty years. If the shape of a fire is going to be a matter of law, better ours than theirs.',
        effects: guard('feast:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12, legitimacy: 6 });
          mod(ctx, 'the_feast_regulated', 'The Feast Regulated', { unrestAll: -0.6, incomeMult: 1.04 }, 240);
          h.chronicle(ctx, 'era', 'An instruction goes out to the congregations about the '
            + 'bonfires of Purim before the rescript is read anywhere. It is the same rule, '
            + 'issued by the people it binds.');
        }),
      },
      {
        label: 'Find the informant',
        tooltip: '−40 talents on the enquiry: +10 influence points and "The File and the Informant" (−0.5 unrest everywhere) for eighteen years. There is always an informant, and knowing which one is worth more than the rescript.',
        effects: guard('feast:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, infl: 10 });
          mod(ctx, 'file_and_informant', 'The File and the Informant', { unrestAll: -0.5 }, 216);
          h.setFlag(ctx, 'informantFound', true);
          h.chronicle(ctx, 'era', 'The enquiry finds the man who wrote to the court about the '
            + 'bonfires. He is not touched. He is simply known, and everything he sends after '
            + 'that is answered before it arrives.');
        }),
      },
      {
        label: 'Read the second half aloud instead',
        tooltip: '+10 legitimacy and "Otherwise Protected" (+5% income, −0.4 unrest everywhere) for twenty-five years. The clause confirming the rites is the useful half of the document, and it is quoted for thirty years.',
        effects: guard('feast:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10 });
          mod(ctx, 'otherwise_protected', 'Otherwise Protected', { incomeMult: 1.05, unrestAll: -0.4 }, 300);
          h.chronicle(ctx, 'era', 'The rescript is read out in the congregations from its '
            + 'second clause: that the rites of the Jews are otherwise to be left alone. It '
            + 'is quoted back at four governors in thirty years.');
        }),
      },
    ],
  },

  // ── 423 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351y_neither_built_nor_burned',
    title: 'Neither Built Nor Burned',
    desc: 'Three rescripts in one year, and read together they are the whole settlement of this '
      + 'century in nine lines. No new synagogue may be built. No existing synagogue may be '
      + 'seized, burned or converted, and where one has been, it is to be restored or paid '
      + 'for. Anybody who takes it upon himself to attack one is to be punished.\n\n'
      + 'It is genuine protection and it is a ratchet. The buildings that stand are safe; the '
      + 'number of them can now only go down, because a town that grows may not build and a '
      + 'hall that falls down may not be replaced. And it is not clemency — it is a state '
      + 'discovering that it cannot control its own monks and its own bishops, and choosing to '
      + 'draw the line where it can still be enforced. In the same generation the same court '
      + 'will pay compensation for a burned synagogue and abolish the office that would have '
      + 'claimed it.',
    forTag: 'player',
    date: { y: 423, m: 6 },
    aiOption: 0,
    historical: 'Theodosian Code XVI.8.25–27 (423) forbade new synagogues, protected existing ones, and required compensation for those seized — all in the same year.',
    options: [
      {
        label: 'Register every hall in the country before the law takes effect',
        tooltip: '−45 talents on surveyors and notaries: +15 governance points and "The Register of Halls" (+7% income, −0.6 unrest everywhere) for thirty years. Every building that exists is on a list, which is what makes the protection clause usable.',
        effects: guard('built:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, gov: 15 });
          mod(ctx, 'register_of_halls', 'The Register of Halls', { incomeMult: 1.07, unrestAll: -0.6 }, 360);
          h.setFlag(ctx, 'hallsRegistered', true);
          h.chronicle(ctx, 'era', 'Every hall in the country is surveyed, described and '
            + 'notarised in the months before the law takes effect. The protection clause is '
            + 'worth exactly as much as that register.');
        }),
      },
      {
        label: 'Repair, extend and never call it building',
        tooltip: '−55 talents: +12 governance points and "Repaired, Not Built" (+8% income, +4% growth) for thirty years, with +0.5 unrest everywhere for eight while somebody decides whether a doubled hall is a repair.',
        effects: guard('built:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, gov: 12 });
          mod(ctx, 'repaired_not_built', 'Repaired, Not Built', { incomeMult: 1.08, growthMult: 1.04, unrestAll: 0.5 }, 360);
          h.chronicle(ctx, 'era', 'Nothing is built anywhere. A great many halls are repaired, '
            + 'and several of them are repaired to twice their former size.');
        }),
      },
      {
        label: 'Claim the compensation, in every case, for thirty years',
        tooltip: '+90 talents recovered over the decades and +12 influence points, with "The Standing Claim" (+5% income) for thirty years. Every burned hall becomes a case, and the cases are all won and all take nine years.',
        effects: guard('built:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 90, infl: 12 });
          mod(ctx, 'the_standing_claim', 'The Standing Claim', { incomeMult: 1.05 }, 360);
          h.chronicle(ctx, 'era', 'Every seizure and every burning becomes a claim under the '
            + 'emperor\'s own rescript. They are all won and they all take nine years, and the '
            + 'winning is the point.');
        }),
      },
    ],
  },

  // ── 429 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351y_the_office_struck_off',
    title: 'The Office Struck From the Rolls',
    desc: 'The last holder dies and no successor is confirmed, and the rescript that follows '
      + 'does not abolish anything: it simply provides that the sums the communities used to '
      + 'send to the Patriarch are henceforth to be paid to the imperial treasury. There is no '
      + 'declaration, no persecution and no ceremony. An office that had lasted three hundred '
      + 'and fifty years, that had held the calendar and the courts and the schools together '
      + 'from Lyon to the Tigris, ends as a line in a revenue instruction.\n\n'
      + 'What is left is what the communities can do for themselves, which is more than the '
      + 'chancery imagines — and one very large question, which is who says what year it is. '
      + 'The calendar has been the office\'s alone since anybody can remember. Somebody has to '
      + 'answer that by next spring, and there is nobody left whose answer everyone has agreed '
      + 'in advance to accept.',
    forTag: 'player',
    date: { y: 429, m: 2 },
    aiOption: 0,
    historical: 'The Patriarchate lapsed around 425–429; the Theodosian Code redirected its revenues to the imperial treasury. The fixed calendar and local authority filled the gap.',
    options: [
      {
        label: 'Publish the rules of the reckoning and let the calendar need nobody',
        tooltip: '+18 governance points and "The Calendar Table" (+8% income, −0.8 unrest everywhere) for forty years. Nobody can abolish an office that is a table of numbers.',
        effects: guard('struck:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 18 });
          // Its own modifier id, for the same reason as the flag below: §235's
          // card of 358 hangs a PERMANENT `the_reckoning_published` on the
          // realm, and addTagModifier replaces by id — reusing it here would
          // silently overwrite the chapter's own standing modifier with this
          // card's shorter, weaker one.
          mod(ctx, 'the_calendar_table', 'The Calendar Table', { incomeMult: 1.08, unrestAll: -0.8 }, 480);
          // NOT `reckoningPublished` — that is §235's own marker for the card
          // of 358, and it gates a mission check and a later trigger. This is
          // the same act seventy years later and under a different roof; it
          // gets its own key so the chapter's chain cannot be satisfied by it.
          h.setFlag(ctx, 'calendarTablePublished', true);
          h.chronicle(ctx, 'era', 'The rules of the reckoning are published in full: the '
            + 'cycles, the intercalations, the postponements. From this year the calendar of '
            + 'the nation is a table, and a table cannot be struck off any rolls.');
        }),
      },
      {
        label: 'Seat the authority in the assembly of the schools instead',
        tooltip: '+12 governance points, +10 legitimacy, and "The Assembly of the Schools" (+6% income, −0.6 unrest everywhere) for thirty years. No single chair for an emperor to abolish, and no single voice either.',
        effects: guard('struck:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12, legitimacy: 10 });
          mod(ctx, 'assembly_of_schools', 'The Assembly of the Schools', { incomeMult: 1.06, unrestAll: -0.6 }, 360);
          h.chronicle(ctx, 'era', 'What the office held is transferred to an assembly of the '
            + 'heads of the schools. It is slower, it argues, and there is nothing in it for '
            + 'a rescript to name.');
        }),
      },
      {
        label: 'Go on collecting, and send it where it always went',
        tooltip: '+10 legitimacy and "The Collection Continued" (+7% income, +0.9 unrest everywhere) for twenty years. There is no longer anybody at the other end and the communities keep sending, which is either loyalty or a habit nobody has dared to break.',
        effects: guard('struck:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10 });
          mod(ctx, 'collection_continued', 'The Collection Continued', { incomeMult: 1.07, unrestAll: 0.9 }, 240);
          h.chronicle(ctx, 'era', 'The collections go on being made and go on being sent. For '
            + 'some years nobody in any congregation asks out loud who is receiving them.');
        }),
      },
    ],
  },
];
