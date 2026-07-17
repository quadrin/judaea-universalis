// js/data/powers.js — the powers beyond the map (SPEC §55). Content package:
// zero imports. Each bookmark may have off-map great powers — polities too
// distant or too vast for the frame, yet decisive in it: the superpowers of
// 1948, the steppe khaganates of 614, the Diaspora of the ancient chapters.
//
// A power is NOT a tag: it owns no provinces, fields no armies, and cannot be
// fought. It keeps a STANDING (0-100) with every court on the map. Courting
// it raises standing (and chills its rival); once standing is high enough,
// its ASKS unlock — arms, credits, volunteers, a khagan's host — applied as
// ordinary treasury/manpower adjustments and timed tag modifiers, so every
// downstream system already understands them.
//
// Schema:
//   { id, name, color, blurb,
//     start: { TAG: standing },     // baseline; monthly drift pulls back here
//     court: { cost:{infl}, gain, cd, rival? },  // rival: power id chilled by -gain/2
//     asks: [{ id, name, desc, need, cd, tags?, war?, needsPower?,
//              cost:{treasury?,infl?,gov?,mar?},
//              effects:{ treasury?, manpower?, legitimacy?, stability?,
//                        gov?, infl?, mar?, modifier?:{id,name,months,effects} } }] }

export const POWERS = {
  '1948ce': [
    {
      id: 'USA', name: 'The United States', color: [60, 90, 160],
      blurb: 'Recognition came in eleven minutes; arms did not — the Neutrality '
        + 'Act embargo binds both sides. What Washington has is money, and the '
        + 'weight of the word "recognized."',
      start: { ISR: 30, EGY: 20, JOR: 25, SYR: 15, LEB: 35, IRQ: 20, SAU: 45, TUR: 45, IRN: 40, UK: 65, GRC: 50, ITA: 50 },
      court: { cost: { infl: 25 }, gain: 10, cd: 6, rival: 'USSR' },
      pact: {
        name: 'American Alignment', need: 75,
        desc: 'Grant-in-aid, favorable loans, and a friend on the Security Council. The other bloc closes its doors.',
        monthly: { treasury: 8 },
        effects: { incomeMult: 1.05 },
      },
      trade: {
        name: 'The Dollar Trade', need: 55,
        desc: 'Most-favored terms in the American market: citrus out, machine tools in.',
        monthly: { treasury: 5 },
      },
      asks: [
        {
          id: 'usa_credits', name: 'Ask for credits',
          desc: 'Export-Import Bank credits: a young state\'s bridge loan, no strings visible.',
          need: 50, cd: 24, cost: {},
          effects: { treasury: 120, legitimacy: 5 },
        },
        {
          id: 'usa_recognition', name: 'Press for full recognition',
          desc: 'De jure recognition and a seat at the table: legitimacy at home and abroad.',
          need: 65, cd: 36, cost: { infl: 20 },
          effects: { legitimacy: 15, stability: 1 },
        },
      ],
    },
    {
      id: 'USSR', name: 'The Soviet Union', color: [150, 40, 40],
      blurb: 'Moscow voted for partition and lets Prague sell what Washington '
        + 'embargoes. Its friendship is real, priced, and watched by the other side.',
      start: { ISR: 35, EGY: 15, JOR: 5, SYR: 25, LEB: 15, IRQ: 10, SAU: 5, TUR: 5, IRN: 15, UK: 10, GRC: 15, ITA: 25 },
      court: { cost: { infl: 25 }, gain: 10, cd: 6, rival: 'USA' },
      pact: {
        name: 'Eastern Alignment', need: 75,
        desc: 'The bloc\'s embrace: fraternal aid and the arsenals open — and Washington\'s door closes.',
        monthly: { treasury: 5 },
        effects: { reinforceMult: 1.08 },
      },
      asks: [
        {
          id: 'ussr_armor', name: 'Buy Soviet surplus armor',
          desc: 'T-34s with the factory grease still on them, sold through intermediaries.',
          need: 70, cd: 36, cost: { treasury: 120 },
          effects: {
            mar: 10,
            modifier: {
              id: 'power_soviet_armor', name: 'Soviet Surplus Armor', months: 24,
              effects: { milPowerMult: 1.06 },
            },
          },
        },
        {
          id: 'ussr_bloc', name: 'Open the Prague channel',
          desc: 'Moscow\'s nod is the key to the Czech arsenals — the deal itself is struck in Prague.',
          need: 55, cd: 30, cost: { infl: 15 },
          effects: { mar: 15 },
        },
      ],
    },
    {
      id: 'CZE', name: 'Czechoslovakia', color: [70, 110, 150],
      blurb: 'Rifles, machine guns, and crated fighters from the Brno works — '
        + 'sold for hard currency to whoever Moscow permits.',
      start: { ISR: 40, EGY: 20, JOR: 10, SYR: 20, LEB: 15, IRQ: 15, SAU: 5, TUR: 15, IRN: 10, UK: 15, GRC: 15, ITA: 25 },
      court: { cost: { infl: 20 }, gain: 10, cd: 6 },
      trade: {
        name: 'The Skoda Contracts', need: 55,
        desc: 'Standing orders with the Brno and Pilsen works: spares, barrels, ammunition.',
        monthly: { treasury: 3 },
      },
      asks: [
        {
          id: 'cze_reequip', name: 'Re-equip from the Czech depots',
          desc: 'Every stale formation re-armed to the current pattern — crated, shipped, and paid in dollars. Moscow must approve.',
          need: 65, cd: 48, needsPower: { USSR: 45 }, cost: { treasury: 140 },
          effects: { modernize: true },
        },
        {
          id: 'cze_arms', name: 'Strike the arms deal',
          desc: 'Mausers, MG-34s and Avia fighters, cash on the dock at Žatec. Moscow must approve.',
          need: 50, cd: 30, needsPower: { USSR: 45 }, cost: { treasury: 90 },
          effects: {
            manpower: 2000,
            modifier: {
              id: 'power_czech_arms', name: 'The Prague Arsenal', months: 30,
              effects: { disciplineMult: 1.06, reinforceMult: 1.1 },
            },
          },
        },
      ],
    },
    {
      id: 'FRA', name: 'France', color: [80, 100, 170],
      blurb: 'Paris keeps its own counsel — and its quays, where crates marked '
        + '"agricultural machinery" are not weighed too closely.',
      start: { ISR: 40, EGY: 25, JOR: 15, SYR: 20, LEB: 45, IRQ: 15, SAU: 15, TUR: 30, IRN: 25, UK: 45, GRC: 35, ITA: 45 },
      court: { cost: { infl: 20 }, gain: 10, cd: 6 },
      trade: {
        name: 'The Marseille Run', need: 55,
        desc: 'Freight and finance through the French ports, no questions logged.',
        monthly: { treasury: 4 },
      },
      asks: [
        {
          id: 'fra_quiet', name: 'Open the quiet channels',
          desc: 'Artillery pieces and shells, shipped without ceremony.',
          need: 55, cd: 30, cost: { treasury: 70 },
          effects: {
            mar: 10,
            modifier: {
              id: 'power_french_guns', name: 'Guns from the Quiet Quays', months: 24,
              effects: { milPowerMult: 1.04 },
            },
          },
        },
      ],
    },
    {
      id: 'UN', name: 'The United Nations', color: [110, 160, 190],
      blurb: 'The Assembly that drew the partition lines watches the war it '
        + 'created. Its sympathy stops no column — but it steadies a state.',
      start: { ISR: 40, EGY: 30, JOR: 30, SYR: 30, LEB: 35, IRQ: 25, SAU: 25, TUR: 40, IRN: 35, UK: 50, GRC: 40, ITA: 45 },
      court: { cost: { infl: 20 }, gain: 8, cd: 6 },
      asks: [
        {
          id: 'un_appeal', name: 'Appeal to the Assembly',
          desc: 'A hearing before the world: sympathy abroad, resolve at home.',
          need: 45, cd: 18, war: true, cost: { infl: 15 },
          effects: {
            legitimacy: 8,
            modifier: {
              id: 'power_un_backing', name: 'The Assembly\'s Sympathy', months: 12,
              effects: { unrestAll: -0.5, legitimacyAdd: 0.05 },
            },
          },
        },
      ],
    },
  ],

  '614ce': [
    {
      id: 'GOK', name: 'The Western Khaganate', color: [90, 130, 170],
      blurb: 'The Türks beyond the Caucasus gates: forty thousand horsemen who '
        + 'answer to gold and to the promise of Persian plunder.',
      start: { BYZ: 40, SAS: 15, JUD: 20, GHA: 25 },
      court: { cost: { infl: 25 }, gain: 10, cd: 6 },
      pact: {
        name: 'The Steppe Alliance', need: 75, tags: ['BYZ'],
        desc: 'The khagan\'s oath at Tiflis: horsemen when you march, and the Caucasus gates held open.',
        monthly: { treasury: 0 },
        effects: { reinforceMult: 1.06, moraleMult: 1.03 },
      },
      asks: [
        {
          id: 'gok_rides', name: 'The Khagan rides south',
          desc: 'Ziebel\'s host through the Caspian Gates — the hammer to your anvil.',
          need: 60, cd: 36, war: true, tags: ['BYZ'], cost: { treasury: 100 },
          effects: {
            manpower: 4000,
            modifier: {
              id: 'power_turk_alliance', name: 'The Türk Alliance', months: 18,
              effects: { reinforceMult: 1.12, moraleMult: 1.04 },
            },
          },
        },
      ],
    },
    {
      id: 'AVR', name: 'The Avar Khaganate', color: [140, 90, 60],
      blurb: 'The horde on the Danube prices its absences in gold. Both empires '
        + 'have paid before; both will pay again.',
      start: { BYZ: 25, SAS: 35, JUD: 15, GHA: 15 },
      court: { cost: { infl: 20 }, gain: 10, cd: 6 },
      asks: [
        {
          id: 'avr_peace', name: 'Buy the Khagan\'s peace',
          desc: 'Tribute for the rear: the themes of Thrace breathe, and the men know it.',
          need: 45, cd: 30, tags: ['BYZ'], cost: { treasury: 120 },
          effects: {
            modifier: {
              id: 'power_rear_secured', name: 'The Rear Secured', months: 24,
              effects: { reinforceMult: 1.08, moraleMult: 1.03 },
            },
          },
        },
        {
          id: 'avr_aim', name: 'Aim the horde west',
          desc: 'Persian gold on the Danube: every Roman eye that watches the Avars is not watching you.',
          need: 50, cd: 30, tags: ['SAS'], cost: { treasury: 80 },
          effects: {
            modifier: {
              id: 'power_west_distracted', name: 'Rome Watches the Danube', months: 12,
              effects: { milPowerMult: 1.04 },
            },
          },
        },
      ],
    },
  ],
};

