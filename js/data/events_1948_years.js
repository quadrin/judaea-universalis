// Judaea Universalis — the years the chain skips: 1949–1999 (SPEC §240).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// 1948 is the densest chapter in the game — a hundred and thirty-six dated
// cards — and the density is deceptive, because almost all of it is wars,
// treaties and the superpowers. What a campaign can run fifty years without
// ever being asked about is the state's own interior: the transit camps and
// the rationing, the law that defined who the state was for, the riot in
// Haifa that told it what it had become, the commission that took an army
// apart after a war it won, the month the currency stopped meaning anything,
// and the million people who arrived when the other empire fell.
//
// Two of the twelve are operations rather than institutions, and both are here
// for the same reason: Qibya and the reactor are the two occasions in this
// chapter's period when the state did something whose consequences it could
// not calculate in advance, and the chapter had neither.
//
// Sources: the Israeli state archives and the Knesset record for the Law of
// Return, the austerity regime and the 1985 plan; the Agranat Commission's
// published findings; the UN Security Council record for Qibya and for Osirak;
// the Jewish Agency and CBS absorption figures for the ma'abarot and for the
// post-Soviet aliyah; the Bank of Israel's own account of the stabilisation.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_1948_years] ' + key, e || '');
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

export const EVENTS_1948_YEARS = [

  // ── 1949 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48y_the_camps',
    title: 'The Camps',
    desc: 'The population doubles in three years. They come off the ships and the transport '
      + 'planes from Poland and Yemen and Iraq and Libya and the displaced-persons camps of '
      + 'Germany, and there is nowhere to put them, so they are put in tents, and then in tin '
      + 'huts, on hillsides outside the towns, with communal taps and latrines and mud in '
      + 'winter that comes over the tops of boots.\n\n'
      + 'The rationing is the other half. Everything is on points — meat, eggs, oil, shoes, '
      + 'cloth — and there is a black market within a month and a government inspectorate '
      + 'chasing it within two. It is a poor country doing something no rich country has ever '
      + 'attempted, and the argument in the cabinet is not whether to take the people. Nobody '
      + 'is arguing about that. It is whether to slow the ships down until there are houses, '
      + 'and everybody in the room knows what the answer has to be and nobody wants to be the '
      + 'one who says it out loud.',
    forTag: 'player',
    date: { y: 1949, m: 7 },
    aiOption: 0,
    historical: 'The ma\'abarot held over two hundred thousand people at their peak. Austerity rationing ran from 1949 to 1959 and was the most unpopular policy any Israeli government ever pursued.',
    options: [
      {
        label: 'The ships do not slow down. Build in the camps',
        tooltip: '−140 talents on huts, water, schools and clinics in the transit camps: +12 legitimacy and "The Doubling" (+9% growth, +7% manpower, +0.8 unrest everywhere) for fifteen years. Everybody comes and everybody is poor for a decade.',
        effects: guard('camps:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -140, legitimacy: 12 });
          mod(ctx, 'the_doubling', 'The Doubling', { growthMult: 1.09, manpowerMult: 1.07, unrestAll: 0.8 }, 180);
          h.setFlag(ctx, 'gatesKeptOpen', true);
          h.chronicle(ctx, 'era', 'The gates stay open and the camps are built out: water, '
            + 'schools, clinics, and tin huts that were supposed to last two winters. Some of '
            + 'them last twelve.');
        }),
      },
      {
        label: 'Selection: the young, the fit and the trained first',
        tooltip: '+60 talents kept and "The Ordered Absorption" (+8% growth, +5% income, −0.4 unrest everywhere) for fifteen years, with −15 legitimacy and a decision that gets read out in this country for fifty years.',
        effects: guard('camps:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 60, legitimacy: -15 });
          mod(ctx, 'ordered_absorption', 'The Ordered Absorption', { growthMult: 1.08, incomeMult: 1.05, unrestAll: -0.4 }, 180);
          h.chronicle(ctx, 'era', 'Selection criteria are applied at the ports of departure. '
            + 'The camps are manageable, the economy absorbs what arrives, and the policy is '
            + 'quoted against this government at every election for two generations.');
        }),
      },
      {
        label: 'Borrow against the future and build real houses now',
        tooltip: '−100 talents and a debt that runs for twenty years: "The Housing Blocks" (+10% growth, +6% income, −0.6 unrest everywhere) for twenty years, and "The Development Loan" (−6% income) for the same.',
        effects: guard('camps:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -100 });
          mod(ctx, 'the_housing_blocks', 'The Housing Blocks', { growthMult: 1.10, incomeMult: 1.06, unrestAll: -0.6 }, 240);
          ctx.helpers.addTagModifier(ctx, P(ctx), {
            id: 'the_development_loan', name: 'The Development Loan', months: 240, effects: { incomeMult: 0.94 },
          });
          h.setFlag(ctx, 'gatesKeptOpen', true);
          h.chronicle(ctx, 'era', 'The state borrows what it does not have and builds concrete '
            + 'instead of tin. The blocks are ugly, they are finished in four years, and the '
            + 'loan is still being serviced when the children born in them are conscripted.');
        }),
      },
    ],
  },

  // ── 1950 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48y_the_law_of_return',
    title: 'The Law of Return',
    desc: 'One sentence: every Jew has the right to come to this country as an immigrant. Not '
      + 'may apply, not may be admitted — has the right, which is a thing no state says about '
      + 'people who are not already its citizens, and which the minister introducing it '
      + 'describes as not conferring a right but recognising one that existed before the state '
      + 'did.\n\n'
      + 'The drafting problem arrives immediately and never goes away, because the sentence '
      + 'requires the state to say who is a Jew, and it is the one question this civilisation '
      + 'has spent two thousand years declining to settle in a single sentence. Halakhic '
      + 'descent, or self-declaration? What about a convert, and to which movement? What about '
      + 'a Jew by every religious criterion who has taken another faith? Every answer to this '
      + 'question is a decision about what kind of country this is, and the men in the chamber '
      + 'are trying to write it in an afternoon.',
    forTag: 'player',
    date: { y: 1950, m: 7 },
    aiOption: 1,
    historical: 'The Law of Return passed in July 1950. The definitional question it left open produced the Brother Daniel case, the 1970 amendment and every "who is a Jew" crisis since.',
    options: [
      {
        label: 'The widest possible definition, written now',
        tooltip: '+12 legitimacy and "The Open Gate" (+9% growth, +6% manpower) for thirty years, with +0.7 unrest everywhere for ten as the religious parties discover what has been passed.',
        effects: guard('return:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 12 });
          mod(ctx, 'the_open_gate', 'The Open Gate', { growthMult: 1.09, manpowerMult: 1.06, unrestAll: 0.7 }, 360);
          h.setFlag(ctx, 'wideReturn', true);
          h.chronicle(ctx, 'era', 'The law passes on the widest definition anybody proposed: a '
            + 'grandchild is enough, and a spouse comes too. Nobody who could have been taken '
            + 'by the other side of the century is excluded by this one.');
        }),
      },
      {
        label: 'Pass the sentence and leave the definition to the courts',
        tooltip: '+15 governance points and "The Question Deferred" (+8% growth, +4% income) for thirty years. It is the answer that keeps the coalition together, and the case law it produces runs for seventy years.',
        effects: guard('return:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15 });
          mod(ctx, 'the_question_deferred', 'The Question Deferred', { growthMult: 1.08, incomeMult: 1.04 }, 360);
          h.chronicle(ctx, 'era', 'The right is written down and the definition is not. Every '
            + 'hard case for the next seventy years arrives at a court instead of a chamber, '
            + 'which is what the drafters intended and not what they said.');
        }),
      },
      {
        label: 'The religious definition, and settle it in the statute',
        tooltip: '+10 legitimacy with the religious parties, +12 governance points, and "One Register" (+6% growth, −0.6 unrest everywhere) for thirty years — and a permanent quarrel with every Jewish community abroad whose conversions this does not recognise.',
        effects: guard('return:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10, gov: 12, infl: -8 });
          mod(ctx, 'one_register', 'One Register', { growthMult: 1.06, unrestAll: -0.6 }, 360);
          h.setFlag(ctx, 'halakhicReturn', true);
          h.chronicle(ctx, 'era', 'The statute adopts the religious definition and says so. The '
            + 'largest Jewish community in the world is told, in a clause, that its rabbis do '
            + 'not count.');
        }),
      },
    ],
  },

  // ── 1953 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48y_qibya',
    title: 'Qibya',
    desc: 'A woman and two children are killed by a grenade thrown into a house at Yehud, the '
      + 'tracks lead east, and the pattern is a year old by now: infiltration across an '
      + 'armistice line nobody can seal, casualties on both sides of it every month, and a '
      + 'Jordanian government that is either unwilling to stop it or unable and cannot afford '
      + 'to admit which.\n\n'
      + 'The retaliation doctrine says the answer is a raid heavy enough to make the other '
      + 'government prefer policing its own frontier. The unit goes into the village of Qibya '
      + 'and demolishes forty-five houses. Sixty-nine people are killed in them, and about two '
      + 'thirds are women and children, and the men who set the charges will say afterwards '
      + 'that they believed the houses were empty. The Security Council condemns it. The '
      + 'infiltration does drop. Both of those sentences are true and the argument about which '
      + 'of them is the important one has not ended since.',
    forTag: 'player',
    date: { y: 1953, m: 10 },
    aiOption: 1,
    historical: 'The Qibya raid of 14 October 1953 killed sixty-nine villagers and drew UN Security Council Resolution 101. Cross-border infiltration fell sharply afterwards.',
    options: [
      {
        label: 'Stand behind it',
        tooltip: '+8 martial points and "The Retaliation Doctrine" (+7% morale, +5% manpower) for fifteen years, with −14 influence points, −6 legitimacy and "Condemned" (−5% income) for six years.',
        effects: guard('qibya:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { mar: 8, infl: -14, legitimacy: -6 });
          mod(ctx, 'retaliation_doctrine', 'The Retaliation Doctrine', { moraleMult: 1.07, manpowerMult: 1.05 }, 180);
          ctx.helpers.addTagModifier(ctx, P(ctx), {
            id: 'condemned_1953', name: 'Condemned', months: 72, effects: { incomeMult: 0.95 },
          });
          h.setFlag(ctx, 'retaliationDoctrine', true);
          h.chronicle(ctx, 'war', 'The raid is stood behind in public. The frontier quietens '
            + 'and the resolution is passed against us, and both of those go into the file.');
        }),
      },
      {
        label: 'Investigate it, publish the finding, and change the standing orders',
        tooltip: '−30 talents on the enquiry: +10 legitimacy, +8 influence points, and "The Standing Orders" (−0.5 unrest everywhere, +4% income) for fifteen years, with −8 martial points as the operational units learn what they may no longer do.',
        effects: guard('qibya:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, legitimacy: 10, infl: 8, mar: -8 });
          mod(ctx, 'the_standing_orders', 'The Standing Orders', { unrestAll: -0.5, incomeMult: 1.04 }, 180);
          h.setFlag(ctx, 'qibyaInquiry', true);
          h.chronicle(ctx, 'war', 'An enquiry is held, the finding is published, and the '
            + 'standing orders for cross-border operations are rewritten around one rule about '
            + 'occupied houses.');
        }),
      },
      {
        label: 'Take the frontier problem to the other government instead',
        tooltip: '−45 talents on the channel and the compensation: +12 influence points and "The Quiet Channel" (−0.7 unrest everywhere, +5% income) for fifteen years. Infiltration falls more slowly and nothing is condemned.',
        effects: guard('qibya:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, infl: 12 });
          mod(ctx, 'the_quiet_channel', 'The Quiet Channel', { unrestAll: -0.7, incomeMult: 1.05 }, 180);
          h.chronicle(ctx, 'diplomacy', 'The frontier is taken up with the other government '
            + 'through a channel neither of them acknowledges. It works slowly, it works, and '
            + 'nobody can point at it.');
        }),
      },
    ],
  },

  // ── 1954 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48y_the_mishap',
    title: 'The Mishap',
    desc: 'A network of young Egyptian Jews has been recruited, trained and activated to plant '
      + 'incendiary devices in cinemas, libraries and the American reading room in Cairo and '
      + 'Alexandria, in the hope that the attacks will be blamed on the Muslim Brotherhood and '
      + 'will persuade London to keep its troops in the Canal Zone. The devices are crude, the '
      + 'security is worse, and the whole network is rolled up in a fortnight.\n\n'
      + 'What follows at home is not about Egypt at all. Two men in authority each say the '
      + 'other gave the order, neither can produce the document, and the affair eats the '
      + 'political life of the country for a decade: two commissions, a resignation, a return, '
      + 'a second resignation, a split in the governing party. The operation itself was a '
      + 'failure that lasted three weeks. The question of who signed for it outlasts two '
      + 'governments.',
    forTag: 'player',
    date: { y: 1954, m: 7 },
    aiOption: 2,
    historical: 'The Lavon Affair — the "unfortunate business" — poisoned Israeli politics from 1954 to 1965 and contributed directly to Ben-Gurion\'s final break with Mapai.',
    options: [
      {
        label: 'A judicial commission, with subpoena, in public',
        tooltip: '−35 talents: +12 governance points and "The Public Finding" (−0.6 unrest everywhere, +4% income) for twelve years, with −10 legitimacy in the year it reports and a chain of command nobody can argue about afterwards.',
        effects: guard('mishap:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, gov: 12, legitimacy: -10 });
          mod(ctx, 'the_public_finding', 'The Public Finding', { unrestAll: -0.6, incomeMult: 1.04 }, 144);
          h.setFlag(ctx, 'mishapPublic', true);
          h.chronicle(ctx, 'era', 'A judicial commission sits in public with the power to '
            + 'compel. It is humiliating for a year and it settles the question of who orders '
            + 'operations of this kind for thirty.');
        }),
      },
      {
        label: 'Two ministers and a closed committee',
        tooltip: '+8 governance points and "The Committee of Two" (+0.9 unrest everywhere) for fifteen years. The finding satisfies nobody, it is reopened three times, and it takes a governing party apart.',
        effects: guard('mishap:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 8 });
          mod(ctx, 'committee_of_two', 'The Committee of Two', { unrestAll: 0.9 }, 180);
          h.chronicle(ctx, 'era', 'The affair goes to a closed committee of two ministers. Its '
            + 'finding is disputed within a month, reopened three times in ten years, and '
            + 'splits the party that appointed it.');
        }),
      },
      {
        label: 'Get the prisoners out first and argue later',
        tooltip: '−80 talents into every channel that will carry a message: +12 legitimacy, +8 influence points, and "The Men in Cairo" (−0.5 unrest everywhere, +4% manpower) for twelve years. The political question is unresolved for a decade and some of them come home.',
        effects: guard('mishap:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -80, legitimacy: 12, infl: 8 });
          mod(ctx, 'the_men_in_cairo', 'The Men in Cairo', { unrestAll: -0.5, manpowerMult: 1.04 }, 144);
          h.chronicle(ctx, 'diplomacy', 'Everything goes into getting the prisoners out — '
            + 'intermediaries, third countries, an exchange nobody admits to. The question of '
            + 'who gave the order is left where it is for ten years.');
        }),
      },
    ],
  },

  // ── 1959 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48y_wadi_salib',
    title: 'Wadi Salib',
    desc: 'A policeman shoots a drunk man in a poor quarter of Haifa and the quarter goes into '
      + 'the street, and stays there for two days, and then it happens again in Beersheba and '
      + 'Migdal Ha\'emek. The quarter is North African — Moroccan mostly, people who came in '
      + 'the great immigration ten years ago and were housed in the emptied Arab quarter of a '
      + 'port city and left there.\n\n'
      + 'What they are shouting about is not the shooting. It is that the men who allocate the '
      + 'housing, the jobs, the school places and the army postings all come from one half of '
      + 'the population, and the other half — which is now, by 1959, close to half the country '
      + '— is at the bottom of every list. Nobody in the government has said anything untrue '
      + 'about equality. They simply built the institutions out of the people who were already '
      + 'here, and ten years later those institutions are a ceiling with a shape.',
    forTag: 'player',
    date: { y: 1959, m: 7 },
    aiOption: 1,
    historical: 'The Wadi Salib riots of July 1959 were the first mass Mizrahi protest in Israel. The commission of inquiry found discrimination in housing and employment; the political consequences took twenty years to arrive.',
    options: [
      {
        label: 'A commission, and act on what it finds',
        tooltip: '−90 talents on housing, schools and training in the development towns: +12 legitimacy, +1 stability, and "The Towns Built Up" (+8% growth, +6% income, −0.8 unrest everywhere) for twenty-five years.',
        effects: guard('salib:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -90, legitimacy: 12, stability: 1 });
          mod(ctx, 'towns_built_up', 'The Towns Built Up', { growthMult: 1.08, incomeMult: 1.06, unrestAll: -0.8 }, 300);
          h.setFlag(ctx, 'salibActedOn', true);
          h.chronicle(ctx, 'era', 'The commission reports and the money follows it into the '
            + 'development towns: housing, schools, training, and promotion lists that get '
            + 'audited. It is expensive and it changes the shape of the country.');
        }),
      },
      {
        label: 'Open the institutions: quotas in the service, the officer corps and the party lists',
        tooltip: '+15 governance points and "The Opened Lists" (+7% manpower, +5% income, −0.6 unrest everywhere) for twenty-five years, with +0.6 unrest everywhere for eight from everybody whose place on a list moved.',
        effects: guard('salib:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15 });
          mod(ctx, 'the_opened_lists', 'The Opened Lists', { manpowerMult: 1.07, incomeMult: 1.05, unrestAll: -0.6 }, 300);
          h.chronicle(ctx, 'era', 'Places are made in the civil service, the officer corps and '
            + 'the party lists, and the making of them is public. Everybody whose own place '
            + 'moved says so, at length.');
        }),
      },
      {
        label: 'Police it and wait for it to pass',
        tooltip: '+40 talents unspent and "Order Restored" (−0.5 unrest everywhere) for six years, then "The Bill Presented" (+1.0 unrest everywhere) for fifteen. It does pass. It comes back in 1977 and takes the government with it.',
        effects: guard('salib:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 40, legitimacy: -8 });
          mod(ctx, 'order_restored_59', 'Order Restored', { unrestAll: -0.5 }, 72);
          ctx.helpers.addTagModifier(ctx, P(ctx), {
            id: 'the_bill_presented', name: 'The Bill Presented', months: 180, effects: { unrestAll: 1.0 },
          });
          h.chronicle(ctx, 'era', 'The riots are policed and the quarter goes quiet. Nothing is '
            + 'built and nothing is opened, and the arithmetic of the thing is not repealed by '
            + 'being ignored.');
        }),
      },
    ],
  },

  // ── 1967 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48y_the_three_noes',
    title: 'The Three No\'s',
    desc: 'The Arab League meets at Khartoum three months after the war and produces a formula '
      + 'that will be quoted for fifty years: no peace with Israel, no recognition of Israel, '
      + 'no negotiations with it. It is also, read carefully, the least warlike document that '
      + 'conference could have produced — the same resolution ends the Yemen war, restores the '
      + 'oil flow and commits the wealthy states to subsidise the front-line ones, which is a '
      + 'programme for recovery rather than for a rematch.\n\n'
      + 'Both readings are correct and the choice between them is a policy. A government that '
      + 'reads it as a door closing will hold what it took and wait to be attacked again. A '
      + 'government that reads it as a bargaining position will start looking for the one '
      + 'capital in that room that can be moved — and either way, the territory taken in June '
      + 'is now the only currency anybody has, and every year it is held it becomes harder to '
      + 'spend.',
    forTag: 'player',
    date: { y: 1967, m: 9 },
    world: true,
    worldLabel: 'The Arab League at Khartoum: no peace, no recognition, no negotiation',
    aiOption: 1,
    historical: 'The Khartoum Resolution of September 1967 is remembered for its three no\'s and also ended the Yemen war and organised subsidies to Egypt and Jordan.',
    options: [
      {
        label: 'Hold everything and wait',
        tooltip: '+10 legitimacy, +8 martial points, and "The Lines Held" (+7% manpower, +5% morale) for fifteen years, with "The Cost of Holding" (−5% income, +0.7 unrest everywhere) for the same.',
        effects: guard('noes:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10, mar: 8 });
          mod(ctx, 'the_lines_held', 'The Lines Held', { manpowerMult: 1.07, moraleMult: 1.05 }, 180);
          ctx.helpers.addTagModifier(ctx, P(ctx), {
            id: 'cost_of_holding', name: 'The Cost of Holding', months: 180, effects: { incomeMult: 0.95, unrestAll: 0.7 },
          });
          h.chronicle(ctx, 'era', 'The lines are held and the offer is withdrawn. Everything '
            + 'taken in June is kept, garrisoned and administered, and the bill for that is '
            + 'presented every month.');
        }),
      },
      {
        label: 'Find the one capital that can be moved, and work on it for a decade',
        tooltip: '−60 talents into channels, intermediaries and quiet meetings: +14 influence points and "The Long Approach" (+7% income, −0.5 unrest everywhere) for twenty years. It takes ten years and one of them comes.',
        effects: guard('noes:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, infl: 14 });
          mod(ctx, 'the_long_approach', 'The Long Approach', { incomeMult: 1.07, unrestAll: -0.5 }, 240);
          h.setFlag(ctx, 'longApproach', true);
          h.chronicle(ctx, 'diplomacy', 'The work begins on the one capital in that room that '
            + 'can be moved: intermediaries, third countries, meetings nobody minutes. It '
            + 'takes ten years.');
        }),
      },
      {
        label: 'Publish our own terms and let the world read both documents',
        tooltip: '+12 influence points, +8 legitimacy, and "The Standing Offer" (+6% income, −0.4 unrest everywhere) for twenty years. Nobody accepts it and everybody has now read it.',
        effects: guard('noes:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 12, legitimacy: 8 });
          mod(ctx, 'the_standing_offer', 'The Standing Offer', { incomeMult: 1.06, unrestAll: -0.4 }, 240);
          h.chronicle(ctx, 'diplomacy', 'Terms are published: what would be given back, to '
            + 'whom, for what. Nobody accepts them and they sit beside the three no\'s in every '
            + 'foreign ministry in the world.');
        }),
      },
    ],
  },

  // ── 1969 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48y_the_war_of_attrition',
    title: 'The War of Attrition',
    desc: 'There is no offensive, no front moving and no name for it at first. There is a canal '
      + 'with an army on each bank and artillery firing across it every day for two and a half '
      + 'years, commando raids in both directions, aircraft over the delta, and a line of '
      + 'concrete strongpoints on the eastern bank whose garrisons are shelled by a Soviet-'
      + 'supplied artillery park they cannot answer.\n\n'
      + 'The logic on the other side is explicit and it is arithmetic: a country of two and a '
      + 'half million cannot trade casualties with a country of thirty million, so a war with '
      + 'no manoeuvre in it is a war the larger side wins by continuing. More die on this side '
      + 'in these two years than in the six days that made them necessary. It ends in a '
      + 'ceasefire that neither government calls a victory, with Soviet crews at the missile '
      + 'sites and both armies exactly where they started.',
    forTag: 'player',
    date: { y: 1969, m: 3 },
    aiOption: 0,
    historical: 'The War of Attrition (1967–1970) cost Israel more dead than the Six-Day War and ended in a ceasefire that left Soviet air-defence crews on the canal.',
    options: [
      {
        label: 'Hold the line and answer with the air force',
        tooltip: '−70 talents: +10 martial points and "Deep Penetration" (+8% morale, +6% discipline) for twelve years, with "The Attrition" (−6% manpower, +0.9 unrest everywhere) for eight. It brings the other superpower onto the canal.',
        effects: guard('attrition:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, mar: 10 });
          mod(ctx, 'deep_penetration', 'Deep Penetration', { moraleMult: 1.08, disciplineMult: 1.06 }, 144);
          ctx.helpers.addTagModifier(ctx, P(ctx), {
            id: 'the_attrition', name: 'The Attrition', months: 96, effects: { manpowerMult: 0.94, unrestAll: 0.9 },
          });
          h.chronicle(ctx, 'war', 'The strongpoints are held and the air force is sent deep. '
            + 'Within a year there are foreign crews on the missile sites and the aircraft '
            + 'stop going.');
        }),
      },
      {
        label: 'Pull back off the water and hold in depth',
        tooltip: '−45 talents to rebuild the line further back: +12 governance points and "Defence in Depth" (+7% manpower, +5% morale, −0.6 unrest everywhere) for fifteen years, with −8 legitimacy for giving up ground under fire.',
        effects: guard('attrition:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, gov: 12, legitimacy: -8 });
          mod(ctx, 'defence_in_depth', 'Defence in Depth', { manpowerMult: 1.07, moraleMult: 1.05, unrestAll: -0.6 }, 180);
          h.setFlag(ctx, 'defenceInDepth', true);
          h.chronicle(ctx, 'war', 'The garrisons come back off the waterline and the defence is '
            + 'rebuilt in depth, out of artillery range. It is unpopular for four years and '
            + 'saves the men who would have been in the strongpoints.');
        }),
      },
      {
        label: 'Take the ceasefire the Americans are offering, on their terms',
        tooltip: '+12 influence points and "The Ceasefire" (+7% income, −0.8 unrest everywhere, +4% manpower) for fifteen years, with −10 legitimacy: the missile line moves up to the canal during the standstill and nothing is done about it.',
        effects: guard('attrition:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 12, legitimacy: -10 });
          mod(ctx, 'the_ceasefire_70', 'The Ceasefire', { incomeMult: 1.07, unrestAll: -0.8, manpowerMult: 1.04 }, 180);
          h.chronicle(ctx, 'diplomacy', 'The ceasefire is taken on the terms offered. The '
            + 'shooting stops, the missile batteries come forward to the water during the '
            + 'standstill, and the protest about it is filed.');
        }),
      },
    ],
  },

  // ── 1974 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48y_the_commission',
    title: 'The Commission',
    desc: 'The commission of inquiry into the opening of the October war reports, and its remit '
      + 'was deliberately narrow: not whether the war should have been fought, but why the '
      + 'country was surprised. Its answer is about a doctrine rather than about people. There '
      + 'was a Concept — that Egypt would not attack without long-range aircraft, that Syria '
      + 'would not attack without Egypt — and it was held so firmly that intelligence which '
      + 'contradicted it was filed as noise by men who were not stupid and were not lazy and '
      + 'had simply stopped being able to see it.\n\n'
      + 'It names the Chief of Staff, the Director of Military Intelligence and the officer '
      + 'commanding in the south, and it declines to reach a finding on the political level, '
      + 'on the ground that ministers answer to the electorate and not to judges. The country '
      + 'reads that last part as an evasion, and the Prime Minister resigns within a month '
      + 'anyway, which is the answer to a question the commission refused to ask.',
    forTag: 'player',
    date: { y: 1974, m: 4 },
    aiOption: 0,
    historical: 'The Agranat Commission reported on 1 April 1974, faulted the military echelon and declined to judge the political one. Golda Meir resigned ten days later.',
    options: [
      {
        label: 'Take every finding and rebuild the assessment system around dissent',
        tooltip: '−55 talents: +18 governance points and "The Devil\'s Advocate" (+8% discipline, +6% morale, −0.5 unrest everywhere) for twenty-five years. A standing unit whose job is to write the assessment nobody wants.',
        effects: guard('commission:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, gov: 18 });
          mod(ctx, 'the_devils_advocate', 'The Devil\'s Advocate', { disciplineMult: 1.08, moraleMult: 1.06, unrestAll: -0.5 }, 300);
          h.setFlag(ctx, 'devilsAdvocate', true);
          h.chronicle(ctx, 'era', 'The findings are adopted entire and a standing unit is set '
            + 'up whose only job is to write the assessment the system does not want. It is '
            + 'resented and it is never disbanded.');
        }),
      },
      {
        label: 'Extend the remit to the political level and publish that too',
        tooltip: '+12 legitimacy, +10 governance points, and "Answerable" (−0.7 unrest everywhere, +4% income) for twenty years, with a government that falls this year instead of next.',
        effects: guard('commission:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 12, gov: 10, stability: -1 });
          mod(ctx, 'answerable', 'Answerable', { unrestAll: -0.7, incomeMult: 1.04 }, 240);
          h.chronicle(ctx, 'era', 'The remit is extended upward and the finding is published '
            + 'without redaction. The government does not survive it, and the precedent does.');
        }),
      },
      {
        label: 'Accept the findings, change the men, and leave the system alone',
        tooltip: '+8 legitimacy and "New Faces" (+5% morale, −0.3 unrest everywhere) for ten years. The Concept was not a person, and replacing three officers does not replace it.',
        effects: guard('commission:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 8 });
          mod(ctx, 'new_faces', 'New Faces', { moraleMult: 1.05, unrestAll: -0.3 }, 120);
          h.chronicle(ctx, 'era', 'The named officers go and the system that produced them '
            + 'stays. The next assessment is written by different men in the same building '
            + 'under the same rules.');
        }),
      },
    ],
  },

  // ── 1981 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48y_the_reactor',
    title: 'The Reactor',
    desc: 'The French-built reactor outside Baghdad is weeks from being fuelled, and once it is '
      + 'hot, striking it would spread the contents of the core over a city of three million. '
      + 'The window is now or never, and the debate in the cabinet is not about whether the '
      + 'programme is a weapons programme — everybody in the room has read the same file — but '
      + 'about what a strike buys.\n\n'
      + 'Eight aircraft go, at the extreme edge of their range, over two other countries\' '
      + 'airspace, in the middle of the afternoon. The building is destroyed in under two '
      + 'minutes and everybody comes home. The Security Council condemns it unanimously, the '
      + 'Americans suspend an aircraft delivery, and a doctrine is created that will be cited '
      + 'by other governments for the next forty years, including by governments that voted '
      + 'for the condemnation.',
    forTag: 'player',
    date: { y: 1981, m: 6 },
    aiOption: 0,
    historical: 'Operation Opera destroyed the Osirak reactor on 7 June 1981. Security Council Resolution 487 condemned it unanimously; the United States voted in favour and suspended an F-16 delivery.',
    options: [
      {
        label: 'Go',
        tooltip: '+12 martial points, +10 legitimacy, and "The Doctrine" (+7% morale, +5% discipline) for twenty-five years, with −15 influence points and "The Suspended Deliveries" (−6% income) for four years.',
        effects: guard('reactor:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { mar: 12, legitimacy: 10, infl: -15 });
          mod(ctx, 'the_doctrine', 'The Doctrine', { moraleMult: 1.07, disciplineMult: 1.05 }, 300);
          ctx.helpers.addTagModifier(ctx, P(ctx), {
            id: 'suspended_deliveries', name: 'The Suspended Deliveries', months: 48, effects: { incomeMult: 0.94 },
          });
          h.setFlag(ctx, 'reactorStruck', true);
          h.chronicle(ctx, 'war', 'Eight aircraft go at the edge of their range and the '
            + 'building is gone in under two minutes. The vote against is unanimous and the '
            + 'doctrine is quoted for forty years.');
        }),
      },
      {
        label: 'Take it to the suppliers and the inspectors instead',
        tooltip: '−60 talents on the diplomatic and covert campaign: +14 influence points and "The Supply Line Closed" (+6% income, −0.4 unrest everywhere) for twenty years. Slower, deniable, reversible, and it depends on other governments continuing to care.',
        effects: guard('reactor:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, infl: 14 });
          mod(ctx, 'supply_line_closed', 'The Supply Line Closed', { incomeMult: 1.06, unrestAll: -0.4 }, 240);
          h.chronicle(ctx, 'diplomacy', 'The campaign is run against the suppliers, the '
            + 'engineers and the shipping instead of against the building. It is slower, it is '
            + 'deniable, and it works for exactly as long as other governments keep caring.');
        }),
      },
      {
        label: 'Do nothing, and build the answer at home',
        tooltip: '−80 talents into deterrent and defence: +10 governance points and "The Answer at Home" (+8% morale, +5% manpower, −0.3 unrest everywhere) for twenty-five years, and a neighbour that has a reactor.',
        effects: guard('reactor:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -80, gov: 10 });
          mod(ctx, 'the_answer_at_home', 'The Answer at Home', { moraleMult: 1.08, manpowerMult: 1.05, unrestAll: -0.3 }, 300);
          h.chronicle(ctx, 'era', 'No strike is made. The money goes into what is built at home '
            + 'instead, and the reactor is fuelled on schedule.');
        }),
      },
    ],
  },

  // ── 1985 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48y_the_stabilisation',
    title: 'The Month the Numbers Stopped Meaning Anything',
    desc: 'Inflation is running at something between three and four hundred per cent a year. '
      + 'Prices are quoted in dollars because nobody can quote them in shekels for a week at a '
      + 'time; wages are indexed, which makes it worse; the banks have been propping up their '
      + 'own share prices until the government had to nationalise them; and the reserves are '
      + 'measured in weeks.\n\n'
      + 'The plan on the table is brutal and it is all-at-once, because the one thing every '
      + 'economist in the room agrees on is that a gradual version does not work: freeze the '
      + 'currency, freeze prices, freeze wages, cut the budget by a fifth in a single year, '
      + 'stop the central bank printing for the treasury by statute, and get the unions and '
      + 'the employers to sign for all of it in the same week. It will cause a recession, it '
      + 'will break somebody\'s government, and there is no version of the next five years in '
      + 'which nothing is done.',
    forTag: 'player',
    date: { y: 1985, m: 7 },
    aiOption: 0,
    historical: 'The Economic Stabilization Plan of July 1985 cut inflation from over 400% to under 20% within a year and ended the treasury\'s ability to print money by law.',
    options: [
      {
        label: 'All of it, in one week, with the unions signed on',
        tooltip: '−90 talents in the first year and a hard recession: "The Stabilisation" (+14% income, +6% growth, −6% cost of governing) for thirty years, with +1.1 unrest everywhere for four while it bites.',
        effects: guard('stab:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -90, gov: 15 });
          mod(ctx, 'the_stabilisation', 'The Stabilisation', { incomeMult: 1.14, growthMult: 1.06, adminMult: 0.94 }, 360);
          ctx.helpers.addTagModifier(ctx, P(ctx), {
            id: 'the_bitter_year', name: 'The Bitter Year', months: 48, effects: { unrestAll: 1.1 },
          });
          h.setFlag(ctx, 'stabilisationPlan', true);
          h.chronicle(ctx, 'era', 'The whole plan goes through in one week: the currency, the '
            + 'prices, the wages, a fifth off the budget, and a statute forbidding the bank to '
            + 'print for the treasury. Inflation is in double figures within a year.');
        }),
      },
      {
        label: 'Do it gradually, and protect wages while it runs',
        tooltip: '−50 talents: "The Gradual Programme" (+6% income, −0.5 unrest everywhere) for twenty years. It takes six years instead of one, it costs less politically, and the country spends those six years poorer than it needed to be.',
        effects: guard('stab:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, gov: 8 });
          mod(ctx, 'the_gradual_programme', 'The Gradual Programme', { incomeMult: 1.06, unrestAll: -0.5 }, 240);
          h.chronicle(ctx, 'era', 'The programme is phased over six years with the wage '
            + 'indexation left in place. Nobody\'s government falls and the recovery arrives '
            + 'five years late.');
        }),
      },
      {
        label: 'Devalue, borrow abroad and put it off',
        tooltip: '+120 talents now and "The Foreign Loans" (+8% income) for eight years, then "The Reckoning Deferred" (−9% income, +1.0 unrest everywhere) for fifteen. The arithmetic does not stop being true while it is being avoided.',
        effects: guard('stab:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 120 });
          mod(ctx, 'the_foreign_loans', 'The Foreign Loans', { incomeMult: 1.08 }, 96);
          ctx.helpers.addTagModifier(ctx, P(ctx), {
            id: 'reckoning_deferred', name: 'The Reckoning Deferred', months: 180, effects: { incomeMult: 0.91, unrestAll: 1.0 },
          });
          h.chronicle(ctx, 'era', 'The currency is devalued again, the loans are raised abroad, '
            + 'and the decision is left to whoever is in the chair in five years.');
        }),
      },
    ],
  },

  // ── 1990 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48y_the_million',
    title: 'The Million',
    desc: 'The other empire has stopped preventing people from leaving, and what comes through '
      + 'the door over the next decade is close to a million people — roughly a fifth of this '
      + 'country\'s existing population, arriving in five years, into a housing market with no '
      + 'slack and an economy that has just finished a recession.\n\n'
      + 'They are also the most educated immigration any country has ever received. There are '
      + 'more engineers on the first year\'s flights than the entire domestic engineering '
      + 'profession, plus physicists, physicians at three times the local ratio per head, and '
      + 'an entire conservatory\'s worth of musicians. In the short run it means doctors '
      + 'sweeping streets and a caravan site outside every town. In the long run it is the '
      + 'single largest input this economy will ever receive, and the question in front of the '
      + 'cabinet is whether to spend the decade housing them or the decade employing them, '
      + 'because there is not enough money to do both properly at once.',
    forTag: 'player',
    date: { y: 1990, m: 12 },
    aiOption: 1,
    historical: 'Roughly 950,000 immigrants arrived from the former Soviet Union between 1989 and 2001. Israel absorbed them without transit camps, at the cost of a decade of housing shortage.',
    options: [
      {
        label: 'Housing first: build, and build fast',
        tooltip: '−130 talents in caravan sites, mortgages and construction: +10 legitimacy and "The Building Decade" (+10% growth, +6% income, −0.5 unrest everywhere) for twenty years.',
        effects: guard('million:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -130, legitimacy: 10 });
          mod(ctx, 'the_building_decade', 'The Building Decade', { growthMult: 1.10, incomeMult: 1.06, unrestAll: -0.5 }, 240);
          h.setFlag(ctx, 'buildingDecade', true);
          h.chronicle(ctx, 'era', 'The decade goes into housing: caravan sites first, mortgages '
            + 'second, and whole new neighbourhoods on the edge of every town. Nobody lives in '
            + 'a tent and the professions take ten years to sort themselves out.');
        }),
      },
      {
        label: 'Employment first: licensing, retraining and research institutes',
        tooltip: '−110 talents into recognition of foreign qualifications, retraining and new laboratories: "The Absorbed Professions" (+13% income, +7% growth) for twenty-five years, with +0.8 unrest everywhere for eight while the housing waits.',
        effects: guard('million:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -110 });
          mod(ctx, 'absorbed_professions', 'The Absorbed Professions', { incomeMult: 1.13, growthMult: 1.07, unrestAll: 0.8 }, 300);
          h.setFlag(ctx, 'absorbedProfessions', true);
          h.chronicle(ctx, 'era', 'The money goes into licensing, retraining and laboratories. '
            + 'The housing lags by five years and the country acquires, in one decade, the '
            + 'research base of a much larger one.');
        }),
      },
      {
        label: 'Direct absorption: give them the money and let them arrange it',
        tooltip: '−95 talents paid straight to the families: +12 legitimacy, +15 governance points, and "Direct Absorption" (+9% growth, +8% income, −0.4 unrest everywhere) for twenty-five years. No camps, no agency, and everybody sorts out their own life.',
        effects: guard('million:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -95, legitimacy: 12, gov: 15 });
          mod(ctx, 'direct_absorption', 'Direct Absorption', { growthMult: 1.09, incomeMult: 1.08, unrestAll: -0.4 }, 300);
          h.setFlag(ctx, 'directAbsorption', true);
          h.chronicle(ctx, 'era', 'The absorption budget is paid to the families directly and '
            + 'the agency is taken out of the middle. There are no camps this time, which is '
            + 'the lesson of 1950 applied by the people who grew up in them.');
        }),
      },
    ],
  },

  // ── 1999 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48y_the_start_ups',
    title: 'The Decade of the Start-Ups',
    desc: 'Something has happened to the economy and nobody planned it. A state-backed venture '
      + 'fund put up money on condition that private partners matched it and then sold the '
      + 'state\'s share back to them cheaply if the fund worked, which is a strange instrument '
      + 'and produced ten funds where there had been none. The army\'s signals and intelligence '
      + 'units have been turning out, every year, several hundred twenty-two-year-olds who '
      + 'have run real systems under real pressure. The million from the east arrived with more '
      + 'engineers than the country had.\n\n'
      + 'Add a decade and the country is exporting encryption, medical devices, chip designs '
      + 'and network hardware, and the export figures no longer look like a Mediterranean '
      + 'agricultural economy with a large army. They look like a small northern European one. '
      + 'The parts of the country this has not reached — the development towns, the periphery, '
      + 'the Arab municipalities — are further behind than they were in 1985, in absolute '
      + 'terms, and the gap is now the largest single fact about the society.',
    forTag: 'player',
    date: { y: 1999, m: 5 },
    aiOption: 0,
    historical: 'The Yozma programme of 1993 seeded Israel\'s venture-capital industry; by 2000 high technology was close to half of industrial exports, and inequality was among the highest in the developed world.',
    options: [
      {
        label: 'Push it further and spread it to the periphery',
        tooltip: '−80 talents into technical colleges, industrial parks and broadband outside the centre: +15 governance points and "The Spread Economy" (+13% income, +8% growth, −0.6 unrest everywhere) for twenty-five years.',
        effects: guard('startups:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -80, gov: 15 });
          mod(ctx, 'the_spread_economy', 'The Spread Economy', { incomeMult: 1.13, growthMult: 1.08, unrestAll: -0.6 }, 300);
          h.setFlag(ctx, 'spreadEconomy', true);
          h.chronicle(ctx, 'era', 'Technical colleges, industrial parks and fibre go into the '
            + 'towns the boom did not reach. It costs a decade of budgets and the map of the '
            + 'economy stops being two countries.');
        }),
      },
      {
        label: 'Let the sector run and tax it lightly',
        tooltip: '+110 talents and "The Boom" (+16% income, +6% trade) for twenty years, with "The Two Economies" (+1.0 unrest everywhere) for the same. The country is rich and it is two countries.',
        effects: guard('startups:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 110 });
          mod(ctx, 'the_boom', 'The Boom', { incomeMult: 1.16, tradeMult: 1.06 }, 240);
          ctx.helpers.addTagModifier(ctx, P(ctx), {
            id: 'the_two_economies', name: 'The Two Economies', months: 240, effects: { unrestAll: 1.0 },
          });
          h.chronicle(ctx, 'era', 'The sector is left alone and taxed lightly. The export '
            + 'figures are the best in the country\'s history and so is the gap between its '
            + 'two halves.');
        }),
      },
      {
        label: 'Make it a national programme: research, procurement and the schools',
        tooltip: '−100 talents into universities, procurement and a mathematics curriculum: +18 governance points and "The Research Base" (+11% income, +9% growth, +5% discipline) for thirty years.',
        effects: guard('startups:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -100, gov: 18 });
          mod(ctx, 'the_research_base', 'The Research Base', { incomeMult: 1.11, growthMult: 1.09, disciplineMult: 1.05 }, 360);
          h.setFlag(ctx, 'researchBase', true);
          h.chronicle(ctx, 'era', 'It is made a national programme: the universities, the '
            + 'procurement budget and the school mathematics curriculum, all aimed at the same '
            + 'thing. The results arrive in the decade after the one that paid for them.');
        }),
      },
    ],
  },
];
