// Peace acceptance and every displayed score share the same calculation.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { buildProvinceMapping } from '../../js/data/map_profile.js';
import { initGame, makeCtx, gameActions } from '../../js/sim/init.js';
import { spawnArmy } from '../../js/sim/military.js';
import { peaceWarScore } from '../../js/sim/strategy.js';
import { renderPeaceWarScore, renderPeaceStrategy, peaceScoreText } from '../../js/ui/peace_strategy.js';
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

const s = scene();
const war = { id: 'score-test', name: 'The score test', attackers: [s.tag], defenders: ['ROM'],
  started: { ...s.game.date }, warscore: { [s.tag]: 37, ROM: -37 }, cb: 'conquest' };
s.game.wars = [war]; s.t.atWarWith = ['ROM'];
s.game.tags.ROM.atWarWith = [s.tag];
s.game.tags.ROM.warExhaustion = 20; s.game.tags.ROM.manpower = 0; s.game.tags.ROM.treasury = 5000;
spawnArmy(s.ctx, s.tag, 'Jerusalem', { inf: 20 });
s.actions.getWarInfo(war.id); // initialize the synthetic war's ordinary goal record
const before = JSON.stringify(s.game);
const ev = s.actions.evaluatePeace(war.id, { gold: 420 });
assert.equal(ev.cost, 42); assert.equal(ev.militaryWarScore, 37);
assert.equal(ev.acceptanceAdjustment, 9.25); assert.equal(ev.warScore, 46.25); assert(ev.acceptable);
assert.equal(ev.acceptanceBudget, ev.warScore);
assert.equal(s.actions.getWarScore(war.id).warScore, ev.warScore);
assert.equal(s.actions.getWarInfo(war.id).peaceScore.warScore, ev.warScore);
assert.equal(war.warscore[s.tag], 37, 'military ledger is not overwritten or adjusted twice');
assert.equal(JSON.stringify(s.game), before, 'score previews are pure');
assert.equal(peaceScoreText(ev.warScore), '46.3');
assert.match(renderPeaceWarScore(ev), /War score.*46.3%/);
assert.match(renderPeaceStrategy(ev), /Military <b>37<\/b>/);
assert.match(renderPeaceStrategy(ev), /Enthusiasm <b>\+9.3<\/b>/);
assert(!renderPeaceStrategy(ev).includes('Limit '));
assert(s.actions.evaluatePeace(war.id, { gold: 460 }).acceptable);
assert(!s.actions.evaluatePeace(war.id, { gold: 470 }).acceptable);
console.log('PASS screenshot arithmetic: 37 military + 9.25 enthusiasm = 46.25 war score; 42-point terms accepted and 47 refused');

const crown = peaceWarScore(s.ctx, war, 'ROM', s.tag, 37, true);
assert.equal(crown.warScore, 37); assert.equal(crown.acceptanceAdjustment, 0);
for (const value of [0, -25, 99, 100]) {
  war.warscore[s.tag] = value;
  const result = s.actions.evaluatePeace(war.id, { gold: 420 });
  assert.equal(result.acceptanceAdjustment, 0); assert.equal(result.warScore, value);
  assert.equal(result.acceptanceBudget, Math.max(0, value));
  assert.equal(result.acceptable, value >= 99);
}
console.log('PASS zero/negative military results, total victory and crown thresholds retain their actual acceptance rules');

war.warscore[s.tag] = 37;
s.game.armies = {}; s.game.tags.ROM.warExhaustion = 0; s.game.tags.ROM.manpower = 10000; s.game.tags.ROM.maxManpower = 10000;
const reluctant = s.actions.evaluatePeace(war.id, { gold: 350 });
assert.equal(reluctant.acceptanceAdjustment, -4); assert.equal(reluctant.warScore, 33); assert(!reluctant.acceptable);
assert.equal(s.actions.getWarScore(war.id).warScore, 33);
console.log('PASS reluctance is subtracted from the displayed score and changes the same live acceptance boundary');

war.defenders.push('NAB'); s.game.tags.NAB.overlord = null; s.game.tags.NAB.warExhaustion = 20;
s.game.tags.NAB.treasury = 5000; s.game.tags.NAB.atWarWith = [s.tag];
const separate = s.actions.evaluatePeace(war.id, { enemy: 'NAB', gold: 100 });
assert.equal(separate.militaryWarScore, s.actions.getPeaceInfo(war.id, 'NAB').myWs);
assert.equal(separate.warScore, s.actions.getWarScore(war.id, 'NAB').warScore);
assert.equal(s.actions.getWarScore('missing'), null);
console.log('PASS separate-peace scores use the selected enemy and match their actual evaluator');
console.log('smoke219: ALL PASS');
