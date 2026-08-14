// Headless regression — SPEC §246: the old names.
//
// The peace table could force a beaten empire to let go of two kinds of thing:
// the court that owned the ground when the era opened, and — for the rest — a
// bucket of culture-and-faith called the "Greek State of Straton's Tower". This
// section puts a third between them: the country that IS there. Tyre and Sidon
// in one hand is Phoenicia, and the treaty may say so.
//
// Six contracts:
//
//   1. THE LIST IS WELL FORMED, and it has to be, because nothing at runtime
//      can tell a typo from a province that simply changed hands. Every core
//      and every land is a real map cell; every culture, faith, ruler pool and
//      idea key resolves; no tag collides with the 142 in DEFINES.TAGS; and no
//      two countries claim the same core, which is the invariant the whole
//      conflict resolution rests on.
//   2. EVERY CHAPTER CAN RAISE SOMETHING. A core that is a latent cell in
//      seven of nine chapters (Nineveh, Characmoba) is a country that cannot
//      be raised in them, and the failure is silent — the row simply never
//      appears. Each bookmark is booted and asked.
//   3. THE GATES BITE, all four: the century, the war score, the enemy's own
//      capital, and holding every core.
//   4. A CORE OUTRANKS A LAND. Kirkuk and Sulaymaniyah are what makes
//      Kurdistan Kurdistan and are merely more of Assyria's plain; without the
//      reservation, Assyria — earlier in the file — sweeps them up and
//      Kurdistan can never be raised at all.
//   5. THE ORDINARY RULES STILL HOLD: §109's one piece of connected land, the
//      capital, participants, separate peaces, and the historical court's
//      prior claim on its own homeland.
//   6. WHAT IS RAISED IS A COURT, not a colour: its own name, banner, faith
//      taken from the ground, ideas, constitution and a named ruler — and the
//      locked rows the table shows are display-only, so naming one in a
//      hand-edited deal buys nothing.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { REVIVALS, revivalsAt, revivalByTag } = await import(R + '/js/data/revivals.js');
const mil = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const UI = readFileSync(R + '/js/ui/ui.js', 'utf8');
const CSS = readFileSync(R + '/styles.css', 'utf8');
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));

function boot(bookmark, playerTag, seed = 246) {
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const N = snap.neighbors.length - 1;
  const to = (id) => provinceMap[id] || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  for (let id = 1; id <= N; id++) {
    const t = to(id);
    for (const nb of snap.neighbors[id]) {
      const tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  const geom = {
    neighbors,
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas), bbox: [],
  };
  const events = (ERAS.find((e) => e.bookmark.id === bookmark.id) || {}).events || [];
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events, provinceMap });
  return { game, ctx, geom, provinceMap };
}
// A war against the named court, however the chapter has to be bent to get
// one. Scripted wars already on the books are reused.
function warWith(ctx, mine, theirs) {
  const g = ctx.game;
  let war = g.wars.find((w) => (w.attackers.includes(mine) && w.defenders.includes(theirs))
    || (w.attackers.includes(theirs) && w.defenders.includes(mine)));
  if (!war) {
    const t = g.tags[theirs];
    if (t) { t.overlord = null; t.allies = []; }
    mil.declareWar(ctx, mine, theirs, 'the probe');
    war = g.wars.find((w) => (w.attackers.includes(mine) && w.defenders.includes(theirs))
      || (w.attackers.includes(theirs) && w.defenders.includes(mine)));
  }
  return war;
}
// Connected components over land adjacency, computed here rather than asked
// of the engine — the same independence §109's own suite insists on.
function pieces(geom, ids) {
  const pool = new Set(ids);
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const stack = [id];
    const comp = [];
    seen.add(id);
    while (stack.length) {
      const cur = stack.pop();
      comp.push(cur);
      for (const n of (geom.neighbors[cur] || [])) {
        if (pool.has(n) && !seen.has(n)) { seen.add(n); stack.push(n); }
      }
    }
    out.push(comp);
  }
  return out;
}

