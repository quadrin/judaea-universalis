// Headless regression — SPEC §90: what kind of kingdom, what kind of return.
//
// The victory strands established that Judaea survived. They never asked what
// Judaea BECAME, so every winning campaign arrived at the same state with the
// same modifiers. These cards read the doctrine axes and name the world the
// campaign is actually going to live in — and they are mutually exclusive, so
// a realm gets exactly one identity, not three. This suite holds the gates
// (character AND a standing state, never one without the other), the
// exclusivity, the strand registration, and the promise that an undecided
// winner is offered none of them.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { BOOKMARK_614 } = await import(R + '/js/data/bookmark_614ce.js');
const { EVENTS_614 } = await import(R + '/js/data/events_614ce.js');
const { initGame, makeCtx, simHelpers: helpers } = await import(R + '/js/sim/init.js');
const { checkTriggeredEvents, resolveEventOption } = await import(R + '/js/sim/events.js');
const { liveStrands, STRANDS } = await import(R + '/js/sim/divergence.js');

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

const KINDS_66 = ['ev_kind_priest_king', 'ev_kind_commonwealth', 'ev_kind_useful_kingdom'];
const KINDS_614 = ['ev_p_v_east_march', 'ev_p_v_third_power', 'ev_p_v_indispensable'];

// A world where the strand's precondition holds: Judaea free with Jerusalem,
// the victory flag set, and the calendar past the card's floor.
function world66(y = 79) {
  const g = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_66, events: EVENTS_66,
    playerTag: 'JUD', rngSeed: 4,
  });
  const ctx = makeCtx({
    game: g, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: BOOKMARK_66, events: EVENTS_66,
  });
  g.date = { y, m: 6, d: 1 };
  g.flags.secondKingdom = true;
  // The strand presumes the war is over: judaeaFree() reads the war ledger,
  // not just the tags.
  g.wars = [];
  for (const k of Object.keys(g.tags)) g.tags[k].atWarWith = [];
  return { g, ctx };
}
function world614(y = 655) {
  const g = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_614, events: EVENTS_614,
    playerTag: 'JUD', rngSeed: 4,
  });
  const ctx = makeCtx({
    game: g, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: BOOKMARK_614, events: EVENTS_614,
  });
  g.date = { y, m: 6, d: 1 };
  g.wars = [];
  for (const k of Object.keys(g.tags)) g.tags[k].atWarWith = [];
  // returnStands() means exactly one thing: the Return holds Jerusalem.
  const jer = ctx.prov('Jerusalem');
  jer.owner = 'JUD';
  jer.controller = 'JUD';
  return { g, ctx };
}
// Which of the given ids are currently queued for the player.
function queued(g, ids) {
  return g.pendingEvents.map((pe) => pe.eventId).filter((id) => ids.indexOf(id) >= 0);
}
function answerAll(ctx, g, idx = 0) {
  while (g.pendingEvents.length) {
    const pe = g.pendingEvents[0];
    resolveEventOption(ctx, pe.instanceId, idx);
  }
}

console.log('== the cards exist, and say what the record says ==');
{
  for (const id of KINDS_66) {
    const ev = EVENTS_66.find((e) => e && e.id === id);
    ok(!!ev, '66 CE: ' + id + ' exists');
    ok(ev && ev.options.length === 2, '...with two ways to take it');
    ok(ev && typeof ev.historical === 'string' && ev.historical.length > 40,
      '...and a line saying what actually happened');
    ok(ev && ev.major === true, '...marked major, so the §89 ledger sees it');
  }
  for (const id of KINDS_614) {
    const ev = EVENTS_614.find((e) => e && e.id === id);
    ok(!!ev, '614 CE: ' + id + ' exists');
    ok(ev && typeof ev.historical === 'string', '...with the record attached');
  }
}

console.log('== an undecided winner is offered none of them ==');
{
  const { g, ctx } = world66();
  checkTriggeredEvents(ctx);
  ok(queued(g, KINDS_66).length === 0,
    'a realm that committed to nothing gets no identity card');
}

