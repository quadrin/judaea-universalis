// Headless smoke test — Herod's Rise, 40 BCE: world setup, the Rome arc
// (flight -> Senate -> Rome joins), Gindarus (Parthia broken), missions.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_40 } = await import(R + '/js/data/bookmark_40bce.js');
const { EVENTS_40 } = await import(R + '/js/data/events_40bce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');

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
  coastal: [false, ...MAP_DATA.provinces.map((p) => p.terrain === 'coast')],
  offshore: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
};

console.log('== boot 40 BCE as HER ==');
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_40, events: EVENTS_40, playerTag: 'HER', rngSeed: 7 });
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_40, events: EVENTS_40 });
const actions = gameActions(ctx);

ok(ctx.prov('Jerusalem').owner === 'ATG' && ctx.prov('Hebron').owner === 'HER', 'the kingdom is split HER/ATG');
ok(ctx.prov('Damascus').owner === 'PAR' && ctx.prov('Antioch').owner === 'ROM', 'Parthia holds inner Syria, Rome the coast');
const w = game.wars[0];
ok(w && w.name === 'The War for the Crown' && w.attackers.join('+') === 'ATG+PAR' && w.noNegotiation,
  'the crown war: ATG+PAR vs HER, to the death');
ok(game.tags.HER.ruler.name === 'Herod' && game.tags.ATG.ruler.name === 'Antigonus II Mattathias', 'the rivals are crowned');
ok(game.tags.PTO.ruler.name.indexOf('Cleopatra') === 0, 'Cleopatra reigns in Egypt');

console.log('== the Rome arc: flight -> Senate -> the legions march ==');
game.paused = false;
const drive = (days) => {
  for (let i = 0; i < days; i++) {
    tickDay(ctx);
    if (game.pendingEvents.length && game.paused) {
      const pe = game.pendingEvents[0];
      actions.chooseEventOption(pe.instanceId, 0); // always the first option
      game.paused = false;
    }
    if (game.over) return;
  }
};
drive(100); // into October -40
ok(game.flags.herodSailed === true, 'Herod sails for Rome');
drive(120); // into -39
ok(game.flags.herodKing === true, 'the Senate crowns him');
ok(w.defenders.indexOf('ROM') >= 0, 'Rome enters the war at his side');
ok(game.tags.HER.allies.indexOf('ROM') >= 0, 'the alliance is sealed');

console.log('== Gindarus: Parthia broken ==');
drive(560); // to mid -38 and beyond
ok(game.firedEvents.ev5_gindarus === true, 'Gindarus fired');
ok(ctx.prov('Damascus').owner === 'ROM', 'Parthian Syria fell to Rome');
ok(w.attackers.indexOf('PAR') < 0 || !game.wars.includes(w), 'Parthia is out of the crown war');
ok((game.tags.PAR.atWarWith || []).length === 0, 'Parthia fights no one');

console.log('== missions tick ==');
ok(game.tags.HER.missionIdx >= 1, 'HER missions progress: idx=' + game.tags.HER.missionIdx);

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
