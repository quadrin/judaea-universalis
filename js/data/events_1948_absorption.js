// Judaea Universalis — the absorption (SPEC §171). Content package: zero
// imports, keyed on the Israeli standard of the 1948 chapter.
//
// WHY THIS CHAIN EXISTS. The chapter already asks whether the newcomers go to
// the frontier towns or stay on the coast, because §66's Hebrew pen needs a
// Jewish community living in a town before it will rename it. That is one
// choice with one consequence. What it leaves out is the thing that actually
// dominated the decade: the state's population roughly DOUBLED in three and a
// half years — about 688,000 immigrants between May 1948 and the end of 1951
// against a Jewish population of some 650,000 — and there was nowhere to put
// them, nothing to feed them with, and no money.
//
// The ma'abarot were the answer: transit camps of tents and then tin huts,
// holding upward of 200,000 people at their peak in 1951, on rationing
// (`tzena`) that ran to 1959. It is not a background fact. It is the single
// largest thing the state did in its first decade, it very nearly broke the
// treasury, it produced the political fault line between the absorbing
// establishment and the absorbed that outlasted everyone involved, and it is
// the reason the reparations agreement of 1952 was signed over riots.
//
// SO: capacity against cohesion, five cards, no free answer. Take them fast
// and the camps and the ration book cost you order and money; take them slowly
// and you are a state that turned Jews away, which costs you the thing the
// state says it is for. The chain reads the ordinary treasury and unrest the
// engine already keeps, and it writes flags the §66 pen and the Road Not Taken
// read.
//
// The fifth card is the east (SPEC §176). The §172 communities of Mesopotamia
// are ON this chapter's board — Baghdad, Hilla, Fallujah, Erbil — and their
// windows in js/data/diaspora.js now close in 1952, because that is what
// happened: the Denaturalisation Law of March 1950 opened a one-year exit,
// the property freeze of March 1951 took everything not already carried, and
// the airlift flew the oldest continuously settled diaspora on earth to Lod
// entire. The card is Israel's end of it — whether the airlift runs flat out
// into camps that do not exist, or is metered to what the tents can hold
// while Baghdad's registry runs on Baghdad's clock.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_1948_absorption] ' + key, e || '');
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
function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
}
function israel(ctx) {
  const t = who(ctx, 'ISR');
  const g = ctx.game.tags[t];
  return g && g.alive ? t : null;
}
function isPlayer(ctx, tag) {
  return !!tag && ctx.game.playerTag === tag;
}
function flag(ctx, key) {
  return !!(ctx.game.flags && ctx.game.flags[key]);
}
function treasury(ctx, tag) {
  const t = ctx.game.tags[tag];
  return t ? (Number.isFinite(t.treasury) ? t.treasury : 0) : 0;
}
function nudgeOpinion(g, a, b, d) {
  try {
    const ta = g.tags && g.tags[a];
    if (!ta) return;
    if (!ta.opinion || typeof ta.opinion !== 'object') ta.opinion = {};
    const cur = Number.isFinite(ta.opinion[b]) ? ta.opinion[b] : 0;
    ta.opinion[b] = Math.max(-200, Math.min(200, cur + d));
  } catch (e) { warnOnce('nudgeOpinion', e); }
}

