// Headless regression — SPEC §216: two Jewish states at one table. A
// multiplayer guest may take another of the chapter's own standards instead of
// sharing the host's, and everything that used to mean "the player's throne"
// has to mean "a throne somebody is sitting in": the roster, the cards, and
// the court. The whole of it is invisible to a solo campaign — every assertion
// here has its single-chair twin, because a campaign with one player must draw
// exactly the world it drew before.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_67 } = await import(R + '/js/data/bookmark_67bce.js');
const { EVENTS_67 } = await import(R + '/js/data/events_67bce.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, reviveGame } = await import(R + '/js/sim/init.js');
const { fireEvent, resolveEventOption } = await import(R + '/js/sim/events.js');
const { isHumanChair, humanChairs } = await import(R + '/js/sim/military.js');
const { monthlyFactions, getFactionsInfo, factionApproval } = await import(R + '/js/sim/factions.js');
const { courtSeats } = await import(R + '/js/sim/courts.js');
const { chapterChairs, resolveSeat } = await import(R + '/js/net/mp_state.js');
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

// A campaign, optionally with a second chair seated the way main.js seats one.
function boot(playerTag, guests, events) {
  const evs = events || EVENTS_67;
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_67);
  const g = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_67, events: evs,
    playerTag, rngSeed: 215, provinceMap,
  });
  if (guests && guests.length) {
    g.humanTags = [playerTag].concat(guests).filter((t, i, a) => a.indexOf(t) === i);
    for (const t of g.humanTags) g.tags[t].ai = false;
  }
  const ctx = makeCtx({
    game: g, DEFINES, MAP_DATA, geom: fakeGeom, bus,
    bookmark: BOOKMARK_67, events: evs, provinceMap,
  });
  return { g, ctx };
}

console.log('== the lobby seats the chapter\'s own standards ==');
{
  const seats = chapterChairs(BOOKMARK_67);
  ok(seats.join(',') === 'HYR,ARI,ADI', 'the civil war offers all three of its thrones: ' + seats.join(','));
  ok(chapterChairs(ERAS.find((e) => e.bookmark.id === '1948ce').bookmark).length === 1,
    'a one-standard chapter offers exactly one — there is nothing to choose between');
  // A campaign lifted off the shelf can only seat what its world still has.
  const gone = chapterChairs(BOOKMARK_67, { HYR: { alive: true }, ADI: { alive: false } });
  ok(gone.join(',') === 'HYR', 'a save seats neither a deleted court nor a fallen one: ' + gone.join(','));

  ok(resolveSeat('', 'HYR', ['HYR', 'ARI']) === 'HYR', 'an unpicked guest sits beside the host (the v1.8 table)');
  ok(resolveSeat('HYR', 'HYR', ['HYR', 'ARI']) === 'HYR', 'and so does one who picked the host\'s own throne');
  ok(resolveSeat('ARI', 'HYR', ['HYR', 'ARI']) === 'ARI', 'a picked standard is the guest\'s chair');
  ok(resolveSeat('ATG', 'HYR', ['HYR', 'ARI']) === 'HYR',
    'a throne this chapter cannot seat falls back beside the host rather than nowhere');
}

console.log('== who is actually sitting somewhere ==');
{
  const solo = boot('HYR');
  ok(isHumanChair(solo.g, 'HYR') && !isHumanChair(solo.g, 'ARI') && !isHumanChair(solo.g, 'ADI'),
    'a solo campaign has exactly one seated chair');
  ok(humanChairs(solo.g).join(',') === 'HYR', 'and the roster is the protagonist alone');

  const table = boot('HYR', ['ARI']);
  ok(isHumanChair(table.g, 'HYR') && isHumanChair(table.g, 'ARI') && !isHumanChair(table.g, 'ROM'),
    'a seated guest is a human chair; the world around them is not');
  ok(humanChairs(table.g).join(',') === 'HYR,ARI', 'protagonist first, then the guests');

  // The balance harness empties the protagonist's chair without emptying the
  // roster. An empty chair is not a human one.
  const harness = boot('HYR');
  harness.g.tags.HYR.ai = true;
  ok(!isHumanChair(harness.g, 'HYR'), 'an all-AI autorun seats nobody at all');

  // A chair the world no longer has (a formable rewrote it) is not a chair.
  const formed = boot('HYR', ['ARI']);
  delete formed.g.tags.ARI;
  ok(!isHumanChair(formed.g, 'ARI') && humanChairs(formed.g).join(',') === 'HYR',
    'a deleted tag drops off the roster instead of haunting it');
}

