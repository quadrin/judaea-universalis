// Headless regression — SPEC §89: the road not taken.
//
// The game generated an alternate history every time it was played and never
// showed it to anyone. This suite holds the ledger that does: that a spine
// event resolved against its historical course is recorded with both halves,
// that agreeing with the record records nothing, that a §70 notice is never
// counted as a choice the player made, that texture stays out, that a
// scripted chapter retired by a changed world is logged as a page that never
// got written, that the live alternate strands are named — and that an older
// save with no ledger simply starts one.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { EVENTS_167 } = await import(R + '/js/data/events_167bce.js');
const { initGame, makeCtx, reviveGame, gameActions, simHelpers: helpers } =
  await import(R + '/js/sim/init.js');
const { fireEvent, resolveEventOption, checkDateEvents } = await import(R + '/js/sim/events.js');
const { divergenceView, divergenceSummary, historicalOption, liveStrands, STRANDS } =
  await import(R + '/js/sim/divergence.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const fakeGeom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
const bus = { emit() {}, on() { return () => {}; } };

function fresh(events = []) {
  const g = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_167, events,
    playerTag: 'HAS', rngSeed: 9,
  });
  const ctx = makeCtx({
    game: g, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: BOOKMARK_167, events,
  });
  ctx.dynEvents = new Map();
  return { g, ctx };
}
// Resolve the pending card the fire just queued.
function answer(ctx, g, idx) {
  const pe = g.pendingEvents[g.pendingEvents.length - 1];
  resolveEventOption(ctx, pe.instanceId, idx);
}
const mkEvent = (over) => ({
  id: 'test_ev', title: 'A Turning', desc: 'x', forTag: 'player', major: true, aiOption: 0,
  options: [
    { label: 'What the chronicles say', effects() {} },
    { label: 'What we did instead', effects() {} },
  ],
  ...over,
});

console.log('== the content carries the historical record already ==');
{
  const { ctx } = fresh();
  const annotated = EVENTS_167.filter((e) => typeof e.historical === 'string');
  ok(annotated.length > 0, 'the 167 BCE package annotates its pivotal turnings');
  ok(annotated.every((e) => e.historical.length > 40),
    'and every annotation says something (' + annotated.length + ' events)');
  const gerizim = EVENTS_167.find((e) => e.id === 'ev_gerizim');
  ok(/Hyrcanus destroyed the temple/.test(gerizim.historical),
    'the record for Gerizim reads: ' + gerizim.historical.slice(0, 48) + '…');
  ok(historicalOption(ctx, gerizim) === 0, 'and aiOption names which option that was');
}

console.log('== choosing otherwise is recorded with both halves ==');
{
  const ev = mkEvent();
  const { g, ctx } = fresh([ev]);
  fireEvent(ctx, ev);
  answer(ctx, g, 1);
  const v = divergenceView(ctx);
  ok(v.count === 1, 'one turning recorded');
  const d = v.entries[0];
  ok(d.histLabel === 'What the chronicles say', 'the record\'s half is the aiOption label');
  ok(d.chose === 'What we did instead', 'ours is the label we picked');
  ok(d.title === 'A Turning' && d.y === g.date.y, 'with the title and the date it happened');
  ok(divergenceSummary(ctx).indexOf('1 turning') >= 0, 'the summary counts it');
}

console.log('== agreeing with the record records nothing ==');
{
  const ev = mkEvent();
  const { g, ctx } = fresh([ev]);
  fireEvent(ctx, ev);
  answer(ctx, g, 0);
  ok(divergenceView(ctx).count === 0, 'the historical course is not a divergence');
  ok(/followed the record/.test(divergenceSummary(ctx)), 'and the summary says so');
}

console.log('== an authored line outranks the option label ==');
{
  const ev = mkEvent({ historical: 'The record says the altar came down, and it stayed down.' });
  const { g, ctx } = fresh([ev]);
  fireEvent(ctx, ev);
  answer(ctx, g, 1);
  const d = divergenceView(ctx).entries[0];
  ok(/altar came down/.test(d.historical), 'the ledger prints the authored record');
  ok(d.histLabel === 'What the chronicles say', 'and still keeps the label underneath');
}

console.log('== texture stays out of the ledger ==');
{
  const ev = mkEvent({ major: false });
  const { g, ctx } = fresh([ev]);
  fireEvent(ctx, ev);
  answer(ctx, g, 1);
  ok(divergenceView(ctx).count === 0, 'a non-major event with no historical line is not the spine');
  // ...unless the author insists.
  const ev2 = mkEvent({ id: 'test_ev2', major: false, historical: 'The record says otherwise.' });
  const { g: g2, ctx: ctx2 } = fresh([ev2]);
  fireEvent(ctx2, ev2);
  answer(ctx2, g2, 1);
  ok(divergenceView(ctx2).count === 1, 'an explicit historical line puts it in regardless');
}