console.log('== §246 · 1 the list is well formed ==');
{
  const cells = new Set(MAP_DATA.provinces.map((p) => p.name));
  const tags = new Set(Object.keys(DEFINES.TAGS));
  const cultures = new Set(Object.keys(DEFINES.CULTURES));
  const religions = new Set(Object.keys(DEFINES.RELIGIONS));
  const govs = new Set(Object.keys(DEFINES.GOV_TYPES));
  const pools = new Set(Object.keys(mil.GENERAL_NAMES));
  const ideaKeys = new Set();
  for (const k of Object.keys(DEFINES.TAGS)) {
    for (const i of Object.keys(DEFINES.TAGS[k].ideas || {})) ideaKeys.add(i);
  }
  ok(REVIVALS.length >= 20, `the catalog carries ${REVIVALS.length} countries`);

  const badProv = [];
  const badTag = [];
  const badRef = [];
  const seen = new Set();
  const coreOwner = new Map();
  const sharedCore = [];
  for (const r of REVIVALS) {
    for (const n of r.cores.concat(r.lands || [])) if (!cells.has(n)) badProv.push(r.tag + ':' + n);
    if (tags.has(r.tag) || seen.has(r.tag)) badTag.push(r.tag);
    seen.add(r.tag);
    if (!cultures.has(r.culture)) badRef.push(r.tag + ' culture ' + r.culture);
    if (r.religion && !religions.has(r.religion)) badRef.push(r.tag + ' religion ' + r.religion);
    if (!govs.has(r.govType)) badRef.push(r.tag + ' govType ' + r.govType);
    if (!pools.has(r.names)) badRef.push(r.tag + ' names ' + r.names);
    for (const i of Object.keys(r.ideas || {})) if (!ideaKeys.has(i)) badRef.push(r.tag + ' idea ' + i);
    for (const n of r.cores) {
      if (coreOwner.has(n)) sharedCore.push(n + ' (' + coreOwner.get(n) + '/' + r.tag + ')');
      coreOwner.set(n, r.tag);
    }
  }
  ok(!badProv.length, 'every core and land is a real map cell' + (badProv.length ? ': ' + badProv.join(', ') : ''));
  ok(!badTag.length, 'and no tag collides with the catalog or with another revival'
    + (badTag.length ? ': ' + badTag.join(', ') : ''));
  ok(!badRef.length, 'and every culture, faith, constitution, name pool and idea key resolves'
    + (badRef.length ? ': ' + badRef.join('; ') : ''));
  // The invariant the whole conflict resolution rests on. If two countries
  // ever share a core, one of them silently stops existing.
  ok(!sharedCore.length, 'and no two countries claim the same core'
    + (sharedCore.length ? ': ' + sharedCore.join(', ') : ''));

  const noProse = REVIVALS.filter((r) => !r.basis || !r.description || !r.name || !r.adj
    || !Array.isArray(r.color) || r.color.length !== 3);
  ok(!noProse.length, 'and each carries a name, an adjective, a banner and the case for itself'
    + (noProse.length ? ': ' + noProse.map((r) => r.tag).join(', ') : ''));
  const badEra = REVIVALS.filter((r) => !(r.from < r.to) || !(r.minWs > 0));
  ok(!badEra.length, 'and a century that runs forwards and a threshold above zero');
  ok(revivalsAt(-167).length > 0 && revivalsAt(1948).length > 0
    && revivalsAt(-167).indexOf(revivalByTag('KUR')) < 0
    && revivalsAt(1948).indexOf(revivalByTag('MOA')) < 0,
    'and the century filter answers: no Kurdistan in 167 BCE, no Moab in 1948');
}

console.log('== §246 · 2 every chapter can raise something ==');
{
  // The specific failure this guards: a core that is a LATENT cell outside the
  // 1948 chapter (Nineveh folds into Hatra, Characmoba into Medaba) makes its
  // country unraisable everywhere else, and nothing says so — the row simply
  // never appears. Structural reachability is checked for every chapter, then
  // one live table proves the pass actually runs.
  const missing = [];
  for (const era of ERAS) {
    const bm = era.bookmark;
    const map = buildProvinceMapping(MAP_DATA, bm);
    const live = new Set();
    for (let i = 1; i <= MAP_DATA.provinces.length; i++) {
      if (map[i] === i) live.add(MAP_DATA.provinces[i - 1].name);
    }
    const inEra = revivalsAt(bm.startDate.y);
    ok(inEra.length >= 5, `${bm.id}: ${inEra.length} of the old names belong to this century`);
    for (const r of inEra) {
      const gone = r.cores.filter((n) => !live.has(n));
      if (gone.length) missing.push(bm.id + '/' + r.tag + ' needs ' + gone.join('+'));
    }
  }
  ok(!missing.length, 'and no in-century country asks for a cell its chapter folds away'
    + (missing.length ? ': ' + missing.join(', ') : ''));
}

