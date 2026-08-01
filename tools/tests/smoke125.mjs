// Headless regression — SPEC §195: a community with no cell is written to
// from its host court's panel.
//
// §194 widened the sea and stopped at the map's edge. The 1948 chapter's two
// biggest hosts sit past it: England (a cell — London — but a community whose
// window opens at the 1656 Resettlement, twelve centuries after the last
// chapter that could have clicked it) and the United States, which is not on
// the map at all — an off-map seated court (§180) hosting the largest Jewish
// community there has ever been. So the dispersion gained a second kind of
// seat: `tag` instead of `prov`, stored on the host tag the way a province
// community rides its cell, served to the host's own nation panel where §180
// already keeps an off-map power's envoys. Same asks, same standing, same
// hostage arithmetic — the reprisal simply lands on the ledger (standing,
// host regard) instead of a province, there being no province to trouble.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const { communityOf, tagCommunityOf, openAt } = await import(R + '/js/data/diaspora.js');

const NATION_PANEL = readFileSync(R + '/js/ui/nation_panel.js', 'utf8');
const UI = readFileSync(R + '/js/ui/ui.js', 'utf8');
const WIKI = readFileSync(R + '/js/ui/wiki.js', 'utf8');

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
function boot(bookmarkId, playerTag, { seed = 13 } = {}) {
  const era = ERAS.find((e) => e.bookmark.id === bookmarkId);
  const bm = era.bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, bm);
  const geom = foldGeom(RAW, provinceMap);
  const tag = playerTag || bm.playableTags[0].tag;
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
console.log('== the two Atlantic seats, and their windows ==');
{
  const lon = communityOf('Londinium');
  ok(!!lon && lon.size === 3 && lon.from === 1656 && lon.until === null,
    'London: size 3, from the Resettlement of 1656, still there');
  ok(!openAt(lon, -167) && !openAt(lon, 66) && !openAt(lon, 614) && openAt(lon, 1948),
    'and its window touches no chapter but 1948 — the medieval community\'s 1290 end falls between bookmarks');
  const usa = tagCommunityOf('USA');
  ok(!!usa && usa.tag === 'USA' && !usa.prov && usa.size === 5 && usa.from === 1880 && usa.until === null,
    'America: a court seat, no cell, size 5 — the one peer Alexandria ever gets');
  ok(usa.dev === 40 && usa.start === 60,
    'with a stand-in development of 40 for the silver formula, opening at 60 standing');
  ok(!openAt(usa, 614) && openAt(usa, 1948), 'open in 1948 and in no ancient chapter');
  ok(communityOf('USA') === null, 'a tag seat never answers a province lookup');
}

console.log('== the court seat serves the panel ==');
{
  const { game, ctx, actions } = boot('1948ce', 'ISR', { seed: 11 });
  run(ctx, 0.12);
  const usa = actions.getTagCommunity('USA');
  ok(!!usa && usa.name === 'The Jews of America' && usa.provId === 0 && usa.prov === null,
    'America answers the nation panel: no province, provId 0');
  ok(usa.hostName === 'The United States' && usa.atWar === false,
    'hosted by The United States, which is not at war with Israel');
  ok(Array.isArray(usa.asks) && usa.asks.length === 4, 'four asks, like any community');
  const silver = usa.asks.find((a) => a.id === 'silver');
  ok(silver.gain.treasury === 80, 'silver is the stand-in dev × size (0.4 × 40 × 5 = 80 talents)');
  const word = usa.asks.find((a) => a.id === 'intercession');
  ok(word.gain.opinion === 30, 'and a word with their patrons is worth 30 regard with Washington');

  // The Machal pin — the deliberate inverse of §194's day-one gate: America
  // opens at 60, past the volunteer bar, because the flyers and gunners of
  // 1948 really did come off these docks while the embargo stood. London, at
  // 45 under Bevin's government, does not.
  game.tags.ISR.points.infl = 200;
  const men = usa.asks.find((a) => a.id === 'volunteers');
  ok(men.gain.manpower === 2100, 'the volunteers of a size-5 community are 2,100 men');
  const lonC = actions.getCommunity(ctx.provId('Londinium'));
  ok(!!lonC && lonC.name === 'The Jews of London' && lonC.host === 'UK',
    'London is an ordinary §172 cell community under Britain');
  ok(!lonC.asks.find((a) => a.id === 'volunteers').can,
    'and will not send men on day one — 45 standing under the volunteer bar');

  const before = game.tags.ISR.manpower;
  const r = actions.askTagCommunity('USA', 'volunteers');
  ok(r.ok && game.tags.ISR.manpower - before >= 2000, 'Machal arrives: the ask pays the men');
  const again = actions.getTagCommunity('USA').asks.find((a) => a.id === 'volunteers');
  ok(!again.can, 'and cannot be repeated: standing spent (' + r.standing + ') and the clock running');

  // The court-hosted reprisal lands on the ledger, not on a map cell.
  const st = game.tags.USA.dia;
  st.standing = 95;
  const opBefore = (game.tags.USA.opinion && game.tags.USA.opinion.ISR) || 0;
  const realChance = ctx.rng.chance;
  ctx.rng.chance = () => true; // force the letter to be read
  const caught = actions.askTagCommunity('USA', 'letters');
  ctx.rng.chance = realChance;
  ok(caught.ok && caught.caught, 'a read letter is a reprisal');
  const opAfter = (game.tags.USA.opinion && game.tags.USA.opinion.ISR) || 0;
  ok(opAfter < opBefore, 'Washington\'s regard falls (' + opBefore + ' → ' + opAfter + ')');
  ok(!game.provinces.some((p) => p && (p.modifiers || []).some((m) => m && m.id === 'dia_reprisal')),
    'and no province anywhere carries the reprisal — there is no cell to trouble');

  // The ledger's "who will answer us" knows the court seat.
  const rep = actions.getDiaspora();
  const row = (rep || []).find((x) => x.host === 'USA');
  ok(!!row && row.provId === 0 && row.prov === 'The United States',
    'the diaspora report carries America with provId 0, addressed by its host');
}

console.log('== only a Jewish crown, only while the host is seated ==');
{
  const { actions } = boot('1948ce', 'EGY', { seed: 7 });
  ok(actions.getTagCommunity('USA') === null, 'Egypt has no dispersion to write to');
  const r = actions.askTagCommunity('USA', 'letters');
  ok(!r.ok, 'and its letters are refused at the door');
}

console.log('== the panel carries the section ==');
{
  // Browser suites cost minutes; the wiring is pinned at the source the way
  // smoke109 pins the province panel's copy.
  ok(/The Dispersion<\/div>/.test(NATION_PANEL), 'the nation panel builds a Dispersion section');
  ok(/data-np-dia=/.test(NATION_PANEL) && /askTagCommunity\(viewTag/.test(NATION_PANEL),
    'court-seat asks are buttons wired to askTagCommunity');
  ok(/data-np-diaprov=/.test(NATION_PANEL) && /onProvinceClick\(npDiaProv/.test(NATION_PANEL),
    'province-seated communities are jump rows wired to onProvinceClick');
  ok(/onProvinceClick\(id\)\s*\{\s*setSelectedProv\(id/.test(UI),
    'and ui.js routes the jump through the same selection a map click makes');
  ok(/under ' \+ tagName\(d\.tag\)/.test(WIKI),
    'the Compendium addresses a court seat by its host, not by a missing cell');
}

// ---------------------------------------------------------------------------
if (failures) { console.error('\n' + failures + ' FAILURES'); process.exit(1); }
console.log('\nALL PASS');
