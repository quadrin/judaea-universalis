// Campaign planning: real commands, resource accounting, diplomacy, and saves.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { buildProvinceMapping } from '../../js/data/map_profile.js';
import { initGame, makeCtx, gameActions, reviveGame } from '../../js/sim/init.js';
import * as mil from '../../js/sim/military.js';
import { combatFrontage, fieldStrength } from '../../js/sim/frontage.js';
import { armyTemplatePlan, recruitTemplate, advanceRallies } from '../../js/sim/muster.js';
import { monthlyRecruitment } from '../../js/sim/recruitment.js';
import { offensiveCall, strategicInterests, diplomaticCredit, settlePromises, expansionPreview,
  applyExpansion, monthlyStrategy, warEnthusiasm } from '../../js/sim/strategy.js';
import { normalizeMessageModes, messageCategory } from '../../js/ui/message_policy.js';

const ERA = ERAS.find(e => e.bookmark.id === '66ce');
const snap = JSON.parse(readFileSync(new URL('../geom-snapshot.json', import.meta.url)));
const mapping = buildProvinceMapping(MAP_DATA, ERA.bookmark);
const to = id => mapping?.[id] || id;
const neighbors = snap.neighbors.map(() => new Set());
for (let id = 1; id < neighbors.length; id++) for (const nb of snap.neighbors[id]) {
  if (to(id) !== to(nb)) { neighbors[to(id)].add(to(nb)); neighbors[to(nb)].add(to(id)); }
}
const geom = { neighbors, centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null),
  coastal: snap.coastal.map(Boolean), areas: Int32Array.from(snap.areas), bbox: [] };
function scene() {
  const notices = [];
  const bus = { emit: (name, p) => { if (name === 'notify') notices.push(p); }, on: () => () => {} };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: ERA.bookmark, events: ERA.events,
    playerTag: 'JUD', rngSeed: 7, provinceMap: mapping });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: ERA.bookmark, events: ERA.events, provinceMap: mapping });
  game.armies = {}; game.battles = []; game.wars = []; game.truces = {};
  for (const t of Object.values(game.tags)) t.atWarWith = [];
  return { ctx, game, notices, actions: gameActions(ctx) };
}

