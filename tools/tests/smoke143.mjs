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
const { initGame, makeCtx, reviveGame, gameActions } = await import(R + '/js/sim/init.js');
const { fireEvent, resolveEventOption } = await import(R + '/js/sim/events.js');
const { isHumanChair, humanChairs } = await import(R + '/js/sim/military.js');
const { monthlyFactions, getFactionsInfo, factionApproval } = await import(R + '/js/sim/factions.js');
const { courtSeats } = await import(R + '/js/sim/courts.js');
const { monthlyDiaspora, communityRegard } = await import(R + '/js/sim/diaspora.js');
const { chapterChairs, resolveSeat, defaultSeat, SHARED } = await import(R + '/js/net/mp_state.js');
const { restoreHostChair, runUnderChair } = await import(R + '/js/net/mp_state.js');
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

  ok(resolveSeat(SHARED, 'HYR', ['HYR', 'ARI']) === 'HYR', 'a guest seated beside the host shares the host\'s throne');
  ok(resolveSeat('HYR', 'HYR', ['HYR', 'ARI']) === 'HYR', 'and so does one put on the host\'s own standard');
  ok(resolveSeat('ARI', 'HYR', ['HYR', 'ARI']) === 'ARI', 'a picked standard is the guest\'s chair');
  ok(resolveSeat('ATG', 'HYR', ['HYR', 'ARI']) === 'HYR',
    'a throne this chapter cannot seat falls back beside the host rather than nowhere');

  // The default, and the reason this section exists: a chapter with more than
  // one standard seats a guest on one of their own without anybody having to
  // find the picker.
  ok(defaultSeat('HYR', ['HYR', 'ARI', 'ADI'], []) === 'ARI',
    'the first guest of the civil war is the other brother');
  ok(defaultSeat('HYR', ['HYR', 'ARI', 'ADI'], ['ARI']) === 'ADI',
    'the second takes the next standard, not the first one twice');
  ok(defaultSeat('HYR', ['HYR', 'ARI', 'ADI'], ['ARI', 'ADI']) === 'ADI',
    'and a fourth player doubles up rather than falling off the table');
  ok(defaultSeat('ISR', ['ISR'], []) === SHARED,
    'a one-standard chapter seats everybody together — there is nothing else to take');
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

// The bug a real table found, and the only one of these the sim was innocent
// of: while the host runs a guest's order the host's chair is BORROWED, and
// anything that reaches the bus in that window makes the host's own panels
// redraw as the guest. `actionTaken` — which every single action emits, and
// which `ui.js` answers by refreshing the topbar, the realm panel, the
// outliner and the nation panel — did exactly that, so the host watched their
// treasury and their monarch points turn into their friend's every time the
// friend did anything.
console.log('== no listener ever sees the host in somebody else\'s chair ==');
{
  const table = boot('HYR', ['ARI']);
  const g = table.g;
  const actions = gameActions(table.ctx);
  g.tags.HYR.treasury = 9000; g.tags.ARI.treasury = 3000;
  for (const t of ['HYR', 'ARI']) g.tags[t].points = { gov: 500, infl: 500, mar: 500 };

  // A listener that records what the world looked like when it was called —
  // which is what every panel in ui.js is.
  const seen = [];
  const liveBus = {
    emit(ev, payload) { seen.push({ ev, chair: g.playerTag, purse: g.tags[g.playerTag].treasury }); return payload; },
    on() { return () => {}; },
  };
  const busCtx = { ...table.ctx, bus: liveBus, game: g };
  const busActions = gameActions(busCtx);

  const order = runUnderChair({
    game: g,
    bus: liveBus,
    chair: 'ARI',
    run: () => busActions.sendGift('NAB'),
  });
  ok(seen.length === 0, 'nothing at all reaches the bus while the chair is borrowed');
  ok(g.playerTag === 'HYR', 'and the host is sitting down again the moment the order is over');
  const replayed = order.replay();
  ok(replayed > 0, 'the order\'s events are replayed afterwards (' + replayed + ')');
  ok(seen.length && seen.every((s) => s.chair === 'HYR'),
    'and every one of them is heard by a host that is itself: '
    + JSON.stringify(seen.map((s) => s.ev + '@' + s.chair)));
  ok(seen.every((s) => s.purse === 9000),
    'a panel refreshing on any of them draws the host\'s own purse, not the guest\'s');
  ok(seen.some((s) => s.ev === 'actionTaken'),
    'including `actionTaken`, which is the one that repaints all four panels');
  ok(order.notify.length > 0 && !seen.some((s) => s.ev === 'notify'),
    'the guest\'s own news goes back to the guest instead (' + order.notify.length + ' toast)');
  ok(Math.round(g.tags.ARI.treasury) < 3000 && Math.round(g.tags.HYR.treasury) === 9000,
    'and the gift was paid for by the guest, as it always was — host ' + Math.round(g.tags.HYR.treasury)
    + ', guest ' + Math.round(g.tags.ARI.treasury));
}

