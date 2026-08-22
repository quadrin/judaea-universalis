// Headless regression — SPEC §257: no circles in 1948, and the armistice line
// is the line.
//
// Two reports, one file, because they are the same complaint about the same
// chapter: the map looked wrong and the peace gave the wrong map.
//
// 1. THE CIRCLES. §234 established that a cell carved INSIDE another cell's
//    ground can only come out a circle — the weighted-Voronoi bisector between
//    an interior seed and the seed that surrounds it is an arc — and gave the
//    ancient chapters their districts back for it. 1948 kept every district,
//    and five of them were exactly that case. They fold here now, through
//    `mergeProvinces` and not by touching js/data/map_data.js, which is what
//    makes the other eight chapters byte-identical rather than merely close:
//    each of the five folds into its OWN latent parent, so every pixel it
//    holds was already resolving to that province in every ancient chapter.
//
// 2. THE LINE. `ev_i_armistice` promised the classical 1949 lines and applied
//    uti possidetis, which is not the same thing: a state that had not yet
//    marched into the Negev signed the armistice and did not get the Negev,
//    or Eilat. Rhodes hands over what is inside the line.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { EVENTS_1948 } = await import(R + '/js/data/events_1948.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, reconcileGameProvinces } = await import(R + '/js/sim/init.js');
const { buildFrame, rasterise, chapter, enclosed, CHRONIC, THEATRE } = await import(R + '/tools/provshape.mjs');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
const idOf = (name) => MAP_DATA.provinces.findIndex((p) => p.name === name) + 1;
const cellOf = (name) => MAP_DATA.provinces[idOf(name) - 1];
function boot(seed = 257) {
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_1948, events: EVENTS_1948,
    playerTag: 'ISR', rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_1948,
    events: EVENTS_1948, provinceMap,
  });
  return { game, ctx, provinceMap };
}

// The five, and the province each folds into.
const FOLDED = {
  Salamiyah: 'Emesa', Qusayr: 'Emesa',
  Suwayda: 'Bostra', Mafraq: 'Bostra',
  Rusafa: 'Palmyra',
};

console.log('== the five fold, and they fold into their own parents ==');
{
  const merges = BOOKMARK_1948.mergeProvinces || {};
  const active = new Set(BOOKMARK_1948.activeProvinces || []);
  const map = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);
  const wrong = [];
  for (const [name, into] of Object.entries(FOLDED)) {
    if (merges[name] !== into) wrong.push(name + '→' + merges[name]);
    else if (map[idOf(name)] !== idOf(into)) wrong.push(name + ' unmapped');
    else if (!active.has(name)) wrong.push(name + ' not active');
  }
  ok(!wrong.length, '1948 folds all five into the cell that holds their ground: '
    + (wrong.join(', ') || 'all folded, all still active'));
  // This is the whole reason no other chapter moves. A merge target that is
  // NOT the cell's latent parent would hand pixels across a border that eight
  // other chapters draw somewhere else.
  const strays = Object.entries(FOLDED).filter(([name, into]) => cellOf(name).latentParent !== into);
  ok(!strays.length, 'and every fold target is the cell\'s own latentParent, so no ancient border moves: '
    + (strays.map(([n]) => n).join(', ') || 'all match'));
  // smoke27's rule stands: 1948 is still the chapter that switches every
  // latent cell on. The five consolidate afterwards, exactly like Britain's
  // city cells (SPEC §232).
  const missing = MAP_DATA.provinces.filter((p) => p.latentParent && !active.has(p.name));
  ok(!missing.length, 'and 1948 still activates every latent cell first: '
    + (missing.map((p) => p.name).join(', ') || 'all active'));
}

console.log('== and no chapter has a province enclosed by one neighbour ==');
{
  // One pass per frame, folded nine ways: the diagram does not depend on the
  // chapter, only the fold does. The theatre at full resolution catches the
  // districts; the whole frame at a quarter of it catches everything else the
  // atlas has (Córdoba, London, the Soviet interior) at a tenth the cost.
  const frames = [
    { label: 'the theatre', frame: buildFrame(THEATRE, 1) },
    { label: 'the frame', frame: buildFrame([MAP_DATA.LON0, MAP_DATA.LAT0, MAP_DATA.LON1, MAP_DATA.LAT1], 4) },
  ];
  for (const f of frames) f.base = rasterise(f.frame);
  for (const era of ERAS) {
    const id = era.bookmark.id;
    const found = [];
    for (const f of frames) {
      const { mapping, report } = await chapter(id, { frame: f.frame, base: f.base });
      for (const r of enclosed(report, mapping)) {
        // Oxyrhynchus has been a circle since the base atlas was drawn and is
        // the same circle in every chapter — not a carving to give back, and
        // moving it would move the eight boards §257 promised not to touch.
        if (!CHRONIC.has(r.name)) found.push(`${r.name} (${(100 * r.dominant).toFixed(0)}% ${r.dominantName})`);
      }
    }
    ok(!found.length, id + ': no cell is a ring around another, anywhere on the frame — '
      + (found.join(', ') || 'none enclosed'));
  }
}

