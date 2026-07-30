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
//
// `ev2_fifteenth_bishop` used to be in the aftermath list and is not a marker
// for this. It is dated January 136 and gated on `romanAftermath` AT THAT
// DATE — it asks whether Rome held Aelia in the winter after the revolt, and
// it is about the Christian see rather than about Judaea at all. The galilee
// road is a fourth-century development, so a run can perfectly well have Rome
// holding Aelia in 136 and a Jewish Galilee two centuries later, and one seed
// (11) does exactly that once §163–§169 move the stream. Both of these two
// markers are fourth-century and genuinely exclusive; that one never was.
const STANDS_ARC = ['ev2_era_of_redemption', 'ev2_third_house', 'ev2_second_generation'];
const AFTERMATH_ARC = ['ev2_patriarchate_ends', 'ev2_gallus_revolt'];

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
// This is a THREE-CENTURY all-AI run, and one seed of it is a coin toss, not a
// contract. It used to assert the full six-card arc on seed 7 alone, which
// passed because seed 7 happened to be a lucky draw on the map of the day —
// measured on the pre-§160 tree, seed 11 takes a different road entirely and
// fires 0 of 6. §160 added 133 cells to the atlas, which moves the RNG stream
// every province-ordered draw rides on, and seed 7 stopped being lucky: JUD
// ends smaller and is at war with Rome on the two gate dates, so
// `judaeaEndures` shuts the last two cards. That is the chapter working.
//
// So sample instead of pinning. What the road has to be is RELIABLE, and a
// majority of independent seeds is a claim about the road; one seed is a claim
// about the seed. Measured at v6.8: 5 of 6 seeds run the arc end to end.
// Six, not three. Three was my own mistake: this assertion ESTIMATES A RATE —
// what fraction of independent three-century runs carry the arc to 425 — and
// three samples cannot estimate a rate near two thirds. Measured over six
// seeds the road is taken 6/6 and completed 4/6; the triple [1,2,7] happened
// to hold two of the two incompletions, so it read 1/3 and looked like a
// regression. The incompletion is the chapter working: the missing card is
// always `ev2_g_what_the_office_was_for`, whose `judaeaEndures` gate excludes
// a live Judaea-Rome war, and on those seeds one is running in May 425.
const SEEDS = [1, 2, 3, 5, 7, 11];
{
  const runs = SEEDS.map((seed) => {
    const { game, ctx, actions } = boot(seed);
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
    return {
      seed,
      ran: GAL.filter((id) => fired.has(id)),
      stands: STANDS_ARC.filter((id) => fired.has(id)),
      after: AFTERMATH_ARC.filter((id) => fired.has(id)),
      afterIds: AFTERMATH_ARC.filter((id) => fired.has(id)),
      standIds: STANDS_ARC.filter((id) => fired.has(id)),
      office: fired.has('ev2_g_what_the_office_was_for'),
      flag: !!game.flags.galileeKingdom,
    };
  });

  // Every seed, every time: the chapter lands on exactly one road. This part
  // was never luck, and it stays per-seed.
  for (const r of runs) {
    const roads = [r.ran.length > 0, r.stands.length > 0, r.after.length > 0].filter(Boolean).length;
    ok(roads >= 1, `seed ${r.seed} finishes on a road (galilee ${r.ran.length}, `
      + `stands ${r.stands.length}, aftermath ${r.after.length})`);
    ok(roads === 1, `  and on exactly one of them`
      + (roads !== 1 ? ` [galilee ${r.ran.length}, stands ${JSON.stringify(r.standIds)}, aftermath ${JSON.stringify(r.afterIds)}]` : ''));
    // A seed that took the Galilee road must have marked it, whether or not it
    // got all the way to 425 — the marker is what makes a road a road.
    if (r.ran.length) ok(r.flag, `  and records which road it took`);
  }

  const took = runs.filter((r) => r.ran.length > 0);
  const whole = took.filter((r) => r.ran.length === GAL.length && r.office);
  ok(took.length > 0,
    `the Galilee road is reachable (${took.length}/${SEEDS.length} seeds took it)`);
  // The invariant that does NOT depend on the draw: once the road is entered
  // the arc never breaks IN THE MIDDLE. State it as what it actually is rather
  // than as a count, because a count was wrong twice.
  //
  // Four of the six cards carry a year WINDOW (140-200, 163-230, 200-270,
  // 250-340) and fire whenever the road is open inside it. Two carry a fixed
  // DATE — April 390 and May 425 — and both are gated on `judaeaEndures`,
  // which excludes a live Judaea-Rome war on that exact month. A run at war on
  // both dates legitimately misses both, and seed 5 does: measured after
  // SPEC §163-§169 moved the stream it plays 4/6, and the two it lacks are
  // exactly those two. The old assertion allowed "all but the final card",
  // which quietly assumed only ONE of the tail cards was gated, and read a
  // correct run as a content bug.
  //
  // So: every WINDOWED card must fire, and the dated tail may do as the world
  // allows. A break anywhere in the windowed run is the content bug this is
  // here to catch, and it would now say which card.
  const dated = new Set(EVENTS_132_GALILEE.filter((e) => e && e.date).map((e) => e.id));
  const windowed = GAL.filter((id) => !dated.has(id));
  const broken = took.filter((r) => windowed.some((id) => !r.ran.includes(id)));
  for (const b of broken) {
    console.log('    [seed ' + b.seed + ' missing windowed: '
      + windowed.filter((id) => !b.ran.includes(id)).join(', ') + ']');
  }
  ok(broken.length === 0,
    `and once entered it never breaks in the middle — every run plays all ${windowed.length} windowed cards `
    + `(${runs.map((r) => r.seed + ':' + r.ran.length).join(' ')})`);
  const wrongMiss = took.filter((r) => r.ran.length === GAL.length - 1
    && r.ran.includes('ev2_g_what_the_office_was_for'));
  ok(wrongMiss.length === 0,
    '  and a short run is short by the 425 card, not by one from the middle');
  ok(whole.length * 2 >= took.length,
    `and it runs end to end on most of them — 425 says what the office was for `
    + `(${whole.length}/${took.length}: `
    + took.map((r) => `seed ${r.seed} ${r.ran.length}/${GAL.length}`).join(', ') + ')');
}

console.log(failures ? `smoke81: ${failures} FAIL` : 'smoke81: ALL PASS');
process.exit(failures ? 1 : 0);
