// Judaea Universalis — generic event pool, shared by every bookmark (v1.5).
// State-keyed, repeatable flavor: harvests, omens, plagues, raiders, windfalls.
// Content package: zero imports; all effects run through ctx.helpers / ctx.game.
// Each event is `once:false` with a `cooldownMonths` gate plus a monthly
// `chance`, so the pool murmurs in the background without drowning the
// scripted chains.

function T(ctx) { return ctx.game.tags[ctx.game.playerTag]; }
function atPeace(ctx) {
  const t = T(ctx);
  return !!t && !(t.atWarWith || []).some((e) => ctx.game.tags[e] && ctx.game.tags[e].alive);
}
function ownedProvinces(ctx, filter) {
  const g = ctx.game;
  const out = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== g.playerTag) continue;
    if (filter && !filter(p)) continue;
    out.push(p);
  }
  return out;
}
function devTotal(p) {
  return p.dev ? (p.dev.tax || 0) + (p.dev.prod || 0) + (p.dev.mp || 0) : 0;
}
function pickWeighty(ctx, list) {
  if (!list.length) return null;
  const sorted = list.slice().sort((a, b) => devTotal(b) - devTotal(a));
  return ctx.rng.pick(sorted.slice(0, Math.max(1, Math.min(5, sorted.length))));
}

