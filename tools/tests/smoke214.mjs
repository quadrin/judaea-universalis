// National paths: exercise actual transfers, diplomacy, trade, supply and queues.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { buildProvinceMapping } from '../../js/data/map_profile.js';
import { NATIONAL_IDEAS, NATIONAL_ACTIONS } from '../../js/data/national_ideas.js';
import { initGame, makeCtx, gameActions, reviveGame } from '../../js/sim/init.js';
import { monthlyNationalIdeas, nationalActionInfo, nationalStrategyView, runNationalAction } from '../../js/sim/national_ideas.js';
import { computeTrade, tradeIncomeOf } from '../../js/sim/trade.js';
import { traceSupply } from '../../js/sim/supply.js';
import { monthlyRecruitment } from '../../js/sim/recruitment.js';
import { rulerDies } from '../../js/sim/realm.js';
import { spawnArmy, establishRuleTerms, tagGen, switchTagCore, capitalProvince } from '../../js/sim/military.js';
import { tickDay } from '../../js/sim/tick.js';
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
function target(s, key) {
  const options = nationalStrategyView(s.ctx).actions.find(a => a.key === key)?.options;
  const pick = options?.find(v => v.ok); assert(pick, `${key}: ${options?.map(v => v.why).join('; ')}`); return pick.args;
}

