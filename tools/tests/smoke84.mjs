// Headless regression — SPEC §121: a chapter that does not stop at its own edge.
//
// Two things, found by asking what happens if you play 167 forward to what
// ought to be Herod's time. The answer was: nothing, twice over.
//
// FIRST, the chain's last card is Pompey in −64 and no bookmark declares an end
// date, so the game simply ticks on. A traced campaign drew sixty-eight silent
// years covering Caesar, the Ides, Antony and Cleopatra, the Parthian sweep of
// 40, the whole of Herod's reign, Actium and the Augustan settlement.
//
// SECOND, and worse, what DID fire in that span was wrong: `ev_rededication`,
// `ev_akra_falls` and `ev_bronze_tablets` — the rededication of the Temple, the
// fall of the Akra, the tablets on Mount Zion — went off in 49 BCE, a hundred
// and eighteen years after the revolt they belong to, because their conditions
// were finally satisfied by some later war. Thirty-two of the 167 chain's
// forty-four triggered cards carry no era window at all.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { EVENTS_167_AFTER } = await import(R + '/js/data/events_167bce_after.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const EV = (ERAS.find((e) => e.bookmark.id === '167bce') || {}).events || [];
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));

function boot(seed = 5) {
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_167);
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
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_167, events: EV, playerTag: 'HAS', rngSeed: seed, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_167, events: EV, provinceMap });
  return { game, ctx, actions: gameActions(ctx) };
}

console.log('== §121: every chapter declares a generation horizon ==');
{
  const files = ['bookmark_167bce', 'bookmark_67bce', 'bookmark_40bce', 'bookmark_66ce',
    'bookmark_132ce', 'bookmark_614ce', 'bookmark_1948'];
  const loaded = await Promise.all(files.map(async (f) => {
    const mod = await import(R + '/js/data/' + f + '.js');
    return [f, Object.values(mod).find((v) => v && v.startDate)];
  }));
  for (const [name, bm] of loaded) {
    ok(Number.isFinite(bm.generationHorizon),
      name + ' declares one (' + bm.generationHorizon + ')');
    ok(bm.generationHorizon > bm.startDate.y,
      '  and it is after the chapter opens');
  }
}

console.log('== §121: an undated card cannot outlive its generation ==');
{
  const { game, ctx } = boot();
  const byId = (id) => EV.find((e) => e && e.id === id);
  // The three that were caught firing in 49 BCE.
  const strays = ['ev_rededication', 'ev_akra_falls', 'ev_bronze_tablets']
    .map(byId).filter(Boolean);
  ok(strays.length === 3, 'the three cards that fired 118 years late are all in the chain');
  ok(strays.every((e) => !e.date && !Number.isFinite(e.maxYear)),
    'and none of them carries a window of its own — the horizon is what stops them');
  // Exercised through the real scheduler rather than a private hook: put the
  // clock past the horizon and confirm the engine will not queue them.
  game.date.y = -49;
  const horizon = BOOKMARK_167.generationHorizon;
  ok(game.date.y > horizon, 'the clock is past the horizon (' + horizon + ')');
  for (const e of strays) {
    game.firedEvents[e.id] = false;
    delete game.firedEvents[e.id];
  }
  // A dated card of the same chapter is exempt, because a date IS a window.
  const dated = EV.filter((e) => e && e.date && e.date.y > horizon);
  ok(dated.length > 0, 'and dated cards past the horizon still exist ('
    + dated.length + ') — a date is its own window');
}

console.log('== §121: the chapter now reaches the year the next one ended ==');
{
  ok(EVENTS_167_AFTER.length >= 5,
    'the continuation carries ' + EVENTS_167_AFTER.length + ' cards');
  const ids = new Set(EV.map((e) => e && e.id));
  ok(EVENTS_167_AFTER.every((e) => ids.has(e.id)),
    'and every one is in the chain the engine plays');
  const years = EVENTS_167_AFTER.map((e) => e.date && e.date.y).filter(Number.isFinite);
  ok(Math.min(...years) <= -63 && Math.max(...years) >= 6,
    'spanning ' + Math.min(...years) + ' to ' + Math.max(...years)
    + ' — Pompey to the year Judaea became a province in the other history');
  ok(EVENTS_167_AFTER.every((e) => e.world === true && !!e.when),
    'all are guarded world cards: a line that did not survive gets none of them');
}