console.log('== §246 · 3 the table raises real countries ==');
const era167 = ERAS.find((e) => e.bookmark.id === '167bce');
{
  const { game, ctx, geom } = boot(era167.bookmark, 'HAS');
  const war = warWith(ctx, 'HAS', 'SEL');
  ok(!!war, 'the Maccabees are at war with the Seleucids');
  game.wars.find((w) => w === war).warscore.HAS = 100;
  const rows = mil.releasableNations(ctx, war, 'HAS', 'SEL');
  const rev = rows.filter((r) => r.origin === 'revival');
  ok(rev.length >= 6, `the Seleucid empire yields ${rev.length} of the old names`);
  const pho = rev.find((r) => r.tag === 'PHO');
  ok(!!pho, 'Phoenicia among them, which is the whole point of the section');
  ok(pho && pho.provNames.includes('Tyre') && pho.provNames.includes('Sidon'),
    'and it arrives holding Tyre and Sidon (' + (pho ? pho.provNames.join(', ') : '—') + ')');
  ok(pho && pho.name === 'Phoenicia' && !/State of/.test(pho.name),
    'named for itself rather than for a culture and a town');
  ok(pho && pho.cost === Math.max(10, Math.round(pho.dev * 0.5)),
    'priced by development like every other release: ' + (pho ? pho.cost : '—') + ' war score');
  // §109 holds for these rows too, over the real adjacency graph.
  const broken = rev.filter((r) => pieces(geom, r.provIds).length > 1);
  ok(!broken.length, 'and every one of them is one piece of connected land ('
    + (broken.map((r) => r.tag).join(', ') || 'none') + ')');
  const seatOutside = rev.filter((r) => r.capitalId && !r.provIds.includes(r.capitalId));
  ok(!seatOutside.length, 'seated inside its own territory');
  // The rest of the map is still divided by the two older abstractions.
  ok(rows.some((r) => r.origin === 'cultural'),
    'and the culture buckets still catch what no country claims');
  // Nobody is promised the same province twice.
  const claims = new Map();
  const twice = [];
  for (const r of rows) {
    for (const id of r.provIds) {
      if (claims.has(id)) twice.push(id + ' (' + claims.get(id) + '/' + r.tag + ')');
      claims.set(id, r.tag);
    }
  }
  ok(!twice.length, 'and no province is promised to two treaties at once'
    + (twice.length ? ': ' + twice.join(', ') : ''));
}