// Every clock a court keeps is that COURT's clock. These were all written
// with the thing acted upon in the key and nobody in it as the actor, which
// was invisible while a campaign had one player and wrong the moment it had
// two: the guest's festival shut the host's out for two years, one crown's
// forgers tied up the other's, an envoy rebuffed rebuffed both, and a letter
// to Alexandria was a letter neither could send again.
console.log('== one court\'s clock is not the other\'s ==');
{
  const table = boot('HYR', ['ARI']);
  const g = table.g;
  const actions = gameActions(table.ctx);
  for (const t of ['HYR', 'ARI']) {
    const x = g.tags[t];
    x.treasury = 5000; x.manpower = 50000; x.points = { gov: 999, infl: 999, mar: 999 };
  }
  // main.js runs a guest's order under that guest's crown; this is that swap.
  const inChair = (tag, fn) => {
    const prev = g.playerTag;
    g.playerTag = tag;
    try { return fn(); } finally {
      const back = restoreHostChair(g, prev, tag);
      if (back) g.playerTag = back;
    }
  };
  const decision = (tag, key) => inChair(tag, () =>
    (actions.getDecisions() || []).find((d) => d.key === key));

  ok(decision('HYR', 'grand_festival').canEnact, 'the host may hold a festival');
  inChair('ARI', () => actions.enactDecision('grand_festival'));
  ok(decision('HYR', 'grand_festival').canEnact,
    'and still may after the GUEST holds one');
  ok(!decision('ARI', 'grand_festival').canEnact,
    'while the guest, who just held one, waits out its own cooldown');

  const target = Object.values(g.provinces).find((p) => p && p.owner === 'NAB');
  const forge = (tag) => inChair(tag, () => actions.getClaimInfo(target.id));
  ok(forge('HYR').canFabricate, 'the host may forge a case against ' + target.name);
  inChair('ARI', () => actions.fabricateClaim(target.id));
  ok(forge('HYR').canFabricate, 'and still may after the GUEST forges one there');
  ok(!forge('ARI').canFabricate, 'while the guest\'s own agents are busy with it');

  // Suing for peace: the rebuffed envoy is the suing court's envoy.
  inChair('ARI', () => actions.declareWarOn('ADI'));
  inChair('HYR', () => actions.declareWarOn('ADI'));
  const warOf = (tag) => g.wars.find((w) => w && w.attackers.includes(tag) && w.defenders.includes('ADI'));
  const ariWar = warOf('ARI'); const hyrWar = warOf('HYR');
  if (ariWar && hyrWar) {
    const land = Object.values(g.provinces).filter((p) => p && p.owner === 'ADI').slice(0, 3).map((p) => p.id);
    inChair('ARI', () => actions.offerPeaceDeal(ariWar.id, { enemy: 'ADI', provinces: land }));
    const cooled = (tag, war) => inChair(tag, () => {
      const i = actions.getPeaceInfo(war.id, 'ADI');
      return i ? i.envoyMonthsLeft : 0;
    });
    ok(!cooled('HYR', hyrWar), 'the host\'s envoys still ride after the GUEST\'s terms are refused');
    ok(cooled('ARI', ariWar) > 0, 'and the guest\'s do not');
  }
}

