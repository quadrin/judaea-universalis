// Headless regression — v4.3 (SPEC §44): wasteland does not exist in 1948.
// The five desert interiors open as sovereign, passable frontier land in the
// modern era only; ancient bookmarks keep their walls; an old 1948 save lifts
// the wall on load without clobbering any habitation tier the player earned.
import { readFileSync } from 'fs';
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions, reconcileGameProvinces } = await import(R + '/js/sim/init.js');
const { settlementInfo } = await import(R + '/js/sim/economy.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const fakeGeom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
const idOf = (name) => MAP_DATA.provinces.findIndex((p) => p.name === name) + 1;
const DESERTS = {
  'Sinai Interior': 'EGY', 'Eastern Desert': 'EGY', 'Libyan Desert': 'EGY',
  'Arabian Desert': 'SAU', 'Syrian Desert': 'SYR',
};

console.log('== 1948: wasteland does not exist ==');
const modernMap = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);
const modern = initGame({
  DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_1948, events: [],
  playerTag: 'ISR', rngSeed: 1948, provinceMap: modernMap,
});
let unowned = 0; let walled = 0; let empty = 0;
for (const p of modern.provinces) {
  if (!p) continue;
  if (p.owner === 'WASTE') unowned++;
  if (p.impassable) walled++;
  if (p.habitation === 'uninhabited') empty++;
}
ok(unowned === 0, 'no 1948 province is unowned');
ok(walled === 0, 'no 1948 province is impassable');
ok(empty === 0, 'no 1948 province is uninhabited (nothing hatches)');
ok(Object.entries(DESERTS).every(([name, tag]) => {
  const p = modern.provinces[idOf(name)];
  return p && p.owner === tag && p.habitation === 'frontier' && p.settleable !== false;
}), 'the five interiors are sovereign, frontier, and settleable');

console.log('== the desert is a road, and a harsh one ==');
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const sinaiN = new Set(snap.neighbors[idOf('Sinai Interior')] || []);
const egyptSide = ['Pelusium', 'Arsinoe', 'Memphis', 'Rhinocolura'].some((n) => sinaiN.has(idOf(n)));
const negevSide = ['Oboda', 'Beersheba', 'Aila', 'Petra', 'Gaza', 'Rafah',
  'Mitzpe Ramon', 'Paran', 'Eilat'].some((n) => sinaiN.has(idOf(n)));
ok(egyptSide && negevSide, 'the open Sinai bridges Egypt proper and the Negev on the real map');
const wl = DEFINES.TERRAINS && DEFINES.TERRAINS.wasteland;
ok(wl && wl.attrition >= 4 && wl.moveCost >= 2,
  'wasteland terrain still punishes the crossing (attrition ' + (wl && wl.attrition) + ', move ' + (wl && wl.moveCost) + 'x)');

console.log('== settlement reaches the Sinai ==');
const egyGame = initGame({
  DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_1948, events: [],
  playerTag: 'EGY', rngSeed: 2, provinceMap: modernMap,
});
const egyCtx = makeCtx({
  game: egyGame, DEFINES, MAP_DATA, geom: fakeGeom, bus,
  bookmark: BOOKMARK_1948, events: [], provinceMap: modernMap,
});
egyGame.tags.EGY.points.infl = 500;
ok(settlementInfo(egyCtx, 'EGY', idOf('Sinai Interior')).can, 'Egypt may settle the open Sinai');
gameActions(egyCtx).settleProvince(idOf('Sinai Interior'));
ok(!!egyGame.provinces[idOf('Sinai Interior')].settlement, 'a settlement project takes root in the interior');

console.log('== ancient eras keep their walls ==');
const ancientMap = buildProvinceMapping(MAP_DATA, BOOKMARK_66);
const ancient = initGame({
  DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_66, events: [],
  playerTag: 'JUD', rngSeed: 66, provinceMap: ancientMap,
});
ok(Object.keys(DESERTS).every((name) => {
  const p = ancient.provinces[idOf(name)];
  return p && p.owner === 'WASTE' && p.impassable && p.habitation === 'uninhabited';
}), '66 CE deserts remain unowned, impassable, uninhabited');

console.log('== an old 1948 save lifts the wall ==');
const legacy = JSON.parse(JSON.stringify(modern));
for (const name of Object.keys(DESERTS)) {
  const p = legacy.provinces[idOf(name)];
  p.impassable = true; // the pre-v4.3 wall
  p.habitation = 'uninhabited';
}
// Pretend the player had somehow earned a tier here — it must never be clobbered.
legacy.provinces[idOf('Syrian Desert')].habitation = 'rural';
reconcileGameProvinces({
  game: legacy, DEFINES, MAP_DATA, geom: fakeGeom,
  bookmark: BOOKMARK_1948, provinceMap: modernMap,
});
ok(Object.keys(DESERTS).every((name) => !legacy.provinces[idOf(name)].impassable),
  'reconciliation opens every desert in an old save');
ok(legacy.provinces[idOf('Sinai Interior')].habitation === 'frontier',
  'untouched empty desert adopts the era frontier tier');
ok(legacy.provinces[idOf('Syrian Desert')].habitation === 'rural',
  'an earned habitation tier survives reconciliation');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
