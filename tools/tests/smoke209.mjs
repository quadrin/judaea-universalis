// Fort approaches: real orders, daily movement, AI planning and save recovery.
import assert from 'node:assert/strict';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { initGame, makeCtx, gameActions, reviveGame } from '../../js/sim/init.js';
import { fortControl, fortRegions, fortStep, landRoutes } from '../../js/sim/fort_control.js';
import { findPath, issueMove, moveArmiesDaily, siegeFall, tickSieges, splitArmyCore, splitArmyByArmCore } from '../../js/sim/military.js';
import { planWar } from '../../js/sim/ai_war.js';
import { computeMapmodeColors } from '../../js/map/mapmodes.js';

const era = ERAS.find(e => e.bookmark.id === '66ce');
function scene() {
  const geom = { neighbors: Array.from({ length: 8 }, () => new Set()),
    centroids: Array.from({ length: 8 }, (_, i) => ({ x: i * 20, y: 80 })), coastal: [] };
  const game = initGame({ DEFINES, MAP_DATA, geom: { neighbors: Array.from({ length: MAP_DATA.provinces.length + 1 }, () => new Set()) }, bookmark: era.bookmark, events: [], playerTag: 'JUD', rngSeed: 7 });
  const sample = game.provinces.find(Boolean);
  game.provinces = [null, ...['Home', 'Approach', 'Gateway', 'Interior', 'Detour', 'Farmland', 'Neutral'].map((name, i) => ({
    ...structuredClone(sample), id: i + 1, name, canon: name, owner: i === 0 ? 'JUD' : i === 6 ? 'NAB' : 'ROM',
    controller: i === 0 ? 'JUD' : i === 6 ? 'NAB' : 'ROM', impassable: false, terrain: 'farmland',
    fort: i === 2 ? 1 : 0, garrison: i === 2 ? 1000 : 0, maxGarrison: i === 2 ? 1000 : 0,
    mothballed: false, siege: null, dev: { tax: i === 2 ? 1 : 8, prod: 2, mp: 2 },
  }))];
  for (const t of Object.values(game.tags)) { t.atWarWith = []; t.allies = []; t.overlord = null; }
  game.tags.JUD.atWarWith = ['ROM']; game.tags.ROM.atWarWith = ['JUD'];
  game.tags.JUD.ai = false;
  game.wars = [{ id: 'fort-test', attackers: ['JUD'], defenders: ['ROM'],
    started: { y: 66, m: 1, d: 1 }, warscore: { JUD: 0, ROM: 0 }, cb: 'conquest' }];
  game.battles = []; game.armies = {}; game.flags = { _setupDone: true }; game.ceasefire = null; game.truces = {};
  const link = (a, b) => { geom.neighbors[a].add(b); geom.neighbors[b].add(a); };
  for (const [a, b] of [[1, 2], [2, 3], [2, 4], [3, 4], [4, 6], [1, 5], [6, 7]]) link(a, b);
  const notices = [];
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark: { ...era.bookmark, aiObjectives: {}, tagTweaks: { JUD: { capital: 'Home' }, ROM: { capital: 'Gateway' } } }, events: [],
    bus: { emit: (name, payload) => { if (name === 'notify') notices.push(payload); }, on: () => () => {} } });
  const army = { id: 1, tag: 'JUD', name: 'Expedition', prov: 1, path: [], moveDaysLeft: 0,
    regiments: { inf: 8, cav: 2, art: 0 }, men: 10000, morale: 3, maxMorale: 3,
    gen: 0, inBattle: false, retreating: false, general: null };
  game.armies[1] = army; game.nextArmyId = 2;
  return { game, ctx, geom, army, link, notices, actions: gameActions(ctx), p: id => game.provinces[id] };
}
function arrive(ctx, army, id) {
  for (let d = 0; d < 100 && army.prov !== id; d++) moveArmiesDaily(ctx);
  assert.equal(army.prov, id);
}