console.log('== a card is answered by whoever holds the chair it names ==');
{
  const card = {
    id: 'ev_test_chair',
    title: 'A Question for the Younger Brother',
    desc: 'The captains want an answer.',
    forTag: 'ARI',
    aiOption: 0,
    options: [
      { label: 'The recorded course', effects: (c) => c.helpers.setFlag(c, 'testRec', true) },
      { label: 'The other road', effects: (c) => c.helpers.setFlag(c, 'testAlt', true) },
    ],
  };

  // Solo: nobody is home in Aristobulus' court, so it takes its own course
  // silently — exactly as it always has. (A campaign opens paused; the clock
  // is started here so "the card stopped it" means something.)
  const solo = boot('HYR', null, [card]);
  busEvents.length = 0;
  solo.g.paused = false;
  fireEvent(solo.ctx, card);
  ok(!solo.g.pendingEvents.length && solo.g.flags.testRec === true,
    'with one player the rival court resolves its own card, unseen');
  ok(!busEvents.some((b) => b.ev === 'event'), 'and no card is dealt to anybody');
  ok(solo.g.paused === false, 'the world does not stop for a court nobody is playing');

  // Seated: the same card is dealt, and it is dealt to the guest.
  const table = boot('HYR', ['ARI'], [card]);
  busEvents.length = 0;
  table.g.paused = false;
  fireEvent(table.ctx, card);
  const pe = table.g.pendingEvents[0];
  ok(!!pe && pe.forTag === 'ARI', 'a seated rival court is dealt its own card: ' + (pe && pe.forTag));
  ok(!table.g.flags.testRec && !table.g.flags.testAlt, 'and nothing was decided over their head');
  const dealt = busEvents.find((b) => b.ev === 'event');
  ok(!!dealt && dealt.p.forTag === 'ARI', 'the bus payload carries the chair, which is what the relay routes on');
  ok(table.g.paused === true, 'the host-authoritative world stops while they answer');
  resolveEventOption(table.ctx, pe.instanceId, 1);
  ok(table.g.flags.testAlt === true && !table.g.flags.testRec,
    'their answer is the one that runs — the host executes it under their crown');
}

console.log('== a foreign decider is foreign to the chair it is dealt to ==');
{
  // The decider IS the guest's own court: their choice, not a notice.
  const own = {
    id: 'ev_test_decider_own',
    title: 'Aristobulus Decides',
    desc: 'It is the king\'s to answer.',
    forTag: 'ARI', decider: 'ARI', aiOption: 0,
    options: [{ label: 'Yes' }, { label: 'No' }],
  };
  const a = boot('HYR', ['ARI'], [own]);
  fireEvent(a.ctx, own);
  ok(a.g.pendingEvents[0] && !a.g.pendingEvents[0].notice,
    'a card decided by the chair it is dealt to is that chair\'s choice');

  // A third court decides: a notice at whichever table reads it (SPEC §70).
  const foreign = { ...own, id: 'ev_test_decider_foreign', decider: 'ROM' };
  const b = boot('HYR', ['ARI'], [foreign]);
  fireEvent(b.ctx, foreign);
  ok(b.g.pendingEvents[0] && b.g.pendingEvents[0].notice === true
    && b.g.pendingEvents[0].decider === 'ROM',
  'and a foreign court\'s decision is a notice to the guest exactly as to the host');

  // The host's own card is unmoved by any of this.
  const mine = { ...own, id: 'ev_test_decider_host', forTag: 'HYR', decider: 'ROM' };
  const c = boot('HYR', ['ARI'], [mine]);
  fireEvent(c.ctx, mine);
  ok(c.g.pendingEvents[0] && c.g.pendingEvents[0].forTag === 'HYR'
    && c.g.pendingEvents[0].notice === true, 'the protagonist\'s notices read as they always did');
}