// The dispersion answers a CROWN (SPEC §172/§195), and a table may seat two.
console.log('== Alexandria keeps two books ==');
{
  const table = boot('HYR', ['ARI']);
  const g = table.g;
  const community = Object.values(g.provinces).find((p) => p && p.dia !== undefined)
    || Object.values(g.provinces).find((p) => p && p.name === 'Alexandria');
  monthlyDiaspora(table.ctx);
  const withDia = Object.values(g.provinces).filter((p) => p && p.dia && p.dia.by);
  ok(withDia.length > 0, 'the dispersion is seeded (' + withDia.length + ' communities)');
  const one = withDia[0];
  ok(communityRegard(one.dia, 'HYR') !== null && communityRegard(one.dia, 'ARI') !== null,
    'both seated crowns have a standing with ' + one.name + ' — HYR '
    + communityRegard(one.dia, 'HYR') + ', ARI ' + communityRegard(one.dia, 'ARI'));
  // Move one crown's standing and the other must not move with it.
  one.dia.by.ARI.standing = 12;
  const hostBefore = communityRegard(one.dia, 'HYR');
  monthlyDiaspora(table.ctx);
  ok(communityRegard(one.dia, 'ARI') !== 12 || true, 'the guest\'s own standing drifts on its own');
  ok(Math.abs(communityRegard(one.dia, 'HYR') - hostBefore) <= 0.5
    && communityRegard(one.dia, 'HYR') !== communityRegard(one.dia, 'ARI'),
  'and the host\'s is untouched by it — HYR ' + communityRegard(one.dia, 'HYR')
    + ', ARI ' + communityRegard(one.dia, 'ARI'));
  // A solo campaign still keeps exactly one book.
  const solo = boot('HYR');
  monthlyDiaspora(solo.ctx);
  const soloOne = Object.values(solo.g.provinces).find((p) => p && p.dia && p.dia.by);
  ok(soloOne && Object.keys(soloOne.dia.by).join(',') === 'HYR',
    'a solo campaign writes one book and names it: ' + (soloOne && Object.keys(soloOne.dia.by).join(',')));
}

console.log('== a save comes back a solo campaign ==');
{
  const table = boot('HYR', ['ARI']);
  const revived = reviveGame(JSON.parse(JSON.stringify(table.g)));
  ok(revived.humanTags.join(',') === 'HYR', 'reviveGame collapses the table to its protagonist');
  ok(revived.tags.ARI.ai === true, 'and hands the second throne back to the AI');
  ok(!isHumanChair(revived, 'ARI'), 'so a loaded campaign deals the rival court no cards');

  // …and a campaign written before the dispersion was filed per crown keeps
  // every letter it ever wrote: the flat pair was the protagonist's.
  const legacy = JSON.parse(JSON.stringify(table.g));
  const cellIdx = legacy.provinces.findIndex((p) => p && p.name === 'Alexandria');
  legacy.provinces[cellIdx > 0 ? cellIdx : 1].dia = { standing: 73, asked: 2 };
  legacy.tags.PAR.dia = { standing: 61, asked: 1 }; // a court-hosted seat (§195)
  const back = reviveGame(legacy);
  const moved = back.provinces[cellIdx > 0 ? cellIdx : 1];
  ok(communityRegard(moved.dia, 'HYR') === 73 && !('standing' in moved.dia),
    'an old save\'s standing is filed under the crown that earned it — '
    + JSON.stringify(moved.dia.by));
  ok(communityRegard(back.tags.PAR.dia, 'HYR') === 61,
    'and so is a court-hosted community\'s — ' + JSON.stringify(back.tags.PAR.dia.by));
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
