// Headless regression — SPEC §57: pacts, trade agreements, and matériel.
// Bloc exclusivity, monthly funding through the ledger, lapse-on-neglect,
// and buying re-equipment from a power's depots.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { incomeBreakdown, explainIncome } = await import(R + '/js/sim/economy.js');
const {
  standingOf, signPactCore, leavePactCore, signTradeCore, askPowerCore,
  monthlyPowers, powerFlows, hasPact, hasTrade,
} = await import(R + '/js/sim/powers.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, (_, i) => {
    const s = new Set();
    if (i > 1) s.add(i - 1);
    if (i >= 1 && i < N) s.add(i + 1);
    return s;
  }),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [],
};

function boot(bookmark, playerTag, seed = 57) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events: [] });
  return { game, ctx, actions: gameActions(ctx) };
}

console.log('== the blocs are exclusive ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  standingOf(ctx, 'USA', 'ISR');
  const low = signPactCore(ctx, 'ISR', 'USA');
  ok(!low.ok && /standing is too low/.test(low.why), 'no pact below the bar');
  game.powers.USA.s.ISR = 80;
  game.powers.USSR.s.ISR = 80;
  const signed = signPactCore(ctx, 'ISR', 'USA');
  ok(signed.ok && hasPact(ctx, 'USA', 'ISR'), 'the American alignment is signed');
  ok(standingOf(ctx, 'USSR', 'ISR') === 60, 'Moscow takes it badly (-20)');
  ok((game.tags.ISR.modifiers || []).some((m) => m.id === 'power_pact_USA' && m.months === -1),
    'the pact mounts its permanent modifier');
  const cross = signPactCore(ctx, 'ISR', 'USSR');
  ok(!cross.ok && /one bloc at a time/.test(cross.why),
    'the rival bloc is barred while the pact stands: ' + cross.why);
  const left = leavePactCore(ctx, 'ISR', 'USA');
  ok(left.ok && !hasPact(ctx, 'USA', 'ISR')
      && !(game.tags.ISR.modifiers || []).some((m) => m.id === 'power_pact_USA'),
    'walking out removes pact and modifier');
  ok(standingOf(ctx, 'USA', 'ISR') === 70, 'and Washington remembers (-10)');
}

console.log('== funding flows through the ledger ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  standingOf(ctx, 'USA', 'ISR');
  const base = incomeBreakdown(ctx, 'ISR');
  ok(!(base.powerIn > 0), 'no flows before any agreement');
  game.powers.USA.s.ISR = 80;
  signTradeCore(ctx, 'ISR', 'USA');
  signPactCore(ctx, 'ISR', 'USA');
  const bd = incomeBreakdown(ctx, 'ISR');
  ok(bd.powerIn === 13, 'pact funding (8) + dollar trade (5) ride the breakdown: ' + bd.powerIn);
  ok(bd.net === base.net + 13 || Math.abs(bd.net - base.net - 13) < 1.5,
    'the net moves by the flow (pact incomeMult may add a little more)');
  ok(explainIncome(ctx, 'ISR').some((r) => /powers: aid & trade/.test(r.label)),
    'the ledger tooltip names the line');
  ok(powerFlows(ctx, 'ISR') === 13, 'powerFlows reports the same number');
}

console.log('== neglect dissolves the relationship ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  standingOf(ctx, 'CZE', 'ISR');
  game.powers.CZE.s.ISR = 60;
  signTradeCore(ctx, 'ISR', 'CZE');
  ok(hasTrade(ctx, 'CZE', 'ISR'), 'the Skoda contracts are signed');
  game.powers.CZE.s.ISR = 20; // far below need-15
  monthlyPowers(ctx);
  ok(!hasTrade(ctx, 'CZE', 'ISR'), 'a cold friendship lapses the agreement');
  game.powers.USA.s.ISR = 80;
  signPactCore(ctx, 'ISR', 'USA');
  game.powers.USA.s.ISR = 30; // below the pact lapse line
  monthlyPowers(ctx);
  ok(!hasPact(ctx, 'USA', 'ISR'), 'a rotted pact dissolves on its own');
  // And a healthy pact anchors the drift high instead of sliding to baseline.
  game.powers.USSR.s.ISR = 80;
  signPactCore(ctx, 'ISR', 'USSR');
  for (let i = 0; i < 20; i++) monthlyPowers(ctx);
  ok(standingOf(ctx, 'USSR', 'ISR') === 70, 'a standing pact holds the floor at 70');
}

console.log('== matériel: re-equip from the depots ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  standingOf(ctx, 'CZE', 'ISR');
  // Stage a stale brigade (gen 3 in a gen-5 age) and the funds.
  const stale = Object.values(game.armies).find((a) => a.tag === 'ISR');
  stale.gen = 3;
  game.powers.CZE.s.ISR = 70;
  game.powers.USSR.s.ISR = 50;
  game.tags.ISR.treasury = 200;
  const res = askPowerCore(ctx, 'ISR', 'CZE', 'cze_reequip');
  ok(res.ok, 'the Czech depots take the contract');
  ok(stale.gen === 5, 'the stale brigade is re-armed to the current pattern');
  ok(game.tags.ISR.treasury === 60, 'and the bill is paid: 140 talents');
  // The Soviet armor purchase mounts its power multiplier.
  game.powers.USSR.s.ISR = 75;
  game.tags.ISR.treasury = 200;
  const armor = askPowerCore(ctx, 'ISR', 'USSR', 'ussr_armor');
  ok(armor.ok && (game.tags.ISR.modifiers || []).some((m) => m.id === 'power_soviet_armor'),
    'Soviet surplus armor is bought and mounted');
}

console.log('== the Diaspora binds only to its own ==');
{
  const { game, ctx } = boot(BOOKMARK_66, 'ROM');
  standingOf(ctx, 'DIA', 'ROM');
  game.powers.DIA.s.ROM = 90;
  const denied = signPactCore(ctx, 'ROM', 'DIA');
  ok(!denied.ok && /not offered/.test(denied.why), 'Rome cannot sign One People');
  game.powers.DIA.s.JUD = 80;
  const bound = signPactCore(ctx, 'JUD', 'DIA');
  ok(bound.ok && powerFlows(ctx, 'JUD') >= 3,
    'Judaea binds the dispersion and the silver flows');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
