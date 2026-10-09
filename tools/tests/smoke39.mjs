// Headless regression — SPEC §292, the navy in trade (it replaced the trade
// runs of v6.1 that this file held): a raider takes its share of a market
// before anyone else; a guard adds power; a raider at war may take a posted
// merchant ship, less often when the lanes are guarded; raiding a court at
// peace costs its goodwill; a squadron serves only at anchor in the node, and
// a raider rides off a harbor its enemy does not hold. Also, from v6.1/v6.2:
// an ordered air strike flies only when time moves, and every player-facing
// scripted event offers a real choice.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { initGame, makeCtx, gameActions, simHelpers } = await import(R + '/js/sim/init.js');
const trade = await import(R + '/js/sim/trade.js');
const mil = await import(R + '/js/sim/military.js');
const num = (v) => Number(v) || 0;

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [],
};

function boot() {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: [], playerTag: 'JUD', rngSeed: 61 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: [] });
  // A world at peace: the Great Revolt's scripted fronts would otherwise
  // close every Roman market before the tests begin.
  game.wars = [];
  game.truces = {};
  for (const k of Object.keys(game.tags)) if (game.tags[k]) game.tags[k].atWarWith = [];
  return { game, ctx, actions: gameActions(ctx) };
}
function fleet(ctx, tag, provName, ships, mission) {
  const f = simHelpers.spawnFleet(ctx, tag, provName, ships, { name: tag + ' test squadron' });
  f.mission = mission || null;
  trade.touchTrade(ctx.game);
  return f;
}
const node = (ctx, id) => trade.computeTrade(ctx).nodes[id];

console.log('== a raider takes its share first; a guard adds power ==');
{
  const { game, ctx } = boot();
  const before = node(ctx, 'egypt');
  const v0 = before.value;
  const romBefore = trade.tradeIncomeOf(ctx, 'ROM');
  ok(before.totalRaid === 0 && v0 > 0, 'Alexandria is worth ' + v0.toFixed(2) + ' a month and nobody raids it');
  const raider = fleet(ctx, 'JUD', 'Alexandria', 6, { kind: 'raid', node: 'egypt' });
  const N = node(ctx, 'egypt');
  ok(N.raid.JUD > 0 && N.stolen.JUD > 0, 'a Judaean raider off Alexandria takes ' + N.stolen.JUD.toFixed(2));
  let rest = 0;
  for (const k in N.collected) rest += N.collected[k];
  for (const k in N.steer) rest += N.steer[k].amount;
  ok(Math.abs(rest + N.stolen.JUD - N.value) < 1e-6, 'what the raider takes, the market loses: nothing made, nothing lost');
  ok(trade.tradeIncomeOf(ctx, 'ROM') < romBefore, 'Rome takes less from the lanes it no longer has to itself');
  raider.path = [ctx.prov('Joppa').id];
  ok(!trade.fleetMissionActive(ctx, raider), 'a squadron under way serves nowhere');
  raider.path = [];
  raider.prov = ctx.prov('Joppa').id;
  ok(!trade.fleetMissionActive(ctx, raider), 'nor one at anchor outside its node');
  raider.mission = null;
  const p0 = num(node(ctx, 'egypt').power.JUD);
  raider.prov = ctx.prov('Alexandria').id;
  raider.mission = { kind: 'protect', node: 'egypt' };
  trade.touchTrade(game);
  const p1 = num(node(ctx, 'egypt').power.JUD);
  ok(p1 > p0 + 6, 'six hulls guarding the lanes add their power: ' + p0.toFixed(1) + ' → ' + p1.toFixed(1));
}

console.log('== raiding at peace costs goodwill ==');
{
  const { game, ctx } = boot();
  fleet(ctx, 'JUD', 'Alexandria', 4, { kind: 'raid', node: 'egypt' });
  const op0 = num((game.tags.ROM.opinion || {}).JUD);
  trade.tradeMonthly(ctx);
  const op1 = num((game.tags.ROM.opinion || {}).JUD);
  ok(op1 < op0, 'Rome thinks less of the court that robs its lanes: ' + op0 + ' → ' + op1);
}

console.log('== a raider at war takes prizes; a guard makes it harder ==');
{
  const { game, ctx } = boot();
  mil.declareWar(ctx, 'JUD', 'ROM', 'Test War');
  game.tags.ROM.treasury = 500;
  const alex = ctx.prov('Alexandria');
  alex.buildings = (alex.buildings || []).concat('shipyard');
  const m = trade.buildMerchantCore(ctx, 'ROM', alex.id, 'ship').merchant;
  ok(!!m && trade.sendMerchantCore(ctx, 'ROM', m.id, 'egypt', 'collect').ok && m.state === 'posted', 'a Roman merchant ship collects at Alexandria');
  fleet(ctx, 'JUD', 'Alexandria', 6, { kind: 'raid', node: 'egypt' });
  const odds = [];
  const realChance = ctx.rng.chance;
  ctx.rng.chance = (p) => { odds.push(p); return false; };
  trade.tradeMonthly(ctx);
  fleet(ctx, 'ROM', 'Alexandria', 10, { kind: 'protect', node: 'egypt' });
  trade.tradeMonthly(ctx);
  ok(odds.length === 2 && odds[0] > 0 && odds[1] < odds[0] && odds[0] <= trade.TRADE.captureMax,
    'the odds of a prize: ' + odds.map((p) => p.toFixed(3)).join(' unguarded, ') + ' guarded');
  ctx.rng.chance = () => true;
  trade.tradeMonthly(ctx);
  ctx.rng.chance = realChance;
  ok(!game.merchants.includes(m), 'and when the dice fall, the ship is taken');
}