console.log('== character alone is not enough: the state must stand ==');
{
  const { g, ctx } = world66();
  helpers.doctrine(ctx, 'zeal', 6);
  helpers.doctrine(ctx, 'authority', 4);
  g.flags.secondKingdom = false; // the victory strand never opened
  checkTriggeredEvents(ctx);
  ok(queued(g, KINDS_66).length === 0, 'no Second Kingdom, no question about its shape');
}

console.log('== the zealous crown becomes a kingdom of the altar ==');
{
  const { g, ctx } = world66();
  helpers.doctrine(ctx, 'zeal', 6);
  helpers.doctrine(ctx, 'authority', 4);
  checkTriggeredEvents(ctx);
  ok(queued(g, KINDS_66).indexOf('ev_kind_priest_king') >= 0, 'the altar card fires');
  answerAll(ctx, g, 0);
  ok(g.flags.kingdomKind === 'altar', 'the realm is stamped with its kind');
  ok(!!g.flags.kingdomOfTheAltar, 'and the strand flag is set');
  const mod = (g.tags.JUD.modifiers || []).find((m) => m.id === 'kingdom_of_altar');
  ok(!!mod && mod.months === -1, 'the identity is permanent');
  ok(mod.effects.moraleMult > 1 && mod.effects.unrestAll > 0,
    'it hardens the army and irritates everyone who keeps another altar');
  ok(liveStrands(ctx).some((s) => s.name === 'The Kingdom of the Altar'),
    'the §89 page names the world');
}

console.log('== the conciliar realm becomes a commonwealth ==');
{
  const { g, ctx } = world66();
  helpers.doctrine(ctx, 'authority', -6);
  checkTriggeredEvents(ctx);
  ok(queued(g, KINDS_66).indexOf('ev_kind_commonwealth') >= 0, 'the Chamber card fires');
  answerAll(ctx, g, 0);
  ok(g.flags.kingdomKind === 'chamber', 'stamped as a commonwealth');
  const mod = (g.tags.JUD.modifiers || []).find((m) => m.id === 'commonwealth_chamber');
  ok(mod.effects.unrestAll < 0 && mod.effects.moraleMult < 1,
    'a quieter country and a softer army — the trade the Chamber actually makes');
}

console.log('== the mercantile realm becomes worth more standing ==');
{
  const { g, ctx } = world66();
  helpers.doctrine(ctx, 'conquest', -6);
  checkTriggeredEvents(ctx);
  ok(queued(g, KINDS_66).indexOf('ev_kind_useful_kingdom') >= 0, 'the indispensable card fires');
  answerAll(ctx, g, 0);
  ok(g.flags.kingdomKind === 'useful', 'stamped as indispensable');
  ok(g.tags.ROM.opinion.JUD > -60, 'and Rome, of all courts, warms to it');
}

console.log('== the identity is chosen once ==');
{
  const { g, ctx } = world66();
  // A realm that qualifies for MORE than one: zealous, crowned, and rich.
  helpers.doctrine(ctx, 'zeal', 6);
  helpers.doctrine(ctx, 'authority', 4);
  helpers.doctrine(ctx, 'conquest', -6);
  checkTriggeredEvents(ctx);
  const fired = queued(g, KINDS_66);
  ok(fired.length === 1, 'exactly one card is offered, not three (' + fired.join(', ') + ')');
  answerAll(ctx, g, 0);
  checkTriggeredEvents(ctx);
  ok(queued(g, KINDS_66).length === 0, 'and the others retire once the kind is stamped');
  const kinds = ['kingdomOfTheAltar', 'commonwealthOfTheChamber', 'worthMoreStanding']
    .filter((f) => g.flags[f]);
  ok(kinds.length === 1, 'the realm ends with one identity, not several');
}

