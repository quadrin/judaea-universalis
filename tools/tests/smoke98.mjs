// Headless regression — SPEC §147: the Keepers get a pen of their own.
//
// Requested: Samaritan names for what the Samaritan state integrates.
//
// `resolveDisplayName` has three layers — a crown's own pen, the chapter's
// `integratedNames` table, and a SHARED layer keyed on the owner's religion.
// The shared layer existed only for `judaism`, so every Jewish realm in every
// chapter could write its own signposts across a hundred and forty provinces
// while the Samaritans had the nine names their chapter had written by hand. A
// Samaritan realm that took the coast integrated Caesarea and the signpost went
// on reading Caesarea.
//
// The new table is a separate register rather than a copy of the Jewish one,
// because the difference between the two pens is the argument of the whole 529
// chapter. Its editorial rule: where the Torah names a place, this pen writes
// the Torah's name — the Samaritan canon is the Pentateuch and nothing else.
// That rule lands hardest on Jerusalem, which the Torah calls Shalem once and
// thereafter only "the place which the LORD shall choose" — read by this people
// as Gerizim. So the Keepers' pen declines the argument and writes Shalem.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { resolveDisplayName } = await import(R + '/js/sim/military.js');
const { JEWISH_INTEGRATED_NAMES, SAMARITAN_INTEGRATED_NAMES } = await import(R + '/js/data/integrated_names.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const flatGeom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};

function boot(id, tag) {
  const era = ERAS.find((e) => e.bookmark.id === id);
  const b = era.bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, b);
  const game = initGame({
    DEFINES, MAP_DATA, geom: flatGeom, bookmark: b, events: era.events,
    playerTag: tag, rngSeed: 3, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: flatGeom,
    bus: { emit() {}, on() { return () => {}; } },
    bookmark: b, events: era.events, provinceMap,
  });
  return { game, ctx, bookmark: b };
}

// Take a province, integrate it, and read the signpost.
function takeAndRead(w, tag, name, culture) {
  const p = w.ctx.prov(name);
  if (!p) return null;
  p.owner = tag; p.controller = tag; p.integration = 1;
  if (culture) p.culture = culture;
  return resolveDisplayName(w.ctx, p);
}

// ---------------------------------------------------------------------------
console.log('== the Keepers can now write on what they take ==');
{
  const w = boot('529ce', 'SAM');
  const EXPECT = {
    'Caesarea Maritima': 'Qisri',
    'Ptolemais': 'Akko',
    'Scythopolis': 'Beit She\'an',
    'Sepphoris': 'Tzippori',
    'Tiberias': 'Tveria',
    'Gaza': 'Azza',
    'Ascalon': 'Ashqelon',
    'Petra': 'Reqem',
    'Damascus': 'Damesek',
    'Tyre': 'Tzor',
    'Pella': 'Pahel',
    'Caesarea Philippi': 'Dan',
  };
  for (const [canon, want] of Object.entries(EXPECT)) {
    const got = takeAndRead(w, 'SAM', canon, 'samaritan');
    ok(got === want, canon + ' integrated reads ' + want + (got === want ? '' : ' — got ' + got));
  }
}

// ---------------------------------------------------------------------------
console.log('== and the pen is theirs, not a copy of the other one ==');
{
  const w = boot('529ce', 'SAM');
  // The four places where the two canons diverge and this pen follows the
  // Torah. Each is the older half of a gloss the Torah itself supplies.
  const DIVERGE = {
    Jerusalem: ['Shalem', 'Yerushalayim'],
    Hebron: ['Kiryat Arba', 'Hevron'],
    Memphis: ['Mof', 'Nof'],
  };
  for (const [canon, [sam, jew]] of Object.entries(DIVERGE)) {
    ok(SAMARITAN_INTEGRATED_NAMES[canon] === sam,
      canon + ': the Keepers write ' + sam);
    ok(JEWISH_INTEGRATED_NAMES[canon] === jew,
      '  where the Jewish pen writes ' + jew);
    const got = takeAndRead(w, 'SAM', canon, 'samaritan');
    ok(got === sam, '  and the map agrees (' + got + ')');
  }
  // Bethlehem and Ramallah are latent cells this chapter does not activate, so
  // they are asserted on the table rather than the map — a later chapter that
  // does activate them gets them for free, which is the point of a shared pen.
  ok(SAMARITAN_INTEGRATED_NAMES.Bethlehem === 'Efrat'
    && JEWISH_INTEGRATED_NAMES.Bethlehem === 'Beit Lehem',
  'Bethlehem is Efrat to them and Beit Lehem to the other pen');
  ok(SAMARITAN_INTEGRATED_NAMES.Ramallah === 'Luza',
    'and Ramallah keeps Luz, the name Genesis says the city had first');
}

// ---------------------------------------------------------------------------
console.log('== the layers still rank correctly ==');
{
  // A chapter's own table outranks the shared pen, which is how period
  // judgment survives. 529 names Sebaste, Jenin, Tulkarm and Qalqilya itself.
  const w = boot('529ce', 'SAM');
  const own = w.bookmark.integratedNames.SAM;
  ok(!!own && own.Sebaste === 'Shomron', 'the chapter still writes its own table');
  ok(takeAndRead(w, 'SAM', 'Sebaste', 'samaritan') === 'Shomron',
    '  and it is what the map reads');
  // A Jewish realm is untouched by any of this. Note the Jewish pen waits for
  // BOTH halves — the schoolhouse and the community — so the fixture has to
  // supply a Jewish population, not just an integrated province. The Samaritan
  // pen keeps the older, looser threshold that every non-Jewish pen uses, which
  // is what makes it show up on integrated conquests at all.
  const j = boot('529ce', 'SAM');
  const jt = j.game.tags.JUD;
  const pt = j.ctx.prov('Ptolemais');
  pt.pop = [{ r: jt.religion, c: jt.culture, n: 5000 }];
  pt.religion = jt.religion;
  ok(takeAndRead(j, 'JUD', 'Ptolemais', jt.culture) === 'Akko',
    'a Jewish realm still reads its own pen (Akko)');
  const k = boot('529ce', 'SAM');
  ok(takeAndRead(k, 'JUD', 'Ptolemais', 'galilean') !== 'Akko',
    '  and still waits for a community before writing it on a Christian town');
  const j2 = boot('66ce', 'JUD');
  ok(takeAndRead(j2, 'JUD', 'Jerusalem', 'judean') === 'Yerushalayim',
    '  and Jerusalem is still Yerushalayim to Judaea');
}

// ---------------------------------------------------------------------------
console.log('== every key names a province that exists ==');
{
  const canon = new Set(MAP_DATA.provinces.map((p) => p.name));
  const bad = Object.keys(SAMARITAN_INTEGRATED_NAMES).filter((k) => !canon.has(k));
  ok(bad.length === 0, 'no entry names a province off the map'
    + (bad.length ? ' (' + bad.join(', ') + ')' : ''));
  const blank = Object.entries(SAMARITAN_INTEGRATED_NAMES).filter(([, v]) => !v || typeof v !== 'string');
  ok(blank.length === 0, 'and every entry has a name');
  ok(Object.isFrozen(SAMARITAN_INTEGRATED_NAMES), 'the table is frozen like its neighbours');
  ok(Object.keys(SAMARITAN_INTEGRATED_NAMES).length >= 60,
    'and it covers the realistic conquest range ('
    + Object.keys(SAMARITAN_INTEGRATED_NAMES).length + ' provinces)');
}

console.log(failures ? `smoke98: ${failures} FAIL` : 'smoke98: ALL PASS');
process.exit(failures ? 1 : 0);