export const GENERIC_EVENTS = [
  // ── plenty & want ─────────────────────────────────────────────────────────
  {
    id: 'gen_bountiful_harvest',
    title: 'A Bountiful Harvest',
    desc: 'The threshing floors cannot hold it all. From every district the stewards send '
      + 'the same report: full granaries, fat flocks, and a surplus begging for a decision.',
    forTag: 'player', once: false, cooldownMonths: 30, chance: 0.03,
    trigger: (ctx) => !!T(ctx),
    aiOption: 0,
    options: [
      {
        label: 'Sell the surplus',
        tooltip: '+60 talents',
        effects: (ctx) => { ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: 60 }); },
      },
      {
        label: 'Open the granaries to the people',
        tooltip: '"Full Bellies": −1 unrest across the realm for 6 months',
        effects: (ctx) => {
          ctx.helpers.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'full_bellies', name: 'Full Bellies', months: 6, effects: { unrestAll: -1 },
          });
        },
      },
    ],
  },
  {
    id: 'gen_drought',
    title: 'The Rains Fail',
    desc: 'The early rains did not come, and the late rains came to nothing. The wells are '
      + 'low, the barley thin, and in the markets men are already naming the price of next '
      + 'year\'s bread.',
    forTag: 'player', once: false, cooldownMonths: 36, chance: 0.025,
    trigger: (ctx) => !!T(ctx),
    aiOption: 0,
    options: [
      {
        label: 'Buy grain abroad',
        tooltip: '−60 talents',
        effects: (ctx) => { ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -60 }); },
      },
      {
        label: 'The people must endure',
        tooltip: '"Hunger": +1.5 unrest across the realm for 12 months',
        effects: (ctx) => {
          ctx.helpers.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'hunger', name: 'Hunger', months: 12, effects: { unrestAll: 1.5 },
          });
        },
      },
    ],
  },
  {
    id: 'gen_plague',
    title: 'Pestilence',
    desc: 'It began at the docks, or in the caravanserai — no two accounts agree. Now the '
      + 'burial societies work by night, and the physicians burn what the sick have touched. '
      + 'One of our great cities is stricken.',
    forTag: 'player', once: false, cooldownMonths: 60, chance: 0.015,
    trigger: (ctx) => ownedProvinces(ctx, (p) => devTotal(p) >= 10).length > 0,
    aiOption: 0,
    options: [
      {
        label: 'Heaven preserve us',
        tooltip: 'A high-development city suffers: −30% production and +2 unrest there for 24 months',
        effects: (ctx) => {
          const p = pickWeighty(ctx, ownedProvinces(ctx, (q) => devTotal(q) >= 10));
          if (!p) return;
          ctx.helpers.addProvinceModifier(ctx, p.name, {
            id: 'pestilence', name: 'Pestilence', months: 24,
            effects: { prodMult: 0.7, unrest: 2 },
          });
          ctx.helpers.notify(ctx, {
            title: 'Pestilence in ' + p.name,
            text: 'The sickness runs through ' + p.name + ': production falters and the streets grow ugly.',
            type: 'bad', provName: p.name,
          });
        },
      },
    ],
  },
  {
    id: 'gen_earthquake',
    title: 'The Earth Shakes',
    desc: 'It lasted the space of three breaths. Walls that stood a hundred years came down '
      + 'in the time it takes to name them, and the dust over the city could be seen from '
      + 'the next valley.',
    forTag: 'player', once: false, cooldownMonths: 90, chance: 0.008,
    trigger: (ctx) => ownedProvinces(ctx).length > 0,
    aiOption: 0,
    options: [
      {
        label: 'Dig them out',
        tooltip: 'A province suffers: −30% tax and +2 unrest for 12 months',
        effects: (ctx) => {
          const p = pickWeighty(ctx, ownedProvinces(ctx));
          if (!p) return;
          ctx.helpers.addProvinceModifier(ctx, p.name, {
            id: 'earthquake', name: 'Earthquake Damage', months: 12,
            effects: { taxMult: 0.7, unrest: 2 },
          });
          ctx.helpers.notify(ctx, {
            title: 'Earthquake at ' + p.name,
            text: p.name + ' is half in ruins; the rebuilding will take a year.',
            type: 'bad', provName: p.name,
          });
        },
      },
    ],
  },

  // ── omens & courts ────────────────────────────────────────────────────────
  {
    id: 'gen_comet',
    title: 'A Sword in the Heavens',
    desc: 'A comet stands over the land, visible even at dusk, its tail like a drawn blade. '
      + 'In the squares the interpreters of signs have already gathered crowds, and every '
      + 'one of them reads it differently — but none of them reads it quietly.',
    forTag: 'player', once: false, cooldownMonths: 48, chance: 0.02,
    trigger: (ctx) => !!T(ctx),
    aiOption: 1,
    options: [
      {
        label: 'It portends doom',
        tooltip: '−1 stability',
        effects: (ctx) => { ctx.helpers.adjust(ctx, ctx.game.playerTag, { stability: -1 }); },
      },
      {
        label: 'Our astrologers reassure the people',
        tooltip: '−10 legitimacy — some call it whitewash',
        effects: (ctx) => { ctx.helpers.adjust(ctx, ctx.game.playerTag, { legitimacy: -10 }); },
      },
    ],
  },
  {
    id: 'gen_corruption',
    title: 'The Missing Talents',
    desc: 'The audit is unambiguous: the treasurers have been weighing with two sets of '
      + 'weights, and the difference has gone into their own houses. Everyone at court '
      + 'knows a name; no one will say one aloud.',
    forTag: 'player', once: false, cooldownMonths: 36, chance: 0.02,
    trigger: (ctx) => { const t = T(ctx); return !!t && t.treasury > 100; },
    aiOption: 0,
    options: [
      {
        label: 'Prosecute them publicly',
        tooltip: '−50 talents in lost revenue during the purge, +5 legitimacy',
        effects: (ctx) => { ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -50, legitimacy: 5 }); },
      },
      {
        label: 'Look away',
        tooltip: '−10 legitimacy — the court notices what the ruler tolerates',
        effects: (ctx) => { ctx.helpers.adjust(ctx, ctx.game.playerTag, { legitimacy: -10 }); },
      },
    ],
  },
  {
    id: 'gen_veteran_commander',
    title: 'A Soldier of Reputation',
    desc: 'He has served under three commanders and outlived them all, and the men speak of '
      + 'him the way soldiers only speak of the ones they would actually follow. He waits in '
      + 'the anteroom with the dust of the road still on him.',
    forTag: 'player', once: false, cooldownMonths: 36, chance: 0.025,
    trigger: (ctx) => ctx.helpers.armiesOf(ctx, ctx.game.playerTag).some((a) => !a.general && a.men >= 3000),
    aiOption: 0,
    options: [
      {
        label: 'Give him a command',
        tooltip: 'Your largest leaderless army gains a general (2/3/2)',
        effects: (ctx) => {
          const armies = ctx.helpers.armiesOf(ctx, ctx.game.playerTag)
            .filter((a) => !a.general).sort((a, b) => b.men - a.men);
          const a = armies[0];
          if (!a) return;
          a.general = {
            name: ctx.rng.pick(['Ezra of the Marches', 'Ammonios the Elder', 'Barzillai', 'Cleon of the Guard', 'Nathan ben Hilkiah', 'Theudas the Scarred']),
            fire: 2, shock: 3, maneuver: 2,
          };
          ctx.helpers.notify(ctx, {
            title: 'A general takes command',
            text: a.general.name + ' takes command of ' + a.name + ' (2/3/2).',
            type: 'good',
          });
        },
      },
      {
        label: 'Reward him and send him home',
        tooltip: '+15 martial points',
        effects: (ctx) => { ctx.helpers.adjust(ctx, ctx.game.playerTag, { mar: 15 }); },
      },
    ],
  },

  // ── peace & prosperity ────────────────────────────────────────────────────
  {
    id: 'gen_border_raid',
    title: 'Raiders on the Frontier',
    desc: 'They came at dusk, took what could be driven or carried, and were gone before '
      + 'the beacon was lit. The frontier villages have sent elders to ask, politely, '
      + 'whether the realm still remembers them.',
    forTag: 'player', once: false, cooldownMonths: 30, chance: 0.025,
    trigger: (ctx) => atPeace(ctx) && ownedProvinces(ctx).length > 0,
    aiOption: 0,
    options: [
      {
        label: 'Pay to rebuild the villages',
        tooltip: '−40 talents',
        effects: (ctx) => { ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -40 }); },
      },
      {
        label: 'The frontier must fend for itself',
        tooltip: 'A border province seethes: +3 unrest there for 12 months',
        effects: (ctx) => {
          const p = pickWeighty(ctx, ownedProvinces(ctx));
          if (!p) return;
          ctx.helpers.addProvinceModifier(ctx, p.name, {
            id: 'raided', name: 'Raided Frontier', months: 12, effects: { unrest: 3 },
          });
          ctx.helpers.notify(ctx, {
            title: 'Raiders strike ' + p.name,
            text: p.name + ' burns while the court debates; its people will remember.',
            type: 'bad', provName: p.name,
          });
        },
      },
    ],
  },
  {
    id: 'gen_pilgrim_season',
    title: 'The Pilgrim Roads Are Full',
    desc: 'From every direction they come — dusty, footsore, singing — to the holy place '
      + 'under our protection. The inns are full, the money-changers busy, and the priests '
      + 'report offerings beyond any recent year.',
    forTag: 'player', once: false, cooldownMonths: 30, chance: 0.03,
    trigger: (ctx) => ownedProvinces(ctx, (p) => !!p.holy && p.controller === ctx.game.playerTag).length > 0,
    aiOption: 0,
    options: [
      {
        label: 'A blessing on the realm',
        tooltip: '+30 talents, +5 legitimacy',
        effects: (ctx) => { ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: 30, legitimacy: 5 }); },
      },
    ],
  },
  {
    id: 'gen_merchant_windfall',
    title: 'A Caravan Comes Through',
    desc: 'A great convoy — silk, incense, worked silver — has chosen our roads over the '
      + 'alternatives, paid its tolls without argument, and let it be known why: the other '
      + 'route has become a den of thieves.',
    forTag: 'player', once: false, cooldownMonths: 30, chance: 0.025,
    trigger: (ctx) => !!T(ctx),
    aiOption: 0,
    options: [
      {
        label: 'Collect the tolls',
        tooltip: '+50 talents',
        effects: (ctx) => { ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: 50 }); },
      },
      {
        label: 'Court the merchant houses',
        tooltip: '+15 influence points',
        effects: (ctx) => { ctx.helpers.adjust(ctx, ctx.game.playerTag, { infl: 15 }); },
      },
    ],
  },
  {
    id: 'gen_games_demanded',
    title: 'The People Expect Games',
    desc: 'A festival day approaches, and with it the old expectation: processions, '
      + 'contests, meat and wine at someone else\'s expense. The city prefects warn that '
      + 'the crowds already assume the answer is yes.',
    forTag: 'player', once: false, cooldownMonths: 30, chance: 0.02,
    trigger: (ctx) => atPeace(ctx),
    aiOption: 0,
    options: [
      {
        label: 'Fund the festivities',
        tooltip: '−50 talents; "Public Joy": −1 unrest across the realm for 6 months',
        effects: (ctx) => {
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -50 });
          ctx.helpers.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'public_joy', name: 'Public Joy', months: 6, effects: { unrestAll: -1 },
          });
        },
      },
      {
        label: 'The treasury is bare',
        tooltip: '−5 legitimacy',
        effects: (ctx) => { ctx.helpers.adjust(ctx, ctx.game.playerTag, { legitimacy: -5 }); },
      },
    ],
  },
  {
    id: 'gen_old_debts',
    title: 'The Moneylenders Send Word',
    desc: 'A deputation of creditors, all courtesy and account-books, begs leave to observe '
      + 'that the realm\'s notes have been outstanding for some time — and offers, for '
      + 'prompt settlement, to forget a portion of the interest.',
    forTag: 'player', once: false, cooldownMonths: 24, chance: 0.03,
    trigger: (ctx) => { const t = T(ctx); return !!t && (t.loans || 0) > 0 && t.treasury >= 100; },
    aiOption: 0,
    options: [
      {
        label: 'Settle one debt at a discount',
        tooltip: '−100 talents, one loan cancelled',
        effects: (ctx) => {
          const t = T(ctx);
          if (!t || (t.loans || 0) <= 0 || t.treasury < 100) return;
          t.treasury -= 100;
          t.loans -= 1;
          ctx.helpers.notify(ctx, {
            title: 'A debt retired',
            text: 'One loan is settled at a discount; ' + t.loans + ' remain.',
            type: 'good',
          });
        },
      },
      {
        label: 'Send them away',
        tooltip: 'Nothing changes — yet',
        effects: () => {},
      },
    ],
  },
];
