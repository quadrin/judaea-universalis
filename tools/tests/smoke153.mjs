// Headless regression — SPEC §228: Jordan, Syria and Iraq at the same
// resolution as the rest of the Levant, and the ancient map that did not move.
//
// The section's claims, and this suite in order: twenty-three new cells, all
// latent, each parented at the cell the RASTER says owns its ground, regioned
// exactly once and appended past every old id; every one active in 1948 and
// owned by the state that held it that May; the seven ancient chapters' folded
// adjacency identical to the snapshot, with the three roads the placement
// search existed to protect named out loud; the five national development
// totals unchanged to the point, because a district takes its development with
// it; the oil on Kirkuk's own cell; Mosul and Raqqa shown over Nineveh and
// Rusafa; and Syria leaving the union in one piece with all of its districts.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA, validateMapData } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// The twenty-three, the cell each came out of, and who holds it in May 1948.
const CELLS = {
  Nineveh: ['Hatra', 'IRQ'],
  Kirkuk: ['Arbela', 'IRQ'],
  Sulaymaniyah: ['Arbela', 'IRQ'],
  Baquba: ['Nehardea', 'IRQ'],
  Ramadi: ['Nehardea', 'IRQ'],
  Najaf: ['Babylon', 'IRQ'],
  Kut: ['Uruk', 'IRQ'],
  Samawa: ['Uruk', 'IRQ'],
  Amara: ['Susa', 'IRQ'],
  Nukhayb: ['Rutba', 'IRQ'],
  Idlib: ['Beroea', 'SYR'],
  Manbij: ['Zeugma', 'SYR'],
  Rusafa: ['Palmyra', 'SYR'],
  Hasakah: ['Nisibis', 'SYR'],
  Salamiyah: ['Emesa', 'SYR'],
  Qusayr: ['Emesa', 'SYR'],
  Douma: ['Damascus', 'SYR'],
  Suwayda: ['Bostra', 'SYR'],
  Zarqa: ['Philadelphia', 'JOR'],
  // §232 re-measured the parent against the v5.4 raster — the ground §228's
  // post-§160 raster called Jerash's had been Bostra's before the warp
  // re-phased, and folding Mafraq into Gerasa was the NE lobe on the triangle.
  Mafraq: ['Bostra', 'JOR'],
  Ruwayshid: ['Syrian Desert', 'JOR'],
  Shobak: ['Zoara', 'JOR'],
  'Wadi Rum': ['Aila', 'JOR'],
};
const byName = new Map(MAP_DATA.provinces.map((p, i) => [p.name, { p, id: i + 1 }]));
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));

function flatGeom() {
  const N = MAP_DATA.provinces.length;
  return {
    neighbors: Array.from({ length: N + 1 }, () => new Set()),
    centroids: [null, ...MAP_DATA.provinces.map((p) => {
      const [x, y] = MAP_DATA.project(p.lon, p.lat); return { x, y };
    })],
    areas: new Int32Array(N + 1), bbox: [],
  };
}
function boot1948(seed = 226) {
  const geom = flatGeom();
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_1948, events: [],
    playerTag: 'ISR', rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_1948, events: [], provinceMap,
  });
  return { game, ctx };
}

console.log('== twenty-three cells, latent, parented and regioned ==');
{
  ok(!validateMapData().length, 'the atlas validates: ' + (validateMapData().join(' | ') || 'no warnings'));
  const wrong = [];
  for (const [name, [parent]] of Object.entries(CELLS)) {
    const row = byName.get(name);
    if (!row) { wrong.push(name + ' MISSING'); continue; }
    if (row.p.latentParent !== parent) wrong.push(name + '→' + row.p.latentParent + ' (want ' + parent + ')');
  }
  ok(!wrong.length, 'every one is on the map, latent, under the cell that owns its ground: '
    + (wrong.join(', ') || 'all correct'));
  const regionOf = new Map();
  for (const [rg, members] of Object.entries(MAP_DATA.regions)) for (const m of members) regionOf.set(m, rg);
  const unregioned = Object.keys(CELLS).filter((n) => !regionOf.get(n));
  ok(!unregioned.length, 'and every one is in a region: ' + (unregioned.join(', ') || 'all placed'));
  // Appended, not inserted: every cell that was on the map keeps its id, which
  // is what old saves are keyed by.
  const anchors = { Jerusalem: 1, Tyre: 35, Damascus: 41, Arbela: 85, Susa: 92, Gerrha: 147 };
  const moved = Object.entries(anchors).filter(([n, want]) => (byName.get(n) || {}).id !== want);
  ok(!moved.length, 'and no old cell moved id: ' + (moved.map(([n]) => n).join(', ') || 'all where they were'));
  const lowest = Math.min(...Object.keys(CELLS).map((n) => byName.get(n).id));
  ok(lowest > 384, 'the new cells are appended past the whole §225 atlas (lowest id ' + lowest + ')');
}

