// Headless regression — SPEC §5.6: the nation label sits on the ground it names.
//
// The bug this suite exists for: the nation tier drew ONE label per court, at
// the owner-weighted centroid of everything it owned. That is the centre of
// mass of a realm, and the centre of mass of a realm in two places is in
// neither of them — a Judaea holding the Levant and Greece wrote JUDAEA across
// the open Mediterranean. Measured below on the real raster: the old rule put
// 19 of 249 opening-position labels in the water, Rome's among them in three
// chapters. The fix groups a court's ground by region and names each part —
// the court's own name over its seat's region, "[Adjective] [Region]" over the
// rest — anchoring each on the biggest cell near that part's own centre.
//
// Four sides:
//
//   ATLAS — the regions partition the province table: every cell in exactly
//   one, no region naming a cell that is not there, and validateMapData saying
//   so, because a cell in no region labels itself and one in two is counted
//   twice toward both.
//
//   PENS — every court declares an adjective, including every court a chapter
//   renames (SPEC §139): a 529 Galilee that wrote "Judaean Egypt" abroad would
//   be naming a state that does not exist in that century.
//
//   GROUND — over all eight bookmarks, on the real geometry snapshot: every
//   label on land, every label inside a cell its own court holds, exactly one
//   home label per court. The same pass re-runs the OLD rule and asserts it
//   fails, so this is a bug the suite can still see.
//
//   WORDS — the three the section was asked for: Judaean Greece, Israeli
//   Britain, Hasmonean Egypt.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA, validateMapData } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { bus } = await import(R + '/js/core/bus.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { tagLabelParts } = await import(R + '/js/map/labels.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// Real geometry, folded per bookmark exactly as autorun does it.
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const RAW = {
  centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
  areas: Int32Array.from(snap.areas),
};
function foldGeom(mapping) {
  const N = RAW.areas.length - 1;
  const to = (id) => (mapping && mapping[id]) || id;
  const areas = new Int32Array(N + 1);
  const centroids = RAW.centroids.slice();
  for (let id = 1; id <= N; id++) areas[to(id)] += RAW.areas[id];
  for (let id = 1; id <= N; id++) if (to(id) !== id) centroids[id] = centroids[to(id)];
  return { neighbors: [], centroids, areas, bbox: [] };
}

// The land test is the atlas's own coastline, not a proxy: unproject the label
// and ask whether that lon/lat is inside a landmass and outside every lake.
const unproject = (x, y) => [
  MAP_DATA.LON0 + (x / MAP_DATA.MAP_W) * (MAP_DATA.LON1 - MAP_DATA.LON0),
  MAP_DATA.LAT1 - (y / MAP_DATA.MAP_H) * (MAP_DATA.LAT1 - MAP_DATA.LAT0),
];
function inPoly(lon, lat, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > lat) !== (yj > lat)) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function onLand(x, y) {
  const [lon, lat] = unproject(x, y);
  if (!MAP_DATA.coast.land.some((ring) => inPoly(lon, lat, ring))) return false;
  return !MAP_DATA.coast.lakes.some((ring) => inPoly(lon, lat, ring));
}

function boot(era, playerTag) {
  const mapping = buildProvinceMapping(MAP_DATA, era.bookmark);
  const geom = foldGeom(mapping);
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events,
    playerTag, rngSeed: 127,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: era.bookmark, events: era.events,
    provinceMap: mapping,
  });
  return { ctx, geom };
}

console.log('== the atlas is divided into regions, once each ==');
ok(validateMapData().length === 0, 'the map schema with regions validates cleanly');
const seen = new Map();
let doubled = 0;
for (const [region, members] of Object.entries(MAP_DATA.regions)) {
  for (const nm of members) {
    if (seen.has(nm)) doubled++;
    seen.set(nm, region);
  }
}
ok(doubled === 0, 'no province is claimed by two regions');
const unregioned = MAP_DATA.provinces.filter((p) => !seen.has(p.name)).map((p) => p.name);
ok(unregioned.length === 0, 'every province belongs to a region: ' + (unregioned.slice(0, 6).join(', ') || 'all 307'));
const strays = [...seen.keys()].filter((nm) => !MAP_DATA.provinces.some((p) => p.name === nm));
ok(strays.length === 0, 'no region names a province the atlas does not have: ' + (strays.join(', ') || 'none'));

