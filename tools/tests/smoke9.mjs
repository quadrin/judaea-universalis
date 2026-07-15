// Headless smoke test — the chronicle + news from abroad: entries on war,
// peace, ruler death, coalitions, the fall of nations; filtered toasts for
// AI-only events; save round-trip; getChronicle action.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');
const realm = await import(R + '/js/sim/realm.js');

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
  areas: new Int32Array(N + 1), bbox: [],
};
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66, playerTag: 'JUD', rngSeed: 9 });
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
const actions = gameActions(ctx);

const toasts = [];
bus.on('notify', (p) => toasts.push(p));
const kinds = () => game.chronicle.map((e) => e.kind);

console.log('== the chronicle opens ==');
ok(Array.isArray(game.chronicle) && game.chronicle[0] && game.chronicle[0].kind === 'era',
  'opening entry: ' + JSON.stringify(game.chronicle[0]));

console.log('== other people\'s wars are quieter news ==');
toasts.length = 0;
game.truces = {};
const w1 = mil.declareWar(ctx, 'PAR', 'ARM', 'A Distant Quarrel');
ok(!!w1, 'AI war declared');
ok(kinds().includes('war'), 'war chronicled: ' + game.chronicle.find((e) => e.kind === 'war').text);
ok(toasts.some((t) => t.title === 'News from abroad'), 'news from abroad toast: ' + JSON.stringify(toasts.map((t) => t.title)));
ok(!toasts.some((t) => t.title === 'War!'), 'no War! alarm for a war that is not ours');

console.log('== our wars still sound the alarm ==');
toasts.length = 0;
const w2 = game.wars.find((w) => w.attackers.includes('JUD') || w.defenders.includes('JUD'));
ok(!!w2, 'the scripted revolt involves the player');
mil.declareWar(ctx, 'NAB', 'JUD', 'Test Raid');
ok(toasts.some((t) => t.title === 'War!'), 'War! toast for our own war');

console.log('== peace is chronicled, abroad and at home ==');
toasts.length = 0;
mil.endWarBySword(ctx, w1, 'att');
ok(game.chronicle.some((e) => e.kind === 'peace' && e.text.includes('A Distant Quarrel')),
  'sword peace chronicled: ' + game.chronicle.filter((e) => e.kind === 'peace').map((e) => e.text).join(' | '));
ok(toasts.some((t) => t.title === 'News from abroad'), 'AI peace arrives as news from abroad');

console.log('== the crown passes ==');
realm.rulerDies(ctx, 'PAR', 'has died of a fever');
ok(game.chronicle.some((e) => e.kind === 'ruler' && e.text.includes('fever')),
  'succession chronicled: ' + game.chronicle.find((e) => e.kind === 'ruler').text);

console.log('== the fall of a nation ==');
toasts.length = 0;
for (let i = 1; i < game.provinces.length; i++) {
  const p = game.provinces[i];
  if (p && !p.impassable && p.owner === 'AGR') { p.owner = 'ROM'; p.controller = 'ROM'; }
}
for (const a of Object.values(game.armies)) if (a && a.tag === 'AGR') delete game.armies[a.id];
mil.updateTagLife(ctx);
ok(game.tags.AGR.alive === false, 'Agrippa\'s realm is gone');
ok(game.chronicle.some((e) => e.kind === 'fall' && e.text.includes(game.tags.AGR.name || 'AGR')),
  'the fall chronicled: ' + game.chronicle.find((e) => e.kind === 'fall').text);
ok(toasts.some((t) => t.title === 'News from abroad' && /no more/.test(t.text)), 'the fall is news');

console.log('== the action & the cap ==');
const list = actions.getChronicle();
ok(Array.isArray(list) && list.length === game.chronicle.length && list.length >= 5,
  'getChronicle returns ' + list.length + ' entries');
for (let i = 0; i < 500; i++) mil.chronicle(ctx, 'note', 'filler ' + i);
ok(game.chronicle.length <= 400, 'the oldest pages crumble: ' + game.chronicle.length);

console.log('== save round-trip ==');
const revived = reviveGame(JSON.parse(JSON.stringify(game)));
ok(revived && Array.isArray(revived.chronicle) && revived.chronicle.length === game.chronicle.length,
  'chronicle survives a save');
const old = JSON.parse(JSON.stringify(game));
delete old.chronicle;
const revivedOld = reviveGame(old);
ok(revivedOld && Array.isArray(revivedOld.chronicle) && revivedOld.chronicle.length === 0,
  'pre-chronicle saves get an empty book');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
