// Headless regression (SPEC §278): the Greek world was never one country.
//
// `GRC` — a tag whose name is "Greece" — held Corinth, Athens, Sparta, Gortyn
// and Rhodes as a single state in 732 BCE, and Syracuse, Tarentum and Rhegium
// with them: one government from the Ionian Sea to the Bosporus, four
// centuries before anything called Greece existed. In 167 the same tag also
// held Thessalonica (which is Macedon), Nicaea (Bithynia), Ancyra (Galatia)
// and Smyrna (Pergamon) — every one of them a power the chapter's own world
// packages talk about by name.
//
// Fourteen courts now stand where the blob did. This suite holds the line on
// all of it: the blob gone, the courts real, the ground theirs, and every one
// of them carrying the things a seated court has to carry — a temper, a
// government, a capital that exists, and art.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const fs = await import('node:fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { FLAGS } = await import(R + '/js/ui/icons.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const NATIONS = DEFINES.NATIONS || DEFINES.TAGS || {};
const NEW = ['MAC', 'ATH', 'SPT', 'COR', 'ACH', 'RHO', 'CRE', 'SYC', 'TAR', 'CYR', 'MIL', 'PRG', 'BIT', 'GAL'];

const snap = JSON.parse(fs.readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const bus = { emit() {}, on() { return () => {}; } };

function boot(id) {
  const e = ERAS.find((x) => x.bookmark.id === id);
  const b = e.bookmark;
  const pm = buildProvinceMapping(MAP_DATA, b);
  const N = MAP_DATA.provinces.length;
  const nb = Array.from({ length: N + 1 }, () => new Set());
  for (let i = 1; i <= N; i++) {
    const a = pm[i];
    for (const j of snap.neighbors[i] || []) {
      const c = pm[j];
      if (a && c && a !== c) { nb[a].add(c); nb[c].add(a); }
    }
  }
  const geom = {
    neighbors: nb,
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: snap.areas,
  };
  const g = initGame({
    DEFINES, MAP_DATA, geom, bookmark: b, events: e.events,
    playerTag: b.playableTags[0].tag, rngSeed: 278, provinceMap: pm, difficulty: 'normal',
  });
  makeCtx({ game: g, DEFINES, MAP_DATA, geom, bus, bookmark: b, events: e.events, provinceMap: pm });
  const held = (t) => g.provinces.filter((p) => p && !p.impassable && p.owner === t).length;
  return { g, held, live: (t) => !!(g.tags[t] && g.tags[t].alive !== false) };
}

// ---------------------------------------------------------------------------
console.log('== the blob is gone, and Greece is Greece again ==');
{
  for (const era of ERAS) {
    const o = era.bookmark.owners || {};
    const grc = Object.entries(o).filter(([, t]) => t === 'GRC').map(([p]) => p);
    if (era.bookmark.id === '1948ce') {
      ok(grc.length >= 5, '1948: GRC is modern Greece and still holds its ' + grc.length + ' cells');
    } else {
      ok(grc.length === 0, era.bookmark.id + ': no "Greece" on the board'
        + (grc.length ? ' — still holds ' + grc.join(', ') : ''));
    }
  }
}

// ---------------------------------------------------------------------------
console.log('== every new court is a court, not a name ==');
{
  const capitals = new Set(MAP_DATA.provinces.map((p) => p.name));
  const bad = { def: [], capital: [], gov: [], temper: [], art: [] };
  for (const t of NEW) {
    const d = NATIONS[t];
    if (!d) { bad.def.push(t); continue; }
    if (!d.capital || !capitals.has(d.capital)) bad.capital.push(t + '→' + d.capital);
    if (!(DEFINES.GOV_OF || {})[t]) bad.gov.push(t);
    if (!JSON.stringify(DEFINES).includes('"' + t + '"')) bad.temper.push(t);
    if (!FLAGS[t]) bad.art.push(t);
  }
  ok(!bad.def.length, NEW.length + ' courts are in the catalog' + (bad.def.length ? ' — missing ' + bad.def.join(',') : ''));
  ok(!bad.capital.length, 'every capital is a province that exists on this map'
    + (bad.capital.length ? ' — ' + bad.capital.join(', ') : ''));
  ok(!bad.gov.length, 'every one declares a form of government' + (bad.gov.length ? ' — ' + bad.gov.join(',') : ''));
  ok(!bad.art.length, 'and every one carries art, not three letters in text'
    + (bad.art.length ? ' — ' + bad.art.join(',') : ''));
  const art = NEW.map((t) => String(FLAGS[t]));
  ok(new Set(art).size === NEW.length, 'no two of them wear the same emblem');
  for (const t of NEW) {
    const d = NATIONS[t];
    ok(d && d.description && d.description.length > 40 && d.ideas && Object.keys(d.ideas).length >= 2,
      '  ' + t + ' (' + d.name + ') has a description and national ideas');
  }
}

// ---------------------------------------------------------------------------
console.log('== the ground is actually theirs ==');
const EXPECT = {
  '732bce': { COR: 'Corinth', ATH: 'Athens', SPT: 'Sparta', CRE: 'Gortyn', RHO: 'Rhodes', SYC: 'Syracusae', TAR: 'Tarentum' },
  '597bce': { COR: 'Corinth', ATH: 'Athens', SPT: 'Sparta', CRE: 'Gortyn', RHO: 'Rhodes', SYC: 'Syracusae', TAR: 'Tarentum', CYR: 'Cyrene', MIL: 'Sinope' },
  '167bce': { MAC: 'Thessalonica', ACH: 'Corinth', ATH: 'Athens', CRE: 'Gortyn', RHO: 'Rhodes', BIT: 'Nicaea', PRG: 'Smyrna', GAL: 'Ancyra' },
};
{
  for (const [chapter, want] of Object.entries(EXPECT)) {
    const o = ERAS.find((e) => e.bookmark.id === chapter).bookmark.owners || {};
    const wrong = Object.entries(want).filter(([tag, cell]) => o[cell] !== tag)
      .map(([tag, cell]) => cell + ' is ' + o[cell] + ', not ' + tag);
    ok(!wrong.length, chapter + ': ' + Object.keys(want).length + ' courts hold their own seats'
      + (wrong.length ? ' — ' + wrong.join('; ') : ''));
  }
  // The one the request named.
  const o167 = ERAS.find((e) => e.bookmark.id === '167bce').bookmark.owners || {};
  ok(o167.Thessalonica === 'MAC', 'and Macedon holds Thessalonica, which is the whole point');
}

// ---------------------------------------------------------------------------
console.log('== they are alive on a booted board, with land under them ==');
{
  const before = { '732bce': 27, '597bce': 20, '167bce': 54 };
  for (const chapter of Object.keys(EXPECT)) {
    const b = boot(chapter);
    const live = Object.keys(b.g.tags).filter((t) => b.g.tags[t] && b.g.tags[t].alive !== false);
    ok(live.length > before[chapter], chapter + ': ' + live.length
      + ' courts live at boot, up from ' + before[chapter]);
    const landless = Object.keys(EXPECT[chapter]).filter((t) => !b.live(t) || b.held(t) < 1);
    ok(!landless.length, '  and every new court is alive and holding ground'
      + (landless.length ? ' — ' + landless.join(',') : ''));
    ok(b.held('GRC') === 0, '  with nothing left to "Greece"');
  }
}

// ---------------------------------------------------------------------------
console.log('== nothing else moved ==');
{
  // The only cells that changed hands are the ones this section names. A
  // reassignment that quietly took Tyre off Tyre would pass every check above.
  const TOUCHED = new Set(['Corinth', 'Athens', 'Sparta', 'Gortyn', 'Rhodes', 'Byzantion',
    'Syracusae', 'Tarentum', 'Rhegium', 'Cyrene', 'Sinope', 'Trapezus', 'Attalia',
    'Halicarnassus', 'Thessalonica', 'Hadrianopolis', 'Nicaea', 'Smyrna', 'Ancyra']);
  for (const chapter of Object.keys(EXPECT)) {
    const o = ERAS.find((e) => e.bookmark.id === chapter).bookmark.owners || {};
    const strays = Object.entries(o)
      .filter(([cell, tag]) => NEW.includes(tag) && !TOUCHED.has(cell))
      .map(([cell, tag]) => cell + '→' + tag);
    ok(!strays.length, chapter + ': the new courts hold only the cells this section names'
      + (strays.length ? ' — also ' + strays.join(', ') : ''));
  }
}

console.log(failures ? 'FAILURES: ' + failures : 'ALL PASS');
process.exit(failures ? 1 : 0);