console.log('\n== every court has an adjective to be known by abroad ==');
const adjless = Object.entries(DEFINES.TAGS).filter(([, d]) => !d.adj).map(([k]) => k);
ok(adjless.length === 0, 'every tag declares one: ' + (adjless.join(', ') || `all ${Object.keys(DEFINES.TAGS).length}`));
const renamedNoAdj = [];
for (const era of ERAS) {
  for (const [tag, tweak] of Object.entries(era.bookmark.tagTweaks || {})) {
    // Renaming a court and leaving its adjective behind is the one way the two
    // can disagree, so the rule is flat: rename the name, declare the adjective.
    if (tweak.name && tweak.name !== (DEFINES.TAGS[tag] || {}).name && !tweak.adj) {
      renamedNoAdj.push(`${era.bookmark.id}/${tag} (${tweak.name} -> ${(DEFINES.TAGS[tag] || {}).adj})`);
    }
  }
}
ok(renamedNoAdj.length === 0, 'a chapter that renames a court renames its adjective: ' + (renamedNoAdj.join(', ') || 'all covered'));
ok(DEFINES.TAGS.ROM.homeRegion === 'Italy' && DEFINES.TAGS.UK.homeRegion === 'Britain',
  'the courts whose seat is deliberately elsewhere declare where their name belongs');

console.log('\n== every label stands on the ground it names (8 bookmarks, real raster) ==');
let inWater = 0;
let offEstate = 0;
let placed = 0;
let oldRuleInWater = 0;
let oldRuleTotal = 0;
const badHome = [];
const water = [];
for (const era of ERAS) {
  const playerTag = (era.bookmark.playable && era.bookmark.playable[0] && era.bookmark.playable[0].tag) || 'JUD';
  const { ctx, geom } = boot(era, playerTag);
  const parts = tagLabelParts(ctx, geom, MAP_DATA);
  const homes = new Map();
  const owned = new Map(); // tag -> set of ids it holds

  for (let id = 1; id < ctx.game.provinces.length; id++) {
    const p = ctx.game.provinces[id];
    if (!p || p.impassable || !p.owner || p.owner === 'WASTE' || !geom.areas[id]) continue;
    if (!owned.has(p.owner)) owned.set(p.owner, new Map());
    owned.get(p.owner).set(id, p);
  }
  for (const part of parts) {
    placed++;
    if (!onLand(part.x, part.y)) {
      inWater++;
      if (water.length < 6) water.push(`${era.bookmark.id} ${part.text}`);
    }
    // the anchor must be a cell this court actually holds, in this region
    const mine = owned.get(part.tag) || new Map();
    const hit = [...mine.keys()].some((id) => geom.centroids[id]
      && geom.centroids[id].x === part.x && geom.centroids[id].y === part.y);
    if (!hit) offEstate++;
    if (part.home) homes.set(part.tag, (homes.get(part.tag) || 0) + 1);
  }
  for (const [tag] of owned) {
    if (homes.get(tag) !== 1) badHome.push(`${era.bookmark.id}/${tag}=${homes.get(tag) || 0}`);
  }

  // …and the rule this replaced, on the same board.
  for (const [tag, mine] of owned) {
    let a = 0; let x = 0; let y = 0;
    for (const id of mine.keys()) { a += geom.areas[id]; x += geom.centroids[id].x * geom.areas[id]; y += geom.centroids[id].y * geom.areas[id]; }
    oldRuleTotal++;
    if (!onLand(x / a, y / a)) oldRuleInWater++;
  }
}
ok(placed > 300, `the eight opening positions place ${placed} nation labels`);
ok(inWater === 0, 'not one of them is in the sea: ' + (water.join(', ') || 'zero'));
ok(offEstate === 0, 'every one is anchored on a cell its own court holds');
ok(badHome.length === 0, 'every court writes its own name exactly once: ' + (badHome.slice(0, 6).join(', ') || 'all'));
ok(oldRuleInWater > 0,
  `the rule this replaced still fails the same test (${oldRuleInWater} of ${oldRuleTotal} in water) — the bug is real and this suite can see it`);

