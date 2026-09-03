// Headless smoke test §263: the gather order.
//
// One standard calls every host of ours within a ring of provinces, and one
// right-click marches them all on a meeting province of the player's choosing.
// What this suite holds: the ring is measured along ground we may march
// through and stops at the radius; the order moves everyone it can and names
// everyone it cannot, once; the query is a query (a guest's chair answers it
// locally) and the order is an order; and the chrome carries the key and the
// button.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { GENERIC_EVENTS } = await import(R + '/js/data/events_generic.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { armiesNear, spawnArmy } = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1),
  bbox: [],
};
const link = (a, b) => { geom.neighbors[a].add(b); geom.neighbors[b].add(a); };
const ev = EVENTS_66.concat(GENERIC_EVENTS);
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: ev, playerTag: 'JUD', rngSeed: 11 });
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: ev });
const actions = gameActions(ctx);
const notes = [];
bus.on('notify', (n) => notes.push(n));

// A road of our own: five Judaean provinces in a chain, and a sixth beyond a
// neutral we are not at war with. Every scripted army is stood down first so
// the count is the suite's.
for (const id of Object.keys(game.armies)) delete game.armies[id];
const ours = [];
for (let id = 1; id <= N && ours.length < 6; id++) {
  const p = game.provinces[id];
  if (p && p.owner === 'JUD' && p.controller === 'JUD' && !p.impassable) ours.push(id);
}
ok(ours.length === 6, 'six Judaean provinces to lay the road through');
const [P0, P1, P2, P3, P4, P5] = ours;
link(P0, P1); link(P1, P2); link(P2, P3); link(P3, P4);
// The far province sits past a neutral court's ground.
let neutral = 0;
for (let id = 1; id <= N; id++) {
  const p = game.provinces[id];
  if (p && p.owner && p.owner !== 'JUD' && p.owner !== 'WASTE' && !p.impassable
      && !(game.tags.JUD.atWarWith || []).includes(p.owner) && game.tags[p.owner]) { neutral = id; break; }
}
ok(neutral > 0, 'a neutral court\'s province to put in the way (' + game.provinces[neutral].name + ')');
link(P0, neutral); link(neutral, P5);
const name = (id) => game.provinces[id].name;
const mk = (pid, nm) => spawnArmy(ctx, 'JUD', name(pid), { inf: 2, name: nm });
const A0 = mk(P0, 'The Standard');
const A1 = mk(P1, 'First Host');
const A2 = mk(P2, 'Second Host');
const A3 = mk(P3, 'Third Host');
const A4 = mk(P4, 'Fourth Host');
const A5 = mk(P5, 'Far Host');
ok([A0, A1, A2, A3, A4, A5].every((id) => id && game.armies[id]), 'six hosts stood up along it');

// ---------------------------------------------------------------------------
console.log('== the ring ==');
{
  const near = armiesNear(ctx, 'JUD', A0, 2);
  ok(near.length === 2 && near[0] === A1 && near[1] === A2,
    'two provinces out: the first and second hosts, nearest first (' + near.join(',') + ')');
  ok(armiesNear(ctx, 'JUD', A0, 4).join(',') === [A1, A2, A3, A4].join(','),
    'four out: all four down the road');
  ok(!armiesNear(ctx, 'JUD', A0, 6).includes(A5),
    'the far host is one hop past a neutral we cannot march through, so it is not near');
  game.tags.JUD.atWarWith = [game.provinces[neutral].owner];
  ok(armiesNear(ctx, 'JUD', A0, 2).includes(A5),
    '  at war with that court, the road opens and it answers');
  game.tags.JUD.atWarWith = [];
  ok(armiesNear(ctx, 'JUD', A0).length === 2, 'the default ring is DEFINES.GATHER_RADIUS (' + DEFINES.GATHER_RADIUS + ')');
  ok(armiesNear(ctx, 'JUD', A0, 99).length === 4 && DEFINES.GATHER_RADIUS_MAX < 99,
    'and the ring is capped at GATHER_RADIUS_MAX (' + DEFINES.GATHER_RADIUS_MAX + ')');
  ok(armiesNear(ctx, 'JUD', A0, 0).length === 0, 'a ring of nothing calls nobody');
  game.armies[A1].aboard = true;
  ok(!armiesNear(ctx, 'JUD', A0, 2).includes(A1), 'a host at sea does not answer');
  game.armies[A1].aboard = false;
  ok(armiesNear(ctx, 'ROM', A0, 2).length === 0, 'another court\'s standard calls none of ours');
  ok(actions.getArmiesNear(A0, 2).join(',') === [A1, A2].join(','), 'the action answers the same');
}