// The Diaspora rides with every ancient Jewish chapter: the communities of
// Alexandria, Cyrene, Babylon and beyond — silver, swords, and sons.
const DIASPORA = (jewishTag, romeTag) => ({
  id: 'DIA', name: 'The Diaspora', color: [60, 100, 170],
  blurb: 'More Jews live beyond this map than on it — in Alexandria, Babylon, '
    + 'Cyrene, Rome itself. Their silver and their sons follow their hearts.',
  start: { [jewishTag]: 55, [romeTag]: 20 },
  court: { cost: { infl: 20 }, gain: 10, cd: 6 },
  pact: {
    name: 'One People', need: 75, tags: [jewishTag],
    desc: 'The dispersion binds itself to the Land: a steady stream of silver and sons.',
    monthly: { treasury: 3 },
    effects: { manpowerMult: 1.05 },
  },
  trade: {
    name: 'The Half-Shekel Flows', need: 55, tags: [jewishTag],
    desc: 'The communities\' yearly dues, gathered and sent up with the caravans.',
    monthly: { treasury: 2 },
  },
  asks: [
    {
      id: 'dia_silver', name: 'The communities send silver',
      desc: 'The half-shekel of every man, gathered from every city of the dispersion.',
      need: 45, cd: 24, tags: [jewishTag], cost: {},
      effects: { treasury: 60 },
    },
    {
      id: 'dia_volunteers', name: 'Volunteers from the communities',
      desc: 'Young men of Alexandria and Babylon, come to fight for the Land.',
      need: 60, cd: 36, war: true, tags: [jewishTag], cost: { infl: 10 },
      effects: {
        manpower: 1500,
        modifier: {
          id: 'power_diaspora_zeal', name: 'The Dispersion\'s Zeal', months: 12,
          effects: { moraleMult: 1.05 },
        },
      },
    },
  ],
});

POWERS['167bce'] = [DIASPORA('HAS', 'SEL')];
POWERS['66ce'] = [DIASPORA('JUD', 'ROM')];
POWERS['132ce'] = [DIASPORA('JUD', 'ROM')];
