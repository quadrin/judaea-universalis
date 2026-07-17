// Headless regression — SPEC §58: pre-existing works & starting forces per
// bookmark, and the navigable merchant marine (3-berth cap, voyages, diverts).
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const { tradeIncome } = await import(R + '/js/sim/economy.js');
const navy = await import(R + '/js/sim/navy.js');

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

function boot(bookmark, playerTag, seed = 58) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events: [] });
  return { game, ctx, actions: gameActions(ctx) };
}

console.log('== the built world precedes the first order (buildings overlay) ==');
{
  const { ctx } = boot(BOOKMARK_1948, 'ISR');
  ok(ctx.prov('Dora').buildings.includes('shipyard'), 'Haifa harbor is a working shipyard in 1948');
  ok(ctx.prov('Joppa').buildings.includes('airfield'), 'Tel Aviv has its airstrip');
  ok(ctx.prov('Salamis').buildings.includes('shipyard')
      && ctx.prov('Salamis').buildings.includes('airfield'), 'British Cyprus has docks and a runway');
  ok(!ctx.prov('Jerusalem').buildings.includes('airfield'), 'no phantom works elsewhere');
  const { ctx: c66 } = boot(BOOKMARK_66, 'JUD');
  ok(c66.prov('Caesarea Maritima').buildings.includes('shipyard'), "Herod's Sebastos stands in 66 CE");
  ok(c66.prov('Alexandria').buildings.includes('granary'), 'the Alexandrian grain machine is built');
}

console.log('== the starting establishments are afloat and aloft ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  const fleets = Object.values(game.fleets).filter(Boolean);
  const isr = fleets.find((f) => f.tag === 'ISR');
  ok(!!isr && isr.ships === 3 && isr.prov === ctx.prov('Dora').id,
    'the Sea Corps rides at Haifa with 3 hulls');
  ok(Number.isFinite(isr.gen) && Array.isArray(isr.path) && isr.admiral === null,
    'the seeded fleet wears the full fleet shape (gen/path/admiral)');
  const wings = Object.values(game.airwings).filter(Boolean);
  ok(wings.some((w) => w.tag === 'ISR' && w.name === '101 Squadron'), '101 Squadron stands at Tel Aviv');
  ok(wings.filter((w) => w.tag === 'EGY').length === 2, 'Egypt fields two squadrons at Cairo');
  ok(wings.some((w) => w.tag === 'UK'), 'the RAF keeps a squadron on Cyprus');
  const { game: g66 } = boot(BOOKMARK_66, 'JUD');
  const rom = Object.values(g66.fleets).filter((f) => f && f.tag === 'ROM');
  ok(rom.length === 2 && rom.reduce((s, f) => s + f.ships, 0) === 14,
    'Rome opens 66 CE with the Alexandrian and Syrian classes at sea');
}

console.log('== three berths, no stacking ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  ok(navy.MERCHANT_SHIP_CAP === 3, 'a shipyard berths 3 merchantmen');
  const dora = ctx.prov('Dora');
  game.tags.ISR.treasury = 500;
  for (let i = 0; i < 3; i++) {
    const res = navy.commissionMerchantShipCore(ctx, 'ISR', dora.id);
    ok(res.ok, 'hull ' + (i + 1) + ' fits out at Haifa');
  }
  const fourth = navy.commissionMerchantShipCore(ctx, 'ISR', dora.id);
  ok(!fourth.ok && /berth/.test(fourth.why), 'the fourth is refused: ' + fourth.why);
}

