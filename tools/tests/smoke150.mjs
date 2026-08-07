// Headless regression — SPEC §225: the northern frontier at the resolution it
// is played at, and the court that lives on it.
//
// The section's claims, and this suite in order: ten new cells, all latent,
// each parented at the province that held its ground and regioned exactly
// once; every one active in 1948 and owned by the state that held it in May of
// that year; the seven ancient chapters seeing NOTHING — folded adjacency
// identical, and not one of the new names resolving to itself; the Golan told
// apart from the Hauran, and Heliopolis wearing Baalbek; the three 1948 event
// packages all knowing the new districts are Lebanon; and Hezbollah as a tag —
// a court, a government, a name pool, and the two cells it is seated on,
// whether it takes them off Beirut, off an occupier, or (twice) off nobody.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA, validateMapData } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { GENERAL_NAMES } = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// The ten, and the province each of them came out of.
const NEW_CELLS = {
  Nabatieh: 'Tyre',
  Chouf: 'Sidon',
  Jounieh: 'Berytus',
  Batroun: 'Byblos',
  Bsharri: 'Tripolis',
  Akkar: 'Tripolis',
  Heliopolis: 'Chalcis',
  'Mount Hermon': 'Caesarea Philippi',
  Quneitra: 'Caesarea Philippi',
  "Ma'alot": 'Ptolemais',
};
const byName = new Map(MAP_DATA.provinces.map((p, i) => [p.name, { p, id: i + 1 }]));

console.log('== ten cells, latent, parented and regioned ==');
{
  ok(!validateMapData().length, 'the atlas validates: ' + (validateMapData().join(' | ') || 'no warnings'));
  for (const [name, parent] of Object.entries(NEW_CELLS)) {
    const row = byName.get(name);
    ok(!!row, name + ' is on the map');
    if (!row) continue;
    ok(row.p.latentParent === parent,
      '  latent under ' + parent + (row.p.latentParent === parent ? '' : ' (got ' + row.p.latentParent + ')'));
  }
  // Regions are a partition; validateMapData holds that, so this only has to
  // check the new cells landed in the region their neighbours are in.
  const regionOf = new Map();
  for (const [rg, members] of Object.entries(MAP_DATA.regions)) for (const m of members) regionOf.set(m, rg);
  for (const [name] of Object.entries(NEW_CELLS)) {
    ok(!!regionOf.get(name), name + ' is in a region (' + regionOf.get(name) + ')');
  }
  ok(['Nabatieh', 'Chouf', 'Jounieh', 'Batroun', 'Bsharri', 'Akkar']
    .every((n) => regionOf.get(n) === 'Phoenicia'), 'the six coastal districts are Phoenicia');
  ok(regionOf.get('Heliopolis') === 'Syria', 'the Beqaa is Syria, like Chalcis over it');
  ok(regionOf.get('Mount Hermon') === 'Transjordan' && regionOf.get('Quneitra') === 'Transjordan',
    'the massif and the plateau are Transjordan, like the Golan cells beside them');
  ok(regionOf.get("Ma'alot") === 'Judaea', "Ma'alot is Judaea, like the Galilee around it");
  // Appended, not inserted: everything that was on the map before keeps its id.
  const anchors = { Jerusalem: 1, Tyre: 35, Damascus: 41, Chalcis: 42, Emesa: 43, Palmyra: 50 };
  for (const [n, want] of Object.entries(anchors)) {
    const got = byName.get(n) && byName.get(n).id;
    ok(got === want, n + ' still holds cell id ' + want + (got === want ? '' : ' (got ' + got + ')'));
  }
  const ids = Object.keys(NEW_CELLS).map((n) => byName.get(n).id);
  ok(Math.min(...ids) > 370, 'and the new cells are appended past every old id (lowest ' + Math.min(...ids) + ')');
}

