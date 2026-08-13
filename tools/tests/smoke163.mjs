// Headless regression — SPEC §242: the structures mapmode.
//
// Five contracts:
//
//   1. IT IS REGISTERED, EVERYWHERE IT HAS TO BE. In MODE_PARAMS (without the
//      entry the button silently paints the political map), in the UI's
//      MAPMODES bar, and with an icon that actually exists — `icon()` returns
//      the empty string for a name it does not know, so a typo there ships a
//      blank button that nobody can identify.
//   2. IT IS SAFE ON THE BARE CONTEXT. Two suites build {game, DEFINES} with
//      no helpers, no prov, no actions. A mode that reached for the sim would
//      crash them, and the mode is the one thing on the map that runs on
//      every frame.
//   3. IT PAINTS KIND, THEN COUNT. Distinct works take distinct hues; a
//      province with several works is spoken for by the one highest in the
//      ranking and shaded deeper for the rest. A structures mode that painted
//      a shipyard and a granary the same shade of one hue would answer none
//      of the three questions it exists to answer.
//   4. A FORTRESS IS A STRUCTURE, AND IS COUNTED ONCE. Masada has fort 3 and
//      no build order behind it; a mode that only read `buildings` would paint
//      it as bare hill. A province that BUILT its walls already carries the
//      fortification in the list, and must not be shaded as though it had
//      raised two works.
//   5. THE SITE AND THE OCCUPATION EACH GET THEIR STRIPE. A work going up
//      pulses; works standing in somebody else's hands go gray, because a
//      building only works for the court that holds the province.
//
// Plus the maintenance invariant that will actually catch a future change:
// every key in DEFINES.BUILDINGS has a hue and a rank. Add a building to the
// catalog and forget this file, and the map paints it the unknown-work gray.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { initGame } = await import(R + '/js/sim/init.js');
const { computeMapmodeColors } = await import(R + '/js/map/mapmodes.js');
const { icon } = await import(R + '/js/ui/icons.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const MM_SRC = readFileSync(R + '/js/map/mapmodes.js', 'utf8');
const UI_SRC = readFileSync(R + '/js/ui/ui.js', 'utf8');

const geom = { centroids: [], areas: [] };
function boot(id) {
  const era = ERAS.find((e) => e.bookmark.id === id);
  const bm = era.bookmark;
  return initGame({
    DEFINES, MAP_DATA, geom, bookmark: bm, events: era.events,
    playerTag: (bm.playableTags && bm.playableTags[0]) || bm.playerTag || 'JUD',
    rngSeed: 42,
  });
}
const paint = (game) => computeMapmodeColors({ game, DEFINES }, 'structures');
const rgb = (r, i) => [r.primary[i * 4], r.primary[i * 4 + 1], r.primary[i * 4 + 2]];
const sec = (r, i) => [r.secondary[i * 4], r.secondary[i * 4 + 1], r.secondary[i * 4 + 2]];
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const index = (game) => {
  const m = {};
  game.provinces.forEach((p, i) => { if (p) m[p.canon] = i; });
  return m;
};
// The palette is READ OUT of the module rather than copied into the suite.
// Copying it would lock the exact bytes and fail on every re-tune; reading it
// lets the suite assert what actually matters — that each kind has a hue of
// its own and that no two of them collapse together at the pale end of the
// ramp, which is where the mode is mostly read.
const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
const grab = (name) => {
  const m = new RegExp('const ' + name + ' = \\[(\\d+), (\\d+), (\\d+)\\]').exec(MM_SRC);
  return m ? [+m[1], +m[2], +m[3]] : null;
};
const HUES = (() => {
  const blk = /const STRUCT_COLORS = \{([\s\S]*?)\n\};/.exec(MM_SRC);
  const out = {};
  if (!blk) return out;
  const re = /(\w+):\s*\[(\d+),\s*(\d+),\s*(\d+)\]/g;
  let m;
  while ((m = re.exec(blk[1]))) out[m[1]] = [+m[2], +m[3], +m[4]];
  return out;
})();
const PALE = grab('STRUCT_PALE');
const NONE = grab('STRUCT_NONE');
const SITE = grab('STRUCT_SITE');
const IDLE = grab('STRUCT_IDLE');
const lerp = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
// Which kind's ramp does this colour lie on? Sampled across the whole plausible
// band rather than tied to the mode's current floor, so re-tuning the ramp does
// not need this file re-tuned with it.
const nearestHue = (c) => {
  let best = null, bd = Infinity;
  for (const k of Object.keys(HUES)) {
    for (let w = 0.5; w <= 1.0001; w += 0.01) {
      const d = dist(c, lerp(PALE, HUES[k], w));
      if (d < bd) { bd = d; best = k; }
    }
  }
  return best;
};

console.log('== §242 · 1 the mode is registered everywhere it has to be ==');
{
  ok(/^\s{2}structures: \{ relief:/m.test(MM_SRC),
    'structures has a MODE_PARAMS entry — without one the button paints the political map');
  ok(/\{ id: 'structures', ico: icon\('structures'\)/.test(UI_SRC),
    'and a button in the UI mapmode bar');
  const svg = icon('structures');
  ok(svg && svg.indexOf('<svg') === 0 && svg.indexOf('<path') > 0,
    'whose icon exists in the shared set (icon() returns "" for a name it does not know)');
  ok(svg !== icon('bricks') && svg !== icon('walls'),
    'and is not Development\'s bricks or the walls glyph under another name');
  ok(PALE && NONE && SITE && IDLE && Object.keys(HUES).length >= 7,
    'the suite can read the palette out of the module (' + Object.keys(HUES).length + ' kinds)');
  // The legibility floor. One work paints the palest shade the mode ever
  // shows, and that is the shade almost every painted province is read at —
  // two kinds that collapse together THERE are two kinds the map cannot tell
  // apart, however far apart they look at full colour.
  const keys = Object.keys(HUES);
  let worst = { d: Infinity, a: '', b: '' };
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const d = dist(lerp(PALE, HUES[keys[i]], 0.78), lerp(PALE, HUES[keys[j]], 0.78));
      if (d < worst.d) worst = { d, a: keys[i], b: keys[j] };
    }
  }
  ok(worst.d >= 60,
    `no two kinds collapse at the pale end of the ramp (closest: ${worst.a}/${worst.b} at ${worst.d})`);
  let nearBare = { d: Infinity, k: '' };
  for (const k of keys) {
    const d = dist(lerp(PALE, HUES[k], 0.78), NONE);
    if (d < nearBare.d) nearBare = { d, k };
  }
  ok(nearBare.d >= 100,
    `and none of them collapses into bare ground (closest: ${nearBare.k} at ${nearBare.d})`);
}

console.log('== §242 · 2 it is safe on the bare {game, DEFINES} context ==');
{
  const game = boot('66ce');
  const N = game.provinces.length - 1;
  const r = paint(game);
  ok(r && r.primary.length === (N + 1) * 4 && r.secondary.length === (N + 1) * 4,
    'it computes on a context with no helpers, no prov and no actions');
  ok(r.params.relief === 0.3, 'with its own relief parameter');
  ok(r.flags.length === N + 1, 'and a flags byte for every province');
  // The guard contract from smoke109: adding a mode must not break the others.
  for (const m of ['political', 'terrain', 'religion', 'culture', 'development',
    'unrest', 'estates', 'trade', 'diplomatic', 'diaspora']) {
    const out = computeMapmodeColors({ game, DEFINES }, m);
    if (out && out.primary.length === (N + 1) * 4) continue;
    ok(false, m + ' still computes');
  }
  ok(true, 'and the other ten mapmodes are unaffected');
}

console.log('== §242 · 3 it paints kind first, then count ==');
{
  const game = boot('1948ce');
  const at = index(game);
  const r = paint(game);
  // 1948 seeds the ports and the runways (SPEC §58), which is the one chapter
  // with enough of both to tell the two hues apart on the real map.
  ok(nearestHue(rgb(r, at.Dora)) === 'shipyard', 'Haifa\'s deep-water port reads as a shipyard');
  ok(nearestHue(rgb(r, at.Joppa)) === 'airfield', 'the coastal strips at Sde Dov read as an airfield');
  ok(!same(rgb(r, at.Dora), rgb(r, at.Joppa)),
    'and the two are different colours — the mode is not a count ramp under a single hue');
  // Foreign ground. getBuildInfo returns null for anybody else's province, so
  // before this mode Cairo West was unknowable without owning Egypt.
  ok(game.provinces[at.Memphis].owner !== game.playerTag,
    'Cairo West belongs to somebody else');
  ok(nearestHue(rgb(r, at.Memphis)) === 'airfield',
    'and its runway is on the map anyway — the mode reads province state, not the owner-gated panel');
  // Rank: Famagusta seeds BOTH, and the rarer gated work speaks for it.
  const fam = game.provinces[at.Salamis];
  ok(fam.buildings.indexOf('shipyard') >= 0 && fam.buildings.indexOf('airfield') >= 0,
    'Famagusta has both the docks and RAF Nicosia');
  ok(nearestHue(rgb(r, at.Salamis)) === 'airfield',
    'and is spoken for by the airfield, which is the rarer work');
  // Count shades within the kind: two works land nearer the base hue than one.
  ok(dist(rgb(r, at.Salamis), HUES.airfield) < dist(rgb(r, at.Joppa), HUES.airfield),
    'two works read deeper than one — the count shades the hue it does not choose');
  ok(!same(rgb(r, at.Salamis), rgb(r, at.Joppa)), 'so the two airfield provinces are told apart');
}

console.log('== §242 · 4 a fortress is a structure, and is counted once ==');
{
  const game = boot('1948ce');
  const at = index(game);
  const r = paint(game);
  const mas = game.provinces[at.Masada];
  ok((mas.fort | 0) > 0 && (!mas.buildings || !mas.buildings.length),
    'Masada carries a fort and no build order behind it');
  ok(!same(rgb(r, at.Masada), NONE), 'and is not painted as bare hill');
  ok(nearestHue(rgb(r, at.Masada)) === 'walls', 'it reads as a fortification');
  // Counted once. Two synthetic provinces: one that BUILT its walls over a
  // fort, one that built them on flat ground. Same works, same colour.
  const a = game.provinces[at.Masada];
  const b = game.provinces[at.Joppa];
  a.buildings = ['walls'];
  b.buildings = ['walls'];
  b.fort = 0;
  b.wonder = null;
  const r2 = paint(game);
  ok(same(rgb(r2, at.Masada), rgb(r2, at.Joppa)),
    'a fortress that builds its walls is one work, not two — the fort is not counted twice');
  ok(nearestHue(rgb(r2, at.Masada)) === 'walls', 'and both read as fortification');
}

console.log('== §242 · 5 the great works stand on the ground too ==');
{
  const g167 = boot('167bce');
  const i167 = index(g167);
  const r167 = paint(g167);
  ok(g167.provinces[i167.Jerusalem].wonder === 'temple', 'in 167 the Temple stands');
  ok(nearestHue(rgb(r167, i167.Jerusalem)) === 'wonder',
    'and it, not the fortress under it, is what Jerusalem is painted for');
  ok(nearestHue(rgb(r167, i167.Alexandria)) === 'wonder',
    'as the Library speaks for Alexandria over its harbor');
  const g48 = boot('1948ce');
  const i48 = index(g48);
  const r48 = paint(g48);
  ok(!g48.provinces[i48.Jerusalem].wonder, 'in 1948 it does not');
  ok(nearestHue(rgb(r48, i48.Jerusalem)) === 'walls',
    'and Jerusalem falls back to its fortification — the mode carries the loss rather than forgetting it');
  // Wonders are raised in play (the Dome, and three chapters that rebuild the
  // Temple), so the mode has to read the live field rather than the map data.
  g48.provinces[i48.Jerusalem].wonder = 'dome';
  ok(nearestHue(rgb(paint(g48), i48.Jerusalem)) === 'wonder',
    'a wonder raised during a campaign lights its province up');
  // A holy mountain is ground, not a work.
  const gerizim = g167.provinces[i167.Neapolis];
  ok(gerizim && gerizim.holy && !gerizim.wonder, 'Gerizim is a holy site with nothing built on it');
  ok(same(rgb(r167, i167.Neapolis), NONE), 'and the mode leaves it bare — this mode paints works, not ground');
}

console.log('== §242 · 6 the site and the occupation each get their stripe ==');
{
  const game = boot('66ce');
  const at = index(game);
  const empty = at.Joppa;
  game.provinces[empty].buildings = [];
  game.provinces[empty].fort = 0;
  game.provinces[empty].wonder = null;
  const bare = paint(game);
  ok(same(rgb(bare, empty), NONE), 'a province with nothing on it is bare');
  ok((bare.flags[empty] & 1) === 0, 'and unstriped');

  game.provinces[empty].construction = { key: 'market', monthsLeft: 6 };
  const site = paint(game);
  ok(same(rgb(site, empty), NONE), 'a work under way does not yet colour the province — it is not built');
  ok((site.flags[empty] & 1) === 1, 'but it stripes it');
  ok((site.flags[empty] & 4) === 4, 'and pulses, because it is the one fact here about to change');
  ok(same(sec(site, empty), SITE), 'in the scaffolding colour');

  // Occupation: works that stand in somebody else's hands do not work.
  game.provinces[empty].construction = null;
  game.provinces[empty].buildings = ['market'];
  const held = paint(game);
  ok((held.flags[empty] & 1) === 0, 'a market we hold ourselves is unstriped');
  game.provinces[empty].controller = 'ROM';
  const taken = paint(game);
  ok((taken.flags[empty] & 1) === 1, 'an occupied market is striped');
  ok(same(sec(taken, empty), IDLE), 'in gray — it pays nobody while somebody else holds the province');
  ok((taken.flags[empty] & 4) === 0, 'and does not pulse; nothing here is about to change');
  ok(nearestHue(rgb(taken, empty)) === 'market', 'while the province still says what stands on it');
  // A site on occupied ground: the site wins the one stripe available.
  game.provinces[empty].construction = { key: 'granary', monthsLeft: 3 };
  const both = paint(game);
  ok(same(sec(both, empty), SITE) && (both.flags[empty] & 4) === 4,
    'and where both are true the site takes the stripe');
}

console.log('== §242 · 7 wasteland, unknown keys, and the catalog ==');
{
  const game = boot('167bce');
  const at = index(game);
  let waste = 0;
  for (let i = 1; i < game.provinces.length; i++) {
    if (game.provinces[i] && game.provinces[i].owner === 'WASTE') { waste = i; break; }
  }
  const r = paint(game);
  ok(waste > 0, 'the map has wasteland');
  ok(!same(rgb(r, waste), NONE),
    'and it keeps its own colour — empty desert is not a settled town that has built nothing');

  // An unknown catalog key must warn and paint SOMETHING, not crash the frame
  // and not read as bare ground.
  game.provinces[at.Joppa].buildings = ['aqueduct'];
  game.provinces[at.Joppa].fort = 0;
  game.provinces[at.Joppa].wonder = null;
  let threw = false;
  let unknown = null;
  try { unknown = rgb(paint(game), at.Joppa); } catch (e) { threw = true; }
  ok(!threw, 'a building key the palette has never met does not throw');
  ok(unknown && !same(unknown, NONE), 'and does not read as bare ground');

  // The maintenance invariant: the catalog and the palette must not drift.
  const missingHue = Object.keys(DEFINES.BUILDINGS || {}).filter((k) => !HUES[k]);
  ok(missingHue.length === 0,
    'every building in DEFINES.BUILDINGS has a hue' + (missingHue.length ? ': ' + missingHue.join(', ') : ''));
  const rankLine = /const STRUCT_RANK = \[([^\]]*)\]/.exec(MM_SRC);
  const ranked = rankLine ? rankLine[1].split(',').map((s) => s.trim().replace(/'/g, '')) : [];
  const missingRank = Object.keys(DEFINES.BUILDINGS || {}).filter((k) => ranked.indexOf(k) < 0);
  ok(missingRank.length === 0,
    'and a place in the ranking' + (missingRank.length ? ': ' + missingRank.join(', ') : ''));
  ok(ranked[0] === 'wonder', 'with the great works ahead of every build order');
}

console.log('== §242 · 8 it says something on every chapter\'s map ==');
{
  for (const era of ERAS) {
    const id = era.bookmark.id;
    const game = boot(id);
    const r = paint(game);
    const seen = new Set();
    let built = 0;
    for (let i = 1; i < game.provinces.length; i++) {
      const p = game.provinces[i];
      if (!p) continue;
      seen.add(rgb(r, i).join(','));
      const n = (p.buildings || []).length + (p.wonder ? 1 : 0) + ((p.fort | 0) > 0 ? 1 : 0);
      if (n) built++;
    }
    ok(seen.size >= 4 && built >= 10,
      `${id}: ${built} provinces carry something, in ${seen.size} distinct colours`);
  }
}

console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
