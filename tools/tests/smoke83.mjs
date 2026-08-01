// Headless regression — SPEC §119: the branching path tree is true.
//
// `chapter_paths.js` claims each chapter has N roads, each marked by a flag,
// opened by a card and closed by another. A map is only worth having if it is
// checked against the ground, so this suite checks all four claims against the
// chains the engine actually plays.
//
// The marker check is deliberately STATIC — it reads the content packages as
// text rather than stringifying runtime functions. Every effect body is wrapped
// in `guard(key, fn)`, so `String(option.effects)` returns the wrapper and not
// the `setFlag` inside it; a runtime check would pass on every marker in the
// file including ones nothing sets. Reading the source is the only way to see
// the flag actually being written.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { CHAPTER_PATHS, KNOWN_GAPS } = await import(R + '/js/data/chapter_paths.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { DEFINES } = await import(R + '/js/data/defines.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// Which files carry each chapter's cards. The registry pairs bookmarks with
// event ARRAYS, not paths, so this is the one place the mapping is written
// twice — and the suite fails loudly if a file named here disappears.
const SOURCES = {
  '167bce': ['events_167bce.js', 'events_167bce_kings.js', 'events_167bce_world.js',
    'events_167bce_republic.js', 'events_167bce_after.js', 'events_167bce_empire.js',
    'events_167bce_hellenizers.js'],
  '67bce': ['events_67bce.js', 'events_67bce_world.js', 'events_67bce_after.js'],
  '40bce': ['events_40bce.js', 'events_40bce_world.js', 'events_40bce_alternates.js',
    'events_40bce_bridge.js'],
  '66ce': ['events_66ce.js', 'events_66ce_world.js', 'events_66ce_after.js',
    'events_66ce_nation.js', 'events_66ce_settlement.js'],
  '132ce': ['events_132ce.js', 'events_132ce_faith.js', 'events_132ce_world.js',
    'events_132ce_west.js', 'events_132ce_galilee.js', 'events_132ce_redemption.js',
    'events_132ce_endure.js', 'events_132ce_house.js', 'events_132ce_kosiba.js'],
  '529ce': ['events_529ce.js', 'events_529ce_world.js', 'events_529ce_roads.js'],
  '614ce': ['events_614ce.js', 'events_614ce_persia.js', 'events_614ce_west.js',
    'events_614ce_third.js', 'events_614ce_power.js', 'events_614ce_david.js'],
  '1948ce': ['events_1948.js', 'events_1948_absorption.js', 'events_1948_region.js',
    'events_1948_coldwar.js', 'events_1948_levant.js', 'events_1948_question.js'],
};
const srcCache = new Map();
function sourceFor(chapterId) {
  if (srcCache.has(chapterId)) return srcCache.get(chapterId);
  let text = '';
  for (const f of (SOURCES[chapterId] || [])) {
    try { text += readFileSync(R + '/js/data/' + f, 'utf8'); } catch (e) { text += ''; }
  }
  srcCache.set(chapterId, text);
  return text;
}
// Two idioms in the wild, both legitimate: the helper, and a direct write to
// `g.flags` / `game.flags` inside an effect that already has the game object in
// hand. A check that only knew the first would call a live road dead.
const setsFlag = (src, flagName) => {
  const f = flagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp("setFlag\\(\\s*ctx\\s*,\\s*'" + f + "'").test(src)
    || new RegExp("\\.flags\\." + f + "\\s*=").test(src)
    || new RegExp("flags\\[\\s*'" + f + "'\\s*\\]\\s*=").test(src);
};

const allRoads = [];
for (const ch of CHAPTER_PATHS) {
  for (const fk of ch.forks) for (const rd of fk.roads) allRoads.push({ ch, fk, rd });
}

console.log('== §119: the tree covers the game ==');
{
  const charted = new Set(CHAPTER_PATHS.map((c) => c.id));
  const eras = ERAS.map((e) => e.bookmark.id);
  const uncharted = eras.filter((id) => !charted.has(id));
  ok(!uncharted.length, 'every chapter the game ships is on the tree ('
    + (uncharted.join(', ') || 'none missing') + ')');
  const phantom = [...charted].filter((id) => !eras.includes(id));
  ok(!phantom.length, 'and the tree names no chapter the game does not have ('
    + (phantom.join(', ') || 'none') + ')');
  ok(allRoads.length >= 18, 'the game branches ' + allRoads.length + ' ways in total');
  ok(CHAPTER_PATHS.every((c) => c.forks.every((f) => f.roads.length >= 1)),
    'and no fork is empty');
}

console.log('== §119: every card the tree names is a card the engine plays ==');
{
  const missing = [];
  for (const { ch, rd } of allRoads) {
    const era = ERAS.find((e) => e.bookmark.id === ch.id);
    const ids = new Set((era ? era.events : []).filter(Boolean).map((e) => e.id));
    for (const key of ['entry', 'terminal', 'retired']) {
      const id = rd[key];
      if (id && !ids.has(id)) missing.push(ch.id + '/' + rd.id + ' ' + key + '=' + id);
    }
  }
  ok(!missing.length, 'entry, terminal and retired cards all exist ('
    + (missing.join('; ') || 'all present') + ')');
}