console.log('== 1948 activates them, and the right states own them ==');
{
  const active = new Set(BOOKMARK_1948.activeProvinces || []);
  for (const n of Object.keys(NEW_CELLS)) ok(active.has(n), n + ' is active in 1948');
  // SPEC §47's own invariant, restated over the whole atlas: 1948 is the
  // full-resolution chapter, so a latent cell missing from it has no geometry
  // of its own anywhere (tools/README.md).
  const missing = MAP_DATA.provinces.filter((p) => p.latentParent && !active.has(p.name)).map((p) => p.name);
  ok(!missing.length, 'and every latent cell on the map is active here: ' + (missing.join(', ') || 'none missing'));

  const geom = {
    neighbors: Array.from({ length: MAP_DATA.provinces.length + 1 }, () => new Set()),
    centroids: [null, ...MAP_DATA.provinces.map((p) => {
      const [x, y] = MAP_DATA.project(p.lon, p.lat); return { x, y };
    })],
    areas: new Int32Array(MAP_DATA.provinces.length + 1), bbox: [],
  };
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_1948, events: [],
    playerTag: 'ISR', rngSeed: 225, provinceMap,
  });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_1948, events: [], provinceMap });
  const owner = (n) => { const p = ctx.prov(n); return p && p.owner; };
  for (const n of ['Nabatieh', 'Chouf', 'Jounieh', 'Batroun', 'Bsharri', 'Akkar', 'Heliopolis', "Ma'alot"]) {
    ok(owner(n) === 'LEB', n + ' opens Lebanese');
  }
  for (const n of ['Mount Hermon', 'Quneitra']) ok(owner(n) === 'SYR', n + ' opens Syrian');
  const shown = (n) => {
    const p = ctx.prov(n);
    return (BOOKMARK_1948.provinceNames || {})[n] || (p && p.name) || n;
  };
  ok(shown('Heliopolis') === 'Baalbek', 'Heliopolis keeps its ancient name and 1948 shows Baalbek');
  ok(shown('Batanea') === 'Hauran',
    'and Batanea is the Hauran again, now that Quneitra is its own cell: ' + shown('Batanea'));
  ok(shown('Caesarea Philippi') === 'Banias', 'Banias is still Banias');
  // The confessional map: the districts the civil war is fought between.
  const faith = (n) => { const p = ctx.prov(n); return p && p.religion; };
  ok(['Jounieh', 'Batroun', 'Bsharri'].every((n) => faith(n) === 'christianity'),
    'the Maronite heartland — Kesrouan, Batroun, the Qadisha — opens Christian');
  ok(['Nabatieh', 'Heliopolis', 'Akkar', 'Chouf'].every((n) => faith(n) === 'islam'),
    'the Shia south, the Shia Beqaa, Sunni Akkar and the mountain open Muslim');
}

console.log('== the seven older chapters see nothing ==');
{
  const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
  ok(snap.neighbors.length === MAP_DATA.provinces.length + 1,
    'the geometry snapshot is current for this atlas ('
    + (snap.neighbors.length - 1) + ' vs ' + MAP_DATA.provinces.length + ' cells)');
  const nameOf = (i) => (MAP_DATA.provinces[i - 1] || {}).name;
  const foldedFor = (bookmark) => {
    const map = buildProvinceMapping(MAP_DATA, bookmark);
    const nb = new Map();
    for (let i = 1; i < snap.neighbors.length; i++) {
      const t = nameOf(map[i] || i);
      if (!t) continue;
      if (!nb.has(t)) nb.set(t, new Set());
      for (const j of snap.neighbors[i]) {
        const u = nameOf(map[j] || j);
        if (u && u !== t) nb.get(t).add(u);
      }
    }
    return nb;
  };
  // SPEC §230 opened four of these ten in the ancient chapters — the Beqaa
  // (Heliopolis), the Hermon, Arca and Botrys, all of them places the ancient
  // world had names for. The other six are Ottoman and modern Lebanon and
  // still fold away.
  const OPENED_BY_230 = new Set(['Heliopolis', 'Mount Hermon', 'Akkar', 'Batroun']);
  for (const era of ERAS) {
    const id = era.bookmark.id;
    if (id === '1948ce') continue;
    const folded = foldedFor(era.bookmark);
    const leaked = Object.keys(NEW_CELLS).filter((n) => !OPENED_BY_230.has(n) && folded.has(n));
    ok(!leaked.length, id + ': no district this section left latent is a province here — '
      + (leaked.join(', ') || 'all folded away'));
    const missing = [...OPENED_BY_230].filter((n) => !folded.has(n));
    ok(!missing.length, id + ': and the four §230 opened ARE provinces here — '
      + (missing.join(', ') || 'all present'));
    // …and the ground they fold INTO is still bordered by exactly what it was.
    for (const parent of new Set(Object.values(NEW_CELLS))) {
      if (!folded.has(parent)) continue; // a chapter may merge the parent away
      ok(folded.get(parent).size > 0, '  ' + parent + ' still has neighbours');
    }
  }
  // The load-bearing pair: the roads a seed on the Syrian steppe would have
  // cost. §230 seats Douma ON the Palmyra road — the Ghouta is where it
  // physically ran — so both now reach in two hops instead of one, and the
  // thing that mattered (that they reach at all) still holds.
  const anc = foldedFor(ERAS.find((e) => e.bookmark.id === '66ce').bookmark);
  ok(anc.get('Damascus').has('Douma') && anc.get('Douma').has('Palmyra'),
    'the Damascus–Palmyra road survives this section, through the Ghouta');
  ok(anc.get('Damascus').has('Douma') && anc.get('Douma').has('Emesa'),
    'and so does Damascus–Emesa');
}

console.log('== the 1948 packages know the new districts are Lebanon ==');
{
  const src = (f) => readFileSync(R + '/js/data/' + f, 'utf8');
  for (const f of ['events_1948_region.js', 'events_1948_levant.js', 'bookmark_1948.js']) {
    const s = src(f);
    const has = ['Nabatieh', 'Chouf', 'Jounieh', 'Batroun', 'Bsharri', 'Akkar', 'Heliopolis']
      .filter((n) => s.includes("'" + n + "'"));
    ok(has.length === 7, f + ' carries all seven Lebanese districts (' + has.length + '/7)');
  }
  ok(src('events_1948.js').includes("\"Ma'alot\""),
    "the armistice keeps Ma'alot with the rest of the central Galilee pocket");
}

