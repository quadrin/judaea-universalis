// Headless regression — SPEC §194: the sea has a western half.
//
// §172 put twenty communities on the board and ten of them lay east of
// Cyprus; everything west of Sicily was empty water. The period's own
// documents enumerate more — the circular Rome sent to the free cities in
// 139 BCE (1 Macc 15) and Agrippa's survey in Philo are address lists of the
// Greek sea — so the address book carries its western half now: Asia Minor
// and the islands, Greece, Italy and Sicily, Africa west of Cyrene, Sepharad
// and Gaul. Fifteen entries, each keyed to a canonical cell that exists,
// each with a window that opens and closes on its own history: the Aegean
// deportations of 1944, the expulsions of 1306/1492/1493/1541, the Maghreb's
// one-date-per-flag closes of 1952/1962/1967, and the windows that stay open
// because the communities do (Izmir, Athens, Marseille, Morocco).
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const { DIASPORA, communityOf, openAt, shutBy, communitiesAt, communitiesBetween } =
  await import(R + '/js/data/diaspora.js');
const { computeMapmodeColors } = await import(R + '/js/map/mapmodes.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

function loadGeom() {
  const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
  return {
    neighbors: snap.neighbors.map((a) => new Set(a)),
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas), bbox: [],
  };
}
function foldGeom(raw, mapping) {
  const N = raw.neighbors.length - 1;
  const to = (id) => (mapping && mapping[id]) || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  const areas = new Int32Array(N + 1);
  const coastal = new Array(N + 1).fill(false);
  const centroids = raw.centroids.slice();
  const offshore = raw.offshore.slice();
  for (let id = 1; id <= N; id++) {
    const t = to(id);
    areas[t] += raw.areas[id];
    if (raw.coastal[id]) coastal[t] = true;
    if (!offshore[t] && raw.offshore[id]) offshore[t] = raw.offshore[id];
    for (const nb of raw.neighbors[id]) {
      const tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  for (let id = 1; id <= N; id++) {
    if (to(id) !== id) { centroids[id] = centroids[to(id)]; offshore[id] = offshore[to(id)]; }
  }
  return { neighbors, centroids, areas, coastal, offshore, bbox: [] };
}
const RAW = loadGeom();
function boot(bookmarkId, { seed = 13 } = {}) {
  const era = ERAS.find((e) => e.bookmark.id === bookmarkId);
  const bm = era.bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, bm);
  const geom = foldGeom(RAW, provinceMap);
  const tag = bm.playableTags[0].tag;
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: bm, events: era.events, playerTag: tag, rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus: { emit() {}, on() {} }, bookmark: bm, events: era.events, provinceMap,
  });
  game.tags[tag].ai = false;
  return { bm, game, ctx, actions: gameActions(ctx), tag };
}
const run = (ctx, years) => { for (let i = 0; i < years * 360; i++) tickDay(ctx); };

// ---------------------------------------------------------------------------
console.log('== every address in the book is a cell on the map ==');
{
  // The table is keyed on canonical province names, and nothing at write
  // time checked the key. A typo would ship a community nobody can click.
  // §195 added a second kind of seat — `tag` instead of `prov`, a community
  // hosted by a court (America has no cell) — so the guard checks whichever
  // key an entry carries.
  const names = new Set(MAP_DATA.provinces.map((p) => p.name));
  const missing = DIASPORA.filter((d) => d.prov && !names.has(d.prov)).map((d) => d.prov);
  ok(missing.length === 0, 'every province-seated community\'s prov is a canonical cell'
    + (missing.length ? ' (missing: ' + missing.join(', ') + ')' : ' (' + DIASPORA.length + ' entries)'));
  ok(DIASPORA.every((d) => (d.prov && !d.tag) || (d.tag && !d.prov)),
    'every entry sits on exactly one seat: a cell or a court');
  // 35 until §195 seated London and America.
  ok(DIASPORA.length === 37, 'thirty-seven communities: twenty of §172, fifteen of §194, two of §195');
  const seats = DIASPORA.map((d) => d.prov || ('tag:' + d.tag));
  ok(new Set(seats).size === seats.length, 'no seat carries two entries');
  ok(DIASPORA.every((d) => d.size >= 1 && d.size <= 5), 'every size is on the 1-5 scale');
  ok(DIASPORA.every((d) => d.until === null || d.from < d.until), 'every window closes after it opens');
}

