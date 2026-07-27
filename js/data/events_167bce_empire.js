// Judaea Universalis — the empire that should not exist, 130 BCE–6 CE.
// Content package. Zero imports; all effects run through ctx.helpers at
// runtime. Concatenated onto EVENTS_167 by the era registry.
//
// The 167 chain's success ladder is eleven cards long and every rung is a
// place: the hills, the Philistine coast, the Greek cities, Damascus, Tyre and
// Sidon, and finally Antioch in `ev_diadem_in_dust`. Then it stops. A Judaea
// holding Antioch, Damascus and the coast is not a kingdom that won its war —
// it is the thing that replaced the Seleucid empire, and the chain has no card
// that says so and no card that charges for it.
//
// The charge is the point. Every problem below is one the Hasmoneans actually
// hit at a fraction of this scale, which is the argument for putting them here
// rather than inventing imperial flavour:
//
//   Jannaeus could not man his own wars from Judaea and hired Pisidians and
//   Cilicians to fight for him (Josephus, Ant. XIII.374) — at a realm perhaps a
//   sixth of this one. An empire makes that structural rather than episodic.
//
//   Jannaeus struck coins reading "Yehonatan the High Priest and the Council
//   of the Jews" in paleo-Hebrew on one face and BAΣIΛEΩΣ AΛEΞANΔPOY on the
//   other. The chancery language question was already answered once, quietly,
//   on the money.
//
//   Hyrcanus I was asked by the Pharisees to lay down the high priesthood and
//   keep only the crown (Ant. XIII.288–292) and refused, which cost him the
//   party. A ruler seated at Antioch cannot make that refusal work: the Yom
//   Kippur service requires the High Priest in the Temple, in person, on a
//   fixed day, and Antioch is three hundred miles away.
//
// So the top rung is not "you win harder". It is the discovery that the offices
// this state was built out of do not survive the size it has reached.
//
// SCALE. The ladder below re-derives its own tier the way the rest of the
// chain does, but in one place instead of eleven: `imperial()` returns 0–3 and
// every card names the tier it belongs to. If the engine ever grows a real
// `minScale` gate (the natural companion to `minYear`), this function is what
// it should read, and these cards become declarations rather than triggers.
//
// Source spine: Josephus, Antiquitates XIII; 1 Maccabees 14–15 for the Simon
// settlement and the assembly's language; Meshorer for the bilingual coinage.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_167bce_empire] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

