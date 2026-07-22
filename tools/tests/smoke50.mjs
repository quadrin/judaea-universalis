// Headless regression — standing rivalries (SPEC §73): the AIs go to war
// with one another.
//  1. Rivalry pairs the bookmark's setup left un-authored are seeded at the
//     cold baseline; authored opinions always win.
//  2. Opinion drift pulls rivals toward the baseline (from both sides), and
//     non-rivals toward neutral, exactly as before.
//  3. The opportunistic-war machinery actually fires between rivals — and a
//     non-rival court below stability 1 still stays home.
//  4. The awakened-era rivalries (614) seed against the dormant Caliphate
//     without waking it.
import { readFileSync } from 'node:fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { EVENTS_167 } = await import(R + '/js/data/events_167bce.js');
const { BOOKMARK_614 } = await import(R + '/js/data/bookmark_614ce.js');
const { EVENTS_614 } = await import(R + '/js/data/events_614ce.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { areRivals } = await import(R + '/js/sim/military.js');
const { monthlyOpinionDrift } = await import(R + '/js/sim/unrest.js');
const { runMonthlyAI } = await import(R + '/js/sim/ai.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const N = MAP_DATA.provinces.length;
function foldGeom(mapping) {
  const to = (id) => (mapping && mapping[id]) || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  for (let id = 1; id <= N; id++) {
    for (const nb of snap.neighbors[id] || []) {
      const t = to(id), tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  return {
    neighbors,
    centroids: [null, ...MAP_DATA.provinces.map((p) => {
      const [x, y] = MAP_DATA.project(p.lon, p.lat);
      return { x, y };
    })],
    areas: new Int32Array(N + 1), bbox: [], coastal: snap.coastal || [], offshore: [],
  };
}
const bus = { emit() {}, on() { return () => {}; } };

function boot(bookmark, events, playerTag, seed) {
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const geom = foldGeom(provinceMap);
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events, provinceMap });
  return { game, ctx };
}

function warBetween(game, a, b) {
  return (game.wars || []).some((w) => {
    const all = (w.attackers || []).concat(w.defenders || []);
    return all.includes(a) && all.includes(b);
  });
}

console.log('== rivalry seeding: un-authored pairs go cold, authored values stand ==');
{
  const { game, ctx } = boot(BOOKMARK_167, EVENTS_167, 'HAS', 5050);
  ok(areRivals(ctx, 'ROM', 'SEL') && areRivals(ctx, 'SEL', 'ROM'),
    'the era names Rome and the Seleucids as standing rivals, both ways round');
  ok(!areRivals(ctx, 'HAS', 'NAB'), 'friendly neighbors are not rivals');
  ok(game.tags.ROM.opinion.SEL === -60 && game.tags.SEL.opinion.ROM === -60,
    'the un-authored Rome–Seleucid pair is seeded at the cold baseline');
  ok(game.tags.SEL.opinion.PTO === -80,
    'the bookmark\'s authored Syrian-Wars opinion is untouched by the seed');
}

console.log('== drift: rivals cool to the old climate, everyone else to neutral ==');
{
  const { game, ctx } = boot(BOOKMARK_167, EVENTS_167, 'HAS', 5051);
  game.tags.SEL.opinion.PTO = -40; // warmer than the climate allows
  game.tags.SEL.opinion.ROM = -80; // colder than the climate holds
  const nabOfSel = game.tags.NAB.opinion.SEL; // -20, non-rival
  monthlyOpinionDrift(ctx);
  ok(game.tags.SEL.opinion.PTO === -41,
    'a rival pair above the baseline cools toward it (−40 → −41)');
  ok(game.tags.SEL.opinion.ROM === -79,
    'a rival pair below the baseline warms back up to it (−80 → −79)');
  ok(game.tags.NAB.opinion.SEL === nabOfSel + 1,
    'a non-rival pair still mellows toward neutral');
}

console.log('== the Syrian Wars resume: rivals actually declare ==');
{
  const { game, ctx } = boot(BOOKMARK_167, EVENTS_167, 'HAS', 5052);
  // Egypt smells weakness: strip the Seleucid field armies and reserves so
  // the strength gate is wide open, and give Alexandria a settled court.
  for (const id of Object.keys(game.armies)) {
    if (game.armies[id] && game.armies[id].tag === 'SEL') delete game.armies[id];
  }
  game.tags.SEL.manpower = 0;
  game.tags.PTO.stability = 1;
  game.tags.PTO.manpower = 30000;
  // Rivalry is the *only* hostility on the books between them beyond the
  // authored -80 — no war exists yet.
  ok(!warBetween(game, 'PTO', 'SEL'), 'Egypt and the Seleucids start at peace');
  let months = 0;
  while (months++ < 120 && !warBetween(game, 'PTO', 'SEL')) runMonthlyAI(ctx);
  ok(warBetween(game, 'PTO', 'SEL'),
    'within a decade the Ptolemies strike their weakened rival (month ' + months + ')');
}

console.log('== an unsettled court stays home unless the enemy is the old one ==');
{
  const { game, ctx } = boot(BOOKMARK_167, EVENTS_167, 'HAS', 5053);
  // Same weakness, but Alexandria at stability 0: a rival war is still on
  // the table (the one adventure), so it may fire — prove the CONVERSE on a
  // non-rival: Nabataea at stability 0 despises weakened Armenia, and must
  // still stay home.
  for (const id of Object.keys(game.armies)) {
    if (game.armies[id] && game.armies[id].tag === 'ARM') delete game.armies[id];
  }
  game.tags.ARM.manpower = 0;
  game.tags.NAB.stability = 0;
  game.tags.NAB.manpower = 30000;
  game.tags.NAB.opinion.ARM = -100;
  let months = 0;
  while (months++ < 60) runMonthlyAI(ctx);
  ok(!warBetween(game, 'NAB', 'ARM'),
    'a non-rival court below stability 1 never rides out, however tempting the prize');
}

console.log('== 614: the jihad state\'s rivalries seed without waking it ==');
{
  const { game, ctx } = boot(BOOKMARK_614, EVENTS_614, 'JUD', 5054);
  ok(areRivals(ctx, 'RSH', 'BYZ') && areRivals(ctx, 'RSH', 'SAS'),
    'the Caliphate is the standing enemy of both empires');
  ok(!areRivals(ctx, 'BYZ', 'SAS'),
    'Byzantium and Persia are NOT standing rivals — their great war is evented, and its exhausted peace holds');
  ok(game.tags.RSH.opinion.BYZ === -60 && game.tags.BYZ.opinion.RSH === -60,
    'the enmity is seeded on both thrones');
  ok(game.tags.RSH.alive === false, 'the dormant tag stays dormant');
}

console.log(failures ? 'FAILURES: ' + failures : 'ALL PASS');
process.exit(failures ? 1 : 0);
