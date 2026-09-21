// Headless regression (SPEC §282, §283): the empires fall on the board, and
// the world outside is no longer eleven cards wide.
//
// Reported from play, twice: "these country collapse events still aren't
// happening". §277 fixed the card BODIES and proved them by firing each
// option directly — which is exactly the test that could not see this. Fired
// on a fresh board the cards work. Played through, the 732 BCE chapter ends
// with Assyria ALIVE and LARGER than it started in most campaigns, because
// the AI's Assyria eats Babylonia in the 620s and the fall of Nineveh then
// hands Mesopotamia to a court that no longer exists. `cedeNamed` refused a
// dead heir and returned 0, silently, inside the guard.
//
// So this suite plays the chapter instead of poking it: it boots a real
// campaign, ticks a century and a quarter of days, drains the event queue the
// way the AI does, and asserts what is on the map at the end.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const fs = await import('node:fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');

const snap = JSON.parse(fs.readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const bus = { emit() {}, on() { return () => {}; } };

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

function boot(id, seed, tag) {
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
    areas: Int32Array.from(snap.areas),
    bbox: [],
  };
  const playerTag = tag || bookmark.playableTags[0].tag;
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark, events: entry.events,
    playerTag, rngSeed: seed || 283, provinceMap, difficulty: 'normal',
  });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events: entry.events, provinceMap });
  const byId = {};
  for (const e of entry.events) if (e && e.id) byId[e.id] = e;
  return {
    ctx, game, entry, byId,
    actions: gameActions(ctx),
    count: (t) => game.provinces.filter((p) => p && !p.impassable && p.owner === t).length,
    alive: (t) => !!(game.tags[t] && game.tags[t].alive !== false),
  };
}

// Play it. Every dealt card is answered on its recorded course, which is what
// the AI does and what the balance harness has always done.
function play(o, untilYear) {
  let guard = 0;
  while (o.game.date.y < untilYear && guard++ < 400000) {
    tickDay(o.ctx);
    let drain = 0;
    while (o.game.pendingEvents.length && drain++ < 80) {
      const pe = o.game.pendingEvents[0];
      const ev = o.byId[pe.eventId];
      o.actions.chooseEventOption(pe.instanceId, (ev && ev.aiOption) || 0);
      if (o.game.pendingEvents[0] && o.game.pendingEvents[0].instanceId === pe.instanceId) {
        o.game.pendingEvents.shift();
      }
    }
  }
}

const PACKAGES = [
  ['931bce', 'events_931bce_powers', 'ev931p_'],
  ['732bce', 'events_732bce_powers', 'ev732p_'],
  ['597bce', 'events_597bce_powers', 'ev597p2_'],
];
const byChapter = {};
for (const era of ERAS) byChapter[era.bookmark.id] = era;

// ---------------------------------------------------------------------------
console.log('== a fall whose heir is already dead still moves the map ==');
{
  // The bug, isolated. Kill Babylon the way the AI kills it — hand its ground
  // to Assyria — and then fire the fall of Nineveh. Before §282 this moved
  // nothing at all.
  const o = boot('732bce', 283);
  for (const p of o.game.provinces) {
    if (p && !p.impassable && p.owner === 'BBL') { p.owner = 'ASR'; p.controller = 'ASR'; }
  }
  o.game.tags.BBL.alive = false;
  ok(!o.alive('BBL') && o.count('BBL') === 0, 'Babylon is dead and holds nothing, as the AI leaves it');

  const asr0 = o.count('ASR');
  const card = o.byId['ev732w_nineveh_falls'];
  ok(!!card, 'the fall of Nineveh is in the chapter');
  card.options[0].effects(o.ctx);
  ok(o.count('BBL') > 0, 'after the card Babylon holds ' + o.count('BBL')
    + ' provinces — it was raised to take what the history gave it');
  ok(o.alive('BBL'), '  and it is a living court again');
  ok(o.count('ASR') < asr0, 'Assyria is smaller (' + asr0 + ' → ' + o.count('ASR') + ')');
  ok(o.game.tags.BBL.legitimacy >= 50 && (o.game.tags.BBL.treasury || 0) >= 25,
    '  and it is raised with a floor under it rather than as an empty shell');
}

