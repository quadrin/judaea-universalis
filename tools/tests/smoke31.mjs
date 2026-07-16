// Headless regression — v4.6 (SPEC §47): every era wears its true map.
// Base cells merge away where their towns are unbuilt or unrebuilt; latent
// cells activate where history demands them (Modi'in 167 BCE, Betar 132 CE);
// the Great Revolt's razed fortresses never reappear after 70 CE.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame } = await import(R + '/js/sim/init.js');

const BOOKS = {};
for (const [id, file, name] of [
  ['167bce', 'bookmark_167bce.js', 'BOOKMARK_167'],
  ['67bce', 'bookmark_67bce.js', 'BOOKMARK_67'],
  ['40bce', 'bookmark_40bce.js', 'BOOKMARK_40'],
  ['66ce', 'bookmark_66ce.js', 'BOOKMARK_66'],
  ['132ce', 'bookmark_132ce.js', 'BOOKMARK_132'],
  ['614ce', 'bookmark_614ce.js', 'BOOKMARK_614'],
  ['1948ce', 'bookmark_1948.js', 'BOOKMARK_1948'],
]) BOOKS[id] = (await import(R + '/js/data/' + file))[name];

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
const mapOf = (era) => buildProvinceMapping(MAP_DATA, BOOKS[era]);

console.log('== the fortresses obey their construction dates ==');
const m167 = mapOf('167bce');
ok(m167[idOf('Masada')] === idOf('Engaddi') && m167[idOf('Machaerus')] === idOf('Medaba'),
  '167 BCE: Masada and Machaerus are not yet built — their crags belong to Engaddi and Medaba');
for (const era of ['67bce', '40bce', '66ce']) {
  const m = mapOf(era);
  ok(['Masada', 'Machaerus', 'Jotapata', 'Gamala'].every((n) => m[idOf(n)] === idOf(n)),
    era + ': the Hasmonean and Herodian fortresses stand');
}
for (const era of ['132ce', '614ce']) {
  const m = mapOf(era);
  ok(m[idOf('Jotapata')] === idOf('Sepphoris') && m[idOf('Gamala')] === idOf('Batanea')
      && m[idOf('Machaerus')] === idOf('Medaba') && m[idOf('Masada')] === idOf('Engaddi'),
    era + ': the razed fortress-towns of the Great Revolt never return');
}
ok(mapOf('1948ce')[idOf('Masada')] === idOf('Masada'),
  '1948: Masada is a place again (Ein Gedi outposts and the myth)');

console.log('== history demands its villages ==');
const g167 = initGame({
  DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKS['167bce'], events: [],
  playerTag: 'HAS', rngSeed: 167, provinceMap: m167,
});
const modiin = g167.provinces[idOf('Modi\'in Hills')];
ok(!!modiin && modiin.name === 'Modi\'in' && modiin.owner === 'HAS',
  '167 BCE: Modi\'in stands in the Gophna hills, and it is the rebels\' own village');
ok(g167.provinces[idOf('Masada')] === null && g167.provinces[idOf('Machaerus')] === null,
  '167 BCE: no campaign province exists for the unbuilt fortresses');
ok(g167.provinces[idOf('Tiberias')] && g167.provinces[idOf('Tiberias')].name === 'Rakkath',
  '167 BCE: the lakeshore district survives under its old name, Rakkath');

const m132 = mapOf('132ce');
const g132 = initGame({
  DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKS['132ce'], events: [],
  playerTag: 'JUD', rngSeed: 132, provinceMap: m132,
});
const betar = g132.provinces[idOf('Beit Shemesh')];
ok(!!betar && betar.name === 'Betar' && betar.owner === 'JUD',
  '132 CE: Betar stands, Judean, waiting for its place in the story');
ok(g132.provinces[idOf('Jotapata')] === null,
  '132 CE: Galilee remembers Jotapata only in the telling');

console.log('== every merged province is one piece of land ==');
// A latent child whose pixels never touch the rest of its parent group would
// render the merged ancient province as disjoint patches (the two-blob
// Samaria bug): every group must be connected on the real raster adjacency.
{
  const { readFileSync } = await import('fs');
  const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
  const groups = {};
  MAP_DATA.provinces.forEach((p) => {
    if (p.latentParent) (groups[p.latentParent] = groups[p.latentParent] || []).push(p.name);
  });
  const disjoint = [];
  for (const parent of Object.keys(groups)) {
    const members = [parent, ...groups[parent]].map(idOf);
    const memberSet = new Set(members);
    const seen = new Set([idOf(parent)]);
    const q = [idOf(parent)];
    while (q.length) {
      const cur = q.shift();
      for (const nb of snap.neighbors[cur] || []) {
        if (memberSet.has(nb) && !seen.has(nb)) { seen.add(nb); q.push(nb); }
      }
    }
    if (members.some((m) => !seen.has(m))) disjoint.push(parent);
  }
  ok(disjoint.length === 0,
    'every latent group folds into one contiguous province (' + (disjoint.join(', ') || 'all clean') + ')');
}

console.log('== every owner key names a real cell ==');
const names = new Set(MAP_DATA.provinces.map((p) => p.name));
for (const era of Object.keys(BOOKS)) {
  const bad = Object.keys(BOOKS[era].owners || {}).filter((n) => !names.has(n));
  ok(bad.length === 0, era + ': owners table matches the map (' + (bad.join(', ') || 'clean') + ')');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
