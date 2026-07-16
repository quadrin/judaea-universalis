// Headless regression — bookmark-specific geography activates modern cells in
// 1948, collapses them in ancient eras, and reconciles pre-expansion saves.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { computeGeometry } = await import(R + '/js/map/geometry.js');
const { initGame, makeCtx, reconcileGameProvinces } = await import(R + '/js/sim/init.js');

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
const childId = idOf('Safed');
const parentId = idOf('Gischala');

console.log('== profile mapping ==');
const ancientMap = buildProvinceMapping(MAP_DATA, BOOKMARK_66);
const modernMap = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);
ok(ancientMap[childId] === parentId, 'ancient Safed cell resolves to Gischala');
ok(modernMap[childId] === childId, '1948 Safed cell resolves to itself');
ok(BOOKMARK_1948.activeProvinces.length === 28, '1948 activates all 28 modern cells');

const tinyMap = {
  MAP_W: 3, MAP_H: 1,
  provinces: [
    { name: 'Parent', lon: 0, lat: 0, terrain: 'hills' },
    { name: 'Child', lon: 1, lat: 0, terrain: 'hills', latentParent: 'Parent' },
  ],
  project: (lon) => [lon, 0], extraLinks: [], severLinks: [],
};
const rawCells = new Uint16Array([1, 2, 2]);
const tinyAncientMap = buildProvinceMapping(tinyMap, null);
const tinyAncientGeom = computeGeometry(rawCells, tinyMap, tinyAncientMap);
const tinyModernMap = buildProvinceMapping(tinyMap, { activeProvinces: ['Child'] });
const tinyModernGeom = computeGeometry(rawCells, tinyMap, tinyModernMap);
ok(tinyAncientGeom.areas[1] === 3 && tinyAncientGeom.areas[2] === 0,
  'collapsed child pixels enlarge the historical parent without a hidden node');
ok(!tinyAncientGeom.neighbors[1].has(2), 'collapsed cell draws no internal ancient border');
ok(tinyModernGeom.areas[1] === 1 && tinyModernGeom.areas[2] === 2
    && tinyModernGeom.neighbors[1].has(2),
  'activated cell gains its own area and movement adjacency');

console.log('== campaign provinces ==');
const ancient = initGame({
  DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_66, events: [],
  playerTag: 'JUD', rngSeed: 27, provinceMap: ancientMap,
});
const modern = initGame({
  DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_1948, events: [],
  playerTag: 'ISR', rngSeed: 1948, provinceMap: modernMap,
});
ok(ancient.provinces[childId] === null, 'ancient campaign has no extra Safed economy or victory land');
ok(modern.provinces[childId].owner === 'ISR', '1948 Safed is an Israeli province');
ok(modern.provinces[idOf('Ramallah')].owner === 'JOR'
    && modern.provinces[idOf('Rafah')].owner === 'EGY',
  '1948 ownership overlay reaches West Bank and Gaza cells');
ok(modern.provinces[idOf('Arad')].habitation === 'frontier'
    && modern.provinces[idOf('Kiryat Gat')].habitation === 'frontier',
  'later-founded places begin as sovereign frontier land');
const devByOwner = {};
for (const p of modern.provinces) {
  if (!p || p.impassable) continue;
  devByOwner[p.owner] = (devByOwner[p.owner] || 0) + p.dev.tax + p.dev.prod + p.dev.mp;
}
// EGY counts 207: the 189 of v4.3-v4.5 (deserts, Negev claims) plus v5.0's
// Marsa Matruh (4), Aswan (9) and Berenice (5). JOR counts 170; ISR 205.
ok(devByOwner.ISR === 205 && devByOwner.JOR === 170 && devByOwner.EGY === 207,
  'subdivision redistributes development instead of duplicating regional wealth');
const ctx = makeCtx({
  game: modern, DEFINES, MAP_DATA, geom: fakeGeom, bus: null,
  bookmark: BOOKMARK_1948, events: [], provinceMap: modernMap,
});
ok(ctx.prov('Safed').canon === 'Safed' && ctx.prov('Jish').canon === 'Gischala',
  'modern Safed and Jish are separately addressable with no duplicate alias');

console.log('== old-save reconciliation ==');
const legacy = JSON.parse(JSON.stringify(modern));
legacy.provinces = legacy.provinces.slice(0, 105); // the pre-expansion 104-cell schema
legacy.mapProfileVersion = undefined;
legacy.tags.ISR.treasury = 321;
// Simulate the old Tel Aviv baseline plus one player-developed tax point.
legacy.provinces[idOf('Joppa')].dev = { tax: 13, prod: 10, mp: 8 };
reconcileGameProvinces({
  game: legacy, DEFINES, MAP_DATA, geom: fakeGeom,
  bookmark: BOOKMARK_1948, provinceMap: modernMap,
});
ok(legacy.provinces.length === N + 1 && legacy.provinces[childId].canon === 'Safed',
  'pre-expansion 1948 save gains every active modern province');
ok(legacy.tags.ISR.treasury === 321, 'campaign state survives province reconciliation');
ok(legacy.provinces[idOf('Joppa')].dev.tax === 13
    && legacy.provinces[idOf('Joppa')].dev.prod === 7,
  'save migration preserves player-added development above the redistributed baseline');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
