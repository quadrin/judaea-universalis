// Headless regression (SPEC §274): the decade rule over the whole PLAYABLE
// span, and the three packages that made it hold.
//
// §241 established the rule and checked it — to `generationHorizon`, the year
// a chapter's own undated trigger cards stop belonging to anybody (§121).
// That is not the year a chapter stops. `js/ui/wiki.js` has said so in prose
// since §195: "the later of the horizon and the last dated card is the span a
// player can actually play". Measured over THAT span, ten decades in five
// chapters carried fewer than two dated cards, and one of them — the 40 BCE
// chapter's fifties — carried none at all, which is an eighteen-year silence
// between the Passover crush of 48 CE and the morning the sacrifices stopped.
//
// This suite asserts the stricter invariant, so the hole cannot come back by
// somebody extending a world spine past the last card that talks to it.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const fs = await import('node:fs');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');

const snap = JSON.parse(fs.readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const bus = { emit() {}, on() { return () => {}; } };

function boot(id) {
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
  const tag = bookmark.playableTags[0].tag;
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark, events: entry.events,
    playerTag: tag, rngSeed: 1234567, provinceMap, difficulty: 'normal',
  });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events: entry.events, provinceMap });
  return { ctx, game, tag };
}

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// The span a player can actually play — the wiki's own definition.
function playableSpan(era) {
  const b = era.bookmark;
  const first = b.startDate.y;
  let last = Number.isFinite(b.generationHorizon) ? b.generationHorizon : first;
  for (const c of era.events) {
    if (c && c.date && Number.isFinite(c.date.y) && c.date.y > last) last = c.date.y;
  }
  return { first, last };
}

// ---------------------------------------------------------------------------
console.log('== every roomy decade of every playable span carries two ==');
{
  let roomyTotal = 0;
  for (const era of ERAS) {
    const b = era.bookmark;
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
      // How much of this decade is inside the playable window? The edge
      // decades are exempt for §241's reason: a decade with one legal year in
      // it cannot be asked for two cards, and a rule that pretended otherwise
      // would be a lie rather than an invariant.
      const years = Math.min(d + 9, last) - Math.max(d, first) + 1;
      const n = bucket[d] || 0;
      if (years < 5) continue;
      roomy++;
      if (n < 2) thin.push(d + ':' + n);
    }
    roomyTotal += roomy;
    ok(!thin.length, b.id + ' (' + first + '..' + last + '): all ' + roomy
      + ' roomy decades carry two or more' + (thin.length ? ' — THIN ' + thin.join(', ') : ''));
  }
  ok(roomyTotal >= 150, 'the rule is checked over ' + roomyTotal
    + ' roomy decades across all twelve chapters');
}

// ---------------------------------------------------------------------------
console.log('== the span is the WIDER of the two, not the horizon ==');
{
  // The point of this section: the horizon and the playable span differ, and
  // the old check stopped at the narrower one. If they ever coincide for
  // every chapter, this suite is checking nothing the old one did not.
  const wider = ERAS.filter((era) => {
    const { last } = playableSpan(era);
    return last > era.bookmark.generationHorizon;
  });
  ok(wider.length >= 5, wider.length + ' chapters run past their generation horizon — '
    + wider.map((e) => e.bookmark.id).join(', '));
  const forty = ERAS.find((e) => e.bookmark.id === '40bce');
  ok(forty && playableSpan(forty).last === 66 && forty.bookmark.generationHorizon === 10,
    'the 40 BCE chapter\'s horizon is 10 CE and its last card is 66 CE — '
      + 'fifty-six years the old check never looked at');
}