export const EVENTS_1948_ABSORPTION = [
  {
    id: 'ev_ab_the_gates',
    title: 'The Gates',
    desc: 'The Law of Return has not been drafted yet and the ships are already '
      + 'arriving. Cyprus is emptying, and behind Cyprus is the whole of it: the '
      + 'displaced-persons camps in Germany, and then Iraq, and then Yemen, and then '
      + 'Morocco, and nobody in the Absorption Department can give the cabinet a '
      + 'number because the number depends on a decision the cabinet has not made. '
      + 'The country has 650,000 Jews in it, a war on, one working port, and food '
      + 'rationing already drafted. The professional advice, from people who are not '
      + 'hostile to the enterprise, is that it can absorb perhaps sixty thousand a '
      + 'year without breaking. The projection for next year is a quarter of a '
      + 'million.',
    forTag: 'player',
    major: true,
    date: { y: 1949, m: 3 },
    trigger: safeTrigger('ev_ab_the_gates', (ctx) => {
      const me = israel(ctx);
      return !!me && isPlayer(ctx, me) && !flag(ctx, 'absorptionSettled');
    }),
    aiOption: 0,
    historical: 'The Law of Return passed on 5 July 1950 and codified what had already been policy: unlimited entry. Some 688,000 immigrants arrived between May 1948 and the end of 1951, roughly doubling the Jewish population.',
    options: [
      {
        label: 'The gates stay open. That is what the state is for.',
        tooltip: 'Unlimited entry, immediately, against the advice. +25% manpower growth and a permanent claim on the diaspora — and a treasury and a public order this country does not have: −0.6 income multiplier for four years, +1.4 unrest, and the camps open next year. Sets the absorption at full.',
        effects: guard('ev_ab_the_gates:0', (ctx) => {
          const h = ctx.helpers;
          const me = israel(ctx);
          h.addTagModifier(ctx, me, {
            id: 'the_open_gates', name: 'The Gates Are Open', months: 48,
            effects: { manpowerMult: 1.25, growthMult: 1.15, incomeMult: 0.6, unrestAll: 1.4 },
          });
          h.setFlag(ctx, 'absorptionFull', true);
          h.chronicle(ctx, 'era', 'The gates are opened without a quota: whoever comes, comes.');
        }),
      },
      {
        label: 'A quota, until there is somewhere to put them',
        tooltip: 'Sixty thousand a year, the number the department can actually house. +8% manpower growth and a treasury that survives — but the country has told Jews in camps to wait, on the record, and it will be quoted for fifty years. −10 legitimacy, the Revisionists will not let it go (−20), and the diaspora chapters cool. Sets the absorption at a trickle.',
        effects: guard('ev_ab_the_gates:1', (ctx) => {
          const h = ctx.helpers;
          const me = israel(ctx);
          h.addTagModifier(ctx, me, {
            id: 'the_quota', name: 'The Quota', months: 48,
            effects: { manpowerMult: 1.08, growthMult: 1.05 },
          });
          h.adjust(ctx, me, { legitimacy: -10 });
          h.factionShift(ctx, me, 'revisionists', -20);
          h.factionShift(ctx, me, 'coalition', -8);
          h.setFlag(ctx, 'absorptionQuota', true);
          h.chronicle(ctx, 'era', 'A quota is set on immigration: sixty thousand a year, until there is somewhere to put them.');
        }),
      },
    ],
  },

  {
    id: 'ev_ab_ezra_and_nehemiah',
    title: 'Ezra and Nehemiah',
    desc: 'Baghdad has passed a law with a clock in it: any Jew may leave Iraq — '
      + 'freely, legally, forever — who renounces his citizenship within the year. '
      + 'The government expects a few thousand malcontents and a community shrunk to '
      + 'a governable quiet. Instead the community registers almost entire: a hundred '
      + 'and twenty thousand people, older in the land between the rivers than '
      + 'Baghdad, older than Islam — the Jews of the first exile, who wrote the '
      + 'Talmud there — sitting on suitcases, waiting for charter aircraft that do '
      + 'not yet exist, while the clock runs. Sana\'a\'s forty-nine thousand have '
      + 'already come out through Aden on aircraft borrowed from an Alaskan airline. '
      + 'Damascus\'s remnant is sealed behind an exit ban and coming out in rowboats '
      + 'or not at all. And everyone understands that when Baghdad\'s registry '
      + 'closes, a second law will follow it about the property of those who signed. '
      + 'The camps at home hold a hundred thousand already. The Absorption '
      + 'Department asks, in writing, what it is supposed to do with a second '
      + 'Jerusalem\'s worth of arrivals. There is no good answer, and the clock '
      + 'does not care.',
    forTag: 'player',
    major: true,
    date: { y: 1950, m: 3 },
    trigger: safeTrigger('ev_ab_ezra_and_nehemiah', (ctx) => {
      const me = israel(ctx);
      if (!me || !isPlayer(ctx, me)) return false;
      // The law is Baghdad's to pass: a Baghdad that is not Iraq's — conquered,
      // or the crown fallen — passes no law, and the card stays in the drawer.
      const irq = who(ctx, 'IRQ');
      const t = ctx.game.tags[irq];
      if (!t || !t.alive) return false;
      const p = ctx.prov ? ctx.prov('Seleucia-Ctesiphon') : null;
      return !!p && p.owner === irq;
    }),
    aiOption: 0,
    historical: 'The Denaturalisation Law of 4 March 1950 opened a one-year window; '
      + 'the property-freeze law of 10 March 1951 closed the accounts the day the '
      + 'registry peaked. Operations Ezra and Nehemiah flew some 120,000 Jews from '
      + 'Baghdad to Lod by early 1952, ending twenty-five centuries of Babylonian '
      + 'Jewry; Operation Magic Carpet had already brought Yemen\'s community out '
      + 'through Aden in 1949-50. Syria\'s community, halved by flight after 1947, '
      + 'was forbidden to follow: its remnant lived under an exit ban into the 1990s.',
    options: [
      {
        label: 'Every seat on every aircraft, until it is done',
        tooltip: 'The airlift takes the community entire while the window is open: '
          + '−80 treasury for the charters, +2,000 reserves as the young men clear the '
          + 'camps first, and +12% manpower and +8% growth for two years as the rest '
          + 'arrive — with the ma\'abarot filling faster than they can be built (+0.6 '
          + 'unrest, same two years). Baghdad keeps everything it froze (+120 to Iraq, '
          + '−15 opinion both ways) and finds it has traded its merchant class for a '
          + 'warehouse receipt.',
        effects: guard('ev_ab_ezra_and_nehemiah:0', (ctx) => {
          const h = ctx.helpers;
          const me = israel(ctx);
          const irq = who(ctx, 'IRQ');
          h.adjust(ctx, me, { treasury: -80, manpower: 2000 });
          h.addTagModifier(ctx, me, {
            id: 'ezra_and_nehemiah', name: 'Ezra and Nehemiah', months: 24,
            effects: { manpowerMult: 1.12, growthMult: 1.08, unrestAll: 0.6 },
          });
          if (ctx.game.tags[irq] && ctx.game.tags[irq].alive) {
            h.adjust(ctx, irq, { treasury: 120 });
            nudgeOpinion(ctx.game, irq, me, -15);
            nudgeOpinion(ctx.game, me, irq, -15);
            h.addProvinceModifier(ctx, 'Seleucia-Ctesiphon', {
              id: 'the_frozen_property', name: 'The Frozen Property', months: 120,
              effects: { prodMult: 0.92 },
            });
          }
          h.setFlag(ctx, 'easternAirlift', true);
          h.chronicle(ctx, 'era', 'Ezra and Nehemiah: the community of the first exile '
            + 'comes home entire, one suitcase apiece, and the east of the dispersion '
            + 'goes out behind them.');
        }),
      },
      {
        label: 'The camps cannot take a city at once — sixty thousand now, the rest by turns',
        tooltip: 'The airlift is metered to what the tents can hold: +6% manpower and '
          + '+4% growth for two years and the treasury is spared. But the registry runs '
          + 'on Baghdad\'s deadline, not ours: those still queued when it closes are '
          + 'stateless in the state that made them so. −8 legitimacy, +2 unrest in '
          + 'Baghdad for three years, and every community still on the board hears that '
          + 'the ships were made to wait (−6 standing).',
        effects: guard('ev_ab_ezra_and_nehemiah:1', (ctx) => {
          const h = ctx.helpers;
          const me = israel(ctx);
          h.addTagModifier(ctx, me, {
            id: 'the_metered_airlift', name: 'The Metered Airlift', months: 24,
            effects: { manpowerMult: 1.06, growthMult: 1.04 },
          });
          h.adjust(ctx, me, { legitimacy: -8 });
          h.addProvinceModifier(ctx, 'Seleucia-Ctesiphon', {
            id: 'the_stranded_registry', name: 'The Stranded of the Registry',
            months: 36, effects: { unrest: 2 },
          });
          // The dispersion hears. Standing lives on the province record
          // (js/sim/diaspora.js keeps it there so it saves for free), so a
          // zero-import package can reach it directly — filed per crown since
          // SPEC §216, and this is news that reaches every crown they have
          // ever had dealings with.
          for (const p of ctx.game.provinces) {
            const by = p && p.dia && p.dia.by;
            if (!by) continue;
            for (const crown of Object.keys(by)) {
              const rec = by[crown];
              if (rec && Number.isFinite(rec.standing)) rec.standing = Math.max(0, rec.standing - 6);
            }
          }
          h.setFlag(ctx, 'easternAirliftStaggered', true);
          h.chronicle(ctx, 'era', 'The airlift is metered to the camps: sixty thousand '
            + 'a year, while Baghdad\'s registry runs on Baghdad\'s clock.');
        }),
      },
    ],
  },

  {
    id: 'ev_ab_the_maabarot',
    title: 'The Ma\'abarot',
    desc: 'The tent camps were meant to last a season. It is the second winter, the '
      + 'tents have been replaced with tin and canvas huts because tin is cheaper '
      + 'than housing, and there are something over two hundred thousand people '
      + 'living in them — a third of everyone who has arrived. The camps have their '
      + 'own schools, their own clinics, their own unemployment and their own '
      + 'newspapers, and the newspapers have begun to notice which arrivals were '
      + 'sent to a town and which were sent to a camp, and to draw a map of it that '
      + 'the government does not like. The flooding in the winter of 1951 will make '
      + 'the national news. Nobody in the cabinet thinks this is acceptable. The '
      + 'question is only what it is to be paid for with.',
    forTag: 'player',
    minYear: 1950,
    maxYear: 1957,
    trigger: safeTrigger('ev_ab_the_maabarot', (ctx) => {
      const me = israel(ctx);
      if (!me || !isPlayer(ctx, me)) return false;
      if (flag(ctx, 'maabarotAnswered')) return false;
      return flag(ctx, 'absorptionFull') || flag(ctx, 'absorptionQuota');
    }),
    aiOption: 0,
    historical: 'The ma\'abarot peaked at some 220,000 residents in 1951 and were not finally cleared until the mid-1960s; the last were rebuilt in place as development towns. The tzena rationing regime ran from 1949 to 1959.',
    options: [
      {
        label: 'Borrow against the future and build towns',
        tooltip: 'A national housing programme paid for with debt: three loans taken at once. The camps empty into real towns on the frontier, which is where the state wanted people anyway. Development grows faster for six years, the Kibbutzim and the Coalition approve, and the newcomers are integrated — which opens the Hebrew pen (§66) in the towns they fill.',
        effects: guard('ev_ab_the_maabarot:0', (ctx) => {
          const h = ctx.helpers;
          const me = israel(ctx);
          h.adjust(ctx, me, { treasury: -260 });
          h.addTagModifier(ctx, me, {
            id: 'the_development_towns', name: 'The Development Towns', months: 72,
            effects: { growthMult: 1.2, unrestAll: -0.5, incomeMult: 1.05 },
          });
          h.factionShift(ctx, me, 'kibbutzim', 12);
          h.factionShift(ctx, me, 'coalition', 10);
          h.setFlag(ctx, 'maabarotAnswered', true);
          h.setFlag(ctx, 'developmentTowns', true);
          h.setFlag(ctx, 'newcomersAbsorbed', true);
          h.chronicle(ctx, 'era', 'The transit camps are rebuilt in place as development towns, on borrowed money.');
        }),
      },
      {
        label: 'Rationing, and the camps hold another year',
        tooltip: 'Tzena tightened and the building programme deferred. The treasury holds and nothing else does: +1.2 unrest for five years, −8 legitimacy, and the camps become a political constituency that remembers. The Revisionists find their voters there (+15 to them, −10 to the Coalition).',
        effects: guard('ev_ab_the_maabarot:1', (ctx) => {
          const h = ctx.helpers;
          const me = israel(ctx);
          h.addTagModifier(ctx, me, {
            id: 'the_camps_hold', name: 'The Camps Hold', months: 60,
            effects: { unrestAll: 1.2, growthMult: 0.95 },
          });
          h.adjust(ctx, me, { legitimacy: -8 });
          h.factionShift(ctx, me, 'revisionists', 15);
          h.factionShift(ctx, me, 'coalition', -10);
          h.setFlag(ctx, 'maabarotAnswered', true);
          h.setFlag(ctx, 'campsHeld', true);
        }),
      },
    ],
  },

  {
    id: 'ev_ab_the_reparations',
    title: 'The Money From Germany',
    desc: 'The offer is three billion marks in goods over twelve years, and it would '
      + 'solve the problem — the ships, the ports, the power stations, the housing, '
      + 'all of it, at a stroke. It is also blood money from the state that did it, '
      + 'seven years after, and Begin has told a crowd in Zion Square that there are '
      + 'things for which a Jew does not take payment and that this government will '
      + 'not survive taking it. The crowd goes to the Knesset and the stones go '
      + 'through the windows of the chamber while the debate is running. Both men '
      + 'are entirely serious and both of them are right about something.',
    forTag: 'player',
    date: { y: 1952, m: 1 },
    trigger: safeTrigger('ev_ab_the_reparations', (ctx) => {
      const me = israel(ctx);
      return !!me && isPlayer(ctx, me) && !flag(ctx, 'reparationsSettled');
    }),
    aiOption: 0,
    historical: 'The Reparations Agreement was signed on 10 September 1952 after a Knesset debate conducted while a demonstration stoned the building. It transferred some 3 billion marks in goods and is generally credited with funding the merchant fleet, the electricity grid and a great deal of the absorption.',
    options: [
      {
        label: 'Take it. The living have a claim the dead cannot make.',
        tooltip: 'Signed. A very large one-time transfer and twelve years of goods: +900 talents, +10% income and +10% development growth for twelve years. The Revisionists will not forget it (−25) and the street is dangerous for a season (+1 unrest, 24 months); the Coalition owns the decision (+10).',
        effects: guard('ev_ab_the_reparations:0', (ctx) => {
          const h = ctx.helpers;
          const me = israel(ctx);
          h.adjust(ctx, me, { treasury: 900 });
          h.addTagModifier(ctx, me, {
            id: 'the_reparations', name: 'The Reparations Agreement', months: 144,
            effects: { incomeMult: 1.1, growthMult: 1.1 },
          });
          h.addTagModifier(ctx, me, {
            id: 'zion_square', name: 'The Stones in Zion Square', months: 24,
            effects: { unrestAll: 1 },
          });
          h.factionShift(ctx, me, 'revisionists', -25);
          h.factionShift(ctx, me, 'coalition', 10);
          h.setFlag(ctx, 'reparationsSettled', true);
          h.setFlag(ctx, 'reparationsTaken', true);
          h.chronicle(ctx, 'era', 'The reparations agreement is signed while the chamber\'s windows are broken from outside.');
        }),
      },
      {
        label: 'There are things for which a Jew does not take payment',
        tooltip: 'Refused. No transfer and no goods — the absorption is paid for out of this country\'s own thin pocket. +12 legitimacy and the Revisionists are vindicated (+25); the Coalition wears the cost (−10), and the treasury does too: −5% income for six years.',
        effects: guard('ev_ab_the_reparations:1', (ctx) => {
          const h = ctx.helpers;
          const me = israel(ctx);
          h.adjust(ctx, me, { legitimacy: 12 });
          h.addTagModifier(ctx, me, {
            id: 'no_blood_money', name: 'No Payment Was Taken', months: 72,
            effects: { incomeMult: 0.95 },
          });
          h.factionShift(ctx, me, 'revisionists', 25);
          h.factionShift(ctx, me, 'coalition', -10);
          h.setFlag(ctx, 'reparationsSettled', true);
          h.setFlag(ctx, 'reparationsRefused', true);
          h.chronicle(ctx, 'era', 'The reparations offer is refused. The absorption will be paid for out of this country\'s own pocket.');
        }),
      },
    ],
  },

  {
    id: 'ev_ab_what_the_decade_made',
    title: 'What the Decade Made',
    desc: 'The rationing has ended, the last of the camps are being rebuilt in place '
      + 'as towns with names, and the country that comes out of the decade is not '
      + 'the one that went into it. It is twice the size and half of it arrived '
      + 'after the war, which means half of it did not fight in the war and does not '
      + 'share the founding generation\'s account of what the country is. The census '
      + 'will show it, the ballot will show it within twenty years, and the argument '
      + 'about who absorbed whom will still be running in the next century. Whatever '
      + 'the state is now, this decade is what made it, and no cabinet meeting '
      + 'decided it.',
    forTag: 'player',
    major: true,
    date: { y: 1959, m: 6 },
    trigger: safeTrigger('ev_ab_what_the_decade_made', (ctx) => {
      const me = israel(ctx);
      if (!me || !isPlayer(ctx, me)) return false;
      return flag(ctx, 'maabarotAnswered') || flag(ctx, 'absorptionQuota');
    }),
    aiOption: 0,
    historical: 'The Wadi Salib riots of July 1959 were the decade\'s bill arriving: Moroccan immigrants in a Haifa neighbourhood against a police force and an establishment they experienced as a different country. Nothing in the state\'s politics since has been untouched by the argument they started.',
    options: [
      {
        label: 'A country of newcomers, and the founders can make room',
        tooltip: 'The establishment gives ground: the development towns get budgets and seats, and the absorbed become the country rather than a problem it solved. +2 stability, +10 legitimacy, +8% manpower permanently. The Coalition pays for it (−12) and the Kibbutzim, who lose their monopoly on the story, pay too (−10).',
        effects: guard('ev_ab_what_the_decade_made:0', (ctx) => {
          const h = ctx.helpers;
          const me = israel(ctx);
          h.adjust(ctx, me, { stability: 2, legitimacy: 10 });
          h.addTagModifier(ctx, me, {
            id: 'a_country_of_newcomers', name: 'A Country of Newcomers', months: -1,
            effects: { manpowerMult: 1.08, unrestAll: -0.4 },
          });
          h.factionShift(ctx, me, 'coalition', -12);
          h.factionShift(ctx, me, 'kibbutzim', -10);
          h.factionShift(ctx, me, 'revisionists', 12);
          h.setFlag(ctx, 'absorptionSettled', true);
          h.setFlag(ctx, 'newcomersAbsorbed', true);
          h.chronicle(ctx, 'era', 'The founding establishment makes room: the towns get budgets and seats, and the newcomers become the country.');
        }),
      },
      {
        label: 'The country is what it was. They will learn it.',
        tooltip: 'The establishment holds its ground and expects assimilation on its own terms. +1 stability now and a fault line that never closes: +0.8 unrest permanently, and the Revisionists inherit a constituency that will hand them the country in a generation (+20 to them, +10 to the Coalition).',
        effects: guard('ev_ab_what_the_decade_made:1', (ctx) => {
          const h = ctx.helpers;
          const me = israel(ctx);
          h.adjust(ctx, me, { stability: 1 });
          h.addTagModifier(ctx, me, {
            id: 'the_fault_line', name: 'The Fault Line', months: -1,
            effects: { unrestAll: 0.8 },
          });
          h.factionShift(ctx, me, 'revisionists', 20);
          h.factionShift(ctx, me, 'coalition', 10);
          h.factionShift(ctx, me, 'kibbutzim', 8);
          h.setFlag(ctx, 'absorptionSettled', true);
          h.setFlag(ctx, 'theFaultLine', true);
          h.chronicle(ctx, 'era', 'The establishment holds its ground on absorption, and the fault line it leaves does not close.');
        }),
      },
    ],
  },
];