{
  const { ctx } = scene();
  const p = ctx.prov('Jerusalem');
  const mountain = { ...p, terrain: 'mountains' }, plain = { ...p, terrain: 'farmland' };
  const mountainCtx = { ...ctx, byId: () => mountain }, plainCtx = { ...ctx, byId: () => plain };
  assert(combatFrontage(mountainCtx, p.id).capacity < combatFrontage(plainCtx, p.id).capacity);
  const army = ctx.game.armies[mil.spawnArmy(ctx, 'JUD', p.name, { inf: 40 })];
  const stats = mil.sideStats(mountainCtx, [army], 'fire', p.id);
  assert.equal(stats.men, 8000); assert.equal(stats.totalMen, 40000); assert.equal(stats.reserveMen, 32000);
  assert(stats.moraleShare > 0.2 && stats.moraleShare < 1);
  assert.equal(fieldStrength(7000, 8000).reserves, 0);
  assert.equal(fieldStrength(0, 8000).engaged, 0);
  console.log('PASS terrain frontage, reserves, and depletion');
}
{
  const { ctx, game, actions } = scene();
  const ally = game.tags.NAB;
  game.tags.JUD.allies = ['NAB']; ally.allies = ['JUD']; ally.overlord = null;
  ally.opinion.JUD = 5; ally.manpower = 10000; ally.maxManpower = 10000; ally.treasury = 200;
  ally.diplomaticCredit = { JUD: { trust: 50, favors: 12 } };
  const before = JSON.stringify(game);
  const refusal = actions.getWarPlan('ROM').allies.find(a => a.ally === 'NAB');
  assert.equal(refusal.ok, false);
  const answer = actions.getWarPlan('ROM', { NAB: { favors: true } }).allies.find(a => a.ally === 'NAB');
  assert.equal(answer.ok, true);
  ally.treasury = -500;
  const insolvent = actions.getWarPlan('ROM', { NAB: { favors: true } }).allies.find(a => a.ally === 'NAB');
  assert.equal(insolvent.ok, false); assert(insolvent.reasons.some(r => /cannot pay/.test(r)));
  ally.treasury = 200;
  assert.equal(JSON.stringify(game), before, 'previews must not change credit or game state');
  const war = mil.declareWar(ctx, 'JUD', 'ROM', 'Credit test', { type: 'conquest', offers: { NAB: { favors: true } } });
  assert(war.attackers.includes('NAB')); assert.equal(diplomaticCredit(ctx, 'NAB', 'JUD').favors, 2);
  const noCredit = offensiveCall(ctx, 'NAB', 'JUD', 'ROM', { favors: true }, { ok: true });
  assert.equal(noCredit.ok, false);
  const p = strategicInterests(ctx, 'NAB', 'ROM')[0]; assert(p);
  war.promises = [{ caller: 'JUD', ally: 'NAB', province: p.id }]; war.promiseVictory = { JUD: true };
  ctx.byId(p.id).owner = 'NAB'; settlePromises(ctx, war);
  assert.equal(diplomaticCredit(ctx, 'NAB', 'JUD').trust, 60);
  settlePromises(ctx, war); assert.equal(diplomaticCredit(ctx, 'NAB', 'JUD').trust, 60, 'settlement is idempotent');
  war.promises = [{ caller: 'JUD', ally: 'NAB', province: p.id }]; ctx.byId(p.id).owner = 'JUD';
  settlePromises(ctx, war); assert.equal(diplomaticCredit(ctx, 'NAB', 'JUD').trust, 35);
  const restored = reviveGame(JSON.parse(JSON.stringify(game)));
  assert.equal(restored.tags.NAB.diplomaticCredit.JUD.trust, 35);
  assert.equal(restored.wars[0].promises[0].province, p.id);
  mil.breakAllianceCore(ctx, 'JUD', 'NAB');
  assert.equal(diplomaticCredit(ctx, 'NAB', 'JUD').trust, 15);
  assert.equal(diplomaticCredit(ctx, 'NAB', 'JUD').favors, 0);
  game.tags.NAB.overlord = 'PAR'; game.tags.JUD.allies = ['NAB'];
  assert(offensiveCall(ctx, 'NAB', 'JUD', 'ROM').reasons.includes('Their overlord controls foreign policy'));
  console.log('PASS favors, promises, alliance betrayal, refusal reasons, idempotence, save restoration');
}
{
  const land = [null,
    { id: 1, name: 'Conquest', owner: 'B', controller: 'A', x: 0, y: 0, dev: { tax: 30, prod: 20, mp: 20 }, religion: 'r', culture: 'c' },
    { id: 2, owner: 'N', controller: 'N', x: 100, y: 0, dev: {} },
    { id: 3, owner: 'F', controller: 'F', x: 4000, y: 0, dev: {} }];
  const tags = Object.fromEntries(['A', 'B', 'N', 'F'].map(tag => [tag, { alive: true, opinion: { A: -30 }, religion: 'r', culture: 'c', allies: [] }]));
  const ctx = { game: { provinces: land, tags, wars: [], armies: {}, date: { y: 66, m: 1 } },
    byId: id => land[id], bookmark: {}, DEFINES: {} };
  const before = JSON.stringify(ctx.game);
  const rows = expansionPreview(ctx, 'A', [1, 1]);
  assert.equal(JSON.stringify(ctx.game), before);
  const near = rows.find(r => r.tag === 'N'), far = rows.find(r => r.tag === 'F');
  assert(near.gain > far.gain * 5); assert(near.newlyAlarmed); assert(!far.coalition);
  applyExpansion(ctx, 'A', rows);
  assert.equal(tags.N.expansionConcern.A, near.after); assert(mil.coalitionAgainst(ctx, 'A').includes('N'));
  monthlyStrategy(ctx); assert(tags.N.expansionConcern.A < near.after);
  console.log('PASS regional concern, distance, coalition thresholds, decay, pure previews');
}
{
  const { ctx, game } = scene();
  const war = { attackers: ['JUD'], defenders: ['ROM'], started: { ...game.date } };
  game.tags.ROM.manpower = game.tags.ROM.maxManpower; game.tags.ROM.warExhaustion = 0;
  const strong = warEnthusiasm(ctx, war, 'ROM', 'JUD');
  game.tags.ROM.manpower = 0; game.tags.ROM.warExhaustion = 18;
  for (const p of game.provinces) if (p?.owner === 'ROM') p.controller = 'JUD';
  const weak = warEnthusiasm(ctx, war, 'ROM', 'JUD');
  assert(weak.willingness > strong.willingness); assert.equal(weak.level, 'Low');
  const before = JSON.stringify(game); warEnthusiasm(ctx, war, 'ROM', 'JUD'); assert.equal(JSON.stringify(game), before);
  war.warscore = { JUD: 100, ROM: -100 }; war.cb = 'conquest';
  const info = mil.peaceDealInfo(ctx, war, 'JUD');
  const deal = { provinces: info.provinces.slice(0, 1).map(p => p.id) };
  const { expansion, ...preview } = mil.evaluatePeaceDeal(ctx, war, 'JUD', deal);
  const { expansion: omitted, ...candidate } = mil.evaluatePeaceDeal(ctx, war, 'JUD', deal, { consequences: false });
  assert.deepEqual(candidate, preview, 'AI candidate search uses the same prices and willingness as the player');
  assert.equal(omitted.length, 0); assert(expansion.length > 0);
  console.log('PASS peace willingness, pure previews, and AI/player evaluation parity');
}
{
  const { ctx, game, actions } = scene();
  const t = game.tags.JUD; t.treasury = 1000; t.manpower = 50000;
  for (const p of game.provinces) if (p?.owner === 'JUD') { p.controller = 'JUD'; p.buildings = []; p.construction = null; p.siege = null; }
  const before = JSON.stringify(game), rows = actions.getMacrobuilder('market').filter(r => r.canBuild);
  assert(rows.length >= 2); assert(rows[0].income > 0); assert.equal(JSON.stringify(game), before);
  const ids = rows.slice(0, 2).map(r => r.id);
  t.treasury = 1;
  assert.equal(actions.buildMacroSelection(ids, 'market').ok, false);
  assert(ids.every(id => !ctx.byId(id).construction), 'an unaffordable batch does no partial work');
  t.treasury = 1000;
  assert.equal(actions.buildMacroSelection(ids, 'market').ok, true);
  assert.equal(t.treasury, 1000 - DEFINES.BUILDINGS.market.cost * 2);
  assert(ids.every(id => ctx.byId(id).construction?.key === 'market'));
  console.log('PASS building income comparisons, availability, and atomic resource checks');
}
{
  const { ctx, game, actions, notices } = scene();
  const t = game.tags.JUD; t.treasury = 1000; t.manpower = 50000;
  for (const p of game.provinces) if (p?.owner === 'JUD') { p.controller = 'JUD'; p.siege = null; }
  const rally = ctx.prov('Jerusalem').id, counts = { inf: 4, cav: 1, art: 1 };
  const plan = armyTemplatePlan(ctx, 'JUD', counts, rally); assert(plan.ok);
  assert.equal(plan.orders.length, 6); assert(new Set(plan.orders.map(o => o.provId)).size > 1);
  assert.equal(armyTemplatePlan(ctx, 'JUD', { inf: -1 }, rally).ok, false);
  assert.equal(armyTemplatePlan(ctx, 'JUD', { inf: 1.5 }, rally).ok, false);
  const old = JSON.stringify(game); t.manpower = 0;
  assert.equal(recruitTemplate(ctx, 'JUD', counts, rally).ok, false);
  assert(game.provinces.every(p => !p?.unitQueue?.length));
  t.manpower = 50000;
  const result = recruitTemplate(ctx, 'JUD', counts, rally); assert(result.ok);
  assert.equal(t.treasury, 1000 - plan.cost); assert.equal(t.manpower, 50000 - plan.manpower);
  assert(actions.saveArmyTemplate('Combined force', counts, rally).ok);
  assert.equal(reviveGame(JSON.parse(JSON.stringify(game))).armyTemplates[0].name, 'Combined force');
  const blocked = game.provinces.find(p => p?.unitQueue?.length);
  blocked.controller = 'ROM'; monthlyRecruitment(ctx); monthlyRecruitment(ctx);
  assert.equal(notices.filter(n => n.title === 'Recruitment stalled').length, 1);
  blocked.controller = 'JUD';
  for (let month = 0; month < 15; month++) {
    monthlyRecruitment(ctx);
    for (let day = 0; day < 30; day++) { advanceRallies(ctx); mil.moveArmiesDaily(ctx); }
  }
  const army = Object.values(game.armies).filter(a => a.templateId === result.templateId);
  assert.equal(army.length, 1); assert.equal(army[0].prov, rally);
  assert.deepEqual(army[0].regiments, counts); assert.equal(army[0].men, plan.manpower);
  assert.notEqual(JSON.stringify(game), old);
  const field = ctx.byId(rally); field.buildings = [...(field.buildings || []), 'airfield'];
  game.airwings = Object.fromEntries([1, 2, 3, 4].map(id => [id, { id, tag: 'JUD', prov: rally }]));
  field.unitQueue = [{ id: 999, tag: 'JUD', type: 'wing', monthsLeft: 0, totalMonths: 1 }];
  const priorAlerts = notices.filter(n => n.title === 'Recruitment stalled').length;
  monthlyRecruitment(ctx); monthlyRecruitment(ctx);
  assert.equal(notices.filter(n => n.title === 'Recruitment stalled').length, priorAlerts + 1,
    'a completed aircraft waiting for hangar space alerts once, not every month');
  console.log('PASS distributed musters, training, rally routes, merging, accounting, and stall alerts');
}
{
  const modes = normalizeMessageModes({ siege: 'pause', battle: 'bogus', general: 'off' });
  assert.equal(modes.siege, 'pause'); assert.equal(modes.battle, 'toast'); assert.equal(modes.general, 'off');
  assert.equal(messageCategory({ title: 'Recruitment complete' }), 'recruitment');
  assert.equal(messageCategory({ title: 'The siege is won' }), 'siege');
  console.log('PASS message preferences and backwards-compatible defaults');
}
console.log('ALL PASS: campaign planning and state transitions');