// ---------------------------------------------------------------------------
console.log('== the three new packages are registered and shaped right ==');
const PACKAGES = [
  ['40bce', 'events_40bce_road', 'ev40r_'],
  ['597bce', 'events_597bce_persia', 'ev597p_'],
  ['67bce', 'events_67bce_augustan', 'ev67a_'],
];
{
  const byId = {};
  for (const era of ERAS) byId[era.bookmark.id] = era;
  for (const [chapter, file, prefix] of PACKAGES) {
    const era = byId[chapter];
    const mine = era.events.filter((c) => c && typeof c.id === 'string' && c.id.startsWith(prefix));
    ok(mine.length >= 8, chapter + ': ' + mine.length + ' cards from ' + file + ' are in the chapter');
    // Zero imports — a content package reaches the sim only through
    // ctx.helpers (the rule every package header promises).
    const src = fs.readFileSync(R + '/js/data/' + file + '.js', 'utf8');
    ok(!/^\s*import\s/m.test(src), file + ' imports nothing');
    ok(/ctx\.helpers/.test(src), '  and reaches the sim through ctx.helpers');
    // Every card the player answers offers a real choice (the smoke39 rule).
    const oneOpt = mine.filter((c) => !c.world && (!c.options || c.options.length < 2));
    ok(!oneOpt.length, '  every non-world card offers two answers'
      + (oneOpt.length ? ' (' + oneOpt.map((c) => c.id).join(', ') + ')' : ''));
    // Every card is dated and inside the chapter.
    const { first, last } = playableSpan(era);
    const stray = mine.filter((c) => !c.date || c.date.y < first || c.date.y > last
      || !(c.date.m >= 1 && c.date.m <= 12));
    ok(!stray.length, '  every card is dated inside ' + first + '..' + last
      + (stray.length ? ' (' + stray.map((c) => c.id).join(', ') + ')' : ''));
    // Historical note on every card: this game's cards cite.
    const unsourced = mine.filter((c) => !c.historical || c.historical.length < 20);
    ok(!unsourced.length, '  every card carries its historical note'
      + (unsourced.length ? ' (' + unsourced.map((c) => c.id).join(', ') + ')' : ''));
  }
}

// ---------------------------------------------------------------------------
console.log('== no card names a province that is not on the map ==');
{
  const names = new Set(MAP_DATA.provinces.map((p) => p.name));
  const files = PACKAGES.map(([, f]) => f)
    .concat(['events_931bce_houses', 'events_732bce_hezekiah']);
  let checked = 0;
  const bad = [];
  for (const f of files) {
    const src = fs.readFileSync(R + '/js/data/' + f + '.js', 'utf8');
    // Province names appear as the literal argument to stir/pmod/prov lists.
    for (const m of src.matchAll(/'([A-Z][A-Za-z' -]{2,24})'/g)) {
      const s = m[1];
      // Only test strings that LOOK like a cell we meant: capitalised, no
      // spaces-into-sentences, and present in at least one province list.
      if (!/^[A-Z][a-z]+(?: [A-Z][a-z]+)?$/.test(s)) continue;
      if (!names.has(s)) continue; // not a province reference at all
      checked++;
    }
    // The real test: the names each file declares in its own cell lists.
    for (const m of src.matchAll(/(?:stir\(ctx, \[|pmod\(ctx, )'([^']+)'/g)) {
      if (!names.has(m[1])) bad.push(f + ': ' + m[1]);
    }
    for (const m of src.matchAll(/const (?:YEHUD|COAST|COAST_ROAD|HEART|SAMARITAN|JEWISH_HEART) = \[([^\]]+)\]/g)) {
      for (const n of m[1].matchAll(/'([^']+)'/g)) {
        if (!names.has(n[1])) bad.push(f + ': ' + n[1]);
      }
    }
  }
  ok(!bad.length, checked + ' province references resolve against the map'
    + (bad.length ? ' — UNKNOWN: ' + bad.join(', ') : ''));
}

// ---------------------------------------------------------------------------
console.log('== nothing in the new packages draws from the seeded stream ==');
{
  for (const [, file] of PACKAGES) {
    const src = fs.readFileSync(R + '/js/data/' + file + '.js', 'utf8');
    ok(!/\bctx\.rng\b|\bMath\.random\b/.test(src),
      file + ' rolls no dice — the balance harness stays comparable');
  }
}

