// Headless regression — trade runs (v6.1): merchantmen abroad. The opinion
// gate, the round trip (out → a month in the foreign market → home), the
// lump-sum payout on the home berth, wartime seizure in the host's harbor,
// and the home-berth reservation across the whole trip.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
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

if (failures) { console.error(failures + ' FAILURES'); process.exit(1); }
console.log('\nALL PASS');