console.log('== the tubs are navigable: voyage, arrival, berth reservation ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  const dora = ctx.prov('Dora');
  const joppa = ctx.prov('Joppa');
  joppa.buildings.push('shipyard'); // a second Israeli harbor for the run
  game.tags.ISR.treasury = 500;
  for (let i = 0; i < 3; i++) navy.commissionMerchantShipCore(ctx, 'ISR', dora.id);
  const before = tradeIncome(ctx, 'ISR');

  const dests = navy.merchantDestinations(ctx, 'ISR', dora.id);
  ok(dests.some((d) => d.prov === joppa.id && d.free === 3), 'Tel Aviv is offered as a destination with 3 free berths');

  const sail = navy.sendMerchantCore(ctx, 'ISR', dora.id, joppa.id);
  ok(sail.ok && dora.merchantShips === 2 && game.merchantVoyages.length === 1,
    'one hull puts to sea (' + sail.days + ' days) and leaves the home count');
  ok(tradeIncome(ctx, 'ISR') < before, 'a hull at sea earns nothing');

  // Reservations: after booking 2 more inbound, Joppa's 3 berths are spoken for.
  navy.sendMerchantCore(ctx, 'ISR', dora.id, joppa.id);
  const third = navy.sendMerchantCore(ctx, 'ISR', dora.id, joppa.id);
  ok(third.ok && dora.merchantShips === 0, 'three voyages booked — Haifa is empty');
  game.tags.ISR.treasury = 500;
  navy.commissionMerchantShipCore(ctx, 'ISR', dora.id);
  const overbooked = navy.sendMerchantCore(ctx, 'ISR', dora.id, joppa.id);
  ok(!overbooked.ok && /berth/i.test(overbooked.why),
    'a fourth voyage cannot claim an already-reserved berth: ' + overbooked.why);
  const infoJoppa = navy.merchantShipInfo(ctx, 'ISR', joppa.id);
  ok(!infoJoppa.can && infoJoppa.inbound === 3,
    'commissioning at the destination is also barred while 3 are inbound');

  for (let d = 0; d < 60 && game.merchantVoyages.length; d++) navy.merchantVoyagesDaily(ctx);
  ok(joppa.merchantShips === 3 && game.merchantVoyages.length === 0,
    'all three dock at Tel Aviv; no voyage lingers');
}

console.log('== a fallen port turns the ship for home ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  const dora = ctx.prov('Dora');
  const joppa = ctx.prov('Joppa');
  joppa.buildings.push('shipyard');
  game.tags.ISR.treasury = 500;
  navy.commissionMerchantShipCore(ctx, 'ISR', dora.id);
  navy.sendMerchantCore(ctx, 'ISR', dora.id, joppa.id);
  joppa.controller = 'EGY'; // the port falls while she is at sea
  for (let d = 0; d < 120 && game.merchantVoyages.length; d++) navy.merchantVoyagesDaily(ctx);
  ok(joppa.merchantShips === undefined || (joppa.merchantShips | 0) === 0, 'nothing docks at a fallen port');
  ok(dora.merchantShips === 1, 'the hull turns around and comes home to Haifa');

  // And if home falls too, the hull is lost — not duplicated, not stuck.
  joppa.controller = 'ISR'; // the port is retaken long enough to book the run
  navy.sendMerchantCore(ctx, 'ISR', dora.id, joppa.id);
  ok(dora.merchantShips === 0 && game.merchantVoyages.length === 1, 'she sails again');
  joppa.controller = 'EGY'; // ...and both ports fall while she is at sea
  dora.controller = 'EGY';
  for (let d = 0; d < 120 && game.merchantVoyages.length; d++) navy.merchantVoyagesDaily(ctx);
  ok(game.merchantVoyages.length === 0 && (dora.merchantShips | 0) === 0 && (joppa.merchantShips | 0) === 0,
    'with no port open the hull is lost at sea');
}

console.log('== old saves learn the new sea (revive backfill) ==');
{
  const { game } = boot(BOOKMARK_1948, 'ISR');
  const saved = JSON.parse(JSON.stringify(game));
  delete saved.merchantVoyages;
  const revived = reviveGame(saved);
  ok(Array.isArray(revived.merchantVoyages) && revived.merchantVoyages.length === 0,
    'a pre-§58 save gains an empty voyage list');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
