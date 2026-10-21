// Consolidation keeps one paid action path and upgrades old institutions once.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { buildProvinceMapping } from '../../js/data/map_profile.js';
import { initGame, makeCtx, gameActions, reviveGame } from '../../js/sim/init.js';
import { consolidateNationalPaths, nationalStrategyView, monthlyNationalIdeas } from '../../js/sim/national_ideas.js';
import { settlementStart, monthlySettlement, expeditionStart, annexCore } from '../../js/sim/economy.js';
import { monthlyRecruitment } from '../../js/sim/recruitment.js';
import { monthlyChapterStrategies } from '../../js/sim/chapter_strategy.js';
import { spawnArmy, switchTagCore } from '../../js/sim/military.js';
const snap = JSON.parse(readFileSync(new URL('../geom-snapshot.json', import.meta.url)));
function scene(id = '66ce') {
  const bookmark = ERAS.find(e => e.bookmark.id === id).bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark), to = id => provinceMap?.[id] || id;
  const neighbors = snap.neighbors.map(() => new Set());
  for (let id = 1; id < neighbors.length; id++) for (const nb of snap.neighbors[id]) if (to(id) !== to(nb)) { neighbors[to(id)].add(to(nb)); neighbors[to(nb)].add(to(id)); }
  const geom = { neighbors, coastal: snap.coastal.map(Boolean), centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null), areas: Int32Array.from(snap.areas), bbox: [] };
  const tag = bookmark.playableTags[0].tag;
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag: tag, rngSeed: 7, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark, events: [], provinceMap, bus: { emit() {}, on() { return () => {}; } } });
  game.wars = []; game.truces = {}; game.recognitions = {}; game.battles = []; game.ceasefire = null;
  for (const v of Object.values(game.tags)) { v.ai = false; v.atWarWith = []; v.allies = []; v.overlord = null; v.treasury = 3000; v.manpower = 30000; v.opinion ||= {}; v.points = { gov: 999, infl: 999, mar: 999 }; }
  const t = game.tags[tag]; t.treasury = 10000;
  let homes;
  if (id === '66ce') homes = ['Jerusalem', 'Emmaus', 'Jericho', 'Joppa'].map(n => ctx.prov(n));
  else homes = game.provinces.filter(p => p?.owner === tag).slice(0, 4);
  for (const p of homes) { p.owner = p.controller = tag; p.siege = null; p.unrest = 0; p.modifiers = []; p.dev = { tax: 100, prod: 100, mp: 100 }; }
  return { ctx, game, t, tag, homes, actions: gameActions(ctx) };
}
function adopt(s, key, count = 3) {
  for (let n = 0; n < count; n++) { const r = s.actions.buyNationalIdea(key); assert(r.ok, `${key}: ${r.why}`); }
}
function act(s, key, args) { const r = s.actions.runNationalAction(key, args); assert(r.ok, `${key}: ${r.why}`); return r; }
function months(s, count, recruit = false) {
  for (let n = 0; n < count; n++) {
    const d = s.game.date; if (++d.m > 12) { d.m = 1; if (++d.y === 0) d.y = 1; }
    monthlyNationalIdeas(s.ctx); if (recruit) monthlyRecruitment(s.ctx);
  }
}

