// Judaea Universalis — the Gulf strand, 1988–1993.
// Content package: zero imports; all effects run through ctx.helpers.
//
// WHAT THIS REPLACES. `ev_i_gulf_war` fired on 1991-01 if Iraq and Israel were
// both alive, and that was the whole condition. It then applied −60% income,
// −40% manpower and shrank every Iraqi army to 35% of its men. There was no
// coalition, no invasion and no war: the player watched a modifier land. Worse,
// an Iraq that took the 1980 card's second answer and never fought Iran — no
// eight years, no loans, no debt, and therefore no reason on earth to go and
// take somebody's oil — was flattened in 1991 anyway, on the calendar.
//
// The strand below is the causal chain the calendar was standing in for, and
// every link is a condition rather than a date:
//
//   the eight years  →  the debt  →  the wells  →  the coalition  →  the war
//
// Break any link and the rest does not happen. An Iraq that kept the river
// treaty in 1980 never reaches August 1990. An Iraq that fought Iran and then
// accepted its creditors' terms disarms and never reaches November. An Iraq
// that withdraws from the Gulf coast in the autumn gets sanctions and keeps its
// regime. And an Iraq that digs in fights a war that is ACTUALLY FOUGHT — on
// the map, against real armies, with a result nothing in this file decides.
//
// THE COALITION IS THE CAST THIS CHAPTER HAS. There is no USA tag and there
// should not be: the 1948 chapter models Washington off-map, in opinion and in
// cards, which is a deliberate and long-standing choice. The thirty-five states
// assemble here out of the on-map powers that were genuinely in the coalition —
// Saudi Arabia hosting, the United Kingdom, and, which is the part players
// forget, Egypt and Syria, who between them sent some fifty thousand men to
// fight another Arab army. The American weight arrives as what the map can
// actually show: an airfield on the Gulf coast that was not there before, wings
// standing on it, and reinforcement echelons that keep coming for two months.
//
// THE OUTCOME IS NOT WRITTEN DOWN. Iraq broken by force produces the risings
// and the ruin, through a card that asks whether it was broken rather than
// assuming it. Iraq that holds produces a 1990s with a hostile regional power
// intact and everybody's fuel bill doubled, because FUEL.importMult is already
// 2 for a realm holding no oil. Both were interesting; only one used to be
// possible.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_1948_gulf] ' + key, e || '');
}
function guard(key, fn) {
  return function (ctx) { try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); } };
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
function flag(ctx, k) { return !!(ctx.game.flags && ctx.game.flags[k]); }
function tagOf(ctx, t) { return ctx.game.tags && ctx.game.tags[t]; }

function findWar(game, a, b) {
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(a) !== -1 && all.indexOf(b) !== -1) return w;
  }
  return null;
}
function clearEventTruce(ctx, a, b) {
  const g = ctx.game;
  if (!g.truces) return;
  delete g.truces[a < b ? a + '|' + b : b + '|' + a];
}
// Spawn at the first listed province the tag actually controls — fronts move.
function spawnAt(ctx, tag, provNames, opts) {
  for (const n of provNames) {
    if (ctx.helpers.controls(ctx, tag, n)) return ctx.helpers.spawnArmy(ctx, tag, n, opts);
  }
  return null;
}
function unrestAcross(ctx, tag, names, mod) {
  let touched = 0;
  for (const n of names) {
    if (tag && !ctx.helpers.controls(ctx, tag, n)) continue;
    ctx.helpers.addProvinceModifier(ctx, n, mod);
    touched++;
  }
  return touched;
}
function setOpinionDelta(game, a, b, delta) {
  try {
    const ta = game.tags && game.tags[a];
    if (!ta) return;
    if (!ta.opinion || typeof ta.opinion !== 'object') ta.opinion = {};
    ta.opinion[b] = Math.max(-200, Math.min(200, (ta.opinion[b] || 0) + delta));
  } catch (e) { warnOnce('setOpinionDelta', e); }
}

const IRAQ_CORE = ['Seleucia-Ctesiphon', 'Babylon', 'Charax', 'Uruk', 'Assur', 'Arbela',
  'Hatra', 'Singara', 'Nehardea'];
const IRAN_CORE = ['Ecbatana', 'Susa', 'Persepolis'];
const GULF_COAST = ['Gerrha'];
// The Shia south and the Kurdish north — the two halves of Iraq that rose in
// 1991, and the two halves Baghdad could never safely arm against Iran.
const IRAQ_MARGINS = ['Charax', 'Uruk', 'Arbela'];

// How many of a list a tag currently holds.
function holdsCount(ctx, tag, names) {
  let n = 0;
  for (const name of names) {
    try { if (ctx.helpers.controls(ctx, tag, name)) n++; } catch (e) { /* fail soft */ }
  }
  return n;
}
// Is a capital in the wrong hands? The cease-fire clock turns on exactly this.
function capitalTaken(ctx, ownerTag, capital) {
  try {
    const p = ctx.prov(capital);
    return !!p && p.controller && p.controller !== ownerTag;
  } catch (e) { return false; }
}

