// Headless smoke test — SPEC §32: every warscore auto-verdict is now an
// OFFER (67/66/132 vs Rome, 614 BYZ vs Persia), and the Third Temple
// missions raise the House on a Mount the later eras start bare.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { checkMissions } = await import(R + '/js/sim/realm.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const mkGeom = () => ({
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [],
});
async function boot(bmName, evName, exportBm, exportEv, playerTag, seed) {
  const { [exportBm]: bookmark } = await import(R + '/js/data/' + bmName + '.js');
  const { [exportEv]: events } = await import(R + '/js/data/' + evName + '.js');
  const geom = mkGeom();
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events });
  return { game, ctx, actions: gameActions(ctx), bookmark };
}
const findWar = (g, a, b) => (g.wars || []).find((w) => w
  && (w.attackers.concat(w.defenders)).indexOf(a) >= 0
  && (w.attackers.concat(w.defenders)).indexOf(b) >= 0);

console.log('== every concession is an offer now ==');
{
  const { game, ctx, actions, bookmark } = await boot('bookmark_66ce', 'events_66ce', 'BOOKMARK_66', 'EVENTS_66', 'JUD', 41);
  const war = findWar(game, 'JUD', 'ROM');
  ok(!!war, '66 CE: the Great Revolt runs');
  const holy = game.provinces.find((p) => p && p.owner === 'ROM' && p.religion === 'judaism');
  const pagan = game.provinces.find((p) => p && p.owner === 'ROM' && p.religion !== 'judaism');
  holy.controller = 'JUD';
  pagan.controller = 'JUD';
  war.warscore.JUD = 55;
  bookmark.checkVictory(ctx);
  ok(!game.result, '66 CE: no auto-verdict at +50');
  const pe = game.pendingEvents.find((x) => x && x.eventId === 'ev_rome_sues');
  ok(!!pe, '66 CE: Rome sues as an event card');
  actions.chooseEventOption(pe.instanceId, 0);
  ok(game.result === 'win' && !findWar(game, 'JUD', 'ROM'), '66 CE: accepting wins and ends the war');
  ok(holy.owner === 'JUD' && pagan.owner === 'ROM', '66 CE: the faith stays ('
    + holy.name + '), the Greek city returns (' + pagan.name + ')');
}
for (const [bm, evf, exBm, exEv, tag, enemy, evId, scoreKey, ws] of [
  ['bookmark_67bce', 'events_67bce', 'BOOKMARK_67', 'EVENTS_67', 'HYR', 'ROM', 'ev4_rome_recoils', 'HYR', 45],
  ['bookmark_132ce', 'events_132ce', 'BOOKMARK_132', 'EVENTS_132', 'JUD', 'ROM', 'ev132_terms', 'JUD', 55],
  ['bookmark_614ce', 'events_614ce', 'BOOKMARK_614', 'EVENTS_614', 'BYZ', 'SAS', 'ev614_persia_sues', 'BYZ', 40],
]) {
  const { game, ctx, bookmark } = await boot(bm, evf, exBm, exEv, tag, 42);
  let war = findWar(game, tag, enemy);
  if (!war) {
    ctx.helpers.declareWar(ctx, enemy, tag, 'Staged Intervention');
    war = findWar(game, tag, enemy);
    if (bm === 'bookmark_67bce') {
      const rival = game.tags.ARI;
      if (rival) rival.alive = false;
    }
  }
  war.warscore[scoreKey] = ws;
  bookmark.checkVictory(ctx);
  const fired = game.pendingEvents.some((x) => x && x.eventId === evId);
  ok(!game.result && fired, bm.replace('bookmark_', '') + ': ' + evId + ' offered, no auto-verdict');
  bookmark.checkVictory(ctx);
  ok(game.pendingEvents.filter((x) => x && x.eventId === evId).length === 1,
    bm.replace('bookmark_', '') + ': offered once');
}