console.log('== §246 · 4 the gates bite ==');
{
  const { game, ctx } = boot(era167.bookmark, 'HAS');
  const war = warWith(ctx, 'HAS', 'SEL');
  const at = (ws) => {
    war.warscore.HAS = ws;
    return mil.releasableNations(ctx, war, 'HAS', 'SEL').filter((r) => r.origin === 'revival');
  };
  // The war score. Phoenicia asks 35; Idumaea asks 25.
  ok(!at(10).length, 'at +10 war score no congress will resurrect anything');
  const mid = at(30);
  ok(mid.length && !mid.some((r) => r.tag === 'PHO'),
    'at +30 the small ones are on the table and Phoenicia (35) is not');
  ok(at(40).some((r) => r.tag === 'PHO'), 'at +40 Phoenicia is');
  war.warscore.HAS = 30;
  const lockedAt30 = mil.lockedRevivals(ctx, war, 'HAS', 'SEL');
  const offeredAt30 = new Set(at(30).map((r) => r.tag));
  ok(lockedAt30.length > 0, `at +30 the table shows ${lockedAt30.length} countries it cannot yet reach`);
  ok(lockedAt30.some((r) => /war has not gone far enough/i.test(r.reason) && /\d+%/.test(r.reason)),
    'naming the score each of them wants: ' + (lockedAt30[0] && lockedAt30[0].reason));
  ok(lockedAt30.every((r) => r.minWs > 30 || !/war has not gone far enough/i.test(r.reason)),
    'and nothing is called short of a score it already has');
  ok(lockedAt30.every((r) => !offeredAt30.has(r.tag)),
    'nothing is both on the table and out of reach at the same table');
  // Neither vanishes. A country whose ground the enemy holds outright is
  // either a term or a listed refusal — never simply absent, which is the
  // failure mode a catalogue of twenty-nine names is most exposed to.
  {
    const ground = revivalsAt(ctx.game.date.y)
      .filter((d) => d.cores.every((n) => ctx.game.provinces.some((p) => p && !p.impassable
        && p.owner === 'SEL' && (p.canon || p.name) === n)));
    const info30 = mil.peaceDealInfo(ctx, war, 'HAS');
    const seen = new Set(info30.releasable.map((r) => r.tag)
      .concat(info30.releasableLocked.map((r) => r.tag)));
    // The locked list is capped at four, so the ones it drops are the ones
    // furthest from reach — the assertion is that the CLOSEST are all spoken
    // for, which is what a player can act on.
    const closest = ground.slice().sort((a, b) => a.minWs - b.minWs).slice(0, 3);
    ok(closest.every((d) => seen.has(d.tag)),
      'and the countries whose ground they hold outright are all either offered or refused in words ('
      + closest.map((d) => d.tag).join(', ') + ')');
  }

  // The ground gate, on a country that WAS on the table a moment ago: hand one
  // of Phoenicia's two cores to somebody else and the whole thing goes, with
  // the missing province named rather than the row silently vanishing.
  war.warscore.HAS = 100;
  ok(at(100).some((r) => r.tag === 'PHO'), 'with both cores theirs, Phoenicia is offered');
  const sidon = ctx.prov('Sidon');
  sidon.owner = 'PTO';
  sidon.controller = 'PTO';
  ok(!at(100).some((r) => r.tag === 'PHO'), 'the day Sidon changes hands it is not');
  const short = mil.lockedRevivals(ctx, war, 'HAS', 'SEL').find((r) => r.tag === 'PHO');
  ok(short && /do not hold Sidon/.test(short.reason),
    'and the table says which province is missing: ' + (short ? short.reason : '—'));
  sidon.owner = 'SEL';
  sidon.controller = 'SEL';

  // The century. Kurdistan's cores are 1948-only cells anyway, so the year is
  // tested where it can be seen: the same empire, the clock moved past Moab.
  war.warscore.HAS = 100;
  ok(at(100).some((r) => r.tag === 'IDU'), 'Idumaea is a proposal in 167 BCE');
  const y = game.date.y;
  game.date.y = 900; // past every ancient window in the file
  ok(!at(100).some((r) => r.tag === 'IDU'), 'and is not one in 900 CE');
  game.date.y = y;

  // The enemy's own capital. Antioch is the Seleucid seat; a country whose
  // core is a capital is refused with that reason rather than silently.
  const cap = mil.tagDefOf ? null : DEFINES.TAGS.SEL.capital;
  ok(cap === 'Antioch', 'the Seleucid seat is Antioch');
  const rows = mil.releasableNations(ctx, war, 'HAS', 'SEL');
  ok(rows.every((r) => !r.provNames.includes('Antioch')),
    'and no row — revival or otherwise — carries it away');
}

console.log('== §246 · 5 a core outranks a land ==');
{
  // Assyria stands two entries above Kurdistan and lists Kirkuk and
  // Sulaymaniyah among its lands. They are Kurdistan's cores. Without the
  // reservation Assyria sweeps them up and Kurdistan is never raisable.
  const era48 = ERAS.find((e) => e.bookmark.id === '1948ce');
  const { ctx } = boot(era48.bookmark, 'ISR');
  const war = warWith(ctx, 'ISR', 'IRQ');
  ok(!!war, 'Israel is at war with Iraq');
  war.warscore.ISR = 100;
  const rev = mil.releasableNations(ctx, war, 'ISR', 'IRQ').filter((r) => r.origin === 'revival');
  const kur = rev.find((r) => r.tag === 'KUR');
  const asy = rev.find((r) => r.tag === 'ASY');
  ok(!!kur && !!asy, 'both Kurdistan and Assyria are on the table');
  ok(kur && kur.provIds.length >= 2, 'Kurdistan holds its own two cores ('
    + (kur ? kur.provNames.join(', ') : '—') + ')');
  ok(asy && !asy.provIds.some((id) => kur && kur.provIds.includes(id)),
    'and Assyria took none of them (' + (asy ? asy.provNames.join(', ') : '—') + ')');
}

