// Headless regression — SPEC §212: the world rolls for it. A foreign court's
// card marked `roll: true` is a question nobody at this table can answer, so
// the campaign's own seeded stream answers it: the notice's course is DRAWN at
// fire time — the recorded course (aiOption) weighted by EVENT_ROLL_RECORDED,
// the roads the chronicles did not take splitting the rest — instead of
// pinned. The player still gets the §70 single-button notice, the draw rides
// the save and the relay, a card that does not ask for a roll never touches
// the stream, and every rolled card in the shipped chains belongs to a court
// no chapter lets anybody sit in.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, reviveGame } = await import(R + '/js/sim/init.js');
const { fireEvent, resolveEventOption } = await import(R + '/js/sim/events.js');
const { ERAS } = await import(R + '/js/data/compendium.js');

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

function boot(playerTag, events, seed, defines) {
  const D = defines || DEFINES;
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_66);
  const g = initGame({
    DEFINES: D, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_66, events,
    playerTag, rngSeed: seed == null ? 136 : seed, provinceMap,
  });
  const ctx = makeCtx({
    game: g, DEFINES: D, MAP_DATA, geom: fakeGeom, bus,
    bookmark: BOOKMARK_66, events, provinceMap,
  });
  return { g, ctx };
}
const withWeight = (w) => ({ ...DEFINES, EVENT_ROLL_RECORDED: w });

const mkEvent = (over) => ({
  id: 'ev_test_roll',
  title: 'What Rome Should Do',
  desc: 'A dispatch from a court that is not ours.',
  forTag: 'both',
  decider: 'ROM',
  roll: true,
  aiOption: 0,
  options: [
    { label: 'The recorded course', effects: (ctx) => ctx.helpers.setFlag(ctx, 'testRec', true) },
    { label: 'The road not taken', effects: (ctx) => ctx.helpers.setFlag(ctx, 'testAlt', true) },
  ],
  ...over,
});

console.log('== a rolled card is still a notice, and the roll decides it ==');
{
  const ev = mkEvent({});
  const { g, ctx } = boot('JUD', [ev]);
  busEvents.length = 0;
  fireEvent(ctx, ev);
  const pe = g.pendingEvents[0];
  ok(!!pe && pe.notice === true && pe.decider === 'ROM',
    'the card arrives as a decider notice naming the court (SPEC §70 holds)');
  ok(!!pe && (pe.optIdx === 0 || pe.optIdx === 1), 'with a course drawn from the two on offer');
  const emitted = busEvents.find((b) => b.ev === 'event');
  ok(!!emitted && emitted.p.notice === true && emitted.p.optIdx === pe.optIdx,
    'and the bus payload carries the drawn course to the modal and the relay');
  // Whatever button the UI reports, the draw is what happens.
  resolveEventOption(ctx, pe.instanceId, pe.optIdx === 0 ? 1 : 0);
  const took = pe.optIdx === 0 ? g.flags.testRec : g.flags.testAlt;
  const other = pe.optIdx === 0 ? g.flags.testAlt : g.flags.testRec;
  ok(took === true && !other, 'acknowledging applies the drawn course, not the reported index');
}

console.log('== the weight is the record\'s thumb on the scale ==');
{
  const always = boot('JUD', [mkEvent({})], 7, withWeight(1));
  fireEvent(always.ctx, always.ctx.events[0]);
  ok(always.g.pendingEvents[0].optIdx === 0, 'weight 1 pins the roll back onto the record');
  const never = boot('JUD', [mkEvent({})], 7, withWeight(0));
  fireEvent(never.ctx, never.ctx.events[0]);
  ok(never.g.pendingEvents[0].optIdx === 1, 'weight 0 always takes the other road');
  // One campaign, the same card over and over: the share the record takes is
  // the define, not an accident of which seed the harness happened to pick.
  const many = boot('JUD', [mkEvent({ once: false })], 21);
  const card = many.ctx.events[0];
  let rec = 0;
  const rolls = 2000;
  for (let i = 0; i < rolls; i++) {
    many.g.pendingEvents.length = 0;
    fireEvent(many.ctx, card);
    if (many.g.pendingEvents[0].optIdx === 0) rec++;
  }
  const share = rec / rolls;
  ok(rec > 0 && rec < rolls, 'over 2000 rolls the world finds both courses (' + rec + '/' + rolls + ')');
  ok(Math.abs(share - DEFINES.EVENT_ROLL_RECORDED) < 0.04,
    'and lands on the defined weight (' + share.toFixed(3) + ' vs '
    + DEFINES.EVENT_ROLL_RECORDED + ')');
}