// ---------------------------------------------------------------------------
console.log('== a fall never raises the player\'s own fallen chair ==');
{
  const o = boot('732bce', 283);
  for (const p of o.game.provinces) {
    if (p && !p.impassable && p.owner === 'BBL') { p.owner = 'ASR'; p.controller = 'ASR'; }
  }
  o.game.tags.BBL.alive = false;
  o.game.playerTag = 'BBL';              // as if a chapter seated the player there
  o.byId['ev732w_nineveh_falls'].options[0].effects(o.ctx);
  ok(!o.alive('BBL') && o.count('BBL') === 0,
    'a human chair that has fallen is a finished campaign, not a piece of world news');
}

// ---------------------------------------------------------------------------
console.log('== played through, Assyria falls — on every seed ==');
{
  // The end-to-end claim. Before §282 this finished with ASR alive at 37-39
  // provinces on two of three seeds.
  for (const seed of [4242, 31337]) {
    const o = boot('732bce', seed);
    const asr0 = o.count('ASR');
    play(o, -604);
    ok(!o.alive('ASR') && o.count('ASR') === 0,
      'seed ' + seed + ': Assyria opened with ' + asr0 + ' provinces and ends the chapter with '
        + o.count('ASR') + ', alive=' + o.alive('ASR'));
    ok(o.count('BBL') > 20, '  and Babylon holds ' + o.count('BBL') + ' of them');
    ok(o.count('MDA') > 2, '  and Media holds ' + o.count('MDA'));
  }
}

// ---------------------------------------------------------------------------
console.log('== played through, the other two chapters still end right ==');
{
  const o931 = boot('931bce', 4242);
  play(o931, -713);
  ok(!o931.alive('DMS') && o931.count('DMS') === 0, '931: Aram-Damascus is gone by 714');
  ok(o931.alive('ASR') && o931.count('ASR') > 7,
    '  and Assyria has grown to ' + o931.count('ASR') + ', which is what that chapter is about');
  ok(!o931.alive('CRC'), '  and Carchemish has been annexed out of existence');

  const o597 = boot('597bce', 4242);
  play(o597, -529);
  ok(!o597.alive('BBL') && o597.count('BBL') === 0, '597: Babylon is gone by 530');
  ok(!o597.alive('LYD'), '  and so is Lydia');
  ok(o597.count('PAS') > 50, '  and Persia holds ' + o597.count('PAS') + ' provinces');
  ok(!o597.alive('MDA'), '  and Media was absorbed by Persia in 550, as it was');
}

// ---------------------------------------------------------------------------
console.log('== the world outside is no longer eleven cards wide ==');
{
  const world = (id) => byChapter[id].events.filter((c) => c && c.world && c.date).length;
  for (const [id, was, want] of [['931bce', 11, 25], ['732bce', 11, 25], ['597bce', 16, 32]]) {
    ok(world(id) >= want, id + ' carries ' + world(id)
      + ' dated world cards, up from ' + was);
  }
  const density = (id) => {
    const era = byChapter[id];
    const first = era.bookmark.startDate.y;
    let last = era.bookmark.generationHorizon;
    for (const c of era.events) if (c && c.date && c.date.y > last) last = c.date.y;
    const dated = era.events.filter((c) => c && c.date && Number.isFinite(c.date.y)).length;
    return dated / Math.max(1, Math.round((last - first) / 10));
  };
  for (const [id, want] of [['931bce', 5.5], ['732bce', 7.5], ['597bce', 7.5]]) {
    ok(density(id) >= want, id + ' carries ' + density(id).toFixed(1) + ' dated cards per decade');
  }
}