console.log('== a §70 notice is not a choice ==');
{
  // A foreign court's decision arrives as a one-button notice; acknowledging
  // it must never be recorded as this realm having decided anything.
  const ev = mkEvent({ forTag: 'both', decider: 'SEL', aiOption: 0 });
  const { g, ctx } = fresh([ev]);
  fireEvent(ctx, ev);
  const pe = g.pendingEvents[g.pendingEvents.length - 1];
  ok(pe.notice === true, 'the card arrived as a notice');
  resolveEventOption(ctx, pe.instanceId, 1); // the UI reports whatever it likes
  ok(divergenceView(ctx).count === 0, 'acknowledging Antioch\'s decision is not our divergence');
}

console.log('== one entry per event, however often it is answered ==');
{
  const ev = mkEvent({ once: false });
  const { g, ctx } = fresh([ev]);
  fireEvent(ctx, ev);
  answer(ctx, g, 1);
  fireEvent(ctx, ev);
  answer(ctx, g, 1);
  ok(divergenceView(ctx).count === 1, 'a repeatable turning is still one line in the ledger');
}

console.log('== a chapter that never came ==');
{
  const ev = mkEvent({
    id: 'test_dated', date: { y: -166, m: 1 }, major: true,
    when: () => false, // its month arrives in a world it no longer fits
  });
  const { g, ctx } = fresh([ev]);
  g.date.y = -166; g.date.m = 2;
  checkDateEvents(ctx);
  const v = divergenceView(ctx);
  ok(v.retired.length === 1, 'the retired chapter is logged');
  ok(/world it needed/.test(v.retired[0].why), 'with the reason it never fired');
  ok(g.firedEvents[ev.id], 'and it is marked spent, exactly as §75 left it');
}

console.log('== the worlds history never wrote ==');
{
  const { g, ctx } = fresh();
  ok(liveStrands(ctx).length === 0, 'a fresh campaign is on the rails');
  helpers.setFlag(ctx, 'yokeReversed', true);
  helpers.setFlag(ctx, 'diademRefused', true);
  const live = liveStrands(ctx);
  ok(live.length === 2, 'two strands are live');
  ok(live.every((s) => s.name && s.blurb && s.era), 'each names itself, its era, and what it means');
  ok(/worlds history never wrote/.test(divergenceSummary(ctx)), 'the summary names them');
  helpers.setFlag(ctx, 'yokeReversed', false);
  ok(liveStrands(ctx).length === 1, 'a cleared flag is not a live strand');
  // Every strand flag must be one the content actually sets, or the page lies.
  ok(STRANDS.every((s) => typeof s.flag === 'string' && s.flag.length > 0),
    'every strand is keyed on a real flag');
}

console.log('== the view is renderable and ordered ==');
{
  const ev1 = mkEvent({ id: 'a' });
  const ev2 = mkEvent({ id: 'b' });
  const { g, ctx } = fresh([ev1, ev2]);
  g.date.y = -160;
  fireEvent(ctx, ev2); answer(ctx, g, 1);
  g.date.y = -165;
  fireEvent(ctx, ev1); answer(ctx, g, 1);
  const v = gameActions(ctx).getDivergence();
  ok(v.entries.length === 2, 'both turnings are there');
  ok(v.entries[0].y === -165 && v.entries[1].y === -160, 'and they are in the order they happened');
  ok(Array.isArray(v.axes) && v.axes.length === 4, 'the page carries the four axes');
  ok(typeof v.epithet === 'string', 'and the realm\'s epithet');
}

console.log('== an older save simply starts a ledger ==');
{
  const ev = mkEvent();
  const { g, ctx } = fresh([ev]);
  fireEvent(ctx, ev);
  answer(ctx, g, 1);
  const old = JSON.parse(JSON.stringify(g));
  const count = old.divergences.length;
  delete old.divergences;
  delete old.retiredChapters;
  const revived = reviveGame(old);
  ok(Array.isArray(revived.divergences) && revived.divergences.length === 0,
    'the missing ledger is created empty, not reconstructed from nothing');
  const ctxOld = makeCtx({
    game: revived, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: BOOKMARK_167, events: [ev],
  });
  ok(divergenceView(ctxOld).count === 0, 'the page renders on an old save');
  ok(count === 1, 'and the new save had recorded its turning');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
