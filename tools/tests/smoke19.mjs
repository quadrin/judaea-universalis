// Headless smoke test — SPEC §34: the deepened eras and the playtest fixes.
// The thin chains (40 BCE, 614 CE, 1948) carry their new events
// well-formed; dated cards fire on schedule; the 614 defiance arrives with an
// actual army and no cheap white peace behind it (fresh-grudge rule); and the
// Objectives block retires once the chapter's verdict is in.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { checkDateEvents } = await import(R + '/js/sim/events.js');
const mil = await import(R + '/js/sim/military.js');
const fac = await import(R + '/js/sim/factions.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, (_, i) => {
    const s = new Set();
    if (i > 1) s.add(i - 1);
    if (i >= 1 && i < N) s.add(i + 1);
    return s;
  }),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [],
};
const boot = async (bmFile, bmKey, evFile, evKey, playerTag, seed) => {
  const { [bmKey]: bookmark } = await import(R + '/js/data/' + bmFile);
  const { [evKey]: events } = await import(R + '/js/data/' + evFile);
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events });
  return { game, ctx, events, actions: gameActions(ctx) };
};

console.log('== the deepened chains are well-formed ==');
const provNames = new Set(MAP_DATA.provinces.map((p) => p.name));
for (const [evFile, evKey, minCount] of [
  ['events_40bce.js', 'EVENTS_40', 22],
  ['events_614ce.js', 'EVENTS_614', 19],
  ['events_1948.js', 'EVENTS_1948', 22],
]) {
  const { [evKey]: evs } = await import(R + '/js/data/' + evFile);
  const ids = evs.map((e) => e && e.id);
  const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
  const sound = evs.every((e) => e && e.id && e.title && e.desc
    && (e.date || typeof e.trigger === 'function')
    && Array.isArray(e.options) && e.options.length
    && e.options.every((o) => o && o.label && typeof o.effects === 'function'));
  ok(evs.length >= minCount && !dupes.length && sound,
    evFile.replace('events_', '').replace('.js', '') + ': ' + evs.length + ' events, unique and sound');
}

console.log('== the new dated cards fire on schedule (40 BCE) ==');
{
  const { game, ctx, actions } = await boot('bookmark_40bce.js', 'BOOKMARK_40', 'events_40bce.js', 'EVENTS_40', 'HER', 40);
  game.date = { y: -39, m: 1, d: 1 };
  checkDateEvents(ctx); // catch-up: everything dated -40 fires
  const fired = () => Object.keys(game.firedEvents);
  // resolve the queue the way a player would
  let guard = 0;
  while (game.pendingEvents.length && guard++ < 20) {
    actions.chooseEventOption(game.pendingEvents[0].instanceId, 0);
  }
  ok(fired().includes('ev5_labienus'), 'the Parthian Roman rides (dated -40/9)');
  ok(fired().includes('ev5_masada'), 'the cisterns of Masada fill (dated -40/12)');
  const her = game.tags.HER;
  ok(her.points.infl >= 10, 'Masada\'s story travels: HER influence banked');
}

console.log('== the 614 defiance has teeth ==');
{
  const { game, ctx, events } = await boot('bookmark_614ce.js', 'BOOKMARK_614', 'events_614ce.js', 'EVENTS_614', 'JUD', 614);
  game.date = { y: 617, m: 6, d: 1 };
  const ev = events.find((e) => e.id === 'ev_p_betrayal');
  ev.options[1].effects(ctx); // defy the King of Kings
  const w = game.wars.find((x) => x && x.name === 'The Betrayal Repaid');
  ok(!!w, 'defiance declares the war');
  const column = Object.values(game.armies).find((a) => a && a.name === 'The Punitive Column');
  ok(!!column && column.tag === 'SAS' && column.men > 5000, 'the punitive column marches: '
    + (column ? column.men + ' men' : 'missing'));
  const white = { provinces: [], gold: 0, humiliate: false, subjugate: false, reparations: false };
  const fresh = mil.evaluatePeaceDeal(ctx, w, 'JUD', white);
  ok(!fresh.acceptable && /young/.test(fresh.reason), 'no cheap peace while the grudge is fresh: ' + fresh.reason);
  game.date = { y: 618, m: 7, d: 1 };
  const later = mil.evaluatePeaceDeal(ctx, w, 'JUD', white);
  ok(later.acceptable, 'a year on, an even war can end white');
  game.date = { y: 617, m: 8, d: 1 };
  w.warscore = w.warscore || {};
  w.warscore.JUD = 30;
  w.warscore.SAS = -30;
  const losing = mil.evaluatePeaceDeal(ctx, w, 'JUD', white);
  ok(losing.acceptable, 'a fresh enemy who is LOSING still takes the white peace');
}

console.log('== objectives retire with the verdict ==');
{
  const { game, actions } = await boot('bookmark_614ce.js', 'BOOKMARK_614', 'events_614ce.js', 'EVENTS_614', 'JUD', 6141);
  const live = actions.getObjectives();
  ok(Array.isArray(live) && live.length >= 3 && live.some((l) => /^Win:/.test(l)),
    'before the verdict: the era\'s goals stand (' + live.length + ' lines)');
  game.result = 'win';
  const won = actions.getObjectives();
  ok(won.length === 1 && /^Win: the verdict is ours/.test(won[0]), 'after a win: one settled line, still green');
  game.result = 'loss';
  const lost = actions.getObjectives();
  ok(lost.length === 1 && /^Lose:/.test(lost[0]), 'after a loss: one settled line, still red');
}

console.log('== the era events speak to the court (1948) ==');
{
  const { game, ctx, events } = await boot('bookmark_1948.js', 'BOOKMARK_1948', 'events_1948.js', 'EVENTS_1948', 'ISR', 1948);
  fac.monthlyFactions(ctx); // seat the court
  const t = game.tags.ISR;
  ok(Math.round(t.factions.revisionists) === 50, 'the Revisionists open content at 50');
  const altalena = events.find((e) => e.id === 'ev_i_altalena');
  altalena.options[0].effects(ctx); // one state, one army — fire
  ok(Math.round(t.factions.revisionists) === 30 && Math.round(t.factions.coalition) === 60,
    'the Altalena moves the court: Revisionists 30, Coalition 60');
  const knesset = events.find((e) => e.id === 'ev_i_knesset');
  knesset.options[0].effects(ctx);
  ok(Math.round(t.factions.coalition) === 70, 'the first Knesset rewards the Coalition (70)');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