console.log('== the court convenes wherever somebody is sitting ==');
{
  const solo = boot('HYR');
  monthlyFactions(solo.ctx);
  ok(factionApproval(solo.ctx, 'HYR', 'pharisees') !== null, 'the protagonist holds a court');
  ok(factionApproval(solo.ctx, 'ARI', 'pharisees') === null,
    'and the rival brother, unplayed, has none — factions.js stays out of it');
  ok(!!courtSeats(solo.ctx, 'ARI'), 'courts.js runs that court instead (SPEC §163)');
  ok(courtSeats(solo.ctx, 'HYR') === null, 'and never the played one');

  // The empty chair convenes NEITHER court, and that is not a detail: an
  // all-AI autorun sets `ai` on the protagonist, and every balance figure in
  // tools/README.md was measured against a world where that tag has no court
  // at all. Handing it the §163 archetypes moves the seeded stream and every
  // trajectory with it.
  const harness = boot('HYR');
  harness.g.tags.HYR.ai = true;
  monthlyFactions(harness.ctx);
  ok(factionApproval(harness.ctx, 'HYR', 'pharisees') === null && courtSeats(harness.ctx, 'HYR') === null,
    'an emptied protagonist chair convenes neither court — the harness baseline');

  const table = boot('HYR', ['ARI']);
  monthlyFactions(table.ctx);
  ok(factionApproval(table.ctx, 'ARI', 'sadducees') !== null,
    'a seated guest gets the parties its bookmark authored for it');
  ok(courtSeats(table.ctx, 'ARI') === null,
    'and courts.js steps aside — two political engines on one throne would each be half of it');
  ok(!!courtSeats(table.ctx, 'ROM'), 'every court nobody plays is still the foreign-court model\'s');

  // The panel reads from the chair the reader is sitting in, which on a
  // guest's mirrored world is their own.
  const guestView = { ...table.ctx, game: { ...table.g, playerTag: 'ARI' } };
  const seen = getFactionsInfo(guestView);
  ok(Array.isArray(seen) && seen.some((f) => f.id === 'sadducees'),
    'the guest\'s court panel shows the guest\'s court');
}

console.log('== two courts, two books ==');
{
  // HYR and ARI both authored a party called `pharisees`. Filed under the bare
  // id for both, one court's demand would cool the other's for two years.
  const table = boot('HYR', ['ARI']);
  const g = table.g;
  for (const tag of ['HYR', 'ARI']) {
    const t = g.tags[tag];
    t.factions = { pharisees: 5, sadducees: 5, captains: 5, hellenizers: 5, idumeans: 5, nabateans: 5 };
  }
  monthlyFactions(table.ctx);
  const cd = g.flags._factionDemandCd || {};
  const dealt = g.pendingEvents.map((pe) => pe.forTag);
  ok(dealt.indexOf('HYR') >= 0 && dealt.indexOf('ARI') >= 0,
    'a despairing party at each court gets its card onto the table: ' + dealt.join(','));
  ok(Object.keys(cd).some((k) => k.indexOf('ARI:') === 0),
    'the guest\'s cooldowns are filed beneath their own tag: ' + Object.keys(cd).join(','));
  ok(Object.keys(cd).some((k) => k.indexOf(':') < 0),
    'and the protagonist keeps the bare id every save has been written with');
}

console.log('== a save comes back a solo campaign ==');
{
  const table = boot('HYR', ['ARI']);
  const revived = reviveGame(JSON.parse(JSON.stringify(table.g)));
  ok(revived.humanTags.join(',') === 'HYR', 'reviveGame collapses the table to its protagonist');
  ok(revived.tags.ARI.ai === true, 'and hands the second throne back to the AI');
  ok(!isHumanChair(revived, 'ARI'), 'so a loaded campaign deals the rival court no cards');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