// Baghdad's books. The whole strand hangs off this: the eight years were paid
// for with Gulf loans, the loans are the reason for Kuwait, and `t.loans` is a
// real number the realm panel prints and the economy charges 3 talents a month
// for. A card that says the debt is why should move the debt.
function baghdadIsBroke(ctx) {
  const t = tagOf(ctx, 'IRQ');
  if (!t) return false;
  return (Number(t.loans) || 0) >= 3 || (Number(t.treasury) || 0) < -150;
}

// The coalition's forward field. There was no airfield on the Gulf coast in
// 1948 and there is none in the bookmark; building one is the most visible
// thing the buildup does, and it is what actually happened at Dhahran.
function seedAirfield(ctx, provName) {
  try {
    const p = ctx.prov(provName);
    if (!p) return false;
    if (!Array.isArray(p.buildings)) p.buildings = [];
    if (p.buildings.indexOf('airfield') < 0) p.buildings.push('airfield');
    return true;
  } catch (e) { warnOnce('seedAirfield:' + provName, e); return false; }
}

export const EVENTS_1948_GULF = [

  // ── 1988: how the eight years end ────────────────────────────────────────
  {
    id: 'ev_g_the_river_holds',
    title: 'A Cease-Fire on the Starting Line',
    worldLabel: 'The Iran–Iraq war ends where it began',
    desc: 'Eight years, a million casualties, trench lines out of a different '
      + 'century, gas on the marshes, and the frontier is where it was in September '
      + '1980. Tehran calls the resolution a cup of poison and drinks it. Baghdad '
      + 'declares a victory and holds a parade. What Baghdad actually has is the '
      + 'largest army in the region, an officer corps that has learned its trade, and '
      + 'a debt to the Gulf monarchies that it can neither pay nor politely mention — '
      + 'and the men who lent the money are beginning to ask when.',
    forTag: 'both',
    date: { y: 1988, m: 8 },
    world: true,
    major: true,
    when: safeTrigger('ev_g_the_river_holds:when', (ctx) =>
      flag(ctx, 'iranIraqWar') && !flag(ctx, 'iranIraqEnded')
      && alive(ctx, 'IRQ') && alive(ctx, 'IRN')
      && !capitalTaken(ctx, 'IRQ', 'Seleucia-Ctesiphon')
      && !capitalTaken(ctx, 'IRN', 'Ecbatana')),
    decider: 'IRQ',
    aiOption: 0,
    options: [
      {
        label: 'Accept the resolution',
        tooltip: 'The war ends on the line it started from. Both states lose The Longest War; Iraq keeps the debt (its loans stand, at 3 talents a month each) and gains The Army That Won Nothing — +15% force limit, +10% army power, −10% income — and the creditors begin to ask.',
        effects: guard('ev_g_the_river_holds:0', (ctx) => {
          const g = ctx.game;
          const h = ctx.helpers;
          h.endWar(ctx, 'IRQ', 'IRN', null);
          for (const t of ['IRQ', 'IRN']) {
            if (alive(ctx, t)) h.removeModifier(ctx, t, 'the_longest_war');
          }
          if (alive(ctx, 'IRQ')) {
            h.addTagModifier(ctx, 'IRQ', {
              id: 'the_army_that_won_nothing', name: 'The Army That Won Nothing', months: -1,
              effects: { forceLimitMult: 1.15, milPowerMult: 1.10, incomeMult: 0.90 },
            });
          }
          if (alive(ctx, 'IRN')) {
            h.addTagModifier(ctx, 'IRN', {
              id: 'the_cup_of_poison', name: 'The Cup of Poison', months: 120,
              effects: { manpowerMult: 0.85, unrestAll: 1, incomeMult: 0.92 },
            });
          }
          g.flags.iranIraqEnded = true;
          h.chronicle(ctx, 'war', 'The longest war of the century ends on the line it started from; Baghdad keeps the army and the debt, and the men who lent the money begin to ask when.');
        }),
      },
      {
        label: 'One more season on the marshes',
        tooltip: 'The war runs on: Iraq takes 2 more loans (6 talents a month, forever, until repaid) and +1 war exhaustion, Iran −1 stability. The cease-fire question returns in two years — and so does everything that follows from the debt, only larger.',
        effects: guard('ev_g_the_river_holds:1', (ctx) => {
          const h = ctx.helpers;
          const t = tagOf(ctx, 'IRQ');
          if (t) t.loans = Math.min(5, (Number(t.loans) || 0) + 2);
          if (alive(ctx, 'IRQ')) h.adjust(ctx, 'IRQ', { warExhaustion: 1 });
          if (alive(ctx, 'IRN')) h.adjust(ctx, 'IRN', { stability: -1 });
          h.chronicle(ctx, 'war', 'Baghdad refuses the resolution and buys another season on the marshes with money it does not have.');
        }),
      },
    ],
  },

  {
    id: 'ev_g_the_line_broken',
    title: 'The Line Broken',
    worldLabel: 'One capital falls: the long war is decided',
    desc: 'The thing neither side managed in eight years has happened: a capital has '
      + 'changed hands, and the war that was supposed to end on its own starting line '
      + 'has ended somewhere else entirely. Whatever settlement follows, the region '
      + 'that comes out of this decade is not the one the chronicles describe — the '
      + 'balance that held the Gulf in place from 1988 to 2003 was precisely that '
      + 'neither of these two could finish the other.',
    forTag: 'both',
    date: { y: 1988, m: 8 },
    world: true,
    major: true,
    when: safeTrigger('ev_g_the_line_broken:when', (ctx) =>
      flag(ctx, 'iranIraqWar') && !flag(ctx, 'iranIraqEnded')
      && (capitalTaken(ctx, 'IRQ', 'Seleucia-Ctesiphon') || capitalTaken(ctx, 'IRN', 'Ecbatana'))),
    decider: 'IRQ',
    aiOption: 0,
    options: [
      {
        label: 'Let the victor have the settlement',
        tooltip: 'The Longest War lifts from both. The winner takes The Gulf Decided — +20% income, +10% force limit, permanent — and the strand flag is set, so the 1990s play from a Gulf with one power in it instead of two. There is no coalition war in this world, because the debt that produced it was paid in ground.',
        effects: guard('ev_g_the_line_broken:0', (ctx) => {
          const g = ctx.game;
          const h = ctx.helpers;
          const iraqBroken = capitalTaken(ctx, 'IRQ', 'Seleucia-Ctesiphon');
          const victor = iraqBroken ? 'IRN' : 'IRQ';
          for (const t of ['IRQ', 'IRN']) {
            if (alive(ctx, t)) h.removeModifier(ctx, t, 'the_longest_war');
          }
          if (alive(ctx, victor)) {
            h.addTagModifier(ctx, victor, {
              id: 'the_gulf_decided', name: 'The Gulf Decided', months: -1,
              effects: { incomeMult: 1.20, forceLimitMult: 1.10 },
            });
            h.adjust(ctx, victor, { legitimacy: 20 });
          }
          g.flags.iranIraqEnded = true;
          g.flags.gulfDecided = victor;
          h.chronicle(ctx, 'war', 'The long war does not end on its starting line: a capital falls, and the Gulf comes out of the decade with one power in it rather than two.');
        }),
      },
    ],
  },

  // ── the ceiling on how far Baghdad can push ──────────────────────────────
  {
    id: 'ev_g_the_shia_south',
    title: 'The Army Is Not the Country',
    worldLabel: 'Iraq overreaches inside Iran',
    desc: 'The divisions are across the mountains and holding ground, and the reports '
      + 'coming back from the rear areas are about the rear areas. The conscripts '
      + 'holding the line in Iran are largely from the south, and the south is being '
      + 'preached at nightly by the government they are standing in front of. The '
      + 'staff has quietly stopped moving southern units to the northern front and '
      + 'northern units south, which solves one problem by writing down another: '
      + 'Baghdad has an army it cannot fully use in a country it cannot fully hold.',
    forTag: 'both',
    world: true,
    major: true,
    when: safeTrigger('ev_g_the_shia_south:when', (ctx) =>
      flag(ctx, 'iranIraqWar') && !flag(ctx, 'iranIraqEnded') && !flag(ctx, 'iraqOverreached')
      && alive(ctx, 'IRQ') && alive(ctx, 'IRN')
      && holdsCount(ctx, 'IRQ', IRAN_CORE) >= 2),
    minYear: 1980, maxYear: 1990,
    decider: 'IRQ',
    aiOption: 0,
    options: [
      {
        label: 'Hold what we have taken',
        tooltip: 'The ground stays Iraqi and the price is the rear: Overreached — −20% reinforcement, −15% morale, +2 unrest everywhere, permanent while the war runs — and Basra, Kirkuk and Uruk take +2 unrest for 60 months. The occupation is a real cost, not a line of prose.',
        effects: guard('ev_g_the_shia_south:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'IRQ', {
            id: 'overreached', name: 'Overreached', months: -1,
            effects: { reinforceMult: 0.80, moraleMult: 0.85, unrestAll: 2 },
          });
          unrestAcross(ctx, 'IRQ', IRAQ_MARGINS, {
            id: 'the_margins_listen', name: 'The Margins Are Listening', months: 60,
            effects: { unrest: 2 },
          });
          ctx.game.flags.iraqOverreached = true;
          h.chronicle(ctx, 'war', 'Baghdad holds its gains inside Iran and pays for them at home: the conscripts on the line are from the south, and the south is being preached at nightly.');
        }),
      },
      {
        label: 'Pull back to the frontier and dig',
        tooltip: 'The gains go back: every Iraqi-held Iranian province reverts, and Iraq takes The Defensive Line — +15% siege defence via morale, −10% army power, no unrest. Baghdad keeps its country and loses its war aims, which is what actually happened.',
        effects: guard('ev_g_the_shia_south:1', (ctx) => {
          const h = ctx.helpers;
          for (const name of IRAN_CORE) {
            try {
              const p = ctx.prov(name);
              if (p && p.controller === 'IRQ' && p.owner !== 'IRQ') h.changeController(ctx, name, p.owner);
            } catch (e) { warnOnce('pullback:' + name, e); }
          }
          h.addTagModifier(ctx, 'IRQ', {
            id: 'the_defensive_line', name: 'The Defensive Line', months: -1,
            effects: { moraleMult: 1.15, milPowerMult: 0.90 },
          });
          ctx.game.flags.iraqOverreached = true;
          h.chronicle(ctx, 'war', 'Baghdad gives back the ground and digs in on the frontier; the war becomes what it will stay, which is a siege eight years long.');
        }),
      },
    ],
  },

  // ── August 1990: the wells ───────────────────────────────────────────────
  {
    id: 'ev_g_the_wells',
    title: 'The Wells',
    worldLabel: 'Baghdad moves on the Gulf oil coast',
    desc: 'The creditors have named a figure and a schedule. Baghdad\'s answer, '
      + 'delivered in a speech and then in a note, is that the eight years were fought '
      + 'on the Gulf\'s behalf against a revolution that would have eaten all of them, '
      + 'that the debt is therefore not a debt but a contribution, and that in any case '
      + 'the coast has been overproducing and driving the price down, which is a form '
      + 'of war. Every one of those arguments is an argument for going and taking the '
      + 'wells, and the army that has nothing else to do is already at the assembly '
      + 'areas.',
    historical: 'Iraq emerged from 1988 owing some $80 billion, much of it to Kuwait and Saudi Arabia, and invaded Kuwait on 2 August 1990 with the debt, the price of oil and the Rumaila field as its stated grievances.',
    forTag: 'both',
    date: { y: 1990, m: 8 },
    world: true,
    major: true,
    when: safeTrigger('ev_g_the_wells:when', (ctx) =>
      flag(ctx, 'iranIraqWar') && alive(ctx, 'IRQ') && alive(ctx, 'SAU')
      && !flag(ctx, 'iraqDisarmed') && !flag(ctx, 'gulfDecided')
      && baghdadIsBroke(ctx)),
    decider: 'IRQ',
    aiOption: 0,
    options: [
      {
        label: 'Take the coast',
        tooltip: 'Iraq declares war on Saudi Arabia and puts an armoured corps on the Gulf coast at Gerrha. Baghdad\'s fuel problem ends: The Wells (+35% income, no import multiplier). Everybody else\'s begins — every realm holding no oil pays the doubled fuel bill already in the rules. This is the road to the coalition.',
        effects: guard('ev_g_the_wells:0', (ctx) => {
          const g = ctx.game;
          const h = ctx.helpers;
          clearEventTruce(ctx, 'IRQ', 'SAU');
          if (!findWar(g, 'IRQ', 'SAU')) h.declareWar(ctx, 'IRQ', 'SAU', 'The Wells');
          spawnAt(ctx, 'IRQ', ['Charax', 'Uruk', 'Babylon'], {
            inf: 6, cav: 8, name: 'The Republican Guard',
            general: { name: 'Ayad Futayyih al-Rawi', fire: 3, shock: 4, maneuver: 3 },
          });
          h.addTagModifier(ctx, 'IRQ', {
            id: 'the_wells', name: 'The Wells', months: -1,
            effects: { incomeMult: 1.35 },
          });
          g.flags.kuwaitTaken = true;
          h.chronicle(ctx, 'war', 'The Republican Guard goes down the coast road for the wells, and the argument that the debt was never a debt is settled by taking the money.');
        }),
      },
      {
        label: 'Demand the debt be forgiven instead',
        tooltip: 'No war. Iraq stays broke and dangerous: the loans stand, +1 stability from the climb-down avoided, and Riyadh cools 30. The demand returns in three years, with the army three years older and the books three years worse.',
        effects: guard('ev_g_the_wells:1', (ctx) => {
          const g = ctx.game;
          const h = ctx.helpers;
          h.adjust(ctx, 'IRQ', { stability: 1 });
          if (alive(ctx, 'SAU')) setOpinionDelta(g, 'SAU', 'IRQ', -30);
          g.flags.iraqDemandedForgiveness = true;
          h.chronicle(ctx, 'diplomacy', 'Baghdad asks for the debt to be struck out rather than taking the wells; the Gulf says it will consider the matter, which is a way of saying no slowly.');
        }),
      },
      {
        label: 'Accept the schedule and cut the army',
        tooltip: 'Iraq pays: 2 loans cleared, −30% force limit and −20% army power permanently, +2 stability, and Riyadh warms 30. There is no invasion, no coalition and no 1991 — Iraq comes out of the century poor, intact, and no longer the largest army in the region.',
        effects: guard('ev_g_the_wells:2', (ctx) => {
          const g = ctx.game;
          const h = ctx.helpers;
          const t = tagOf(ctx, 'IRQ');
          if (t) t.loans = Math.max(0, (Number(t.loans) || 0) - 2);
          h.adjust(ctx, 'IRQ', { stability: 2 });
          h.addTagModifier(ctx, 'IRQ', {
            id: 'the_schedule_accepted', name: 'The Schedule Accepted', months: -1,
            effects: { forceLimitMult: 0.70, milPowerMult: 0.80 },
          });
          if (alive(ctx, 'SAU')) setOpinionDelta(g, 'SAU', 'IRQ', 30);
          g.flags.iraqDisarmed = true;
          h.chronicle(ctx, 'diplomacy', 'Baghdad accepts the creditors\' schedule and takes the cuts out of the army; the largest force in the region is demobilized by an accountant.');
        }),
      },
    ],
  },

  {
    id: 'ev_g_the_creditors_answer',
    title: 'The Creditors Answer',
    worldLabel: 'The Gulf declines to strike out Baghdad\'s debt',
    desc: 'Three years of considering the matter have produced a reply, and the reply '
      + 'is a restated schedule with interest. The army is three years older, the '
      + 'officers who fought the eight years are three years more expensive to keep '
      + 'idle, and the argument that was available in 1990 is still available — with '
      + 'the difference that everyone has now had three years to think about whether '
      + 'Baghdad would really do it.',
    forTag: 'both',
    date: { y: 1993, m: 8 },
    world: true,
    major: true,
    when: safeTrigger('ev_g_the_creditors_answer:when', (ctx) =>
      flag(ctx, 'iraqDemandedForgiveness') && !flag(ctx, 'kuwaitTaken')
      && !flag(ctx, 'iraqDisarmed') && alive(ctx, 'IRQ') && alive(ctx, 'SAU')),
    decider: 'IRQ',
    aiOption: 1,
    options: [
      {
        label: 'Take the coast after all',
        tooltip: 'As 1990, three years late: war with Saudi Arabia, an armoured corps at Gerrha, and The Wells (+35% income). The coalition assembles the same way — it is the invasion that summons it, not the year.',
        effects: guard('ev_g_the_creditors_answer:0', (ctx) => {
          const g = ctx.game;
          const h = ctx.helpers;
          clearEventTruce(ctx, 'IRQ', 'SAU');
          if (!findWar(g, 'IRQ', 'SAU')) h.declareWar(ctx, 'IRQ', 'SAU', 'The Wells');
          spawnAt(ctx, 'IRQ', ['Charax', 'Uruk', 'Babylon'], {
            inf: 6, cav: 8, name: 'The Republican Guard',
            general: { name: 'Ayad Futayyih al-Rawi', fire: 3, shock: 4, maneuver: 3 },
          });
          h.addTagModifier(ctx, 'IRQ', {
            id: 'the_wells', name: 'The Wells', months: -1, effects: { incomeMult: 1.35 },
          });
          g.flags.kuwaitTaken = true;
          h.chronicle(ctx, 'war', 'Three years after asking, Baghdad stops asking.');
        }),
      },
      {
        label: 'Live with it',
        tooltip: 'Iraq settles into the decade broke: The Sanctions Decade — −25% income, −15% manpower, +1 unrest everywhere, permanent. No invasion and no coalition; a hostile, impoverished, intact regime, which is its own kind of 1990s.',
        effects: guard('ev_g_the_creditors_answer:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'IRQ', {
            id: 'the_sanctions_decade', name: 'The Sanctions Decade', months: -1,
            effects: { incomeMult: 0.75, manpowerMult: 0.85, unrestAll: 1 },
          });
          ctx.game.flags.iraqDisarmed = true;
          h.chronicle(ctx, 'diplomacy', 'Baghdad lives with the schedule; the decade closes on a poor, hostile, intact Iraq that nobody has had to fight.');
        }),
      },
    ],
  },

  // ── autumn 1990: the coalition ───────────────────────────────────────────
  {
    id: 'ev_g_thirty_five_states',
    title: 'Thirty-Five States',
    worldLabel: 'The coalition assembles on the Gulf coast',
    desc: 'What is arriving in the Saudi desert is not a protest. An airfield is being '
      + 'laid down on the coast that was not there in the summer, wings are standing on '
      + 'it, and the ships are still unloading. The politically remarkable part is the '
      + 'flags: Egypt has sent two divisions and Syria an armoured brigade, which means '
      + 'the coalition that is going to fight an Arab army is substantially an Arab '
      + 'army. There is a deadline in the resolution and it is public, which is the '
      + 'point of it — Baghdad is being shown the bill before it is presented.',
    historical: 'Thirty-five states contributed; Egypt sent some 35,000 troops and Syria some 14,500, and the buildup at Dhahran and elsewhere ran from August 1990 to the January deadline.',
    forTag: 'both',
    date: { y: 1990, m: 11 },
    world: true,
    major: true,
    when: safeTrigger('ev_g_thirty_five_states:when', (ctx) =>
      flag(ctx, 'kuwaitTaken') && !flag(ctx, 'coalitionWar') && alive(ctx, 'IRQ') && alive(ctx, 'SAU')),
    decider: 'IRQ',
    aiOption: 1,
    options: [
      {
        label: 'Withdraw from the coast',
        tooltip: 'Iraq gives back Gerrha and the war with Riyadh ends. No hundred hours: instead The Sanctions Decade (−25% income, −15% manpower, +1 unrest everywhere, permanent), The Wells lifts, and the regime survives intact and hostile. Every capital in the cast cools 25.',
        effects: guard('ev_g_thirty_five_states:0', (ctx) => {
          const g = ctx.game;
          const h = ctx.helpers;
          for (const name of GULF_COAST) {
            try {
              const p = ctx.prov(name);
              if (p && p.controller === 'IRQ' && p.owner !== 'IRQ') h.changeController(ctx, name, p.owner);
            } catch (e) { warnOnce('withdraw:' + name, e); }
          }
          h.endWar(ctx, 'IRQ', 'SAU', null);
          h.removeModifier(ctx, 'IRQ', 'the_wells');
          h.addTagModifier(ctx, 'IRQ', {
            id: 'the_sanctions_decade', name: 'The Sanctions Decade', months: -1,
            effects: { incomeMult: 0.75, manpowerMult: 0.85, unrestAll: 1 },
          });
          for (const t of ['SAU', 'UK', 'TUR', 'EGY', 'SYR', 'ISR']) {
            if (alive(ctx, t)) setOpinionDelta(g, t, 'IRQ', -25);
          }
          g.flags.iraqWithdrew = true;
          h.chronicle(ctx, 'diplomacy', 'Baghdad comes back off the coast before the deadline; there is no hundred hours, and there is no end to the sanctions either.');
        }),
      },
      {
        label: 'Dig in on the coast',
        tooltip: 'The coalition goes to war: the United Kingdom, Egypt and Syria join Riyadh, an airfield rises at Gerrha with two wings on it, and three corps deploy in Saudi territory — with more arriving in December. Iraq digs: +25% siege defence via morale, +1 war exhaustion. Nothing after this is scripted; the war is fought on the map.',
        effects: guard('ev_g_thirty_five_states:1', (ctx) => {
          const g = ctx.game;
          const h = ctx.helpers;
          if (!findWar(g, 'IRQ', 'SAU')) {
            clearEventTruce(ctx, 'IRQ', 'SAU');
            h.declareWar(ctx, 'IRQ', 'SAU', 'The Coalition');
          }
          for (const t of ['UK', 'EGY', 'SYR']) {
            if (!alive(ctx, t)) continue;
            clearEventTruce(ctx, t, 'IRQ');
            if (!findWar(g, t, 'IRQ')) h.declareWar(ctx, t, 'IRQ', 'The Coalition');
          }
          // The forward field, and the wings that make the ring mean something.
          const field = ['Gerrha', 'Dumatha', 'Tayma'].find((n) => {
            try { return ctx.helpers.controls(ctx, 'SAU', n); } catch (e) { return false; }
          });
          if (field && seedAirfield(ctx, field)) {
            h.spawnAirWing(ctx, 'SAU', field, { name: 'Coalition Air Component' });
            if (alive(ctx, 'UK')) h.spawnAirWing(ctx, 'UK', field, { name: 'No. 617 Squadron' });
          }
          spawnAt(ctx, 'SAU', ['Dumatha', 'Tayma', 'Yathrib'], {
            inf: 6, cav: 4, name: 'Joint Forces Command North',
            general: { name: 'Khalid bin Sultan', fire: 3, shock: 3, maneuver: 3 },
          });
          if (alive(ctx, 'EGY')) {
            spawnAt(ctx, 'SAU', ['Dumatha', 'Tayma', 'Yathrib'], {
              inf: 8, cav: 3, name: 'II Egyptian Corps',
              general: { name: 'Salah Halaby', fire: 3, shock: 3, maneuver: 2 },
            });
          }
          if (alive(ctx, 'UK')) {
            spawnAt(ctx, 'SAU', ['Dumatha', 'Tayma', 'Yathrib'], {
              inf: 3, cav: 6, name: '1st Armoured Division',
              general: { name: 'Rupert Smith', fire: 4, shock: 4, maneuver: 4 },
            });
          }
          h.addTagModifier(ctx, 'IRQ', {
            id: 'dug_in_on_the_coast', name: 'Dug In on the Coast', months: -1,
            effects: { moraleMult: 1.25, reinforceMult: 0.85 },
          });
          h.adjust(ctx, 'IRQ', { warExhaustion: 1 });
          g.flags.coalitionWar = true;
          h.chronicle(ctx, 'war', 'The deadline passes with the Republican Guard still on the coast, and the thirty-five states stop assembling and start moving.');
        }),
      },
    ],
  },

  {
    id: 'ev_g_the_second_echelon',
    title: 'The Second Echelon',
    worldLabel: 'The coalition buildup continues',
    desc: 'The ships have not stopped. Another armoured division is ashore, the wings '
      + 'on the coast have doubled, and the staff work has moved from whether to where. '
      + 'Baghdad\'s own reinforcement is a different arithmetic: the divisions exist, '
      + 'but the fuel to move them is being bought abroad at twice the price, because '
      + 'the wells that were supposed to solve that are the ground being fought over.',
    forTag: 'both',
    date: { y: 1990, m: 12 },
    world: true,
    when: safeTrigger('ev_g_the_second_echelon:when', (ctx) =>
      flag(ctx, 'coalitionWar') && alive(ctx, 'IRQ') && alive(ctx, 'SAU')
      && !!findWar(ctx.game, 'IRQ', 'SAU')),
    decider: 'SAU',
    aiOption: 0,
    options: [
      {
        label: 'Land the second echelon',
        tooltip: 'Two more coalition corps come ashore and two more wings stand up on the Gulf field; the coalition takes Overwhelming Force (+15% army power, +20% reinforcement) for four years. Iraq is not touched by this card — what it does about it is the war.',
        effects: guard('ev_g_the_second_echelon:0', (ctx) => {
          const h = ctx.helpers;
          const field = ['Gerrha', 'Dumatha', 'Tayma'].find((n) => {
            try { return ctx.helpers.controls(ctx, 'SAU', n); } catch (e) { return false; }
          });
          if (field) {
            seedAirfield(ctx, field);
            h.spawnAirWing(ctx, 'SAU', field, { name: 'Coalition Strike Component' });
          }
          spawnAt(ctx, 'SAU', ['Dumatha', 'Tayma', 'Yathrib'], {
            inf: 4, cav: 7, name: 'VII Corps',
            general: { name: 'Frederick Franks', fire: 4, shock: 4, maneuver: 4 },
          });
          if (alive(ctx, 'SYR')) {
            spawnAt(ctx, 'SAU', ['Dumatha', 'Tayma', 'Yathrib'], {
              inf: 5, cav: 2, name: '9th Armoured Division',
              general: { name: 'Ali Habib', fire: 2, shock: 3, maneuver: 2 },
            });
          }
          for (const t of ['SAU', 'UK', 'EGY', 'SYR']) {
            if (!alive(ctx, t)) continue;
            h.addTagModifier(ctx, t, {
              id: 'overwhelming_force', name: 'Overwhelming Force', months: 48,
              effects: { milPowerMult: 1.15, reinforceMult: 1.20 },
            });
          }
          h.chronicle(ctx, 'war', 'The second echelon comes ashore; the staff work moves from whether to where.');
        }),
      },
    ],
  },

  // ── the aftermath, asked rather than assumed ─────────────────────────────
  {
    id: 'ev_g_the_risings',
    title: 'The Risings',
    worldLabel: 'Iraq broken: the south and the north rise',
    desc: 'The army that came back from the coast came back in pieces and on foot, and '
      + 'the people who watched it come back have drawn the obvious conclusion. The '
      + 'south went first and the north followed within the week. What decides this is '
      + 'not the rising but the helicopters: the cease-fire that ended the fighting '
      + 'said nothing about rotary aircraft, and there is no longer anybody in the '
      + 'sky over the marshes to say otherwise.',
    historical: 'The 1991 uprisings followed the coalition cease-fire; sixteen of Iraq\'s eighteen governorates fell before the surviving helicopter fleet put them down.',
    forTag: 'both',
    world: true,
    major: true,
    minYear: 1991, maxYear: 1999,
    when: safeTrigger('ev_g_the_risings:when', (ctx) => {
      if (!flag(ctx, 'coalitionWar') || flag(ctx, 'gulfRisings')) return false;
      if (!alive(ctx, 'IRQ')) return false;
      const t = tagOf(ctx, 'IRQ');
      if (!t) return false;
      // Broken by force, asked as a question: the coalition is standing on
      // Iraqi ground, or Baghdad's own war exhaustion has run out the string.
      const occupied = ['SAU', 'UK', 'EGY', 'SYR'].some((c) => holdsCount(ctx, c, IRAQ_CORE) >= 1);
      return occupied || (Number(t.warExhaustion) || 0) >= 12;
    }),
    decider: 'IRQ',
    aiOption: 0,
    options: [
      {
        label: 'Put them down with what is left',
        tooltip: 'Iraq survives and the margins do not: −2 stability, −20 legitimacy, After the Hundred Hours (−45% income, −30% manpower, +1.5 unrest everywhere, permanent), and Basra, Kirkuk and Uruk take +2 unrest for 60 months. The regime is intact and the country is not.',
        effects: guard('ev_g_the_risings:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'IRQ', { stability: -2, legitimacy: -20 });
          h.addTagModifier(ctx, 'IRQ', {
            id: 'after_the_hundred_hours', name: 'After the Hundred Hours', months: -1,
            effects: { incomeMult: 0.55, manpowerMult: 0.70, unrestAll: 1.5 },
          });
          unrestAcross(ctx, 'IRQ', IRAQ_MARGINS, {
            id: 'the_risings_of_91', name: 'The Risings of \'91', months: 60,
            effects: { unrest: 2 },
          });
          ctx.game.flags.gulfRisings = true;
          h.chronicle(ctx, 'war', 'The south rose and the north followed, and the helicopters the cease-fire forgot to mention put both of them down.');
        }),
      },
      {
        label: 'The army will not fire on the marshes',
        tooltip: 'The rising is not suppressed: Iraq loses control of Basra, Kirkuk and Uruk to the rebels, −3 stability and −30 legitimacy, but the state that survives is smaller and quieter — The Rump (−30% income, −1 unrest everywhere). A genuinely different 1990s, and one the sources did not get.',
        effects: guard('ev_g_the_risings:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'IRQ', { stability: -3, legitimacy: -30 });
          for (const name of IRAQ_MARGINS) {
            try {
              if (ctx.helpers.controls(ctx, 'IRQ', name)) h.changeController(ctx, name, 'REB');
            } catch (e) { warnOnce('rising:' + name, e); }
          }
          h.addTagModifier(ctx, 'IRQ', {
            id: 'the_rump', name: 'The Rump', months: -1,
            effects: { incomeMult: 0.70, unrestAll: -1 },
          });
          ctx.game.flags.gulfRisings = true;
          ctx.game.flags.iraqRump = true;
          h.chronicle(ctx, 'war', 'The order to fire on the marshes is given and not obeyed; what is left of Iraq is smaller, quieter, and no longer the country that invaded anybody.');
        }),
      },
    ],
  },

  {
    id: 'ev_g_the_regime_holds',
    title: 'The Regime Holds',
    worldLabel: 'Iraq survives the coalition intact',
    desc: 'The coalition went home. Not beaten — nobody in the Gulf would use the '
      + 'word — but the ground it wanted was still held when the political clock ran '
      + 'out, and a war fought by thirty-five governments is a war fought on thirty-five '
      + 'domestic calendars. Baghdad has the wells, the army it started with, and the '
      + 'only thing it never had before, which is the demonstrated fact that it can be '
      + 'attacked by everybody at once and still be there in the morning.',
    forTag: 'both',
    world: true,
    major: true,
    minYear: 1992, maxYear: 1999,
    when: safeTrigger('ev_g_the_regime_holds:when', (ctx) => {
      if (!flag(ctx, 'coalitionWar') || flag(ctx, 'gulfRisings') || flag(ctx, 'gulfHeld')) return false;
      if (!alive(ctx, 'IRQ')) return false;
      // Nobody is standing on Iraqi ground, and Iraq still holds the coast.
      const occupied = ['SAU', 'UK', 'EGY', 'SYR'].some((c) => holdsCount(ctx, c, IRAQ_CORE) >= 1);
      return !occupied && holdsCount(ctx, 'IRQ', GULF_COAST) >= 1;
    }),
    decider: 'IRQ',
    aiOption: 0,
    options: [
      {
        label: 'The wells are ours',
        tooltip: 'Iraq keeps the coast: +30 legitimacy, +2 stability, and The Power That Held — +15% army power, +10% force limit, permanent. Every capital in the cast cools 30 and the region enters the 1990s with a hostile power sitting on the oil. This is the alternate history the old card could not produce.',
        effects: guard('ev_g_the_regime_holds:0', (ctx) => {
          const g = ctx.game;
          const h = ctx.helpers;
          h.adjust(ctx, 'IRQ', { legitimacy: 30, stability: 2 });
          h.addTagModifier(ctx, 'IRQ', {
            id: 'the_power_that_held', name: 'The Power That Held', months: -1,
            effects: { milPowerMult: 1.15, forceLimitMult: 1.10 },
          });
          for (const t of ['SAU', 'UK', 'TUR', 'EGY', 'SYR', 'ISR']) {
            if (alive(ctx, t)) setOpinionDelta(g, t, 'IRQ', -30);
          }
          g.flags.gulfHeld = true;
          h.chronicle(ctx, 'war', 'The coalition\'s clock runs out before Baghdad\'s does; the wells stay Iraqi, and the region enters the decade with a hostile power sitting on the oil.');
        }),
      },
    ],
  },
];