console.log('== the draw is the campaign\'s, not the machine\'s ==');
{
  const a = boot('JUD', [mkEvent({})], 21);
  fireEvent(a.ctx, a.ctx.events[0]);
  const b = boot('JUD', [mkEvent({})], 21);
  fireEvent(b.ctx, b.ctx.events[0]);
  ok(a.g.pendingEvents[0].optIdx === b.g.pendingEvents[0].optIdx,
    'the same seed rolls the same course — replays and hosts agree');
  const revived = reviveGame(JSON.parse(JSON.stringify(a.g)));
  const pe = revived.pendingEvents.find((p) => p && p.eventId === 'ev_test_roll');
  ok(!!pe && pe.notice === true && pe.optIdx === a.g.pendingEvents[0].optIdx,
    'and a pending roll rides the save with its course already drawn');
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_66);
  const ctx2 = makeCtx({
    game: revived, DEFINES, MAP_DATA, geom: fakeGeom, bus,
    bookmark: BOOKMARK_66, events: a.ctx.events, provinceMap,
  });
  resolveEventOption(ctx2, pe.instanceId, 0);
  const took = pe.optIdx === 0 ? revived.flags.testRec : revived.flags.testAlt;
  ok(took === true, 'a loaded notice applies the course the world had already rolled');
}

console.log('== a card that does not ask for a roll never touches the stream ==');
{
  const plain = boot('JUD', [mkEvent({ roll: undefined })], 3);
  const before = plain.g.rngState;
  fireEvent(plain.ctx, plain.ctx.events[0]);
  ok(plain.g.rngState === before && plain.g.pendingEvents[0].optIdx === 0,
    'an ordinary decider notice still pins aiOption and draws no numbers');
  const rolled = boot('JUD', [mkEvent({})], 3);
  const beforeR = rolled.g.rngState;
  fireEvent(rolled.ctx, rolled.ctx.events[0]);
  ok(rolled.g.rngState !== beforeR, 'a rolled one spends the stream, and only it does');
}

console.log('== nobody at this table is handed the question ==');
{
  // §70 hands an erased court's choice back to the player. A rolled card does
  // not: the Caliphate written out of the world does not make the standardizing
  // of the Qur'an a Jewish decision.
  const gone = boot('JUD', [mkEvent({ decider: 'HYR' })]); // no such court in 66 CE
  fireEvent(gone.ctx, gone.ctx.events[0]);
  const pe = gone.g.pendingEvents[0];
  ok(!!pe && pe.notice === true, 'an erased decider still leaves the card a notice');
  ok(!pe.decider, 'and names no court, so the modal says "another court" rather than a tag');
  // The deciding court, if somebody is sitting in it, keeps its own choice.
  const rome = boot('ROM', [mkEvent({})]);
  fireEvent(rome.ctx, rome.ctx.events[0]);
  ok(!rome.g.pendingEvents[0].notice, 'playing the deciding court, the card is a real choice again');
}

console.log('== an AI audience rolls too ==');
{
  const ev = mkEvent({ forTag: 'ROM' });
  let rec = 0;
  for (let s = 1; s <= 60; s++) {
    const w = boot('JUD', [ev], s, withWeight(0));
    fireEvent(w.ctx, ev);
    if (w.g.flags.testRec) rec++;
  }
  ok(rec === 0,
    'a card resolved silently for another court takes the rolled road, not the pinned one');
  const w = boot('JUD', [ev], 5, withWeight(1));
  fireEvent(w.ctx, ev);
  ok(w.g.flags.testRec === true, 'and the record when the weight says the record');
}

