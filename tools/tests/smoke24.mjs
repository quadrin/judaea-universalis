// Headless regression — paused player commands and sequential timed military
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
const actions = gameActions(ctx, { deferWhilePaused: true });
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
  tax: port.dev.tax, treasury: israel.treasury, manpower: israel.manpower,
  regs: totalRegs(), ships: totalShips(), wings: totalWings(),
};

console.log('== paused commands wait for resume ==');
actions.devProvince(port.id, 'tax');
actions.recruit(port.id, 'inf');
actions.recruit(port.id, 'inf');
actions.buildShip(port.id);
actions.recruitAirWing(port.id);
ok(game.pendingCommands.length === 5, 'five paused actions are held as commands');
ok(port.dev.tax === start.tax && israel.treasury === start.treasury && israel.manpower === start.manpower,
  'paused commands spend and change nothing');
ok(!port.unitQueue.length && totalRegs() === start.regs && totalShips() === start.ships && totalWings() === start.wings,
  'no unit begins or appears while paused');
const preview = actions.getRecruitmentQueue(port.id);
ok(preview.rows.length === 4 && preview.rows.every((row) => row.pending), 'the province panel can preview held unit orders');

actions.togglePause();
ok(!game.paused && !game.pendingCommands.length, 'resume releases the command queue');
ok(port.dev.tax === start.tax + 1, 'the held development action executes on resume');
ok(port.unitQueue.map((row) => row.type).join(',') === 'inf,inf,ship,wing',
  'all military orders enter one FIFO province queue');
ok(totalRegs() === start.regs && totalShips() === start.ships && totalWings() === start.wings,
  'releasing orders still creates no instant units');
ok(israel.treasury === start.treasury - 90 && israel.manpower === start.manpower - 2000,
  'resources are committed only when the queued orders begin');

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
ok(revived && Array.isArray(revived.provinces[port.id].unitQueue) && Array.isArray(revived.pendingCommands),
  'save revival preserves the new queue schema');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
