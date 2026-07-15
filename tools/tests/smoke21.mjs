// Headless smoke test — army demobilization, peace-aware canonical events,
// era-gated works, and civilian merchant shipping.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { endWarBySword } = await import(R + '/js/sim/military.js');
const { checkDateEvents, checkTriggeredEvents, fireEvent, resolveEventOption } = await import(R + '/js/sim/events.js');
const { tradeIncome } = await import(R + '/js/sim/economy.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
function geometry() {
  return {
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
    coastal: new Array(N + 1).fill(false),
    offshore: new Array(N + 1),
    areas: new Int32Array(N + 1), bbox: [],
  };
}
function boot(seed = 2121) {
  const geom = geometry();
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66, playerTag: 'JUD', rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
  return { game, ctx, actions: gameActions(ctx) };
}

console.log('== armies can stand down to cut maintenance ==');
{
  const { game, ctx, actions } = boot();
  const army = Object.values(game.armies).find((a) => a && a.tag === 'JUD');
  const home = game.provinces.find((p) => p && p.owner === 'JUD' && p.controller === 'JUD');
  army.prov = home.id;
  army.inBattle = false;
  army.retreating = false;
  army.aboard = null;
  game.tags.JUD.manpower = 0;
  game.tags.JUD.maxManpower = 999999;
  const expected = Math.floor(army.men * 0.75);
  const id = army.id;
  ok(actions.getArmyActions(id).canDisband, 'a safe home army exposes the stand-down action');
  ok(actions.disbandArmy(id) && !game.armies[id], 'standing down removes the army and its upkeep');
  ok(game.tags.JUD.manpower === expected, '75% of surviving men return to manpower in controlled home territory');
}

console.log('== peace cancels stale canonical battle phases ==');
{
  const { game, ctx } = boot(2122);
  const war = game.wars.find((w) => (w.attackers || []).includes('JUD') && (w.defenders || []).includes('ROM'));
  endWarBySword(ctx, war, null, { silent: true });
  ok(game.flags._settledWars && game.flags._settledWars['JUD|ROM'], 'the treaty ledger records the concluded opposing pair');
  game.pendingEvents = [];
  game.date = { y: 66, m: 10, d: 1 };
  checkDateEvents(ctx);
  ok(game.firedEvents.ev_cestius_marches
    && !game.pendingEvents.some((row) => row.eventId === 'ev_cestius_marches'),
  'the dated Cestius campaign is retired without a popup after peace');
  checkTriggeredEvents(ctx);
  ok(game.firedEvents.ev_beth_horon
    && !game.pendingEvents.some((row) => row.eventId === 'ev_beth_horon'),
  'triggered battle sequels are also permanently retired after the treaty');
}

console.log('== a battle card queued before peace cannot revive the war ==');
{
  const { game, ctx } = boot(2124);
  const ev = EVENTS_66.find((row) => row && row.id === 'ev_beth_horon');
  fireEvent(ctx, ev);
  const pending = game.pendingEvents.find((row) => row.eventId === ev.id);
  const before = game.tags.JUD.points.mar;
  const war = game.wars.find((w) => (w.attackers || []).includes('JUD') && (w.defenders || []).includes('ROM'));
  endWarBySword(ctx, war, null, { silent: true });
  resolveEventOption(ctx, pending.instanceId, 0);
  ok(game.tags.JUD.points.mar === before && !game.flags.bethHoron
    && !game.wars.some((w) => (w.attackers || []).includes('JUD') && (w.defenders || []).includes('ROM')),
    'resolving a pre-treaty queued card applies no campaign effects after peace');
}

console.log('== ancient construction hides future tech and supports merchant ports ==');
{
  const { game, ctx, actions } = boot(2123);
  const port = ctx.prov('Joppa');
  const inland = ctx.prov('Jerusalem');
  ctx.geom.coastal[port.id] = true;
  const portInfo = actions.getBuildInfo(port.id);
  const inlandInfo = actions.getBuildInfo(inland.id);
  ok(!portInfo.options.some((row) => row.key === 'airfield'), 'airfields do not appear before military tech 19');
  ok(portInfo.options.some((row) => row.key === 'shipyard'), 'a coastal province can construct a shipyard');
  ok(!inlandInfo.options.some((row) => row.key === 'shipyard'), 'an inland province never advertises a shipyard');

  port.buildings = (port.buildings || []).filter((key) => key !== 'airfield');
  if (!port.buildings.includes('shipyard')) port.buildings.push('shipyard');
  game.tags.JUD.treasury = 100;
  const before = tradeIncome(ctx, 'JUD');
  const mi = actions.getMerchantShipInfo(port.id);
  ok(mi.visible && mi.can && mi.count === 0, 'the completed shipyard opens its civilian fitting-out yard');
  ok(actions.commissionMerchantShip(port.id) && port.merchantShips === 1, 'a merchant ship can be commissioned and persists at its home port');
  ok(tradeIncome(ctx, 'JUD') > before, 'the active merchantman adds monthly trade income');

  game.tags.JUD.tech.mar = 19;
  ok(actions.getBuildInfo(port.id).options.some((row) => row.key === 'airfield'),
    'the airfield option appears once its technology actually exists');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
