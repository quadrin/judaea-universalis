// Exercise the real monthly AI and public action boundary across every chapter.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { buildProvinceMapping } from '../../js/data/map_profile.js';
import { initGame, makeCtx, gameActions, reviveGame } from '../../js/sim/init.js';
import { runMonthlyAI } from '../../js/sim/ai.js';
const snap = JSON.parse(readFileSync(new URL('../geom-snapshot.json', import.meta.url)));
let courts = 0;
let agreements = 0, proposals = 0;
for (const era of ERAS) {
  const bookmark = era.bookmark, playerTag = bookmark.playableTags[0].tag;
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark), to = id => provinceMap?.[id] || id;
  const neighbors = snap.neighbors.map(() => new Set());
  for (let id = 1; id < neighbors.length; id++) for (const nb of snap.neighbors[id]) {
    if (to(id) !== to(nb)) { neighbors[to(id)].add(to(nb)); neighbors[to(nb)].add(to(id)); }
  }
  const geom = { neighbors, coastal: snap.coastal.map(Boolean), centroids: snap.centroids.map(c => c ? { x:c[0], y:c[1] } : null), areas:Int32Array.from(snap.areas), bbox:[] };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events:era.events, playerTag, rngSeed:1337, provinceMap });
  const warnings = [], oldWarn = console.warn;
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark, events:era.events, provinceMap, bus:{ emit() {}, on() { return () => {}; } } });
  const humanBefore = JSON.stringify(game.tags[playerTag].courtPlan?.goals);
  try {
    console.warn = (...args) => warnings.push(args.join(' '));
    // A year's councils must retain plans, negotiate and execute ordinary AI
    // decisions against real bookmark maps. No tick shortcuts or mock actions.
    for (let m = 0; m < 12; m++) {
      runMonthlyAI(ctx);
      game.date.m++;
      if (game.date.m > 12) { game.date.m = 1; game.date.y++; if (game.date.y === 0) game.date.y = 1; }
    }
  } finally { console.warn = oldWarn; }
  assert.deepEqual(warnings.filter(w => /failed|AI failed/.test(w)), [], `${bookmark.id}: monthly AI exceptions`);
  assert.equal(JSON.stringify(game.tags[playerTag].courtPlan?.goals), humanBefore, 'human court does not receive autonomous goals');
  const active = Object.entries(game.tags).filter(([tag,t]) => tag !== 'REB' && t.ai && t.alive
    && game.provinces.some(p => p?.owner === tag && !p.impassable));
  assert(active.length > 0);
  for (const [tag,t] of active) {
    assert(t.courtPlan?.goals.length > 0, `${bookmark.id}/${tag}: real strategic objective`);
    assert(t.courtPlan.goals.length <= 2);
    assert(Number.isFinite(t.courtPlan.reserve));
    courts++;
  }
  const actions = gameActions(ctx), before = JSON.stringify(game);
  for (const [tag] of active) actions.getCourtIntentions(tag);
  actions.getCourtOffers();
  assert.equal(JSON.stringify(game), before, 'UI queries do not mutate the campaign');
  assert.equal(actions.resolveCourtOffer('missing-offer', true).ok, false);
  const saved = JSON.parse(JSON.stringify(game));
  proposals += game.courtDiplomacy?.nextId - 1 || 0;
  agreements += (game.courtDiplomacy?.history || []).filter(o => o.status === 'accepted').length;
  const restored = reviveGame(saved);
  for (const [tag,t] of active) assert.deepEqual(restored.tags[tag].courtPlan, t.courtPlan, 'plans survive save revival');
  if (bookmark.id === '931bce') {
    const [tag,t] = active.find(([tag]) => game.provinces.some(p => p?.owner === tag && p.controller === tag));
    for (const other of Object.values(game.tags)) other.ai = false;
    t.ai = true; t.atWarWith = []; t.treasury = 2000; t.income = 20; t.expenses = 0; t.manpower = 0;
    t.points = { mar:0, gov:0, infl:0 }; t.modifiers.push({ effects:{ noOpportunisticWars:true } });
    const site = game.provinces.find(p => p?.owner === tag && p.controller === tag);
    for (const p of game.provinces) if (p?.owner === tag) p.construction = null;
    site.fort = 0; site.buildings = []; site.siege = null;
    t.courtPlan.lastMonth = (game.date.y > 0 ? game.date.y - 1 : game.date.y) * 12 + game.date.m - 1;
    t.courtPlan.priority = 'defense'; t.courtPlan.reserve = 200;
    t.courtPlan.goals = [{ kind:'survive', province:site.id, phase:'pursuing' }];
    runMonthlyAI(ctx);
    assert.equal(site.construction?.key, 'walls', 'defense budget actually builds the selected frontier fortification');
    console.log('PASS strategic defense priority changes actual monthly construction');
  }
  console.log(`PASS ${bookmark.id}: twelve monthly councils, public queries, human control and save persistence`);
}
assert(proposals > 0, 'autonomous courts actually initiate diplomacy on the real maps');
assert(agreements > 0, 'AI courts conclude agreements with each other');
console.log(`ALL PASS: ${ERAS.length} bookmarks, ${courts} courts, ${proposals} proposals and ${agreements} agreements`);