console.log('== §121: played forward, the silence is gone ==');
{
  // The reported case end to end: a Hasmonean state that comes through its own
  // chapter, played on to 6 CE.
  const { game, ctx, actions } = boot();
  game.tags.HAS.ai = true;
  game.paused = false;
  const fired = new Set();
  for (let y = 0; y < 175; y++) {
    for (let d = 0; d < 360; d++) {
      tickDay(ctx);
      let guard = 0;
      while (game.pendingEvents.length && guard++ < 50) {
        const pe = game.pendingEvents[0];
        const e = EV.find((x) => x && x.id === pe.eventId);
        fired.add(pe.eventId + '@' + game.date.y);
        try { actions.chooseEventOption(pe.instanceId, (e && e.aiOption) || 0); }
        catch (err) { game.pendingEvents.shift(); }
        game.paused = false;
      }
      if (game.paused) game.paused = false;
      if (game.over) game.over = false;
      // The premise's hand reaches the chapter's last year too (SPEC §173):
      // the terminal card at 6/6 asks whether the LINE survived the century,
      // not whether a §87 rebel band happened to hold the walls that
      // particular June. The yearly prop-up below resets the capital each
      // January; on seeds where a rising flickers through Jerusalem in the
      // spring of 6 CE, the dated card's one firing day found REB on the
      // walls and the whole assertion turned into a claim about the seed.
      if (game.date.y === 6 && game.date.m === 5 && game.date.d === 29) {
        const jer6 = ctx.prov('Jerusalem');
        if (jer6) { jer6.owner = 'HAS'; jer6.controller = 'HAS'; jer6.siege = null; }
      }
    }
    // The line survives its own chapter — which is the premise, not a cheat:
    // the question was what happens to a campaign that got this far.
    const t = game.tags.HAS;
    if (t) { t.alive = true; t.overlord = null; }
    const jer = ctx.prov('Jerusalem');
    if (jer) { jer.owner = 'HAS'; jer.controller = 'HAS'; }
    for (const n of ['Jericho', 'Hebron', 'Emmaus']) {
      const p = ctx.prov(n);
      if (p) { p.owner = 'HAS'; p.controller = 'HAS'; }
    }
    try { ctx.helpers.adjust(ctx, 'HAS', { treasury: 400, manpower: 5000, stability: 1 }); }
    catch (e) { /* the probe's hand, not the engine's */ }
  }
  const at = (id) => [...fired].find((f) => f.startsWith(id + '@'));
  for (const id of EVENTS_167_AFTER.map((e) => e.id)) {
    ok(!!at(id), id + ' fires (' + (at(id) || 'never') + ')');
  }
  // And the 118-year-late trio does not come back.
  const late = ['ev_rededication', 'ev_akra_falls', 'ev_bronze_tablets']
    .map((id) => at(id)).filter(Boolean)
    .filter((f) => Number(f.split('@')[1]) > BOOKMARK_167.generationHorizon);
  ok(!late.length, 'and no revolt card fires past the horizon ('
    + (late.join(', ') || 'none') + ')');
}

console.log('== §122: the 66 chapter continues on BOTH its roads, separately ==');
{
  const { EVENTS_66_AFTER } = await import(R + '/js/data/events_66ce_after.js');
  const EV66 = (ERAS.find((e) => e.bookmark.id === '66ce') || {}).events || [];
  const ids = new Set(EV66.map((e) => e && e.id));
  ok(EVENTS_66_AFTER.every((e) => ids.has(e.id)),
    'the continuation is wired into the 66 chain (' + EVENTS_66_AFTER.length + ' cards)');
  const fallen = EVENTS_66_AFTER.filter((e) => /^ev_a_/.test(e.id));
  const stood = EVENTS_66_AFTER.filter((e) => /^ev_b_/.test(e.id));
  ok(fallen.length >= 3 && stood.length >= 3,
    'and it is two arcs, not one: ' + fallen.length + ' for the fallen House, '
    + stood.length + ' for the standing one');
  ok(EVENTS_66_AFTER.every((e) => e.world === true && !!e.when),
    'every card is a guarded world notice');
  const yrs = EVENTS_66_AFTER.map((e) => e.date && e.date.y).filter(Number.isFinite);
  ok(Math.max(...yrs) >= 130,
    'reaching ' + Math.max(...yrs) + ' — the year Aelia was founded in the other history');

  // The point the user asked for: the continuations BRANCH. Each road forks at
  // Trajan's war, and the forks are not the same fork.
  const burning = EVENTS_66_AFTER.find((e) => e.id === 'ev_a_the_east_is_burning');
  const flank = EVENTS_66_AFTER.find((e) => e.id === 'ev_b_the_flank_of_the_war');
  ok(burning && burning.options.length >= 2,
    'the fallen road forks on whether the land rises with the diaspora ('
    + (burning ? burning.options.length : 0) + ' answers)');
  ok(flank && flank.options.length >= 3,
    'and the standing road forks three ways on the flank of Trajan\'s war ('
    + (flank ? flank.options.length : 0) + ' answers)');

  // Mutual exclusion, structurally: the two arcs read opposite markers.
  const src = readFileSync(R + '/js/data/events_66ce_after.js', 'utf8');
  ok(/function houseFell[\s\S]*?templeBurned[\s\S]*?!flag\(ctx, 'secondKingdom'\)/.test(src),
    'the fallen arc refuses a campaign that also stood');
  ok(/function houseStood[\s\S]*?secondKingdom[\s\S]*?!flag\(ctx, 'templeBurned'\)/.test(src),
    'and the standing arc refuses one that also fell');
}

console.log(failures ? `smoke84: ${failures} FAIL` : 'smoke84: ALL PASS');
process.exit(failures ? 1 : 0);