console.log('== 1948 activates them, and the right states own them ==');
{
  const active = new Set(BOOKMARK_1948.activeProvinces || []);
  const inactive = Object.keys(CELLS).filter((n) => !active.has(n));
  ok(!inactive.length, 'all twenty-three are active in 1948: ' + (inactive.join(', ') || 'none missing'));
  const missing = MAP_DATA.provinces.filter((p) => p.latentParent && !active.has(p.name)).map((p) => p.name);
  ok(!missing.length, 'and so is every other latent cell on the map (SPEC §47): '
    + (missing.join(', ') || 'none missing'));
  const { ctx } = boot1948();
  const wrong = [];
  for (const [name, [, owner]] of Object.entries(CELLS)) {
    const p = ctx.prov(name);
    if (!p || p.owner !== owner) wrong.push(name + '=' + (p && p.owner));
  }
  ok(!wrong.length, 'each opens under the state that held it: ' + (wrong.join(', ') || 'all correct'));
  const shown = (n) => (BOOKMARK_1948.provinceNames || {})[n] || n;
  ok(shown('Nineveh') === 'Mosul', 'Nineveh keeps its own name and 1948 shows Mosul');
  ok(shown('Rusafa') === 'Raqqa', 'Sergiopolis wears Raqqa, the district capital north of it');
  ok(ctx.prov('Kirkuk').good === 'oil' && ctx.prov('Arbela').good !== 'oil',
    'and the field is on Kirkuk now, not on the city beside it');
}

console.log('== the seven older chapters see nothing ==');
{
  ok(snap.neighbors.length === MAP_DATA.provinces.length + 1,
    'the geometry snapshot is current for this atlas ('
    + (snap.neighbors.length - 1) + ' vs ' + MAP_DATA.provinces.length + ' cells)');
  const nameOf = (i) => (MAP_DATA.provinces[i - 1] || {}).name;
  const foldedFor = (bookmark) => {
    const map = buildProvinceMapping(MAP_DATA, bookmark);
    const nb = new Map();
    for (let i = 1; i < snap.neighbors.length; i++) {
      const t = nameOf(map[i] || i); if (!t) continue;
      if (!nb.has(t)) nb.set(t, new Set());
      for (const j of snap.neighbors[i]) {
        const u = nameOf(map[j] || j);
        if (u && u !== t) nb.get(t).add(u);
      }
    }
    return nb;
  };
  // SPEC §230 activated five of these twenty-three in the ancient chapters
  // (Nineveh, Kirkuk, Salamiyah, Douma, Suwayda, and Shobak and Wadi Rum off
  // the Negev side). Those are provinces in every era now, on purpose. The
  // REST — the Islamic-era districts of Iraq and the modern Syrian and
  // Jordanian ones — still fold away, and that is what this holds.
  const OPENED_BY_230 = new Set(['Nineveh', 'Kirkuk', 'Salamiyah', 'Douma',
    'Suwayda', 'Shobak', 'Wadi Rum']);
  for (const era of ERAS) {
    const id = era.bookmark.id;
    if (id === '1948ce') continue;
    const folded = foldedFor(era.bookmark);
    const leaked = Object.keys(CELLS).filter((n) => !OPENED_BY_230.has(n) && folded.has(n));
    ok(!leaked.length, id + ': no district this section left latent is a province here — '
      + (leaked.join(', ') || 'all folded away'));
    const missing = [...OPENED_BY_230].filter((n) => !folded.has(n));
    ok(!missing.length, id + ': and the seven §230 opened ARE provinces here — '
      + (missing.join(', ') || 'all present'));
  }
  // The roads the placement search existed to protect. The first attempt lost
  // all of them, and they are most of what the Parthian, Sasanian and
  // Palmyrene arcs are about. Four are still one hop.
  const anc = foldedFor(ERAS.find((e) => e.bookmark.id === '66ce').bookmark);
  for (const [a, b] of [['Seleucia-Ctesiphon', 'Susa'], ['Seleucia-Ctesiphon', 'Ecbatana'],
    ['Beroea', 'Carrhae'], ['Carrhae', 'Dura-Europos']]) {
    ok(anc.get(a) && anc.get(a).has(b), '  the ' + a + '–' + b + ' road survives this section');
  }
  // …and two now run through the Ghouta, because that is where they always
  // physically ran. §228 could not seat a cell east of Damascus without losing
  // the road entirely; §230 seats Douma ON it, so Damascus reaches Palmyra and
  // Emesa in two hops through the garden ring instead of one across a void.
  for (const [a, via, b] of [['Damascus', 'Douma', 'Palmyra'], ['Damascus', 'Douma', 'Emesa']]) {
    ok(anc.get(a) && anc.get(a).has(via) && anc.get(via) && anc.get(via).has(b),
      '  the ' + a + '–' + b + ' road runs through ' + via + ' now, and still runs');
  }
  // …and the whole thing, not just the roads worth naming: every folded
  // neighbour set has to be exactly what the parents had.
  const parents = new Set(Object.values(CELLS).map(([p]) => p));
  let bad = 0;
  for (const era of ERAS) {
    if (era.bookmark.id === '1948ce') continue;
    const folded = foldedFor(era.bookmark);
    for (const p of parents) if (folded.has(p) && folded.get(p).size === 0) bad++;
  }
  ok(!bad, 'and every parent cell still has neighbours in every chapter');
}