function safeTrigger(key, fn) {
  return function (ctx) {
    try { return !!fn(ctx); } catch (e) { warnOnce('trigger:' + key, e); return false; }
  };
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

function flag(ctx, key) {
  return !!(ctx.game.flags && ctx.game.flags[key]);
}

// The Jewish crown, whatever it is calling itself this decade. Matches the
// helper in events_167bce_world.js on purpose — a formed Israel is still the
// state that took Antioch.
function crown(ctx) {
  if (alive(ctx, 'HAS')) return 'HAS';
  if (alive(ctx, 'MLI')) return 'MLI';
  return null;
}

function holds(ctx, tag, name) {
  try {
    const p = ctx.prov(name);
    return !!p && !p.impassable && p.owner === tag && p.controller === tag;
  } catch (e) { warnOnce('holds', e); return false; }
}

// Sovereign, intact, and seated in its own capital — the chain's own
// `greaterVictory`, restated locally so this package imports nothing.
function sovereign(ctx) {
  const me = crown(ctx);
  if (!me) return false;
  const t = ctx.game.tags[me];
  return !(t && t.overlord) && holds(ctx, me, 'Jerusalem');
}

// The one tier function. 0 a kingdom, 1 a regional power, 2 the master of
// Coele-Syria, 3 the successor state.
//
// Tier 3 is deliberately not a province count. A realm can be enormous in the
// Negev and the Hauran and still be a large Judaea; it is Antioch that makes
// it the other thing, because Antioch is the seat the Seleucids ruled from and
// a Jewish king sitting in it is a different political object.
function imperial(ctx) {
  const me = crown(ctx);
  if (!me || !sovereign(ctx)) return 0;
  const n = ctx.helpers.countControlled(ctx, me, {});
  const syria = holds(ctx, me, 'Damascus') && holds(ctx, me, 'Apamea');
  if (holds(ctx, me, 'Antioch') && syria && n >= 18) return 3;
  if (syria && n >= 14) return 2;
  if (n >= 10) return 1;
  return 0;
}

// How much of the realm is not of the covenant. The gentile-majority question
// `ev_law_of_the_nations` asks at 15 provinces does not go away at 25; it gets
// worse, and the cards below assume the player has already answered it once.
function gentileShare(ctx) {
  const me = crown(ctx);
  if (!me) return 0;
  const h = ctx.helpers;
  const all = h.countControlled(ctx, me, {});
  if (!all) return 0;
  return (all - h.countControlled(ctx, me, { religion: 'judaism' })) / all;
}

export const EVENTS_167_EMPIRE = [

  // ── The rung above Antioch ──────────────────────────────────────────────

  {
    id: 'ev_x_the_successor_state',
    title: 'The Kingdom That Replaced an Empire',
    desc: 'The chancery at Antioch has been working for a Jewish king for some '
      + 'months now, and the clerks have begun to notice that nobody has told them '
      + 'what to call the thing they are working for. The old formula is unusable: '
      + 'there is no King of Syria. The new one does not exist, because the state '
      + 'that grew into this shape grew out of a village rising against a decree '
      + 'about pigs, and its whole vocabulary of itself — the deliverance, the '
      + 'sanctuary cleansed, the yoke of the nations lifted from Israel — is the '
      + 'vocabulary of a people who were being crushed and stopped being crushed. '
      + 'None of it has a word for governing Cilicians. The court has inherited an '
      + 'empire\'s correspondence, an empire\'s garrisons, an empire\'s creditors and '
      + 'an empire\'s enemies, and it has the administrative language of a temple '
      + 'state in the Judaean hills. Somebody is going to have to say out loud what '
      + 'this is, and whatever they say will be quoted for four hundred years.',
    forTag: 'both',
    major: true,
    minYear: -130,
    maxYear: -20,
    trigger: safeTrigger('ev_x_the_successor_state', (ctx) => {
      if (imperial(ctx) < 3) return false;
      return flag(ctx, 'diademInDust') || flag(ctx, 'yokeReversed');
    }),
    aiOption: 1,
    historical: 'No Hasmonean ever held Antioch. Tigranes of Armenia took it in 83 BCE and Pompey made it the capital of a Roman province in 64; the Jewish state that briefly touched Coele-Syria under Jannaeus was reduced by Pompey twenty years later.',
    options: [
      {
        label: 'Let the style be King of Israel and of the Nations Subject to Him',
        tooltip: 'The formula the clerks were waiting for: one crown over two kinds of subject, and the difference written into the title rather than argued about. +10 legitimacy, +2 stability, "The Style of the Nations" (+10% income, +1 unrest everywhere, 60 months). +2 authority, +2 conquest. The Pharisees read the second half of the title and do not care for it (−20); the great houses, who will be collecting the tribute, do (+15).',
        effects: guard('ev_x_the_successor_state:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.adjust(ctx, me, { legitimacy: 10, stability: 2 });
          h.addTagModifier(ctx, me, {
            id: 'style_of_the_nations', name: 'The Style of the Nations', months: 60,
            effects: { incomeMult: 1.10, unrestAll: 1 },
          });
          h.factionShift(ctx, me, 'pharisees', -20);
          h.factionShift(ctx, me, 'sadducees', 15);
          h.doctrine(ctx, 'authority', 2);
          h.doctrine(ctx, 'conquest', 2);
          h.setFlag(ctx, 'seleucidSuccessor', true);
          h.setFlag(ctx, 'styleOfTheNations', true);
          h.chronicle(ctx, 'era', 'A Jewish king is proclaimed at Antioch over Israel and the nations subject to him. There has been no such title since Solomon, and there was no such empire then.');
        }),
      },
      {
        label: 'King and High Priest, as before — the rest is administered, not reigned over',
        tooltip: 'The old style kept, and Syria held as an occupation rather than a realm: nothing is conceded in the title and nothing is solved by it either. +5 legitimacy, +25 Pharisee favour, and the conquered provinces are governed by men with no standing to govern them (+2 unrest in every non-Jewish province, permanent until answered). +2 zeal.',
        effects: guard('ev_x_the_successor_state:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.adjust(ctx, me, { legitimacy: 5 });
          h.factionShift(ctx, me, 'pharisees', 25);
          h.factionShift(ctx, me, 'sadducees', -15);
          h.doctrine(ctx, 'zeal', 2);
          h.addTagModifier(ctx, me, {
            id: 'an_occupation_not_a_realm', name: 'An Occupation, Not a Realm', months: 240,
            effects: { unrestAll: 2, incomeMult: 0.95 },
          });
          h.setFlag(ctx, 'seleucidSuccessor', true);
          h.setFlag(ctx, 'occupationNotRealm', true);
          h.chronicle(ctx, 'era', 'The Jewish crown holds Antioch and declines to be anything other than what it was. The Seleucid chancery goes on writing, addressed to nobody in particular.');
        }),
      },
    ],
  },

  // ── The three charges ───────────────────────────────────────────────────

  {
    id: 'ev_x_where_the_king_sits',
    title: 'Where the King Sits',
    desc: 'Antioch has half a million people, a mint, a harbour at Seleucia five '
      + 'hours down the Orontes, and the archives of a hundred and fifty years of '
      + 'imperial correspondence. Jerusalem has the Temple. Every practical argument '
      + 'runs one way and the only argument on the other side is the one the state '
      + 'was founded on. The couriers have already made the decision de facto — the '
      + 'Syrian post reaches the king faster than the Judaean one, and the men who '
      + 'need answers have started going to Antioch to get them. The court can '
      + 'ratify what the couriers decided, or it can spend the rest of the reign '
      + 'making a slower capital work.',
    forTag: 'both',
    major: true,
    minYear: -128,
    maxYear: -10,
    trigger: safeTrigger('ev_x_where_the_king_sits', (ctx) => {
      if (!flag(ctx, 'seleucidSuccessor')) return false;
      return imperial(ctx) >= 3 && !flag(ctx, 'seatDecided');
    }),
    aiOption: 0,
    historical: 'The question never arose. It is the one Constantine answered at Byzantium four centuries later, and answered the other way.',
    options: [
      {
        label: 'Jerusalem. The king sleeps where the Temple is',
        tooltip: 'The capital stays, and the empire is governed at the speed of a courier from the hills. +12 legitimacy, +30 Pharisee favour, +2 zeal, −1 authority. "The Slow Capital": −10% income and +1 unrest in every province beyond the Jordan and the coast (120 months).',
        effects: guard('ev_x_where_the_king_sits:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.adjust(ctx, me, { legitimacy: 12 });
          h.factionShift(ctx, me, 'pharisees', 30);
          h.doctrine(ctx, 'zeal', 2);
          h.doctrine(ctx, 'authority', -1);
          h.addTagModifier(ctx, me, {
            id: 'the_slow_capital', name: 'The Slow Capital', months: 120,
            effects: { incomeMult: 0.90, unrestAll: 1 },
          });
          h.setFlag(ctx, 'seatDecided', true);
          h.setFlag(ctx, 'seatJerusalem', true);
          h.chronicle(ctx, 'ruler', 'The court refuses Antioch. The empire will be run from a hill town with a temple on it, and the couriers will simply have to ride further.');
        }),
      },
      {
        label: 'Antioch. The empire is governed from where the empire is',
        tooltip: 'The seat moves. +3 stability, +15% income, +2 authority, +2 alignment westward, and the machinery finally fits the realm — but the Temple has a king who is not there. −15 legitimacy, −40 Pharisee favour, and the priesthood question is now urgent rather than theoretical.',
        effects: guard('ev_x_where_the_king_sits:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.adjust(ctx, me, { stability: 3, legitimacy: -15 });
          h.addTagModifier(ctx, me, {
            id: 'the_seat_at_antioch', name: 'The Seat at Antioch', months: 240,
            effects: { incomeMult: 1.15 },
          });
          h.factionShift(ctx, me, 'pharisees', -40);
          h.factionShift(ctx, me, 'sadducees', 25);
          h.doctrine(ctx, 'authority', 2);
          h.doctrine(ctx, 'alignment', 2);
          h.setFlag(ctx, 'seatDecided', true);
          h.setFlag(ctx, 'seatAntioch', true);
          h.chronicle(ctx, 'era', 'The Jewish court moves to Antioch. The Temple keeps its service and loses its king, and both facts will be argued about for as long as the kingdom lasts.');
        }),
      },
      {
        label: 'Both. The court winters at Antioch and comes up for the festivals',
        tooltip: 'The compromise everyone can live with and nobody defends: two chanceries, two households, three pilgrimages a year moved at state expense. no legitimacy loss and +1 authority — and two of everything. The second capital earns less than the duplicated government costs: net −5% income for 180 months, which is the cheapest way to not decide.',
        effects: guard('ev_x_where_the_king_sits:2', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.addTagModifier(ctx, me, {
            id: 'two_courts', name: 'Two Courts', months: 180,
            effects: { incomeMult: 0.95 },
          });
          h.factionShift(ctx, me, 'pharisees', -5);
          h.factionShift(ctx, me, 'sadducees', 5);
          h.doctrine(ctx, 'authority', 1);
          h.setFlag(ctx, 'seatDecided', true);
          h.setFlag(ctx, 'twoCourts', true);
          h.chronicle(ctx, 'ruler', 'The king will winter on the Orontes and come up to Jerusalem for the festivals. The arrangement is called temporary for sixty years.');
        }),
      },
    ],
  },

  {
    id: 'ev_x_army_judaea_cannot_raise',
    title: 'An Army Judaea Cannot Raise',
    desc: 'The arithmetic has been obvious to the quartermasters for two seasons and '
      + 'nobody has wanted to put it in front of the king. Holding this frontier '
      + 'needs standing garrisons in forty places, and standing garrisons are not '
      + 'what the levy is. The levy is farmers who come out for a season and go home '
      + 'to the harvest, and they came out in the first place because the war was '
      + 'about them. Ask the same men to spend three years in a Cilician hill fort '
      + 'watching a pass they have never heard of and they will go home, and be '
      + 'right to. Judaea can field an army. It cannot field an empire\'s army out '
      + 'of the same men, and the only people who can are for hire.',
    forTag: 'both',
    major: true,
    minYear: -126,
    maxYear: -10,
    trigger: safeTrigger('ev_x_army_judaea_cannot_raise', (ctx) => {
      if (!flag(ctx, 'seleucidSuccessor')) return false;
      return imperial(ctx) >= 3 && !flag(ctx, 'manpowerAnswered');
    }),
    aiOption: 0,
    historical: 'Alexander Jannaeus hired Pisidian and Cilician mercenaries for exactly this reason at a fraction of this scale, and used them against his own subjects when the Pharisees rose — which is how six thousand people came to be killed at a festival, and how the eight hundred crosses happened.',
    options: [
      {
        label: 'Hire the Pisidians and the Cilicians',
        tooltip: 'As Jannaeus did. +25% manpower and +5% discipline (240 months) and the frontier holds — but the crown now has an army with no stake in the country, and it is paid: −10% income for as long as it serves. If the realm ever turns on itself these men will follow the paymaster: +2 unrest everywhere, −20 Pharisee favour, +2 conquest.',
        effects: guard('ev_x_army_judaea_cannot_raise:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.addTagModifier(ctx, me, {
            id: 'the_hired_shields', name: 'The Hired Shields', months: 240,
            effects: { manpowerMult: 1.25, disciplineMult: 1.05, incomeMult: 0.90, unrestAll: 2 },
          });
          h.factionShift(ctx, me, 'pharisees', -20);
          h.factionShift(ctx, me, 'warparty', 20);
          h.doctrine(ctx, 'conquest', 2);
          h.setFlag(ctx, 'manpowerAnswered', true);
          h.setFlag(ctx, 'hiredShields', true);
          h.chronicle(ctx, 'ruler', 'The crown takes Pisidians and Cilicians into pay. The frontier is held by men who have never seen Jerusalem and are not required to.');
        }),
      },
      {
        label: 'Levy the conquered — let the nations garrison the nations',
        tooltip: 'Cheaper and more dangerous: Syrians, Idumeans and Greeks under their own officers, sworn to the crown. +20% manpower, +10% reinforcement at no treasury cost (240 months) — and every province that supplies a regiment learns it can withhold one. +1 unrest everywhere, and a revolt in the conquered lands will now be a revolt with an army in it.',
        effects: guard('ev_x_army_judaea_cannot_raise:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.addTagModifier(ctx, me, {
            id: 'the_nations_under_arms', name: 'The Nations Under Arms', months: 240,
            effects: { manpowerMult: 1.20, reinforceMult: 1.10, unrestAll: 1 },
          });
          h.factionShift(ctx, me, 'sadducees', 20);
          h.factionShift(ctx, me, 'pharisees', -10);
          h.doctrine(ctx, 'zeal', -2);
          h.setFlag(ctx, 'manpowerAnswered', true);
          h.setFlag(ctx, 'nationsUnderArms', true);
          h.chronicle(ctx, 'era', 'The crown arms its subject peoples and sets them to garrison each other. It works for as long as it works.');
        }),
      },
      {
        label: 'Hold only what the levy can hold',
        tooltip: 'The honest answer, and the expensive one: the frontier is drawn where Judaean farmers will actually stand. No new manpower and no mercenary bill, +20 Pharisee favour, +2 zeal, +5 legitimacy — and the outer provinces are ungarrisoned. +3 unrest in every non-Jewish province and a standing invitation to any neighbour who can count (180 months).',
        effects: guard('ev_x_army_judaea_cannot_raise:2', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.adjust(ctx, me, { legitimacy: 5 });
          h.addTagModifier(ctx, me, {
            id: 'the_frontier_of_the_levy', name: 'The Frontier of the Levy', months: 180,
            // `aiPassive` is a real key and a BOOLEAN — sim/ai.js tests it for
            // truthiness. It shipped as `0`, which is the key spelled right
            // and the value spelled falsy, so the modifier stored a number
            // nothing acted on. A crown that has drawn its frontier where its
            // own farmers will stand has stopped expanding, and this is how
            // the engine is told so.
            effects: { unrestAll: 3, aiPassive: true },
          });
          h.factionShift(ctx, me, 'pharisees', 20);
          h.doctrine(ctx, 'zeal', 2);
          h.doctrine(ctx, 'conquest', -2);
          h.setFlag(ctx, 'manpowerAnswered', true);
          h.setFlag(ctx, 'frontierOfTheLevy', true);
          h.chronicle(ctx, 'ruler', 'The king declines to hire an army and the map quietly stops being defended past the Orontes.');
        }),
      },
    ],
  },

  {
    id: 'ev_x_the_altar_and_the_throne',
    title: 'The Altar and the Throne',
    desc: 'The Day of Atonement is a fixed date and the service on it can be '
      + 'performed by one man in one building, and there is no provision anywhere in '
      + 'the Law for a deputy. This was never a problem when the High Priest was also '
      + 'the ruler and the ruler lived four streets from the sanctuary. It is a '
      + 'problem now. The court has already been late once. The priests said nothing '
      + 'the first time and have let it be known, through the correct intermediaries '
      + 'and with great courtesy, that they will not say nothing twice. Hyrcanus was '
      + 'asked to give up the priesthood and keep the crown, and he refused, and it '
      + 'cost him a party. He was asked from Jerusalem, where he was standing.',
    forTag: 'both',
    major: true,
    minYear: -124,
    maxYear: -6,
    trigger: safeTrigger('ev_x_the_altar_and_the_throne', (ctx) => {
      if (!flag(ctx, 'seleucidSuccessor')) return false;
      if (flag(ctx, 'priesthoodAnswered')) return false;
      return imperial(ctx) >= 3 && (flag(ctx, 'seatAntioch') || flag(ctx, 'twoCourts'));
    }),
    aiOption: 1,
    historical: 'The Hasmoneans held both offices from Jonathan in 152 to the end, and the combination was the standing grievance of the Pharisees against them for a century.',
    options: [
      {
        label: 'Separate the offices: a High Priest in Jerusalem, a king in the field',
        tooltip: 'The thing Hyrcanus refused, conceded a century later by a king who cannot physically do both. +3 stability, +35 Pharisee favour, −2 authority, and the sanctuary is served properly for the first time in a decade. The priesthood is now an office the crown does not hold and cannot simply fill: a rival centre of legitimacy exists (+1 unrest in Judaea proper, permanent).',
        effects: guard('ev_x_the_altar_and_the_throne:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.adjust(ctx, me, { stability: 3 });
          h.factionShift(ctx, me, 'pharisees', 35);
          h.doctrine(ctx, 'authority', -2);
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'a_priest_who_is_not_the_king', name: 'A Priest Who Is Not the King',
            months: 240, effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'priesthoodAnswered', true);
          h.setFlag(ctx, 'officesDivided', true);
          h.chronicle(ctx, 'era', 'The crown lays down the high priesthood. For the first time since Jonathan the man who rules Israel is not the man who enters the Holy of Holies, and both of them know it.');
        }),
      },
      {
        label: 'Hold both, and let the empire wait ten days a year',
        tooltip: 'The king goes up for the Day of Atonement and the machinery of an empire stops while he does. +10 legitimacy, +2 zeal, +1 authority, Pharisees +20 — and the interruption is real: −8% income and −5% reinforcement, permanently, because the government of Syria has an annual hole in it that its enemies can read off a calendar.',
        effects: guard('ev_x_the_altar_and_the_throne:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.adjust(ctx, me, { legitimacy: 10 });
          h.addTagModifier(ctx, me, {
            id: 'ten_days_a_year', name: 'Ten Days a Year', months: 240,
            effects: { incomeMult: 0.92, reinforceMult: 0.95 },
          });
          h.factionShift(ctx, me, 'pharisees', 20);
          h.doctrine(ctx, 'zeal', 2);
          h.doctrine(ctx, 'authority', 1);
          h.setFlag(ctx, 'priesthoodAnswered', true);
          h.setFlag(ctx, 'bothOfficesHeld', true);
          h.chronicle(ctx, 'ruler', 'The king keeps both offices. Every autumn the empire is governed by nobody for ten days, and every autumn its neighbours notice.');
        }),
      },
    ],
  },

  // ── The terminal ────────────────────────────────────────────────────────

  {
    id: 'ev_x_what_the_empire_was_for',
    title: 'What the Empire Was For',
    desc: 'Someone in the record office has done the sum, because it is the kind of '
      + 'year in which people do sums. The state has been an empire for longer than '
      + 'it was a rebellion, and longer than it was a kingdom before it was an '
      + 'empire. The men who took Antioch are dead. The clerks who could not think '
      + 'what to call this are dead. There is a generation now in the Syrian '
      + 'provinces that has never been governed by anyone else and does not find it '
      + 'remarkable, and a generation in Jerusalem that has never seen the king '
      + 'except at festivals. The question the assembly at Jerusalem asked when it '
      + 'confirmed Simon — what is this state and who is it for — has been answered '
      + 'by two centuries of practice rather than by anybody deciding, which is how '
      + 'these questions are usually answered, and the answer is now on the record '
      + 'whether or not anyone likes it.',
    forTag: 'both',
    world: true,
    major: true,
    date: { y: 6, m: 1 },
    when: (ctx) => flag(ctx, 'seleucidSuccessor') && imperial(ctx) >= 2,
    aiOption: 0,
    historical: 'In the year this card falls, the historical Judaea was annexed as a Roman province and a census was taken for taxation. The state that took Antioch never existed to be asked what it was for.',
    options: [
      {
        label: 'Let the chronicle say what it was',
        tooltip: 'The record closes on an empire that began as a rising about an altar. What it became is read off the realm\'s own doctrine, and the chronicle says so in the terms the state earned.',
        effects: guard('ev_x_what_the_empire_was_for:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          const gentile = gentileShare(ctx);
          h.adjust(ctx, me, { legitimacy: 8, stability: 1 });
          h.chronicle(ctx, 'era', gentile >= 0.5
            ? 'Two hundred years after Modein, the state founded to keep Israel from being dissolved into the nations governs more of the nations than of Israel. Nobody chose this in a single year. It was chosen in forty.'
            : 'Two hundred years after Modein, the state founded to keep Israel from being dissolved into the nations still has a Jewish majority and an empire\'s frontier, and has spent the whole period arguing about whether it can have both.');
          h.setFlag(ctx, 'empireEndured', true);
        }),
      },
    ],
  },

];