console.log('== a raider rides off a harbor its enemy does not hold ==');
{
  const { game, ctx } = boot();
  mil.declareWar(ctx, 'ROM', 'JUD', 'Test War');
  const ours = game.provinces.filter((p) => p && p.owner === 'JUD' && trade.nodeOfProv(ctx, p.id) === 'judaea');
  const station = trade.missionStation(ctx, 'judaea', ctx.prov('Caesarea Maritima').id, 'ROM');
  const st = ctx.byId(station);
  ok(ours.length > 0 && !!st && st.owner !== 'JUD' && trade.nodeOfProv(ctx, station) === 'judaea',
    'a Roman raider in the waters of Judaea rides off ' + (st && st.name) + ', not a Judaean port');
  ok(trade.missionStation(ctx, 'judaea', station, null) === trade.nodeCenterId(ctx, 'judaea'), 'a guard rides off the market town, Joppa');
  const f = fleet(ctx, 'ROM', 'Caesarea Maritima', 3, null);
  const res = trade.setFleetMissionCore(ctx, 'ROM', f.id, 'raid', 'judaea');
  ok(res.ok && f.mission && f.mission.kind === 'raid', 'the order is given: ' + (res.why || res.stationName));
  ok(!trade.setFleetMissionCore(ctx, 'JUD', f.id, 'raid', 'judaea').ok, 'no court orders another\'s squadron');
}

console.log('== an ordered strike flies only when time moves (v6.2) ==');
{
  const { game, ctx } = boot();
  const joppa = ctx.prov('Joppa');
  joppa.owner = 'JUD'; joppa.controller = 'JUD';
  game.airwings = { 1: { id: 1, tag: 'JUD', prov: joppa.id, name: 'Test Wing' } };
  mil.declareWar(ctx, 'JUD', 'ROM', 'Test War');
  const foeId = simHelpers.spawnArmy(ctx, 'ROM', 'Joppa', { inf: 5, name: 'Target Host' });
  const foe = game.armies[foeId];
  const menBefore = foe.men;
  const res = mil.orderAirRaid(ctx, 'JUD', 1, joppa.id);
  ok(res.ok && game.airwings[1].pendingRaid === joppa.id, 'the order is scheduled, not flown');
  ok(foe.men === menBefore && (game.airwings[1].raidCd | 0) === 0,
    'while paused nothing burns: target untouched, no cooldown paid');
  const cancel = mil.orderAirRaid(ctx, 'JUD', 1, joppa.id);
  ok(cancel.ok && cancel.cancelled && game.airwings[1].pendingRaid === undefined,
    'the same order again calls the strike off');
  mil.orderAirRaid(ctx, 'JUD', 1, joppa.id);
  mil.flyPendingRaids(ctx); // the daily tick
  ok(foe.men < menBefore, 'when time moves the bombs fall: ' + (menBefore - foe.men) + ' men lost');
  ok((game.airwings[1].raidCd | 0) > 0 && game.airwings[1].pendingRaid === undefined,
    'the wing rearms and the order is spent');
}

console.log('== every player-facing scripted event offers a real choice (v6.1) ==');
{
  // World-history dispatches may stay single-option notices; anything the
  // player is asked to answer must offer at least two answers, and any
  // multi-option event must pin aiOption so harness runs stay historical.
  // Read the era REGISTRY, not the era files: a chapter's chain is several
  // packages concatenated in compendium.js (SPEC §104–§106), and checking the
  // base file alone silently exempts every one of them from this invariant.
  const { ERAS } = await import(R + '/js/data/compendium.js');
  const { GENERIC_EVENTS } = await import(R + '/js/data/events_generic.js');
  const genericIds = new Set(GENERIC_EVENTS.map((e) => e && e.id));
  for (const entry of ERAS) {
    const era = entry.bookmark.id;
    const evs = entry.events.filter((e) => e && !genericIds.has(e.id));
    const oneOpt = evs.filter((e) => e && !e.world && (!e.options || e.options.length < 2));
    ok(oneOpt.length === 0, era + ': no single-option player events'
      + (oneOpt.length ? ' — ' + oneOpt.map((e) => e.id).join(', ') : ''));
    // The engine accepts a pinned index OR a deterministic chooser function
    // (fireEvent: `typeof ev.aiOption === 'function'`) — both keep harness
    // runs historical.
    const noAi = evs.filter((e) => e && e.options && e.options.length > 1
      && !Number.isFinite(e.aiOption) && typeof e.aiOption !== 'function');
    ok(noAi.length === 0, era + ': every multi-option event pins aiOption'
      + (noAi.length ? ' — ' + noAi.map((e) => e.id).join(', ') : ''));
  }
}

if (failures) { console.error(failures + ' FAILURES'); process.exit(1); }
console.log('\nALL PASS');
