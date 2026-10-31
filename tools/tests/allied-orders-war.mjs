// Accepted allied requests must allocate real armies through normal routing.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { buildProvinceMapping } from '../../js/data/map_profile.js';
import { initGame, makeCtx } from '../../js/sim/init.js';
import { spawnArmy } from '../../js/sim/military.js';
import { planWar } from '../../js/sim/ai_war.js';
import { alliedOrderTasks, requestAlliedOrder, monthlyAlliedOrders } from '../../js/sim/allied_orders.js';

const era = ERAS.find(e => e.bookmark.id === '66ce');
const snapshot = JSON.parse(readFileSync(new URL('../geom-snapshot.json', import.meta.url)));
function scene() {
  const geom = { neighbors: snapshot.neighbors.map(() => new Set()), coastal: snapshot.coastal.map(Boolean),
    centroids: snapshot.centroids.map(c => c ? { x: c[0], y: c[1] } : null), areas: Int32Array.from(snapshot.areas), bbox: [] };
  const mapping = buildProvinceMapping(MAP_DATA, era.bookmark);
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events, playerTag: 'JUD', rngSeed: 7, provinceMap: mapping });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events, provinceMap: mapping,
    bus: { emit() {}, on() { return () => {}; } } });
  game.armies = {}; game.battles = []; game.truces = {}; game.ceasefire = null;
  for (const p of game.provinces) if (p) { p.impassable = true; p.fort = 0; p.siege = null; p.owner = p.controller = 'WASTE'; }
  for (const t of Object.values(game.tags)) { t.atWarWith = []; t.allies = []; t.overlord = null; t.guarantees = []; }
  const names = ['Emmaus', 'Joppa', 'Lydda', 'Jerusalem', 'Petra'];
  const [start, defend, enemy, home, capital] = names.map(n => ctx.prov(n));
  for (const [i, p] of [start, defend, enemy, home, capital].entries()) {
    p.impassable = false; p.terrain = 'farmland'; p.controller = p.owner = i === 2 ? 'ROM' : i === 1 || i === 3 ? 'JUD' : 'NAB';
    p.dev = { tax: 6, prod: 6, mp: 6 }; p.x = i * 10; p.y = 0; p.autonomy = 0;
    geom.centroids[p.id] = { x: i * 10, y: 0 };
  }
  for (const p of [defend, enemy, home, capital]) { geom.neighbors[start.id].add(p.id); geom.neighbors[p.id].add(start.id); }
  game.tags.NAB.ai = true; game.tags.NAB.treasury = 300; game.tags.NAB.warExhaustion = 0;
  game.tags.NAB.manpower = game.tags.NAB.maxManpower = 20000;
  game.tags.NAB.allies = ['JUD']; game.tags.JUD.allies = ['NAB'];
  game.tags.NAB.opinion.JUD = game.tags.JUD.opinion.NAB = 150;
  game.tags.NAB.atWarWith = game.tags.JUD.atWarWith = ['ROM']; game.tags.ROM.atWarWith = ['NAB', 'JUD'];
  game.wars = [{ id: 'orders-war', attackers: ['JUD', 'NAB'], defenders: ['ROM'], warscore: {}, started: { ...game.date } }];
  const army = game.armies[spawnArmy(ctx, 'NAB', start.name, { inf: 12, name: 'Council army' })];
  return { ctx, game, geom, start, defend, enemy, home, capital, army };
}
const destination = a => a.path?.at(-1) || a.prov;

function order(s, kind, p) {
  const answer = requestAlliedOrder(s.ctx, 'JUD', 'NAB', kind, p.id);
  assert(answer.ok, answer.why);
  return answer.id;
}

{
  const baseline = scene();
  planWar(baseline.ctx, 'NAB');
  assert.equal(destination(baseline.army), baseline.enemy.id, 'without a request, seize the enemy town');
  const s = scene(), id = order(s, 'defend', s.defend), log = [];
  planWar(s.ctx, 'NAB', { log });
  assert.equal(destination(s.army), s.defend.id, 'accepted defense request deploys a real army');
  assert(s.army.path.length && log.some(p => p.alliedOrder === id && p.armies.includes(s.army.id)));
  assert.equal(s.army.prov, s.start.id, 'orders use a path; troops do not teleport');
  console.log('PASS an accepted defense objective changes a real army’s destination from enemy occupation to allied defense');
}
{
  const s = scene(), id = order(s, 'offensive', s.enemy), log = [];
  planWar(s.ctx, 'NAB', { log });
  assert.equal(destination(s.army), s.enemy.id);
  assert(log.some(p => p.alliedOrder === id && p.kind === 'siege'));
  console.log('PASS offensive requests enter the normal siege planner and legal marching route');
}
{
  const s = scene();
  s.defend.controller = 'ROM';
  const id = order(s, 'relieve', s.defend), log = [];
  planWar(s.ctx, 'NAB', { log });
  assert.equal(destination(s.army), s.defend.id);
  assert(log.some(p => p.alliedOrder === id && p.kind === 'siege'));
  console.log('PASS occupation relief assigns a normal recovery operation');
}
{
  const s = scene(); order(s, 'defend', s.defend);
  s.geom.neighbors[s.start.id].delete(s.defend.id); s.geom.neighbors[s.defend.id].clear();
  const log = []; planWar(s.ctx, 'NAB', { log });
  assert.notEqual(destination(s.army), s.defend.id);
  assert(!log.some(p => p.alliedOrder), 'unreachable requested objective cannot allocate an army');
  console.log('PASS a route lost after acceptance prevents an impossible deployment');
}
{
  const s = scene(); order(s, 'defend', s.defend);
  s.capital.controller = 'ROM';
  assert.equal(alliedOrderTasks(s.ctx, 'NAB').length, 0);
  monthlyAlliedOrders(s.ctx);
  assert.equal(s.game.alliedOrders.requests[0].status, 'suspended');
  const log = []; planWar(s.ctx, 'NAB', { log });
  assert.equal(destination(s.army), s.capital.id, 'recover own capital before a foreign defense errand');
  assert(!log.some(p => p.alliedOrder));
  console.log('PASS immediate home defense suspends an accepted request and redirects the army to its own capital');
}
{
  const s = scene(); order(s, 'offensive', s.enemy);
  spawnArmy(s.ctx, 'ROM', s.enemy.name, { inf: 80, name: 'Overwhelming defenders' });
  const log = []; planWar(s.ctx, 'NAB', { log });
  assert(!log.some(p => p.alliedOrder && p.prov === s.enemy.id), 'acceptance never overrides battle forecasts');
  assert.notEqual(destination(s.army), s.enemy.id);
  console.log('PASS accepted offensive orders cannot force an army into a losing battle');
}
console.log('allied-orders-war: ALL PASS');