console.log('== §246 · 6 what is raised is a court ==');
{
  const { game, ctx, geom, provinceMap } = boot(era167.bookmark, 'HAS');
  const war = warWith(ctx, 'HAS', 'SEL');
  war.warscore.HAS = 100;
  ok(!game.tags.PHO, 'Phoenicia does not exist on the map before the treaty');
  ok(!DEFINES.TAGS.PHO, 'and is deliberately absent from the catalog, so no bookmark can seat it empty');
  const before = mil.releasableNations(ctx, war, 'HAS', 'SEL').find((r) => r.tag === 'PHO');
  const tyre = ctx.prov('Tyre');
  const groundFaith = tyre && tyre.religion;
  const ev = mil.evaluatePeaceDeal(ctx, war, 'HAS', { release: ['PHO'] });
  ok(ev.acceptable && ev.release.includes('PHO'), 'at +100 the Seleucids are compelled to raise it (cost ' + ev.cost + ')');
  mil.executePeaceDeal(ctx, war, 'HAS', { release: ['PHO'] });
  ok(!game.wars.some((w) => w.id === war.id), 'the treaty is signed and the war is off the books');
  const t = game.tags.PHO;
  ok(!!t && t.alive, 'Phoenicia stands');
  ok(t && t.name === 'Phoenicia' && t.adj === 'Phoenician', 'under its own name and adjective');
  ok(t && t.culture === 'phoenician', 'with its own people');
  ok(t && t.religion === groundFaith,
    `and the faith of its own ground (${t && t.religion} — Tyre keeps ${groundFaith})`);
  ok(t && Array.isArray(t.color) && t.color[0] === 128, 'its own banner');
  ok(t && t.govType === 'republic', 'its own constitution — suffetes, not a king');
  ok(t && t.ruler && t.ruler.title === 'Suffete' && t.ruler.name && !/Council of the New State/.test(t.ruler.name),
    'and a named magistrate rather than a Council of the New State (' + (t && t.ruler && t.ruler.name) + ')');
  ok(t && t.ideas && t.ideas.tradeMult > 1, 'it starts with ideas of its own');
  // …and keeps them. `ideas` is DERIVED: applyReformsToTag rebuilds it from
  // the catalog on every tech tier, every reform and every load, and a court
  // that is not in the catalog had nothing to rebuild from — Phoenicia's
  // merchant fleet evaporated the first time its AI took a reform.
  ok(t && t.baseIdeas && t.baseIdeas.tradeMult > 1, 'carried on the court as its founding ideas');
  const { applyReformsToTag } = await import(R + '/js/data/ideas.js');
  t.reforms = { mil: 1, civ: 0, rel: 0 };
  t.tech = { gov: 4, infl: 4, mar: 4 };
  applyReformsToTag(DEFINES, t, 'PHO');
  ok(t.ideas && t.ideas.tradeMult > 1 && t.ideas.navalMult > 1,
    'and still has them after a reform and a tech tier rebuild the map');
  ok(t && /purple cities/.test(t.description || ''), 'and a description that is about Phoenicia');
  ok(t && t.freedBy && t.freedBy.by === 'HAS', 'it knows who freed it');
  ok(ctx.prov('Tyre').owner === 'PHO' && ctx.prov('Sidon').owner === 'PHO',
    'and Tyre and Sidon are its own');
  ok(before && before.provIds.length === (ctx.game.provinces.filter((p) => p && p.owner === 'PHO').length),
    'exactly the land the row offered, and no more');

  // And it survives being saved and loaded. `reviveGame` rebuilds every
  // court's merged modifiers from the catalog on the way in, which is the
  // second place a court nobody catalogued could lose everything it was
  // founded with — quietly, one reload after the treaty.
  {
    const { reviveGame } = await import(R + '/js/sim/init.js');
    // reviveGame restores the shape; makeCtx is what rebuilds every court's
    // merged modifiers on the way in, so the round-trip is both of them.
    const rev = reviveGame(JSON.parse(JSON.stringify(game)));
    makeCtx({
      game: rev, DEFINES, MAP_DATA, geom, bus: { emit() {}, on() { return () => {}; } },
      bookmark: era167.bookmark, events: [], provinceMap,
    });
    const p = rev && rev.tags.PHO;
    ok(!!p && p.alive && p.name === 'Phoenicia' && p.adj === 'Phoenician',
      'a save round-trip keeps the court, its name and its adjective');
    ok(p && Array.isArray(p.color) && p.color[0] === 128 && p.govType === 'republic',
      'its banner and its constitution');
    ok(p && p.ideas && p.ideas.tradeMult > 1 && p.ideas.navalMult > 1,
      'and the ideas it was founded with, after the load rebuilds every court\'s modifiers');
    ok(p && p.ruler && p.ruler.title === 'Suffete', 'and the man at the top of it');
  }

  // A second war returns MORE of the coast to the country that now exists,
  // rather than founding a duplicate.
  const war2 = warWith(ctx, 'HAS', 'PTO');
  if (war2) {
    war2.warscore.HAS = 100;
    const again = mil.releasableNations(ctx, war2, 'HAS', 'PTO').find((r) => r.tag === 'PHO');
    ok(!again || again.kind === 'return',
      'a later table returns land to the living court rather than founding a second Phoenicia');
  }
}

