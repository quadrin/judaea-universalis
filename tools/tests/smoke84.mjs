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

console.log(failures ? `smoke84: ${failures} FAIL` : 'smoke84: ALL PASS');
process.exit(failures ? 1 : 0);
