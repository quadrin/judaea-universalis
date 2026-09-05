// Headless smoke test §263/§264: a group marches on a click, the roster is
// sorted by size and shows what each column is made of.
//
// §263 put a "gather" button and a G key in the chrome; §264 withdrew them
// for the EU4 habit — shift-click builds the group, a click on a province
// marches it — and kept the one thing under §263 worth keeping, the march
// order's refusals factored out of moveArmy so they read the same from any
// caller. This suite holds the refusal words, the roster's order and its
// composition line, and the chrome's reading of a click.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { GENERIC_EVENTS } = await import(R + '/js/data/events_generic.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { spawnArmy } = await import(R + '/js/sim/military.js');
const { armyOrder, armyCompositionHtml } = await import(R + '/js/ui/outliner.js');

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

// Three Judaean provinces in a chain, and three hosts of different sizes and
// mixes on the first of them. Every scripted army is stood down first so the
// roster is the suite's.
for (const id of Object.keys(game.armies)) delete game.armies[id];
const ours = [];
for (let id = 1; id <= N && ours.length < 3; id++) {
  const p = game.provinces[id];
  if (p && p.owner === 'JUD' && p.controller === 'JUD' && !p.impassable) ours.push(id);
}
ok(ours.length === 3, 'three Judaean provinces to lay the road through');
const [P0, P1, P2] = ours;
link(P0, P1); link(P1, P2);
const name = (id) => game.provinces[id].name;
const A_big = spawnArmy(ctx, 'JUD', name(P0), { inf: 6, cav: 2, art: 1, name: 'The Host' });
const A_mid = spawnArmy(ctx, 'JUD', name(P0), { inf: 3, name: 'The Militia' });
const A_small = spawnArmy(ctx, 'JUD', name(P0), { cav: 1, name: 'The Riders' });
ok([A_big, A_mid, A_small].every((id) => id && game.armies[id]), 'three hosts stood up');

// ---------------------------------------------------------------------------
console.log('== the march order refuses in its own words, from any caller ==');
{
  notes.length = 0;
  actions.moveArmy(A_big, P2);
  ok(game.armies[A_big].path.length === 2 && notes.length === 0, 'a move order marches, silently');
  game.armies[A_mid].inBattle = true;
  actions.moveArmy(A_mid, P2);
  ok(notes.length === 1 && notes[0].title === 'Orders refused' && /locked in battle/.test(notes[0].text),
    'a host in battle is refused, and told why: ' + (notes[0] && notes[0].text));
  game.armies[A_mid].inBattle = false;
  notes.length = 0;
  game.armies[A_small].aboard = true;
  actions.moveArmy(A_small, P2);
  ok(notes.length === 1 && /at sea/.test(notes[0].text), 'a host at sea is refused, and told why');
  game.armies[A_small].aboard = false;
  // A group is one call per army (the UI's marchGroup), so each refusal
  // names its own host.
  notes.length = 0;
  game.armies[A_mid].inBattle = true;
  for (const id of [A_big, A_mid, A_small]) actions.moveArmy(id, P1);
  ok(notes.length === 1 && notes[0].text.includes('The Militia'),
    'a group order: the two that can march do, the one that cannot is named');
  ok(game.armies[A_big].path.length === 1 && game.armies[A_small].path.length === 1, '  and the other two are on the road');
  game.armies[A_mid].inBattle = false;
}

// ---------------------------------------------------------------------------
console.log('== the roster: largest first, and what each column is made of ==');
{
  const roster = [game.armies[A_small], game.armies[A_mid], game.armies[A_big]].sort(armyOrder);
  ok(roster[0].id === A_big && roster[1].id === A_mid && roster[2].id === A_small,
    'sorted by men, largest first (' + roster.map((a) => a.men).join(' > ') + ')');
  const tie = [{ men: 100, name: 'B' }, { men: 100, name: 'A' }].sort(armyOrder);
  ok(tie[0].name === 'A', '  ties by name, so the order is stable');
  const h = armyCompositionHtml(game.armies[A_big]);
  ok(/data-arm="inf"[^<]*<svg[\s\S]*?<\/svg>6/.test(h) && /data-arm="cav"[\s\S]*?<\/svg>2/.test(h) && /data-arm="art"[\s\S]*?<\/svg>1/.test(h),
    'a mixed host lists every arm with its face and count');
  const h2 = armyCompositionHtml(game.armies[A_small]);
  ok(/data-arm="cav"/.test(h2) && !/data-arm="inf"/.test(h2) && !/data-arm="art"/.test(h2),
    'a single-arm host lists only that arm');
  ok(/no regiments/.test(armyCompositionHtml({ regiments: {} })), 'an empty formation says so');
  const OL = readFileSync(R + '/js/ui/outliner.js', 'utf8');
  ok(/\.sort\(armyOrder\)/.test(OL), 'the outliner sorts its armies with it');
  ok(/\$\{armyCompositionHtml\(a\)\}/.test(OL), '  and prints the composition in every army row');
  ok(!/data-gather/.test(OL), '  and the gather button is gone');
}

// ---------------------------------------------------------------------------
console.log('== the chrome: shift-click builds the group, a click marches it ==');
{
  const UI = readFileSync(R + '/js/ui/ui.js', 'utf8');
  ok(/if \(provId > 0 && grp\.length >= 2\) \{\s*marchGroup\(grp, provId\);/.test(UI),
    'two or more of our armies selected: a click on a province is the order');
  ok(/if \(grouping\) return; \/\/ shift\/group taps on terrain don't drop a built-up group/.test(UI),
    '  a shift-click on terrain still keeps the group');
  ok(/function marchGroup\(grp, provId\)/.test(UI) && /for \(const id of grp\) state\.actions\.moveArmy\(id, provId\);/.test(UI),
    '  and the order is one moveArmy per army, so each refusal names its host');
  ok(!/gatherNearby|gatherArmies|e\.key === 'g'/.test(UI), 'the gather call and the G key are gone');
  ok(/<b>Shift-click<\/b> armies/.test(UI) && /<b>click<\/b> a province: the whole group marches/.test(UI),
    'the primer says so');
  const INIT = readFileSync(R + '/js/sim/init.js', 'utf8');
  ok(/function marchOrder\(a, provId\)/.test(INIT) && !/gatherArmies|getArmiesNear/.test(INIT),
    'the refusal checks stay factored; the gather order is gone');
}

console.log(failures ? `smoke180: ${failures} FAIL` : 'smoke180: ALL PASS');
process.exit(failures ? 1 : 0);
