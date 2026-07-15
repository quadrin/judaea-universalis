// Headless regression — paused planning and sequential timed military
// recruitment across land, sea, and air.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { EVENTS_1948 } = await import(R + '/js/data/events_1948.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const { monthlyRecruitment } = await import(R + '/js/sim/recruitment.js');
const { regCount } = await import(R + '/js/sim/military.js');

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
  coastal: [false, ...MAP_DATA.provinces.map((p) => p.terrain === 'coast')],
  areas: new Int32Array(N + 1), bbox: [],
};

const game = initGame({
  DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_1948, events: EVENTS_1948,
  playerTag: 'ISR', rngSeed: 240,
});
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_1948, events: EVENTS_1948 });
const actions = gameActions(ctx);
const israel = game.tags.ISR;
israel.treasury = 1000;
israel.points.gov = 500;
israel.manpower = Math.max(israel.manpower, 10000);

const port = game.provinces.find((p) => p && p.owner === 'ISR' && p.controller === 'ISR' && geom.coastal[p.id]);
port.buildings = Array.from(new Set([...(port.buildings || []), 'shipyard', 'airfield']));
const totalRegs = () => Object.values(game.armies).filter((a) => a && a.tag === 'ISR').reduce((n, a) => n + regCount(a), 0);
const totalShips = () => Object.values(game.fleets).filter((f) => f && f.tag === 'ISR').reduce((n, f) => n + (f.ships || 0), 0);
const totalWings = () => Object.values(game.airwings).filter((w) => w && w.tag === 'ISR').length;
const start = {
  tax: port.dev.tax, gov: israel.points.gov, treasury: israel.treasury, manpower: israel.manpower,
  regs: totalRegs(), ships: totalShips(), wings: totalWings(),
  armies: Object.values(game.armies).filter((a) => a && a.tag === 'ISR').length,
};
const devCost = actions.getDevelopInfo(port.id).tax.cost;
const host = Object.values(game.armies).find((a) => a && a.tag === 'ISR' && !a.inBattle && regCount(a) >= 2);

console.log('== paused planning commits immediately ==');
const detachmentId = actions.splitArmy(host.id);
actions.devProvince(port.id, 'tax');
actions.recruit(port.id, 'inf');
actions.recruit(port.id, 'inf');
actions.buildShip(port.id);
actions.recruitAirWing(port.id);
ok(game.paused, 'the campaign remains paused while orders are given');
ok(!!detachmentId && Object.values(game.armies).filter((a) => a && a.tag === 'ISR').length === start.armies + 1,
  'an army splits immediately while paused');
ok(port.dev.tax === start.tax + 1 && israel.points.gov === start.gov - devCost,
  'development and its point cost are visible immediately while paused');
ok(port.unitQueue.map((row) => row.type).join(',') === 'inf,inf,ship,wing',
  'paused military purchases enter one FIFO province queue immediately');
ok(israel.treasury === start.treasury - 90 && israel.manpower === start.manpower - 2000,
  'money and manpower are committed immediately while paused');
ok(totalRegs() === start.regs && totalShips() === start.ships && totalWings() === start.wings,
  'committed work creates no instant units');
const preview = actions.getRecruitmentQueue(port.id);
ok(preview.paused && preview.rows.map((row) => row.monthsLeft).join(',') === '2,2,6,4',
  'the real production line is visible with frozen remaining times');

actions.togglePause();
ok(!game.paused, 'resume starts the clock without changing the committed queue');

console.log('== the province completes one order at a time ==');
monthlyRecruitment(ctx);
ok(totalRegs() === start.regs && port.unitQueue[0].monthsLeft === 1, 'first regiment is still mustering after one month');
monthlyRecruitment(ctx);
ok(totalRegs() === start.regs + 1 && port.unitQueue.length === 3, 'first regiment completes alone after two months');
monthlyRecruitment(ctx);
ok(totalRegs() === start.regs + 1, 'second regiment does not arrive with the first');
monthlyRecruitment(ctx);
ok(totalRegs() === start.regs + 2 && port.unitQueue[0].type === 'ship', 'second regiment completes on its own date');
for (let i = 0; i < 5; i++) monthlyRecruitment(ctx);
ok(totalShips() === start.ships && port.unitQueue[0].monthsLeft === 1, 'the warship remains on the ways through month five');
monthlyRecruitment(ctx);
ok(totalShips() === start.ships + 1 && port.unitQueue[0].type === 'wing', 'the warship launches after six months');
for (let i = 0; i < 3; i++) monthlyRecruitment(ctx);
ok(totalWings() === start.wings, 'the air wing is still forming after three months');
monthlyRecruitment(ctx);
ok(totalWings() === start.wings + 1 && !port.unitQueue.length, 'the air wing completes after four months and clears the queue');

const revived = reviveGame(JSON.parse(JSON.stringify(game)));
ok(revived && Array.isArray(revived.provinces[port.id].unitQueue),
  'save revival preserves the production queue schema');

console.log('== v3.9 held orders migrate on load ==');
revived.tags.ISR.points.gov = 500;
revived.pendingCommands = [{ id: 1, tag: 'ISR', name: 'devProvince', args: [port.id, 'tax'] }];
const revivedCtx = makeCtx({ game: revived, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_1948, events: EVENTS_1948 });
const revivedTax = revived.provinces[port.id].dev.tax;
gameActions(revivedCtx);
ok(revived.provinces[port.id].dev.tax === revivedTax + 1 && !('pendingCommands' in revived),
  'a legacy held click applies immediately and the obsolete queue is removed');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
