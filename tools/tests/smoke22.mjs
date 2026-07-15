// Headless smoke test — save/load resumes the RNG stream exactly, and a
// multiplayer formable moves every host/guest chair to the replacement tag.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { createRng } = await import(R + '/js/core/rng.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { initGame, makeCtx, reviveGame } = await import(R + '/js/sim/init.js');
const { switchTagCore } = await import(R + '/js/sim/military.js');
const { remapGuestChairs, resolveSnapshotChair, restoreHostChair }
  = await import(R + '/js/net/mp_state.js');

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

console.log('== saves resume the random stream ==');
{
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66,
    playerTag: 'JUD', rngSeed: 12345,
  });
  const live = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
  live.rng.next();
  live.rng.next();
  const saved = JSON.parse(JSON.stringify(game));
  const expected = live.rng.next();
  const loaded = reviveGame(saved);
  const resumed = makeCtx({
    game: loaded, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66,
  }).rng.next();
  ok(expected === resumed, 'the first draw after load is the next draw, not the campaign opener');
  ok(Number.isFinite(saved.rngState) && saved.rngState !== saved.rngSeed,
    'the advanced cursor is plain saved game data');

  const legacy = JSON.parse(JSON.stringify(game));
  delete legacy.rngState;
  reviveGame(legacy);
  const legacyDraw = makeCtx({
    game: legacy, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66,
  }).rng.next();
  ok(legacyDraw === createRng(legacy.rngSeed).next(), 'a pre-cursor save falls back to rngSeed');
}

console.log('== a new banner moves every multiplayer chair ==');
{
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66,
    playerTag: 'JUD', rngSeed: 7,
  });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
  const sent = [];
  const guests = [
    { tag: 'JUD', peer: { send: (m) => sent.push(m) } },
    { tag: 'JUD', peer: { send: (m) => sent.push(m) } },
  ];
  const previousTag = game.playerTag;
  game.playerTag = guests[0].tag;
  ok(switchTagCore(ctx, 'JUD', 'MLI'), 'the commanded realm forms the Kingdom of Israel');
  ok(remapGuestChairs(guests, 'JUD', 'MLI') === 2, 'both guest chairs follow the new banner');
  game.playerTag = restoreHostChair(game, previousTag, guests[0].tag);
  ok(game.playerTag === 'MLI' && !!game.tags[game.playerTag], 'the host does not restore the deleted tag');
  ok(sent.length === 2 && sent.every((m) => m.t === 'chair' && m.tag === 'MLI'),
    'each guest receives the authoritative chair change');
  ok(resolveSnapshotChair(game.tags, 'JUD', game.playerTag) === 'MLI',
    'a snapshot replaces a stale assigned chair with its valid host chair');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