console.log('== the fifteen, and their windows ==');
{
  for (const [prov, from, until] of [
    ['Tarsus', -200, 650], ['Smyrna', -250, null],
    ['Athens', -100, null], ['Sparta', -170, 396],
    ['Rhodes', -170, 1944], ['Gortyn', -170, 1944],
    ['Capua', -50, 1541], ['Syracusae', -50, 1493],
    ['Carthago', 70, 1967], ['Oea', -50, 1952],
    ['Cirta', 200, 1962], ['Volubilis', 200, null],
    ['Corduba', 300, 1492], ['Massilia', 450, null], ['Narbo', 460, 1306],
  ]) {
    const d = communityOf(prov);
    ok(!!d && d.from === from && d.until === until,
      prov + ': ' + from + ' to ' + (until === null ? 'still there' : until));
  }
  // The consul's letter of 139 BCE is the attestation spine of the Aegean
  // entries, so they are all on the board while the Hasmonean chapters play.
  for (const prov of ['Smyrna', 'Tarsus', 'Sparta', 'Rhodes', 'Gortyn']) {
    ok(openAt(communityOf(prov), -167), prov + ' is open when the Maccabean chapter opens');
  }
  // Punic Carthage attests no community: the 167 chapter's living Carthaginian
  // court gets no anachronistic congregation, and the window opens with the
  // captives of 70 — four years into the Great Revolt's own chapter.
  const car = communityOf('Carthago');
  ok(!openAt(car, -167) && !openAt(car, 66) && openAt(car, 70) && openAt(car, 614),
    'Carthage: nothing under the Punic city, a community from 70, still there in 614');
  // No writable Sparta in Justinian's Greece — and no un-writable one either:
  // shut is drawn as shut, not-yet is not.
  const spa = communityOf('Sparta');
  ok(openAt(spa, 66) && openAt(spa, 132) && shutBy(spa, 529),
    'Sparta answers 66 and 132 CE, and has gone out before the Keepers');
}

console.log('== the west the Byzantine chapters were missing ==');
{
  // 529 and 614 used to see fourteen communities, all but Rome and the
  // Balkans east of the Aegean. The sixth-century Mediterranean — Gregory's
  // letters about Sicily, Justinian's Africa, Sisebut's Spain — doubles it.
  const at529 = communitiesAt(529).map((d) => d.prov);
  ok(at529.length === 28, '529 opens with 28 communities on the board, up from 14');
  for (const prov of ['Corduba', 'Massilia', 'Narbo', 'Carthago', 'Syracusae', 'Capua', 'Gortyn', 'Tarsus']) {
    ok(at529.indexOf(prov) >= 0, prov + ' is among them');
  }
  const at614 = communitiesAt(614);
  ok(at614.length === 28 && at614[0].size >= at614[at614.length - 1].size,
    '614 sees the same west, largest first');
}

console.log('== a letter actually goes to the new addresses ==');
{
  // 66 CE: the chapter the feature exists for. The player opens at war with
  // Rome, and the new Roman-held communities are reachable on the same
  // war-raises-the-bar rule as Alexandria.
  const { ctx, actions } = boot('66ce', { seed: 7 });
  run(ctx, 0.1);
  const athens = actions.getCommunity(ctx.provId('Athens'));
  ok(!!athens && athens.name === 'The Jews of Athens' && athens.asks.length === 4,
    'Athens answers the panel with four asks');
  const sparta = actions.getCommunity(ctx.provId('Sparta'));
  ok(!!sparta && sparta.name === 'The Kinsmen at Sparta' && sparta.size === 1,
    'the Kinsmen at Sparta are on the 66 CE board');
  ok(!actions.getCommunity(ctx.provId('Carthago')),
    'Carthage is not — the window opens with the captives of 70');

  // §194 must not move the tuning. The new entries follow the file's own
  // curve — nothing rivals the great nodes, nobody opens devoted — and the
  // war chapter cannot farm its new Roman-hosted communities: the war bar
  // (need +15) sits above their opening standing for silver, and nobody's
  // sons come at all. Measured at authoring: the whole new set's theoretical
  // silver is 2-7% of gross income in the solvent chapters, and the war
  // gates lock the rest.
  const NEW15 = ['Tarsus', 'Smyrna', 'Athens', 'Sparta', 'Rhodes', 'Gortyn', 'Capua',
    'Syracusae', 'Carthago', 'Oea', 'Cirta', 'Volubilis', 'Corduba', 'Massilia', 'Narbo'];
  ok(NEW15.every((p) => communityOf(p).size <= 3),
    'no new community outranks size 3 — Alexandria and Babylon keep the centre of gravity');
  ok(NEW15.every((p) => communityOf(p).start <= 50),
    'no new community opens above 50 standing — devotion has to be earned');
  for (const prov of ['Capua', 'Syracusae', 'Smyrna', 'Gortyn', 'Rhodes', 'Athens', 'Tarsus']) {
    const c = actions.getCommunity(ctx.provId(prov));
    ok(!!c && c.atWar && !c.asks.find((a) => a.id === 'silver').can,
      prov + ' will not gather silver for a crown its empire is fighting — not at opening standing');
  }
  const anyMen = NEW15
    .map((p) => actions.getCommunity(ctx.provId(p)))
    .filter(Boolean)
    .some((c) => c.asks.find((a) => a.id === 'volunteers').can);
  ok(!anyMen, 'and none of the new communities sends its sons on day one');
}