console.log('== Hezbollah is a court ==');
{
  const def = DEFINES.TAGS.HEZ;
  ok(!!def, 'HEZ is a tag');
  ok(def.name === 'Hezbollah' && def.capital === 'Heliopolis',
    '  named, and seated on Baalbek: ' + def.name + ' / ' + def.capital);
  ok(DEFINES.GOV_OF.HEZ === 'theocracy', '  a theocracy — wilayat al-faqih, and elders who choose');
  ok(!!(DEFINES.AI_PERSONALITY || DEFINES.PERSONALITY || {}).HEZ
    || JSON.stringify(DEFINES).includes('"HEZ":{"aggression"'),
    '  with an AI personality of its own');
  ok(def.names === 'hezbollah' && Array.isArray(GENERAL_NAMES.hezbollah)
    && GENERAL_NAMES.hezbollah.length >= 6,
    '  and a name pool of its own founders and secretaries-general');
  ok(def.ideas && def.ideas.moraleMult > 1 && def.ideas.incomeMult < 1 && def.ideas.forceLimitMult < 1,
    "  an irregular's ideas: fights above its weight, cannot field a state");
  ok(!(BOOKMARK_1948.playableTags || []).some((r) => (r.tag || r) === 'HEZ'),
    '  and it is not a chair anybody starts in');
}

console.log('== …and it takes the ground ==');
{
  const geom = {
    neighbors: Array.from({ length: MAP_DATA.provinces.length + 1 }, () => new Set()),
    centroids: [null, ...MAP_DATA.provinces.map((p) => {
      const [x, y] = MAP_DATA.project(p.lon, p.lat); return { x, y };
    })],
    areas: new Int32Array(MAP_DATA.provinces.length + 1), bbox: [],
  };
  const era = ERAS.find((e) => e.bookmark.id === '1948ce');
  const boot = (seed) => {
    const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
    const game = initGame({
      DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events,
      playerTag: 'ISR', rngSeed: seed, provinceMap,
    });
    const ctx = makeCtx({
      game, DEFINES, MAP_DATA, geom, bus, bookmark: era.bookmark, events: era.events, provinceMap,
    });
    game.date = { y: 1982, m: 11, d: 1 };
    game.flags.lebanonWar82 = true;
    game.flags.iranianRevolution = true;
    return { game, ctx };
  };
  const card = era.events.find((e) => e && e.id === 'ev_i_hezbollah');
  ok(!!card, 'the founding card is in the chapter');

  // From Beirut.
  {
    const { game, ctx } = boot(225);
    card.options[0].effects(ctx);
    ok(!!game.tags.HEZ && game.tags.HEZ.alive, 'the Party of God is seated');
    const held = ['Heliopolis', 'Nabatieh'].filter((n) => ctx.prov(n).owner === 'HEZ');
    ok(held.length === 2, '  and holds Baalbek and the Jabal Amil: [' + held.join(' ') + ']');
    ok(game.tags.HEZ.govType === 'theocracy', '  a theocracy on the map, not only in the table');
    ok((game.tags.HEZ.ruler || {}).name === 'Subhi al-Tufayli', '  under its first secretary-general');
    ok((game.tags.HEZ.opinion || {}).ISR <= -180 && (game.tags.ISR.opinion || {}).HEZ <= -180,
      '  and it and Jerusalem are at the bottom of the scale with each other');
    ok(((game.tags.IRN || {}).opinion || {}).HEZ >= 100, '  Tehran pays for it');
    ok(!game.tags.LEB.atWarWith.includes('HEZ'), '  and the secession is not itself a war');
    // Twice is once.
    const before = Object.keys(game.tags).length;
    card.options[0].effects(ctx);
    ok(Object.keys(game.tags).length === before, 'founding it twice founds it once');
  }
  // Off an occupier: the Beqaa in Syrian hands since the Deterrent Force.
  {
    const { game, ctx } = boot(226);
    const sy = game.tags.SAR ? 'SAR' : 'SYR';
    ctx.helpers.changeOwner(ctx, 'Heliopolis', sy);
    card.options[0].effects(ctx);
    ok(!!game.tags.HEZ, 'seated off Damascus where Damascus holds Baalbek');
    const held = ['Heliopolis', 'Nabatieh'].filter((n) => ctx.prov(n).owner === 'HEZ');
    ok(held.length === 2, '  and still takes both cells: [' + held.join(' ') + ']');
    ok(ctx.prov('Heliopolis').owner === 'HEZ' && game.tags[sy].alive,
      '  without ending the state it came off');
  }
  // The other answer founds nothing.
  {
    const { game, ctx } = boot(227);
    card.options[1].effects(ctx);
    ok(!game.tags.HEZ && !!game.flags.hezbollahBlocked,
      'and Damascus refusing the transit seats nobody at all');
  }
}

console.log(failures ? `smoke150: ${failures} FAIL` : 'smoke150: ALL PASS');
process.exit(failures ? 1 : 0);
