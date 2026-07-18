// Headless regression — trade runs (v6.1): merchantmen abroad. The opinion
// gate, the round trip (out → a month in the foreign market → home), the
// lump-sum payout on the home berth, wartime seizure in the host's harbor,
// and the home-berth reservation across the whole trip.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { initGame, makeCtx, gameActions, simHelpers } = await import(R + '/js/sim/init.js');
const navy = await import(R + '/js/sim/navy.js');
const mil = await import(R + '/js/sim/military.js');

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
// A working harbor pair: Joppa (ours) and Alexandria (theirs).
function harbors(ctx) {
  const home = ctx.prov('Joppa');
  const far = ctx.prov('Alexandria');
  home.owner = 'JUD'; home.controller = 'JUD';
  home.buildings = ['shipyard'];
  home.merchantShips = 1;
  far.buildings = far.buildings && far.buildings.includes('shipyard') ? far.buildings : (far.buildings || []).concat('shipyard');
  return { home, far };
}
function runDays(ctx, days) {
  for (let d = 0; d < days; d++) navy.merchantVoyagesDaily(ctx);
}

console.log('== the opinion gate ==');
{
  const { game, ctx } = boot();
  const { home, far } = harbors(ctx);
  const host = far.owner;
  game.tags[host].opinion = { JUD: 0 };
  let st = navy.tradeHarborStatus(ctx, 'JUD', far.id);
  ok(!st.can && /opinion/.test(st.why), 'a cool court keeps its market shut: ' + st.why);
  const dests = navy.tradeRunDestinations(ctx, 'JUD', home.id);
  const row = dests.find((d) => d.prov === far.id);
  ok(!!row && !row.can, 'the closed market is still listed (the gate is learnable)');
  game.tags[host].opinion.JUD = 40;
  st = navy.tradeHarborStatus(ctx, 'JUD', far.id);
  ok(st.can, 'at +40 opinion the market opens');
  const res = navy.sendTradeRunCore(ctx, 'JUD', home.id, far.id);
  ok(res.ok && res.payout > 0, `the run books: ~${res.payout} talents promised over ${res.days}d out`);
  ok(home.merchantShips === 0, 'the hull leaves its home berth');
  ok(navy.merchantBerthsFree(ctx, home.id) === navy.MERCHANT_SHIP_CAP - 1,
    'the home berth stays reserved for her return');
}

console.log('== the round trip pays a lump sum ==');
{
  const { game, ctx } = boot();
  const { home, far } = harbors(ctx);
  game.tags[far.owner].opinion = { JUD: 40 };
  const res = navy.sendTradeRunCore(ctx, 'JUD', home.id, far.id);
  const before = Number(game.tags.JUD.treasury) || 0;
  runDays(ctx, res.days); // out
  const v = game.merchantVoyages[0];
  ok(v && v.leg === 'dwell' && v.from === far.id && v.to === far.id,
    'she rides in the foreign roads to trade');
  runDays(ctx, navy.TRADE_RUN.dwellDays); // the market month
  ok(game.merchantVoyages[0] && game.merchantVoyages[0].leg === 'home', 'the hold full, she turns for home');
  runDays(ctx, game.merchantVoyages[0].daysTotal + 1);
  ok(game.merchantVoyages.length === 0 && home.merchantShips === 1, 'she ties up at her own berth again');
  const after = Number(game.tags.JUD.treasury) || 0;
  ok(Math.round(after - before) === res.payout, `the cargo sells as one sum: +${Math.round(after - before)} talents`);
}

console.log('== a glutted market buys nothing more (anti-money-press) ==');
{
  const { game, ctx } = boot();
  const { home, far } = harbors(ctx);
  game.tags[far.owner].opinion = { JUD: 40 };
  home.merchantShips = 2;
  const first = navy.sendTradeRunCore(ctx, 'JUD', home.id, far.id);
  ok(first.ok, 'the first run books');
  const second = navy.sendTradeRunCore(ctx, 'JUD', home.id, far.id);
  ok(!second.ok && /glutted/.test(second.why), 'the second is refused: ' + second.why);
  // The run at sea owns its market: it still docks and trades despite the glut.
  runDays(ctx, first.days);
  ok(game.merchantVoyages[0] && game.merchantVoyages[0].leg === 'dwell',
    'the booked run itself is not turned away by its own glut');
  // Six months on, the buyers are hungry again.
  game.date.m += navy.TRADE_RUN.saturationMonths;
  while (game.date.m > 12) { game.date.m -= 12; game.date.y += 1; }
  const third = navy.sendTradeRunCore(ctx, 'JUD', home.id, far.id);
  ok(third.ok, 'after ' + navy.TRADE_RUN.saturationMonths + ' months the market reopens');
}

console.log('== the margin follows the haul ==');
{
  const { ctx } = boot();
  const { home, far } = harbors(ctx);
  const near = navy.tradeRunPayout(ctx, 'JUD', far.id, far.id); // zero-distance floor
  const real = navy.tradeRunPayout(ctx, 'JUD', far.id, home.id);
  ok(real > near, `a real haul outearns a doorstep shuttle (${real} vs ${near})`);
}

console.log('== war in the host harbor seizes ship and cargo ==');
{
  const { game, ctx } = boot();
  const { home, far } = harbors(ctx);
  const host = far.owner;
  game.tags[host].opinion = { JUD: 40 };
  const res = navy.sendTradeRunCore(ctx, 'JUD', home.id, far.id);
  runDays(ctx, res.days); // she is trading now
  ok(game.merchantVoyages[0] && game.merchantVoyages[0].leg === 'dwell', 'trading when the war comes');
  mil.declareWar(ctx, 'JUD', host, 'Test War');
  runDays(ctx, 1);
  ok(game.merchantVoyages.length === 0 && home.merchantShips === 0, 'the hull is seized — never comes home');
}

console.log('== a market that closes mid-passage sends her home empty ==');
{
  const { game, ctx } = boot();
  const { home, far } = harbors(ctx);
  game.tags[far.owner].opinion = { JUD: 40 };
  const res = navy.sendTradeRunCore(ctx, 'JUD', home.id, far.id);
  game.tags[far.owner].opinion.JUD = -50; // the court turns cold while she sails
  const before = Number(game.tags.JUD.treasury) || 0;
  runDays(ctx, res.days + 1);
  const v = game.merchantVoyages[0];
  ok(v && v.leg === 'home' && v.payout === 0, 'refused at the quay, she turns for home empty');
  runDays(ctx, v.daysTotal + 1);
  ok(home.merchantShips === 1 && Math.round((Number(game.tags.JUD.treasury) || 0) - before) === 0,
    'home safe, hold empty, not a talent landed');
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
  for (const era of ['167bce', '67bce', '40bce', '66ce', '132ce', '614ce', '1948']) {
    const mod = await import(R + '/js/data/events_' + era + '.js');
    const evs = Object.values(mod).find(Array.isArray) || [];
    const oneOpt = evs.filter((e) => e && !e.world && (!e.options || e.options.length < 2));
    ok(oneOpt.length === 0, era + ': no single-option player events'
      + (oneOpt.length ? ' — ' + oneOpt.map((e) => e.id).join(', ') : ''));
    const noAi = evs.filter((e) => e && e.options && e.options.length > 1 && !Number.isFinite(e.aiOption));
    ok(noAi.length === 0, era + ': every multi-option event pins aiOption'
      + (noAi.length ? ' — ' + noAi.map((e) => e.id).join(', ') : ''));
  }
}

if (failures) { console.error(failures + ' FAILURES'); process.exit(1); }
console.log('\nALL PASS');
