// Headless regression (SPEC §281): the first three chapters get the scale
// every other chapter already had.
//
// Nine of the twelve chapters ship a `_neighbours` package — the scale a
// courier can ride in a day, between the empire in the world spine and the
// realm in the chain. The Iron Age chapters did not, and it showed in the
// only way that can be measured: 3.5, 4.5 and 4.3 dated cards per decade,
// against 7.8 to 10.3 for the middle of the game. The 732 BCE chapter had
// eighty years in which almost nothing happened, because the fifty-five-year
// reign is dull at the scale of the empire and busy at the scale of the coast.
//
// This suite checks that the three new packages exist, are shaped like content
// packages, name only courts their own chapter actually seats, fire without
// being swallowed by their own guards, and move the density measurement.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const fs = await import('node:fs');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');

const snap = JSON.parse(fs.readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const bus = { emit() {}, on() { return () => {}; } };

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

function boot(id, tag) {
  const entry = ERAS.find((e) => e.bookmark.id === id);
  const bookmark = entry.bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const N = MAP_DATA.provinces.length;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  for (let i = 1; i <= N; i++) {
    const a = provinceMap[i];
    for (const j of snap.neighbors[i] || []) {
      const b = provinceMap[j];
      if (a && b && a !== b) { neighbors[a].add(b); neighbors[b].add(a); }
    }
  }
  const geom = {
    neighbors,
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: snap.areas,
  };
  const playerTag = tag || bookmark.playableTags[0].tag;
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark, events: entry.events,
    playerTag, rngSeed: 281, provinceMap, difficulty: 'normal',
  });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events: entry.events, provinceMap });
  return { ctx, game, entry, bookmark };
}

function playableSpan(era) {
  const b = era.bookmark;
  const first = b.startDate.y;
  let last = Number.isFinite(b.generationHorizon) ? b.generationHorizon : first;
  for (const c of era.events) {
    if (c && c.date && Number.isFinite(c.date.y) && c.date.y > last) last = c.date.y;
  }
  return { first, last };
}

const PACKAGES = [
  ['931bce', 'events_931bce_neighbours', 'ev931n_'],
  ['732bce', 'events_732bce_neighbours', 'ev732n_'],
  ['597bce', 'events_597bce_neighbours', 'ev597n_'],
];
const byId = {};
for (const era of ERAS) byId[era.bookmark.id] = era;

// ---------------------------------------------------------------------------
console.log('== every chapter now has the middle scale ==');
{
  // The structural gap, stated as the invariant rather than as three files:
  // a chapter without a neighbours package is a chapter with no foreign policy
  // below the level of an empire.
  // Every neighbours package in the game names its cards `ev<year>n_`; that
  // is the only thing they have structurally in common, so it is what the
  // invariant is stated over.
  const thin = [];
  let total = 0;
  for (const era of ERAS) {
    const n = era.events.filter((c) => c && typeof c.id === 'string' && /^ev\d+n_/.test(c.id)).length;
    total += n;
    if (n < 8) thin.push(era.bookmark.id + ':' + n);
  }
  ok(!thin.length, 'all ' + ERAS.length + ' chapters carry a neighbours package of eight cards or more ('
    + total + ' in the game)' + (thin.length ? ' — SHORT: ' + thin.join(', ') : ''));
}

