// Judaea Universalis — the other side of the line: 1951–1997 (SPEC §241).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The 1948 chapter has the wars, the treaties and the superpowers, and §240
// gave it the state's own interior. What neither has is the line itself — not
// as a front, which it is for a few months every decade, but as the thing it
// is for the other fifty years: a boundary drawn across villages, fields,
// water and families by officers with a grease pencil in 1949, and then lived
// on.
//
// So this file is the seam: the divided villages and the armistice
// commissions, the desert and its people, the headwaters that three countries
// farm from, the bridges that stayed open, the Golan villages the line ran
// through, the fence people crossed for a doctor, the town that was taken down
// by agreement, the zone, the first table everybody sat at, and the permit.
// Ten cards, each of them a real decision that was actually taken, and each of
// them about people who live on both sides of something.
//
// Sources: the Mixed Armistice Commission records and UNTSO reports; the
// Johnston mission papers for the water; Dayan's own account of the open
// bridges; the disengagement agreements of 1974 for the Golan villages; the
// Israeli state comptroller and press record for Yamit and for the closure
// regime; the Madrid conference proceedings.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_1948_neighbours] ' + key, e || '');
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

export const EVENTS_1948_NEIGHBOURS = [

  // ── 1951 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48n_the_seam',
    title: 'The Seam',
    desc: 'The line was drawn on a map at Rhodes with a grease pencil whose mark, at that '
      + 'scale, was sixty metres wide, and the ground underneath it did not read the map. It '
      + 'runs between a village and its olive terraces, through the middle of another village '
      + 'so that cousins are in two countries, across the railway in four places and along the '
      + 'edge of a road that is now useless to both sides because it is enfiladed from both.\n\n'
      + 'The Mixed Armistice Commissions meet to deal with it: a farmer crossing to his own '
      + 'trees, a flock that wandered, a well on the wrong side, and every one of those '
      + 'incidents capable of becoming a shooting. Most of them are settled by two junior '
      + 'officers and an UNTSO observer in a tent. The ones that are not are how the next war '
      + 'starts.',
    forTag: 'player',
    date: { y: 1951, m: 6 },
    aiOption: 1,
    historical: 'The 1949 armistice lines cut villages, fields and water sources; the Mixed Armistice Commissions handled thousands of local incidents through the 1950s.',
    options: [
      {
        label: 'Work the commissions seriously and settle every incident small',
        tooltip: '−35 talents on the staff: +14 governance points and "The Commissions Work" (−0.8 unrest everywhere, +5% income) for twenty years. Every incident settled by two captains in a tent is one that does not reach a cabinet.',
        effects: guard('seam:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, gov: 14 });
          mod(ctx, 'the_commissions_work', 'The Commissions Work', { unrestAll: -0.8, incomeMult: 1.05 }, 240);
          h.setFlag(ctx, 'commissionsWork', true);
          h.chronicle(ctx, 'diplomacy', 'The armistice commissions are staffed properly and '
            + 'every incident is settled at the lowest level that can settle it. A great many '
            + 'things do not happen as a result and none of them is recorded.');
        }),
      },
      {
        label: 'Local arrangements: let the farmers cross for the harvest',
        tooltip: '−25 talents on the wardens: +10 legitimacy and "The Harvest Crossings" (−0.7 unrest everywhere, +6% income, +4% growth) for fifteen years. Unofficial, deniable, and it keeps two sets of villages fed.',
        effects: guard('seam:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -25, legitimacy: 10 });
          mod(ctx, 'the_harvest_crossings', 'The Harvest Crossings', { unrestAll: -0.7, incomeMult: 1.06, growthMult: 1.04 }, 180);
          h.chronicle(ctx, 'era', 'Local arrangements are made along the seam for the harvest '
            + 'crossings. Nothing is signed, wardens are posted on both sides, and the olives '
            + 'are picked.');
        }),
      },
      {
        label: 'Seal it: fences, patrols, and a free-fire understanding',
        tooltip: '−60 talents: +10 martial points and "The Sealed Line" (+5% manpower, −0.4 unrest everywhere) for fifteen years, with −6% income along the whole seam and a steady count of incidents that are no longer settled in a tent.',
        effects: guard('seam:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, mar: 10 });
          mod(ctx, 'the_sealed_line', 'The Sealed Line', { manpowerMult: 1.05, unrestAll: -0.4, incomeMult: 0.94 }, 180);
          h.chronicle(ctx, 'war', 'The seam is fenced, patrolled and closed. Infiltration falls '
            + 'and so does everything else that used to cross it, including the arrangements '
            + 'that had been keeping the incidents small.');
        }),
      },
    ],
  },

  // ── 1955 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48n_the_southern_desert',
    title: 'The Southern Desert',
    desc: 'More than half the state\'s territory is desert and the people who know how to live '
      + 'in it are the Bedouin tribes, who are citizens, who are under military government '
      + 'like the country\'s other Arab citizens, and who have been concentrated into a '
      + 'restricted area in the north-east of the Negev while the rest of it is surveyed for '
      + 'settlement, water and army training grounds.\n\n'
      + 'They have grazing claims that are older than any registry and are written down in no '
      + 'registry; they have men serving in the army as trackers, who are among the best in '
      + 'it; and they have relations on the other side of a border that runs through their own '
      + 'grazing circuit. Every argument about the desert for the next seventy years is '
      + 'already present in this file, and almost none of it has been decided yet.',
    forTag: 'player',
    date: { y: 1955, m: 4 },
    aiOption: 1,
    historical: 'Negev Bedouin citizens were concentrated in the Siyag under military government until 1966; land claims based on customary tenure went unregistered and are still litigated.',
    options: [
      {
        label: 'Register the customary claims and settle them by agreement',
        tooltip: '−80 talents on the survey and the settlements: +14 legitimacy, +1 stability, and "The Desert Registered" (+7% income, +5% growth, −0.9 unrest everywhere) for thirty years. Expensive, slow, and it removes the largest standing grievance in the country.',
        effects: guard('negev:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -80, legitimacy: 14, stability: 1 });
          mod(ctx, 'the_desert_registered', 'The Desert Registered', { incomeMult: 1.07, growthMult: 1.05, unrestAll: -0.9 }, 360);
          h.setFlag(ctx, 'desertRegistered', true);
          h.chronicle(ctx, 'era', 'Customary grazing and cultivation claims are surveyed, '
            + 'registered and settled by agreement. It takes eleven years and it ends an '
            + 'argument that would otherwise still be in the courts in the next century.');
        }),
      },
      {
        label: 'Build the towns first and settle the claims afterwards',
        tooltip: '−55 talents: +10 governance points and "The Planned Towns" (+8% growth, +6% income) for twenty-five years, with +0.8 unrest everywhere for twelve — housing, schools and clinics, offered to people who were not asked where they wanted them.',
        effects: guard('negev:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, gov: 10 });
          mod(ctx, 'the_planned_towns', 'The Planned Towns', { growthMult: 1.08, incomeMult: 1.06, unrestAll: 0.8 }, 300);
          h.chronicle(ctx, 'era', 'Planned towns with schools, clinics and running water are '
            + 'built for the desert population. Everything in them is better than what it '
            + 'replaced and nobody who moved into them chose where they were put.');
        }),
      },
      {
        label: 'Recruit: trackers, scouts and a desert battalion',
        tooltip: '−35 talents: +12 martial points and "The Desert Companies" (+6% manpower, +7% morale, +1 defence in hill country) for twenty-five years, with the land question left exactly where it is.',
        effects: guard('negev:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, mar: 12 });
          mod(ctx, 'the_desert_companies', 'The Desert Companies', { manpowerMult: 1.06, moraleMult: 1.07, hillDefBonus: 1 }, 300);
          h.chronicle(ctx, 'war', 'Trackers and scouts are recruited from the desert tribes into '
            + 'their own companies. They are the best in the army at what they do, and the land '
            + 'question is not mentioned in any of the enlistment papers.');
        }),
      },
    ],
  },

  // ── 1962 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48n_the_headwaters',
    title: 'The Headwaters',
    desc: 'The river this country farms from rises in three springs, and two of them are in '
      + 'other countries. An American envoy spent two years negotiating an allocation that '
      + 'every technical delegation accepted and no government would sign, because signing a '
      + 'water treaty is recognition and nobody is ready for recognition. So there is an '
      + 'agreed engineering plan that everybody is quietly implementing and nobody has '
      + 'endorsed.\n\n'
      + 'The pipeline going in now takes water from the lake to the dry south. The answer '
      + 'being discussed on the other side is to divert the headwaters before they arrive. '
      + 'Both projects are legal on their own territory, both make the other one worthless, '
      + 'and everybody\'s engineers understand perfectly that the next war in this region will '
      + 'have started at a pumping station.',
    forTag: 'player',
    date: { y: 1962, m: 9 },
    aiOption: 1,
    historical: 'The Johnston allocation of 1955 was accepted technically and never signed politically; both sides broadly adhered to it while pursuing the National Water Carrier and the headwater diversion, and the resulting clashes ran directly into 1967.',
    options: [
      {
        label: 'Hold to the allocation, publicly, and invite inspection',
        tooltip: '−40 talents on the metering and the monitors: +14 influence points and "Within the Allocation" (+7% income, −0.6 unrest everywhere) for twenty-five years. Nobody signs anything and every gauge is readable by anybody, which turns out to be worth more than a treaty.',
        effects: guard('water:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, infl: 14 });
          mod(ctx, 'within_the_allocation', 'Within the Allocation', { incomeMult: 1.07, unrestAll: -0.6 }, 300);
          h.setFlag(ctx, 'withinAllocation', true);
          h.chronicle(ctx, 'diplomacy', 'The state declares publicly that it will take no more '
            + 'than the technical allocation and puts readable meters on every intake. Nobody '
            + 'signs anything and the argument loses most of its fuel.');
        }),
      },
      {
        label: 'Take what the pipeline can carry and defend the intakes',
        tooltip: '+70 talents\' worth of irrigated land and +8 martial points, with "The Carrier at Capacity" (+9% income, +7% growth) for twenty-five years and +1.0 unrest everywhere for eight. The diversion works on the other side become targets, and everybody knows it.',
        effects: guard('water:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 70, mar: 8 });
          mod(ctx, 'the_carrier_at_capacity', 'The Carrier at Capacity', { incomeMult: 1.09, growthMult: 1.07, unrestAll: 1.0 }, 300);
          h.chronicle(ctx, 'war', 'The carrier runs at capacity and the intakes are garrisoned. '
            + 'The diversion works upstream are surveyed by somebody with a range card.');
        }),
      },
      {
        label: 'Desalinate, and stop depending on a river with foreign springs',
        tooltip: '−110 talents into plants that will not pay back for twenty years: "The Water That Is Ours" (+8% income, +7% growth, −0.5 unrest everywhere) for thirty-five years. Enormously expensive, decades early, and it takes the water question off the table permanently.',
        effects: guard('water:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -110 });
          mod(ctx, 'the_water_that_is_ours', 'The Water That Is Ours', { incomeMult: 1.08, growthMult: 1.07, unrestAll: -0.5 }, 420);
          h.setFlag(ctx, 'desalinationEarly', true);
          h.chronicle(ctx, 'era', 'The state begins building desalination twenty years before '
            + 'the economics work. It is the most expensive decision of the decade and the '
            + 'water question stops being a casus belli.');
        }),
      },
    ],
  },

  // ── 1968 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48n_the_open_bridges',
    title: 'The Open Bridges',
    desc: 'The bridges over the river are wrecked and there is a decision to make about whether '
      + 'to rebuild them. The military argument for keeping them shut is obvious. The argument '
      + 'for opening them is that the farmers on this side sell into markets on that side, that '
      + 'families are divided by a river neither of them moved, and that a population which can '
      + 'travel, trade and visit is a population with something to lose.\n\n'
      + 'The policy that gets adopted is deliberately informal: the bridges open, produce goes '
      + 'east, students and families cross both ways, and the two governments — which are '
      + 'formally at war and have no relations — quietly co-operate to run it. It is entirely '
      + 'unofficial, it is inspected at both ends, and it will carry hundreds of thousands of '
      + 'people a year for decades under an arrangement neither state will describe in public.',
    forTag: 'player',
    date: { y: 1968, m: 5 },
    aiOption: 0,
    historical: 'The open-bridges policy ran from 1967 for decades, carrying trade and family movement across the Jordan between states formally at war and with no diplomatic relations.',
    options: [
      {
        label: 'Open them, and let the trade and the families move',
        tooltip: '−35 talents on the crossings and the inspections: +12 legitimacy and "The Open Bridges" (+9% income, +6% trade, −0.8 unrest everywhere) for thirty years. A working relationship with a government that cannot admit to having one.',
        effects: guard('bridge:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, legitimacy: 12 });
          mod(ctx, 'the_open_bridges', 'The Open Bridges', { incomeMult: 1.09, tradeMult: 1.06, unrestAll: -0.8 }, 360);
          h.setFlag(ctx, 'openBridges', true);
          h.chronicle(ctx, 'diplomacy', 'The bridges open for produce, students and families, '
            + 'inspected at both ends by two governments that are formally at war. Neither of '
            + 'them describes the arrangement in public for twenty-five years.');
        }),
      },
      {
        label: 'Open them for trade only, and not for people',
        tooltip: '−25 talents: +8 governance points and "The Freight Crossing" (+7% income, +5% trade, −0.4 unrest everywhere) for twenty-five years. The produce moves, the families do not, and the arrangement is easier to defend in a cabinet.',
        effects: guard('bridge:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -25, gov: 8 });
          mod(ctx, 'the_freight_crossing', 'The Freight Crossing', { incomeMult: 1.07, tradeMult: 1.05, unrestAll: -0.4 }, 300);
          h.chronicle(ctx, 'era', 'The crossings open for freight and stay shut to people. The '
            + 'produce is sold, the families write letters, and the policy is easy to explain '
            + 'in every direction.');
        }),
      },
      {
        label: 'Keep the river closed',
        tooltip: '+8 martial points and "The Closed River" (−0.3 unrest everywhere, +4% manpower) for twenty years, with −8% income on both sides of it. The security argument is real and it is the whole of the argument.',
        effects: guard('bridge:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { mar: 8 });
          mod(ctx, 'the_closed_river', 'The Closed River', { unrestAll: -0.3, manpowerMult: 1.04, incomeMult: 0.92 }, 240);
          h.chronicle(ctx, 'war', 'The river stays closed. The security case for it is sound, '
            + 'and the produce rots on this side while the markets are four hours away on '
            + 'that one.');
        }),
      },
    ],
  },

  // ── 1974 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48n_the_line_on_the_plateau',
    title: 'The Line on the Plateau',
    desc: 'The disengagement agreement on the northern plateau draws a line, a buffer and two '
      + 'limited-forces zones, with UN observers in the middle — and the line runs through a '
      + 'community. The Druze villages of the plateau are divided by it: relations on both '
      + 'sides, land held on both sides, and a population that has kept its own counsel under '
      + 'four governments and is now under two at once.\n\n'
      + 'What emerges over the following years is a set of arrangements nobody legislates. '
      + 'Students cross to study on the other side and come back. Weddings are conducted '
      + 'across the fence. Apples are trucked over under UN supervision, from farmers on one '
      + 'side to buyers on the other, between two states with no relations at all. It is a '
      + 'small and extremely durable demonstration that a border is a place people live rather '
      + 'than a line on a staff map.',
    forTag: 'player',
    date: { y: 1974, m: 8 },
    aiOption: 0,
    historical: 'The 1974 disengagement line divided the Druze communities of the Golan; family, student and agricultural crossings under UN supervision continued for decades between states with no relations.',
    options: [
      {
        label: 'Let the crossings run and protect them',
        tooltip: '−30 talents on the arrangements: +12 legitimacy and "The Crossings on the Plateau" (−0.8 unrest everywhere, +5% income) for twenty-five years. Students, brides and fruit, across a line two states will not otherwise acknowledge.',
        effects: guard('plateau:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, legitimacy: 12 });
          mod(ctx, 'crossings_on_the_plateau', 'The Crossings on the Plateau', { unrestAll: -0.8, incomeMult: 1.05 }, 300);
          h.setFlag(ctx, 'plateauCrossings', true);
          h.chronicle(ctx, 'diplomacy', 'The family, student and agricultural crossings on the '
            + 'plateau are protected and run under UN supervision. Two states with no relations '
            + 'co-operate on it every season for decades.');
        }),
      },
      {
        label: 'Invest in the villages: land, water, schools and no questions',
        tooltip: '−55 talents: +10 legitimacy and "The Plateau Villages" (+7% income, +6% growth, −0.6 unrest everywhere) for twenty-five years. Whatever anybody\'s citizenship says, the water and the schools are here.',
        effects: guard('plateau:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, legitimacy: 10 });
          mod(ctx, 'the_plateau_villages', 'The Plateau Villages', { incomeMult: 1.07, growthMult: 1.06, unrestAll: -0.6 }, 300);
          h.chronicle(ctx, 'era', 'Water, land improvement and schools go into the plateau '
            + 'villages without any question being asked about anybody\'s papers.');
        }),
      },
      {
        label: 'Treat the line as a line',
        tooltip: '+8 martial points and "The Line Is the Line" (−0.3 unrest everywhere, +4% manpower) for twenty years, with −5% income and −6 legitimacy. Everything is consistent, defensible and legible on a staff map.',
        effects: guard('plateau:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { mar: 8, legitimacy: -6 });
          mod(ctx, 'the_line_is_the_line', 'The Line Is the Line', { unrestAll: -0.3, manpowerMult: 1.04, incomeMult: 0.95 }, 240);
          h.chronicle(ctx, 'war', 'The line is treated as a line and the crossings are stopped. '
            + 'It is entirely consistent and every family on the plateau can name the year it '
            + 'happened.');
        }),
      },
    ],
  },

  // ── 1977 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48n_the_good_fence',
    title: 'The Good Fence',
    desc: 'The country to the north has come apart and its southern villages have been cut off '
      + 'from everything: no hospitals, no wages, no state. So a gate is opened in the border '
      + 'fence, and people come through it for medical treatment, and then for work, and then '
      + 'for schooling, and within two years there are thousands crossing a week.\n\n'
      + 'It is genuine and it is also a policy. The medical care is real, the wages are real, '
      + 'and the relationships built at that gate are the foundation of a local militia, a '
      + 'security zone and fifteen years of entanglement in somebody else\'s civil war. Both '
      + 'things are true simultaneously, everybody involved on both sides knows it, and the '
      + 'people going through the gate for a doctor are making an entirely rational decision '
      + 'about the only option available to them.',
    forTag: 'player',
    date: { y: 1977, m: 6 },
    aiOption: 1,
    historical: 'The "Good Fence" opened in 1976, providing medical care and employment to southern Lebanese villagers; the relationships it created underpinned the South Lebanon Army and the security zone.',
    options: [
      {
        label: 'Medical and humanitarian only, and put that in writing',
        tooltip: '−45 talents: +14 legitimacy and "The Gate" (−0.7 unrest everywhere, +4% income) for twenty years, with a standing instruction that nothing else is conducted there and a staff whose job is to enforce it.',
        effects: guard('fence:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, legitimacy: 14 });
          mod(ctx, 'the_gate', 'The Gate', { unrestAll: -0.7, incomeMult: 1.04 }, 240);
          h.setFlag(ctx, 'humanitarianOnly', true);
          h.chronicle(ctx, 'era', 'The gate is opened for medicine and nothing else, and the '
            + 'restriction is written down and enforced by people whose only job it is. It '
            + 'costs money and it stays what it says it is.');
        }),
      },
      {
        label: 'Medical, work and schooling: the whole relationship',
        tooltip: '−60 talents: +10 legitimacy and "The Northern Villages" (+6% income, +5% manpower, −0.5 unrest everywhere) for twenty years, with +0.9 unrest everywhere from year eight, when the entanglement it produced has to be defended.',
        effects: guard('fence:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, legitimacy: 10 });
          mod(ctx, 'the_northern_villages', 'The Northern Villages', { incomeMult: 1.06, manpowerMult: 1.05, unrestAll: -0.5 }, 240);
          ctx.helpers.addTagModifier(ctx, P(ctx), {
            id: 'the_entanglement', name: 'The Entanglement', months: 240, effects: { unrestAll: 0.9 },
          });
          h.setFlag(ctx, 'northernEntanglement', true);
          h.chronicle(ctx, 'era', 'Work, schooling and medicine all pass through the gate, and '
            + 'the relationships built there become a militia, a zone and fifteen years of '
            + 'somebody else\'s civil war.');
        }),
      },
      {
        label: 'Fund the care on their side of the fence instead',
        tooltip: '−70 talents through third parties: +12 legitimacy, +10 influence points, and "Care on the Other Side" (−0.6 unrest everywhere, +4% income) for twenty years. Clinics and salaries paid for and not staffed by us, and no gate that becomes a relationship.',
        effects: guard('fence:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, legitimacy: 12, infl: 10 });
          mod(ctx, 'care_on_the_other_side', 'Care on the Other Side', { unrestAll: -0.6, incomeMult: 1.04 }, 240);
          h.chronicle(ctx, 'diplomacy', 'Clinics and salaries on the far side of the fence are '
            + 'paid for through third parties. The care arrives, the gate stays shut, and no '
            + 'militia is created by a queue.');
        }),
      },
    ],
  },

  // ── 1982 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48n_the_town_taken_down',
    title: 'The Town That Was Taken Down',
    desc: 'The treaty requires the peninsula to be returned, and the town in the north-east '
      + 'corner of it is not part of the peninsula in any sense its residents recognise. It '
      + 'has three thousand people, greenhouses, a beach, streets with names, and children who '
      + 'were born there and have never lived anywhere else.\n\n'
      + 'The government that signed the treaty is the one that founded the town, which is the '
      + 'part nobody can quite get past. Some residents leave under compensation; some have to '
      + 'be carried out by soldiers who are crying; some barricade themselves on roofs. And '
      + 'then the bulldozers go in, on the state\'s own orders, and take the whole town down to '
      + 'the sand — because the treaty says the ground is to be handed back, and the state has '
      + 'decided that handing over a functioning town to be occupied by somebody else would be '
      + 'worse for everybody than handing over nothing at all.',
    forTag: 'player',
    date: { y: 1982, m: 4 },
    aiOption: 1,
    historical: 'Yamit and the other Sinai settlements were evacuated and demolished in April 1982 under the Egyptian peace treaty; the government that carried it out had founded them.',
    options: [
      {
        label: 'Hand it over standing, with the greenhouses working',
        tooltip: '+12 influence points and "Handed Over Whole" (+6% income, −0.4 unrest everywhere) for twenty years, with −10 legitimacy at home. Somebody else farms it next season and the argument about it never ends.',
        effects: guard('yamit:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 12, legitimacy: -10 });
          mod(ctx, 'handed_over_whole', 'Handed Over Whole', { incomeMult: 1.06, unrestAll: -0.4 }, 240);
          h.setFlag(ctx, 'handedOverWhole', true);
          h.chronicle(ctx, 'diplomacy', 'The town is handed over standing, with the greenhouses '
            + 'working and the water connected. It is farmed the following season by somebody '
            + 'else and argued about here for forty years.');
        }),
      },
      {
        label: 'Compensate generously, evacuate, and take it down',
        tooltip: '−120 talents in compensation and demolition: +10 influence points and "The Treaty Kept" (+7% income, −0.5 unrest everywhere) for twenty-five years, with +1.4 unrest everywhere for six. The treaty holds, and the pictures are shown in this country for a generation.',
        effects: guard('yamit:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -120, infl: 10 });
          mod(ctx, 'the_treaty_kept', 'The Treaty Kept', { incomeMult: 1.07, unrestAll: -0.5 }, 300);
          ctx.helpers.addTagModifier(ctx, P(ctx), {
            id: 'the_pictures', name: 'The Pictures', months: 72, effects: { unrestAll: 1.4 },
          });
          h.setFlag(ctx, 'townTakenDown', true);
          h.chronicle(ctx, 'era', 'The town is evacuated under generous compensation and taken '
            + 'down to the sand. The treaty holds for forty years and the footage is shown in '
            + 'this country every time the question comes up again.');
        }),
      },
      {
        label: 'Ask to renegotiate the corner',
        tooltip: '−40 talents on the negotiation: +12 legitimacy at home and "The Corner Contested" (+5% manpower, +0.8 unrest everywhere) for fifteen years, with −14 influence points. The request is refused, the treaty holds anyway, and the delay costs the state its reputation for keeping signatures.',
        effects: guard('yamit:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, legitimacy: 12, infl: -14 });
          mod(ctx, 'the_corner_contested', 'The Corner Contested', { manpowerMult: 1.05, unrestAll: 0.8 }, 180);
          h.chronicle(ctx, 'diplomacy', 'A renegotiation of the corner is asked for and '
            + 'refused. The town goes anyway, eighteen months late, and the state has spent '
            + 'something it will need again.');
        }),
      },
    ],
  },

  // ── 1988 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48n_the_villages_of_the_zone',
    title: 'The Villages of the Zone',
    desc: 'The security belt across the northern border is about ten kilometres deep and '
      + 'contains a hundred and fifty thousand people who did not ask to be in it. It is held '
      + 'by a local militia, paid, armed and officered from this side, whose men are from those '
      + 'villages and who have families there and no other employer.\n\n'
      + 'The arrangement works in the narrow sense that the rockets mostly land short. Its '
      + 'cost is a standing commitment to people whose position is entirely a function of this '
      + 'state\'s presence: if it ever leaves, every one of those men and most of their '
      + 'families will have to leave with it or answer for the last fifteen years. Nobody in '
      + 'any cabinet has ever written that sentence down, and every officer who serves up '
      + 'there works it out inside a month.',
    forTag: 'player',
    date: { y: 1988, m: 9 },
    aiOption: 0,
    historical: 'The South Lebanon Army held the security zone until 2000; on the withdrawal, some six thousand of its members and their families crossed into Israel.',
    options: [
      {
        label: 'Write the obligation down now: whoever serves, we take out with us',
        tooltip: '−45 talents on the planning and the reserve: +14 legitimacy and "The Written Obligation" (+6% morale, −0.6 unrest everywhere) for twenty-five years. When the day comes, twelve years later, there is a plan and a budget instead of a night of improvisation.',
        effects: guard('zone:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, legitimacy: 14 });
          mod(ctx, 'the_written_obligation', 'The Written Obligation', { moraleMult: 1.06, unrestAll: -0.6 }, 300);
          h.setFlag(ctx, 'writtenObligation', true);
          h.chronicle(ctx, 'era', 'The obligation to the militia and their families is written '
            + 'down, costed and budgeted twelve years before it falls due. When it falls due it '
            + 'is executed off a plan rather than in one night.');
        }),
      },
      {
        label: 'Fund the zone as a civil administration, not a militia',
        tooltip: '−70 talents into clinics, schools, water and wages: +12 legitimacy and "The Zone Administered" (+6% income, +5% growth, −0.7 unrest everywhere) for twenty years. Far more expensive and it makes the belt a place instead of a firing line.',
        effects: guard('zone:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, legitimacy: 12 });
          mod(ctx, 'the_zone_administered', 'The Zone Administered', { incomeMult: 1.06, growthMult: 1.05, unrestAll: -0.7 }, 240);
          h.chronicle(ctx, 'era', 'The belt is funded as a civil administration: clinics, '
            + 'schools, water, wages. It costs four times the militia and a hundred and fifty '
            + 'thousand people have a government.');
        }),
      },
      {
        label: 'Keep it military and keep it cheap',
        tooltip: '+40 talents unspent and +8 martial points, with "The Cheap Belt" (+4% manpower, +0.9 unrest everywhere) for twenty years. It holds, it costs little, and everything about the eventual ending of it gets harder every year.',
        effects: guard('zone:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 40, mar: 8 });
          mod(ctx, 'the_cheap_belt', 'The Cheap Belt', { manpowerMult: 1.04, unrestAll: 0.9 }, 240);
          h.chronicle(ctx, 'war', 'The belt is kept military and kept cheap. It holds for '
            + 'twelve more years and every year of it makes the ending more expensive.');
        }),
      },
    ],
  },

  // ── 1991 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48n_the_table_at_madrid',
    title: 'The Table at Madrid',
    desc: 'For the first time since 1948 every state in the dispute is in one room. The '
      + 'arrangements required to get them there are baroque — a joint delegation here, a '
      + 'non-attributed presence there, an agreement about who may say which word in an '
      + 'opening statement — and the substantive result of the plenary is nothing at all.\n\n'
      + 'What matters is the corridor and the parallel tracks: bilateral rooms where two '
      + 'delegations that have never met are working through water, refugees, arms control, '
      + 'environment and economic development, in technical language, with maps. Almost none '
      + 'of it produces an agreement. All of it produces a generation of officials on every '
      + 'side who know each other\'s names and how the other side\'s constraints actually work, '
      + 'which is the thing that has been missing for forty-three years.',
    forTag: 'player',
    date: { y: 1991, m: 10 },
    aiOption: 0,
    historical: 'The Madrid conference of October 1991 produced no agreement but established bilateral and multilateral tracks that shaped every subsequent negotiation in the region.',
    options: [
      {
        label: 'Put real people in every technical room and keep them there',
        tooltip: '−50 talents on the delegations: +16 influence points and "The Working Tracks" (+8% income, +5% trade, −0.6 unrest everywhere) for twenty-five years. Water, environment, arms control: nothing signed and a generation of officials on both sides who can telephone each other.',
        effects: guard('madrid:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, infl: 16 });
          mod(ctx, 'the_working_tracks', 'The Working Tracks', { incomeMult: 1.08, tradeMult: 1.05, unrestAll: -0.6 }, 300);
          h.setFlag(ctx, 'workingTracks', true);
          h.chronicle(ctx, 'diplomacy', 'Serious delegations go into every technical track and '
            + 'stay in them for years. Almost nothing is signed and a generation of officials '
            + 'on every side learns how the others actually work.');
        }),
      },
      {
        label: 'Concentrate on the one bilateral track that can conclude',
        tooltip: '−35 talents: +14 influence points and "The Track That Concludes" (+9% income, −0.5 unrest everywhere) for twenty-five years. One border, one treaty, one signature that holds — and the multilateral rooms are left to fill themselves.',
        effects: guard('madrid:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, infl: 14 });
          mod(ctx, 'the_track_that_concludes', 'The Track That Concludes', { incomeMult: 1.09, unrestAll: -0.5 }, 300);
          h.chronicle(ctx, 'diplomacy', 'Everything goes into the one bilateral track that can '
            + 'actually be concluded. It concludes, it holds, and the other rooms are attended '
            + 'by juniors.');
        }),
      },
      {
        label: 'Attend, say the minimum, and concede no format',
        tooltip: '+12 governance points and "Attended and Nothing More" (−0.5 unrest everywhere, +4% income) for fifteen years, with −8 influence points. Nothing is conceded in the shape of the table, and nothing is built in the corridor either.',
        effects: guard('madrid:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12, infl: -8 });
          mod(ctx, 'attended_and_nothing_more', 'Attended and Nothing More', { unrestAll: -0.5, incomeMult: 1.04 }, 180);
          h.chronicle(ctx, 'diplomacy', 'The delegation attends, says the minimum and concedes '
            + 'nothing about the format. No precedent is set and nobody comes home knowing '
            + 'anybody.');
        }),
      },
    ],
  },

  // ── 1997 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev48n_the_permit',
    title: 'The Permit',
    desc: 'A hundred and twenty thousand people used to cross every morning to work — building '
      + 'sites, farms, restaurants, factories — and go home at night, and the two economies had '
      + 'grown into each other for twenty-five years on that basis. The closure regime replaces '
      + 'it with a permit: issued by district, revocable, suspended entirely after any '
      + 'incident, and administered by an office that processes tens of thousands of '
      + 'applications a month.\n\n'
      + 'The security case for it is specific and real. The economic effect is that one side '
      + 'loses a third of its wage income in three years, and the other imports two hundred '
      + 'thousand workers from Romania, Thailand and China to do the work instead — which is a '
      + 'permanent change to what both societies are, made incrementally, by an administrative '
      + 'instrument that nobody ever debated as policy.',
    forTag: 'player',
    date: { y: 1997, m: 5 },
    aiOption: 1,
    historical: 'The closure and permit regime from 1993 onward cut Palestinian labour access sharply; Israel replaced it with several hundred thousand overseas migrant workers, permanently restructuring both labour markets.',
    options: [
      {
        label: 'Keep the labour market open and put the security into the checking',
        tooltip: '−80 talents on terminals, screening and biometrics: +10 legitimacy and "The Crossings Staffed" (+9% income, +6% growth, −0.7 unrest everywhere) for twenty-five years. Enormously expensive, and both economies stay attached to each other.',
        effects: guard('permit:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -80, legitimacy: 10 });
          mod(ctx, 'the_crossings_staffed', 'The Crossings Staffed', { incomeMult: 1.09, growthMult: 1.06, unrestAll: -0.7 }, 300);
          h.setFlag(ctx, 'crossingsStaffed', true);
          h.chronicle(ctx, 'era', 'The crossings are built out and staffed properly instead of '
            + 'being closed: screening, terminals and hours that let a man get to work. It '
            + 'costs a fortune and the two economies stay attached.');
        }),
      },
      {
        label: 'Separate the labour markets and bring the workers from abroad',
        tooltip: '+50 talents and "The Imported Workforce" (+8% income, +5% growth) for twenty-five years, with "Two Economies Apart" (+1.0 unrest everywhere) for the same. It works, it is permanent, and it changes what both societies are.',
        effects: guard('permit:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 50 });
          mod(ctx, 'the_imported_workforce', 'The Imported Workforce', { incomeMult: 1.08, growthMult: 1.05 }, 300);
          ctx.helpers.addTagModifier(ctx, P(ctx), {
            id: 'two_economies_apart', name: 'Two Economies Apart', months: 300, effects: { unrestAll: 1.0 },
          });
          h.setFlag(ctx, 'importedWorkforce', true);
          h.chronicle(ctx, 'era', 'The labour markets are separated and two hundred thousand '
            + 'workers are brought in from three continents. It is effective, it is permanent, '
            + 'and neither society is the one it was.');
        }),
      },
      {
        label: 'Build the industrial zones on the line instead',
        tooltip: '−65 talents into zones where the work is on one side and the workers sleep on the other: +12 influence points and "The Zones on the Line" (+8% income, +6% growth, −0.5 unrest everywhere) for twenty-five years. Nobody crosses and eighty thousand people have wages.',
        effects: guard('permit:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -65, infl: 12 });
          mod(ctx, 'the_zones_on_the_line', 'The Zones on the Line', { incomeMult: 1.08, growthMult: 1.06, unrestAll: -0.5 }, 300);
          h.setFlag(ctx, 'zonesOnTheLine', true);
          h.chronicle(ctx, 'era', 'Industrial zones are built along the line: the plant on one '
            + 'side, the housing on the other, and a gate in between. Nobody commutes and '
            + 'eighty thousand households have an income.');
        }),
      },
    ],
  },
];
