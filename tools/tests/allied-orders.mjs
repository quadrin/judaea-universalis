import assert from 'node:assert/strict';
import { alliedOrdersView, requestAlliedOrder, cancelAlliedOrder, alliedOrderTasks, monthlyAlliedOrders } from '../../js/sim/allied_orders.js';

function scene() {
  const tags = Object.fromEntries(['A', 'B', 'C', 'D'].map(tag => [tag, { alive: true, ai: tag !== 'A', name: tag, treasury: 100,
    manpower: 5000, maxManpower: 10000, warExhaustion: 0, allies: [], opinion: {}, guarantees: [], atWarWith: [], modifiers: [] }]));
  tags.A.allies = ['B']; tags.B.allies = ['A']; tags.B.opinion.A = 80;
  tags.B.diplomaticCredit = { A: { trust: 60, favors: 10 } };
  tags.A.atWarWith = ['C']; tags.B.atWarWith = ['C']; tags.C.atWarWith = ['A', 'B'];
  const provinces = [null, ...['A', 'B', 'C', 'D', 'C'].map((owner, i) => ({ id: i + 1, name: `Province ${i + 1}`, owner, controller: owner,
    dev: { tax: 1, prod: 1, mp: 1 }, fort: 0, garrison: 0 }))];
  const war = { id: 'joint-war', attackers: ['A', 'B'], defenders: ['C'] };
  const army = { id: 'b-army', tag: 'B', prov: 2, men: 5000, path: [] };
  const game = { tags, provinces, armies: { 'b-army': army }, wars: [war], date: { y: -167, m: 1 }, playerTag: 'A', humanTags: ['A'], flags: {} };
  return { game, DEFINES: { TAGS: {} }, geom: { neighbors: [new Set(), new Set([2, 3]), new Set([1]), new Set([1, 4]), new Set([3]), new Set()] },
    byId: id => provinces[id], bus: { emit() {} } };
}
function advance(ctx, months = 1) { for (let i = 0; i < months; i++) { ctx.game.date.m++; if (ctx.game.date.m > 12) { ctx.game.date.m = 1; ctx.game.date.y++; } monthlyAlliedOrders(ctx); } }
{
  const ctx = scene(), before = JSON.stringify(ctx.game);
  const view = alliedOrdersView(ctx); assert.equal(JSON.stringify(ctx.game), before, 'viewing intentions never mutates the simulation');
  assert(view.allies[0].options.some(o => o.kind === 'offensive' && o.province === 3 && o.can));
  const accepted = requestAlliedOrder(ctx, 'A', 'B', 'offensive', 3); assert(accepted.ok);
  assert.equal(ctx.game.tags.B.diplomaticCredit.A.favors, 5);
  assert.equal(alliedOrderTasks(ctx, 'B')[0].province, 3);
  assert.equal(alliedOrderTasks(ctx, 'B')[0].priority, 45);
  alliedOrdersView(ctx); alliedOrderTasks(ctx, 'B'); assert.equal(ctx.game.tags.B.diplomaticCredit.A.favors, 5, 'favors charged once on acceptance');
  const duplicate = requestAlliedOrder(ctx, 'A', 'B', 'defend', 1); assert(!duplicate.ok); assert.equal(ctx.game.tags.B.diplomaticCredit.A.favors, 5);
  assert(!cancelAlliedOrder(ctx, 'C', accepted.id).ok); assert(cancelAlliedOrder(ctx, 'A', accepted.id).ok); assert.deepEqual(alliedOrderTasks(ctx, 'B'), []);
  console.log('PASS pure preview, accepted planner task, finite favor cost, duplicate rejection and authorized cancellation');
}
{
  const ctx = scene();
  for (let id = 6; id <= 50; id++) {
    ctx.game.provinces[id] = { id, name: `Friendly province ${id}`, owner: 'A', controller: 'A', dev: { tax: 1, prod: 1, mp: 1 } };
    ctx.geom.neighbors[id] = new Set([1]); ctx.geom.neighbors[1].add(id);
  }
  const options = alliedOrdersView(ctx).allies[0].options;
  assert(options.filter(o => o.kind === 'defend' && o.can).length > 36);
  assert(options.some(o => o.kind === 'offensive' && o.province === 3 && o.can), 'large realms retain every valid offensive objective after defensive options');
  console.log('PASS large allied realms retain complete offensive and defensive objective selection');
}
{
  const ctx = scene(); ctx.game.tags.B.ai = false; ctx.game.humanTags.push('B');
  assert(!requestAlliedOrder(ctx, 'A', 'B', 'offensive', 3).ok); assert.deepEqual(alliedOrderTasks(ctx, 'B'), []);
  assert.equal(ctx.game.tags.B.diplomaticCredit.A.favors, 10);
  ctx.game.tags.B.ai = true; ctx.game.wars[0].attackers = ['A']; ctx.game.wars[0].defenders = ['B', 'C'];
  assert(!requestAlliedOrder(ctx, 'A', 'B', 'offensive', 3).ok);
  console.log('PASS human military autonomy and shared-side war requirement');
}
{
  const ctx = scene();
  assert(!requestAlliedOrder(ctx, 'A', 'B', 'offensive', 5).ok, 'isolated objective cannot be promised');
  assert(!requestAlliedOrder(ctx, 'A', 'B', 'offensive', 4).ok, 'neutral province cannot become a war objective');
  assert(!requestAlliedOrder(ctx, 'A', 'B', 'relieve', 1).ok, 'relief requires actual enemy occupation, siege or army');
  ctx.game.tags.B.diplomaticCredit.A.trust = 10; assert(!requestAlliedOrder(ctx, 'A', 'B', 'offensive', 3).ok);
  ctx.game.tags.B.diplomaticCredit.A.trust = 60; ctx.game.tags.B.warExhaustion = 19;
  assert(!requestAlliedOrder(ctx, 'A', 'B', 'offensive', 3).ok); assert.equal(ctx.game.tags.B.diplomaticCredit.A.favors, 10);
  console.log('PASS legal reachability, target relevance, trust, exhaustion and no costs for refusal');
}
{
  const ctx = scene(); assert(requestAlliedOrder(ctx, 'A', 'B', 'offensive', 3).ok);
  ctx.byId(2).siege = { by: 'C', progress: 10 };
  assert.deepEqual(alliedOrderTasks(ctx, 'B'), [], 'urgent capital relief immediately overrides accepted foreign requests');
  assert.equal(alliedOrdersView(ctx).requests[0].status, 'suspended');
  monthlyAlliedOrders(ctx); assert.equal(ctx.game.alliedOrders.requests[0].status, 'suspended');
  ctx.byId(2).siege = null; advance(ctx); assert.equal(ctx.game.alliedOrders.requests[0].status, 'accepted');
  ctx.game.armies['b-army'].path = [1, 3]; advance(ctx); assert.equal(ctx.game.alliedOrders.requests[0].status, 'marching');
  ctx.byId(3).controller = 'B'; advance(ctx); assert.equal(ctx.game.alliedOrders.requests[0].status, 'completed');
  assert.deepEqual(alliedOrderTasks(ctx, 'B'), []);
  console.log('PASS urgent home defense, resumption, actual marching progress and captured objective completion');
}
{
  const ctx = scene(); ctx.byId(1).controller = 'C'; assert(requestAlliedOrder(ctx, 'A', 'B', 'relieve', 1).ok);
  assert.equal(alliedOrderTasks(ctx, 'B')[0].priority, 80);
  ctx.game.armies['b-army'].prov = 1;
  ctx.byId(1).controller = 'A'; monthlyAlliedOrders(ctx); assert.equal(ctx.game.alliedOrders.requests[0].status, 'completed');
  assert(ctx.game.tags.A.courtPlan.memories.some(m => m.other === 'B' && m.kind === 'rescued'));
  const restored = JSON.parse(JSON.stringify(ctx.game)); assert.equal(restored.alliedOrders.requests[0].status, 'completed');
  console.log('PASS real relief completion and saved diplomatic memory');
}
{
  const ctx = scene(); ctx.byId(1).controller = 'C'; assert(requestAlliedOrder(ctx, 'A', 'B', 'relieve', 1).ok);
  ctx.byId(1).controller = 'A'; monthlyAlliedOrders(ctx);
  assert.equal(ctx.game.alliedOrders.requests[0].status, 'completed');
  assert(!ctx.game.tags.A.courtPlan?.memories?.some(m => m.kind === 'rescued'), 'a player’s unaided relief gives the ally no false rescue credit');
  console.log('PASS relief resolved by another army grants no unearned diplomatic memory');
}
{
  const ctx = scene(); assert(requestAlliedOrder(ctx, 'A', 'B', 'defend', 1).ok);
  ctx.game.armies['b-army'].prov = 1; monthlyAlliedOrders(ctx); advance(ctx);
  ctx.game.armies['b-army'].prov = 2; advance(ctx); assert.equal(ctx.game.alliedOrders.requests[0].arrived, undefined);
  ctx.game.armies['b-army'].prov = 1; advance(ctx); assert.equal(ctx.game.alliedOrders.requests[0].status, 'holding', 'returning after leaving restarts the hold clock');
  advance(ctx); assert.equal(ctx.game.alliedOrders.requests[0].status, 'holding'); advance(ctx); assert.equal(ctx.game.alliedOrders.requests[0].status, 'completed');
  console.log('PASS defensive holding requires two consecutive months on the objective');
}
{
  const ctx = scene(); ctx.game.armies['b-army'].aboard = 'transport';
  assert(!requestAlliedOrder(ctx, 'A', 'B', 'offensive', 3).ok);
  delete ctx.game.armies['b-army'].aboard; ctx.game.armies['b-army'].shatteredDays = 5;
  assert(!requestAlliedOrder(ctx, 'A', 'B', 'offensive', 3).ok);
  ctx.game.armies['b-army'].shatteredDays = 0; assert(requestAlliedOrder(ctx, 'A', 'B', 'offensive', 3).ok);
  ctx.game.tags.B.allies = []; assert.deepEqual(alliedOrderTasks(ctx, 'B'), []);
  monthlyAlliedOrders(ctx); assert.equal(ctx.game.alliedOrders.requests[0].status, 'cancelled');
  assert(!requestAlliedOrder(ctx, 'A', 'B', 'teleport', 3).ok);
  console.log('PASS embarked/shattered army exclusion, mutual alliance revalidation and unknown-order rejection');
}
{
  const ctx = scene(); assert(requestAlliedOrder(ctx, 'A', 'B', 'defend', 1).ok);
  ctx.byId(1).controller = 'C';
  const before = JSON.stringify(ctx.game), current = alliedOrdersView(ctx).requests[0];
  assert.equal(current.status, 'suspended'); assert.match(current.reason, /relief/);
  assert.equal(JSON.stringify(ctx.game), before, 'dynamic target invalidation is pure');
  monthlyAlliedOrders(ctx); assert.equal(ctx.game.alliedOrders.requests[0].status, 'suspended');
  assert.match(ctx.game.alliedOrders.requests[0].reason, /relief/);
  assert.deepEqual(alliedOrderTasks(ctx, 'B'), []);
  ctx.game.wars = []; assert.equal(alliedOrdersView(ctx).requests[0].status, 'completed', 'ended war appears immediately between council ticks');
  console.log('PASS occupied defensive objectives suspend with actionable reasons and ended wars appear immediately');
}
{
  const ctx = scene(); assert(requestAlliedOrder(ctx, 'A', 'B', 'defend', 1).ok); ctx.game.date.m += 6;
  assert.equal(alliedOrdersView(ctx).requests[0].status, 'expired', 'expiry appears before the next monthly update');
  assert.equal(ctx.game.alliedOrders.requests[0].status, 'accepted', 'expiry preview does not mutate saved state');
  monthlyAlliedOrders(ctx);
  assert.equal(ctx.game.alliedOrders.requests[0].status, 'expired'); assert.deepEqual(alliedOrderTasks(ctx, 'B'), []);
  console.log('PASS six-month commitment expires and stops supplying military tasks');
}
{
  const { readFileSync } = await import('node:fs');
  const { DEFINES } = await import('../../js/data/defines.js');
  const { MAP_DATA } = await import('../../js/data/map_data.js');
  const { ERAS } = await import('../../js/data/compendium.js');
  const { buildProvinceMapping } = await import('../../js/data/map_profile.js');
  const { initGame, makeCtx, gameActions, reviveGame } = await import('../../js/sim/init.js');
  const { switchTagCore } = await import('../../js/sim/military.js');
  const era = ERAS.find(e => e.bookmark.id === '66ce'), provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
  const snap = JSON.parse(readFileSync(new URL('../geom-snapshot.json', import.meta.url)));
  const geom = { neighbors: snap.neighbors.map(n => new Set(n)), coastal: snap.coastal.map(Boolean),
    centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null), areas: Int32Array.from(snap.areas), bbox: [] };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events, playerTag: 'JUD', rngSeed: 7, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events, provinceMap,
    bus: { emit() {}, on() { return () => {}; } } });
  game.armies = {}; game.wars = [{ id: 'formation-war', attackers: ['JUD', 'NAB'], defenders: ['ROM'] }];
  for (const t of Object.values(game.tags)) { t.atWarWith = []; t.allies = []; t.guarantees = []; t.overlord = null; t.modifiers = []; }
  game.tags.JUD.allies = ['NAB']; game.tags.NAB.allies = ['JUD']; game.tags.JUD.atWarWith = ['ROM']; game.tags.NAB.atWarWith = ['ROM']; game.tags.ROM.atWarWith = ['JUD', 'NAB'];
  game.tags.NAB.ai = true; game.tags.NAB.opinion.JUD = 120; game.tags.NAB.treasury = 1000; game.tags.NAB.warExhaustion = 0;
  for (const p of game.provinces) if (p) { p.controller = p.owner; p.siege = null; p.fort = 0; p.garrison = 0; }
  const home = game.provinces.find(p => p?.owner === 'NAB' && !p.impassable), target = game.provinces.find(p => p?.owner === 'JUD' && !p.impassable);
  geom.neighbors[home.id].add(target.id); geom.neighbors[target.id].add(home.id);
  game.armies['council-army'] = { id: 'council-army', tag: 'NAB', prov: home.id, men: 5000, path: [] };
  const actions = gameActions(ctx), result = actions.requestAlliedOrder('NAB', 'defend', target.id);
  assert(result.ok, result.why); assert(actions.getAlliedOrders().requests.some(r => r.id === result.id));
  const restored = reviveGame(JSON.parse(JSON.stringify(game)));
  assert.equal(restored.alliedOrders.requests[0].status, 'accepted');
  const formed = ['MLI', 'HAS'].find(tag => DEFINES.TAGS[tag] && !game.tags[tag]?.alive);
  assert(formed); assert(switchTagCore(ctx, 'JUD', formed));
  assert.equal(game.alliedOrders.requests[0].requester, formed); assert.equal(game.alliedOrders.requests[0].ally, 'NAB');
  assert(alliedOrderTasks(ctx, 'NAB').some(r => r.id === result.id), 'formation preserves a valid shared-war order');
  assert(gameActions(ctx).cancelAlliedOrder(result.id).ok);
  console.log('PASS public action wrappers, actual save revival, formed-nation remapping and cancellation');
}
console.log('allied-orders: ALL PASS');