console.log('\n== a court abroad is named for the land it is standing on ==');
const era66 = ERAS.find((e) => e.bookmark.id === '66ce');
{
  const { ctx, geom } = boot(era66, 'JUD');
  for (const nm of ['Corinth', 'Athens', 'Sparta', 'Thessalonica']) ctx.prov(nm).owner = 'JUD';
  const parts = tagLabelParts(ctx, geom, MAP_DATA);
  const jud = parts.filter((p) => p.tag === 'JUD');
  const greece = jud.find((p) => p.region === 'Greece');
  const home = jud.find((p) => p.home);
  ok(!!greece && greece.text === 'Judaean Greece', 'Judaea in Greece is Judaean Greece: ' + (greece && greece.text));
  ok(!!home && home.text === 'Judaea' && home.region === 'Judaea', 'and is still plainly Judaea at home');
  ok(!!greece && !!home && Math.hypot(greece.x - home.x, greece.y - home.y) > 800,
    'the two labels are a realm apart, not averaged into one point in the sea between them');
  const [lon] = unproject(greece.x, greece.y);
  ok(lon > 20 && lon < 26, 'the Greek label is written in Greece (lon ' + lon.toFixed(1) + ')');
}
{
  // Hasmonean Judaea takes the Nile; the 1948 chapter's Israel takes Britain.
  const era167 = ERAS.find((e) => e.bookmark.id === '167bce');
  const { ctx, geom } = boot(era167, 'HAS');
  for (const nm of ['Alexandria', 'Memphis', 'Athribis', 'Arsinoe', 'Oxyrhynchus']) ctx.prov(nm).owner = 'HAS';
  const egypt = tagLabelParts(ctx, geom, MAP_DATA).find((p) => p.tag === 'HAS' && p.region === 'Egypt');
  ok(!!egypt && egypt.text === 'Hasmonean Egypt', 'the Hasmoneans on the Nile are Hasmonean Egypt: ' + (egypt && egypt.text));
}
{
  const era1948 = ERAS.find((e) => e.bookmark.id === '1948ce');
  const { ctx, geom } = boot(era1948, 'ISR');
  for (const nm of ['Britannia', 'Londinium', 'Eboracum', 'Deva', 'Lindum']) ctx.prov(nm).owner = 'ISR';
  const parts = tagLabelParts(ctx, geom, MAP_DATA);
  const britain = parts.find((p) => p.tag === 'ISR' && p.region === 'Britain');
  ok(!!britain && britain.text === 'Israeli Britain', 'Israel in Britain is Israeli Britain: ' + (britain && britain.text));
  const uk = parts.find((p) => p.tag === 'UK' && p.home);
  ok(!!uk && uk.region === 'Britain',
    'and Britain itself writes BRITAIN in Britain, though its seat this chapter is Cyprus');
  const rome = ERAS.find((e) => e.bookmark.id === '66ce');
  const roman = tagLabelParts(boot(rome, 'JUD').ctx, foldGeom(buildProvinceMapping(MAP_DATA, rome.bookmark)), MAP_DATA)
    .find((p) => p.tag === 'ROM' && p.home);
  ok(!!roman && roman.region === 'Italy',
    'and ROME is written in Italy, though the empire is played from Antioch');
}

console.log('\n== the chapter that renames a court renames it abroad too ==');
{
  // 529's Jewish state is Galilee, and it opens with nothing: give it its lake
  // towns back before it takes the Nile, or Egypt would be its home by default.
  const era529 = ERAS.find((e) => e.bookmark.id === '529ce');
  const { ctx, geom } = boot(era529, 'JUD');
  for (const nm of ['Tiberias', 'Tarichaea', 'Sepphoris', 'Gischala']) ctx.prov(nm).owner = 'JUD';
  for (const nm of ['Alexandria', 'Memphis', 'Athribis']) ctx.prov(nm).owner = 'JUD';
  const parts = tagLabelParts(ctx, geom, MAP_DATA).filter((p) => p.tag === 'JUD');
  const egypt = parts.find((p) => p.region === 'Egypt');
  ok(!!egypt && egypt.text === 'Galilean Egypt',
    'the sixth-century Galilee is Galilean abroad, not Judaean: ' + (egypt && egypt.text));
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