// ---------------------------------------------------------------------------
console.log('== the three new packages are registered and shaped right ==');
{
  for (const [chapter, file, prefix] of PACKAGES) {
    const era = byId[chapter];
    const mine = era.events.filter((c) => c && typeof c.id === 'string' && c.id.startsWith(prefix));
    ok(mine.length >= 25, chapter + ': ' + mine.length + ' cards from ' + file + ' are in the chapter');

    const src = fs.readFileSync(R + '/js/data/' + file + '.js', 'utf8');
    ok(!/^\s*import\s/m.test(src), file + ' imports nothing');
    ok(/ctx\.helpers/.test(src), '  and reaches the sim through ctx.helpers');
    ok(!/\bctx\.rng\b|\bMath\.random\b/.test(src),
      '  and rolls no dice — the balance harness stays comparable');
    // `addOpinion` is not on the helper surface. A package that calls it is
    // swallowed by its own guard and changes nothing, which is how thirteen
    // options shipped broken once before (SPEC §274).
    ok(!/helpers\.addOpinion/.test(src), '  and does not call the helper that does not exist');

    const { first, last } = playableSpan(era);
    const stray = mine.filter((c) => !c.date || c.date.y < first || c.date.y > last
      || !(c.date.m >= 1 && c.date.m <= 12));
    ok(!stray.length, '  every card is dated inside ' + first + '..' + last
      + (stray.length ? ' (' + stray.map((c) => c.id).join(', ') + ')' : ''));

    const oneOpt = mine.filter((c) => !c.world && (!c.options || c.options.length !== 2));
    ok(!oneOpt.length, '  every card offers exactly two answers'
      + (oneOpt.length ? ' (' + oneOpt.map((c) => c.id).join(', ') + ')' : ''));

    const unsourced = mine.filter((c) => !c.historical || c.historical.length < 20);
    ok(!unsourced.length, '  every card carries its historical note'
      + (unsourced.length ? ' (' + unsourced.map((c) => c.id).join(', ') + ')' : ''));

    const untooltipped = mine.filter((c) => (c.options || [])
      .some((o) => !o.label || !o.tooltip || o.tooltip.length < 20));
    ok(!untooltipped.length, '  every answer says what it costs'
      + (untooltipped.length ? ' (' + untooltipped.map((c) => c.id).join(', ') + ')' : ''));

    // A card must not quote its own odds (SPEC §172): the option body cannot
    // implement a percentage the sim does not expose to content.
    const odds = mine.filter((c) => (c.options || [])
      .some((o) => /\d+% (chance|odds|probability)/i.test(o.tooltip || '')));
    ok(!odds.length, '  no answer quotes odds it cannot implement'
      + (odds.length ? ' (' + odds.map((c) => c.id).join(', ') + ')' : ''));
  }
}

// ---------------------------------------------------------------------------
console.log('== every answer names the whole price, not the easy half ==');
{
  // The standard the other neighbours packages already keep: a tooltip states
  // every delta the option body applies. The three chapters' older packages do
  // not, and the omissions are always the same shape — the secondary point
  // grants, which are the ones a player weighing two answers cannot see any
  // other way. Measured against the source, because `String(effects)` returns
  // the guard wrapper rather than the card body (SPEC §277).
  const WORD = {
    treasury: 'talents', manpower: 'manpower', legitimacy: 'legitimacy',
    gov: 'governance', mar: 'martial', infl: 'influence', stability: 'stability',
  };
  for (const [chapter, file] of PACKAGES) {
    const src = fs.readFileSync(R + '/js/data/' + file + '.js', 'utf8');
    const blocks = src.split(/\n\s*\{ label: /).slice(1);
    const silent = [];
    let checked = 0;
    for (const b of blocks) {
      const tipM = b.match(/tooltip: '((?:[^'\\]|\\.)*)'/);
      const fx = b.split('fx:')[1] || '';
      const adj = fx.match(/adjust\(ctx, [^,]+, \{([^}]*)\}/);
      if (!tipM || !adj) continue;
      const tip = tipM[1];
      const label = (b.match(/^'((?:[^'\\]|\\.)*)'/) || [])[1] || '?';
      for (const pair of adj[1].split(',')) {
        const m = pair.match(/\s*([a-zA-Z]+):\s*(-?\d+)/);
        if (!m || !WORD[m[1]]) continue;
        checked++;
        const v = Math.abs(Number(m[2]));
        const plain = String(v);
        const comma = v >= 1000 ? v.toLocaleString('en-US') : plain;
        if (!tip.includes(plain) && !tip.includes(comma)) {
          silent.push(label.slice(0, 32) + ' omits ' + WORD[m[1]] + ' ' + m[2]);
        }
      }
    }
    ok(!silent.length, chapter + ': all ' + checked
      + ' point and purse changes are named in the answer that applies them'
      + (silent.length ? ' — SILENT: ' + silent.slice(0, 4).join('; ')
        + (silent.length > 4 ? ' (+' + (silent.length - 4) + ' more)' : '') : ''));
  }
}

