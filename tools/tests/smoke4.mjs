// Headless smoke test — graphics batch sim hooks: hopTotal (marching
// interpolation), battle round feed (b.last / casualties), getBattleInfo.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const mil = await import(R + '/js/sim/military.js');

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

console.log('== boot 66 CE as JUD ==');
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66, playerTag: 'JUD', rngSeed: 7 });
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
const actions = gameActions(ctx);

console.log('== hopTotal: marching interpolation feed ==');
const myArmy = Object.values(game.armies).find((a) => a && a.tag === 'JUD');
ok(!!myArmy, 'player army exists: ' + (myArmy && myArmy.name));
// Destination: another JUD-owned province (canEnter is ownership-based; the
// fake geometry has no adjacency so we write the path directly, as issueMove would).
let dest = 0;
for (let i = 1; i < game.provinces.length; i++) {
  const p = game.provinces[i];
  if (p && !p.impassable && p.owner === 'JUD' && i !== myArmy.prov) { dest = i; break; }
}
ok(dest > 0, 'found a friendly destination: #' + dest);
myArmy.path = [dest];
myArmy.moveDaysLeft = 0;
game.paused = false;
tickDay(ctx);
ok(myArmy.hopTotal >= 3, 'hopTotal recorded on first march day: ' + myArmy.hopTotal);
ok(myArmy.moveDaysLeft === myArmy.hopTotal - 1, 'moveDaysLeft decremented: ' + myArmy.moveDaysLeft + ' of ' + myArmy.hopTotal);
const frac = (myArmy.hopTotal - myArmy.moveDaysLeft) / myArmy.hopTotal;
ok(frac > 0 && frac < 1, 'interpolation fraction mid-hop: ' + frac.toFixed(3));

console.log('== getBattleInfo ==');
ok(actions.getBattleInfo(myArmy.prov) === null, 'no battle -> null');
// Manufacture a meeting engagement: drop a Roman army onto a JUD army's province.
const jud = Object.values(game.armies).find((a) => a && a.tag === 'JUD' && !a.path.length && !a.inBattle);
const rom = Object.values(game.armies).find((a) => a && a.tag === 'ROM' && !a.inBattle);
ok(!!jud && !!rom, 'both hosts found');
rom.prov = jud.prov;
rom.path = [];
rom.moveDaysLeft = 0;
mil.engageIfNeeded(ctx, rom);
const b = game.battles.find((x) => x && x.prov === jud.prov);
ok(!!b, 'battle started at ' + game.provinces[jud.prov].name);

let info = actions.getBattleInfo(jud.prov);
ok(!!info, 'getBattleInfo returns data');
ok(info.provName === game.provinces[jud.prov].name, 'provName: ' + info.provName);
ok(info.day === 0 && info.last === null, 'day 0, no dice yet');
ok(info.atk.men > 0 && info.def.men > 0, `sides have men: atk ${info.atk.men}, def ${info.def.men}`);
ok(info.playerSide === 'atk' || info.playerSide === 'def', 'playerSide: ' + info.playerSide);
const mySide = info[info.playerSide];
ok(mySide.isMine && mySide.tags.includes('JUD'), 'our side carries JUD');
ok(typeof info.terrain === 'string' && info.terrain.length > 0, 'terrain name: ' + info.terrain);
ok(info.atk.armies.every((a) => a.maxMorale > 0 && a.men > 0), 'attacker army rows sane');

// Fight a day: dice + butcher's bill should appear.
tickDay(ctx);
if (game.battles.find((x) => x && x.prov === jud.prov)) {
  info = actions.getBattleInfo(jud.prov);
  ok(info.day >= 1, 'battle day advanced: ' + info.day);
  ok(info.last && Number.isFinite(info.last.rollA) && Number.isFinite(info.last.rollD),
    `dice recorded: atk ${info.last.rollA} vs def ${info.last.rollD} (${info.last.phase})`);
  ok(info.phase === info.last.phase, 'phase mirrors the last round: ' + info.phase);
  ok(info.atk.casualties >= 0 && info.def.casualties >= 0,
    `casualties tracked: atk ${info.atk.casualties}, def ${info.def.casualties}`);
} else {
  console.log('  (battle resolved in one round — skipping dice checks)');
}

// Let the battle run to its end; the window feed must never throw.
for (let i = 0; i < 40 && game.battles.length; i++) {
  actions.getBattleInfo(jud.prov);
  tickDay(ctx);
}
ok(actions.getBattleInfo(jud.prov) === null || game.battles.some((x) => x.prov === jud.prov),
  'after resolution getBattleInfo is null (or battle legitimately continues)');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
