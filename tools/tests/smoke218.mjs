// Personal command must join the real army and succession lifecycles.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { buildProvinceMapping } from '../../js/data/map_profile.js';
import { generalRating } from '../../js/data/general_rating.js';
import { initGame, makeCtx, gameActions, reviveGame } from '../../js/sim/init.js';
import { spawnArmy, removeArmy, tickBattles, mergeInto, disbandArmyCore, switchTagCore, GENERAL_TRAITS } from '../../js/sim/military.js';
import { rulerDies, monthlySuccession } from '../../js/sim/realm.js';
import { royalCommandDeath, syncRoyalCommands, monthlyRoyalCommands } from '../../js/sim/royal_command.js';
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
const army = (s, name = 'Jerusalem') => spawnArmy(s.ctx, s.tag, name, { inf: 4 });
function commission(s, role, id) { const r = s.actions.commissionRoyalGeneral(role, id); assert(r.ok, r.why); return s.game.armies[id]; }

{
  const s = scene(), id = army(s); s.t.points.mar = 0;
  const before = JSON.stringify(s.game); s.actions.getRoyalCommands(); assert.equal(JSON.stringify(s.game), before, 'read-only command preview');
  const a = commission(s, 'ruler', id), profile = { ...a.general }, rng = s.ctx.rng.state();
  assert.equal(s.t.points.mar, 0); assert.equal(a.general.name, s.t.ruler.name);
  assert(!s.actions.commissionRoyalGeneral('ruler', army(s, 'Jericho')).ok);
  assert(s.actions.recallRoyalGeneral('ruler').ok); commission(s, 'ruler', id);
  assert.deepEqual(a.general, profile); assert.equal(s.ctx.rng.state(), rng, 'recall cannot reroll skills');
  assert(!s.actions.getArmyActions(id).canHire); s.t.points.mar = 100; s.actions.hireGeneral(id);
  assert.equal(a.general.royalId, profile.royalId); assert.equal(s.t.points.mar, 100);
  a.path = [s.ctx.prov('Emmaus').id]; assert(!s.actions.recallRoyalGeneral('ruler').ok); assert(!disbandArmyCore(s.ctx, a).ok); a.path = [];
  const other = army(s); s.game.armies[other].general = { name: 'Other commander', fire: 1, shock: 1, maneuver: 1 };
  const enemyProvince = s.game.provinces.find(p => p?.owner === 'ROM'); a.prov = enemyProvince.id; s.game.armies[other].prov = a.prov;
  assert(!mergeInto(s.ctx, id, other), 'merging cannot retire a ruler abroad');
  a.prov = s.ctx.prov('Jerusalem').id;
  s.t.heir.age = 12; assert(!s.actions.commissionRoyalGeneral('heir', other).ok);
  s.t.regency = true; assert(!s.actions.commissionRoyalGeneral('ruler', other).ok);
  console.log('PASS free commission, pure previews, persistent skills, duplicate/child/regency refusal and replacement safeguards');
}
{
  const s = scene(), ruler = commission(s, 'ruler', army(s)), heir = commission(s, 'heir', army(s, 'Jericho'));
  const heirId = heir.general.royalId, name = s.t.heir.name;
  rulerDies(s.ctx, s.tag, 'has died');
  assert.equal(s.t.ruler.name, name); assert.equal(s.t.ruler.commandId, heirId); assert.equal(s.t.heir, null);
  assert.equal(ruler.general, null); assert.equal(heir.general.royalRole, 'ruler');
  const target = Object.keys(DEFINES.TAGS).find(k => !['REB', 'WASTE'].includes(k) && (!s.game.tags[k] || s.game.tags[k].alive === false));
  assert(switchTagCore(s.ctx, s.tag, target)); syncRoyalCommands(s.ctx);
  assert.equal(s.game.armies[heir.id].general.royalId, s.game.tags[target].ruler.commandId);
  console.log('PASS natural succession promotes a field heir, clears the former ruler and survives nation formation');
}
{
  const s = scene(), id = army(s), a = commission(s, 'ruler', id);
  GENERAL_TRAITS.find(t => t.key === 'veteran').apply(a.general);
  const expected = { ...a.general };
  const saved = reviveGame(JSON.parse(JSON.stringify(s.game)));
  const ctx = makeCtx({ ...s.ctx, game: saved });
  assert.deepEqual(saved.tags[s.tag].ruler.commandProfile, expected);
  assert.equal(saved.armies[id].general.royalId, saved.tags[s.tag].ruler.commandId);
  const actions = gameActions(ctx); assert(actions.recallRoyalGeneral('ruler').ok);
  assert(actions.commissionRoyalGeneral('ruler', id).ok); assert.deepEqual(saved.armies[id].general, expected);
  const empty = army(s); assert(mergeInto(s.ctx, id, empty)); syncRoyalCommands(s.ctx);
  assert.equal(s.actions.getRoyalCommands()[0].assigned.id, empty);
  console.log('PASS save/load keeps earned skills and identity; empty-command army merges transfer the same ruler');
}
{
  const s = scene(), a = commission(s, 'ruler', army(s)); const rolls = [];
  s.ctx.rng.chance = p => { rolls.push(p); return false; };
  monthlyRoyalCommands(s.ctx); monthlyRoyalCommands(s.ctx); assert.deepEqual(rolls, [.001]);
  s.game.date.m++; a.path = [s.ctx.prov('Emmaus').id]; monthlyRoyalCommands(s.ctx);
  assert.deepEqual(rolls, [.001, .003]);
  console.log('PASS published camp/campaign probabilities and once-per-month mortality checks');
}
{
  const s = scene(), a = commission(s, 'heir', army(s)); const legitimacy = s.t.legitimacy;
  s.ctx.rng.chance = () => true; monthlyRoyalCommands(s.ctx);
  assert.equal(s.t.heir, null); assert.equal(a.general, null); assert.equal(s.t.legitimacy, legitimacy - 10);
  assert(s.notices.some(([key, n]) => key === 'notify' && /Heir lost/.test(n.title)));
  console.log('PASS command mortality really removes the heir and applies the succession penalty');
}
{
  const s = scene(), a = commission(s, 'ruler', army(s)); const successor = s.t.heir.name;
  s.t.atWarWith = ['ROM']; s.game.tags.ROM.atWarWith = [s.tag];
  spawnArmy(s.ctx, 'ROM', 'Jerusalem', { inf: 5 }); assert(s.game.battles.length);
  s.ctx.rng.chance = () => true; tickBattles(s.ctx);
  assert.equal(s.t.ruler.name, successor); assert.equal(a.general, null);
  console.log('PASS actual daily combat risk kills the ruler and invokes ordinary succession');
}
{
  const s = scene(), a = commission(s, 'ruler', army(s)); s.t.heir = null; s.t.govType = 'monarchy'; const stability = s.t.stability;
  s.ctx.rng.chance = () => true; removeArmy(s.ctx, a.id, true);
  assert(!s.game.armies[a.id]); assert.equal(s.t.stability, stability - 1); assert(s.t.crises.succession);
  const peaceful = scene(), b = commission(peaceful, 'ruler', army(peaceful)); const original = peaceful.t.ruler.name;
  peaceful.ctx.rng.chance = () => { throw Error('Peaceful disband must not roll destruction mortality'); };
  assert(disbandArmyCore(peaceful.ctx, b).ok); assert.equal(peaceful.t.ruler.name, original);
  console.log('PASS destroyed-army mortality opens an heirless crisis; peaceful disbanding does not kill the ruler');
}
{
  const s = scene(); s.ctx.helpers.setHeir(s.ctx, s.tag, { name: 'New heir', age: 20, gov: 2, infl: 2, mar: 3 });
  const a = commission(s, 'heir', army(s));
  s.ctx.helpers.setRuler(s.ctx, s.tag, { name: 'New heir', age: 20, gov: 2, infl: 2, mar: 3 });
  assert.equal(s.t.heir, null); assert.equal(a.general.royalRole, 'ruler');
  s.ctx.helpers.setRuler(s.ctx, s.tag, { name: 'A different ruler', age: 40, gov: 2, infl: 2, mar: 3 });
  assert.equal(a.general, null);
  console.log('PASS scripted succession preserves a promoted heir and removes an outgoing ruler’s command');
}
{
  const s = scene(), a = commission(s, 'ruler', army(s));
  s.ctx.events = [{ id: 'replace-commanding-ruler', options: [{ effects() {
    s.t.ruler = { name: 'Event successor', age: 40, gov: 2, infl: 2, mar: 2 };
  } }] }];
  s.game.pendingEvents.push({ instanceId: 'command-replacement', eventId: 'replace-commanding-ruler' });
  s.actions.chooseEventOption('command-replacement', 0);
  assert.equal(s.t.ruler.name, 'Event successor'); assert.equal(a.general, null);
  console.log('PASS paused event replacement immediately retires the outgoing ruler’s command');
}
{
  const linked = [];
  for (const era of ERAS) {
    const s = scene(era.bookmark.id, true);
    const royal = Object.values(s.game.armies).filter(a => a.general?.royalId);
    for (const a of royal) {
      const role = a.general.royalRole;
      assert.equal(a.general.royalId, s.game.tags[a.tag][role].commandId);
      assert(s.game.tags[a.tag][role].age >= 16);
    }
    linked.push([era.bookmark.id, royal.length]);
    if (era.bookmark.id === '167bce') {
      const a = royal.find(a => a.tag === 'HAS'); assert.equal(a.general.royalRole, 'heir'); assert.equal(generalRating(a.general), 3);
      assert(!royal.some(a => a.general.name === 'Mattathias ben Yohanan'));
    }
    if (era.bookmark.id === '132ce') assert.equal(generalRating(royal.find(a => a.tag === 'JUD').general), 3);
    if (era.bookmark.id === '597bce') assert.equal(generalRating(royal.find(a => a.tag === 'BBL').general), 3);
    if (era.bookmark.id === '732bce') assert.equal(generalRating(royal.find(a => a.tag === 'ASR').general), 3);
    if (era.bookmark.id === '1948ce') assert(!royal.some(a => a.tag === 'ISR'), 'Ben-Gurion is not an opening field general');
    if (era.bookmark.id === '614ce') assert(!royal.some(a => a.tag === 'BYZ'), 'Heraclius has not begun his later eastern campaign');
  }
  console.log('PASS historical opening identities and interpreted star ratings across every bookmark:', JSON.stringify(linked));
}
console.log('smoke218: ALL PASS');
