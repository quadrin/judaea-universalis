// Headless regression — SPEC §240: the decades the chain skips.
//
// Nine packages, one per chapter, a hundred and twelve dated cards seated
// where each chain is thinnest. Nothing here is clever — which is exactly why
// it needs a suite, because a hundred and twelve cards of content fail
// silently in ways a chapter-shaped feature does not:
//
//   1. A package registered in the wrong chapter, or registered twice, or not
//      at all. `concat` does not complain about any of the three, and a
//      campaign that never sees a card looks identical to one whose card was
//      simply not its year yet.
//   2. A card outside its chapter's window. Dated cards are exempt from §121's
//      generation horizon, which is what lets the 132 package legitimately run
//      to 418 — and also what lets a typo in a year fire the Mishnah in 2170.
//   3. `aiOption` off the end of the options array. `maskIdx` clamps it, so
//      the card silently resolves on a course the author did not choose and
//      the divergence ledger records the wrong road not taken.
//   4. The Keepers' package writing to `playerTag`. That chapter seats TWO
//      chairs; a card addressed to `SAM` resolves silently inside the sim when
//      the player is Himyar, and effects written against the player's chair
//      would move the wrong ledger. This is the one real trap in the section
//      and it is checked from both ends.
//   5. Effects that throw. Every option is wrapped in `guard`, so a broken one
//      does not crash a campaign — it warns once and does nothing, for ever,
//      and nobody notices. The suite runs every option of every card against a
//      booted campaign and checks the realm is still there afterwards.
//   6. The seeded stream. §240 claims no card in the section touches it; that
//      claim is what keeps the balance harness comparable, and it is one line
//      to check and impossible to notice by eye.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { GENERIC_EVENTS } = await import(R + '/js/data/events_generic.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// chapter → [module, export, id prefix, last year the package may reach]
const PACKAGES = [
  ['167bce', 'events_167bce_years.js', 'EVENTS_167_YEARS', 'ev167y_', -60],
  ['67bce', 'events_67bce_years.js', 'EVENTS_67_YEARS', 'ev67y_', -20],
  ['40bce', 'events_40bce_years.js', 'EVENTS_40_YEARS', 'ev40y_', 66],
  ['66ce', 'events_66ce_years.js', 'EVENTS_66_YEARS', 'ev66y_', 132],
  ['132ce', 'events_132ce_years.js', 'EVENTS_132_YEARS', 'ev132y_', 430],
  ['351ce', 'events_351ce_years.js', 'EVENTS_351_YEARS', 'ev351y_', 439],
  ['529ce', 'events_529ce_years.js', 'EVENTS_529_YEARS', 'ev529y_', 614],
  ['614ce', 'events_614ce_years.js', 'EVENTS_614_YEARS', 'ev614y_', 700],
  ['1948ce', 'events_1948_years.js', 'EVENTS_1948_YEARS', 'ev48y_', 2005],
];

const loaded = new Map();
for (const [id, mod, exp] of PACKAGES) {
  const ns = await import(R + '/js/data/' + mod);
  loaded.set(id, ns[exp]);
}

function boot(id, tag) {
  const era = ERAS.find((e) => e.bookmark.id === id);
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
  const playerTag = tag || era.bookmark.playableTags[0].tag;
  const game = initGame({
    DEFINES, MAP_DATA, geom: null, bookmark: era.bookmark, events: era.events,
    playerTag, rngSeed: 161, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: null,
    bus: { emit() {}, on() { return () => {}; } },
    bookmark: era.bookmark, events: era.events, provinceMap,
  });
  return { game, ctx, era, playerTag };
}

// ---------------------------------------------------------------------------
console.log('== nine packages, each registered once, in its own chapter ==');
{
  let total = 0;
  for (const [id, , exp, prefix] of PACKAGES) {
    const pack = loaded.get(id);
    const era = ERAS.find((e) => e.bookmark.id === id);
    ok(Array.isArray(pack) && pack.length >= 12,
      exp + ': ' + (pack ? pack.length : 0) + ' cards');
    total += pack.length;
    const ids = era.events.filter(Boolean).map((c) => c.id);
    const missing = pack.filter((c) => ids.filter((i) => i === c.id).length !== 1);
    ok(!missing.length, '  every card is in ' + id + ' exactly once'
      + (missing.length ? ' (' + missing.slice(0, 3).map((c) => c.id).join(', ') + ')' : ''));
    // …and in NO other chapter. The prefix is per-package on purpose.
    const elsewhere = ERAS.filter((e) => e.bookmark.id !== id)
      .filter((e) => e.events.some((c) => c && typeof c.id === 'string' && c.id.startsWith(prefix)));
    ok(!elsewhere.length, '  and in no other chapter'
      + (elsewhere.length ? ' (' + elsewhere.map((e) => e.bookmark.id).join(', ') + ')' : ''));
  }
  ok(total === 112, 'a hundred and twelve cards across the nine (' + total + ')');
}

