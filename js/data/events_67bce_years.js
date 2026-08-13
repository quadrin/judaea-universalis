// Judaea Universalis — the years the chain skips: 62–26 BCE (SPEC §240).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The brothers' chapter is forty-two years long and its scripted chain is a
// war, an arbitration and then Rome's own calendar: Pompey, Crassus, Caesar,
// Cassius, Actium. What falls out of it is everything Rome did to the country
// between those names — the councils it broke up, the revenue it farmed, the
// thirty thousand it sold at the lake, and the two decrees that made a Jewish
// assembly legal in a city that had just banned assemblies.
//
// The cards are addressed to whoever is playing: the elder brother, the
// younger, or the crown beyond the Euphrates. A court in Arbela hears the
// Tyrian captives and the gold of Asia as news about its own nation rather
// than about its own province, which is the correct difference and the reason
// the prose never says "your province".
//
// Sources: Josephus, Antiquities XIV, for Gabinius' five councils, the sons'
// risings, Pelusium, Tarichaeae and the letters to Tyre; Cicero, Pro Flacco,
// for the gold impounded in Asia; Suetonius and Josephus for Caesar's
// exemption of the Jewish assemblies; Plutarch and Appian for the triumph.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_67bce_years] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

// Addressed to whoever is playing, so the modifiers land on the chair that
// answered the card and never need the §135 forwarding a world package does.
function P(ctx) { return ctx.game.playerTag; }