console.log('== §119: every marker is a flag something actually sets ==');
{
  // The anti-drift check, and the reason the tree can be trusted at all.
  // Rename or delete the card that sets a road marker and the road stops
  // existing; without this the tree would describe it forever.
  const dead = [];
  for (const { ch, rd } of allRoads) {
    if (!rd.marker) continue;
    if (!setsFlag(sourceFor(ch.id), rd.marker)) dead.push(ch.id + '/' + rd.id + ' -> ' + rd.marker);
  }
  ok(!dead.length, 'no road is marked by a flag nothing writes ('
    + (dead.join('; ') || 'all live') + ')');
  const unmarked = allRoads.filter(({ rd }) => !rd.marker && !rd.retired && !rd.tagMarker);
  ok(!unmarked.length, 'and every road sets a flag, seats a tag, or is a recorded retirement ('
    + (unmarked.map((x) => x.ch.id + '/' + x.rd.id).join(', ') || 'none') + ')');
  // A road can be marked by a STATE rather than a flag — the 1961 secession is
  // proved by the Syrian Arab Republic existing, not by anything written down.
  const badTags = allRoads.filter(({ rd }) => rd.tagMarker && !(DEFINES.TAGS || {})[rd.tagMarker])
    .map(({ ch, rd }) => ch.id + '/' + rd.id + ' -> ' + rd.tagMarker);
  ok(!badTags.length, 'and a road marked by a tag names a tag that exists ('
    + (badTags.join('; ') || 'all real') + ')');
}

console.log('== §119: the gap list is exactly the gaps ==');
{
  // A to-do list the build enforces. Close a road and forget to remove its
  // entry here, or add an unfinished one and forget to declare it, and this
  // fails — the only way a list like this stays honest.
  const open = allRoads.filter(({ rd }) => (rd.marker || rd.tagMarker) && !rd.terminal)
    .map(({ ch, fk, rd }) => ch.id + '/' + fk.id + '/' + rd.id).sort();
  const declared = KNOWN_GAPS.map((g) => g.chapter + '/' + g.fork + '/' + g.road).sort();
  ok(open.join('|') === declared.join('|'),
    'roads with no ending match the declared gaps (open: ' + (open.join(', ') || 'none')
    + ' / declared: ' + (declared.join(', ') || 'none') + ')');
  ok(KNOWN_GAPS.every((g) => typeof g.why === 'string' && g.why.length > 40),
    'and every gap says why, at length');
  // The finding that started this: the road a player most wants must not be
  // the emptiest one.
  const red = allRoads.find(({ rd }) => rd.id === 'redemption');
  ok(red && red.rd.terminal === 'ev2_r_three_hundred_years',
    'the 132 redemption road ends at 425 rather than at 163 (SPEC §118)');
}

console.log('== §119: roads that share a fork are mutually exclusive ==');
{
  const clashes = [];
  for (const ch of CHAPTER_PATHS) {
    for (const fk of ch.forks) {
      const seen = new Map();
      for (const rd of fk.roads) {
        if (!rd.marker) continue;
        if (seen.has(rd.marker)) clashes.push(ch.id + '/' + fk.id + ': ' + rd.id + ' and ' + seen.get(rd.marker));
        seen.set(rd.marker, rd.id);
      }
    }
  }
  ok(!clashes.length, 'no two roads in a fork answer to the same flag ('
    + (clashes.join('; ') || 'none') + ')');
  // 132 is the pair that had to be taught this: a Judaea that lost Jerusalem,
  // took the Galilee road and later retook the city was playing both chapters.
  const gal = readFileSync(R + '/js/data/events_132ce_galilee.js', 'utf8');
  const red = readFileSync(R + '/js/data/events_132ce_redemption.js', 'utf8');
  ok(/redemptionEra|freedomEra/.test(gal),
    'the Galilee road stands down once the redemption has been entered');
  ok(/galileeKingdom/.test(red),
    'and the redemption road stands down once the hills have been settled for');
}

console.log('== §119: a terminal falls inside its chapter ==');
{
  const late = [];
  for (const ch of CHAPTER_PATHS) {
    const era = ERAS.find((e) => e.bookmark.id === ch.id);
    const evs = (era ? era.events : []).filter(Boolean);
    for (const { rd } of allRoads.filter((x) => x.ch.id === ch.id)) {
      if (!rd.terminal) continue;
      const card = evs.find((e) => e.id === rd.terminal);
      if (!card || !card.date) continue; // trigger-driven terminals have no year to check
      if (card.date.y > ch.lastYear) {
        late.push(ch.id + '/' + rd.id + ' ends ' + card.date.y + ' past ' + ch.lastYear);
      }
    }
  }
  ok(!late.length, 'no terminal falls outside its chapter ('
    + (late.join('; ') || 'none') + ')');
}

console.log(failures ? `smoke83: ${failures} FAIL` : 'smoke83: ALL PASS');
process.exit(failures ? 1 : 0);