console.log('== 1948: the Maghreb is writable, the Aegean is memory ==');
{
  const { game, ctx, actions } = boot('1948ce', { seed: 7 });
  run(ctx, 0.1);
  // The communities Israel's first decade actually drew on.
  for (const prov of ['Carthago', 'Oea', 'Cirta', 'Volubilis', 'Smyrna', 'Athens', 'Massilia']) {
    ok(!!actions.getCommunity(ctx.provId(prov)), prov + ' can be written to in 1948');
  }
  // Writable is not farmable: at peace-time standing nobody's sons come on
  // day one here either — the volunteer bar (55) sits above every new
  // community's opening standing, in the modern chapter as in the ancient.
  ok(!['Carthago', 'Oea', 'Cirta', 'Volubilis', 'Smyrna', 'Athens', 'Massilia']
    .map((p) => actions.getCommunity(ctx.provId(p)))
    .some((c) => c && c.asks.find((a) => a.id === 'volunteers').can),
    'no new community sends men to the 1948 war on day one — devotion has to be built first');
  // …each Maghreb window closing on its own date, west of the eastern trio.
  game.date.y = 1953;
  ok(!actions.getCommunity(ctx.provId('Oea')), 'Tripoli goes out with Baghdad, by 1953');
  ok(!!actions.getCommunity(ctx.provId('Cirta')), 'Constantine is still there');
  game.date.y = 1963;
  ok(!actions.getCommunity(ctx.provId('Cirta')), 'and leaves with France, by 1963');
  ok(!!actions.getCommunity(ctx.provId('Carthago')), 'Tunis is still there');
  game.date.y = 1968;
  ok(!actions.getCommunity(ctx.provId('Carthago')), 'until the week of the June war');
  game.date.y = 1975;
  ok(!!actions.getCommunity(ctx.provId('Volubilis')),
    'Morocco never entirely goes: the Farthest West still answers in 1975');

  // The map: 1944 hatches beside 1943's, and the expelled Latin west is
  // drawn as memory, not blank water (§175's rule, inherited).
  game.date.y = 1948;
  const idx = {};
  game.provinces.forEach((q, i) => { if (q) idx[q.canon || q.name] = i; });
  const r48 = computeMapmodeColors({ game, DEFINES }, 'diaspora');
  for (const prov of ['Rhodes', 'Gortyn', 'Thessalonica']) {
    ok((r48.flags[idx[prov]] & 2) === 2, prov + ' is hatched on the 1948 dispersion map');
  }
  for (const prov of ['Corduba', 'Syracusae', 'Narbo']) {
    ok((r48.flags[idx[prov]] & 2) === 2, prov + ' reads as the expulsion left it: hatched, remembered');
  }
  ok((r48.flags[idx.Volubilis] & 2) === 0 && (r48.flags[idx.Massilia] & 2) === 0,
    'while Morocco and Marseille read as living communities');

  // The Compendium's era page tells the 1948 chapter the same list.
  const names = communitiesBetween(1948, 2005).map((d) => d.prov);
  ok(names.indexOf('Volubilis') >= 0 && names.indexOf('Cirta') >= 0
    && names.indexOf('Rhodes') < 0 && names.indexOf('Corduba') < 0,
    'the era page lists the Maghreb and not the memories');
}

console.log('== the old pins hold ==');
{
  // §172/§176 claims this section must not have moved: the biggest node
  // still dies in 117, the east still closes on its own dates, and the
  // sizes still separate on the 66 CE board.
  ok(communityOf('Alexandria').until === 117 && communityOf('Babylon').until === 1952,
    'Alexandria still ends in 117 and Babylon in 1952');
  const at66 = communitiesAt(66);
  ok([5, 4, 3, 2, 1].every((sz) => at66.some((d) => d.size === sz)),
    'every community size is still on the 66 CE board');
  ok(at66[0].prov === 'Alexandria', 'and Alexandria is still the largest thing on it');
}

// ---------------------------------------------------------------------------
if (failures) { console.error('\n' + failures + ' FAILURES'); process.exit(1); }
console.log('\nALL PASS');