function mod(ctx, id, name, effects, months) {
  ctx.helpers.addTagModifier(ctx, P(ctx), {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

export const EVENTS_67_YEARS = [

  // ── 62 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67y_the_gold_of_asia',
    title: 'The Gold of Asia',
    desc: 'The half-shekels of the province of Asia have not arrived. They were collected as '
      + 'they are collected every year — Apamea, Laodicea, Adramyttium, Pergamon, each city\'s '
      + 'congregation weighing out its own contribution for the House — and the governor '
      + 'Flaccus has impounded the lot on the grounds that exporting gold from a Roman '
      + 'province is illegal.\n\n'
      + 'He is not entirely wrong about the law and he is entirely wrong about what he has '
      + 'done. A hundred pounds of gold from four cities is a fraction of a year\'s revenue. '
      + 'What the seizure demonstrates is the shape of the thing: that a nation spread across '
      + 'other men\'s empires has been quietly running a treasury flow from every city it '
      + 'lives in to one it does not govern, and that any provincial magistrate who reads a '
      + 'ledger can turn the tap.',
    forTag: 'player',
    date: { y: -62, m: 9 },
    aiOption: 1,
    historical: 'Flaccus impounded the Jewish gold of Asia in 62 BCE; Cicero defended him three years later and treated the collections as a scandal in themselves.',
    options: [
      {
        label: 'Send an embassy to the Senate',
        tooltip: '−30 talents for the passage and the advocates: +8 influence points and "The Right to Send" (+4% income) for ten years if the ruling goes our way, which it usually does.',
        effects: guard('gold:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, infl: 8 });
          mod(ctx, 'right_to_send', 'The Right to Send', { incomeMult: 1.04 }, 120);
          h.chronicle(ctx, 'diplomacy', 'An embassy goes to Rome about the gold of Asia. It '
            + 'comes home with a ruling, and the ruling is that the collections may go on.');
        }),
      },
      {
        label: 'Let the cities settle it themselves',
        tooltip: '+10 governance points and "The Congregations Pay Their Own Advocates" (+3% income) for eight years. A nation whose cities litigate separately is harder to shut off in one letter.',
        effects: guard('gold:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 10 });
          mod(ctx, 'cities_own_advocates', 'The Congregations Pay Their Own Advocates', { incomeMult: 1.03 }, 96);
          h.chronicle(ctx, 'era', 'The cities of Asia are left to fight for their own gold, '
            + 'city by city. Four suits are cheaper to lose than one.');
        }),
      },
      {
        label: 'Move the collection by another road',
        tooltip: '−20 talents to reroute through the eastern caravans: +6 influence points and "The Quiet Route" (+6% trade, +2% income) for twelve years. Nothing is litigated and nothing is conceded.',
        effects: guard('gold:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -20, infl: 6 });
          mod(ctx, 'quiet_route', 'The Quiet Route', { tradeMult: 1.06, incomeMult: 1.02 }, 144);
          h.chronicle(ctx, 'era', 'The collections of Asia begin moving east and south by '
            + 'caravan instead of by sea. No governor has jurisdiction over a road he cannot see.');
        }),
      },
    ],
  },

  // ── 61 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67y_the_triumph',
    title: 'The Triumph',
    desc: 'Pompey holds his triumph in Rome over two days, because one is not enough for the '
      + 'east. Fourteen nations are carried past on placards. In the procession, walking, is '
      + 'Aristobulus — a king of the Jews and a high priest of the House, in the section '
      + 'reserved for captured monarchs, with his children behind him.\n\n'
      + 'Behind them are the ordinary prisoners, and this is the part that outlasts the '
      + 'parade. Several thousand Judaeans are sold in Rome, and Roman law being what it is, '
      + 'a slave freed by his master becomes a citizen. Within a generation there is a Jewish '
      + 'quarter across the Tiber, poor, loud, legally Roman and growing, and it did not '
      + 'emigrate there. It was carried.',
    forTag: 'player',
    date: { y: -61, m: 9 },
    world: true,
    worldLabel: 'Pompey triumphs over the East; a king of the Jews walks in the procession',
    aiOption: 0,
    historical: 'Pompey\'s two-day triumph of 61 BCE paraded Aristobulus II. The Jewish community of Rome descended largely from prisoners of that war who were freed and enfranchised.',
    options: [
      {
        label: 'Buy back whoever can be found',
        tooltip: '−60 talents, sent west through the bankers of Delos and Puteoli: +8 legitimacy and "The Redeemed of the Tiber" (+3% manpower, −0.4 unrest everywhere) for ten years.',
        effects: guard('triumph:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, legitimacy: 8 });
          mod(ctx, 'redeemed_tiber', 'The Redeemed of the Tiber', { manpowerMult: 1.03, unrestAll: -0.4 }, 120);
          h.chronicle(ctx, 'era', 'Money goes west to buy back whoever can be found of the '
            + 'people sold after the triumph. Most cannot be found.');
        }),
      },
      {
        label: 'Send them a teacher and a roll instead',
        tooltip: '−20 talents: +10 influence points and "The Congregation Across the Tiber" (+5% income) for fifteen years. They will be free in a generation and they will still be ours.',
        effects: guard('triumph:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -20, infl: 10 });
          mod(ctx, 'congregation_tiber', 'The Congregation Across the Tiber', { incomeMult: 1.05 }, 180);
          h.setFlag(ctx, 'tiberCongregation', true);
          h.chronicle(ctx, 'era', 'A teacher and a roll of the Law go to the slave quarters of '
            + 'Rome. In twenty years there is a synagogue across the Tiber, and its members '
            + 'vote.');
        }),
      },
    ],
  },

  // ── 59 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67y_the_farmers_of_the_revenue',
    title: 'The Farmers of the Revenue',
    desc: 'The companies come out from Rome to bid. A publican syndicate buys the right to '
      + 'collect a district\'s taxes for a fixed sum paid up front, and then collects whatever '
      + 'it can, and the difference is the business. They have contracts to service in Asia, '
      + 'Cilicia and Syria, they lend at forty-eight per cent to cities that cannot meet the '
      + 'first instalment, and they are the reason the east is quietly furious in a way no '
      + 'Roman politician has yet found alarming.\n\n'
      + 'What is being offered here is a choice about what kind of thing the country is going '
      + 'to be. It can pay a lump into the syndicate\'s hands and be left alone by them, it '
      + 'can collect its own tribute and hand it over assessed, or it can let the companies '
      + 'in and take a share of what they wring out.',
    forTag: 'player',
    date: { y: -59, m: 6 },
    aiOption: 1,
    historical: 'Tax farming was the standing scandal of the late Republic in the east. Caesar later moved Judaea to direct assessment, which was treated locally as a major concession.',
    options: [
      {
        label: 'Pay the lump and keep them out',
        tooltip: '−80 talents up front: "The Bought Peace" (−0.6 unrest everywhere, +4% income) for ten years. Expensive, and nobody with a Roman contract sets foot in a village.',
        effects: guard('farmers:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -80 });
          mod(ctx, 'bought_peace', 'The Bought Peace', { unrestAll: -0.6, incomeMult: 1.04 }, 120);
          h.chronicle(ctx, 'era', 'The lump is paid to the syndicate in advance and the '
            + 'collectors are kept off the roads. The treasury feels it for three years.');
        }),
      },
      {
        label: 'Collect it ourselves and hand it over assessed',
        tooltip: '+12 governance points and "The Assessment in Our Own Hand" (+7% income, −0.3 unrest everywhere) for twelve years — and the clerks of the crown learn exactly what the country is worth.',
        effects: guard('farmers:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'own_assessment', 'The Assessment in Our Own Hand', { incomeMult: 1.07, unrestAll: -0.3 }, 144);
          h.setFlag(ctx, 'ownAssessment', true);
          h.chronicle(ctx, 'era', 'The tribute is assessed and collected by the crown\'s own '
            + 'clerks and handed over in one payment. Rome does not care how it was gathered, '
            + 'which is the opening.');
        }),
      },
      {
        label: 'Let them in and take a share',
        tooltip: '+70 talents now and "The Companies on the Roads" (+8% income, +1.2 unrest everywhere) for eight years. Somebody else is hated for the collecting, and everybody knows who let them in.',
        effects: guard('farmers:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 70, legitimacy: -6 });
          mod(ctx, 'companies_on_roads', 'The Companies on the Roads', { incomeMult: 1.08, unrestAll: 1.2 }, 96);
          h.chronicle(ctx, 'era', 'The publican syndicates are let onto the roads and the '
            + 'crown takes its share. The villages learn the word publican, and keep it.');
        }),
      },
    ],
  },

  // ── 57 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67y_the_five_councils',
    title: 'The Five Councils',
    desc: 'Gabinius has an administrative idea. There will no longer be one council for the '
      + 'nation; there will be five, sitting at Jerusalem, Gadara, Amathus, Jericho and '
      + 'Sepphoris, each with its own jurisdiction, each answering to the proconsul, none '
      + 'answering to another. He announces it as a reform, and the Greek cities receive it '
      + 'as one.\n\n'
      + 'It is the most intelligent thing any Roman does to this country in a century. An '
      + 'army can be beaten and a fortress can be retaken; a nation whose single deliberative '
      + 'body has been replaced by five regional ones has been decapitated without a single '
      + 'execution, and every subsequent quarrel between the districts is now a quarrel Rome '
      + 'arbitrates. The elders understand perfectly what has been done to them. They also '
      + 'cannot think of a lawful way to refuse.',
    forTag: 'player',
    date: { y: -57, m: 5 },
    aiOption: 1,
    historical: 'Gabinius divided the country into five synhedria in 57 BCE. The arrangement lapsed within a decade, but nobody in Judaea ever forgot that it had been possible.',
    options: [
      {
        label: 'Sit in all five and keep one list of members',
        tooltip: '+15 governance points and "The Council in Five Rooms" (+5% income, −0.3 unrest everywhere) for ten years. The form is obeyed exactly; the body is the same body.',
        effects: guard('councils:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15 });
          mod(ctx, 'council_five_rooms', 'The Council in Five Rooms', { incomeMult: 1.05, unrestAll: -0.3 }, 120);
          h.setFlag(ctx, 'councilKeptWhole', true);
          h.chronicle(ctx, 'era', 'Five councils are seated as ordered, and the same men sit '
            + 'in them, and one list is kept of who they are.');
        }),
      },
      {
        label: 'Refuse to seat any of them',
        tooltip: '+8 legitimacy and +10 martial points, with "Under the Proconsul\'s Eye" (−6% income, +0.8 unrest everywhere) for six years. The proconsul seats them anyway, out of men who will take the seat.',
        effects: guard('councils:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 8, mar: 10 });
          mod(ctx, 'proconsuls_eye', 'Under the Proconsul\'s Eye', { incomeMult: 0.94, unrestAll: 0.8 }, 72);
          h.chronicle(ctx, 'era', 'The court refuses to seat the five councils. They are seated '
            + 'without it, from among the men willing to be seen taking a Roman appointment.');
        }),
      },
      {
        label: 'Take the districts seriously and govern through them',
        tooltip: '−25 talents on clerks and circuits: +10 governance points and "The Five Districts" (+8% income, −4% cost of governing) for twelve years. A country administered in five pieces is a country that is being administered.',
        effects: guard('councils:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -25, gov: 10 });
          mod(ctx, 'five_districts', 'The Five Districts', { incomeMult: 1.08, adminMult: 0.96 }, 144);
          h.chronicle(ctx, 'era', 'The five districts are staffed, circuited and taken '
            + 'seriously. Whatever Gabinius meant by them, they collect.');
        }),
      },
    ],
  },

  // ── 56 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67y_the_sons_who_would_not_stay_beaten',
    title: 'The Sons Who Would Not Stay Beaten',
    desc: 'Alexander, son of Aristobulus, got away from the escort taking him to Rome and has '
      + 'raised the country twice. This is the second time. He is beaten near Mount Tabor '
      + 'with ten thousand dead, and his brother — who broke out of custody in Rome itself '
      + 'and sailed home to do the same thing — is retaken at Machaerus after two days of '
      + 'fighting on a hilltop with a wound in him.\n\n'
      + 'Neither of them ever wins anything. What they establish, over four years and three '
      + 'risings, is that the country will turn out for a Hasmonean name every single time it '
      + 'is asked, no matter how thoroughly the last attempt failed — which is a fact about '
      + 'the country, and every court in the east now has it written down.',
    forTag: 'player',
    date: { y: -56, m: 9 },
    aiOption: 2,
    historical: 'Alexander and Aristobulus rose repeatedly between 57 and 55 BCE and were crushed every time. Josephus counts more than twenty thousand dead across the risings.',
    options: [
      {
        label: 'The name is worth the losses',
        tooltip: '+10 legitimacy, +8 martial points, and "The Name They Rise For" (+6% manpower, +0.5 unrest everywhere) for ten years.',
        effects: guard('sons:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10, mar: 8 });
          mod(ctx, 'name_they_rise_for', 'The Name They Rise For', { manpowerMult: 1.06, unrestAll: 0.5 }, 120);
          h.chronicle(ctx, 'war', 'The risings are counted up and the count is published: the '
            + 'country turns out for the name every time it is asked.');
        }),
      },
      {
        label: 'Bury the dead and say nothing',
        tooltip: '−30 talents on the burials and the widows: +6 legitimacy, +1 stability, and "The Quiet Burials" (−0.6 unrest everywhere) for eight years.',
        effects: guard('sons:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, legitimacy: 6, stability: 1 });
          mod(ctx, 'quiet_burials', 'The Quiet Burials', { unrestAll: -0.6 }, 96);
          h.chronicle(ctx, 'era', 'The dead of the risings are buried at the crown\'s expense '
            + 'and no speech is made over them.');
        }),
      },
      {
        label: 'Ten thousand dead is not a policy',
        tooltip: '+15 governance points and "The Lesson of Tabor" (−0.5 unrest everywhere, +4% income) for ten years. The court writes down what three risings cost and circulates it.',
        effects: guard('sons:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15 });
          mod(ctx, 'lesson_of_tabor', 'The Lesson of Tabor', { unrestAll: -0.5, incomeMult: 1.04 }, 120);
          h.chronicle(ctx, 'era', 'The court has the cost of the risings tallied and read out: '
            + 'three attempts, three defeats, and the number of the dead at the end of it.');
        }),
      },
    ],
  },

  // ── 55 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67y_the_road_to_pelusium',
    title: 'The Road to Pelusium',
    desc: 'Gabinius is going to put Ptolemy Auletes back on the throne of Egypt for ten '
      + 'thousand talents, against the Senate\'s advice and a Sibylline oracle, and the road '
      + 'runs across the desert from Gaza to Pelusium with no water on it. Antipater the '
      + 'Idumaean provides the water. He also provides grain, guides, and — the part that '
      + 'actually decides the campaign — a letter to the Jewish garrison troops holding the '
      + 'Pelusium frontier for Egypt, telling them to let the column through.\n\n'
      + 'They let it through. A Jewish frontier force stands aside for a Roman army because a '
      + 'Jewish official in Judaea asked it to, and everyone involved learns the same thing at '
      + 'the same moment: this nation has men under arms in three kingdoms, and somebody has '
      + 'just demonstrated that they can be coordinated.',
    forTag: 'player',
    date: { y: -55, m: 7 },
    aiOption: 0,
    historical: 'Josephus records that the Jewish garrison of the Egyptian frontier admitted Gabinius\' army at Antipater\'s request. Roman commanders remembered the favour for twenty years.',
    options: [
      {
        label: 'Send the water, the grain and the letter',
        tooltip: '−40 talents in supply: +12 influence points and "A Favour Rome Remembers" (+6% income) for twelve years. Every Roman commander in the east now knows the name of the man who opened Egypt.',
        effects: guard('pelusium:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, infl: 12 });
          mod(ctx, 'favour_rome_remembers', 'A Favour Rome Remembers', { incomeMult: 1.06 }, 144);
          h.setFlag(ctx, 'pelusiumFavour', true);
          h.chronicle(ctx, 'diplomacy', 'Water, grain and one letter go out along the Pelusium '
            + 'road. The frontier opens, and the debt is filed in Rome where debts are useful.');
        }),
      },
      {
        label: 'Sell the supply at the market rate and write nothing',
        tooltip: '+50 talents and +6 governance points. The army is fed, the frontier is its own problem, and no Jewish garrison anywhere has been asked to obey a foreign letter.',
        effects: guard('pelusium:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 50, gov: 6 });
          h.chronicle(ctx, 'era', 'The column buys its water and its grain at the going rate '
            + 'and crosses the desert on its own account.');
        }),
      },
      {
        label: 'The Senate forbade this expedition. Let the desert have it',
        tooltip: '+8 legitimacy and "Nothing Owed and Nothing Owing" (−0.4 unrest everywhere) for eight years, with "The Proconsul\'s Memory" (−5% income) for six: Gabinius crosses anyway, and remembers.',
        effects: guard('pelusium:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 8 });
          mod(ctx, 'nothing_owed', 'Nothing Owed and Nothing Owing', { unrestAll: -0.4 }, 96);
          ctx.helpers.addTagModifier(ctx, P(ctx), {
            id: 'proconsuls_memory', name: 'The Proconsul\'s Memory', months: 72, effects: { incomeMult: 0.95 },
          });
          h.chronicle(ctx, 'era', 'The court declines to supply an expedition the Senate '
            + 'forbade. It crosses the desert anyway, thirstier and less friendly.');
        }),
      },
    ],
  },

  // ── 52 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67y_the_thirty_thousand',
    title: 'The Thirty Thousand',
    desc: 'Cassius is in Syria with what is left after Carrhae and needs money and a '
      + 'reputation, in that order. He takes Tarichaeae on the lake, and sells the population '
      + '— thirty thousand people, the fishing town and the villages behind it — and has '
      + 'Peitholaus, who had been holding the district for the Hasmonean side, executed at the '
      + 'urging of the men in Jerusalem who wanted him gone.\n\n'
      + 'The number is what makes it. Thirty thousand is not a punishment, it is a harvest: '
      + 'the population of a substantial district removed and converted into cash in a single '
      + 'operation, by a man with no instructions from anybody, to cover a shortfall in his '
      + 'own accounts. Every ledger in the east now contains the same discovery, which is that '
      + 'this country\'s people are its most liquid asset.',
    forTag: 'player',
    date: { y: -52, m: 11 },
    aiOption: 1,
    historical: 'Cassius sold the inhabitants of Tarichaeae into slavery in 52 BCE. Antony ordered restitution of the survivors eleven years later; most were never found.',
    options: [
      {
        label: 'Buy back what can be bought back',
        tooltip: '−90 talents into the slave markets of Tyre, Delos and Puteoli: +12 legitimacy, +1 stability, and "The Bought-Back" (+4% manpower, −0.5 unrest everywhere) for ten years.',
        effects: guard('thirty:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -90, legitimacy: 12, stability: 1 });
          mod(ctx, 'the_bought_back', 'The Bought-Back', { manpowerMult: 1.04, unrestAll: -0.5 }, 120);
          h.chronicle(ctx, 'era', 'Agents of the crown go through the slave markets of the '
            + 'coast with a list. They come home with a fraction of it.');
        }),
      },
      {
        label: 'Record every name and wait for a Roman who owes us',
        tooltip: '+12 governance points, +8 influence points, and "The List of Tarichaeae" (+3% income) for fifteen years. The register is kept, and one day somebody in Rome will want something.',
        effects: guard('thirty:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12, infl: 8 });
          mod(ctx, 'list_of_tarichaeae', 'The List of Tarichaeae', { incomeMult: 1.03 }, 180);
          h.setFlag(ctx, 'tarichaeaeList', true);
          h.chronicle(ctx, 'era', 'Every name taken at the lake is written into a register and '
            + 'the register is kept. It is the only weapon available, and it keeps.');
        }),
      },
      {
        label: 'Rebuild the lake towns with settlers from the hills',
        tooltip: '−55 talents: "The Resettled Shore" (+6% income, +5% growth) for twelve years, and −4 legitimacy from the families who wanted the old inhabitants back first.',
        effects: guard('thirty:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, legitimacy: -4 });
          mod(ctx, 'resettled_shore', 'The Resettled Shore', { incomeMult: 1.06, growthMult: 1.05 }, 144);
          h.chronicle(ctx, 'era', 'The lake towns are refilled out of the hill villages. The '
            + 'nets are back in the water within two seasons and nobody says the old names.');
        }),
      },
    ],
  },

  // ── 49 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67y_the_poison_and_the_axe',
    title: 'The Poison and the Axe',
    desc: 'Caesar has released Aristobulus from custody in Rome, given him two legions and '
      + 'sent him east to make trouble for Pompey\'s Syria. He gets as far as the docks. '
      + 'Pompey\'s friends poison him before he sails, and his body is kept in honey until it '
      + 'can be sent home for burial in the royal tombs.\n\n'
      + 'His son Alexander — the one who kept rising — is taken at Antioch on Pompey\'s '
      + 'written orders and beheaded, on a charge of having made war on the Romans, which is '
      + 'true and which he did as a king in his own country. In three months the Hasmonean '
      + 'claim is reduced to an old man in Jerusalem who was never any good at this, and to '
      + 'whatever the two remaining children can be made to mean.',
    forTag: 'player',
    date: { y: -49, m: 8 },
    aiOption: 2,
    historical: 'Aristobulus II was poisoned in Rome and his son Alexander beheaded at Antioch, both in 49 BCE, as the Roman civil war opened.',
    options: [
      {
        label: 'Bring the bodies home and bury them as kings',
        tooltip: '−25 talents for the escort and the tombs: +10 legitimacy, +1 stability, and "The Royal Tombs" (−0.4 unrest everywhere) for ten years.',
        effects: guard('poison:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -25, legitimacy: 10, stability: 1 });
          mod(ctx, 'royal_tombs', 'The Royal Tombs', { unrestAll: -0.4 }, 120);
          h.chronicle(ctx, 'era', 'The bodies come home in honey and go into the tombs of the '
            + 'kings, with the rites. What is buried with them is a claim.');
        }),
      },
      {
        label: 'Marry the surviving children into the house',
        tooltip: '+12 influence points and "The Two Who Are Left" (+5% income, −0.3 unrest everywhere) for twelve years. Two names that could be raised against the crown are inside it instead.',
        effects: guard('poison:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 12 });
          mod(ctx, 'two_who_are_left', 'The Two Who Are Left', { incomeMult: 1.05, unrestAll: -0.3 }, 144);
          h.chronicle(ctx, 'era', 'The surviving children of Aristobulus are married into the '
            + 'ruling house. It is cheaper than watching them.');
        }),
      },
      {
        label: 'Say plainly who killed them, and to whom',
        tooltip: '+8 legitimacy, +10 martial points, and "The Grievance Recorded" (+4% manpower, +0.5 unrest everywhere) for ten years. Caesar reads the letter, and Caesar is going to win.',
        effects: guard('poison:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 8, mar: 10 });
          mod(ctx, 'grievance_recorded', 'The Grievance Recorded', { manpowerMult: 1.04, unrestAll: 0.5 }, 120);
          h.chronicle(ctx, 'diplomacy', 'The court states in writing who poisoned a king and '
            + 'who signed for the axe at Antioch, and sends the statement to the other side of '
            + 'the Roman quarrel.');
        }),
      },
    ],
  },

  // ── 45 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67y_the_colleges_not_banned',
    title: 'The Colleges That Were Not Banned',
    desc: 'Caesar dissolves the collegia. Every private association in the city of Rome — the '
      + 'burial clubs, the trade brotherhoods, the street-corner cults that had become the '
      + 'infrastructure of political violence — is abolished by decree, because the last '
      + 'twenty years have demonstrated exactly what an organised association can do to a '
      + 'street.\n\n'
      + 'One category is exempted by name. The Jewish assemblies may go on meeting, holding '
      + 'funds, dining together and sending their money east, on the express grounds that '
      + 'they are ancient and that they have been useful. Rome has just made an exception in '
      + 'its own capital, in a security measure, for a nation. It is a small clause in a long '
      + 'decree and it is the legal foundation everything the diaspora does for the next four '
      + 'centuries will rest on.',
    forTag: 'player',
    date: { y: -45, m: 9 },
    aiOption: 0,
    historical: 'Caesar\'s dissolution of the collegia exempted the Jewish assemblies. Later emperors reaffirmed the exemption, and it became the charter of diaspora self-government.',
    options: [
      {
        label: 'Get it in writing, and get it copied into every province',
        tooltip: '−35 talents for the clerks and the couriers: +15 influence points and "The Bronze in the Archive" (+8% income) for fifteen years. A privilege that exists in a hundred provincial archives is hard to lose.',
        effects: guard('colleges:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, infl: 15 });
          mod(ctx, 'bronze_archive', 'The Bronze in the Archive', { incomeMult: 1.08 }, 180);
          h.setFlag(ctx, 'collegiaExemption', true);
          h.chronicle(ctx, 'diplomacy', 'The exemption is copied onto bronze and lodged in the '
            + 'archive of every city that will take it. Nothing in the east is safer than a '
            + 'privilege in a hundred places at once.');
        }),
      },
      {
        label: 'Do not draw attention to it',
        tooltip: '+10 governance points and "The Clause Nobody Reads" (+4% income) for twelve years. The exemption stands and no orator in Rome is reminded that it exists.',
        effects: guard('colleges:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 10 });
          mod(ctx, 'clause_nobody_reads', 'The Clause Nobody Reads', { incomeMult: 1.04 }, 144);
          h.chronicle(ctx, 'era', 'The exemption is left where it is, in the middle of a long '
            + 'decree about street gangs, unremarked.');
        }),
      },
      {
        label: 'Ask for the same clause for the cities of the east',
        tooltip: '−45 talents in embassies to Sardis, Ephesus, Delos and Halicarnassus: +12 influence points and "The Cities Confirm" (+7% income, −0.3 unrest everywhere) for fifteen years.',
        effects: guard('colleges:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, infl: 12 });
          mod(ctx, 'cities_confirm', 'The Cities Confirm', { incomeMult: 1.07, unrestAll: -0.3 }, 180);
          h.chronicle(ctx, 'diplomacy', 'Embassies go out to the Greek cities asking each to '
            + 'confirm the clause in its own decrees. Most do, at length, and in stone.');
        }),
      },
    ],
  },

  // ── 41 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67y_the_letter_to_tyre',
    title: 'The Letter to Tyre',
    desc: 'Antony writes to Tyre, and to Sidon, and to Antioch, and to Aradus. The letter is '
      + 'short and it is an order: the Jews sold by Cassius are to be restored to freedom, the '
      + 'places he took are to be given back, and the magistrates who received the proceeds '
      + 'are to see to it themselves. It is to be inscribed in Latin and Greek in the most '
      + 'public place in each city, so that it may be read.\n\n'
      + 'Cassius is dead at Philippi, which is why this is possible. The cities comply where '
      + 'they can and stall where they cannot, and everybody understands that a man sold '
      + 'eleven years ago into a market that keeps no names is not coming back. What can be '
      + 'recovered is the principle, permanently, in stone, in four harbours: that these '
      + 'people were taken unlawfully and the taking is void.',
    forTag: 'player',
    date: { y: -41, m: 7 },
    aiOption: 0,
    historical: 'Josephus preserves Antony\'s letters to Tyre and the other Phoenician cities ordering the restoration of Jews sold by Cassius, and the requirement that they be posted publicly.',
    options: [
      {
        label: 'Send agents with the letter to every harbour',
        tooltip: '−50 talents on the search: +10 legitimacy and "The Restored" (+4% manpower, +3% income) for twelve years. Some hundreds come home.',
        effects: guard('tyre:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, legitimacy: 10 });
          mod(ctx, 'the_restored', 'The Restored', { manpowerMult: 1.04, incomeMult: 1.03 }, 144);
          h.chronicle(ctx, 'era', 'The letter is carried into every harbour on the coast by '
            + 'men with a list. Some hundreds walk home; the rest stay in the register.');
        }),
      },
      {
        label: 'Take the inscription instead of the people',
        tooltip: '+14 influence points and "Cut in the Public Place" (+6% income) for fifteen years. Four cities carry a permanent statement of the rule, and the rule outlives everyone it was written for.',
        effects: guard('tyre:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 14 });
          mod(ctx, 'cut_in_public_place', 'Cut in the Public Place', { incomeMult: 1.06 }, 180);
          h.chronicle(ctx, 'diplomacy', 'The order is cut in Latin and Greek in four harbours '
            + 'where the ships come in. What is being preserved is not the people. It is the '
            + 'rule.');
        }),
      },
      {
        label: 'Ask for the money instead',
        tooltip: '+110 talents in restitution from the four cities, +5 governance points, and −8 legitimacy. The families are told what their relatives were worth.',
        effects: guard('tyre:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 110, gov: 5, legitimacy: -8 });
          h.chronicle(ctx, 'era', 'The crown takes the restitution in silver rather than in '
            + 'people. The sum is large and it is recorded, and so is the fact that it was '
            + 'taken.');
        }),
      },
    ],
  },

  // ── 33 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67y_the_road_to_babylon',
    title: 'The Road to Babylon',
    desc: 'The eastern communities send word by the caravan road, which is the only road that '
      + 'still works without asking a Roman. There are Jews on both banks of the Euphrates in '
      + 'numbers nobody in the west has properly counted — Nehardea, Nisibis, the villages of '
      + 'the canal country — and they have been living under Arsacid kings who have never '
      + 'once cared what they believed, on the reasonable grounds that a taxpayer\'s religion '
      + 'is not a satrap\'s business.\n\n'
      + 'Their proposal is procedural and enormous. They will collect the half-shekel of the '
      + 'east themselves, hold it at Nehardea and Nisibis under guard, and send it up in one '
      + 'convoy a year rather than in a hundred vulnerable parcels. What they want in return '
      + 'is that the Temple treat their reckoning of the year as authoritative for everything '
      + 'east of the river.',
    forTag: 'player',
    date: { y: -33, m: 6 },
    aiOption: 0,
    historical: 'Josephus describes the eastern half-shekel being gathered at Nehardea and Nisibis and sent up under armed convoy. The Babylonian community was self-governing in fact long before it was in name.',
    options: [
      {
        label: 'One convoy a year, and their reckoning east of the river',
        tooltip: '+12 influence points and "The Eastern Convoy" (+9% income, +5% trade) for fifteen years, and −4 legitimacy from the houses who hold that there is one calendar and it is kept here.',
        effects: guard('babylon:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 12, legitimacy: -4 });
          mod(ctx, 'eastern_convoy', 'The Eastern Convoy', { incomeMult: 1.09, tradeMult: 1.05 }, 180);
          h.setFlag(ctx, 'easternConvoy', true);
          h.chronicle(ctx, 'era', 'The gold of the east comes up in one guarded convoy a year, '
            + 'and the courts beyond the river are answered in their own reckoning.');
        }),
      },
      {
        label: 'The convoy, but the calendar stays here',
        tooltip: '+8 influence points, +6 legitimacy, and "The Guarded Gold" (+6% income) for twelve years. The east sends the money and grumbles about the months.',
        effects: guard('babylon:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 8, legitimacy: 6 });
          mod(ctx, 'guarded_gold', 'The Guarded Gold', { incomeMult: 1.06 }, 144);
          h.chronicle(ctx, 'era', 'The convoy is agreed and the calendar is not. Fire-signals '
            + 'still go out from the hills to tell the east when the month began.');
        }),
      },
      {
        label: 'Send our own men to hold the money',
        tooltip: '−40 talents to garrison the two treasuries with our own: +10 governance points and "Our Men at Nehardea" (+7% income) for twelve years, with +0.5 unrest everywhere for four while the east decides how it feels about that.',
        effects: guard('babylon:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, gov: 10 });
          mod(ctx, 'our_men_nehardea', 'Our Men at Nehardea', { incomeMult: 1.07, unrestAll: 0.5 }, 144);
          h.chronicle(ctx, 'era', 'The crown\'s own men are sent to sit on the treasuries at '
            + 'Nehardea and Nisibis. The east notes the courtesy and its limits.');
        }),
      },
    ],
  },

  // ── 26 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev67y_the_assize_at_antioch',
    title: 'The Assize at Antioch',
    desc: 'The legate of Syria holds his assize and the docket is full of the same case in '
      + 'eleven versions. A Greek city has billeted troops in a synagogue; another has drafted '
      + 'Jews for the seventh-day watch; a third has taxed the collection for the Temple as an '
      + 'export; a fourth has required attendance at a civic sacrifice as a condition of '
      + 'holding a market stall.\n\n'
      + 'None of it is persecution and all of it is friction — the ordinary grinding of a '
      + 'community that keeps a different week against cities organised around a calendar of '
      + 'processions. The legate would like it to stop appearing on his docket. What he wants '
      + 'is a standing rule he can point at, and he is prepared to let the interested party '
      + 'draft it.',
    forTag: 'player',
    date: { y: -26, m: 5 },
    aiOption: 0,
    historical: 'The Julio-Claudian rescripts on Jewish privileges in the Greek cities were mostly responses to exactly these disputes: the sabbath, the collections, and compulsory civic cult.',
    options: [
      {
        label: 'Draft it, and draft it narrowly',
        tooltip: '+15 governance points and "The Standing Rule" (+7% income, −0.4 unrest everywhere) for fifteen years. Four things are named and nothing else is claimed, which is why it survives four emperors.',
        effects: guard('assize:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15 });
          mod(ctx, 'standing_rule', 'The Standing Rule', { incomeMult: 1.07, unrestAll: -0.4 }, 180);
          h.setFlag(ctx, 'standingRule', true);
          h.chronicle(ctx, 'diplomacy', 'A standing rule is drafted for the legate\'s docket: '
            + 'the seventh day, the collection, the exemption from the civic sacrifice, and '
            + 'nothing else. It is short enough to be enforced.');
        }),
      },
      {
        label: 'Ask for everything while somebody is listening',
        tooltip: '+10 influence points and "The Wide Charter" (+10% income) for eight years, then it is quietly narrowed: +0.6 unrest everywhere for six years as the cities discover what was signed.',
        effects: guard('assize:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 10 });
          mod(ctx, 'wide_charter', 'The Wide Charter', { incomeMult: 1.10, unrestAll: 0.6 }, 96);
          h.chronicle(ctx, 'diplomacy', 'The draft that goes to the legate asks for everything '
            + 'and gets most of it. The cities read it slowly and begin composing objections.');
        }),
      },
      {
        label: 'Settle each city separately and pay for it',
        tooltip: '−45 talents in gifts and advocates, eleven cities at a time: +8 governance points, +8 influence points, and "Eleven Settlements" (+5% income, −0.5 unrest everywhere) for twelve years.',
        effects: guard('assize:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, gov: 8, infl: 8 });
          mod(ctx, 'eleven_settlements', 'Eleven Settlements', { incomeMult: 1.05, unrestAll: -0.5 }, 144);
          h.chronicle(ctx, 'era', 'Each city is settled with separately, at its own price. No '
            + 'general rule is created and no general rule can therefore be revoked.');
        }),
      },
    ],
  },
];
