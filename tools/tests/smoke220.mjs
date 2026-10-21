// Civilian investment and frontier settlements share one habitation engine.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { buildProvinceMapping } from '../../js/data/map_profile.js';
import { initGame, makeCtx, gameActions, reviveGame } from '../../js/sim/init.js';
import { monthlySettlement, settlementStart } from '../../js/sim/economy.js';
import { consolidateNationalPaths } from '../../js/sim/national_ideas.js';
const snap = JSON.parse(readFileSync(new URL('../geom-snapshot.json', import.meta.url)));
function scene(id = '66ce', keep = false) {
  const bookmark = ERAS.find(e => e.bookmark.id === id).bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark), to = id => provinceMap?.[id] || id;
  const neighbors = snap.neighbors.map(() => new Set());
  for (let id = 1; id < neighbors.length; id++) for (const nb of snap.neighbors[id]) if (to(id) !== to(nb)) { neighbors[to(id)].add(to(nb)); neighbors[to(nb)].add(to(id)); }
  const geom = { neighbors, coastal: snap.coastal.map(Boolean), centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null), areas: Int32Array.from(snap.areas), bbox: [] };
  const tag = bookmark.playableTags[0].tag;
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag: tag, rngSeed: 19, provinceMap });
  const notices = [];
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark, events: [], provinceMap, bus: { emit(k, v) { notices.push([k, v]); }, on() { return () => {}; } } });
  if (!keep) {
    game.armies = {}; game.battles = []; game.wars = []; game.ceasefire = null;
    for (const t of Object.values(game.tags)) { t.ai = false; t.atWarWith = []; t.allies = []; t.overlord = null; }
    for (const name of ['Jerusalem', 'Jericho', 'Emmaus']) { const p = ctx.prov(name); if (p) { p.owner = p.controller = tag; p.siege = null; } }
  }
  return { ctx, game, tag, t: game.tags[tag], actions: gameActions(ctx), notices };
}

const s = scene(), p = s.ctx.prov('Jericho');
p.habitation = 'frontier'; p.settleable = true; p.impassable = false;
p.pop = [{ r: 'pagan', c: 'greek', n: 8000 }, { r: 'judaism', c: 'judean', n: 2000 }];
p.religion = 'pagan'; p.culture = 'greek';
s.t.nationalIdeas = {}; s.t.points.infl = 200;
const dev = { ...p.dev }, people = p.pop.map(e => ({ ...e }));
const info = s.actions.getIntegration(p.id);
assert(info.showSettle && info.canSettle); assert.equal(info.settleCost, 110);
assert(s.actions.investProvince(p.id).ok);
assert.equal(s.t.points.infl, 90); assert.equal(p.settlement.monthsLeft, 6);
assert.equal(p.settlement.kind, 'investment');
let before = JSON.stringify(s.game);
assert(!s.actions.investProvince(p.id).ok);
assert.equal(JSON.stringify(s.game), before, 'a duplicate order charges nothing');
assert(!s.actions.runNationalAction('settle', { province: p.id }).ok);
assert.equal(JSON.stringify(s.game), before);
for (let n = 0; n < 2; n++) monthlySettlement(s.ctx);
const game = reviveGame(JSON.parse(JSON.stringify(s.game)));
const ctx = makeCtx({ ...s.ctx, game }), restored = game.provinces[p.id];
assert.equal(restored.settlement.monthsLeft, 4);
delete game.flags.nationalPathsConsolidated;
consolidateNationalPaths(ctx);
assert(!game.tags[s.tag].nationalIdeas.colonies, 'civilian works do not grant a military idea during migration');
for (let n = 0; n < 3; n++) monthlySettlement(ctx);
assert.equal(restored.habitation, 'frontier');
monthlySettlement(ctx);
assert.equal(restored.settlement, null); assert.equal(restored.habitation, 'rural');
assert.equal(restored.dev.tax, dev.tax + 1); assert.equal(restored.dev.prod, dev.prod + 1);
assert.equal(restored.dev.mp, dev.mp);
assert.equal(restored.pop.length, 2); assert.equal(restored.religion, 'pagan'); assert.equal(restored.culture, 'greek');
assert(restored.pop.every((e, i) => e.n > people[i].n));
assert.equal(restored.pop[0].n / restored.pop[1].n, 4, 'investment preserves the community proportions');
console.log('PASS idea-independent civilian works, exact single cost, six-month completion, saved progress, local population and no free military unlock');
const actions = gameActions(ctx), t = game.tags[s.tag];
t.points.infl = 999;
const other = ctx.prov('Emmaus');
other.owner = 'ROM'; other.controller = 'ROM'; other.habitation = 'frontier';
before = JSON.stringify(game); assert(!actions.investProvince(other.id).ok); assert.equal(JSON.stringify(game), before);
restored.habitation = 'town'; assert(!actions.getIntegration(restored.id).showSettle);
assert(!actions.investProvince(restored.id).ok, 'investment cannot make a city');
restored.habitation = 'rural'; restored.siege = { attacker: 'ROM' };
assert(!actions.investProvince(restored.id).ok);
restored.siege = null; restored.controller = 'ROM'; assert(!actions.investProvince(restored.id).ok);
restored.controller = s.tag; t.points.infl = 0; assert(!actions.investProvince(restored.id).ok);
t.points.infl = 999; assert(actions.investProvince(restored.id).ok);
restored.controller = 'ROM'; monthlySettlement(ctx); assert.equal(restored.settlement, null);
t.nationalIdeas.colonies = 1;
restored.controller = s.tag;
assert(!actions.getNationalActionInfo('settle', { province: restored.id }).ok, 'Military Colonies cannot order civilian investments');
assert(!actions.getNationalStrategy().actions.find(a => a.key === 'settle').options.some(o => o.args.province === restored.id));
const waste = game.provinces.find(p => p?.owner === 'WASTE');
waste.expedition = { by: s.tag, men: 1000 }; waste.controller = s.tag; waste.habitation = 'uninhabited'; waste.settleable = true;
delete t.nationalIdeas.colonies; assert(!settlementStart(ctx, s.tag, waste.id).ok);
t.nationalIdeas.colonies = 1;
assert(actions.runNationalAction('settle', { province: waste.id }).ok);
assert.equal(waste.settlement.kind, 'frontier');
console.log('PASS ownership, occupation, siege, funds and town cap; cancellation; frontier settling remains military and has no duplicate local action');
