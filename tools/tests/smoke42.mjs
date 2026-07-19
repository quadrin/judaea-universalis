// Headless regression — v6.8 (SPEC §66): the maps speak the owner's tongue
// only once the land is truly theirs. Conquered provinces keep their 15-May
// originals (Bir Saba, al-Majdal, al-Faluja, Umm Rashrash…) until the owner
// integrates them (integration at 1) or peoples them with its own culture
// (a completed settlement); a change of hands reverts the label, conquest
// resets integration, and saves neither lose earned renames nor re-wall an
// annexed waste.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, reconcileGameProvinces } = await import(R + '/js/sim/init.js');
const { changeOwnerCore, endWarBySword } = await import(R + '/js/sim/military.js');
const { monthlyIntegration } = await import(R + '/js/sim/realm.js');
const { settlementStart, monthlySettlement } = await import(R + '/js/sim/economy.js');

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
const bus = { emit() {}, on() { return () => {}; } };
const idOf = (n) => MAP_DATA.provinces.findIndex((p) => p.name === n) + 1;

const modernMap = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);
const g = initGame({
  DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_1948, events: [],
  playerTag: 'ISR', rngSeed: 42, provinceMap: modernMap,
});
const ctx = makeCtx({
  game: g, DEFINES, MAP_DATA, geom: fakeGeom, bus,
  bookmark: BOOKMARK_1948, events: [], provinceMap: modernMap,
});
const prov = (n) => g.provinces[idOf(n)];

console.log('== the map of 15 May wears its original names ==');
{
  const expected = {
    Beersheba: 'Bir Saba', Ascalon: 'al-Majdal', Azotus: 'Isdud',
    'Kiryat Gat': 'al-Faluja', Eilat: 'Umm Rashrash', Oboda: 'al-Auja',
    Lydda: 'Lydda', 'Beit Shemesh': 'Ayn Shams',
  };
  ok(Object.entries(expected).every(([c, n]) => prov(c).name === n),
    'the conquerable south opens as Bir Saba, al-Majdal, Isdud, al-Faluja, Umm Rashrash, al-Auja, Lydda, Ayn Shams');
  ok(ctx.prov('Bir Saba') && ctx.prov('Beersheba'),
    'era name and canonical key both address the province');
}

console.log('== conquest alone does not rename ==');
const beersheba = prov('Beersheba');
{
  changeOwnerCore(ctx, beersheba, 'ISR');
  beersheba.controller = 'ISR';
  ok(beersheba.name === 'Bir Saba',
    'Israeli-held Bir Saba keeps its name — the flag is not the schoolhouse');
}

console.log('== integration earns the new name ==');
{
  for (let i = 0; i < 3; i++) {
    beersheba.integrating = { by: 'ISR', monthsLeft: 1 };
    monthlyIntegration(ctx);
  }
  ok(beersheba.integration >= 1 && beersheba.name === 'Be\'er Sheva',
    'three integration programs later, the signposts read Be\'er Sheva');
}

console.log('== a change of hands reverts the label ==');
{
  changeOwnerCore(ctx, beersheba, 'EGY');
  ok(beersheba.name === 'Bir Saba',
    'retaken by Egypt, the town is Bir Saba again');
  // Israel re-occupies; the war ends by the sword — uti possidetis resets
  // the new owner's slate: integration is with a sovereign, not the soil.
  beersheba.controller = 'ISR';
  const war = g.wars.find((w) => w && w.attackers.concat(w.defenders).includes('ISR'));
  endWarBySword(ctx, war, 'def');
  ok(beersheba.owner === 'ISR' && beersheba.integration === 0 && beersheba.name === 'Bir Saba',
    'won back by the sword, the province arrives unintegrated and keeps its original name');
}

console.log('== settlement earns it too — the settlers name their town ==');
{
  const kg = prov('Kiryat Gat');
  kg.owner = 'ISR'; kg.controller = 'ISR';
  g.tags.ISR.points.infl = 300;
  const res = settlementStart(ctx, 'ISR', idOf('Kiryat Gat'));
  ok(res.ok && kg.name === 'al-Faluja', 'the project begins in al-Faluja');
  for (let i = 0; i < 7; i++) monthlySettlement(ctx);
  ok(kg.culture === 'israeli' && kg.name === 'Kiryat Gat',
    'peopled by its settlers, al-Faluja becomes Kiryat Gat');
}

console.log('== the Hashemite pen, symmetric ==');
{
  const jer = prov('Jerusalem');
  jer.owner = 'JOR'; jer.controller = 'JOR';
  jer.integration = 0.7;
  jer.integrating = { by: 'JOR', monthsLeft: 1 };
  monthlyIntegration(ctx);
  ok(jer.integration >= 1 && jer.name === 'Al-Quds',
    'a Jordanian Jerusalem, fully integrated, is written Al-Quds');
  jer.owner = 'ISR'; jer.controller = 'ISR'; jer.integration = 0;
}

console.log('== saves keep what was earned, and only that ==');
{
  const sahara = prov('Sahara');
  sahara.owner = 'UK'; sahara.controller = 'UK';
  sahara.impassable = false; sahara.habitation = 'frontier'; // an annexed waste
  const legacy = JSON.parse(JSON.stringify(g));
  reconcileGameProvinces({
    game: legacy, DEFINES, MAP_DATA, geom: fakeGeom,
    bookmark: BOOKMARK_1948, provinceMap: modernMap,
  });
  const lp = (n) => legacy.provinces[idOf(n)];
  ok(lp('Kiryat Gat').name === 'Kiryat Gat',
    'a load keeps the settlers\' earned Kiryat Gat');
  ok(lp('Beersheba').name === 'Bir Saba',
    'a load does not invent renames the campaign has not earned');
  ok(lp('Sahara').owner === 'UK' && lp('Sahara').impassable === false,
    'a load does not re-wall the annexed waste');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