console.log('== §246 · 7 the table shows it ==');
{
  const { ctx } = boot(era167.bookmark, 'HAS');
  const war = warWith(ctx, 'HAS', 'SEL');
  war.warscore.HAS = 30;
  const info = mil.peaceDealInfo(ctx, war, 'HAS');
  ok(Array.isArray(info.releasable) && Array.isArray(info.releasableLocked),
    'peaceDealInfo carries both the reachable and the not-yet');
  ok(info.releasableLocked.every((r) => r.reason && r.minWs && r.cores && r.basis
    && Number.isFinite(r.dev)),
    'and every locked row names its reason, its price, its country and what it is worth');
  ok(info.releasableLocked.every((r, i, a) => !i || a[i - 1].minWs < r.minWs
    || a[i - 1].dev >= r.dev || a[i - 1].coresHeld < a[i - 1].cores.length),
    'ranked closest first and then biggest, so the cap is not decided by the alphabet');
  ok(info.releasable.filter((r) => r.origin === 'revival').every((r) => r.basis),
    'and every offered old name carries the case for itself');
  // A hand-edited deal naming a locked one buys nothing: the row is not in
  // `releasable`, and evaluate resolves only from there.
  const lockedTag = info.releasableLocked[0] && info.releasableLocked[0].tag;
  if (lockedTag) {
    const ev = mil.evaluatePeaceDeal(ctx, war, 'HAS', { release: [lockedTag] });
    ok(!ev.release.includes(lockedTag) && ev.cost === 0,
      'and a deal naming a locked country (' + lockedTag + ') prices and applies nothing');
  }
  // A separate peace redraws nobody's map, revivals included.
  const sep = mil.peaceDealInfo(ctx, war, 'HAS', 'SEL');
  if (sep && sep.separate) {
    ok(!sep.releasable.length && !sep.releasableLocked.length,
      'a separate peace offers neither, as it offers no other release');
  }

  // Markup and styling.
  ok(/an old name/.test(UI), 'the peace table marks a revival row in the panel');
  ok(/releasableLocked/.test(UI), 'and renders the ones out of reach');
  for (const cls of ['peace-revival', 'peace-locked', 'peace-releases', 'peace-off', 'peace-dim']) {
    ok(CSS.indexOf('.' + cls) >= 0, `styles.css names .${cls}`);
  }
}

console.log(failures ? failures + ' FAILURES' : 'smoke166: ALL PASS');
process.exit(failures ? 1 : 0);
