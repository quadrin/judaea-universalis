// A visible vertical predecessor is always an actual mission prerequisite.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { FORMABLES } from '../../js/data/formables.js';
import { buildProvinceMapping } from '../../js/data/map_profile.js';
import { initGame, makeCtx, gameActions, reviveGame } from '../../js/sim/init.js';
import { missionGraph } from '../../js/sim/mission_graph.js';
import { missionsFor, missionDoneSet, missionUnlocked, missionClosedSet, checkMissions, claimMission, chapterChain } from '../../js/sim/realm.js';
import { missionCtx } from '../../js/sim/military.js';
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

const targets = { hm_chancery_of_simon: 'hm_desert_keys', hm_among_the_powers: 'hm_hired_ranks', hm_great_assembly: 'hm_queens_peace' };
function prepared() {
  const s = scene('167bce');
  s.t.embraced = ['greek_chancery', 'coinage', 'royal_law']; s.game.standing = { order: [s.tag] };
  s.t.tech.mar = 7; s.t.stability = 3; s.t.legitimacy = 90;
  s.ctx.helpers = { ...s.ctx.helpers, factionAtLeast: () => true };
  for (const name of ['Engaddi', 'Gadora']) { const p = s.ctx.prov(name); p.owner = p.controller = s.tag; }
  return s;
}
{
  const s = prepared(), list = missionsFor(s.ctx, s.tag);
  for (const id of Object.keys(targets)) assert(list.find(m => m.id === id).check(missionCtx(s.ctx)), id + ' condition is actually met');
  s.t.missionReady = Object.keys(targets); // stale readiness written by the old game
  for (const m of s.actions.getMissions().filter(m => targets[m.id])) {
    assert.equal(m.status, 'locked'); assert(m.requires.includes(targets[m.id]));
    assert.deepEqual(claimMission(s.ctx, m.id), { ok: false, why: 'locked' });
  }
  checkMissions(s.ctx);
  assert(!s.t.missionReady.some(id => targets[id]));
  const saved = reviveGame(JSON.parse(JSON.stringify(s.game))), loaded = makeCtx({ ...s.ctx, game: saved });
  for (const id of Object.keys(targets)) assert.equal(claimMission(loaded, id).why, 'locked');
  console.log('PASS all three pictured Hasmonean missions stay locked with met conditions, stale readiness and after save/load');
}
for (const [id, parent] of Object.entries(targets)) {
  const s = prepared(), list = missionsFor(s.ctx, s.tag), graph = missionGraph(list);
  const ancestors = new Set();
  const collect = target => { for (const p of graph.nodes.find(n => n.id === target).requires) if (!ancestors.has(p)) { ancestors.add(p); collect(p); } };
  collect(parent); s.t.missionsDone = [...ancestors]; s.t.missionIdx = 0;
  checkMissions(s.ctx);
  assert.equal(s.actions.getMissions().find(m => m.id === id).status, 'locked');
  assert.equal(s.actions.getMissions().find(m => m.id === parent).status, 'ready');
  assert(claimMission(s.ctx, parent).ok);
  assert.equal(s.actions.getMissions().find(m => m.id === id).status, 'ready', 'child unlocks immediately after the parent is claimed');
  assert(claimMission(s.ctx, id).ok); assert.equal(claimMission(s.ctx, id).why, 'done');
}
console.log('PASS actual parent claims immediately unlock each Hasmonean continuation, with rewards paid once');
{
  const s = scene('167bce'), paid = [], list = [
    { id: 'root', col: 0, row: 0, check: () => false, reward: () => paid.push('root') },
    { id: 'middle', col: 0, row: 1, requires: ['root'], check: () => true, reward: () => paid.push('middle') },
    { id: 'last', col: 0, row: 2, requires: ['root'], check: () => true, reward: () => paid.push('last') },
  ];
  s.ctx.bookmark = { ...s.ctx.bookmark, missions: { [s.tag]: list } };
  s.t.ai = true; s.game.humanTags = []; // no seated player: automatic completion uses AI rules
  checkMissions(s.ctx); assert.deepEqual(paid, []);
  list[0].check = () => true; checkMissions(s.ctx);
  assert.deepEqual(paid, ['root', 'middle', 'last']);
  assert.deepEqual(missionGraph(list).nodes[2].requires, ['root', 'middle']);
  console.log('PASS AI rewards follow the same predecessor order, including an explicit requirement that used to skip the middle node');
}
{
  const s = scene('167bce'), list = [
    { id: 'choice', col: 0, row: 0, fork: '167bce/the_charter', road: 'charter_refused', check: () => true },
    { id: 'below', col: 0, row: 1, check: () => true },
  ];
  s.game.flags.greekJerusalem = true;
  assert(missionClosedSet(s.ctx, list).has('below'), 'closed alternatives propagate through inferred vertical edges');
  for (const broken of [
    [{ id: 'missing', col: 0, requires: ['absent'], check: () => true }],
    [{ id: 'a', col: 0, requires: ['b'], check: () => true }, { id: 'b', col: 1, requires: ['a'], check: () => true }],
  ]) {
    s.ctx.bookmark = { ...s.ctx.bookmark, missions: { [s.tag]: broken } };
    for (const m of broken) assert.equal(claimMission(s.ctx, m.id).why, 'locked');
  }
  console.log('PASS inferred descendants respect closed forks; missing prerequisites and cycles fail closed');
}
{
  let checked = 0;
  for (const era of ERAS) {
    const s = scene(era.bookmark.id, true);
    const lists = [...Object.entries(era.bookmark.missions || {}),
      ...FORMABLES.filter(f => f.missions?.length && (!f.bookmarks || f.bookmarks.includes(era.bookmark.id)))
        .map(f => [f.to, chapterChain(f.missions, era.bookmark.id)])];
    for (const [tag, list] of lists) {
      const graph = missionGraph(list); assert.equal(graph.invalid.size, 0, era.bookmark.id + '/' + tag);
      const columns = new Map();
      for (const node of graph.nodes) { if (!columns.has(node.col)) columns.set(node.col, []); columns.get(node.col).push(node); }
      for (const column of columns.values()) {
        column.sort((a, b) => a.row - b.row);
        for (let i = 1; i < column.length; i++) {
          const node = column[i], above = column[i - 1];
          assert(node.requires.includes(above.id), era.bookmark.id + '/' + tag + '/' + node.id);
          const done = new Set(graph.nodes.map(n => n.id)); done.delete(above.id);
          assert(!missionUnlocked(list, node.index, done));
        }
      }
      checked += list.length;
    }
    const before = JSON.stringify(s.game), view = s.actions.getMissions();
    assert.equal(JSON.stringify(s.game), before, 'mission reads remain pure');
    for (const node of view) {
      const above = view.filter(m => m.col === node.col && m.row < node.row).sort((a, b) => b.row - a.row)[0];
      if (above) assert(node.requires.includes(above.id), 'display cannot reorder the shared graph');
    }
  }
  console.log('PASS every bookmark and chapter-filtered formable graph:', checked, 'missions, with matching displayed and enforced predecessors');
}
console.log('smoke217: ALL PASS');
