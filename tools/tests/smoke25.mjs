// Headless regression — ordinary revolt defections stay near a country's
// border, with a narrow homeland exception for the ancient Judaean bookmarks.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { EVENTS_167 } = await import(R + '/js/data/events_167bce.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { monthlyUnrest } = await import(R + '/js/sim/unrest.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
function makeGeom() {
  return {
    neighbors: Array.from({ length: N + 1 }, () => new Set()),
    centroids: [null, ...MAP_DATA.provinces.map((p) => {
      const [x, y] = MAP_DATA.project(p.lon, p.lat);
      return { x, y };
    })],
    areas: new Int32Array(N + 1), bbox: [],
  };
}

function start(bookmark, events, playerTag, seed) {
  const geom = makeGeom();
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events });
  return { game, ctx, geom };
}

function connect(ctx, a, b) {
  const aid = ctx.provId(a), bid = ctx.provId(b);
  ctx.geom.neighbors[aid].add(bid);
  ctx.geom.neighbors[bid].add(aid);
}

function forceRevolt(ctx, name) {
  const p = ctx.prov(name);
  p.garrison = 0;
  p.revoltCooldownMonths = 0;
  p.revoltProgress = 100;
  p.modifiers.push({ id: 'diagnostic_unrest', name: 'Diagnostic unrest', months: 1, effects: { unrest: 20 } });
  const before = new Set(Object.keys(ctx.game.armies));
  monthlyUnrest(ctx);
  return Object.values(ctx.game.armies).find((a) => a && !before.has(String(a.id)));
}

console.log('== remote diaspora revolts remain autonomous ==');
const roman = start(BOOKMARK_66, EVENTS_66, 'JUD', 250);
const egypt = forceRevolt(roman.ctx, 'Leontopolis');
ok(egypt && egypt.tag === 'REB', 'distant Leontopolis creates REB, not a Judaean player army');
ok(roman.ctx.prov('Leontopolis').controller === 'REB', 'the autonomous rising controls its ungarrisoned province');

console.log('== a revolt on the border may join ==');
connect(roman.ctx, 'Jamnia', 'Lydda');
const jamnia = forceRevolt(roman.ctx, 'Jamnia');
ok(jamnia && jamnia.tag === 'JUD', 'Jamnia bordering Judaean Lydda rises for JUD');
ok(roman.ctx.prov('Jamnia').controller === 'JUD', 'the local rising transfers control to Judaea');

console.log('== the ancient Judaean heartland is the narrow exception ==');
const maccabee = start(BOOKMARK_167, EVENTS_167, 'HAS', 251);
const jerusalem = forceRevolt(maccabee.ctx, 'Jerusalem');
ok(jerusalem && jerusalem.tag === 'HAS', 'occupied Jerusalem may rise for land-poor Hasmonean Judaea');
ok(maccabee.ctx.prov('Jerusalem').controller === 'HAS', 'the ungarrisoned heartland rising transfers control');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