console.log('== the shipped rolls are foreign, world-history, and answerable ==');
{
  const seen = new Set();
  let total = 0;
  for (const era of ERAS) {
    const id = era.bookmark.id;
    const roster = era.bookmark.activeTags || [];
    const playable = (era.bookmark.playableTags || []).map((p) => (typeof p === 'string' ? p : p && p.tag));
    const rolled = era.events.filter((e) => e && e.roll === true && !seen.has(id + ':' + e.id));
    for (const e of rolled) seen.add(id + ':' + e.id);
    if (!rolled.length) continue;
    total += rolled.length;
    const bad = (why, f) => {
      const list = rolled.filter(f);
      ok(list.length === 0, id + ': ' + why + (list.length ? ' — ' + list.map((e) => e.id).join(', ') : ''));
    };
    bad('every rolled card names the court whose question it is',
      (e) => !e.decider || typeof e.decider === 'function');
    bad('and that court belongs to the chapter\'s roster',
      (e) => roster.indexOf(e.decider) < 0);
    bad('and is a court no standard of this chapter sits in',
      (e) => playable.indexOf(e.decider) >= 0);
    bad('every rolled card still records its historical course',
      (e) => !Number.isFinite(e.aiOption) && typeof e.aiOption !== 'function');
    bad('every rolled card has a road to roll between',
      (e) => !Array.isArray(e.options) || e.options.length < 2);
    bad('and is world history rather than the chapter\'s own business',
      (e) => e.world !== true);
    bad('and is addressed to whoever is playing',
      (e) => e.forTag !== 'both' && e.forTag !== 'player');
    // A notice is never a choice (§70), so it is never a departure from the
    // record either (§89) — a card that keeps a Road Not Taken is a fork the
    // ledger is watching, and forks are not rolled for.
    bad('and keeps no §89 record, because a roll is nobody\'s departure from one',
      (e) => typeof e.historical === 'string' && e.historical.length > 0);
  }
  ok(total === 25, 'the chains ship 25 rolled cards at the chapter weight (' + total + ')');
}

// SPEC §252: a card may also price its OWN pivot — `roll: 0.5` is an honest
// tossup and `roll: 0.85` a near-certainty that is still not a promise. Those
// keep every invariant above except world-history, because a foreign court's
// decision inside the chapter's own theatre (the Cilician Gates, the king who
// dies in Persis) is the chapter's news rather than the world's.
console.log('== …and the ones that price their own weight keep the same rules ==');
{
  const seen = new Set();
  let total = 0;
  for (const era of ERAS) {
    const id = era.bookmark.id;
    const playable = (era.bookmark.playableTags || []).map((p) => (typeof p === 'string' ? p : p && p.tag));
    const rolled = era.events.filter((e) => e && Number.isFinite(e.roll) && !seen.has(id + ':' + e.id));
    for (const e of rolled) seen.add(id + ':' + e.id);
    if (!rolled.length) continue;
    total += rolled.length;
    const bad = (why, f) => {
      const list = rolled.filter(f);
      ok(list.length === 0, id + ': ' + why + (list.length ? ' — ' + list.map((e) => e.id).join(', ') : ''));
    };
    bad('a weight is a weight, between nothing and certainty',
      (e) => !(e.roll > 0 && e.roll < 1));
    bad('every weighted card names the court whose question it is',
      (e) => !e.decider || typeof e.decider === 'function');
    bad('and that court is a real one this chapter can seat',
      (e) => !DEFINES.TAGS[e.decider]);
    bad('and is a court no standard of this chapter sits in',
      (e) => playable.indexOf(e.decider) >= 0);
    bad('every weighted card still records its historical course',
      (e) => !Number.isFinite(e.aiOption) && typeof e.aiOption !== 'function');
    bad('every weighted card has a road to roll between',
      (e) => !Array.isArray(e.options) || e.options.length < 2);
    bad('and is addressed to whoever is playing',
      (e) => e.forTag !== 'both' && e.forTag !== 'player');
    bad('and keeps no §89 record, because a roll is nobody\'s departure from one',
      (e) => typeof e.historical === 'string' && e.historical.length > 0);
  }
  ok(total === 21, 'the chains ship 21 cards that price their own pivot (' + total + ')');
}

if (failures) { console.error(failures + ' FAILURES'); process.exit(1); }
console.log('\nALL PASS');