console.log('== the development came home, so nobody\'s economy moved ==');
{
  const { game } = boot();
  const dev = {};
  for (const p of game.provinces) {
    if (!p || p.impassable) continue;
    dev[p.owner] = (dev[p.owner] || 0) + p.dev.tax + p.dev.prod + p.dev.mp;
  }
  // The same six totals smoke27 and smoke153 hold: a district that folds gives
  // its development back to the province it was carved out of, and Mafraq's
  // goes to Jerash rather than to Syrian Daraa, because the ground is Syria's
  // and the men were Jordan's.
  const want = { ISR: 183, JOR: 173, EGY: 213, SYR: 187, IRQ: 119, LEB: 131 };
  for (const [tag, n] of Object.entries(want)) {
    ok(dev[tag] === n, tag + ' still opens on ' + n + ' development'
      + (dev[tag] === n ? '' : ' (got ' + dev[tag] + ')'));
  }
}

console.log('== a second migration does not pay the first one twice ==');
{
  const { game, provinceMap } = boot();
  const save = JSON.parse(JSON.stringify(game));
  save.mapProfileVersion = 2;                       // a save made under §232
  const franceBefore = { ...save.provinces[idOf('Lutetia')].dev };
  save.provinces[idOf('Emesa')].dev = { tax: 3, prod: 3, mp: 2 };  // the pre-§257 baseline
  reconcileGameProvinces({
    game: save, DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_1948, provinceMap,
  });
  const france = save.provinces[idOf('Lutetia')].dev;
  ok(france.tax === franceBefore.tax && france.prod === franceBefore.prod && france.mp === franceBefore.mp,
    'a v2 save is not handed France\'s consolidation difference a second time');
  const homs = save.provinces[idOf('Emesa')].dev;
  ok(homs.tax === 4 && homs.prod === 5 && homs.mp === 3,
    'and Homs does pick up the district it just absorbed');
  ok(save.mapProfileVersion === 3, 'the save is stamped at the current profile version');
}

console.log('== Rhodes hands over what is inside the line ==');
{
  const { game, ctx } = boot();
  const NEGEV = ['Beersheba', 'Arad', 'Oboda', 'Elusa', 'Dimona', 'Mitzpe Ramon', 'Paran', 'Eilat'];
  // Every one of them opens in Egyptian or Jordanian hands, which is the whole
  // point: uti possidetis alone gave the state none of them.
  ok(NEGEV.every((n) => ctx.prov(n).owner === 'EGY' || ctx.prov(n).owner === 'JOR'),
    'the Negev and the Arabah open in the coalition\'s hands');
  EVENTS_1948.find((e) => e.id === 'ev_i_armistice').options[0].effects(ctx);
  const held = NEGEV.filter((n) => ctx.prov(n).owner !== 'ISR');
  ok(!held.length, 'the classical lines hand Israel the whole Negev to Umm Rashrash: '
    + (held.join(', ') || 'every cell inside the line'));
  ok(ctx.prov('Gaza').owner === 'EGY' && ctx.prov('Sinai Interior').owner === 'EGY'
      && ctx.prov('Hebron').owner === 'JOR' && ctx.prov('Gamala').owner === 'SYR',
  'and nothing outside the line comes with it');
  ok(!game.wars.length, 'the coalition war ends at the table');
}

console.log('== a state that has lost Tel Aviv is handed no desert ==');
{
  const { ctx } = boot();
  const joppa = ctx.prov('Joppa');
  joppa.owner = 'EGY';
  joppa.controller = 'EGY';
  EVENTS_1948.find((e) => e.id === 'ev_i_armistice').options[0].effects(ctx);
  ok(ctx.prov('Beersheba').owner === 'EGY' && ctx.prov('Eilat').owner === 'JOR',
    'the line is only what is held when the state itself is not');
}

console.log('== the line is written down the same way in both places ==');
{
  const events = readFileSync(R + '/js/data/events_1948.js', 'utf8');
  const question = readFileSync(R + '/js/data/events_1948_question.js', 'utf8');
  // Read each list where it is written, so the two files cannot drift apart
  // behind a test that imports one of them. The block ends at the first `]`
  // that starts a line.
  const setOf = (src, marker) => {
    const at = src.indexOf(marker);
    const end = src.indexOf('\n]', at);
    const block = src.slice(at, end).replace(/\/\/[^\n]*/g, '');
    return new Set((block.match(/'(?:[^'\\]|\\.)*'|"[^"]*"/g) || [])
      .map((s) => s.slice(1, -1).replace(/\\'/g, "'")));
  };
  const gains = setOf(events, 'const ARMISTICE_1949_ISR_GAINS');
  const inside = setOf(question, 'const INSIDE_THE_LINE');
  for (const n of ['Elusa', 'Beersheba', 'Oboda', 'Eilat', 'Paran', "Ma'alot"]) {
    ok(gains.has(n) && inside.has(n), `  ${n} is inside the line in both files`);
  }
  // The corridor is the one place the two lists differ on purpose: §131 keeps
  // Latrun and the Modi'in hills with the corridor they command, and the
  // gains list is the territory Rhodes CONFIRMS rather than the territory the
  // §131 withdrawal keeps.
  const diff = [...gains].filter((n) => !inside.has(n)).concat([...inside].filter((n) => !gains.has(n)));
  ok(diff.every((n) => n === 'Emmaus' || n === "Modi'in Hills"),
    '  and they differ only over the corridor: ' + (diff.join(', ') || 'not at all'));
}

console.log(failures ? `smoke175: ${failures} FAIL` : 'smoke175: ALL PASS');
process.exit(failures ? 1 : 0);