{
  const { ctx, army, actions, notices, game } = scene();
  const before = JSON.stringify(game);
  assert.deepEqual(findPath(ctx, 'JUD', 1, 3, army), [2, 3]);
  assert.equal(findPath(ctx, 'JUD', 1, 6, army), null);
  const preview = actions.getMarchInfo(1, 6);
  assert.equal(preview.ok, false); assert.match(preview.why, /Gateway.*guards/);
  assert.equal(JSON.stringify(game), before, 'previews do not change saves or random state');
  actions.moveArmy(1, 6); assert.equal(army.path.length, 0);
  assert.match(notices.at(-1).text, /Gateway/);
  assert.deepEqual(actions.getFortRoutes(2).guards, [{ id: 3, name: 'Gateway' }]);
  console.log('PASS protected interiors, named refusal, pure previews, and approach inspection');
}
{
  const { ctx, army, p } = scene();
  assert(issueMove(ctx, army, 2)); arrive(ctx, army, 2);
  assert.deepEqual(army.fortApproach, [1]);
  p(2).controller = 'JUD'; p(2).siege = null;
  assert(!issueMove(ctx, army, 4), 'occupying the approach cannot bypass the fortress');
  assert(issueMove(ctx, army, 3)); arrive(ctx, army, 3);
  assert.deepEqual(army.fortApproach, [1, 2]);
  assert(!issueMove(ctx, army, 6), 'a hostile fort cannot be used as a transit tile');
  assert(issueMove(ctx, army, 1)); arrive(ctx, army, 1);
  assert.equal(army.fortApproach, undefined);
  console.log('PASS approach occupation, hostile fort transit, and multi-step voluntary withdrawal');
}
{
  const { ctx, army, p } = scene();
  assert(issueMove(ctx, army, 3)); arrive(ctx, army, 3);
  assert(p(3).siege); siegeFall(ctx, p(3));
  assert.equal(p(3).controller, 'JUD');
  assert(issueMove(ctx, army, 6)); arrive(ctx, army, 6);
  assert.equal(army.fortApproach, undefined);
  console.log('PASS the real siege capture opens the corridor immediately');
}
{
  const { ctx, army, p } = scene();
  for (const disabled of ['mothballed', 'empty', 'captured', 'neutral']) {
    p(3).mothballed = disabled === 'mothballed'; p(3).garrison = disabled === 'empty' ? 0 : 1000;
    p(3).controller = disabled === 'captured' ? 'JUD' : disabled === 'neutral' ? 'NAB' : 'ROM';
    assert(findPath(ctx, 'JUD', 1, 6, army), disabled + ' fort cannot block this army');
  }
  console.log('PASS mothballed, empty, captured and neutral forts');
}
{
  const { ctx, army, link } = scene();
  link(5, 6);
  assert.deepEqual(findPath(ctx, 'JUD', 1, 4, army), [5, 6, 4]);
  const routes = landRoutes(ctx, army, { maxCost: 100, cost: (a, b) => a === 1 && b === 5 ? 20 : 2 });
  assert.equal(routes.dist.get(4), 24); assert.deepEqual(routes.pathTo(4), [5, 6, 4]);
  console.log('PASS alternative approaches and weighted AI routes preserve entry history');
}
{
  const { ctx, army, p, notices } = scene();
  p(3).mothballed = true;
  assert(issueMove(ctx, army, 6)); arrive(ctx, army, 2);
  p(3).mothballed = false;
  moveArmiesDaily(ctx);
  assert.equal(army.prov, 2); assert.equal(army.path.length, 0);
  assert.match(notices.at(-1).text, /Gateway/);
  const count = notices.length;
  moveArmiesDaily(ctx); assert.equal(notices.length, count);
  army.retreating = true; army.path = [4, 6];
  arrive(ctx, army, 6); assert.equal(army.fortApproach, undefined);
  console.log('PASS live orders halt when a fort reactivates; forced retreats remain possible');
}
{
  const { ctx, army, p } = scene();
  p(4).fort = 1; p(4).garrison = 1000;
  p(3).controller = 'JUD'; army.prov = 3; army.fortApproach = [1, 2];
  assert(!issueMove(ctx, army, 6), 'a second fort still guards the corridor');
  assert(issueMove(ctx, army, 4));
  p(4).controller = 'JUD'; assert(issueMove(ctx, army, 6));
  console.log('PASS overlapping forts must be cleared independently');
}
{
  const { ctx, army, game } = scene();
  assert(issueMove(ctx, army, 3)); arrive(ctx, army, 3);
  const restored = reviveGame(JSON.parse(JSON.stringify(game)));
  const restoredCtx = { ...ctx, game: restored, byId: id => restored.provinces[id] };
  assert.deepEqual(findPath(restoredCtx, 'JUD', 3, 1, restored.armies[1]), [2, 1]);
  const half = game.armies[splitArmyCore(ctx, army)];
  assert.deepEqual(half.fortApproach, army.fortApproach); assert.notEqual(half.fortApproach, army.fortApproach);
  const ids = splitArmyByArmCore(ctx, army);
  assert(ids.length); assert.deepEqual(game.armies[ids[0]].fortApproach, [1, 2]);
  delete army.fortApproach;
  assert.deepEqual(findPath(ctx, 'JUD', 3, 1, army), [2, 1], 'older saves can withdraw home');
  assert(issueMove(ctx, army, 1)); arrive(ctx, army, 1);
  console.log('PASS save restoration, both split commands and missing-history withdrawal');
}
{
  const { ctx, army, p, game } = scene();
  p(2).controller = 'JUD'; army.prov = 2; army.fortApproach = [1];
  game.tags.JUD.ai = true;
  p(5).owner = p(5).controller = 'NAB';
  planWar(ctx, 'JUD');
  assert.equal(army.path.at(-1), 3, 'AI besieges the gateway rather than ordering an impossible advance');
  for (const to of army.path) assert.notEqual(fortStep(fortControl(ctx, 'JUD'), 2, to, [1]), null);
  const colors = computeMapmodeColors(ctx, 'forts');
  assert.notDeepEqual([...colors.primary.slice(2 * 4, 2 * 4 + 3)], [...colors.primary.slice(6 * 4, 6 * 4 + 3)]);
  assert.equal(fortRegions(ctx).length, 1);
  console.log('PASS AI targets the gateway and the map distinguishes guarded from open land');
  for (let day = 0; day < 300 && p(6).controller !== 'JUD'; day++) {
    game.date.d = day % 28 + 1; game.date.m = Math.floor(day / 28) % 12 + 1;
    if (day % 5 === 0) planWar(ctx, 'JUD');
    moveArmiesDaily(ctx); tickSieges(ctx);
  }
  assert.equal(p(3).controller, 'JUD'); assert.equal(p(6).controller, 'JUD');
  console.log('PASS AI completes the gateway siege and advances into the interior');
}
console.log('ALL PASS: fort-controlled routes');