// ---------------------------------------------------------------------------
console.log('== appended after the chapter\'s chain and before the shared pools ==');
{
  // §223's ordering invariant: every card that was offered its month before
  // this section is offered it in the same order afterwards. The years package
  // therefore sits between the chapter's own chain and the shared pools.
  const sharedIds = new Set(GENERIC_EVENTS.map((c) => c && c.id).filter(Boolean));
  for (const [id, , , prefix] of PACKAGES) {
    const era = ERAS.find((e) => e.bookmark.id === id);
    const list = era.events;
    const mine = [];
    let firstShared = Infinity;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (!c || !c.id) continue;
      if (c.id.startsWith(prefix)) mine.push(i);
      else if (sharedIds.has(c.id) && i < firstShared) firstShared = i;
    }
    const chainEnd = Math.min(...mine);
    const ownChain = list.slice(0, chainEnd).filter((c) => c && c.id && !sharedIds.has(c.id)).length;
    ok(ownChain === chainEnd, id + ': the chapter\'s own chain comes first (' + chainEnd + ' cards)');
    ok(Math.max(...mine) < firstShared, '  and the years package is before the shared pool');
  }
}

// ---------------------------------------------------------------------------
console.log('== dated, windowed, historical, and answerable ==');
{
  const everyId = new Map();
  for (const era of ERAS) {
    for (const c of era.events) {
      if (!c || !c.id) continue;
      if (!everyId.has(c.id)) everyId.set(c.id, new Set());
      everyId.get(c.id).add(era.bookmark.id);
    }
  }
  for (const [id, , , prefix, lastYear] of PACKAGES) {
    const pack = loaded.get(id);
    const era = ERAS.find((e) => e.bookmark.id === id);
    const start = era.bookmark.startDate.y;
    const bad = [];
    for (const c of pack) {
      if (!c.date || !Number.isFinite(c.date.y) || !(c.date.m >= 1 && c.date.m <= 12)) bad.push(c.id + ':date');
      else if (c.date.y < start || c.date.y > lastYear) bad.push(c.id + ':' + c.date.y);
      if (typeof c.trigger === 'function') bad.push(c.id + ':trigger');
      if (typeof c.historical !== 'string' || c.historical.length < 20) bad.push(c.id + ':historical');
      if (!Array.isArray(c.options) || c.options.length < 2) bad.push(c.id + ':options');
      const ai = c.aiOption | 0;
      if (!Number.isFinite(c.aiOption) || ai < 0 || ai >= (c.options || []).length) bad.push(c.id + ':aiOption');
      for (const o of c.options || []) {
        if (!o || typeof o.effects !== 'function' || !o.label || !o.tooltip) bad.push(c.id + ':opt');
      }
      if (!c.id.startsWith(prefix)) bad.push(c.id + ':prefix');
    }
    ok(!bad.length, id + ': every card dated inside ' + start + '–' + lastYear
      + ', with a recorded course that exists' + (bad.length ? ' (' + bad.slice(0, 4).join(', ') + ')' : ''));
    const shared = pack.filter((c) => (everyId.get(c.id) || new Set()).size !== 1);
    ok(!shared.length, '  and no id shared with any other chapter'
      + (shared.length ? ' (' + shared.map((c) => c.id).join(', ') + ')' : ''));
  }
}

// ---------------------------------------------------------------------------
console.log('== nothing in the section draws from the seeded stream ==');
{
  // §240's claim, and the reason the balance harness stays comparable: no card
  // here declares `chance` or `roll`, and no option's effects advance the RNG.
  const declared = [];
  for (const [id] of PACKAGES) {
    for (const c of loaded.get(id)) {
      if (Number.isFinite(c.chance) || c.roll === true || c.once === false) declared.push(c.id);
    }
  }
  ok(!declared.length, 'no card declares a chance, a roll or a repeat'
    + (declared.length ? ' (' + declared.slice(0, 4).join(', ') + ')' : ''));

  const moved = [];
  for (const [id] of PACKAGES) {
    const w = boot(id);
    for (const c of loaded.get(id)) {
      for (const o of c.options) {
        const before = w.game.rngState;
        try { o.effects(w.ctx); } catch (e) { /* caught below by the run check */ }
        if (w.game.rngState !== before) { moved.push(c.id); break; }
      }
    }
  }
  ok(!moved.length, 'and no option advances the stream'
    + (moved.length ? ' (' + moved.slice(0, 4).join(', ') + ')' : ''));
}

