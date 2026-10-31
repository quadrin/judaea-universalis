// Court memories follow executed diplomacy and survive saved games/formations.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { buildProvinceMapping } from '../../js/data/map_profile.js';
import { initGame, makeCtx, reviveGame } from '../../js/sim/init.js';
import { declareWar, executePeaceDeal, evaluatePeaceDeal, switchTagCore } from '../../js/sim/military.js';

const era = ERAS.find(e => e.bookmark.id === '66ce');
const snapshot = JSON.parse(readFileSync(new URL('../geom-snapshot.json', import.meta.url)));
const geom = { neighbors: snapshot.neighbors.map(n => new Set(n)), coastal: snapshot.coastal.map(Boolean),
  centroids: snapshot.centroids.map(c => c ? { x: c[0], y: c[1] } : null), areas: Int32Array.from(snapshot.areas), bbox: [] };
const mapping = buildProvinceMapping(MAP_DATA, era.bookmark);
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events, playerTag: 'JUD', rngSeed: 7, provinceMap: mapping });
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events, provinceMap: mapping,
  bus: { emit() {}, on() { return () => {}; } } });
game.wars = []; game.truces = {}; game.recognitions = {}; game.armies = {};
for (const t of Object.values(game.tags)) { t.atWarWith = []; t.allies = []; t.guarantees = []; t.overlord = null; }
game.tags.NAB.guarantees = ['JUD'];
const war = declareWar(ctx, 'ROM', 'JUD', 'Memory test', 'conquest');
assert(war?.defenders.includes('NAB'));
const memories = () => game.tags.JUD.courtPlan.memories;
assert(memories().some(m => m.other === 'ROM' && m.kind === 'attacked'));
assert(memories().some(m => m.other === 'NAB' && m.kind === 'guarantee_honored'));
const before = JSON.stringify(memories());
assert.equal(declareWar(ctx, 'ROM', 'JUD', 'Duplicate', 'conquest'), war);
assert.equal(JSON.stringify(memories()), before, 'an existing war creates no new memories');
assert.equal(declareWar(ctx, 'MISSING', 'JUD', 'Refused', 'conquest'), null);
assert.equal(JSON.stringify(memories()), before, 'refused declarations create no new memories');
console.log('PASS successful attack and honored guarantee remembered; repeated/refused declarations ignored');

war.warscore.ROM = 100; war.warscore.JUD = -100;
const province = game.provinces.find(p => p?.owner === 'JUD');
province.controller = 'ROM';
const romanBorder = game.provinces.find(p => p?.owner === 'ROM' && !p.impassable);
geom.neighbors[province.id].add(romanBorder.id);
geom.neighbors[romanBorder.id].add(province.id);
const deal = { enemy: 'JUD', provinces: [province.id], humiliate: true };
const evaluated = evaluatePeaceDeal(ctx, war, 'ROM', deal);
assert(evaluated.provinces.includes(province.id));
assert(evaluated.humiliate);
executePeaceDeal(ctx, war, 'ROM', deal);
assert.equal(province.owner, 'ROM');
assert(memories().some(m => m.kind === 'territorial_loss' && m.other === 'ROM'));
assert(memories().some(m => m.kind === 'humiliated' && m.other === 'ROM'));
const restored = reviveGame(JSON.parse(JSON.stringify(game)));
assert.deepEqual(restored.tags.JUD.courtPlan.memories, memories());
console.log('PASS actual cession/humiliation produce durable memories through save revival');

const target = ['MLI', 'HAS'].find(tag => DEFINES.TAGS[tag] && (!game.tags[tag] || !game.tags[tag].alive));
assert(target, 'fixture needs an available formation');
game.tags.ROM.courtPlan = { goals: [{ kind: 'recover', target: 'JUD', province: province.id }],
  memories: [{ kind: 'attacked', other: 'JUD', at: 0 }], attitudes: { JUD: { kind: 'rival' } } };
game.courtDiplomacy = { offers: [{ id: 'formation', from: 'ROM', to: 'JUD', enemy: 'JUD' }],
  history: [{ from: 'JUD', to: 'ROM' }], cooldowns: { 'JUD>ROM': 100 } };
assert(switchTagCore(ctx, 'JUD', target));
assert.equal(game.tags.ROM.courtPlan.goals[0].target, target);
assert.equal(game.tags.ROM.courtPlan.memories[0].other, target);
assert(game.tags.ROM.courtPlan.attitudes[target]);
assert.equal(game.courtDiplomacy.offers[0].to, target);
assert.equal(game.courtDiplomacy.offers[0].enemy, target);
assert.equal(game.courtDiplomacy.history[0].from, target);
assert(Object.keys(game.courtDiplomacy.cooldowns).some(key => key.split('>').includes(target)));
console.log('PASS goals, memories, attitudes, offers, and cooldowns follow a formed nation');
console.log('court-memory: ALL PASS');