// ---------------------------------------------------------------------------
console.log('== a card names only courts its own chapter seats ==');
{
  // The failure this catches is the one that cost most last time: a package
  // addressing a tag the bookmark never seats writes into nothing, silently,
  // for the whole chapter.
  for (const [chapter, file] of PACKAGES) {
    const b = byId[chapter].bookmark;
    const seated = new Set(Object.values(b.owners || {}));
    const src = fs.readFileSync(R + '/js/data/' + file + '.js', 'utf8');
    const named = new Set();
    for (const m of src.matchAll(/(?:opinion\(ctx, |tagMod\(ctx, )'([A-Z]{3})'/g)) named.add(m[1]);
    for (const m of src.matchAll(/opinion\(ctx, '[A-Z]{3}', '([A-Z]{3})'/g)) named.add(m[1]);
    const unseated = [...named].filter((t) => !seated.has(t) && t !== 'ISL' && t !== 'JDH');
    ok(!unseated.length, chapter + ': all ' + named.size
      + ' courts named in ' + file + ' are on its board'
      + (unseated.length ? ' — UNSEATED: ' + unseated.join(', ') : ''));
    ok(named.size >= 5, '  and it talks to ' + named.size + ' of them');
  }
}

// ---------------------------------------------------------------------------
console.log('== every new option runs, and is not swallowed by its guard ==');
{
  // Every option body is wrapped in `guard`, so a broken card fails silently
  // and ships. The only way to know eighty-nine new cards work is to fire all
  // of them, both options, on a real board, and to treat a warning out of the
  // package as a failure even though the campaign survived it.
  const WATCH = /\[events_(931bce|732bce|597bce)_neighbours\]/;
  const realWarn = console.warn;
  let caught = [];
  let threw = 0;
  let guarded = 0;
  let ran = 0;
  console.warn = (...a) => { caught.push(a.join(' ')); };
  try {
    for (const [chapter, , prefix] of PACKAGES) {
      const cards = byId[chapter].events.filter((c) => c && typeof c.id === 'string' && c.id.startsWith(prefix));
      // Both crowns where a chapter seats two: a card addressed to Judah fires
      // in Israel's campaign too, silently, on its recorded course (SPEC §216).
      const chairs = byId[chapter].bookmark.playableTags.map((t) => t.tag);
      for (const ev of cards) {
        for (let i = 0; i < ev.options.length; i++) {
          for (const chair of chairs) {
            const { ctx, game } = boot(chapter, chair);
            const me = game.playerTag;
            const foreign = game.provinces.find((p) => p && !p.impassable
              && p.controller && p.controller !== me);
            if (foreign) ctx.helpers.spawnArmy(ctx, me, foreign.name, { men: 5000, name: 'Test Host' });
            caught = [];
            ran++;
            try { ev.options[i].effects(ctx); }
            catch (e) { threw++; realWarn('    THREW', chapter, ev.id, 'opt' + i, e && e.message); }
            const fromPool = caught.filter((w) => WATCH.test(w));
            if (fromPool.length) {
              guarded++;
              realWarn('    GUARD CAUGHT', chapter, ev.id, 'opt' + i, fromPool[0].slice(0, 200));
            }
          }
        }
      }
    }
  } finally { console.warn = realWarn; }
  ok(ran >= 290, ran + ' option firings exercised across the three new packages');
  ok(threw === 0, 'no option threw (' + threw + ')');
  ok(guarded === 0, 'no option was silently swallowed by its guard (' + guarded + ')');

  // Prove the detector detects. A pass above means nothing unless a card that
  // IS broken trips it, and the way this check fails silently is a WATCH
  // pattern that matches none of the packages' warnings.
  {
    const { ctx } = boot('931bce');
    const card = byId['931bce'].events.find((c) => c && c.id === 'ev931n_the_copper_road');
    const saw = [];
    console.warn = (...a) => { saw.push(a.join(' ')); };
    try {
      const broken = { ...ctx, helpers: { ...ctx.helpers, adjust: undefined } };
      card.options[0].effects(broken);
    } finally { console.warn = realWarn; }
    ok(saw.some((w) => WATCH.test(w)),
      'a deliberately broken card body trips the guard detector'
        + (saw.length ? ' (' + saw[0].slice(0, 90) + ')' : ' — NOTHING WARNED'));
  }
}

// ---------------------------------------------------------------------------
console.log('== the Iron Age is no longer the thin end of the game ==');
{
  // The measurement that started this: dated cards per decade of playable
  // span. The three chapters opened at 3.5, 4.5 and 4.3 against a middle-game
  // range of 7.8 to 10.3.
  const density = (id) => {
    const era = byId[id];
    const { first, last } = playableSpan(era);
    const dated = era.events.filter((c) => c && c.date && Number.isFinite(c.date.y)).length;
    return dated / Math.max(1, Math.round((last - first) / 10));
  };
  for (const [id, was, want] of [['931bce', 3.5, 4.5], ['732bce', 4.5, 6.0], ['597bce', 4.3, 6.0]]) {
    const now = density(id);
    ok(now >= want, id + ' carries ' + now.toFixed(1)
      + ' dated cards per decade, up from ' + was.toFixed(1));
  }

  // And the stronger statement: no roomy decade in the three chapters is down
  // at the §241 floor of two any more.
  for (const [id] of PACKAGES.map(([c]) => [c])) {
    const era = byId[id];
    const { first, last } = playableSpan(era);
    const bucket = {};
    for (const c of era.events) {
      if (!c || !c.date || !Number.isFinite(c.date.y)) continue;
      const d = Math.floor(c.date.y / 10) * 10;
      bucket[d] = (bucket[d] || 0) + 1;
    }
    const thin = [];
    let roomy = 0;
    for (let d = Math.floor(first / 10) * 10; d <= Math.floor(last / 10) * 10; d += 10) {
      const years = Math.min(d + 9, last) - Math.max(d, first) + 1;
      if (years < 5) continue;
      roomy++;
      if ((bucket[d] || 0) < 3) thin.push(d + ':' + (bucket[d] || 0));
    }
    ok(!thin.length, id + ': all ' + roomy + ' roomy decades carry three or more'
      + (thin.length ? ' — THIN ' + thin.join(', ') : ''));
  }
}

// ---------------------------------------------------------------------------
console.log('== the eighty silent years of the long reign are filled ==');
{
  // The specific hole: the fifty-five-year reign, in which the chapter's own
  // spine has almost nothing because nothing happens at the scale of empires.
  const era = byId['732bce'];
  const inRange = (a, b) => era.events.filter((c) => c && c.date && c.date.y >= a && c.date.y <= b).length;
  ok(inRange(-700, -640) >= 18, 'the 732 BCE chapter has ' + inRange(-700, -640)
    + ' dated cards between 700 and 640, where it had eleven');
  const mine = era.events.filter((c) => c && typeof c.id === 'string' && c.id.startsWith('ev732n_')
    && c.date.y <= -640 && c.date.y >= -700);
  ok(mine.length >= 8, '  ' + mine.length + ' of them are the coast, the desert and the succession');
}

console.log(failures ? 'FAILURES: ' + failures : 'ALL PASS');
process.exit(failures ? 1 : 0);