// ---------------------------------------------------------------------------
console.log('== the fifties are not silent any more ==');
{
  const forty = ERAS.find((e) => e.bookmark.id === '40bce');
  const fifties = forty.events.filter((c) => c && c.date && c.date.y >= 50 && c.date.y <= 59);
  ok(fifties.length >= 4, 'the 40 BCE chapter has ' + fifties.length
    + ' dated cards in the fifties CE, where it had none');
  const gap = (a, b) => forty.events.filter((c) => c && c.date && c.date.y > a && c.date.y < b).length;
  ok(gap(48, 66) >= 6, 'and ' + gap(48, 66)
    + ' between the Passover crush of 48 and the spring of 66, where it had none');
}

// ---------------------------------------------------------------------------
console.log('== every new option runs, on both of its chapter\'s roads ==');
{
  // A content package that throws inside the tick takes the campaign with it,
  // which is why every option body here is wrapped in `guard`. The guard means
  // a broken card fails SILENTLY — so the only way to know forty-five new cards
  // work is to fire all of them, every option, with the chapter's road markers
  // set each way, because half the 40 BCE cards only run on one of them. A
  // warning out of the package counts as a failure even though the campaign
  // survived it. This is §272's rule for the weather pool, applied here.
  const ROADS = {
    '40bce': [
      { judaeaProvincia: true },
      { notAProvince: true },
    ],
    '597bce': [{}],
    '67bce': [{}],
    '931bce': [{}],
    '732bce': [{}],
  };
  // The prefix these packages' own warnOnce prints. Getting this wrong is the
  // whole failure mode this section exists to catch, so it is asserted below
  // against a deliberately broken card rather than trusted.
  const WATCH = /\[events_(40bce_road|597bce_persia|67bce_augustan|931bce_houses|732bce_hezekiah)\]/;
  const byId = {};
  for (const era of ERAS) byId[era.bookmark.id] = era;
  const realWarn = console.warn;
  let caught = [];
  let threw = 0;
  let guarded = 0;
  let ran = 0;
  console.warn = (...a) => { caught.push(a.join(' ')); };
  try {
    // The whole of each touched package, not only the cards added here: the
    // failure this section catches is silent, so a package that has been
    // shipped is not a package that has been fired.
    for (const [chapter, prefix] of PACKAGES.map(([c, , p]) => [c, p])
      .concat([['931bce', 'ev931h_'], ['732bce', 'ev732h_']])) {
      const cards = byId[chapter].events.filter((c) => c && typeof c.id === 'string' && c.id.startsWith(prefix));
      for (const ev of cards) {
        for (let i = 0; i < ev.options.length; i++) {
          for (const flags of ROADS[chapter]) {
            const { ctx, game } = boot(chapter);
            Object.assign(game.flags, flags);
            const me = game.playerTag;
            // A host in the field, so any card reaching for one finds one.
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
  ok(ran >= 80, ran + ' option firings exercised across the five touched packages');
  ok(threw === 0, 'no option threw (' + threw + ')');
  ok(guarded === 0, 'no option was silently swallowed by its guard (' + guarded + ')');

  // Prove the detector detects. A pass above means nothing unless a card that
  // IS broken trips it, and the way this check fails silently is a WATCH
  // pattern that matches none of the packages' warnings.
  {
    const { ctx } = boot('40bce');
    const road = byId['40bce'].events.find((c) => c && c.id === 'ev40r_the_temple_is_finished');
    const saw = [];
    console.warn = (...a) => { saw.push(a.join(' ')); };
    try {
      // Reach through a helper that does not exist: the guard swallows it and
      // warns, exactly as a genuine mistake in a card body would.
      const broken = { ...ctx, helpers: { ...ctx.helpers, adjust: undefined } };
      road.options[0].effects(broken);
    } finally { console.warn = realWarn; }
    ok(saw.some((w) => WATCH.test(w)),
      'a deliberately broken card body trips the guard detector'
        + (saw.length ? ' (' + saw[0].slice(0, 90) + ')' : ' — NOTHING WARNED'));
  }
}

console.log(failures ? 'FAILURES: ' + failures : 'ALL PASS');
process.exit(failures ? 1 : 0);