console.log('== 614: the eastward Return becomes the east\'s western wall ==');
{
  const { g, ctx } = world614();
  helpers.doctrine(ctx, 'alignment', -6);
  checkTriggeredEvents(ctx);
  ok(queued(g, KINDS_614).indexOf('ev_p_v_east_march') >= 0, 'the march card fires');
  answerAll(ctx, g, 0);
  ok(g.flags.returnKind === 'march', 'the Return is stamped as a march');
  ok(!!g.flags.westernMarchOfTheEast, 'and the strand flag is set');
  ok(liveStrands(ctx).some((s) => s.name === 'The Western Wall of the East'),
    'the §89 page names it');
}

console.log('== 614: the zealous Return refuses both empires ==');
{
  const { g, ctx } = world614();
  helpers.doctrine(ctx, 'zeal', 6);
  checkTriggeredEvents(ctx);
  const fired = queued(g, KINDS_614);
  ok(fired.indexOf('ev_p_v_third_power') >= 0, 'the third-power card fires');
  ok(fired.length === 1, 'and only it');
  answerAll(ctx, g, 0);
  ok(g.flags.returnKind === 'apart', 'the Return is stamped a kingdom apart');
  const mod = (g.tags.JUD.modifiers || []).find((m) => m.id === 'kingdom_apart');
  ok(mod.effects.incomeMult < 1, 'the standing army that makes it true is paid for');
}

console.log('== 614: the mercantile Return becomes indispensable ==');
{
  const { g, ctx } = world614();
  helpers.doctrine(ctx, 'conquest', -6);
  checkTriggeredEvents(ctx);
  ok(queued(g, KINDS_614).indexOf('ev_p_v_indispensable') >= 0, 'the indispensable card fires');
  answerAll(ctx, g, 0);
  ok(g.flags.returnKind === 'indispensable', 'stamped indispensable');
  for (const k of ['BYZ', 'SAS', 'RSH']) {
    if (!g.tags[k] || !g.tags[k].alive) continue;
    ok(g.tags[k].opinion.JUD > 0, k + ' would rather deal with it than take it');
  }
}

console.log('== choosing an identity moves the axes that chose it ==');
{
  const { g, ctx } = world66();
  helpers.doctrine(ctx, 'zeal', 6);
  helpers.doctrine(ctx, 'authority', 4);
  const before = helpers.axis(ctx, 'zeal');
  checkTriggeredEvents(ctx);
  answerAll(ctx, g, 0);
  ok(helpers.axis(ctx, 'zeal') > before || before >= 10,
    'the altar kingdom reads more zealous afterward, not less');
}

console.log('== every new strand flag is one the content actually sets ==');
{
  // The effects are wrapped in guard(), so the function source is the wrapper
  // rather than the body — read the packages themselves instead.
  const { readFileSync } = await import('fs');
  const src = readFileSync(R + '/js/data/events_66ce.js', 'utf8')
    + readFileSync(R + '/js/data/events_614ce.js', 'utf8');
  const claimed = ['kingdomOfTheAltar', 'commonwealthOfTheChamber', 'worthMoreStanding',
    'westernMarchOfTheEast', 'kingdomApart', 'everyonePrefersItIntact'];
  for (const f of claimed) {
    ok(STRANDS.some((s2) => s2.flag === f), f + ' is registered on the §89 page');
    ok(src.indexOf("setFlag(ctx, '" + f + "'") >= 0, '...and the content actually sets it');
  }
  // ...and nothing on the page is keyed on a flag no package ever writes.
  const all = readFileSync(R + '/js/data/events_167bce.js', 'utf8')
    + readFileSync(R + '/js/data/events_67bce.js', 'utf8')
    + readFileSync(R + '/js/data/events_40bce.js', 'utf8')
    + readFileSync(R + '/js/data/events_132ce.js', 'utf8')
    + readFileSync(R + '/js/data/events_1948.js', 'utf8') + src;
  const orphans = STRANDS.filter((s2) =>
    all.indexOf("setFlag(ctx, '" + s2.flag + "'") < 0
    && all.indexOf('flags.' + s2.flag + ' =') < 0);
  ok(orphans.length === 0,
    'no strand is keyed on a flag nothing writes' + (orphans.length ? ': ' + orphans.map((o) => o.flag).join(', ') : ''));
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