// ---------------------------------------------------------------------------
console.log('== every option of every card runs clean and leaves a realm ==');
{
  for (const [id] of PACKAGES) {
    const pack = loaded.get(id);
    let ran = 0;
    const threw = [];
    for (const c of pack) {
      for (let i = 0; i < c.options.length; i++) {
        const w = boot(id);
        try { c.options[i].effects(w.ctx); ran++; } catch (e) { threw.push(c.id + '#' + i + ': ' + (e && e.message)); }
        const t = w.game.tags[w.playerTag];
        if (!t || t.alive === false) threw.push(c.id + '#' + i + ': the realm is gone');
      }
    }
    ok(!threw.length, id + ': ' + ran + ' options run clean'
      + (threw.length ? ' (' + threw.slice(0, 3).join(' | ') + ')' : ''));
  }
}

// ---------------------------------------------------------------------------
console.log('== the Keepers\' package names its own tags, not the player\'s chair ==');
{
  // The trap this section could most easily have walked into. 529 seats two
  // chairs; a card addressed to SAM resolves SILENTLY inside the sim when the
  // player is Himyar, so effects written against `playerTag` would move the
  // wrong ledger. Both halves are checked: the audience is never 'player',
  // and running a mountain card in a Himyar campaign leaves Himyar untouched.
  const pack = loaded.get('529ce');
  const audiences = new Set(pack.map((c) => c.forTag));
  ok(!audiences.has('player') && !audiences.has('both'),
    'every card names SAM or HMY (' + [...audiences].sort().join(', ') + ')');
  ok(pack.some((c) => c.forTag === 'HMY') && pack.some((c) => c.forTag === 'SAM'),
    '  and both chairs are addressed');

  const w = boot('529ce', 'HMY');
  const hmy = w.game.tags.HMY;
  const sam = w.game.tags.SAM;
  const before = { t: hmy.treasury, mods: (hmy.modifiers || []).length };
  const samBefore = (sam.modifiers || []).length;
  for (const c of pack.filter((x) => x.forTag === 'SAM')) c.options[0].effects(w.ctx);
  ok(hmy.treasury === before.t && (hmy.modifiers || []).length === before.mods,
    '  a mountain card answered in a Himyar campaign leaves Himyar\'s ledger alone');
  ok((sam.modifiers || []).length > samBefore, '  and lands on the mountain');
}

// ---------------------------------------------------------------------------
console.log('== the road the campaign is not on retires ==');
{
  // Three cards presume the House fell (SPEC §75). On the Second Kingdom road
  // `templeBurned` is never set, and `when` has to say no — otherwise the
  // chapter fires the sicarii of Cyrene at a country whose altar is standing.
  const gated = loaded.get('66ce').filter((c) => typeof c.when === 'function');
  ok(gated.length === 3, 'three cards carry a when gate (' + gated.length + ')');
  const w = boot('66ce');
  const shut = gated.filter((c) => c.when(w.ctx) === false);
  ok(shut.length === gated.length, '  all shut while the House stands');
  w.game.flags.templeBurned = true;
  const open = gated.filter((c) => c.when(w.ctx) === true);
  ok(open.length === gated.length, '  and all open once it has fallen');
  ok(gated.map((c) => c.id).sort().join(',')
    === 'ev66y_the_emperor_who_said_yes,ev66y_the_road_the_shekel_takes,ev66y_the_weavers_in_the_desert',
    '  and they are the three the section names');
}

// ---------------------------------------------------------------------------
console.log('== the two flags the section shares on purpose, and the one it does not ==');
{
  // `davidsTombOpened` is shared with the 167 chapter BECAUSE §85's doctrine
  // table reads it: the act is the same act and moves the zeal needle the same
  // way. `reckoningPublished` is NOT shared — that is §235's own marker for
  // the card of 358 and it gates a mission check, so the 351 package's
  // calendar card at 429 keeps its own key.
  const fs = await import('fs');
  const forty = fs.readFileSync(R + '/js/data/events_40bce_years.js', 'utf8');
  ok(/setFlag\(ctx, 'davidsTombOpened'/.test(forty),
    'the 40 BCE tomb card sets the key §85 already reads');
  const doctrine = fs.readFileSync(R + '/js/sim/doctrine.js', 'utf8');
  ok(/davidsTombOpened/.test(doctrine), '  and the doctrine table still reads it');
  const three51 = fs.readFileSync(R + '/js/data/events_351ce_years.js', 'utf8');
  ok(!/setFlag\(ctx, 'reckoningPublished'/.test(three51),
    'the 351 package does not set §235\'s calendar marker');
  ok(/setFlag\(ctx, 'calendarTablePublished'/.test(three51), '  it sets its own');
}

console.log(failures ? failures + ' FAILURES' : 'smoke161: ALL PASS');