console.log('== Bar Kokhba endurance is an offer, not an automatic annexation ==');
function stageEnduranceOffer(game) {
  game.date = { y: 136, m: 1, d: 1 };
  const war = findWar(game, 'JUD', 'ROM');
  war.warscore.JUD = 0;
  const holy = game.provinces.find((p) => p && p.owner === 'ROM' && p.religion === 'judaism');
  const pagan = game.provinces.find((p) => p && p.owner === 'ROM' && p.religion !== 'judaism');
  holy.controller = 'JUD';
  pagan.controller = 'JUD';
  return { war, holy, pagan };
}
{
  const { game, ctx, actions, bookmark } = await boot(
    'bookmark_132ce', 'events_132ce', 'BOOKMARK_132', 'EVENTS_132', 'JUD', 47,
  );
  const { holy, pagan } = stageEnduranceOffer(game);
  bookmark.checkVictory(ctx);
  const pe = game.pendingEvents.find((x) => x && x.eventId === 'ev132_endurance_terms');
  ok(!!pe && !game.result && !!findWar(game, 'JUD', 'ROM'),
    '136 CE: holding the heartland queues a settlement card and leaves the war running');
  ok(holy.owner === 'ROM' && pagan.owner === 'ROM',
    '136 CE: reaching the deadline annexes nothing before the player chooses');
  bookmark.checkVictory(ctx);
  ok(game.pendingEvents.filter((x) => x && x.eventId === 'ev132_endurance_terms').length === 1,
    '136 CE: the endurance offer is queued only once');
  actions.chooseEventOption(pe.instanceId, 1);
  ok(!game.result && !!findWar(game, 'JUD', 'ROM'), 'refusing the settlement keeps the war running');
  ok(holy.owner === 'ROM' && pagan.owner === 'ROM'
      && holy.controller === 'JUD' && pagan.controller === 'JUD',
    'refusing preserves ownership and occupations exactly as they stood');
}
{
  const { game, ctx, actions, bookmark } = await boot(
    'bookmark_132ce', 'events_132ce', 'BOOKMARK_132', 'EVENTS_132', 'JUD', 48,
  );
  const { holy, pagan } = stageEnduranceOffer(game);
  bookmark.checkVictory(ctx);
  const pe = game.pendingEvents.find((x) => x && x.eventId === 'ev132_endurance_terms');
  actions.chooseEventOption(pe.instanceId, 0);
  ok(game.result === 'win' && !findWar(game, 'JUD', 'ROM'),
    'accepting the settlement is the action that ends the war');
  ok(holy.owner === 'JUD' && pagan.owner === 'ROM',
    'acceptance keeps occupied Jewish land and returns the other occupied provinces');
}

console.log('== the Mount stands bare after 70 CE ==');
{
  const { game } = await boot('bookmark_66ce', 'events_66ce', 'BOOKMARK_66', 'EVENTS_66', 'JUD', 43);
  const j = game.provinces.find((p) => p && p.canon === 'Jerusalem');
  ok(j.wonder === 'temple', '66 CE: the Second Temple stands');
}
for (const [bm, evf, exBm, exEv, tag] of [
  ['bookmark_132ce', 'events_132ce', 'BOOKMARK_132', 'EVENTS_132', 'JUD'],
  ['bookmark_614ce', 'events_614ce', 'BOOKMARK_614', 'EVENTS_614', 'JUD'],
  ['bookmark_1948', 'events_1948', 'BOOKMARK_1948', 'EVENTS_1948', 'ISR'],
]) {
  const { game } = await boot(bm, evf, exBm, exEv, tag, 44);
  const j = game.provinces.find((p) => p && p.canon === 'Jerusalem');
  ok(j && j.wonder === null && j.holy, bm.replace('bookmark_', '') + ': no Temple, the holy site remains');
}

console.log('== Raise the Third House ==');
for (const [bm, evf, exBm, exEv, missionCount] of [
  ['bookmark_132ce', 'events_132ce', 'BOOKMARK_132', 'EVENTS_132', 5],
  ['bookmark_614ce', 'events_614ce', 'BOOKMARK_614', 'EVENTS_614', 5],
]) {
  const { game, ctx, bookmark } = await boot(bm, evf, exBm, exEv, 'JUD', 46);
  const jud = game.tags.JUD;
  const j = game.provinces.find((p) => p && p.canon === 'Jerusalem');
  jud.missionIdx = missionCount;
  const mission = bookmark.missions.JUD[missionCount];
  ok(mission && /Third House/.test(mission.name), bm.replace('bookmark_', '') + ': the mission waits: ' + mission.name);
  jud.treasury = 100; jud.stability = 0;
  j.owner = 'JUD'; j.controller = 'JUD';
  checkMissions(ctx);
  ok(j.wonder === null, 'no House on 100 talents');
  jud.treasury = 600; jud.stability = 2;
  const legBefore = jud.legitimacy || 0;
  checkMissions(ctx);
  ok(j.wonder === 'temple', bm.replace('bookmark_', '') + ': the Third Temple rises on the Mount');
  ok(jud.treasury === 300, 'the House cost 300 talents: ' + jud.treasury);
  ok((jud.legitimacy || 0) === Math.min(100, legBefore + 20), '+20 legitimacy');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
