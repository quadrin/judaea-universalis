// Headless regression — SPEC §70: a foreign court's decision is not ours to
// make. An event carrying `decider: TAG` fired for a player who is NOT that
// tag arrives as a notice: the pending entry pins the decider's own
// (aiOption) course, the modal gets a single acknowledging button, and no
// button the UI reports can change what happens. The deciding player keeps
// the full choice; a decider erased from the world (formables) falls back to
// the full choice; a pending notice survives a save round-trip.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, reviveGame } = await import(R + '/js/sim/init.js');
const { fireEvent, resolveEventOption } = await import(R + '/js/sim/events.js');

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
const busEvents = [];
const bus = { emit(ev, p) { busEvents.push({ ev, p }); }, on() { return () => {}; } };

function boot(playerTag, events) {
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_66);
  const g = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_66, events,
    playerTag, rngSeed: 48, provinceMap,
  });
  const ctx = makeCtx({
    game: g, DEFINES, MAP_DATA, geom: fakeGeom, bus,
    bookmark: BOOKMARK_66, events, provinceMap,
  });
  return { g, ctx };
}

const mkEvent = (over) => ({
  id: 'ev_test_decider',
  title: 'What Rome Should Do',
  desc: 'A dispatch from a court that is not ours.',
  forTag: 'both',
  decider: 'ROM',
  aiOption: 1,
  options: [
    { label: 'The soft course', effects: (ctx) => ctx.helpers.setFlag(ctx, 'testSoft', true) },
    { label: 'The hard course', effects: (ctx) => ctx.helpers.setFlag(ctx, 'testHard', true) },
  ],
  ...over,
});

console.log('== a foreign decider turns the card into a notice ==');
{
  const ev = mkEvent({});
  const { g, ctx } = boot('JUD', [ev]);
  busEvents.length = 0;
  fireEvent(ctx, ev);
  const pe = g.pendingEvents[0];
  ok(!!pe && pe.notice === true && pe.optIdx === 1 && pe.decider === 'ROM',
    'the pending entry pins the notice and the decider\'s course (aiOption 1)');
  const emitted = busEvents.find((b) => b.ev === 'event');
  ok(!!emitted && emitted.p.notice === true && emitted.p.optIdx === 1 && emitted.p.decider === 'ROM',
    'the bus payload carries notice, course, and decider for the modal');
  // The UI can only ever report the single button — but even a hostile idx
  // cannot steal the choice for the player.
  resolveEventOption(ctx, pe.instanceId, 0);
  ok(g.flags.testHard === true && !g.flags.testSoft,
    'acknowledging applies the decider\'s own course, whatever idx the UI reports');
}

console.log('== the deciding court keeps its full choice ==');
{
  const ev = mkEvent({});
  const { g, ctx } = boot('ROM', [ev]);
  fireEvent(ctx, ev);
  const pe = g.pendingEvents[0];
  ok(!!pe && !pe.notice, 'playing Rome, the same card is a real choice');
  resolveEventOption(ctx, pe.instanceId, 0);
  ok(g.flags.testSoft === true && !g.flags.testHard, 'and the player\'s pick (option 0) is what happens');
}

console.log('== a decider erased from the world falls back to the full choice ==');
{
  const ev = mkEvent({ decider: 'HYR' }); // no such court in 66 CE
  const { g, ctx } = boot('JUD', [ev]);
  fireEvent(ctx, ev);
  const pe = g.pendingEvents[0];
  ok(!!pe && !pe.notice, 'an absent decider tag leaves the choice with the player');
}

console.log('== a function aiOption steers the notice ==');
{
  const ev = mkEvent({ aiOption: () => 0 });
  const { g, ctx } = boot('JUD', [ev]);
  fireEvent(ctx, ev);
  const pe = g.pendingEvents[0];
  ok(!!pe && pe.notice === true && pe.optIdx === 0, 'the pinned course follows aiOption(ctx)');
  resolveEventOption(ctx, pe.instanceId, 1);
  ok(g.flags.testSoft === true && !g.flags.testHard, 'and is applied on acknowledgment');
}

console.log('== a pending notice survives the save ==');
{
  const ev = mkEvent({});
  const { g, ctx } = boot('JUD', [ev]);
  fireEvent(ctx, ev);
  const revived = reviveGame(JSON.parse(JSON.stringify(g)));
  const pe = revived.pendingEvents.find((p) => p && p.eventId === 'ev_test_decider');
  ok(!!pe && pe.notice === true && pe.optIdx === 1 && pe.decider === 'ROM',
    'notice, course and decider ride the save');
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_66);
  const ctx2 = makeCtx({
    game: revived, DEFINES, MAP_DATA, geom: fakeGeom, bus,
    bookmark: BOOKMARK_66, events: [ev], provinceMap,
  });
  resolveEventOption(ctx2, pe.instanceId, 0);
  ok(revived.flags.testHard === true && !revived.flags.testSoft,
    'a loaded notice still applies the pinned course');
}

console.log('== every declared decider names a court of its era ==');
{
  const ERAS = [
    ['167bce', 'BOOKMARK_167', 'bookmark_167bce'], ['67bce', 'BOOKMARK_67', 'bookmark_67bce'],
    ['40bce', 'BOOKMARK_40', 'bookmark_40bce'], ['66ce', 'BOOKMARK_66', 'bookmark_66ce'],
    ['132ce', 'BOOKMARK_132', 'bookmark_132ce'], ['614ce', 'BOOKMARK_614', 'bookmark_614ce'],
    ['1948', 'BOOKMARK_1948', 'bookmark_1948'],
  ];
  for (const [era, bmName, bmFile] of ERAS) {
    const evs = Object.values(await import(R + '/js/data/events_' + era + '.js')).find(Array.isArray) || [];
    const bm = (await import(R + '/js/data/' + bmFile + '.js'))[bmName];
    const roster = (bm.activeTags || []).concat(['REB']);
    const bad = evs.filter((e) => e && e.decider
      && (roster.length > 1 ? roster.indexOf(e.decider) < 0 : false));
    ok(bad.length === 0, era + ': every decider is in the era roster'
      + (bad.length ? ' — ' + bad.map((e) => e.id + ':' + e.decider).join(', ') : ''));
    const noAi = evs.filter((e) => e && e.decider && e.options && e.options.length > 1
      && !Number.isFinite(e.aiOption) && typeof e.aiOption !== 'function');
    ok(noAi.length === 0, era + ': every decider event pins its historical course'
      + (noAi.length ? ' — ' + noAi.map((e) => e.id).join(', ') : ''));
  }
}

if (failures) { console.error(failures + ' FAILURES'); process.exit(1); }
console.log('\nALL PASS');
