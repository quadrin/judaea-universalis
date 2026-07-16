// Headless regression — v4.4 (SPEC §45): the modern borders of Israel are
// formable in 1948. Four new Negev cells (Dimona, Mitzpe Ramon, Paran, Eilat)
// complete the armistice shape; the Uvda route runs down the Arabah without
// taking Aqaba; ancient eras fold the Negev into Nabataea; and the greater
// verdict — From Dan to Eilat — now honestly requires Eilat.
import { readFileSync } from 'fs';
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');

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
const NEGEV = { 'Dimona': 'EGY', 'Mitzpe Ramon': 'EGY', 'Paran': 'JOR', 'Eilat': 'JOR' };

console.log('== the Negev is on the map ==');
const modernMap = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);
const g = initGame({
  DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_1948, events: [],
  playerTag: 'ISR', rngSeed: 1948, provinceMap: modernMap,
});
ok(Object.entries(NEGEV).every(([name, tag]) => {
  const p = g.provinces[idOf(name)];
  return p && p.owner === tag && p.habitation === 'frontier' && !p.impassable;
}), 'the four Negev cells start as Egyptian and Jordanian frontier claims');

console.log('== the Uvda route runs down the Arabah ==');
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const nb = (name) => new Set(snap.neighbors[idOf(name)] || []);
ok(nb('Beersheba').has(idOf('Dimona')) || nb('Beersheba').has(idOf('Oboda')),
  'Beersheba opens into the northern Negev');
ok(nb('Mitzpe Ramon').has(idOf('Oboda')) && nb('Mitzpe Ramon').has(idOf('Paran')),
  'the central highlands link Nitzana to the deep south');
ok(nb('Paran').has(idOf('Eilat')),
  'Eilat is reachable through Paran — the march of Operation Uvda, no Aqaba required');
ok(nb('Eilat').has(idOf('Aila')),
  'Eilat still faces Jordanian Aqaba across the gulf head');

console.log('== ancient eras fold the Negev into Nabataea ==');
const ancientMap = buildProvinceMapping(MAP_DATA, BOOKMARK_66);
ok(ancientMap[idOf('Dimona')] === idOf('Oboda')
    && ancientMap[idOf('Mitzpe Ramon')] === idOf('Oboda')
    && ancientMap[idOf('Paran')] === idOf('Aila')
    && ancientMap[idOf('Eilat')] === idOf('Aila'),
  'the Negev cells collapse into Oboda and Aila, never into waste');
const ancient = initGame({
  DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_66, events: [],
  playerTag: 'JUD', rngSeed: 66, provinceMap: ancientMap,
});
ok(Object.keys(NEGEV).every((n) => ancient.provinces[idOf(n)] === null),
  '66 CE has no hidden Negev economy or victory land');

console.log('== From Dan to Eilat requires Eilat ==');
const ctx = makeCtx({
  game: g, DEFINES, MAP_DATA, geom: fakeGeom, bus,
  bookmark: BOOKMARK_1948, events: [], provinceMap: modernMap,
});
// A chapter verdict while the nation still stands arrives as a notify card;
// only true elimination emits gameover. Capture both.
const verdicts = [];
const un1 = bus.on('gameover', (p) => verdicts.push(p && p.title));
const un2 = bus.on('notify', (p) => { if (p && /verdict|Eilat|Independence/i.test(p.title || '')) verdicts.push(p.title); });
g.wars = [];                        // the war is over,
g.date = { y: 1949, m: 3, d: 10 }; // the armistice season has come,
// ...and Israel holds the coast, the Galilee, Jerusalem — 25+ provinces —
// but has not marched south. That is Independence, not From Dan to Eilat.
for (const n of ['Gaza', 'Ascalon', 'Kiryat Gat', 'Beersheba']) {
  const p = g.provinces[idOf(n)];
  p.owner = 'ISR'; p.controller = 'ISR';
}
let isrProvs = 0;
for (const p of g.provinces) if (p && !p.impassable && p.controller === 'ISR') isrProvs++;
ok(isrProvs >= 25 && g.provinces[idOf('Jerusalem')].controller === 'ISR',
  'the test state holds 25+ provinces (' + isrProvs + ') and Jerusalem — but not Eilat');
BOOKMARK_1948.checkVictory(ctx);
ok(g.result === 'win' && verdicts.length === 1 && !/Dan to Eilat/i.test(verdicts[0]),
  'without Eilat the verdict is only the armistice: "' + verdicts[0] + '"');

// Rewind, march south, and take Eilat: the greater verdict fires.
g.result = null; g.over = false;
for (const n of ['Dimona', 'Mitzpe Ramon', 'Paran', 'Eilat']) {
  const p = g.provinces[idOf(n)];
  p.owner = 'ISR'; p.controller = 'ISR';
}
BOOKMARK_1948.checkVictory(ctx);
un1(); un2();
ok(g.result === 'win' && /Dan to Eilat/i.test(verdicts[1] || ''),
  'holding the Negev down to Eilat earns the greater verdict: "' + verdicts[1] + '"');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