// ---------------------------------------------------------------------------
console.log('== the three power packages are shaped right ==');
{
  for (const [chapter, file, prefix] of PACKAGES) {
    const era = byChapter[chapter];
    const mine = era.events.filter((c) => c && typeof c.id === 'string' && c.id.startsWith(prefix));
    ok(mine.length >= 18, chapter + ': ' + mine.length + ' cards from ' + file);
    const src = fs.readFileSync(R + '/js/data/' + file + '.js', 'utf8');
    ok(!/^\s*import\s/m.test(src), file + ' imports nothing');
    ok(!/\bctx\.rng\b|\bMath\.random\b/.test(src), '  and rolls no dice');
    ok(!/helpers\.addOpinion/.test(src), '  and does not call the helper that does not exist');
    const notWorld = mine.filter((c) => !c.world || (c.options || []).length !== 1);
    ok(!notWorld.length, '  every card is a one-answer world card'
      + (notWorld.length ? ' (' + notWorld.map((c) => c.id).join(', ') + ')' : ''));
    const unsourced = mine.filter((c) => !c.historical || c.historical.length < 20 || !c.worldLabel);
    ok(!unsourced.length, '  every card carries its source note and its ticker line'
      + (unsourced.length ? ' (' + unsourced.map((c) => c.id).join(', ') + ')' : ''));
    // Every court a card addresses is seated on that chapter's own board.
    const seated = new Set(Object.values(era.bookmark.owners || {}));
    const named = new Set();
    for (const m of src.matchAll(/(?:powerMod\(ctx, |opinion\(ctx, |endCourt\(ctx, |cedeNamed\(ctx, \[[^\]]*\], )'([A-Z]{3})'/g)) named.add(m[1]);
    for (const m of src.matchAll(/(?:endCourt|cedeNamed)\(ctx,[^)]*?'([A-Z]{3})'\)/g)) named.add(m[1]);
    const unseated = [...named].filter((t) => !seated.has(t));
    ok(!unseated.length, '  all ' + named.size + ' courts it names are on this board'
      + (unseated.length ? ' — UNSEATED: ' + unseated.join(', ') : ''));
  }
}

// ---------------------------------------------------------------------------
console.log('== every new card runs, and is not swallowed by its guard ==');
{
  // The check that would have caught the helper this package called and did
  // not define. A warning out of the package is a failure even though the
  // campaign survived it.
  const WATCH = /\[events_(931bce|732bce|597bce)_powers\]/;
  const realWarn = console.warn;
  let caught = [];
  let threw = 0; let guarded = 0; let ran = 0;
  console.warn = (...a) => { caught.push(a.join(' ')); };
  try {
    for (const [chapter, , prefix] of PACKAGES) {
      const cards = byChapter[chapter].events.filter((c) => c && typeof c.id === 'string' && c.id.startsWith(prefix));
      for (const ev of cards) {
        for (const chair of byChapter[chapter].bookmark.playableTags.map((t) => t.tag)) {
          const o = boot(chapter, 283, chair);
          caught = []; ran++;
          try { ev.options[0].effects(o.ctx); }
          catch (e) { threw++; realWarn('    THREW', chapter, ev.id, e && e.message); }
          const fromPool = caught.filter((w) => WATCH.test(w));
          if (fromPool.length) { guarded++; realWarn('    GUARD CAUGHT', chapter, ev.id, fromPool[0].slice(0, 200)); }
        }
      }
    }
  } finally { console.warn = realWarn; }
  ok(ran >= 90, ran + ' card firings exercised across the three packages');
  ok(threw === 0, 'no card threw (' + threw + ')');
  ok(guarded === 0, 'no card was silently swallowed by its guard (' + guarded + ')');

  {
    const o = boot('931bce', 283);
    const card = o.byId['ev931p_assyria_comes_back'];
    const saw = [];
    console.warn = (...a) => { saw.push(a.join(' ')); };
    try {
      const broken = { ...o.ctx, helpers: { ...o.ctx.helpers, adjust: undefined } };
      card.options[0].effects(broken);
    } finally { console.warn = realWarn; }
    ok(saw.some((w) => WATCH.test(w)),
      'a deliberately broken card body trips the guard detector'
        + (saw.length ? ' (' + saw[0].slice(0, 90) + ')' : ' — NOTHING WARNED'));
  }
}

console.log(failures ? 'FAILURES: ' + failures : 'ALL PASS');
process.exit(failures ? 1 : 0);