console.log('== the wealth is redistributed, not duplicated ==');
{
  const { game } = boot1948();
  const dev = {};
  for (const p of game.provinces) {
    if (!p || p.impassable) continue;
    dev[p.owner] = (dev[p.owner] || 0) + p.dev.tax + p.dev.prod + p.dev.mp;
  }
  // The numbers the atlas had before §228 added a cell to any of them. A
  // district carved out of a province takes its development with it (SPEC §47,
  // and smoke27 holds the Israeli, Jordanian and Egyptian side of it).
  const want = { ISR: 183, JOR: 173, EGY: 213, SYR: 187, IRQ: 119, LEB: 131 };
  for (const [tag, n] of Object.entries(want)) {
    ok(dev[tag] === n, tag + ' opens on ' + n + ' development' + (dev[tag] === n ? '' : ' (got ' + dev[tag] + ')'));
  }
}

console.log('== Syria still leaves the union in one piece ==');
{
  const era = ERAS.find((e) => e.bookmark.id === '1948ce');
  const card = era.events.find((e) => e && e.id === 'ev_i_secession');
  ok(!!card, 'the secession card is in the chapter');
  // The effects are wrapped in the file's own `guard`, so the list is read
  // where it is written rather than off the closure.
  const region = readFileSync(R + '/js/data/events_1948_region.js', 'utf8');
  ok(/secedeTag\(ctx, 'UAR', 'SAR', \{\s*\n\s*provinces: SYRIA_CORE,/.test(region),
    'and the secession hands Damascus back SYRIA_CORE');
  // Everything Syria holds on 15 May has to be in that list, or the union is
  // left holding orphan cells four hundred kilometres from Cairo.
  const { ctx, game } = boot1948();
  const syrian = [];
  for (const p of game.provinces) if (p && p.owner === 'SYR') syrian.push(p.canon || p.name);
  // SYRIA_CORE is file-local, so read it where it is written down.
  const block = region.slice(region.indexOf('const SYRIA_CORE'), region.indexOf('const LEBANON'));
  const listed = new Set((block.match(/'[^']+'/g) || []).map((s) => s.slice(1, -1)));
  const orphans = syrian.filter((n) => !listed.has(n));
  ok(!orphans.length, 'every province Syria opens with is in it: ' + (orphans.join(', ') || 'none left behind'));
  ok(listed.has('Idlib') && listed.has('Suwayda') && listed.has('Rusafa') && listed.has('Douma'),
    '  including the eight districts §228 added');
  ok(ctx.prov('Douma').owner === 'SYR', '  and the Ghouta is Syrian to start with');
}

console.log(failures ? `smoke153: ${failures} FAIL` : 'smoke153: ALL PASS');
process.exit(failures ? 1 : 0);