// ---------------------------------------------------------------------------
console.log('== the order ==');
{
  notes.length = 0;
  const r = actions.gatherArmies(A0, P3, 2);
  ok(r && r.marched.length === 3 && r.refused.length === 0,
    'the standard and the two hosts it called march (' + (r && r.marched.length) + ')');
  ok(game.armies[A0].path.length === 3 && game.armies[A1].path.length === 2 && game.armies[A2].path.length === 1,
    '  each on its own road to the meeting province');
  ok(game.armies[A3].path.length === 0 && game.armies[A4].path.length === 0, '  the hosts beyond the ring stand where they were');
  ok(notes.length === 1 && /3 hosts gather/.test(notes[0].title) && notes[0].text.includes(name(P3)),
    '  one notice: ' + (notes[0] && notes[0].title + ' — ' + notes[0].text));

  // A host in battle stays, and is named.
  for (const id of [A0, A1, A2]) { game.armies[id].path = []; }
  game.armies[A1].inBattle = true;
  notes.length = 0;
  const r2 = actions.gatherArmies(A0, P2, 2);
  ok(r2.marched.length === 2 && r2.refused.length === 1 && r2.refused[0] === A1,
    'a host locked in battle stays and the rest march');
  ok(notes.length === 2 && /One host stays/.test(notes[1].title) && notes[1].text.includes('First Host')
      && notes[1].text.includes('locked in battle'),
    '  and the notice names it and says why');
  game.armies[A1].inBattle = false;

  // The meeting province itself: a host already there is "marched" with no road.
  ok(r2.marched.includes(A2) && game.armies[A2].path.length === 0, 'the host at the meeting place holds it');

  // Not ours, not a province: nothing happens, nothing throws.
  ok(actions.gatherArmies(999999, P2, 2) === null, 'an unknown standard is refused quietly');
  ok(actions.gatherArmies(A0, 0, 2) === null, 'no meeting province, no order');

  // moveArmy still refuses with the same words (SPEC §263 factored the checks).
  notes.length = 0;
  game.armies[A1].inBattle = true;
  actions.moveArmy(A1, P2);
  ok(notes.length === 1 && notes[0].title === 'Orders refused' && /locked in battle/.test(notes[0].text),
    'a single move order still says why it is refused');
  game.armies[A1].inBattle = false;
}

// ---------------------------------------------------------------------------
console.log('== a query is a query, an order is an order, and the chrome carries both ==');
{
  const MAIN = readFileSync(R + '/main.js', 'utf8');
  const re = new RegExp(/const MP_QUERY_RE = (\/[^/]+\/);/.exec(MAIN)[1].slice(1, -1));
  ok(re.test('getArmiesNear'), 'getArmiesNear is a query: a guest\'s chair answers it locally');
  ok(!re.test('gatherArmies'), 'gatherArmies is an order: it goes to the host');
  const UI = readFileSync(R + '/js/ui/ui.js', 'utf8');
  ok(/e\.key === 'g' \|\| e\.key === 'G'/.test(UI) && /gatherNearby\(g\.ui\.selectedArmy\)/.test(UI),
    'G gathers around the selected army');
  ok(/state\.actions\.gatherArmies\(call\.armyId, provId, call\.radius\)/.test(UI),
    'the next right-click is one gather order');
  ok(/Math\.min\(max, gather\.radius \+ 1\)/.test(UI), 'pressing again widens the ring');
  ok(/<b>G<\/b> gather/.test(UI), 'the primer says so');
  const OL = readFileSync(R + '/js/ui/outliner.js', 'utf8');
  ok(/data-gather="\$\{a\.id\}"/.test(OL) && /onGatherClick/.test(OL),
    'the selected army\'s row carries the button, so a phone can gather too');
}

console.log(failures ? `smoke180: ${failures} FAIL` : 'smoke180: ALL PASS');
process.exit(failures ? 1 : 0);