{
  const s = scene(); const initial = s.t.points.infl;
  adopt(s, 'maritime', 1); assert.equal(s.t.points.infl, initial - 60);
  adopt(s, 'colonies', 1);
  const before = s.t.points.gov; assert(!s.actions.buyNationalIdea('federation').ok); assert.equal(s.t.points.gov, before);
  s.t.tech.gov = s.ctx.bookmark.techBase + 3; adopt(s, 'federation', 1);
  assert.equal(s.actions.getNationalIdeas().used, 3); assert(!s.actions.buyNationalIdea('subversion').ok);
  const old = s.t.reforms.mil; s.actions.buyIdea('mil'); assert.equal(s.t.reforms.mil, old + 1);
  console.log('PASS exact idea costs, two initial slots, technology opens third, old reforms preserved');
}
{
  const s = scene(); adopt(s, 'maritime');
  const args = target(s, 'warehouse'), p = s.ctx.byId(args.province), host = s.game.tags[p.owner];
  host.opinion[s.tag] = 100;
  const before = tradeIncomeOf(s.ctx, s.tag), hostGold = host.treasury;
  act(s, 'warehouse', args);
  assert(tradeIncomeOf(s.ctx, s.tag) > before, 'foreign power must produce real collected income');
  const money = s.t.treasury; months(s, 1); assert.equal(s.t.treasury, money - 2); assert.equal(host.treasury, hostGold + 2);
  monthlyNationalIdeas(s.ctx); assert.equal(s.t.treasury, money - 2, 'monthly effects cannot be collected twice');
  act(s, 'harbor', args); act(s, 'league', args); act(s, 'league_ships', args);
  assert.equal(host.manpower, 29500);
  const fleets = Object.keys(s.game.fleets).length; months(s, 5); assert.equal(Object.keys(s.game.fleets).length, fleets);
  months(s, 1); assert.equal(Object.keys(s.game.fleets).length, fleets + 1);
  assert(!s.actions.runNationalAction('league_ships', args).ok, 'fleet cooldown');
  const armyId = spawnArmy(s.ctx, s.tag, p.name, { inf: 1 });
  assert.equal(traceSupply(s.ctx, s.game.armies[armyId]).via, 'port', 'foreign supply base must feed a real army');
  const rival = Object.keys(s.game.tags).find(k => ![s.tag, p.owner, 'REB', 'WASTE'].includes(k));
  host.atWarWith = [rival]; s.game.tags[rival].atWarWith = [p.owner];
  s.game.fleets[9999] = { id: 9999, tag: rival, prov: p.id, ships: 4, path: [], gen: 0 };
  months(s, 1); assert(!s.t.nationalStrategy.ports[p.id].active);
  assert(!traceSupply(s.ctx, s.game.armies[armyId]).ok, 'blockade closes foreign supply base');
  const blocked = computeTrade(s.ctx); assert(!Object.values(blocked.nodes).some(n => n.concessions?.[s.tag]), 'blockade suspends all concession power');
  act(s, 'close_warehouse', args); assert(!s.t.nationalStrategy.ports[p.id]);
  console.log('PASS real trade, paid rent, monthly idempotence, delayed league fleet, cooldown and blockaded sea supply');
}
{
  const s = scene(); adopt(s, 'dynasty'); const target = 'AGR', o = s.game.tags[target];
  o.govType = 'monarchy'; o.overlord = null; o.heir = null; o.opinion[s.tag] = 120;
  s.t.allies = [target]; o.allies = [s.tag];
  act(s, 'claimant', { target }); const c = s.t.nationalStrategy.claimants[target];
  act(s, 'compact', { target }); assert.equal(o.heir.name, c.candidate.name);
  rulerDies(s.ctx, target, 'has died'); assert.equal(o.ruler.name, c.candidate.name);
  months(s, 1); assert(c.accession);
  act(s, 'protect_heir', { target }); assert.equal(o.overlord, s.tag);
  console.log('PASS real heir appointment, ruler death, peaceful accession and accepted client protection');
}
{
  const s = scene(); adopt(s, 'dynasty'); const target = 'AGR', o = s.game.tags[target]; o.govType = 'monarchy';
  act(s, 'claimant', { target }); act(s, 'press_claim', { target });
  const c = s.t.nationalStrategy.claimants[target], war = s.game.wars.find(w => w.id === c.warId);
  assert(war && war.cb === 'succession'); const before = s.t.points.infl;
  assert(!s.actions.runNationalAction('install_claimant', { target }).ok); assert.equal(s.t.points.infl, before);
  war.warscore[s.tag] = 100; war.warscore[target] = -100;
  for (const p of s.game.provinces) if (p?.owner === target) p.controller = s.tag;
  act(s, 'install_claimant', { target }); assert.equal(o.overlord, s.tag); assert.equal(o.ruler.name, c.candidate.name);
  console.log('PASS succession war, refused premature installation and actual accepted client peace');
}
{
  const s = scene(); adopt(s, 'colonies'); const p = s.homes[1], args = { province: p.id };
  const manpower = s.t.manpower; act(s, 'colony', args); assert.equal(s.t.manpower, manpower - 1000);
  months(s, 5); assert(!s.actions.runNationalAction('colony_muster', args).ok);
  months(s, 11); const v = s.t.nationalStrategy.colonies[p.id]; assert.equal(v.reserves, 1000);
  act(s, 'colony_muster', args); assert.equal(v.reserves, 0); assert.equal(p.unitQueue.at(-1).gen, tagGen(s.ctx, s.tag));
  const armies = Object.keys(s.game.armies).length; monthlyRecruitment(s.ctx); assert.equal(Object.keys(s.game.armies).length, armies);
  months(s, 1, true); assert(Object.keys(s.game.armies).length > armies, 'queued local regiment actually completes');
  act(s, 'district', args); assert(v.commander?.name); assert(!establishRuleTerms(s.ctx, p).can);
  months(s, 10); const name = v.commander.name; act(s, 'district_army', args);
  assert(Object.values(s.game.armies).some(a => a.general?.name === name)); assert.equal(v.commander, null);
  act(s, 'district', args); act(s, 'support_colony', args);
  const before = s.t.points.infl; assert(!s.actions.runNationalAction('support_colony', args).ok); assert.equal(s.t.points.infl, before);
  v.loyalty = 21; s.t.treasury = 0; months(s, 1);
  assert(!s.t.nationalStrategy.colonies[p.id]); assert(Object.values(s.game.armies).some(a => a.tag === 'REB' && a.prov === p.id));
  console.log('PASS timed colony, finite recruits, real recruitment, named general, loyalty, cooldown and unpaid mutiny');
}
{
  const s = scene(); adopt(s, 'subversion'); const args = target(s, 'contact'), p = s.ctx.byId(args.province), host = s.game.tags[p.owner];
  host.stability = 0; p.unrest = 3; p.revoltCooldownMonths = 0;
  act(s, 'contact', args); months(s, 8); const v = s.t.nationalStrategy.networks[p.id]; assert.equal(v.strength, 48);
  act(s, 'rising', args); months(s, 5); const armies = Object.keys(s.game.armies).length;
  months(s, 1); assert(Object.keys(s.game.armies).length > armies); assert(!v.op);
  act(s, 'recall_contact', args); p.owner = p.controller = host.tag;
  act(s, 'contact', args); months(s, 14); const network = s.t.nationalStrategy.networks[p.id]; assert(network.strength >= 70);
  s.t.atWarWith = [host.tag]; host.atWarWith = [s.tag];
  s.game.armies = {}; s.game.battles = []; // the earlier rising has been put down
  spawnArmy(s.ctx, s.tag, p.name, { inf: 4 }); p.garrison = 1000; p.siege = { by: s.tag, progress: 10 };
  act(s, 'gates', args); months(s, 3); assert.equal(p.garrison, 250); assert.equal(p.siege.progress, 35);
  const oldRelation = host.opinion[s.tag] || 0; network.exposure = 90; host.treasury = 100; months(s, 1);
  assert(!s.t.nationalStrategy.networks[p.id]); assert(host.opinion[s.tag] < oldRelation);
  s.game.humanTags = [s.tag, host.tag]; p.siege = null; act(s, 'contact', args);
  months(s, 4); assert.equal(nationalStrategyView(s.ctx, host.tag).incoming, 1);
  host.nationalIdeas = { subversion: 1 }; assert(runNationalAction(s.ctx, host.tag, 'counterspy').ok);
  const spy = s.t.nationalStrategy.networks[p.id], strength = spy.strength; months(s, 1);
  assert.equal(spy.strength, strength + 1); assert.equal(spy.exposure, 12);
  s.t.atWarWith = []; host.atWarWith = []; months(s, 1);
  assert(!s.t.nationalStrategy.networks[p.id]); assert(!s.actions.runNationalAction('contact', args).ok);
  console.log('PASS network preparation, real rebellion, siege collaboration, paid AI purge and wartime-only human targeting');
}
{
  const s = scene(); adopt(s, 'subversion');
  const p = s.game.provinces.find(p => p && p.owner !== s.tag && s.game.tags[p.owner]?.alive && p.owner !== 'REB'
    && p.id !== capitalProvince(s.ctx, p.owner)?.id && [...s.ctx.geom.neighbors[p.id]].some(id => s.ctx.byId(id)?.owner === s.tag));
  assert(p); const host = s.game.tags[p.owner], args = { province: p.id };
  p.controller = p.owner; p.siege = null; p.unrest = 3; p.autonomy = .5; p.fort = 0; p.dev = { tax: 2, prod: 2, mp: 2 }; host.stability = 0;
  act(s, 'contact', args); months(s, 16);
  s.t.atWarWith = [host.tag]; host.atWarWith = [s.tag];
  p.fort = 2; const before = s.t.treasury; assert(!s.actions.runNationalAction('governor', args).ok); assert.equal(s.t.treasury, before);
  p.fort = 0; act(s, 'governor', args); months(s, 5); assert.equal(p.owner, host.tag);
  months(s, 1); assert.equal(p.owner, s.tag); assert.equal(p.controller, s.tag); assert(s.t.aggression >= 6);
  months(s, 1); assert(!s.t.nationalStrategy.networks[p.id], 'contacts close after their province joins our realm');
  console.log('PASS prepared governor defection transfers a real frontier province and respects fort limits and aggression');
}
{
  const s = scene(); adopt(s, 'federation'); const [a, b] = [s.homes[1], s.homes[2]];
  act(s, 'charter', { province: a.id, service: 'fiscal' }); act(s, 'charter', { province: b.id, service: 'levy' });
  months(s, 14); const city = s.t.nationalStrategy.cities[a.id]; const gold = s.t.treasury;
  act(s, 'city_service', { province: a.id }); assert(s.t.treasury > gold);
  const total = Object.values(s.t.nationalStrategy.cities).reduce((n, v) => n + v.reserves, 0);
  act(s, 'council_muster', { province: a.id });
  assert(Object.values(s.game.armies).some(a => /Federal host/.test(a.name)));
  assert(Object.values(s.t.nationalStrategy.cities).reduce((n, v) => n + v.reserves, 0) < total);
  city.loyalty = 90; act(s, 'centralize_city', { province: a.id }); months(s, 12);
  assert(!s.t.nationalStrategy.cities[a.id]); assert.equal(a.autonomy, .1); assert(!a.modifiers.some(m => m.id === 'national_city'));
  act(s, 'charter', { province: a.id, service: 'levy' });
  const bad = s.t.nationalStrategy.cities[b.id]; bad.loyalty = 75; b.unrest = 5;
  act(s, 'centralize_city', { province: b.id }); months(s, 8);
  assert(!s.t.nationalStrategy.cities[b.id]); assert(Object.values(s.game.armies).some(a => a.tag === 'REB' && a.prov === b.id));
  console.log('PASS fiscal service, finite federal muster, successful integration and contested-city rebellion');
}
{
  const s = scene(); adopt(s, 'maritime');
  const args = target(s, 'warehouse'), p = s.ctx.byId(args.province), host = s.game.tags[p.owner];
  act(s, 'warehouse', args);
  const rival = Object.entries(s.game.tags).find(([k, t]) => k !== s.tag && k !== host.tag && t.alive && k !== 'REB');
  rival[1].nationalStrategy = { ports: { [p.id]: { host: host.tag, level: 2, loyalty: 30, league: true } } };
  act(s, 'close_warehouse', args); host.opinion[s.tag] = 100; host.opinion[rival[0]] = 0;
  act(s, 'contest_port', args); assert(!rival[1].nationalStrategy.ports[p.id]); assert(s.t.nationalStrategy.ports[p.id].league);
  const originalHost = host.tag;
  const replacement = Object.keys(DEFINES.TAGS).find(k => !['REB', 'WASTE', s.tag].includes(k) && (!s.game.tags[k] || s.game.tags[k].alive === false));
  assert(switchTagCore(s.ctx, originalHost, replacement));
  assert.equal(s.t.nationalStrategy.ports[p.id].host, replacement);
  const newPlayer = Object.keys(DEFINES.TAGS).find(k => !['REB', 'WASTE', s.tag, replacement].includes(k) && (!s.game.tags[k] || s.game.tags[k].alive === false));
  assert(switchTagCore(s.ctx, s.tag, newPlayer)); assert.equal(s.game.tags[newPlayer].nationalIdeas.maritime, 3);
  assert(s.game.tags[newPlayer].nationalStrategy.ports[p.id]);
  console.log('PASS contested concessions and agreements surviving host and player nation formation');
}
{
  const s = scene(); adopt(s, 'federation'); const p = s.homes[3]; p.buildings ||= []; p.buildings.push('shipyard');
  act(s, 'charter', { province: p.id, service: 'naval' });
  const v = s.t.nationalStrategy.cities[p.id]; months(s, 14);
  const funds = v.funds, recruits = v.reserves; act(s, 'city_service', { province: p.id });
  assert.equal(v.funds, funds - 60); assert.equal(v.reserves, recruits - 500); assert.equal(p.unitQueue.at(-1).type, 'ship');
  const before = JSON.stringify(s.game); s.actions.getNationalStrategy(); assert.equal(JSON.stringify(s.game), before, 'queries must not mutate saves');
  const ai = Object.values(s.game.tags).find(t => t.alive && t.tag !== s.tag && t.tag !== 'REB'); ai.ai = true;
  months(s, 12); assert(Object.values(ai.nationalIdeas || {}).some(n => n > 0), 'AI adopts a path at the same price');
  console.log('PASS naval city service conserves its treasury and recruits, queries are pure and AI adopts paths');
}
{
  const s = scene(); adopt(s, 'colonies'); act(s, 'colony', { province: s.homes[1].id }); months(s, 3);
  const revived = reviveGame(JSON.parse(JSON.stringify(s.game)));
  assert.deepEqual(revived.tags[s.tag].nationalIdeas, s.t.nationalIdeas);
  assert.equal(revived.tags[s.tag].nationalStrategy.colonies[s.homes[1].id].left, 3);
  const ctx = makeCtx({ ...s.ctx, game: revived }); tickDay(ctx);
  const old = scene(); delete old.t.nationalIdeas; delete old.t.nationalStrategy;
  assert.equal(gameActions(old.ctx).getNationalIdeas().used, 0);
  for (const e of ERAS) {
    const ch = scene(e.bookmark.id); const report = ch.actions.getNationalStrategy();
    assert.equal(report.groups.length, 5); assert.equal(report.actions.length, Object.keys(NATIONAL_ACTIONS).length);
  assert(report.actions.every(a => !a.unlocked && !a.info.ok && /Requires .*tier [123]/.test(a.info.why)), 'old saves discover contextual actions while their missing tiers remain locked');
    assert.equal(report.groups.find(g => g.key === 'dynasty').canBuy, e.bookmark.mechanics?.clientKingdoms === false ? false : true);
  }
  console.log('PASS old saves, JSON round trip of active construction, real tick and every bookmark’s idea menu');
}
for (const d of Object.values(NATIONAL_ACTIONS)) assert(NATIONAL_IDEAS[d.group] && d.tier >= 1 && d.tier <= 3);
console.log('smoke214: ALL PASS');
