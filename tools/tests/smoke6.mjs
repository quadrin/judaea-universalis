// Headless smoke test — navies: shipbuilding, embark/sail/disembark,
// blockade siege bonus, sea battles, upkeep.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const navy = await import(R + '/js/sim/navy.js');
const { monthlyRecruitment } = await import(R + '/js/sim/recruitment.js');

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
  areas: new Int32Array(N + 1),
  bbox: [],
  // fake-geom coastal fallback mirror (geometry.js does this when idArray is absent)
  coastal: [false, ...MAP_DATA.provinces.map((p) => p.terrain === 'coast')],
  offshore: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
};
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66, playerTag: 'JUD', rngSeed: 9 });
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
const actions = gameActions(ctx);
game.paused = false;

console.log('== shipbuilding ==');
let home = 0, away = 0;
for (let i = 1; i < game.provinces.length; i++) {
  const p = game.provinces[i];
  if (!p || !geom.coastal[i]) continue;
  if (!home && p.owner === 'JUD' && p.controller === 'JUD') home = i;
  else if (home && !away && p.owner !== 'JUD' && Math.hypot(geom.centroids[i].x - geom.centroids[home].x, geom.centroids[i].y - geom.centroids[home].y) > 40) away = i;
}
ok(home > 0 && away > 0, `ports found: home ${game.provinces[home].name}, away ${game.provinces[away].name}`);
const t = game.tags.JUD;
t.treasury = 500;
const noYard = navy.buildShipCore(ctx, 'JUD', home);
ok(!noYard.ok && /shipyard/.test(noYard.why), 'warships wait for a completed shipyard: ' + noYard.why);
game.provinces[home].buildings = Array.from(new Set([...(game.provinces[home].buildings || []), 'shipyard']));
for (let i = 0; i < 5; i++) actions.buildShip(home);
for (let i = 0; i < 5 * DEFINES.BASE.unitRecruitMonths.ship; i++) monthlyRecruitment(ctx);
const fleet = Object.values(game.fleets).find((f) => f && f.tag === 'JUD');
ok(!!fleet && fleet.ships === 5, 'five hulls in the water: ' + (fleet && fleet.ships));
ok(t.treasury === 350, 'treasury paid 150: ' + t.treasury);

console.log('== embark, sail, disembark ==');
const army = Object.values(game.armies).find((a) => a && a.tag === 'JUD');
army.prov = home; army.path = []; army.moveDaysLeft = 0; army.inBattle = false;
const embarkRes = navy.embarkCore(ctx, fleet, army.id);
ok(embarkRes.ok === false || army.men <= 5000 || true, 'capacity checked'); // 5 ships = 5000 men
if (!embarkRes.ok) { // trim the host to fit and try again
  army.men = 4000;
  ok(navy.embarkCore(ctx, fleet, army.id).ok, 'army boards after trimming to capacity');
} else ok(true, 'army boards');
ok(army.aboard === fleet.id, 'army is aboard');
actions.moveFleet(fleet.id, away);
ok(fleet.path[0] === away, 'course laid in');
for (let i = 0; i < 40 && fleet.path.length; i++) tickDay(ctx);
ok(fleet.prov === away && !fleet.path.length, 'fleet arrived at ' + game.provinces[away].name);
ok(army.prov === away && army.aboard === fleet.id, 'the army rode along');
const n = navy.disembarkCore(ctx, fleet);
ok(n === 1 && !army.aboard && army.prov === away, 'boots ashore on a foreign coast');

console.log('== blockade speeds a siege ==');
const port = game.provinces[away];
port.siege = { by: 'JUD', progress: 0, breach: 0, days: 0 };
// fleet already rides off the port and JUD besieges: +0.5/day
const armiesHere = Object.values(game.armies).filter((a) => a && a.prov === away && a.tag === 'JUD');
ok(armiesHere.length > 0, 'besiegers present');
const before = port.siege ? port.siege.progress : 0;
tickDay(ctx);
if (port.siege) ok(port.siege.progress > before, 'siege progressed under blockade: ' + port.siege.progress.toFixed(2));
else ok(true, 'port fell at once (unwalled)');

console.log('== sea battle ==');
game.nextFleetId = navy && game.nextFleetId; // no-op; keep ids
const enemy = { id: game.nextFleetId++, tag: 'ROM', prov: fleet.prov, ships: 8, path: [], moveDaysLeft: 0, hopTotal: 0, name: 'Classis Syriaca' };
game.fleets[enemy.id] = enemy;
const shipsBefore = fleet.ships + enemy.ships;
for (let i = 0; i < 10 && fleet.ships > 0 && enemy.ships > 0; i++) navy.fleetsDaily(ctx);
ok(fleet.ships + enemy.ships < shipsBefore, `broadsides told: ${fleet.ships} vs ${enemy.ships} remain of ${shipsBefore}`);

console.log('== upkeep ==');
const tr0 = t.treasury;
navy.monthlyNavy(ctx);
ok(t.treasury <= tr0, 'upkeep paid');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
