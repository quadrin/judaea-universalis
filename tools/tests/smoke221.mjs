// National paths are passive idea groups: the player-facing Operations were
// retired. An older save can still hold a human court's concessions,
// claimants, colonies, networks and city charters; loading it winds them down
// once and returns what they stored, so no hidden upkeep continues. AI courts
// keep theirs, and the passive bonuses of adopted tiers are unchanged.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { buildProvinceMapping } from '../../js/data/map_profile.js';
import { NATIONAL_IDEAS, nationalIdeaEffects } from '../../js/data/national_ideas.js';
import { initGame, makeCtx, gameActions } from '../../js/sim/init.js';
import { monthlyNationalIdeas } from '../../js/sim/national_ideas.js';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const snap = JSON.parse(readFileSync(new URL('../geom-snapshot.json', import.meta.url)));
const bookmark = ERAS.find(e => e.bookmark.id === '66ce').bookmark;
const provinceMap = buildProvinceMapping(MAP_DATA, bookmark), to = id => provinceMap?.[id] || id;
const neighbors = snap.neighbors.map(() => new Set());
for (let id = 1; id < neighbors.length; id++) for (const nb of snap.neighbors[id]) if (to(id) !== to(nb)) { neighbors[to(id)].add(to(nb)); neighbors[to(nb)].add(to(id)); }
const geom = { neighbors, coastal: snap.coastal.map(Boolean), centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null), areas: Int32Array.from(snap.areas), bbox: [] };
const tag = bookmark.playableTags[0].tag;
const bus = { emit() {}, on() { return () => {}; } };
const ctxFor = game => makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark, events: [], provinceMap, bus });

console.log('== national path texts describe passive effects only ==');
{
  for (const [key, path] of Object.entries(NATIONAL_IDEAS)) {
    ok(path.tiers.every(t => !/\b(negotiate|shelter|station|recruit contacts|prepare a|warehouses?|claimants?)\b/i.test(t.desc)),
      key + ': no tier promises an operation');
    ok(path.tiers.every(t => /[+−-]\d/.test(t.desc)), key + ': every tier states its bonus');
  }
}

console.log('== a fresh campaign is marked; nothing to wind down ==');
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag: tag, rngSeed: 7, provinceMap });
const ctx = ctxFor(game);
ok(game.flags.nationalOperationsRetired === true, 'the one-time flag is set at the first context');

console.log('== an old save winds down the player\'s holdings once ==');
{
  const t = game.tags[tag];
  t.nationalIdeas = { maritime: 2, colonies: 2, federation: 1 };
  const before = nationalIdeaEffects(t);
  const city = ctx.prov('Joppa'), colony = ctx.prov('Jericho');
  city.owner = city.controller = colony.owner = colony.controller = tag;
  city.modifiers = [{ id: 'national_city', name: 'City charter', months: -1, chapterOwner: tag, effects: { prodMult: .8 } }];
  const rival = Object.keys(game.tags).find(k => k !== tag && game.tags[k].alive);
  game.tags[rival].heir = { name: 'Sponsored heir', nationalSponsor: tag };
  t.nationalStrategy = {
    ports: { 9001: { host: rival, level: 1, loyalty: 70, active: true } },
    claimants: { [rival]: { candidate: { name: 'Sponsored heir' }, compact: true, installed: false, loyalty: 70 } },
    colonies: { [colony.id]: { left: 0, total: 6, reserves: 1500, loyalty: 80, district: true } },
    networks: { 9002: { host: rival, strength: 40, exposure: 10, op: null } },
    cities: { [city.id]: { service: 'fiscal', funds: 45.6, reserves: 700, loyalty: 80, integrating: 0 } },
    cooldowns: {}, log: [], counterspyUntil: -1,
  };
  // An AI court keeps its own concession: it still uses these rules.
  const ai = game.tags[rival];
  ai.ai = true;
  ai.nationalStrategy = { ports: { 9003: { host: tag, level: 1, loyalty: 70, active: true } }, claimants: {}, colonies: {}, networks: {}, cities: {}, cooldowns: {}, log: [], counterspyUntil: -1 };
  const gold = t.treasury, men = t.manpower;
  delete game.flags.nationalOperationsRetired;
  const saved = JSON.parse(JSON.stringify(game));
  const restored = ctxFor(saved);
  const rt = saved.tags[tag], s = rt.nationalStrategy;
  ok(!Object.keys(s.ports).length && !Object.keys(s.claimants).length && !Object.keys(s.colonies).length
    && !Object.keys(s.networks).length && !Object.keys(s.cities).length, 'every player holding is closed');
  ok(rt.treasury === gold + 45, 'city funds return to the treasury: ' + (rt.treasury - gold));
  ok(rt.manpower === men + 2200, 'colony and city recruits return to the manpower pool: ' + (rt.manpower - men));
  ok(saved.tags[rival].heir === null, 'a pending succession compact is withdrawn');
  ok(!(restored.byId(city.id).modifiers || []).some(m => m.id === 'national_city'), 'the city charter modifier is removed');
  ok(/National operations have ended: 5 holdings closed/.test(s.log[0] || ''), 'the court log says what happened: ' + s.log[0]);
  ok(Object.keys(saved.tags[rival].nationalStrategy.ports).length === 1, 'the AI court keeps its concession');
  ok(JSON.stringify(nationalIdeaEffects(rt)) === JSON.stringify(before), 'adopted tiers keep their passive bonuses');

  const again = rt.treasury;
  rt.nationalStrategy.cities[city.id] = { service: 'fiscal', funds: 99, reserves: 0, loyalty: 80, integrating: 0 };
  ctxFor(saved);
  ok(rt.treasury === again && rt.nationalStrategy.cities[city.id], 'the wind-down runs once per campaign');
  delete rt.nationalStrategy.cities[city.id];

  const treasury = rt.treasury;
  monthlyNationalIdeas(restored);
  ok(rt.treasury === treasury, 'no national upkeep is charged after the wind-down');
}

console.log('== adoption still works through the game actions ==');
{
  const g2 = initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag: tag, rngSeed: 7, provinceMap });
  const c2 = ctxFor(g2), actions = gameActions(c2), t2 = g2.tags[tag];
  t2.points = { gov: 999, infl: 999, mar: 999 };
  ok(actions.buyNationalIdea('dynasty').ok, 'Dynastic Ambition is open in every age (it is passive now)');
  ok(actions.buyNationalIdea('subversion').ok, 'a second path fills the second slot');
  const third = actions.getNationalIdeas().groups.find(g => g.key === 'federation');
  ok(!third.canBuy && /slots are occupied/.test(third.whyNot), 'a third path waits for a slot');
  t2.points.infl = 0;
  const poor = actions.getNationalIdeas().groups.find(g => g.key === 'dynasty');
  ok(/Requires 100 influence points\./.test(poor.whyNot), 'cost reasons name the point: ' + poor.whyNot);
}

console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