{
  const s = scene(), home = s.ctx.prov('Jericho');
  const p = s.game.provinces.find(p => p && !s.homes.includes(p));
  Object.assign(p, { owner: 'WASTE', controller: 'WASTE', impassable: true, settleable: true,
    habitation: 'uninhabited', expedition: null, settlement: null });
  s.ctx.geom.neighbors[p.id].add(home.id); s.ctx.geom.neighbors[home.id].add(p.id);
  const armyId = spawnArmy(s.ctx, s.tag, home.name, { inf: 8 });
  const before = JSON.stringify(s.game);
  assert(!s.actions.getNationalActionInfo('expedition', { province: p.id }).ok);
  assert(!expeditionStart(s.ctx, s.tag, p.id).ok);
  assert(!settlementStart(s.ctx, s.tag, home.id).ok);
  assert.equal(JSON.stringify(s.game), before, 'locked old and new entry points have no side effects');
  adopt(s, 'colonies', 1);
  assert(s.actions.getNationalStrategy().actions.some(a => a.key === 'expedition' && a.options.some(o => o.args.province === p.id)));
  let gold = s.t.treasury, men = Object.values(s.game.armies).reduce((n, a) => n + a.men, 0);
  const price = s.actions.getNationalActionInfo('expedition', { province: p.id }).cost;
  act(s, 'expedition', { province: p.id });
  assert.equal(s.t.treasury, gold - price.gold); assert.equal(Object.values(s.game.armies).reduce((n, a) => n + a.men, 0), men - price.manpower);
  assert.equal(s.t.manpower, 30000, 'expedition takes existing soldiers, not an additional manpower charge');
  const influence = s.t.points.infl, settlePrice = s.actions.getNationalActionInfo('settle', { province: p.id }).cost.infl;
  act(s, 'settle', { province: p.id }); assert.equal(s.t.points.infl, influence - settlePrice);
  assert(!s.actions.runNationalAction('settle', { province: p.id }).ok);
  assert(s.actions.getNationalStrategy().records.some(r => r.id === 'frontier:' + p.id && r.progress));
  const remaining = p.settlement.monthsLeft;
  const saved = reviveGame(JSON.parse(JSON.stringify(s.game))), restored = makeCtx({ ...s.ctx, game: saved });
  assert.equal(saved.provinces[p.id].settlement.monthsLeft, remaining);
  for (let n = 0; n < remaining; n++) monthlySettlement(restored);
  assert.equal(saved.provinces[p.id].habitation, 'frontier');
  const governance = saved.tags[s.tag].points.gov;
  const actions = gameActions(restored), annexPrice = actions.getNationalActionInfo('annex_frontier', { province: p.id }).cost.gov;
  assert(actions.runNationalAction('annex_frontier', { province: p.id }).ok);
  assert.equal(saved.tags[s.tag].points.gov, governance - annexPrice);
  assert.equal(saved.provinces[p.id].owner, s.tag); assert.equal(saved.provinces[p.id].impassable, false);
  delete saved.tags[s.tag].nationalIdeas.colonies;
  const other = saved.provinces.find(q => q && q.owner === 'WASTE');
  other.expedition = { by: s.tag, men: 1000 }; other.controller = s.tag; other.habitation = 'frontier';
  assert(!annexCore(restored, s.tag, other.id).ok, 'old annex core cannot bypass the idea');
  console.log('PASS one frontier pipeline, core-level idea gates, exact single charges, construction save/load and actual annexation');
}
{
  const s = scene('931bce');
  const places = s.game.provinces.filter(p => p && !p.impassable).slice(0, 4);
  for (const p of places) { p.owner = p.controller = s.tag; p.siege = null; }
  const [levy, tax, town, regional] = places;
  s.t.chapterStrategy = { charters: Object.fromEntries(places.map((p, i) => [p.id,
    { kind: ['levy_charter', 'tax_charter', 'municipal_charter', 'regional_command'][i], age: 9, loyalty: 63 + i }])) };
  for (const p of places) p.modifiers = [{ id: 'chapter_charter', chapterOwner: s.tag, effects: { prodMult: 1.25 } }];
  s.t.nationalIdeas = { maritime: 1, subversion: 1 };
  s.t.nationalStrategy = { ports: {}, claimants: {}, colonies: {}, networks: {}, cities: {}, cooldowns: {}, log: [] };
  s.t.nationalStrategy.cities[tax.id] = { service: 'naval', funds: 37, reserves: 321, loyalty: 91, integrating: 4 };
  delete s.game.flags.nationalPathsConsolidated;
  const rng = s.ctx.rng.state(), treasury = s.t.treasury, manpower = s.t.manpower;
  consolidateNationalPaths(s.ctx);
  assert.equal(s.ctx.rng.state(), rng, 'load migration is deterministic');
  assert.equal(s.t.treasury, treasury); assert.equal(s.t.manpower, manpower);
  assert.deepEqual(s.t.chapterStrategy.charters, {});
  assert.equal(s.t.nationalStrategy.cities[levy.id].service, 'levy');
  assert.equal(s.t.nationalStrategy.cities[town.id].service, 'fiscal');
  assert.deepEqual(s.t.nationalStrategy.cities[tax.id], { service: 'naval', funds: 37, reserves: 321, loyalty: 91, integrating: 4 });
  assert.equal(s.t.nationalStrategy.colonies[regional.id].district, true);
  assert.equal(s.t.nationalStrategy.colonies[regional.id].loyalty, 66);
  assert.equal(s.t.nationalIdeas.federation, 1); assert.equal(s.t.nationalIdeas.colonies, 2);
  assert.equal(s.actions.getNationalIdeas().slots, 4, 'paid existing paths are grandfathered');
  assert(!s.actions.buyNationalIdea('dynasty').ok, 'grandfathering does not create an extra free slot');
  assert(places.every(p => !p.modifiers.some(m => m.id === 'chapter_charter')));
  const once = JSON.stringify(s.game); consolidateNationalPaths(s.ctx); assert.equal(JSON.stringify(s.game), once);
  const snapshot = JSON.stringify(s.game); nationalStrategyView(s.ctx); s.actions.getChapterStrategy(); assert.equal(JSON.stringify(s.game), snapshot);
  for (let i = 0; i < 12; i++) {
    months(s, 1); const beforeChapter = s.t.manpower; monthlyChapterStrategies(s.ctx);
    assert.equal(s.t.manpower, beforeChapter, 'retired annual levy never runs alongside the new reserve system');
  }
  assert(s.t.nationalStrategy.cities[levy.id].reserves > 0);
  assert(s.t.nationalStrategy.colonies[regional.id].reserves > 0);
  console.log('PASS deterministic charter/district migration, preserved councils, no duplicate modifier or annual levy, grandfathered slots and pure views');
}
{
  const s = scene(); const p = s.ctx.prov('Jericho');
  p.settlement = { by: s.tag, monthsLeft: 3, toTier: 'town' };
  delete s.game.flags.nationalPathsConsolidated;
  const restored = makeCtx({ ...s.ctx, game: reviveGame(JSON.parse(JSON.stringify(s.game))) });
  assert.equal(restored.game.tags[s.tag].nationalIdeas.colonies, 1);
  assert.equal(restored.byId(p.id).settlement.monthsLeft, 3);
  const actions = gameActions(restored), before = JSON.stringify(restored.game);
  for (const kind of ['subvert', 'pretender']) assert(!actions.runIntrigue('ROM', kind, 'generals').ok);
  for (const key of ['levy_charter', 'tax_charter', 'municipal_charter', 'regional_command', 'unified_command']) assert(!actions.runChapterStrategy(key, { province: p.id }).ok);
  assert.equal(JSON.stringify(restored.game), before, 'retired paths spend no money, pips or RNG');
  assert(!actions.getDecisions().some(d => d.key === 'resettle_land'));
  assert(actions.getIntrigue('ROM').ops.every(o => o.kind === 'patronize'));
  assert(!actions.getChapterStrategy().actions.some(a => /charter|regional_command|unified_command/.test(a.key)));
  const target = Object.keys(DEFINES.TAGS).find(k => !['REB', 'WASTE'].includes(k) && (!restored.game.tags[k] || !restored.game.tags[k].alive));
  assert(switchTagCore(restored, s.tag, target));
  assert.equal(restored.game.tags[target].nationalIdeas.colonies, 1);
  assert.equal(restored.byId(p.id).settlement.by, target);
  console.log('PASS active legacy settlement retained on load and formation, retired shortcuts are inert, and menus have one home per institution');
}
console.log('smoke216: ALL PASS');
