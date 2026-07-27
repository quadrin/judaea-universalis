// Headless regression — SPEC §114: the kingdom that kept the Galilee.
//
// The 132 chapter tested for two outcomes with two predicates. `judaeaStands`
// wants Judaea sovereign AND holding Jerusalem; `romanAftermath` wants Rome
// holding Jerusalem AND Judaea controlling nothing at all. The commonest result
// of actually playing the chapter is neither: a revolt beaten out of the city
// but not out of the hills leaves a sovereign Jewish state of half a dozen
// Galilean provinces with a Roman Aelia down the road. A traced campaign ran
// 132 to 431 in exactly that position and drew not one card in three centuries
// that had anything to say about the Jewish-Roman question.
//
// What this suite really guards is that there are now three outcomes and they
// are mutually exclusive. A card that fired on two roads would be worse than
// the hole it was written for.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_132 } = await import(R + '/js/data/bookmark_132ce.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { EVENTS_132_GALILEE } = await import(R + '/js/data/events_132ce_galilee.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const EV = (ERAS.find((e) => e.bookmark.id === '132ce') || {}).events || [];
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const GAL = EVENTS_132_GALILEE.map((e) => e.id);
// The two branches this one sits between, by their most characteristic cards.
const STANDS_ARC = ['ev2_era_of_redemption', 'ev2_third_house', 'ev2_second_generation'];
const AFTERMATH_ARC = ['ev2_patriarchate_ends', 'ev2_gallus_revolt', 'ev2_fifteenth_bishop'];

function boot(seed = 7) {
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_132);
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
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_132, events: EV, playerTag: 'JUD', rngSeed: seed, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_132, events: EV, provinceMap });
  return { game, ctx, actions: gameActions(ctx) };
}
const byId = (id) => EV.find((e) => e && e.id === id);
const opens = (ctx, id) => {
  const e = byId(id);
  if (!e) return false;
  return !!((e.trigger && e.trigger(ctx)) || (e.when && e.when(ctx)));
};

console.log('== §114: the package is wired and well-formed ==');
{
  ok(EVENTS_132_GALILEE.length >= 6,
    'the third outcome has ' + EVENTS_132_GALILEE.length + ' cards');
  ok(GAL.every((id) => !!byId(id)),
    'and every one of them is in the 132 chain the engine plays');
  ok(EVENTS_132_GALILEE.every((e) => !(e.date && e.trigger)),
    'none is both a date and a trigger');
  ok(EVENTS_132_GALILEE.every((e) => e.trigger || e.when),
    'and every one is guarded, so none can fire on the other two roads');
  const span = EVENTS_132_GALILEE.map((e) => (e.date && e.date.y) || null).filter(Boolean);
  ok(Math.max(...span) >= 425,
    'the arc reaches 425, the year the other branch ends the patriarchate');
}

console.log('== §114: the third outcome is exactly the state that had nothing ==');
{
  const { game, ctx } = boot();
  const first = byId('ev2_g_kingdom_in_the_hills');
  game.date.y = 145;
  game.wars = [];
  for (const t of Object.values(game.tags)) if (t) t.atWarWith = [];
  // Rome takes the city; Judaea keeps the hills. The reported position.
  const jer = ctx.prov('Jerusalem');
  jer.owner = 'ROM'; jer.controller = 'ROM';
  let kept = 0;
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === 'JUD' && p !== jer) { p.controller = 'JUD'; kept++; }
  }
  ok(kept >= 2, 'Judaea keeps ' + kept + ' provinces and loses the city');
  ok(opens(ctx, 'ev2_g_kingdom_in_the_hills'), 'the third outcome opens');
  ok(!opens(ctx, 'ev2_era_of_redemption'),
    'and the victory branch does not — there is no Jerusalem to redeem');
  ok(!opens(ctx, 'ev2_patriarchate_ends'),
    'nor the defeat branch — there is a state, and it holds the office');

  // Take the city back and the third outcome must close.
  jer.owner = 'JUD'; jer.controller = 'JUD';
  ok(!opens(ctx, 'ev2_g_kingdom_in_the_hills'),
    'a Judaea that retakes Jerusalem leaves this branch at once');
  ok(opens(ctx, 'ev2_era_of_redemption'), 'and enters the one written for it');

  // Lose everything and it must close the other way.
  jer.owner = 'ROM'; jer.controller = 'ROM';
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.controller === 'JUD') p.controller = 'ROM';
  }
  ok(!opens(ctx, 'ev2_g_kingdom_in_the_hills'),
    'a Judaea that controls nothing is not a kingdom in the hills either');
  ok(opens(ctx, 'ev2_patriarchate_ends'), 'that is the aftermath branch, and it opens');
}

console.log('== §114: a war still running is not a settlement ==');
{
  // The whole premise is a revolt that STOPPED. A Judaea still fighting for the
  // city has not chosen a border; it is mid-sentence.
  const { game, ctx } = boot();
  game.date.y = 145;
  const jer = ctx.prov('Jerusalem');
  jer.owner = 'ROM'; jer.controller = 'ROM';
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === 'JUD' && p !== jer) p.controller = 'JUD';
  }
  game.wars = [{ attackers: ['JUD'], defenders: ['ROM'], id: 1 }];
  ok(!opens(ctx, 'ev2_g_kingdom_in_the_hills'),
    'while the war runs the branch stays shut');
  game.wars = [];
  ok(opens(ctx, 'ev2_g_kingdom_in_the_hills'), 'and opens when it stops');
}

console.log('== §114: three centuries of play reach 425 with something to say ==');
{
  const { game, ctx, actions } = boot();
  game.tags.JUD.ai = true;
  game.paused = false;
  const fired = new Set();
  for (let y = 0; y < 299; y++) for (let d = 0; d < 360; d++) {
    tickDay(ctx);
    let guard = 0;
    while (game.pendingEvents.length && guard++ < 50) {
      const pe = game.pendingEvents[0];
      const e = EV.find((x) => x && x.id === pe.eventId);
      fired.add(pe.eventId);
      try { actions.chooseEventOption(pe.instanceId, (e && e.aiOption) || 0); }
      catch (err) { game.pendingEvents.shift(); }
      game.paused = false;
    }
    if (game.paused) game.paused = false;
    if (game.over) game.over = false;
  }
  const ran = GAL.filter((id) => fired.has(id));
  const stands = STANDS_ARC.filter((id) => fired.has(id));
  const after = AFTERMATH_ARC.filter((id) => fired.has(id));
  // Whichever road this seed takes, the chapter must be ON one of them, and
  // must not be on two.
  const roads = [ran.length > 0, stands.length > 0, after.length > 0].filter(Boolean).length;
  ok(roads >= 1, 'the chapter finishes on a road (galilee ' + ran.length
    + ', stands ' + stands.length + ', aftermath ' + after.length + ')');
  ok(roads === 1, 'and on exactly one of them');
  if (ran.length) {
    ok(ran.length === GAL.length,
      'the third outcome runs end to end (' + ran.length + '/' + GAL.length + ')');
    ok(fired.has('ev2_g_what_the_office_was_for'),
      'and 425 says what the office was for instead of saying nothing');
    ok(!!game.flags.galileeKingdom, 'the chapter records which road it took');
  }
}

console.log(failures ? `smoke81: ${failures} FAIL` : 'smoke81: ALL PASS');
process.exit(failures ? 1 : 0);
